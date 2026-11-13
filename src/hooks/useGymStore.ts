import { useLiveQuery } from 'dexie-react-hooks';
import { db, migrateFromLocalStorage } from '../services/db';
import { useState, useEffect } from 'react';
import { sortPlans } from '../utils/planUtils';

export function useDbInit() {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        migrateFromLocalStorage()
            .catch(() => {})
            .finally(() => setIsReady(true));
    }, []);

    return isReady;
}

export function useStudents() {
    return useLiveQuery(() => db.students.filter((s) => !s.deletedAt).toArray()) || [];
}

export function usePayments() {
    return useLiveQuery(() => db.payments.filter((p) => !p.deletedAt).toArray()) || [];
}

export function useAttendance() {
    return useLiveQuery(() => db.attendance.filter((a) => !a.deletedAt).toArray()) || [];
}

export function useExpenses() {
    return useLiveQuery(() => db.expenses.filter((e) => !e.deletedAt).toArray()) || [];
}

export function usePlans() {
    const raw = useLiveQuery(() => db.plans.filter((p) => !p.deletedAt).toArray());
    return raw ? sortPlans(raw) : [];
}

export function usePersonalPlans() {
    const raw = useLiveQuery(() => db.personalPlans.filter((p) => !p.deletedAt).toArray());
    return raw ? [...raw].sort((a, b) => (a.price || 0) - (b.price || 0)) : [];
}

export function useMonthlySnapshots() {
    return useLiveQuery(() => db.monthlySnapshots.filter((m) => !m.deletedAt).toArray()) || [];
}

export function useSettings() {
    return useLiveQuery(() => db.settings.toArray()) || [];
}
