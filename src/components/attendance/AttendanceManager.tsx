import { useMemo, useState } from 'react';
import {
    Search,
    CheckCircle2,
    Undo2,
    CalendarCheck,
    AlertTriangle,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { useAttendance, useStudents } from '../../hooks/useGymStore';
import { Student } from '../../types';
import {
    formatLocalDateString,
    getStudentPaymentStatus,
    getTodayDateString,
} from '../../utils/dateUtils';
import { recordAttendance, softDeleteAttendance } from '../../services/dataAccess';
import { useToast } from '../../contexts/ToastContext';
import { EmptyState } from '../UI';

export function AttendanceManager() {
    const students = useStudents();
    const attendance = useAttendance();
    const { showToast } = useToast();

    const [selectedDate, setSelectedDate] = useState(getTodayDateString());
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'present' | 'absent'>('all');
    const [busyStudentId, setBusyStudentId] = useState<string | null>(null);

    const activeStudents = useMemo(
        () =>
            students
                .filter((s) => s.status === 'ativo')
                .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
        [students]
    );

    const dateAttendanceMap = useMemo(() => {
        const map = new Map<string, string>();
        attendance
            .filter((a) => a.date === selectedDate)
            .forEach((a) => map.set(a.studentId, a.id));
        return map;
    }, [attendance, selectedDate]);

    const filteredStudents = useMemo(() => {
        const term = search.trim().toLowerCase();
        return activeStudents.filter((s) => {
            const isPresent = dateAttendanceMap.has(s.id);
            if (filter === 'present' && !isPresent) return false;
            if (filter === 'absent' && isPresent) return false;
            if (term && !s.name.toLowerCase().includes(term)) return false;
            return true;
        });
    }, [activeStudents, dateAttendanceMap, filter, search]);

    // Gráfico dos últimos 7 dias sem erro de UTC
    const weeklyChart = useMemo(() => {
        const days: { day: string; Presenças: number }[] = [];
        const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const now = new Date();

        for (let i = 6; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
            const dateStr = formatLocalDateString(d);
            const count = attendance.filter((a) => a.date === dateStr).length;
            days.push({
                day: `${weekdayNames[d.getDay()]} (${String(d.getDate()).padStart(2, '0')})`,
                Presenças: count,
            });
        }
        return days;
    }, [attendance]);

    const handleToggleCheckIn = async (student: Student) => {
        setBusyStudentId(student.id);
        try {
            const existingAttId = dateAttendanceMap.get(student.id);
            if (existingAttId) {
                await softDeleteAttendance(existingAttId);
                showToast('info', `Presença de ${student.name} removida.`);
            } else {
                await recordAttendance(student, selectedDate, 'normal');
                showToast('success', `Presença confirmada para ${student.name}!`);
            }
        } catch {
            showToast('error', 'Erro ao atualizar presença.');
        } finally {
            setBusyStudentId(null);
        }
    };

    const presentCount = dateAttendanceMap.size;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        Lista de Presença
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {presentCount} presente(s) em{' '}
                        {selectedDate.split('-').reverse().join('/')}
                    </p>
                </div>

                <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="input sm:w-48 font-semibold"
                />
            </div>

            {/* Frequência dos últimos 7 dias */}
            <div className="card p-5 space-y-3">
                <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Movimento dos Últimos 7 Dias
                </div>
                <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklyChart}>
                            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="Presenças" fill="#e11d48" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Busca e Filtros */}
            <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Buscar aluno para dar presença..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input pl-10"
                    />
                </div>

                <div className="flex gap-1.5">
                    {[
                        { id: 'all', label: `Todos (${activeStudents.length})` },
                        { id: 'present', label: `Presentes (${presentCount})` },
                        { id: 'absent', label: 'Sem presença' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setFilter(tab.id as typeof filter)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                                filter === tab.id
                                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Lista de Check-in */}
            {filteredStudents.length === 0 ? (
                <EmptyState
                    icon={<CalendarCheck className="w-6 h-6" />}
                    title="Nenhum aluno encontrado"
                    description="Verifique os filtros acima para localizar os alunos ativos."
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredStudents.map((s) => {
                        const isPresent = dateAttendanceMap.has(s.id);
                        const isLate = getStudentPaymentStatus(s).status === 'overdue';
                        return (
                            <div
                                key={s.id}
                                className={`card p-4 flex items-center justify-between gap-3 transition-all ${
                                    isPresent
                                        ? 'border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-800'
                                        : ''
                                }`}
                            >
                                <div className="min-w-0">
                                    <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                        {s.name}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        {isLate ? (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                                <AlertTriangle className="w-3 h-3" />
                                                Mensalidade atrasada
                                            </span>
                                        ) : (
                                            <span className="text-[11px] text-slate-500">
                                                {s.graduation || 'Aluno'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    disabled={busyStudentId === s.id}
                                    onClick={() => handleToggleCheckIn(s)}
                                    className={`btn btn-sm shrink-0 ${
                                        isPresent ? 'btn-secondary' : 'btn-success'
                                    }`}
                                >
                                    {isPresent ? (
                                        <>
                                            <Undo2 className="w-3.5 h-3.5" />
                                            Presente
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            Marcar
                                        </>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
