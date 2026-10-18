import type { CSSProperties } from "react";
import Icon from "./Icon";

interface Props {
                                                                               
  nx: number;
                             
  ny: number;
  direction: "left" | "right" | "up" | "down" | null;
                                           
  holdProgress: number;
  closed: boolean;
  hidden?: boolean;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));



export default function GazeRails({ nx, ny, direction, holdProgress, closed, hidden }: Props) {
  if (hidden) return null;
  const level = {
    left: clamp01(-nx),
    right: clamp01(nx),
    up: clamp01(ny),
    down: clamp01(-ny),
  };
  const sides = ["left", "right", "up", "down"] as const;
  return (
    <div className={`rails${closed ? " is-closed" : ""}`} aria-hidden="true" data-testid="gaze-rails">
      {sides.map((side) => {
        const on = direction === side && !closed;
        return (
          <div
            key={side}
            className={`rail rail-${side}${on ? " on" : ""}`}
            style={{ "--lvl": level[side].toFixed(2), "--p": on ? holdProgress.toFixed(2) : "0" } as CSSProperties}
          >
            <span className="rail-fill" />
            <Icon name={side === "left" ? "back" : side === "right" ? "next" : side} />
          </div>
        );
      })}
    </div>
  );
}
