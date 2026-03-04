/**
 * Utilitário de impressão / geração de PDF de Ordem de Serviço.
 * Abre uma nova janela com o layout da OS formatado para impressão.
 * O usuário pode usar Ctrl+P ou "Salvar como PDF" no diálogo nativo do browser.
 */

interface OSParaImprimir {
  numero: string;
  tipo: 'corretiva' | 'preventiva';
  status: string;
  prioridade?: string;
  descricao: string;
  responsavel?: string;
  setor?: string;
  solicitante?: string;
  dataAbertura: string;
  prazo: string;
  dataEncerramento?: string;
  horasReparo?: number;
  custoPecas?: number;
  custoServico?: number;
  custoMaoObra?: number;
  motivoCancelamento?: string;
  observacao?: string;
  planoManutencaoId?: string;
}

interface EquipamentoInfo {
  nome: string;
  codigo: string;
  tipo?: string;
  localizacao?: string;
  fabricante?: string;
  modelo?: string;
  numSerie?: string;
}

function fmtData(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function fmtMoeda(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const TIPO_LABEL: Record<string, string> = {
  corretiva: 'Corretiva',
  preventiva: 'Preventiva',
};

const STATUS_LABEL: Record<string, string> = {
  aberta: 'Aberta',
  triagem: 'Triagem',
  'em-andamento': 'Em Andamento',
  aguardando: 'Aguardando',
  programada: 'Programada',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
  atrasada: 'Atrasada',
};

const PRIORIDADE_LABEL: Record<string, string> = {
  critica: 'CRÍTICA',
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};

export function imprimirOS(os: OSParaImprimir, equip?: EquipamentoInfo): void {
  const custoTotal = (os.custoPecas || 0) + (os.custoServico || 0) + (os.custoMaoObra || 0);
  const tipoLabel = TIPO_LABEL[os.tipo] || os.tipo;
  const statusLabel = STATUS_LABEL[os.status] || os.status;
  const prioLabel = os.prioridade ? (PRIORIDADE_LABEL[os.prioridade] || os.prioridade) : null;

  const corTipo = os.tipo === 'corretiva' ? '#dc2626' : '#2563eb';
  const bgTipo  = os.tipo === 'corretiva' ? '#fef2f2' : '#eff6ff';

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>OS ${os.numero}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      color: #111;
      background: #fff;
      padding: 0;
    }
    .page {
      max-width: 210mm;
      margin: 0 auto;
      padding: 12mm 14mm;
    }
    /* HEADER */
    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      border-bottom: 2px solid #111;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .header-left h1 {
      font-size: 15pt;
      font-weight: 700;
      letter-spacing: -0.3px;
    }
    .header-left p {
      font-size: 9pt;
      color: #555;
      margin-top: 2px;
    }
    .badge-os {
      background: ${bgTipo};
      color: ${corTipo};
      border: 1.5px solid ${corTipo};
      border-radius: 6px;
      padding: 4px 12px;
      font-size: 10pt;
      font-weight: 700;
      white-space: nowrap;
    }
    /* SECTION */
    .section-title {
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #888;
      font-weight: 700;
      margin-bottom: 5px;
      margin-top: 12px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 3px;
    }
    /* GRID */
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; }
    .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px 16px; }
    .grid4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 6px 12px; }
    .field { margin-bottom: 0; }
    .field label {
      display: block;
      font-size: 8pt;
      color: #777;
      margin-bottom: 1px;
    }
    .field span {
      font-size: 10pt;
      font-weight: 600;
      color: #111;
    }
    /* DESCRIPTION */
    .desc-box {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 8px 10px;
      font-size: 10pt;
      color: #222;
      line-height: 1.5;
    }
    /* COSTS */
    .cost-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr auto;
      gap: 6px 12px;
      align-items: end;
    }
    .cost-total {
      background: #ecfdf5;
      border: 1.5px solid #6ee7b7;
      border-radius: 6px;
      padding: 6px 10px;
      text-align: right;
    }
    .cost-total label { font-size: 8pt; color: #059669; }
    .cost-total span { font-size: 12pt; font-weight: 700; color: #047857; display: block; }
    /* PRIORIDADE BADGE */
    .prio-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 20px;
      font-size: 9pt;
      font-weight: 700;
    }
    .prio-critica { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }
    .prio-alta    { background: #fff7ed; color: #c2410c; border: 1px solid #fdba74; }
    .prio-media   { background: #fffbeb; color: #b45309; border: 1px solid #fcd34d; }
    .prio-baixa   { background: #f9fafb; color: #4b5563; border: 1px solid #d1d5db; }
    /* SIGNATURE */
    .signature-area {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
      margin-top: 24px;
    }
    .sig-line {
      border-top: 1px solid #9ca3af;
      padding-top: 4px;
      font-size: 8pt;
      color: #666;
      text-align: center;
    }
    /* FOOTER */
    .footer {
      margin-top: 16px;
      border-top: 1px solid #e5e7eb;
      padding-top: 6px;
      font-size: 7.5pt;
      color: #aaa;
      display: flex;
      justify-content: space-between;
    }
    /* CANCEL BOX */
    .cancel-box {
      background: #fef2f2;
      border: 1px solid #fca5a5;
      border-radius: 6px;
      padding: 8px 10px;
      font-size: 10pt;
      color: #dc2626;
    }
    @media print {
      body { padding: 0; }
      .page { padding: 10mm 12mm; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="page">

    <!-- HEADER -->
    <div class="header">
      <div class="header-left">
        <h1>Ordem de Serviço — ${os.numero}</h1>
        <p>SisteQ · Sistema de Planejamento e Gestão</p>
      </div>
      <div>
        <span class="badge-os">${tipoLabel}</span>
        ${prioLabel ? `<span class="prio-badge prio-${os.prioridade || ''}" style="margin-left:6px">${prioLabel}</span>` : ''}
      </div>
    </div>

    <!-- STATUS + DATAS -->
    <div class="grid4">
      <div class="field"><label>Status</label><span>${statusLabel}</span></div>
      <div class="field"><label>Data de Abertura</label><span>${fmtData(os.dataAbertura)}</span></div>
      <div class="field"><label>Prazo</label><span>${fmtData(os.prazo)}</span></div>
      <div class="field"><label>Encerramento</label><span>${os.dataEncerramento ? fmtData(os.dataEncerramento) : '—'}</span></div>
    </div>

    <!-- EQUIPAMENTO -->
    <div class="section-title">Equipamento</div>
    <div class="grid4">
      <div class="field"><label>Nome</label><span>${equip?.nome || '—'}</span></div>
      <div class="field"><label>Código</label><span>${equip?.codigo || '—'}</span></div>
      <div class="field"><label>Tipo</label><span>${equip?.tipo || '—'}</span></div>
      <div class="field"><label>Localização</label><span>${equip?.localizacao || '—'}</span></div>
      ${equip?.fabricante ? `<div class="field"><label>Fabricante</label><span>${equip.fabricante}</span></div>` : ''}
      ${equip?.modelo ? `<div class="field"><label>Modelo</label><span>${equip.modelo}</span></div>` : ''}
      ${equip?.numSerie ? `<div class="field"><label>Nº de Série</label><span>${equip.numSerie}</span></div>` : ''}
    </div>

    <!-- RESPONSÁVEIS -->
    <div class="section-title">Responsáveis e Origem</div>
    <div class="grid4">
      <div class="field"><label>Responsável Técnico</label><span>${os.responsavel || '—'}</span></div>
      <div class="field"><label>Solicitante</label><span>${os.solicitante || '—'}</span></div>
      <div class="field"><label>Setor</label><span>${os.setor || '—'}</span></div>
      ${os.horasReparo != null ? `<div class="field"><label>Horas de Reparo</label><span>${os.horasReparo}h</span></div>` : '<div></div>'}
    </div>

    <!-- DESCRIÇÃO -->
    <div class="section-title">Descrição do Serviço</div>
    <div class="desc-box">${os.descricao || '—'}</div>

    ${os.observacao ? `
    <div class="section-title">Observações</div>
    <div class="desc-box" style="background:#f0f9ff;border-color:#bae6fd">${os.observacao}</div>
    ` : ''}

    ${os.motivoCancelamento ? `
    <div class="section-title">Motivo do Cancelamento</div>
    <div class="cancel-box">${os.motivoCancelamento}</div>
    ` : ''}

    <!-- CUSTOS -->
    ${custoTotal > 0 ? `
    <div class="section-title">Custos</div>
    <div class="cost-row">
      <div class="field"><label>Peças / Materiais</label><span>${fmtMoeda(os.custoPecas || 0)}</span></div>
      <div class="field"><label>Serviços Terceirizados</label><span>${fmtMoeda(os.custoServico || 0)}</span></div>
      <div class="field"><label>Mão de Obra Interna</label><span>${fmtMoeda(os.custoMaoObra || 0)}</span></div>
      <div class="cost-total">
        <label>Total Geral</label>
        <span>${fmtMoeda(custoTotal)}</span>
      </div>
    </div>
    ` : ''}

    <!-- ASSINATURAS -->
    <div class="signature-area">
      <div class="sig-line">Responsável Técnico<br><br><br>${os.responsavel || '_____________________'}</div>
      <div class="sig-line">Solicitante / Aprovador<br><br><br>${os.solicitante || '_____________________'}</div>
      <div class="sig-line">Data / Carimbo<br><br><br>______ / ______ / ________</div>
    </div>

    <!-- FOOTER -->
    <div class="footer">
      <span>SisteQ — Gestão de Manutenção</span>
      <span>OS: ${os.numero} · Emitida em: ${fmtData(new Date().toISOString().split('T')[0])}</span>
    </div>

    <!-- BOTÃO IMPRIMIR (só aparece na tela, não imprime) -->
    <div class="no-print" style="text-align:center;margin-top:20px">
      <button onclick="window.print()"
        style="padding:8px 24px;background:#111;color:#fff;border:none;border-radius:8px;font-size:11pt;cursor:pointer">
        Imprimir / Salvar PDF
      </button>
    </div>

  </div>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
  if (!w) {
    alert('Permita pop-ups para este site para imprimir a OS.');
    return;
  }
  w.document.write(html);
  w.document.close();
  // Pequeno delay para garantir que o conteúdo foi renderizado antes de acionar print
  setTimeout(() => { w.focus(); }, 300);
}

// ═══════════════════════════════════════════════════════════════════
// Impressão de Manutenção Preventiva Semanal — Checklist por equipe
// ═══════════════════════════════════════════════════════════════════

export interface GrupoParaImpressao {
  equipamento: {
    nome: string;
    codigo: string;
    tipo?: string;
    localizacao?: string;
    fabricante?: string;
    modelo?: string;
    numSerie?: string;
  };
  plano: {
    codigo: string;
    nome: string;
    responsavel?: string;
    duracaoEstimada?: number;
    necessitaParada?: boolean;
  };
  itens: {
    descricao: string;
    periodicidade: string;
    ultimaExecucao?: string;
    dueDate: string;
    diasRestantes: number;
    observacao?: string;
  }[];
}

interface PrintSemanalParams {
  semanaInicio: string;  // ISO
  semanaFim: string;     // ISO
  grupos: GrupoParaImpressao[];
}

function statusItemLabel(dias: number): { label: string; cor: string } {
  if (dias < 0)   return { label: `ATRASADO ${Math.abs(dias)}d`, cor: '#dc2626' };
  if (dias === 0) return { label: 'VENCE HOJE',                   cor: '#d97706' };
  if (dias <= 3)  return { label: `em ${dias}d`,                  cor: '#b45309' };
  return                  { label: `em ${dias}d`,                 cor: '#2563eb' };
}

export function imprimirManutencaoSemanal({ semanaInicio, semanaFim, grupos }: PrintSemanalParams): void {
  if (grupos.length === 0) return;

  const semanaLabel = `${fmtData(semanaInicio)} a ${fmtData(semanaFim)}`;
  const emitidaEm = fmtData(new Date().toISOString().split('T')[0]);

  // Gera o HTML de cada grupo (um por equipamento/plano)
  const paginasHTML = grupos.map((g, gIdx) => {
    const pageBreak = gIdx > 0 ? 'page-break-before: always;' : '';
    const alertaParada = g.plano.necessitaParada
      ? `<div style="margin:10px 0;padding:8px 10px;background:#fff7ed;border:1.5px solid #fdba74;border-radius:6px;color:#c2410c;font-size:9pt;font-weight:700;">
           ⚠️ Este equipamento necessita PARADA para execução da manutenção.
         </div>`
      : '';

    const linhasItens = g.itens.map((item, idx) => {
      const { label: sLabel, cor: sCor } = statusItemLabel(item.diasRestantes);
      const rowBg = idx % 2 === 0 ? '#ffffff' : '#f9fafb';
      return `
        <tr style="background:${rowBg}">
          <td style="padding:7px 8px;text-align:center;font-size:14pt;">☐</td>
          <td style="padding:7px 10px;font-size:10pt;color:#111;">${item.descricao}</td>
          <td style="padding:7px 8px;text-align:center;font-size:9pt;color:#555;">${item.periodicidade}</td>
          <td style="padding:7px 8px;text-align:center;font-size:9pt;color:#555;">
            ${item.ultimaExecucao ? fmtData(item.ultimaExecucao) : '—'}
          </td>
          <td style="padding:7px 8px;text-align:center;font-size:9pt;font-weight:700;color:${sCor};">
            ${fmtData(item.dueDate)}<br><span style="font-size:8pt;">${sLabel}</span>
          </td>
          <td style="padding:7px 8px;font-size:9pt;color:#777;">${item.observacao || ''}</td>
          <td style="padding:7px 8px;border-left:1px solid #e5e7eb;">
            <div style="height:28px;border-bottom:1px solid #9ca3af;width:100%;"></div>
          </td>
        </tr>`;
    }).join('');

    return `
      <div style="${pageBreak}max-width:210mm;margin:0 auto;padding:10mm 12mm;">

        <!-- TOPO -->
        <div style="display:flex;align-items:flex-start;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:12px;">
          <div>
            <div style="font-size:15pt;font-weight:700;letter-spacing:-0.3px;">Ordem de Serviço — Manutenção Preventiva</div>
            <div style="font-size:9pt;color:#555;margin-top:2px;">SisteQ · Sistema de Planejamento e Gestão</div>
          </div>
          <div style="text-align:right;">
            <div style="background:#eff6ff;color:#1d4ed8;border:1.5px solid #93c5fd;border-radius:6px;padding:4px 12px;font-size:10pt;font-weight:700;">
              Preventiva
            </div>
            <div style="font-size:8pt;color:#888;margin-top:4px;">Semana: ${semanaLabel}</div>
          </div>
        </div>

        <!-- EQUIPAMENTO -->
        <div style="font-size:8pt;text-transform:uppercase;letter-spacing:0.8px;color:#888;font-weight:700;margin-bottom:5px;border-bottom:1px solid #e5e7eb;padding-bottom:3px;">
          Equipamento
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px 14px;margin-bottom:10px;">
          <div><div style="font-size:8pt;color:#777;">Nome</div><div style="font-size:10pt;font-weight:600;">${g.equipamento.nome}</div></div>
          <div><div style="font-size:8pt;color:#777;">Código</div><div style="font-size:10pt;font-weight:600;font-family:monospace;">${g.equipamento.codigo}</div></div>
          <div><div style="font-size:8pt;color:#777;">Tipo</div><div style="font-size:10pt;font-weight:600;">${g.equipamento.tipo || '—'}</div></div>
          <div><div style="font-size:8pt;color:#777;">Localização</div><div style="font-size:10pt;font-weight:600;">${g.equipamento.localizacao || '—'}</div></div>
          ${g.equipamento.fabricante ? `<div><div style="font-size:8pt;color:#777;">Fabricante</div><div style="font-size:10pt;font-weight:600;">${g.equipamento.fabricante}</div></div>` : ''}
          ${g.equipamento.modelo ? `<div><div style="font-size:8pt;color:#777;">Modelo</div><div style="font-size:10pt;font-weight:600;">${g.equipamento.modelo}</div></div>` : ''}
          ${g.equipamento.numSerie ? `<div><div style="font-size:8pt;color:#777;">Nº Série</div><div style="font-size:10pt;font-weight:600;">${g.equipamento.numSerie}</div></div>` : ''}
        </div>

        <!-- PLANO -->
        <div style="font-size:8pt;text-transform:uppercase;letter-spacing:0.8px;color:#888;font-weight:700;margin-bottom:5px;border-bottom:1px solid #e5e7eb;padding-bottom:3px;">
          Plano de Manutenção
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px 14px;margin-bottom:10px;">
          <div><div style="font-size:8pt;color:#777;">Código do Plano</div><div style="font-size:10pt;font-weight:600;font-family:monospace;">${g.plano.codigo}</div></div>
          <div style="grid-column:span 2;"><div style="font-size:8pt;color:#777;">Nome</div><div style="font-size:10pt;font-weight:600;">${g.plano.nome}</div></div>
          <div><div style="font-size:8pt;color:#777;">Responsável</div><div style="font-size:10pt;font-weight:600;">${g.plano.responsavel || '—'}</div></div>
          ${g.plano.duracaoEstimada ? `<div><div style="font-size:8pt;color:#777;">Duração Est.</div><div style="font-size:10pt;font-weight:600;">${g.plano.duracaoEstimada}h</div></div>` : ''}
        </div>

        ${alertaParada}

        <!-- CHECKLIST -->
        <div style="font-size:8pt;text-transform:uppercase;letter-spacing:0.8px;color:#888;font-weight:700;margin-bottom:5px;border-bottom:1px solid #e5e7eb;padding-bottom:3px;margin-top:8px;">
          Itens de Verificação — ${g.itens.length} item${g.itens.length !== 1 ? 's' : ''}
        </div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:#f3f4f6;">
              <th style="padding:6px 8px;width:32px;text-align:center;font-size:8pt;color:#555;border-bottom:1px solid #e5e7eb;">✓</th>
              <th style="padding:6px 10px;text-align:left;font-size:8pt;color:#555;border-bottom:1px solid #e5e7eb;">Verificação</th>
              <th style="padding:6px 8px;text-align:center;font-size:8pt;color:#555;border-bottom:1px solid #e5e7eb;white-space:nowrap;">Periodicidade</th>
              <th style="padding:6px 8px;text-align:center;font-size:8pt;color:#555;border-bottom:1px solid #e5e7eb;white-space:nowrap;">Ult. Execução</th>
              <th style="padding:6px 8px;text-align:center;font-size:8pt;color:#555;border-bottom:1px solid #e5e7eb;white-space:nowrap;">Vencimento</th>
              <th style="padding:6px 8px;text-align:left;font-size:8pt;color:#555;border-bottom:1px solid #e5e7eb;">Observação</th>
              <th style="padding:6px 8px;text-align:center;font-size:8pt;color:#555;border-bottom:1px solid #e5e7eb;border-left:1px solid #e5e7eb;">Rubrica</th>
            </tr>
          </thead>
          <tbody>
            ${linhasItens}
          </tbody>
        </table>

        <!-- ASSINATURAS -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-top:22px;">
          <div style="border-top:1px solid #9ca3af;padding-top:4px;font-size:8pt;color:#666;text-align:center;">
            Técnico Responsável<br><br><br>${g.plano.responsavel || '_____________________'}
          </div>
          <div style="border-top:1px solid #9ca3af;padding-top:4px;font-size:8pt;color:#666;text-align:center;">
            Supervisor / Aprovador<br><br><br>_____________________
          </div>
          <div style="border-top:1px solid #9ca3af;padding-top:4px;font-size:8pt;color:#666;text-align:center;">
            Data / Hora de Conclusão<br><br><br>______ / ______ &nbsp; ___:___h
          </div>
        </div>

        <!-- RODAPÉ -->
        <div style="margin-top:14px;border-top:1px solid #e5e7eb;padding-top:5px;font-size:7.5pt;color:#aaa;display:flex;justify-content:space-between;">
          <span>SisteQ — Manutenção Preventiva · ${g.equipamento.nome} (${g.equipamento.codigo})</span>
          <span>Semana: ${semanaLabel} · Emitida em: ${emitidaEm}</span>
        </div>

      </div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>OS Preventivas — Semana ${semanaLabel}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #111; background: #fff; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
      @page { margin: 0; }
    }
  </style>
</head>
<body>
  ${paginasHTML}
  <!-- Botão imprimir (não imprime) -->
  <div class="no-print" style="text-align:center;padding:20px;">
    <p style="font-size:10pt;color:#555;margin-bottom:10px;">
      ${grupos.length} equipamento${grupos.length !== 1 ? 's' : ''} · Semana ${semanaLabel}
    </p>
    <button onclick="window.print()"
      style="padding:8px 28px;background:#111;color:#fff;border:none;border-radius:8px;font-size:11pt;cursor:pointer;">
      Imprimir / Salvar PDF
    </button>
  </div>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=950,height=750,scrollbars=yes');
  if (!w) { alert('Permita pop-ups para imprimir.'); return; }
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); }, 300);
}