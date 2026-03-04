// Utilitários de formatação

/**
 * Formata data para dd/mm/aa (ano com 2 dígitos)
 * Parseia a string ISO diretamente (sem new Date) para evitar UTC shift em fusos negativos.
 */
export function formatarData(dataISO: string): string {
  if (!dataISO) return '';
  // Remove parte de hora se vier com T (ex: "2026-01-26T00:00:00")
  const partes = dataISO.split('T')[0].split('-');
  if (partes.length < 3) return dataISO;
  const [y, m, d] = partes;
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y.slice(-2)}`;
}

/**
 * Converte data do formato dd/mm/aa para ISO (YYYY-MM-DD)
 */
export function dataParaISO(dataFormatada: string): string {
  if (!dataFormatada) return '';
  const [dia, mes, ano] = dataFormatada.split('/');
  const anoCompleto = ano.length === 2 ? `20${ano}` : ano;
  return `${anoCompleto}-${mes}-${dia}`;
}

/**
 * Formata número para moeda brasileira R$ 0.000,00
 */
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

/**
 * Remove formatação de moeda e retorna número
 */
export function moedaParaNumero(valorFormatado: string): number {
  const numero = valorFormatado
    .replace('R$', '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();
  return parseFloat(numero) || 0;
}

/**
 * Capitaliza nomes próprios (primeira letra de cada palavra em maiúscula)
 * Ex: "joão silva santos" => "João Silva Santos"
 * Versão otimizada para digitação em tempo real
 */
export function capitalizarNome(nome: string): string {
  if (!nome) return '';
  
  // Preservar espaços durante a digitação
  return nome
    .split(' ')
    .map(palavra => {
      if (palavra.length === 0) return '';
      // Capitalizar apenas a primeira letra, mantendo o resto como está
      return palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Capitaliza a primeira letra de um texto
 * Ex: "descrição da tarefa" => "Descrição da tarefa"
 */
export function capitalizarPrimeiraLetra(texto: string): string {
  if (!texto) return '';
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Capitaliza título respeitando preposições em português
 * Ex: "manual de qualidade" => "Manual de Qualidade"
 */
export function capitalizarTitulo(titulo: string): string {
  if (!titulo) return '';
  const preposicoes = ['de', 'do', 'da', 'dos', 'das', 'e', 'a', 'o', 'com', 'em', 'para', 'por'];
  
  return titulo.split(' ').map((palavra, index) => {
    const palavraLower = palavra.toLowerCase();
    
    if (index === 0) {
      return palavra.charAt(0).toUpperCase() + palavraLower.slice(1);
    }
    
    if (preposicoes.includes(palavraLower)) {
      return palavraLower;
    }
    
    return palavra.charAt(0).toUpperCase() + palavraLower.slice(1);
  }).join(' ');
}

/**
 * Formata data ISO para data e hora separados (pt-BR)
 * Ex: "2025-01-15T14:30:00" => { data: "15/01/2025", hora: "14:30" }
 */
export function formatarDataHora(dataISO: string): { data: string; hora: string } {
  const d = new Date(dataISO);
  return {
    data: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    hora: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  };
}

/**
 * Formata somente a hora de uma data ISO
 * Ex: "2025-01-15T14:30:00" => "14:30"
 */
export function formatarHora(dataISO: string): string {
  const d = new Date(dataISO);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Formata data+hora como string única (pt-BR)
 * Ex: "2025-01-15T14:30:00" => "15/01/2025, 14:30"
 */
export function formatarDataHoraCompleta(dataISO: string): string {
  const d = new Date(dataISO);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formata data ISO para dd/mm/aaaa (ano com 4 dígitos)
 * Retorna '' se a data for vazia/inválida
 * Ex: "2025-01-15" => "15/01/25"
 */
export function formatarDataPtBr(dataISO: string): string {
  if (!dataISO) return '';
  const d = new Date(dataISO);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/**
 * Retorna a data de hoje formatada em dd/mm/aa
 * Substitui `new Date().toLocaleDateString('pt-BR')` inline
 */
export function formatarDataHoje(): string {
  return new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/**
 * Retorna a data de hoje no formato ISO (YYYY-MM-DD)
 * Usa data LOCAL (não UTC) para evitar shift de fuso horário em UTC-3 e similares.
 */
export function dataHojeISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Formata tamanho de arquivo em bytes para unidade legível
 * Ex: 0 => "0 Bytes", 1536 => "1.5 KB", 1048576 => "1 MB"
 * Substitui `formatFileSize` local e expressões `(bytes/1024).toFixed(2) KB` inline
 */
export function formatarTamanhoArquivo(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const unidades = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + unidades[i];
}

/**
 * Formata CPF: 12345678901 => 123.456.789-01
 */
export function formatarCPF(cpf: string): string {
  if (!cpf) return '';
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata telefone celular: 11999998888 => (11) 99999-8888
 */
export function formatarTelefone(telefone: string): string {
  if (!telefone) return '';
  return telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
}

/**
 * Formata número no padrão brasileiro (separador de milhar e decimal)
 * Sem opções: usa a formatação padrão do locale (sem forçar decimais)
 * Com opções: permite controlar casas decimais mínimas/máximas
 * Ex: formatarNumero(1234.5) => "1.234,5"
 * Ex: formatarNumero(1234.5, { decimaisMin: 0, decimaisMax: 2 }) => "1.234,5"
 * Ex: formatarNumero(1234, { decimaisMin: 2, decimaisMax: 2 }) => "1.234,00"
 */
export function formatarNumero(valor: number, opcoes?: { decimaisMin?: number; decimaisMax?: number }): string {
  if (opcoes) {
    return valor.toLocaleString('pt-BR', {
      minimumFractionDigits: opcoes.decimaisMin ?? 0,
      maximumFractionDigits: opcoes.decimaisMax ?? 2,
    });
  }
  return valor.toLocaleString('pt-BR');
}