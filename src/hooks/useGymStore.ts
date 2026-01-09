import { useLiveQuery } from 'dexie-react-hooks';
import { db, migrateFromLocalStorage } from '../services/db';
import { useState, useEffect } from 'react';

// Hook para inicializar o DB
export function useDbInit() {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        migrateFromLocalStorage().then(() => setIsReady(true));
    }, []);

    return isReady;
}

// Hooks de Dados
export function useStudents() {
    return useLiveQuery(() => db.students.toArray()) || [];
}

export function usePayments() {
    return useLiveQuery(() => db.payments.toArray()) || [];
}

export function useAttendance() {
    return useLiveQuery(() => db.attendance.toArray()) || [];
}

export function useExpenses() {
    return useLiveQuery(() => db.expenses.toArray()) || [];
}

export function useSettings() {
    return useLiveQuery(() => db.settings.toArray()) || [];
}
