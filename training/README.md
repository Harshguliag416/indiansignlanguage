# Training Pipeline

This folder adds the three-stage training flow we discussed:

1. `A-Z + 0-9` from the strongest image archives
2. merge the large alphabet archive after label cleanup
3. sentence-level sequence training from the sentence corpus

All commands below assume you are in `h:\HACKATHON\isl-bridge`.

## Stage 1: Letters And Digits

Prepare the first dataset from the strongest alphanumeric archives:

```powershell
python training\prepare_alnum_dataset.py `
  --dataset-root "C:\Users\harsh\Downloads\Dataset" `
  --output-dir "training_data\alnum_stage1" `
  --clean
```

Train the first model:

```powershell
python training\train_alnum_model.py `
  --dataset-dir "training_data\alnum_stage1" `
  --output-dir "training_output\alnum_stage1" `
  --epochs 20 `
  --image-size 128 `
  --batch-size 64
```

Recommended base source for this stage:

- `archive (1).zip`: `0-9` and `A-Z`
- `archive (3).zip`: mostly `1-9` and `A-Z`

## Stage 2: Add The Large Alphabet Archive

This stage merges `archive (2).zip` and automatically normalizes `E1` and `E2` into `E`.

Prepare the merged dataset:

```powershell
python training\prepare_alnum_dataset.py `
  --dataset-root "C:\Users\harsh\Downloads\Dataset" `
  --output-dir "training_data\alnum_stage2" `
  --include-large-alphabet `
  --include-supplemental-letter-zips `
  --clean
```

Train the improved model:

```powershell
python training\train_alnum_model.py `
  --dataset-dir "training_data\alnum_stage2" `
  --output-dir "training_output\alnum_stage2" `
  --epochs 24 `
  --image-size 128 `
  --batch-size 64
```

If training time is tight, add:

```powershell
--max-per-class-per-source 1200
```

to the prepare step to keep the dataset balanced and faster to train.

## Stage 3: Sentence-Level Sequence Model

Prepare a sentence subset from `archive (4).zip`:

```powershell
python training\prepare_sentence_dataset.py `
  --archive-path "C:\Users\harsh\Downloads\Dataset\archive (4).zip" `
  --output-dir "training_data\sentences_top20" `
  --top-k-labels 20 `
  --min-samples-per-label 5 `
  --clean
```

Train the sentence model:

```powershell
python training\train_sentence_model.py `
  --dataset-dir "training_data\sentences_top20" `
  --output-dir "training_output\sentences_top20" `
  --epochs 15 `
  --num-frames 16 `
  --image-size 96 `
  --batch-size 8
```

## Fastest 1-Hour Training Plan

If you want the best result inside about one hour:

1. Run Stage 1 fully.
2. Run Stage 2 with `--max-per-class-per-source 1200`.
3. Run Stage 3 only on `top 10-20` sentence labels first.

That gives you:

- a strong `A-Z + 0-9` baseline
- better alphabet robustness from the large archive
- a realistic first sentence model without trying to train all `97` sentence classes at once

## Output Files

Each training run writes:

- `model.keras`
- `best.keras`
- `label_map.json`
- `history.json`
- `metrics.json`
- `class_names.txt`

## Important Note For This Repo

The current mobile inference flow in `frontend/screens/ModeAScreen.js` still sends fake random landmarks to the backend.

That means:

- these image and sentence models are trainable now
- but app-side inference will still need a later integration pass to use real extracted landmarks or image/video inference

The long videos in `C:\Users\harsh\Downloads\Dataset\Video` are useful as source material, but they are not yet clean per-sample training clips.
