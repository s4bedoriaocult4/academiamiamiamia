import { Plan } from '../../types';
import {
    getCategoryPillClass,
    getCategoryShortLabel,
    inferPlanCategory,
    LoyaltyProgress,
} from '../../utils/planUtils';
import { formatCurrencyBRL } from '../../utils/dateUtils';

interface PlanBadgeProps {
    plan?: Plan | null;
    fallbackName?: string;
    showPrice?: boolean;
    loyalty?: LoyaltyProgress | null;
    compact?: boolean;
}

export function PlanBadge({
    plan,
    fallbackName,
    showPrice = false,
    loyalty,
    compact = false,
}: PlanBadgeProps) {
    const category = inferPlanCategory(plan || { name: fallbackName || '' });
    const catLabel = getCategoryShortLabel(category);
    const pillClass = getCategoryPillClass(category);
    const displayName = plan?.name || fallbackName || 'Sem plano';

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {category !== 'mensal' && (
                <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${pillClass}`}
                >
                    {catLabel}
                </span>
            )}
            <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                {displayName}
            </span>
            {showPrice && plan && (
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    ({formatCurrencyBRL(plan.price)}/mês)
                </span>
            )}
            {loyalty?.hasCommitment && !compact && (
                <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    title="Progresso do ciclo de fidelidade"
                >
                    {loyalty.cycleLabel}
                </span>
            )}
        </div>
    );
}
