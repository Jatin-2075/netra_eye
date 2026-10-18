import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import type { CalibrationData } from '../lib/Calibration';

const CAL: CalibrationData = {
  centerX: 0, centerY: 0, xSign: 1, ySign: 1,
  leftRange: 0.3, rightRange: 0.3, upRange: 0.3, downRange: 0.3,
  blinkOpen: 0.1, blinkClosed: 0.8, blinkThreshold: 0.45, blinkClosedIsHigher: true,
  verticalUsable: false,
};

let setBlink: (v: number) => void = () => {};
vi.mock('../hooks/UseFaceTracker', async () => {
  const React = await import('react');
  return {
    useFaceTracker: () => {
      const [blink, set] = React.useState(0.1);
      setBlink = set;
      return {
        videoRef: { current: null },
        reading: { face: true, x: 0, y: 0, blink },
        latest: { current: { face: true, x: 0, y: 0, blink } },
        status: 'running',
        error: null,
      };
    },
  };
});
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
vi.mock('../hooks/UseSpeech', () => ({
  useSpeech: () => ({ speak, speaking: false, voicesReady: true, hasVoice: true }),
}));
import App from '../App';


const tick = (ms: number) => { for (let t = 0; t < ms; t += 40) act(() => { vi.advanceTimersByTime(40); }); };
const blink = (closedMs: number) => {
  act(() => setBlink(0.8)); tick(closedMs);
  act(() => setBlink(0.1));
};

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); speak.mockClear(); });

describe('blink alerts', () => {
  it('four quick blinks raise HELP', () => {
    const { container } = render(<App />);
    tick(500);
    for (let i = 0; i < 4; i++) { blink(160); tick(240); }
    tick(1500);
    expect(container.textContent).toContain('HELP requested');
  });
  it('four long select-blinks (typing) do NOT raise HELP', () => {
    const { container } = render(<App />);
    tick(500);
    for (let i = 0; i < 4; i++) { blink(800); tick(300); }
    tick(1500);
    expect(container.textContent).not.toContain('HELP requested');
    expect(container.textContent).not.toContain('ALERT');
  });
});
