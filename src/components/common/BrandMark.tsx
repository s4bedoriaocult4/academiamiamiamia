import { useMemo } from 'react';
import { DEFAULT_GYM_LOGO } from '../../utils/branding';

interface BrandMarkProps {
    gymName: string;
    gymLogo: string;
    size?: 'sm' | 'md' | 'lg';
    showName?: boolean;
    subtitle?: string;
}

export function BrandMark({
    gymName,
    gymLogo,
    size = 'md',
    showName = true,
    subtitle,
}: BrandMarkProps) {
    const resolvedLogo = gymLogo || DEFAULT_GYM_LOGO;

    const isImage = useMemo(
        () =>
            resolvedLogo.startsWith('data:image') ||
            resolvedLogo.startsWith('http') ||
            resolvedLogo.startsWith('/'),
        [resolvedLogo]
    );

    const boxSize =
        size === 'lg'
            ? 'w-20 h-20 rounded-2xl text-3xl'
            : size === 'sm'
                ? 'w-9 h-9 rounded-xl text-lg'
                : 'w-11 h-11 rounded-xl text-xl';

    return (
        <div className="flex items-center gap-3 min-w-0">
            <div
                className={`${boxSize} shrink-0 flex items-center justify-center overflow-hidden ${
                    isImage
                        ? 'bg-black ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm'
                        : 'bg-gradient-to-br from-rose-600 to-rose-700 text-white shadow-sm shadow-rose-600/20'
                }`}
            >
                {isImage ? (
                    <img
                        src={resolvedLogo}
                        alt={gymName}
                        className="w-full h-full object-contain"
                    />
                ) : (
                    <span role="img" aria-label="Logo">
                        {resolvedLogo}
                    </span>
                )}
            </div>

            {showName && (
                <div className="min-w-0">
                    <div
                        className={`font-display font-bold text-slate-900 dark:text-white leading-tight ${
                            size === 'sm' ? 'truncate text-sm' : 'line-clamp-2 text-sm sm:text-base'
                        }`}
                    >
                        {gymName}
                    </div>
                    {subtitle && (
                        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                            {subtitle}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
