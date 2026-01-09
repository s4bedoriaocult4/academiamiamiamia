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
        studentId: '', amount: 0, method: 'PIX', date: new Date().toISOString().split('T')[0], referenceMonth: new Date().toISOString().slice(0, 7)
    });

    useEffect(() => {
        if (paymentToEdit) {
            setFormData(paymentToEdit);
        } else {
            setFormData({
                studentId: '', amount: 0, method: 'PIX', date: new Date().toISOString().split('T')[0], referenceMonth: new Date().toISOString().slice(0, 7)
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

        if (!formData.studentId || !formData.amount) {
            alert('Preencha os campos obrigatórios');
            return;
        }

        const student = students.find(s => s.id === formData.studentId);
        if (!student) return;

        try {
            if (paymentToEdit) {
                await db.payments.update(paymentToEdit.id, {
                    ...formData,
                    amount: Number(formData.amount),
                    studentName: student.name // Ensure name is current
                });
            } else {
                const newPayment: Payment = {
                    id: Date.now().toString(),
                    studentId: formData.studentId!,
                    studentName: student.name,
                    amount: Number(formData.amount),
                    method: formData.method as any,
                    date: formData.date!,
                    referenceMonth: formData.referenceMonth!,
                    createdAt: new Date().toISOString()
                };

                // Transaction: Add Payment AND Update Student Next Due
                await db.transaction('rw', db.payments, db.students, async () => {
                    await db.payments.add(newPayment);

                    // Simple logic: add 1 month to nextDue
                    // Ideally, we'd use complex logic but for MVP:
                    const currentDue = new Date(student.nextDue);
                    currentDue.setMonth(currentDue.getMonth() + 1);
                    await db.students.update(student.id, {
                        nextDue: currentDue.toISOString().split('T')[0]
                    });
                });
            }
            onClose();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar pagamento');
        }
    };

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
                        <label className="form-label">Aluno *</label>
                        <select
                            required
                            className="form-select"
                            value={formData.studentId}
                            onChange={e => handleStudentChange(e.target.value)}
                            disabled={!!paymentToEdit} // Lock student on edit to prevent confusion
                        >
                            <option value="">Selecione...</option>
                            {activeStudents
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                            }
                        </select>
                    </div>

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
                        <div className="form-group">
                            <label className="form-label">Referência</label>
                            <input
                                type="month"
                                required
                                className="form-input"
                                value={formData.referenceMonth}
                                onChange={e => setFormData({ ...formData, referenceMonth: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-group pt-4">
                        <button type="submit" className="btn btn-primary w-full" style={{ width: '100%' }}>
                            Confirmar Pagamento
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
