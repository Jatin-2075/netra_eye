import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_DEVICE_CONFIG, checkDeviceUrl, sendDeviceCommand, type DeviceConfig } from '../lib/devices';

const web: DeviceConfig = {
  mode: 'webhook',
  method: 'GET',
  lamp: { on: 'https://hook.example/lamp/on', off: 'https://hook.example/lamp/off' },
  fan: { on: '', off: 'https://hook.example/fan/off' },
};
const ok = (status = 200) => ({ ok: status < 400, status }) as Response;

describe('sendDeviceCommand', () => {
  it('simulated mode never touches the network', async () => {
    const f = vi.fn();
    expect((await sendDeviceCommand(DEFAULT_DEVICE_CONFIG, 'lamp', true, f as never)).ok).toBe(true);
    expect(f).not.toHaveBeenCalled();
  });

  it('calls the on and off URLs with the chosen method', async () => {
    const f = vi.fn().mockResolvedValue(ok());
    await sendDeviceCommand({ ...web, method: 'POST' }, 'lamp', true, f as never);
    await sendDeviceCommand(web, 'lamp', false, f as never);
    expect(f.mock.calls[0][0]).toBe('https://hook.example/lamp/on');
    expect(f.mock.calls[0][1].method).toBe('POST');
    expect(f.mock.calls[1][0]).toBe('https://hook.example/lamp/off');
  });

  it('reports HTTP errors', async () => {
    const f = vi.fn().mockResolvedValue(ok(500));
    const r = await sendDeviceCommand(web, 'lamp', true, f as never);
    expect(r.ok).toBe(false);
    expect(r.detail).toContain('500');
  });

  it('falls back to no-cors when the browser blocks reading the reply', async () => {
    const f = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce({ type: 'opaque' } as unknown as Response);
    const r = await sendDeviceCommand(web, 'lamp', true, f as never);
    expect(r.ok).toBe(true);
    expect(f.mock.calls[1][1].mode).toBe('no-cors');
  });

  it('fails clearly when the device is unreachable', async () => {
    const f = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const r = await sendDeviceCommand(web, 'lamp', true, f as never);
    expect(r).toEqual({ ok: false, detail: 'Could not reach the device' });
  });

  it('fails when no URL is configured', async () => {
    const r = await sendDeviceCommand(web, 'fan', true, vi.fn() as never);
    expect(r.ok).toBe(false);
    expect(r.detail).toContain('No on URL');
  });
});

describe('checkDeviceUrl', () => {
  it('rejects bad URLs and mixed content', () => {
    expect(checkDeviceUrl('not a url', 'https:')).not.toBeNull();
    expect(checkDeviceUrl('ftp://x.test/a', 'https:')).not.toBeNull();
    expect(checkDeviceUrl('http://192.168.1.20/on', 'https:')).toContain('https');
  });
  it('accepts https, local http from http pages, and localhost', () => {
    expect(checkDeviceUrl('https://hook.example/a', 'https:')).toBeNull();
    expect(checkDeviceUrl('http://192.168.1.20/on', 'http:')).toBeNull();
    expect(checkDeviceUrl('http://localhost:8123/x', 'https:')).toBeNull();
  });
});
