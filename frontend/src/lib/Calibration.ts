export type StepId = 'center' | 'left' | 'right' | 'up' | 'down' | 'closed';

export interface Reading {
    x: number;
    y: number;
    blink: number;
                                                                                          
    ix?: number;
    iy?: number;
}

export type Readings = Record<StepId, Reading>;

export interface StepInfo {
    id: StepId;
    title: string;
    hint: string;
    speak: string;
}

export const STEPS: StepInfo[] = [
    {
        id: 'center',
        title: 'Look at the dot',
        hint: 'Sit comfortably and look straight at the dot in the middle.',
        speak: 'Look at the center dot',
    },
    {
        id: 'left',
        title: 'Look left',
        hint: 'Move only your eyes to the dot on the left. Keep your head still.',
        speak: 'Look left',
    },
    {
        id: 'right',
        title: 'Look right',
        hint: 'Move only your eyes to the dot on the right. Keep your head still.',
        speak: 'Look right',
    },
    {
        id: 'up',
        title: 'Look up',
        hint: 'Move only your eyes to the dot at the top.',
        speak: 'Look up',
    },
    {
        id: 'down',
        title: 'Look down',
        hint: 'Move only your eyes to the dot at the bottom.',
        speak: 'Look down',
    },
    {
        id: 'closed',
        title: 'Close your eyes',
        hint: 'Close them gently and keep them closed until you hear "Done".',
        speak: 'Close your eyes and keep them closed',
    },
];

                                                                                                      
export interface IrisCalibration {
    centerX: number;
    centerY: number;
    xSign: 1 | -1;
    ySign: 1 | -1;
    leftRange: number;
    rightRange: number;
    upRange: number;
    downRange: number;
                                                                                  
    xOk: boolean;
    yOk: boolean;
}

export interface CalibrationData {
    centerX: number;
    centerY: number;
    xSign: 1 | -1;
    ySign: 1 | -1;
    leftRange: number;
    rightRange: number;
    upRange: number;
    downRange: number;
    blinkOpen: number;
    blinkClosed: number;
    blinkThreshold: number;
    blinkClosedIsHigher: boolean;
                                                                                                                 
    verticalUsable: boolean;
                                                                                                      
    blendVerticalOk?: boolean;
    iris?: IrisCalibration;
}

const MIN_RANGE = 0.02;
const MIN_BLINK_GAP = 0.15;
const MAX_LOPSIDED = 3;

const RANGE_FLOOR = 0.04;

const MIN_VERTICAL = 0.06;

const IRIS_MIN_X = 0.02;
const IRIS_MIN_Y = 0.012;
const IRIS_RANGE_FLOOR = 0.008;

export function median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function buildIris(r: Readings): IrisCalibration | undefined {
    const all = Object.values(r);
    if (all.some((p) => p.ix === undefined || p.iy === undefined)) return undefined;
    const ix = (p: Reading) => p.ix as number;
    const iy = (p: Reading) => p.iy as number;

    const xSign: 1 | -1 = ix(r.right) >= ix(r.left) ? 1 : -1;
    const ySign: 1 | -1 = iy(r.up) >= iy(r.down) ? 1 : -1;
    const left = Math.abs(ix(r.left) - ix(r.center));
    const right = Math.abs(ix(r.right) - ix(r.center));
    const up = Math.abs(iy(r.up) - iy(r.center));
    const down = Math.abs(iy(r.down) - iy(r.center));

    return {
        centerX: ix(r.center),
        centerY: iy(r.center),
        xSign,
        ySign,
        leftRange: Math.max(left, IRIS_RANGE_FLOOR),
        rightRange: Math.max(right, IRIS_RANGE_FLOOR),
        upRange: Math.max(up, IRIS_RANGE_FLOOR),
        downRange: Math.max(down, IRIS_RANGE_FLOOR),
        xOk: Math.min(left, right) >= IRIS_MIN_X,
        yOk: Math.min(up, down) >= IRIS_MIN_Y,
    };
}

export function buildCalibration(r: Readings): { data: CalibrationData; warnings: string[] } {
    const xSign: 1 | -1 = r.right.x >= r.left.x ? 1 : -1;
    const ySign: 1 | -1 = r.up.y >= r.down.y ? 1 : -1;

    const leftRange = Math.abs(r.left.x - r.center.x);
    const rightRange = Math.abs(r.right.x - r.center.x);
    const upRange = Math.abs(r.up.y - r.center.y);
    const downRange = Math.abs(r.down.y - r.center.y);

    
    
    const blinkOpen = Math.max(r.center.blink, r.left.blink, r.right.blink, r.up.blink, r.down.blink);
    const blinkClosed = r.closed.blink;
    const blendVerticalOk = Math.min(upRange, downRange) >= MIN_VERTICAL;
    const iris = buildIris(r);
    const verticalUsable = blendVerticalOk || Boolean(iris?.yOk);

    const data: CalibrationData = {
        centerX: r.center.x,
        centerY: r.center.y,
        xSign,
        ySign,
        leftRange: Math.max(leftRange, RANGE_FLOOR),
        rightRange: Math.max(rightRange, RANGE_FLOOR),
        upRange: Math.max(upRange, RANGE_FLOOR),
        downRange: Math.max(downRange, RANGE_FLOOR),
        blinkOpen,
        blinkClosed,
        blinkThreshold: (blinkOpen + blinkClosed) / 2,
        blinkClosedIsHigher: blinkClosed > blinkOpen,
        verticalUsable,
        blendVerticalOk,
        iris,
    };

    const warnings: string[] = [];

    if (Math.min(leftRange, rightRange) < MIN_RANGE) {
        warnings.push(
            'Your sideways eye movement was very small. Move a little closer to the camera and look all the way to the dots, then redo.'
        );
    } else if (
        Math.max(leftRange, rightRange) / Math.min(leftRange, rightRange) > MAX_LOPSIDED
    ) {
        warnings.push(
            'Looking left and right gave uneven results. Keep your head still and face the camera straight, then redo.'
        );
    }

    if (!verticalUsable) {
        warnings.push(
            'Up and down movement was small, which is common with a webcam. Up and down are switched off; left, right and a long blink are your controls.'
        );
    }

    if (Math.abs(blinkClosed - blinkOpen) < MIN_BLINK_GAP) {
        warnings.push(
            'Open and closed eyes looked almost the same to the camera. Put more light on your face and redo.'
        );
    }

    return { data, warnings };
}

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;

   
                                                                                                  
                                                                                                 
                                                            
   
export function normalize(
    x: number,
    y: number,
    c: CalibrationData,
    ix?: number,
    iy?: number
): { nx: number; ny: number } {
    const dx = (x - c.centerX) * c.xSign;
    const dy = (y - c.centerY) * c.ySign;
    const hs = [dx >= 0 ? dx / c.rightRange : dx / c.leftRange];
    const vs: number[] = [];
    if (c.blendVerticalOk ?? c.verticalUsable) vs.push(dy >= 0 ? dy / c.upRange : dy / c.downRange);

    const i = c.iris;
    if (i && ix !== undefined && iy !== undefined) {
        if (i.xOk) {
            const d = (ix - i.centerX) * i.xSign;
            hs.push(d >= 0 ? d / i.rightRange : d / i.leftRange);
        }
        if (i.yOk) {
            const d = (iy - i.centerY) * i.ySign;
            vs.push(d >= 0 ? d / i.upRange : d / i.downRange);
        }
    }
    return { nx: clamp(mean(hs)), ny: vs.length ? clamp(mean(vs)) : 0 };
}

   
                                                                                        
                                                                                    
   
export function isEyeClosed(blink: number, c: CalibrationData, wasClosed = false): boolean {
    const margin = Math.abs(c.blinkClosed - c.blinkOpen) * 0.1;
    if (c.blinkClosedIsHigher) {
        return wasClosed ? blink > c.blinkThreshold - margin : blink > c.blinkThreshold + margin;
    }
    return wasClosed ? blink < c.blinkThreshold + margin : blink < c.blinkThreshold - margin;
}