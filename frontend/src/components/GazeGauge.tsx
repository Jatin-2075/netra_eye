import type { CSSProperties } from "react";

export type GazeDirection = "left" | "right" | "up" | "down" | "center";

export interface GazeGaugeProps {
    x: number;
    y: number;
    eyesClosed?: boolean;
    deadZone?: number;
    direction?: GazeDirection | null;
    holdProgress?: number;
    size?: number;
    showLabel?: boolean;
                                                                                                         
    triggerZone?: number;
                                                                         
    labels?: Partial<Record<GazeDirection | 'closed', string>>;
}

const clamp = (value: number, min: number, max: number): number =>
    Math.min(max, Math.max(min, value));

function deriveDirection(x: number, y: number, deadZone: number): GazeDirection {
    if (Math.hypot(x, y) < deadZone) return "center";
    if (Math.abs(x) >= Math.abs(y)) return x < 0 ? "left" : "right";
    return y < 0 ? "up" : "down";
}

const LABELS: Record<GazeDirection, string> = {
    left: "Looking left",
    right: "Looking right",
    up: "Looking up",
    down: "Looking down",
    center: "Looking at center",
};

const COLORS = {
    ring: "#64748b",
    deadZone: "rgba(148, 163, 184, 0.18)",
    deadZoneEdge: "#94a3b8",
    crosshair: "rgba(148, 163, 184, 0.35)",
    dotActive: "#FFB627",
    dotIdle: "#e2e8f0",
    dotClosed: "#f59e0b",
    progress: "#FFB627",
    text: "#e2e8f0",
};

export default function GazeGauge({
    x,
    y,
    eyesClosed = false,
    deadZone = 0.25,
    direction,
    holdProgress = 0,
    size = 180,
    showLabel = true,
    triggerZone,
    labels,
}: GazeGaugeProps) {
    const center = 50;
    const outerRadius = 44;
    const dotRadius = 5;
    const travel = outerRadius - dotRadius - 1;

    const safeX = clamp(Number.isFinite(x) ? x : 0, -1, 1);
    const safeY = clamp(Number.isFinite(y) ? y : 0, -1, 1);
    const safeDead = clamp(deadZone, 0, 0.9);
    const progress = clamp(holdProgress, 0, 1);

    const activeDirection = direction ?? deriveDirection(safeX, safeY, safeDead);
    const isMoving = activeDirection !== "center";

    const dotX = eyesClosed ? center : center + safeX * travel;
    const dotY = eyesClosed ? center : center + safeY * travel;

    const deadRadius = safeDead * travel;
    const triggerRadius =
        triggerZone !== undefined && triggerZone > safeDead ? clamp(triggerZone, 0, 1) * travel : null;

    const arcRadius = outerRadius + 3;
    const arcLength = 2 * Math.PI * arcRadius;

    const dotColor = eyesClosed
        ? COLORS.dotClosed
        : isMoving
            ? COLORS.dotActive
            : COLORS.dotIdle;

    const labelText = eyesClosed
        ? (labels?.closed ?? "Eyes closed")
        : (labels?.[activeDirection] ?? LABELS[activeDirection]);

    const wrapperStyle: CSSProperties = {
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
    };

    const labelStyle: CSSProperties = {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: 600,
        minHeight: 20,
    };

    return (
        <div style={wrapperStyle}>
            <svg
                width={size}
                height={size}
                viewBox="0 0 100 100"
                role="img"
                aria-label={`Gaze gauge: ${labelText}`}
            >
                {progress > 0 && (
                    <circle
                        cx={center}
                        cy={center}
                        r={arcRadius}
                        fill="none"
                        stroke={COLORS.progress}
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeDasharray={arcLength}
                        strokeDashoffset={arcLength * (1 - progress)}
                        transform={`rotate(-90 ${center} ${center})`}
                    />
                )}

                <circle
                    cx={center}
                    cy={center}
                    r={outerRadius}
                    fill="none"
                    stroke={COLORS.ring}
                    strokeWidth={1.5}
                />

                <line
                    x1={center - outerRadius}
                    y1={center}
                    x2={center + outerRadius}
                    y2={center}
                    stroke={COLORS.crosshair}
                    strokeWidth={0.6}
                />
                <line
                    x1={center}
                    y1={center - outerRadius}
                    x2={center}
                    y2={center + outerRadius}
                    stroke={COLORS.crosshair}
                    strokeWidth={0.6}
                />

                {triggerRadius !== null && (
                    <circle
                        cx={center}
                        cy={center}
                        r={triggerRadius}
                        fill="none"
                        stroke={COLORS.deadZoneEdge}
                        strokeWidth={0.6}
                        strokeDasharray="1 3"
                        opacity={0.7}
                    />
                )}

                <circle
                    cx={center}
                    cy={center}
                    r={deadRadius}
                    fill={COLORS.deadZone}
                    stroke={COLORS.deadZoneEdge}
                    strokeWidth={0.8}
                    strokeDasharray="2 2"
                />

                <circle
                    cx={dotX}
                    cy={dotY}
                    r={dotRadius + 3}
                    fill={dotColor}
                    opacity={0.25}
                    style={{ transition: "cx 80ms linear, cy 80ms linear" }}
                />
                <circle
                    cx={dotX}
                    cy={dotY}
                    r={eyesClosed ? dotRadius - 1.5 : dotRadius}
                    fill={dotColor}
                    style={{ transition: "cx 80ms linear, cy 80ms linear, fill 120ms" }}
                />
            </svg>

            {showLabel && <div style={labelStyle}>{labelText}</div>}
        </div>
    );
}