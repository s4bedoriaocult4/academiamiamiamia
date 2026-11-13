import { useEffect, useMemo, useState } from 'react';
import {
    useDbInit,
    usePayments,
    usePersonalPlans,
    usePlans,
    useSettings,
    useStudents,
} from './hooks/useGymStore';
import { Payment, Student } from './types';
import { getStudentPaymentStatus } from './utils/dateUtils';
import { saveSetting } from './services/dataAccess';
import { checkAndCloseMonth } from './services/MonthlyHistoryService';
import { getSupabaseClient, isSupabaseConfigured } from './services/supabase';
import {
    pushBatchRecords,
    refreshSyncStatusFromEnvironment,
    signOutCloud,
    startRealtimeSync,
    stopRealtimeSync,
    syncAll,
    verifyAuthorizedCloudUser,
} from './services/syncService';
import { db } from './services/db';
import { AppShell, NavTab } from './components/layout/AppShell';
import { LoginPage } from './components/auth/LoginPage';
import { Dashboard } from './components/dashboard/Dashboard';
import { StudentList } from './components/students/StudentList';
import { PersonalDashboard } from './components/students/PersonalDashboard';
import { FinancialHub } from './components/financial/FinancialHub';
import { AttendanceManager } from './components/attendance/AttendanceManager';
import { Settings } from './components/settings/Settings';
import { HelpPage } from './components/help/HelpPage';
import { StudentModal } from './components/students/StudentModal';
import { PaymentModal } from './components/payments/PaymentModal';
import { LoadingOverlay } from './components/UI';
import { DEFAULT_GYM_NAME, resolveGymLogo } from './utils/branding';

export default function App() {
    const isDbReady = useDbInit();
    const students = useStudents();
    const payments = usePayments();
    const plans = usePlans();
    const personalPlans = usePersonalPlans();
    const settings = useSettings();

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const [cloudAuthError, setCloudAuthError] = useState('');
    const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
    const [darkMode, setDarkMode] = useState(false);

    // Modais globais rápidos (acessíveis do Dashboard, Alunos, Personal ou Caixa)
    const [quickStudentModalOpen, setQuickStudentModalOpen] = useState(false);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [paymentToEdit, setPaymentToEdit] = useState<Payment | null>(null);
    const [paymentStudent, setPaymentStudent] = useState<Student | null>(null);
    const [paymentInitialType, setPaymentInitialType] = useState<'pagamento' | 'personal' | 'entrada'>('pagamento');

    const gymName = useMemo(
        () => String(settings.find((s) => s.key === 'gymName')?.value || DEFAULT_GYM_NAME),
        [settings]
    );
    const gymLogo = useMemo(
        () => resolveGymLogo(settings.find((s) => s.key === 'gymLogo')?.value),
        [settings]
    );

    const overdueCount = useMemo(
        () =>
            students.filter(
                (s) => s.status === 'ativo' && getStudentPaymentStatus(s).status === 'overdue'
            ).length,
        [students]
    );

    // Tema claro / escuro via classe 'dark' no <html>
    useEffect(() => {
        const storedDark = settings.find((s) => s.key === 'darkMode')?.value;
        if (storedDark !== undefined) {
            setDarkMode(Boolean(storedDark));
        }
    }, [settings]);

    useEffect(() => {
        const root = document.documentElement;
        if (darkMode) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [darkMode]);

    // Verificação inicial de sessão (Nuvem Supabase ou Remembered Local)
    useEffect(() => {
        if (!isDbReady) return;

        let unsubAuth: (() => void) | undefined;
        let activeSessionCheck: Promise<void> | null = null;
        let lastVerifiedUserId: string | null = null;

        const handleAuthenticatedCloudSession = async (userId?: string) => {
            if (userId && lastVerifiedUserId === userId) return;
            if (activeSessionCheck) return activeSessionCheck;

            activeSessionCheck = (async () => {
                const check = await verifyAuthorizedCloudUser();
                if (window.location.search.includes('code=') || window.location.hash.includes('access_token=')) {
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
                if (!check.authorized) {
                    lastVerifiedUserId = null;
                    if (check.reason === 'unauthorized') {
                        setCloudAuthError(
                            `O e-mail ${check.email || 'informado'} ainda não está liberado na lista allowed_users do Supabase.`
                        );
                    }
                    setIsAuthenticated(false);
                    stopRealtimeSync();
                    return;
                }
                lastVerifiedUserId = userId || check.email || 'verified';
                setCloudAuthError('');
                setIsAuthenticated(true);
                syncAll().then(() => startRealtimeSync());
            })().finally(() => {
                activeSessionCheck = null;
            });

            return activeSessionCheck;
        };

        const initSession = async () => {
            const searchParams = new URLSearchParams(window.location.search);
            const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
            const oauthError =
                searchParams.get('error_description') ||
                searchParams.get('error') ||
                hashParams.get('error_description') ||
                hashParams.get('error');
            if (oauthError) {
                setCloudAuthError(`Falha no login com Google: ${oauthError}`);
                window.history.replaceState({}, document.title, window.location.pathname);
            }

            const remembered = localStorage.getItem('gym_remembered') === 'true';
            const supabase = getSupabaseClient();

            if (supabase) {
                const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
                    if (session) {
                        handleAuthenticatedCloudSession(session.user?.id);
                    } else {
                        lastVerifiedUserId = null;
                        stopRealtimeSync();
                        refreshSyncStatusFromEnvironment();
                    }
                });
                unsubAuth = () => listener.subscription.unsubscribe();

                const { data } = await supabase.auth.getSession();
                if (data.session) {
                    await handleAuthenticatedCloudSession(data.session.user?.id);
                } else if (remembered && !navigator.onLine) {
                    // Permite acesso offline caso já autenticado anteriormente no aparelho
                    setIsAuthenticated(true);
                }
            } else if (remembered) {
                setIsAuthenticated(true);
            }

            setCheckingSession(false);
        };

        initSession();
        return () => {
            unsubAuth?.();
            stopRealtimeSync();
        };
    }, [isDbReady]);

    // Sincronizar automaticamente ao recuperar internet e reparar fechamentos mensais no início
    useEffect(() => {
        if (!isDbReady || !isAuthenticated) return;

        checkAndCloseMonth()
            .then(async (updated) => {
                if (updated && isSupabaseConfigured()) {
                    const snaps = await db.monthlySnapshots.toArray();
                    pushBatchRecords('monthlySnapshots', snaps).catch(() => {});
                }
            })
            .catch(() => {});

        const handleOnline = () => {
            refreshSyncStatusFromEnvironment();
            syncAll();
        };
        const handleOffline = () => {
            refreshSyncStatusFromEnvironment();
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [isDbReady, isAuthenticated]);

    const handleToggleDarkMode = async () => {
        const next = !darkMode;
        setDarkMode(next);
        await saveSetting('darkMode', next);
    };

    const handleLockApp = async () => {
        localStorage.removeItem('gym_remembered');
        if (isSupabaseConfigured()) {
            await signOutCloud();
        }
        setIsAuthenticated(false);
    };

    const openPaymentModal = (
        student?: Student | null,
        type: 'pagamento' | 'personal' | 'entrada' = 'pagamento',
        editPayment?: Payment | null
    ) => {
        setPaymentStudent(student || null);
        setPaymentInitialType(type);
        setPaymentToEdit(editPayment || null);
        setPaymentModalOpen(true);
    };

    if (!isDbReady || checkingSession) {
        return <LoadingOverlay message="Preparando sistema da academia..." />;
    }

    if (!isAuthenticated) {
        return (
            <LoginPage
                initialError={cloudAuthError}
                onLoginSuccess={() => {
                    setCloudAuthError('');
                    setIsAuthenticated(true);
                }}
            />
        );
    }

    return (
        <>
            <AppShell
                currentTab={currentTab}
                onSelectTab={setCurrentTab}
                gymName={gymName}
                gymLogo={gymLogo}
                darkMode={darkMode}
                onToggleDarkMode={handleToggleDarkMode}
                onLockApp={handleLockApp}
                overdueCount={overdueCount}
            >
                {currentTab === 'dashboard' && (
                    <Dashboard
                        gymName={gymName}
                        onNavigate={setCurrentTab}
                        onQuickNewStudent={() => setQuickStudentModalOpen(true)}
                        onQuickPayment={(st) => openPaymentModal(st || null, 'pagamento')}
                    />
                )}

                {currentTab === 'students' && (
                    <StudentList
                        gymName={gymName}
                        onOpenPayment={(st) => openPaymentModal(st, 'pagamento')}
                    />
                )}

                {currentTab === 'finance' && (
                    <FinancialHub
                        gymName={gymName}
                        onNewPayment={() => openPaymentModal(null, 'pagamento')}
                        onEditPayment={(p) => openPaymentModal(null, 'pagamento', p)}
                    />
                )}

                {currentTab === 'attendance' && <AttendanceManager />}

                {currentTab === 'personal' && (
                    <PersonalDashboard
                        gymName={gymName}
                        onSellPackage={(st) => openPaymentModal(st, 'personal')}
                    />
                )}

                {currentTab === 'settings' && (
                    <Settings
                        darkMode={darkMode}
                        onToggleDarkMode={handleToggleDarkMode}
                    />
                )}

                {currentTab === 'help' && <HelpPage />}
            </AppShell>

            <StudentModal
                isOpen={quickStudentModalOpen}
                onClose={() => setQuickStudentModalOpen(false)}
                studentToEdit={null}
                plans={plans}
                personalPlans={personalPlans}
                existingStudents={students}
            />

            <PaymentModal
                isOpen={paymentModalOpen}
                onClose={() => {
                    setPaymentModalOpen(false);
                    setPaymentToEdit(null);
                    setPaymentStudent(null);
                }}
                paymentToEdit={paymentToEdit}
                preselectedStudent={paymentStudent}
                initialType={paymentInitialType}
                students={students}
                payments={payments}
                plans={plans}
                personalPlans={personalPlans}
                gymName={gymName}
            />
        </>
    );
}
