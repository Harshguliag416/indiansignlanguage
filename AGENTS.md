# ISL Bridge — AI Coding Agent Context

## Project Overview
**ISL Bridge** is an AI-powered accessibility application for **Indian Sign Language (ISL)** recognition.
It uses a TensorFlow/Keras computer-vision model to detect ISL alphabet hand gestures in real-time via webcam,
translates them to text, and uses an LLM (Ollama) as a "Brain" to enhance isolated letters into grammatically
fluent sentences. Designed for the Google Solution Challenge 2026.

---

## Tech Stack

| Layer        | Technology                                         |
|--------------|----------------------------------------------------|
| ML Model     | TensorFlow / Keras (`.h5` / `.keras`)              |
| CV Pipeline  | MediaPipe (hand landmark detection)                |
| Backend API  | Python + Flask (`backend/app.py`)                  |
| Frontend     | React Native / Expo (mobile app)                   |
| LLM Brain    | Ollama (local LLM for sentence enhancement)        |
| Deployment   | Vercel (frontend), local Flask server (backend)    |

---

## Project Structure

```
isl-bridge/
├── backend/
│   ├── app.py               # Flask API — main backend server
│   ├── requirements.txt     # Python dependencies
│   └── model/
│       ├── isl_model.keras  # Trained TF/Keras model (PRIMARY)
│       ├── isl_model.h5     # Legacy model format
│       ├── label_map.json   # Class index → ISL letter mapping
│       └── weights.npz      # Raw weights
├── frontend/                # React Native / Expo mobile app
├── training/                # Model training scripts
├── training_data/           # Raw training dataset
├── training_logs/           # TensorBoard logs
├── dataset/                 # Curated dataset for ISL alphabets
├── model_outputs/           # Saved model checkpoints
├── tools/                   # Utility scripts
├── docs/                    # Project documentation & hackathon notes
├── external/isl-try/        # External reference ISL implementation
│   ├── backend/             # Reference Flask backend
│   └── frontend/            # Reference frontend
├── package-lock.json        # Node.js lock file (Expo)
├── vercel.json              # Vercel deployment config
└── AGENTS.md                # This file — AI agent context
```

---

## Key Files

- **`backend/app.py`** — Main Flask server. Handles `/predict` endpoint for sign recognition.
- **`backend/model/isl_model.keras`** — The primary trained model. Always prefer `.keras` over `.h5`.
- **`backend/model/label_map.json`** — Maps model output indices to ISL letters (A–Z + special signs).
- **`training/`** — Contains training scripts. Uses MediaPipe + TensorFlow.

---

## Coding Conventions

- **Python**: PEP 8. Use f-strings. Type hints preferred.
- **Flask**: Keep routes thin — business logic in helper functions.
- **Model**: Always load with `tf.keras.models.load_model()`. Use `.keras` format.
- **MediaPipe**: Extract 21 hand landmarks (x, y, z) → flatten to 63 features per hand.
- **JavaScript/React Native**: Functional components with hooks. Expo SDK conventions.
- **No hardcoded paths**: Use `os.path.join` and relative paths from `__file__`.

---

## Common Tasks

- **Run backend**: `cd backend && python app.py`
- **Train model**: `cd training && python train.py`
- **Run Expo app**: `npx expo start`
- **Check model accuracy**: `cd training && python evaluate.py`

---

## Goals & Current Status

- [x] ISL alphabet recognition model trained (A–Z)
- [x] Flask backend with `/predict` API
- [x] React Native frontend (Expo)
- [ ] Integrate Ollama "Brain" for sentence enhancement
- [ ] Improve model accuracy on real-world lighting conditions
- [ ] Deploy backend to cloud (currently local)

---

## Important Notes

- The **model input shape** is `(1, 63)` — 21 landmarks × 3 coordinates (x, y, z).
- Ollama runs locally on `http://localhost:11434`. Use `llama3` or `mistral` as the Brain model.
- The project is for the **Google Solution Challenge 2026 Hackathon** — keep code clean and demo-ready.
- When modifying the backend, always test with `curl` or Postman before touching the frontend.
