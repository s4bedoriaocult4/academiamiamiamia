import { useMemo } from 'react';

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
    const isImage = useMemo(
        () => gymLogo?.startsWith('data:image') || gymLogo?.startsWith('http'),
        [gymLogo]
    );

    const boxSize =
        size === 'lg'
            ? 'w-16 h-16 rounded-2xl text-3xl'
            : size === 'sm'
                ? 'w-9 h-9 rounded-xl text-lg'
                : 'w-11 h-11 rounded-xl text-xl';

    return (
        <div className="flex items-center gap-3 min-w-0">
            <div
                className={`${boxSize} shrink-0 flex items-center justify-center overflow-hidden bg-gradient-to-br from-rose-600 to-rose-700 text-white shadow-sm shadow-rose-600/20`}
            >
                {isImage ? (
                    <img
                        src={gymLogo}
                        alt={gymName}
                        className="w-full h-full object-cover bg-white"
                    />
                ) : (
                    <span role="img" aria-label="Logo">
                        {gymLogo || '🥊'}
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
