import React, { useEffect, useState } from 'react';
import {
    Palette,
    Cloud,
    Database,
    Layers,
    Upload,
    Download,
    RotateCcw,
    RefreshCw,
    Lock,
    CheckCircle2,
    LogOut,
    Sparkles,
    Sun,
    Moon,
    AlertTriangle,
} from 'lucide-react';
import { AppData } from '../../types';
import { db } from '../../services/db';
import { usePersonalPlans, usePlans, useSettings } from '../../hooks/useGymStore';
import { saveSetting, saveSettingsBatch } from '../../services/dataAccess';
import { buildBackupExportPayload } from '../../services/backupCleaner';
import { syncAndRepairMonthlySnapshots } from '../../services/MonthlyHistoryService';
import {
    clearLocalSupabaseConfig,
    getSupabaseConfig,
    hasEnvSupabaseConfig,
    isSupabaseConfigured,
    saveLocalSupabaseConfig,
} from '../../services/supabase';
import {
    forceUploadLocalToCloud,
    pushBatchRecords,
    refreshSyncStatusFromEnvironment,
    signInCloud,
    signInWithGoogle,
    signOutCloud,
    signUpCloud,
    startRealtimeSync,
    syncAll,
    useSyncStatus,
    verifyAuthorizedCloudUser,
} from '../../services/syncService';
import { BrandMark } from '../common/BrandMark';
import { GoogleSignInButton } from '../common/GoogleSignInButton';
import { PlanManager } from './PlanManager';
import { PersonalPlanManager } from './PersonalPlanManager';
import { BackupImportModal } from './BackupImportModal';
import { ConfirmModal } from '../UI';
import { useToast } from '../../contexts/ToastContext';

interface SettingsProps {
    darkMode: boolean;
    onToggleDarkMode: () => void;
}

type SettingsTab = 'identity' | 'plans' | 'cloud' | 'backup';

const MAX_RAW_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Redimensiona/otimiza automaticamente imagens enviadas para a logo (máx 320px)
 * permitindo que o usuário envie fotos ou logos modernas sem erro de 100KB
 * e mantendo o armazenamento/sincronização leve.
 */
function resizeLogoImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Falha ao ler arquivo.'));
        reader.onload = () => {
            const result = reader.result as string;
            if (file.type === 'image/svg+xml') {
                resolve(result);
                return;
            }
            const img = new Image();
            img.onerror = () => reject(new Error('Imagem inválida.'));
            img.onload = () => {
                const maxSide = 320;
                let { width, height } = img;
                if (width > maxSide || height > maxSide) {
                    const ratio = Math.min(maxSide / width, maxSide / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(result);
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/png', 0.9));
            };
            img.src = result;
        };
        reader.readAsDataURL(file);
    });
}

export function Settings({ darkMode, onToggleDarkMode }: SettingsProps) {
    const settings = useSettings();
    const plans = usePlans();
    const personalPlans = usePersonalPlans();
    const sync = useSyncStatus();
    const { showToast } = useToast();

    const [activeTab, setActiveTab] = useState<SettingsTab>('identity');

    // Identidade
    const [gymNameInput, setGymNameInput] = useState('RESISTÊNCIA MUAY THAI');
    const [gymLogoInput, setGymLogoInput] = useState('🥊');

    // Senha local
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Nuvem / Supabase
    const envConfigured = hasEnvSupabaseConfig();
    const currentCloudConfig = getSupabaseConfig();
    const [supaUrl, setSupaUrl] = useState(currentCloudConfig?.url || '');
    const [supaKey, setSupaKey] = useState(currentCloudConfig?.anonKey || '');
    const [authEmail, setAuthEmail] = useState('');
    const [authPass, setAuthPass] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [confirmForcePush, setConfirmForcePush] = useState(false);

    // Backup
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [pendingBackupData, setPendingBackupData] = useState<AppData | null>(null);
    const [pendingBackupName, setPendingBackupName] = useState('');
    const [isRepairing, setIsRepairing] = useState(false);

    useEffect(() => {
        const nameSet = settings.find((s) => s.key === 'gymName')?.value;
        const logoSet = settings.find((s) => s.key === 'gymLogo')?.value;
        if (nameSet) setGymNameInput(String(nameSet));
        if (logoSet) setGymLogoInput(String(logoSet));
    }, [settings]);

    const handleSaveIdentity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!gymNameInput.trim()) {
            showToast('warning', 'Informe o nome da academia.');
            return;
        }
        await saveSettingsBatch({
            gymName: gymNameInput.trim(),
            gymLogo: gymLogoInput || '🥊',
        });
        showToast('success', 'Identidade da academia salva!');
    };

    const handleResetIdentity = async () => {
        setGymNameInput('RESISTÊNCIA MUAY THAI');
        setGymLogoInput('🥊');
        await saveSettingsBatch({
            gymName: 'RESISTÊNCIA MUAY THAI',
            gymLogo: '🥊',
        });
        showToast('info', 'Identidade restaurada para o padrão.');
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showToast('warning', 'Selecione um arquivo de imagem (PNG, JPG, WebP ou SVG).');
            return;
        }
        if (file.size > MAX_RAW_UPLOAD_BYTES) {
            showToast('warning', 'A imagem deve ter no máximo 2 MB.');
            return;
        }
        try {
            const optimized = await resizeLogoImage(file);
            setGymLogoInput(optimized);
            showToast('success', 'Logo carregada e otimizada! Clique em "Salvar Identidade".');
        } catch {
            showToast('error', 'Não foi possível processar esta imagem.');
        } finally {
            e.target.value = '';
        }
    };

    const handleSaveLocalPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 4) {
            showToast('warning', 'Use uma senha com pelo menos 4 caracteres.');
            return;
        }
        if (newPassword !== confirmPassword) {
            showToast('warning', 'As senhas não conferem.');
            return;
        }
        await db.settings.put({ key: 'appPassword', value: newPassword });
        setNewPassword('');
        setConfirmPassword('');
        showToast('success', 'Senha local deste aparelho atualizada!');
    };

    const handleSaveCloudConfig = (e: React.FormEvent) => {
        e.preventDefault();
        if (!supaUrl.trim().startsWith('https://') || !supaKey.trim()) {
            showToast('warning', 'Preencha a URL (https://...) e a Anon Key do Supabase.');
            return;
        }
        saveLocalSupabaseConfig(supaUrl.trim(), supaKey.trim());
        refreshSyncStatusFromEnvironment();
        showToast('success', 'Conexão Supabase salva! Agora entre com seu e-mail e senha abaixo.');
    };

    const handleClearCloudConfig = async () => {
        await signOutCloud();
        clearLocalSupabaseConfig();
        setSupaUrl('');
        setSupaKey('');
        refreshSyncStatusFromEnvironment();
        showToast('info', 'Conexão local do Supabase removida.');
    };

    const handleCloudLogin = async (isSignUp: boolean) => {
        if (!authEmail.trim() || authPass.length < 6) {
            showToast('warning', 'Informe um e-mail válido e senha com pelo menos 6 caracteres.');
            return;
        }
        setAuthLoading(true);
        try {
            if (isSignUp) {
                const res = await signUpCloud(authEmail.trim(), authPass);
                if (res.error) {
                    showToast('error', res.error);
                    return;
                }
                if (res.needsConfirmation) {
                    showToast('info', 'Conta criada! Confirme o e-mail recebido antes de entrar.');
                    return;
                }
                const check = await verifyAuthorizedCloudUser();
                if (!check.authorized) {
                    showToast('error', `O e-mail ${check.email || ''} não está liberado em allowed_users no Supabase.`);
                    return;
                }
                await syncAll();
                startRealtimeSync();
                showToast('success', 'Conta criada e conectada à nuvem!');
            } else {
                const res = await signInCloud(authEmail.trim(), authPass);
                if (res.error) {
                    showToast('error', res.error);
                    return;
                }
                const check = await verifyAuthorizedCloudUser();
                if (!check.authorized) {
                    showToast('error', `O e-mail ${check.email || ''} não está liberado em allowed_users no Supabase.`);
                    return;
                }
                await syncAll();
                startRealtimeSync();
                showToast('success', 'Conectado e sincronizado com a nuvem!');
            }
            setAuthPass('');
        } finally {
            setAuthLoading(false);
        }
    };

    const handleSettingsGoogleLogin = async () => {
        setAuthLoading(true);
        try {
            const res = await signInWithGoogle();
            if (res.error) {
                showToast('error', res.error);
            }
        } finally {
            setAuthLoading(false);
        }
    };

    const handleForceUploadCloud = async () => {
        setConfirmForcePush(false);
        try {
            await forceUploadLocalToCloud();
            showToast('success', 'Todos os dados locais foram enviados para o Supabase!');
        } catch {
            showToast('error', 'Falha ao enviar dados para a nuvem.');
        }
    };

    const handleExportJson = async () => {
        const { data, filename } = await buildBackupExportPayload();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        await saveSetting('lastBackup', new Date().toISOString());
        showToast('success', `Backup ${filename} baixado com sucesso!`);
    };

    const handleChooseImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = JSON.parse(String(reader.result));
                setPendingBackupData(parsed);
                setPendingBackupName(file.name);
                setImportModalOpen(true);
            } catch {
                showToast('error', 'Arquivo JSON inválido ou corrompido.');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleRepairSnapshots = async () => {
        setIsRepairing(true);
        try {
            const { updated, removedFuture } = await syncAndRepairMonthlySnapshots();
            const snaps = await db.monthlySnapshots.toArray();
            await pushBatchRecords('monthlySnapshots', snaps).catch(() => {});
            showToast(
                'success',
                `Histórico recalculado (${updated} mês(es) corrigido(s), ${removedFuture} futuro(s) removido(s)).`
            );
        } catch {
            showToast('error', 'Erro ao recalcular histórico.');
        } finally {
            setIsRepairing(false);
        }
    };

    const cloudConfigured = isSupabaseConfigured();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Configurações
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Personalize a academia, configure planos, sincronize PC/Celular e gerencie backups
                </p>
            </div>

            {/* Navegação de Abas */}
            <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                {[
                    { id: 'identity', label: 'Identidade & Aparência', icon: <Palette className="w-4 h-4" /> },
                    { id: 'plans', label: `Planos (${plans.length + personalPlans.length})`, icon: <Layers className="w-4 h-4" /> },
                    { id: 'cloud', label: 'Nuvem & Celular', icon: <Cloud className="w-4 h-4" /> },
                    { id: 'backup', label: 'Backup & Limpeza', icon: <Database className="w-4 h-4" /> },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id as SettingsTab)}
                        className={`btn btn-sm ${
                            activeTab === tab.id ? 'btn-primary' : 'btn-secondary'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ABA 1: IDENTIDADE & SEGURANÇA LOCAL */}
            {activeTab === 'identity' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <form onSubmit={handleSaveIdentity} className="card p-5 space-y-4">
                        <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                            Identidade da Academia
                        </h3>

                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                            <BrandMark
                                gymName={gymNameInput || 'Academia'}
                                gymLogo={gymLogoInput}
                                size="lg"
                                subtitle="Pré-visualização no menu"
                            />
                        </div>

                        <div>
                            <label className="label">Nome da Academia</label>
                            <input
                                type="text"
                                value={gymNameInput}
                                onChange={(e) => setGymNameInput(e.target.value)}
                                className="input"
                            />
                        </div>

                        <div>
                            <label className="label">Logo (Imagem até 2MB ou Emoji)</label>
                            <div className="flex flex-wrap items-center gap-2.5">
                                <label className="btn btn-secondary btn-sm cursor-pointer">
                                    <Upload className="w-4 h-4" />
                                    Enviar Imagem
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                        className="hidden"
                                    />
                                </label>
                                <input
                                    type="text"
                                    value={gymLogoInput.startsWith('data:image') ? '' : gymLogoInput}
                                    onChange={(e) => setGymLogoInput(e.target.value)}
                                    placeholder="Ou digite um emoji (ex: 🥊)"
                                    className="input flex-1"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-between gap-2 pt-2">
                            <button
                                type="button"
                                onClick={handleResetIdentity}
                                className="btn btn-ghost btn-sm"
                            >
                                <RotateCcw className="w-4 h-4" />
                                Restaurar Padrão
                            </button>
                            <button type="submit" className="btn btn-success btn-sm">
                                Salvar Identidade
                            </button>
                        </div>
                    </form>

                    <div className="space-y-5">
                        <div className="card p-5 flex items-center justify-between gap-4">
                            <div>
                                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                                    Tema do Sistema
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Escolha entre visual claro limpo ou modo escuro noturno
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={onToggleDarkMode}
                                className="btn btn-secondary btn-sm"
                            >
                                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                                {darkMode ? 'Usar Modo Claro' : 'Usar Modo Escuro'}
                            </button>
                        </div>

                        <form onSubmit={handleSaveLocalPassword} className="card p-5 space-y-3.5">
                            <div className="flex items-center gap-2">
                                <Lock className="w-4 h-4 text-rose-600" />
                                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                                    Senha Local deste Dispositivo
                                </h3>
                            </div>
                            <p className="text-xs text-slate-500">
                                Usada apenas para desbloqueio local quando offline ou sem login na nuvem.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input
                                    type="password"
                                    placeholder="Nova senha local"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="input"
                                />
                                <input
                                    type="password"
                                    placeholder="Confirmar senha"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="input"
                                />
                            </div>
                            <div className="flex justify-end">
                                <button type="submit" className="btn btn-primary btn-sm">
                                    Atualizar Senha Local
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ABA 2: PLANOS */}
            {activeTab === 'plans' && (
                <div className="space-y-6">
                    <PlanManager />
                    <PersonalPlanManager />
                </div>
            )}

            {/* ABA 3: NUVEM & CELULAR */}
            {activeTab === 'cloud' && (
                <div className="space-y-5">
                    <div className="card p-5 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Cloud className="w-5 h-5 text-rose-600" />
                                    Sincronização PC ↔ Celular (Supabase)
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Permite acessar e lançar dados em tempo real no computador e celular, com cache offline automático.
                                </p>
                            </div>

                            <span
                                className={`badge ${
                                    sync.state === 'synced'
                                        ? 'badge-success'
                                        : sync.state === 'syncing'
                                            ? 'badge-info'
                                            : sync.state === 'error'
                                                ? 'badge-danger'
                                                : 'badge-warning'
                                }`}
                            >
                                {sync.state === 'synced' && 'Sincronizado'}
                                {sync.state === 'syncing' && 'Sincronizando...'}
                                {sync.state === 'unauthenticated' && 'Aguardando Login'}
                                {sync.state === 'local-only' && 'Modo Somente Local'}
                                {sync.state === 'offline' && 'Sem Internet'}
                                {sync.state === 'error' && 'Erro de Conexão'}
                            </span>
                        </div>

                        {sync.lastError && (
                            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                <span>{sync.lastError}</span>
                            </div>
                        )}

                        {envConfigured ? (
                            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                <span>
                                    Projeto Supabase conectado automaticamente pelas variáveis de ambiente da Vercel/servidor.
                                </span>
                            </div>
                        ) : (
                            <form onSubmit={handleSaveCloudConfig} className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                                <div className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                                    Credenciais do Projeto Supabase
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="label">Project URL</label>
                                        <input
                                            type="url"
                                            placeholder="https://seuprojeto.supabase.co"
                                            value={supaUrl}
                                            onChange={(e) => setSupaUrl(e.target.value)}
                                            className="input text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Anon Public Key</label>
                                        <input
                                            type="text"
                                            placeholder="eyJhbGciOiJIUzI1NiIs..."
                                            value={supaKey}
                                            onChange={(e) => setSupaKey(e.target.value)}
                                            className="input text-xs font-mono"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap justify-between gap-2">
                                    {cloudConfigured && (
                                        <button
                                            type="button"
                                            onClick={handleClearCloudConfig}
                                            className="btn btn-ghost btn-sm text-red-600"
                                        >
                                            Remover Configuração Local
                                        </button>
                                    )}
                                    <button type="submit" className="btn btn-primary btn-sm ml-auto">
                                        Salvar Credenciais Supabase
                                    </button>
                                </div>
                            </form>
                        )}

                        {cloudConfigured && (
                            sync.userEmail ? (
                                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <div className="text-xs font-bold uppercase text-slate-400">
                                                Conta Conectada
                                            </div>
                                            <div className="font-bold text-slate-900 dark:text-white">
                                                {sync.userEmail}
                                            </div>
                                            {sync.lastSyncedAt && (
                                                <div className="text-xs text-slate-500">
                                                    Última sincronização:{' '}
                                                    {new Date(sync.lastSyncedAt).toLocaleString('pt-BR')}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => syncAll()}
                                                className="btn btn-success btn-sm"
                                            >
                                                <RefreshCw
                                                    className={`w-4 h-4 ${
                                                        sync.state === 'syncing' ? 'animate-spin' : ''
                                                    }`}
                                                />
                                                Sincronizar Agora
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setConfirmForcePush(true)}
                                                className="btn btn-secondary btn-sm"
                                            >
                                                <Upload className="w-4 h-4" />
                                                Enviar Dados Locais → Nuvem
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => signOutCloud()}
                                                className="btn btn-ghost btn-sm text-red-600"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                Desconectar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                                        Entrar na Conta da Academia (Supabase Auth)
                                    </div>
                                    <GoogleSignInButton
                                        onClick={handleSettingsGoogleLogin}
                                        loading={authLoading}
                                    />
                                    <div className="relative flex items-center py-0.5">
                                        <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
                                        <span className="mx-3 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                                            ou com e-mail e senha
                                        </span>
                                        <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <input
                                            type="email"
                                            placeholder="E-mail"
                                            value={authEmail}
                                            onChange={(e) => setAuthEmail(e.target.value)}
                                            className="input"
                                        />
                                        <input
                                            type="password"
                                            placeholder="Senha (mín. 6 caracteres)"
                                            value={authPass}
                                            onChange={(e) => setAuthPass(e.target.value)}
                                            className="input"
                                        />
                                    </div>
                                    <div className="flex flex-wrap gap-2 justify-end">
                                        <button
                                            type="button"
                                            disabled={authLoading}
                                            onClick={() => handleCloudLogin(true)}
                                            className="btn btn-secondary btn-sm"
                                        >
                                            Criar Conta
                                        </button>
                                        <button
                                            type="button"
                                            disabled={authLoading}
                                            onClick={() => handleCloudLogin(false)}
                                            className="btn btn-primary btn-sm"
                                        >
                                            Conectar &amp; Sincronizar
                                        </button>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </div>
            )}

            {/* ABA 4: BACKUP & HIGIENIZAÇÃO */}
            {activeTab === 'backup' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="card p-5 flex flex-col justify-between gap-4">
                        <div className="space-y-1.5">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                                <Download className="w-5 h-5" />
                            </div>
                            <h3 className="font-display font-bold text-slate-900 dark:text-white">
                                Exportar Backup Completo
                            </h3>
                            <p className="text-xs text-slate-500">
                                Baixa um arquivo JSON com todos os alunos, pagamentos, despesas, planos e configurações.
                            </p>
                        </div>
                        <button type="button" onClick={handleExportJson} className="btn btn-success w-full">
                            <Download className="w-4 h-4" />
                            Baixar Backup (.json)
                        </button>
                    </div>

                    <div className="card p-5 flex flex-col justify-between gap-4 border-rose-200 dark:border-rose-900/50">
                        <div className="space-y-1.5">
                            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <h3 className="font-display font-bold text-slate-900 dark:text-white">
                                Importar &amp; Higienizar Backup
                            </h3>
                            <p className="text-xs text-slate-500">
                                Restaura seu arquivo JSON corrigindo vencimentos +1 dia, alunos duplicados e histórico mensal.
                            </p>
                        </div>
                        <label className="btn btn-primary w-full cursor-pointer">
                            <Upload className="w-4 h-4" />
                            Selecionar Arquivo JSON
                            <input
                                type="file"
                                accept=".json,application/json"
                                onChange={handleChooseImportFile}
                                className="hidden"
                            />
                        </label>
                    </div>

                    <div className="card p-5 flex flex-col justify-between gap-4">
                        <div className="space-y-1.5">
                            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 flex items-center justify-center">
                                <RefreshCw className="w-5 h-5" />
                            </div>
                            <h3 className="font-display font-bold text-slate-900 dark:text-white">
                                Recalcular Histórico
                            </h3>
                            <p className="text-xs text-slate-500">
                                Reconstrói os fechamentos de meses passados usando os lançamentos reais de receita e despesa.
                            </p>
                        </div>
                        <button
                            type="button"
                            disabled={isRepairing}
                            onClick={handleRepairSnapshots}
                            className="btn btn-secondary w-full"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRepairing ? 'animate-spin' : ''}`} />
                            {isRepairing ? 'Recalculando...' : 'Recalcular Meses Passados'}
                        </button>
                    </div>
                </div>
            )}

            <BackupImportModal
                isOpen={importModalOpen}
                onClose={() => {
                    setImportModalOpen(false);
                    setPendingBackupData(null);
                }}
                rawData={pendingBackupData}
                filename={pendingBackupName}
            />

            <ConfirmModal
                isOpen={confirmForcePush}
                title="Enviar Dados Locais para Nuvem"
                message="Deseja enviar todos os dados deste computador/aparelho para o Supabase agora?\n\nUse isso após importar um backup limpo ou na primeira migração para a nuvem."
                confirmText="Enviar Agora"
                variant="info"
                onConfirm={handleForceUploadCloud}
                onCancel={() => setConfirmForcePush(false)}
            />
        </div>
    );
}
