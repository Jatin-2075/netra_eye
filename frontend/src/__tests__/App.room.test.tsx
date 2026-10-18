import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { CalibrationData } from '../lib/Calibration';

const CAL: CalibrationData = {
  centerX: 0, centerY: 0, xSign: 1, ySign: 1,
  leftRange: 0.3, rightRange: 0.3, upRange: 0.3, downRange: 0.3,
  blinkOpen: 0.1, blinkClosed: 0.8, blinkThreshold: 0.45, blinkClosedIsHigher: true,
  verticalUsable: false,
};

vi.mock('../hooks/UseFaceTracker', () => ({
  useFaceTracker: () => ({
    videoRef: { current: null },
    reading: { face: true, x: 0, y: 0, blink: 0.1 },
    latest: { current: { face: true, x: 0, y: 0, blink: 0.1 } },
    status: 'running',
    error: null,
  }),
}));
vi.mock('../components/CalibrationScreen', async () => {
  const React = await import('react');
  return {
    default: ({ onComplete }: { onComplete: (c: CalibrationData) => void }) => {
      React.useEffect(() => { onComplete(CAL); }, []);
      return null;
    },
  };
});
const speak = vi.fn();
const cancel = vi.fn();
vi.mock('../hooks/UseSpeech', () => ({
  useSpeech: () => ({ speak, cancel, speaking: false, voicesReady: true, hasVoice: true }),
}));

import App from '../App';

const press = (key: string) => act(() => { fireEvent.keyDown(window, { key }); });
const goToItem = (id: string) => {
  let g = 0;
  while (screen.getByTestId(id.startsWith('device-') ? id : `tile-${id}`).getAttribute('aria-selected') !== 'true' && g++ < 60) press('ArrowRight');
};
const openRoom = () => { render(<App />); press('ArrowRight'); press('Enter'); };

beforeEach(() => { localStorage.clear(); });
afterEach(() => { cleanup(); speak.mockClear(); cancel.mockClear(); vi.unstubAllGlobals(); });

describe('Room screen', () => {
  it('lamp and fan toggle and announce the new state', () => {
    openRoom();
    goToItem('device-lamp'); press('Enter');
    expect(speak).toHaveBeenLastCalledWith('Lamp is on');
    press('Enter');
    expect(speak).toHaveBeenLastCalledWith('Lamp is off');
    goToItem('device-fan'); press('Enter');
    expect(speak).toHaveBeenLastCalledWith('Fan is on');
  });

  it('All off switches both devices off', () => {
    openRoom();
    goToItem('device-lamp'); press('Enter');
    goToItem('device-fan'); press('Enter');
    goToItem('alloff'); press('Enter');
    expect(speak).toHaveBeenLastCalledWith('Lamp and fan are off');
    expect(document.querySelector('.devchips')?.textContent).toMatch(/Lamp: Off.*Fan: Off/);
  });

  it('webhook mode calls the configured URL and reverts when it fails', async () => {
    localStorage.setItem('netra-device-config', JSON.stringify({
      mode: 'webhook', method: 'GET',
      lamp: { on: 'https://hook.example/lamp/on', off: 'https://hook.example/lamp/off' },
      fan: { on: '', off: '' },
    }));
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    openRoom();
    goToItem('device-lamp'); press('Enter');
    await act(async () => {});
    expect(fetchMock).toHaveBeenCalledWith('https://hook.example/lamp/on', expect.objectContaining({ method: 'GET' }));

    goToItem('device-fan'); press('Enter');
    await act(async () => {});
    expect(speak).toHaveBeenLastCalledWith('Fan: Could not reach the device');
    expect(document.querySelector('.devchips')?.textContent).toMatch(/Fan: Off/);
  });
});

describe('Urgent phrases', () => {
  it('Help raises a visible alert, speaks it, and Escape cancels', () => {
    render(<App />);
    press('Enter');
    goToItem('help'); press('Enter');
    expect(screen.getByTestId('urgent-overlay')).toBeTruthy();
    expect(speak).toHaveBeenCalledWith('I need help now', expect.objectContaining({ volume: 1 }));
    press('Escape');
    expect(screen.queryByTestId('urgent-overlay')).toBeNull();
    expect(cancel).toHaveBeenCalled();
  });

  it('a normal phrase does not raise an alert', () => {
    render(<App />);
    press('Enter');
    goToItem('water'); press('Enter');
    expect(screen.queryByTestId('urgent-overlay')).toBeNull();
  });
});
