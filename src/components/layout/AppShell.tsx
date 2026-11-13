import React, { useEffect, useState } from 'react';
import {
    LayoutDashboard,
    Users,
    Wallet,
    CalendarCheck,
    Dumbbell,
    Settings as SettingsIcon,
    HelpCircle,
    Sun,
    Moon,
    Lock,
    Cloud,
    CloudOff,
    RefreshCw,
    Download,
    Menu,
    X,
    CheckCircle2,
    AlertTriangle,
} from 'lucide-react';
import { BrandMark } from '../common/BrandMark';
import { syncAll, useSyncStatus } from '../../services/syncService';

export type NavTab =
    | 'dashboard'
    | 'students'
    | 'finance'
    | 'attendance'
    | 'personal'
    | 'settings'
    | 'help';

interface AppShellProps {
    currentTab: NavTab;
    onSelectTab: (tab: NavTab) => void;
    gymName: string;
    gymLogo: string;
    darkMode: boolean;
    onToggleDarkMode: () => void;
    onLockApp: () => void;
    overdueCount: number;
    children: React.ReactNode;
}

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function AppShell({
    currentTab,
    onSelectTab,
    gymName,
    gymLogo,
    darkMode,
    onToggleDarkMode,
    onLockApp,
    overdueCount,
    children,
}: AppShellProps) {
    const sync = useSyncStatus();
    const [moreSheetOpen, setMoreSheetOpen] = useState(false);
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e as BeforeInstallPromptEvent);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallPwa = async () => {
        if (!installPrompt) return;
        await installPrompt.prompt();
        await installPrompt.userChoice;
        setInstallPrompt(null);
    };

    const navItems: {
        id: NavTab;
        label: string;
        shortLabel: string;
        icon: React.ReactNode;
        badge?: number;
        primaryMobile?: boolean;
    }[] = [
        {
            id: 'dashboard',
            label: 'Início / Resumo',
            shortLabel: 'Início',
            icon: <LayoutDashboard className="w-5 h-5" />,
            primaryMobile: true,
        },
        {
            id: 'students',
            label: 'Alunos',
            shortLabel: 'Alunos',
            icon: <Users className="w-5 h-5" />,
            badge: overdueCount > 0 ? overdueCount : undefined,
            primaryMobile: true,
        },
        {
            id: 'finance',
            label: 'Financeiro',
            shortLabel: 'Caixa',
            icon: <Wallet className="w-5 h-5" />,
            primaryMobile: true,
        },
        {
            id: 'attendance',
            label: 'Presença',
            shortLabel: 'Presença',
            icon: <CalendarCheck className="w-5 h-5" />,
            primaryMobile: true,
        },
        {
            id: 'personal',
            label: 'Personal',
            shortLabel: 'Personal',
            icon: <Dumbbell className="w-5 h-5" />,
        },
        {
            id: 'settings',
            label: 'Configurações',
            shortLabel: 'Config.',
            icon: <SettingsIcon className="w-5 h-5" />,
        },
        {
            id: 'help',
            label: 'Ajuda & Manual',
            shortLabel: 'Ajuda',
            icon: <HelpCircle className="w-5 h-5" />,
        },
    ];

    const primaryMobileItems = navItems.filter((i) => i.primaryMobile);
    const secondaryItems = navItems.filter((i) => !i.primaryMobile);

    const renderSyncPill = (compact = false) => {
        let bg = 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
        let icon = <Cloud className="w-3.5 h-3.5 shrink-0" />;
        let label = 'Local';

        if (sync.state === 'syncing') {
            bg = 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800';
            icon = <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />;
            label = 'Sincronizando...';
        } else if (sync.state === 'synced') {
            bg = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60';
            icon = <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />;
            label = 'Nuvem em dia';
        } else if (sync.state === 'offline') {
            bg = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60';
            icon = <CloudOff className="w-3.5 h-3.5 shrink-0" />;
            label = 'Offline (Local)';
        } else if (sync.state === 'error') {
            bg = 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60';
            icon = <AlertTriangle className="w-3.5 h-3.5 shrink-0" />;
            label = 'Erro na sync';
        } else if (sync.state === 'unauthenticated') {
            bg = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60';
            icon = <Cloud className="w-3.5 h-3.5 shrink-0" />;
            label = 'Nuvem desconectada';
        } else {
            label = 'Modo Local';
        }

        const handleAction = () => {
            if (sync.state === 'synced' || sync.state === 'error' || sync.state === 'offline') {
                syncAll();
            } else {
                onSelectTab('settings');
            }
        };

        return (
            <button
                type="button"
                onClick={handleAction}
                title={sync.lastError || (sync.lastSyncedAt ? `Última sync: ${new Date(sync.lastSyncedAt).toLocaleTimeString('pt-BR')}` : 'Configurar nuvem')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${bg}`}
            >
                {icon}
                {!compact && <span className="truncate">{label}</span>}
            </button>
        );
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950">
            {/* Sidebar Desktop */}
            <aside className="hidden md:flex md:flex-col md:w-64 lg:w-72 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-screen sticky top-0 no-print">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                    <BrandMark gymName={gymName} gymLogo={gymLogo} subtitle="Gestão de Academia" />
                </div>

                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const active = currentTab === item.id;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => onSelectTab(item.id)}
                                className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-75 cursor-pointer ${
                                    active
                                        ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/20'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                                }`}
                            >
                                <span className="flex items-center gap-3 min-w-0">
                                    {item.icon}
                                    <span className="truncate">{item.label}</span>
                                </span>
                                {item.badge !== undefined && (
                                    <span
                                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                            active
                                                ? 'bg-white/20 text-white'
                                                : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                                        }`}
                                    >
                                        {item.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                        {renderSyncPill()}
                        <button
                            type="button"
                            onClick={onToggleDarkMode}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                            title={darkMode ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
                        >
                            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>
                    </div>

                    {installPrompt && (
                        <button
                            type="button"
                            onClick={handleInstallPwa}
                            className="w-full btn btn-secondary btn-sm justify-start text-rose-600 dark:text-rose-400"
                        >
                            <Download className="w-4 h-4" />
                            Instalar App no Computador
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={onLockApp}
                        className="w-full btn btn-ghost btn-sm justify-start text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                    >
                        <Lock className="w-4 h-4" />
                        Bloquear / Sair
                    </button>
                </div>
            </aside>

            {/* Cabeçalho Mobile */}
            <header className="md:hidden sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between gap-2 no-print">
                <BrandMark gymName={gymName} gymLogo={gymLogo} size="sm" />
                <div className="flex items-center gap-1.5">
                    {renderSyncPill(true)}
                    <button
                        type="button"
                        onClick={onToggleDarkMode}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        aria-label="Alternar tema"
                    >
                        {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>
                </div>
            </header>

            {/* Área Principal */}
            <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 max-w-[1400px] w-full mx-auto">
                {children}
            </main>

            {/* Barra Inferior Mobile (Thumb-friendly) */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 px-1 py-1.5 grid grid-cols-5 gap-1 no-print">
                {primaryMobileItems.map((item) => {
                    const active = currentTab === item.id;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                                onSelectTab(item.id);
                                setMoreSheetOpen(false);
                            }}
                            className={`relative flex flex-col items-center justify-center py-1 rounded-xl text-[11px] font-semibold transition-colors ${
                                active
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-slate-500 dark:text-slate-400'
                            }`}
                        >
                            {item.icon}
                            <span className="mt-0.5 truncate max-w-full px-1">{item.shortLabel}</span>
                            {item.badge !== undefined && (
                                <span className="absolute top-0.5 right-3 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    );
                })}

                <button
                    type="button"
                    onClick={() => setMoreSheetOpen((v) => !v)}
                    className={`flex flex-col items-center justify-center py-1 rounded-xl text-[11px] font-semibold transition-colors ${
                        moreSheetOpen || secondaryItems.some((s) => s.id === currentTab)
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-500 dark:text-slate-400'
                    }`}
                >
                    {moreSheetOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    <span className="mt-0.5">Mais</span>
                </button>
            </nav>

            {/* Gaveta "Mais" no Mobile */}
            {moreSheetOpen && (
                <div
                    className="md:hidden fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-[2px] flex items-end pb-16"
                    onClick={() => setMoreSheetOpen(false)}
                >
                    <div
                        className="w-full bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 p-5 space-y-2 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                            <span className="font-display font-bold text-slate-900 dark:text-white">
                                Mais Opções
                            </span>
                            {renderSyncPill(false)}
                        </div>

                        {secondaryItems.map((item) => {
                            const active = currentTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        onSelectTab(item.id);
                                        setMoreSheetOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold ${
                                        active
                                            ? 'bg-rose-600 text-white'
                                            : 'bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200'
                                    }`}
                                >
                                    {item.icon}
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}

                        {installPrompt && (
                            <button
                                type="button"
                                onClick={handleInstallPwa}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                            >
                                <Download className="w-5 h-5" />
                                <span>Instalar App no Celular</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => {
                                setMoreSheetOpen(false);
                                onLockApp();
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400"
                        >
                            <Lock className="w-5 h-5" />
                            <span>Bloquear / Sair</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
