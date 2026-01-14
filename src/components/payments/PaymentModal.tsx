import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, DollarSign } from 'lucide-react';
import { Payment, PAYMENT_METHODS } from '../../types';
import { db } from '../../services/db';
import { useStudents } from '../../hooks/useGymStore';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    paymentToEdit?: Payment | null;
    initialData?: Partial<Payment>; // New prop for pre-filling data without implying "Edit Mode"
}

export function PaymentModal({ isOpen, onClose, paymentToEdit, initialData }: PaymentModalProps) {
    const students = useStudents();
    const activeStudents = students.filter(s => s.status === 'ativo');
    const plans = useLiveQuery(() => db.plans.toArray()) || [];
    const personalPlans = useLiveQuery(() => db.personalPlans.toArray()) || [];

    const defaultFormData: Partial<Payment> = {
        type: 'pagamento',
        studentId: '',
        amount: 0,
        method: 'PIX',
        date: new Date().toISOString().split('T')[0],
        referenceMonth: new Date().toISOString().slice(0, 7),
        itemDescription: '',
        lateFee: undefined
    };

    const [formData, setFormData] = useState<Partial<Payment>>(defaultFormData);
    const [selectedPackageId, setSelectedPackageId] = useState<string>('');

    useEffect(() => {
        if (paymentToEdit) {
            setFormData(paymentToEdit);
            // If editing, we generally don't reset package selection logic as it's complex to infer back
        } else if (initialData) {
            setFormData({ ...defaultFormData, ...initialData });
        } else {
            setFormData(defaultFormData);
        }

        // Reset package selection when opening fresh or with new initial data
        if (!paymentToEdit) {
            setSelectedPackageId('');
        }
    }, [paymentToEdit, initialData, isOpen]);

    // Lógica para preencher valor ao selecionar aluno (apenas para Mensalidade "Normal")
    useEffect(() => {
        if (!paymentToEdit && !initialData?.amount && formData.type === 'pagamento' && formData.studentId) {
            const student = activeStudents.find(s => s.id === formData.studentId);
            if (student && student.plan) {
                const plan = plans.find(p => p.id === student.plan);
                if (plan) {
                    setFormData(prev => ({ ...prev, amount: plan.price }));
                }
            }
        }
    }, [formData.studentId, formData.type, plans, activeStudents, paymentToEdit, initialData]);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

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

                // SIDE EFFECTS (Only on Creation)
                if (formData.studentId) {
                    // 1. Mensalidade -> Update Next Due
                    if (formData.type === 'pagamento') {
                        const currentRef = new Date(formData.referenceMonth + '-05');
                        const nextMonth = new Date(currentRef);
                        nextMonth.setMonth(nextMonth.getMonth() + 1);
                        const dueDay = student?.dueDay || 5;
                        nextMonth.setDate(dueDay);

                        await db.students.update(formData.studentId, {
                            nextDue: nextMonth.toISOString().split('T')[0]
                        });
                    }

                    // 2. Personal Package -> Add Credits
                    if (formData.type === 'personal') {
                        let classesToAdd = 0;
                        const pkg = personalPlans.find(p => p.id === selectedPackageId);

                        // If package selected, use its class count
                        if (pkg) {
                            classesToAdd = pkg.totalClasses;
                        }
                        // Fallback: If no package selected but user manually entered amount/description, maybe they want to add credits?
                        // Current logic: strict package selection for credits to ensure data integrity.
                        // If they want manual credits, they can edit student profile.

                        if (classesToAdd > 0) {
                            const currentCredits = student?.personalClassesRemaining || 0;
                            await db.students.update(formData.studentId, {
                                personalClassesRemaining: currentCredits + classesToAdd,
                                // Ensure legacy visual badge works if needed
                                planType: (student?.planType === 'normal' || !student?.planType) ? 'both' : student?.planType
                            });
                            alert(`Pacote comprado! Adicionado +${classesToAdd} aulas ao saldo.`);
                        }
                    }
                }
            }
            onClose();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar pagamento');
        }
    };

    // Verificar se há dados não salvos
    const hasUnsavedChanges = (): boolean => {
        if (paymentToEdit) return false; // Edição é mais complexa, simplificar
        // Para novo pagamento, verificar se preencheu algo significativo
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
                                    // Reset specific fields if switching types
                                    studentId: newType === 'entrada' ? '' : prev.studentId
                                }));
                            }}
                        >
                            <option value="pagamento">💰 Mensalidade</option>
                            <option value="personal">🏋️ Pacote Personal</option>
                            <option value="entrada">🛍️ Entrada / Venda Avulsa</option>
                        </select>
                    </div>

                    {/* DYNAMIC FIELDS */}

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
                                {activeStudents.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* 2. PERSONAL PACKAGE SELECTOR */}
                    {formData.type === 'personal' && !paymentToEdit && (
                        <div className="form-group">
                            <label className="form-label">Selecionar Pacote</label>
                            <select
                                required={true} // Force package selection for simplicity in adding credits
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
                                O saldo de aulas será atualizado automaticamente ao salvar.
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
                            <label className="form-label">Mês de Referência</label>
                            <input
                                type="month"
                                className="form-input"
                                value={formData.referenceMonth}
                                onChange={e => setFormData({ ...formData, referenceMonth: e.target.value })}
                            />
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
                                    value={formData.amount}
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
                                value={formData.date}
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
                        <button type="submit" className="btn btn-primary w-full" style={{ width: '100%' }}>
                            <DollarSign size={18} /> Confirmar Pagamento
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
