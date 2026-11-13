import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    X,
    Check,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    Search,
    Calendar,
    Sparkles,
} from 'lucide-react';
import {
    DUE_OPTIONS,
    GRADUATIONS,
    Payment,
    PAYMENT_METHODS,
    PersonalPlan,
    Plan,
    PlanCategory,
    Student,
} from '../../types';
import {
    calculateInitialDueDate,
    formatCurrencyBRL,
    formatDateBR,
    getTodayDateString,
    getYearMonth,
} from '../../utils/dateUtils';
import {
    getBillingDurationMonths,
    getCategoryShortLabel,
    getCommitmentMonths,
    getDefaultPlanId,
    inferPlanCategory,
} from '../../utils/planUtils';
import { saveStudent } from '../../services/dataAccess';
import { useToast } from '../../contexts/ToastContext';

interface StudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    studentToEdit?: Student | null;
    plans: Plan[];
    personalPlans: PersonalPlan[];
    existingStudents: Student[];
}

function formatPhoneMask(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function StudentModal({
    isOpen,
    onClose,
    studentToEdit,
    plans,
    personalPlans,
    existingStudents,
}: StudentModalProps) {
    const { showToast } = useToast();
    const initializedSessionRef = useRef<string | null>(null);

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [planType, setPlanType] = useState<'normal' | 'personal' | 'both'>('normal');
    const [selectedCategory, setSelectedCategory] = useState<PlanCategory>('mensal');
    const [planId, setPlanId] = useState('');
    const [dueDay, setDueDay] = useState(5);
    const [startDate, setStartDate] = useState(getTodayDateString());
    const [nextDue, setNextDue] = useState(getTodayDateString());
    const [commitmentStartDate, setCommitmentStartDate] = useState(getTodayDateString());
    const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo');

    // Personal fields
    const [personalPlanId, setPersonalPlanId] = useState('');
    const [personalClassesRemaining, setPersonalClassesRemaining] = useState(0);

    // 1º Pagamento na matrícula (apenas novo aluno)
    const [hasPaidFirstMonth, setHasPaidFirstMonth] = useState(true);
    const [firstPaymentMethod, setFirstPaymentMethod] = useState<Payment['method']>('PIX');

    // Dados complementares
    const [showExtraDetails, setShowExtraDetails] = useState(false);
    const [graduation, setGraduation] = useState('Sem graduação');
    const [birthDate, setBirthDate] = useState('');
    const [responsibleName, setResponsibleName] = useState('');
    const [email, setEmail] = useState('');
    const [cpf, setCpf] = useState('');
    const [cep, setCep] = useState('');
    const [address, setAddress] = useState('');
    const [notes, setNotes] = useState('');

    const [isFetchingCep, setIsFetchingCep] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Inicializa SOMENTE ao abrir o modal ou trocar o aluno sendo editado
    // Evita o bug antigo onde o useLiveQuery resetava o plano selecionado no meio do preenchimento
    useEffect(() => {
        if (!isOpen) {
            initializedSessionRef.current = null;
            return;
        }

        const sessionKey = studentToEdit ? `edit:${studentToEdit.id}` : 'new';
        if (initializedSessionRef.current === sessionKey) return;
        initializedSessionRef.current = sessionKey;

        const today = getTodayDateString();
        if (studentToEdit) {
            const matchedPlan = plans.find((p) => p.id === studentToEdit.plan);
            const cat = inferPlanCategory(matchedPlan || { name: studentToEdit.plan });

            setName(studentToEdit.name || '');
            setPhone(studentToEdit.phone || '');
            setPlanType(studentToEdit.planType || 'normal');
            setSelectedCategory(cat);
            setPlanId(studentToEdit.plan || getDefaultPlanId(plans));
            setDueDay(studentToEdit.dueDay || 5);
            setStartDate(studentToEdit.startDate || today);
            setNextDue(studentToEdit.nextDue || today);
            setCommitmentStartDate(studentToEdit.commitmentStartDate || studentToEdit.startDate || today);
            setStatus(studentToEdit.status || 'ativo');
            setPersonalPlanId(studentToEdit.personalPlanId || personalPlans[0]?.id || '');
            setPersonalClassesRemaining(studentToEdit.personalClassesRemaining ?? 0);

            setGraduation(studentToEdit.graduation || 'Sem graduação');
            setBirthDate(studentToEdit.birthDate || '');
            setResponsibleName(studentToEdit.responsibleName || '');
            setEmail(studentToEdit.email || '');
            setCpf(studentToEdit.cpf || '');
            setCep(studentToEdit.cep || '');
            setAddress(studentToEdit.address || '');
            setNotes(studentToEdit.notes || '');
            setHasPaidFirstMonth(false);
            setShowExtraDetails(
                Boolean(
                    studentToEdit.birthDate ||
                    studentToEdit.cpf ||
                    studentToEdit.address ||
                    studentToEdit.responsibleName ||
                    studentToEdit.notes
                )
            );
        } else {
            const defId = getDefaultPlanId(plans);
            const defPlan = plans.find((p) => p.id === defId);

            setName('');
            setPhone('');
            setPlanType('normal');
            setSelectedCategory(inferPlanCategory(defPlan));
            setPlanId(defId);
            setDueDay(5);
            setStartDate(today);
            setNextDue(calculateInitialDueDate(today, 5, true, getBillingDurationMonths(defPlan)));
            setCommitmentStartDate(today);
            setStatus('ativo');
            setPersonalPlanId(personalPlans[0]?.id || '');
            setPersonalClassesRemaining(personalPlans[0]?.totalClasses || 4);

            setGraduation('Sem graduação');
            setBirthDate('');
            setResponsibleName('');
            setEmail('');
            setCpf('');
            setCep('');
            setAddress('');
            setNotes('');
            setHasPaidFirstMonth(true);
            setFirstPaymentMethod('PIX');
            setShowExtraDetails(false);
        }
    }, [isOpen, studentToEdit, plans, personalPlans]);

    const availableCategories = useMemo(() => {
        const order: PlanCategory[] = ['mensal', 'trimestral', 'semestral', 'anual', 'outro'];
        const existing = new Set(plans.map((p) => inferPlanCategory(p)));
        return order.filter((c) => existing.has(c));
    }, [plans]);

    const plansInCategory = useMemo(
        () => plans.filter((p) => inferPlanCategory(p) === selectedCategory),
        [plans, selectedCategory]
    );

    const selectedPlan = useMemo(
        () => plans.find((p) => p.id === planId) || null,
        [plans, planId]
    );

    // Pré-visualização automática do próximo vencimento ao cadastrar novo aluno
    const previewNextDue = useMemo(() => {
        if (studentToEdit) return nextDue;
        if (planType === 'personal') return startDate;
        return calculateInitialDueDate(
            startDate,
            dueDay,
            hasPaidFirstMonth,
            getBillingDurationMonths(selectedPlan)
        );
    }, [studentToEdit, nextDue, planType, startDate, dueDay, hasPaidFirstMonth, selectedPlan]);

    // Alerta preventivo de nome duplicado
    const duplicateCandidate = useMemo(() => {
        const normalized = name.trim().toLowerCase().replace(/\s+/g, ' ');
        if (normalized.length < 3) return null;
        return (
            existingStudents.find(
                (s) =>
                    s.id !== studentToEdit?.id &&
                    s.name.trim().toLowerCase().replace(/\s+/g, ' ') === normalized
            ) || null
        );
    }, [name, existingStudents, studentToEdit]);

    const handleSelectCategory = (cat: PlanCategory) => {
        setSelectedCategory(cat);
        const firstInCat = plans.find((p) => inferPlanCategory(p) === cat);
        if (firstInCat) {
            setPlanId(firstInCat.id);
        }
    };

    const handlePersonalPackageChange = (id: string) => {
        setPersonalPlanId(id);
        const found = personalPlans.find((p) => p.id === id);
        if (found && !studentToEdit) {
            setPersonalClassesRemaining(found.totalClasses);
        }
    };

    const handleLookupCep = async () => {
        const digits = cep.replace(/\D/g, '');
        if (digits.length !== 8) {
            showToast('warning', 'Digite um CEP válido com 8 dígitos.');
            return;
        }
        setIsFetchingCep(true);
        try {
            const resp = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
            const data = await resp.json();
            if (data.erro) {
                showToast('warning', 'CEP não encontrado.');
            } else {
                const formatted = [data.logradouro, data.bairro, `${data.localidade}/${data.uf}`]
                    .filter(Boolean)
                    .join(' - ');
                setAddress(formatted);
            }
        } catch {
            showToast('error', 'Falha ao consultar CEP.');
        } finally {
            setIsFetchingCep(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            showToast('warning', 'Informe o nome completo do aluno.');
            return;
        }
        if (!phone.trim()) {
            showToast('warning', 'Informe o WhatsApp / telefone do aluno.');
            return;
        }

        setIsSaving(true);
        try {
            const resolvedPlanId =
                planType === 'personal' ? 'personal-only' : planId || getDefaultPlanId(plans);
            const finalNextDue = studentToEdit ? nextDue : previewNextDue;

            const shouldCreateInitialPayment = !studentToEdit && planType !== 'personal' && hasPaidFirstMonth && selectedPlan;

            await saveStudent(
                {
                    id: studentToEdit?.id,
                    name: name.trim(),
                    phone: phone.trim(),
                    plan: resolvedPlanId,
                    planType,
                    dueDay,
                    startDate,
                    nextDue: finalNextDue,
                    commitmentStartDate: commitmentStartDate || startDate,
                    status,
                    personalPlanId: planType !== 'normal' ? personalPlanId : undefined,
                    personalClassesRemaining: planType !== 'normal' ? personalClassesRemaining : 0,
                    personalStartDate:
                        planType !== 'normal'
                            ? studentToEdit?.personalStartDate || startDate
                            : undefined,
                    graduation,
                    birthDate: birthDate || undefined,
                    responsibleName: responsibleName.trim() || undefined,
                    email: email.trim() || undefined,
                    cpf: cpf.trim() || undefined,
                    cep: cep.trim() || undefined,
                    address: address.trim() || undefined,
                    notes: notes.trim() || undefined,
                },
                shouldCreateInitialPayment
                    ? {
                          amount: selectedPlan!.price,
                          method: firstPaymentMethod,
                          date: getTodayDateString(),
                          referenceMonth: getYearMonth(startDate),
                          type: 'pagamento',
                          itemDescription: `Matrícula - ${selectedPlan!.name}`,
                      }
                    : null
            );

            showToast(
                'success',
                studentToEdit
                    ? `Cadastro de ${name.trim()} atualizado!`
                    : `${name.trim()} matriculado com sucesso!`
            );
            onClose();
        } catch {
            showToast('error', 'Erro ao salvar cadastro do aluno.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const commitmentMonths = getCommitmentMonths(selectedPlan);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box max-w-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                            {studentToEdit ? `Editar: ${studentToEdit.name}` : 'Novo Aluno'}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {studentToEdit
                                ? 'Atualize plano, vencimento ou informações do aluno'
                                : 'Cadastro rápido em 2 passos simples'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="modal-body">
                        {/* Aviso de duplicidade */}
                        {duplicateCandidate && (
                            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <strong>Atenção:</strong> já existe um aluno chamado{' '}
                                    <strong>{duplicateCandidate.name}</strong> ({duplicateCandidate.phone || 'sem telefone'}).
                                    Verifique se não é um cadastro repetido.
                                </div>
                            </div>
                        )}

                        {/* 1. Dados Básicos */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div>
                                <label className="label" htmlFor="st-name">
                                    Nome Completo *
                                </label>
                                <input
                                    id="st-name"
                                    type="text"
                                    required
                                    autoFocus={!studentToEdit}
                                    placeholder="Ex: João Pedro Silva"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="label" htmlFor="st-phone">
                                    WhatsApp / Celular *
                                </label>
                                <input
                                    id="st-phone"
                                    type="tel"
                                    required
                                    placeholder="(11) 99999-9999"
                                    value={phone}
                                    onChange={(e) => setPhone(formatPhoneMask(e.target.value))}
                                    className="input"
                                />
                            </div>
                        </div>

                        {/* 2. Modalidade */}
                        <div>
                            <span className="label">Tipo de Matrícula</span>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'normal', label: 'Plano Turma' },
                                    { id: 'both', label: 'Turma + Personal' },
                                    { id: 'personal', label: 'Só Personal' },
                                ].map((opt) => (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => setPlanType(opt.id as typeof planType)}
                                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                                            planType === opt.id
                                                ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 3. Seletor Visual de Planos por Categoria (previne confusão Trimestral vs Semestral) */}
                        {planType !== 'personal' && (
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                        1. Escolha a Duração / Fidelidade
                                    </span>
                                    {selectedPlan && (
                                        <span className="badge badge-info">
                                            Selecionado: {selectedPlan.name}
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                    {availableCategories.map((cat) => {
                                        const active = selectedCategory === cat;
                                        return (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => handleSelectCategory(cat)}
                                                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                                                    active
                                                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-sm'
                                                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                                }`}
                                            >
                                                {getCategoryShortLabel(cat)}
                                                {cat === 'trimestral' && ' (3m)'}
                                                {cat === 'semestral' && ' (6m)'}
                                                {cat === 'anual' && ' (12m)'}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {plansInCategory.map((plan) => {
                                        const isSelected = planId === plan.id;
                                        return (
                                            <button
                                                key={plan.id}
                                                type="button"
                                                onClick={() => setPlanId(plan.id)}
                                                className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                                                    isSelected
                                                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/20'
                                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                                }`}
                                            >
                                                <div className="min-w-0">
                                                    <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                                        {plan.name}
                                                    </div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                                        {formatCurrencyBRL(plan.price)} / mês
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0">
                                                        <Check className="w-3.5 h-3.5" />
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {commitmentMonths > 1 && (
                                    <div className="flex items-start gap-2 text-xs text-violet-800 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/60 p-2.5 rounded-xl">
                                        <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                                        <span>
                                            <strong>Plano com fidelidade de {commitmentMonths} meses:</strong>{' '}
                                            a cobrança continua mensal (R$ {selectedPlan?.price.toFixed(2).replace('.', ',')}/mês), e o sistema acompanha as {commitmentMonths} parcelas do contrato automaticamente.
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 4. Pacote Personal (quando aplicável) */}
                        {planType !== 'normal' && (
                            <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/60 space-y-3">
                                <div className="text-xs font-bold uppercase tracking-wider text-sky-900 dark:text-sky-200">
                                    Configuração do Personal
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="label">Pacote Personal</label>
                                        <select
                                            value={personalPlanId}
                                            onChange={(e) => handlePersonalPackageChange(e.target.value)}
                                            onWheel={(e) => e.currentTarget.blur()}
                                            className="input"
                                        >
                                            {personalPlans.map((pp) => (
                                                <option key={pp.id} value={pp.id}>
                                                    {pp.name} ({pp.totalClasses} aulas - {formatCurrencyBRL(pp.price)})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Saldo de Aulas</label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={personalClassesRemaining}
                                            onChange={(e) =>
                                                setPersonalClassesRemaining(Math.max(0, parseInt(e.target.value, 10) || 0))
                                            }
                                            onWheel={(e) => e.currentTarget.blur()}
                                            className="input"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 5. Vencimento e Matrícula */}
                        {planType !== 'personal' && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-start">
                                <div>
                                    <span className="label">Dia de Vencimento</span>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {DUE_OPTIONS.map((d) => (
                                            <button
                                                key={d}
                                                type="button"
                                                onClick={() => setDueDay(d)}
                                                className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                                                    dueDay === d
                                                        ? 'bg-rose-600 text-white border-rose-600'
                                                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                                }`}
                                            >
                                                Dia {d}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="label" htmlFor="st-start">
                                        Data de Início
                                    </label>
                                    <input
                                        id="st-start"
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="input"
                                    />
                                </div>

                                <div>
                                    <label className="label" htmlFor="st-nextdue">
                                        Próximo Vencimento
                                    </label>
                                    {studentToEdit ? (
                                        <input
                                            id="st-nextdue"
                                            type="date"
                                            value={nextDue}
                                            onChange={(e) => setNextDue(e.target.value)}
                                            className="input"
                                        />
                                    ) : (
                                        <div className="input bg-slate-50 dark:bg-slate-800/60 flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                                            <Calendar className="w-4 h-4 text-rose-500" />
                                            {formatDateBR(previewNextDue)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Checkbox de 1º pagamento (apenas cadastro novo) */}
                        {!studentToEdit && planType !== 'personal' && (
                            <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <label className="flex items-center gap-2.5 text-sm font-semibold text-emerald-900 dark:text-emerald-200 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={hasPaidFirstMonth}
                                        onChange={(e) => setHasPaidFirstMonth(e.target.checked)}
                                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span>
                                        Já pagou a 1ª mensalidade ({selectedPlan ? formatCurrencyBRL(selectedPlan.price) : ''}) agora?
                                    </span>
                                </label>

                                {hasPaidFirstMonth && (
                                    <select
                                        value={firstPaymentMethod}
                                        onChange={(e) => setFirstPaymentMethod(e.target.value as Payment['method'])}
                                        className="input sm:w-44 py-1.5 text-xs font-semibold"
                                    >
                                        {PAYMENT_METHODS.map((m) => (
                                            <option key={m} value={m}>
                                                {m}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        )}

                        {/* Status na edição */}
                        {studentToEdit && (
                            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                                <div>
                                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                                        Situação da Matrícula
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        Alunos inativos não entram nos alertas de cobrança
                                    </div>
                                </div>
                                <div className="flex gap-1.5">
                                    {(['ativo', 'inativo'] as const).map((st) => (
                                        <button
                                            key={st}
                                            type="button"
                                            onClick={() => setStatus(st)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize border ${
                                                status === st
                                                    ? st === 'ativo'
                                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                                        : 'bg-slate-700 text-white border-slate-700'
                                                    : 'bg-white dark:bg-slate-900 text-slate-600 border-slate-200 dark:border-slate-700'
                                            }`}
                                        >
                                            {st}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Seção Opcional Colapsável */}
                        <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowExtraDetails((v) => !v)}
                                className="w-full py-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                            >
                                <span>Dados Complementares (Graduação, Aniversário, CPF, Endereço)</span>
                                {showExtraDetails ? (
                                    <ChevronUp className="w-4 h-4" />
                                ) : (
                                    <ChevronDown className="w-4 h-4" />
                                )}
                            </button>

                            {showExtraDetails && (
                                <div className="pt-3 space-y-3.5 animate-fade-in">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label className="label">Graduação / Grau</label>
                                            <select
                                                value={graduation}
                                                onChange={(e) => setGraduation(e.target.value)}
                                                className="input"
                                            >
                                                {GRADUATIONS.map((g) => (
                                                    <option key={g} value={g}>
                                                        {g}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="label">Nascimento</label>
                                            <input
                                                type="date"
                                                value={birthDate}
                                                onChange={(e) => setBirthDate(e.target.value)}
                                                className="input"
                                            />
                                        </div>
                                        <div>
                                            <label className="label">CPF</label>
                                            <input
                                                type="text"
                                                placeholder="000.000.000-00"
                                                value={cpf}
                                                onChange={(e) => setCpf(e.target.value)}
                                                className="input"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="label">Responsável (se menor)</label>
                                            <input
                                                type="text"
                                                placeholder="Nome do pai/mãe"
                                                value={responsibleName}
                                                onChange={(e) => setResponsibleName(e.target.value)}
                                                className="input"
                                            />
                                        </div>
                                        <div>
                                            <label className="label">E-mail</label>
                                            <input
                                                type="email"
                                                placeholder="aluno@email.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="input"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label className="label">CEP</label>
                                            <div className="flex gap-1.5">
                                                <input
                                                    type="text"
                                                    placeholder="00000-000"
                                                    value={cep}
                                                    onChange={(e) => setCep(e.target.value)}
                                                    className="input"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleLookupCep}
                                                    disabled={isFetchingCep}
                                                    className="btn btn-secondary px-3"
                                                    title="Buscar endereço pelo CEP"
                                                >
                                                    <Search className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="label">Endereço Completo</label>
                                            <input
                                                type="text"
                                                placeholder="Rua, número, bairro..."
                                                value={address}
                                                onChange={(e) => setAddress(e.target.value)}
                                                className="input"
                                            />
                                        </div>
                                    </div>

                                    {commitmentMonths > 1 && (
                                        <div>
                                            <label className="label">Início do Ciclo de Fidelidade</label>
                                            <input
                                                type="date"
                                                value={commitmentStartDate}
                                                onChange={(e) => setCommitmentStartDate(e.target.value)}
                                                className="input sm:w-52"
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="label">Observações / Saúde</label>
                                        <textarea
                                            rows={2}
                                            placeholder="Restrições médicas, horários preferidos, observações..."
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            className="input"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn btn-secondary">
                            Cancelar
                        </button>
                        <button type="submit" disabled={isSaving} className="btn btn-primary">
                            <Check className="w-4 h-4" />
                            {isSaving
                                ? 'Salvando...'
                                : studentToEdit
                                    ? 'Salvar Alterações'
                                    : 'Cadastrar Aluno'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
