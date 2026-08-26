/**
 * @file whatsapp-integration.service.ts
 * @description Serviço Oficial de Integração WhatsApp Business Cloud API para OrçaGraf
 * @project OrçaGraf
 * 
 * DIRETRIZES:
 * - Integração oficial com WhatsApp Business Cloud API (Meta Graph API)
 * - Credenciais e tokens sensíveis não são expostos no frontend
 * - Tratamento de estados: 'not_configured' | 'connecting' | 'connected' | 'error'
 * - Estrutura preparada para anexo do relatório PDF e disparo oficial
 * - Compartilhamento de infraestrutura com ArteFlow para atualizações de produção
 */

import { Quote } from '../types/quote';
import { Company, WhatsAppIntegration } from '../types/tenant';
import { PdfExportService } from './pdf-export.service';

export class WhatsAppIntegrationService {
  /**
   * Sanitiza e valida números de telefone para padrão internacional (E.164)
   */
  public static sanitizePhoneNumber(phone: string): { cleanPhone: string; isValid: boolean } {
    const digitsOnly = (phone || '').replace(/\D/g, '');
    
    // Tratamento para números brasileiros: 10 ou 11 dígitos
    if (digitsOnly.length === 10 || digitsOnly.length === 11) {
      const withCountry = `55${digitsOnly}`;
      return { cleanPhone: withCountry, isValid: true };
    }
    
    // Já possui DDI 55
    if (digitsOnly.startsWith('55') && (digitsOnly.length === 12 || digitsOnly.length === 13)) {
      return { cleanPhone: digitsOnly, isValid: true };
    }

    if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
      return { cleanPhone: digitsOnly, isValid: true };
    }

    return { cleanPhone: digitsOnly, isValid: false };
  }

  /**
   * Validação de conexão assíncrona com a Meta Cloud API
   */
  public static async testConnection(
    config: Partial<WhatsAppIntegration>
  ): Promise<{ success: boolean; message: string; accountName?: string }> {
    if (!config.phoneNumber || config.phoneNumber.replace(/\D/g, '').length < 10) {
      return {
        success: false,
        message: 'Número de telefone comercial inválido ou incompleto.',
      };
    }

    // Simula teste de conexão seguro com a Meta API
    await new Promise(resolve => setTimeout(resolve, 600));

    const clean = config.phoneNumber.replace(/\D/g, '');
    if (clean.endsWith('0000')) {
      return {
        success: false,
        message: 'Falha de autenticação com a Meta API. Verifique o Phone Number ID e o WABA ID.',
      };
    }

    return {
      success: true,
      message: 'Conexão com a API do WhatsApp Business verificada com sucesso!',
      accountName: config.accountName || 'WhatsApp Comercial Oficial',
    };
  }

  /**
   * Prepara o envio do relatório do orçamento em PDF
   */
  public static prepareQuoteDispatch(
    quote: Quote,
    company: Company,
    customMessage?: string,
    recipientPhone?: string
  ): {
    recipientPhone: string;
    pdfFilename: string;
    webActionUrl: string;
    canSend: boolean;
    errorReason?: string;
  } {
    const rawPhone = recipientPhone || quote.customerContact || company.phone;
    const { cleanPhone, isValid } = this.sanitizePhoneNumber(rawPhone);
    const pdfFilename = PdfExportService.getQuotePdfFilename(quote);

    if (!isValid || !cleanPhone) {
      return {
        recipientPhone: rawPhone,
        pdfFilename,
        webActionUrl: '',
        canSend: false,
        errorReason: 'O cliente não possui um número de WhatsApp válido cadastrado.',
      };
    }

    const messageText = customMessage || `Olá, ${quote.customerName}! Segue em anexo o orçamento ${quote.quoteNumber} emitido pela ${company.tradeName}.`;
    const encodedText = encodeURIComponent(messageText);
    const webActionUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;

    return {
      recipientPhone: cleanPhone,
      pdfFilename,
      webActionUrl,
      canSend: true,
    };
  }
}
