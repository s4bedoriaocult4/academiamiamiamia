import { useMemo, useState } from 'react';
import {
    X,
    Edit3,
    DollarSign,
    Phone,
    Calendar,
    Award,
    MapPin,
    Mail,
    FileText,
    Dumbbell,
} from 'lucide-react';
import { Attendance, Payment, PersonalPlan, Plan, Student } from '../../types';
import {
    formatCurrencyBRL,
    formatDateBR,
    formatReferenceMonth,
    getStudentPaymentStatus,
} from '../../utils/dateUtils';
import { getStudentLoyaltyProgress } from '../../utils/planUtils';
import { buildOverdueMessage, buildReminderMessage } from '../../utils/whatsapp';
import { PlanBadge } from '../common/PlanBadge';
import { WhatsAppButton } from '../common/WhatsAppButton';

interface StudentViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: Student | null;
    plan?: Plan | null;
    personalPlan?: PersonalPlan | null;
    payments: Payment[];
    attendance: Attendance[];
    gymName: string;
    onEdit: (student: Student) => void;
    onReceivePayment: (student: Student) => void;
}

export function StudentViewModal({
    isOpen,
    onClose,
    student,
    plan,
    personalPlan,
    payments,
    attendance,
    gymName,
    onEdit,
    onReceivePayment,
}: StudentViewModalProps) {
    const [activeTab, setActiveTab] = useState<'info' | 'payments' | 'attendance'>('info');

    const studentPayments = useMemo(
        () =>
            student
                ? payments
                      .filter((p) => p.studentId === student.id)
                      .sort((a, b) => b.date.localeCompare(a.date))
                : [],
        [payments, student]
    );

    const studentAttendance = useMemo(
        () =>
            student
                ? attendance
                      .filter((a) => a.studentId === student.id)
                      .sort((a, b) => b.date.localeCompare(a.date))
                : [],
        [attendance, student]
    );

    if (!isOpen || !student) return null;

    const paymentStatus = getStudentPaymentStatus(student);
    const daysUntil = paymentStatus.days;
    const loyalty = getStudentLoyaltyProgress(student, plan, studentPayments);

    const waMessage =
        paymentStatus.status === 'overdue'
            ? buildOverdueMessage(
                  student.name,
                  Math.abs(daysUntil),
                  student.nextDue,
                  plan?.price,
                  gymName
              )
            : buildReminderMessage(student.name, Math.max(0, daysUntil), student.nextDue, plan?.price, gymName);

    const statusBadge =
        student.status === 'inativo' ? (
            <span className="badge badge-neutral">Inativo</span>
        ) : paymentStatus.status === 'overdue' ? (
            <span className="badge badge-danger">{Math.abs(daysUntil)}d atrasado</span>
        ) : daysUntil === 0 ? (
            <span className="badge badge-warning">Vence hoje</span>
        ) : (
            <span className="badge badge-success">Em dia</span>
        );

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box max-w-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white truncate">
                                {student.name}
                            </h2>
                            {statusBadge}
                        </div>
                        <PlanBadge plan={plan} fallbackName={student.plan} showPrice loyalty={loyalty} />
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Barra de ações rápidas */}
                <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            onReceivePayment(student);
                        }}
                        className="btn btn-success btn-sm"
                    >
                        <DollarSign className="w-3.5 h-3.5" />
                        Receber Mensalidade
                    </button>
                    <WhatsAppButton phone={student.phone} message={waMessage} size="sm" />
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            onEdit(student);
                        }}
                        className="btn btn-secondary btn-sm"
                    >
                        <Edit3 className="w-3.5 h-3.5" />
                        Editar Cadastro
                    </button>
                </div>

                {/* Abas */}
                <div className="px-5 pt-3 border-b border-slate-100 dark:border-slate-800 flex gap-2">
                    {[
                        { id: 'info', label: 'Dados Gerais' },
                        { id: 'payments', label: `Pagamentos (${studentPayments.length})` },
                        { id: 'attendance', label: `Presenças (${studentAttendance.length})` },
                    ].map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setActiveTab(t.id as typeof activeTab)}
                            className={`pb-2.5 px-2 text-xs font-bold border-b-2 transition-colors ${
                                activeTab === t.id
                                    ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="modal-body">
                    {activeTab === 'info' && (
                        <div className="space-y-4">
                            {loyalty.hasCommitment && (
                                <div className="p-3.5 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/60 space-y-2">
                                    <div className="flex items-center justify-between text-xs font-bold text-violet-900 dark:text-violet-200">
                                        <span>Progresso da Fidelidade</span>
                                        <span>{loyalty.cycleLabel}</span>
                                    </div>
                                    <div className="w-full h-2 bg-violet-200/70 dark:bg-violet-900/50 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-violet-600 rounded-full"
                                            style={{
                                                width: `${Math.min(
                                                    100,
                                                    Math.round(
                                                        ((loyalty.paidCount % loyalty.commitmentMonths ||
                                                            (loyalty.paidCount > 0 ? loyalty.commitmentMonths : 0)) /
                                                            loyalty.commitmentMonths) *
                                                            100
                                                    )
                                                )}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {(student.planType === 'personal' || student.planType === 'both') && (
                                <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <Dumbbell className="w-5 h-5 text-sky-600" />
                                        <div>
                                            <div className="text-xs font-bold text-sky-900 dark:text-sky-200">
                                                {personalPlan?.name || 'Pacote Personal'}
                                            </div>
                                            <div className="text-xs text-sky-700 dark:text-sky-300">
                                                Aulas restantes no pacote
                                            </div>
                                        </div>
                                    </div>
                                    <span className="font-display text-2xl font-bold text-sky-700 dark:text-sky-300">
                                        {student.personalClassesRemaining || 0}
                                    </span>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 flex items-center gap-3">
                                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                                    <div>
                                        <div className="text-[11px] text-slate-400 uppercase font-bold">Telefone</div>
                                        <div className="font-semibold text-slate-800 dark:text-slate-100">
                                            {student.phone || 'Não informado'}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 flex items-center gap-3">
                                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                                    <div>
                                        <div className="text-[11px] text-slate-400 uppercase font-bold">
                                            Próximo Vencimento (Dia {student.dueDay})
                                        </div>
                                        <div className="font-semibold text-slate-800 dark:text-slate-100">
                                            {formatDateBR(student.nextDue)}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 flex items-center gap-3">
                                    <Award className="w-4 h-4 text-slate-400 shrink-0" />
                                    <div>
                                        <div className="text-[11px] text-slate-400 uppercase font-bold">Graduação</div>
                                        <div className="font-semibold text-slate-800 dark:text-slate-100">
                                            {student.graduation || 'Sem graduação'}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 flex items-center gap-3">
                                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                                    <div>
                                        <div className="text-[11px] text-slate-400 uppercase font-bold">Início / Nascimento</div>
                                        <div className="font-semibold text-slate-800 dark:text-slate-100">
                                            {formatDateBR(student.startDate)}
                                            {student.birthDate ? ` • Nasc: ${formatDateBR(student.birthDate)}` : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {(student.email || student.cpf || student.address || student.responsibleName) && (
                                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                                    {student.responsibleName && (
                                        <div>
                                            <strong>Responsável:</strong> {student.responsibleName}
                                        </div>
                                    )}
                                    {student.email && (
                                        <div className="flex items-center gap-1.5">
                                            <Mail className="w-3.5 h-3.5" /> {student.email}
                                        </div>
                                    )}
                                    {student.cpf && (
                                        <div>
                                            <strong>CPF:</strong> {student.cpf}
                                        </div>
                                    )}
                                    {student.address && (
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5" /> {student.address}
                                        </div>
                                    )}
                                </div>
                            )}

                            {student.notes && (
                                <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/40 text-xs space-y-1">
                                    <div className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5" /> Observações
                                    </div>
                                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                        {student.notes}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'payments' && (
                        studentPayments.length === 0 ? (
                            <p className="py-8 text-center text-sm text-slate-500">
                                Nenhum pagamento registrado para este aluno.
                            </p>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {studentPayments.map((p) => (
                                    <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                                        <div>
                                            <div className="font-semibold text-sm text-slate-900 dark:text-white">
                                                {p.type === 'personal'
                                                    ? p.itemDescription || 'Pacote Personal'
                                                    : p.referenceMonth
                                                        ? `Mensalidade ${formatReferenceMonth(p.referenceMonth)}`
                                                        : p.itemDescription || 'Pagamento'}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                Pago em {formatDateBR(p.date)} • {p.method}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-emerald-600 dark:text-emerald-400">
                                                {formatCurrencyBRL((p.amount || 0) + (p.lateFee || 0))}
                                            </div>
                                            {p.lateFee ? (
                                                <div className="text-[11px] text-amber-600">
                                                    Inclui multa {formatCurrencyBRL(p.lateFee)}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {activeTab === 'attendance' && (
                        studentAttendance.length === 0 ? (
                            <p className="py-8 text-center text-sm text-slate-500">
                                Nenhuma presença registrada para este aluno.
                            </p>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {studentAttendance.map((a) => (
                                    <div key={a.id} className="py-2.5 flex items-center justify-between">
                                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                            {formatDateBR(a.date)}
                                        </span>
                                        <span
                                            className={`badge ${
                                                a.attendanceType === 'personal' ? 'badge-violet' : 'badge-info'
                                            }`}
                                        >
                                            {a.attendanceType === 'personal' ? 'Personal' : 'Turma Normal'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>

                <div className="modal-footer">
                    <button type="button" onClick={onClose} className="btn btn-secondary">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}
