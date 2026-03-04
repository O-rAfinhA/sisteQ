import type { NextApiRequest, NextApiResponse } from 'next';
import { AuthError, requireAuthFromRequest } from '@/server/profile';

type FieldKey = 'missao' | 'visao' | 'valores' | 'politicaQualidade';

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;
const rateState = new Map<string, { count: number; resetAt: number }>();
const CACHE_TTL_MS = 10 * 60_000;
const responseCache = new Map<string, { createdAt: number; suggestions: string[] }>();
const UPSTREAM_TIMEOUT_MS = 12_000;

function getClientKey(req: NextApiRequest, tenantId: string) {
  const xf = req.headers['x-forwarded-for'];
  const ip = Array.isArray(xf) ? xf[0] : xf?.split(',')[0]?.trim();
  const base = ip || (req.socket as any)?.remoteAddress || 'unknown';
  return `${tenantId}:${base}`;
}

function hashString(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function checkRateLimit(key: string) {
  const now = Date.now();
  const current = rateState.get(key);
  if (!current || now >= current.resetAt) {
    rateState.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { limited: false, resetAt: now + RATE_WINDOW_MS, remaining: RATE_MAX - 1 };
  }
  if (current.count >= RATE_MAX) {
    return { limited: true, resetAt: current.resetAt, remaining: 0 };
  }
  current.count += 1;
  rateState.set(key, current);
  return { limited: false, resetAt: current.resetAt, remaining: Math.max(0, RATE_MAX - current.count) };
}

function assertField(value: unknown): value is FieldKey {
  return value === 'missao' || value === 'visao' || value === 'valores' || value === 'politicaQualidade';
}

function stripJsonFences(text: string) {
  const trimmed = text.trim();
  if (!trimmed.startsWith('```')) return trimmed;
  const withoutStart = trimmed.replace(/^```[a-zA-Z]*\n?/, '');
  return withoutStart.replace(/```$/, '').trim();
}

function tryParseJsonObject(content: string) {
  const clean = stripJsonFences(content);
  const candidates: string[] = [];
  candidates.push(clean);
  candidates.push(clean.replace(/[“”]/g, '"').replace(/[‘’]/g, "'"));
  candidates.push(clean.replace(/\\\"/g, '"'));
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    candidates.push(clean.slice(start, end + 1));
  }

  const parseOnce = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      try {
        const withoutTrailingCommas = trimmed.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(withoutTrailingCommas);
      } catch {
        return null;
      }
    }
  };

  for (const raw of candidates) {
    const parsed = parseOnce(raw);
    if (parsed == null) continue;
    if (typeof parsed === 'string') {
      const parsedInner = parseOnce(parsed);
      if (parsedInner != null) return parsedInner;
    }
    return parsed;
  }
  return null;
}

function parseSuggestionsFromContent(content: string, field: FieldKey): string[] | null {
  const parsed = tryParseJsonObject(content);
  const suggestionsCandidate =
    Array.isArray(parsed)
      ? parsed
      : parsed?.suggestions ??
        parsed?.sugestoes ??
        parsed?.sugestões ??
        parsed?.suggestion ??
        parsed?.sugestao ??
        parsed?.sugestão;
  if (!Array.isArray(suggestionsCandidate)) return null;
  if (field === 'valores') {
    const flat = suggestionsCandidate
      .filter((s: any) => typeof s === 'string')
      .map((s: any) => String(s ?? '').trim())
      .filter(Boolean);
    const looksLikeBullets = flat.length >= 3 && flat.every(s => s.startsWith('-'));
    if (looksLikeBullets) {
      return [flat.slice(0, 6).join('\n').trim()].filter(Boolean);
    }

    return suggestionsCandidate
      .map((s: any) => {
        if (Array.isArray(s)) {
          return s.map((line: any) => String(line ?? '').trim()).filter(Boolean).join('\n').trim();
        }
        return String(s ?? '').trim();
      })
      .filter(Boolean);
  }
  return suggestionsCandidate.map((s: any) => String(s ?? '').trim()).filter(Boolean);
}

function parseValoresFallback(content: string): string[] | null {
  const raw = stripJsonFences(content);
  const normalizedText = raw.replace(/[•●▪]/g, '-').replace(/[–—]/g, '-');
  const extractedQuotedBullets: string[] = [];
  for (const re of [/\\"-\s*([^\\"]+?)\\"/g, /"-\s*([^"]+?)"/g]) {
    const matches = normalizedText.matchAll(re as any);
    for (const m of matches) {
      const val = String(m?.[1] ?? '').trim();
      if (!val) continue;
      extractedQuotedBullets.push(`- ${val}`);
      if (extractedQuotedBullets.length >= 12) break;
    }
    if (extractedQuotedBullets.length >= 12) break;
  }

  const candidates = [...extractedQuotedBullets, ...normalizedText.split(/\r?\n|;/)]
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => l.replace(/^\(?\d+\)?[.)]\s*/, '').replace(/^\-\s*/, '- ').replace(/^\*\s*/, '- '));

  const parsedPairs: string[] = [];
  for (const line of candidates) {
    const cleaned = line.replace(/^\-\s*/, '').trim();
    const m =
      cleaned.match(/^(.+?)\s*:\s*(.+)$/) ||
      cleaned.match(/^(.+?)\s+-\s+(.+)$/);
    if (!m) continue;
    const valor = m[1].trim();
    const explicacao = m[2].trim();
    if (!valor || !explicacao) continue;
    parsedPairs.push(`- ${valor}: ${explicacao}`);
    if (parsedPairs.length >= 6) break;
  }

  if (parsedPairs.length >= 3) {
    return [parsedPairs.join('\n')];
  }
  return null;
}

function uniqNonEmpty(list: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const normalized = item.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  let auth: { tenantId: string; userId: string; role: string };
  try {
    auth = await requireAuthFromRequest(req as any);
  } catch (e: any) {
    if (e instanceof AuthError) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    throw e;
  }

  const rateKey = getClientKey(req, auth.tenantId);
  const rate = checkRateLimit(rateKey);
  res.setHeader('X-RateLimit-Limit', String(RATE_MAX));
  res.setHeader('X-RateLimit-Remaining', String(rate.remaining));
  res.setHeader('X-RateLimit-Reset', String(rate.resetAt));
  if (rate.limited) {
    res.status(429).json({ error: 'Muitas requisições. Tente novamente em instantes.' });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'OPENROUTER_API_KEY não configurada no servidor' });
    return;
  }

  const body = (req.body ?? {}) as any;
  const field = body.field;
  const companyContext = typeof body.companyContext === 'string' ? body.companyContext : '';
  const currentText = typeof body.currentText === 'string' ? body.currentText : '';

  if (!assertField(field)) {
    res.status(400).json({ error: 'Campo inválido' });
    return;
  }
  if (!companyContext.trim()) {
    res.status(400).json({ error: 'Contexto da empresa indisponível' });
    return;
  }

  const fieldLabel =
    field === 'missao'
      ? 'Missão'
      : field === 'visao'
        ? 'Visão'
        : field === 'politicaQualidade'
          ? 'Política da Qualidade'
          : 'Valores';

  const expectedCount = field === 'valores' ? 1 : 3;

  const cacheKeySource = JSON.stringify({
    tenantId: auth.tenantId,
    field,
    companyContext: companyContext.trim(),
    currentText: currentText.trim(),
  });
  const cacheKey = hashString(cacheKeySource);
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    console.info(
      JSON.stringify({
        event: 'ai.sugestao_direcionamento',
        tenantId: auth.tenantId,
        userId: auth.userId,
        field,
        cached: true,
        rateKey,
      }),
    );
    res.status(200).json({ suggestions: cached.suggestions });
    return;
  }

  const prompt = [
    `Você é um consultor sênior de Planejamento Estratégico (ISO 9001 e BSC).`,
    `Gere sugestões objetivas, aplicáveis e coerentes em pt-BR.`,
    `As sugestões devem ser relevantes ao segmento e aos objetivos da empresa.`,
    field === 'valores' ? `Gere exatamente 1 sugestão.` : `Gere exatamente 3 sugestões, todas diferentes entre si.`,
    ``,
    `Campo: ${fieldLabel}`,
    `Contexto da empresa (dados já cadastrados no sistema):`,
    companyContext.trim(),
    ``,
    currentText.trim()
      ? `Texto atual (se houver):\n${currentText.trim()}\n\nGere alternativas melhores mantendo intenção e alinhamento ao contexto.`
      : `Gere alternativas do zero, com linguagem profissional e clara.`,
    ``,
    `Formato de saída: retorne SOMENTE JSON válido, sem texto adicional.`,
    field === 'valores'
      ? [
          `{"suggestions":[["- <Valor>: <explicação curta (1 frase)>","- ... (6 itens)"]]}`,
          `A sugestão deve ter exatamente 6 itens.`,
          `Não use quebras de linha dentro de strings JSON (uma linha = um item do array).`,
        ].join('\n')
      : [
          `{"suggestions":["<sugestao_1>","<sugestao_2>","<sugestao_3>"]}`,
          `Cada sugestão deve ter no máximo 2 frases.`,
        ].join('\n'),
  ].join('\n');

  try {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': req.headers.host ? `https://${req.headers.host}` : 'https://localhost',
        'X-Title': 'SisteQ',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        temperature: field === 'valores' ? 0.4 : 0.7,
        max_tokens: field === 'valores' ? 450 : 260,
        messages: [
          { role: 'system', content: 'Retorne somente JSON válido. Não inclua markdown.' },
          { role: 'user', content: prompt },
        ],
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    const data: any = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      const msg =
        data?.error?.message ||
        data?.error ||
        data?.message ||
        `Falha ao gerar sugestão (status ${upstream.status})`;
      res.status(502).json({ error: msg });
      return;
    }

    const content = String(data?.choices?.[0]?.message?.content ?? '').trim();
    const parsed = content ? parseSuggestionsFromContent(content, field) : null;
    const fallback = !parsed && field === 'valores' ? parseValoresFallback(content) : null;
    const suggestions = uniqNonEmpty((parsed || fallback || [])).slice(0, expectedCount);
    if (suggestions.length !== expectedCount) {
      console.warn(
        JSON.stringify({
          event: 'ai.sugestao_direcionamento_parse_failed',
          field,
          ip: rateKey,
          contentPreview: content.slice(0, 500),
        }),
      );
      res
        .status(502)
        .json({ error: expectedCount === 1 ? 'Não foi possível obter uma sugestão. Tente novamente.' : 'Não foi possível obter 3 sugestões distintas. Tente novamente.' });
      return;
    }

    if (field === 'valores') {
      const lineCount = suggestions[0]?.split(/\r?\n/).filter(Boolean).length ?? 0;
      if (lineCount < 3) {
        console.warn(
          JSON.stringify({
            event: 'ai.sugestao_direcionamento_valores_incompleto',
            field,
            ip: rateKey,
            lineCount,
          }),
        );
      }
    }

    responseCache.set(cacheKey, { createdAt: Date.now(), suggestions });
    console.info(
      JSON.stringify({
        event: 'ai.sugestao_direcionamento',
        field,
        cached: false,
        ip: rateKey,
        durationMs: Date.now() - startedAt,
      }),
    );
    res.status(200).json({ suggestions });
  } catch (e: any) {
    const msg = String(e?.name || '').toLowerCase().includes('abort')
      ? 'Tempo limite excedido ao gerar sugestões. Tente novamente.'
      : e?.message || 'Falha inesperada ao gerar sugestão';
    console.error(
      JSON.stringify({
        event: 'ai.sugestao_direcionamento_error',
        field,
        ip: rateKey,
        error: msg,
      }),
    );
    res.status(500).json({ error: msg });
  }
}

