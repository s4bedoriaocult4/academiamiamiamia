import { Student, Payment } from '../types';

/**
 * Retorna a data local de hoje no formato YYYY-MM-DD (sem distorção de fuso UTC)
 */
export function getTodayDateString(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Retorna o mês atual no formato YYYY-MM
 */
export function getCurrentMonthString(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}

/**
 * Extrai 'YYYY-MM' de uma string de data de forma segura sem distorção de fuso
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
 * Garante que variações de horário de verão e fusos horários não alterem o dia.
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
 * Formata data 'YYYY-MM-DD' para 'DD/MM/YYYY'
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
 * Formata mês de referência 'YYYY-MM' para 'MM/YYYY'
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
 * Calcula a diferença em dias entre a data de vencimento e hoje.
 * - Valor negativo: dias de atraso (ex: -3 = 3 dias atrasado)
 * - Valor 0: vence hoje
 * - Valor positivo: dias até vencer (ex: 5 = vence em 5 dias)
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
 * Verifica se a data de vencimento está atrasada em relação a hoje
 */
export function isOverdue(dueDateStr?: string): boolean {
    if (!dueDateStr) return false;
    return getDaysUntilDue(dueDateStr) < 0;
}

/**
 * Calcula a próxima data de vencimento a partir de um mês de referência e dia de vencimento.
 * Exemplo: ref='2026-10', dueDay=10, duration=1 -> '2026-11-10'
 * Trata com segurança o estouro de dias em meses com menos de 31 dias (ex: fevereiro).
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

    // Avança a quantidade de meses contratada no plano
    month += durationMonths;
    while (month > 12) {
        month -= 12;
        year += 1;
    }

    // Garante que o dia não ultrapasse o último dia do mês de destino (ex: 30/02 -> 28/02)
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const safeDay = Math.min(dueDay || 5, lastDayOfMonth);

    const mStr = String(month).padStart(2, '0');
    const dStr = String(safeDay).padStart(2, '0');
    return `${year}-${mStr}-${dStr}`;
}

/**
 * Calcula o vencimento inicial ao cadastrar um aluno.
 * Se já pagou a matrícula: próximo vencimento é no mês seguinte no dia escolhido.
 * Se não pagou: primeiro vencimento é no dia escolhido mais próximo.
 */
export function calculateInitialDueDate(
    startDateStr: string,
    dueDay: number,
    hasPaidFirstMonth: boolean = false
): string {
    const clean = startDateStr ? startDateStr.split('T')[0] : getTodayDateString();
    const parts = clean.split('-');
    let year = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    if (hasPaidFirstMonth) {
        // Já pagou o mês de entrada -> vence no mês seguinte
        month += 1;
        if (month > 12) {
            month = 1;
            year += 1;
        }
    } else {
        // Se a data de início já passou do dia de vencimento deste mês, joga para o próximo
        if (day > dueDay) {
            month += 1;
            if (month > 12) {
                month = 1;
                year += 1;
            }
        }
    }

    const lastDay = new Date(year, month, 0).getDate();
    const safeDay = Math.min(dueDay || 5, lastDay);

    return `${year}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
}

/**
 * Sugere inteligentemente qual mês de referência o aluno deve pagar agora.
 * Analisa os pagamentos anteriores do aluno para encontrar a próxima competência não quitada.
 */
export function suggestNextReferenceMonth(student: Student, studentPayments: Payment[]): string {
    // Filtra apenas pagamentos de mensalidade do aluno
    const monthlyPayments = studentPayments
        .filter(p => p.studentId === student.id && (p.type === 'pagamento' || !p.type) && p.referenceMonth)
        .map(p => p.referenceMonth!)
        .sort();

    if (monthlyPayments.length > 0) {
        // Pega o último mês pago
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

    // Se nunca pagou nenhuma mensalidade:
    // Se tiver nextDue definido, sugere o mês anterior ao nextDue ou o mês do nextDue caso esteja atrasado
    if (student.nextDue) {
        const [yStr, mStr] = student.nextDue.split('-');
        const days = getDaysUntilDue(student.nextDue);
        if (days < 0) {
            // Está atrasado: o mês de referência é o próprio mês em que venceu!
            return `${yStr}-${mStr}`;
        }
    }

    // Default: mês atual
    return getCurrentMonthString();
}

/**
 * Retorna o status de cobrança do aluno para exibição em badges visuais.
 */
export function getStudentPaymentStatus(student: Student): {
    status: 'overdue' | 'warning' | 'ok';
    days: number;
    label: string;
    badgeClass: string;
} {
    if (student.status !== 'ativo') {
        return { status: 'ok', days: 0, label: 'Inativo', badgeClass: 'badge-gray' };
    }

    const days = getDaysUntilDue(student.nextDue);

    if (days < 0) {
        const absDays = Math.abs(days);
        return {
            status: 'overdue',
            days,
            label: absDays === 1 ? '1 dia atrasado' : `${absDays} dias atrasado`,
            badgeClass: 'badge-danger font-bold animate-pulse'
        };
    }

    if (days === 0) {
        return {
            status: 'warning',
            days: 0,
            label: 'Vence hoje!',
            badgeClass: 'badge-warning font-bold'
        };
    }

    if (days <= 5) {
        return {
            status: 'warning',
            days,
            label: `Vence em ${days}d`,
            badgeClass: 'badge-warning'
        };
    }

    return {
        status: 'ok',
        days,
        label: 'Em dia',
        badgeClass: 'badge-success'
    };
}
