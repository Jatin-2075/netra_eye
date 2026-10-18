import { useEffect, useMemo, useRef, useState } from "react";
import GazeGauge from "./components/GazeGauge";
import EyeTest from "./components/EyeTest";
import CalibrationScreen from "./components/CalibrationScreen";
import Intro from "./components/Intro";
import RoomPanel from "./components/RoomPanel";
import type { DeviceId } from "./components/RoomPanel";
import MessageCard from "./components/MessageCard";
import GazeCursor from "./components/GazeCursor";
import GazeRails from "./components/GazeRails";
import Tile from "./components/Tile";
import Icon from "./components/Icon";
import { useFaceTracker } from "./hooks/UseFaceTracker";
import { JOYSTICK_DEFAULTS, useJoystick } from "./hooks/UseJoystick";
import type { JoystickEvent } from "./hooks/UseJoystick";
import { useSpeech } from "./hooks/UseSpeech";
import { LANGUAGE_NAME, QUICK_PHRASES, nextLang, t } from "./lib/i18n";
import type { Lang } from "./lib/i18n";
import { suggestReplies } from "./lib/replies";
import type { Suggestion } from "./lib/replies";
import type { CalibrationData } from "./lib/Calibration";
import { KB_GROUPS, applyToMessage, keyboardItems, spokenKeyName, lastWord } from "./lib/eyeKeyboard";
import { API_BASE, API_ENABLED, getUserId } from "./lib/config";
import { DEFAULT_DEVICE_CONFIG, loadDeviceConfig, saveDeviceConfig, sendDeviceCommand } from "./lib/devices";
import type { DeviceConfig } from "./lib/devices";
import { beep } from "./lib/alarm";

type Phase = "calibrate" | "run";
type Screen = "menu" | "talk" | "room" | "caregiver";

interface Entry {
  id: string;
  icon?: string;
  label: string;
  hint?: string;
  tone?: "urgent";
  sub?: string;
  section?: "listen" | "replies" | "phrases" | "keys" | "typing" | "back";
}

const ROOM_ITEMS = ["lamp", "fan", "alloff", "back"] as const;
const URGENT_REPEATS = 3;
const URGENT_GAP_MS = 7000;
const URGENT_CANCEL_GUARD_MS = 5000;
const testMode = new URLSearchParams(window.location.search).has("test");
const SCAN_MS = 2000;

const EyeLogo = () => (
  <svg className="logo" viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <rect x="2" y="2" width="44" height="44" rx="14" fill="currentColor" opacity=".12" />
    <path d="M6 24s7-11 18-11 18 11 18 11-7 11-18 11S6 24 6 24z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    <circle className="pupil" cx="24" cy="24" r="6" fill="currentColor" />
  </svg>
);

export default function App() {
  const tracker = useFaceTracker();
  const { reading } = tracker;

  const [phase, setPhase] = useState<Phase>("calibrate");
  const [showIntro, setShowIntro] = useState(!testMode && import.meta.env.MODE !== "test");
  const [calibration, setCalibration] = useState<CalibrationData | null>(null);
  const [lang, setLang] = useState<Lang>("en");
  const [screen, setScreen] = useState<Screen>("menu");
  const [active, setActive] = useState(0);
  const [lampOn, setLampOn] = useState(false);
  const [fanOn, setFanOn] = useState(false);
  const [heard, setHeard] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [blinkNotice, setBlinkNotice] = useState("");
  const [scan, setScan] = useState(false);
  const [calm, setCalm] = useState(false);
  const [kbGroup, setKbGroup] = useState<number | null>(null);
  const [spoken, setSpoken] = useState("");
  const [flipped, setFlipped] = useState<DeviceId | null>(null);
  const [customPhrases, setCustomPhrases] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("netra-custom-phrases") || "[]") as string[]; } catch { return []; }
  });
  const [phraseDraft, setPhraseDraft] = useState("");
  const [listening, setListening] = useState(false);
  const [listenError, setListenError] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<Suggestion[] | null>(null);
  const [aiStatus, setAiStatus] = useState("");
  const [currentTurnId, setCurrentTurnId] = useState<string>("");
  const [historyEnabled, setHistoryEnabled] = useState(false);
  const [backendStatus, setBackendStatus] = useState(API_ENABLED ? "Checking backend…" : "No AI backend configured · built-in replies are used");
  const [insights, setInsights] = useState<any>(null);
  const [deviceConfig, setDeviceConfig] = useState<DeviceConfig>(() => loadDeviceConfig() ?? DEFAULT_DEVICE_CONFIG);
  const [deviceStatus, setDeviceStatus] = useState("");
  const [urgent, setUrgent] = useState("");
  const userId = useMemo(() => getUserId(), []);
  const apiBase = API_BASE;
  const recognitionRef = useRef<any>(null);
  const urgentTimers = useRef<number[]>([]);
  const urgentSince = useRef(0);
  useEffect(() => { localStorage.setItem("netra-custom-phrases", JSON.stringify(customPhrases)); }, [customPhrases]);
  useEffect(() => { saveDeviceConfig(deviceConfig); }, [deviceConfig]);
  useEffect(() => {
    if (!API_ENABLED) return;
    const controller = new AbortController();
    fetch(`${apiBase}/health`, { signal: controller.signal }).then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => setBackendStatus(`Backend online · SQLite · ${data.ai_configured ? "Gemini enabled" : "rules fallback"}`))
      .catch(() => setBackendStatus("Backend offline · local replies still work"));
    fetch(`${apiBase}/api/profile?user_id=${encodeURIComponent(userId)}`, { signal: controller.signal }).then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setHistoryEnabled(Boolean(data.history_enabled)); }).catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => () => { try { recognitionRef.current?.stop(); } catch {             } }, []);

  const startListening = () => {
    setListenError("");
    if (listening) {
      try { recognitionRef.current?.stop(); } catch {}
      setListening(false);
      return;
    }
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setListenError("Speech recognition is not supported in this browser. Try Chrome or Edge, or type the question.");
      return;
    }
    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = lang === "hi" ? "hi-IN" : "en-IN";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event: any) => {
        const text = event.results?.[0]?.[0]?.transcript;
        if (text) { setHeard(String(text)); setActive(1); } 
        setListening(false);
      };
      recognition.onerror = (event: any) => {
        const code = event.error || "unknown error";
        setListenError(
          code === "not-allowed" || code === "service-not-allowed"
            ? "Microphone access is blocked. Allow the microphone for this page, or type the question."
            : code === "no-speech"
              ? "Nothing was heard. Press Listen and try again, or type the question."
              : `Speech recognition failed (${code}). You can type instead.`,
        );
        setListening(false);
      };
      recognition.onend = () => setListening(false);
      recognitionRef.current = recognition;
      setListening(true);
      recognition.start();
    } catch {
      setListening(false);
      setListenError("Could not start the microphone. Check browser permissions and try again.");
    }
  };

  const { speak, cancel: cancelSpeech, speaking, voicesReady, hasVoice } = useSpeech(lang);

  
  const say = (text: string) => {
    setSpoken(text);
    speak(text);
  };
  
  const sayKb = (text: string) => speak(text, { lang: "en", rate: 0.95, volume: 1 });

  const ruleSuggestions = useMemo(() => suggestReplies(heard, lang), [heard, lang]);
  const suggestions = aiSuggestions ?? ruleSuggestions;
  useEffect(() => {
    setAiSuggestions(null);
    setCurrentTurnId("");
    if (!heard.trim() || !API_ENABLED) { setAiStatus(""); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const timeout = window.setTimeout(() => controller.abort(), 2000);
      try {
        const response = await fetch(`${apiBase}/api/replies`, {
          method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
          body: JSON.stringify({ text: heard, language: lang, context: [], family_names: [], user_id: userId }),
        });
        if (!response.ok) throw new Error("AI service unavailable");
        const data = await response.json();
        if (Array.isArray(data.replies) && data.replies.length) {
          setCurrentTurnId(String(data.turn_id || ""));
          setAiSuggestions(data.replies.slice(0, 4).map((text: string, i: number) => ({ id: `api-${i}`, text: String(text) })));
          setAiStatus(data.source === "gemini" ? "Gemini + personalisation service" : "Smart rules + safety checks");
        } else setAiStatus("Using built-in suggestions");
      } catch (error) {
        if ((error as Error).name !== "AbortError") setAiStatus("AI unavailable — using built-in suggestions");
      } finally {
        window.clearTimeout(timeout);
      }
    }, 450);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [heard, lang]);

  
  
  const buildTalkTop = (): Entry[] => {
    const kb = keyboardItems(null);
    const keyTile = (id: string): Entry => {
      const k = kb.find((i) => i.id === id)!;
      return { id: k.id, icon: k.icon, label: k.label, section: "keys" };
    };
    return [
      { id: "listen", icon: "mic", label: listening ? t(lang, "listening") : t(lang, "listen"), section: "listen" },
      ...(heard.trim() ? suggestions.map((s): Entry => ({ id: `reply-${s.id}`, icon: "chat", label: s.text, section: "replies" })) : []),
      ...QUICK_PHRASES.map((p): Entry => ({ id: p.id, icon: p.id, label: p.label[lang], hint: p.say[lang], tone: p.urgent ? ("urgent" as const) : undefined, section: "phrases" })),
      ...customPhrases.map((text, i): Entry => ({ id: `custom-${i}`, icon: "chat", label: text, hint: text, section: "phrases" })),
      ...kb.filter((i) => i.kind === "group").map((i): Entry => ({ id: i.id, label: i.label, section: "keys" })),
      keyTile("kb-item-speak"), keyTile("kb-item-space"), keyTile("kb-item-delete"), keyTile("kb-item-clear"),
      { id: "back", icon: "back", label: t(lang, "back"), section: "back" },
    ];
  };
  const topIndexOf = (id: string) => Math.max(0, buildTalkTop().findIndex((e) => e.id === id));

  const entries: Entry[] = (() => {
    const back: Entry = { id: "back", icon: "back", label: t(lang, "back") };
    if (screen === "talk") {
      if (kbGroup !== null) return keyboardItems(kbGroup).map((i): Entry => ({ id: i.id, icon: i.icon, label: i.label, section: "typing" }));
      return buildTalkTop();
    }
    if (screen === "caregiver") return [back];
    if (screen === "room") return ROOM_ITEMS.map((id) => (id === "back" ? back : id === "alloff" ? { id, icon: "power", label: t(lang, "allOff") } : { id, label: t(lang, id) }));
    return [
      { id: "talk", icon: "msg", label: t(lang, "menuTalk"), sub: t(lang, "menuTalkSub") },
      { id: "room", icon: "home", label: t(lang, "menuRoom"), sub: t(lang, "menuRoomSub") },
      { id: "caregiver", icon: "settings", label: "Caregiver", sub: t(lang, "menuCareSub") },
    ];
  })();

  const count = entries.length;
  const safeActive = Math.min(active, count - 1);
  const focusedId = entries[safeActive]?.id;

  const goTo = (next: Screen) => {
    setScreen(next);
    setKbGroup(null);
    setActive(0);
  };

  const setDevice = (id: DeviceId, next: boolean, announce = true) => {
    const apply = id === "lamp" ? setLampOn : setFanOn;
    apply(next);
    if (announce) say(t(lang, id === "lamp" ? (next ? "lampOn" : "lampOff") : next ? "fanOn" : "fanOff"));
    if (deviceConfig.mode === "sim") return;
    sendDeviceCommand(deviceConfig, id, next).then((r) => {
      setDeviceStatus(`${t(lang, id)} ${stateWordFor(next)}: ${r.ok ? "OK" : r.detail}`);
      if (!r.ok) {
        apply(!next);
        say(`${t(lang, id)}: ${t(lang, "deviceError")}`);
      }
    });
  };
  const stateWordFor = (on: boolean) => t(lang, on ? "on" : "off");

  const toggleDevice = (id: DeviceId) => {
    setFlipped(id);
    window.setTimeout(() => setFlipped(null), 500);
    setDevice(id, id === "lamp" ? !lampOn : !fanOn);
  };

  const allOff = () => {
    if (lampOn) setDevice("lamp", false, false);
    if (fanOn) setDevice("fan", false, false);
    say(t(lang, "allOffDone"));
  };

  const clearUrgentTimers = () => {
    urgentTimers.current.forEach((id) => window.clearTimeout(id));
    urgentTimers.current = [];
  };
  const cancelUrgent = () => {
    clearUrgentTimers();
    cancelSpeech?.();
    setUrgent("");
  };
  const raiseUrgent = (text: string) => {
    clearUrgentTimers();
    urgentSince.current = performance.now();
    setUrgent(text);
    setSpoken(text);
    const fire = () => { beep(); speak(text, { rate: 0.9, volume: 1 }); };
    fire();
    for (let n = 1; n < URGENT_REPEATS; n++) urgentTimers.current.push(window.setTimeout(fire, n * URGENT_GAP_MS));
    if (API_ENABLED) {
      fetch(`${apiBase}/api/alerts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: userId, kind: "help", message: text }) }).catch(() => {});
    }
  };
  useEffect(() => () => { urgentTimers.current.forEach((id) => window.clearTimeout(id)); }, []);

  const selectTile = (index: number) => {
    const entry = entries[index];
    if (!entry) return;

    if (urgent) {
      if (performance.now() - urgentSince.current >= URGENT_CANCEL_GUARD_MS) cancelUrgent();
      return;
    }

    if (entry.id === "back") {
      goTo("menu");
      return;
    }

    if (screen === "menu") {
      if (entry.id === "talk" || entry.id === "room" || entry.id === "caregiver") goTo(entry.id);
    } else if (screen === "talk") {
      if (entry.id === "listen") {
        if (!listening) startListening();
      } else if (entry.id.startsWith("reply-")) {
        say(entry.label);
        const position = suggestions.findIndex(s => s.text === entry.label);
        if (API_ENABLED && currentTurnId && position >= 0) fetch(`${apiBase}/api/choices`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: userId, turn_id: currentTurnId, reply_text: entry.label, reply_position: position }) }).catch(() => {});
      } else if (entry.id.startsWith("custom-")) {
        say(entry.hint ?? entry.label);
      } else if (QUICK_PHRASES.some((p) => p.id === entry.id)) {
        const phrase = QUICK_PHRASES.find((p) => p.id === entry.id)!;
        if (phrase.urgent) raiseUrgent(phrase.say[lang]);
        else say(phrase.say[lang]);
      } else {
        const item = keyboardItems(kbGroup).find((i) => i.id === entry.id);
        if (!item) return;
        if (item.kind === "group") {
          setKbGroup(item.group ?? null);
          setActive(0);
          sayKb(item.label.replace("–", " to "));
        } else if (item.action === "ungroup") {
          
          setActive(topIndexOf(`kb-item-group-${kbGroup}`));
          setKbGroup(null);
        } else if (item.action === "speak") {
          
          const msg = customMessage.trim();
          if (msg) { setSpoken(msg); sayKb(msg); }
        } else {
          const edit = applyToMessage(customMessage, item);
          if (edit !== null) setCustomMessage(edit);
          if (item.kind === "char") {
            sayKb(spokenKeyName(item.char ?? ""));
            
            setKbGroup(null);
            setActive(topIndexOf("kb-item-group-0"));
          } else if (item.action === "space") {
            const w = lastWord(customMessage);
            if (w) sayKb(w);
          } else if (item.action === "delete") {
            sayKb("delete");
          } else if (item.action === "clear") {
            sayKb("cleared");
          }
        }
      }
    } else if (entry.id === "lamp" || entry.id === "fan") {
      toggleDevice(entry.id);
    } else if (entry.id === "alloff") {
      allOff();
    }
  };

  
  
  const moveVertical = (dir: "up" | "down") => {
    const tiles = Array.from(document.querySelectorAll<HTMLElement>("[data-tile-index]"));
    const cur = tiles.find((el) => Number(el.dataset.tileIndex) === safeActive);
    if (!cur) return;
    const cr = cur.getBoundingClientRect();
    const cx = cr.left + cr.width / 2;
    const cy = cr.top + cr.height / 2;
    const found: { i: number; dy: number; dx: number }[] = [];
    for (const el of tiles) {
      if (el === cur) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const dy = dir === "down" ? r.top + r.height / 2 - cy : cy - (r.top + r.height / 2);
      if (dy > Math.min(cr.height, r.height) * 0.5) {
        found.push({ i: Number(el.dataset.tileIndex), dy, dx: Math.abs(r.left + r.width / 2 - cx) });
      }
    }
    if (!found.length) return;
    const nearest = Math.min(...found.map((f) => f.dy));
    const row = found.filter((f) => f.dy <= nearest + 24).sort((a, b) => a.dx - b.dx);
    setActive(row[0].i);
  };

  const goBack = () => {
    if (urgent) { cancelUrgent(); return; }
    if (screen === "talk" && kbGroup !== null) {
      setActive(topIndexOf(`kb-item-group-${kbGroup}`));
      setKbGroup(null);
    } else if (screen !== "menu") goTo("menu");
  };

  const handleEvent = (event: JoystickEvent) => {
    if (phase !== "run") return;
    if (event === "left") {
      setActive((i) => (Math.min(i, count - 1) - 1 + count) % count);
    } else if (event === "right") {
      setActive((i) => (Math.min(i, count - 1) + 1) % count);
    } else if (event === "up" || event === "down") {
      moveVertical(event);
    } else if (event === "back") {
      goBack();
    } else if (event === "select") {
      selectTile(safeActive);
    }
  };

  const joystick = useJoystick(
    { x: reading.x, y: reading.y, blink: reading.blink, ix: reading.ix, iy: reading.iy, faceVisible: reading.face },
    phase === "run" ? calibration : null,
    handleEvent,
  );

  
  
  const blinkCountRef = useRef(0);
  const previousClosedRef = useRef(false);
  const closedAtRef = useRef(0);
  const blinkTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (phase !== "run") {
      blinkCountRef.current = 0;
      previousClosedRef.current = joystick.closed;
      if (blinkTimerRef.current !== null) window.clearTimeout(blinkTimerRef.current);
      return;
    }
    if (!previousClosedRef.current && joystick.closed) closedAtRef.current = performance.now();
    
    
    const wasLong = performance.now() - closedAtRef.current >= JOYSTICK_DEFAULTS.blinkMs;
    if (previousClosedRef.current && !joystick.closed && !wasLong) {
      blinkCountRef.current += 1;
      if (blinkTimerRef.current !== null) window.clearTimeout(blinkTimerRef.current);
      blinkTimerRef.current = window.setTimeout(() => {
        const n = blinkCountRef.current;
        blinkCountRef.current = 0;
        if (n >= 6) {
          setBlinkNotice("🚨 ALERT: 6 blinks detected. Please check on the user immediately.");
          if (API_ENABLED) fetch(`${apiBase}/api/alerts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: userId, kind: "emergency", message: "Six quick blinks detected. Please check on the user immediately." }) }).catch(() => {});
          speak(lang === "hi" ? "आपातकालीन चेतावनी। कृपया तुरंत मदद करें।" : "Emergency alert. Please check on me immediately.");
        } else if (n >= 4) {
          setBlinkNotice("🆘 HELP requested — 4 blinks detected.");
          if (API_ENABLED) fetch(`${apiBase}/api/alerts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: userId, kind: "help", message: "Four quick blinks: help requested." }) }).catch(() => {});
          speak(lang === "hi" ? "मुझे मदद चाहिए। कृपया मेरी मदद करें।" : "I need help. Please help me.");
        }
        if (n >= 4) window.setTimeout(() => setBlinkNotice(""), 10000);
      }, 1300);
    }
    previousClosedRef.current = joystick.closed;
  }, [joystick.closed, phase, lang, speak]);

  useEffect(() => () => {
    if (blinkTimerRef.current !== null) window.clearTimeout(blinkTimerRef.current);
  }, []);

  const emergency = blinkNotice.startsWith("🚨");
  useEffect(() => {
    document.body.classList.toggle("is-urgent", emergency);
    return () => document.body.classList.remove("is-urgent");
  }, [emergency]);

  
  const countRef = useRef(count);
  const closedRef = useRef(false);
  useEffect(() => {
    countRef.current = count;
    closedRef.current = joystick.closed;
  });

  useEffect(() => {
    if (!scan || phase !== "run") return;
    const id = window.setInterval(() => {
      
      if (closedRef.current) return;
      setActive((i) => (Math.min(i, countRef.current - 1) + 1) % countRef.current);
    }, SCAN_MS);
    return () => window.clearInterval(id);
    
  }, [scan, phase, screen, active]);

  if (testMode) {
    return (
      <div style={{ minHeight: "100vh", background: "#12202d", color: "#eef2f6" }}>
        <EyeTest
          videoRef={tracker.videoRef}
          x={reading.x}
          y={reading.y}
          blink={reading.blink}
          ready={tracker.status === "running"}
          face={reading.face}
          error={tracker.error}
        />
      </div>
    );
  }

  if (showIntro) {
    return <Intro lang={lang} onDone={() => setShowIntro(false)} />;
  }

  const finishCalibration = (data: CalibrationData) => {
    setCalibration(data);
    goTo("menu");
    setPhase("run");
  };

  const faceLost = phase === "run" && tracker.status === "running" && !reading.face;
  const noHindiVoice = lang === "hi" && voicesReady && !hasVoice;
  const roomActiveId: DeviceId | null = focusedId === "lamp" || focusedId === "fan" ? focusedId : null;

  const gazeLabels = {
    left: t(lang, "gazeLeft"),
    right: t(lang, "gazeRight"),
    up: t(lang, "gazeUp"),
    down: t(lang, "gazeDown"),
    center: t(lang, "gazeCenter"),
    closed: t(lang, "eyesClosed"),
  };
  const gazeWord = joystick.closed
    ? gazeLabels.closed
    : joystick.direction
      ? gazeLabels[joystick.direction]
      : gazeLabels.center;

  const stateWord = (on: boolean) => t(lang, on ? "on" : "off");

  const lastEvent = joystick.lastEvent;
  const lastInputLabel = !lastEvent
    ? t(lang, "inputNone")
    : lastEvent.type === "select"
      ? t(lang, "inputSelect")
      : lastEvent.type === "back"
        ? t(lang, "back")
        : t(lang, ({ left: "gazeLeft", right: "gazeRight", up: "gazeUp", down: "gazeDown" } as const)[lastEvent.type]);

  const common = { focused: false, progress: joystick.blinkProgress };
  const tileAt = (i: number, className: string) => {
    const e = entries[i];
    return (
      <Tile
        key={e.id}
        testId={`tile-${e.id}`}
        label={e.label}
        icon={e.icon}
        sub={e.sub}
        index={i}
        className={`${className} t-${e.id}${e.tone === "urgent" ? " urgent" : ""}`}
        {...common}
        focused={i === safeActive}
        speaking={speaking && spoken === (e.hint ?? e.label) && screen !== "menu" && i === safeActive}
        onClick={() => (i === safeActive ? selectTile(i) : setActive(i))}
      />
    );
  };
  const backTile = () => <div className="backrow">{tileAt(count - 1, "backtile")}</div>;

  const subtitle: Record<Screen, string> = {
    menu: t(lang, "tagline"),
    talk: t(lang, "menuTalk"),
    room: t(lang, "menuRoom"),
    caregiver: "Caregiver dashboard",
  };

  return (
    <div className={`app${calm ? " calm" : ""}`}>
      {tracker.status === "error" && (
        <div className="fatal" role="alert">
          <div className="fatal-card">
            <h1>Camera or face model problem</h1>
            <p>{tracker.error}</p>
            <p>Allow camera access for this page, close other apps that use the camera, then reload.</p>
            <button type="button" className="btn" onClick={() => window.location.reload()}>Reload</button>
          </div>
        </div>
      )}

      {phase === "calibrate" && (
        <div className="app-overlay">
          <CalibrationScreen
            x={reading.x}
            y={reading.y}
            blink={reading.blink}
            ix={reading.ix}
            iy={reading.iy}
            faceVisible={reading.face}
            onComplete={finishCalibration}
          />
          <button
            type="button"
            className="btn skip-setup"
            onClick={() => { goTo("menu"); setPhase("run"); }}
          >
            {t(lang, "skipSetup")}
          </button>
        </div>
      )}

      <header className="top">
        <div className="in topin">
          <div className="brand">
            <EyeLogo />
            <div>
              <b>{t(lang, "appName")}</b>
              <small>{t(lang, "tagline")}</small>
            </div>
          </div>
          <div className="chips">
            <span className={`chip${tracker.status === "running" ? " ok" : " warn"}`}><i />{tracker.status === "running" ? "Camera live" : "Camera starting"}</span>
            {phase === "run" && <span className={`chip${reading.face ? " ok" : " warn"}`}><i />{reading.face ? "Face found" : "No face"}</span>}
            {phase === "run" && <span className="chip ok"><i />Calibrated</span>}
          </div>
          <div className="tools">
            <button type="button" className="btn" onClick={(e) => { e.currentTarget.blur(); setLang(nextLang(lang)); }}>
              {LANGUAGE_NAME[nextLang(lang)]}
            </button>
            {phase === "run" && (
              <button type="button" className="btn" aria-pressed={scan} onClick={(e) => { e.currentTarget.blur(); setScan((v) => !v); }}>
                {t(lang, "autoScan")}: {stateWord(scan)}
              </button>
            )}
            <button type="button" className="btn" aria-pressed={calm} onClick={(e) => { e.currentTarget.blur(); setCalm((v) => !v); }}>
              Calm
            </button>
            {phase === "run" && (
              <button type="button" className="btn" onClick={(e) => { e.currentTarget.blur(); setPhase("calibrate"); }}>
                {t(lang, "recalibrate")}
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="in banners">
        {faceLost && <div className="banner warn"><span className="pulse" />{t(lang, "faceLost")}</div>}
        {noHindiVoice && (
          <div className="banner warn">
            No Hindi voice is installed on this device. Phrases still show on screen but may not be spoken.
          </div>
        )}
        {blinkNotice && (
          <div className={`banner alert${emergency ? " emergency" : ""}`} role="alert">
            <strong className="grow">{blinkNotice}</strong>
            <button type="button" onClick={() => setBlinkNotice("")}>Dismiss</button>
          </div>
        )}
      </div>

      {phase === "run" && urgent && (
        <div className="in">
          <div className="urgent-overlay" role="alert" data-testid="urgent-overlay">
            <div className="grow">
              <h2>{t(lang, "urgentTitle")}</h2>
              <p>{urgent}</p>
              <p>{t(lang, "urgentHint")}</p>
            </div>
            <button type="button" onClick={cancelUrgent}>{t(lang, "cancelAlert")}</button>
          </div>
        </div>
      )}

      {phase === "run" && (
        <main className="in">
          {!(screen === "talk" && kbGroup !== null) && (
            <section className={`speech${speaking ? " speaking" : ""}`} aria-label="Speech">
              <span className="sp-ico" aria-hidden="true"><Icon name="speaker" /></span>
              <div className="sp-body">
                <div className="sp-lab">{speaking ? t(lang, "speaking") : "Last spoken"}</div>
                <div className={`sp-text${spoken ? "" : " ph"}`}>{spoken || t(lang, "hintSelect")}</div>
              </div>
              <span className="bars" aria-hidden="true"><i /><i /><i /><i /><i /></span>
            </section>
          )}

          <div className="screen" key={screen}>
          <div className="shead">
            <div className="stitle">
              <h1>{subtitle[screen]}</h1>
              <ul className="howto">
                <li><Icon name="eye" />{t(lang, "hintMove")}</li>
                <li><Icon name="yes" />{t(lang, "hintSelect")}</li>
                {screen !== "menu" && <li><Icon name="back" />{t(lang, "hintBack")}</li>}
              </ul>
            </div>
          </div>

          {screen === "menu" && (
            <div className="grid menu-grid" role="listbox" aria-label={t(lang, "hintMove")}>
              {entries.map((_, i) => tileAt(i, "mcard"))}
            </div>
          )}

          {screen === "talk" && (
            <div data-testid="talk-screen">
              {kbGroup === null ? (
                <>
                  <label className="sec-lab" htmlFor="heard-in">{t(lang, "heardLabel")}</label>
                  <input
                    id="heard-in"
                    className="msgin"
                    style={{ marginBottom: 12 }}
                    type="text"
                    value={heard}
                    placeholder={t(lang, "heardPlaceholder")}
                    onKeyDown={(e) => {
                      
                      if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
                    }}
                    onChange={(e) => {
                      setHeard(e.target.value);
                      setActive(0);
                    }}
                  />
                  {listenError && <div className="banner warn" role="status">{listenError}</div>}
                  {aiStatus && <div className="banner" role="status">{aiStatus}</div>}
                  <div className="grid grid-talk-top" role="listbox" aria-label={t(lang, "menuTalk")}>
                    {entries.map((e, i) => (e.section === "listen" || e.section === "replies" ? tileAt(i, e.section === "listen" ? "ltile" : "rtile") : null))}
                  </div>
                  <MessageCard message={customMessage} speaking={speaking} label={t(lang, "yourMessage")} onTypedText={setCustomMessage} />
                  <div className="grid grid-ph" role="listbox" aria-label={t(lang, "menuPhrases")}>
                    {entries.map((e, i) => (e.section === "phrases" ? tileAt(i, "ptile") : null))}
                  </div>
                  <p className="kbhint">Type with your eyes. Pick a letter group, then a letter, then Speak.</p>
                  <div className="kbgrid" role="listbox" aria-label="Eye keyboard">
                    {entries.map((e, i) => (e.section === "keys" ? tileAt(i, `key ${e.id.includes("group") ? "grp" : "act"}${e.id.includes("speak") ? " speak" : ""}${e.id.includes("delete") ? " del" : ""}`) : null))}
                  </div>
                  {backTile()}
                </>
              ) : (
                <>
                  <MessageCard message={customMessage} speaking={speaking} label={t(lang, "yourMessage")} onTypedText={setCustomMessage} />
                  <p className="kbhint">{`Group ${KB_GROUPS[kbGroup].label}. Look around to move, blink slowly to type.`}</p>
                  <div className="kbgrid" role="listbox" aria-label="Eye keyboard">
                    {entries.map((e, i) => tileAt(i, `key${e.id.includes("ungroup") ? " act" : ""}`))}
                  </div>
                </>
              )}
            </div>
          )}

          {screen === "room" && (
            <>
              <div className={flipped ? "flipwrap" : undefined}>
                <RoomPanel
                  lang={lang}
                  lampOn={lampOn}
                  fanOn={fanOn}
                  activeId={roomActiveId}
                  progress={joystick.blinkProgress}
                  onToggle={(id) => { const i = entries.findIndex((e) => e.id === id); if (i === safeActive) toggleDevice(id); else setActive(i); }}
                />
              </div>
              <div className="alltile">{tileAt(2, "ptile")}</div>
              {backTile()}
            </>
          )}

          {screen === "caregiver" && (
            <section className="caregiver-panel" style={{ display: "grid", gap: 16 }}>
              <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
                <div className="speech"><div><b>Camera</b><p>{reading.face ? "Face detected" : "Face not detected"}</p></div></div>
                <div className="speech"><div><b>Last spoken</b><p>{spoken || "Nothing spoken yet"}</p></div></div>
                <div className="speech"><div><b>Room devices</b><p>Lamp {lampOn ? "ON" : "OFF"} · Fan {fanOn ? "ON" : "OFF"}</p></div></div>
              </div>
              <h2>Memory & AI personalisation</h2>
              <p>{backendStatus}. Camera video stays in this browser. History is optional; only text and selected replies are stored when enabled.</p>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: 12, border: "1px solid var(--line, #ccd5dc)", borderRadius: 12 }}>
                <input aria-label="Enable conversation history" type="checkbox" checked={historyEnabled} onChange={async e => {
                  const enabled = e.target.checked;
                  setHistoryEnabled(enabled);
                  try {
                    const r = await fetch(`${apiBase}/api/profile?user_id=${encodeURIComponent(userId)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: lang, history_enabled: enabled, family_names: {}, personal_facts: [] }) });
                    if (!r.ok) throw new Error();
                    if (enabled) setAiStatus("Personal memory enabled"); else { setCurrentTurnId(""); setAiStatus("History erased and disabled"); }
                  } catch { setHistoryEnabled(!enabled); setBackendStatus("Backend offline · history setting not saved"); }
                }} />
                <span><b>Allow history-based suggestions</b><br/><small>Off by default. Turning it off erases stored turns and choices for this demo profile.</small></span>
              </label>
              <button className="btn" type="button" onClick={async () => { try { const r = await fetch(`${apiBase}/api/insights?user_id=${encodeURIComponent(userId)}`); if (!r.ok) throw new Error(); setInsights(await r.json()); } catch { setInsights({ message: "Backend unavailable. Start the API to view caregiver insights." }); } }}>Refresh caregiver insights</button>
              {insights && <div className="speech"><b>Daily overview</b><p>{insights.message || `${insights.turns_today ?? 0} helper questions · ${insights.choices_today ?? 0} selected replies · ${insights.urgent_today ?? 0} urgent topics today.`}</p>{insights.top_phrases?.length > 0 && <p>Frequently selected: {insights.top_phrases.map((x: any) => `${x.text} (${x.use_count})`).join(" · ")}</p>}{insights.note && <small>{insights.note}</small>}</div>}
              <h2>Room devices (lamp and fan)</h2>
              <p>Simulated mode only animates the screen. Webhook mode also calls your own URLs when the lamp or fan is switched, so a smart plug, relay or Home Assistant can really turn them on and off.</p>
              <div className="dev-settings">
                <div className="row">
                  <label>Mode
                    <select className="msgin" aria-label="Device mode" value={deviceConfig.mode} onChange={(e) => setDeviceConfig((c) => ({ ...c, mode: e.target.value === "webhook" ? "webhook" : "sim" }))}>
                      <option value="sim">Simulated on screen</option>
                      <option value="webhook">Real devices via webhook URLs</option>
                    </select>
                  </label>
                  <label>Request method
                    <select className="msgin" aria-label="Request method" value={deviceConfig.method} onChange={(e) => setDeviceConfig((c) => ({ ...c, method: e.target.value === "POST" ? "POST" : "GET" }))}>
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                    </select>
                  </label>
                </div>
                {deviceConfig.mode === "webhook" && (["lamp", "fan"] as const).map((id) => (
                  <div className="row" key={id}>
                    {(["on", "off"] as const).map((state) => (
                      <label key={state}>{t(lang, id)} {state.toUpperCase()} URL
                        <input className="msgin" type="url" inputMode="url" aria-label={`${id} ${state} URL`} placeholder="https://…" value={deviceConfig[id][state]}
                          onChange={(e) => { const v = e.target.value; setDeviceConfig((c) => ({ ...c, [id]: { ...c[id], [state]: v } })); }} />
                      </label>
                    ))}
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {(["lamp", "fan"] as const).flatMap((id) => (["on", "off"] as const).map((state) => (
                    <button key={`${id}-${state}`} type="button" className="btn" onClick={async () => {
                      const r = await sendDeviceCommand(deviceConfig, id, state === "on");
                      setDeviceStatus(`Test ${t(lang, id)} ${state}: ${r.ok ? "OK (" + r.detail + ")" : r.detail}`);
                    }}>Test {t(lang, id)} {state}</button>
                  )))}
                </div>
                {deviceStatus && <div className="dev-status" role="status">{deviceStatus}</div>}
                <small>Plain http devices on your home network cannot be called from an https page. Use an https webhook (Home Assistant, IFTTT, Make, Blynk), or run the app on the same computer. Settings stay in this browser.</small>
              </div>
              <h2>Personal phrases</h2>
              <p>Add frequently used messages. They are saved on this device only.</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input className="msgin" aria-label="New personal phrase" value={phraseDraft} onChange={e => setPhraseDraft(e.target.value)} placeholder="e.g. Please call my daughter" onKeyDown={e => { if (e.key === "Enter") { const v=phraseDraft.trim(); if(v){setCustomPhrases(old=>[...old,v].slice(-30));setPhraseDraft("");} } }} />
                <button className="btn" type="button" onClick={() => { const v=phraseDraft.trim(); if(v){setCustomPhrases(old=>[...old,v].slice(-30));setPhraseDraft("");} }}>Add phrase</button>
              </div>
              {customPhrases.length === 0 ? <p>No personal phrases saved yet.</p> : <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8 }}>{customPhrases.map((phrase, i) => <div className="speech" key={`${phrase}-${i}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}><span>{phrase}</span><button className="btn" type="button" onClick={() => say(phrase)}>Speak</button><button className="btn" type="button" aria-label={`Delete ${phrase}`} onClick={() => setCustomPhrases(old=>old.filter((_,j)=>j!==i))}>Delete</button></div>)}</div>}
              <p style={{ fontSize: 13, opacity: .8 }}>Privacy: saved phrases stay in this browser's local storage. Browser speech recognition may send audio to the browser provider's service.</p>
            </section>
          )}

          </div>
        </main>
      )}

      <GazeRails
        nx={joystick.nx}
        ny={joystick.ny}
        direction={joystick.direction}
        holdProgress={joystick.holdProgress}
        closed={joystick.closed}
        hidden={phase !== "run"}
      />

      <GazeCursor
        watch={`${screen}|${kbGroup}|${safeActive}|${count}|${urgent ? 1 : 0}`}
        holding={joystick.direction !== null}
        selecting={joystick.blinkProgress >= 1}
        hidden={phase !== "run"}
      />

      <footer className="dock">
        <div className="in dockin">
          <div className="gaugebox">
            <GazeGauge
              x={joystick.nx}
              y={-joystick.ny}
              eyesClosed={joystick.closed}
              direction={joystick.direction}
              holdProgress={joystick.holdProgress}
              deadZone={JOYSTICK_DEFAULTS.deadZone}
              triggerZone={JOYSTICK_DEFAULTS.triggerH}
              labels={gazeLabels}
              size={92}
              showLabel={false}
            />
          </div>
          <div>
            <div className="dlabel">{t(lang, "lastInput")}: {lastInputLabel}</div>
            <div className="dname">{gazeWord}</div>
            <div className={`dmsg${joystick.blinkProgress >= 1 ? " ok" : ""}`}>
              {joystick.blinkProgress >= 1 ? t(lang, "inputSelect") + " ✓" : t(lang, "hintSelect")}
            </div>
            <div className="selbar" aria-hidden="true"><b style={{ width: `${joystick.blinkProgress * 100}%` }} /></div>
          </div>
          <div className="dockside">
            <div className="devchips">
              <span className={lampOn ? "on" : undefined}><Icon name="lamp" />{t(lang, "lamp")}: {stateWord(lampOn)}</span>
              <span className={fanOn ? "on" : undefined}><Icon name="fan" />{t(lang, "fan")}: {stateWord(fanOn)}</span>
            </div>
            <div className="camwrap">
              <video ref={tracker.videoRef} className="app-video" autoPlay playsInline muted />
              <span className={`camtag${reading.face ? "" : " bad"}`}><i />{reading.face ? "Live" : "No face"}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
