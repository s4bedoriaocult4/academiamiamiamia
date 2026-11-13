import { MessageCircle } from 'lucide-react';
import { buildWhatsAppUrl } from '../../utils/whatsapp';
import { useToast } from '../../contexts/ToastContext';

interface WhatsAppButtonProps {
    phone?: string;
    message: string;
    label?: string;
    size?: 'sm' | 'md' | 'icon';
    variant?: 'solid' | 'outline';
    className?: string;
    title?: string;
}

export function WhatsAppButton({
    phone,
    message,
    label = 'WhatsApp',
    size = 'sm',
    variant = 'outline',
    className = '',
    title,
}: WhatsAppButtonProps) {
    const { showToast } = useToast();
    const url = buildWhatsAppUrl(phone, message);

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!url) {
            showToast('warning', 'Telefone do aluno inválido ou não cadastrado.');
            return;
        }
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const baseStyle =
        variant === 'solid'
            ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500 shadow-sm'
            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800/60';

    const sizeStyle =
        size === 'icon'
            ? 'p-2 rounded-xl'
            : size === 'sm'
                ? 'px-2.5 py-1.5 rounded-lg text-xs'
                : 'px-3.5 py-2 rounded-xl text-sm';

    return (
        <button
            type="button"
            onClick={handleClick}
            title={title || (url ? `Enviar WhatsApp para ${phone}` : 'Sem telefone válido')}
            className={`inline-flex items-center justify-center gap-1.5 font-semibold border transition-all cursor-pointer active:scale-95 ${
                !url ? 'opacity-45' : ''
            } ${baseStyle} ${sizeStyle} ${className}`}
        >
            <MessageCircle className={size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
            {size !== 'icon' && <span>{label}</span>}
        </button>
    );
}
