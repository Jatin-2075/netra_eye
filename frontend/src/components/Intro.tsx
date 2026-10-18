import { useCallback, useEffect, useRef, useState } from "react";
import { t, type Lang } from "../lib/i18n";

interface Props {
  lang: Lang;
  onDone: () => void;
}

const ALMOND = "M20 100 C 85 22, 315 22, 380 100 C 315 178, 85 178, 20 100 Z";

export default function Intro({ lang, onDone }: Props) {
  const [leaving, setLeaving] = useState(false);
  const [manual, setManual] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const leaveTimer = useRef<number | null>(null);
  const leavingRef = useRef(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const begin = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setLeaving(true);
    leaveTimer.current = window.setTimeout(() => doneRef.current(), 450);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        begin();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [begin]);

  useEffect(() => () => {
    if (leaveTimer.current !== null) window.clearTimeout(leaveTimer.current);
  }, []);

  const onMove = (event: React.PointerEvent) => {
    const element = rootRef.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2));
    const y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.4) * 2));
    element.style.setProperty("--gx", `${x * 78}px`);
    element.style.setProperty("--gy", `${y * 26}px`);
    if (!manual) setManual(true);
  };

  return (
    <div
      ref={rootRef}
      className={`intro${leaving ? " leaving" : ""}${manual ? " manual" : ""}`}
      role="dialog"
      aria-label="Welcome to Netra Voice"
      onPointerMove={onMove}
      data-testid="intro"
    >
      <style>{CSS}</style>
      <div className="in-bg" aria-hidden="true"><i /><i /><i /></div>
      <svg className="in-eye" viewBox="0 0 400 200" aria-hidden="true">
        <defs>
          <clipPath id="in-almond"><path d={ALMOND} /></clipPath>
          <radialGradient id="in-iris" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#ffd98a" />
            <stop offset="55%" stopColor="#f0b548" />
            <stop offset="100%" stopColor="#b9731a" />
          </radialGradient>
          <radialGradient id="in-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#19b5ad" stopOpacity=".55" />
            <stop offset="100%" stopColor="#19b5ad" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle className="in-halo" cx="200" cy="100" r="190" fill="url(#in-halo)" />
        <g clipPath="url(#in-almond)">
          <rect width="400" height="200" fill="#eaf4f2" />
          <g className="in-gaze">
            <circle className="in-ring" cx="200" cy="100" r="62" fill="none" stroke="#19b5ad" strokeWidth="5" strokeLinecap="round" pathLength="100" />
            <circle cx="200" cy="100" r="50" fill="url(#in-iris)" />
            <circle cx="200" cy="100" r="50" fill="none" stroke="#7a4a0e" strokeOpacity=".35" strokeWidth="3" />
            <circle className="in-pupil" cx="200" cy="100" r="21" fill="#071518" />
            <circle cx="186" cy="84" r="8" fill="#fff" opacity=".9" />
          </g>
          <rect className="in-lid top" x="0" y="0" width="400" height="101" />
          <rect className="in-lid bot" x="0" y="99" width="400" height="101" />
        </g>
        <path d={ALMOND} fill="none" stroke="#eef6f5" strokeWidth="6" strokeLinejoin="round" />
      </svg>
      <h1 className="in-title">
        <span className="in-hi" lang="hi">नेत्र</span>
        <span className="in-en">Netra Voice</span>
      </h1>
      <p className="in-tag">{t(lang, "tagline")}</p>
      <ul className="in-pills" aria-label="What it does">
        <li>Look to move</li>
        <li>Blink to choose</li>
        <li>Speak and switch your room</li>
      </ul>
      <div className="in-demo" aria-hidden="true">
        <div className="in-tiles">
          <span>Yes</span><span>Water</span><span>Help</span>
          <b className="in-cursor" />
        </div>
        <div className="in-bubble">“I would like some water, please”</div>
      </div>
      <button type="button" className="in-go" onClick={begin} autoFocus>
        {t(lang, "begin")}
        <small>Enter</small>
      </button>
      <p className="in-foot">Works with any camera and browser. Your video never leaves this device.</p>
    </div>
  );
}

const CSS = `
.intro{--gx:0px;--gy:0px;position:fixed;inset:0;z-index:3000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(8px,1.8vh,18px);padding:24px 16px;overflow:hidden auto;background:#061316;color:#eef6f5;text-align:center;font-family:var(--font,system-ui,sans-serif);animation:in-fade .5s ease both}
.intro.leaving{animation:in-out .45s ease forwards;pointer-events:none}
@keyframes in-fade{from{opacity:0}}
@keyframes in-out{to{opacity:0;transform:scale(1.06)}}
.in-bg{position:absolute;inset:0;pointer-events:none}
.in-bg i{position:absolute;border-radius:50%;filter:blur(70px);opacity:.5;animation:in-drift 14s ease-in-out infinite alternate}
.in-bg i:nth-child(1){width:46vmax;height:46vmax;left:-12vmax;top:-14vmax;background:#0e6f6b}
.in-bg i:nth-child(2){width:38vmax;height:38vmax;right:-10vmax;bottom:-12vmax;background:#8a5a12;animation-duration:17s;animation-delay:-4s}
.in-bg i:nth-child(3){width:26vmax;height:26vmax;left:40%;top:50%;background:#12385a;animation-duration:20s;animation-delay:-8s}
@keyframes in-drift{to{transform:translate(6vmax,4vmax) scale(1.15)}}
.intro>*:not(.in-bg){position:relative}
.in-eye{width:min(560px,86vw);height:auto;overflow:visible;filter:drop-shadow(0 18px 40px rgba(25,181,173,.25));animation:in-rise .9s .1s cubic-bezier(.2,.8,.2,1) both}
@keyframes in-rise{from{opacity:0;transform:translateY(24px) scale(.94)}}
.in-halo{transform-origin:200px 100px;animation:in-pulse 4s ease-in-out infinite}
@keyframes in-pulse{50%{transform:scale(1.08);opacity:.75}}
.in-lid{fill:#0b2a2f;transform-box:view-box}
.in-lid.top{transform:translateY(-101px);animation:in-top 7s .3s infinite}
.in-lid.bot{transform:translateY(101px);animation:in-bot 7s .3s infinite}
@keyframes in-top{0%{transform:translateY(0)}9%,32%{transform:translateY(-101px)}34%{transform:translateY(-8px)}37%,64%{transform:translateY(-101px)}66%{transform:translateY(-8px)}69%,100%{transform:translateY(-101px)}}
@keyframes in-bot{0%{transform:translateY(0)}9%,32%{transform:translateY(101px)}34%{transform:translateY(8px)}37%,64%{transform:translateY(101px)}66%{transform:translateY(8px)}69%,100%{transform:translateY(101px)}}
.in-gaze{transform:translate(var(--gx),var(--gy));animation:in-look 7s .3s infinite cubic-bezier(.6,0,.3,1)}
.intro.manual .in-gaze{animation:none;transition:transform .12s ease-out}
@keyframes in-look{0%,12%{transform:translate(0,0)}20%,34%{transform:translate(-78px,0)}44%,58%{transform:translate(78px,2px)}68%,80%{transform:translate(0,30px)}90%,100%{transform:translate(0,0)}}
.in-ring{stroke-dasharray:0 100;opacity:0;animation:in-hold 7s .3s infinite linear}
.intro.manual .in-ring{animation:none}
@keyframes in-hold{0%,19%{stroke-dasharray:0 100;opacity:0}20%{opacity:1}34%{stroke-dasharray:100 0;opacity:1}36%,100%{stroke-dasharray:100 0;opacity:0}}
.in-pupil{transform-origin:200px 100px;animation:in-dilate 7s .3s infinite}
@keyframes in-dilate{0%,100%{transform:scale(1)}40%,50%{transform:scale(1.18)}}
.in-title{display:flex;flex-direction:column;align-items:center;line-height:1;margin:6px 0 0}
.in-hi{font-family:'Noto Sans Devanagari',var(--font,sans-serif);font-weight:700;font-size:clamp(52px,10vw,92px);letter-spacing:.01em;background:linear-gradient(100deg,#ffd98a,#f0b548 40%,#19b5ad 100%);-webkit-background-clip:text;background-clip:text;color:transparent;animation:in-up .8s .5s both}
.in-en{font-weight:800;font-size:clamp(26px,4.4vw,40px);letter-spacing:.14em;text-transform:uppercase;margin-top:8px;animation:in-up .8s .7s both}
.in-tag{margin:0;font-size:clamp(16px,2.3vw,21px);color:#b7d0cd;font-weight:600;max-width:34ch;animation:in-up .8s .9s both}
@keyframes in-up{from{opacity:0;transform:translateY(16px)}}
.in-pills{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;list-style:none;margin:4px 0;padding:0;animation:in-up .8s 1.1s both}
.in-pills li{padding:7px 16px;border-radius:999px;border:1px solid rgba(238,246,245,.22);background:rgba(238,246,245,.07);font-weight:700;font-size:15px;backdrop-filter:blur(6px)}
.in-demo{display:grid;gap:10px;justify-items:center;width:min(440px,90vw);animation:in-up .8s 1.3s both}
.in-tiles{position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;width:100%}
.in-tiles span{padding:14px 0;border-radius:14px;background:rgba(238,246,245,.1);border:2px solid rgba(238,246,245,.18);font-weight:800;font-size:18px}
.in-tiles span:nth-child(3){border-color:rgba(255,122,127,.5);color:#ffb0b3}
.in-cursor{position:absolute;top:-3px;left:-3px;width:calc((100% - 20px)/3 + 6px);height:calc(100% + 6px);border-radius:16px;border:3px solid #f0b548;box-shadow:0 0 22px rgba(240,181,72,.55);animation:in-cursor 7s 1.4s infinite}
@keyframes in-cursor{0%,18%{transform:translateX(0);background:transparent}26%,40%{transform:translateX(calc(100% - 6px + 10px));background:transparent}44%{background:rgba(240,181,72,.45);transform:translateX(calc(100% - 6px + 10px)) scale(1.04)}52%{background:transparent;transform:translateX(calc(100% - 6px + 10px)) scale(1)}62%,100%{transform:translateX(0);background:transparent}}
.in-bubble{min-height:34px;padding:7px 16px;border-radius:14px;background:#19b5ad;color:#042321;font-weight:700;font-size:15px;opacity:0;animation:in-bubble 7s 1.4s infinite}
@keyframes in-bubble{0%,43%{opacity:0;transform:translateY(8px)}48%,66%{opacity:1;transform:none}72%,100%{opacity:0}}
.in-go{margin-top:6px;display:inline-flex;align-items:center;gap:12px;min-height:60px;padding:0 34px;border-radius:18px;border:0;background:linear-gradient(135deg,#f7c660,#f0b548);color:#2a1a02;font-weight:800;font-size:22px;cursor:pointer;box-shadow:0 12px 34px rgba(240,181,72,.35);animation:in-up .8s 1.5s both,in-glow 2.6s 2.4s ease-in-out infinite;transition:transform .2s}
.in-go:hover{transform:translateY(-2px) scale(1.03)}
.in-go:focus-visible{outline:4px solid #19b5ad;outline-offset:4px}
.in-go small{font-size:12px;font-weight:700;padding:3px 8px;border-radius:7px;background:rgba(42,26,2,.14)}
@keyframes in-glow{50%{box-shadow:0 12px 50px rgba(240,181,72,.65)}}
.in-foot{margin:0;font-size:13px;color:#86a5a2;animation:in-up .8s 1.7s both}
@media (max-height:640px){.in-pills,.in-foot{display:none}}
@media (prefers-reduced-motion:reduce){
  .intro *,.intro{animation:none!important;transition:none!important}
  .in-lid.top{transform:translateY(-101px)}.in-lid.bot{transform:translateY(101px)}
  .in-bubble{opacity:1}
}
`;
