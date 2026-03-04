import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DadosEstrategicos } from '../types/strategic';
import { formatarData, formatarNumero } from './formatters';

interface PDFOptions {
  logoUrl?: string;
}

// Paleta de cores profissional
const COLORS = {
  primary: [41, 98, 255] as [number, number, number],
  primaryDark: [30, 70, 200] as [number, number, number],
  primaryLight: [230, 240, 255] as [number, number, number],
  secondary: [124, 58, 237] as [number, number, number],
  accent: [249, 115, 22] as [number, number, number],
  success: [34, 197, 94] as [number, number, number],
  warning: [234, 179, 8] as [number, number, number],
  danger: [239, 68, 68] as [number, number, number],
  info: [59, 130, 246] as [number, number, number],
  dark: [15, 23, 42] as [number, number, number],
  gray: [100, 116, 139] as [number, number, number],
  lightGray: [241, 245, 249] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

export function generateStrategicPlanPDF(dados: DadosEstrategicos, anoSelecionado: string, options: PDFOptions = {}) {
  const doc = new jsPDF();
  let yPosition = 20;
  let pageNumber = 1;
  const marginLeft = 15;
  const marginRight = 15;
  const contentWidth = 180;
  const pageHeight = 297;
  const pageWidth = 210;

  // ========== FUNÇÕES UTILITÁRIAS ==========

  // Adicionar gradiente simulado (camadas de retângulos com opacidade decrescente)
  const addGradient = (x: number, y: number, width: number, height: number, startColor: [number, number, number], endColor: [number, number, number]) => {
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const ratio = i / steps;
      const r = startColor[0] + (endColor[0] - startColor[0]) * ratio;
      const g = startColor[1] + (endColor[1] - startColor[1]) * ratio;
      const b = startColor[2] + (endColor[2] - startColor[2]) * ratio;
      
      doc.setFillColor(r, g, b);
      doc.rect(x, y + (height / steps) * i, width, height / steps, 'F');
    }
  };

  // Adicionar linha decorativa
  const addDecorativeLine = (y: number, width: number = contentWidth, color: [number, number, number] = COLORS.primary) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, y, marginLeft + width, y);
    doc.setLineWidth(0.2);
  };

  // Adicionar box com sombra
  const addShadowBox = (x: number, y: number, width: number, height: number, fillColor: [number, number, number]) => {
    // Sombra
    doc.setFillColor(200, 200, 200);
    doc.roundedRect(x + 2, y + 2, width, height, 3, 3, 'F');
    // Box principal
    doc.setFillColor(...fillColor);
    doc.roundedRect(x, y, width, height, 3, 3, 'F');
  };

  // Adicionar ícone circular
  const addCircleIcon = (x: number, y: number, radius: number, bgColor: [number, number, number], iconText: string, textColor: [number, number, number] = COLORS.white) => {
    doc.setFillColor(...bgColor);
    doc.circle(x, y, radius, 'F');
    doc.setTextColor(...textColor);
    doc.setFontSize(11); // Aumentado de 8 para 11
    doc.setFont('helvetica', 'bold');
    doc.text(iconText, x, y + 1.5, { align: 'center' }); // Ajustado posicionamento vertical
  };

  // Cabeçalho de página (exceto capa)
  const addPageHeader = () => {
    // Linha superior decorativa com gradiente
    addGradient(0, 0, pageWidth, 8, COLORS.primary, COLORS.secondary);
    
    // Logo
    if (options.logoUrl) {
      try {
        doc.addImage(options.logoUrl, 'PNG', pageWidth - 45, 10, 30, 10);
      } catch (error) {
        console.error('Erro ao adicionar logo:', error);
      }
    }
    
    // Título do documento
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.gray);
    doc.setFont('helvetica', 'normal');
    doc.text(`Planejamento Estratégico ${anoSelecionado}`, marginLeft, 15);
    
    // Linha horizontal
    addDecorativeLine(22, contentWidth, COLORS.lightGray);
  };

  // Rodapé de página
  const addPageFooter = () => {
    const footerY = pageHeight - 15;
    
    // Linha decorativa
    addDecorativeLine(footerY - 5, contentWidth, COLORS.lightGray);
    
    // Número da página
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.gray);
    doc.setFont('helvetica', 'normal');
    doc.text(`Página ${pageNumber}`, pageWidth / 2, footerY, { align: 'center' });
    
    // Data de geração
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - marginRight, footerY, { align: 'right' });
    
    pageNumber++;
  };

  // Verificar espaço e adicionar nova página se necessário
  const checkSpace = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - 25) {
      addPageFooter();
      doc.addPage();
      addPageHeader();
      yPosition = 30;
    }
  };

  // Adicionar título de seção principal
  const addSectionTitle = (title: string, icon: string, color: [number, number, number] = COLORS.primary) => {
    checkSpace(20);
    
    // Box com gradiente
    addGradient(marginLeft, yPosition, contentWidth, 15, color, [color[0] + 30, color[1] + 30, color[2] + 30]);
    
    // Ícone circular com número maior
    addCircleIcon(marginLeft + 8, yPosition + 7.5, 5, COLORS.white, icon, color);
    
    // Título SEM numeração duplicada
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, marginLeft + 18, yPosition + 10);
    
    yPosition += 20;
  };

  // Adicionar subtítulo
  const addSubtitle = (subtitle: string, color: [number, number, number] = COLORS.dark) => {
    checkSpace(10);
    
    // Barra lateral colorida
    doc.setFillColor(...COLORS.primary);
    doc.rect(marginLeft, yPosition - 2, 2, 8, 'F');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...color);
    doc.text(subtitle, marginLeft + 5, yPosition + 3);
    
    yPosition += 8;
  };

  // Adicionar texto formatado
  const addText = (text: string, options: { 
    indent?: number; 
    fontSize?: number; 
    color?: [number, number, number];
    bold?: boolean;
    lineHeight?: number;
  } = {}) => {
    const {
      indent = 0,
      fontSize = 10,
      color = COLORS.dark,
      bold = false,
      lineHeight = 5
    } = options;
    
    checkSpace(lineHeight * 2);
    
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...color);
    
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    doc.text(lines, marginLeft + indent, yPosition);
    
    yPosition += lines.length * lineHeight + 2;
  };

  // Adicionar card informativo
  const addInfoCard = (title: string, value: string, icon: string, bgColor: [number, number, number]) => {
    const cardWidth = (contentWidth - 10) / 3;
    const cardHeight = 25;
    const cardX = marginLeft + ((contentWidth - 10) % 3) * (cardWidth + 5);
    
    // Sombra e box
    addShadowBox(cardX, yPosition, cardWidth, cardHeight, bgColor);
    
    // Ícone
    addCircleIcon(cardX + 10, yPosition + 12, 6, COLORS.white, icon, bgColor);
    
    // Título
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.white);
    doc.setFont('helvetica', 'normal');
    const titleLines = doc.splitTextToSize(title, cardWidth - 30);
    doc.text(titleLines, cardX + 20, yPosition + 8);
    
    // Valor
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(value, cardX + 20, yPosition + 18);
  };

  // ========== CAPA ELABORADA ==========
  
  // Fundo com gradiente principal
  addGradient(0, 0, pageWidth, pageHeight, COLORS.primaryDark, COLORS.primary);
  
  // Elementos geométricos decorativos
  doc.setFillColor(255, 255, 255);
  doc.setGState(new (doc as any).GState({ opacity: 0.05 }));
  doc.circle(pageWidth - 30, 50, 80, 'F');
  doc.circle(30, pageHeight - 50, 100, 'F');
  doc.setGState(new (doc as any).GState({ opacity: 1 }));
  
  // Logo no topo
  if (options.logoUrl) {
    try {
      doc.addImage(options.logoUrl, 'PNG', (pageWidth - 80) / 2, 30, 80, 26.67);
    } catch (error) {
      console.error('Erro ao adicionar logo na capa:', error);
    }
  }
  
  // Título principal
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.text('PLANEJAMENTO', pageWidth / 2, 90, { align: 'center' });
  doc.text('ESTRATÉGICO', pageWidth / 2, 105, { align: 'center' });
  
  // Ano com destaque
  doc.setFillColor(255, 255, 255);
  doc.setGState(new (doc as any).GState({ opacity: 0.2 }));
  doc.roundedRect((pageWidth - 60) / 2, 115, 60, 20, 5, 5, 'F');
  doc.setGState(new (doc as any).GState({ opacity: 1 }));
  
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(anoSelecionado, pageWidth / 2, 128, { align: 'center' });
  
  // Linha decorativa
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.line((pageWidth - 100) / 2, 145, (pageWidth + 100) / 2, 145);
  
  // Subtítulo
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Documento Estratégico Organizacional', pageWidth / 2, 155, { align: 'center' });
  
  // Box de informações no rodapé
  const footerBoxY = pageHeight - 60;
  doc.setFillColor(255, 255, 255);
  doc.setGState(new (doc as any).GState({ opacity: 0.15 }));
  doc.roundedRect(30, footerBoxY, pageWidth - 60, 35, 5, 5, 'F');
  doc.setGState(new (doc as any).GState({ opacity: 1 }));
  
  doc.setFontSize(9);
  doc.setTextColor(240, 240, 240);
  doc.text(`Elaborado em: ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageWidth / 2, footerBoxY + 12, { align: 'center' });
  
  const totalObjetivos = dados.direcionamento?.objetivosBsc?.length || 0;
  const totalSwot = dados.swotItems?.length || 0;
  const totalPE = dados.planosAcao?.length || 0;
  
  doc.setFontSize(8);
  doc.text(`${totalObjetivos} Objetivos Estratégicos | ${totalSwot} Análises SWOT | ${totalPE} Planos de Ação`, pageWidth / 2, footerBoxY + 20, { align: 'center' });
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.text('Documento Confidencial - Uso Interno', pageWidth / 2, footerBoxY + 28, { align: 'center' });

  // ========== PÁGINA DE ÍNDICE ==========
  
  doc.addPage();
  addPageHeader();
  yPosition = 35;
  
  // Título do índice
  doc.setFillColor(...COLORS.primary);
  doc.rect(marginLeft, yPosition, contentWidth, 12, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('ÍNDICE', marginLeft + 5, yPosition + 8);
  yPosition += 18;
  
  // Itens do índice
  const indiceItems = [
    { numero: '01', titulo: 'Direcionamento Estratégico', pagina: 3, cor: COLORS.primary },
    { numero: '02', titulo: 'Contexto Organizacional', pagina: 5, cor: COLORS.secondary },
    { numero: '03', titulo: 'Partes Interessadas', pagina: 7, cor: COLORS.info },
    { numero: '04', titulo: 'Análise SWOT', pagina: 8, cor: COLORS.accent },
    { numero: '05', titulo: 'Objetivos Estratégicos', pagina: 10, cor: COLORS.success },
  ];
  
  indiceItems.forEach((item, index) => {
    checkSpace(18);
    
    // Box do item
    doc.setFillColor(...COLORS.lightGray);
    doc.roundedRect(marginLeft, yPosition, contentWidth, 14, 2, 2, 'F');
    
    // Número colorido
    doc.setFillColor(...item.cor);
    doc.circle(marginLeft + 8, yPosition + 7, 5, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(item.numero, marginLeft + 8, yPosition + 9, { align: 'center' });
    
    // Título
    doc.setTextColor(...COLORS.dark);
    doc.setFontSize(11);
    doc.text(item.titulo, marginLeft + 18, yPosition + 9);
    
    // Página
    doc.setTextColor(...COLORS.gray);
    doc.setFontSize(10);
    doc.text(`Pág. ${item.pagina}`, marginLeft + contentWidth - 5, yPosition + 9, { align: 'right' });
    
    yPosition += 17;
  });

  addPageFooter();

  // ========== 1. DIRECIONAMENTO ESTRATÉGICO ==========
  
  doc.addPage();
  addPageHeader();
  yPosition = 35;
  
  addSectionTitle('DIRECIONAMENTO ESTRATÉGICO', '1', COLORS.primary);
  
  // Missão
  if (dados.direcionamento?.missao) {
    checkSpace(35);
    
    addSubtitle('Nossa Missão', COLORS.primary);
    
    // Box destacado
    doc.setFillColor(...COLORS.primaryLight);
    doc.roundedRect(marginLeft, yPosition, contentWidth, 25, 3, 3, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.dark);
    doc.setFont('helvetica', 'italic');
    const missaoLines = doc.splitTextToSize(dados.direcionamento.missao, contentWidth - 10);
    doc.text(missaoLines, marginLeft + 5, yPosition);
    yPosition += missaoLines.length * 5 + 10;
  }
  
  // Visão
  if (dados.direcionamento?.visao) {
    checkSpace(35);
    
    addSubtitle('Nossa Visão', COLORS.secondary);
    
    // Box destacado
    doc.setFillColor(...COLORS.lightGray);
    doc.roundedRect(marginLeft, yPosition, contentWidth, 25, 3, 3, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.dark);
    doc.setFont('helvetica', 'italic');
    const visaoLines = doc.splitTextToSize(dados.direcionamento.visao, contentWidth - 10);
    doc.text(visaoLines, marginLeft + 5, yPosition + 5);
    yPosition += Math.max(25, visaoLines.length * 5 + 10);
  }
  
  // Valores
  if (dados.direcionamento?.valores && dados.direcionamento.valores.length > 0) {
    checkSpace(15);
    addSubtitle('Nossos Valores', COLORS.accent);
    
    dados.direcionamento.valores.forEach((valor, index) => {
      checkSpace(12);
      
      const textoValor = typeof valor === 'string' ? valor : valor.valor;
      
      // Box para cada valor
      doc.setFillColor(255, 250, 240);
      doc.roundedRect(marginLeft + 5, yPosition, contentWidth - 10, 10, 2, 2, 'F');
      
      // Número
      doc.setFillColor(...COLORS.accent);
      doc.circle(marginLeft + 12, yPosition + 5, 3, 'F');
      doc.setTextColor(...COLORS.white);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text((index + 1).toString(), marginLeft + 12, yPosition + 6, { align: 'center' });
      
      // Texto do valor
      doc.setTextColor(...COLORS.dark);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(textoValor, marginLeft + 18, yPosition + 6.5);
      
      yPosition += 12;
    });
    
    yPosition += 5;
  }
  
  // Política da Qualidade
  if (dados.direcionamento?.politicaQualidade) {
    checkSpace(25);
    addSubtitle('Política da Qualidade', COLORS.success);
    
    doc.setFillColor(240, 255, 244);
    doc.roundedRect(marginLeft, yPosition, contentWidth, 20, 3, 3, 'F');
    
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.dark);
    doc.setFont('helvetica', 'normal');
    const politicaLines = doc.splitTextToSize(dados.direcionamento.politicaQualidade, contentWidth - 10);
    doc.text(politicaLines, marginLeft + 5, yPosition + 5);
    yPosition += politicaLines.length * 4.5 + 10;
  }

  // Escopo de Certificação
  if (dados.direcionamento?.escopoCertificacao) {
    checkSpace(25);
    addSubtitle('Escopo de Certificação', COLORS.info);
    
    doc.setFillColor(240, 248, 255);
    doc.roundedRect(marginLeft, yPosition, contentWidth, 20, 3, 3, 'F');
    
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.dark);
    doc.setFont('helvetica', 'normal');
    const escopoLines = doc.splitTextToSize(dados.direcionamento.escopoCertificacao, contentWidth - 10);
    doc.text(escopoLines, marginLeft + 5, yPosition + 5);
    yPosition += escopoLines.length * 4.5 + 10;
  }

  // Exclusão de Requisito
  if (dados.direcionamento?.exclusaoRequisito) {
    checkSpace(25);
    addSubtitle('Exclusão de Requisito', COLORS.warning);
    
    doc.setFillColor(255, 252, 240);
    doc.roundedRect(marginLeft, yPosition, contentWidth, 20, 3, 3, 'F');
    
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.dark);
    doc.setFont('helvetica', 'normal');
    const exclusaoLines = doc.splitTextToSize(dados.direcionamento.exclusaoRequisito, contentWidth - 10);
    doc.text(exclusaoLines, marginLeft + 5, yPosition + 5);
    yPosition += exclusaoLines.length * 4.5 + 10;
  }
  
  // Desdobramentos Estratégicos (Políticas BSC)
  if (dados.direcionamento?.politicaBsc && dados.direcionamento.politicaBsc.length > 0) {
    checkSpace(40);
    addSubtitle('Desdobramentos Estratégicos', COLORS.primary);
    
    const politicasData = dados.direcionamento.politicaBsc.map(pol => [
      pol.perspectiva,
      pol.descricao
    ]);
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Perspectiva', 'Desdobramento']],
      body: politicasData,
      theme: 'striped',
      headStyles: { 
        fillColor: COLORS.primary, 
        textColor: COLORS.white, 
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center'
      },
      styles: { 
        fontSize: 9, 
        cellPadding: 4,
        lineColor: COLORS.lightGray,
        lineWidth: 0.1
      },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold', fillColor: COLORS.primaryLight },
        1: { cellWidth: 130 }
      },
      margin: { left: marginLeft, right: marginRight },
      alternateRowStyles: { fillColor: [250, 250, 250] }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  addPageFooter();

  // ========== 2. CONTEXTO ORGANIZACIONAL ==========
  
  doc.addPage();
  addPageHeader();
  yPosition = 35;
  
  addSectionTitle('CONTEXTO ORGANIZACIONAL', '2', COLORS.secondary);
  
  // Histórico da Empresa
  if (dados.cenario?.historicoEmpresa) {
    checkSpace(25);
    addSubtitle('Histórico da Empresa', COLORS.secondary);
    
    doc.setFillColor(245, 240, 255);
    doc.roundedRect(marginLeft, yPosition, contentWidth, 20, 3, 3, 'F');
    
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.dark);
    doc.setFont('helvetica', 'normal');
    const historicoLines = doc.splitTextToSize(dados.cenario.historicoEmpresa, contentWidth - 10);
    doc.text(historicoLines, marginLeft + 5, yPosition + 5);
    yPosition += Math.max(20, historicoLines.length * 4.5 + 10);
  }
  
  // Grid de informações principais
  const cenarioItems = [
    { label: 'Produtos e Serviços', value: dados.cenario?.produtosServicos, color: COLORS.primary },
    { label: 'Região de Atuação', value: dados.cenario?.regiaoAtuacao, color: COLORS.info },
    { label: 'Canais de Venda', value: dados.cenario?.canaisVenda, color: COLORS.success },
  ];
  
  cenarioItems.forEach(item => {
    if (item.value) {
      checkSpace(20);
      
      // Box com borda colorida
      doc.setDrawColor(...item.color);
      doc.setLineWidth(1);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(marginLeft, yPosition, contentWidth, 18, 2, 2, 'FD');
      
      // Barra lateral colorida
      doc.setFillColor(...item.color);
      doc.roundedRect(marginLeft, yPosition, 4, 18, 2, 2, 'F');
      
      // Label
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.gray);
      doc.setFont('helvetica', 'bold');
      doc.text(item.label.toUpperCase(), marginLeft + 8, yPosition + 5);
      
      // Conteúdo
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.dark);
      doc.setFont('helvetica', 'normal');
      const contentLines = doc.splitTextToSize(item.value, contentWidth - 15);
      doc.text(contentLines, marginLeft + 8, yPosition + 11);
      
      yPosition += 22;
    }
  });
  
  // Principais Stakeholders em colunas
  const stakeholders = [
    { title: 'Principais Clientes', data: dados.cenario?.principaisClientes, color: COLORS.primary },
    { title: 'Principais Fornecedores', data: dados.cenario?.principaisFornecedores, color: COLORS.secondary },
    { title: 'Principais Concorrentes', data: dados.cenario?.principaisConcorrentes, color: COLORS.danger },
  ];
  
  stakeholders.forEach(stakeholder => {
    if (stakeholder.data && stakeholder.data.length > 0) {
      checkSpace(25);
      addSubtitle(`${stakeholder.title}`, stakeholder.color);
      
      // Grid de cards
      let xPos = marginLeft;
      let cardYPos = yPosition;
      const cardWidth = (contentWidth - 10) / 3;
      
      stakeholder.data.forEach((item: any, index: number) => {
        if (index > 0 && index % 3 === 0) {
          cardYPos += 18;
          xPos = marginLeft;
          checkSpace(18);
        }
        
        // Card
        doc.setFillColor(...COLORS.lightGray);
        doc.roundedRect(xPos, cardYPos, cardWidth - 2, 15, 2, 2, 'F');
        
        // Número
        doc.setFillColor(...stakeholder.color);
        doc.circle(xPos + 6, cardYPos + 7.5, 3, 'F');
        doc.setTextColor(...COLORS.white);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text((index + 1).toString(), xPos + 6, cardYPos + 8.5, { align: 'center' });
        
        // Nome
        doc.setTextColor(...COLORS.dark);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const nameLines = doc.splitTextToSize(item.nome, cardWidth - 15);
        doc.text(nameLines, xPos + 11, cardYPos + 8);
        
        xPos += cardWidth + 3;
      });
      
      yPosition = cardYPos + 20;
    }
  });

  addPageFooter();

  // ========== 3. PARTES INTERESSADAS ==========
  
  if (dados.partesInteressadas && dados.partesInteressadas.length > 0) {
    doc.addPage();
    addPageHeader();
    yPosition = 35;
    
    addSectionTitle('PARTES INTERESSADAS', '3', COLORS.info);
    
    const partesData = dados.partesInteressadas.map((parte, index) => [
      (index + 1).toString(),
      parte.nome,
      parte.expectativa,
      parte.atendimento
    ]);
    
    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Nome', 'Expectativa', 'Atendimento']],
      body: partesData,
      theme: 'striped',
      headStyles: { 
        fillColor: COLORS.info, 
        textColor: COLORS.white, 
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center'
      },
      styles: { 
        fontSize: 8, 
        cellPadding: 3,
        lineColor: COLORS.lightGray,
        lineWidth: 0.1
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center', fillColor: COLORS.primaryLight, fontStyle: 'bold' },
        1: { cellWidth: 40, fontStyle: 'bold' },
        2: { cellWidth: 60 },
        3: { cellWidth: 60 }
      },
      margin: { left: marginLeft, right: marginRight },
      alternateRowStyles: { fillColor: [250, 250, 250] }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 10;
    addPageFooter();
  }

  // ========== 4. ANÁLISE SWOT ==========
  
  doc.addPage();
  addPageHeader();
  yPosition = 35;
  
  addSectionTitle('ANÁLISE SWOT', '4', COLORS.accent);
  
  if (dados.swotItems && dados.swotItems.length > 0) {
    const swotCategories = [
      { 
        type: 'Forças', 
        items: dados.swotItems.filter(i => i.quadrante === 'forcas'), 
        color: COLORS.success
      },
      { 
        type: 'Fraquezas', 
        items: dados.swotItems.filter(i => i.quadrante === 'fraquezas'), 
        color: COLORS.danger
      },
      { 
        type: 'Oportunidades', 
        items: dados.swotItems.filter(i => i.quadrante === 'oportunidades'), 
        color: COLORS.info
      },
      { 
        type: 'Ameaças', 
        items: dados.swotItems.filter(i => i.quadrante === 'ameacas'), 
        color: COLORS.warning
      }
    ];
    
    swotCategories.forEach(category => {
      if (category.items.length > 0) {
        checkSpace(30);
        
        // Subtítulo sem emojis
        doc.setFillColor(...category.color);
        doc.roundedRect(marginLeft, yPosition, contentWidth, 10, 2, 2, 'F');
        doc.setTextColor(...COLORS.white);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(category.type, marginLeft + 5, yPosition + 7);
        yPosition += 13;
        
        const swotData = category.items.map((item, index) => [
          (index + 1).toString(),
          item.numeroSwot,
          item.descricao,
          item.planoAcaoVinculado || '-'
        ]);
        
        autoTable(doc, {
          startY: yPosition,
          head: [['#', 'ID', 'Descrição', 'PE Vinculado']],
          body: swotData,
          theme: 'grid',
          headStyles: { 
            fillColor: category.color, 
            textColor: COLORS.white, 
            fontStyle: 'bold',
            fontSize: 8
          },
          styles: { 
            fontSize: 8, 
            cellPadding: 3,
            lineColor: COLORS.lightGray,
            lineWidth: 0.1
          },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
            1: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
            2: { cellWidth: 120 },
            3: { cellWidth: 30, halign: 'center' }
          },
          margin: { left: marginLeft, right: marginRight }
        });
        
        yPosition = (doc as any).lastAutoTable.finalY + 8;
      }
    });
  }

  addPageFooter();

  // ========== 5. OBJETIVOS ESTRATÉGICOS ==========
  
  doc.addPage();
  addPageHeader();
  yPosition = 35;
  
  addSectionTitle('OBJETIVOS ESTRATÉGICOS', '5', COLORS.success);
  
  if (dados.direcionamento?.objetivosBsc && dados.direcionamento.objetivosBsc.length > 0) {
    const perspectivas = [
      { 
        key: 'financeira' as const, 
        label: 'Perspectiva Financeira',
        color: COLORS.success
      },
      { 
        key: 'clientes' as const, 
        label: 'Perspectiva de Clientes',
        color: COLORS.primary
      },
      { 
        key: 'processos' as const, 
        label: 'Perspectiva de Processos Internos',
        color: COLORS.secondary
      },
      { 
        key: 'aprendizado' as const, 
        label: 'Perspectiva de Aprendizado e Crescimento',
        color: COLORS.accent
      }
    ];
    
    perspectivas.forEach(persp => {
      const objetivos = dados.direcionamento.objetivosBsc.filter(obj => obj.perspectiva === persp.key);
      
      if (objetivos.length > 0) {
        checkSpace(35);
        
        // Título da perspectiva
        doc.setFillColor(...persp.color);
        doc.roundedRect(marginLeft, yPosition, contentWidth, 10, 2, 2, 'F');
        doc.setTextColor(...COLORS.white);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(persp.label, marginLeft + 5, yPosition + 7);
        yPosition += 13;
        
        const objetivosData = objetivos.map((obj, index) => {
          return [
            (index + 1).toString(),
            obj.numeroObjetivo,
            obj.descricao,
            obj.indicadorProjeto || '-',
            obj.resultadoAtual || '-',
            obj.meta || '-',
            obj.prazo ? formatarData(obj.prazo) : '-',
            obj.planoAcaoVinculado || '-'
          ];
        });
        
        autoTable(doc, {
          startY: yPosition,
          head: [['#', 'ID', 'Objetivo', 'Indicador', 'Atual', 'Meta', 'Prazo', 'PE']],
          body: objetivosData,
          theme: 'grid',
          headStyles: { 
            fillColor: persp.color, 
            textColor: COLORS.white, 
            fontStyle: 'bold', 
            fontSize: 7,
            halign: 'center'
          },
          styles: { 
            fontSize: 7, 
            cellPadding: 2,
            lineColor: COLORS.lightGray,
            lineWidth: 0.1
          },
          columnStyles: {
            0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' },
            1: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
            2: { cellWidth: 55 },
            3: { cellWidth: 28 },
            4: { cellWidth: 15, halign: 'center' },
            5: { cellWidth: 15, halign: 'center' },
            6: { cellWidth: 20, halign: 'center' },
            7: { cellWidth: 14, halign: 'center' }
          },
          margin: { left: marginLeft, right: marginRight }
        });
        
        yPosition = (doc as any).lastAutoTable.finalY + 8;
      }
    });
  }

  addPageFooter();

  // ========== 6. PLANOS DE AÇÃO ESTRATÉGICOS ==========
  
  if (dados.planosAcao && dados.planosAcao.length > 0) {
    doc.addPage();
    addPageHeader();
    yPosition = 35;
    
    addSectionTitle('PLANOS DE AÇÃO ESTRATÉGICOS', '6', COLORS.primary);
    
    // ===== RESUMO GERAL =====
    checkSpace(35);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.gray);
    doc.text('Resumo Geral', marginLeft, yPosition);
    yPosition += 8;
    
    const totalPE = dados.planosAcao.length;
    const peNaoIniciados = dados.planosAcao.filter(p => p.statusAcompanhamento === 'nao-iniciado').length;
    const peEmAndamento = dados.planosAcao.filter(p => p.statusAcompanhamento === 'em-andamento').length;
    const peConcluidos = dados.planosAcao.filter(p => p.statusAcompanhamento === 'concluido').length;
    const peAtrasados = dados.planosAcao.filter(p => p.statusAcompanhamento === 'atrasado').length;
    
    const cardWidth = (contentWidth - 15) / 4;
    const cardHeight = 25;
    let cardX = marginLeft;
    
    // Card: Total de PEs
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(cardX, yPosition, cardWidth, cardHeight, 3, 3, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Total de PEs', cardX + cardWidth / 2, yPosition + 9, { align: 'center' });
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(totalPE.toString(), cardX + cardWidth / 2, yPosition + 19, { align: 'center' });
    cardX += cardWidth + 5;
    
    // Card: Em Andamento
    doc.setFillColor(...COLORS.info);
    doc.roundedRect(cardX, yPosition, cardWidth, cardHeight, 3, 3, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Em Andamento', cardX + cardWidth / 2, yPosition + 9, { align: 'center' });
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(peEmAndamento.toString(), cardX + cardWidth / 2, yPosition + 19, { align: 'center' });
    cardX += cardWidth + 5;
    
    // Card: Concluídos
    doc.setFillColor(...COLORS.success);
    doc.roundedRect(cardX, yPosition, cardWidth, cardHeight, 3, 3, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Concluídos', cardX + cardWidth / 2, yPosition + 9, { align: 'center' });
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(peConcluidos.toString(), cardX + cardWidth / 2, yPosition + 19, { align: 'center' });
    cardX += cardWidth + 5;
    
    // Card: Atrasados
    doc.setFillColor(...COLORS.danger);
    doc.roundedRect(cardX, yPosition, cardWidth, cardHeight, 3, 3, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Atrasados', cardX + cardWidth / 2, yPosition + 9, { align: 'center' });
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(peAtrasados.toString(), cardX + cardWidth / 2, yPosition + 19, { align: 'center' });
    
    yPosition += cardHeight + 15;
    
    // ===== AGRUPAMENTO POR ORIGEM =====
    const pesPorOrigem = {
      'SWOT': dados.planosAcao.filter(p => p.origemTipo === 'SWOT'),
      'Objetivo': dados.planosAcao.filter(p => p.origemTipo === 'Objetivo'),
      'Mudança': dados.planosAcao.filter(p => p.origemTipo === 'Mudança'),
      'Outros': dados.planosAcao.filter(p => p.origemTipo === 'Outros')
    };
    
    const coresPorOrigem = {
      'SWOT': COLORS.accent,
      'Objetivo': COLORS.success,
      'Mudança': COLORS.secondary,
      'Outros': COLORS.gray
    };
    
    // Para cada grupo de origem
    Object.entries(pesPorOrigem).forEach(([origem, planos]) => {
      if (planos.length > 0) {
        checkSpace(20);
        
        // Header do grupo (ex: "SWOT (5)")
        const corOrigem = coresPorOrigem[origem as keyof typeof coresPorOrigem];
        doc.setFillColor(...corOrigem);
        doc.roundedRect(marginLeft, yPosition, contentWidth, 10, 2, 2, 'F');
        doc.setTextColor(...COLORS.white);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${origem} (${planos.length})`, marginLeft + 5, yPosition + 7);
        yPosition += 13;
        
        // Cards de cada PE
        planos.forEach((plano) => {
          checkSpace(55);
          
          const boxHeight = 48;
          
          // Box principal com borda colorida
          doc.setDrawColor(...corOrigem);
          doc.setLineWidth(1.2);
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(marginLeft, yPosition, contentWidth, boxHeight, 3, 3, 'FD');
          
          // Círculo com número do PE
          doc.setFillColor(...corOrigem);
          doc.circle(marginLeft + 12, yPosition + 10, 6, 'F');
          doc.setTextColor(...COLORS.white);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text(plano.numeroPE, marginLeft + 12, yPosition + 12, { align: 'center' });
          
          // Status Badge
          const statusConfig = {
            'nao-iniciado': { label: 'Não Iniciado', color: COLORS.gray },
            'em-andamento': { label: 'Em Andamento', color: COLORS.info },
            'concluido': { label: 'Concluído', color: COLORS.success },
            'atrasado': { label: 'Atrasado', color: COLORS.danger },
            'planejamento': { label: 'Planejamento', color: COLORS.primary }
          };
          
          const status =
            statusConfig[plano.statusAcompanhamento as keyof typeof statusConfig] ?? statusConfig['planejamento'];
          const badgeWidth = 28;
          doc.setFillColor(
            (status.color as any)[0],
            (status.color as any)[1],
            (status.color as any)[2]
          );
          doc.roundedRect(marginLeft + contentWidth - badgeWidth - 3, yPosition + 5, badgeWidth, 7, 2, 2, 'F');
          doc.setTextColor(...COLORS.white);
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.text(status.label, marginLeft + contentWidth - badgeWidth / 2 - 3, yPosition + 9, { align: 'center' });
          
          // Descrição da Ação (máximo 2 linhas)
          doc.setFontSize(10);
          doc.setTextColor(...COLORS.dark);
          doc.setFont('helvetica', 'bold');
          const acaoLines = doc.splitTextToSize(plano.acao, contentWidth - 35);
          doc.text(acaoLines.slice(0, 2), marginLeft + 22, yPosition + 10);
          
          // Linha separadora
          doc.setDrawColor(...COLORS.lightGray);
          doc.setLineWidth(0.2);
          doc.line(marginLeft + 5, yPosition + 22, marginLeft + contentWidth - 5, yPosition + 22);
          
          // Grid de Informações - 3 colunas
          const infoY = yPosition + 28;
          const col1X = marginLeft + 5;
          const col2X = marginLeft + 5 + (contentWidth - 10) / 3;
          const col3X = marginLeft + 5 + (contentWidth - 10) * 2 / 3;
          
          // Coluna 1: Período
          doc.setFontSize(6);
          doc.setTextColor(...COLORS.gray);
          doc.setFont('helvetica', 'normal');
          doc.text('PERÍODO', col1X, infoY);
          doc.setFontSize(8);
          doc.setTextColor(...COLORS.dark);
          doc.setFont('helvetica', 'bold');
          doc.text(`${formatarData(plano.dataInicio)} - ${formatarData(plano.prazoFinal)}`, col1X, infoY + 5);
          
          // Coluna 2: Tarefas
          doc.setFontSize(6);
          doc.setTextColor(...COLORS.gray);
          doc.setFont('helvetica', 'normal');
          doc.text('TAREFAS', col2X, infoY);
          doc.setFontSize(8);
          doc.setTextColor(...COLORS.dark);
          doc.setFont('helvetica', 'bold');
          const totalTarefas = plano.tarefas.length;
          const tarefasConcluidas = plano.tarefas.filter(t => t.concluida).length;
          doc.text(`${tarefasConcluidas}/${totalTarefas} concluídas`, col2X, infoY + 5);
          
          // Coluna 3: Investimento
          doc.setFontSize(6);
          doc.setTextColor(...COLORS.gray);
          doc.setFont('helvetica', 'normal');
          doc.text('INVESTIMENTO', col3X, infoY);
          doc.setFontSize(8);
          doc.setTextColor(...COLORS.dark);
          doc.setFont('helvetica', 'bold');
          doc.text(`R$ ${formatarNumero(plano.investimento, { decimaisMin: 2, decimaisMax: 2 })}`, col3X, infoY + 5);
          
          // Barra de Progresso
          const progressY = yPosition + 40;
          const progressBarWidth = contentWidth - 10;
          const progressPercentage = totalTarefas > 0 ? (tarefasConcluidas / totalTarefas) : 0;
          
          // Fundo cinza
          doc.setFillColor(...COLORS.lightGray);
          doc.roundedRect(marginLeft + 5, progressY, progressBarWidth, 4, 2, 2, 'F');
          
          // Preenchimento colorido
          if (progressPercentage > 0) {
            const progressColor = progressPercentage === 1 ? COLORS.success : 
                                progressPercentage >= 0.7 ? COLORS.info : 
                                progressPercentage >= 0.3 ? COLORS.warning : COLORS.danger;
            doc.setFillColor(...progressColor);
            doc.roundedRect(marginLeft + 5, progressY, progressBarWidth * progressPercentage, 4, 2, 2, 'F');
          }
          
          // Texto do percentual
          doc.setFontSize(6);
          doc.setTextColor(...COLORS.gray);
          doc.setFont('helvetica', 'normal');
          doc.text(`${Math.round(progressPercentage * 100)}% completo`, marginLeft + 5, progressY + 8);
          
          yPosition += boxHeight + 4;
        });
        
        yPosition += 5;
      }
    });
    
    addPageFooter();
  }

  // ========== PÁGINA FINAL ==========
  
  doc.addPage();
  
  // Fundo com gradiente
  addGradient(0, 0, pageWidth, pageHeight, COLORS.primary, COLORS.primaryDark);
  
  // Mensagem central
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('JUNTOS RUMO AO FUTURO', pageWidth / 2, pageHeight / 2 - 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Este é o nosso compromisso com a excelência', pageWidth / 2, pageHeight / 2, { align: 'center' });
  
  // Linha decorativa
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.line((pageWidth - 120) / 2, pageHeight / 2 + 10, (pageWidth + 120) / 2, pageHeight / 2 + 10);
  
  // Rodapé final
  doc.setFontSize(9);
  doc.text(`Planejamento Estratégico ${anoSelecionado}`, pageWidth / 2, pageHeight - 40, { align: 'center' });
  doc.setFontSize(8);
  doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, pageHeight - 30, { align: 'center' });

  // Salvar PDF
  const nomeArquivo = `Planejamento_Estrategico_${anoSelecionado}_Premium_${new Date().getTime()}.pdf`;
  doc.save(nomeArquivo);
}
