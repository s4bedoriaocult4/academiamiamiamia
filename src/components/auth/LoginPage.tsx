import { useState, useEffect } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
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

    useEffect(() => {
        // Verificar se já existe senha configurada
        const checkPassword = async () => {
            const savedPassword = await db.settings.get('appPassword');
            if (!savedPassword?.value) {
                setIsFirstTime(true);
            } else {
                // Verificar se está "lembrado"
                const remembered = sessionStorage.getItem('gym_remembered');
                if (remembered === 'true') {
                    onLogin();
                }
            }
        };
        checkPassword();
    }, [onLogin]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (isFirstTime) {
            // Primeira vez: definir senha
            if (!password || password.length < 4) {
                setError('A senha deve ter pelo menos 4 caracteres');
                return;
            }
            if (password !== confirmPassword) {
                setError('As senhas não coincidem');
                return;
            }
            // Salvar senha (em texto plano para simplicidade - proteção básica)
            await db.settings.put({ key: 'appPassword', value: password });
            if (rememberMe) {
                sessionStorage.setItem('gym_remembered', 'true');
            }
            onLogin();
        } else {
            // Login normal
            const savedPassword = await db.settings.get('appPassword');
            if (!savedPassword?.value) {
                setError('Erro: senha não encontrada. Por favor, recarregue a página.');
                return;
            }
            if (password !== savedPassword.value) {
                setError('Senha incorreta');
                return;
            }
            if (rememberMe) {
                sessionStorage.setItem('gym_remembered', 'true');
            }
            onLogin();
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
            <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
                        <ShieldCheck size={32} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Muay Thai Manager
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        {isFirstTime ? 'Configure sua senha de acesso' : 'Digite sua senha para continuar'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {isFirstTime ? 'Nova Senha' : 'Senha'}
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                placeholder={isFirstTime ? 'Mínimo 4 caracteres' : 'Digite sua senha'}
                                autoFocus
                            />
                        </div>
                    </div>

                    {isFirstTime && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Confirmar Senha
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    placeholder="Confirme sua senha"
                                />
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="remember"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="remember" className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                            Lembrar-me nesta sessão
                        </label>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                        {isFirstTime ? 'Configurar Senha' : 'Entrar'}
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
                    <p>Seus dados estão armazenados localmente no seu navegador.</p>
                    <p className="mt-1">Esta senha protege o acesso ao sistema.</p>
                </div>
            </div>
        </div>
    );
}

