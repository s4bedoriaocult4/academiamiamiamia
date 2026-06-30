import { X, User, Phone, MapPin, CreditCard, Award, FileText } from 'lucide-react';
import { Student } from '../../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../services/db';

interface StudentViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: Student | null;
}

export function StudentViewModal({ isOpen, onClose, student }: StudentViewModalProps) {
    const plans = useLiveQuery(() => db.plans.toArray()) || [];

    if (!isOpen || !student) return null;

    const plan = plans.find(p => p.id === student.plan);
    const planName = plan ? plan.name : student.plan;

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'Não informado';
        const hasTime = dateStr.includes('T');
        const date = hasTime ? new Date(dateStr) : new Date(dateStr + 'T12:00:00');
        return date.toLocaleDateString('pt-BR');
    };

    const getAge = (birthDate?: string) => {
        if (!birthDate) return null;
        const today = new Date();
        const birth = new Date(birthDate + 'T12:00:00');
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    const age = getAge(student.birthDate);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal max-w-2xl" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>👤 Cadastro Completo - {student.name}</h3>
                    <button onClick={onClose} className="action-btn"><X size={20} /></button>
                </div>
                <div className="modal-body" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                    <div className="space-y-6">
                        {/* Informações Pessoais */}
                        <div className="card">
                            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <User size={20} /> Informações Pessoais
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Nome Completo</label>
                                    <p className="text-base font-medium">{student.name}</p>
                                </div>
                                {student.cpf && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">CPF</label>
                                        <p className="text-base">{student.cpf}</p>
                                    </div>
                                )}
                                {student.birthDate && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Data de Nascimento</label>
                                        <p className="text-base">{formatDate(student.birthDate)} {age && `(${age} anos)`}</p>
                                    </div>
                                )}
                                {student.responsibleName && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Responsável</label>
                                        <p className="text-base">{student.responsibleName}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Contato */}
                        <div className="card">
                            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Phone size={20} /> Contato
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Telefone</label>
                                    <p className="text-base">{student.phone}</p>
                                </div>
                                {student.email && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Email</label>
                                        <p className="text-base">{student.email}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Endereço - Sempre mostrar */}
                        <div className="card">
                            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <MapPin size={20} /> Endereço
                            </h4>
                            <div className="space-y-2">
                                <div>
                                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">CEP</label>
                                    <p className="text-base">{student.cep || 'Não informado'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Endereço</label>
                                    <p className="text-base">{student.address || 'Não informado'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Informações da Academia */}
                        <div className="card">
                            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <CreditCard size={20} /> Informações da Academia
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Plano</label>
                                    <p className="text-base font-medium">{planName}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Dia de Vencimento</label>
                                    <p className="text-base">Dia {student.dueDay}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Data de Início</label>
                                    <p className="text-base">{formatDate(student.startDate)}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Próximo Vencimento</label>
                                    <p className="text-base">{formatDate(student.nextDue)}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</label>
                                    <p className="text-base">
                                        <span className={`badge ${student.status === 'ativo' ? 'badge-success' : 'badge-gray'}`}>
                                            {student.status}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Graduação */}
                        <div className="card">
                            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Award size={20} /> Graduação
                            </h4>
                            <p className="text-base">
                                <span className="badge badge-primary">{student.graduation}</span>
                            </p>
                        </div>

                        {/* Observações */}
                        {student.notes && (
                            <div className="card">
                                <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <FileText size={20} /> Observações
                                </h4>
                                <p className="text-base whitespace-pre-wrap">{student.notes}</p>
                            </div>
                        )}

                        {/* Data de Cadastro */}
                        <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                            Cadastrado em {formatDate(student.createdAt)}
                        </div>
                    </div>
                </div>
                <div className="modal-footer" style={{ padding: '1rem', borderTop: '1px solid #e5e7eb' }}>
                    <button onClick={onClose} className="btn btn-primary w-full">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}

