import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DadosEstrategicos } from '../types/strategic';
import { formatarData } from './formatters';

interface PDFOptions {
  logoUrl?: string;
}

export function generateStrategicPlanPDF(dados: DadosEstrategicos, anoSelecionado: string, options: PDFOptions = {}) {
  const doc = new jsPDF();
  let yPosition = 20;
  
  // Configurações de estilo
  const primaryColor: [number, number, number] = [41, 98, 255];
  const headerColor: [number, number, number] = [240, 242, 245];
  const textColor: [number, number, number] = [33, 33, 33];
  const marginLeft = 20; // Margem esquerda padrão
  const contentWidth = 170; // Largura do conteúdo (210 - 20 - 20)
  
  // Função para adicionar cabeçalho com logo em cada página
  const addPageHeader = () => {
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Planejamento Estratégico ' + anoSelecionado, marginLeft, 10);
    
    // Adicionar logo se fornecida
    if (options.logoUrl) {
      try {
        doc.addImage(options.logoUrl, 'PNG', 160, 5, 30, 10);
      } catch (error) {
        console.error('Erro ao adicionar logo:', error);
      }
    }
    
    doc.setTextColor(...textColor);
  };
  
  // Função auxiliar para adicionar título de seção
  const addSectionTitle = (title: string) => {
    if (yPosition > 260) {
      doc.addPage();
      addPageHeader();
      yPosition = 20;
    }
    doc.setFillColor(...primaryColor);
    doc.rect(marginLeft, yPosition, contentWidth, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, marginLeft + 5, yPosition + 7);
    yPosition += 15;
    doc.setTextColor(...textColor);
  };
  
  // Função auxiliar para adicionar subtítulo
  const addSubtitle = (subtitle: string) => {
    if (yPosition > 270) {
      doc.addPage();
      addPageHeader();
      yPosition = 20;
    }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(subtitle, marginLeft, yPosition);
    yPosition += 6;
  };
  
  // Função auxiliar para adicionar texto
  const addText = (text: string, indent: number = 0) => {
    if (yPosition > 270) {
      doc.addPage();
      addPageHeader();
      yPosition = 20;
    }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    doc.text(lines, marginLeft + indent, yPosition);
    yPosition += lines.length * 5 + 3;
  };
  
  // CAPA
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 100, 'F');
  
  // Adicionar logo na capa se fornecida
  if (options.logoUrl) {
    try {
      doc.addImage(options.logoUrl, 'PNG', 80, 15, 50, 16.67);
    } catch (error) {
      console.error('Erro ao adicionar logo na capa:', error);
    }
  }
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('PLANEJAMENTO ESTRATÉGICO', 105, 50, { align: 'center' });
  doc.setFontSize(16);
  doc.text(anoSelecionado, 105, 65, { align: 'center' });
  
  doc.setTextColor(...textColor);
  doc.setFontSize(12);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 105, 120, { align: 'center' });
  
  // Nova página para conteúdo
  doc.addPage();
  addPageHeader();
  yPosition = 20;
  
  // 1. DIRECIONAMENTO ESTRATÉGICO
  addSectionTitle('1. DIRECIONAMENTO ESTRATÉGICO');
  
  if (dados.direcionamento && dados.direcionamento.missao) {
    addSubtitle('Missão');
    addText(dados.direcionamento.missao);
  }
  
  if (dados.direcionamento && dados.direcionamento.visao) {
    addSubtitle('Visão');
    addText(dados.direcionamento.visao);
  }
  
  if (dados.direcionamento && dados.direcionamento.valores && dados.direcionamento.valores.length > 0) {
    addSubtitle('Valores');
    dados.direcionamento.valores.forEach((valor, index) => {
      const textoValor = typeof valor === 'string' ? valor : valor.valor;
      addText(`${index + 1}. ${textoValor}`, 20);
    });
  }
  
  // Política da Qualidade
  if (dados.direcionamento && dados.direcionamento.politicaQualidade) {
    addSubtitle('Política da Qualidade');
    addText(dados.direcionamento.politicaQualidade);
  }
  
  // Escopo de Certificação
  if (dados.direcionamento && dados.direcionamento.escopoCertificacao) {
    addSubtitle('Escopo de Certificação');
    addText(dados.direcionamento.escopoCertificacao);
  }
  
  // Exclusão de Requisito
  if (dados.direcionamento && dados.direcionamento.exclusaoRequisito) {
    addSubtitle('Exclusão de Requisito');
    addText(dados.direcionamento.exclusaoRequisito);
  }
  
  // Políticas BSC
  if (dados.direcionamento && dados.direcionamento.politicaBsc && dados.direcionamento.politicaBsc.length > 0) {
    yPosition += 5;
    addSubtitle('Desdobramentos Estratégicos');
    
    const politicasData = dados.direcionamento.politicaBsc.map(pol => [
      pol.perspectiva,
      pol.descricao
    ]);
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Perspectiva', 'Desdobramento']],
      body: politicasData,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 130 }
      },
      margin: { left: marginLeft, right: 20 }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // 2. CONTEXTO ORGANIZACIONAL
  doc.addPage();
  addPageHeader();
  yPosition = 20;
  addSectionTitle('2. CONTEXTO ORGANIZACIONAL');
  
  if (dados.cenario && dados.cenario.historicoEmpresa) {
    addSubtitle('Histórico da Empresa');
    addText(dados.cenario.historicoEmpresa);
  }
  
  if (dados.cenario && dados.cenario.produtosServicos) {
    addSubtitle('Produtos e Serviços');
    addText(dados.cenario.produtosServicos);
  }
  
  if (dados.cenario && dados.cenario.regiaoAtuacao) {
    addSubtitle('Região de Atuação');
    addText(dados.cenario.regiaoAtuacao);
  }
  
  if (dados.cenario && dados.cenario.canaisVenda) {
    addSubtitle('Canais de Venda');
    addText(dados.cenario.canaisVenda);
  }
  
  if (dados.cenario && dados.cenario.principaisClientes && dados.cenario.principaisClientes.length > 0) {
    addSubtitle('Principais Clientes');
    dados.cenario.principaisClientes.forEach((cliente, index) => {
      addText(`${index + 1}. ${cliente.nome}`, 20);
    });
  }
  
  if (dados.cenario && dados.cenario.principaisFornecedores && dados.cenario.principaisFornecedores.length > 0) {
    addSubtitle('Principais Fornecedores');
    dados.cenario.principaisFornecedores.forEach((fornecedor, index) => {
      addText(`${index + 1}. ${fornecedor.nome}`, 20);
    });
  }
  
  if (dados.cenario && dados.cenario.principaisConcorrentes && dados.cenario.principaisConcorrentes.length > 0) {
    addSubtitle('Principais Concorrentes');
    dados.cenario.principaisConcorrentes.forEach((concorrente, index) => {
      addText(`${index + 1}. ${concorrente.nome}`, 20);
    });
  }
  
  // 3. PARTES INTERESSADAS
  if (dados.partesInteressadas && dados.partesInteressadas.length > 0) {
    doc.addPage();
    addPageHeader();
    yPosition = 20;
    addSectionTitle('3. PARTES INTERESSADAS');
    
    const partesData = dados.partesInteressadas.map(parte => [
      parte.nome,
      parte.expectativa,
      parte.atendimento
    ]);
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Nome', 'Expectativa', 'Atendimento']],
      body: partesData,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 62.5 },
        2: { cellWidth: 62.5 }
      },
      margin: { left: marginLeft, right: 20 }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // 4. ANÁLISE SWOT
  doc.addPage();
  addPageHeader();
  yPosition = 20;
  addSectionTitle('4. ANÁLISE SWOT');
  
  if (dados.swotItems && dados.swotItems.length > 0) {
    const swotCategories = [
      { type: 'Forças', items: dados.swotItems.filter(i => i.quadrante === 'forcas'), color: [34, 197, 94] as [number, number, number] },
      { type: 'Fraquezas', items: dados.swotItems.filter(i => i.quadrante === 'fraquezas'), color: [239, 68, 68] as [number, number, number] },
      { type: 'Oportunidades', items: dados.swotItems.filter(i => i.quadrante === 'oportunidades'), color: [59, 130, 246] as [number, number, number] },
      { type: 'Ameaças', items: dados.swotItems.filter(i => i.quadrante === 'ameacas'), color: [234, 179, 8] as [number, number, number] }
    ];
    
    swotCategories.forEach(category => {
      if (category.items.length > 0) {
        addSubtitle(category.type);
        
        const swotData = category.items.map(item => [
          item.numeroSwot,
          item.descricao,
          item.planoAcaoVinculado || '-'
        ]);
        
        autoTable(doc, {
          startY: yPosition,
          head: [['ID', 'Descrição', 'PAE']],
          body: swotData,
          theme: 'grid',
          headStyles: { fillColor: category.color, textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 9, cellPadding: 3 },
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 125 },
            2: { cellWidth: 25 }
          },
          margin: { left: marginLeft, right: 20 }
        });
        
        yPosition = (doc as any).lastAutoTable.finalY + 8;
      }
    });
  }
  
  // 5. OBJETIVOS ESTRATÉGICOS
  doc.addPage();
  addPageHeader();
  yPosition = 20;
  addSectionTitle('5. OBJETIVOS ESTRATÉGICOS');
  
  if (dados.direcionamento && dados.direcionamento.objetivosBsc && dados.direcionamento.objetivosBsc.length > 0) {
    const perspectivas = [
      { key: 'financeira' as const, label: 'Perspectiva Financeira' },
      { key: 'clientes' as const, label: 'Perspectiva de Clientes' },
      { key: 'processos' as const, label: 'Perspectiva de Processos Internos' },
      { key: 'aprendizado' as const, label: 'Perspectiva de Aprendizado e Crescimento' }
    ];
    
    perspectivas.forEach(persp => {
      const objetivos = dados.direcionamento.objetivosBsc.filter(obj => obj.perspectiva === persp.key);
      
      if (objetivos.length > 0) {
        addSubtitle(persp.label);
        
        const objetivosData = objetivos.map(obj => {
          return [
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
          head: [['ID', 'Objetivo', 'Indicador', 'Atual', 'Meta', 'Prazo', 'PAE']],
          body: objetivosData,
          theme: 'grid',
          headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 7 },
          styles: { fontSize: 7, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 15 },
            1: { cellWidth: 50 },
            2: { cellWidth: 30 },
            3: { cellWidth: 18 },
            4: { cellWidth: 18 },
            5: { cellWidth: 22 },
            6: { cellWidth: 17 }
          },
          margin: { left: marginLeft, right: 20 }
        });
        
        yPosition = (doc as any).lastAutoTable.finalY + 8;
      }
    });
  }
  
  // Salvar PDF
  const nomeArquivo = `Planejamento_Estrategico_${anoSelecionado}_${new Date().getTime()}.pdf`;
  doc.save(nomeArquivo);
}