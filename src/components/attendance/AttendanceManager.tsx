import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Trash2, Users, List, Calendar, TrendingUp } from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useAttendance, useStudents } from '../../hooks/useGymStore';
import { Attendance } from '../../types';
import { db } from '../../services/db';

export function AttendanceManager() {
    const students = useStudents();
    const allAttendance = useAttendance();
    const plans = useLiveQuery(() => db.plans.toArray()) || [];
    const activeStudents = students.filter(s => s.status === 'ativo');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'checkin' | 'records'>('checkin');

    // Filter Logic
    const selectedDateAttendance = allAttendance.filter(a => a.date === selectedDate);

    // Helper to get plan name
    const getPlanName = (planId: string) => {
        const plan = plans.find(p => p.id === planId);
        return plan ? plan.name : planId;
    };

    // Chart Data
    const getWeeklyAttendance = () => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayName = d.toLocaleDateString('pt-BR', { weekday: 'short' });
            const count = allAttendance.filter(a => a.date === dateStr).length;
            days.push({ day: dayName, presenças: count });
        }
        return days;
    };

    const handleCheckIn = async (studentId: string) => {
        const existing = selectedDateAttendance.find(a => a.studentId === studentId);
        if (existing) return;

        const student = students.find(s => s.id === studentId);
        if (!student) return;

        const newAttendance: Attendance = {
            id: Date.now().toString(),
            studentId,
            studentName: student.name,
            date: selectedDate,
            createdAt: new Date().toISOString()
        };

        try {
            await db.attendance.add(newAttendance);
        } catch (error) {
            console.error(error);
            alert('Erro ao registrar presença');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Remover presença?')) {
            await db.attendance.delete(id);
        }
    };

    const selectedDateDisplay = new Date(selectedDate + 'T12:00:00');

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header / Date Selector */}
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h2 className="text-xl font-bold" style={{ marginBottom: '0.25rem' }}>
                        📋 Controle de Presenças
                    </h2>
                    <p className="text-sm text-gray-500">
                        {selectedDateDisplay.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        background: 'white',
                        padding: '0.625rem 1rem',
                        borderRadius: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        border: '1px solid var(--gray-100)'
                    }}>
                        <Calendar size={18} style={{ color: 'var(--primary)' }} />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            style={{
                                border: 'none',
                                background: 'transparent',
                                fontWeight: 600,
                                color: 'var(--gray-700)',
                                cursor: 'pointer'
                            }}
                        />
                    </div>
                    <button
                        onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                        className="btn btn-primary btn-sm"
                        style={{ borderRadius: '10px' }}
                    >
                        Hoje
                    </button>
                </div>
            </div>

            {/* Weekly Chart */}
            <div className="chart-container" style={{ borderRadius: '20px' }}>
                <h3 className="chart-title mb-4" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <TrendingUp size={18} style={{ color: 'var(--primary)' }} />
                    Frequência Semanal
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={getWeeklyAttendance()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                            contentStyle={{
                                borderRadius: '12px',
                                border: 'none',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                            }}
                        />
                        <Line
                            type="monotone"
                            dataKey="presenças"
                            stroke="#1e40af"
                            strokeWidth={3}
                            dot={{ fill: '#1e40af', strokeWidth: 2, r: 5 }}
                            activeDot={{ r: 8, fill: '#3b82f6' }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Premium Tabs */}
            <div className="attendance-tabs">
                <button
                    onClick={() => setActiveTab('checkin')}
                    className={`attendance-tab ${activeTab === 'checkin' ? 'active' : ''}`}
                >
                    <Users size={18} />
                    <span>Marcar Presença</span>
                    <span className="attendance-tab-badge">{activeStudents.length}</span>
                </button>
                <button
                    onClick={() => setActiveTab('records')}
                    className={`attendance-tab ${activeTab === 'records' ? 'active' : ''}`}
                >
                    <List size={18} />
                    <span>Registros do Dia</span>
                    <span className="attendance-tab-badge">{selectedDateAttendance.length}</span>
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'checkin' && (
                <div>
                    <div className="mb-4">
                        <input
                            className="form-input"
                            placeholder="🔍 Buscar aluno..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ borderRadius: '12px', padding: '0.875rem 1rem' }}
                        />
                    </div>

                    <div className="attendance-grid">
                        {activeStudents
                            .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
                            .map(student => {
                                const hasAttendance = selectedDateAttendance.some(a => a.studentId === student.id);
                                const plan = plans.find(p => p.id === student.plan);

                                return (
                                    <div
                                        key={student.id}
                                        onClick={() => !hasAttendance && handleCheckIn(student.id)}
                                        className={`attendance-card ${hasAttendance ? 'present' : ''}`}
                                    >
                                        <div className="attendance-card-header">
                                            <span className="student-name text-sm md:text-base">{student.name}</span>
                                            {hasAttendance && <Check size={22} style={{ color: 'var(--success)' }} />}
                                        </div>
                                        <div className="attendance-card-info">
                                            <span className="text-xs" style={{ color: 'var(--gray-500)' }}>{plan?.name}</span>
                                            <span className="time">{hasAttendance ? '✓ Presente' : 'Clique para marcar'}</span>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}

            {activeTab === 'records' && (
                <div className="records-card">
                    <div className="records-card-header">
                        <h3>
                            <List size={18} />
                            Presenças Registradas ({selectedDateAttendance.length})
                        </h3>
                    </div>
                    <div className="records-list">
                        {selectedDateAttendance.length === 0 ? (
                            <div className="records-empty">
                                <div className="records-empty-icon">📭</div>
                                <p>Nenhuma presença registrada nesta data.</p>
                            </div>
                        ) : (
                            selectedDateAttendance.map(att => {
                                const student = students.find(s => s.id === att.studentId);
                                return (
                                    <div key={att.id} className="record-item">
                                        <div className="record-info">
                                            <span className="record-name">{att.studentName}</span>
                                            {student && (
                                                <span className="record-details">
                                                    {getPlanName(student.plan)} • {student.graduation}
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleDelete(att.id)}
                                            className="record-delete"
                                            title="Remover presença"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

