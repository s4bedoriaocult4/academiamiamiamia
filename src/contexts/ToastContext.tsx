import { createContext, useContext, useState, ReactNode } from 'react';
import { ToastMessage } from '../components/UI';

interface ToastContextType {
    showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const showToast = (type: 'success' | 'error' | 'info', message: string) => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999 }}>
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`toast toast-${toast.type} animate-fade-in`}
                        style={{ marginBottom: '0.5rem' }}
                    >
                        {toast.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
