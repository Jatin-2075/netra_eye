# Netra Voice — FastAPI + SQLite backend

This replaces the TypeScript/Express backend with Python FastAPI and SQLite. It includes patient-scoped data, conversation/question-to-answer learning, rule-first reply suggestions, optional Gemini replies, keyboard layouts/predictions, quick phrases, device toggles and ESP32 polling, emergency alerts, caregiver insights, data export and history deletion.

## Run locally

Python 3.10+ recommended.

```bash
python -m venv .venv
# Windows PowerShell
.venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env  # Windows; on macOS/Linux: cp .env.example .env
uvicorn netra_backend.main:app --reload --port 8000
```

Open http://localhost:8000/docs and http://localhost:8000/api/health. SQLite file is created at `netra_backend/data/netra.db` by default. Set `GEMINI_API_KEY` in the backend environment to enable the optional Gemini endpoint `/api/ai/reply`. The main `/api/questions` endpoint always works with rule-based fallback. Do not expose API keys in `VITE_*` variables.

## Frontend connection

Set `VITE_AI_API_URL=http://localhost:8000` in the frontend `.env.local` if it uses a configurable API base URL. If frontend code expects `/api/...` on the same origin, configure Vite proxy:

```ts
server: { proxy: { '/api': 'http://localhost:8000' } }
```

For multiple patient profiles, send `x-patient-id: 2`. Optional API authentication uses `x-api-key` when `API_KEY` is set. Camera access still needs HTTPS on phones; the backend does not receive video.

## Important endpoints

- `GET /api/health`
- `GET/PATCH /api/settings`
- `POST /api/questions` — classifies question, returns ranked replies; `final:false` does not save
- `POST /api/speak` — records chosen response and learns question-answer pair
- `GET /api/suggestions`, `GET /api/qa`, `DELETE /api/qa/{id}`
- `GET /api/keyboard/layouts`, `GET /api/keyboard/layout`, `GET /api/keyboard/predict`
- `GET/POST /api/quick-phrases`, `PATCH/DELETE /api/quick-phrases/{id}`
- `GET/POST /api/devices`, `POST /api/devices/{id}/toggle`, `POST /api/devices/{id}/state`, `GET /api/devices/{id}/poll?token=...`
- `POST /api/emergency/trigger`, `GET /api/emergency/active`, acknowledge and resolve routes
- `GET /api/insights`, `GET /api/conversation`, `GET /api/export`, `DELETE /api/history?confirm=true`

## Safety and limitations

This is a prototype, not a certified medical or emergency system. Emergency requests are recorded but no caregiver is contacted unless you implement and configure a notification integration. The SSE endpoint currently provides connection/keepalive only; real-time event fanout is not yet implemented. Gemini is optional and timeout-limited; rule-based suggestions remain available when the network/model fails. Do not use real patient data without appropriate consent, security, access controls, retention and deployment review.
