import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Trash2 } from 'lucide-react';
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
                <h2 className="text-xl font-bold">
                    Presenças - {selectedDateDisplay.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h2>
                <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
                    <label className="font-medium whitespace-nowrap">📅 Data:</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="border-none focus:ring-0 text-gray-700 bg-transparent"
                    />
                    <button
                        onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                        className="btn btn-xs btn-outline ml-2"
                    >
                        Hoje
                    </button>
                </div>
            </div>

            {/* Weekly Chart */}
            <div className="chart-container">
                <h3 className="chart-title mb-4">📈 Frequência Semanal</h3>
                <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={getWeeklyAttendance()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="presenças" stroke="#1e40af" strokeWidth={2} dot={{ fill: '#1e40af' }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Attendance Check-in Grid */}
            <div>
                <div className="mb-4">
                    <input
                        className="form-input"
                        placeholder="Filtrar aluno..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
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
                                    style={{
                                        cursor: hasAttendance ? 'default' : 'pointer',
                                        opacity: hasAttendance ? 0.9 : 1
                                    }}
                                >
                                    <div className="attendance-card-header">
                                        <span className="student-name text-sm md:text-base">{student.name}</span>
                                        {hasAttendance && <Check size={20} />}
                                    </div>
                                    <div className="attendance-card-info">
                                        <span className="text-xs">{plan?.name}</span>
                                        <span className="time text-xs font-bold">{hasAttendance ? 'Presente' : 'Ausente'}</span>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>

            {/* List for Deletion */}
            <div className="card">
                <div className="card-header border-b border-gray-100 p-4">
                    <h3 className="font-bold">Registros do Dia ({selectedDateAttendance.length})</h3>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                    {selectedDateAttendance.length === 0 ? (
                        <p className="text-center p-4 text-gray-500">Nenhuma presença nesta data.</p>
                    ) : (
                        <table className="table w-full">
                            <tbody>
                                {selectedDateAttendance.map(att => {
                                    const student = students.find(s => s.id === att.studentId);
                                    return (
                                        <tr key={att.id} className="border-b border-gray-50">
                                            <td className="p-3">
                                                <div className="ml-3">
                                                    <p className="font-medium text-gray-800">{att.studentName}</p>
                                                    {student && (
                                                        <div className="text-sm text-gray-500">
                                                            {getPlanName(student.plan)} • {student.graduation}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="text-right p-3">
                                                <button
                                                    onClick={() => handleDelete(att.id)}
                                                    className="text-red-500 hover:text-red-700 p-1"
                                                    title="Remover"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
