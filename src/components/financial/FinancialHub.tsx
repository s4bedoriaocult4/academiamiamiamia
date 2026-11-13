import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';
import {
    useExpenses,
    usePayments,
    useStudents,
} from '../../hooks/useGymStore';
import { Payment } from '../../types';
import {
    formatCurrencyBRL,
    getCurrentMonthString,
    getYearMonth,
} from '../../utils/dateUtils';
import { PaymentList } from '../payments/PaymentList';
import { ExpenseList } from './ExpenseList';

interface FinancialHubProps {
    gymName: string;
    onNewPayment: () => void;
    onEditPayment: (payment: Payment) => void;
}

export function FinancialHub({
    gymName,
    onNewPayment,
    onEditPayment,
}: FinancialHubProps) {
    const payments = usePayments();
    const expenses = useExpenses();
    const students = useStudents();

    const currentMonth = getCurrentMonthString();
    const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
    const [activeTab, setActiveTab] = useState<'income' | 'expenses'>('income');

    const availableMonths = useMemo(() => {
        const set = new Set<string>([currentMonth]);
        payments.forEach((p) => {
            const ym = getYearMonth(p.date);
            if (ym) set.add(ym);
        });
        expenses.forEach((e) => {
            const ym = getYearMonth(e.date);
            if (ym) set.add(ym);
        });
        return Array.from(set).sort().reverse();
    }, [payments, expenses, currentMonth]);

    const summary = useMemo(() => {
        const rev = payments
            .filter((p) => selectedMonth === 'all' || getYearMonth(p.date) === selectedMonth)
            .reduce((sum, p) => sum + (p.amount || 0) + (p.lateFee || 0), 0);

        const exp = expenses
            .filter((e) => selectedMonth === 'all' || getYearMonth(e.date) === selectedMonth)
            .reduce((sum, e) => sum + (e.amount || 0), 0);

        return {
            revenue: rev,
            expenses: exp,
            balance: rev - exp,
        };
    }, [payments, expenses, selectedMonth]);

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        Financeiro &amp; Caixa
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Recebimentos de mensalidades, vendas e controle de despesas
                    </p>
                </div>

                <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="input sm:w-48 font-semibold"
                    aria-label="Filtrar mês no financeiro"
                >
                    <option value="all">Todo o Histórico</option>
                    {availableMonths.map((m) => (
                        <option key={m} value={m}>
                            {m === currentMonth ? `Mês Atual (${m})` : m}
                        </option>
                    ))}
                </select>
            </div>

            {/* Cards Resumo do Caixa */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card p-4 flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center shrink-0">
                        <ArrowDownLeft className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xs font-bold uppercase text-slate-500">Entradas</div>
                        <div className="font-display text-xl font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrencyBRL(summary.revenue)}
                        </div>
                    </div>
                </div>

                <div className="card p-4 flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 flex items-center justify-center shrink-0">
                        <ArrowUpRight className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xs font-bold uppercase text-slate-500">Despesas</div>
                        <div className="font-display text-xl font-bold text-red-600 dark:text-red-400">
                            {formatCurrencyBRL(summary.expenses)}
                        </div>
                    </div>
                </div>

                <div className="card p-4 flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 flex items-center justify-center shrink-0">
                        <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xs font-bold uppercase text-slate-500">Saldo</div>
                        <div
                            className={`font-display text-xl font-bold ${
                                summary.balance >= 0
                                    ? 'text-slate-900 dark:text-white'
                                    : 'text-red-600'
                            }`}
                        >
                            {formatCurrencyBRL(summary.balance)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Sub-abas */}
            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <button
                    type="button"
                    onClick={() => setActiveTab('income')}
                    className={`btn btn-sm ${
                        activeTab === 'income' ? 'btn-success' : 'btn-ghost'
                    }`}
                >
                    Entradas &amp; Mensalidades
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('expenses')}
                    className={`btn btn-sm ${
                        activeTab === 'expenses' ? 'btn-primary' : 'btn-ghost'
                    }`}
                >
                    Despesas &amp; Custos
                </button>
            </div>

            {activeTab === 'income' ? (
                <PaymentList
                    payments={payments}
                    students={students}
                    gymName={gymName}
                    selectedMonth={selectedMonth}
                    onNewPayment={onNewPayment}
                    onEditPayment={onEditPayment}
                />
            ) : (
                <ExpenseList expenses={expenses} selectedMonth={selectedMonth} />
            )}
        </div>
    );
}
