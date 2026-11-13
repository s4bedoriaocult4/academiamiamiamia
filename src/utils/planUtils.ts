import { Payment, Plan, PlanCategory, Student } from '../types';
import { getYearMonth } from './dateUtils';

const CATEGORY_ORDER: Record<PlanCategory, number> = {
    mensal: 0,
    trimestral: 1,
    semestral: 2,
    anual: 3,
    outro: 4,
};

export function inferPlanCategory(
    plan?: Pick<Plan, 'name' | 'category' | 'commitmentMonths'> | null
): PlanCategory {
    if (!plan) return 'mensal';
    if (plan.category) return plan.category;
    if (plan.commitmentMonths === 3) return 'trimestral';
    if (plan.commitmentMonths === 6) return 'semestral';
    if (plan.commitmentMonths === 12) return 'anual';

    const name = (plan.name || '').toLowerCase();
    if (name.includes('trimestral')) return 'trimestral';
    if (name.includes('semestral')) return 'semestral';
    if (name.includes('anual')) return 'anual';
    return 'mensal';
}

export function getCommitmentMonths(
    plan?: Pick<Plan, 'name' | 'category' | 'commitmentMonths'> | null
): number {
    if (!plan) return 1;
    if (plan.commitmentMonths && plan.commitmentMonths > 0) return plan.commitmentMonths;
    const cat = inferPlanCategory(plan);
    if (cat === 'trimestral') return 3;
    if (cat === 'semestral') return 6;
    if (cat === 'anual') return 12;
    return 1;
}

export function getBillingDurationMonths(plan?: Plan | null): number {
    if (!plan) return 1;
    return plan.durationMonths && plan.durationMonths > 0 ? plan.durationMonths : 1;
}

export function sortPlans(plans: Plan[]): Plan[] {
    return [...plans]
        .filter((p) => !p.deletedAt)
        .sort((a, b) => {
            const catA = CATEGORY_ORDER[inferPlanCategory(a)] ?? 4;
            const catB = CATEGORY_ORDER[inferPlanCategory(b)] ?? 4;
            if (catA !== catB) return catA - catB;

            if (a.sortOrder !== undefined && b.sortOrder !== undefined && a.sortOrder !== b.sortOrder) {
                return a.sortOrder - b.sortOrder;
            }

            const freqA = a.frequency || 0;
            const freqB = b.frequency || 0;
            if (freqA !== freqB) return freqA - freqB;

            return (a.price || 0) - (b.price || 0);
        });
}

export function getDefaultPlanId(plans: Plan[]): string {
    const sorted = sortPlans(plans);
    if (sorted.length === 0) return '1x';
    // Preferir um plano mensal padrão (ex: 3x ou primeiro mensal) para evitar selecionar Semestral por engano
    const threeX = sorted.find((p) => p.id === '3x');
    if (threeX) return threeX.id;
    const firstMensal = sorted.find((p) => inferPlanCategory(p) === 'mensal');
    return (firstMensal || sorted[0]).id;
}

export function getCategoryLabel(category: PlanCategory): string {
    switch (category) {
        case 'mensal':
            return 'Mensal (Sem fidelidade)';
        case 'trimestral':
            return 'Trimestral (Fidelidade 3 meses)';
        case 'semestral':
            return 'Semestral (Fidelidade 6 meses)';
        case 'anual':
            return 'Anual (Fidelidade 12 meses)';
        default:
            return 'Outros Planos';
    }
}

export function getCategoryShortLabel(category: PlanCategory): string {
    switch (category) {
        case 'mensal':
            return 'Mensal';
        case 'trimestral':
            return 'Trimestral';
        case 'semestral':
            return 'Semestral';
        case 'anual':
            return 'Anual';
        default:
            return 'Plano';
    }
}

export function getCategoryPillClass(category: PlanCategory): string {
    switch (category) {
        case 'trimestral':
            return 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800/50';
        case 'semestral':
            return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50';
        case 'anual':
            return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50';
        default:
            return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50';
    }
}

export interface LoyaltyProgress {
    hasCommitment: boolean;
    category: PlanCategory;
    commitmentMonths: number;
    paidCount: number;
    isCompleted: boolean;
    cycleLabel: string;
}

/**
 * Calcula o progresso da fidelidade (Trimestral = 3 meses, Semestral = 6 meses)
 * baseado nos pagamentos mensais realizados a partir do início do contrato/matrícula.
 */
export function getStudentLoyaltyProgress(
    student: Student,
    plan?: Plan | null,
    allPayments: Payment[] = []
): LoyaltyProgress {
    const category = inferPlanCategory(plan);
    const commitmentMonths = getCommitmentMonths(plan);

    if (commitmentMonths <= 1) {
        return {
            hasCommitment: false,
            category,
            commitmentMonths: 1,
            paidCount: 0,
            isCompleted: false,
            cycleLabel: 'Sem fidelidade',
        };
    }

    const startYM = getYearMonth(student.commitmentStartDate || student.startDate);
    const validPayments = allPayments.filter(
        (p) =>
            !p.deletedAt &&
            p.studentId === student.id &&
            (p.type === 'pagamento' || !p.type) &&
            (!startYM || !p.referenceMonth || p.referenceMonth >= startYM)
    );

    const uniqueMonths = new Set(
        validPayments.map((p) => p.referenceMonth || getYearMonth(p.date)).filter(Boolean)
    );
    const paidCount = uniqueMonths.size;
    const cycleMod = paidCount % commitmentMonths;
    const currentProgress = paidCount > 0 && cycleMod === 0 ? commitmentMonths : cycleMod;

    return {
        hasCommitment: true,
        category,
        commitmentMonths,
        paidCount,
        isCompleted: paidCount >= commitmentMonths && cycleMod === 0,
        cycleLabel:
            paidCount === 0
                ? `0/${commitmentMonths} meses`
                : currentProgress === commitmentMonths
                    ? `${commitmentMonths}/${commitmentMonths} meses (Ciclo concluído)`
                    : `${currentProgress}/${commitmentMonths} meses`,
    };
}
