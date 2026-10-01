import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight, Eye, DollarSign } from 'lucide-react';
import { useStudents } from '../../hooks/useGymStore';
import { Student } from '../../types';
import { db } from '../../services/db';
import { StudentModal } from './StudentModal';
import { StudentViewModal } from './StudentViewModal';
import { PaymentModal } from '../payments/PaymentModal';
import { getStudentPaymentStatus, formatDateBR } from '../../utils/dateUtils';

export function StudentList() {
    const students = useStudents();
    const plans = useLiveQuery(() => db.plans.toArray()) || [];
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewingStudent, setViewingStudent] = useState<Student | null>(null);

    // Estado para atalho rápido de pagamento
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentStudentId, setPaymentStudentId] = useState<string | null>(null);

    // Helper to get plan name
    const getPlanName = (planId: string) => {
        const plan = plans.find(p => p.id === planId);
        return plan ? plan.name : planId;
    };

    // Filter Logic
    const filtered = students.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.phone.includes(searchTerm) ||
        s.status.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination Logic
    const ITEMS_PER_PAGE = 20;
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedStudents = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handleEdit = (student: Student) => {
        setEditingStudent(student);
        setIsModalOpen(true);
    };

    const handleView = (student: Student) => {
        setViewingStudent(student);
        setIsViewModalOpen(true);
    };

    const handleQuickPayment = (student: Student) => {
        setPaymentStudentId(student.id);
        setIsPaymentModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir este aluno? Isso apagará também seu histórico de pagamentos e presenças.')) {
            await db.transaction('rw', [db.students, db.payments, db.attendance], async () => {
                await db.students.delete(id);
                await db.payments.where('studentId').equals(id).delete();
                await db.attendance.where('studentId').equals(id).delete();
            });
        }
    };

    const handleAdd = () => {
        setEditingStudent(null);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div className="form-input-icon flex-1 min-w-[200px] max-w-[400px]">
                    <Search className="icon" size={18} />
                    <input
                        className="form-input"
                        placeholder="Buscar por nome, telefone ou status..."
                        value={searchTerm}
                        onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                </div>
                <button onClick={handleAdd} className="btn btn-primary">
                    <Plus size={18} /> Novo Aluno
                </button>
            </div>

            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Telefone</th>
                                <th>Plano</th>
                                <th>Mensalidade / Vencimento</th>
                                <th>Graduação</th>
                                <th>Status</th>
                                <th className="text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center p-8 text-gray-500">
                                        Nenhum aluno encontrado.
                                    </td>
                                </tr>
                            ) : (
                                paginatedStudents.map(student => {
                                    const planType = student.planType || 'normal';
                                    const showNormal = planType === 'normal' || planType === 'both';
                                    const showPersonal = planType === 'personal' || planType === 'both';
                                    const paymentInfo = getStudentPaymentStatus(student);

                                    return (
                                        <tr key={student.id}>
                                            <td className="font-medium">
                                                <div>{student.name}</div>
                                                {student.dueDay && (
                                                    <span className="text-xs text-gray-400">Vence todo dia {student.dueDay}</span>
                                                )}
                                            </td>
                                            <td>{student.phone}</td>
                                            <td className="whitespace-nowrap">
                                                <div className="flex flex-col gap-1 items-start">
                                                    {showNormal && (
                                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                            {getPlanName(student.plan)}
                                                        </span>
                                                    )}
                                                    {showPersonal && (
                                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                                                            Personal ({student.personalClassesRemaining || 0} aulas)
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex flex-col items-start gap-1">
                                                    <span className={`badge ${paymentInfo.badgeClass}`}>
                                                        {paymentInfo.label}
                                                    </span>
                                                    {student.status === 'ativo' && student.nextDue && (
                                                        <span className="text-xs text-gray-500">
                                                            Próx: {formatDateBR(student.nextDue)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td><span className="badge badge-primary">{student.graduation}</span></td>
                                            <td>
                                                <span className={`badge ${student.status === 'ativo' ? 'badge-success' : 'badge-gray'}`}>
                                                    {student.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="action-buttons justify-end">
                                                    <button
                                                        onClick={() => handleQuickPayment(student)}
                                                        className="action-btn success"
                                                        title="Receber Pagamento"
                                                    >
                                                        <DollarSign size={18} />
                                                    </button>
                                                    <button onClick={() => handleView(student)} className="action-btn primary" title="Ver Cadastro">
                                                        <Eye size={18} />
                                                    </button>
                                                    <button onClick={() => handleEdit(student)} className="action-btn primary" title="Editar">
                                                        <Edit size={18} />
                                                    </button>
                                                    <button onClick={() => handleDelete(student.id)} className="action-btn danger" title="Excluir">
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
                            Página {currentPage} de {totalPages} ({filtered.length} alunos)
                        </span>
                        <div className="flex gap-2">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                                className="btn btn-outline btn-sm"
                            >
                                <ChevronLeft size={16} /> Anterior
                            </button>
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => p + 1)}
                                className="btn btn-outline btn-sm"
                            >
                                Próxima <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <StudentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                studentToEdit={editingStudent}
            />

            <StudentViewModal
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                student={viewingStudent}
            />

            {/* Modal de Pagamento Rápido acionado direto pela lista */}
            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => {
                    setIsPaymentModalOpen(false);
                    setPaymentStudentId(null);
                }}
                initialData={{
                    studentId: paymentStudentId || '',
                    type: 'pagamento'
                }}
            />
        </div>
    );
}
