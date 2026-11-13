import { useMemo, useState } from 'react';
import {
    Users,
    TrendingUp,
    Wallet,
    CalendarCheck,
    AlertTriangle,
    Clock,
    Cake,
    UserPlus,
    DollarSign,
    RefreshCw,
    History,
    CheckCircle2,
} from 'lucide-react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from 'recharts';
import {
    useAttendance,
    useExpenses,
    useMonthlySnapshots,
    usePayments,
    usePlans,
    useStudents,
} from '../../hooks/useGymStore';
import { Student } from '../../types';
import {
    formatCurrencyBRL,
    formatDateBR,
    getCurrentMonthString,
    getDaysUntilDue,
    getStudentPaymentStatus,
    getYearMonth,
} from '../../utils/dateUtils';
import { getCategoryShortLabel, inferPlanCategory } from '../../utils/planUtils';
import { getMonthName, syncAndRepairMonthlySnapshots } from '../../services/MonthlyHistoryService';
import { pushBatchRecords } from '../../services/syncService';
import { db } from '../../services/db';
import {
    buildBirthdayMessage,
    buildOverdueMessage,
    buildReminderMessage,
} from '../../utils/whatsapp';
import { WhatsAppButton } from '../common/WhatsAppButton';
import { PlanBadge } from '../common/PlanBadge';
import { NavTab } from '../layout/AppShell';
import { useToast } from '../../contexts/ToastContext';

interface DashboardProps {
    gymName: string;
    onNavigate: (tab: NavTab) => void;
    onQuickNewStudent: () => void;
    onQuickPayment: (student?: Student) => void;
}

type AlertTab = 'overdue' | 'dueSoon' | 'birthdays';
type PlanChartMode = 'plan' | 'category';

export function Dashboard({
    gymName,
    onNavigate,
    onQuickNewStudent,
    onQuickPayment,
}: DashboardProps) {
    const students = useStudents();
    const payments = usePayments();
    const expenses = useExpenses();
    const attendance = useAttendance();
    const plans = usePlans();
    const snapshots = useMonthlySnapshots();
    const { showToast } = useToast();

    const currentMonthId = getCurrentMonthString();
    const [selectedMonthId, setSelectedMonthId] = useState<string>(currentMonthId);
    const [alertTab, setAlertTab] = useState<AlertTab>('overdue');
    const [planChartMode, setPlanChartMode] = useState<PlanChartMode>('plan');
    const [isRepairing, setIsRepairing] = useState(false);

    const planMap = useMemo(() => new Map(plans.map((p) => [p.id, p])), [plans]);

    const pastSnapshots = useMemo(
        () =>
            [...snapshots]
                .filter((s) => s.id < currentMonthId)
                .sort((a, b) => b.id.localeCompare(a.id)),
        [snapshots, currentMonthId]
    );

    const isCurrentMonth = selectedMonthId === currentMonthId;
    const activeSnapshot = useMemo(
        () => pastSnapshots.find((s) => s.id === selectedMonthId) || null,
        [pastSnapshots, selectedMonthId]
    );

    // Métricas atuais e do mês selecionado
    const metrics = useMemo(() => {
        const activeStudents = students.filter((s) => s.status === 'ativo');
        const overdueList = activeStudents
            .filter((s) => getStudentPaymentStatus(s).status === 'overdue')
            .sort((a, b) => getDaysUntilDue(a.nextDue) - getDaysUntilDue(b.nextDue));

        const dueSoonList = activeStudents
            .filter((s) => {
                const days = getDaysUntilDue(s.nextDue);
                return days >= 0 && days <= 5;
            })
            .sort((a, b) => getDaysUntilDue(a.nextDue) - getDaysUntilDue(b.nextDue));

        const currentMonthNum = new Date().getMonth() + 1;
        const birthdaysList = activeStudents
            .filter((s) => {
                if (!s.birthDate) return false;
                const parts = s.birthDate.split('T')[0].split('-');
                return parts.length === 3 && parseInt(parts[1], 10) === currentMonthNum;
            })
            .sort((a, b) => {
                const dayA = parseInt((a.birthDate || '').split('-')[2] || '0', 10);
                const dayB = parseInt((b.birthDate || '').split('-')[2] || '0', 10);
                return dayA - dayB;
            });

        const monthPayments = payments.filter((p) => getYearMonth(p.date) === selectedMonthId);
        const liveRevenue = monthPayments.reduce(
            (sum, p) => sum + (p.amount || 0) + (p.lateFee || 0),
            0
        );

        const monthExpenses = expenses.filter((e) => getYearMonth(e.date) === selectedMonthId);
        const liveExpenses = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

        const liveAttendanceCount = attendance.filter(
            (a) => getYearMonth(a.date) === selectedMonthId
        ).length;

        const expectedRevenue = activeStudents.reduce((sum, s) => {
            if (s.planType === 'personal') return sum;
            const plan = planMap.get(s.plan);
            return sum + (plan?.price || 0);
        }, 0);

        const personalCreditsActive = activeStudents.filter(
            (s) => (s.personalClassesRemaining || 0) > 0
        ).length;

        const revenue = isCurrentMonth
            ? liveRevenue
            : activeSnapshot?.revenue ?? liveRevenue;
        const expenseTotal = isCurrentMonth
            ? liveExpenses
            : activeSnapshot?.expenses ?? liveExpenses;

        return {
            activeCount: isCurrentMonth
                ? activeStudents.length
                : activeSnapshot?.activeStudents ?? activeStudents.length,
            overdueCount: isCurrentMonth
                ? overdueList.length
                : activeSnapshot?.overdueCount ?? overdueList.length,
            overdueList,
            dueSoonList,
            birthdaysList,
            revenue,
            expenseTotal,
            profit: revenue - expenseTotal,
            expectedRevenue,
            paymentCount: monthPayments.length,
            attendanceCount: isCurrentMonth
                ? liveAttendanceCount
                : activeSnapshot?.attendanceCount ?? liveAttendanceCount,
            personalCreditsActive,
        };
    }, [
        students,
        payments,
        expenses,
        attendance,
        planMap,
        selectedMonthId,
        isCurrentMonth,
        activeSnapshot,
    ]);

    // Fluxo dos últimos 6 meses (sem bug de UTC e incluindo multas)
    const cashflowData = useMemo(() => {
        const result: { name: string; Receita: number; Despesas: number }[] = [];
        const now = new Date();

        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = `${getMonthName(d.getMonth()).slice(0, 3)}/${String(d.getFullYear()).slice(2)}`;

            const rev = payments
                .filter((p) => getYearMonth(p.date) === ym)
                .reduce((sum, p) => sum + (p.amount || 0) + (p.lateFee || 0), 0);

            const exp = expenses
                .filter((e) => getYearMonth(e.date) === ym)
                .reduce((sum, e) => sum + (e.amount || 0), 0);

            result.push({
                name: label,
                Receita: Number(rev.toFixed(2)),
                Despesas: Number(exp.toFixed(2)),
            });
        }

        return result;
    }, [payments, expenses]);

    // Distribuição por Plano ou Categoria (corrigindo o antigo bug do split(' ')[0])
    const planDistribution = useMemo(() => {
        const activeStudents = students.filter((s) => s.status === 'ativo');
        const counts = new Map<string, number>();

        for (const s of activeStudents) {
            if (s.planType === 'personal') {
                const key = 'Somente Personal';
                counts.set(key, (counts.get(key) || 0) + 1);
                continue;
            }
            const plan = planMap.get(s.plan);
            const key =
                planChartMode === 'category'
                    ? getCategoryShortLabel(inferPlanCategory(plan || { name: s.plan }))
                    : plan?.name || s.plan || 'Sem plano';
            counts.set(key, (counts.get(key) || 0) + 1);
        }

        const total = activeStudents.length || 1;
        return Array.from(counts.entries())
            .map(([label, count]) => ({
                label,
                count,
                percent: Math.round((count / total) * 100),
            }))
            .sort((a, b) => b.count - a.count);
    }, [students, planMap, planChartMode]);

    const handleRepairSnapshots = async () => {
        setIsRepairing(true);
        try {
            const { updated, removedFuture } = await syncAndRepairMonthlySnapshots();
            const allSnaps = await db.monthlySnapshots.toArray();
            await pushBatchRecords('monthlySnapshots', allSnaps).catch(() => {});
            showToast(
                'success',
                `Histórico recalculado! ${updated} mês(es) atualizado(s), ${removedFuture} registro(s) futuro(s) removido(s).`
            );
        } catch {
            showToast('error', 'Não foi possível recalcular o histórico.');
        } finally {
            setIsRepairing(false);
        }
    };

    const collectionProgress =
        metrics.expectedRevenue > 0
            ? Math.min(100, Math.round((metrics.revenue / metrics.expectedRevenue) * 100))
            : 0;

    return (
        <div className="space-y-6">
            {/* Cabeçalho com ações rápidas */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        Painel Geral
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        Acompanhe vencimentos, cobranças e resultados de {gymName}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={selectedMonthId}
                        onChange={(e) => setSelectedMonthId(e.target.value)}
                        className="input w-auto py-2 pr-8 text-sm font-semibold"
                        aria-label="Selecionar mês de referência"
                    >
                        <option value={currentMonthId}>Mês Atual ({currentMonthId})</option>
                        {pastSnapshots.map((s) => (
                            <option key={s.id} value={s.id}>
                                {getMonthName(s.month)}/{s.year}
                            </option>
                        ))}
                    </select>

                    <button
                        type="button"
                        onClick={() => onQuickPayment()}
                        className="btn btn-success"
                    >
                        <DollarSign className="w-4 h-4" />
                        Receber R$
                    </button>

                    <button
                        type="button"
                        onClick={onQuickNewStudent}
                        className="btn btn-primary"
                    >
                        <UserPlus className="w-4 h-4" />
                        Novo Aluno
                    </button>
                </div>
            </div>

            {!isCurrentMonth && (
                <div className="card p-4 bg-sky-50/70 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/60 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 text-sm font-semibold text-sky-900 dark:text-sky-200">
                        <History className="w-4 h-4 text-sky-600" />
                        Visualizando histórico consolidado de{' '}
                        <span className="underline">{selectedMonthId}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setSelectedMonthId(currentMonthId)}
                        className="btn btn-secondary btn-sm"
                    >
                        Voltar para o Mês Atual
                    </button>
                </div>
            )}

            {/* Cards KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <button
                    type="button"
                    onClick={() => onNavigate('students')}
                    className="card-interactive p-5 text-left"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Alunos Ativos
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3 font-display text-3xl font-bold text-slate-900 dark:text-white">
                        {metrics.activeCount}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs">
                        {metrics.overdueCount > 0 ? (
                            <span className="badge badge-danger">{metrics.overdueCount} atrasado(s)</span>
                        ) : (
                            <span className="badge badge-success">Todos em dia</span>
                        )}
                        <span className="text-slate-500 dark:text-slate-400">
                            {metrics.dueSoonList.length} vencendo
                        </span>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => onNavigate('finance')}
                    className="card-interactive p-5 text-left"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Receita no Mês
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3 font-display text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrencyBRL(metrics.revenue)}
                    </div>
                    {isCurrentMonth && metrics.expectedRevenue > 0 ? (
                        <div className="mt-2.5 space-y-1">
                            <div className="flex justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                <span>Previsto: {formatCurrencyBRL(metrics.expectedRevenue)}</span>
                                <span>{collectionProgress}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                    style={{ width: `${collectionProgress}%` }}
                                />
                            </div>
                        </div>
                    ) : (
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            {metrics.paymentCount} lançamento(s)
                        </p>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => onNavigate('finance')}
                    className="card-interactive p-5 text-left"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Saldo / Lucro Líquido
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                            <Wallet className="w-5 h-5" />
                        </div>
                    </div>
                    <div
                        className={`mt-3 font-display text-3xl font-bold ${
                            metrics.profit >= 0
                                ? 'text-slate-900 dark:text-white'
                                : 'text-red-600 dark:text-red-400'
                        }`}
                    >
                        {formatCurrencyBRL(metrics.profit)}
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Despesas: <strong className="text-slate-700 dark:text-slate-200">{formatCurrencyBRL(metrics.expenseTotal)}</strong>
                    </p>
                </button>

                <button
                    type="button"
                    onClick={() => onNavigate('attendance')}
                    className="card-interactive p-5 text-left"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Presenças no Mês
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                            <CalendarCheck className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3 font-display text-3xl font-bold text-slate-900 dark:text-white">
                        {metrics.attendanceCount}
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {metrics.personalCreditsActive} aluno(s) com saldo Personal
                    </p>
                </button>
            </div>

            {/* Central de Cobrança e Avisos Rápidos (1-clique) */}
            {isCurrentMonth && (
                <div className="card overflow-hidden">
                    <div className="px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setAlertTab('overdue')}
                                className={`btn btn-sm ${
                                    alertTab === 'overdue' ? 'btn-danger' : 'btn-secondary'
                                }`}
                            >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Atrasados ({metrics.overdueList.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setAlertTab('dueSoon')}
                                className={`btn btn-sm ${
                                    alertTab === 'dueSoon'
                                        ? 'bg-amber-500 text-white hover:bg-amber-600'
                                        : 'btn-secondary'
                                }`}
                            >
                                <Clock className="w-3.5 h-3.5" />
                                Vencem em 5 dias ({metrics.dueSoonList.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setAlertTab('birthdays')}
                                className={`btn btn-sm ${
                                    alertTab === 'birthdays' ? 'btn-primary' : 'btn-secondary'
                                }`}
                            >
                                <Cake className="w-3.5 h-3.5" />
                                Aniversariantes ({metrics.birthdaysList.length})
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => onNavigate('students')}
                            className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400"
                        >
                            Ver todos os alunos →
                        </button>
                    </div>

                    <div className="p-4 sm:p-5">
                        {alertTab === 'overdue' && (
                            metrics.overdueList.length === 0 ? (
                                <div className="py-6 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                    <span>Excelente! Nenhum aluno ativo está em atraso hoje.</span>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto pr-1">
                                    {metrics.overdueList.map((student) => {
                                        const daysLate = Math.abs(getDaysUntilDue(student.nextDue));
                                        const plan = planMap.get(student.plan);
                                        return (
                                            <div
                                                key={student.id}
                                                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                            >
                                                <div className="min-w-0 space-y-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-bold text-slate-900 dark:text-white text-sm truncate">
                                                            {student.name}
                                                        </span>
                                                        <span className="badge badge-danger">
                                                            {daysLate} dia(s) em atraso
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                        <PlanBadge plan={plan} fallbackName={student.plan} compact />
                                                        <span>•</span>
                                                        <span>Venceu em {formatDateBR(student.nextDue)}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <WhatsAppButton
                                                        phone={student.phone}
                                                        label="Cobrar"
                                                        message={buildOverdueMessage(
                                                            student.name,
                                                            daysLate,
                                                            student.nextDue,
                                                            plan?.price,
                                                            gymName
                                                        )}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => onQuickPayment(student)}
                                                        className="btn btn-success btn-sm"
                                                    >
                                                        <DollarSign className="w-3.5 h-3.5" />
                                                        Receber
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        )}

                        {alertTab === 'dueSoon' && (
                            metrics.dueSoonList.length === 0 ? (
                                <p className="py-6 text-center text-sm text-slate-500">
                                    Nenhuma mensalidade vencendo nos próximos 5 dias.
                                </p>
                            ) : (
                                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto pr-1">
                                    {metrics.dueSoonList.map((student) => {
                                        const daysLeft = getDaysUntilDue(student.nextDue);
                                        const plan = planMap.get(student.plan);
                                        return (
                                            <div
                                                key={student.id}
                                                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                            >
                                                <div className="min-w-0 space-y-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                                                            {student.name}
                                                        </span>
                                                        <span className="badge badge-warning">
                                                            {daysLeft === 0
                                                                ? 'Vence hoje'
                                                                : daysLeft === 1
                                                                    ? 'Vence amanhã'
                                                                    : `Em ${daysLeft} dias`}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                                        {plan?.name || student.plan} • {formatDateBR(student.nextDue)}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <WhatsAppButton
                                                        phone={student.phone}
                                                        label="Lembrar"
                                                        message={buildReminderMessage(
                                                            student.name,
                                                            daysLeft,
                                                            student.nextDue,
                                                            plan?.price,
                                                            gymName
                                                        )}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => onQuickPayment(student)}
                                                        className="btn btn-success btn-sm"
                                                    >
                                                        <DollarSign className="w-3.5 h-3.5" />
                                                        Receber
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        )}

                        {alertTab === 'birthdays' && (
                            metrics.birthdaysList.length === 0 ? (
                                <p className="py-6 text-center text-sm text-slate-500">
                                    Nenhum aniversariante cadastrado neste mês.
                                </p>
                            ) : (
                                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto pr-1">
                                    {metrics.birthdaysList.map((student) => {
                                        const parts = (student.birthDate || '').split('-');
                                        const dayMonth = parts.length === 3 ? `${parts[2]}/${parts[1]}` : '';
                                        return (
                                            <div
                                                key={student.id}
                                                className="py-3 flex items-center justify-between gap-3"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <span className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center shrink-0">
                                                        {dayMonth}
                                                    </span>
                                                    <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                                                        {student.name}
                                                    </span>
                                                </div>

                                                <WhatsAppButton
                                                    phone={student.phone}
                                                    label="Parabenizar"
                                                    message={buildBirthdayMessage(student.name, gymName)}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        )}
                    </div>
                </div>
            )}

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="card p-5 lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-display font-bold text-slate-900 dark:text-white text-base">
                                Receita vs Despesas (Últimos 6 meses)
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Valores reais por data de pagamento (incluindo multas e juros)
                            </p>
                        </div>
                    </div>

                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={cashflowData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip
                                    formatter={(val: number) => formatCurrencyBRL(val)}
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: '1px solid #e2e8f0',
                                    }}
                                />
                                <Legend />
                                <Bar dataKey="Receita" fill="#10b981" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="Despesas" fill="#ef4444" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card p-5 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                        <h3 className="font-display font-bold text-slate-900 dark:text-white text-base">
                            Alunos por Plano
                        </h3>
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
                            <button
                                type="button"
                                onClick={() => setPlanChartMode('plan')}
                                className={`px-2 py-1 rounded-md ${
                                    planChartMode === 'plan'
                                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-500'
                                }`}
                            >
                                Plano
                            </button>
                            <button
                                type="button"
                                onClick={() => setPlanChartMode('category')}
                                className={`px-2 py-1 rounded-md ${
                                    planChartMode === 'category'
                                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-500'
                                }`}
                            >
                                Categoria
                            </button>
                        </div>
                    </div>

                    {planDistribution.length === 0 ? (
                        <p className="text-sm text-slate-500 py-8 text-center">
                            Nenhum aluno ativo cadastrado.
                        </p>
                    ) : (
                        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                            {planDistribution.map((item) => (
                                <div key={item.label} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-slate-700 dark:text-slate-200 truncate pr-2">
                                            {item.label}
                                        </span>
                                        <span className="font-bold text-slate-900 dark:text-white shrink-0">
                                            {item.count} ({item.percent}%)
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-rose-500 rounded-full"
                                            style={{ width: `${item.percent}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Histórico de Meses Fechados */}
            <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h3 className="font-display font-bold text-slate-900 dark:text-white text-base">
                            Histórico Mensal Consolidado
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Fechamento automático dos meses já encerrados
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleRepairSnapshots}
                        disabled={isRepairing}
                        className="btn btn-secondary btn-sm"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRepairing ? 'animate-spin' : ''}`} />
                        {isRepairing ? 'Recalculando...' : 'Recalcular Histórico'}
                    </button>
                </div>

                {pastSnapshots.length === 0 ? (
                    <p className="p-6 text-sm text-slate-500 text-center">
                        Nenhum mês anterior encerrado ainda. Clique em "Recalcular Histórico" se importou dados antigos.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase text-slate-500 dark:text-slate-400">
                                <tr>
                                    <th className="px-5 py-3 font-bold">Mês</th>
                                    <th className="px-5 py-3 font-bold">Receita</th>
                                    <th className="px-5 py-3 font-bold">Despesas</th>
                                    <th className="px-5 py-3 font-bold">Lucro</th>
                                    <th className="px-5 py-3 font-bold">Presenças</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {pastSnapshots.map((snap) => (
                                    <tr
                                        key={snap.id}
                                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 cursor-pointer"
                                        onClick={() => setSelectedMonthId(snap.id)}
                                    >
                                        <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">
                                            {getMonthName(snap.month)} / {snap.year}
                                        </td>
                                        <td className="px-5 py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                                            {formatCurrencyBRL(snap.revenue)}
                                        </td>
                                        <td className="px-5 py-3 text-red-600 dark:text-red-400">
                                            {formatCurrencyBRL(snap.expenses)}
                                        </td>
                                        <td
                                            className={`px-5 py-3 font-bold ${
                                                snap.profit >= 0
                                                    ? 'text-slate-900 dark:text-white'
                                                    : 'text-red-600'
                                            }`}
                                        >
                                            {formatCurrencyBRL(snap.profit)}
                                        </td>
                                        <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                                            {snap.attendanceCount}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
