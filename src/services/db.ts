import Dexie, { EntityTable } from 'dexie';
import { Student, Payment, Attendance, Expense, DailyNote, Plan } from '../types';
import { loadData } from './storage';

// Define default plans
const DEFAULT_PLANS: Plan[] = [
    { id: '1x', name: '1x por semana', price: 115, frequency: 1, durationMonths: 1 },
    { id: '2x', name: '2x por semana', price: 134, frequency: 2, durationMonths: 1 },
    { id: '3x', name: '3x por semana', price: 145, frequency: 3, durationMonths: 1 },
    { id: 'livre', name: 'Livre (todos os dias)', price: 165, frequency: 99, durationMonths: 1 },
    { id: 'plus', name: 'Plus (até 2 treinos/dia)', price: 200, frequency: 999, durationMonths: 1 }
];

// Define an interface for the database structure if using EntityTable
interface GymDatabaseInfo extends Dexie {
    students: EntityTable<Student, 'id'>;
    payments: EntityTable<Payment, 'id'>;
    attendance: EntityTable<Attendance, 'id'>;
    expenses: EntityTable<Expense, 'id'>;
    dailyNotes: EntityTable<DailyNote, 'id'>;
    settings: EntityTable<{ key: string; value: any }, 'key'>;
    plans: EntityTable<Plan, 'id'>; // New Table
}

class GymDatabase extends Dexie implements GymDatabaseInfo {
    students!: EntityTable<Student, 'id'>;
    payments!: EntityTable<Payment, 'id'>;
    attendance!: EntityTable<Attendance, 'id'>;
    expenses!: EntityTable<Expense, 'id'>;
    dailyNotes!: EntityTable<DailyNote, 'id'>;
    settings!: EntityTable<{ key: string; value: any }, 'key'>;
    plans!: EntityTable<Plan, 'id'>;

    constructor() {
        super('GymDatabase');

        // Versão 3: Adicionando tabela de planos
        this.version(3).stores({
            students: 'id, name, status, plan, nextDue, responsibleName', // Added responsibleName index
            payments: 'id, studentId, date, referenceMonth',
            attendance: 'id, studentId, date',
            expenses: 'id, date, category',
            dailyNotes: 'id, date',
            settings: 'key',
            plans: 'id, name' // New store
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
            const count = await this.plans.count();
            if (count === 0) {
                await this.plans.bulkAdd(DEFAULT_PLANS);
                console.log('Default plans populated');
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
