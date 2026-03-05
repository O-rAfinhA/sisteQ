import { describe, expect, it, beforeEach, vi } from 'vitest';
import os from 'os';
import path from 'path';
import { createAuthCookiesForUser, registerTenantAndUser } from './profile';

function createMockRes() {
  const state: { status: number; json: any; headers: Record<string, any> } = {
    status: 200,
    json: null,
    headers: {},
  };
  const res: any = {
    status(code: number) {
      state.status = code;
      return res;
    },
    json(payload: any) {
      state.json = payload;
      return res;
    },
    setHeader(key: string, value: any) {
      state.headers[key] = value;
    },
    getState() {
      return state;
    },
  };
  return res;
}

function cookieHeaderFromSetCookie(setCookie: string | string[]) {
  const arr = Array.isArray(setCookie) ? setCookie : [setCookie];
  return arr
    .map(v => String(v).split(';')[0])
    .filter(Boolean)
    .join('; ');
}

describe('Sugestão Direcionamento IA API', () => {
  const prevKey = process.env.OPENROUTER_API_KEY;
  const prevDbPath = process.env.SISTEQ_PROFILE_DB_PATH;
  const prevSecret = process.env.SISTEQ_SESSION_SECRET;
  const tmpDir = path.join(os.tmpdir(), 'sisteq-ai-tests');
  let profileDbPath = path.join(tmpDir, `profile_${Date.now()}.json`);

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = prevKey;
    profileDbPath = path.join(tmpDir, `profile_${Date.now()}_${Math.random().toString(16).slice(2)}.json`);
    process.env.SISTEQ_PROFILE_DB_PATH = profileDbPath;
    process.env.SISTEQ_SESSION_SECRET = 'test-secret';
    vi.restoreAllMocks();
  });

  async function createAuthCookie() {
    const tenantSlug = `tenant-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const email = `user-${Date.now()}-${Math.random()}@example.com`;
    const password = 'Senha@12345';
    const { user } = await registerTenantAndUser({
      tenantSlug,
      companyName: 'Empresa',
      name: 'Usuário',
      email,
      password,
    });
    return cookieHeaderFromSetCookie(await createAuthCookiesForUser(user));
  }

  it('retorna 500 quando OPENROUTER_API_KEY não está configurada', async () => {
    vi.resetModules();
    process.env.OPENROUTER_API_KEY = '';
    const { default: handler } = await import('../../pages/api/ai/sugestao-direcionamento');

    const cookie = await createAuthCookie();
    const req: any = { method: 'POST', headers: { cookie }, body: { field: 'missao', companyContext: 'x' } };
    const res = createMockRes();
    await handler(req, res as any);

    const { status, json } = res.getState();
    expect(status).toBe(500);
    expect(String(json.error)).toMatch(/OPENROUTER_API_KEY/i);
  });

  it('chama OpenRouter com headers e modelo corretos', async () => {
    vi.resetModules();
    process.env.OPENROUTER_API_KEY = 'test-key';

    const fetchMock = vi.fn(async (_input: any, _init?: any) => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ suggestions: ['Sugestão 1', 'Sugestão 2', 'Sugestão 3'] }) } }],
      }),
    }));
    vi.stubGlobal('fetch', fetchMock as any);

    const { default: handler } = await import('../../pages/api/ai/sugestao-direcionamento');
    const cookie = await createAuthCookie();
    const req: any = {
      method: 'POST',
      headers: { host: 'localhost:3000', 'x-forwarded-for': '10.0.0.1', cookie },
      body: { field: 'missao', companyContext: 'Somos uma empresa B2B.', currentText: '' },
    };
    const res = createMockRes();
    await handler(req, res as any);

    const { status, json } = res.getState();
    expect(status).toBe(200);
    expect(Array.isArray(json.suggestions)).toBe(true);
    expect(json.suggestions).toHaveLength(3);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as any;
    expect(String(url)).toMatch(/openrouter\.ai\/api\/v1\/chat\/completions/);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer test-key');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.headers['HTTP-Referer']).toBe('https://localhost:3000');
    expect(init.headers['X-Title']).toBe('SisteQ');

    const parsedBody = JSON.parse(init.body);
    expect(parsedBody.model).toBe('openai/gpt-4o-mini');
    expect(Array.isArray(parsedBody.messages)).toBe(true);
  }, 15000);

  it('aplica rate limiting por IP', async () => {
    vi.resetModules();
    process.env.OPENROUTER_API_KEY = 'test-key';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ suggestions: ['S1', 'S2', 'S3'] }) } }],
        }),
      })) as any,
    );

    const { default: handler } = await import('../../pages/api/ai/sugestao-direcionamento');
    const cookie = await createAuthCookie();
    const baseReq: any = {
      method: 'POST',
      headers: { 'x-forwarded-for': '1.2.3.4', cookie },
      body: { field: 'missao', companyContext: 'Contexto', currentText: '' },
    };

    for (let i = 0; i < 10; i++) {
      const res = createMockRes();
      await handler(baseReq, res as any);
      const { status } = res.getState();
      expect(status).toBe(200);
    }

    const res = createMockRes();
    await handler(baseReq, res as any);
    const { status, json } = res.getState();
    expect(status).toBe(429);
    expect(String(json.error)).toMatch(/muitas requisições/i);
  });

  it('normaliza sugestões de Valores quando vêm como arrays de linhas', async () => {
    vi.resetModules();
    process.env.OPENROUTER_API_KEY = 'test-key';

    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                suggestions: [
                  ['- Integridade: agir com transparência.', '- Cliente: foco no valor entregue.', '- Segurança: priorizar prevenção.', '- Inovação: melhorar continuamente.', '- Excelência: padrão elevado.', '- Colaboração: trabalho em equipe.'],
                ],
              }),
            },
          },
        ],
      }),
    }));
    vi.stubGlobal('fetch', fetchMock as any);

    const { default: handler } = await import('../../pages/api/ai/sugestao-direcionamento');
    const cookie = await createAuthCookie();
    const req: any = {
      method: 'POST',
      headers: { host: 'localhost:3000', 'x-forwarded-for': '10.0.0.2', cookie },
      body: { field: 'valores', companyContext: 'Empresa de manufatura.', currentText: '' },
    };
    const res = createMockRes();
    await handler(req, res as any);

    const { status, json } = res.getState();
    expect(status).toBe(200);
    expect(Array.isArray(json.suggestions)).toBe(true);
    expect(json.suggestions).toHaveLength(1);
    expect(String(json.suggestions[0])).toMatch(/\n/);
    expect(String(json.suggestions[0])).toMatch(/^\-/m);
  });

  it('aceita conteúdo com texto extra e extrai JSON em Valores', async () => {
    vi.resetModules();
    process.env.OPENROUTER_API_KEY = 'test-key';

    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: `Aqui está:\n\`\`\`json\n{"suggestions":[["- Integridade: transparência.","- Cliente: foco no valor.","- Qualidade: consistência.","- Segurança: prevenção.","- Inovação: melhoria.","- Colaboração: equipe."]],}\n\`\`\``,
            },
          },
        ],
      }),
    }));
    vi.stubGlobal('fetch', fetchMock as any);

    const { default: handler } = await import('../../pages/api/ai/sugestao-direcionamento');
    const cookie = await createAuthCookie();
    const req: any = {
      method: 'POST',
      headers: { host: 'localhost:3000', 'x-forwarded-for': '10.0.0.3', cookie },
      body: { field: 'valores', companyContext: 'Empresa de serviços.', currentText: '' },
    };
    const res = createMockRes();
    await handler(req, res as any);

    const { status, json } = res.getState();
    expect(status).toBe(200);
    expect(Array.isArray(json.suggestions)).toBe(true);
    expect(json.suggestions).toHaveLength(1);
    expect(String(json.suggestions[0])).toMatch(/^\-/m);
  });

  it('faz fallback com lista em Valores quando não há JSON', async () => {
    vi.resetModules();
    process.env.OPENROUTER_API_KEY = 'test-key';

    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: [
                '- Integridade – agimos com transparência.',
                '- Cliente – foco no valor entregue.',
                '- Qualidade – fazemos certo na primeira vez.',
                '- Segurança – prevenção em primeiro lugar.',
                '- Inovação – melhoria contínua.',
                '- Colaboração – trabalho em equipe.',
              ].join('\n'),
            },
          },
        ],
      }),
    }));
    vi.stubGlobal('fetch', fetchMock as any);

    const { default: handler } = await import('../../pages/api/ai/sugestao-direcionamento');
    const cookie = await createAuthCookie();
    const req: any = {
      method: 'POST',
      headers: { host: 'localhost:3000', 'x-forwarded-for': '10.0.0.4', cookie },
      body: { field: 'valores', companyContext: 'Empresa de serviços.', currentText: '' },
    };
    const res = createMockRes();
    await handler(req, res as any);

    const { status, json } = res.getState();
    expect(status).toBe(200);
    expect(Array.isArray(json.suggestions)).toBe(true);
    expect(json.suggestions).toHaveLength(1);
    expect(String(json.suggestions[0])).toMatch(/Integridade/);
  });

  it('faz fallback com bullets e lista numerada em Valores', async () => {
    vi.resetModules();
    process.env.OPENROUTER_API_KEY = 'test-key';

    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: [
                '1) Integridade – agimos com transparência.',
                '2) Cliente – foco no valor entregue.',
                '3) Qualidade – fazemos certo na primeira vez.',
                '4) Segurança – prevenção em primeiro lugar.',
                '5) Inovação – melhoria contínua.',
                '6) Colaboração – trabalho em equipe.',
              ].join('\n'),
            },
          },
        ],
      }),
    }));
    vi.stubGlobal('fetch', fetchMock as any);

    const { default: handler } = await import('../../pages/api/ai/sugestao-direcionamento');
    const cookie = await createAuthCookie();
    const req: any = {
      method: 'POST',
      headers: { host: 'localhost:3000', 'x-forwarded-for': '10.0.0.5', cookie },
      body: { field: 'valores', companyContext: 'Empresa de serviços.', currentText: '' },
    };
    const res = createMockRes();
    await handler(req, res as any);

    const { status, json } = res.getState();
    expect(status).toBe(200);
    expect(Array.isArray(json.suggestions)).toBe(true);
    expect(json.suggestions).toHaveLength(1);
    expect(String(json.suggestions[0])).toMatch(/^\-/m);
    expect(String(json.suggestions[0])).toMatch(/Integridade/);
  });

  it('aceita chave sugestoes em Valores', async () => {
    vi.resetModules();
    process.env.OPENROUTER_API_KEY = 'test-key';

    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                sugestoes: [
                  [
                    '- Integridade: transparência.',
                    '- Cliente: foco no valor.',
                    '- Qualidade: consistência.',
                    '- Segurança: prevenção.',
                    '- Inovação: melhoria.',
                    '- Colaboração: equipe.',
                  ],
                ],
              }),
            },
          },
        ],
      }),
    }));
    vi.stubGlobal('fetch', fetchMock as any);

    const { default: handler } = await import('../../pages/api/ai/sugestao-direcionamento');
    const cookie = await createAuthCookie();
    const req: any = {
      method: 'POST',
      headers: { host: 'localhost:3000', 'x-forwarded-for': '10.0.0.6', cookie },
      body: { field: 'valores', companyContext: 'Empresa de serviços.', currentText: '' },
    };
    const res = createMockRes();
    await handler(req, res as any);

    const { status, json } = res.getState();
    expect(status).toBe(200);
    expect(Array.isArray(json.suggestions)).toBe(true);
    expect(json.suggestions).toHaveLength(1);
    expect(String(json.suggestions[0])).toMatch(/Integridade/);
  });

  it('aceita JSON escapado em Valores', async () => {
    vi.resetModules();
    process.env.OPENROUTER_API_KEY = 'test-key';

    const escaped =
      '{\\"suggestions\\":[[\\"- Inovação: Promover melhorias contínuas.\\",\\"- Colaboração: Troca de ideias entre equipes.\\",\\"- Qualidade: Excelência em produtos e serviços.\\",\\"- Sustentabilidade: Práticas responsáveis.\\",\\"- Cliente: Valor entregue ao cliente.\\",\\"- Integridade: Transparência nas decisões.\\"]]}';
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: escaped } }],
      }),
    }));
    vi.stubGlobal('fetch', fetchMock as any);

    const { default: handler } = await import('../../pages/api/ai/sugestao-direcionamento');
    const cookie = await createAuthCookie();
    const req: any = {
      method: 'POST',
      headers: { host: 'localhost:3000', 'x-forwarded-for': '10.0.0.7', cookie },
      body: { field: 'valores', companyContext: 'Empresa de serviços.', currentText: '' },
    };
    const res = createMockRes();
    await handler(req, res as any);

    const { status, json } = res.getState();
    expect(status).toBe(200);
    expect(Array.isArray(json.suggestions)).toBe(true);
    expect(json.suggestions).toHaveLength(1);
    expect(String(json.suggestions[0])).toMatch(/Inovação/);
  });

  it('aceita suggestions flat (array de bullets) em Valores', async () => {
    vi.resetModules();
    process.env.OPENROUTER_API_KEY = 'test-key';

    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                suggestions: [
                  '- Integridade: transparência.',
                  '- Cliente: foco no valor.',
                  '- Qualidade: consistência.',
                  '- Segurança: prevenção.',
                  '- Inovação: melhoria.',
                  '- Colaboração: equipe.',
                ],
              }),
            },
          },
        ],
      }),
    }));
    vi.stubGlobal('fetch', fetchMock as any);

    const { default: handler } = await import('../../pages/api/ai/sugestao-direcionamento');
    const cookie = await createAuthCookie();
    const req: any = {
      method: 'POST',
      headers: { host: 'localhost:3000', 'x-forwarded-for': '10.0.0.8', cookie },
      body: { field: 'valores', companyContext: 'Empresa de serviços.', currentText: '' },
    };
    const res = createMockRes();
    await handler(req, res as any);

    const { status, json } = res.getState();
    expect(status).toBe(200);
    expect(Array.isArray(json.suggestions)).toBe(true);
    expect(json.suggestions).toHaveLength(1);
    expect(String(json.suggestions[0])).toMatch(/^\-/m);
    expect(String(json.suggestions[0])).toMatch(/\n/);
    expect(String(json.suggestions[0])).toMatch(/Integridade/);
  });

  it('faz fallback quando JSON vem truncado (escapado) em Valores', async () => {
    vi.resetModules();
    process.env.OPENROUTER_API_KEY = 'test-key';

    const truncated =
      '{\\"suggestions\\":[[\\"- Integridade: transparência.\\",\\"- Cliente: foco no valor.\\",\\"- Qualidade: consistência.\\",\\"- Segurança: prevenção.\\",\\"- Inovação: melhoria.\\",\\"- Colaboração: equipe.\\"]';
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: truncated } }],
      }),
    }));
    vi.stubGlobal('fetch', fetchMock as any);

    const { default: handler } = await import('../../pages/api/ai/sugestao-direcionamento');
    const cookie = await createAuthCookie();
    const req: any = {
      method: 'POST',
      headers: { host: 'localhost:3000', 'x-forwarded-for': '10.0.0.9', cookie },
      body: { field: 'valores', companyContext: 'Empresa de serviços.', currentText: '' },
    };
    const res = createMockRes();
    await handler(req, res as any);

    const { status, json } = res.getState();
    expect(status).toBe(200);
    expect(Array.isArray(json.suggestions)).toBe(true);
    expect(json.suggestions).toHaveLength(1);
    expect(String(json.suggestions[0])).toMatch(/Integridade/);
    expect(String(json.suggestions[0])).toMatch(/^\-/m);
  }, 15_000);
});
