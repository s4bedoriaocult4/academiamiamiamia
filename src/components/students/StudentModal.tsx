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
        name: '', phone: '', email: '', cpf: '', cep: '', address: '', plan: '1x', dueDay: 5,
        startDate: new Date().toISOString().split('T')[0], graduation: 'Sem graduação', notes: '', status: 'ativo'
    });

    // Fetch Plans dynamically
    const plans = useLiveQuery(() => db.plans.toArray()) || [];

    useEffect(() => {
        if (studentToEdit) {
            setFormData(studentToEdit);
        } else {
            setFormData({
                name: '', phone: '', email: '', cpf: '', cep: '', address: '', plan: '1x', dueDay: 5,
                startDate: new Date().toISOString().split('T')[0], graduation: 'Sem graduação', notes: '', status: 'ativo'
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
                    cpf: formData.cpf,
                    cep: formData.cep,
                    address: formData.address,
                    birthDate: formData.birthDate,
                    responsibleName: formData.responsibleName,
                    plan: formData.plan || '1x',
                    dueDay: Number(formData.dueDay),
                    startDate: formData.startDate!,
                    nextDue: nextDue,
                    graduation: formData.graduation || 'Sem graduação',
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

    // CPF Mask helper
    const formatCPF = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 11) {
            return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_match, p1, p2, p3, p4) => {
                if (p4) return `${p1}.${p2}.${p3}-${p4}`;
                if (p3) return `${p1}.${p2}.${p3}`;
                if (p2) return `${p1}.${p2}`;
                return p1;
            });
        }
        return value;
    };

    const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatCPF(e.target.value);
        setFormData({ ...formData, cpf: formatted });
    };

    // CEP Mask helper
    const formatCEP = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 8) {
            return numbers.replace(/(\d{5})(\d{0,3})/, (_match, p1, p2) => {
                if (p2) return `${p1}-${p2}`;
                return p1;
            });
        }
        return value;
    };

    const handleCEPChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatCEP(e.target.value);
        setFormData({ ...formData, cep: formatted });
        
        // Tentar buscar endereço via ViaCEP se CEP completo
        if (formatted.replace(/\D/g, '').length === 8) {
            try {
                const response = await fetch(`https://viacep.com.br/ws/${formatted.replace(/\D/g, '')}/json/`);
                const data = await response.json();
                if (!data.erro && data.logradouro) {
                    const address = `${data.logradouro}${data.complemento ? ', ' + data.complemento : ''}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
                    setFormData(prev => ({ ...prev, cep: formatted, address: address }));
                }
            } catch (error) {
                // Silenciosamente falha se API não disponível
            }
        }
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

                    <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">CPF</label>
                            <input
                                className="form-input"
                                value={formData.cpf || ''}
                                onChange={handleCPFChange}
                                placeholder="000.000.000-00"
                                maxLength={14}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">CEP</label>
                            <input
                                className="form-input"
                                value={formData.cep || ''}
                                onChange={handleCEPChange}
                                placeholder="00000-000"
                                maxLength={9}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Endereço</label>
                        <input
                            className="form-input"
                            value={formData.address || ''}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                            placeholder="Rua, número, bairro, cidade - UF"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            className="form-input"
                            value={formData.email || ''}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            placeholder="email@exemplo.com"
                        />
                    </div>

                    {/* Responsible Name - Highlight if Minor */}
                    <div className="form-group">
                        <label className="form-label flex justify-between">
                            Nome do Responsável
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

                    <div className="form-group">
                        <label className="form-label">Observações</label>
                        <textarea
                            className="form-input"
                            value={formData.notes || ''}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Observações sobre o aluno..."
                            rows={3}
                        />
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
