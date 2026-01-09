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
    darkMode: false,
    version: DATA_VERSION,
    lastModified: new Date().toISOString()
});

// Carregar dados do localStorage
export const loadData = (): AppData => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored) as AppData;
            return {
                ...getEmptyData(),
                ...data,
                version: DATA_VERSION
            };
        }
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
    }

    // Tentar migrar dados antigos do window.storage (se existir)
    try {
        const oldData = (window as unknown as { storage?: { get: (key: string) => Promise<{ value: string }> } }).storage;
        if (oldData) {
            console.log('Tentando migrar dados antigos...');
            // Migration would happen here if old storage exists
        }
    } catch {
        // Ignore migration errors
    }

    return getEmptyData();
};

// Salvar dados no localStorage
// Salvar dados no localStorage
export const saveData = (data: AppData): boolean => {
    try {
        const updatedData = {
            ...data,
            lastModified: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
        return true;
    } catch (error: any) {
        console.error('Erro ao salvar dados:', error);
        if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            throw new Error('Armazenamento cheio! Exclua alguns dados ou faça backup.');
        }
        return false;
    }
};

// Exportar backup como arquivo JSON
// Exportar backup como arquivo JSON
export const exportBackup = (data: AppData): boolean => {
    try {
        const date = new Date().toISOString().split('T')[0];
        const filename = `backup_academia_${date}.json`;
        const content = JSON.stringify(data, null, 2);

        // Adicionar BOM para garantir UTF-8 correto no Excel/Windows
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
    } catch (error) {
        console.error('Erro ao exportar backup:', error);
        return false;
    }
};

// Importar backup de arquivo JSON
export const importBackup = (file: File): Promise<AppData> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const data = JSON.parse(content) as AppData;

                // Validar estrutura básica
                if (!data.students || !data.payments || !data.attendance) {
                    throw new Error('Arquivo de backup inválido');
                }

                // Garantir que expenses existe
                if (!data.expenses) {
                    data.expenses = [];
                }
                // Garantir que dailyNotes existe
                if (!data.dailyNotes) {
                    data.dailyNotes = [];
                }
                // Garantir que darkMode existe
                if (data.darkMode === undefined) {
                    data.darkMode = false;
                }

                resolve(data);
            } catch (error) {
                reject(new Error('Erro ao ler arquivo de backup'));
            }
        };

        reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
        reader.readAsText(file);
    });
};

// Limpar todos os dados (com confirmação)
export const clearAllData = (): boolean => {
    if (confirm('ATENÇÃO: Isso irá apagar TODOS os dados! Tem certeza? Recomendamos fazer um backup antes.')) {
        localStorage.removeItem(STORAGE_KEY);
        return true;
    }
    return false;
};
