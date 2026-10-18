export const API_BASE: string = (import.meta.env.VITE_AI_API_URL ?? '').trim().replace(/\/+$/, '');
export const API_ENABLED: boolean = API_BASE !== '';

const USER_KEY = 'netra-user-id';

export function getUserId(): string {
    try {
        const saved = localStorage.getItem(USER_KEY);
        if (saved) return saved;
        const id =
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
                ? crypto.randomUUID()
                : `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem(USER_KEY, id);
        return id;
    } catch {
        return 'netra-anonymous';
    }
}
