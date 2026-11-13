// Tipos principais do sistema

export type PlanCategory = 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'outro';

export interface SyncMetadata {
    updatedAt?: string;
    deletedAt?: string | null;
}

export interface Student extends SyncMetadata {
    id: string;
    name: string;
    phone: string;
    email?: string;
    cpf?: string;
    cep?: string;
    address?: string;
    plan: string;
    dueDay: number;
    startDate: string;
    nextDue: string;
    graduation: string;
    status: 'ativo' | 'inativo';
    birthDate?: string;
    responsibleName?: string; // Para menores
    createdAt: string;
    notes?: string;
    // Campos para plano Personal (opcionais para compatibilidade)
    planType?: 'normal' | 'personal' | 'both';
    personalPlanId?: string;
    personalClassesRemaining?: number;
    personalStartDate?: string;
    // Fidelidade (ex: início do ciclo Trimestral/Semestral)
    commitmentStartDate?: string;
}

export interface Payment extends SyncMetadata {
    id: string;
    studentId?: string; // Opcional para entradas avulsas
    studentName?: string; // Opcional para entradas avulsas
    amount: number;
    method: 'PIX' | 'Dinheiro' | 'Cartão Crédito' | 'Link Pagamento';
    date: string;
    referenceMonth?: string; // Opcional para entradas
    type?: 'pagamento' | 'entrada' | 'personal' | 'item_vendido'; // 'entrada' = antigo 'item_vendido'
    itemDescription?: string; // Para entradas
    lateFee?: number;
    personalPlanId?: string; // ID do pacote personal vendido (para reconciliação segura)
    classesAdded?: number; // Quantidade de aulas adicionadas neste pagamento
    createdAt: string;
}

export interface Attendance extends SyncMetadata {
    id: string;
    studentId: string;
    studentName: string;
    date: string;
    createdAt: string;
    attendanceType?: 'normal' | 'personal';
}

export interface Expense extends SyncMetadata {
    id: string;
    description: string;
    category: 'Aluguel' | 'Luz' | 'Água' | 'Equipamentos' | 'Marketing' | 'Manutenção' | 'Outros';
    amount: number;
    date: string;
    recurring: boolean;
    createdAt: string;
}

export interface DailyNote extends SyncMetadata {
    id: string;
    date: string;
    content: string;
    createdAt: string;
    updatedAt: string;
}

export interface Plan extends SyncMetadata {
    id: string;
    name: string;
    category?: PlanCategory;
    price: number;
    frequency: number;
    durationMonths?: number; // Ciclo de cobrança em meses (1 = mensalidade todo mês)
    commitmentMonths?: number; // Fidelidade do contrato (1 = sem fidelidade, 3 = trimestral, 6 = semestral)
    sortOrder?: number;
}

export interface PersonalPlan extends SyncMetadata {
    id: string;
    name: string;
    price: number;
    totalClasses: number;
    frequencyPerWeek: number;
}

export interface MonthlySnapshot extends SyncMetadata {
    id: string; // Formato: "2026-01"
    year: number;
    month: number; // 0-11
    revenue: number;
    expenses: number;
    profit: number;
    activeStudents: number;
    overdueCount: number;
    attendanceCount: number;
    closedAt: string;
}

export interface SettingItem extends SyncMetadata {
    key: string;
    value: any;
}

export interface AppData {
    students: Student[];
    payments: Payment[];
    attendance: Attendance[];
    expenses: Expense[];
    dailyNotes: DailyNote[];
    plans?: Plan[];
    personalPlans?: PersonalPlan[];
    monthlySnapshots?: MonthlySnapshot[];
    settings?: SettingItem[];
    gymName?: string;
    gymLogo?: string;
    darkMode: boolean;
    version: number;
    lastModified: string;
    lastBackup?: string;
}

export type CloudSyncState =
    | 'local-only'
    | 'unauthenticated'
    | 'syncing'
    | 'synced'
    | 'offline'
    | 'error';

export const GRADUATIONS = [
    'Sem graduação',
    'Branco',
    'Amarelo',
    'Amarelo-branco',
    'Verde',
    'Verde-branco',
    'Azul',
    'Azul-branco',
    'Marrom',
    'Marrom-branco',
    'Vermelho',
    'Vermelho-branco',
    'Preto',
    'Preto-branco',
];

export const DUE_OPTIONS = [5, 10, 15, 20];

export const PAYMENT_METHODS = ['PIX', 'Dinheiro', 'Cartão Crédito', 'Link Pagamento'] as const;

export const EXPENSE_CATEGORIES = [
    'Aluguel',
    'Luz',
    'Água',
    'Equipamentos',
    'Marketing',
    'Manutenção',
    'Outros',
] as const;
