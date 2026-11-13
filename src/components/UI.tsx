import React from 'react';
import {
    CheckCircle,
    AlertCircle,
    Info,
    AlertTriangle,
    X,
    Loader2,
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
    id: string;
    type: ToastType;
    message: string;
}

interface ToastContainerProps {
    toasts: ToastMessage[];
    removeToast: (id: string) => void;
}

const TOAST_STYLES: Record<ToastType, { box: string; icon: React.ReactNode }> = {
    success: {
        box: 'bg-emerald-600 text-white border-emerald-500',
        icon: <CheckCircle className="w-5 h-5 shrink-0" />,
    },
    error: {
        box: 'bg-red-600 text-white border-red-500',
        icon: <AlertCircle className="w-5 h-5 shrink-0" />,
    },
    warning: {
        box: 'bg-amber-500 text-white border-amber-400',
        icon: <AlertTriangle className="w-5 h-5 shrink-0" />,
    },
    info: {
        box: 'bg-slate-800 text-white border-slate-700 dark:bg-slate-700',
        icon: <Info className="w-5 h-5 shrink-0" />,
    },
};

export function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-20 md:bottom-5 right-4 z-[90] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] pointer-events-none">
            {toasts.map((t) => {
                const style = TOAST_STYLES[t.type];
                return (
                    <div
                        key={t.id}
                        className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium animate-fade-in ${style.box}`}
                    >
                        {style.icon}
                        <span className="flex-1 leading-snug">{t.message}</span>
                        <button
                            type="button"
                            onClick={() => removeToast(t.id)}
                            className="p-1 rounded-lg hover:bg-white/20 transition-colors"
                            aria-label="Fechar aviso"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmModal({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'danger',
}: ConfirmModalProps) {
    if (!isOpen) return null;

    const btnClass =
        variant === 'danger'
            ? 'btn-danger'
            : variant === 'warning'
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'btn-primary';

    const iconBox =
        variant === 'danger'
            ? 'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400'
            : variant === 'warning'
                ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                : 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400';

    return (
        <div className="modal-overlay z-[80]" onClick={onCancel}>
            <div
                className="modal-box max-w-md sm:rounded-2xl m-4 sm:m-0 rounded-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 space-y-4">
                    <div className="flex items-start gap-3.5">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBox}`}>
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                                {title}
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                                {message}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                        <button type="button" onClick={onCancel} className="btn btn-secondary">
                            {cancelText}
                        </button>
                        <button type="button" onClick={onConfirm} className={`btn ${btnClass}`}>
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function LoadingOverlay({ message = 'Carregando...' }: { message?: string }) {
    return (
        <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="card px-6 py-5 flex items-center gap-3.5 shadow-xl">
                <Loader2 className="w-6 h-6 text-rose-600 animate-spin shrink-0" />
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {message}
                </span>
            </div>
        </div>
    );
}

export function EmptyState({
    icon,
    title,
    description,
    action,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="card p-10 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                {icon}
            </div>
            <div className="space-y-1 max-w-sm">
                <h4 className="font-bold text-slate-900 dark:text-white text-base">{title}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
            </div>
            {action && <div className="pt-2">{action}</div>}
        </div>
    );
}
