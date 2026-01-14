import { useState } from 'react';
import { CheckCircle, PlusCircle, Search, Dumbbell } from 'lucide-react';
import { db } from '../../services/db';
import { useStudents } from '../../hooks/useGymStore';
import { Attendance } from '../../types';
import { PaymentModal } from '../payments/PaymentModal';

export function PersonalDashboard() {
    const students = useStudents();

    // Filtrar APENAS alunos com saldo de aulas > 0
    // Quando acaba as aulas, o aluno sai do controle personal até comprar novo pacote
    const activePersonalStudents = students.filter(s =>
        s.status === 'ativo' &&
        s.personalClassesRemaining !== undefined &&
        s.personalClassesRemaining > 0
    );

    const [searchTerm, setSearchTerm] = useState('');
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

    // Filter & Sort (ordenar por saldo crescente - quem tem menos aparece primeiro)
    const filteredStudents = activePersonalStudents
        .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => (a.personalClassesRemaining || 0) - (b.personalClassesRemaining || 0));

    const handleQuickCheckIn = async (studentId: string) => {
        const student = students.find(s => s.id === studentId);
        if (!student) return;

        const currentBalance = student.personalClassesRemaining || 0;

        // BLOQUEAR se saldo <= 0
        if (currentBalance <= 0) {
            alert('Este aluno não possui aulas restantes. É necessário comprar um novo pacote.');
            return;
        }

        if (!confirm(`Registrar aula Personal para ${student.name}?\n\nSaldo atual: ${currentBalance} aula(s)\nSaldo após: ${currentBalance - 1} aula(s)`)) {
            return;
        }

        try {
            await db.transaction('rw', db.attendance, db.students, async () => {
                const newAttendance: Attendance = {
                    id: Date.now().toString(),
                    studentId,
                    studentName: student.name,
                    date: new Date().toISOString().split('T')[0],
                    createdAt: new Date().toISOString(),
                    attendanceType: 'personal'
                };
                await db.attendance.add(newAttendance);

                // Garantir que nunca fica negativo
                const newBalance = Math.max(0, currentBalance - 1);
                await db.students.update(studentId, {
                    personalClassesRemaining: newBalance
                });
            });
            alert('Aula registrada com sucesso!');
        } catch (error) {
            console.error(error);
            alert('Erro ao registrar aula');
        }
    };

    const handleBuyPackage = (studentId: string) => {
        setSelectedStudentId(studentId);
        setPaymentModalOpen(true);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Dumbbell className="text-blue-600" />
                        Dashboard Personal
                    </h2>
                    <p className="text-gray-500">Controle de pacotes e aulas avulsas</p>
                </div>
                <div className="form-input-icon max-w-[300px]">
                    <Search className="icon" size={18} />
                    <input
                        className="form-input"
                        placeholder="Buscar aluno..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStudents.map(student => {
                    const remaining = student.personalClassesRemaining || 0;
                    const isLow = remaining <= 2;
                    const isZero = remaining <= 0;

                    return (
                        <div key={student.id} className={`card p-5 border-l-4 ${isZero ? 'border-l-red-500' : isLow ? 'border-l-yellow-500' : 'border-l-green-500'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg">{student.name}</h3>
                                    <p className="text-sm text-gray-500">Saldo de Aulas</p>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-sm font-bold ${isZero ? 'bg-red-100 text-red-700' : isLow ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                    {remaining}
                                </div>
                            </div>

                            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                                <div
                                    className={`h-2.5 rounded-full ${isZero ? 'bg-red-500' : isLow ? 'bg-yellow-500' : 'bg-blue-600'}`}
                                    style={{ width: `${Math.min(100, Math.max(0, (remaining / 10) * 100))}%` }}
                                ></div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mt-auto">
                                <button
                                    onClick={() => handleQuickCheckIn(student.id)}
                                    className="btn btn-primary btn-sm w-full flex justify-center items-center gap-2"
                                >
                                    <CheckCircle size={16} />
                                    Check-in
                                </button>
                                <button
                                    onClick={() => handleBuyPackage(student.id)}
                                    className="btn btn-success btn-sm w-full flex justify-center items-center gap-2"
                                >
                                    <PlusCircle size={16} />
                                    Comprar
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredStudents.length === 0 && (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <Dumbbell size={48} className="mx-auto mb-3 opacity-20" />
                    <p>Nenhum aluno com pacote personal ativo.</p>
                    <p className="text-xs mt-2">Venda um pacote através do menu Pagamentos para começar.</p>
                </div>
            )}

            {paymentModalOpen && (
                <PaymentModal
                    isOpen={paymentModalOpen}
                    onClose={() => setPaymentModalOpen(false)}
                    // Pass explicit initial data instead of "paymentToEdit" to correct the flow
                    initialData={{
                        studentId: selectedStudentId!,
                        type: 'personal',
                        method: 'PIX',
                        date: new Date().toISOString().split('T')[0]
                    }}
                />
            )}
        </div>
    );
}
