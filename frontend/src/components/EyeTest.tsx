import { useEffect, useState } from "react";
import type { CSSProperties, Ref } from "react";

export interface EyeTestProps {
    videoRef: Ref<HTMLVideoElement>;
    x: number;
    y: number;
    blink: number;
    ready: boolean;
    face?: boolean;
    error?: string | null;
}

interface Range {
    min: number;
    max: number;
}

const EMPTY: Range = { min: Infinity, max: -Infinity };

const widen = (range: Range, value: number): Range =>
    Number.isFinite(value)
        ? { min: Math.min(range.min, value), max: Math.max(range.max, value) }
        : range;

const fmt = (value: number): string =>
    Number.isFinite(value) ? value.toFixed(3) : "--";

const spread = (range: Range): number =>
    range.max > range.min ? range.max - range.min : 0;

const COLORS = {
    panel: "#0f172a",
    border: "#334155",
    text: "#e2e8f0",
    muted: "#94a3b8",
    bar: "#38bdf8",
    good: "#22c55e",
    wait: "#f59e0b",
};

interface RowProps {
    label: string;
    value: number;
    range: Range;
}

function Row({ label, value, range }: RowProps) {
    const width = spread(range);
    const pct = width > 0 ? ((value - range.min) / width) * 100 : 0;
    const clamped = Math.min(100, Math.max(0, Number.isFinite(pct) ? pct : 0));

    const rowStyle: CSSProperties = {
        display: "grid",
        gridTemplateColumns: "56px 72px 1fr",
        alignItems: "center",
        gap: 10,
        fontSize: 15,
        color: COLORS.text,
    };

    return (
        <div>
            <div style={rowStyle}>
                <span style={{ color: COLORS.muted }}>{label}</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(value)}</span>
                <div
                    style={{
                        height: 8,
                        borderRadius: 4,
                        background: COLORS.border,
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            width: `${clamped}%`,
                            height: "100%",
                            background: COLORS.bar,
                            transition: "width 60ms linear",
                        }}
                    />
                </div>
            </div>
            <div style={{ marginLeft: 66, fontSize: 12, color: COLORS.muted }}>
                seen {fmt(range.min)} to {fmt(range.max)}, spread {fmt(width)}
            </div>
        </div>
    );
}

interface CheckProps {
    label: string;
    passed: boolean;
}

function Check({ label, passed }: CheckProps) {
    return (
        <div
            style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                fontSize: 14,
                color: passed ? COLORS.good : COLORS.wait,
            }}
        >
            <span>{passed ? "Pass" : "Waiting"}</span>
            <span style={{ color: COLORS.text }}>{label}</span>
        </div>
    );
}

export default function EyeTest({ videoRef, x, y, blink, ready, face, error }: EyeTestProps) {
    const [xRange, setXRange] = useState<Range>(EMPTY);
    const [yRange, setYRange] = useState<Range>(EMPTY);
    const [blinkRange, setBlinkRange] = useState<Range>(EMPTY);

    useEffect(() => {
        if (!ready) return;
        setXRange((r) => widen(r, x));
        setYRange((r) => widen(r, y));
        setBlinkRange((r) => widen(r, blink));
    }, [x, y, blink, ready]);

    const resetRanges = () => {
        setXRange(EMPTY);
        setYRange(EMPTY);
        setBlinkRange(EMPTY);
    };

    const xMoves = spread(xRange) > 0.02;
    const yMoves = spread(yRange) > 0.02;
    const blinkJumps = spread(blinkRange) > 0.2;

    const status = error
        ? `Camera error: ${error}`
        : ready
            ? face === false
                ? "Model running, but no face found. Face the camera with light on your face."
                : "Tracking, face found"
            : "Starting camera and model";

    const pageStyle: CSSProperties = {
        maxWidth: 720,
        margin: "0 auto",
        padding: 16,
        display: "grid",
        gap: 16,
        color: COLORS.text,
    };

    return (
        <div style={pageStyle}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Eye test</div>
            <div style={{ color: error ? COLORS.wait : COLORS.muted }}>{status}</div>

            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                    width: "100%",
                    maxHeight: 360,
                    objectFit: "cover",
                    borderRadius: 12,
                    border: `1px solid ${COLORS.border}`,
                    background: "#000",
                    transform: "scaleX(-1)",
                }}
            />

            <div
                style={{
                    display: "grid",
                    gap: 12,
                    padding: 14,
                    borderRadius: 12,
                    background: COLORS.panel,
                    border: `1px solid ${COLORS.border}`,
                }}
            >
                <Row label="x" value={x} range={xRange} />
                <Row label="y" value={y} range={yRange} />
                <Row label="blink" value={blink} range={blinkRange} />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
                <Check label="x changes when you look left and right" passed={xMoves} />
                <Check label="y changes when you look up and down" passed={yMoves} />
                <Check label="blink jumps when you close your eyes" passed={blinkJumps} />
            </div>

            <button
                type="button"
                onClick={resetRanges}
                style={{
                    justifySelf: "start",
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: `1px solid ${COLORS.border}`,
                    background: COLORS.panel,
                    color: COLORS.text,
                    cursor: "pointer",
                }}
            >
                Reset seen ranges
            </button>
        </div>
    );
}