let ctx: AudioContext | null = null;

export function beep(times = 3): void {
    try {
        const Ctor: typeof AudioContext | undefined =
            window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        ctx ??= new Ctor();
        if (ctx.state === 'suspended') void ctx.resume();
        const start = ctx.currentTime;
        for (let i = 0; i < times; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = i % 2 ? 880 : 660;
            gain.gain.setValueAtTime(0.0001, start + i * 0.28);
            gain.gain.exponentialRampToValueAtTime(0.35, start + i * 0.28 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + i * 0.28 + 0.22);
            osc.connect(gain).connect(ctx.destination);
            osc.start(start + i * 0.28);
            osc.stop(start + i * 0.28 + 0.24);
        }
    } catch {}
}
