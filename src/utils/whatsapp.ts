import { formatCurrencyBRL, formatDateBR, formatReferenceMonth } from './dateUtils';

/**
 * Normaliza um telefone brasileiro para o padrão internacional do WhatsApp (55 + DDD + número).
 */
export function normalizeWhatsAppPhone(phone?: string): string | null {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) return null;

    if (digits.startsWith('55') && digits.length >= 12) {
        return digits;
    }
    return `55${digits}`;
}

export function buildWhatsAppUrl(phone?: string, message?: string): string | null {
    const normalized = normalizeWhatsAppPhone(phone);
    if (!normalized) return null;
    const text = message ? `?text=${encodeURIComponent(message)}` : '';
    return `https://wa.me/${normalized}${text}`;
}

export function buildOverdueMessage(
    studentName: string,
    daysLate: number,
    nextDue: string,
    amount?: number,
    gymName: string = 'Academia'
): string {
    const firstName = studentName.trim().split(' ')[0];
    const valorStr = amount ? ` no valor de *${formatCurrencyBRL(amount)}*` : '';
    const diasStr = daysLate === 1 ? '1 dia' : `${daysLate} dias`;

    return (
        `Olá ${firstName}, tudo bem? Aqui é da *${gymName}*! 🥊\n\n` +
        `Passando para lembrar que sua mensalidade${valorStr} venceu em *${formatDateBR(nextDue)}* (${diasStr} em aberto).\n\n` +
        `Se já tiver realizado o pagamento, por favor nos envie o comprovante por aqui. Qualquer dúvida estamos à disposição!`
    );
}

export function buildReminderMessage(
    studentName: string,
    daysLeft: number,
    nextDue: string,
    amount?: number,
    gymName: string = 'Academia'
): string {
    const firstName = studentName.trim().split(' ')[0];
    const valorStr = amount ? ` (${formatCurrencyBRL(amount)})` : '';
    const quando =
        daysLeft === 0
            ? 'vence *hoje*'
            : daysLeft === 1
                ? 'vence *amanhã*'
                : `vence em *${daysLeft} dias* (${formatDateBR(nextDue)})`;

    return (
        `Olá ${firstName}, tudo bem? Aqui é da *${gymName}*! 🥊\n\n` +
        `Lembrete amigável: sua mensalidade${valorStr} ${quando}.\n` +
        `Qualquer dúvida é só chamar por aqui!`
    );
}

export function buildBirthdayMessage(studentName: string, gymName: string = 'Academia'): string {
    const firstName = studentName.trim().split(' ')[0];
    return (
        `Feliz aniversário, ${firstName}! 🎉🥊\n\n` +
        `Toda a equipe da *${gymName}* deseja muita saúde, energia e ótimos treinos no seu novo ciclo!`
    );
}

export function buildReceiptMessage(
    studentName: string,
    amount: number,
    method: string,
    date: string,
    referenceMonth?: string,
    description?: string,
    gymName: string = 'Academia'
): string {
    const firstName = studentName.trim().split(' ')[0];
    const refPart = referenceMonth ? `\n📅 Referência: *${formatReferenceMonth(referenceMonth)}*` : '';
    const descPart = description ? `\n📝 Descrição: ${description}` : '';

    return (
        `Olá ${firstName}! ✅ Pagamento confirmado na *${gymName}*.\n\n` +
        `💵 Valor: *${formatCurrencyBRL(amount)}*\n` +
        `💳 Forma: ${method}\n` +
        `📆 Data: ${formatDateBR(date)}` +
        refPart +
        descPart +
        `\n\nObrigado e bom treino! 🥊`
    );
}
