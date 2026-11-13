import { useMemo, useState } from 'react';
import {
    Search,
    Plus,
    Edit3,
    Trash2,
    Receipt,
} from 'lucide-react';
import { Payment, Student } from '../../types';
import {
    formatCurrencyBRL,
    formatDateBR,
    formatReferenceMonth,
    getCurrentMonthString,
    getYearMonth,
} from '../../utils/dateUtils';
import { softDeletePaymentWithReconciliation } from '../../services/dataAccess';
import { buildReceiptMessage } from '../../utils/whatsapp';
import { WhatsAppButton } from '../common/WhatsAppButton';
import { ConfirmModal, EmptyState } from '../UI';
import { useToast } from '../../contexts/ToastContext';

interface PaymentListProps {
    payments: Payment[];
    students: Student[];
    gymName: string;
    selectedMonth: string;
    onNewPayment: () => void;
    onEditPayment: (payment: Payment) => void;
}

export function PaymentList({
    payments,
    students,
    gymName,
    selectedMonth,
    onNewPayment,
    onEditPayment,
}: PaymentListProps) {
    const { showToast } = useToast();
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'pagamento' | 'personal' | 'entrada'>('all');
    const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);

    const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

    const filteredPayments = useMemo(() => {
        const term = search.trim().toLowerCase();
        return payments
            .filter((p) => {
                if (selectedMonth !== 'all' && getYearMonth(p.date) !== selectedMonth) {
                    return false;
                }
                const normalizedType =
                    p.type === 'item_vendido' || p.type === 'entrada'
                        ? 'entrada'
                        : p.type === 'personal'
                            ? 'personal'
                            : 'pagamento';
                if (typeFilter !== 'all' && normalizedType !== typeFilter) return false;

                if (term) {
                    const nameMatch = (p.studentName || '').toLowerCase().includes(term);
                    const descMatch = (p.itemDescription || '').toLowerCase().includes(term);
                    const methodMatch = (p.method || '').toLowerCase().includes(term);
                    if (!nameMatch && !descMatch && !methodMatch) return false;
                }
                return true;
            })
            .sort(
                (a, b) =>
                    b.date.localeCompare(a.date) ||
                    (b.createdAt || '').localeCompare(a.createdAt || '')
            );
    }, [payments, selectedMonth, typeFilter, search]);

    const totalFiltered = useMemo(
        () =>
            filteredPayments.reduce(
                (sum, p) => sum + (p.amount || 0) + (p.lateFee || 0),
                0
            ),
        [filteredPayments]
    );

    const handleConfirmDelete = async () => {
        if (!paymentToDelete) return;
        await softDeletePaymentWithReconciliation(paymentToDelete.id);
        showToast('success', 'Lançamento excluído e cadastro reconciliado.');
        setPaymentToDelete(null);
    };

    const getTypeBadge = (p: Payment) => {
        if (p.type === 'entrada' || p.type === 'item_vendido') {
            return <span className="badge badge-info">Venda Avulsa</span>;
        }
        if (p.type === 'personal') {
            return <span className="badge badge-violet">Personal</span>;
        }
        return <span className="badge badge-success">Mensalidade</span>;
    };

    return (
        <div className="space-y-4">
            {/* Barra de busca e filtros */}
            <div className="card p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row gap-2.5 flex-1">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Buscar por aluno, descrição ou forma..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input pl-10"
                        />
                    </div>
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
                        className="input sm:w-44"
                    >
                        <option value="all">Todos os tipos</option>
                        <option value="pagamento">Mensalidades</option>
                        <option value="personal">Personal</option>
                        <option value="entrada">Vendas Avulsas</option>
                    </select>
                </div>

                <div className="flex items-center justify-between lg:justify-end gap-3">
                    <div className="text-xs text-slate-500">
                        {filteredPayments.length} lançamento(s) •{' '}
                        <strong className="text-emerald-600 dark:text-emerald-400 text-sm">
                            {formatCurrencyBRL(totalFiltered)}
                        </strong>
                    </div>
                    <button type="button" onClick={onNewPayment} className="btn btn-success btn-sm">
                        <Plus className="w-4 h-4" />
                        Novo Recebimento
                    </button>
                </div>
            </div>

            {filteredPayments.length === 0 ? (
                <EmptyState
                    icon={<Receipt className="w-6 h-6" />}
                    title="Nenhum recebimento neste filtro"
                    description={
                        selectedMonth === getCurrentMonthString()
                            ? 'Clique em "Novo Recebimento" para lançar a primeira entrada do mês.'
                            : 'Não há entradas registradas para o período escolhido.'
                    }
                />
            ) : (
                <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase text-slate-500 dark:text-slate-400">
                                <tr>
                                    <th className="px-5 py-3.5 font-bold">Data</th>
                                    <th className="px-4 py-3.5 font-bold">Aluno / Descrição</th>
                                    <th className="px-4 py-3.5 font-bold">Tipo / Ref.</th>
                                    <th className="px-4 py-3.5 font-bold">Forma</th>
                                    <th className="px-4 py-3.5 font-bold">Valor</th>
                                    <th className="px-5 py-3.5 font-bold text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredPayments.map((p) => {
                                    const st = p.studentId ? studentMap.get(p.studentId) : undefined;
                                    const total = (p.amount || 0) + (p.lateFee || 0);
                                    return (
                                        <tr
                                            key={p.id}
                                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                                        >
                                            <td className="px-5 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                                {formatDateBR(p.date)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-slate-900 dark:text-white">
                                                    {p.studentName || p.itemDescription || 'Entrada'}
                                                </div>
                                                {p.studentName && p.itemDescription && (
                                                    <div className="text-xs text-slate-500">{p.itemDescription}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    {getTypeBadge(p)}
                                                    {p.referenceMonth && (
                                                        <span className="text-xs text-slate-500 font-medium">
                                                            Ref. {formatReferenceMonth(p.referenceMonth)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                                {p.method}
                                            </td>
                                            <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                                {formatCurrencyBRL(total)}
                                                {p.lateFee ? (
                                                    <div className="text-[11px] font-normal text-amber-600">
                                                        (+ {formatCurrencyBRL(p.lateFee)} multa)
                                                    </div>
                                                ) : null}
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    {st?.phone && (
                                                        <WhatsAppButton
                                                            phone={st.phone}
                                                            size="icon"
                                                            title="Enviar comprovante"
                                                            message={buildReceiptMessage(
                                                                st.name,
                                                                total,
                                                                p.method,
                                                                p.date,
                                                                p.referenceMonth,
                                                                p.itemDescription,
                                                                gymName
                                                            )}
                                                        />
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => onEditPayment(p)}
                                                        className="btn btn-ghost btn-sm p-2"
                                                        title="Editar"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setPaymentToDelete(p)}
                                                        className="btn btn-ghost btn-sm p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={Boolean(paymentToDelete)}
                title="Excluir Lançamento"
                message={`Deseja excluir este recebimento de ${formatCurrencyBRL(
                    (paymentToDelete?.amount || 0) + (paymentToDelete?.lateFee || 0)
                )}?\n\nO vencimento ou saldo de Personal do aluno será ajustado automaticamente.`}
                confirmText="Sim, excluir"
                onConfirm={handleConfirmDelete}
                onCancel={() => setPaymentToDelete(null)}
            />
        </div>
    );
}
