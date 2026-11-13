import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    X,
    Check,
    AlertTriangle,
    CheckCircle2,
    Search,
} from 'lucide-react';
import {
    Payment,
    PAYMENT_METHODS,
    PersonalPlan,
    Plan,
    Student,
} from '../../types';
import {
    formatCurrencyBRL,
    formatReferenceMonth,
    getCurrentMonthString,
    getTodayDateString,
    suggestNextReferenceMonth,
} from '../../utils/dateUtils';
import { savePaymentWithReconciliation } from '../../services/dataAccess';
import { buildReceiptMessage } from '../../utils/whatsapp';
import { WhatsAppButton } from '../common/WhatsAppButton';
import { useToast } from '../../contexts/ToastContext';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    paymentToEdit?: Payment | null;
    preselectedStudent?: Student | null;
    initialType?: 'pagamento' | 'personal' | 'entrada';
    students: Student[];
    payments: Payment[];
    plans: Plan[];
    personalPlans: PersonalPlan[];
    gymName: string;
}

export function PaymentModal({
    isOpen,
    onClose,
    paymentToEdit,
    preselectedStudent,
    initialType = 'pagamento',
    students,
    payments,
    plans,
    personalPlans,
    gymName,
}: PaymentModalProps) {
    const { showToast } = useToast();
    const initSessionRef = useRef<string | null>(null);

    const [type, setType] = useState<'pagamento' | 'personal' | 'entrada'>('pagamento');
    const [studentId, setStudentId] = useState('');
    const [studentSearch, setStudentSearch] = useState('');
    const [amount, setAmount] = useState('');
    const [lateFee, setLateFee] = useState('');
    const [method, setMethod] = useState<Payment['method']>('PIX');
    const [date, setDate] = useState(getTodayDateString());
    const [referenceMonth, setReferenceMonth] = useState(getCurrentMonthString());
    const [itemDescription, setItemDescription] = useState('');
    const [personalPlanId, setPersonalPlanId] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Tela pós-salvamento com comprovante WhatsApp
    const [savedReceipt, setSavedReceipt] = useState<{
        student?: Student;
        payment: Payment;
    } | null>(null);

    const planMap = useMemo(() => new Map(plans.map((p) => [p.id, p])), [plans]);
    const personalPlanMap = useMemo(
        () => new Map(personalPlans.map((p) => [p.id, p])),
        [personalPlans]
    );

    const sortedStudents = useMemo(
        () =>
            [...students].sort((a, b) => {
                if (a.status !== b.status) return a.status === 'ativo' ? -1 : 1;
                return a.name.localeCompare(b.name, 'pt-BR');
            }),
        [students]
    );

    const filteredDropdownStudents = useMemo(() => {
        const term = studentSearch.trim().toLowerCase();
        if (!term) return sortedStudents;
        return sortedStudents.filter((s) => s.name.toLowerCase().includes(term));
    }, [sortedStudents, studentSearch]);

    const selectedStudent = useMemo(
        () => students.find((s) => s.id === studentId) || null,
        [students, studentId]
    );

    useEffect(() => {
        if (!isOpen) {
            initSessionRef.current = null;
            setSavedReceipt(null);
            return;
        }

        const key = paymentToEdit
            ? `edit:${paymentToEdit.id}`
            : `new:${preselectedStudent?.id || 'none'}:${initialType}`;
        if (initSessionRef.current === key) return;
        initSessionRef.current = key;

        setSavedReceipt(null);
        setStudentSearch('');

        if (paymentToEdit) {
            const pType =
                paymentToEdit.type === 'item_vendido' || paymentToEdit.type === 'entrada'
                    ? 'entrada'
                    : paymentToEdit.type === 'personal'
                        ? 'personal'
                        : 'pagamento';
            setType(pType);
            setStudentId(paymentToEdit.studentId || '');
            setAmount(String(paymentToEdit.amount ?? ''));
            setLateFee(paymentToEdit.lateFee ? String(paymentToEdit.lateFee) : '');
            setMethod(paymentToEdit.method || 'PIX');
            setDate(paymentToEdit.date || getTodayDateString());
            setReferenceMonth(paymentToEdit.referenceMonth || getCurrentMonthString());
            setItemDescription(paymentToEdit.itemDescription || '');
            setPersonalPlanId(paymentToEdit.personalPlanId || personalPlans[0]?.id || '');
            return;
        }

        setType(initialType);
        setMethod('PIX');
        setDate(getTodayDateString());
        setLateFee('');
        setItemDescription('');

        const targetStudent = preselectedStudent || sortedStudents.find((s) => s.status === 'ativo') || sortedStudents[0];
        if (targetStudent && initialType !== 'entrada') {
            setStudentId(targetStudent.id);
            if (initialType === 'personal') {
                const pId = targetStudent.personalPlanId || personalPlans[0]?.id || '';
                setPersonalPlanId(pId);
                const pp = personalPlanMap.get(pId);
                setAmount(pp ? String(pp.price) : '');
                setItemDescription(pp ? `${pp.name} (+${pp.totalClasses} aulas)` : '');
            } else {
                const plan = planMap.get(targetStudent.plan);
                setAmount(plan ? String(plan.price) : '');
                setReferenceMonth(suggestNextReferenceMonth(targetStudent, payments));
            }
        } else {
            setStudentId('');
            setAmount('');
            setReferenceMonth(getCurrentMonthString());
            setPersonalPlanId(personalPlans[0]?.id || '');
        }
    }, [
        isOpen,
        paymentToEdit,
        preselectedStudent,
        initialType,
        sortedStudents,
        payments,
        planMap,
        personalPlans,
        personalPlanMap,
    ]);

    const applyStudentDefaults = (st: Student, targetType: typeof type) => {
        if (targetType === 'pagamento') {
            const plan = planMap.get(st.plan);
            if (plan) setAmount(String(plan.price));
            setReferenceMonth(suggestNextReferenceMonth(st, payments));
        } else if (targetType === 'personal') {
            const pId = st.personalPlanId || personalPlans[0]?.id || '';
            setPersonalPlanId(pId);
            const pp = personalPlanMap.get(pId);
            if (pp) {
                setAmount(String(pp.price));
                setItemDescription(`${pp.name} (+${pp.totalClasses} aulas)`);
            }
        }
    };

    const handleStudentChange = (newId: string) => {
        setStudentId(newId);
        if (paymentToEdit) return;
        const st = students.find((s) => s.id === newId);
        if (st) applyStudentDefaults(st, type);
    };

    const handleTypeChange = (nextType: typeof type) => {
        setType(nextType);
        if (paymentToEdit) return;
        if (nextType === 'entrada') {
            setAmount('');
            setItemDescription('');
            return;
        }
        const st = selectedStudent || sortedStudents[0];
        if (st) {
            if (!selectedStudent) setStudentId(st.id);
            applyStudentDefaults(st, nextType);
        }
    };

    const handlePersonalPackageSelect = (id: string) => {
        setPersonalPlanId(id);
        const pp = personalPlanMap.get(id);
        if (pp && !paymentToEdit) {
            setAmount(String(pp.price));
            setItemDescription(`${pp.name} (+${pp.totalClasses} aulas)`);
        }
    };

    // Últimos meses pagos do aluno selecionado + detecção de duplicidade
    const studentPaidMonths = useMemo(() => {
        if (!selectedStudent) return [];
        return payments
            .filter(
                (p) =>
                    p.studentId === selectedStudent.id &&
                    (p.type === 'pagamento' || !p.type) &&
                    Boolean(p.referenceMonth) &&
                    p.id !== paymentToEdit?.id
            )
            .map((p) => p.referenceMonth!)
            .sort()
            .reverse();
    }, [payments, selectedStudent, paymentToEdit]);

    const hasDuplicateReference =
        type === 'pagamento' && Boolean(referenceMonth) && studentPaidMonths.includes(referenceMonth);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount.replace(',', '.'));
        const numLateFee = lateFee ? parseFloat(lateFee.replace(',', '.')) : 0;

        if (!Number.isFinite(numAmount) || numAmount <= 0) {
            showToast('warning', 'Informe um valor válido maior que zero.');
            return;
        }
        if (type !== 'entrada' && !studentId) {
            showToast('warning', 'Selecione o aluno.');
            return;
        }
        if (type === 'entrada' && !itemDescription.trim()) {
            showToast('warning', 'Informe a descrição da venda ou entrada avulsa.');
            return;
        }

        const selectedPP = personalPlanMap.get(personalPlanId);

        setIsSaving(true);
        try {
            const { payment, updatedStudent } = await savePaymentWithReconciliation({
                id: paymentToEdit?.id,
                studentId: type === 'entrada' ? undefined : studentId,
                studentName: type === 'entrada' ? undefined : selectedStudent?.name,
                amount: numAmount,
                lateFee: numLateFee > 0 ? numLateFee : undefined,
                method,
                date,
                referenceMonth: type === 'pagamento' ? referenceMonth : undefined,
                type,
                itemDescription:
                    type === 'entrada'
                        ? itemDescription.trim()
                        : type === 'personal'
                            ? itemDescription.trim() || `${selectedPP?.name || 'Personal'}`
                            : undefined,
                personalPlanId: type === 'personal' ? personalPlanId : undefined,
                classesAdded:
                    type === 'personal'
                        ? selectedPP?.totalClasses || paymentToEdit?.classesAdded || 4
                        : undefined,
            });

            showToast(
                'success',
                paymentToEdit ? 'Lançamento atualizado!' : 'Pagamento registrado com sucesso!'
            );

            if (!paymentToEdit && (updatedStudent || selectedStudent)) {
                setSavedReceipt({
                    student: updatedStudent || selectedStudent || undefined,
                    payment,
                });
            } else {
                onClose();
            }
        } catch {
            showToast('error', 'Erro ao salvar pagamento.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                            {savedReceipt
                                ? 'Pagamento Confirmado!'
                                : paymentToEdit
                                    ? 'Editar Lançamento'
                                    : 'Registrar Recebimento'}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {savedReceipt
                                ? 'Vencimento / saldo atualizado automaticamente'
                                : 'Mensalidade, pacote personal ou venda avulsa'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {savedReceipt ? (
                    <div className="p-6 space-y-5 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>

                        <div className="space-y-1">
                            <div className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                                {formatCurrencyBRL(
                                    (savedReceipt.payment.amount || 0) + (savedReceipt.payment.lateFee || 0)
                                )}
                            </div>
                            <div className="text-sm text-slate-600 dark:text-slate-300">
                                Recebido de <strong>{savedReceipt.student?.name}</strong> via{' '}
                                <strong>{savedReceipt.payment.method}</strong>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2">
                            {savedReceipt.student?.phone && (
                                <WhatsAppButton
                                    phone={savedReceipt.student.phone}
                                    variant="solid"
                                    size="md"
                                    label="Enviar Comprovante no WhatsApp"
                                    message={buildReceiptMessage(
                                        savedReceipt.student.name,
                                        (savedReceipt.payment.amount || 0) +
                                            (savedReceipt.payment.lateFee || 0),
                                        savedReceipt.payment.method,
                                        savedReceipt.payment.date,
                                        savedReceipt.payment.referenceMonth,
                                        savedReceipt.payment.itemDescription,
                                        gymName
                                    )}
                                />
                            )}
                            <button type="button" onClick={onClose} className="btn btn-secondary">
                                Fechar
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                        <div className="modal-body">
                            {/* Tipo de Recebimento */}
                            <div>
                                <span className="label">Tipo de Lançamento</span>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'pagamento', label: 'Mensalidade' },
                                        { id: 'personal', label: 'Personal' },
                                        { id: 'entrada', label: 'Venda Avulsa' },
                                    ].map((t) => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => handleTypeChange(t.id as typeof type)}
                                            className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all ${
                                                type === t.id
                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                            }`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Seleção de Aluno */}
                            {type !== 'entrada' && (
                                <div className="space-y-2">
                                    <label className="label">Aluno *</label>
                                    {!preselectedStudent && !paymentToEdit && students.length > 10 && (
                                        <div className="relative">
                                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                            <input
                                                type="text"
                                                placeholder="Filtrar aluno por nome..."
                                                value={studentSearch}
                                                onChange={(e) => setStudentSearch(e.target.value)}
                                                className="input pl-8 py-1.5 text-xs"
                                            />
                                        </div>
                                    )}
                                    <select
                                        required
                                        value={studentId}
                                        onChange={(e) => handleStudentChange(e.target.value)}
                                        onWheel={(e) => e.currentTarget.blur()}
                                        className="input"
                                    >
                                        <option value="">Selecione um aluno...</option>
                                        {filteredDropdownStudents.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.name} {s.status === 'inativo' ? '(Inativo)' : ''}
                                            </option>
                                        ))}
                                    </select>

                                    {selectedStudent && type === 'pagamento' && (
                                        <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5">
                                            <span>Plano:</span>
                                            <strong className="text-slate-800 dark:text-slate-200">
                                                {planMap.get(selectedStudent.plan)?.name || selectedStudent.plan}
                                            </strong>
                                            {studentPaidMonths.length > 0 && (
                                                <span>
                                                    • Últimos pagos:{' '}
                                                    {studentPaidMonths
                                                        .slice(0, 3)
                                                        .map((m) => formatReferenceMonth(m))
                                                        .join(', ')}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Pacote Personal */}
                            {type === 'personal' && (
                                <div>
                                    <label className="label">Pacote de Aulas Personal</label>
                                    <select
                                        value={personalPlanId}
                                        onChange={(e) => handlePersonalPackageSelect(e.target.value)}
                                        className="input"
                                    >
                                        {personalPlans.map((pp) => (
                                            <option key={pp.id} value={pp.id}>
                                                {pp.name} — {pp.totalClasses} aulas ({formatCurrencyBRL(pp.price)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Descrição (Venda avulsa ou Personal) */}
                            {type !== 'pagamento' && (
                                <div>
                                    <label className="label">
                                        {type === 'entrada' ? 'Descrição do Item / Serviço *' : 'Descrição no Recibo'}
                                    </label>
                                    <input
                                        type="text"
                                        required={type === 'entrada'}
                                        placeholder="Ex: Luva de Muay Thai, Bandagem, Camiseta..."
                                        value={itemDescription}
                                        onChange={(e) => setItemDescription(e.target.value)}
                                        className="input"
                                    />
                                </div>
                            )}

                            {/* Valor, Multa e Mês */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label className="label">Valor (R$) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        placeholder="0,00"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        onWheel={(e) => e.currentTarget.blur()}
                                        className="input font-bold text-base"
                                    />
                                </div>

                                {type === 'pagamento' ? (
                                    <div>
                                        <label className="label">Mês de Referência</label>
                                        <input
                                            type="month"
                                            value={referenceMonth}
                                            onChange={(e) => setReferenceMonth(e.target.value)}
                                            className="input"
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <label className="label">Data do Recebimento</label>
                                        <input
                                            type="date"
                                            required
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="input"
                                        />
                                    </div>
                                )}
                            </div>

                            {hasDuplicateReference && (
                                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                                    <span>
                                        Atenção: já existe uma mensalidade paga para{' '}
                                        <strong>{formatReferenceMonth(referenceMonth)}</strong> neste aluno.
                                    </span>
                                </div>
                            )}

                            {/* Forma, Data e Multa opcional */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                                <div className={type === 'pagamento' ? '' : 'sm:col-span-3'}>
                                    <label className="label">Forma de Pagamento</label>
                                    <select
                                        value={method}
                                        onChange={(e) => setMethod(e.target.value as Payment['method'])}
                                        className="input"
                                    >
                                        {PAYMENT_METHODS.map((m) => (
                                            <option key={m} value={m}>
                                                {m}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {type === 'pagamento' && (
                                    <>
                                        <div>
                                            <label className="label">Data Recebida</label>
                                            <input
                                                type="date"
                                                required
                                                value={date}
                                                onChange={(e) => setDate(e.target.value)}
                                                className="input"
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Multa / Juros (R$)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder="0,00"
                                                value={lateFee}
                                                onChange={(e) => setLateFee(e.target.value)}
                                                onWheel={(e) => e.currentTarget.blur()}
                                                className="input"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button type="button" onClick={onClose} className="btn btn-secondary">
                                Cancelar
                            </button>
                            <button type="submit" disabled={isSaving} className="btn btn-success">
                                <Check className="w-4 h-4" />
                                {isSaving ? 'Salvando...' : 'Confirmar Pagamento'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
