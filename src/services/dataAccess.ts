import { db } from './db';
import {
    Attendance,
    Expense,
    Payment,
    PersonalPlan,
    Plan,
    SettingItem,
    Student,
} from '../types';
import { generateId } from '../utils/id';
import {
    calculateNextDueDate,
    getCurrentMonthString,
    getYearMonth,
} from '../utils/dateUtils';
import {
    getBillingDurationMonths,
    getCommitmentMonths,
    inferPlanCategory,
} from '../utils/planUtils';
import { syncAndRepairMonthlySnapshots } from './MonthlyHistoryService';
import { pushBatchRecords, pushSingleRecord } from './syncService';

async function refreshAffectedPastSnapshots(dateStr?: string): Promise<void> {
    if (!dateStr) return;
    const ym = getYearMonth(dateStr);
    if (ym && ym < getCurrentMonthString()) {
        await syncAndRepairMonthlySnapshots();
        const affected = await db.monthlySnapshots.get(ym);
        if (affected) {
            await pushSingleRecord('monthlySnapshots', affected);
        }
    }
}

function getPreviousMonthDueDate(currentDue: string, dueDay: number, durationMonths: number): string {
    const clean = currentDue.split('T')[0];
    const [yStr, mStr] = clean.split('-');
    let year = parseInt(yStr, 10);
    let month = parseInt(mStr, 10) - Math.max(1, durationMonths);
    while (month <= 0) {
        month += 12;
        year -= 1;
    }
    const lastDay = new Date(year, month, 0).getDate();
    const safeDay = Math.min(dueDay || 5, lastDay);
    return `${year}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
}

async function resolveClassesFromPersonalPayment(
    payment: Partial<Payment>,
    student?: Student | null
): Promise<number> {
    if (payment.classesAdded !== undefined && payment.classesAdded > 0) {
        return payment.classesAdded;
    }
    const pPlanId = payment.personalPlanId || student?.personalPlanId;
    if (pPlanId) {
        const pPlan = await db.personalPlans.get(pPlanId);
        if (pPlan && !pPlan.deletedAt) return pPlan.totalClasses;
    }
    if (payment.itemDescription) {
        const match = payment.itemDescription.match(/\+(\d+)\s*aulas?/i);
        if (match) return parseInt(match[1], 10);
    }
    return 0;
}

// ---------- ALUNOS ----------

export interface InitialStudentPaymentInput {
    amount: number;
    method: Payment['method'];
    date: string;
    referenceMonth: string;
    type?: Payment['type'];
    itemDescription?: string;
}

export async function saveStudent(
    input: Partial<Student> & { id?: string; name: string },
    initialPayment?: InitialStudentPaymentInput | null
): Promise<Student> {
    const nowIso = new Date().toISOString();
    const existing = input.id ? await db.students.get(input.id) : undefined;

    const student: Student = {
        ...(existing || {}),
        id: existing?.id || input.id || generateId(),
        name: input.name.trim(),
        phone: (input.phone ?? existing?.phone ?? '').trim(),
        email: input.email?.trim() || undefined,
        cpf: input.cpf?.trim() || undefined,
        cep: input.cep?.trim() || undefined,
        address: input.address?.trim() || undefined,
        plan: input.plan || existing?.plan || '1x',
        dueDay: input.dueDay ?? existing?.dueDay ?? 5,
        startDate: input.startDate || existing?.startDate || nowIso.split('T')[0],
        nextDue: input.nextDue || existing?.nextDue || nowIso.split('T')[0],
        graduation: input.graduation || existing?.graduation || 'Sem graduação',
        status: input.status || existing?.status || 'ativo',
        birthDate: input.birthDate || undefined,
        responsibleName: input.responsibleName?.trim() || undefined,
        notes: input.notes?.trim() || undefined,
        planType: input.planType || existing?.planType || 'normal',
        personalPlanId: input.personalPlanId || undefined,
        personalClassesRemaining: input.personalClassesRemaining ?? existing?.personalClassesRemaining ?? 0,
        personalStartDate: input.personalStartDate || undefined,
        commitmentStartDate: input.commitmentStartDate || existing?.commitmentStartDate || input.startDate,
        createdAt: existing?.createdAt || input.createdAt || nowIso,
        updatedAt: nowIso,
        deletedAt: null,
    };

    let createdPayment: Payment | null = null;
    if (initialPayment && !existing) {
        createdPayment = {
            id: generateId(),
            studentId: student.id,
            studentName: student.name,
            amount: Number(initialPayment.amount) || 0,
            method: initialPayment.method,
            date: initialPayment.date,
            referenceMonth: initialPayment.referenceMonth,
            type: initialPayment.type || 'pagamento',
            itemDescription: initialPayment.itemDescription,
            createdAt: nowIso,
            updatedAt: nowIso,
            deletedAt: null,
        };
    }

    await db.transaction('rw', [db.students, db.payments], async () => {
        await db.students.put(student);
        if (createdPayment) {
            await db.payments.put(createdPayment);
        }
    });

    await pushSingleRecord('students', student);
    if (createdPayment) {
        await pushSingleRecord('payments', createdPayment);
        await refreshAffectedPastSnapshots(createdPayment.date);
    }

    return student;
}

export async function softDeleteStudent(studentId: string): Promise<void> {
    const existing = await db.students.get(studentId);
    if (!existing) return;

    const updated: Student = {
        ...existing,
        updatedAt: new Date().toISOString(),
        deletedAt: new Date().toISOString(),
    };
    await db.students.put(updated);
    await pushSingleRecord('students', updated);
}

// ---------- PAGAMENTOS & RECONCILIAÇÃO ----------

export interface SavePaymentResult {
    payment: Payment;
    updatedStudent?: Student;
}

export async function savePaymentWithReconciliation(
    input: Partial<Payment> & { amount: number; method: Payment['method']; date: string }
): Promise<SavePaymentResult> {
    const nowIso = new Date().toISOString();
    const existing = input.id ? await db.payments.get(input.id) : undefined;
    const isEdit = Boolean(existing);

    let student = input.studentId ? await db.students.get(input.studentId) : undefined;
    if (student?.deletedAt) student = undefined;

    const paymentType = input.type || existing?.type || 'pagamento';
    let classesAdded = input.classesAdded;

    if (paymentType === 'personal' && (classesAdded === undefined || classesAdded === null)) {
        classesAdded = await resolveClassesFromPersonalPayment(input, student);
    }

    const payment: Payment = {
        id: existing?.id || input.id || generateId(),
        studentId: paymentType === 'entrada' ? undefined : (input.studentId || existing?.studentId),
        studentName:
            paymentType === 'entrada'
                ? undefined
                : (student?.name || input.studentName || existing?.studentName),
        amount: Number(input.amount) || 0,
        lateFee: input.lateFee && Number(input.lateFee) > 0 ? Number(input.lateFee) : undefined,
        method: input.method,
        date: input.date,
        referenceMonth: paymentType === 'pagamento' ? input.referenceMonth : undefined,
        type: paymentType,
        itemDescription: input.itemDescription?.trim() || undefined,
        personalPlanId: paymentType === 'personal' ? (input.personalPlanId || student?.personalPlanId) : undefined,
        classesAdded: paymentType === 'personal' ? classesAdded : undefined,
        createdAt: existing?.createdAt || input.createdAt || nowIso,
        updatedAt: nowIso,
        deletedAt: null,
    };

    let updatedStudent: Student | undefined;

    await db.transaction('rw', [db.payments, db.students, db.plans, db.personalPlans], async () => {
        await db.payments.put(payment);

        if (!student) return;

        if (paymentType === 'pagamento' && payment.referenceMonth) {
            const planObj = await db.plans.get(student.plan);
            const billingDuration = getBillingDurationMonths(planObj);

            const studentMonthlyPayments = (
                await db.payments
                    .where('studentId')
                    .equals(student.id)
                    .filter((p) => !p.deletedAt && (p.type === 'pagamento' || !p.type) && Boolean(p.referenceMonth))
                    .toArray()
            )
                .map((p) => p.referenceMonth!)
                .sort();

            const maxRef =
                studentMonthlyPayments.length > 0
                    ? studentMonthlyPayments[studentMonthlyPayments.length - 1]
                    : payment.referenceMonth;

            const calculatedNextDue = calculateNextDueDate(
                maxRef,
                student.dueDay || 5,
                billingDuration
            );

            updatedStudent = {
                ...student,
                nextDue: calculatedNextDue,
                updatedAt: nowIso,
            };
            await db.students.put(updatedStudent);
        } else if (paymentType === 'personal') {
            const oldClasses = isEdit && existing?.type === 'personal'
                ? await resolveClassesFromPersonalPayment(existing, student)
                : 0;
            const newClasses = classesAdded || 0;
            const delta = isEdit ? newClasses - oldClasses : newClasses;

            const nextBalance = Math.max(0, (student.personalClassesRemaining || 0) + delta);
            const nextPlanType =
                student.planType === 'normal' || !student.planType
                    ? 'both'
                    : student.planType;

            updatedStudent = {
                ...student,
                planType: nextPlanType,
                personalPlanId: payment.personalPlanId || student.personalPlanId,
                personalClassesRemaining: nextBalance,
                personalStartDate: student.personalStartDate || payment.date,
                updatedAt: nowIso,
            };
            await db.students.put(updatedStudent);
        }
    });

    await pushSingleRecord('payments', payment);
    if (updatedStudent) {
        await pushSingleRecord('students', updatedStudent);
    }

    await refreshAffectedPastSnapshots(payment.date);
    if (existing?.date && existing.date !== payment.date) {
        await refreshAffectedPastSnapshots(existing.date);
    }

    return { payment, updatedStudent };
}

export async function softDeletePaymentWithReconciliation(paymentId: string): Promise<void> {
    const existing = await db.payments.get(paymentId);
    if (!existing) return;

    const nowIso = new Date().toISOString();
    const deletedPayment: Payment = {
        ...existing,
        updatedAt: nowIso,
        deletedAt: nowIso,
    };

    let updatedStudent: Student | undefined;

    await db.transaction('rw', [db.payments, db.students, db.plans, db.personalPlans], async () => {
        await db.payments.put(deletedPayment);

        if (!existing.studentId) return;
        const student = await db.students.get(existing.studentId);
        if (!student || student.deletedAt) return;

        if ((existing.type === 'pagamento' || !existing.type) && existing.referenceMonth) {
            const planObj = await db.plans.get(student.plan);
            const billingDuration = getBillingDurationMonths(planObj);

            const remainingRefs = (
                await db.payments
                    .where('studentId')
                    .equals(student.id)
                    .filter((p) => !p.deletedAt && (p.type === 'pagamento' || !p.type) && Boolean(p.referenceMonth))
                    .toArray()
            )
                .map((p) => p.referenceMonth!)
                .sort();

            const nextDue =
                remainingRefs.length > 0
                    ? calculateNextDueDate(
                        remainingRefs[remainingRefs.length - 1],
                        student.dueDay || 5,
                        billingDuration
                    )
                    : getPreviousMonthDueDate(student.nextDue, student.dueDay || 5, billingDuration);

            updatedStudent = {
                ...student,
                nextDue,
                updatedAt: nowIso,
            };
            await db.students.put(updatedStudent);
        } else if (existing.type === 'personal') {
            const addedBefore = await resolveClassesFromPersonalPayment(existing, student);
            if (addedBefore > 0) {
                updatedStudent = {
                    ...student,
                    personalClassesRemaining: Math.max(
                        0,
                        (student.personalClassesRemaining || 0) - addedBefore
                    ),
                    updatedAt: nowIso,
                };
                await db.students.put(updatedStudent);
            }
        }
    });

    await pushSingleRecord('payments', deletedPayment);
    if (updatedStudent) {
        await pushSingleRecord('students', updatedStudent);
    }
    await refreshAffectedPastSnapshots(existing.date);
}

// ---------- PRESENÇAS ----------

export async function recordAttendance(
    student: Student,
    date: string,
    attendanceType: 'normal' | 'personal' = 'normal'
): Promise<Attendance> {
    const nowIso = new Date().toISOString();
    const record: Attendance = {
        id: generateId(),
        studentId: student.id,
        studentName: student.name,
        date,
        attendanceType,
        createdAt: nowIso,
        updatedAt: nowIso,
        deletedAt: null,
    };

    let updatedStudent: Student | undefined;

    await db.transaction('rw', [db.attendance, db.students], async () => {
        await db.attendance.put(record);
        if (attendanceType === 'personal') {
            const currentStudent = await db.students.get(student.id);
            if (currentStudent && !currentStudent.deletedAt) {
                updatedStudent = {
                    ...currentStudent,
                    personalClassesRemaining: Math.max(0, (currentStudent.personalClassesRemaining || 0) - 1),
                    updatedAt: nowIso,
                };
                await db.students.put(updatedStudent);
            }
        }
    });

    await pushSingleRecord('attendance', record);
    if (updatedStudent) {
        await pushSingleRecord('students', updatedStudent);
    }
    await refreshAffectedPastSnapshots(date);

    return record;
}

export async function softDeleteAttendance(attendanceId: string): Promise<void> {
    const existing = await db.attendance.get(attendanceId);
    if (!existing) return;

    const nowIso = new Date().toISOString();
    const deleted: Attendance = {
        ...existing,
        updatedAt: nowIso,
        deletedAt: nowIso,
    };

    let updatedStudent: Student | undefined;

    await db.transaction('rw', [db.attendance, db.students], async () => {
        await db.attendance.put(deleted);
        if (existing.attendanceType === 'personal') {
            const student = await db.students.get(existing.studentId);
            if (student && !student.deletedAt) {
                updatedStudent = {
                    ...student,
                    personalClassesRemaining: (student.personalClassesRemaining || 0) + 1,
                    updatedAt: nowIso,
                };
                await db.students.put(updatedStudent);
            }
        }
    });

    await pushSingleRecord('attendance', deleted);
    if (updatedStudent) {
        await pushSingleRecord('students', updatedStudent);
    }
    await refreshAffectedPastSnapshots(existing.date);
}

// ---------- DESPESAS ----------

export async function saveExpense(
    input: Partial<Expense> & {
        description: string;
        category: Expense['category'];
        amount: number;
        date: string;
    }
): Promise<Expense> {
    const nowIso = new Date().toISOString();
    const existing = input.id ? await db.expenses.get(input.id) : undefined;

    const expense: Expense = {
        id: existing?.id || input.id || generateId(),
        description: input.description.trim(),
        category: input.category,
        amount: Number(input.amount) || 0,
        date: input.date,
        recurring: Boolean(input.recurring),
        createdAt: existing?.createdAt || input.createdAt || nowIso,
        updatedAt: nowIso,
        deletedAt: null,
    };

    await db.expenses.put(expense);
    await pushSingleRecord('expenses', expense);
    await refreshAffectedPastSnapshots(expense.date);
    if (existing?.date && existing.date !== expense.date) {
        await refreshAffectedPastSnapshots(existing.date);
    }
    return expense;
}

export async function softDeleteExpense(expenseId: string): Promise<void> {
    const existing = await db.expenses.get(expenseId);
    if (!existing) return;

    const nowIso = new Date().toISOString();
    const deleted: Expense = {
        ...existing,
        updatedAt: nowIso,
        deletedAt: nowIso,
    };
    await db.expenses.put(deleted);
    await pushSingleRecord('expenses', deleted);
    await refreshAffectedPastSnapshots(existing.date);
}

// ---------- PLANOS & PACOTES ----------

export async function savePlan(input: Partial<Plan> & { name: string; price: number }): Promise<Plan> {
    const nowIso = new Date().toISOString();
    const existing = input.id ? await db.plans.get(input.id) : undefined;

    const category = input.category || inferPlanCategory(input);
    const commitmentMonths =
        input.commitmentMonths && input.commitmentMonths > 0
            ? input.commitmentMonths
            : getCommitmentMonths({ name: input.name, category });

    const plan: Plan = {
        id: existing?.id || input.id || generateId(),
        name: input.name.trim(),
        category,
        price: Number(input.price) || 0,
        frequency: Number(input.frequency) || 1,
        durationMonths: Math.max(1, Number(input.durationMonths) || 1),
        commitmentMonths,
        sortOrder: input.sortOrder ?? existing?.sortOrder ?? 10,
        updatedAt: nowIso,
        deletedAt: null,
    };

    await db.plans.put(plan);
    await pushSingleRecord('plans', plan);
    return plan;
}

export async function softDeletePlan(planId: string): Promise<void> {
    const existing = await db.plans.get(planId);
    if (!existing) return;
    const nowIso = new Date().toISOString();
    const deleted: Plan = {
        ...existing,
        updatedAt: nowIso,
        deletedAt: nowIso,
    };
    await db.plans.put(deleted);
    await pushSingleRecord('plans', deleted);
}

export async function savePersonalPlan(
    input: Partial<PersonalPlan> & { name: string; price: number; totalClasses: number }
): Promise<PersonalPlan> {
    const nowIso = new Date().toISOString();
    const existing = input.id ? await db.personalPlans.get(input.id) : undefined;

    const plan: PersonalPlan = {
        id: existing?.id || input.id || generateId(),
        name: input.name.trim(),
        price: Number(input.price) || 0,
        totalClasses: Math.max(1, Number(input.totalClasses) || 1),
        frequencyPerWeek: Math.max(1, Number(input.frequencyPerWeek) || 1),
        updatedAt: nowIso,
        deletedAt: null,
    };

    await db.personalPlans.put(plan);
    await pushSingleRecord('personalPlans', plan);
    return plan;
}

export async function softDeletePersonalPlan(planId: string): Promise<void> {
    const existing = await db.personalPlans.get(planId);
    if (!existing) return;
    const nowIso = new Date().toISOString();
    const deleted: PersonalPlan = {
        ...existing,
        updatedAt: nowIso,
        deletedAt: nowIso,
    };
    await db.personalPlans.put(deleted);
    await pushSingleRecord('personalPlans', deleted);
}

// ---------- CONFIGURAÇÕES ----------

export async function saveSetting(key: string, value: unknown): Promise<void> {
    const item: SettingItem = {
        key,
        value,
        updatedAt: new Date().toISOString(),
        deletedAt: null,
    };
    await db.settings.put(item);
    await pushSingleRecord('settings', item);
}

export async function saveSettingsBatch(entries: Record<string, unknown>): Promise<void> {
    const nowIso = new Date().toISOString();
    const items: SettingItem[] = Object.entries(entries).map(([key, value]) => ({
        key,
        value,
        updatedAt: nowIso,
        deletedAt: null,
    }));
    await db.settings.bulkPut(items);
    await pushBatchRecords('settings', items);
}
