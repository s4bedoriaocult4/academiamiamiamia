// Sistema de armazenamento com backup duplo: localStorage + arquivo JSON
import { AppData } from '../types';

const STORAGE_KEY = 'academia_data';
const DATA_VERSION = 1;

// Dados iniciais vazios
export const getEmptyData = (): AppData => ({
    students: [],
    payments: [],
    attendance: [],
    expenses: [],
    dailyNotes: [],
    plans: [],
    personalPlans: [],
    darkMode: false,
    version: DATA_VERSION,
    lastModified: new Date().toISOString()
});

// Carregar dados (Simplified as this file is mostly unused by the new DB approach but good to keep updated)
export const loadData = (): AppData => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored) as AppData;
            return {
                ...getEmptyData(),
                ...data, // merge
                version: DATA_VERSION
            };
        }
    } catch {
        // ignore
    }
    return getEmptyData();
};

export const saveData = (data: AppData): boolean => {
    try {
        const updatedData = { ...data, lastModified: new Date().toISOString() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
        return true;
    } catch (e) {
        return false;
    }
};

export const exportBackup = (data: AppData): boolean => {
    try {
        const date = new Date().toISOString().split('T')[0];
        const filename = `backup_academia_${date}.json`;
        const content = JSON.stringify(data, null, 2);
        const blob = new Blob(['\uFEFF' + content], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
    } catch {
        return false;
    }
};

export const importBackup = (file: File): Promise<AppData> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const data = JSON.parse(content) as AppData;
                resolve(data);
            } catch {
                reject(new Error('Erro ao ler arquivo'));
            }
        };
        reader.readAsText(file);
    });
};

export const clearAllData = (): boolean => {
    if (confirm('ATENÇÃO: Isso irá apagar TODOS os dados!')) {
        localStorage.removeItem(STORAGE_KEY);
        return true;
    }
    return false;
};
