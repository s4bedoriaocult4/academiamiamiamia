/**
 * MonthlyHistoryService
 *
 * Responsável pelo fechamento e histórico mensal:
 * - Detecta virada de mês com segurança
 * - Usa getYearMonth() (sem bug de UTC) e inclui multas/juros (lateFee)
 * - Nunca gera snapshots para o mês atual ou meses futuros
 * - Corrige/recalcula snapshots antigos corrompidos ou alterados após o fechamento
 */

import { db } from './db';
import { MonthlySnapshot } from '../types';
import { getCurrentMonthString, getYearMonth } from '../utils/dateUtils';

export function getMonthId(year: number, month: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export function getMonthName(month: number): string {
    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ];
    return months[month] || '';
}

/**
 * Calcula receita, despesas, lucro e presenças reais de um mês passado (year, month 0-11).
 * Preserva activeStudents / overdueCount caso já exista snapshot válido para evitar distorção retroativa.
 */
export async function computeMonthSnapshot(
    year: number,
    month: number,
    existingSnapshot?: MonthlySnapshot | null
): Promise<MonthlySnapshot> {
    const monthId = getMonthId(year, month);

    const payments = await db.payments.filter((p) => !p.deletedAt).toArray();
    const monthPayments = payments.filter((p) => getYearMonth(p.date) === monthId);
    const revenue = monthPayments.reduce((sum, p) => sum + (p.amount || 0) + (p.lateFee || 0), 0);

    const expenses = await db.expenses.filter((e) => !e.deletedAt).toArray();
    const monthExpenses = expenses.filter((e) => getYearMonth(e.date) === monthId);
    const expenseTotal = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const attendance = await db.attendance.filter((a) => !a.deletedAt).toArray();
    const monthAttendance = attendance.filter((a) => getYearMonth(a.date) === monthId);

    // Só calcula activeStudents do zero se não houver snapshot prévio válido com histórico salvo
    const hasHistoricalActiveCount = Boolean(existingSnapshot && existingSnapshot.activeStudents > 0);
    let activeStudentsCount = hasHistoricalActiveCount ? existingSnapshot!.activeStudents : 0;
    let overdueCount = existingSnapshot?.overdueCount ?? 0;

    const endOfMonthIso = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString();
    const wasPrematureSnapshot = Boolean(
        existingSnapshot?.closedAt && existingSnapshot.closedAt < endOfMonthIso
    );

    if (!existingSnapshot || wasPrematureSnapshot) {
        const students = await db.students.filter((s) => !s.deletedAt).toArray();
        const activeStudents = students.filter((s) => s.status === 'ativo');
        if (!hasHistoricalActiveCount) {
            activeStudentsCount = activeStudents.length;
        }

        const endOfMonthStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(
            new Date(year, month + 1, 0).getDate()
        ).padStart(2, '0')}`;

        // Aproxima quem estava em atraso no fim daquele mês verificando pagamentos feitos para aquele mês
        overdueCount = activeStudents.filter((s) => {
            if (!s.nextDue) return false;
            return s.nextDue <= endOfMonthStr;
        }).length;
    }

    const nowIso = new Date().toISOString();
    return {
        id: monthId,
        year,
        month,
        revenue: Number(revenue.toFixed(2)),
        expenses: Number(expenseTotal.toFixed(2)),
        profit: Number((revenue - expenseTotal).toFixed(2)),
        activeStudents: activeStudentsCount,
        overdueCount,
        attendanceCount: monthAttendance.length,
        closedAt:
            existingSnapshot && !wasPrematureSnapshot
                ? existingSnapshot.closedAt
                : nowIso,
        updatedAt: nowIso,
        deletedAt: null,
    };
}

export async function generateMonthSnapshot(year: number, month: number): Promise<MonthlySnapshot> {
    const monthId = getMonthId(year, month);
    const existing = await db.monthlySnapshots.get(monthId);
    const snapshot = await computeMonthSnapshot(year, month, existing);
    await db.monthlySnapshots.put(snapshot);
    return snapshot;
}

/**
 * Sincroniza e repara snapshots de TODOS os meses passados (< mês atual):
 * - Remove snapshots inválidos (mês atual ou futuro) que tenham sido criados por bug antigo
 * - Gera snapshots faltantes de meses passados com transações
 * - Atualiza snapshots passados cuja receita/despesa/presença divergem dos lançamentos reais
 */
export async function syncAndRepairMonthlySnapshots(): Promise<{
    updated: number;
    removedFuture: number;
}> {
    const currentMonthId = getCurrentMonthString();
    const payments = await db.payments.filter((p) => !p.deletedAt).toArray();
    const expenses = await db.expenses.filter((e) => !e.deletedAt).toArray();
    const existingSnapshots = await db.monthlySnapshots.filter((s) => !s.deletedAt).toArray();

    let removedFuture = 0;
    let updated = 0;

    // 1. Remover snapshots do mês atual ou meses futuros (bug antigo de fechamento prematuro)
    const nowIso = new Date().toISOString();
    for (const snap of existingSnapshots) {
        if (snap.id >= currentMonthId) {
            await db.monthlySnapshots.update(snap.id, {
                deletedAt: nowIso,
                updatedAt: nowIso,
            });
            removedFuture++;
        }
    }

    // 2. Descobrir todos os meses passados com dados ou já fechados
    const pastMonthIds = new Set<string>();
    payments.forEach((p) => {
        const ym = getYearMonth(p.date);
        if (ym && ym < currentMonthId) pastMonthIds.add(ym);
    });
    expenses.forEach((e) => {
        const ym = getYearMonth(e.date);
        if (ym && ym < currentMonthId) pastMonthIds.add(ym);
    });
    existingSnapshots.forEach((s) => {
        if (s.id < currentMonthId) pastMonthIds.add(s.id);
    });

    const existingMap = new Map(existingSnapshots.map((s) => [s.id, s]));

    for (const monthId of pastMonthIds) {
        const [yStr, mStr] = monthId.split('-');
        const year = parseInt(yStr, 10);
        const month = parseInt(mStr, 10) - 1;
        if (isNaN(year) || isNaN(month) || month < 0 || month > 11) continue;

        const prev = existingMap.get(monthId);
        const recomputed = await computeMonthSnapshot(year, month, prev);

        const changed =
            !prev ||
            Math.abs(prev.revenue - recomputed.revenue) > 0.01 ||
            Math.abs(prev.expenses - recomputed.expenses) > 0.01 ||
            prev.attendanceCount !== recomputed.attendanceCount ||
            prev.overdueCount !== recomputed.overdueCount;

        if (changed) {
            await db.monthlySnapshots.put(recomputed);
            updated++;
        }
    }

    return { updated, removedFuture };
}

export async function checkAndCloseMonth(): Promise<boolean> {
    const today = new Date();
    const { updated } = await syncAndRepairMonthlySnapshots();
    await db.settings.put({ key: 'lastAccessDate', value: today.toISOString() });
    return updated > 0;
}

export async function getMonthHistory(): Promise<MonthlySnapshot[]> {
    const currentMonthId = getCurrentMonthString();
    const snapshots = await db.monthlySnapshots
        .filter((s) => !s.deletedAt && s.id < currentMonthId)
        .toArray();
    return snapshots.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
    });
}
