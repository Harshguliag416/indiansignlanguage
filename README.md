# ISL Bridge 🤟

> **Indian Sign Language recognition** — Real-time webcam detection + static image upload, powered by TensorFlow and MediaPipe. Built for Google Solution Challenge 2026.

[![Backend – Render](https://img.shields.io/badge/Backend-Render-46E3B7?logo=render)](https://render.com)
[![Frontend – Vercel](https://img.shields.io/badge/Frontend-Vercel-000?logo=vercel)](https://vercel.com)

---

## 🚀 Live Demo

| Service | URL |
|---|---|
| Frontend | *Deploy to Vercel (see below)* |
| Backend API | *Deploy to Render (see below)* |

---

## 🏗️ Project Structure

```
isl-bridge/
├── backend/                  ← Flask API (Python)
│   ├── app.py                  Main server
│   ├── requirements.txt        Python dependencies
│   ├── Procfile                gunicorn start command
│   └── model/                  Legacy landmark model
├── frontend/                 ← React/Vite (JavaScript)
│   ├── src/App.jsx             Full UI with 4 modes
│   └── vercel.json             SPA routing
├── model_outputs/            ← Trained TF image models (A–Z)
│   └── alnum_deadline_10h_20260321_020023/
│       ├── model.keras         Primary model (~15 MB)
│       └── label_map.json      Index → letter
└── render.yaml               ← Render auto-deploy config
```

---

## ✨ Features

| Feature | Status |
|---|---|
| A–Z alphabet recognition | ✅ |
| Real-time webcam (MediaPipe landmarks) | ✅ |
| Static image file upload | ✅ |
| Speech-to-text (Web Speech API) | ✅ |
| Sign-to-speech (TTS) | ✅ |
| Hindi / English UI | ✅ |
| REST API (JSON + multipart) | ✅ |

---

## ⚙️ API Reference

### POST `/predict`

Accepts **either**:

**Option A — File upload (multipart/form-data):**
```bash
curl -X POST https://your-api.onrender.com/predict \
  -F "image=@hand_sign.jpg" \
  -F "target=alphabet"
```

**Option B — Base64 JSON:**
```bash
curl -X POST https://your-api.onrender.com/predict \
  -H "Content-Type: application/json" \
  -d '{"image": "data:image/jpeg;base64,...", "target": "alphabet"}'
```

**Response:**
```json
{
  "sign": "A",
  "confidence": 0.9871,
  "mode": "image_model",
  "prediction_target": "alphabet",
  "top_predictions": [
    {"label": "A", "confidence": 0.9871},
    {"label": "B", "confidence": 0.0082},
    {"label": "C", "confidence": 0.0031}
  ]
}
```

### GET `/health`
Returns model load status, supported inputs, and available signs.

---

## ☁️ Deploy on Render (Backend)

1. Fork/clone this repo
2. Go to [Render Dashboard](https://render.com) → **New Web Service**
3. Connect your GitHub repo
4. Render will auto-detect `render.yaml` — or set manually:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
5. Click **Deploy** — backend URL will be `https://your-service.onrender.com`

> ⚠️ **Free tier note**: First cold start takes ~30s (model loads into RAM). After that, predictions are fast.

---

## ☁️ Deploy on Vercel (Frontend)

1. Go to [Vercel](https://vercel.com) → **New Project**
2. Import this GitHub repo
3. Set **Root Directory** to `frontend`
4. Add environment variable:
   ```
   VITE_API_URL = https://your-service.onrender.com
   ```
5. Deploy — done!

---

## 💻 Run Locally

```bash
# Backend
cd backend
pip install -r requirements.txt
python app.py
# → http://localhost:5000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## 🧠 Model Info

- **Architecture**: CNN image classifier (TensorFlow/Keras)
- **Input**: 96×96 RGB image
- **Output**: A–Z alphabet (26 classes)
- **Size**: ~15 MB (fine to deploy on free tier)
- **Training dataset**: Custom ISL alphabet dataset

---

## 👨‍💻 Team ALPHA — Google Solution Challenge 2026
