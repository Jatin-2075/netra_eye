import { describe, expect, it } from 'vitest';
import { irisGaze } from '../hooks/UseFaceTracker';
import { buildCalibration, normalize, type Readings } from '../lib/Calibration';


function face(irisDx = 0, irisDy = 0, tilt = 0) {
  const lm = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 1 }));
  const put = (i: number, px: number, py: number) => {
    
    const cx = 320, cy = 240;
    const dx = px - cx, dy = py - cy;
    const rx = cx + dx * Math.cos(tilt) - dy * Math.sin(tilt);
    const ry = cy + dx * Math.sin(tilt) + dy * Math.cos(tilt);
    lm[i] = { x: rx / 640, y: ry / 480, z: 0, visibility: 1 };
  };
  
  put(33, 200, 200); put(133, 260, 200);
  put(362, 380, 200); put(263, 440, 200);
  put(468, 230 + irisDx, 200 + irisDy);
  put(473, 410 + irisDx, 200 + irisDy);
  return lm;
}

describe('iris gaze from landmarks', () => {
  it('is zero when the iris sits in the middle of the eye', () => {
    const g = irisGaze(face(), 640, 480)!;
    expect(Math.abs(g.ix)).toBeLessThan(1e-6);
    expect(Math.abs(g.iy)).toBeLessThan(1e-6);
  });
  it('moves with the iris, in eye widths: right in the picture is +x, up is +y', () => {
    const r = irisGaze(face(9, 0), 640, 480)!;
    expect(r.ix).toBeCloseTo(9 / 60, 3);
    const u = irisGaze(face(0, -3), 640, 480)!;
    expect(u.iy).toBeCloseTo(3 / 60, 3);
  });
  it('ignores head tilt: a rotated face with a centred iris still reads zero', () => {
    const g = irisGaze(face(0, 0, 0.3), 640, 480)!;
    expect(Math.abs(g.ix)).toBeLessThan(1e-6);
    expect(Math.abs(g.iy)).toBeLessThan(1e-6);
  });
  it('returns null without iris landmarks', () => {
    expect(irisGaze(face().slice(0, 468), 640, 480)).toBeNull();
  });
});

describe('calibration fuses both signals on their own scales', () => {
  const mk = (x: number, y: number, ix: number, iy: number) => ({ x, y, blink: 0.1, ix, iy });
  
  const r: Readings = {
    center: mk(0, 0, 0, 0), left: mk(-0.5, 0, 0.12, 0), right: mk(0.5, 0, -0.12, 0),
    up: mk(0, 0.4, 0, 0.06), down: mk(0, -0.4, 0, -0.06), closed: { x: 0, y: 0, blink: 0.9, ix: 0, iy: 0 },
  };
  const { data } = buildCalibration(r);
  it('agrees at the ends of the range even when the iris sign is opposite', () => {
    expect(normalize(0.5, 0, data, -0.12, 0).nx).toBeCloseTo(1, 2);
    expect(normalize(-0.5, 0, data, 0.12, 0).nx).toBeCloseTo(-1, 2);
    expect(normalize(0, 0.4, data, 0, 0.06).ny).toBeCloseTo(1, 2);
  });
  it('averages the two, so one noisy signal is halved', () => {
    expect(normalize(0.5, 0, data, 0, 0).nx).toBeCloseTo(0.5, 2);
  });
  it('works with the blendshape signal alone', () => {
    expect(normalize(0.5, 0, data).nx).toBeCloseTo(1, 2);
  });
});
