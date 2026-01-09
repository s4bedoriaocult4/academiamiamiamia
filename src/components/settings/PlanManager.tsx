import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Edit, Save, X, Plus, Trash2 } from 'lucide-react';
import { db } from '../../services/db';
import { Plan } from '../../types';

export function PlanManager() {
    const plans = useLiveQuery(() => db.plans.toArray()) || [];
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Plan>>({});
    const [isAdding, setIsAdding] = useState(false);
    const [newPlan, setNewPlan] = useState<Partial<Plan>>({
        name: '', price: 0, frequency: 1, durationMonths: 1
    });

    const handleEdit = (plan: Plan) => {
        setEditingId(plan.id);
        setEditForm(plan);
    };

    const handleSave = async () => {
        if (!editingId || !editForm) return;
        try {
            await db.plans.update(editingId, editForm);
            setEditingId(null);
        } catch (error) {
            console.error(error);
            alert('Erro ao atualizar plano');
        }
    };

    const handleAdd = async () => {
        if (!newPlan.name || !newPlan.price) {
            alert('Preencha nome e preço');
            return;
        }
        try {
            await db.plans.add({
                ...newPlan,
                id: Date.now().toString(), // Simple ID gen
                frequency: Number(newPlan.frequency),
                durationMonths: Number(newPlan.durationMonths)
            } as Plan);
            setIsAdding(false);
            setNewPlan({ name: '', price: 0, frequency: 1, durationMonths: 1 });
        } catch (error) {
            console.error(error);
            alert('Erro ao criar plano');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza? Isso não afetará alunos já cadastrados neste plano, mas ele não aparecerá mais para novos alunos.')) {
            await db.plans.delete(id);
        }
    };

    return (
        <div className="card mt-6">
            <div className="card-header flex justify-between items-center">
                <h3 className="font-bold">Gerenciar Planos</h3>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="btn btn-sm btn-outline"
                >
                    <Plus size={16} /> Novo Plano
                </button>
            </div>

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Preço (R$)</th>
                            <th>Frequência (Semanal)</th>
                            <th>Ações</th>
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
                                        placeholder="0.00"
                                        value={newPlan.price}
                                        onChange={e => setNewPlan({ ...newPlan, price: Number(e.target.value) })}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        className="form-input text-sm"
                                        placeholder="1"
                                        value={newPlan.frequency}
                                        onChange={e => setNewPlan({ ...newPlan, frequency: Number(e.target.value) })}
                                    />
                                </td>
                                <td>
                                    <div className="flex gap-2">
                                        <button onClick={handleAdd} className="action-btn success"><Save size={16} /></button>
                                        <button onClick={() => setIsAdding(false)} className="action-btn danger"><X size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {/* List Rows */}
                        {plans.map(plan => (
                            <tr key={plan.id}>
                                <td>
                                    {editingId === plan.id ? (
                                        <input
                                            className="form-input text-sm" // compact
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
                                            value={editForm.frequency}
                                            onChange={e => setEditForm({ ...editForm, frequency: Number(e.target.value) })}
                                        />
                                    ) : (
                                        <span className="badge badge-gray">{plan.frequency}x / sem</span>
                                    )}
                                </td>
                                <td>
                                    <div className="action-buttons">
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
            </div>
        </div>
    );
}
