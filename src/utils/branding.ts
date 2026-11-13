export const DEFAULT_GYM_NAME = 'RESISTÊNCIA MUAY THAI';
export const DEFAULT_GYM_LOGO = '/logo-academia.png';

/**
 * Resolve a logo da academia garantindo o brasão oficial quando não houver
 * imagem personalizada salva (ou quando o valor salvo ainda for um emoji legado).
 */
export function resolveGymLogo(rawLogo?: unknown): string {
    if (typeof rawLogo !== 'string') return DEFAULT_GYM_LOGO;
    const trimmed = rawLogo.trim();
    if (!trimmed || trimmed === '🥊' || trimmed === '🐊') {
        return DEFAULT_GYM_LOGO;
    }
    return trimmed;
}
