import React, { useMemo, useState } from 'react';
import { Plus, Edit3, Trash2, Check, X } from 'lucide-react';
import { Plan, PlanCategory } from '../../types';
import { usePlans, useStudents } from '../../hooks/useGymStore';
import { formatCurrencyBRL } from '../../utils/dateUtils';
import {
    getCategoryLabel,
    getCategoryShortLabel,
    getCommitmentMonths,
    inferPlanCategory,
} from '../../utils/planUtils';
import { savePlan, softDeletePlan } from '../../services/dataAccess';
import { ConfirmModal } from '../UI';
import { useToast } from '../../contexts/ToastContext';

export function PlanManager() {
    const plans = usePlans();
    const students = useStudents();
    const { showToast } = useToast();

    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [showForm, setShowForm] = useState(false);

    const [name, setName] = useState('');
    const [category, setCategory] = useState<PlanCategory>('mensal');
    const [price, setPrice] = useState('');
    const [frequency, setFrequency] = useState('3');
    const [commitmentMonths, setCommitmentMonths] = useState('1');
    const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);

    const activeCountByPlan = useMemo(() => {
        const map = new Map<string, number>();
        students
            .filter((s) => s.status === 'ativo' && s.planType !== 'personal')
            .forEach((s) => map.set(s.plan, (map.get(s.plan) || 0) + 1));
        return map;
    }, [students]);

    const openNewForm = () => {
        setEditingPlan(null);
        setName('');
        setCategory('mensal');
        setPrice('');
        setFrequency('3');
        setCommitmentMonths('1');
        setShowForm(true);
    };

    const openEditForm = (p: Plan) => {
        const cat = inferPlanCategory(p);
        setEditingPlan(p);
        setName(p.name);
        setCategory(cat);
        setPrice(String(p.price));
        setFrequency(String(p.frequency));
        setCommitmentMonths(String(getCommitmentMonths(p)));
        setShowForm(true);
    };

    const handleCategoryChange = (nextCat: PlanCategory) => {
        setCategory(nextCat);
        if (nextCat === 'trimestral') setCommitmentMonths('3');
        else if (nextCat === 'semestral') setCommitmentMonths('6');
        else if (nextCat === 'anual') setCommitmentMonths('12');
        else setCommitmentMonths('1');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numPrice = parseFloat(price.replace(',', '.'));
        if (!name.trim() || !Number.isFinite(numPrice) || numPrice <= 0) {
            showToast('warning', 'Informe nome e valor mensal válido.');
            return;
        }

        await savePlan({
            id: editingPlan?.id,
            name: name.trim(),
            category,
            price: numPrice,
            frequency: parseInt(frequency, 10) || 1,
            durationMonths: 1, // Cobrança mensal mesmo nos planos com fidelidade
            commitmentMonths: parseInt(commitmentMonths, 10) || 1,
            sortOrder: editingPlan?.sortOrder,
        });

        showToast('success', editingPlan ? 'Plano atualizado!' : 'Plano criado!');
        setShowForm(false);
        setEditingPlan(null);
    };

    const handleConfirmDelete = async () => {
        if (!planToDelete) return;
        await softDeletePlan(planToDelete.id);
        showToast('success', `Plano "${planToDelete.name}" excluído.`);
        setPlanToDelete(null);
    };

    return (
        <div className="card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                        Planos de Mensalidade &amp; Fidelidade
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Planos Trimestrais e Semestrais cobram mensalmente e controlam o prazo de fidelidade
                    </p>
                </div>

                {!showForm && (
                    <button type="button" onClick={openNewForm} className="btn btn-primary btn-sm">
                        <Plus className="w-4 h-4" />
                        Novo Plano
                    </button>
                )}
            </div>

            {showForm && (
                <form
                    onSubmit={handleSubmit}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-800 dark:text-white">
                            {editingPlan ? `Editando: ${editingPlan.name}` : 'Cadastrar Novo Plano'}
                        </span>
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="p-1 text-slate-400 hover:text-slate-700"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="sm:col-span-2">
                            <label className="label">Nome do Plano *</label>
                            <input
                                type="text"
                                required
                                placeholder="Ex: Trimestral 3x, 2x por semana..."
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="input"
                            />
                        </div>

                        <div>
                            <label className="label">Categoria</label>
                            <select
                                value={category}
                                onChange={(e) => handleCategoryChange(e.target.value as PlanCategory)}
                                className="input"
                            >
                                {(['mensal', 'trimestral', 'semestral', 'anual', 'outro'] as PlanCategory[]).map(
                                    (c) => (
                                        <option key={c} value={c}>
                                            {getCategoryLabel(c)}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="label">Valor Mensal (R$) *</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                required
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                onWheel={(e) => e.currentTarget.blur()}
                                className="input"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                        <div>
                            <label className="label">Treinos na Semana</label>
                            <select
                                value={frequency}
                                onChange={(e) => setFrequency(e.target.value)}
                                className="input"
                            >
                                <option value="1">1x por semana</option>
                                <option value="2">2x por semana</option>
                                <option value="3">3x por semana</option>
                                <option value="4">4x por semana</option>
                                <option value="5">5x por semana</option>
                                <option value="100">Livre (todos os dias)</option>
                                <option value="999">Livre Plus (2x/dia)</option>
                            </select>
                        </div>

                        <div>
                            <label className="label">Fidelidade (Meses)</label>
                            <input
                                type="number"
                                min="1"
                                max="24"
                                value={commitmentMonths}
                                onChange={(e) => setCommitmentMonths(e.target.value)}
                                className="input"
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="btn btn-secondary btn-sm"
                            >
                                Cancelar
                            </button>
                            <button type="submit" className="btn btn-success btn-sm">
                                <Check className="w-4 h-4" />
                                Salvar Plano
                            </button>
                        </div>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {plans.map((plan) => {
                    const cat = inferPlanCategory(plan);
                    const commit = getCommitmentMonths(plan);
                    const activeCount = activeCountByPlan.get(plan.id) || 0;
                    return (
                        <div
                            key={plan.id}
                            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between gap-3"
                        >
                            <div>
                                <div className="flex items-start justify-between gap-2">
                                    <span className="badge badge-neutral">
                                        {getCategoryShortLabel(cat)}
                                        {commit > 1 ? ` • ${commit}m` : ''}
                                    </span>
                                    <span className="text-[11px] font-semibold text-slate-400">
                                        {activeCount} aluno(s)
                                    </span>
                                </div>
                                <div className="font-bold text-slate-900 dark:text-white mt-2">
                                    {plan.name}
                                </div>
                                <div className="font-display text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                    {formatCurrencyBRL(plan.price)}
                                    <span className="text-xs font-normal text-slate-400"> /mês</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => openEditForm(plan)}
                                    className="btn btn-ghost btn-sm"
                                >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    Editar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPlanToDelete(plan)}
                                    className="btn btn-ghost btn-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <ConfirmModal
                isOpen={Boolean(planToDelete)}
                title="Excluir Plano"
                message={
                    (activeCountByPlan.get(planToDelete?.id || '') || 0) > 0
                        ? `Existem ${activeCountByPlan.get(planToDelete?.id || '')} aluno(s) ativo(s) vinculados ao plano "${planToDelete?.name}". Tem certeza que deseja remover este plano da lista?`
                        : `Deseja excluir o plano "${planToDelete?.name}"?`
                }
                confirmText="Excluir"
                onConfirm={handleConfirmDelete}
                onCancel={() => setPlanToDelete(null)}
            />
        </div>
    );
}
