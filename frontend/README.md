# Netra Voice

Speak and control your room with your eyes. Netra Voice is a browser app that lets a person who cannot speak or use their hands talk, ask for things and switch devices in their room using only an ordinary camera. *Netra* means "eye" in Hindi.

Built for Devlympics – Shunya 2026 (Google Developer Groups on Campus, NSUT), theme **Bridge the Gap**, under the directions Accessible Interface and Physical-to-Digital Connector.

## The problem and the gap

People with ALS, paralysis, stroke or cerebral palsy often keep full awareness but lose speech and hand movement. Eye-tracking communication devices exist, but they cost several lakhs of rupees, so most families cannot afford them. The person is present but cut off, and cannot even ask for water or call for help.

Netra Voice connects that person with the family, nurses and doctors around them. What separates the two sides is physical ability, cost and language, and what sits between them is an eye "joystick": a few deliberate eye movements become spoken sentences and room commands, using only a phone or laptop camera. Voice output works in English and Hindi.

## What is in the app

After a 20 second guided eye setup, the user sees one large, high-contrast screen with big tiles. Looking left or right moves the highlight, and a long blink chooses. The main menu has three tiles.

**Talk** is a single screen that combines everything about communication. Listen turns the helper's spoken question into text (speech to text) and suggests up to four replies. Below that are 15 quick phrases (Yes, No, Help, Water, Food, Toilet, Pain, Medicine, Cold, Hot, Tired, Doctor, Family, Wait, Thank you) plus any personal phrases saved by the caregiver, and each one speaks a full sentence. The eye keyboard sits on the same screen: pick a letter group (A–E, F–J, K–O, P–T, U–Z, 0–9, punctuation), then a letter, and use Space, Delete, Clear and Speak to read the typed message aloud (text to speech). Typed letters are read out as they are chosen, Space reads the finished word, and Speak reads the whole message. A physical keyboard also works in the same message box.

**Room** shows a lamp and a fan plus an All off tile. Choosing one toggles it, animates it and speaks the new state. By default this is simulated on screen. In Caregiver, Room devices, switch to webhook mode and give each device an on and off URL, and every switch also fires a real request (see Real lamp and fan below). If a command fails, the on-screen state reverts and the app says so.

**Caregiver** shows camera, last-spoken and device status, and lets a helper add personal phrases that are saved on that device and appear on the Talk screen.

Around the screens there is a live gaze gauge that shows what the system sees, a mirrored camera preview, a "we cannot see your face" banner, an English and Hindi language toggle (with a banner if the device has no Hindi voice), a Calm button that turns animations off, and safety alerts. Choosing Help or Pain raises a full width red alert with beeps and a loud spoken sentence repeated three times; Escape, the Cancel alert button, or a slow blink after five seconds stops it. Four quick blinks request help and six quick blinks raise an emergency banner with a spoken alert. Long select-blinks are not counted toward these alerts.

## How the eyes control it

The app reads where the eyes are relative to the user's own calibrated centre, so it behaves like a joystick and not a precise pointer. Large tiles and a dead zone make it tolerant of normal webcam errors.

| Eye action | Result |
|---|---|
| Look left or right past about 50% of your range and hold 0.5 s | Previous or next tile (wraps around) |
| Long blink, eyes closed 0.7 s (progress shows after 0.25 s) | Select the highlighted tile |
| Quick blink under 0.25 s | Ignored, so natural blinking does nothing |
| Look up or down and hold | Move to the tile above or below (Back is the bottom tile) |
| Return to centre (inside the 25% dead zone) | Needed before the next move on that axis counts |

Smoothing removes frame-to-frame jitter. Direction is ignored while the eyes are closed and for 0.35 s after they reopen, so closing the eyes never looks like "look down". Short face-tracking dropouts are tolerated so a long blink can finish. Up and down switch themselves off when the calibrated vertical range is too small to trust, while left, right and long blink keep working.

Calibration asks the user to look at a centre dot, then left, right, up and down, then close their eyes. Each step waits 1.6 s and records for 1.4 s. From this the app learns the person's own centre and range, which sign means left or right (so camera mirroring does not matter), and a blink threshold with a safety margin. It warns when sideways movement was tiny or lopsided, when up and down were too small, or when open and closed eyes looked almost the same (usually poor lighting).

### Fallbacks for testing and demo safety

| Input | Result |
|---|---|
| Arrow Left / Right, Enter or Space, Esc | Same as look left or right, select, and back |
| Click or tap a tile | Highlights it; clicking the highlighted tile selects it |
| Auto-scan button | Highlight moves by itself every 2 s; a long blink (or Enter) picks the current tile |

### Tuning values

These live in `JOYSTICK_DEFAULTS` in `src/hooks/UseJoystick.tsx` and are starting points to tune after field testing: holdMs 500, blinkMs 700, ignoreBlinkMs 250, deadZone 0.25, triggerH 0.5, triggerV 0.65, graceMs 150, settleMs 350.

## Where AI is used

The face, iris and blink detection is a pre-trained neural network (MediaPipe Face Landmarker) running on the device. Per-user calibration is plain statistics, not machine learning. Reply suggestions work in two layers. A keyword rule engine in `src/lib/replies.ts` covers 14 topics in English, Hindi and Romanised Hindi and is always available. On top of it, an optional FastAPI service in `backend/` asks Google Gemini for four short first-person replies of ten words or fewer, always including a "no" or "not now" option, and always adding "help" or "call a nurse" when the text sounds urgent. If the service is down, slow or has no key, the app silently keeps the rule-based replies, so the user is never left with nothing to choose from.

Privacy: camera video is processed on the device and never uploaded. Only text goes to the optional backend, and the Gemini key stays on the server. One caveat to state openly is that in some browsers, such as Chrome, speech recognition sends audio to the browser vendor's cloud service. Personal phrases are stored in the browser's local storage on that device.

## Run it

You need Node.js 20.19 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173 in Chrome or Edge and allow the camera. Browsers allow camera access only on HTTPS or localhost, so phone testing needs a deployed page (Vercel or Netlify) or a tunnel. Open `/?test` for the raw eye-numbers page. The face model and WASM files are bundled in `public/`, so no extra download is needed.

```bash
npm run build      # type-check and production build
npm test           # vitest: gaze state machine, keyboard logic, Talk screen, blink alerts
npm run lint
```

## Deploy (production)

The app is a static site, so the backend is not needed to go live.

```bash
npm ci
npm run build        # type-check + production bundle in dist/
npm run preview      # optional local check of the production build
```

Vercel: import the repo, the included `vercel.json` sets the build, security headers (camera and microphone allowed for the site only) and long caching for the model files. Netlify: the included `netlify.toml` does the same. Either gives you HTTPS, which phones need for the camera and microphone. Set `VITE_AI_API_URL` in the host's environment settings only if you run the optional backend; leave it unset otherwise and the app uses its built-in replies. Fonts are bundled, and after the first visit a service worker lets the app load offline (the face model is cached too), so a venue with bad Wi-Fi is fine. Speech recognition itself still needs internet in Chrome.

A "Skip setup" button on the first screen lets a helper use the keyboard or Auto-scan if the camera or face tracking is not working on the day.

## Real lamp and fan

1. Open Caregiver, then Room devices, and pick "Real devices via webhook URLs".
2. Paste an on URL and an off URL for the lamp and the fan, press the Test buttons.
3. Choosing Lamp, Fan or All off on the Room screen now fires those URLs.

Works with anything that switches on a URL: a Home Assistant webhook automation, IFTTT or Make webhooks, a Tasmota or Shelly plug (for example `http://PLUG_IP/cm?cmnd=Power%20On`), or the ESP32 relay sketch in `docs/hardware/netra-esp32-relay.ino`. Browsers refuse to call plain `http://` devices from an `https://` page, so use an https webhook, or run the app on the same computer with `npm run dev`. Many webhooks send no CORS headers; the app then sends the request without reading the reply, so it cannot confirm the device obeyed. Always check the real lamp during testing. Device URLs are stored in this browser only; treat URLs that contain secrets accordingly.

### Optional AI backend

Requires Python 3.10 or newer.

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # then set GEMINI_API_KEY on the server
uvicorn main:app --reload --port 8000
```

The frontend only talks to the backend when `VITE_AI_API_URL` is set (copy `.env.example` to `.env.local` and set it, for example to `http://localhost:8000` for local work). With it unset nothing is called. Never put the Gemini key in a `VITE_*` variable and never commit `.env`.

## Code map

| File | Job |
|---|---|
| `src/App.tsx` | Screen state (menu, talk, room, caregiver), turns joystick events into actions, page layout |
| `src/hooks/UseFaceTracker.tsx` | Opens the camera, runs MediaPipe each frame, returns raw x, y, blink |
| `src/hooks/UseJoystick.tsx` | Normalises with calibration, smoothing, hold and blink timers, emits left/right/up/down/select |
| `src/hooks/UseSpeech.tsx` | Text to speech with voice picking by language |
| `src/lib/Calibration.ts` | Calibration steps, personal ranges, blink open/closed test |
| `src/lib/devices.ts` | Lamp and fan command sender (simulated or webhook) and its settings |
| `src/lib/config.ts` | API address and per-device user id |
| `src/lib/alarm.ts` | Alert beeps |
| `src/lib/eyeKeyboard.ts` | Two-level eye keyboard groups and text edits |
| `src/lib/i18n.ts` | English and Hindi strings and the 15 quick phrases |
| `src/lib/replies.ts` | Rule-based reply suggestions |
| `src/components/` | Tile, MessageCard, CalibrationScreen, GazeGauge, GazeCursor, RoomPanel, Icon, EyeTest |
| `backend/main.py` | Optional FastAPI + Gemini reply service with fallback (not part of this upload) |

## Status and known limits

The project type-checked and built cleanly in the earlier prototype, and the gaze state machine, keyboard logic and backend fallback were verified in isolation on 17 Oct 2026. The full build and the jsdom app tests were not run in the sandbox used for the Talk screen merge, so run `npm run build` and `npm test` first on your own machine. See `TEST-REPORT.md`.

Not yet tested: live camera accuracy, a phone over HTTPS, a Hindi voice on the demo device, the Gemini call, and real users. Webcam tracking varies with light, glasses and head movement, so field-test left, right and long blink in normal light, dim light, backlight and with glasses before the demo, then tune the values above. Up and down are weaker than left and right, which is why left, right and long blink are the main controls.

Known gaps: the eye setup screen text is still English only, and real lamp and fan control depends on the hardware or webhook you connect. The blink alerts are an experimental interaction, not a certified emergency system, and they do not contact anyone automatically.

## Two-minute demo plan

Open with the problem and the cost gap, a free app and a camera against lakhs for a device. Run the live eye setup with the gaze gauge visible to the audience. Have a judge ask a question such as "Do you want some water?", pick a reply or phrase with the eyes and let it speak. Switch the lamp on and off from the Room screen, then choose Help and close on the gap: a person who could not speak now can. Keep Auto-scan, the keyboard keys and a recorded backup video ready in case the lighting or camera misbehaves, and say plainly that testing with real users is the next step.
## Full memory backend (SQLite)

The `backend/` service now includes SQLite-backed, opt-in profile consent, question/choice history, explainable personalized reply ranking, optional server-side Gemini replies, predictive phrase suggestions, caregiver insights, phrase management, help/emergency event logging, retention cleanup, and a delete-history endpoint. It keeps working with rule-based replies if Gemini is not configured.

```bash
cd backend
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
# Optional: copy .env.example to .env and set GEMINI_API_KEY in your shell/deployment environment
uvicorn main:app --reload --port 8000
```

The frontend uses `VITE_AI_API_URL` (default `http://localhost:8000`). The caregiver panel has a history-consent switch and a refreshable insight summary. History is off by default. Help and emergency events are recorded in SQLite but are **not** sent to a phone, caregiver, emergency service, or notification provider. The demo user ID is a prototype convenience, not authentication or multi-user security; do not put identifiable patient data into a public deployment until proper authentication, authorization, encryption, and operational alert delivery are implemented.

Backend test suite:

```bash
cd backend
python -m pytest -q
```
