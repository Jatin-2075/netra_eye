import { afterEach, describe, expect, it, vi } from 'vitest';
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
vi.mock('../hooks/UseSpeech', () => ({
  useSpeech: () => ({ speak, speaking: false, voicesReady: true, hasVoice: true }),
}));

import App from '../App';


const press = (key: string) => act(() => { fireEvent.keyDown(window, { key }); });
const right = (n = 1) => { for (let i = 0; i < n; i++) press('ArrowRight'); };
const message = () => (document.getElementById('custom-message') as HTMLInputElement).value;

afterEach(() => { cleanup(); speak.mockClear(); });


const goToItem = (id: string) => {
  let g = 0;
  while (screen.getByTestId(`tile-${id}`).getAttribute('aria-selected') !== 'true' && g++ < 60) press('ArrowRight');
};
const openTalk = () => { render(<App />); press('Enter'); }; 
const typeLetterFromGroup = (groupIdx: number, steps: number) => {
  goToItem(`kb-item-group-${groupIdx}`); press('Enter'); 
  right(steps); press('Enter');                          
};

describe('combined Talk screen (phrases + typing + speech in/out)', () => {
  it('opens from the menu with a single select', () => {
    openTalk();
    expect(screen.getByTestId('talk-screen')).toBeTruthy();
  });

  it('shows listen, quick phrases and the eye keyboard together', () => {
    openTalk();
    for (const id of ['listen', 'water', 'help', 'kb-item-group-0', 'kb-item-speak', 'kb-item-space']) {
      expect(screen.getByTestId(`tile-${id}`)).toBeTruthy();
    }
    expect(document.getElementById('custom-message')).toBeTruthy();
    expect(document.getElementById('heard-in')).toBeTruthy();
  });

  it('a quick phrase speaks its full sentence', () => {
    openTalk();
    goToItem('water'); press('Enter');
    expect(speak).toHaveBeenLastCalledWith(expect.stringMatching(/water/i));
  });

  it('types a letter and speaks the message using only left/right/select', () => {
    openTalk();
    typeLetterFromGroup(0, 1); 
    expect(message()).toBe('B');
    goToItem('kb-item-speak'); press('Enter');
    expect(speak).toHaveBeenLastCalledWith('B', expect.objectContaining({ lang: 'en', volume: 1 }));
  });

  it('Space and Delete work', () => {
    openTalk();
    typeLetterFromGroup(0, 0);
    expect(message()).toBe('A');
    goToItem('kb-item-space'); press('Enter');
    expect(message()).toBe('A ');
    goToItem('kb-item-delete'); press('Enter');
    expect(message()).toBe('A');
  });

  it('reads each typed letter aloud, each finished word on Space, and the whole message on Speak', () => {
    openTalk();
    typeLetterFromGroup(0, 0);
    expect(speak).toHaveBeenLastCalledWith('A', expect.objectContaining({ lang: 'en', volume: 1 }));
    typeLetterFromGroup(0, 1);
    expect(message()).toBe('AB');
    expect(speak).toHaveBeenLastCalledWith('B', expect.anything());
    goToItem('kb-item-space'); press('Enter');
    expect(speak).toHaveBeenLastCalledWith('AB', expect.anything());
    goToItem('kb-item-speak'); press('Enter');
    expect(speak).toHaveBeenLastCalledWith('AB', expect.objectContaining({ lang: 'en', volume: 1 }));
  });

  it('Speak with an empty message says nothing', () => {
    openTalk();
    goToItem('kb-item-speak'); speak.mockClear(); press('Enter');
    expect(speak).not.toHaveBeenCalled();
  });

  it('shows the redesigned UI: dock and menu tiles', () => {
    render(<App />);
    expect(document.querySelector('.dock')).toBeTruthy();
    expect(screen.getByTestId('tile-talk').getAttribute('aria-selected')).toBe('true');
    right(); expect(screen.getByTestId('tile-room').getAttribute('aria-selected')).toBe('true');
  });
});
