import { useState, useEffect } from 'react';
import {
    LayoutDashboard, Users, UserCheck, DollarSign,
    Settings, Moon, Sun, Menu, X, Dumbbell
} from 'lucide-react';

// Services & Hooks
import { useDbInit } from './hooks/useGymStore';
import { db } from './services/db';

// Components
import { Dashboard } from './components/dashboard/Dashboard';
import { StudentList } from './components/students/StudentList';
import { PaymentList } from './components/payments/PaymentList';
import { AttendanceManager } from './components/attendance/AttendanceManager';
import { ExpenseList } from './components/financial/ExpenseList';
import { Settings as SettingsPage } from './components/settings/Settings';
import { LoginPage } from './components/auth/LoginPage';
import { PersonalDashboard } from './components/students/PersonalDashboard';


function App() {
    const isDbReady = useDbInit();
    // const settings = useSettings();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Dark Mode Logic
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        const loadTheme = async () => {
            const saved = await db.settings.get('darkMode');
            if (saved?.value) {
                setDarkMode(true);
                document.body.classList.add('dark-mode');
            }
        };
        if (isDbReady) loadTheme();
    }, [isDbReady]);

    // Verificar autenticação - sempre mostrar screenlock
    useEffect(() => {
        if (!isDbReady) return;

        const remembered = sessionStorage.getItem('gym_remembered');
        // Só permitir acesso se estiver lembrado na sessão
        if (remembered === 'true') {
            setIsAuthenticated(true);
        }
    }, [isDbReady]);

    const handleLogin = () => {
        setIsAuthenticated(true);
    };

    const toggleDarkMode = async () => {
        const newToken = !darkMode;
        setDarkMode(newToken);
        if (newToken) document.body.classList.add('dark-mode');
        else document.body.classList.remove('dark-mode');
        await db.settings.put({ key: 'darkMode', value: newToken });
    };

    if (!isDbReady) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="text-center">
                    <div className="spinner mb-4"></div>
                    <p className="text-lg font-medium text-gray-600">Carregando sistema...</p>
                    <p className="text-sm text-gray-400">Migrando dados para banco seguro</p>
                </div>
            </div>
        );
    }

    // Se não autenticado, mostrar screenlock
    if (!isAuthenticated) {
        return <LoginPage onLogin={handleLogin} />;
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return <Dashboard />;
            case 'students': return <StudentList />;
            case 'personal-dashboard': return <PersonalDashboard />;
            case 'payments': return <PaymentList />;
            case 'attendance': return <AttendanceManager />;
            case 'financial': return <ExpenseList />;
            case 'settings': return <SettingsPage />;
            default: return <Dashboard />;
        }
    };

    const NavItem = ({ id, icon: Icon, label }: any) => (
        <button
            onClick={() => { setActiveTab(id); setIsMobileMenuOpen(false); }}
            className={`nav-item ${activeTab === id ? 'active' : ''}`}
        >
            <Icon size={20} />
            <span>{label}</span>
        </button>
    );

    return (
        <div className="app-container">


            {/* Sidebar */}
            <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="logo-container">
                        <span className="logo-icon">🥊</span>
                        <h1 className="logo-text">RESISTÊNCIA MUAY THAI</h1>
                    </div>
                    <button
                        className="md:hidden"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <X size={24} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
                    <NavItem id="students" icon={Users} label="Alunos" />
                    <NavItem id="personal-dashboard" icon={Dumbbell} label="Controle Personal" />
                    <NavItem id="attendance" icon={UserCheck} label="Presenças" />
                    <NavItem id="payments" icon={DollarSign} label="Pagamentos" />
                    <NavItem id="financial" icon={DollarSign} label="Despesas" />
                    <NavItem id="settings" icon={Settings} label="Configurações" />
                </nav>

                <div className="sidebar-footer">
                    <button onClick={toggleDarkMode} className="theme-toggle">
                        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                        <span>{darkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
                    </button>
                    <div className="sidebar-credits">
                        <div className="credits-version">v5 (IndexedDB)</div>
                        <div className="credits-about">
                            <span className="credits-made">Feito por <strong>MTZ</strong>, <strong>Antigravity</strong> e <strong>Cursor</strong></span>
                            <span className="credits-quote">"De trabalhadores, para trabalhadores."</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="mobile-header md:hidden">
                <button onClick={() => setIsMobileMenuOpen(true)}>
                    <Menu size={24} />
                </button>
                <h1 className="text-lg font-bold">RESISTÊNCIA MUAY THAI</h1>
                <div className="w-6"></div> {/* Spacer */}
            </header>

            {/* Main Content */}
            <main className="main-content">
                {renderContent()}
            </main>

            {/* Overlay for mobile sidebar */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
        </div>
    );
}

export default App;
