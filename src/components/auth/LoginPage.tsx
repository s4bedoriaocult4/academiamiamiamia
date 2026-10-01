import { useState, useEffect } from 'react';
import { Lock, ShieldCheck, Eye, EyeOff, Sparkles } from 'lucide-react';
import { db } from '../../services/db';

interface LoginPageProps {
    onLogin: () => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isFirstTime, setIsFirstTime] = useState(false);
    const [error, setError] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [gymName, setGymName] = useState('RESISTÊNCIA MUAY THAI');
    const [gymLogo, setGymLogo] = useState('🥊');

    useEffect(() => {
        const checkPasswordAndIdentity = async () => {
            const savedPassword = await db.settings.get('appPassword');
            if (!savedPassword?.value) {
                setIsFirstTime(true);
            }
            const savedGymName = await db.settings.get('gymName');
            if (savedGymName?.value) {
                setGymName(savedGymName.value);
            }
            const savedGymLogo = await db.settings.get('gymLogo');
            if (savedGymLogo?.value) {
                setGymLogo(savedGymLogo.value);
            }
        };
        checkPasswordAndIdentity();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Simular pequeno delay para feedback visual
        await new Promise(resolve => setTimeout(resolve, 300));

        if (isFirstTime) {
            if (!password || password.length < 4) {
                setError('A senha deve ter pelo menos 4 caracteres');
                setIsLoading(false);
                return;
            }
            if (password !== confirmPassword) {
                setError('As senhas não coincidem');
                setIsLoading(false);
                return;
            }
            await db.settings.put({ key: 'appPassword', value: password });
            if (rememberMe) {
                sessionStorage.setItem('gym_remembered', 'true');
            }
            onLogin();
        } else {
            const savedPassword = await db.settings.get('appPassword');
            if (!savedPassword?.value) {
                setError('Erro: senha não encontrada. Recarregue a página.');
                setIsLoading(false);
                return;
            }
            if (password !== savedPassword.value) {
                setError('Senha incorreta');
                setIsLoading(false);
                return;
            }
            if (rememberMe) {
                sessionStorage.setItem('gym_remembered', 'true');
            }
            onLogin();
        }
    };

    return (
        <div className="login-page">
            {/* Animated Background */}
            <div className="login-bg">
                <div className="login-bg-shape login-bg-shape-1"></div>
                <div className="login-bg-shape login-bg-shape-2"></div>
                <div className="login-bg-shape login-bg-shape-3"></div>
            </div>

            {/* Login Card */}
            <div className="login-card">
                {/* Logo Section */}
                <div className="login-header">
                    <div className="login-logo">
                        <div className="login-logo-icon">
                            {gymLogo.startsWith('data:image') ? (
                                <img src={gymLogo} className="logo-img w-16 h-16 object-contain rounded-xl" alt="Logo" />
                            ) : (
                                <span className="login-emoji">{gymLogo}</span>
                            )}
                            <ShieldCheck size={24} className="login-shield" />
                        </div>
                    </div>
                    <h1 className="login-title">{gymName}</h1>
                    <p className="login-subtitle">
                        {isFirstTime ? (
                            <>
                                <Sparkles size={14} style={{ display: 'inline', marginRight: '6px' }} />
                                Bem-vindo! Configure sua senha de acesso
                            </>
                        ) : (
                            'Digite sua senha para continuar'
                        )}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="login-form">
                    <div className="login-form-group">
                        <label className="login-label">
                            {isFirstTime ? 'Criar Senha' : 'Senha'}
                        </label>
                        <div className="login-input-wrapper">
                            <Lock size={18} className="login-input-icon" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="login-input"
                                placeholder={isFirstTime ? 'Mínimo 4 caracteres' : '••••••••'}
                                autoFocus
                            />
                            <button
                                type="button"
                                className="login-toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {isFirstTime && (
                        <div className="login-form-group">
                            <label className="login-label">Confirmar Senha</label>
                            <div className="login-input-wrapper">
                                <Lock size={18} className="login-input-icon" />
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="login-input"
                                    placeholder="Repita a senha"
                                />
                                <button
                                    type="button"
                                    className="login-toggle-password"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="login-error">
                            <span>⚠️</span>
                            {error}
                        </div>
                    )}

                    <label className="login-checkbox">
                        <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                        />
                        <span className="login-checkbox-custom"></span>
                        <span className="login-checkbox-label">Lembrar-me nesta sessão</span>
                    </label>

                    <button
                        type="submit"
                        className={`login-button ${isLoading ? 'loading' : ''}`}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <span className="login-button-spinner"></span>
                        ) : (
                            <>
                                {isFirstTime ? 'Criar Conta' : 'Entrar'}
                                <span className="login-button-arrow">→</span>
                            </>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div className="login-footer">
                    <div className="login-footer-icon">🔒</div>
                    <p>Seus dados estão armazenados localmente</p>
                    <p>com segurança no seu navegador</p>
                </div>
            </div>
        </div>
    );
}

