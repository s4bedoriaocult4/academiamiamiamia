import React from 'react';
import { X, AlertTriangle, Check, Loader2, Info } from 'lucide-react';

// Toast Component
export interface ToastMessage {
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
}

interface ToastContainerProps {
    toasts: ToastMessage[];
    removeToast: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white transition-all transform animate-slide-in ${toast.type === 'success' ? 'bg-green-600' :
                            toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
                        }`}
                >
                    {toast.type === 'success' && <Check size={18} />}
                    {toast.type === 'error' && <AlertTriangle size={18} />}
                    {toast.type === 'info' && <Info size={18} />}
                    <span className="text-sm font-medium">{toast.message}</span>
                    <button onClick={() => removeToast(toast.id)} className="ml-2 hover:bg-white/20 rounded-full p-1">
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
};

// Confirmation Modal
interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: 'danger' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, title, message, onConfirm, onCancel, type = 'danger' }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl transform transition-all scale-100">
                <div className="flex items-center gap-3 mb-4">
                    <div className={`p-3 rounded-full ${type === 'danger' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        <AlertTriangle size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                </div>

                <p className="text-slate-300 mb-6 leading-relaxed">
                    {message}
                </p>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 text-white font-medium rounded-lg transition-colors ${type === 'danger'
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
};

// Loading Overlay
interface LoadingOverlayProps {
    isLoading: boolean;
    message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isLoading, message = 'Carregando...' }) => {
    if (!isLoading) return null;

    return (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
            <Loader2 size={48} className="text-blue-500 animate-spin mb-4" />
            <p className="text-white text-lg font-medium animate-pulse">{message}</p>
        </div>
    );
};
