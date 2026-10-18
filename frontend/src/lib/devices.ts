export type DeviceId = 'lamp' | 'fan';
export type DeviceMode = 'sim' | 'webhook';

export interface DeviceUrls {
    on: string;
    off: string;
}

export interface DeviceConfig {
    mode: DeviceMode;
    method: 'GET' | 'POST';
    lamp: DeviceUrls;
    fan: DeviceUrls;
}

export interface CommandResult {
    ok: boolean;
    detail: string;
}

export const DEVICE_STORAGE_KEY = 'netra-device-config';

export const DEFAULT_DEVICE_CONFIG: DeviceConfig = {
    mode: 'sim',
    method: 'GET',
    lamp: { on: '', off: '' },
    fan: { on: '', off: '' },
};

const isLocalHost = (host: string) => host === 'localhost' || host === '127.0.0.1' || host === '[::1]';

export function loadDeviceConfig(): DeviceConfig {
    try {
        const raw = localStorage.getItem(DEVICE_STORAGE_KEY);
        if (!raw) return DEFAULT_DEVICE_CONFIG;
        const p = JSON.parse(raw) as Partial<DeviceConfig>;
        const urls = (u?: Partial<DeviceUrls>): DeviceUrls => ({ on: String(u?.on ?? ''), off: String(u?.off ?? '') });
        return {
            mode: p.mode === 'webhook' ? 'webhook' : 'sim',
            method: p.method === 'POST' ? 'POST' : 'GET',
            lamp: urls(p.lamp),
            fan: urls(p.fan),
        };
    } catch {
        return DEFAULT_DEVICE_CONFIG;
    }
}

export function saveDeviceConfig(config: DeviceConfig): void {
    try {
        localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(config));
    } catch {}
}

export function checkDeviceUrl(raw: string, pageProtocol = window.location.protocol): string | null {
    let url: URL;
    try {
        url = new URL(raw);
    } catch {
        return 'That is not a valid URL';
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'Use an http or https URL';
    if (pageProtocol === 'https:' && url.protocol === 'http:' && !isLocalHost(url.hostname)) {
        return 'Browsers block plain http devices from an https page. Use an https webhook, or run the app locally.';
    }
    return null;
}

const withTimeout = (ms: number) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return { signal: controller.signal, done: () => clearTimeout(timer) };
};

export async function sendDeviceCommand(
    config: DeviceConfig,
    id: DeviceId,
    on: boolean,
    fetchImpl: typeof fetch = fetch,
    timeoutMs = 4000,
): Promise<CommandResult> {
    if (config.mode === 'sim') return { ok: true, detail: 'simulated' };

    const url = config[id][on ? 'on' : 'off'].trim();
    if (!url) return { ok: false, detail: `No ${on ? 'on' : 'off'} URL set for the ${id}` };
    const problem = checkDeviceUrl(url);
    if (problem) return { ok: false, detail: problem };

    const attempt = async (mode: RequestMode) => {
        const t = withTimeout(timeoutMs);
        try {
            return await fetchImpl(url, { method: config.method, mode, signal: t.signal, cache: 'no-store' });
        } finally {
            t.done();
        }
    };

    try {
        const res = await attempt('cors');
        return res.ok ? { ok: true, detail: `HTTP ${res.status}` } : { ok: false, detail: `Device answered HTTP ${res.status}` };
    } catch (first) {
        if ((first as Error).name === 'AbortError') return { ok: false, detail: 'The device did not answer in time' };
        try {
            await attempt('no-cors');
            return { ok: true, detail: 'sent (reply hidden by the browser)' };
        } catch (second) {
            return {
                ok: false,
                detail: (second as Error).name === 'AbortError' ? 'The device did not answer in time' : 'Could not reach the device',
            };
        }
    }
}
