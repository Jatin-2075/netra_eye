import { useEffect, useRef, useState } from "react";

interface Props {
                                                                                   
  watch: unknown;
  holding: boolean;
  selecting: boolean;
  hidden?: boolean;
}


export default function GazeCursor({ watch, holding, selecting, hidden }: Props) {
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const raf = useRef(0);

  useEffect(() => {
    let stopped = false;
    let lastChange = performance.now();
    let last = "";

    const measure = () => {
      const el = document.querySelector<HTMLElement>("[data-focus='1']");
      if (!el) { setBox(null); return; }
      const r = el.getBoundingClientRect();
      const next = { x: r.left - 6, y: r.top - 6, w: r.width + 12, h: r.height + 12 };
      const key = `${next.x}|${next.y}|${next.w}|${next.h}`;
      if (key !== last) { last = key; lastChange = performance.now(); }
      setBox((p) => (p && p.x === next.x && p.y === next.y && p.w === next.w && p.h === next.h ? p : next));
    };

    
    
    const loop = () => {
      if (stopped) return;
      measure();
      if (performance.now() - lastChange < 900) raf.current = requestAnimationFrame(loop);
      else raf.current = 0;
    };
    const wake = () => {
      lastChange = performance.now();
      if (!raf.current && !stopped) raf.current = requestAnimationFrame(loop);
    };

    document.querySelector<HTMLElement>("[data-focus='1']")?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
    wake();
    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", wake);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf.current);
      raf.current = 0;
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", wake);
    };
  }, [watch]);

  if (hidden || !box) return null;
  return (
    <div
      className={`cursor${holding ? " hold" : ""}${selecting ? " sel" : ""}`}
      aria-hidden="true"
      data-testid="gaze-cursor"
      style={{ transform: `translate(${box.x}px, ${box.y}px)`, width: box.w, height: box.h }}
    >
      <span className="cur-eye">
        <svg className="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
        </svg>
      </span>
    </div>
  );
}
