import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Check, X } from 'lucide-react';
import { PersonalPlan } from '../../types';
import { usePersonalPlans } from '../../hooks/useGymStore';
import { formatCurrencyBRL } from '../../utils/dateUtils';
import { savePersonalPlan, softDeletePersonalPlan } from '../../services/dataAccess';
import { ConfirmModal } from '../UI';
import { useToast } from '../../contexts/ToastContext';

export function PersonalPlanManager() {
    const personalPlans = usePersonalPlans();
    const { showToast } = useToast();

    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<PersonalPlan | null>(null);
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [totalClasses, setTotalClasses] = useState('4');
    const [freqPerWeek, setFreqPerWeek] = useState('1');
    const [planToDelete, setPlanToDelete] = useState<PersonalPlan | null>(null);

    const openNew = () => {
        setEditing(null);
        setName('');
        setPrice('');
        setTotalClasses('4');
        setFreqPerWeek('1');
        setShowForm(true);
    };

    const openEdit = (p: PersonalPlan) => {
        setEditing(p);
        setName(p.name);
        setPrice(String(p.price));
        setTotalClasses(String(p.totalClasses));
        setFreqPerWeek(String(p.frequencyPerWeek));
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numPrice = parseFloat(price.replace(',', '.'));
        const classes = parseInt(totalClasses, 10);
        if (!name.trim() || !Number.isFinite(numPrice) || numPrice <= 0 || !classes) {
            showToast('warning', 'Preencha nome, valor e quantidade de aulas.');
            return;
        }

        await savePersonalPlan({
            id: editing?.id,
            name: name.trim(),
            price: numPrice,
            totalClasses: classes,
            frequencyPerWeek: parseInt(freqPerWeek, 10) || 1,
        });

        showToast('success', editing ? 'Pacote atualizado!' : 'Pacote criado!');
        setShowForm(false);
        setEditing(null);
    };

    const handleDelete = async () => {
        if (!planToDelete) return;
        await softDeletePersonalPlan(planToDelete.id);
        showToast('success', 'Pacote Personal removido.');
        setPlanToDelete(null);
    };

    return (
        <div className="card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                        Pacotes de Aulas Personal
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Pacotes vendidos por quantidade de créditos/aulas
                    </p>
                </div>

                {!showForm && (
                    <button type="button" onClick={openNew} className="btn btn-primary btn-sm">
                        <Plus className="w-4 h-4" />
                        Novo Pacote
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
                            {editing ? `Editar: ${editing.name}` : 'Novo Pacote Personal'}
                        </span>
                        <button type="button" onClick={() => setShowForm(false)} className="text-slate-400">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-2">
                            <label className="label">Nome *</label>
                            <input
                                type="text"
                                required
                                placeholder="Ex: Pacote 8 aulas/mês"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="label">Valor (R$) *</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                required
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="label">Qtd. Aulas *</label>
                            <input
                                type="number"
                                min="1"
                                required
                                value={totalClasses}
                                onChange={(e) => setTotalClasses(e.target.value)}
                                className="input"
                            />
                        </div>
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
                            Salvar Pacote
                        </button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {personalPlans.map((p) => (
                    <div
                        key={p.id}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between gap-2"
                    >
                        <div>
                            <div className="badge badge-violet">{p.totalClasses} aulas</div>
                            <div className="font-bold text-sm text-slate-900 dark:text-white mt-2">
                                {p.name}
                            </div>
                            <div className="font-display text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                {formatCurrencyBRL(p.price)}
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <button type="button" onClick={() => openEdit(p)} className="btn btn-ghost btn-sm">
                                <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setPlanToDelete(p)}
                                className="btn btn-ghost btn-sm text-red-500"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <ConfirmModal
                isOpen={Boolean(planToDelete)}
                title="Excluir Pacote Personal"
                message={`Deseja excluir o pacote "${planToDelete?.name}"?`}
                confirmText="Excluir"
                onConfirm={handleDelete}
                onCancel={() => setPlanToDelete(null)}
            />
        </div>
    );
}
