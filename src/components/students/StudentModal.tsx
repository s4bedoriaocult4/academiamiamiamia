import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { X } from 'lucide-react';
import { Student, GRADUATIONS, DUE_OPTIONS } from '../../types';
import { db } from '../../services/db';

interface StudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    studentToEdit?: Student | null;
}

export function StudentModal({ isOpen, onClose, studentToEdit }: StudentModalProps) {
    const [formData, setFormData] = useState<Partial<Student>>({
        name: '', phone: '', email: '', plan: '1x', dueDay: 5,
        startDate: new Date().toISOString().split('T')[0], graduation: 'Branca', notes: '', status: 'ativo'
    });

    // Fetch Plans dynamically
    const plans = useLiveQuery(() => db.plans.toArray()) || [];

    useEffect(() => {
        if (studentToEdit) {
            setFormData(studentToEdit);
        } else {
            setFormData({
                name: '', phone: '', email: '', plan: '1x', dueDay: 5,
                startDate: new Date().toISOString().split('T')[0], graduation: 'Branca', notes: '', status: 'ativo'
            });
        }
    }, [studentToEdit, isOpen]);

    const getNextDueDate = (baseDate: string, dueDay: number): string => {
        const base = new Date(baseDate + 'T12:00:00');
        const month = base.getMonth();
        const year = base.getFullYear();
        let due = new Date(year, month, dueDay, 12, 0, 0);

        if (due <= base) {
            due.setMonth(month + 1);
        }
        return due.toISOString().split('T')[0];
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.phone) {
            alert('Preencha os campos obrigatórios');
            return;
        }

        try {
            if (studentToEdit) {
                // Edit Logic
                let nextDue = formData.nextDue;
                if (Number(formData.dueDay) !== studentToEdit.dueDay) {
                    nextDue = getNextDueDate(new Date().toISOString().split('T')[0], Number(formData.dueDay));
                }

                await db.students.update(studentToEdit.id, {
                    ...formData,
                    dueDay: Number(formData.dueDay),
                    nextDue
                });

                // UPDATE CASCADE: Update name in other tables if it changed
                if (studentToEdit.name !== formData.name) {
                    // Update Payments
                    await db.payments
                        .where('studentId').equals(studentToEdit.id)
                        .modify({ studentName: formData.name });

                    // Update Attendance
                    await db.attendance
                        .where('studentId').equals(studentToEdit.id)
                        .modify({ studentName: formData.name });
                }

            } else {
                // Add Logic
                const nextDue = getNextDueDate(new Date().toISOString().split('T')[0], Number(formData.dueDay));
                const newStudent: Student = {
                    id: Date.now().toString(),
                    name: formData.name!,
                    phone: formData.phone!,
                    email: formData.email,
                    plan: formData.plan || '1x',
                    dueDay: Number(formData.dueDay),
                    startDate: formData.startDate!,
                    nextDue: nextDue,
                    graduation: formData.graduation || 'Branca',
                    status: 'ativo',
                    notes: formData.notes,
                    createdAt: new Date().toISOString()
                };
                await db.students.add(newStudent);
            }
            onClose();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar aluno');
        }
    };

    // Phone Mask helper
    const formatPhone = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 10) {
            return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
        }
        return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhone(e.target.value);
        setFormData({ ...formData, phone: formatted });
    };

    // Age Calculation for Responsible Name hint
    const getAge = (birthDate?: string) => {
        if (!birthDate) return 0;
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    const age = getAge(formData.birthDate);
    const isMinor = age > 0 && age < 18;

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{studentToEdit ? '✏️ Editar Aluno' : '➕ Novo Aluno'}</h3>
                    <button onClick={onClose} className="action-btn"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-group">
                        <label className="form-label">Nome Completo *</label>
                        <input
                            required
                            className="form-input"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ex: João Silva"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">Data de Nascimento</label>
                            <input
                                type="date"
                                className="form-input"
                                value={formData.birthDate || ''}
                                onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Telefone *</label>
                            <input
                                required
                                placeholder="(11) 99999-9999"
                                className="form-input"
                                value={formData.phone}
                                onChange={handlePhoneChange}
                                maxLength={15}
                            />
                        </div>
                    </div>

                    {/* Responsible Name - Highlight if Minor */}
                    <div className="form-group">
                        <label className="form-label flex justify-between">
                            Observações
                            {isMinor && <span className="text-xs text-red-500 font-bold">(Obrigatório para menores)</span>}
                        </label>
                        <input
                            className={`form-input ${isMinor && !formData.responsibleName ? 'border-red-300' : ''}`}
                            value={formData.responsibleName || ''}
                            onChange={e => setFormData({ ...formData, responsibleName: e.target.value })}
                            placeholder={isMinor ? "Nome do pai/mãe" : "Opcional"}
                            required={isMinor}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">Plano</label>
                            <select
                                className="form-select"
                                value={formData.plan}
                                onChange={e => setFormData({ ...formData, plan: e.target.value })}
                            >
                                {plans.map(p => <option key={p.id} value={p.id}>{p.name} - R$ {p.price}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Vencimento</label>
                            <select
                                className="form-select"
                                value={formData.dueDay}
                                onChange={e => setFormData({ ...formData, dueDay: Number(e.target.value) })}
                            >
                                {DUE_OPTIONS.map(d => <option key={d} value={d}>Dia {d}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">Data Início</label>
                            <input
                                type="date"
                                className="form-input"
                                value={formData.startDate}
                                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Graduação</label>
                            <select
                                className="form-select"
                                value={formData.graduation}
                                onChange={e => setFormData({ ...formData, graduation: e.target.value })}
                            >
                                {GRADUATIONS.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                    </div>

                    {studentToEdit && (
                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select
                                className="form-select"
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value as 'ativo' | 'inativo' })}
                            >
                                <option value="ativo">Ativo</option>
                                <option value="inativo">Inativo</option>
                            </select>
                        </div>
                    )}

                    <div className="form-group pt-4">
                        <button type="submit" className="btn btn-primary w-full" style={{ width: '100%' }}>
                            {studentToEdit ? 'Salvar Alterações' : 'Cadastrar Aluno'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
