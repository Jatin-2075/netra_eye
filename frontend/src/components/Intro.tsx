import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import Icon from "./Icon";
import { t, type Lang } from "../lib/i18n";

interface Props {
  lang: Lang;
  onDone: () => void;
}

const ALMOND = "M20 100 C 85 22, 315 22, 380 100 C 315 178, 85 178, 20 100 Z";
const STATS = [
  { big: "Lakhs → ₹0", small: "Dedicated eye trackers cost several lakhs. Netra needs only a camera you already own." },
  { big: "~20 s", small: "Personal eye setup that learns your own range and blink." },
  { big: "2", small: "Languages, English and Hindi, for the screen and the voice." },
  { big: "0 bytes", small: "Of camera video leave your device. It is processed in the browser." },
];
const FEATURES = [
  { icon: "eye", title: "Eye joystick", text: "Look left or right to move, long blink to choose. Quick natural blinks are ignored." },
  { icon: "speaker", title: "Instant phrases", text: "15 spoken presets like Water, Medicine and Help, plus your own saved phrases." },
  { icon: "kbd", title: "Eye keyboard", text: "Pick a letter group, then a letter. Every letter, word and message is read aloud." },
  { icon: "mic", title: "Listen and reply", text: "Speech to text hears the helper and suggests four short replies to pick with your eyes." },
  { icon: "lamp", title: "Lamp and fan", text: "Switch your room with a blink. Connect a real plug or relay through a simple webhook." },
  { icon: "alert", title: "Urgent help alert", text: "Help and Pain trigger a loud, repeated spoken alert with a big red banner." },
  { icon: "globe", title: "Hindi and English", text: "Labels and spoken output in both, with a banner if a voice is missing." },
  { icon: "user", title: "Caregiver panel", text: "Add personal phrases, see status, and set up real devices for the room." },
];
const USES = [
  { icon: "bell", title: "ALS and motor neurone disease", text: "Keep a voice as speech and hand control fade." },
  { icon: "home", title: "Stroke recovery", text: "Ask for water, medicine or a nurse while speech returns." },
  { icon: "user", title: "Paralysis and spinal injury", text: "Control light and air without reaching for a switch." },
  { icon: "family", title: "Cerebral palsy", text: "Large tiles and a forgiving dead zone for uneven eye movement." },
  { icon: "doctor", title: "Home and hospital care", text: "Nurses and family ask, the patient answers, nobody has to guess." },
];
const RING = ["Yes", "Water", "Help", "Medicine", "Family", "Thank you"];

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

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>(".rv"));
    if (typeof IntersectionObserver === "undefined") {
      items.forEach((item) => item.classList.add("on"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("on");
          observer.unobserve(entry.target);
        }
      }),
      { root, threshold: 0.15 },
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => {
    if (leaveTimer.current !== null) window.clearTimeout(leaveTimer.current);
  }, []);

  const onMove = (event: RPointerEvent) => {
    const element = rootRef.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2));
    const y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.4) * 2));
    element.style.setProperty("--gx", `${x * 78}px`);
    element.style.setProperty("--gy", `${y * 26}px`);
    element.style.setProperty("--ex", String(x));
    element.style.setProperty("--ey", String(y));
    if (!manual) setManual(true);
  };

  const tilt = (event: RPointerEvent<HTMLElement>) => {
    const element = event.currentTarget;
    const bounds = element.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    element.style.setProperty("--rx", `${(0.5 - y) * 18}deg`);
    element.style.setProperty("--ry", `${(x - 0.5) * 22}deg`);
    element.style.setProperty("--mx", `${x * 100}%`);
    element.style.setProperty("--my", `${y * 100}%`);
  };
  const untilt = (event: RPointerEvent<HTMLElement>) => {
    event.currentTarget.style.setProperty("--rx", "0deg");
    event.currentTarget.style.setProperty("--ry", "0deg");
  };
  const t3d = { onPointerMove: tilt, onPointerLeave: untilt };

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
      <button type="button" className="in-skip" onClick={begin}>Skip</button>

      <section className="in-hero">
        <div className="in-eye3d">
          <svg className="in-eye" viewBox="0 0 400 200" aria-hidden="true">
            <defs>
              <clipPath id="in-almond"><path d={ALMOND} /></clipPath>
              <radialGradient id="in-iris" cx="50%" cy="45%" r="60%">
                <stop offset="0%" stopColor="#7dd3ff" />
                <stop offset="50%" stopColor="#2f7bff" />
                <stop offset="100%" stopColor="#0a3d91" />
              </radialGradient>
              <radialGradient id="in-halo" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#19d38a" stopOpacity=".5" />
                <stop offset="60%" stopColor="#2f7bff" stopOpacity=".2" />
                <stop offset="100%" stopColor="#2f7bff" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle className="in-halo" cx="200" cy="100" r="190" fill="url(#in-halo)" />
            <g clipPath="url(#in-almond)">
              <rect width="400" height="200" fill="#f4f8fb" />
              <g className="in-gaze">
                <circle className="in-ring" cx="200" cy="100" r="62" fill="none" stroke="#19d38a" strokeWidth="5" strokeLinecap="round" pathLength="100" />
                <circle cx="200" cy="100" r="50" fill="url(#in-iris)" />
                <circle cx="200" cy="100" r="50" fill="none" stroke="#04204f" strokeOpacity=".45" strokeWidth="3" />
                <circle className="in-pupil" cx="200" cy="100" r="21" fill="#02060a" />
                <circle cx="186" cy="84" r="8" fill="#fff" opacity=".92" />
              </g>
              <rect className="in-lid top" x="0" y="0" width="400" height="101" />
              <rect className="in-lid bot" x="0" y="99" width="400" height="101" />
            </g>
            <path d={ALMOND} fill="none" stroke="#fff" strokeWidth="6" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="in-title"><span className="in-hi" lang="hi">नेत्र</span><span className="in-en">Netra Voice</span></h1>
        <p className="in-tag">{t(lang, "tagline")}</p>
        <ul className="in-pills" aria-label="What it does"><li>Look to move</li><li>Blink to choose</li><li>Speak and switch your room</li></ul>
        <div className="in-demo" aria-hidden="true">
          <div className="in-tiles"><span>Yes</span><span>Water</span><span>Help</span><b className="in-cursor" /></div>
          <div className="in-bubble">“I would like some water, please”</div>
        </div>
        <button type="button" className="in-go" onClick={begin} autoFocus>{t(lang, "begin")}<small>Enter</small></button>
        <p className="in-scroll" aria-hidden="true">Scroll to explore <span>↓</span></p>
      </section>

      <section className="in-sec rv">
        <h2>Say it in one blink</h2>
        <p className="in-sub">Big, high contrast tiles. Hover to pause the ring.</p>
        <div className="in-stage" aria-hidden="true"><div className="in-ring3d">{RING.map((label, index) => <div className="face" key={label} style={{ transform: `rotateY(${index * 60}deg) translateZ(var(--r))` }}>{label}</div>)}</div></div>
      </section>

      <section className="in-sec">
        <h2 className="rv">Impact</h2>
        <p className="in-sub rv">Bridging the gap between a person who cannot speak or move, and the people around them.</p>
        <div className="in-bridge rv" aria-hidden="true">
          <div className="node"><b>The person</b><span>Aware, but no voice or hands</span></div><div className="wire"><i /></div>
          <div className="node core"><b>Netra</b><span>Eyes become words and switches</span></div><div className="wire"><i /></div>
          <div className="node"><b>Family and nurses</b><span>Hear, understand, respond</span></div>
        </div>
        <div className="in-grid stats">{STATS.map((stat) => <article className="card t3d rv" key={stat.big} {...t3d}><div className="glare" /><div className="lift"><strong>{stat.big}</strong><p>{stat.small}</p></div></article>)}</div>
      </section>

      <section className="in-sec">
        <h2 className="rv">Features</h2>
        <p className="in-sub rv">Everything runs in the browser. Tilt a card to feel it.</p>
        <div className="in-grid">{FEATURES.map((feature) => <article className="card t3d rv" key={feature.title} {...t3d}><div className="glare" /><div className="lift"><span className="ico"><Icon name={feature.icon} /></span><h3>{feature.title}</h3><p>{feature.text}</p></div></article>)}</div>
      </section>

      <section className="in-sec">
        <h2 className="rv">Use cases</h2>
        <p className="in-sub rv">For people who stay fully aware while speech and movement are limited.</p>
        <div className="in-grid">{USES.map((use) => <article className="card t3d rv" key={use.title} {...t3d}><div className="glare" /><div className="lift"><span className="ico"><Icon name={use.icon} /></span><h3>{use.title}</h3><p>{use.text}</p></div></article>)}</div>
      </section>

      <section className="in-sec in-end rv">
        <p className="in-note">A student prototype, not a medical device. Real-user testing is the next step.</p>
        <button type="button" className="in-go alt" onClick={begin}>{t(lang, "begin")}<small>Enter</small></button>
        <p className="in-foot">Works with any camera and browser. Your video never leaves this device.</p>
      </section>
    </div>
  );
}

const CSS = `
.intro{--gx:0px;--gy:0px;--ex:0;--ey:0;--blue:#2f7bff;--blue2:#7dd3ff;--green:#19d38a;--ink:#f4f8fb;--mute:#9db4c8;--r:150px;position:fixed;inset:0;z-index:3000;overflow-x:hidden;overflow-y:auto;background:#03070b;color:var(--ink);text-align:center;font-family:var(--font,system-ui,sans-serif);animation:in-fade .5s ease both;scroll-behavior:smooth}
.intro.leaving{animation:in-out .45s ease forwards;pointer-events:none}
@keyframes in-fade{from{opacity:0}}@keyframes in-out{to{opacity:0;transform:scale(1.06)}}
.in-bg{position:fixed;inset:0;pointer-events:none}.in-bg i{position:absolute;border-radius:50%;filter:blur(80px);opacity:.45;animation:in-drift 14s ease-in-out infinite alternate}
.in-bg i:nth-child(1){width:46vmax;height:46vmax;left:-12vmax;top:-14vmax;background:#0b4fd6}.in-bg i:nth-child(2){width:38vmax;height:38vmax;right:-10vmax;bottom:-12vmax;background:#0a8f60;animation-duration:17s;animation-delay:-4s}.in-bg i:nth-child(3){width:26vmax;height:26vmax;left:40%;top:50%;background:#123f8f;animation-duration:20s;animation-delay:-8s}
@keyframes in-drift{to{transform:translate(6vmax,4vmax) scale(1.15)}}.intro>section,.in-skip{position:relative}
.in-skip{position:fixed;top:14px;right:14px;z-index:5;min-height:40px;padding:0 18px;border-radius:999px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;font-weight:700;font-size:14px;cursor:pointer;backdrop-filter:blur(8px)}.in-skip:hover{background:rgba(255,255,255,.18)}
.in-hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(8px,1.8vh,18px);padding:56px 16px 28px}.in-eye3d{perspective:900px;width:min(560px,86vw)}
.in-eye{display:block;width:100%;height:auto;overflow:visible;transform-style:preserve-3d;transform:rotateY(calc(var(--ex)*16deg)) rotateX(calc(var(--ey)*-11deg));transition:transform .15s ease-out;filter:drop-shadow(0 22px 44px rgba(47,123,255,.35));animation:in-rise .9s .1s cubic-bezier(.2,.8,.2,1) both}
@keyframes in-rise{from{opacity:0;translate:0 24px;scale:.94}}.in-halo{transform-origin:200px 100px;animation:in-pulse 4s ease-in-out infinite}@keyframes in-pulse{50%{transform:scale(1.08);opacity:.75}}
.in-lid{fill:#06121c;transform-box:view-box}.in-lid.top{transform:translateY(-101px);animation:in-top 7s .3s infinite}.in-lid.bot{transform:translateY(101px);animation:in-bot 7s .3s infinite}
@keyframes in-top{0%{transform:translateY(0)}9%,32%{transform:translateY(-101px)}34%{transform:translateY(-8px)}37%,64%{transform:translateY(-101px)}66%{transform:translateY(-8px)}69%,100%{transform:translateY(-101px)}}@keyframes in-bot{0%{transform:translateY(0)}9%,32%{transform:translateY(101px)}34%{transform:translateY(8px)}37%,64%{transform:translateY(101px)}66%{transform:translateY(8px)}69%,100%{transform:translateY(101px)}}
.in-gaze{transform:translate(var(--gx),var(--gy));animation:in-look 7s .3s infinite cubic-bezier(.6,0,.3,1)}.intro.manual .in-gaze{animation:none;transition:transform .12s ease-out}
@keyframes in-look{0%,12%{transform:translate(0,0)}20%,34%{transform:translate(-78px,0)}44%,58%{transform:translate(78px,2px)}68%,80%{transform:translate(0,30px)}90%,100%{transform:translate(0,0)}}.in-ring{stroke-dasharray:0 100;opacity:0;animation:in-hold 7s .3s infinite linear}.intro.manual .in-ring{animation:none}
@keyframes in-hold{0%,19%{stroke-dasharray:0 100;opacity:0}20%{opacity:1}34%{stroke-dasharray:100 0;opacity:1}36%,100%{stroke-dasharray:100 0;opacity:0}}.in-pupil{transform-origin:200px 100px;animation:in-dilate 7s .3s infinite}@keyframes in-dilate{0%,100%{transform:scale(1)}40%,50%{transform:scale(1.18)}}
.in-title{display:flex;flex-direction:column;align-items:center;line-height:1;margin:6px 0 0}.in-hi{font-family:'Noto Sans Devanagari',var(--font,sans-serif);font-weight:700;font-size:clamp(52px,10vw,92px);background:linear-gradient(100deg,#fff,var(--blue2) 35%,var(--green) 100%);-webkit-background-clip:text;background-clip:text;color:transparent;animation:in-up .8s .5s both}.in-en{font-weight:800;font-size:clamp(26px,4.4vw,40px);letter-spacing:.14em;text-transform:uppercase;margin-top:8px;animation:in-up .8s .7s both}.in-tag{margin:0;font-size:clamp(16px,2.3vw,21px);color:#b9cfe0;font-weight:600;max-width:34ch;animation:in-up .8s .9s both}@keyframes in-up{from{opacity:0;transform:translateY(16px)}}
.in-pills{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;list-style:none;margin:4px 0;padding:0;animation:in-up .8s 1.1s both}.in-pills li{padding:7px 16px;border-radius:999px;border:1px solid rgba(125,211,255,.35);background:rgba(47,123,255,.12);font-weight:700;font-size:15px;backdrop-filter:blur(6px)}
.in-demo{display:grid;gap:10px;justify-items:center;width:min(440px,90vw);animation:in-up .8s 1.3s both}.in-tiles{position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;width:100%}.in-tiles span{padding:14px 0;border-radius:14px;background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.2);font-weight:800;font-size:18px}.in-tiles span:nth-child(3){border-color:rgba(25,211,138,.55);color:#8ff0c4}
.in-cursor{position:absolute;top:-3px;left:-3px;width:calc((100% - 20px)/3 + 6px);height:calc(100% + 6px);border-radius:16px;border:3px solid var(--green);box-shadow:0 0 22px rgba(25,211,138,.6);animation:in-cursor 7s 1.4s infinite}@keyframes in-cursor{0%,18%{transform:translateX(0);background:transparent}26%,40%{transform:translateX(calc(100% - 6px + 10px));background:transparent}44%{background:rgba(25,211,138,.4);transform:translateX(calc(100% - 6px + 10px)) scale(1.04)}52%{background:transparent;transform:translateX(calc(100% - 6px + 10px)) scale(1)}62%,100%{transform:translateX(0);background:transparent}}
.in-bubble{min-height:34px;padding:7px 16px;border-radius:14px;background:linear-gradient(135deg,var(--blue),var(--green));color:#fff;font-weight:700;font-size:15px;opacity:0;animation:in-bubble 7s 1.4s infinite}@keyframes in-bubble{0%,43%{opacity:0;transform:translateY(8px)}48%,66%{opacity:1;transform:none}72%,100%{opacity:0}}
.in-go{margin-top:6px;display:inline-flex;align-items:center;gap:12px;min-height:60px;padding:0 34px;border-radius:18px;border:0;background:linear-gradient(135deg,var(--blue),var(--green));color:#fff;font-weight:800;font-size:22px;cursor:pointer;box-shadow:0 12px 34px rgba(47,123,255,.45);animation:in-up .8s 1.5s both,in-glow 2.6s 2.4s ease-in-out infinite;transition:transform .2s}.in-go:hover{transform:translateY(-3px) scale(1.04) rotateX(8deg)}.in-go:focus-visible{outline:4px solid #fff;outline-offset:4px}.in-go small{font-size:12px;font-weight:700;padding:3px 8px;border-radius:7px;background:rgba(0,0,0,.28)}.in-go.alt{animation:in-glow 2.6s ease-in-out infinite}@keyframes in-glow{50%{box-shadow:0 12px 56px rgba(25,211,138,.6)}}
.in-scroll{margin:6px 0 0;font-size:13px;color:var(--mute);animation:in-up .8s 1.8s both}.in-scroll span{display:inline-block;animation:in-bob 1.6s ease-in-out infinite}@keyframes in-bob{50%{transform:translateY(5px)}}
.in-sec{max-width:1080px;margin:0 auto;padding:72px 18px 8px}.in-sec h2{font-size:clamp(30px,5vw,46px);font-weight:800;margin:0;letter-spacing:-.01em;background:linear-gradient(100deg,#fff,var(--blue2) 50%,var(--green));-webkit-background-clip:text;background-clip:text;color:transparent}.in-sub{margin:10px auto 28px;color:#b9cfe0;font-weight:600;max-width:52ch}.rv{opacity:0;transform:translateY(34px);transition:opacity .7s ease,transform .7s cubic-bezier(.2,.8,.2,1)}.rv.on{opacity:1;transform:none}
.in-stage{height:240px;perspective:1000px;display:grid;place-items:center}.in-ring3d{position:relative;width:120px;height:90px;transform-style:preserve-3d;animation:in-spin 18s linear infinite}.in-stage:hover .in-ring3d{animation-play-state:paused}@keyframes in-spin{to{transform:rotateX(-8deg) rotateY(-360deg)}}.in-ring3d{transform:rotateX(-8deg)}.in-ring3d .face{position:absolute;inset:0;display:grid;place-items:center;border-radius:16px;font-weight:800;font-size:20px;color:#fff;background:linear-gradient(145deg,rgba(47,123,255,.85),rgba(25,211,138,.75));border:2px solid rgba(255,255,255,.55);box-shadow:0 0 30px rgba(47,123,255,.4);backface-visibility:visible}
.in-bridge{display:grid;grid-template-columns:1fr 60px 1.1fr 60px 1fr;align-items:center;gap:0;margin:0 auto 34px}.in-bridge .node{padding:16px 10px;border-radius:18px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);backdrop-filter:blur(6px)}.in-bridge .node b{display:block;font-size:18px}.in-bridge .node span{display:block;font-size:13px;color:var(--mute);margin-top:4px}.in-bridge .core{border-color:transparent;background:linear-gradient(135deg,rgba(47,123,255,.55),rgba(25,211,138,.5));box-shadow:0 0 40px rgba(47,123,255,.4);animation:in-core 3s ease-in-out infinite}@keyframes in-core{50%{transform:scale(1.05)}}.in-bridge .wire{position:relative;height:4px;background:rgba(255,255,255,.18);border-radius:4px;overflow:hidden}.in-bridge .wire i{position:absolute;top:0;left:-40%;width:40%;height:100%;background:linear-gradient(90deg,transparent,var(--green),transparent);animation:in-flow 1.8s linear infinite}@keyframes in-flow{to{left:100%}}
.in-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:18px;text-align:left}.in-grid.stats{grid-template-columns:repeat(auto-fit,minmax(210px,1fr));text-align:center}.card{--rx:0deg;--ry:0deg;--mx:50%;--my:50%;position:relative;padding:22px 20px;border-radius:20px;border:1px solid rgba(125,211,255,.28);background:linear-gradient(160deg,rgba(47,123,255,.16),rgba(255,255,255,.04) 55%,rgba(25,211,138,.12));transform-style:preserve-3d;transform:perspective(900px) rotateX(var(--rx)) rotateY(var(--ry));transition:transform .18s ease-out,box-shadow .3s,border-color .3s}.card.rv{transition:opacity .7s ease,transform .18s ease-out,box-shadow .3s,border-color .3s}.card.rv:not(.on){transform:perspective(900px) translateY(34px)}.card:hover{border-color:rgba(25,211,138,.7);box-shadow:0 26px 50px rgba(0,0,0,.55),0 0 34px rgba(47,123,255,.35)}.card .glare{position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;transition:opacity .25s;background:radial-gradient(260px circle at var(--mx) var(--my),rgba(255,255,255,.28),transparent 60%)}.card:hover .glare{opacity:1}.card .lift{position:relative;transform:translateZ(46px);transform-style:preserve-3d}.card .ico{display:inline-grid;place-items:center;width:52px;height:52px;border-radius:15px;background:linear-gradient(135deg,var(--blue),var(--green));color:#fff;box-shadow:0 10px 22px rgba(47,123,255,.45);transform:translateZ(24px);transition:transform .25s}.card:hover .ico{transform:translateZ(44px) rotate(-6deg) scale(1.1)}.card .ico .i{width:28px;height:28px}.card h3{margin:14px 0 6px;font-size:19px;font-weight:800}.card p{margin:0;color:#b9cfe0;font-size:15px;line-height:1.45;font-weight:500}.stats .card strong{display:block;font-size:clamp(28px,3.4vw,36px);font-weight:800;background:linear-gradient(100deg,#fff,var(--blue2),var(--green));-webkit-background-clip:text;background-clip:text;color:transparent}.stats .card p{margin-top:8px}
.in-end{padding-bottom:72px;display:grid;gap:14px;justify-items:center}.in-note{margin:0;font-weight:700;color:#cfe3f3}.in-foot{margin:0;font-size:13px;color:var(--mute)}
@media (max-width:640px){.intro{--r:118px}.in-ring3d{width:100px;height:76px}.in-bridge{grid-template-columns:1fr;gap:8px}.in-bridge .wire{width:4px;height:34px;margin:0 auto}.in-bridge .wire i{width:100%;height:40%;top:-40%;left:0;animation-name:in-flowv}@keyframes in-flowv{to{top:100%}}}@media (max-height:640px){.in-pills,.in-scroll{display:none}}
@media (prefers-reduced-motion:reduce){.intro *,.intro{animation:none!important;transition:none!important;scroll-behavior:auto}.in-lid.top{transform:translateY(-101px)}.in-lid.bot{transform:translateY(101px)}.in-bubble{opacity:1}.rv,.card.rv:not(.on){opacity:1;transform:none}.in-ring3d{transform:rotateX(-8deg) rotateY(-20deg)}}
`;
