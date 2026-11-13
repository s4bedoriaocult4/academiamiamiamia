import { createClient, SupabaseClient } from '@supabase/supabase-js';

const LOCAL_CONFIG_KEY = 'academia_supabase_config';

export interface SupabaseRuntimeConfig {
    url: string;
    anonKey: string;
}

export function getSupabaseConfig(): SupabaseRuntimeConfig | null {
    const metaEnv = (import.meta as { env?: Record<string, string | undefined> }).env;
    const envUrl = metaEnv?.VITE_SUPABASE_URL?.trim();
    const envKey = metaEnv?.VITE_SUPABASE_ANON_KEY?.trim();

    if (envUrl && envKey) {
        return { url: envUrl, anonKey: envKey };
    }

    try {
        const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(LOCAL_CONFIG_KEY) : null;
        if (stored) {
            const parsed = JSON.parse(stored) as Partial<SupabaseRuntimeConfig>;
            if (parsed.url?.trim() && parsed.anonKey?.trim()) {
                return { url: parsed.url.trim(), anonKey: parsed.anonKey.trim() };
            }
        }
    } catch {
        // Ignora erro de parse
    }

    return null;
}

export function hasEnvSupabaseConfig(): boolean {
    const metaEnv = (import.meta as { env?: Record<string, string | undefined> }).env;
    return Boolean(
        metaEnv?.VITE_SUPABASE_URL?.trim() &&
        metaEnv?.VITE_SUPABASE_ANON_KEY?.trim()
    );
}

export function saveLocalSupabaseConfig(url: string, anonKey: string) {
    localStorage.setItem(
        LOCAL_CONFIG_KEY,
        JSON.stringify({ url: url.trim(), anonKey: anonKey.trim() })
    );
    cachedClient = null;
    cachedConfigHash = '';
}

export function clearLocalSupabaseConfig() {
    localStorage.removeItem(LOCAL_CONFIG_KEY);
    cachedClient = null;
    cachedConfigHash = '';
}

let cachedClient: SupabaseClient | null = null;
let cachedConfigHash = '';

export function getSupabaseClient(): SupabaseClient | null {
    const cfg = getSupabaseConfig();
    if (!cfg) return null;

    const hash = `${cfg.url}::${cfg.anonKey}`;
    if (cachedClient && cachedConfigHash === hash) {
        return cachedClient;
    }

    cachedClient = createClient(cfg.url, cfg.anonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
    });
    cachedConfigHash = hash;
    return cachedClient;
}

export function isSupabaseConfigured(): boolean {
    return getSupabaseConfig() !== null;
}
