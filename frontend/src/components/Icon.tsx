
const PATHS: Record<string, string> = {
 "yes": "<path d=\"M5 12.5l4.5 4.5L19 7.5\"/>",
 "no": "<path d=\"M6 6l12 12M18 6L6 18\"/>",
 "help": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><circle cx=\"12\" cy=\"12\" r=\"3.8\"/><path d=\"M5.6 5.6l3.7 3.7M14.7 14.7l3.7 3.7M18.4 5.6l-3.7 3.7M9.3 14.7l-3.7 3.7\"/>",
 "water": "<path d=\"M12 3.5s6 6.2 6 10.3a6 6 0 01-12 0C6 9.7 12 3.5 12 3.5z\"/>",
 "food": "<path d=\"M6 3v5a3 3 0 006 0V3M9 11v10M17 21V3c-2.2 1.2-3.5 3.7-3.5 7H17\"/>",
 "toilet": "<path d=\"M7 3h10v6H7zM5 9h14c0 4-2 7-7 7s-7-3-7-7zM9 21h6M12 16v5\"/>",
 "pain": "<path d=\"M13 3L5 13.5h6L10 21l9-11.5h-6.5L13 3z\"/>",
 "medicine": "<path d=\"M10.5 20.5a4.95 4.95 0 01-7-7l10-10a4.95 4.95 0 017 7l-10 10zM8.5 8.5l7 7\"/>",
 "cold": "<path d=\"M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8L20.2 7.2M9.5 4.5L12 6.5l2.5-2M9.5 19.5L12 17.5l2.5 2\"/>",
 "hot": "<circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1\"/>",
 "tired": "<path d=\"M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z\"/>",
 "doctor": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 8v8M8 12h8\"/>",
 "family": "<circle cx=\"9\" cy=\"8\" r=\"3\"/><path d=\"M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6\"/><circle cx=\"17\" cy=\"9\" r=\"2.5\"/><path d=\"M17 14c2.5.3 4.5 2.4 4.5 5.5\"/>",
 "wait": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3.2 2\"/>",
 "thanks": "<path d=\"M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0112 7.5 4.3 4.3 0 0119.5 10c0 5.4-7.5 10-7.5 10z\"/>",
 "msg": "<path d=\"M4 5h16v11H9l-5 4V5z\"/>",
 "spark": "<path d=\"M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z\"/>",
 "kbd": "<path d=\"M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M19 10h.01M7 14h10\"/>",
 "home": "<path d=\"M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6\"/>",
 "lamp": "<path d=\"M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z\"/>",
 "fan": "<circle cx=\"12\" cy=\"12\" r=\"1.7\"/><path d=\"M12 10.3C11 6 12 3 14.5 3c2.3 0 2.6 3.6-2.5 7.3zM13.7 12c4.3-1 7.3 0 7.3 2.5 0 2.3-3.6 2.6-7.3-2.5zM12 13.7C13 18 12 21 9.5 21c-2.3 0-2.6-3.6 2.5-7.3zM10.3 12C6 13 3 12 3 9.5 3 7.2 6.6 6.9 10.3 12z\"/>",
 "settings": "<path d=\"M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6\"/>",
 "back": "<path d=\"M19 12H5M11 6l-6 6 6 6\"/>",
 "next": "<path d=\"M5 12h14M13 6l6 6-6 6\"/>",
 "up": "<path d=\"M12 19V5M6 11l6-6 6 6\"/>",
 "down": "<path d=\"M12 5v14M6 13l6 6 6-6\"/>",
 "eye": "<path d=\"M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>",
 "eyeoff": "<path d=\"M3 3l18 18M10.6 5.2A9.5 9.5 0 0112 5c6 0 10 7 10 7a17 17 0 01-3.2 4M6.3 6.6A17 17 0 002 12s4 7 10 7a9.6 9.6 0 004-.9M9.9 9.9a3 3 0 004.2 4.2\"/>",
 "camera": "<path d=\"M3 8h4l2-3h6l2 3h4v11H3zM12 17a3.5 3.5 0 100-7 3.5 3.5 0 000 7z\"/>",
 "camoff": "<path d=\"M3 3l18 18M7 8H3v11h13M9.5 5h5L17 8h4v9\"/>",
 "globe": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18\"/>",
 "speaker": "<path d=\"M4 9h4l5-4v14l-5-4H4zM16.5 9a4 4 0 010 6M19 6.5a8 8 0 010 11\"/>",
 "bell": "<path d=\"M6 17V11a6 6 0 1112 0v6l1.5 2h-15zM10 21h4\"/>",
 "plus": "<path d=\"M12 5v14M5 12h14\"/>",
 "user": "<circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8\"/>",
 "phone": "<path d=\"M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A15 15 0 013 6a2 2 0 012-2z\"/>",
 "bookmark": "<path d=\"M6 3h12v18l-6-4-6 4z\"/>",
 "backspace": "<path d=\"M9 5h11v14H9L3 12zM13 9l5 6M18 9l-5 6\"/>",
 "trash": "<path d=\"M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13\"/>",
 "alert": "<path d=\"M12 3l10 18H2zM12 10v5M12 18h.01\"/>",
 "scan": "<path d=\"M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3M4 12h16\"/>",
 "touch": "<path d=\"M9 11V5a1.5 1.5 0 013 0v5M12 10V8a1.5 1.5 0 013 0v3M15 11V9.5a1.5 1.5 0 013 0V15c0 4-2.5 6-6 6-3 0-4.5-1.5-6-4l-2-3.5a1.5 1.5 0 012.5-1.5L9 14\"/>",
 "contrast": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 3a9 9 0 010 18z\" fill=\"currentColor\"/>",
 "expand": "<path d=\"M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5\"/>",
 "pause": "<path d=\"M8 5v14M16 5v14\"/>",
 "moon": "<path d=\"M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z\"/>",
 "grid": "<path d=\"M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z\"/>",
 "dashboard": "<path d=\"M4 5h16v14H4zM4 10h16M9 10v9\"/>",
 "chat": "<path d=\"M4 5h16v11H9l-5 4V5z\"/>",
 "power": "<path d=\"M12 3v9M6.3 6.8a8 8 0 1011.4 0\"/>",
 "mic": "<path d=\"M12 3a3 3 0 013 3v6a3 3 0 01-6 0V6a3 3 0 013-3zM5.5 11a6.5 6.5 0 0013 0M12 18v3\"/>"
};

export type IconName = keyof typeof PATHS | (string & {});

export default function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return (
    <svg
      className={`i ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: PATHS[name] ?? "" }}
    />
  );
}
