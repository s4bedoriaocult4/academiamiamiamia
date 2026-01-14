import { useState, useEffect } from 'react';
import {
    Users, DollarSign, Clock, AlertCircle, Printer, Cake, ChevronDown, ChevronUp
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { useStudents, usePayments, useExpenses, useAttendance } from '../../hooks/useGymStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../services/db';

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
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Visão Geral</h2>
                <button onClick={() => window.print()} className="btn btn-outline" title="Imprimir Relatório">
                    <Printer size={18} /> Imprimir Relatório
                </button>
            </div>

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
                            <p className="stat-label">Alunos Ativos</p>
                            <p className="stat-value">{activeStudents.length}</p>
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
                            <p className="stat-value">R$ {thisMonthRevenue.toLocaleString('pt-BR')}</p>
                            <p className="stat-sublabel">Esperado: R$ {expectedRevenue.toLocaleString('pt-BR')}</p>
                        </div>
                        <div className="stat-icon success">
                            <DollarSign size={24} />
                        </div>
                    </div>
                </div>

                <div className="stat-card warning">
                    <div className="stat-card-content">
                        <div>
                            <p className="stat-label">Inadimplentes</p>
                            <p className="stat-value">{overdueStudents.length}</p>
                        </div>
                        <div className="stat-icon warning">
                            <AlertCircle size={24} />
                        </div>
                    </div>
                </div>

                <div className="stat-card accent">
                    <div className="stat-card-content">
                        <div>
                            <p className="stat-label">Presenças Hoje</p>
                            <p className="stat-value">{todayAttendance.length}</p>
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
                            R$ {thisMonthRevenue.toLocaleString('pt-BR')}
                        </p>
                    </div>
                    <div className="p-4 bg-red-100 rounded-lg text-center" style={{ background: '#fee2e2', borderRadius: '8px', padding: '1rem' }}>
                        <p className="text-sm text-red-800" style={{ color: '#991b1b' }}>Despesas</p>
                        <p className="text-2xl font-bold text-red-600" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>
                            R$ {thisMonthExpenseTotal.toLocaleString('pt-BR')}
                        </p>
                    </div>
                    <div
                        className="p-4 rounded-lg text-center"
                        style={{
                            background: thisMonthRevenue - thisMonthExpenseTotal >= 0 ? '#dbeafe' : '#fee2e2',
                            borderRadius: '8px',
                            padding: '1rem'
                        }}
                    >
                        <p className="text-sm" style={{ color: thisMonthRevenue - thisMonthExpenseTotal >= 0 ? '#1e40af' : '#991b1b' }}>Lucro</p>
                        <p className="text-2xl font-bold" style={{ fontSize: '1.5rem', fontWeight: 700, color: thisMonthRevenue - thisMonthExpenseTotal >= 0 ? '#1e40af' : '#dc2626' }}>
                            R$ {(thisMonthRevenue - thisMonthExpenseTotal).toLocaleString('pt-BR')}
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
        </div>
    );
}
