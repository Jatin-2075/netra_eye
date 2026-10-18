# Netra Voice verification report

Run on 18 October 2026 in a Linux sandbox from a clean `npm ci`.

## Passed

- `npm run typecheck` (tsc -b): no errors.
- `npm run lint` (oxlint src): clean.
- `npm test`: 7 files, 42 tests passed. Covers the gaze state machine, eye keyboard, Talk screen (presets, typing, speak), blink alerts, Room screen (lamp, fan, All off), webhook commands (success, HTTP error, no-cors fallback, unreachable, missing URL, mixed content check) and the urgent alert (shown, spoken, cancelled).
- `npm run build`: production bundle builds.
- Headless Chromium against `vite preview` with a fake camera and microphone: the page loads, the MediaPipe face model and WASM initialise, "Camera live" shows, fonts load from the bundle, the service worker registers, Help raises the alert and speaks, Escape cancels it, Lamp and Fan toggle and speak, All off appears, no page errors.

## Not verified

- Real face and gaze accuracy (the fake camera has no face), glasses, dim light and phones.
- Real speech recognition (needs a microphone and a browser's cloud service) and a Hindi voice on the demo device.
- Real lamp or fan hardware, a real webhook, and the optional AI backend (not included in this upload).
- Real users.

## Safety notes

- Blink and Help alerts are an experimental interaction. They speak, beep and show a banner, and send a request only when an AI backend is configured. They do not call or notify anyone by themselves.
- Camera video stays in the browser. In Chrome, speech recognition sends audio to Google.
