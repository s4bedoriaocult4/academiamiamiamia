import { useMemo, useState } from 'react';
import {
    Dumbbell,
    CheckCircle2,
    PlusCircle,
    Undo2,
    AlertCircle,
    Calendar,
} from 'lucide-react';
import { useAttendance, usePersonalPlans, useStudents } from '../../hooks/useGymStore';
import { Student } from '../../types';
import {
    formatCurrencyBRL,
    formatDateBR,
    getCurrentMonthString,
    getTodayDateString,
    getYearMonth,
} from '../../utils/dateUtils';
import { recordAttendance, softDeleteAttendance } from '../../services/dataAccess';
import { useToast } from '../../contexts/ToastContext';
import { EmptyState } from '../UI';
import { WhatsAppButton } from '../common/WhatsAppButton';

interface PersonalDashboardProps {
    gymName: string;
    onSellPackage: (student: Student) => void;
}

export function PersonalDashboard({ gymName, onSellPackage }: PersonalDashboardProps) {
    const students = useStudents();
    const personalPlans = usePersonalPlans();
    const attendance = useAttendance();
    const { showToast } = useToast();

    const [filter, setFilter] = useState<'with_credits' | 'renew' | 'all'>('with_credits');
    const [busyId, setBusyId] = useState<string | null>(null);

    const today = getTodayDateString();
    const currentMonth = getCurrentMonthString();

    const personalPlanMap = useMemo(
        () => new Map(personalPlans.map((p) => [p.id, p])),
        [personalPlans]
    );

    const personalStudents = useMemo(
        () =>
            students
                .filter(
                    (s) =>
                        s.status === 'ativo' &&
                        (s.planType === 'personal' ||
                            s.planType === 'both' ||
                            (s.personalClassesRemaining || 0) > 0)
                )
                .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
        [students]
    );

    const visibleStudents = useMemo(() => {
        if (filter === 'with_credits') {
            return personalStudents.filter((s) => (s.personalClassesRemaining || 0) > 0);
        }
        if (filter === 'renew') {
            return personalStudents.filter((s) => (s.personalClassesRemaining || 0) <= 1);
        }
        return personalStudents;
    }, [personalStudents, filter]);

    const todayAttendanceMap = useMemo(() => {
        const map = new Map<string, string>();
        attendance
            .filter((a) => a.date === today && a.attendanceType === 'personal')
            .forEach((a) => map.set(a.studentId, a.id));
        return map;
    }, [attendance, today]);

    const monthClassesCount = useMemo(
        () =>
            attendance.filter(
                (a) => a.attendanceType === 'personal' && getYearMonth(a.date) === currentMonth
            ).length,
        [attendance, currentMonth]
    );

    const handleRegisterClass = async (student: Student) => {
        if ((student.personalClassesRemaining || 0) <= 0) {
            showToast('warning', `${student.name} está sem saldo. Venda um novo pacote primeiro.`);
            return;
        }
        setBusyId(student.id);
        try {
            await recordAttendance(student, today, 'personal');
            showToast(
                'success',
                `Aula de Personal registrada para ${student.name}! Restam ${(student.personalClassesRemaining || 1) - 1} aula(s).`
            );
        } catch {
            showToast('error', 'Erro ao registrar aula de Personal.');
        } finally {
            setBusyId(null);
        }
    };

    const handleUndoTodayClass = async (student: Student, attendanceId: string) => {
        setBusyId(student.id);
        try {
            await softDeleteAttendance(attendanceId);
            showToast('info', `Aula de hoje de ${student.name} desfeita (+1 crédito devolvido).`);
        } catch {
            showToast('error', 'Erro ao desfazer aula.');
        } finally {
            setBusyId(null);
        }
    };

    const withCreditsCount = personalStudents.filter((s) => (s.personalClassesRemaining || 0) > 0).length;
    const lowCreditsCount = personalStudents.filter((s) => (s.personalClassesRemaining || 0) <= 1).length;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Aulas Personal
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Controle de saldo de aulas individuais em 1 clique
                </p>
            </div>

            {/* Resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card p-4">
                    <div className="text-xs font-bold uppercase text-slate-500">Com Saldo Ativo</div>
                    <div className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                        {withCreditsCount} aluno(s)
                    </div>
                </div>
                <div className="card p-4">
                    <div className="text-xs font-bold uppercase text-slate-500">Acabando / Renovar</div>
                    <div className="font-display text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                        {lowCreditsCount} aluno(s)
                    </div>
                </div>
                <div className="card p-4">
                    <div className="text-xs font-bold uppercase text-slate-500">Aulas Dadas no Mês</div>
                    <div className="font-display text-2xl font-bold text-slate-900 dark:text-white mt-1">
                        {monthClassesCount}
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-2">
                {[
                    { id: 'with_credits', label: `Com Saldo (${withCreditsCount})` },
                    { id: 'renew', label: `Saldo Baixo / Zerado (${lowCreditsCount})` },
                    { id: 'all', label: `Todos Personal (${personalStudents.length})` },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setFilter(tab.id as typeof filter)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                            filter === tab.id
                                ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {visibleStudents.length === 0 ? (
                <EmptyState
                    icon={<Dumbbell className="w-6 h-6" />}
                    title="Nenhum aluno nesta lista"
                    description="Cadastre um aluno com modalidade 'Personal' ou 'Turma + Personal', ou mude o filtro acima."
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {visibleStudents.map((s) => {
                        const remaining = s.personalClassesRemaining || 0;
                        const pPlan = s.personalPlanId ? personalPlanMap.get(s.personalPlanId) : undefined;
                        const todayAttId = todayAttendanceMap.get(s.id);

                        return (
                            <div key={s.id} className="card p-5 flex flex-col justify-between gap-4">
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-slate-900 dark:text-white truncate">
                                                {s.name}
                                            </h3>
                                            <div className="text-xs text-slate-500">
                                                {pPlan
                                                    ? `${pPlan.name} (${formatCurrencyBRL(pPlan.price)})`
                                                    : 'Pacote Personal'}
                                            </div>
                                        </div>

                                        <span
                                            className={`badge ${
                                                remaining === 0
                                                    ? 'badge-danger'
                                                    : remaining <= 2
                                                        ? 'badge-warning'
                                                        : 'badge-success'
                                            }`}
                                        >
                                            {remaining} aula(s)
                                        </span>
                                    </div>

                                    {s.personalStartDate && (
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <Calendar className="w-3.5 h-3.5" />
                                            Início Personal: {formatDateBR(s.personalStartDate)}
                                        </div>
                                    )}

                                    {remaining <= 1 && (
                                        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 shrink-0" />
                                            <span>
                                                {remaining === 0
                                                    ? 'Pacote encerrado! Hora de renovar.'
                                                    : 'Última aula do pacote! Avise para renovar.'}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    {remaining > 0 && (
                                        <button
                                            type="button"
                                            disabled={busyId === s.id}
                                            onClick={() => handleRegisterClass(s)}
                                            className="btn btn-primary btn-sm flex-1"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                            Dar Baixa (-1 aula)
                                        </button>
                                    )}

                                    {todayAttId && (
                                        <button
                                            type="button"
                                            disabled={busyId === s.id}
                                            onClick={() => handleUndoTodayClass(s, todayAttId)}
                                            className="btn btn-secondary btn-sm"
                                            title="Desfazer aula marcada hoje"
                                        >
                                            <Undo2 className="w-3.5 h-3.5" />
                                            Desfazer
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => onSellPackage(s)}
                                        className={`btn btn-success btn-sm ${remaining === 0 ? 'flex-1' : ''}`}
                                    >
                                        <PlusCircle className="w-3.5 h-3.5" />
                                        {remaining === 0 ? 'Vender Pacote' : '+ Pacote'}
                                    </button>

                                    <WhatsAppButton
                                        phone={s.phone}
                                        size="icon"
                                        message={`Olá ${s.name.split(' ')[0]}! Aqui é da *${gymName}* 🥊\nVocê está com *${remaining} aula(s)* restante(s) no seu pacote Personal.${
                                            remaining <= 1 ? ' Quando quiser renovar o próximo pacote, é só me chamar!' : ''
                                        }`}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
