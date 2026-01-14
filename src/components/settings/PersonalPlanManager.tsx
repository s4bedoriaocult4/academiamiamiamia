import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Trash2, Save, X, Edit } from 'lucide-react';
import { db } from '../../services/db';
import { PersonalPlan } from '../../types';

export function PersonalPlanManager() {
    const plans = useLiveQuery(() => db.personalPlans.toArray()) || [];
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<PersonalPlan>>({});
    const [isAdding, setIsAdding] = useState(false);
    const [newPlan, setNewPlan] = useState<Partial<PersonalPlan>>({
        name: '', price: 0, totalClasses: 1, frequencyPerWeek: 1
    });

    const handleEdit = (plan: PersonalPlan) => {
        setEditingId(plan.id);
        setEditForm(plan);
    };

    const handleSave = async () => {
        if (!editingId || !editForm) return;
        try {
            await db.personalPlans.update(editingId, editForm);
            setEditingId(null);
        } catch (error) {
            console.error(error);
            alert('Erro ao atualizar plano');
        }
    };

    const handleAdd = async () => {
        if (!newPlan.name || !newPlan.price || !newPlan.totalClasses) return;

        try {
            await db.personalPlans.add({
                id: Date.now().toString(),
                name: newPlan.name,
                price: Number(newPlan.price),
                totalClasses: Number(newPlan.totalClasses),
                frequencyPerWeek: Number(newPlan.frequencyPerWeek)
            } as PersonalPlan);
            setIsAdding(false);
            setNewPlan({ name: '', price: 0, totalClasses: 1, frequencyPerWeek: 1 });
        } catch (error) {
            console.error(error);
            alert('Erro ao adicionar plano');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir este plano?')) {
            await db.personalPlans.delete(id);
        }
    };

    return (
        <div className="card mt-6">
            <div className="card-header flex justify-between items-center">
                <h3 className="font-bold">Planos Personal (Pacotes)</h3>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="btn btn-sm btn-outline"
                >
                    <Plus size={16} /> Novo Pacote
                </button>
            </div>

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Preço (R$)</th>
                            <th>Aulas no Pacote</th>
                            <th>Frequência</th>
                            <th className="text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Add Row */}
                        {isAdding && (
                            <tr className="bg-blue-50">
                                <td>
                                    <input
                                        className="form-input text-sm"
                                        placeholder="Nome do Plano"
                                        value={newPlan.name}
                                        onChange={e => setNewPlan({ ...newPlan, name: e.target.value })}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        className="form-input text-sm"
                                        placeholder="Preço"
                                        value={newPlan.price}
                                        onChange={e => setNewPlan({ ...newPlan, price: Number(e.target.value) })}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        className="form-input text-sm"
                                        placeholder="Total Aulas"
                                        value={newPlan.totalClasses}
                                        onChange={e => setNewPlan({ ...newPlan, totalClasses: Number(e.target.value) })}
                                    />
                                </td>
                                <td>
                                    <select
                                        className="form-select text-sm"
                                        value={newPlan.frequencyPerWeek}
                                        onChange={e => setNewPlan({ ...newPlan, frequencyPerWeek: Number(e.target.value) })}
                                    >
                                        <option value={1}>1x Semana</option>
                                        <option value={2}>2x Semana</option>
                                        <option value={3}>3x Semana</option>
                                        <option value={99}>Livre</option>
                                    </select>
                                </td>
                                <td className="text-right">
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={handleAdd} className="action-btn success"><Save size={16} /></button>
                                        <button onClick={() => setIsAdding(false)} className="action-btn danger"><X size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {plans.map(plan => (
                            <tr key={plan.id}>
                                <td>
                                    {editingId === plan.id ? (
                                        <input
                                            className="form-input text-sm"
                                            value={editForm.name}
                                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                        />
                                    ) : (
                                        <span className="font-medium">{plan.name}</span>
                                    )}
                                </td>
                                <td>
                                    {editingId === plan.id ? (
                                        <input
                                            type="number"
                                            className="form-input text-sm"
                                            value={editForm.price}
                                            onChange={e => setEditForm({ ...editForm, price: Number(e.target.value) })}
                                        />
                                    ) : (
                                        <span className="font-bold text-gray-700">R$ {plan.price.toFixed(2)}</span>
                                    )}
                                </td>
                                <td>
                                    {editingId === plan.id ? (
                                        <input
                                            type="number"
                                            className="form-input text-sm"
                                            value={editForm.totalClasses}
                                            onChange={e => setEditForm({ ...editForm, totalClasses: Number(e.target.value) })}
                                        />
                                    ) : (
                                        <span className="badge badge-primary">{plan.totalClasses} aulas</span>
                                    )}
                                </td>
                                <td>
                                    {editingId === plan.id ? (
                                        <select
                                            className="form-select text-sm"
                                            value={editForm.frequencyPerWeek}
                                            onChange={e => setEditForm({ ...editForm, frequencyPerWeek: Number(e.target.value) })}
                                        >
                                            <option value={1}>1x Semana</option>
                                            <option value={2}>2x Semana</option>
                                            <option value={3}>3x Semana</option>
                                            <option value={99}>Livre</option>
                                        </select>
                                    ) : (
                                        <span className="text-sm text-gray-600">
                                            {plan.frequencyPerWeek === 99 ? 'Livre' : `${plan.frequencyPerWeek}x / sem`}
                                        </span>
                                    )}
                                </td>
                                <td className="text-right">
                                    <div className="action-buttons justify-end">
                                        {editingId === plan.id ? (
                                            <>
                                                <button onClick={handleSave} className="action-btn success"><Save size={16} /></button>
                                                <button onClick={() => setEditingId(null)} className="action-btn danger"><X size={16} /></button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => handleEdit(plan)} className="action-btn primary"><Edit size={16} /></button>
                                                <button onClick={() => handleDelete(plan.id)} className="action-btn danger"><Trash2 size={16} /></button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {plans.length === 0 && !isAdding && (
                    <div className="text-center p-8 text-gray-500">
                        Nenhum pacote personal cadastrado.
                    </div>
                )}
            </div>
        </div>
    );
}
