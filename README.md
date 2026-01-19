# CardioMate AI - ECG Interpretation Platform

Minimal working prototype:

- Upload ECG **CSV** or **JSON**
- Backend preprocesses signal (basic smoothing + heuristic R-peak/HR estimate)
- Backend calls **CardioMate AI** (or **mock** if no API key)
- Frontend shows **structured report** + waveform preview

## Project layout

- `backend/`: Node.js + TypeScript + Express
- `frontend/`: React + Vite + TypeScript

## Run locally

### Backend

```bash
cd backend
cp env.example .env 2>/dev/null || true
npm install
npm run dev
```

Backend runs on `http://localhost:4000`.

Optional: set `GEMINI_API_KEY` in `backend/.env` to enable real Gemini calls.

### Frontend

```bash
cd frontend
cp env.example .env 2>/dev/null || true
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Try with example ECG files

- `backend/examples/ecg_example.csv` (upload as CSV, set sample rate to 250Hz)
- `backend/examples/ecg_example.json` (includes `sampleRateHz`)

## API

- `POST /ecg/upload` (multipart form-data field `file`; optional query `sampleRateHz`)
- `GET /ecg/:id`


