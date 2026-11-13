import React, { useState, useEffect } from 'react';
import {
    Lock,
    Eye,
    EyeOff,
    Cloud,
    ArrowRight,
    CheckCircle2,
    ShieldCheck,
    WifiOff,
} from 'lucide-react';
import { db } from '../../services/db';
import { isSupabaseConfigured, saveLocalSupabaseConfig } from '../../services/supabase';
import {
    signInCloud,
    signInWithGoogle,
    syncAll,
    UNAUTHORIZED_EMAIL_MESSAGE,
    verifyAuthorizedCloudUser,
} from '../../services/syncService';
import { BrandMark } from '../common/BrandMark';
import { GoogleSignInButton } from '../common/GoogleSignInButton';
import { verifyLocalPassword } from '../../utils/authHash';
import { DEFAULT_GYM_LOGO, DEFAULT_GYM_NAME, resolveGymLogo } from '../../utils/branding';

interface LoginPageProps {
    onLoginSuccess: () => void;
    initialError?: string;
}

export function LoginPage({ onLoginSuccess, initialError = '' }: LoginPageProps) {
    const cloudConfigured = isSupabaseConfigured();

    const [mode, setMode] = useState<'cloud' | 'local'>(cloudConfigured ? 'cloud' : 'local');
    const [gymName, setGymName] = useState(DEFAULT_GYM_NAME);
    const [gymLogo, setGymLogo] = useState(DEFAULT_GYM_LOGO);

    // Estado Local (PIN / Senha local customizada, se existir)
    const [customStoredPassword, setCustomStoredPassword] = useState<string | null>(null);
    const [localPassword, setLocalPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(true);

    // Estado Nuvem (Supabase Auth)
    const [email, setEmail] = useState('');
    const [cloudPassword, setCloudPassword] = useState('');

    // Conexão rápida opcional direto no login
    const [showQuickCloudSetup, setShowQuickCloudSetup] = useState(false);
    const [quickUrl, setQuickUrl] = useState('');
    const [quickKey, setQuickKey] = useState('');

    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState(initialError);
    const [isLoading, setIsLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    useEffect(() => {
        if (initialError) {
            setError(initialError);
        }
    }, [initialError]);

    useEffect(() => {
        const loadBrandingAndAuth = async () => {
            try {
                const [passSetting, nameSetting, logoSetting] = await Promise.all([
                    db.settings.get('appPassword'),
                    db.settings.get('gymName'),
                    db.settings.get('gymLogo'),
                ]);

                if (passSetting?.value) setCustomStoredPassword(String(passSetting.value));
                if (nameSetting?.value) setGymName(String(nameSetting.value));
                if (logoSetting?.value) setGymLogo(resolveGymLogo(logoSetting.value));
            } catch {
                // Usa padrões iniciais
            }
        };
        loadBrandingAndAuth();
    }, []);

    const handleLocalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (verifyLocalPassword(localPassword, customStoredPassword)) {
                if (rememberMe) {
                    localStorage.setItem('gym_remembered', 'true');
                }
                onLoginSuccess();
            } else {
                setError('Senha incorreta. Tente novamente.');
                setLocalPassword('');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloudSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email.trim() || !cloudPassword) {
            setError('Informe seu e-mail e senha.');
            return;
        }

        setIsLoading(true);
        try {
            const res = await signInCloud(email.trim(), cloudPassword);
            if (res.error) {
                setError(res.error);
                setIsLoading(false);
                return;
            }
            const check = await verifyAuthorizedCloudUser();
            if (!check.authorized) {
                setError(UNAUTHORIZED_EMAIL_MESSAGE);
                setIsLoading(false);
                return;
            }
            if (rememberMe) {
                localStorage.setItem('gym_remembered', 'true');
            }
            await syncAll();
            onLoginSuccess();
        } catch {
            setError('Não foi possível conectar ao servidor. Verifique sua internet.');
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setError('');
        setGoogleLoading(true);
        try {
            const res = await signInWithGoogle();
            if (res.error) {
                setError(res.error);
            }
        } catch {
            setError('Não foi possível iniciar o login com Google.');
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleSaveQuickCloud = () => {
        if (!quickUrl.trim().startsWith('https://') || !quickKey.trim()) {
            setError('Informe a URL (https://...) e a Chave Anon do Supabase.');
            return;
        }
        saveLocalSupabaseConfig(quickUrl.trim(), quickKey.trim());
        setShowQuickCloudSetup(false);
        setMode('cloud');
        setError('');
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md space-y-6">
                {/* Identidade */}
                <div className="flex flex-col items-center text-center space-y-3">
                    <BrandMark gymName={gymName} gymLogo={gymLogo} size="lg" showName={false} />
                    <div>
                        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                            {gymName}
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Sistema de Gestão Simples &amp; Integrado
                        </p>
                    </div>
                </div>

                {/* Card Principal */}
                <div className="card p-6 sm:p-7 space-y-5 shadow-lg">
                    {cloudConfigured && (
                        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                            <button
                                type="button"
                                onClick={() => {
                                    setMode('cloud');
                                    setError('');
                                }}
                                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                    mode === 'cloud'
                                        ? 'bg-white dark:bg-slate-900 text-rose-600 shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400'
                                }`}
                            >
                                <Cloud className="w-3.5 h-3.5" />
                                Acesso Nuvem
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setMode('local');
                                    setError('');
                                }}
                                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                    mode === 'local'
                                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400'
                                }`}
                            >
                                <WifiOff className="w-3.5 h-3.5" />
                                Senha Local
                            </button>
                        </div>
                    )}

                    {mode === 'cloud' && cloudConfigured ? (
                        <form onSubmit={handleCloudSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <h2 className="font-bold text-slate-900 dark:text-white text-base">
                                    Entrar com conta sincronizada
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Seus alunos e caixa ficam sincronizados entre PC e celular.
                                </p>
                            </div>

                            <GoogleSignInButton
                                onClick={handleGoogleSignIn}
                                loading={googleLoading}
                                disabled={isLoading}
                            />

                            <div className="relative flex items-center py-0.5">
                                <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
                                <span className="mx-3 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                                    ou com e-mail e senha
                                </span>
                                <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
                            </div>

                            <div>
                                <label className="label" htmlFor="login-email">
                                    E-mail
                                </label>
                                <input
                                    id="login-email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input"
                                />
                            </div>

                            <div>
                                <label className="label" htmlFor="login-cloud-pass">
                                    Senha
                                </label>
                                <div className="relative">
                                    <input
                                        id="login-cloud-pass"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        autoComplete="current-password"
                                        placeholder="••••••••"
                                        value={cloudPassword}
                                        onChange={(e) => setCloudPassword(e.target.value)}
                                        className="input pr-11"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-medium text-red-700 dark:text-red-300">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="btn btn-primary w-full py-3"
                            >
                                {isLoading ? 'Conectando...' : 'Entrar e Sincronizar'}
                                <ArrowRight className="w-4 h-4" />
                            </button>

                            <div className="flex items-center justify-end text-xs pt-1">
                                <button
                                    type="button"
                                    onClick={() => setMode('local')}
                                    className="font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400"
                                >
                                    Usar senha local
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleLocalSubmit} className="space-y-4">
                            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold text-base">
                                <Lock className="w-4 h-4 text-rose-600" />
                                <span>Desbloquear Sistema</span>
                            </div>

                            <div>
                                <label className="label" htmlFor="login-local-pass">
                                    Senha de Acesso Local
                                </label>
                                <div className="relative">
                                    <input
                                        id="login-local-pass"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        autoFocus
                                        placeholder="Digite a senha do aparelho"
                                        value={localPassword}
                                        onChange={(e) => setLocalPassword(e.target.value)}
                                        className="input pr-11"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <label className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                                />
                                <span>Manter conectado neste aparelho</span>
                            </label>

                            {error && (
                                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-medium text-red-700 dark:text-red-300">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="btn btn-primary w-full py-3"
                            >
                                Entrar no Sistema
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </form>
                    )}

                    {/* Conexão rápida opcional */}
                    {!cloudConfigured && (
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                            {!showQuickCloudSetup ? (
                                <button
                                    type="button"
                                    onClick={() => setShowQuickCloudSetup(true)}
                                    className="w-full text-xs font-semibold text-slate-500 hover:text-rose-600 dark:text-slate-400 flex items-center justify-center gap-1.5"
                                >
                                    <Cloud className="w-3.5 h-3.5" />
                                    Quer sincronizar com o celular? Conectar Supabase aqui
                                </button>
                            ) : (
                                <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                        Conectar Projeto Supabase
                                    </div>
                                    <input
                                        type="url"
                                        placeholder="https://xxxxx.supabase.co"
                                        value={quickUrl}
                                        onChange={(e) => setQuickUrl(e.target.value)}
                                        className="input text-xs py-2"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Anon Public Key"
                                        value={quickKey}
                                        onChange={(e) => setQuickKey(e.target.value)}
                                        className="input text-xs py-2 font-mono"
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setShowQuickCloudSetup(false)}
                                            className="btn btn-ghost btn-sm"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSaveQuickCloud}
                                            className="btn btn-primary btn-sm"
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            Salvar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Funciona offline com salvamento automático seguro</span>
                </div>
            </div>
        </div>
    );
}
