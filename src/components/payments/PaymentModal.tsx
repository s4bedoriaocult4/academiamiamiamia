import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { X } from 'lucide-react';
import { Payment, PAYMENT_METHODS } from '../../types';
import { db } from '../../services/db';
import { useStudents } from '../../hooks/useGymStore';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    paymentToEdit?: Payment | null;
}

export function PaymentModal({ isOpen, onClose, paymentToEdit }: PaymentModalProps) {
    const students = useStudents();
    const activeStudents = students.filter(s => s.status === 'ativo');
    const plans = useLiveQuery(() => db.plans.toArray()) || [];

    const [formData, setFormData] = useState<Partial<Payment>>({
        type: 'pagamento', studentId: '', amount: 0, method: 'PIX', date: new Date().toISOString().split('T')[0], referenceMonth: new Date().toISOString().slice(0, 7), itemDescription: '', lateFee: undefined
    });

    useEffect(() => {
        if (paymentToEdit) {
            setFormData({
                ...paymentToEdit,
                type: paymentToEdit.type || 'pagamento' // Garantir type para pagamentos antigos
            });
        } else {
            setFormData({
                type: 'pagamento', studentId: '', amount: 0, method: 'PIX', date: new Date().toISOString().split('T')[0], referenceMonth: new Date().toISOString().slice(0, 7), itemDescription: '', lateFee: undefined
            });
        }
    }, [paymentToEdit, isOpen]);

    // Auto-fill amount when selecting student
    const handleStudentChange = (studentId: string) => {
        const student = students.find(s => s.id === studentId);
        let amount = formData.amount;
        if (student) {
            const plan = plans.find(p => p.id === student.plan);
            if (plan) amount = plan.price;
        }
        setFormData({ ...formData, studentId, amount });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.amount || formData.amount <= 0) {
            alert('Preencha o valor');
            return;
        }

        if (formData.type === 'pagamento' && !formData.studentId) {
            alert('Selecione um aluno para o pagamento');
            return;
        }

        if (formData.type === 'item_vendido' && !formData.itemDescription) {
            alert('Preencha a descrição do item vendido');
            return;
        }

        try {
            if (paymentToEdit) {
                const updateData: Partial<Payment> = {
                    ...formData,
                    amount: Number(formData.amount),
                    lateFee: formData.lateFee ? Number(formData.lateFee) : undefined
                };

                if (formData.type === 'pagamento' && formData.studentId) {
                    const student = students.find(s => s.id === formData.studentId);
                    if (student) {
                        updateData.studentName = student.name;
                    }
                }

                await db.payments.update(paymentToEdit.id, updateData);
            } else {
                const newPayment: Payment = {
                    id: Date.now().toString(),
                    type: (formData.type || 'pagamento') as 'pagamento' | 'item_vendido',
                    amount: Number(formData.amount),
                    method: formData.method as any,
                    date: formData.date!,
                    createdAt: new Date().toISOString(),
                    lateFee: formData.lateFee ? Number(formData.lateFee) : undefined
                };

                if (formData.type === 'pagamento') {
                    const student = students.find(s => s.id === formData.studentId);
                    if (!student) {
                        alert('Aluno não encontrado');
                        return;
                    }
                    newPayment.studentId = formData.studentId!;
                    newPayment.studentName = student.name;
                    newPayment.referenceMonth = formData.referenceMonth!;

                    // Transaction: Add Payment AND Update Student Next Due
                    await db.transaction('rw', db.payments, db.students, async () => {
                        await db.payments.add(newPayment);

                        // Simple logic: add 1 month to nextDue
                        const currentDue = new Date(student.nextDue);
                        currentDue.setMonth(currentDue.getMonth() + 1);
                        await db.students.update(student.id, {
                            nextDue: currentDue.toISOString().split('T')[0]
                        });
                    });
                } else {
                    // Item vendido - não precisa de aluno nem atualizar nextDue
                    newPayment.itemDescription = formData.itemDescription;
                    await db.payments.add(newPayment);
                }
            }
            onClose();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar transação');
        }
    };

    const isPayment = (formData.type || 'pagamento') === 'pagamento';
    const isItemSold = formData.type === 'item_vendido';

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{paymentToEdit ? '💰 Editar Pagamento' : '💰 Novo Pagamento'}</h3>
                    <button onClick={onClose} className="action-btn"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-group">
                        <label className="form-label">Tipo de Transação *</label>
                        <select
                            required
                            className="form-select"
                            value={formData.type}
                            onChange={e => setFormData({ ...formData, type: e.target.value as 'pagamento' | 'item_vendido' })}
                            disabled={!!paymentToEdit}
                        >
                            <option value="pagamento">Pagamento</option>
                            <option value="item_vendido">Item Vendido</option>
                        </select>
                    </div>

                    {isPayment && (
                        <div className="form-group">
                            <label className="form-label">Aluno *</label>
                            <select
                                required={isPayment}
                                className="form-select"
                                value={formData.studentId}
                                onChange={e => handleStudentChange(e.target.value)}
                                disabled={!!paymentToEdit}
                            >
                                <option value="">Selecione...</option>
                                {activeStudents
                                    .sort((a, b) => a.name.localeCompare(b.name))
                                    .map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                                }
                            </select>
                        </div>
                    )}

                    {isItemSold && (
                        <div className="form-group">
                            <label className="form-label">Descrição do Item *</label>
                            <input
                                required={isItemSold}
                                className="form-input"
                                value={formData.itemDescription || ''}
                                onChange={e => setFormData({ ...formData, itemDescription: e.target.value })}
                                placeholder="Ex: Luva, Shorts, Protetor bucal..."
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Valor (R$) *</label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            className="form-input"
                            value={formData.amount}
                            onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Método</label>
                        <select
                            className="form-select"
                            value={formData.method}
                            onChange={e => setFormData({ ...formData, method: e.target.value as any })}
                        >
                            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">Data</label>
                            <input
                                type="date"
                                required
                                className="form-input"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                        {isPayment && (
                            <div className="form-group">
                                <label className="form-label">Referência</label>
                                <input
                                    type="month"
                                    required={isPayment}
                                    className="form-input"
                                    value={formData.referenceMonth || ''}
                                    onChange={e => setFormData({ ...formData, referenceMonth: e.target.value })}
                                />
                            </div>
                        )}
                    </div>

                    {isPayment && (
                        <div className="form-group">
                            <label className="form-label">Multa por Atraso (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="form-input"
                                value={formData.lateFee || ''}
                                onChange={e => setFormData({ ...formData, lateFee: e.target.value ? Number(e.target.value) : undefined })}
                                placeholder="Valor da multa (opcional)"
                            />
                            <p className="text-xs text-gray-500 mt-1">Preencha se o pagamento estiver atrasado</p>
                        </div>
                    )}

                    <div className="form-group pt-4">
                        <button type="submit" className="btn btn-primary w-full" style={{ width: '100%' }}>
                            {isPayment ? 'Confirmar Pagamento' : 'Confirmar Venda'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
