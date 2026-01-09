import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Expense, EXPENSE_CATEGORIES } from '../../types';
import { db } from '../../services/db';

interface ExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    expenseToEdit?: Expense | null;
}

export function ExpenseModal({ isOpen, onClose, expenseToEdit }: ExpenseModalProps) {
    const [formData, setFormData] = useState<Partial<Expense>>({
        description: '', amount: 0, category: 'Outros', date: new Date().toISOString().split('T')[0], recurring: false
    });

    useEffect(() => {
        if (expenseToEdit) {
            setFormData(expenseToEdit);
        } else {
            setFormData({
                description: '', amount: 0, category: 'Outros', date: new Date().toISOString().split('T')[0], recurring: false
            });
        }
    }, [expenseToEdit, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.description || !formData.amount) {
            alert('Preencha descrição e valor');
            return;
        }

        try {
            if (expenseToEdit) {
                await db.expenses.update(expenseToEdit.id, formData);
            } else {
                const newExpense: Expense = {
                    id: Date.now().toString(),
                    description: formData.description!,
                    amount: Number(formData.amount),
                    category: formData.category as any,
                    date: formData.date!,
                    recurring: formData.recurring || false,
                    createdAt: new Date().toISOString()
                };
                await db.expenses.add(newExpense);
            }
            onClose();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar despesa');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{expenseToEdit ? '💸 Editar Despesa' : '💸 Nova Despesa'}</h3>
                    <button onClick={onClose} className="action-btn"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-group">
                        <label className="form-label">Descrição *</label>
                        <input
                            required
                            className="form-input"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                            <label className="form-label">Categoria</label>
                            <select
                                className="form-select"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                            >
                                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

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

                    <div className="form-group flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="recurring"
                            checked={formData.recurring}
                            onChange={e => setFormData({ ...formData, recurring: e.target.checked })}
                            className="w-4 h-4"
                        />
                        <label htmlFor="recurring" className="text-sm cursor-pointer select-none">
                            Esta despesa é recorrente (fixa todo mês)
                        </label>
                    </div>

                    <div className="form-group pt-4">
                        <button type="submit" className="btn btn-primary w-full" style={{ width: '100%' }}>
                            Salvar Despesa
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
