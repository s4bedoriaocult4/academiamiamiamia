// Tipos principais do sistema

export interface Student {
    id: string;
    name: string;
    phone: string;
    email?: string;
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
}

export interface Payment {
    id: string;
    studentId: string;
    studentName: string;
    amount: number;
    method: 'PIX' | 'Dinheiro' | 'Cartão Crédito' | 'Link Pagamento';
    date: string;
    referenceMonth: string;
    createdAt: string;
}

export interface Attendance {
    id: string;
    studentId: string;
    studentName: string;
    date: string;
    createdAt: string;
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

export interface AppData {
    students: Student[];
    payments: Payment[];
    attendance: Attendance[];
    expenses: Expense[];
    dailyNotes: DailyNote[];
    darkMode: boolean;
    version: number;
    lastModified: string;
    lastBackup?: string;
}

// Graduações do Muay Thai (Prajied)
export const GRADUATIONS = [
    'Branca',
    'Branca Ponta Vermelha',
    'Vermelha',
    'Vermelha Ponta Azul Escuro',
    'Azul Escuro',
    'Azul Escuro Ponta Azul Claro',
    'Azul Claro',
    'Azul Claro Ponta Verde',
    'Verde',
    'Verde Ponta Preta',
    'Preta'
];

// Dias de vencimento disponíveis
export const DUE_OPTIONS = [5, 10, 15, 20];

// Métodos de pagamento
export const PAYMENT_METHODS = ['PIX', 'Dinheiro', 'Cartão Crédito', 'Link Pagamento'] as const;

// Categorias de despesas
export const EXPENSE_CATEGORIES = ['Aluguel', 'Luz', 'Água', 'Equipamentos', 'Marketing', 'Manutenção', 'Outros'] as const;
