import jsPDF from 'jspdf';
import { Documento } from '../types/documentos';

/**
 * Exporta um documento para PDF
 */
export function exportarDocumentoParaPDF(documento: Documento, tipoNome: string) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Função auxiliar para adicionar texto com quebra de linha
  const addText = (text: string, fontSize: number, isBold: boolean = false, align: 'left' | 'center' | 'right' = 'left') => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    
    if (align === 'center') {
      doc.text(text, pageWidth / 2, yPosition, { align: 'center' });
    } else if (align === 'right') {
      doc.text(text, pageWidth - margin, yPosition, { align: 'right' });
    } else {
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, margin, yPosition);
      yPosition += lines.length * (fontSize * 0.5);
    }
    yPosition += fontSize * 0.35;
  };

  // Verificar se precisa de nova página
  const checkNewPage = (requiredSpace: number = 20) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }
  };

  // Cabeçalho do documento
  addText(documento.nome, 18, true, 'center');
  yPosition += 5;
  
  // Linha separadora
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Informações do documento
  checkNewPage(60);
  
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPosition - 5, maxWidth, 55, 'F');
  
  yPosition += 5;
  addText(`Código: ${documento.codigo}`, 10, true);
  addText(`Tipo: ${tipoNome}`, 10);
  addText(`Versão: ${documento.versao}`, 10);
  addText(`Departamento: ${documento.departamento}`, 10);
  addText(`Responsável: ${documento.responsavel}`, 10);
  addText(`Data de Emissão: ${documento.dataEmissao}`, 10);
  addText(`Data de Revisão: ${documento.dataRevisao}`, 10);
  addText(`Status: ${documento.status === 'vigente' ? 'Vigente' : documento.status === 'em-revisao' ? 'Em Revisão' : 'Obsoleto'}`, 10);
  
  yPosition += 10;
  checkNewPage();

  // Descrição
  if (documento.descricao) {
    addText('Descrição:', 12, true);
    yPosition += 2;
    addText(documento.descricao, 10);
    yPosition += 10;
  }

  // Conteúdo (remover tags HTML e formatar)
  if (documento.conteudoHtml) {
    checkNewPage(30);
    addText('Conteúdo:', 12, true);
    yPosition += 5;

    // Converter HTML para texto simples (básico)
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = documento.conteudoHtml;
    
    // Processar elementos do HTML
    const processNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text) {
          checkNewPage(15);
          addText(text, 10);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const tagName = element.tagName.toLowerCase();

        switch (tagName) {
          case 'h1':
            checkNewPage(20);
            yPosition += 5;
            addText(element.textContent || '', 16, true);
            yPosition += 5;
            break;
          case 'h2':
            checkNewPage(18);
            yPosition += 3;
            addText(element.textContent || '', 14, true);
            yPosition += 3;
            break;
          case 'h3':
            checkNewPage(16);
            yPosition += 2;
            addText(element.textContent || '', 12, true);
            yPosition += 2;
            break;
          case 'p':
            checkNewPage(15);
            addText(element.textContent || '', 10);
            yPosition += 3;
            break;
          case 'ul':
          case 'ol':
            Array.from(element.children).forEach((li, index) => {
              checkNewPage(12);
              const bullet = tagName === 'ul' ? '• ' : `${index + 1}. `;
              addText(bullet + (li.textContent || ''), 10);
            });
            yPosition += 5;
            break;
          case 'br':
            yPosition += 5;
            break;
          default:
            // Para outros elementos, processar filhos
            Array.from(node.childNodes).forEach(processNode);
        }
      }
    };

    Array.from(tempDiv.childNodes).forEach(processNode);
  }

  // Rodapé
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text(
      `Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
      pageWidth - margin,
      pageHeight - 10,
      { align: 'right' }
    );
  }

  // Salvar PDF
  const nomeArquivo = `${documento.codigo}_${documento.nome.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(nomeArquivo);
}