/**
 * @file pdf-export.service.ts
 * @description Gerador Profissional de PDF Vetorial A4 para Orçamentos Gráficos
 * @project OrçaGraf
 * 
 * REQUISITOS:
 * - Papel A4 com layout profissional e quebra de página tratada
 * - Dados da gráfica (Logo, Razão Social, CNPJ, Contatos, Endereço)
 * - Dados do cliente e itens detalhados (Materiais, Dimensões, Acabamentos, Qtd, Preço Unitário, Total)
 * - Resumo comercial (Subtotal, Desconto aplicado, Total Final em BRL)
 * - Condições de pagamento, prazo de produção e observações comerciais
 * - Nome do atendente/vendedor e rodapé personalizado
 * - NÃO inclui dados internos (tenantId, custos, margem de lucro, IDs de banco)
 * - Nome do arquivo: Orcamento_NUMERO_CLIENTE.pdf
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Quote } from '../types/quote';
import { Company } from '../types/tenant';
import { formatCentsToBRL } from '../domain/money';
import { inferPricingMode } from '../domain/pricing-engine';

export class PdfExportService {
  /**
   * Sanitiza strings para nomes de arquivo seguros no sistema de arquivos
   */
  public static sanitizeFilename(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 40);
  }

  /**
   * Obtém o nome padrão do arquivo PDF: Orcamento_NUMERO_CLIENTE.pdf
   */
  public static getQuotePdfFilename(quote: Quote): string {
    const cleanNum = this.sanitizeFilename(quote.quoteNumber || 'ORC');
    const cleanClient = this.sanitizeFilename(quote.customerName || 'Cliente');
    return `Orcamento_${cleanNum}_${cleanClient}.pdf`;
  }

  /**
   * Gera e faz o download do PDF formatado para o orçamento
   */
  public static async generateAndDownloadQuotePdf(quote: Quote, company: Company): Promise<void> {
    const doc = this.buildQuotePdfDocument(quote, company);
    const filename = this.getQuotePdfFilename(quote);
    doc.save(filename);
  }

  /**
   * Gera o Blob do PDF para visualização em iframe ou anexo do WhatsApp
   */
  public static generateQuotePdfBlob(quote: Quote, company: Company): Blob {
    const doc = this.buildQuotePdfDocument(quote, company);
    return doc.output('blob');
  }

  /**
   * Gera a Data URI do PDF para prévia no navegador
   */
  public static generateQuotePdfDataUri(quote: Quote, company: Company): string {
    const doc = this.buildQuotePdfDocument(quote, company);
    return doc.output('datauristring');
  }

  /**
   * Constrói a estrutura visual completa do documento PDF (A4)
   */
  private static buildQuotePdfDocument(quote: Quote, company: Company): jsPDF {
    const JsPdfClass = (jsPDF as any).jsPDF || jsPDF;
    const doc = new JsPdfClass({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;

    // Cores do Design System Light
    const primaryColor = [37, 99, 235]; // #2563eb (Azul Real)
    const slateDark = [15, 23, 42]; // #0f172a
    const slateMuted = [100, 116, 139]; // #64748b
    const slateLight = [248, 250, 252]; // #f8fafc
    const borderColor = [226, 232, 240]; // #e2e8f0
    const tealColor = [13, 148, 136]; // #0d9488

    // ============================================================
    // 1. CABEÇALHO DA GRÁFICA & IDENTIFICAÇÃO
    // ============================================================
    let currentY = margin;

    // Barra superior decorativa com gradiente simulado
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(margin, currentY, contentWidth, 3, 'F');
    currentY += 8;

    // Logo / Nome da Gráfica
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(company.tradeName || 'OrçaGraf Soluções Gráficas', margin, currentY);

    // Número do Orçamento em destaque à direita
    doc.setFontSize(13);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    const quoteNumText = `ORÇAMENTO Nº ${quote.quoteNumber || 'ORC'}`;
    doc.text(quoteNumText, pageWidth - margin, currentY, { align: 'right' });

    currentY += 5;

    // Razão Social e CNPJ
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text(`${company.corporateName || company.tradeName} • CNPJ: ${company.document || 'Não informado'}`, margin, currentY);

    // Data de emissão à direita
    const creationDate = quote.createdAt ? new Date(quote.createdAt).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
    doc.text(`Data de Emissão: ${creationDate}`, pageWidth - margin, currentY, { align: 'right' });

    currentY += 4.5;

    // Endereço e Contatos da Gráfica
    const addr = company.address;
    const addressStr = addr
      ? `${addr.street}, ${addr.number}${addr.complement ? ' - ' + addr.complement : ''}, ${addr.neighborhood} - ${addr.city}/${addr.state} • CEP: ${addr.zipCode}`
      : 'Endereço Comercial da Gráfica';
    doc.text(addressStr, margin, currentY);

    currentY += 4.5;

    // Contatos: Telefone / WhatsApp / E-mail
    const contactStr = `Tel: ${company.phone || '-'} • WhatsApp: ${company.whatsapp || company.phone || '-'} • E-mail: ${company.email || '-'}`;
    doc.text(contactStr, margin, currentY);

    currentY += 6;

    // Linha divisória sutil
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 6;

    // ============================================================
    // 2. QUADRO DE DADOS DO CLIENTE E ATENDENTE
    // ============================================================
    doc.setFillColor(slateLight[0], slateLight[1], slateLight[2]);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.roundedRect(margin, currentY, contentWidth, 24, 2, 2, 'FD');

    // Título do quadro
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('DADOS DO CLIENTE & ATENDIMENTO', margin + 4, currentY + 5.5);

    // Linha 1 do cliente
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(`Cliente: ${quote.customerName || 'Cliente Balcão'}`, margin + 4, currentY + 11.5);

    // Atendente / Vendedor à direita (alinhado com segurança dentro da margem útil da página)
    const rawSellerName = (quote.sellerName || quote.salespersonName || '').trim();
    const sellerText = rawSellerName.length > 0 ? rawSellerName : 'Atendimento Comercial';
    const sellerLabel = 'Vendedor / Atendente: ';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);

    let displaySeller = sellerText;
    while (doc.getTextWidth(displaySeller) > 55 && displaySeller.length > 3) {
      displaySeller = displaySeller.slice(0, -1);
    }
    if (displaySeller !== sellerText) {
      displaySeller += '...';
    }

    const sellerRightX = pageWidth - margin - 4;
    doc.text(displaySeller, sellerRightX, currentY + 11.5, { align: 'right' });

    const valWidth = doc.getTextWidth(displaySeller);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text(sellerLabel, sellerRightX - valWidth - 1, currentY + 11.5, { align: 'right' });

    // Linha 2 do cliente (Documento e Contato)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    const docText = quote.customerDocument ? `CPF/CNPJ: ${quote.customerDocument}` : 'CPF/CNPJ: Não informado';
    const phoneText = quote.customerContact ? `Tel/WhatsApp: ${quote.customerContact}` : '';
    const emailText = quote.customerEmail ? `E-mail: ${quote.customerEmail}` : '';
    
    const clientDetails = [docText, phoneText, emailText].filter(Boolean).join('  |  ');
    doc.text(clientDetails, margin + 4, currentY + 17.5);

    currentY += 28;

    // ============================================================
    // 3. TABELA DE ITENS, MATERIAIS, ACABAMENTOS E VALORES
    // ============================================================
    const tableBody = (quote.items || []).map((item, idx) => {
      const mode = item.pricingMode || inferPricingMode(item);
      const specs: string[] = [];
      if (item.materialName) specs.push(`Material: ${item.materialName}`);
      if (item.widthMm && item.heightMm) specs.push(`Dimensões: ${item.widthMm} x ${item.heightMm} mm`);
      if (item.finishings && item.finishings.length > 0) {
        const finishList = item.finishings
          .map(f => {
            if (f.totalPriceCents > 0) {
              return `${f.name} (+${formatCentsToBRL(f.totalPriceCents)})`;
            }
            return `${f.name} (Incluso)`;
          })
          .join(', ');
        specs.push(`Acabamentos: ${finishList}`);
      }
      if (item.notes) {
        specs.push(`Obs: ${item.notes}`);
      }

      let qtdCol = item.quantity.toLocaleString('pt-BR');
      let unitCol = formatCentsToBRL(item.basePriceCents || item.unitPriceCents || 0);

      if (mode === 'LOT') {
        const lotSize = item.lotSize || 1000;
        const billedLots = item.billedQuantity || Math.max(1, Math.ceil(item.quantity / lotSize));
        qtdCol = `${item.quantity.toLocaleString('pt-BR')} un.\n(${billedLots} lote de ${lotSize.toLocaleString('pt-BR')})`;
        unitCol = `${formatCentsToBRL(item.basePriceCents || item.totalPriceCents)}/lote`;
      } else if (mode === 'SQUARE_METER') {
        const area = item.areaM2 ? ` (${item.areaM2.toFixed(2)} m²)` : '';
        qtdCol = `${item.quantity} pç${area}`;
        unitCol = `${formatCentsToBRL(item.basePriceCents || item.unitPriceCents)}/m²`;
      } else if (mode === 'LINEAR_METER') {
        const len = item.linearMeters ? ` (${item.linearMeters.toFixed(2)} m lin.)` : '';
        qtdCol = `${item.quantity} pç${len}`;
        unitCol = `${formatCentsToBRL(item.basePriceCents || item.unitPriceCents)}/m`;
      } else {
        unitCol = `${formatCentsToBRL(item.basePriceCents || item.unitPriceCents)}/un.`;
      }

      const descText = `${item.productName}\n${specs.join('  •  ')}`;
      const totalFormatted = formatCentsToBRL(item.totalPriceCents || 0);

      return [
        (idx + 1).toString().padStart(2, '0'),
        descText,
        qtdCol,
        unitCol,
        totalFormatted,
      ];
    });

    const applyAutoTable = (autoTable as any).default || autoTable;
    applyAutoTable(doc, {
      startY: currentY,
      head: [['#', 'DESCRIÇÃO DO PRODUTO & ESPECIFICAÇÕES TÉCNICAS', 'QTD. / UN.', 'PREÇO BASE', 'TOTAL ITEM']],
      body: tableBody,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
        halign: 'left',
        cellPadding: 3.5,
      },
      columnStyles: {
        0: { cellWidth: 9, halign: 'center' },
        1: { cellWidth: 'auto', halign: 'left' },
        2: { cellWidth: 24, halign: 'center' },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
      },
      styles: {
        fontSize: 8,
        textColor: [15, 23, 42],
        cellPadding: 2.5,
        overflow: 'linebreak',
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      didDrawPage: () => {
        // Cabeçalhos ou rodapés repetidos podem ser inseridos aqui
      },
    });

    // Posição final após a tabela
    const finalTableY = (doc as any).lastAutoTable?.finalY || (currentY + 40);
    currentY = finalTableY + 6;

    // Altura necessária para o bloco financeiro (42mm) e limite seguro antes do rodapé (274mm)
    const financialBoxHeight = 42;
    const safePageBottom = 274;

    // Se o bloco financeiro não couber integralmente na página atual, cria nova página
    if (currentY + financialBoxHeight > safePageBottom) {
      doc.addPage();
      currentY = margin + 5;
    }

    // ============================================================
    // 4. QUADRO FINANCEIRO E CONDIÇÕES COMERCIAIS
    // ============================================================
    const boxWidth = (contentWidth - 6) / 2;

    // Coluna Esquerda: Condições de Pagamento & Prazos
    doc.setFillColor(slateLight[0], slateLight[1], slateLight[2]);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.roundedRect(margin, currentY, boxWidth, financialBoxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(tealColor[0], tealColor[1], tealColor[2]);
    doc.text('CONDIÇÕES DE FORNECIMENTO', margin + 4, currentY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);

    const prodDays = quote.estimatedProductionDays || company.customization?.defaultProductionDays || 3;
    doc.text(`• Prazo de Produção Estimado: ${prodDays} dias úteis`, margin + 4, currentY + 12);
    doc.text(`  (Contados a partir da aprovação da arte e confirmação)`, margin + 4, currentY + 16);

    // Condição de pagamento textual
    const paymentTerms = quote.paymentTerms || company.customization?.defaultPaymentTerms || 'À vista na aprovação / retirada';
    const splitPaymentLines = doc.splitTextToSize(`• Condições de Pagamento: ${paymentTerms}`, boxWidth - 8);
    doc.text(splitPaymentLines, margin + 4, currentY + 22);

    // Detalhe de parcelas se houver
    if (quote.financialTerms && quote.financialTerms.installments && quote.financialTerms.installments.length > 1) {
      const instCount = quote.financialTerms.installments.length;
      doc.text(`• Parcelamento: ${instCount} parcelas de ${formatCentsToBRL(quote.financialTerms.installments[0]?.amountCents || 0)}`, margin + 4, currentY + 34);
    }

    // Coluna Direita: Totais Financeiros Oficiais (Subtotal, Desconto, Total Final)
    const rightBoxX = margin + boxWidth + 6;
    doc.setFillColor(slateLight[0], slateLight[1], slateLight[2]);
    doc.roundedRect(rightBoxX, currentY, boxWidth, financialBoxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('RESUMO FINANCEIRO DA PROPOSTA', rightBoxX + 4, currentY + 5.5);

    // Subtotal
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text('Subtotal dos Itens:', rightBoxX + 4, currentY + 13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(formatCentsToBRL(quote.subtotalCents || 0), rightBoxX + boxWidth - 4, currentY + 13, { align: 'right' });

    // Desconto Comercial (se houver)
    const discountCents = quote.discount?.appliedAmountCents || quote.discountCents || 0;
    if (discountCents > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(tealColor[0], tealColor[1], tealColor[2]);
      const discountLabel = quote.discount?.type === 'percentage'
        ? `Desconto Comercial (${quote.discount.value}%):`
        : 'Desconto Comercial:';
      doc.text(discountLabel, rightBoxX + 4, currentY + 20);
      doc.setFont('helvetica', 'bold');
      doc.text(`- ${formatCentsToBRL(discountCents)}`, rightBoxX + boxWidth - 4, currentY + 20, { align: 'right' });
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
      doc.text('Desconto Comercial:', rightBoxX + 4, currentY + 20);
      doc.text('R$ 0,00', rightBoxX + boxWidth - 4, currentY + 20, { align: 'right' });
    }

    // Linha divisória antes do total
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.line(rightBoxX + 4, currentY + 25, rightBoxX + boxWidth - 4, currentY + 25);

    // Total Final Destaque
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(rightBoxX + 3, currentY + 28, boxWidth - 6, 10.5, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL FINAL:', rightBoxX + 6, currentY + 35);
    doc.setFontSize(11);
    doc.text(formatCentsToBRL(quote.totalCents || 0), rightBoxX + boxWidth - 6, currentY + 35, { align: 'right' });

    currentY += 46;

    // ============================================================
    // 5. OBSERVAÇÕES COMERCIAIS & NOTA DE APROVAÇÃO
    // ============================================================
    const notes = quote.paymentTerms || company.customization?.commercialNotes || 'Trabalhos impressos com alta precisão e calibração de cor.';
    const splitNotes = doc.splitTextToSize(notes, contentWidth);
    const notesBlockHeight = 4 + splitNotes.length * 3.8 + 4;

    // Cria nova página apenas se o bloco completo de observações não couber antes do rodapé
    if (currentY + notesBlockHeight > safePageBottom) {
      doc.addPage();
      currentY = margin + 5;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text('OBSERVAÇÕES E NOTAS:', margin, currentY);
    currentY += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text(splitNotes, margin, currentY);
    currentY += splitNotes.length * 3.8 + 4;

    // ============================================================
    // 6. RODAPÉ DE PÁGINA (GARANTIA, ASSINATURA E NUMERAÇÃO)
    // ============================================================
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      const footerY = pageHeight - margin + 2;

      // Linha divisória de rodapé
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.2);
      doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

      // Texto de garantia/disclaimer da gráfica
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
      const footerDisclaimer = company.customization?.footerDisclaimer || 'Orçamento gerado pelo ecossistema OrçaGraf. Válido conforme condições comerciais especificadas.';
      doc.text(footerDisclaimer, margin, footerY);

      // Paginação
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, footerY, { align: 'right' });
    }

    return doc;
  }
}
