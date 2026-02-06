/**
 * MonthlyHistoryService
 * 
 * Serviço responsável por:
 * - Detectar automaticamente virada de mês
 * - Gerar snapshot (fechamento) do mês anterior
 * - Consultar histórico de meses
 * 
 * Os snapshots são IMUTÁVEIS após criados.
 */

import { db } from './db';
import { MonthlySnapshot } from '../types';

/**
 * Gera o ID do mês no formato "YYYY-MM"
 */
export function getMonthId(year: number, month: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}`;
}

/**
 * Verifica se precisa fechar o mês anterior
 * Deve ser chamada ao carregar o Dashboard
 * 
 * @returns true se fechou um mês, false caso contrário
 */
export async function checkAndCloseMonth(): Promise<boolean> {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-11

    // Calcular mês anterior
    let previousMonth = currentMonth - 1;
    let previousYear = currentYear;
    if (previousMonth < 0) {
        previousMonth = 11; // Dezembro
        previousYear = currentYear - 1;
    }

    const previousMonthId = getMonthId(previousYear, previousMonth);

    // Verificar se já existe snapshot do mês anterior
    const existingSnapshot = await db.monthlySnapshots.get(previousMonthId);
    if (existingSnapshot) {
        // Já está fechado, não fazer nada
        return false;
    }

    // Verificar a última vez que o sistema foi acessado
    // Se nunca acessou antes, não precisa fechar nada
    const lastAccess = await db.settings.get('lastAccessDate');
    if (!lastAccess) {
        // Primeiro acesso, apenas registrar data e sair
        await db.settings.put({ key: 'lastAccessDate', value: today.toISOString() });
        return false;
    }

    const lastAccessDate = new Date(lastAccess.value);
    const lastAccessMonth = lastAccessDate.getMonth();
    const lastAccessYear = lastAccessDate.getFullYear();

    // Se o último acesso foi no mesmo mês/ano atual, não precisa fechar
    if (lastAccessMonth === currentMonth && lastAccessYear === currentYear) {
        await db.settings.put({ key: 'lastAccessDate', value: today.toISOString() });
        return false;
    }

    // Virou o mês! Precisamos fechar o(s) mês(es) anterior(es)
    // Vamos fechar apenas o mês imediatamente anterior (simplificação)
    console.log(`Detectada virada de mês. Fechando ${previousMonthId}...`);

    await generateMonthSnapshot(previousYear, previousMonth);
    await db.settings.put({ key: 'lastAccessDate', value: today.toISOString() });

    return true;
}

/**
 * Gera e salva o snapshot de um mês específico
 */
export async function generateMonthSnapshot(year: number, month: number): Promise<MonthlySnapshot> {
    const monthId = getMonthId(year, month);

    // Buscar todos os pagamentos do mês
    const payments = await db.payments.toArray();
    const monthPayments = payments.filter(p => {
        const pDate = new Date(p.date);
        return pDate.getMonth() === month && pDate.getFullYear() === year;
    });
    const revenue = monthPayments.reduce((sum, p) => sum + p.amount, 0);

    // Buscar todas as despesas do mês
    const expenses = await db.expenses.toArray();
    const monthExpenses = expenses.filter(e => {
        const eDate = new Date(e.date);
        return eDate.getMonth() === month && eDate.getFullYear() === year;
    });
    const expenseTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Calcular alunos ativos e inadimplentes no último dia do mês
    const students = await db.students.toArray();
    const activeStudents = students.filter(s => s.status === 'ativo');

    // Para inadimplentes, verificamos quem estava com nextDue antes do fim do mês
    // Último dia do mês às 23:59:59 para incluir vencimentos no último dia
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const overdueCount = activeStudents.filter(s => {
        // Normaliza a data de vencimento para meia-noite para comparação consistente
        const dueDate = new Date(s.nextDue + 'T00:00:00');
        return dueDate < endOfMonth;
    }).length;

    // Contar presenças do mês
    const attendance = await db.attendance.toArray();
    const monthAttendance = attendance.filter(a => {
        const aDate = new Date(a.date);
        return aDate.getMonth() === month && aDate.getFullYear() === year;
    });

    const snapshot: MonthlySnapshot = {
        id: monthId,
        year,
        month,
        revenue,
        expenses: expenseTotal,
        profit: revenue - expenseTotal,
        activeStudents: activeStudents.length,
        overdueCount,
        attendanceCount: monthAttendance.length,
        closedAt: new Date().toISOString()
    };

    // Salvar snapshot (imutável)
    await db.monthlySnapshots.add(snapshot);
    console.log(`Snapshot do mês ${monthId} criado com sucesso!`, snapshot);

    return snapshot;
}

/**
 * Retorna todos os snapshots de histórico ordenados por data (mais recente primeiro)
 */
export async function getMonthHistory(): Promise<MonthlySnapshot[]> {
    const snapshots = await db.monthlySnapshots.toArray();
    // Ordenar por ano e mês decrescente
    return snapshots.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
    });
}

/**
 * Retorna o snapshot de um mês específico (se existir)
 */
export async function getMonthSnapshot(year: number, month: number): Promise<MonthlySnapshot | undefined> {
    const monthId = getMonthId(year, month);
    return db.monthlySnapshots.get(monthId);
}

/**
 * Retorna o nome do mês em português
 */
export function getMonthName(month: number): string {
    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[month] || '';
}

/**
 * Gera snapshots retroativos para meses que têm dados mas não têm snapshot
 * Esta função detecta todos os meses com pagamentos ou despesas e cria snapshots
 * para os que ainda não existem (exceto o mês atual)
 * 
 * @returns número de snapshots gerados
 */
export async function generateMissingSnapshots(): Promise<number> {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    // Buscar todos os pagamentos e despesas para identificar meses com dados
    const payments = await db.payments.toArray();
    const expenses = await db.expenses.toArray();

    // Criar um Set com todos os meses que têm dados (formato "YYYY-MM")
    const monthsWithData = new Set<string>();

    payments.forEach(p => {
        const pDate = new Date(p.date);
        const monthId = getMonthId(pDate.getFullYear(), pDate.getMonth());
        monthsWithData.add(monthId);
    });

    expenses.forEach(e => {
        const eDate = new Date(e.date);
        const monthId = getMonthId(eDate.getFullYear(), eDate.getMonth());
        monthsWithData.add(monthId);
    });

    // Remover o mês atual (não deve ser fechado ainda)
    const currentMonthId = getMonthId(currentYear, currentMonth);
    monthsWithData.delete(currentMonthId);

    // Buscar snapshots existentes
    const existingSnapshots = await db.monthlySnapshots.toArray();
    const existingIds = new Set(existingSnapshots.map(s => s.id));

    // Gerar snapshots para meses que têm dados mas não têm snapshot
    let generatedCount = 0;
    for (const monthId of monthsWithData) {
        if (!existingIds.has(monthId)) {
            // Parsear o monthId para obter ano e mês
            const [yearStr, monthStr] = monthId.split('-');
            const year = parseInt(yearStr, 10);
            const month = parseInt(monthStr, 10) - 1; // Converter de 1-12 para 0-11

            console.log(`Gerando snapshot retroativo para ${monthId}...`);
            await generateMonthSnapshot(year, month);
            generatedCount++;
        }
    }

    if (generatedCount > 0) {
        console.log(`${generatedCount} snapshot(s) retroativo(s) gerado(s)!`);
    }

    return generatedCount;
}
