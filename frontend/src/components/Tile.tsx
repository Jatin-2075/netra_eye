import type { CSSProperties, ReactNode } from "react";
import Icon from "./Icon";

export interface TileProps {
  label: string;
                                            
  icon?: string;
                                                                      
  index?: number;
  sub?: string;
  className?: string;
  focused?: boolean;
                                                                                              
  progress?: number;
  speaking?: boolean;
  testId?: string;
  onClick: () => void;
  children?: ReactNode;
}


export default function Tile({
  label,
  icon,
  index = 0,
  sub,
  className = "",
  focused = false,
  progress = 0,
  speaking = false,
  testId,
  onClick,
  children,
}: TileProps) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={focused}
      data-testid={testId}
      data-tile-index={index}
      data-focus={focused ? "1" : undefined}
      aria-label={label}
      className={`tile ${className}${focused ? " is-focus" : ""}${speaking ? " is-speaking" : ""}`}
      style={{ "--i": index } as CSSProperties}
      onClick={onClick}
    >
      <span className="hold-fill" style={{ transform: `scaleY(${focused ? Math.min(1, progress) : 0})` }} />
      <span className="wave" aria-hidden="true"><i /><i /><i /><i /></span>
      {icon !== undefined && <span className="ico" aria-hidden="true"><Icon name={icon} /></span>}
      {children ?? <span className="lbl">{label}</span>}
      {sub && <span className="sub">{sub}</span>}
    </button>
  );
}
