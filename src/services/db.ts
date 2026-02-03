import Dexie, { EntityTable } from 'dexie';
import { Student, Payment, Attendance, Expense, DailyNote, Plan, PersonalPlan, MonthlySnapshot } from '../types';
import { loadData } from './storage';

// Define default plans
const DEFAULT_PLANS: Plan[] = [
    { id: '1x', name: '1x por semana', price: 115, frequency: 1, durationMonths: 1 },
    { id: '2x', name: '2x por semana', price: 134, frequency: 2, durationMonths: 1 },
    { id: '3x', name: '3x por semana', price: 145, frequency: 3, durationMonths: 1 },
    { id: 'livre', name: 'Livre (todos os dias)', price: 165, frequency: 99, durationMonths: 1 },
    { id: 'plus', name: 'Plus (até 2 treinos/dia)', price: 200, frequency: 999, durationMonths: 1 }
];

// Define default personal plans
const DEFAULT_PERSONAL_PLANS: PersonalPlan[] = [
    { id: 'p1x', name: 'Personal 1x/semana', price: 240, totalClasses: 4, frequencyPerWeek: 1 },
    { id: 'p2x', name: 'Personal 2x/semana', price: 440, totalClasses: 8, frequencyPerWeek: 2 },
    { id: 'p3x', name: 'Personal 3x/semana', price: 600, totalClasses: 12, frequencyPerWeek: 3 },
    { id: 'plivre', name: 'Personal Livre', price: 720, totalClasses: 16, frequencyPerWeek: 99 }
];

// Define an interface for the database structure if using EntityTable
interface GymDatabaseInfo extends Dexie {
    students: EntityTable<Student, 'id'>;
    payments: EntityTable<Payment, 'id'>;
    attendance: EntityTable<Attendance, 'id'>;
    expenses: EntityTable<Expense, 'id'>;
    dailyNotes: EntityTable<DailyNote, 'id'>;
    settings: EntityTable<{ key: string; value: any }, 'key'>;
    plans: EntityTable<Plan, 'id'>;
    personalPlans: EntityTable<PersonalPlan, 'id'>;
    monthlySnapshots: EntityTable<MonthlySnapshot, 'id'>;
}

class GymDatabase extends Dexie implements GymDatabaseInfo {
    students!: EntityTable<Student, 'id'>;
    payments!: EntityTable<Payment, 'id'>;
    attendance!: EntityTable<Attendance, 'id'>;
    expenses!: EntityTable<Expense, 'id'>;
    dailyNotes!: EntityTable<DailyNote, 'id'>;
    settings!: EntityTable<{ key: string; value: any }, 'key'>;
    plans!: EntityTable<Plan, 'id'>;
    personalPlans!: EntityTable<PersonalPlan, 'id'>;
    monthlySnapshots!: EntityTable<MonthlySnapshot, 'id'>;

    constructor() {
        super('GymDatabase');

        // Versão 6: Adicionando suporte a histórico mensal (monthlySnapshots)
        this.version(6).stores({
            students: 'id, name, status, plan, nextDue, responsibleName, cpf, cep, planType, personalPlanId',
            payments: 'id, studentId, date, referenceMonth, type',
            attendance: 'id, studentId, date, attendanceType',
            expenses: 'id, date, category',
            dailyNotes: 'id, date',
            settings: 'key',
            plans: 'id, name',
            personalPlans: 'id, name',
            monthlySnapshots: 'id, year, month'
        });

        // Versão 5: Adicionando suporte a planos Personal
        this.version(5).stores({
            students: 'id, name, status, plan, nextDue, responsibleName, cpf, cep, planType, personalPlanId',
            payments: 'id, studentId, date, referenceMonth, type',
            attendance: 'id, studentId, date, attendanceType',
            expenses: 'id, date, category',
            dailyNotes: 'id, date',
            settings: 'key',
            plans: 'id, name',
            personalPlans: 'id, name'
        });

        // Versão 4: Adicionando campos CPF, CEP, address e suporte a itens vendidos
        this.version(4).stores({
            students: 'id, name, status, plan, nextDue, responsibleName, cpf, cep',
            payments: 'id, studentId, date, referenceMonth, type',
            attendance: 'id, studentId, date',
            expenses: 'id, date, category',
            dailyNotes: 'id, date',
            settings: 'key',
            plans: 'id, name'
        });

        // Versão 3: Adicionando tabela de planos
        this.version(3).stores({
            students: 'id, name, status, plan, nextDue, responsibleName',
            payments: 'id, studentId, date, referenceMonth',
            attendance: 'id, studentId, date',
            expenses: 'id, date, category',
            dailyNotes: 'id, date',
            settings: 'key',
            plans: 'id, name'
        });

        this.version(2).stores({
            students: 'id, name, status, plan, nextDue',
            payments: 'id, studentId, date, referenceMonth',
            attendance: 'id, studentId, date',
            expenses: 'id, date, category',
            dailyNotes: 'id, date',
            settings: 'key'
        });

        this.version(1).stores({
            students: 'id, name, status, plan, nextDue',
            payments: 'id, studentId, date, referenceMonth',
            attendance: 'id, studentId, date',
            expenses: 'id, date, category',
            dailyNotes: 'id, date',
            settings: 'key'
        });

        // Initialize default plans if empty
        this.on('ready', async () => {
            const planCount = await this.plans.count();
            if (planCount === 0) {
                await this.plans.bulkAdd(DEFAULT_PLANS);
                console.log('Default plans populated');
            }

            // Initialize default personal plans if empty
            const personalPlanCount = await this.personalPlans.count();
            if (personalPlanCount === 0) {
                await this.personalPlans.bulkAdd(DEFAULT_PERSONAL_PLANS);
                console.log('Default personal plans populated');
            }

            // Retroactive Data Integrity Check
            // Ensure all students have a valid 'planType' (migration from v4 -> v5 behavior)
            // This is efficient enough to run on ready if we just check for missing fields or do a one-time check based on a setting flag.
            const integrityCheckDone = await this.settings.get('v5_integrity_check');
            if (!integrityCheckDone) {
                console.log('Running v5 Data Integrity Check...');
                const students = await this.students.toArray();
                const updates: { key: string; changes: { planType: string } }[] = [];

                for (const student of students) {
                    if (!student.planType) {
                        updates.push({
                            key: student.id,
                            changes: { planType: 'normal' }
                        });
                    }
                }

                if (updates.length > 0) {
                    await this.transaction('rw', this.students, async () => {
                        for (const update of updates) {
                            await this.students.update(update.key, update.changes as any);
                        }
                    });
                    console.log(`Updated ${updates.length} students with default planType='normal'`);
                }

                await this.settings.put({ key: 'v5_integrity_check', value: true });
            }
        });
    }
}

export const db = new GymDatabase();

// Função de Migração de Dados (LocalStorage -> IndexedDB)
export const migrateFromLocalStorage = async () => {
    const hasMigrated = await db.settings.get('migratedFromLocalStorage');
    if (hasMigrated) return;

    const data = loadData();

    // Se não houver dados relevantes, marcar como migrado e sair
    if (data.students.length === 0 && data.payments.length === 0 && data.attendance.length === 0) {
        await db.settings.put({ key: 'migratedFromLocalStorage', value: true });
        return;
    }

    try {
        await db.transaction('rw', [db.students, db.payments, db.attendance, db.expenses, db.dailyNotes, db.settings], async () => {
            console.log('Iniciando migração de dados...');

            if (data.students.length > 0) await db.students.bulkAdd(data.students);
            if (data.payments.length > 0) await db.payments.bulkAdd(data.payments);
            if (data.attendance.length > 0) await db.attendance.bulkAdd(data.attendance);
            if (data.expenses.length > 0) await db.expenses.bulkAdd(data.expenses);
            if (data.dailyNotes.length > 0) await db.dailyNotes.bulkAdd(data.dailyNotes);

            // Salvar configuração de dark mode se existir
            if (data.darkMode) {
                await db.settings.put({ key: 'darkMode', value: data.darkMode });
            }

            await db.settings.put({ key: 'migratedFromLocalStorage', value: true });
            console.log('Migração concluída com sucesso!');
        });

        // Opcional: Limpar localStorage após sucesso (comentado por segurança inicial)
        // localStorage.removeItem('academia_data'); 

    } catch (error) {
        console.error('Erro na migração:', error);
        alert('Erro ao migrar dados para o novo banco de dados. Seus dados antigos ainda estão seguros.');
    }
};
