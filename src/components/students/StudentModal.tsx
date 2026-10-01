import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, CheckCircle2 } from 'lucide-react';
import { Student, GRADUATIONS, DUE_OPTIONS, PAYMENT_METHODS } from '../../types';
import { db } from '../../services/db';
import { getTodayDateString, calculateInitialDueDate } from '../../utils/dateUtils';

interface StudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    studentToEdit?: Student | null;
}

export function StudentModal({ isOpen, onClose, studentToEdit }: StudentModalProps) {
    const plans = useLiveQuery(() => db.plans.toArray()) || [];

    const getDefaultFormData = (): Partial<Student> => ({
        name: '',
        phone: '',
        email: '',
        cpf: '',
        cep: '',
        address: '',
        birthDate: '',
        responsibleName: '',
        plan: plans.length > 0 ? plans[0].id : '1x',
        planType: 'normal',
        dueDay: 5,
        startDate: getTodayDateString(),
        nextDue: '',
        personalClassesRemaining: 0,
        graduation: 'Sem graduação',
        notes: '',
        status: 'ativo'
    });

    const [formData, setFormData] = useState<Partial<Student>>(getDefaultFormData());

    // Estados para o primeiro pagamento (apenas no cadastro de novos alunos)
    const [registerFirstPayment, setRegisterFirstPayment] = useState(true);
    const [firstPaymentMethod, setFirstPaymentMethod] = useState<'PIX' | 'Dinheiro' | 'Cartão Crédito' | 'Link Pagamento'>('PIX');
    const [firstPaymentAmount, setFirstPaymentAmount] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (studentToEdit) {
            const defaults = getDefaultFormData();
            setFormData({
                ...defaults,
                ...studentToEdit,
                email: studentToEdit.email || '',
                cpf: studentToEdit.cpf || '',
                cep: studentToEdit.cep || '',
                address: studentToEdit.address || '',
                birthDate: studentToEdit.birthDate || '',
                responsibleName: studentToEdit.responsibleName || '',
                notes: studentToEdit.notes || '',
                personalClassesRemaining: studentToEdit.personalClassesRemaining || 0
            });
        } else {
            const initialForm = getDefaultFormData();
            setFormData(initialForm);

            // Pré-selecionar o valor do plano inicial
            if (plans.length > 0) {
                const currentPlan = plans.find(p => p.id === initialForm.plan) || plans[0];
                setFirstPaymentAmount(currentPlan?.price || 0);
            }
        }
    }, [studentToEdit, isOpen, plans]);

    // Atualiza o valor do primeiro pagamento ao trocar de plano
    useEffect(() => {
        if (!studentToEdit && formData.plan) {
            const currentPlan = plans.find(p => p.id === formData.plan);
            if (currentPlan) {
                setFirstPaymentAmount(currentPlan.price);
            }
        }
    }, [formData.plan, studentToEdit, plans]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        if (!formData.name || !formData.phone) {
            alert('Preencha os campos obrigatórios (Nome e Telefone)');
            return;
        }

        setIsSubmitting(true);

        try {
            const cleanData = { ...formData };
            if ((cleanData.personalClassesRemaining || 0) > 0) {
                cleanData.planType = 'both';
            } else {
                cleanData.planType = 'normal';
            }

            if (studentToEdit) {
                // Lógica de Edição segura: não zera meses atrasados ao alterar o dia do vencimento
                let nextDue = studentToEdit.nextDue;
                if (Number(formData.dueDay) !== studentToEdit.dueDay && studentToEdit.nextDue) {
                    const [y, m] = studentToEdit.nextDue.split('-');
                    const lastDay = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
                    const safeDay = Math.min(Number(formData.dueDay), lastDay);
                    nextDue = `${y}-${m}-${String(safeDay).padStart(2, '0')}`;
                }

                await db.students.update(studentToEdit.id, {
                    ...cleanData,
                    dueDay: Number(formData.dueDay),
                    nextDue
                });

                // UPDATE CASCADE
                if (studentToEdit.name !== formData.name) {
                    await db.payments.where('studentId').equals(studentToEdit.id).modify({ studentName: formData.name });
                    await db.attendance.where('studentId').equals(studentToEdit.id).modify({ studentName: formData.name });
                }

            } else {
                // Lógica de Cadastro de Novo Aluno
                const startDate = formData.startDate || getTodayDateString();
                const dueDay = Number(formData.dueDay) || 5;

                // Calcula o próximo vencimento (se já pagou o 1º mês, joga para o mês seguinte)
                const nextDue = calculateInitialDueDate(startDate, dueDay, registerFirstPayment);

                const newStudentId = Date.now().toString();
                const newStudent: Student = {
                    id: newStudentId,
                    name: formData.name!.trim(),
                    phone: formData.phone!.trim(),
                    email: formData.email?.trim(),
                    cpf: formData.cpf?.trim(),
                    cep: formData.cep?.trim(),
                    address: formData.address?.trim(),
                    birthDate: formData.birthDate,
                    responsibleName: formData.responsibleName?.trim(),

                    plan: formData.plan || (plans.length > 0 ? plans[0].id : '1x'),
                    planType: cleanData.planType as any,

                    personalPlanId: undefined,
                    personalClassesRemaining: Number(formData.personalClassesRemaining) || 0,
                    personalStartDate: undefined,

                    dueDay: dueDay,
                    startDate: startDate,
                    nextDue: nextDue,
                    graduation: formData.graduation || 'Sem graduação',
                    status: 'ativo',
                    notes: formData.notes?.trim(),
                    createdAt: new Date().toISOString()
                };

                await db.transaction('rw', [db.students, db.payments], async () => {
                    await db.students.add(newStudent);

                    // Se marcou para registrar o primeiro pagamento no caixa
                    if (registerFirstPayment && firstPaymentAmount > 0) {
                        await db.payments.add({
                            id: (Date.now() + 1).toString(),
                            studentId: newStudentId,
                            studentName: newStudent.name,
                            amount: Number(firstPaymentAmount),
                            method: firstPaymentMethod,
                            date: startDate,
                            referenceMonth: startDate.slice(0, 7),
                            type: 'pagamento',
                            createdAt: new Date().toISOString()
                        });
                    }
                });
            }

            onClose();
        } catch (error) {
            console.error('Erro ao salvar aluno:', error);
            alert('Erro ao salvar aluno');
        } finally {
            setIsSubmitting(false);
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

        if (formatted.replace(/\D/g, '').length === 8) {
            try {
                const response = await fetch(`https://viacep.com.br/ws/${formatted.replace(/\D/g, '')}/json/`);
                const data = await response.json();
                if (!data.erro && data.logradouro) {
                    const address = `${data.logradouro}${data.complemento ? ', ' + data.complemento : ''}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
                    setFormData(prev => ({ ...prev, cep: formatted, address: address }));
                }
            } catch (error) {
                // Silently fail
            }
        }
    };

    // Age Calculation for Responsible Name hint
    const getAge = (birthDate?: string) => {
        if (!birthDate) return 0;
        const today = new Date();
        const birth = new Date(birthDate + 'T12:00:00');
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    const age = getAge(formData.birthDate);
    const isMinor = age > 0 && age < 18;

    const hasUnsavedChanges = (): boolean => {
        if (!studentToEdit) {
            return !!(formData.name || formData.phone || formData.email || formData.cpf || formData.cep || formData.address || formData.birthDate || formData.responsibleName || formData.notes);
        }
        return (
            formData.name !== studentToEdit.name ||
            formData.phone !== studentToEdit.phone ||
            formData.email !== (studentToEdit.email || '') ||
            formData.cpf !== (studentToEdit.cpf || '') ||
            formData.cep !== (studentToEdit.cep || '') ||
            formData.address !== (studentToEdit.address || '') ||
            formData.birthDate !== (studentToEdit.birthDate || '') ||
            formData.responsibleName !== (studentToEdit.responsibleName || '') ||
            formData.plan !== studentToEdit.plan ||
            formData.dueDay !== studentToEdit.dueDay ||
            formData.graduation !== studentToEdit.graduation ||
            formData.notes !== (studentToEdit.notes || '') ||
            formData.status !== studentToEdit.status ||
            formData.personalClassesRemaining !== (studentToEdit.personalClassesRemaining || 0)
        );
    };

    const handleClose = () => {
        if (hasUnsavedChanges()) {
            if (confirm('Você tem dados não salvos. Deseja realmente sair?')) {
                onClose();
            }
        } else {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{studentToEdit ? '✏️ Editar Aluno' : '👤 Novo Aluno'}</h3>
                    <button onClick={handleClose} className="action-btn"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="modal-body">
                    {/* Basic Info */}
                    <div className="form-group">
                        <label className="form-label">Nome Completo *</label>
                        <input
                            required
                            className="form-input"
                            value={formData.name || ''}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Nome do aluno"
                            autoFocus
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
                            <label className="form-label">Telefone (WhatsApp) *</label>
                            <input
                                required
                                placeholder="(11) 99999-9999"
                                className="form-input"
                                value={formData.phone || ''}
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

                    {/* PLAN SELECTION SECTION */}
                    <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100 mb-4 space-y-4">
                        <h4 className="font-bold text-sm uppercase text-gray-700">Plano Mensal & Vencimento</h4>

                        <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">Plano Mensal</label>
                                <select
                                    className="form-select"
                                    value={formData.plan}
                                    onChange={e => setFormData({ ...formData, plan: e.target.value })}
                                >
                                    {plans.map(p => <option key={p.id} value={p.id}>{p.name} - R$ {p.price.toFixed(2)}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Dia de Vencimento</label>
                                <select
                                    className="form-select"
                                    value={formData.dueDay}
                                    onChange={e => setFormData({ ...formData, dueDay: Number(e.target.value) })}
                                >
                                    {DUE_OPTIONS.map(d => <option key={d} value={d}>Todo dia {d}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Saldo de Aulas Personal</label>
                            <div className="flex gap-2 items-center">
                                <input
                                    type="number"
                                    className="form-input bg-white"
                                    value={formData.personalClassesRemaining || 0}
                                    onChange={e => setFormData({ ...formData, personalClassesRemaining: Number(e.target.value) })}
                                />
                                <span className="text-xs text-gray-500 w-full">
                                    Aulas restantes para treino particular de Personal.
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* FLUXO DE MATRÍCULA COM 1º PAGAMENTO (Apenas Novo Aluno) */}
                    {!studentToEdit && (
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200 mb-4">
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-green-900 text-sm">
                                <input
                                    type="checkbox"
                                    checked={registerFirstPayment}
                                    onChange={e => setRegisterFirstPayment(e.target.checked)}
                                    className="w-4 h-4 rounded text-green-600"
                                />
                                <span className="flex items-center gap-1.5">
                                    <CheckCircle2 size={16} className="text-green-600" />
                                    Registrar pagamento da 1ª mensalidade no caixa agora
                                </span>
                            </label>

                            {registerFirstPayment && (
                                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-green-200" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div>
                                        <label className="text-xs font-semibold text-green-800">Forma de Pagamento</label>
                                        <select
                                            className="form-select text-sm mt-1 bg-white"
                                            value={firstPaymentMethod}
                                            onChange={e => setFirstPaymentMethod(e.target.value as any)}
                                        >
                                            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-green-800">Valor Recebido (R$)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="form-input text-sm mt-1 bg-white font-bold text-green-700"
                                            value={firstPaymentAmount || ''}
                                            onChange={e => setFirstPaymentAmount(Number(e.target.value))}
                                        />
                                    </div>
                                    <p className="col-span-2 text-xs text-green-700" style={{ gridColumn: 'span 2' }}>
                                        💡 O valor entrará imediatamente no financeiro e o próximo vencimento será agendado para o mês seguinte.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">Data Início / Matrícula</label>
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
                        <button
                            type="submit"
                            className="btn btn-primary w-full"
                            style={{ width: '100%' }}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Salvando...' : (studentToEdit ? 'Salvar Alterações' : 'Cadastrar Aluno')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
