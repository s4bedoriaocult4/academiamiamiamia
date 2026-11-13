import { Student, Payment } from '../types';

/**
 * Converte um objeto Date em string 'YYYY-MM-DD' usando o fuso horário LOCAL.
 * Evita distorções de UTC (ex: após 21h no Brasil).
 */
export function formatLocalDateString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Retorna a data local de hoje no formato YYYY-MM-DD (sem distorção de fuso UTC).
 */
export function getTodayDateString(): string {
    return formatLocalDateString(new Date());
}

/**
 * Retorna o mês atual no formato YYYY-MM.
 */
export function getCurrentMonthString(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}

/**
 * Extrai 'YYYY-MM' de uma string de data de forma segura sem distorção de fuso.
 */
export function getYearMonth(dateStr?: string): string {
    if (!dateStr) return '';
    const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = clean.split('-');
    if (parts.length >= 2) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}`;
    }
    return '';
}

/**
 * Converte string 'YYYY-MM-DD' para objeto Date fixado no meio-dia local.
 */
export function parseDateLocal(dateStr: string): Date {
    if (!dateStr) return new Date();
    const cleanStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        return new Date(year, month, day, 12, 0, 0);
    }
    return new Date(dateStr);
}

/**
 * Formata data 'YYYY-MM-DD' para 'DD/MM/YYYY'.
 */
export function formatDateBR(dateStr?: string): string {
    if (!dateStr) return 'Não informado';
    const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = clean.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}

/**
 * Formata mês de referência 'YYYY-MM' para 'MM/YYYY'.
 */
export function formatReferenceMonth(ref?: string): string {
    if (!ref) return '-';
    const parts = ref.split('-');
    if (parts.length === 2) {
        return `${parts[1]}/${parts[0]}`;
    }
    return ref;
}

/**
 * Formata valor monetário em Real Brasileiro (R$ 1.234,56).
 */
export function formatCurrencyBRL(value: number): string {
    return (value || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });
}

/**
 * Calcula a diferença em dias entre a data de vencimento e hoje.
 * Negativo = atrasado, 0 = vence hoje, positivo = dias até vencer.
 */
export function getDaysUntilDue(dueDateStr?: string): number {
    if (!dueDateStr) return 0;
    const clean = dueDateStr.includes('T') ? dueDateStr.split('T')[0] : dueDateStr;
    const parts = clean.split('-');
    if (parts.length !== 3) return 0;

    const dueYear = parseInt(parts[0], 10);
    const dueMonth = parseInt(parts[1], 10) - 1;
    const dueDay = parseInt(parts[2], 10);
    const dueDate = new Date(dueYear, dueMonth, dueDay, 0, 0, 0);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    const diffMs = dueDate.getTime() - today.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Verifica se a data de vencimento está atrasada em relação a hoje.
 */
export function isOverdue(dueDateStr?: string): boolean {
    if (!dueDateStr) return false;
    return getDaysUntilDue(dueDateStr) < 0;
}

/**
 * Calcula a próxima data de vencimento a partir de um mês de referência e dia de vencimento.
 * Exemplo: ref='2026-10', dueDay=10, duration=1 -> '2026-11-10'.
 */
export function calculateNextDueDate(
    referenceMonth: string,
    dueDay: number,
    durationMonths: number = 1
): string {
    let year: number;
    let month: number; // 1-indexed

    if (referenceMonth.includes('-')) {
        const parts = referenceMonth.split('-');
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
    } else {
        const now = new Date();
        year = now.getFullYear();
        month = now.getMonth() + 1;
    }

    month += Math.max(1, durationMonths || 1);
    while (month > 12) {
        month -= 12;
        year += 1;
    }

    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const safeDay = Math.min(dueDay || 5, lastDayOfMonth);

    return `${year}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
}

/**
 * Calcula o vencimento inicial ao cadastrar um aluno.
 * Se já pagou a matrícula: avança conforme ciclo de cobrança do plano (padrão 1 mês).
 * Se não pagou: primeiro vencimento é no dia escolhido mais próximo.
 */
export function calculateInitialDueDate(
    startDateStr: string,
    dueDay: number,
    hasPaidFirstMonth: boolean = false,
    billingDurationMonths: number = 1
): string {
    const clean = startDateStr ? startDateStr.split('T')[0] : getTodayDateString();
    const parts = clean.split('-');
    let year = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    if (hasPaidFirstMonth) {
        month += Math.max(1, billingDurationMonths || 1);
        while (month > 12) {
            month -= 12;
            year += 1;
        }
    } else if (day > dueDay) {
        month += 1;
        if (month > 12) {
            month = 1;
            year += 1;
        }
    }

    const lastDay = new Date(year, month, 0).getDate();
    const safeDay = Math.min(dueDay || 5, lastDay);

    return `${year}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
}

/**
 * Corrige datas antigas que sofreram deslocamento de +1 dia por erro histórico de fuso horário
 * (ex: '2026-09-11' quando dueDay = 10 -> '2026-09-10').
 */
export function normalizeDueDayDate(dateStr: string, dueDay: number): string {
    if (!dateStr || !dueDay) return dateStr;
    const clean = dateStr.split('T')[0];
    const parts = clean.split('-');
    if (parts.length !== 3) return dateStr;

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const lastDay = new Date(year, month, 0).getDate();
    const safeDay = Math.min(dueDay, lastDay);

    return `${parts[0]}-${parts[1].padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
}

/**
 * Sugere qual mês de referência o aluno deve pagar agora.
 */
export function suggestNextReferenceMonth(student: Student, studentPayments: Payment[]): string {
    const monthlyPayments = studentPayments
        .filter(
            (p) =>
                !p.deletedAt &&
                p.studentId === student.id &&
                (p.type === 'pagamento' || !p.type) &&
                p.referenceMonth
        )
        .map((p) => p.referenceMonth!)
        .sort();

    if (monthlyPayments.length > 0) {
        const lastPaid = monthlyPayments[monthlyPayments.length - 1];
        const [yStr, mStr] = lastPaid.split('-');
        let year = parseInt(yStr, 10);
        let month = parseInt(mStr, 10) + 1;
        if (month > 12) {
            month = 1;
            year += 1;
        }
        return `${year}-${String(month).padStart(2, '0')}`;
    }

    if (student.nextDue) {
        const [yStr, mStr] = student.nextDue.split('-');
        const days = getDaysUntilDue(student.nextDue);
        if (days < 0) {
            return `${yStr}-${mStr}`;
        }
    }

    return getCurrentMonthString();
}

/**
 * Retorna o status de cobrança do aluno para exibição em badges visuais.
 */
export function getStudentPaymentStatus(student: Student): {
    status: 'overdue' | 'warning' | 'ok' | 'inactive';
    days: number;
    label: string;
    badgeClass: string;
} {
    if (student.status !== 'ativo') {
        return { status: 'inactive', days: 0, label: 'Inativo', badgeClass: 'badge-neutral' };
    }

    const days = getDaysUntilDue(student.nextDue);

    if (days < 0) {
        const absDays = Math.abs(days);
        return {
            status: 'overdue',
            days,
            label: absDays === 1 ? '1 dia atrasado' : `${absDays} dias atrasado`,
            badgeClass: 'badge-danger font-bold',
        };
    }

    if (days === 0) {
        return {
            status: 'warning',
            days: 0,
            label: 'Vence hoje!',
            badgeClass: 'badge-warning font-bold',
        };
    }

    if (days <= 5) {
        return {
            status: 'warning',
            days,
            label: days === 1 ? 'Vence amanhã' : `Vence em ${days}d`,
            badgeClass: 'badge-warning',
        };
    }

    return {
        status: 'ok',
        days,
        label: 'Em dia',
        badgeClass: 'badge-success',
    };
}
