import Dexie, { EntityTable } from 'dexie';
import {
    Student,
    Payment,
    Attendance,
    Expense,
    DailyNote,
    Plan,
    PersonalPlan,
    MonthlySnapshot,
    SettingItem,
} from '../types';
import { loadData } from './storage';
import { inferPlanCategory, getCommitmentMonths } from '../utils/planUtils';

// Seed timestamps antigos para que configurações customizadas da nuvem sempre prevaleçam na 1ª sync
const SEED_UPDATED_AT = '2020-01-01T00:00:00.000Z';

// Planos padrão iniciais
export const DEFAULT_PLANS: Plan[] = [
    { id: '1x', name: '1x por semana', category: 'mensal', price: 135, frequency: 1, durationMonths: 1, commitmentMonths: 1, sortOrder: 1, updatedAt: SEED_UPDATED_AT },
    { id: '2x', name: '2x por semana', category: 'mensal', price: 155, frequency: 2, durationMonths: 1, commitmentMonths: 1, sortOrder: 2, updatedAt: SEED_UPDATED_AT },
    { id: '3x', name: '3x por semana', category: 'mensal', price: 170, frequency: 3, durationMonths: 1, commitmentMonths: 1, sortOrder: 3, updatedAt: SEED_UPDATED_AT },
    { id: 'livre', name: 'Livre (todos os dias)', category: 'mensal', price: 185, frequency: 100, durationMonths: 1, commitmentMonths: 1, sortOrder: 4, updatedAt: SEED_UPDATED_AT },
    { id: 'plus', name: 'Livre Plus (até 2 treinos/dia)', category: 'mensal', price: 205, frequency: 999, durationMonths: 1, commitmentMonths: 1, sortOrder: 5, updatedAt: SEED_UPDATED_AT },
];

// Pacotes Personal padrão iniciais
export const DEFAULT_PERSONAL_PLANS: PersonalPlan[] = [
    { id: 'p1x', name: 'Personal 1x/semana', price: 270, totalClasses: 4, frequencyPerWeek: 1, updatedAt: SEED_UPDATED_AT },
    { id: 'p2x', name: 'Personal 2x/semana', price: 500, totalClasses: 8, frequencyPerWeek: 2, updatedAt: SEED_UPDATED_AT },
    { id: 'p3x', name: 'Personal 3x/semana', price: 680, totalClasses: 12, frequencyPerWeek: 3, updatedAt: SEED_UPDATED_AT },
    { id: 'plivre', name: 'Personal 4x/semana', price: 815, totalClasses: 20, frequencyPerWeek: 99, updatedAt: SEED_UPDATED_AT },
];

class GymDatabase extends Dexie {
    students!: EntityTable<Student, 'id'>;
    payments!: EntityTable<Payment, 'id'>;
    attendance!: EntityTable<Attendance, 'id'>;
    expenses!: EntityTable<Expense, 'id'>;
    dailyNotes!: EntityTable<DailyNote, 'id'>;
    settings!: EntityTable<SettingItem, 'key'>;
    plans!: EntityTable<Plan, 'id'>;
    personalPlans!: EntityTable<PersonalPlan, 'id'>;
    monthlySnapshots!: EntityTable<MonthlySnapshot, 'id'>;

    constructor() {
        super('GymDatabase');

        // Versão 7: Metadados de sincronização (updatedAt, deletedAt) e categoria/fidelidade de planos
        this.version(7).stores({
            students: 'id, name, status, plan, nextDue, responsibleName, cpf, cep, planType, personalPlanId, updatedAt, deletedAt',
            payments: 'id, studentId, date, referenceMonth, type, updatedAt, deletedAt',
            attendance: 'id, studentId, date, attendanceType, updatedAt, deletedAt',
            expenses: 'id, date, category, updatedAt, deletedAt',
            dailyNotes: 'id, date, updatedAt, deletedAt',
            settings: 'key, updatedAt',
            plans: 'id, name, category, updatedAt, deletedAt',
            personalPlans: 'id, name, updatedAt, deletedAt',
            monthlySnapshots: 'id, year, month, updatedAt, deletedAt',
        });

        this.version(6).stores({
            students: 'id, name, status, plan, nextDue, responsibleName, cpf, cep, planType, personalPlanId',
            payments: 'id, studentId, date, referenceMonth, type',
            attendance: 'id, studentId, date, attendanceType',
            expenses: 'id, date, category',
            dailyNotes: 'id, date',
            settings: 'key',
            plans: 'id, name',
            personalPlans: 'id, name',
            monthlySnapshots: 'id, year, month',
        });

        this.version(5).stores({
            students: 'id, name, status, plan, nextDue, responsibleName, cpf, cep, planType, personalPlanId',
            payments: 'id, studentId, date, referenceMonth, type',
            attendance: 'id, studentId, date, attendanceType',
            expenses: 'id, date, category',
            dailyNotes: 'id, date',
            settings: 'key',
            plans: 'id, name',
            personalPlans: 'id, name',
        });

        this.version(4).stores({
            students: 'id, name, status, plan, nextDue, responsibleName, cpf, cep',
            payments: 'id, studentId, date, referenceMonth, type',
            attendance: 'id, studentId, date',
            expenses: 'id, date, category',
            dailyNotes: 'id, date',
            settings: 'key',
            plans: 'id, name',
        });

        this.version(3).stores({
            students: 'id, name, status, plan, nextDue, responsibleName',
            payments: 'id, studentId, date, referenceMonth',
            attendance: 'id, studentId, date',
            expenses: 'id, date, category',
            dailyNotes: 'id, date',
            settings: 'key',
            plans: 'id, name',
        });

        this.version(2).stores({
            students: 'id, name, status, plan, nextDue',
            payments: 'id, studentId, date, referenceMonth',
            attendance: 'id, studentId, date',
            expenses: 'id, date, category',
            dailyNotes: 'id, date',
            settings: 'key',
        });

        this.version(1).stores({
            students: 'id, name, status, plan, nextDue',
            payments: 'id, studentId, date, referenceMonth',
            attendance: 'id, studentId, date',
            expenses: 'id, date, category',
            dailyNotes: 'id, date',
            settings: 'key',
        });

        this.on('ready', async () => {
            // Solicita armazenamento persistente para evitar remoção automática pelo navegador
            if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
                navigator.storage.persist().catch(() => {});
            }

            const planCount = await this.plans.count();
            if (planCount === 0) {
                await this.plans.bulkAdd(DEFAULT_PLANS);
            }

            const personalPlanCount = await this.personalPlans.count();
            if (personalPlanCount === 0) {
                await this.personalPlans.bulkAdd(DEFAULT_PERSONAL_PLANS);
            }

            // Integridade v5 (legado)
            const integrityCheckDone = await this.settings.get('v5_integrity_check');
            if (!integrityCheckDone) {
                const students = await this.students.toArray();
                const updates = students
                    .filter((s) => !s.planType)
                    .map((s) => ({ key: s.id, changes: { planType: 'normal' as const } }));

                if (updates.length > 0) {
                    await this.transaction('rw', this.students, async () => {
                        for (const u of updates) {
                            await this.students.update(u.key, u.changes);
                        }
                    });
                }
                await this.settings.put({ key: 'v5_integrity_check', value: true });
            }

            // Integridade v7: garante category, commitmentMonths e updatedAt em dados legados
            const v7Done = await this.settings.get('v7_integrity_check');
            if (!v7Done) {
                await this.transaction(
                    'rw',
                    [
                        this.plans,
                        this.personalPlans,
                        this.students,
                        this.payments,
                        this.attendance,
                        this.expenses,
                        this.dailyNotes,
                        this.monthlySnapshots,
                    ],
                    async () => {
                        const plans = await this.plans.toArray();
                        for (const plan of plans) {
                            const inferredCat = inferPlanCategory(plan);
                            const inferredCommit = getCommitmentMonths(plan);
                            if (!plan.category || !plan.commitmentMonths || !plan.updatedAt) {
                                await this.plans.update(plan.id, {
                                    category: plan.category || inferredCat,
                                    commitmentMonths: plan.commitmentMonths || inferredCommit,
                                    durationMonths: plan.durationMonths || 1,
                                    // Usa timestamp legado antigo para que dados já sincronizados na nuvem não sejam sobrescritos na 1ª migração
                                    updatedAt: plan.updatedAt || SEED_UPDATED_AT,
                                });
                            }
                        }

                        const stampMissingUpdatedAt = async (table: {
                            toArray: () => Promise<any[]>;
                            update: (key: any, changes: any) => Promise<any>;
                        }) => {
                            const rows = await table.toArray();
                            for (const row of rows) {
                                if (!row.updatedAt) {
                                    await table.update(row.id, { updatedAt: row.createdAt || SEED_UPDATED_AT });
                                }
                            }
                        };

                        await stampMissingUpdatedAt(this.personalPlans);
                        await stampMissingUpdatedAt(this.students);
                        await stampMissingUpdatedAt(this.payments);
                        await stampMissingUpdatedAt(this.attendance);
                        await stampMissingUpdatedAt(this.expenses);
                        await stampMissingUpdatedAt(this.dailyNotes);
                        await stampMissingUpdatedAt(this.monthlySnapshots);
                    }
                );
                await this.settings.put({ key: 'v7_integrity_check', value: true });
            }
        });
    }
}

export const db = new GymDatabase();

export const migrateFromLocalStorage = async () => {
    const hasMigrated = await db.settings.get('migratedFromLocalStorage');
    if (hasMigrated) return;

    const data = loadData();
    if (data.students.length === 0 && data.payments.length === 0 && data.attendance.length === 0) {
        await db.settings.put({ key: 'migratedFromLocalStorage', value: true });
        return;
    }

    try {
        await db.transaction(
            'rw',
            [db.students, db.payments, db.attendance, db.expenses, db.dailyNotes, db.settings],
            async () => {
                if (data.students.length > 0) await db.students.bulkAdd(data.students);
                if (data.payments.length > 0) await db.payments.bulkAdd(data.payments);
                if (data.attendance.length > 0) await db.attendance.bulkAdd(data.attendance);
                if (data.expenses.length > 0) await db.expenses.bulkAdd(data.expenses);
                if (data.dailyNotes.length > 0) await db.dailyNotes.bulkAdd(data.dailyNotes);
                if (data.darkMode) {
                    await db.settings.put({ key: 'darkMode', value: data.darkMode });
                }
                await db.settings.put({ key: 'migratedFromLocalStorage', value: true });
            }
        );
    } catch (error) {
        console.error('Erro na migração:', error);
    }
};
