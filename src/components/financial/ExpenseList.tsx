import { useState } from 'react';
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight, Search, TrendingDown } from 'lucide-react';
import { useExpenses } from '../../hooks/useGymStore';
import { Expense } from '../../types';
import { db } from '../../services/db';
import { ExpenseModal } from './ExpenseModal';

export function ExpenseList() {
    const expenses = useExpenses();
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

    // Filter Logic
    const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const filtered = sortedExpenses.filter(e =>
        e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Stats
    const totalExpenses = filtered.reduce((sum, e) => sum + e.amount, 0);

    // Pagination
    const ITEMS_PER_PAGE = 20;
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedExpenses = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handleDelete = async (id: string) => {
        if (confirm('Excluir esta despesa?')) {
            await db.expenses.delete(id);
        }
    };

    const handleEdit = (expense: Expense) => {
        setEditingExpense(expense);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditingExpense(null);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="stat-card danger">
                    <div className="stat-card-content">
                        <div>
                            <p className="stat-label">Total Despesas</p>
                            <p className="stat-value text-red-600">R$ {totalExpenses.toFixed(2)}</p>
                        </div>
                        <div className="stat-icon danger">
                            <TrendingDown size={24} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                <div className="form-input-icon flex-1 max-w-[300px]" style={{ minWidth: '250px' }}>
                    <Search className="icon" size={18} />
                    <input
                        className="form-input"
                        placeholder="Buscar despesa..."
                        value={searchTerm}
                        onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                </div>
                <button onClick={handleAdd} className="btn btn-danger">
                    <Plus size={18} /> Nova Despesa
                </button>
            </div>

            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Descrição</th>
                                <th>Categoria</th>
                                <th>Valor</th>
                                <th className="text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedExpenses.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center p-8 text-gray-500">
                                        Nenhuma despesa registrada.
                                    </td>
                                </tr>
                            ) : (
                                paginatedExpenses.map(expense => (
                                    <tr key={expense.id}>
                                        <td>{new Date(expense.date + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                                        <td className="font-medium">{expense.description}</td>
                                        <td><span className="badge badge-gray">{expense.category}</span></td>
                                        <td className="font-bold text-red-600">R$ {expense.amount.toFixed(2)}</td>
                                        <td>
                                            <div className="action-buttons justify-end">
                                                <button onClick={() => handleEdit(expense)} className="action-btn primary">
                                                    <Edit size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(expense.id)} className="action-btn danger">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex justify-between items-center p-4 border-t border-gray-100">
                        <span className="text-sm text-gray-500">
                            Página {currentPage} de {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                                className="btn btn-outline btn-sm"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => p + 1)}
                                className="btn btn-outline btn-sm"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <ExpenseModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                expenseToEdit={editingExpense}
            />
        </div>
    );
}
