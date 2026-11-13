import { useMemo, useState } from 'react';
import { Plus, Edit3, Trash2, TrendingDown } from 'lucide-react';
import { Expense, EXPENSE_CATEGORIES } from '../../types';
import { formatCurrencyBRL, formatDateBR, getYearMonth } from '../../utils/dateUtils';
import { softDeleteExpense } from '../../services/dataAccess';
import { ConfirmModal, EmptyState } from '../UI';
import { ExpenseModal } from './ExpenseModal';
import { useToast } from '../../contexts/ToastContext';

interface ExpenseListProps {
    expenses: Expense[];
    selectedMonth: string;
}

export function ExpenseList({ expenses, selectedMonth }: ExpenseListProps) {
    const { showToast } = useToast();
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

    const filteredExpenses = useMemo(() => {
        return expenses
            .filter((e) => {
                if (selectedMonth !== 'all' && getYearMonth(e.date) !== selectedMonth) return false;
                if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
                return true;
            })
            .sort((a, b) => b.date.localeCompare(a.date));
    }, [expenses, selectedMonth, categoryFilter]);

    const totalExpenses = useMemo(
        () => filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0),
        [filteredExpenses]
    );

    const handleConfirmDelete = async () => {
        if (!expenseToDelete) return;
        await softDeleteExpense(expenseToDelete.id);
        showToast('success', 'Despesa removida.');
        setExpenseToDelete(null);
    };

    return (
        <div className="space-y-4">
            <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="input sm:w-52"
                >
                    <option value="all">Todas as categorias</option>
                    {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                            {c}
                        </option>
                    ))}
                </select>

                <div className="flex items-center justify-between sm:justify-end gap-3">
                    <div className="text-xs text-slate-500">
                        {filteredExpenses.length} despesa(s) •{' '}
                        <strong className="text-red-600 dark:text-red-400 text-sm">
                            {formatCurrencyBRL(totalExpenses)}
                        </strong>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setEditingExpense(null);
                            setModalOpen(true);
                        }}
                        className="btn btn-primary btn-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Nova Despesa
                    </button>
                </div>
            </div>

            {filteredExpenses.length === 0 ? (
                <EmptyState
                    icon={<TrendingDown className="w-6 h-6" />}
                    title="Nenhuma despesa lançada"
                    description="Cadastre suas contas fixas e gastos da academia neste mês."
                />
            ) : (
                <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase text-slate-500 dark:text-slate-400">
                                <tr>
                                    <th className="px-5 py-3.5 font-bold">Data</th>
                                    <th className="px-4 py-3.5 font-bold">Descrição</th>
                                    <th className="px-4 py-3.5 font-bold">Categoria</th>
                                    <th className="px-4 py-3.5 font-bold">Valor</th>
                                    <th className="px-5 py-3.5 font-bold text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredExpenses.map((exp) => (
                                    <tr key={exp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                                        <td className="px-5 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                            {formatDateBR(exp.date)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-slate-900 dark:text-white">
                                                {exp.description}
                                            </div>
                                            {exp.recurring && (
                                                <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                                                    Recorrente
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="badge badge-neutral">{exp.category}</span>
                                        </td>
                                        <td className="px-4 py-3 font-bold text-red-600 dark:text-red-400 whitespace-nowrap">
                                            {formatCurrencyBRL(exp.amount)}
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingExpense(exp);
                                                        setModalOpen(true);
                                                    }}
                                                    className="btn btn-ghost btn-sm p-2"
                                                    title="Editar"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setExpenseToDelete(exp)}
                                                    className="btn btn-ghost btn-sm p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                    title="Excluir"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <ExpenseModal
                isOpen={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setEditingExpense(null);
                }}
                expenseToEdit={editingExpense}
            />

            <ConfirmModal
                isOpen={Boolean(expenseToDelete)}
                title="Excluir Despesa"
                message={`Remover "${expenseToDelete?.description}" (${formatCurrencyBRL(expenseToDelete?.amount || 0)})?`}
                confirmText="Excluir"
                onConfirm={handleConfirmDelete}
                onCancel={() => setExpenseToDelete(null)}
            />
        </div>
    );
}
