import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, DollarSign, AlertTriangle } from 'lucide-react';
import { Payment, PAYMENT_METHODS } from '../../types';
import { db } from '../../services/db';
import { useStudents, usePayments } from '../../hooks/useGymStore';
import {
    getTodayDateString,
    getCurrentMonthString,
    calculateNextDueDate,
    suggestNextReferenceMonth,
    formatReferenceMonth,
    formatDateBR
} from '../../utils/dateUtils';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    paymentToEdit?: Payment | null;
    initialData?: Partial<Payment>;
}

export function PaymentModal({ isOpen, onClose, paymentToEdit, initialData }: PaymentModalProps) {
    const students = useStudents();
    const payments = usePayments();
    const plans = useLiveQuery(() => db.plans.toArray()) || [];
    const personalPlans = useLiveQuery(() => db.personalPlans.toArray()) || [];

    const defaultFormData: Partial<Payment> = {
        type: 'pagamento',
        studentId: '',
        amount: 0,
        method: 'PIX',
        date: getTodayDateString(),
        referenceMonth: getCurrentMonthString(),
        itemDescription: '',
        lateFee: undefined
    };

    const [formData, setFormData] = useState<Partial<Payment>>(defaultFormData);
    const [selectedPackageId, setSelectedPackageId] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (paymentToEdit) {
            setFormData(paymentToEdit);
        } else if (initialData) {
            setFormData({ ...defaultFormData, ...initialData });
        } else {
            setFormData(defaultFormData);
        }

        if (!paymentToEdit) {
            setSelectedPackageId('');
        }
    }, [paymentToEdit, initialData, isOpen]);

    // Lógica inteligente ao selecionar aluno para Mensalidade
    useEffect(() => {
        if (!paymentToEdit && formData.type === 'pagamento' && formData.studentId) {
            const student = students.find(s => s.id === formData.studentId);
            if (student) {
                const plan = plans.find(p => p.id === student.plan);
                // Preenche o valor se não foi definido via initialData
                const amount = (!initialData?.amount && plan) ? plan.price : (formData.amount || plan?.price || 0);

                // Sugere o mês de competência correto se não especificado explicitamente
                const suggestedMonth = (!initialData?.referenceMonth)
                    ? suggestNextReferenceMonth(student, payments)
                    : formData.referenceMonth;

                setFormData(prev => ({
                    ...prev,
                    amount,
                    referenceMonth: suggestedMonth || prev.referenceMonth
                }));
            }
        }
    }, [formData.studentId, formData.type, paymentToEdit, initialData]);

    // Logic for Package Selection
    const handlePackageSelect = (packageId: string) => {
        setSelectedPackageId(packageId);
        const pkg = personalPlans.find(p => p.id === packageId);
        if (pkg) {
            setFormData(prev => ({
                ...prev,
                amount: pkg.price,
                itemDescription: `Pacote Personal: ${pkg.name}`
            }));
        }
    };

    // Verifica se já existe pagamento registrado para a mesma competência
    const existingPaymentForRef = (!paymentToEdit && formData.type === 'pagamento' && formData.studentId && formData.referenceMonth)
        ? payments.find(p => p.studentId === formData.studentId && (p.type === 'pagamento' || !p.type) && p.referenceMonth === formData.referenceMonth)
        : null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        // Validação de valor
        if (!formData.amount || formData.amount <= 0) {
            alert('O valor deve ser maior que zero');
            return;
        }

        // Validação de aluno (exceto para entradas avulsas)
        if (formData.type !== 'entrada' && !formData.studentId) {
            alert('Selecione um aluno');
            return;
        }

        // Validação de pacote para Personal
        if (formData.type === 'personal' && !paymentToEdit && !selectedPackageId) {
            alert('Selecione um pacote Personal');
            return;
        }

        setIsSubmitting(true);

        try {
            const student = students.find(s => s.id === formData.studentId);
            const studentName = student ? student.name : undefined;

            if (paymentToEdit) {
                await db.payments.update(paymentToEdit.id, {
                    ...formData,
                    studentName
                });
            } else {
                await db.payments.add({
                    ...formData,
                    id: Date.now().toString(),
                    studentName,
                    createdAt: new Date().toISOString()
                } as Payment);

                // Efeitos colaterais no aluno
                if (formData.studentId && student) {
                    // 1. Mensalidade -> Atualiza data do próximo vencimento
                    if (formData.type === 'pagamento' && formData.referenceMonth) {
                        const plan = plans.find(p => p.id === student.plan);
                        const duration = plan?.durationMonths || 1;
                        const dueDay = student.dueDay || 5;

                        // Calcula com segurança sem bug de fuso horário
                        const nextDue = calculateNextDueDate(formData.referenceMonth, dueDay, duration);

                        await db.students.update(formData.studentId, { nextDue });
                    }

                    // 2. Pacote Personal -> Adiciona aulas ao saldo
                    if (formData.type === 'personal') {
                        let classesToAdd = 0;
                        const pkg = personalPlans.find(p => p.id === selectedPackageId);

                        if (pkg) {
                            classesToAdd = pkg.totalClasses;
                        }

                        if (classesToAdd > 0) {
                            const currentCredits = student.personalClassesRemaining || 0;
                            await db.students.update(formData.studentId, {
                                personalClassesRemaining: currentCredits + classesToAdd,
                                planType: (student.planType === 'normal' || !student.planType) ? 'both' : student.planType
                            });
                        }
                    }
                }
            }
            onClose();
        } catch (error) {
            console.error('Erro ao salvar transação:', error);
            alert('Erro ao salvar pagamento');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Verificar se há dados não salvos
    const hasUnsavedChanges = (): boolean => {
        if (paymentToEdit) return false;
        return !!(formData.studentId || (formData.amount && formData.amount > 0) || formData.itemDescription || selectedPackageId);
    };

    const handleClose = () => {
        if (hasUnsavedChanges()) {
            if (confirm('Você tem dados não salvos. Deseja realmente sair?')) {
                onClose();
            }
        } else {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{paymentToEdit ? '✏️ Editar Pagamento' : '💰 Nova Transação'}</h3>
                    <button onClick={handleClose} className="action-btn"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="modal-body">

                    {/* TYPE SELECTION - DROPDOWN */}
                    <div className="form-group">
                        <label className="form-label">Tipo de Transação</label>
                        <select
                            className="form-select font-medium text-gray-700 bg-gray-50 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            value={formData.type}
                            onChange={e => {
                                const newType = e.target.value as any;
                                setFormData(prev => ({
                                    ...prev,
                                    type: newType,
                                    itemDescription: newType === 'personal' ? 'Pacote Personal' : '',
                                    studentId: newType === 'entrada' ? '' : prev.studentId
                                }));
                            }}
                        >
                            <option value="pagamento">💰 Mensalidade</option>
                            <option value="personal">🏋️ Pacote Personal</option>
                            <option value="entrada">🛍️ Entrada / Venda Avulsa</option>
                        </select>
                    </div>

                    {/* 1. STUDENT SELECTOR (For Mensalidade & Personal) */}
                    {formData.type !== 'entrada' && (
                        <div className="form-group">
                            <label className="form-label">Aluno</label>
                            <select
                                required
                                className="form-select"
                                value={formData.studentId}
                                onChange={e => setFormData({ ...formData, studentId: e.target.value })}
                            >
                                <option value="">Selecione um aluno...</option>
                                {students
                                    .sort((a, b) => a.name.localeCompare(b.name))
                                    .map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} {s.status === 'inativo' ? '(Inativo)' : ''}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    )}

                    {/* 2. PERSONAL PACKAGE SELECTOR */}
                    {formData.type === 'personal' && !paymentToEdit && (
                        <div className="form-group">
                            <label className="form-label">Selecionar Pacote</label>
                            <select
                                required={true}
                                className="form-select"
                                value={selectedPackageId}
                                onChange={e => handlePackageSelect(e.target.value)}
                            >
                                <option value="">Selecione o pacote...</option>
                                {personalPlans.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({p.totalClasses} aulas) - R$ {p.price}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                O saldo de aulas será adicionado automaticamente ao salvar.
                            </p>
                        </div>
                    )}

                    {/* 3. ITEM DESCRIPTION (For Entrada) */}
                    {formData.type === 'entrada' && (
                        <div className="form-group">
                            <label className="form-label">Descrição do Item</label>
                            <input
                                required
                                className="form-input"
                                placeholder="Ex: Água, Camiseta, Luva..."
                                value={formData.itemDescription || ''}
                                onChange={e => setFormData({ ...formData, itemDescription: e.target.value })}
                            />
                        </div>
                    )}

                    {/* 4. REFERENCE MONTH (For Mensalidade) */}
                    {formData.type === 'pagamento' && (
                        <div className="form-group">
                            <label className="form-label">Mês de Referência (Competência)</label>
                            <input
                                type="month"
                                required
                                className="form-input"
                                value={formData.referenceMonth || ''}
                                onChange={e => setFormData({ ...formData, referenceMonth: e.target.value })}
                            />
                            {existingPaymentForRef && (
                                <div className="p-2 mt-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 flex items-center gap-1.5">
                                    <AlertTriangle size={14} className="text-yellow-600 flex-shrink-0" />
                                    <span>
                                        Já consta um pagamento em <strong>{formatDateBR(existingPaymentForRef.date)}</strong> de <strong>R$ {existingPaymentForRef.amount.toFixed(2)}</strong> referente a {formatReferenceMonth(formData.referenceMonth)}.
                                    </span>
                                </div>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                                O sistema calcula o próximo vencimento a partir deste mês de referência.
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="form-label">Valor (R$)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-gray-500">R$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    className="form-input pl-8"
                                    value={formData.amount || ''}
                                    onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Data Pagamento</label>
                            <input
                                type="date"
                                required
                                className="form-input"
                                value={formData.date || ''}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Método de Pagamento</label>
                        <select
                            className="form-select"
                            value={formData.method}
                            onChange={e => setFormData({ ...formData, method: e.target.value as any })}
                        >
                            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>

                    {formData.type === 'pagamento' && (
                        <div className="form-group p-3 bg-red-50 rounded border border-red-100">
                            <label className="form-label text-red-700">Multa / Juros (Opcional)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-red-400">R$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="form-input pl-8 border-red-200 focus:border-red-500"
                                    value={formData.lateFee || ''}
                                    onChange={e => setFormData({ ...formData, lateFee: Number(e.target.value) })}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    )}

                    <div className="form-group pt-4">
                        <button
                            type="submit"
                            className="btn btn-primary w-full"
                            style={{ width: '100%' }}
                            disabled={isSubmitting}
                        >
                            <DollarSign size={18} />
                            {isSubmitting ? 'Registrando...' : 'Confirmar Pagamento'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
