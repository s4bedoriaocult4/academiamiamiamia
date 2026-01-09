import { useState } from 'react';
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { usePayments } from '../../hooks/useGymStore';
import { Payment } from '../../types';
import { db } from '../../services/db';
import { PaymentModal } from './PaymentModal';

export function PaymentList() {
    const payments = usePayments();
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

    // Filter Logic
    // Sort by Date DESC first
    const sortedPayments = [...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const filtered = sortedPayments.filter(p =>
        p.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.date.includes(searchTerm)
    );

    // Pagination
    const ITEMS_PER_PAGE = 20;
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedPayments = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handleDelete = async (id: string) => {
        if (confirm('Excluir este pagamento?')) {
            await db.payments.delete(id);
        }
    };

    const handleEdit = (payment: Payment) => {
        setEditingPayment(payment);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditingPayment(null);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
                <div className="form-input-icon flex-1 max-w-[300px]" style={{ minWidth: '250px' }}>
                    <Search className="icon" size={18} />
                    <input
                        className="form-input"
                        placeholder="Buscar por aluno ou data..."
                        value={searchTerm}
                        onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                </div>
                <button onClick={handleAdd} className="btn btn-success">
                    <Plus size={18} /> Novo Pagamento
                </button>
            </div>

            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Aluno</th>
                                <th>Referência</th>
                                <th>Método</th>
                                <th>Valor</th>
                                <th className="text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedPayments.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center p-8 text-gray-500">
                                        Nenhum pagamento encontrado.
                                    </td>
                                </tr>
                            ) : (
                                paginatedPayments.map(payment => (
                                    <tr key={payment.id}>
                                        <td>{new Date(payment.date + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                                        <td className="font-medium">{payment.studentName}</td>
                                        <td>{payment.referenceMonth}</td>
                                        <td><span className="badge badge-primary">{payment.method}</span></td>
                                        <td className="font-bold text-green-600">R$ {payment.amount.toFixed(2)}</td>
                                        <td>
                                            <div className="action-buttons justify-end">
                                                <button onClick={() => handleEdit(payment)} className="action-btn primary">
                                                    <Edit size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(payment.id)} className="action-btn danger">
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

            <PaymentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                paymentToEdit={editingPayment}
            />
        </div>
    );
}
