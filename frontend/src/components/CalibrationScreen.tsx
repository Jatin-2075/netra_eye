import { useEffect, useRef, useState } from 'react';
import {
    STEPS,
    buildCalibration,
    median,
    type CalibrationData,
    type Reading,
    type Readings,
    type StepId,
} from '../lib/Calibration';

interface Props {
    x: number;
    y: number;
    blink: number;
    ix?: number;
    iy?: number;
    faceVisible?: boolean;
    onComplete: (calibration: CalibrationData) => void;
}

const SETTLE_MS = 1600;
const RECORD_MS = 1400;
const SAMPLE_EVERY_MS = 30;
const MIN_SAMPLES = 15;

const DOT_POSITION: Record<StepId, { left: string; top: string }> = {
    center: { left: '50%', top: '50%' },
    left: { left: '7%', top: '50%' },
    right: { left: '93%', top: '50%' },
    up: { left: '50%', top: '9%' },
    down: { left: '50%', top: '91%' },
    closed: { left: '50%', top: '50%' },
};

function speak(text: string) {
    try {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    } catch {
    }
}

export default function CalibrationScreen({ x, y, blink, ix, iy, faceVisible = true, onComplete }: Props) {
    const [stepIndex, setStepIndex] = useState(0);
    const [running, setRunning] = useState(false);
    const [phase, setPhase] = useState<'settle' | 'record'>('settle');
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ data: CalibrationData; warnings: string[] } | null>(null);

    const latest = useRef({ x, y, blink, ix, iy, faceVisible });
    useEffect(() => {
        latest.current = { x, y, blink, ix, iy, faceVisible };
    });

    const results = useRef<Partial<Readings>>({});
    const samples = useRef<Reading[]>([]);

    useEffect(() => {
        if (!running) return;

        const step = STEPS[stepIndex];
        samples.current = [];
        speak(step.speak);

        let sampler: number | undefined;

        const startRecording = window.setTimeout(() => {
            setPhase('record');
            sampler = window.setInterval(() => {
                const l = latest.current;
                if (l.faceVisible) samples.current.push({ x: l.x, y: l.y, blink: l.blink, ix: l.ix, iy: l.iy });
            }, SAMPLE_EVERY_MS);
        }, SETTLE_MS);

        const finishStep = window.setTimeout(() => {
            window.clearInterval(sampler);
            const got = samples.current;

            if (got.length < MIN_SAMPLES) {
                setPhase('settle');
                setRunning(false);
                setError(
                    `We lost sight of your face during "${step.title.toLowerCase()}". Put more light on your face, then try this step again.`
                );
                return;
            }

            results.current[step.id] = {
                x: median(got.map((r) => r.x)),
                y: median(got.map((r) => r.y)),
                blink: median(got.map((r) => r.blink)),
                ix: got.every((r) => r.ix !== undefined) ? median(got.map((r) => r.ix as number)) : undefined,
                iy: got.every((r) => r.iy !== undefined) ? median(got.map((r) => r.iy as number)) : undefined,
            };

            setPhase('settle');
            if (stepIndex < STEPS.length - 1) {
                setStepIndex(stepIndex + 1);
            } else {
                speak('Done. You can open your eyes.');
                setResult(buildCalibration(results.current as Readings));
                setRunning(false);
            }
        }, SETTLE_MS + RECORD_MS);

        return () => {
            window.clearTimeout(startRecording);
            window.clearTimeout(finishStep);
            window.clearInterval(sampler);
        };
    }, [running, stepIndex]);

    const start = () => {
        results.current = {};
        setStepIndex(0);
        setPhase('settle');
        setResult(null);
        setError(null);
        setRunning(true);
    };

    const retryStep = () => {
        setError(null);
        setRunning(true);
    };

    const cancel = () => {
        window.speechSynthesis?.cancel();
        setRunning(false);
        setError(null);
        setStepIndex(0);
        setPhase('settle');
        results.current = {};
    };

    const step = STEPS[stepIndex];
    const pos = DOT_POSITION[step.id];

    return (
        <div className="cal">
            <style>{CSS}</style>

            {running && (
                <div className="cal-stage" role="status" aria-live="polite">
                    <div
                        className={`cal-dot cal-dot-${phase}${step.id === 'closed' ? ' cal-closed' : ''}`}
                        style={{ left: pos.left, top: pos.top }}
                    >
                        <svg className="cal-ring" viewBox="0 0 100 100" aria-hidden="true">
                            <circle className="cal-ring-track" cx="50" cy="50" r="44" />
                            {phase === 'record' && (
                                <circle key={stepIndex} className="cal-ring-fill" cx="50" cy="50" r="44" />
                            )}
                        </svg>
                        <span className="cal-pupil" />
                    </div>

                    <div className="cal-prompt">
                        <p className="cal-prompt-title">{step.title}</p>
                        <p className="cal-prompt-hint">{step.hint}</p>
                        <p className="cal-prompt-count">
                            Step {stepIndex + 1} of {STEPS.length}
                        </p>
                        {!faceVisible && <p className="cal-warn">We cannot see your face. Move into the light.</p>}
                    </div>

                    <button className="cal-quiet" onClick={cancel}>
                        Cancel
                    </button>
                </div>
            )}

            {!running && !result && !error && (
                <div className="cal-card">
                    <h1>Set up your eyes</h1>
                    <p>
                        This takes about 20 seconds. Sit where you will normally use the app, with light on your
                        face. Follow the dot with your eyes only and keep your head still.
                    </p>
                    <p className="cal-live">
                        {faceVisible ? 'Camera sees you' : 'Camera cannot see your face'} · x {x.toFixed(2)} · y{' '}
                        {y.toFixed(2)} · blink {blink.toFixed(2)}
                    </p>
                    <button className="cal-button" onClick={start} disabled={!faceVisible}>
                        Start calibration
                    </button>
                </div>
            )}

            {!running && error && (
                <div className="cal-card">
                    <h1>Let's try that step again</h1>
                    <p>{error}</p>
                    <div className="cal-actions">
                        <button className="cal-button" onClick={retryStep}>
                            Retry this step
                        </button>
                        <button className="cal-quiet-inline" onClick={cancel}>
                            Start over
                        </button>
                    </div>
                </div>
            )}

            {!running && result && (
                <div className="cal-card">
                    <h1>{result.warnings.length === 0 ? 'Your eyes are set up' : 'Set up, with a few notes'}</h1>
                    <p>
                        Center, left, right, up, down and closed eyes are saved. Everything will now be measured
                        against your own range.
                    </p>
                    {result.warnings.map((w) => (
                        <p key={w} className="cal-warn">
                            {w}
                        </p>
                    ))}
                    <div className="cal-actions">
                        <button className="cal-button" onClick={() => onComplete(result.data)}>
                            Use this setup
                        </button>
                        <button className="cal-quiet-inline" onClick={start}>
                            Redo
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

const CSS = `
.cal {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font);
  background-image: radial-gradient(var(--line) 1.5px, transparent 1.5px);
  background-size: 28px 28px;
}

.cal-card {
  padding: 22px;
  border-radius: 18px;
  background: var(--surface);
  border: 1px solid var(--line);
  box-shadow: var(--shadow-lg);
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: min(26rem, calc(100% - 3rem));
}
.cal-card h1 {
  margin: 0 0 1rem;
  font-size: 1.5rem;
  line-height: 1.15;
  font-weight: 800;
}
.cal-card p {
  margin: 0 0 1rem;
  font-size: 1.0625rem;
  line-height: 1.55;
  color: var(--ink-2);
}
.cal-live {
  font-size: 0.9rem !important;
  color: var(--ink-2) !important;
}
.cal-warn {
  color: var(--warn) !important;
}
.cal-actions {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  margin-top: 1.5rem;
}

.cal-button {
  padding: 0.6rem 1.2rem;
  border: 0;
  border-radius: 12px;
  background: var(--accent);
  color: var(--accent-ink);
  font: inherit;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
}
.cal-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.cal-quiet,
.cal-quiet-inline {
  border: 0;
  background: none;
  color: var(--ink-2);
  font: inherit;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}
.cal-quiet {
  position: absolute;
  right: 1.25rem;
  bottom: 1.25rem;
}
.cal-button:focus-visible,
.cal-quiet:focus-visible,
.cal-quiet-inline:focus-visible {
  outline: 4px solid var(--accent);
  outline-offset: 3px;
}

.cal-stage {
  position: absolute;
  inset: 0;
}
.cal-dot {
  position: absolute;
  width: 60px;
  height: 60px;
  transform: translate(-50%, -50%);
  transition: left 0.6s cubic-bezier(0.3, 0.7, 0.2, 1), top 0.6s cubic-bezier(0.3, 0.7, 0.2, 1);
}
.cal-ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.cal-ring circle {
  fill: none;
  stroke-width: 5;
}
.cal-ring-track {
  stroke: var(--line);
}
.cal-ring-fill {
  stroke: var(--ok);
  stroke-linecap: round;
  stroke-dasharray: 276.5;
  stroke-dashoffset: 276.5;
  animation: cal-fill ${RECORD_MS}ms linear forwards;
}
.cal-pupil {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 20px;
  height: 20px;
  margin: -10px 0 0 -10px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 8px var(--accent-soft);
}
.cal-dot-settle .cal-pupil {
  animation: cal-pulse 1.1s ease-in-out infinite;
}
.cal-closed .cal-pupil {
  display: none;
}

.cal-prompt {
  position: absolute;
  left: 50%;
  top: 68%;
  transform: translateX(-50%);
  width: min(28rem, calc(100% - 3rem));
  text-align: center;
}
.cal-prompt-title {
  margin: 0 0 0.5rem;
  font-size: 1.4rem;
  font-weight: 700;
}
.cal-prompt-hint {
  margin: 0 0 0.75rem;
  font-size: 1.0625rem;
  line-height: 1.5;
  color: var(--ink-2);
}
.cal-prompt-count {
  margin: 0;
  font-size: 0.9rem;
  color: var(--ink-2);
}

@keyframes cal-fill {
  to { stroke-dashoffset: 0; }
}
@keyframes cal-pulse {
  50% { transform: scale(1.25); }
}
@media (prefers-reduced-motion: reduce) {
  .cal-dot { transition: none; }
  .cal-dot-settle .cal-pupil { animation: none; }
}
`;