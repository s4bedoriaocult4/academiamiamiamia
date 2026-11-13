import { useEffect, useState } from 'react';
import type { EntityTable } from 'dexie';
import type { RealtimeChannel, Session } from '@supabase/supabase-js';
import { db } from './db';
import { getSupabaseClient, getSupabaseConfig, isSupabaseConfigured } from './supabase';
import {
    Attendance,
    CloudSyncState,
    DailyNote,
    Expense,
    MonthlySnapshot,
    Payment,
    PersonalPlan,
    Plan,
    SettingItem,
    Student,
} from '../types';

export const LOCAL_ONLY_SETTINGS = new Set([
    'appPassword',
    'lastAccessDate',
    'migratedFromLocalStorage',
    'v5_integrity_check',
    'v7_integrity_check',
    'lastSyncedAt',
]);

export interface SyncStatusInfo {
    state: CloudSyncState;
    lastSyncedAt: string | null;
    lastError: string | null;
    userEmail: string | null;
}

type SyncListener = (status: SyncStatusInfo) => void;

const LAST_SYNC_STORAGE_KEY = 'academia_last_synced_at';

let currentStatus: SyncStatusInfo = {
    state: isSupabaseConfigured() ? 'unauthenticated' : 'local-only',
    lastSyncedAt: typeof localStorage !== 'undefined' ? localStorage.getItem(LAST_SYNC_STORAGE_KEY) : null,
    lastError: null,
    userEmail: null,
};

const listeners = new Set<SyncListener>();
let activeRealtimeChannel: RealtimeChannel | null = null;
let syncPromise: Promise<boolean> | null = null;

function notifyStatus(patch: Partial<SyncStatusInfo>) {
    currentStatus = { ...currentStatus, ...patch };
    listeners.forEach((fn) => fn(currentStatus));
}

export function getSyncStatus(): SyncStatusInfo {
    return currentStatus;
}

export function subscribeSyncStatus(listener: SyncListener): () => void {
    listeners.add(listener);
    listener(currentStatus);
    return () => listeners.delete(listener);
}

export function useSyncStatus(): SyncStatusInfo {
    const [status, setStatus] = useState<SyncStatusInfo>(currentStatus);
    useEffect(() => subscribeSyncStatus(setStatus), []);
    return status;
}

// ---------- Conversores CamelCase <-> SnakeCase ----------

function num(v: unknown, fallback = 0): number {
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function optNum(v: unknown): number | undefined {
    if (v === null || v === undefined || v === '') return undefined;
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : undefined;
}

interface TableSyncConfig<TLocal extends Record<string, any>> {
    name: keyof typeof db;
    remoteTable: string;
    primaryKey: string;
    getLocalTable: () => EntityTable<TLocal, any>;
    toRemote: (item: TLocal) => Record<string, unknown>;
    toLocal: (row: Record<string, any>) => TLocal;
    shouldSync?: (item: TLocal) => boolean;
}

const TABLE_CONFIGS: TableSyncConfig<any>[] = [
    {
        name: 'plans',
        remoteTable: 'plans',
        primaryKey: 'id',
        getLocalTable: () => db.plans,
        toRemote: (p: Plan) => ({
            id: p.id,
            name: p.name,
            category: p.category || 'mensal',
            price: num(p.price),
            frequency: Math.round(num(p.frequency, 1)),
            duration_months: Math.round(num(p.durationMonths, 1)),
            commitment_months: Math.round(num(p.commitmentMonths, 1)),
            sort_order: Math.round(num(p.sortOrder, 0)),
            updated_at: p.updatedAt || new Date().toISOString(),
            deleted_at: p.deletedAt ?? null,
        }),
        toLocal: (r): Plan => ({
            id: r.id,
            name: r.name,
            category: r.category || 'mensal',
            price: num(r.price),
            frequency: num(r.frequency, 1),
            durationMonths: num(r.duration_months, 1),
            commitmentMonths: num(r.commitment_months, 1),
            sortOrder: num(r.sort_order, 0),
            updatedAt: r.updated_at,
            deletedAt: r.deleted_at ?? null,
        }),
    },
    {
        name: 'personalPlans',
        remoteTable: 'personal_plans',
        primaryKey: 'id',
        getLocalTable: () => db.personalPlans,
        toRemote: (p: PersonalPlan) => ({
            id: p.id,
            name: p.name,
            price: num(p.price),
            total_classes: Math.round(num(p.totalClasses, 4)),
            frequency_per_week: Math.round(num(p.frequencyPerWeek, 1)),
            updated_at: p.updatedAt || new Date().toISOString(),
            deleted_at: p.deletedAt ?? null,
        }),
        toLocal: (r): PersonalPlan => ({
            id: r.id,
            name: r.name,
            price: num(r.price),
            totalClasses: num(r.total_classes, 4),
            frequencyPerWeek: num(r.frequency_per_week, 1),
            updatedAt: r.updated_at,
            deletedAt: r.deleted_at ?? null,
        }),
    },
    {
        name: 'students',
        remoteTable: 'students',
        primaryKey: 'id',
        getLocalTable: () => db.students,
        toRemote: (s: Student) => ({
            id: s.id,
            name: s.name,
            phone: s.phone || '',
            email: s.email ?? null,
            cpf: s.cpf ?? null,
            cep: s.cep ?? null,
            address: s.address ?? null,
            plan: s.plan,
            due_day: Math.round(num(s.dueDay, 5)),
            start_date: s.startDate,
            next_due: s.nextDue,
            graduation: s.graduation || 'Sem graduação',
            status: s.status || 'ativo',
            birth_date: s.birthDate ?? null,
            responsible_name: s.responsibleName ?? null,
            notes: s.notes ?? null,
            plan_type: s.planType || 'normal',
            personal_plan_id: s.personalPlanId ?? null,
            personal_classes_remaining: Math.round(num(s.personalClassesRemaining, 0)),
            personal_start_date: s.personalStartDate ?? null,
            commitment_start_date: s.commitmentStartDate ?? null,
            created_at: s.createdAt || new Date().toISOString(),
            updated_at: s.updatedAt || s.createdAt || new Date().toISOString(),
            deleted_at: s.deletedAt ?? null,
        }),
        toLocal: (r): Student => ({
            id: r.id,
            name: r.name,
            phone: r.phone || '',
            email: r.email ?? undefined,
            cpf: r.cpf ?? undefined,
            cep: r.cep ?? undefined,
            address: r.address ?? undefined,
            plan: r.plan,
            dueDay: num(r.due_day, 5),
            startDate: r.start_date,
            nextDue: r.next_due,
            graduation: r.graduation || 'Sem graduação',
            status: r.status === 'inativo' ? 'inativo' : 'ativo',
            birthDate: r.birth_date ?? undefined,
            responsibleName: r.responsible_name ?? undefined,
            notes: r.notes ?? undefined,
            planType: r.plan_type || 'normal',
            personalPlanId: r.personal_plan_id ?? undefined,
            personalClassesRemaining: num(r.personal_classes_remaining, 0),
            personalStartDate: r.personal_start_date ?? undefined,
            commitmentStartDate: r.commitment_start_date ?? undefined,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            deletedAt: r.deleted_at ?? null,
        }),
    },
    {
        name: 'payments',
        remoteTable: 'payments',
        primaryKey: 'id',
        getLocalTable: () => db.payments,
        toRemote: (p: Payment) => ({
            id: p.id,
            student_id: p.studentId ?? null,
            student_name: p.studentName ?? null,
            amount: num(p.amount),
            late_fee: optNum(p.lateFee) ?? null,
            method: p.method || 'PIX',
            date: p.date,
            reference_month: p.referenceMonth ?? null,
            type: p.type || 'pagamento',
            item_description: p.itemDescription ?? null,
            personal_plan_id: p.personalPlanId ?? null,
            classes_added: optNum(p.classesAdded) ?? null,
            created_at: p.createdAt || new Date().toISOString(),
            updated_at: p.updatedAt || p.createdAt || new Date().toISOString(),
            deleted_at: p.deletedAt ?? null,
        }),
        toLocal: (r): Payment => ({
            id: r.id,
            studentId: r.student_id ?? undefined,
            studentName: r.student_name ?? undefined,
            amount: num(r.amount),
            lateFee: optNum(r.late_fee),
            method: r.method || 'PIX',
            date: r.date,
            referenceMonth: r.reference_month ?? undefined,
            type: r.type || 'pagamento',
            itemDescription: r.item_description ?? undefined,
            personalPlanId: r.personal_plan_id ?? undefined,
            classesAdded: optNum(r.classes_added),
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            deletedAt: r.deleted_at ?? null,
        }),
    },
    {
        name: 'attendance',
        remoteTable: 'attendance',
        primaryKey: 'id',
        getLocalTable: () => db.attendance,
        toRemote: (a: Attendance) => ({
            id: a.id,
            student_id: a.studentId,
            student_name: a.studentName,
            date: a.date,
            attendance_type: a.attendanceType || 'normal',
            created_at: a.createdAt || new Date().toISOString(),
            updated_at: a.updatedAt || a.createdAt || new Date().toISOString(),
            deleted_at: a.deletedAt ?? null,
        }),
        toLocal: (r): Attendance => ({
            id: r.id,
            studentId: r.student_id,
            studentName: r.student_name,
            date: r.date,
            attendanceType: r.attendance_type === 'personal' ? 'personal' : 'normal',
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            deletedAt: r.deleted_at ?? null,
        }),
    },
    {
        name: 'expenses',
        remoteTable: 'expenses',
        primaryKey: 'id',
        getLocalTable: () => db.expenses,
        toRemote: (e: Expense) => ({
            id: e.id,
            description: e.description,
            category: e.category || 'Outros',
            amount: num(e.amount),
            date: e.date,
            recurring: Boolean(e.recurring),
            created_at: e.createdAt || new Date().toISOString(),
            updated_at: e.updatedAt || e.createdAt || new Date().toISOString(),
            deleted_at: e.deletedAt ?? null,
        }),
        toLocal: (r): Expense => ({
            id: r.id,
            description: r.description,
            category: r.category || 'Outros',
            amount: num(r.amount),
            date: r.date,
            recurring: Boolean(r.recurring),
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            deletedAt: r.deleted_at ?? null,
        }),
    },
    {
        name: 'dailyNotes',
        remoteTable: 'daily_notes',
        primaryKey: 'id',
        getLocalTable: () => db.dailyNotes,
        toRemote: (n: DailyNote) => ({
            id: n.id,
            date: n.date,
            content: n.content,
            created_at: n.createdAt || new Date().toISOString(),
            updated_at: n.updatedAt || n.createdAt || new Date().toISOString(),
            deleted_at: n.deletedAt ?? null,
        }),
        toLocal: (r): DailyNote => ({
            id: r.id,
            date: r.date,
            content: r.content,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            deletedAt: r.deleted_at ?? null,
        }),
    },
    {
        name: 'monthlySnapshots',
        remoteTable: 'monthly_snapshots',
        primaryKey: 'id',
        getLocalTable: () => db.monthlySnapshots,
        toRemote: (m: MonthlySnapshot) => ({
            id: m.id,
            year: Math.round(num(m.year)),
            month: Math.round(num(m.month)),
            revenue: num(m.revenue),
            expenses: num(m.expenses),
            profit: num(m.profit),
            active_students: Math.round(num(m.activeStudents)),
            overdue_count: Math.round(num(m.overdueCount)),
            attendance_count: Math.round(num(m.attendanceCount)),
            closed_at: m.closedAt || new Date().toISOString(),
            updated_at: m.updatedAt || m.closedAt || new Date().toISOString(),
            deleted_at: m.deletedAt ?? null,
        }),
        toLocal: (r): MonthlySnapshot => ({
            id: r.id,
            year: num(r.year),
            month: num(r.month),
            revenue: num(r.revenue),
            expenses: num(r.expenses),
            profit: num(r.profit),
            activeStudents: num(r.active_students),
            overdueCount: num(r.overdue_count),
            attendanceCount: num(r.attendance_count),
            closedAt: r.closed_at,
            updatedAt: r.updated_at,
            deletedAt: r.deleted_at ?? null,
        }),
    },
    {
        name: 'settings',
        remoteTable: 'settings',
        primaryKey: 'key',
        getLocalTable: () => db.settings,
        shouldSync: (s: SettingItem) => !LOCAL_ONLY_SETTINGS.has(s.key),
        toRemote: (s: SettingItem) => ({
            key: s.key,
            value: s.value,
            updated_at: s.updatedAt || new Date().toISOString(),
            deleted_at: s.deletedAt ?? null,
        }),
        toLocal: (r): SettingItem => ({
            key: r.key,
            value: r.value,
            updatedAt: r.updated_at,
            deletedAt: r.deleted_at ?? null,
        }),
    },
];

const CONFIG_BY_NAME = new Map<string, TableSyncConfig<any>>(
    TABLE_CONFIGS.map((cfg) => [cfg.name, cfg])
);

function toTimestampMs(iso?: string | null): number {
    if (!iso) return 0;
    const ms = Date.parse(iso);
    return Number.isFinite(ms) ? ms : 0;
}

// ---------- Autenticação Nuvem ----------

export async function getCloudSession(): Promise<Session | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session ?? null;
}

export async function signInCloud(email: string, password: string): Promise<{ error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) {
        return { error: 'Supabase não está configurado.' };
    }
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
    });
    if (error) {
        if (error.message.toLowerCase().includes('invalid login')) {
            return { error: 'E-mail ou senha incorretos.' };
        }
        return { error: error.message };
    }
    notifyStatus({
        state: 'syncing',
        userEmail: data.user?.email ?? email.trim(),
        lastError: null,
    });
    return {};
}

export async function signUpCloud(email: string, password: string): Promise<{ error?: string; needsConfirmation?: boolean }> {
    const supabase = getSupabaseClient();
    if (!supabase) {
        return { error: 'Supabase não está configurado.' };
    }
    const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
            emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
    });
    if (error) return { error: error.message };
    return { needsConfirmation: !data.session };
}

export async function checkGoogleProviderEnabled(): Promise<boolean> {
    const cfg = getSupabaseConfig();
    if (!cfg) return false;
    try {
        const res = await fetch(`${cfg.url.replace(/\/$/, '')}/auth/v1/settings`, {
            headers: { apikey: cfg.anonKey },
        });
        if (!res.ok) return false;
        const json = await res.json();
        return Boolean(json?.external?.google);
    } catch {
        return false;
    }
}

export async function signInWithGoogle(): Promise<{ error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) {
        return { error: 'Supabase não está configurado.' };
    }

    const googleEnabled = await checkGoogleProviderEnabled();
    if (!googleEnabled) {
        return {
            error: 'O login com Google ainda precisa ser ativado no painel do Supabase (Authentication > Sign In / Providers > Google).',
        };
    }

    const redirectTo =
        typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;

    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo,
            queryParams: {
                prompt: 'select_account',
            },
        },
    });

    if (error) {
        return { error: error.message };
    }
    return {};
}

export async function verifyAuthorizedCloudUser(): Promise<{
    authorized: boolean;
    email?: string;
    reason?: 'no_session' | 'unauthorized';
}> {
    const supabase = getSupabaseClient();
    if (!supabase) return { authorized: false, reason: 'no_session' };

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) return { authorized: false, reason: 'no_session' };

    const userEmail = session.user?.email;
    const { data, error } = await supabase
        .from('allowed_users')
        .select('email')
        .maybeSingle();

    if (error) {
        // Caso o schema antigo sem a tabela allowed_users ainda esteja em uso, mantém compatibilidade
        const msg = (error.message || '').toLowerCase();
        if (error.code === 'PGRST205' || error.code === '42P01' || msg.includes('allowed_users')) {
            return { authorized: true, email: userEmail };
        }
        if (error.code === '42501') {
            await signOutCloud();
            return { authorized: false, email: userEmail, reason: 'unauthorized' };
        }
        return { authorized: true, email: userEmail };
    }

    if (!data?.email) {
        await signOutCloud();
        return { authorized: false, email: userEmail, reason: 'unauthorized' };
    }

    return { authorized: true, email: userEmail };
}

export async function signOutCloud(): Promise<void> {
    const supabase = getSupabaseClient();
    stopRealtimeSync();
    if (supabase) {
        await supabase.auth.signOut();
    }
    notifyStatus({
        state: isSupabaseConfigured() ? 'unauthenticated' : 'local-only',
        userEmail: null,
    });
}

// ---------- Sincronização ----------

export async function pushSingleRecord(
    tableName: keyof typeof db,
    record: Record<string, any>
): Promise<void> {
    const cfg = CONFIG_BY_NAME.get(String(tableName));
    if (!cfg) return;
    if (cfg.shouldSync && !cfg.shouldSync(record)) return;

    const supabase = getSupabaseClient();
    if (!supabase || !navigator.onLine) {
        if (supabase && !navigator.onLine) {
            notifyStatus({ state: 'offline' });
        }
        return;
    }

    const { data } = await supabase.auth.getSession();
    if (!data.session) return;

    const { error } = await supabase
        .from(cfg.remoteTable)
        .upsert(cfg.toRemote(record), { onConflict: cfg.primaryKey });

    if (error) {
        console.warn(`[Sync] Falha ao enviar ${cfg.remoteTable}:`, error.message);
        notifyStatus({ lastError: error.message });
    } else {
        const nowIso = new Date().toISOString();
        localStorage.setItem(LAST_SYNC_STORAGE_KEY, nowIso);
        notifyStatus({ state: 'synced', lastSyncedAt: nowIso, lastError: null });
    }
}

export async function pushBatchRecords(
    tableName: keyof typeof db,
    records: Record<string, any>[]
): Promise<void> {
    if (records.length === 0) return;
    const cfg = CONFIG_BY_NAME.get(String(tableName));
    if (!cfg) return;

    const filtered = cfg.shouldSync ? records.filter(cfg.shouldSync) : records;
    if (filtered.length === 0) return;

    const supabase = getSupabaseClient();
    if (!supabase || !navigator.onLine) return;

    const { data } = await supabase.auth.getSession();
    if (!data.session) return;

    const chunkSize = 150;
    for (let i = 0; i < filtered.length; i += chunkSize) {
        const chunk = filtered.slice(i, i + chunkSize).map(cfg.toRemote);
        const { error } = await supabase
            .from(cfg.remoteTable)
            .upsert(chunk, { onConflict: cfg.primaryKey });
        if (error) {
            console.warn(`[Sync] Erro no lote em ${cfg.remoteTable}:`, error.message);
            notifyStatus({ state: 'error', lastError: error.message });
            throw error;
        }
    }
}

async function fetchAllRemoteRows(remoteTable: string): Promise<Record<string, any>[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const pageSize = 1000;
    let from = 0;
    const allRows: Record<string, any>[] = [];

    while (true) {
        const { data, error } = await supabase
            .from(remoteTable)
            .select('*')
            .range(from, from + pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allRows.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
    }

    return allRows;
}

/**
 * Sincronização bidirecional completa (Last-Write-Wins via updatedAt):
 * 1. Puxa registros remotos mais novos para o IndexedDB local
 * 2. Envia registros locais que não existem ou são mais novos no Supabase
 */
export async function syncAll(): Promise<boolean> {
    if (syncPromise) return syncPromise;

    syncPromise = (async () => {
        if (!isSupabaseConfigured()) {
            notifyStatus({ state: 'local-only', userEmail: null, lastError: null });
            return false;
        }

        const supabase = getSupabaseClient();
        if (!supabase) return false;

        if (!navigator.onLine) {
            notifyStatus({ state: 'offline' });
            return false;
        }

        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;
        if (!session) {
            notifyStatus({ state: 'unauthenticated', userEmail: null });
            return false;
        }

        const authCheck = await verifyAuthorizedCloudUser();
        if (!authCheck.authorized) {
            notifyStatus({
                state: 'unauthenticated',
                userEmail: null,
                lastError: `E-mail ${authCheck.email || ''} não autorizado para acessar a academia.`,
            });
            return false;
        }

        notifyStatus({
            state: 'syncing',
            userEmail: session.user?.email ?? null,
            lastError: null,
        });

        try {
            const isFirstDeviceSync = !localStorage.getItem(LAST_SYNC_STORAGE_KEY);

            for (const cfg of TABLE_CONFIGS) {
                const remoteRaw = await fetchAllRemoteRows(cfg.remoteTable);
                const remoteRows = remoteRaw.map(cfg.toLocal);

                const localAll = await cfg.getLocalTable().toArray();
                const localEligible = cfg.shouldSync ? localAll.filter(cfg.shouldSync) : localAll;

                const pk = cfg.primaryKey;
                const localMap = new Map<string, any>(localEligible.map((item) => [item[pk], item]));
                const remoteMap = new Map<string, any>(remoteRows.map((item) => [item[pk], item]));
                const maxRemoteUpdatedAt = remoteRows.reduce(
                    (max, r) => Math.max(max, toTimestampMs(r.updatedAt)),
                    0
                );

                // 1. Remoto -> Local
                const toPutLocal: any[] = [];
                for (const remoteItem of remoteRows) {
                    if (cfg.shouldSync && !cfg.shouldSync(remoteItem)) continue;
                    const localItem = localMap.get(remoteItem[pk]);
                    if (!localItem) {
                        toPutLocal.push(remoteItem);
                    } else if (toTimestampMs(remoteItem.updatedAt) > toTimestampMs(localItem.updatedAt)) {
                        toPutLocal.push(remoteItem);
                    }
                }

                if (toPutLocal.length > 0) {
                    await cfg.getLocalTable().bulkPut(toPutLocal);
                }

                // 2. Local -> Remoto
                const toPushRemote: any[] = [];
                const toDeleteLocalLegacy: any[] = [];
                for (const localItem of localEligible) {
                    const remoteItem = remoteMap.get(localItem[pk]);
                    if (!remoteItem) {
                        if (
                            isFirstDeviceSync &&
                            remoteRows.length > 0 &&
                            toTimestampMs(localItem.updatedAt) <= maxRemoteUpdatedAt
                        ) {
                            // Registro legado/duplicado ou seed anterior à base já carregada na nuvem:
                            // não reenvia para o Supabase e alinha o aparelho antigo à base limpa.
                            toDeleteLocalLegacy.push(localItem[pk]);
                        } else {
                            toPushRemote.push(localItem);
                        }
                    } else if (toTimestampMs(localItem.updatedAt) > toTimestampMs(remoteItem.updatedAt)) {
                        toPushRemote.push(localItem);
                    }
                }

                if (toDeleteLocalLegacy.length > 0) {
                    await cfg.getLocalTable().bulkDelete(toDeleteLocalLegacy);
                }

                if (toPushRemote.length > 0) {
                    await pushBatchRecords(cfg.name, toPushRemote);
                }
            }

            const nowIso = new Date().toISOString();
            localStorage.setItem(LAST_SYNC_STORAGE_KEY, nowIso);
            notifyStatus({
                state: 'synced',
                lastSyncedAt: nowIso,
                lastError: null,
                userEmail: session.user?.email ?? null,
            });
            return true;
        } catch (err: any) {
            console.error('[Sync] Erro na sincronização completa:', err);
            notifyStatus({
                state: navigator.onLine ? 'error' : 'offline',
                lastError: err?.message || 'Erro ao sincronizar com a nuvem.',
            });
            return false;
        } finally {
            syncPromise = null;
        }
    })();

    return syncPromise;
}

/**
 * Empurra TODO o banco local para a nuvem com timestamp atual (útil na 1ª migração PC -> Nuvem).
 */
export async function forceUploadLocalToCloud(): Promise<void> {
    const nowIso = new Date().toISOString();
    for (const cfg of TABLE_CONFIGS) {
        const rows = await cfg.getLocalTable().toArray();
        const eligible = cfg.shouldSync ? rows.filter(cfg.shouldSync) : rows;
        if (eligible.length === 0) continue;

        const stamped = eligible.map((r) => ({ ...r, updatedAt: r.updatedAt || nowIso }));
        await pushBatchRecords(cfg.name, stamped);
    }
    const doneAt = new Date().toISOString();
    localStorage.setItem(LAST_SYNC_STORAGE_KEY, doneAt);
    notifyStatus({ state: 'synced', lastSyncedAt: doneAt, lastError: null });
}

export function startRealtimeSync(): void {
    const supabase = getSupabaseClient();
    if (!supabase || activeRealtimeChannel) return;

    const channel = supabase.channel('academia-realtime-sync');

    for (const cfg of TABLE_CONFIGS) {
        channel.on(
            'postgres_changes',
            { event: '*', schema: 'public', table: cfg.remoteTable },
            async (payload) => {
                const row = (payload.new || payload.old) as Record<string, any> | undefined;
                if (!row) return;

                if (payload.eventType === 'DELETE') {
                    const key = row[cfg.primaryKey];
                    if (key) {
                        await cfg.getLocalTable().delete(key);
                    }
                    return;
                }

                const localConverted = cfg.toLocal(row);
                if (cfg.shouldSync && !cfg.shouldSync(localConverted)) return;

                const existing = await cfg.getLocalTable().get(localConverted[cfg.primaryKey]);
                if (!existing || toTimestampMs(localConverted.updatedAt) >= toTimestampMs(existing.updatedAt)) {
                    await cfg.getLocalTable().put(localConverted);
                }
            }
        );
    }

    channel.subscribe();
    activeRealtimeChannel = channel;
}

export function stopRealtimeSync(): void {
    const supabase = getSupabaseClient();
    if (supabase && activeRealtimeChannel) {
        supabase.removeChannel(activeRealtimeChannel);
    }
    activeRealtimeChannel = null;
}

export function refreshSyncStatusFromEnvironment(): void {
    if (!isSupabaseConfigured()) {
        stopRealtimeSync();
        notifyStatus({ state: 'local-only', userEmail: null, lastError: null });
        return;
    }
    if (!navigator.onLine) {
        notifyStatus({ state: 'offline' });
    }
}
