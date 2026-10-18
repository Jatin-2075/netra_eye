import { useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver, type Category, type NormalizedLandmark } from '@mediapipe/tasks-vision';

const WASM_URL = '/wasm';
const MODEL_URL = '/face_landmarker.task';

export type EyeReading = {
    face: boolean;
                                                                                                  
    x: number;
    y: number;
    blink: number;
       
                                                                                                
                                                                                                    
       
    ix?: number;
    iy?: number;
};

export type TrackerStatus = 'idle' | 'loading' | 'running' | 'error';

type Options = {
    onFrame?: (reading: EyeReading, now: number) => void;
};

const EMPTY: EyeReading = { face: false, x: 0, y: 0, blink: 0 };



const EYES = [
    { a: 33, b: 133, iris: 468 }, 
    { a: 362, b: 263, iris: 473 }, 
] as const;

   
                                                                                                
                                                                                                
                                                        
   
export function irisGaze(lm: NormalizedLandmark[] | undefined, w: number, h: number): { ix: number; iy: number } | null {
    if (!lm || lm.length < 478 || !w || !h) return null;
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (const e of EYES) {
        const A = lm[e.a];
        const B = lm[e.b];
        const I = lm[e.iris];
        if (!A || !B || !I) continue;
        
        const ux = (B.x - A.x) * w;
        const uy = (B.y - A.y) * h;
        const len = Math.hypot(ux, uy);
        if (len < 8) continue;
        const dx = (I.x - (A.x + B.x) / 2) * w;
        const dy = (I.y - (A.y + B.y) / 2) * h;
        const along = (dx * ux + dy * uy) / (len * len);
        const across = (dy * ux - dx * uy) / (len * len); 
        sx += along;
        sy += across;
        n += 1;
    }
    if (n === 0) return null;
    return { ix: sx / n, iy: -sy / n }; 
}

function toReading(
    cats: Category[] | undefined,
    lm: NormalizedLandmark[] | undefined,
    w: number,
    h: number
): EyeReading {
    if (!cats) return EMPTY;
    const s: Record<string, number> = {};
    for (const c of cats) s[c.categoryName] = c.score;
    const g = (k: string) => s[k] ?? 0;
    const iris = irisGaze(lm, w, h);
    return {
        face: true,
        x: (g('eyeLookOutRight') + g('eyeLookInLeft') - g('eyeLookOutLeft') - g('eyeLookInRight')) / 2,
        y: (g('eyeLookUpLeft') + g('eyeLookUpRight') - g('eyeLookDownLeft') - g('eyeLookDownRight')) / 2,
        blink: (g('eyeBlinkLeft') + g('eyeBlinkRight')) / 2,
        ix: iris?.ix,
        iy: iris?.iy,
    };
}

type Fileset = Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>;

async function createLandmarker(fileset: Fileset): Promise<FaceLandmarker> {
    const make = (delegate: 'GPU' | 'CPU') =>
        FaceLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate },
            runningMode: 'VIDEO',
            numFaces: 1,
            outputFaceBlendshapes: true,
        });
    try {
        return await make('GPU');
    } catch {
        return await make('CPU');
    }
}

export function useFaceTracker(options: Options = {}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const latest = useRef<EyeReading>(EMPTY);
    const onFrameRef = useRef(options.onFrame);
    onFrameRef.current = options.onFrame;

    const [reading, setReading] = useState<EyeReading>(EMPTY);
    const [status, setStatus] = useState<TrackerStatus>('idle');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let stream: MediaStream | undefined;
        let landmarker: FaceLandmarker | undefined;
        let raf = 0;
        let cancelled = false;
        let lastVideoTime = -1;
        let lastUiUpdate = 0;

        async function start() {
            setStatus('loading');
            setError(null);

            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
                audio: false,
            });
            if (cancelled) {
                stream.getTracks().forEach((t) => t.stop());
                return;
            }

            const video = videoRef.current;
            if (!video) throw new Error('Video element is not mounted');
            video.srcObject = stream;
            await video.play();

            const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
            const lm = await createLandmarker(fileset);
            if (cancelled) {
                lm.close();
                return;
            }
            landmarker = lm;
            setStatus('running');

            const loop = () => {
                if (cancelled) return;
                if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
                    lastVideoTime = video.currentTime;
                    const now = performance.now();
                    const result = lm.detectForVideo(video, now);
                    const next = toReading(
                        result.faceBlendshapes?.[0]?.categories,
                        result.faceLandmarks?.[0],
                        video.videoWidth,
                        video.videoHeight
                    );
                    latest.current = next;
                    onFrameRef.current?.(next, now);
                    if (now - lastUiUpdate > 66) {
                        lastUiUpdate = now;
                        setReading(next);
                    }
                }
                raf = requestAnimationFrame(loop);
            };
            loop();
        }

        start().catch((e: unknown) => {
            if (cancelled) return;
            setError(e instanceof Error ? e.message : String(e));
            setStatus('error');
        });

        return () => {
            cancelled = true;
            cancelAnimationFrame(raf);
            stream?.getTracks().forEach((t) => t.stop());
            landmarker?.close();
        };
    }, []);

    return { videoRef, reading, latest, status, error };
}