# 10-Hour Alnum Training Profile

This profile is meant for a deadline run on the current laptop:

- CPU only
- 8 logical cores
- 16 GB RAM
- target: get a usable A-Z + 0-9 model inside about 10 hours

## Recommended profile

- dataset: `training_data/alnum_full`
- image size: `96`
- batch size: `128`
- epochs: `6`
- validation split: `0.10`
- learning rate: `0.0015`
- threads: `TF_NUM_INTRAOP_THREADS=8`, `TF_NUM_INTEROP_THREADS=2`

Why this profile:

- `96x96` cuts image compute cost noticeably versus `128x128`
- batch `128` reduces steps per epoch a lot
- `6` epochs is much more realistic than `20` on CPU
- validation split `0.10` keeps more data for training and trims validation time
- the existing script already includes `EarlyStopping` and `ReduceLROnPlateau`

## Launch

Dry run:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\run_alnum_deadline_10h.ps1
```

Start the run:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\run_alnum_deadline_10h.ps1 -Launch
```

## Important note

Do not run this at the same time as another heavy CPU training job if you want the fastest result. Two simultaneous CPU trainings will usually make both slower.

## Backend note

The current deployed backend is **not** using these image-model outputs yet.

Right now the backend uses:

- `Flask` API
- `Flask-CORS`
- `NumPy`
- `TensorFlow`
- `Gunicorn` in deployment
- a landmark-based classifier loaded from `backend/model/weights.npz`
- labels from `backend/model/label_map.json`

The backend accepts `63` hand-landmark values and exposes:

- `GET /`
- `GET /health`
- `GET /signs`
- `POST /predict`

So this 10-hour image training profile prepares a faster model run, but wiring a new image model into the backend would still be a separate step.
