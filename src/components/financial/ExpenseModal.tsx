import React, { useEffect, useState } from 'react';
import { X, Check } from 'lucide-react';
import { Expense, EXPENSE_CATEGORIES } from '../../types';
import { getTodayDateString } from '../../utils/dateUtils';
import { saveExpense } from '../../services/dataAccess';
import { useToast } from '../../contexts/ToastContext';

interface ExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    expenseToEdit?: Expense | null;
}

export function ExpenseModal({ isOpen, onClose, expenseToEdit }: ExpenseModalProps) {
    const { showToast } = useToast();
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<Expense['category']>('Outros');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(getTodayDateString());
    const [recurring, setRecurring] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        if (expenseToEdit) {
            setDescription(expenseToEdit.description);
            setCategory(expenseToEdit.category);
            setAmount(String(expenseToEdit.amount));
            setDate(expenseToEdit.date);
            setRecurring(Boolean(expenseToEdit.recurring));
        } else {
            setDescription('');
            setCategory('Aluguel');
            setAmount('');
            setDate(getTodayDateString());
            setRecurring(false);
        }
    }, [isOpen, expenseToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const num = parseFloat(amount.replace(',', '.'));
        if (!description.trim() || !Number.isFinite(num) || num <= 0) {
            showToast('warning', 'Preencha descrição e valor válido.');
            return;
        }

        setIsSaving(true);
        try {
            await saveExpense({
                id: expenseToEdit?.id,
                description: description.trim(),
                category,
                amount: num,
                date,
                recurring,
            });
            showToast('success', expenseToEdit ? 'Despesa atualizada!' : 'Despesa registrada!');
            onClose();
        } catch {
            showToast('error', 'Erro ao salvar despesa.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                        {expenseToEdit ? 'Editar Despesa' : 'Nova Despesa'}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div>
                            <label className="label">Descrição *</label>
                            <input
                                type="text"
                                required
                                autoFocus
                                placeholder="Ex: Aluguel do salão, Conta de luz..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="input"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="label">Categoria</label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value as Expense['category'])}
                                    className="input"
                                >
                                    {EXPENSE_CATEGORIES.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </div>
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
                                    className="input font-bold"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="label">Data</label>
                            <input
                                type="date"
                                required
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="input"
                            />
                        </div>

                        <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                            <input
                                type="checkbox"
                                checked={recurring}
                                onChange={(e) => setRecurring(e.target.checked)}
                                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                            />
                            <span>Despesa fixa mensal (recorrente)</span>
                        </label>
                    </div>

                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn btn-secondary">
                            Cancelar
                        </button>
                        <button type="submit" disabled={isSaving} className="btn btn-primary">
                            <Check className="w-4 h-4" />
                            {isSaving ? 'Salvando...' : 'Salvar Despesa'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
