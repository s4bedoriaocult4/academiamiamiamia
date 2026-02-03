import { useState, useEffect } from 'react';
import {
    Users, DollarSign, Clock, AlertCircle, Printer, Cake, ChevronDown, ChevronUp, History, Calendar
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { useStudents, usePayments, useExpenses, useAttendance } from '../../hooks/useGymStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../services/db';
import { checkAndCloseMonth, getMonthHistory, getMonthName, generateMissingSnapshots } from '../../services/MonthlyHistoryService';
import { MonthlySnapshot } from '../../types';

const CHART_COLORS = ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

export function Dashboard() {
    const students = useStudents();
    const payments = usePayments();
    const expenses = useExpenses();
    const attendance = useAttendance();
    const plans = useLiveQuery(() => db.plans.toArray()) || [];

    // Estado para minimizar aniversariantes
    const [birthdaysCollapsed, setBirthdaysCollapsed] = useState(() => {
        // Carregar preferência do localStorage
        const saved = localStorage.getItem('birthdaysCollapsed');
        return saved === 'true';
    });

    // Salvar preferência quando mudar
    useEffect(() => {
        localStorage.setItem('birthdaysCollapsed', String(birthdaysCollapsed));
    }, [birthdaysCollapsed]);

    // Estado para histórico mensal
    const [monthlyHistory, setMonthlyHistory] = useState<MonthlySnapshot[]>([]);
    const [historyCollapsed, setHistoryCollapsed] = useState(true);
    const [monthClosed, setMonthClosed] = useState(false);

    // Estado para seleção de mês (dropdown)
    // 'current' = mês atual (dados dinâmicos), ou ID do snapshot (ex: '2026-01')
    const [selectedMonth, setSelectedMonth] = useState<string>('current');
    const [selectedSnapshot, setSelectedSnapshot] = useState<MonthlySnapshot | null>(null);

    // Verificar virada de mês ao carregar o Dashboard
    useEffect(() => {
        const initMonthlyCheck = async () => {
            try {
                // 1. Tentar fechar mês anterior automaticamente
                const wasClosed = await checkAndCloseMonth();

                // 2. Gerar snapshots retroativos se faltarem (ex: implementação nova em fevereiro gera janeiro)
                const generatedRetroactive = await generateMissingSnapshots();

                if (wasClosed || generatedRetroactive > 0) {
                    setMonthClosed(true);
                    // Esconder mensagem após 5 segundos
                    setTimeout(() => setMonthClosed(false), 5000);
                }

                // 3. Carregar histórico atualizado
                const history = await getMonthHistory();
                setMonthlyHistory(history);
            } catch (error) {
                console.error('Erro ao verificar histórico mensal:', error);
            }
        };
        initMonthlyCheck();
    }, []);

    // Sincronizar snapshot selecionado quando muda o mês
    useEffect(() => {
        if (selectedMonth === 'current') {
            setSelectedSnapshot(null);
        } else {
            const snapshot = monthlyHistory.find(s => s.id === selectedMonth);
            setSelectedSnapshot(snapshot || null);
        }
    }, [selectedMonth, monthlyHistory]);

    // Dados do mês visualizado (snapshot ou dados dinâmicos)
    const viewingHistoricalMonth = selectedSnapshot !== null;

    // Computed Values
    const activeStudents = students.filter(s => s.status === 'ativo');

    // Check overdue
    const isOverdue = (dueDate: string): boolean => new Date(dueDate) < new Date();
    const overdueStudents = activeStudents.filter(s => isOverdue(s.nextDue));

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const todayStr = today.toISOString().split('T')[0];

    const thisMonthPayments = payments.filter(p => {
        const pDate = new Date(p.date);
        return pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear;
    });
    const thisMonthRevenue = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0);

    const thisMonthExpenses = expenses.filter(e => {
        const eDate = new Date(e.date);
        return eDate.getMonth() === currentMonth && eDate.getFullYear() === currentYear;
    });
    const thisMonthExpenseTotal = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

    const expectedRevenue = activeStudents.reduce((sum, s) => {
        const plan = plans.find(p => p.id === s.plan);
        return sum + (plan?.price || 0);
    }, 0);

    const todayAttendance = attendance.filter(a => a.date === todayStr);

    const getDaysUntilDue = (dueDate: string): number => {
        const t = new Date();
        t.setHours(0, 0, 0, 0);
        const due = new Date(dueDate);
        return Math.ceil((due.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
    };

    const dueThisWeek = activeStudents.filter(s => {
        const days = getDaysUntilDue(s.nextDue);
        return days >= 0 && days <= 7;
    });

    // Aniversariantes do mês
    const getBirthdayStudents = () => {
        return activeStudents.filter(s => {
            if (!s.birthDate) return false;
            const birth = new Date(s.birthDate);
            const birthMonth = birth.getMonth();
            return birthMonth === currentMonth;
        }).sort((a, b) => {
            if (!a.birthDate || !b.birthDate) return 0;
            const aDay = new Date(a.birthDate).getDate();
            const bDay = new Date(b.birthDate).getDate();
            return aDay - bDay;
        });
    };

    const birthdayStudents = getBirthdayStudents();
    const todayBirthdays = birthdayStudents.filter(s => {
        if (!s.birthDate) return false;
        const birth = new Date(s.birthDate);
        return birth.getMonth() === currentMonth && birth.getDate() === today.getDate();
    });

    // Chart Data
    const getRevenueChartData = () => {
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(currentYear, currentMonth - i, 1);
            const monthName = d.toLocaleDateString('pt-BR', { month: 'short' });

            const mPayments = payments.filter(p => {
                const pd = new Date(p.date);
                return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
            });
            const mExpenses = expenses.filter(e => {
                const ed = new Date(e.date);
                return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear();
            });

            months.push({
                month: monthName,
                receita: mPayments.reduce((s, p) => s + p.amount, 0),
                despesa: mExpenses.reduce((s, e) => s + e.amount, 0)
            });
        }
        return months;
    };

    const getPlanDistribution = () => {
        return plans.map(plan => ({
            name: plan.name.split(' ')[0],
            value: activeStudents.filter(s => s.plan === plan.id).length
        })).filter(p => p.value > 0);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4 no-print" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Visão Geral</h2>
                    {/* Dropdown de seleção de mês */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={18} style={{ color: '#6b7280' }} />
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="input"
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '6px',
                                border: '1px solid #d1d5db',
                                minWidth: '180px',
                                fontSize: '0.875rem',
                                backgroundColor: viewingHistoricalMonth ? '#fef3c7' : 'white'
                            }}
                        >
                            <option value="current">
                                {getMonthName(currentMonth)} {currentYear} (Atual)
                            </option>
                            {monthlyHistory.map(snapshot => (
                                <option key={snapshot.id} value={snapshot.id}>
                                    {getMonthName(snapshot.month)} {snapshot.year} (Fechado)
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <button onClick={() => window.print()} className="btn btn-outline" title="Imprimir Relatório">
                    <Printer size={18} /> Imprimir Relatório
                </button>
            </div>

            {/* Aviso de visualização histórica */}
            {viewingHistoricalMonth && (
                <div className="alert alert-info" style={{ background: '#fef3c7', border: '1px solid #f59e0b' }}>
                    <History size={20} />
                    <div className="alert-content">
                        <p className="alert-title" style={{ color: '#92400e' }}>
                            📅 Visualizando mês fechado: {getMonthName(selectedSnapshot!.month)} {selectedSnapshot!.year}
                        </p>
                        <p style={{ color: '#92400e', fontSize: '0.875rem' }}>
                            Estes são dados consolidados do fechamento. Os cards abaixo mostram os totais salvos.
                        </p>
                    </div>
                </div>
            )}

            {/* Aniversariantes do Mês - Com opção de minimizar */}
            {birthdayStudents.length > 0 && (
                <div className={`alert ${todayBirthdays.length > 0 ? 'alert-warning' : 'alert-info'} mb-6`}>
                    <Cake size={20} />
                    <div className="alert-content" style={{ flex: 1 }}>
                        <div
                            className="alert-title flex justify-between items-center cursor-pointer"
                            onClick={() => setBirthdaysCollapsed(!birthdaysCollapsed)}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                        >
                            <span>
                                🎂 Aniversariantes do Mês ({birthdayStudents.length})
                                {todayBirthdays.length > 0 && ' - Hoje é aniversário!'}
                            </span>
                            <button
                                className="btn btn-sm"
                                style={{ padding: '0.25rem', background: 'transparent', border: 'none' }}
                                title={birthdaysCollapsed ? 'Expandir' : 'Minimizar'}
                            >
                                {birthdaysCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                            </button>
                        </div>
                        {!birthdaysCollapsed && (
                            <div className="mt-2 space-y-2">
                                {birthdayStudents.map(s => {
                                    if (!s.birthDate) return null;
                                    const birth = new Date(s.birthDate);
                                    const isToday = birth.getMonth() === currentMonth && birth.getDate() === today.getDate();
                                    const day = birth.getDate();
                                    return (
                                        <div
                                            key={s.id}
                                            className={`flex justify-between text-sm py-1 border-b ${isToday ? 'border-yellow-300 font-bold text-yellow-800' : 'border-blue-200'} last:border-0`}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                padding: '0.5rem 0',
                                                fontWeight: isToday ? 'bold' : 'normal'
                                            }}
                                        >
                                            <span>{s.name} {isToday && '🎉'}</span>
                                            <span className="font-bold">
                                                Dia {day}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-card-content">
                        <div>
                            <p className="stat-label">
                                {viewingHistoricalMonth ? 'Alunos (Fechamento)' : 'Alunos Ativos'}
                            </p>
                            <p className="stat-value">
                                {viewingHistoricalMonth ? selectedSnapshot!.activeStudents : activeStudents.length}
                            </p>
                        </div>
                        <div className="stat-icon primary">
                            <Users size={24} />
                        </div>
                    </div>
                </div>

                <div className="stat-card success">
                    <div className="stat-card-content">
                        <div>
                            <p className="stat-label">Receita do Mês</p>
                            <p className="stat-value">
                                R$ {(viewingHistoricalMonth ? selectedSnapshot!.revenue : thisMonthRevenue).toLocaleString('pt-BR')}
                            </p>
                            {!viewingHistoricalMonth && (
                                <p className="stat-sublabel">Esperado: R$ {expectedRevenue.toLocaleString('pt-BR')}</p>
                            )}
                        </div>
                        <div className="stat-icon success">
                            <DollarSign size={24} />
                        </div>
                    </div>
                </div>

                <div className="stat-card warning">
                    <div className="stat-card-content">
                        <div>
                            <p className="stat-label">
                                {viewingHistoricalMonth ? 'Inadimplentes (Fechamento)' : 'Inadimplentes'}
                            </p>
                            <p className="stat-value">
                                {viewingHistoricalMonth ? selectedSnapshot!.overdueCount : overdueStudents.length}
                            </p>
                        </div>
                        <div className="stat-icon warning">
                            <AlertCircle size={24} />
                        </div>
                    </div>
                </div>

                <div className="stat-card accent">
                    <div className="stat-card-content">
                        <div>
                            <p className="stat-label">
                                {viewingHistoricalMonth ? 'Presenças do Mês' : 'Presenças Hoje'}
                            </p>
                            <p className="stat-value">
                                {viewingHistoricalMonth ? selectedSnapshot!.attendanceCount : todayAttendance.length}
                            </p>
                        </div>
                        <div className="stat-icon danger">
                            <Clock size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Financial Summary */}
            <div className="chart-container">
                <h3 className="chart-title">💰 Resumo Financeiro do Mês</h3>
                <div className="grid grid-cols-3 gap-4 mt-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                    <div className="p-4 bg-green-100 rounded-lg text-center" style={{ background: '#dcfce7', borderRadius: '8px', padding: '1rem' }}>
                        <p className="text-sm text-green-800" style={{ color: '#166534' }}>Receita</p>
                        <p className="text-2xl font-bold text-green-600" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>
                            R$ {(viewingHistoricalMonth ? selectedSnapshot!.revenue : thisMonthRevenue).toLocaleString('pt-BR')}
                        </p>
                    </div>
                    <div className="p-4 bg-red-100 rounded-lg text-center" style={{ background: '#fee2e2', borderRadius: '8px', padding: '1rem' }}>
                        <p className="text-sm text-red-800" style={{ color: '#991b1b' }}>Despesas</p>
                        <p className="text-2xl font-bold text-red-600" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>
                            R$ {(viewingHistoricalMonth ? selectedSnapshot!.expenses : thisMonthExpenseTotal).toLocaleString('pt-BR')}
                        </p>
                    </div>
                    <div
                        className="p-4 rounded-lg text-center"
                        style={{
                            background: (viewingHistoricalMonth ? selectedSnapshot!.profit : thisMonthRevenue - thisMonthExpenseTotal) >= 0 ? '#dbeafe' : '#fee2e2',
                            borderRadius: '8px',
                            padding: '1rem'
                        }}
                    >
                        <p className="text-sm" style={{ color: (viewingHistoricalMonth ? selectedSnapshot!.profit : thisMonthRevenue - thisMonthExpenseTotal) >= 0 ? '#1e40af' : '#991b1b' }}>Lucro</p>
                        <p className="text-2xl font-bold" style={{ fontSize: '1.5rem', fontWeight: 700, color: (viewingHistoricalMonth ? selectedSnapshot!.profit : thisMonthRevenue - thisMonthExpenseTotal) >= 0 ? '#1e40af' : '#dc2626' }}>
                            R$ {(viewingHistoricalMonth ? selectedSnapshot!.profit : thisMonthRevenue - thisMonthExpenseTotal).toLocaleString('pt-BR')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div className="chart-container">
                    <h3 className="chart-title">📊 Receita vs Despesas (6 meses)</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={getRevenueChartData()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} />
                            <Legend />
                            <Bar dataKey="receita" name="Receita" fill="#16a34a" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="despesa" name="Despesa" fill="#dc2626" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="chart-container">
                    <h3 className="chart-title">🥧 Distribuição por Plano</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={getPlanDistribution()}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                dataKey="value"
                                nameKey="name"
                                label={({ name, value }) => `${name}: ${value}`}
                            >
                                {getPlanDistribution().map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Alerts */}
            {overdueStudents.length > 0 && (
                <div className="alert alert-danger">
                    <AlertCircle size={20} />
                    <div className="alert-content">
                        <p className="alert-title">⚠️ Alunos com Pagamento Atrasado</p>
                        <div className="mt-2 space-y-2">
                            {overdueStudents.slice(0, 5).map(s => (
                                <div key={s.id} className="flex justify-between text-sm py-1 border-b border-red-200 last:border-0" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                                    <span>{s.name}</span>
                                    <span className="font-bold">{Math.abs(getDaysUntilDue(s.nextDue))} dias atrasado</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {dueThisWeek.length > 0 && (
                <div className="alert alert-warning">
                    <Clock size={20} />
                    <div className="alert-content">
                        <p className="alert-title">📅 Vencimentos na Semana</p>
                        <div className="mt-2 space-y-2">
                            {dueThisWeek.map(s => (
                                <div key={s.id} className="flex justify-between text-sm py-1 border-b border-yellow-200" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                                    <span>{s.name}</span>
                                    <span className="font-bold">
                                        {getDaysUntilDue(s.nextDue) === 0 ? 'Hoje!' : `${getDaysUntilDue(s.nextDue)} dias`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Notificação de fechamento de mês */}
            {monthClosed && (
                <div className="alert alert-success" style={{ background: '#dcfce7', border: '1px solid #16a34a' }}>
                    <History size={20} />
                    <div className="alert-content">
                        <p className="alert-title" style={{ color: '#166534' }}>
                            ✅ Mês anterior fechado automaticamente!
                        </p>
                        <p style={{ color: '#166534', fontSize: '0.875rem' }}>
                            O fechamento do mês foi salvo no histórico. O dashboard agora exibe dados do novo mês.
                        </p>
                    </div>
                </div>
            )}

            {/* Histórico de Meses Anteriores */}
            {monthlyHistory.length > 0 && (
                <div className="chart-container">
                    <div
                        className="chart-title flex justify-between items-center cursor-pointer"
                        onClick={() => setHistoryCollapsed(!historyCollapsed)}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                    >
                        <span>
                            <History size={18} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                            📅 Histórico de Meses ({monthlyHistory.length})
                        </span>
                        <button
                            className="btn btn-sm"
                            style={{ padding: '0.25rem', background: 'transparent', border: 'none' }}
                            title={historyCollapsed ? 'Expandir' : 'Minimizar'}
                        >
                            {historyCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                        </button>
                    </div>
                    {!historyCollapsed && (
                        <div className="mt-4" style={{ marginTop: '1rem' }}>
                            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                                        <th style={{ padding: '0.75rem', fontWeight: 600 }}>Mês</th>
                                        <th style={{ padding: '0.75rem', fontWeight: 600, textAlign: 'right' }}>Receita</th>
                                        <th style={{ padding: '0.75rem', fontWeight: 600, textAlign: 'right' }}>Despesas</th>
                                        <th style={{ padding: '0.75rem', fontWeight: 600, textAlign: 'right' }}>Lucro</th>
                                        <th style={{ padding: '0.75rem', fontWeight: 600, textAlign: 'center' }}>Alunos</th>
                                        <th style={{ padding: '0.75rem', fontWeight: 600, textAlign: 'center' }}>Presenças</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {monthlyHistory.map(snapshot => (
                                        <tr key={snapshot.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                            <td style={{ padding: '0.75rem', fontWeight: 500 }}>
                                                {getMonthName(snapshot.month)} {snapshot.year}
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'right', color: '#16a34a' }}>
                                                R$ {snapshot.revenue.toLocaleString('pt-BR')}
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'right', color: '#dc2626' }}>
                                                R$ {snapshot.expenses.toLocaleString('pt-BR')}
                                            </td>
                                            <td style={{
                                                padding: '0.75rem',
                                                textAlign: 'right',
                                                color: snapshot.profit >= 0 ? '#1e40af' : '#dc2626',
                                                fontWeight: 600
                                            }}>
                                                R$ {snapshot.profit.toLocaleString('pt-BR')}
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                {snapshot.activeStudents}
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                {snapshot.attendanceCount}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem', textAlign: 'center' }}>
                                Histórico de fechamentos mensais (registros imutáveis)
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
