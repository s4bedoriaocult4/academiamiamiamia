// Tipos principais do sistema

export interface Student {
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
    responsibleName?: string; // For minors
    createdAt: string;
    notes?: string;
    // Campos para plano Personal (opcionais para compatibilidade)
    planType?: 'normal' | 'personal' | 'both'; // Tipo de plano do aluno
    personalPlanId?: string; // ID do plano personal (se tiver)
    personalClassesRemaining?: number; // Aulas restantes do pacote personal
    personalStartDate?: string; // Data de início do pacote personal
}

export interface Payment {
    id: string;
    studentId?: string; // Opcional para entradas avulsas
    studentName?: string; // Opcional para entradas avulsas
    amount: number;
    method: 'PIX' | 'Dinheiro' | 'Cartão Crédito' | 'Link Pagamento';
    date: string;
    referenceMonth?: string; // Opcional para entradas
    type?: 'pagamento' | 'entrada' | 'personal' | 'item_vendido'; // 'entrada' = antigo 'item_vendido'
    itemDescription?: string; // Para entradas (antigo item_vendido)
    lateFee?: number;
    createdAt: string;
}

export interface Attendance {
    id: string;
    studentId: string;
    studentName: string;
    date: string;
    createdAt: string;
    attendanceType?: 'normal' | 'personal'; // Tipo de presença (default: 'normal')
}

export interface Expense {
    id: string;
    description: string;
    category: 'Aluguel' | 'Luz' | 'Água' | 'Equipamentos' | 'Marketing' | 'Manutenção' | 'Outros';
    amount: number;
    date: string;
    recurring: boolean;
    createdAt: string;
}

export interface DailyNote {
    id: string;
    date: string;
    content: string;
    createdAt: string;
    updatedAt: string;
}

export interface Plan {
    id: string;
    name: string;
    price: number;
    frequency: number;
    durationMonths?: number;
}

// Novo tipo para planos Personal
export interface PersonalPlan {
    id: string;
    name: string;
    price: number;
    totalClasses: number; // 4, 8, 12 ou 16 aulas
    frequencyPerWeek: number; // 1, 2, 3 ou 99 (livre)
}

// Snapshot mensal - registro imutável de fechamento de mês
export interface MonthlySnapshot {
    id: string;              // Formato: "2026-01" (ano-mês)
    year: number;
    month: number;           // 0-11 (janeiro = 0)
    revenue: number;         // Total de receitas do mês
    expenses: number;        // Total de despesas do mês
    profit: number;          // Receita - Despesas
    activeStudents: number;  // Alunos ativos no fechamento
    overdueCount: number;    // Inadimplentes no fechamento
    attendanceCount: number; // Total de presenças do mês
    closedAt: string;        // Data/hora do fechamento automático
}

export interface AppData {
    students: Student[];
    payments: Payment[];
    attendance: Attendance[];
    expenses: Expense[];
    dailyNotes: DailyNote[];
    plans?: Plan[]; // Added for backup
    personalPlans?: PersonalPlan[]; // Added for backup
    monthlySnapshots?: MonthlySnapshot[]; // Histórico mensal imutável
    settings?: { key: string; value: any }[]; // Configurações completas
    gymName?: string;
    gymLogo?: string;
    darkMode: boolean;
    version: number;
    lastModified: string;
    lastBackup?: string;
}

// Graduações do Muay Thai
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
    'Preto-branco'
];

// Dias de vencimento disponíveis
export const DUE_OPTIONS = [5, 10, 15, 20];

// Métodos de pagamento
export const PAYMENT_METHODS = ['PIX', 'Dinheiro', 'Cartão Crédito', 'Link Pagamento'] as const;

// Categorias de despesas
export const EXPENSE_CATEGORIES = ['Aluguel', 'Luz', 'Água', 'Equipamentos', 'Marketing', 'Manutenção', 'Outros'] as const;
