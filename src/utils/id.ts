/**
 * Gera identificadores únicos universais (UUID v4) para evitar colisões
 * entre operações rápidas ou sincronização multi-dispositivo (PC e Celular).
 */
export function generateId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    const rand = Math.random().toString(36).slice(2, 10);
    return `${Date.now()}-${rand}`;
}
