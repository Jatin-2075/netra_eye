import { describe, expect, it } from 'vitest';
import { JOYSTICK_DEFAULTS as O, createMachine, stepMachine } from '../hooks/UseJoystick';
import { applyToMessage, keyboardItems, KB_GROUPS } from '../lib/eyeKeyboard';


function run(m: ReturnType<typeof createMachine>, nx: number, ny: number, closed: boolean, from: number, ms: number) {
  const events: string[] = [];
  let t = from;
  for (; t < from + ms; t += 40) {
    const { event } = stepMachine(m, nx, ny, closed, t, O, true);
    if (event) events.push(event);
  }
  return { events, t };
}

describe('gaze state machine', () => {
  it('moves once after the hold time, then keeps repeating while you keep looking', () => {
    const m = createMachine();
    const a = run(m, 0.9, 0, false, 1000, 1700);
    expect(a.events.length).toBeGreaterThanOrEqual(3);
    expect(new Set(a.events)).toEqual(new Set(['right']));
  });
  it('does not need a return to centre: looking straight from right to left moves left', () => {
    const m = createMachine();
    const a = run(m, 0.9, 0, false, 1000, 800);
    const b = run(m, -0.9, 0, false, a.t, 800);
    expect(b.events.length).toBeGreaterThanOrEqual(1);
    expect(new Set(b.events)).toEqual(new Set(['left']));
  });
  it('looking up and down also moves, and repeats', () => {
    const up = run(createMachine(), 0, 0.9, false, 1000, 1500);
    expect(up.events.length).toBeGreaterThanOrEqual(2);
    expect(new Set(up.events)).toEqual(new Set(['up']));
    const down = run(createMachine(), 0, -0.9, false, 1000, 1500);
    expect(new Set(down.events)).toEqual(new Set(['down']));
  });
  it('looking further out repeats faster than a gentle look', () => {
    const far = run(createMachine(), 1, 0, false, 1000, 3000).events.length;
    const gentle = run(createMachine(), 0.5, 0, false, 1000, 3000).events.length;
    expect(far).toBeGreaterThan(gentle);
  });
  it('a small dip in the look does not stop the repeat (hysteresis)', () => {
    const m = createMachine();
    const a = run(m, 0.9, 0, false, 1000, 600);
    const b = run(m, 0.4, 0, false, a.t, 1200); 
    expect(b.events.length).toBeGreaterThanOrEqual(1);
  });
  it('stops when the eyes return to centre', () => {
    const m = createMachine();
    const a = run(m, 0.9, 0, false, 1000, 800);
    const b = run(m, 0, 0, false, a.t, 1500);
    expect(b.events).toEqual([]);
  });
  it('ignores a glance shorter than the hold time', () => {
    const m = createMachine();
    expect(run(m, 0.9, 0, false, 1000, 300).events).toEqual([]);
  });
  it('long blink selects exactly once; short blink does not', () => {
    const m = createMachine();
    const s = run(m, 0, 0, true, 1000, 1500);
    expect(s.events).toEqual(['select']);
    const m2 = createMachine();
    expect(run(m2, 0, 0, true, 1000, 200).events).toEqual([]);
  });
  it('ignores gaze while eyes are closed / just reopened', () => {
    const m = createMachine();
    const a = run(m, 0, 0, true, 1000, 800);
    const b = run(m, 0.9, 0, false, a.t, 300); 
    expect(b.events).toEqual([]);
  });
});

describe('eye keyboard logic', () => {
  it('every letter A-Z is reachable in a group, and is at most ~12 moves away', () => {
    const letters = KB_GROUPS.flatMap((g) => g.keys).join('');
    for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') expect(letters).toContain(c);
    const top = keyboardItems(null);
    for (const g of KB_GROUPS) {
      expect(g.keys.length + 1).toBeLessThanOrEqual(11);
    }
    expect(top.length).toBeLessThanOrEqual(13);
  });
  it('edits text', () => {
    const by = (id: string) => keyboardItems(null).find((i) => i.id === id)!;
    expect(applyToMessage('', by('kb-item-space'))).toBe('');
    expect(applyToMessage('HI', by('kb-item-space'))).toBe('HI ');
    expect(applyToMessage('HI ', by('kb-item-space'))).toBe('HI ');
    expect(applyToMessage('HI', by('kb-item-delete'))).toBe('H');
    expect(applyToMessage('', by('kb-item-delete'))).toBe('');
    expect(applyToMessage('HI', by('kb-item-clear'))).toBe('');
    expect(applyToMessage('HI', by('kb-item-speak'))).toBeNull();
  });
});
