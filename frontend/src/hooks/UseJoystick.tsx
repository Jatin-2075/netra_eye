import { useEffect, useRef, useState } from 'react';
import { isEyeClosed, normalize, type CalibrationData } from '../lib/Calibration';
import { OneEuro } from '../lib/oneEuro';

export type JoystickEvent = 'left' | 'right' | 'up' | 'down' | 'select' | 'back';
export type Direction = 'left' | 'right' | 'up' | 'down';

export interface JoystickOptions {
                                                                       
    holdMs?: number;
    blinkMs?: number;
    ignoreBlinkMs?: number;
    deadZone?: number;
                                                                                     
    triggerH?: number;
    triggerV?: number;
                                                                                             
    releaseRatio?: number;
                                                                                                             
    repeatSlowMs?: number;
    repeatFastMs?: number;
    graceMs?: number;
    settleMs?: number;
    keyboardFallback?: boolean;
}

export const JOYSTICK_DEFAULTS: Required<JoystickOptions> = {
    holdMs: 480,
    blinkMs: 700,
    ignoreBlinkMs: 250,
    deadZone: 0.25,
    triggerH: 0.48,
    triggerV: 0.6,
    releaseRatio: 0.7,
    repeatSlowMs: 1000,
    repeatFastMs: 500,
    graceMs: 150,
    settleMs: 350,
    keyboardFallback: true,
};

export interface JoystickInput {
    x: number;
    y: number;
    blink: number;
                                                                     
    ix?: number;
    iy?: number;

    faceVisible?: boolean;
}

export interface JoystickView {
    nx: number;
    ny: number;
    closed: boolean;
    direction: Direction | null;
                                                                            
    holdProgress: number;
    blinkProgress: number;
}

export interface JoystickState extends JoystickView {
    lastEvent: { type: JoystickEvent; at: number } | null;
}

const IDLE_VIEW: JoystickView = {
    nx: 0,
    ny: 0,
    closed: false,
    direction: null,
    holdProgress: 0,
    blinkProgress: 0,
};

export interface Machine {
    holdDir: Direction | null;
    holdStart: number;
                                                                                    
    lastFire: number | null;
    lostAt: number | null;
    closedSince: number | null;
    selectFired: boolean;
    reopenedAt: number;
}

export const createMachine = (): Machine => ({
    holdDir: null,
    holdStart: 0,
    lastFire: null,
    lostAt: null,
    closedSince: null,
    selectFired: false,
    reopenedAt: -Infinity,
});

const quantize = (v: number) => Math.round(v * 20) / 20;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const isHorizontal = (d: Direction) => d === 'left' || d === 'right';

export function stepMachine(
    m: Machine,
    nx: number,
    ny: number,
    closed: boolean,
    now: number,
    o: Required<JoystickOptions>,
    verticalEnabled = true
): { view: JoystickView; event: JoystickEvent | null } {
    let event: JoystickEvent | null = null;

    let blinkProgress = 0;
    if (closed) {
        if (m.closedSince === null) m.closedSince = now;
        const held = now - m.closedSince;
        if (held >= o.blinkMs && !m.selectFired) {
            m.selectFired = true;
            event = 'select';
        }
        if (m.selectFired) blinkProgress = 1;
        else if (held >= o.ignoreBlinkMs) blinkProgress = held / o.blinkMs;
    } else if (m.closedSince !== null) {
        m.closedSince = null;
        m.selectFired = false;
        m.reopenedAt = now;
    }

    const ax = Math.abs(nx);
    const ay = verticalEnabled ? Math.abs(ny) : 0;
    const hDir: Direction = nx > 0 ? 'right' : 'left';
    const vDir: Direction = ny > 0 ? 'up' : 'down';
    const trigger = (d: Direction) => (isHorizontal(d) ? o.triggerH : o.triggerV);
    const magnitude = (d: Direction) => (isHorizontal(d) ? ax : ay);

    let direction: Direction | null = null;
    let holdProgress = 0;

    if (closed || now - m.reopenedAt < o.settleMs) {
        
        m.holdDir = null;
        m.lastFire = null;
        m.lostAt = null;
    } else {
        
        
        let candidate: Direction | null = null;
        const cur = m.holdDir;
        if (cur) {
            const sameWay = (isHorizontal(cur) ? hDir : vDir) === cur;
            const other = isHorizontal(cur) ? ay : ax;
            const mine = magnitude(cur);
            if (sameWay && mine >= trigger(cur) * o.releaseRatio && mine * 1.3 >= other) candidate = cur;
        }

        
        if (!candidate) {
            if (ax >= ay) {
                if (ax >= o.triggerH) candidate = hDir;
                else if (ay >= o.triggerV) candidate = vDir;
            } else if (ay >= o.triggerV) candidate = vDir;
            else if (ax >= o.triggerH) candidate = hDir;
        }

        if (candidate) {
            m.lostAt = null;
            if (m.holdDir !== candidate) {
                m.holdDir = candidate;
                m.holdStart = now;
                m.lastFire = null;
            }
            direction = candidate;

            if (m.lastFire === null) {
                holdProgress = clamp01((now - m.holdStart) / o.holdMs);
            } else {
                
                const push = clamp01((magnitude(candidate) - trigger(candidate)) / (1 - trigger(candidate)));
                const interval = o.repeatSlowMs + (o.repeatFastMs - o.repeatSlowMs) * push;
                holdProgress = clamp01((now - m.lastFire) / interval);
            }

            if (holdProgress >= 1) {
                event = candidate;
                m.lastFire = now;
                holdProgress = 0;
            }
        } else if (m.holdDir) {
            
            if (m.lostAt === null) m.lostAt = now;
            if (now - m.lostAt > o.graceMs) {
                m.holdDir = null;
                m.lastFire = null;
                m.lostAt = null;
            } else {
                direction = m.holdDir;
                holdProgress = m.lastFire === null ? clamp01((now - m.holdStart) / o.holdMs) : 0;
            }
        }
    }

    return {
        view: {
            nx: quantize(nx),
            ny: quantize(ny),
            closed,
            direction,
            holdProgress: quantize(holdProgress),
            blinkProgress: quantize(Math.min(1, blinkProgress)),
        },
        event,
    };
}

const sameView = (a: JoystickView, b: JoystickView) =>
    a.nx === b.nx &&
    a.ny === b.ny &&
    a.closed === b.closed &&
    a.direction === b.direction &&
    a.holdProgress === b.holdProgress &&
    a.blinkProgress === b.blinkProgress;

const KEY_EVENTS: Record<string, JoystickEvent> = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
    ArrowDown: 'down',
    Enter: 'select',
    ' ': 'select',
    Escape: 'back',
};

const TICK_MS = 40;


const FACE_LOSS_CLOSED_MS = 1200;
const FACE_LOSS_OPEN_MS = 300;

export function useJoystick(
    input: JoystickInput,
    calibration: CalibrationData | null,
    onEvent: (event: JoystickEvent) => void,
    options: JoystickOptions = {}
): JoystickState {
    const [view, setView] = useState<JoystickView>(IDLE_VIEW);
    const [lastEvent, setLastEvent] = useState<JoystickState['lastEvent']>(null);

    const latest = useRef({ ...input, faceVisible: input.faceVisible ?? true });
    const calRef = useRef(calibration);
    const onEventRef = useRef(onEvent);
    const optsRef = useRef({ ...JOYSTICK_DEFAULTS, ...options });
    useEffect(() => {
        latest.current = { ...input, faceVisible: input.faceVisible ?? true };
        calRef.current = calibration;
        onEventRef.current = onEvent;
        optsRef.current = { ...JOYSTICK_DEFAULTS, ...options };
    });

    const machine = useRef<Machine>(createMachine());
    const filters = useRef({ x: new OneEuro(), y: new OneEuro() });
    const wasClosed = useRef(false);
    const lastSeen = useRef(0);
    const lastTick = useRef(0);

    const fire = (type: JoystickEvent) => {
        onEventRef.current(type);
        setLastEvent({ type, at: Date.now() });
    };

    useEffect(() => {
        const id = window.setInterval(() => {
            const cal = calRef.current;
            const inp = latest.current;

            const now = performance.now();
            const dt = lastTick.current ? (now - lastTick.current) / 1000 : TICK_MS / 1000;
            lastTick.current = now;
            let faceLostBriefly = false;

            if (cal && inp.faceVisible) {
                lastSeen.current = now;
            } else if (cal) {
                const gone = now - lastSeen.current;
                faceLostBriefly = gone < (wasClosed.current ? FACE_LOSS_CLOSED_MS : FACE_LOSS_OPEN_MS);
            }

            if (!cal || (!inp.faceVisible && !faceLostBriefly)) {
                machine.current = createMachine();
                filters.current.x.reset();
                filters.current.y.reset();
                wasClosed.current = false;
                setView((prev) => (sameView(prev, IDLE_VIEW) ? prev : IDLE_VIEW));
                return;
            }

            
            const raw = inp.faceVisible ? normalize(inp.x, inp.y, cal, inp.ix, inp.iy) : { nx: 0, ny: 0 };
            const closed = inp.faceVisible
                ? isEyeClosed(inp.blink, cal, wasClosed.current)
                : wasClosed.current;
            wasClosed.current = closed;

            
            
            let nx = raw.nx;
            let ny = raw.ny;
            if (closed) {
                filters.current.x.reset();
                filters.current.y.reset();
            } else {
                nx = filters.current.x.filter(raw.nx, dt);
                ny = filters.current.y.filter(raw.ny, dt);
            }

            const { view: next, event } = stepMachine(
                machine.current,
                nx,
                ny,
                closed,
                now,
                optsRef.current,
                cal.verticalUsable
            );

            setView((prev) => (sameView(prev, next) ? prev : next));
            if (event) fire(event);
        }, TICK_MS);

        return () => window.clearInterval(id);

    }, []);

    const keyboard = options.keyboardFallback ?? JOYSTICK_DEFAULTS.keyboardFallback;
    useEffect(() => {
        if (!keyboard) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            const target = e.target as HTMLElement | null;
            if (target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable)) return;
            const type = KEY_EVENTS[e.key];
            
            if (!type || (e.repeat && type === 'select')) return;
            
            if (type === 'select' && target && /^(BUTTON|A)$/.test(target.tagName)) return;
            e.preventDefault();
            fire(type);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);

    }, [keyboard]);

    return { ...view, lastEvent };
}