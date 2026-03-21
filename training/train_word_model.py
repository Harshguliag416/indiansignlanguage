from __future__ import annotations

import argparse
from pathlib import Path

import tensorflow as tf
from tensorflow import keras

from train_alnum_model import (
    TrainingProgressCallback,
    build_model,
    create_datasets,
    write_metadata,
)

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Train a fixed-word ISL image classifier for Option B from a prepared dataset."
    )
    parser.add_argument(
        "--dataset-dir",
        type=Path,
        default=Path("training_data") / "words_live",
        help="Dataset directory created by prepare_word_dataset.py",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("model_outputs") / "words_live",
        help="Directory where the word model and metadata will be written.",
    )
    parser.add_argument("--image-size", type=int, default=96)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--epochs", type=int, default=18)
    parser.add_argument("--validation-split", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--learning-rate", type=float, default=1e-3)
    parser.add_argument("--min-classes", type=int, default=2)
    parser.add_argument("--min-samples-per-class", type=int, default=20)
    parser.add_argument("--progress-json", type=Path, default=None)
    parser.add_argument("--progress-html", type=Path, default=None)
    return parser


def inspect_dataset(dataset_dir: Path) -> dict[str, int]:
    counts: dict[str, int] = {}
    for class_dir in sorted(dataset_dir.iterdir()):
        if not class_dir.is_dir():
            continue
        count = sum(1 for path in class_dir.rglob("*") if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS)
        if count:
            counts[class_dir.name] = count
    return counts


def main() -> None:
    args = build_arg_parser().parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    if not args.dataset_dir.exists():
        raise SystemExit(f"Dataset directory not found: {args.dataset_dir}")

    counts = inspect_dataset(args.dataset_dir)
    if len(counts) < args.min_classes:
        raise SystemExit(
            f"Need at least {args.min_classes} non-empty word classes in {args.dataset_dir}, found {len(counts)}"
        )

    low_sample = {label: count for label, count in counts.items() if count < args.min_samples_per_class}
    if low_sample:
        details = ", ".join(f"{label}={count}" for label, count in sorted(low_sample.items()))
        raise SystemExit(
            "Some word classes do not have enough samples yet. "
            f"Need at least {args.min_samples_per_class} each. Found: {details}"
        )

    tf.keras.utils.set_random_seed(args.seed)
    train_ds, val_ds, class_names = create_datasets(
        dataset_dir=args.dataset_dir,
        image_size=args.image_size,
        batch_size=args.batch_size,
        validation_split=args.validation_split,
        seed=args.seed,
    )

    model = build_model(args.image_size, len(class_names))
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=args.learning_rate),
        loss="sparse_categorical_crossentropy",
        metrics=[
            "accuracy",
            keras.metrics.SparseTopKCategoricalAccuracy(k=3, name="top3_accuracy"),
        ],
    )

    progress_callback = TrainingProgressCallback(
        output_dir=args.output_dir,
        requested_epochs=args.epochs,
        progress_json=args.progress_json,
        progress_html=args.progress_html,
    )

    callbacks = [
        keras.callbacks.BackupAndRestore(
            backup_dir=str(args.output_dir / "backup"),
            delete_checkpoint=True,
        ),
        keras.callbacks.ModelCheckpoint(
            filepath=str(args.output_dir / "best.keras"),
            monitor="val_accuracy",
            save_best_only=True,
            verbose=1,
        ),
        keras.callbacks.EarlyStopping(
            monitor="val_accuracy",
            patience=5,
            restore_best_weights=True,
            verbose=1,
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=2,
            min_lr=1e-5,
            verbose=1,
        ),
        keras.callbacks.CSVLogger(str(args.output_dir / "training.csv"), append=True),
        progress_callback,
    ]

    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=args.epochs,
        callbacks=callbacks,
        verbose=1,
    )

    metrics_values = model.evaluate(val_ds, return_dict=True, verbose=1)
    model.save(args.output_dir / "model.keras")
    write_metadata(args.output_dir, class_names, history.history, metrics_values)

    print("\nValidation metrics:")
    for name, value in metrics_values.items():
        print(f"  {name}: {value:.4f}")
    print(f"\nSaved fixed-word model to {args.output_dir / 'model.keras'}")


if __name__ == "__main__":
    main()
