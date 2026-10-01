import { useState } from 'react';
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { usePayments } from '../../hooks/useGymStore';
import { Payment } from '../../types';
import { db } from '../../services/db';
import { PaymentModal } from './PaymentModal';
import { formatDateBR, formatReferenceMonth, calculateNextDueDate, calculateInitialDueDate } from '../../utils/dateUtils';

export function PaymentList() {
    const payments = usePayments();
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

    // Filter Logic
    // Sort by Date DESC first
    const sortedPayments = [...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const filtered = sortedPayments.filter(p => {
        const searchLower = searchTerm.toLowerCase();
        const typeLabel = p.type === 'item_vendido' ? 'entrada' : (p.type || 'pagamento');

        return (
            (p.studentName?.toLowerCase().includes(searchLower)) ||
            (p.itemDescription?.toLowerCase().includes(searchLower)) ||
            p.date.includes(searchTerm) ||
            typeLabel.includes(searchLower)
        );
    });

    // Pagination
    const ITEMS_PER_PAGE = 20;
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedPayments = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handleDelete = async (payment: Payment) => {
        if (!confirm('Excluir esta transação?')) return;

        try {
            await db.transaction('rw', [db.payments, db.students, db.plans], async () => {
                await db.payments.delete(payment.id);

                // Se era uma mensalidade de aluno, recalcular o nextDue
                if (payment.studentId && (payment.type === 'pagamento' || !payment.type)) {
                    const student = await db.students.get(payment.studentId);
                    if (student) {
                        const remainingPayments = await db.payments
                            .where('studentId')
                            .equals(student.id)
                            .toArray();

                        const monthlyRemaining = remainingPayments
                            .filter(p => p.id !== payment.id && (p.type === 'pagamento' || !p.type) && p.referenceMonth)
                            .sort((a, b) => (a.referenceMonth! > b.referenceMonth! ? 1 : -1));

                        const plans = await db.plans.toArray();
                        const plan = plans.find(p => p.id === student.plan);
                        const duration = plan?.durationMonths || 1;

                        if (monthlyRemaining.length > 0) {
                            const lastPaid = monthlyRemaining[monthlyRemaining.length - 1];
                            const newNextDue = calculateNextDueDate(lastPaid.referenceMonth!, student.dueDay || 5, duration);
                            await db.students.update(student.id, { nextDue: newNextDue });
                        } else {
                            // Não restou nenhum pagamento: volta para o vencimento inicial a partir da startDate
                            const initialDue = calculateInitialDueDate(student.startDate, student.dueDay || 5, false);
                            await db.students.update(student.id, { nextDue: initialDue });
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Erro ao excluir transação:', error);
            alert('Erro ao excluir transação');
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

    const getBadgeStyle = (type: string) => {
        switch (type) {
            case 'pagamento': return 'badge-success';
            case 'personal': return 'badge-blue';
            case 'entrada': return 'badge-primary';
            case 'item_vendido': return 'badge-primary';
            default: return 'badge-secondary';
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'pagamento': return '💰 Mensalidade';
            case 'personal': return '🏋️ Personal';
            case 'entrada': return '🛍️ Entrada';
            case 'item_vendido': return '🛍️ Entrada';
            default: return type;
        }
    };

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
                <div className="form-input-icon flex-1 max-w-[300px]" style={{ minWidth: '250px' }}>
                    <Search className="icon" size={18} />
                    <input
                        className="form-input"
                        placeholder="Buscar por aluno, tipo ou data..."
                        value={searchTerm}
                        onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                </div>
                <button onClick={handleAdd} className="btn btn-success">
                    <Plus size={18} /> Nova Transação
                </button>
            </div>

            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Tipo</th>
                                <th>Data</th>
                                <th>Aluno/Descrição</th>
                                <th>Referência</th>
                                <th>Método</th>
                                <th>Valor</th>
                                <th className="text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedPayments.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center p-8 text-gray-500">
                                        Nenhuma transação encontrada.
                                    </td>
                                </tr>
                            ) : (
                                paginatedPayments.map(payment => {
                                    const type = payment.type || 'pagamento';
                                    const totalAmount = payment.amount + (payment.lateFee || 0);

                                    return (
                                        <tr key={payment.id}>
                                            <td>
                                                <span className={`badge ${getBadgeStyle(type)}`}>
                                                    {getTypeLabel(type)}
                                                </span>
                                            </td>
                                            <td>{formatDateBR(payment.date)}</td>
                                            <td className="font-medium">
                                                {type === 'entrada' || type === 'item_vendido' ? (
                                                    <span title={payment.itemDescription}>{payment.itemDescription || 'Venda Avulsa'}</span>
                                                ) : (
                                                    payment.studentName || 'N/A'
                                                )}
                                            </td>
                                            <td>{formatReferenceMonth(payment.referenceMonth)}</td>
                                            <td><span className="badge badge-secondary">{payment.method}</span></td>
                                            <td>
                                                <div>
                                                    <span className="font-bold text-green-600">R$ {payment.amount.toFixed(2)}</span>
                                                    {payment.lateFee && payment.lateFee > 0 && (
                                                        <div className="text-xs text-red-600">
                                                            + Multa: R$ {payment.lateFee.toFixed(2)}
                                                        </div>
                                                    )}
                                                    {payment.lateFee && payment.lateFee > 0 && (
                                                        <div className="text-xs font-semibold text-gray-700">
                                                            Total: R$ {totalAmount.toFixed(2)}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="action-buttons justify-end">
                                                    <button onClick={() => handleEdit(payment)} className="action-btn primary" title="Editar">
                                                        <Edit size={18} />
                                                    </button>
                                                    <button onClick={() => handleDelete(payment)} className="action-btn danger" title="Excluir">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
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
