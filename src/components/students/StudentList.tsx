import { useMemo, useState } from 'react';
import {
    Search,
    UserPlus,
    DollarSign,
    Eye,
    Edit3,
    Trash2,
    Users,
    ArrowUpDown,
} from 'lucide-react';
import {
    useAttendance,
    usePayments,
    usePersonalPlans,
    usePlans,
    useStudents,
} from '../../hooks/useGymStore';
import { PlanCategory, Student } from '../../types';
import {
    formatDateBR,
    getDaysUntilDue,
    getStudentPaymentStatus,
} from '../../utils/dateUtils';
import {
    getCategoryShortLabel,
    getStudentLoyaltyProgress,
    inferPlanCategory,
} from '../../utils/planUtils';
import { buildOverdueMessage, buildReminderMessage } from '../../utils/whatsapp';
import { softDeleteStudent } from '../../services/dataAccess';
import { ConfirmModal, EmptyState } from '../UI';
import { PlanBadge } from '../common/PlanBadge';
import { WhatsAppButton } from '../common/WhatsAppButton';
import { StudentModal } from './StudentModal';
import { StudentViewModal } from './StudentViewModal';
import { useToast } from '../../contexts/ToastContext';

interface StudentListProps {
    gymName: string;
    onOpenPayment: (student: Student) => void;
    externalNewTrigger?: number;
}

type StatusFilter = 'ativos' | 'em_dia' | 'atrasado' | 'vencendo' | 'personal' | 'inativo' | 'todos';

export function StudentList({ gymName, onOpenPayment }: StudentListProps) {
    const students = useStudents();
    const plans = usePlans();
    const personalPlans = usePersonalPlans();
    const payments = usePayments();
    const attendance = useAttendance();
    const { showToast } = useToast();

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ativos');
    const [categoryFilter, setCategoryFilter] = useState<'all' | PlanCategory>('all');
    const [sortBy, setSortBy] = useState<'name' | 'due'>('name');

    const [modalOpen, setModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
    const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

    const planMap = useMemo(() => new Map(plans.map((p) => [p.id, p])), [plans]);
    const personalPlanMap = useMemo(
        () => new Map(personalPlans.map((p) => [p.id, p])),
        [personalPlans]
    );

    // Contadores para os botões de filtro
    const counts = useMemo(() => {
        const res = {
            ativos: 0,
            em_dia: 0,
            atrasado: 0,
            vencendo: 0,
            personal: 0,
            inativo: 0,
            todos: students.length,
        };
        for (const s of students) {
            if (s.status === 'inativo') {
                res.inativo++;
                continue;
            }
            res.ativos++;
            const st = getStudentPaymentStatus(s);
            if (st.status === 'overdue') res.atrasado++;
            else res.em_dia++;

            const days = getDaysUntilDue(s.nextDue);
            if (days >= 0 && days <= 5) res.vencendo++;

            if (s.planType === 'personal' || s.planType === 'both' || (s.personalClassesRemaining || 0) > 0) {
                res.personal++;
            }
        }
        return res;
    }, [students]);

    const filteredStudents = useMemo(() => {
        const term = search.trim().toLowerCase();
        return students
            .filter((s) => {
                if (statusFilter === 'ativos' && s.status !== 'ativo') return false;
                if (statusFilter === 'inativo' && s.status !== 'inativo') return false;
                if (statusFilter === 'atrasado') {
                    if (s.status !== 'ativo' || getStudentPaymentStatus(s).status !== 'overdue') return false;
                }
                if (statusFilter === 'em_dia') {
                    if (s.status !== 'ativo' || getStudentPaymentStatus(s).status === 'overdue') return false;
                }
                if (statusFilter === 'vencendo') {
                    const days = getDaysUntilDue(s.nextDue);
                    if (s.status !== 'ativo' || days < 0 || days > 5) return false;
                }
                if (statusFilter === 'personal') {
                    if (
                        s.status !== 'ativo' ||
                        (s.planType !== 'personal' &&
                            s.planType !== 'both' &&
                            (s.personalClassesRemaining || 0) <= 0)
                    ) {
                        return false;
                    }
                }

                if (categoryFilter !== 'all') {
                    const p = planMap.get(s.plan);
                    const cat = inferPlanCategory(p || { name: s.plan });
                    if (cat !== categoryFilter) return false;
                }

                if (term) {
                    const matchName = s.name.toLowerCase().includes(term);
                    const matchPhone = (s.phone || '').toLowerCase().includes(term);
                    const matchGrad = (s.graduation || '').toLowerCase().includes(term);
                    if (!matchName && !matchPhone && !matchGrad) return false;
                }

                return true;
            })
            .sort((a, b) => {
                if (sortBy === 'due') {
                    return getDaysUntilDue(a.nextDue) - getDaysUntilDue(b.nextDue);
                }
                return a.name.localeCompare(b.name, 'pt-BR');
            });
    }, [students, statusFilter, categoryFilter, search, sortBy, planMap]);

    const handleConfirmDelete = async () => {
        if (!studentToDelete) return;
        await softDeleteStudent(studentToDelete.id);
        showToast('success', `${studentToDelete.name} removido da lista de alunos.`);
        setStudentToDelete(null);
    };

    const renderStatusBadge = (s: Student) => {
        if (s.status === 'inativo') return <span className="badge badge-neutral">Inativo</span>;
        if (s.planType === 'personal') {
            return (
                <span className="badge badge-violet">
                    Personal ({s.personalClassesRemaining || 0} aulas)
                </span>
            );
        }
        const st = getStudentPaymentStatus(s);
        const days = st.days;
        if (st.status === 'overdue') {
            return <span className="badge badge-danger">{Math.abs(days)}d atrasado</span>;
        }
        if (days === 0) {
            return <span className="badge badge-warning">Vence hoje</span>;
        }
        if (days <= 5) {
            return <span className="badge badge-warning">Vence em {days}d</span>;
        }
        return <span className="badge badge-success">Em dia</span>;
    };

    const buildWaForStudent = (s: Student) => {
        const p = planMap.get(s.plan);
        const days = getDaysUntilDue(s.nextDue);
        if (days < 0) {
            return buildOverdueMessage(s.name, Math.abs(days), s.nextDue, p?.price, gymName);
        }
        return buildReminderMessage(s.name, Math.max(0, days), s.nextDue, p?.price, gymName);
    };

    return (
        <div className="space-y-5">
            {/* Cabeçalho */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        Alunos
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {counts.ativos} ativos • {counts.atrasado} com mensalidade em atraso
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        setEditingStudent(null);
                        setModalOpen(true);
                    }}
                    className="btn btn-primary"
                >
                    <UserPlus className="w-4 h-4" />
                    Novo Aluno
                </button>
            </div>

            {/* Busca e Filtros Rápidos */}
            <div className="card p-4 space-y-3">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Buscar por nome, telefone ou graduação..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input pl-10"
                        />
                    </div>

                    <div className="flex gap-2">
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value as typeof categoryFilter)}
                            className="input w-auto text-xs font-semibold"
                            aria-label="Filtrar por categoria do plano"
                        >
                            <option value="all">Todas categorias</option>
                            {(['mensal', 'trimestral', 'semestral', 'anual'] as PlanCategory[]).map((cat) => (
                                <option key={cat} value={cat}>
                                    {getCategoryShortLabel(cat)}
                                </option>
                            ))}
                        </select>

                        <button
                            type="button"
                            onClick={() => setSortBy((prev) => (prev === 'name' ? 'due' : 'name'))}
                            className="btn btn-secondary btn-sm whitespace-nowrap"
                            title="Alternar ordenação"
                        >
                            <ArrowUpDown className="w-3.5 h-3.5" />
                            {sortBy === 'name' ? 'A–Z' : 'Vencimento'}
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                    {(
                        [
                            { id: 'ativos', label: `Ativos (${counts.ativos})` },
                            { id: 'atrasado', label: `Atrasados (${counts.atrasado})` },
                            { id: 'vencendo', label: `Vencendo (${counts.vencendo})` },
                            { id: 'em_dia', label: `Em dia (${counts.em_dia})` },
                            { id: 'personal', label: `Personal (${counts.personal})` },
                            { id: 'inativo', label: `Inativos (${counts.inativo})` },
                            { id: 'todos', label: `Todos (${counts.todos})` },
                        ] as { id: StatusFilter; label: string }[]
                    ).map((pill) => (
                        <button
                            key={pill.id}
                            type="button"
                            onClick={() => setStatusFilter(pill.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                statusFilter === pill.id
                                    ? pill.id === 'atrasado'
                                        ? 'bg-red-600 text-white border-red-600'
                                        : 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            {pill.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Lista Responsiva */}
            {filteredStudents.length === 0 ? (
                <EmptyState
                    icon={<Users className="w-6 h-6" />}
                    title="Nenhum aluno encontrado"
                    description="Tente limpar os filtros ou cadastre um novo aluno agora."
                />
            ) : (
                <>
                    {/* Cards Mobile (< lg) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:hidden">
                        {filteredStudents.map((s) => {
                            const plan = planMap.get(s.plan);
                            const loyalty = getStudentLoyaltyProgress(s, plan, payments);
                            return (
                                <div key={s.id} className="card p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <button
                                                type="button"
                                                onClick={() => setViewingStudent(s)}
                                                className="font-bold text-slate-900 dark:text-white text-left hover:text-rose-600 truncate block w-full"
                                            >
                                                {s.name}
                                            </button>
                                            <div className="text-xs text-slate-500 mt-0.5">{s.phone}</div>
                                        </div>
                                        {renderStatusBadge(s)}
                                    </div>

                                    <PlanBadge
                                        plan={s.planType === 'personal' ? undefined : plan}
                                        fallbackName={s.planType === 'personal' ? 'Somente Personal' : s.plan}
                                        loyalty={loyalty}
                                    />

                                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                                        <span>
                                            Venc.: <strong className="text-slate-700 dark:text-slate-200">{formatDateBR(s.nextDue)}</strong> (dia {s.dueDay})
                                        </span>
                                        {(s.personalClassesRemaining || 0) > 0 && (
                                            <span className="badge badge-info">
                                                {s.personalClassesRemaining} aulas personal
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1.5 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => onOpenPayment(s)}
                                            className="btn btn-success btn-sm flex-1"
                                        >
                                            <DollarSign className="w-3.5 h-3.5" />
                                            Receber
                                        </button>
                                        <WhatsAppButton
                                            phone={s.phone}
                                            message={buildWaForStudent(s)}
                                            size="icon"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setViewingStudent(s)}
                                            className="btn btn-secondary btn-sm px-2.5"
                                            title="Ver ficha"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditingStudent(s);
                                                setModalOpen(true);
                                            }}
                                            className="btn btn-secondary btn-sm px-2.5"
                                            title="Editar"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setStudentToDelete(s)}
                                            className="btn btn-ghost btn-sm px-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                                            title="Excluir"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Tabela Desktop (lg+) */}
                    <div className="hidden lg:block card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase text-slate-500 dark:text-slate-400">
                                    <tr>
                                        <th className="px-5 py-3.5 font-bold">Aluno</th>
                                        <th className="px-4 py-3.5 font-bold">Plano / Fidelidade</th>
                                        <th className="px-4 py-3.5 font-bold">Vencimento</th>
                                        <th className="px-4 py-3.5 font-bold">Situação</th>
                                        <th className="px-5 py-3.5 font-bold text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredStudents.map((s) => {
                                        const plan = planMap.get(s.plan);
                                        const loyalty = getStudentLoyaltyProgress(s, plan, payments);
                                        return (
                                            <tr
                                                key={s.id}
                                                className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                                            >
                                                <td className="px-5 py-3.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setViewingStudent(s)}
                                                        className="font-bold text-slate-900 dark:text-white hover:text-rose-600 text-left"
                                                    >
                                                        {s.name}
                                                    </button>
                                                    <div className="text-xs text-slate-500 flex items-center gap-2">
                                                        <span>{s.phone}</span>
                                                        {s.graduation && s.graduation !== 'Sem graduação' && (
                                                            <span>• {s.graduation}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <PlanBadge
                                                        plan={s.planType === 'personal' ? undefined : plan}
                                                        fallbackName={
                                                            s.planType === 'personal' ? 'Somente Personal' : s.plan
                                                        }
                                                        loyalty={loyalty}
                                                    />
                                                </td>
                                                <td className="px-4 py-3.5 text-slate-700 dark:text-slate-200">
                                                    <div className="font-semibold">{formatDateBR(s.nextDue)}</div>
                                                    <div className="text-[11px] text-slate-400">Todo dia {s.dueDay}</div>
                                                </td>
                                                <td className="px-4 py-3.5">{renderStatusBadge(s)}</td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => onOpenPayment(s)}
                                                            className="btn btn-success btn-sm"
                                                        >
                                                            <DollarSign className="w-3.5 h-3.5" />
                                                            Receber
                                                        </button>
                                                        <WhatsAppButton
                                                            phone={s.phone}
                                                            message={buildWaForStudent(s)}
                                                            size="icon"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setViewingStudent(s)}
                                                            className="btn btn-ghost btn-sm p-2"
                                                            title="Ver ficha"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditingStudent(s);
                                                                setModalOpen(true);
                                                            }}
                                                            className="btn btn-ghost btn-sm p-2"
                                                            title="Editar"
                                                        >
                                                            <Edit3 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setStudentToDelete(s)}
                                                            className="btn btn-ghost btn-sm p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                            title="Excluir"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            <StudentModal
                isOpen={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setEditingStudent(null);
                }}
                studentToEdit={editingStudent}
                plans={plans}
                personalPlans={personalPlans}
                existingStudents={students}
            />

            <StudentViewModal
                isOpen={Boolean(viewingStudent)}
                onClose={() => setViewingStudent(null)}
                student={viewingStudent}
                plan={viewingStudent ? planMap.get(viewingStudent.plan) : undefined}
                personalPlan={
                    viewingStudent?.personalPlanId
                        ? personalPlanMap.get(viewingStudent.personalPlanId)
                        : undefined
                }
                payments={payments}
                attendance={attendance}
                gymName={gymName}
                onEdit={(st) => {
                    setEditingStudent(st);
                    setModalOpen(true);
                }}
                onReceivePayment={onOpenPayment}
            />

            <ConfirmModal
                isOpen={Boolean(studentToDelete)}
                title="Excluir Aluno"
                message={`Deseja realmente remover ${studentToDelete?.name}?\n\nO histórico financeiro passado continuará preservado para não distorcer o caixa dos meses anteriores.`}
                confirmText="Sim, excluir"
                onConfirm={handleConfirmDelete}
                onCancel={() => setStudentToDelete(null)}
            />
        </div>
    );
}
