import { db } from './db';
import {
    AppData,
    Attendance,
    DailyNote,
    Expense,
    Payment,
    PersonalPlan,
    Plan,
    SettingItem,
    Student,
} from '../types';
import {
    getCurrentMonthString,
    getTodayDateString,
    getYearMonth,
    normalizeDueDayDate,
} from '../utils/dateUtils';
import { getCommitmentMonths, inferPlanCategory } from '../utils/planUtils';
import { syncAndRepairMonthlySnapshots } from './MonthlyHistoryService';
import { forceUploadLocalToCloud, getCloudSession } from './syncService';
import { isSupabaseConfigured } from './supabase';

export interface DueDayShiftIssue {
    studentId: string;
    studentName: string;
    dueDay: number;
    oldNextDue: string;
    fixedNextDue: string;
}

export interface DuplicateStudentCandidate {
    id: string;
    name: string;
    phone: string;
    planId: string;
    planName: string;
    status: string;
    createdAt: string;
    paymentCount: number;
    attendanceCount: number;
    recommendedAction: 'keep' | 'remove';
}

export interface DuplicateStudentGroup {
    normalizedName: string;
    candidates: DuplicateStudentCandidate[];
}

export interface SnapshotIssuePreview {
    id: string;
    recordedRevenue: number;
    actualRevenue: number;
    recordedExpenses: number;
    actualExpenses: number;
    reason: 'premature' | 'future' | 'mismatch';
}

export interface BackupAnalysisReport {
    isValid: boolean;
    error?: string;
    counts: {
        students: number;
        payments: number;
        expenses: number;
        attendance: number;
        plans: number;
        personalPlans: number;
        snapshots: number;
    };
    trimmedNamesCount: number;
    trimmedNameExamples: { id: string; before: string; after: string }[];
    dueDayShifts: DueDayShiftIssue[];
    duplicateGroups: DuplicateStudentGroup[];
    plansNeedingCategoryCount: number;
    snapshotIssues: SnapshotIssuePreview[];
}

export interface BackupImportOptions {
    mode: 'replace' | 'merge';
    trimNames: boolean;
    fixDueDayShifts: boolean;
    enrichPlans: boolean;
    recalculateSnapshots: boolean;
    removeStudentIds: string[];
}

function normalizeNameKey(name: string): string {
    return (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function analyzeBackupData(raw: any): BackupAnalysisReport {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.students) || !Array.isArray(raw.payments)) {
        return {
            isValid: false,
            error: 'Arquivo JSON inválido: certifique-se de enviar um backup válido da academia contendo alunos e pagamentos.',
            counts: { students: 0, payments: 0, expenses: 0, attendance: 0, plans: 0, personalPlans: 0, snapshots: 0 },
            trimmedNamesCount: 0,
            trimmedNameExamples: [],
            dueDayShifts: [],
            duplicateGroups: [],
            plansNeedingCategoryCount: 0,
            snapshotIssues: [],
        };
    }

    const data = raw as AppData;
    const students = (data.students || []).filter((s) => !s.deletedAt);
    const payments = (data.payments || []).filter((p) => !p.deletedAt);
    const expenses = (data.expenses || []).filter((e) => !e.deletedAt);
    const attendance = (data.attendance || []).filter((a) => !a.deletedAt);
    const plans = (data.plans || []).filter((p) => !p.deletedAt);
    const personalPlans = (data.personalPlans || []).filter((p) => !p.deletedAt);
    const snapshots = (data.monthlySnapshots || []).filter((m) => !m.deletedAt);

    const planNameMap = new Map(plans.map((p) => [p.id, p.name]));

    // 1. Espaços extras em nomes
    const trimmedNameExamples: { id: string; before: string; after: string }[] = [];
    for (const s of students) {
        const trimmed = (s.name || '').trim();
        if (s.name !== trimmed) {
            trimmedNameExamples.push({ id: s.id, before: s.name, after: trimmed });
        }
    }

    // 2. Deslocamento de +1 dia no nextDue por bug histórico de UTC
    const dueDayShifts: DueDayShiftIssue[] = [];
    for (const s of students) {
        if (!s.nextDue || !s.dueDay) continue;
        const fixed = normalizeDueDayDate(s.nextDue, s.dueDay);
        const currentClean = s.nextDue.split('T')[0];
        if (fixed && fixed !== currentClean) {
            dueDayShifts.push({
                studentId: s.id,
                studentName: (s.name || '').trim(),
                dueDay: s.dueDay,
                oldNextDue: currentClean,
                fixedNextDue: fixed,
            });
        }
    }

    // 3. Alunos duplicados
    const payCountByStudent = new Map<string, number>();
    payments.forEach((p) => {
        if (p.studentId) {
            payCountByStudent.set(p.studentId, (payCountByStudent.get(p.studentId) || 0) + 1);
        }
    });
    const attCountByStudent = new Map<string, number>();
    attendance.forEach((a) => {
        if (a.studentId) {
            attCountByStudent.set(a.studentId, (attCountByStudent.get(a.studentId) || 0) + 1);
        }
    });

    const groups = new Map<string, Student[]>();
    for (const s of students) {
        const key = normalizeNameKey(s.name);
        if (!key) continue;
        const list = groups.get(key) || [];
        list.push(s);
        groups.set(key, list);
    }

    const duplicateGroups: DuplicateStudentGroup[] = [];
    for (const [key, list] of groups.entries()) {
        if (list.length < 2) continue;

        // Ordenar mantendo primeiro quem tem mais histórico (pagamentos + presenças)
        const ranked = [...list].sort((a, b) => {
            const scoreA = (payCountByStudent.get(a.id) || 0) * 10 + (attCountByStudent.get(a.id) || 0);
            const scoreB = (payCountByStudent.get(b.id) || 0) * 10 + (attCountByStudent.get(b.id) || 0);
            if (scoreA !== scoreB) return scoreB - scoreA;
            return (a.createdAt || '').localeCompare(b.createdAt || '');
        });

        duplicateGroups.push({
            normalizedName: key,
            candidates: ranked.map((s, idx) => ({
                id: s.id,
                name: (s.name || '').trim(),
                phone: s.phone || '',
                planId: s.plan,
                planName: planNameMap.get(s.plan) || s.plan,
                status: s.status,
                createdAt: s.createdAt,
                paymentCount: payCountByStudent.get(s.id) || 0,
                attendanceCount: attCountByStudent.get(s.id) || 0,
                recommendedAction: idx === 0 ? 'keep' : 'remove',
            })),
        });
    }

    // 4. Planos sem categoria / fidelidade explicitada
    const plansNeedingCategoryCount = plans.filter((p) => !p.category || !p.commitmentMonths).length;

    // 5. Snapshots corrompidos ou divergentes
    const currentMonth = getCurrentMonthString();
    const revenueByMonth = new Map<string, number>();
    payments.forEach((p) => {
        const ym = getYearMonth(p.date);
        if (ym) {
            revenueByMonth.set(ym, (revenueByMonth.get(ym) || 0) + (p.amount || 0) + (p.lateFee || 0));
        }
    });
    const expenseByMonth = new Map<string, number>();
    expenses.forEach((e) => {
        const ym = getYearMonth(e.date);
        if (ym) {
            expenseByMonth.set(ym, (expenseByMonth.get(ym) || 0) + (e.amount || 0));
        }
    });

    const snapshotIssues: SnapshotIssuePreview[] = [];
    for (const snap of snapshots) {
        const actualRev = Number((revenueByMonth.get(snap.id) || 0).toFixed(2));
        const actualExp = Number((expenseByMonth.get(snap.id) || 0).toFixed(2));

        if (snap.id >= currentMonth) {
            snapshotIssues.push({
                id: snap.id,
                recordedRevenue: snap.revenue,
                actualRevenue: actualRev,
                recordedExpenses: snap.expenses,
                actualExpenses: actualExp,
                reason: 'future',
            });
            continue;
        }

        if (
            Math.abs((snap.revenue || 0) - actualRev) > 0.01 ||
            Math.abs((snap.expenses || 0) - actualExp) > 0.01
        ) {
            snapshotIssues.push({
                id: snap.id,
                recordedRevenue: snap.revenue,
                actualRevenue: actualRev,
                recordedExpenses: snap.expenses,
                actualExpenses: actualExp,
                reason: 'mismatch',
            });
        }
    }

    return {
        isValid: true,
        counts: {
            students: students.length,
            payments: payments.length,
            expenses: expenses.length,
            attendance: attendance.length,
            plans: plans.length,
            personalPlans: personalPlans.length,
            snapshots: snapshots.length,
        },
        trimmedNamesCount: trimmedNameExamples.length,
        trimmedNameExamples,
        dueDayShifts,
        duplicateGroups,
        plansNeedingCategoryCount,
        snapshotIssues,
    };
}

export async function applyBackupImport(
    rawData: AppData,
    options: BackupImportOptions
): Promise<{
    importedStudents: number;
    importedPayments: number;
    fixedDueDates: number;
    repairedSnapshots: number;
    removedDuplicates: number;
}> {
    const nowIso = new Date().toISOString();
    const removeSet = new Set(options.removeStudentIds);

    let fixedDueDates = 0;

    const cleanPlans: Plan[] = (rawData.plans || []).map((p, index) => {
        const category = options.enrichPlans ? inferPlanCategory(p) : p.category || 'mensal';
        const commitmentMonths = options.enrichPlans
            ? getCommitmentMonths({ ...p, category })
            : p.commitmentMonths || 1;
        return {
            ...p,
            name: options.trimNames ? (p.name || '').trim() : p.name,
            category,
            durationMonths: p.durationMonths && p.durationMonths > 0 ? p.durationMonths : 1,
            commitmentMonths,
            sortOrder: p.sortOrder ?? index + 1,
            updatedAt: nowIso,
            deletedAt: null,
        };
    });

    const cleanPersonalPlans: PersonalPlan[] = (rawData.personalPlans || []).map((p) => ({
        ...p,
        name: options.trimNames ? (p.name || '').trim() : p.name,
        updatedAt: nowIso,
        deletedAt: null,
    }));

    const cleanStudents: Student[] = (rawData.students || [])
        .filter((s) => !removeSet.has(s.id))
        .map((s) => {
            const name = options.trimNames ? (s.name || '').trim() : s.name;
            let nextDue = s.nextDue;
            if (options.fixDueDayShifts && s.nextDue && s.dueDay) {
                const fixed = normalizeDueDayDate(s.nextDue, s.dueDay);
                if (fixed !== s.nextDue.split('T')[0]) {
                    fixedDueDates++;
                }
                nextDue = fixed;
            }
            return {
                ...s,
                name,
                nextDue,
                planType: s.planType || 'normal',
                commitmentStartDate: s.commitmentStartDate || s.startDate,
                updatedAt: nowIso,
                deletedAt: null,
            };
        });

    const cleanPayments: Payment[] = (rawData.payments || [])
        .filter((p) => !p.studentId || !removeSet.has(p.studentId))
        .map((p) => ({
            ...p,
            studentName: options.trimNames && p.studentName ? p.studentName.trim() : p.studentName,
            updatedAt: nowIso,
            deletedAt: null,
        }));

    const cleanAttendance: Attendance[] = (rawData.attendance || [])
        .filter((a) => !removeSet.has(a.studentId))
        .map((a) => ({
            ...a,
            studentName: options.trimNames ? (a.studentName || '').trim() : a.studentName,
            attendanceType: a.attendanceType || 'normal',
            updatedAt: nowIso,
            deletedAt: null,
        }));

    const cleanExpenses: Expense[] = (rawData.expenses || []).map((e) => ({
        ...e,
        description: options.trimNames ? (e.description || '').trim() : e.description,
        updatedAt: nowIso,
        deletedAt: null,
    }));

    const cleanDailyNotes: DailyNote[] = (rawData.dailyNotes || []).map((n) => ({
        ...n,
        updatedAt: nowIso,
        deletedAt: null,
    }));

    const incomingSettings: SettingItem[] = [];
    if (Array.isArray(rawData.settings)) {
        for (const s of rawData.settings) {
            if (
                s.key === 'appPassword' ||
                s.key === 'lastAccessDate' ||
                s.key === 'migratedFromLocalStorage' ||
                s.key === 'v5_integrity_check' ||
                s.key === 'v7_integrity_check'
            ) {
                continue;
            }
            incomingSettings.push({ ...s, updatedAt: nowIso, deletedAt: null });
        }
    }
    if (rawData.gymName) {
        incomingSettings.push({ key: 'gymName', value: rawData.gymName, updatedAt: nowIso, deletedAt: null });
    }
    if (rawData.gymLogo) {
        incomingSettings.push({ key: 'gymLogo', value: rawData.gymLogo, updatedAt: nowIso, deletedAt: null });
    }

    await db.transaction(
        'rw',
        [
            db.students,
            db.payments,
            db.attendance,
            db.expenses,
            db.dailyNotes,
            db.plans,
            db.personalPlans,
            db.monthlySnapshots,
            db.settings,
        ],
        async () => {
            if (options.mode === 'replace') {
                await Promise.all([
                    db.students.clear(),
                    db.payments.clear(),
                    db.attendance.clear(),
                    db.expenses.clear(),
                    db.dailyNotes.clear(),
                    db.monthlySnapshots.clear(),
                ]);
                if (cleanPlans.length > 0) await db.plans.clear();
                if (cleanPersonalPlans.length > 0) await db.personalPlans.clear();
            }

            if (cleanPlans.length > 0) await db.plans.bulkPut(cleanPlans);
            if (cleanPersonalPlans.length > 0) await db.personalPlans.bulkPut(cleanPersonalPlans);
            if (cleanStudents.length > 0) await db.students.bulkPut(cleanStudents);
            if (cleanPayments.length > 0) await db.payments.bulkPut(cleanPayments);
            if (cleanAttendance.length > 0) await db.attendance.bulkPut(cleanAttendance);
            if (cleanExpenses.length > 0) await db.expenses.bulkPut(cleanExpenses);
            if (cleanDailyNotes.length > 0) await db.dailyNotes.bulkPut(cleanDailyNotes);
            if (incomingSettings.length > 0) await db.settings.bulkPut(incomingSettings);
            if (Array.isArray(rawData.monthlySnapshots) && rawData.monthlySnapshots.length > 0) {
                const currentMonth = getCurrentMonthString();
                const pastSnapshots = rawData.monthlySnapshots
                    .filter((m) => !options.recalculateSnapshots || m.id < currentMonth)
                    .map((m) => ({ ...m, updatedAt: nowIso, deletedAt: null }));
                if (pastSnapshots.length > 0) {
                    await db.monthlySnapshots.bulkPut(pastSnapshots);
                }
            }
            await db.settings.put({ key: 'v5_integrity_check', value: true });
            await db.settings.put({ key: 'v7_integrity_check', value: true });
        }
    );

    let repairedSnapshots = 0;
    if (options.recalculateSnapshots) {
        const res = await syncAndRepairMonthlySnapshots();
        repairedSnapshots = res.updated + res.removedFuture;
    }

    // Se nuvem configurada e autenticado, envia automaticamente dados importados/higienizados
    if (isSupabaseConfigured()) {
        const session = await getCloudSession();
        if (session) {
            forceUploadLocalToCloud().catch(() => {});
        }
    }

    return {
        importedStudents: cleanStudents.length,
        importedPayments: cleanPayments.length,
        fixedDueDates,
        repairedSnapshots,
        removedDuplicates: removeSet.size,
    };
}

export async function buildBackupExportPayload(): Promise<{ data: AppData; filename: string }> {
    const [
        students,
        payments,
        attendance,
        expenses,
        dailyNotes,
        plans,
        personalPlans,
        monthlySnapshots,
        settings,
    ] = await Promise.all([
        db.students.filter((r) => !r.deletedAt).toArray(),
        db.payments.filter((r) => !r.deletedAt).toArray(),
        db.attendance.filter((r) => !r.deletedAt).toArray(),
        db.expenses.filter((r) => !r.deletedAt).toArray(),
        db.dailyNotes.filter((r) => !r.deletedAt).toArray(),
        db.plans.filter((r) => !r.deletedAt).toArray(),
        db.personalPlans.filter((r) => !r.deletedAt).toArray(),
        db.monthlySnapshots.filter((r) => !r.deletedAt).toArray(),
        db.settings.toArray(),
    ]);

    const darkSetting = settings.find((s) => s.key === 'darkMode');

    const data: AppData = {
        students,
        payments,
        attendance,
        expenses,
        dailyNotes,
        plans,
        personalPlans,
        monthlySnapshots,
        settings: settings.filter(
            (s) =>
                s.key !== 'appPassword' &&
                s.key !== 'lastAccessDate' &&
                s.key !== 'migratedFromLocalStorage'
        ),
        darkMode: Boolean(darkSetting?.value),
        version: 7,
        lastModified: new Date().toISOString(),
        lastBackup: new Date().toISOString(),
    };

    const filename = `backup_academia_${getTodayDateString()}.json`;
    return { data, filename };
}
