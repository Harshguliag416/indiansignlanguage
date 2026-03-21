from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers


class TrainingProgressCallback(keras.callbacks.Callback):
    def __init__(
        self,
        *,
        output_dir: Path,
        requested_epochs: int,
        progress_json: Path | None,
        progress_html: Path | None,
    ) -> None:
        super().__init__()
        self.output_dir = output_dir
        self.requested_epochs = requested_epochs
        self.progress_json = progress_json or (output_dir / "progress.json")
        self.progress_html = progress_html or (output_dir / "progress.html")
        self.current_epoch = 0
        self.total_epochs = requested_epochs
        self.steps_per_epoch = 0

    def on_train_begin(self, logs=None):
        self.total_epochs = int(self.params.get("epochs", self.requested_epochs) or self.requested_epochs)
        self.steps_per_epoch = int(self.params.get("steps", 0) or 0)
        self._write_progress(status="running", epoch_index=self.current_epoch, step=0, logs=logs)

    def on_epoch_begin(self, epoch, logs=None):
        self.current_epoch = int(epoch)
        self._write_progress(status="running", epoch_index=self.current_epoch, step=0, logs=logs)

    def on_train_batch_end(self, batch, logs=None):
        step = int(batch) + 1
        self._write_progress(status="running", epoch_index=self.current_epoch, step=step, logs=logs)

    def on_epoch_end(self, epoch, logs=None):
        self.current_epoch = int(epoch) + 1
        step = self.steps_per_epoch or int(self.params.get("steps", 0) or 0)
        self._write_progress(status="running", epoch_index=self.current_epoch, step=step, logs=logs)

    def on_train_end(self, logs=None):
        self._write_progress(
            status="completed",
            epoch_index=self.total_epochs,
            step=self.steps_per_epoch,
            logs=logs,
        )

    def _write_progress(self, *, status: str, epoch_index: int, step: int, logs=None) -> None:
        logs = logs or {}
        steps_per_epoch = max(1, int(self.steps_per_epoch or 1))
        total_steps = max(1, int(self.total_epochs or 1) * steps_per_epoch)
        completed_steps = min(total_steps, max(0, int(epoch_index) * steps_per_epoch + int(step)))
        percent = round((completed_steps / total_steps) * 100, 2)

        payload = {
            "status": status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "epoch": min(self.total_epochs, int(epoch_index) + (0 if status == "completed" else 1)),
            "epochs": int(self.total_epochs),
            "step": int(step),
            "steps_per_epoch": steps_per_epoch,
            "percent": percent,
            "accuracy": self._metric(logs, "accuracy"),
            "val_accuracy": self._metric(logs, "val_accuracy"),
            "top3_accuracy": self._metric(logs, "top3_accuracy"),
            "val_top3_accuracy": self._metric(logs, "val_top3_accuracy"),
            "loss": self._metric(logs, "loss"),
            "val_loss": self._metric(logs, "val_loss"),
            "output_dir": str(self.output_dir),
        }

        self.progress_json.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        self.progress_html.write_text(self._render_html(payload), encoding="utf-8")

    @staticmethod
    def _metric(logs: dict, key: str) -> float | None:
        value = logs.get(key)
        return None if value is None else round(float(value), 6)

    @staticmethod
    def _render_html(payload: dict) -> str:
        def fmt(value: float | None, scale: float = 1.0, suffix: str = "") -> str:
            if value is None:
                return "--"
            return f"{value * scale:.2f}{suffix}"

        percent = float(payload["percent"])
        return f"""<!doctype html>
<html lang=\"en\">
<head>
  <meta charset=\"utf-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
  <meta http-equiv=\"refresh\" content=\"15\" />
  <title>ISL Bridge Training Progress</title>
  <style>
    body {{ font-family: Arial, sans-serif; margin: 0; background: #0f172a; color: #e2e8f0; }}
    .wrap {{ max-width: 720px; margin: 40px auto; padding: 24px; }}
    .card {{ background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 24px; box-shadow: 0 20px 45px rgba(0,0,0,0.2); }}
    .bar {{ height: 24px; border-radius: 999px; background: #1f2937; overflow: hidden; margin: 16px 0 20px; }}
    .fill {{ height: 100%; width: {percent}%; background: linear-gradient(90deg, #22d3ee, #10b981); }}
    .grid {{ display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }}
    .metric {{ background: #0b1220; border-radius: 12px; padding: 12px 14px; }}
    .label {{ color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }}
    .value {{ font-size: 22px; font-weight: 700; margin-top: 4px; }}
    .meta {{ color: #94a3b8; font-size: 14px; margin-top: 14px; }}
  </style>
</head>
<body>
  <div class=\"wrap\">
    <div class=\"card\">
      <div class=\"label\">Training Status</div>
      <div class=\"value\">{payload['status'].upper()} - {percent:.2f}%</div>
      <div class=\"bar\"><div class=\"fill\"></div></div>
      <div class=\"grid\">
        <div class=\"metric\"><div class=\"label\">Epoch</div><div class=\"value\">{payload['epoch']} / {payload['epochs']}</div></div>
        <div class=\"metric\"><div class=\"label\">Step</div><div class=\"value\">{payload['step']} / {payload['steps_per_epoch']}</div></div>
        <div class=\"metric\"><div class=\"label\">Accuracy</div><div class=\"value\">{fmt(payload['accuracy'], 100, '%')}</div></div>
        <div class=\"metric\"><div class=\"label\">Top 3</div><div class=\"value\">{fmt(payload['top3_accuracy'], 100, '%')}</div></div>
        <div class=\"metric\"><div class=\"label\">Loss</div><div class=\"value\">{fmt(payload['loss'])}</div></div>
        <div class=\"metric\"><div class=\"label\">Val Accuracy</div><div class=\"value\">{fmt(payload['val_accuracy'], 100, '%')}</div></div>
      </div>
      <div class=\"meta\">Auto-refreshes every 15 seconds. Last update: {payload['updated_at']}</div>
    </div>
  </div>
</body>
</html>
"""


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Train an ISL image classifier for A-Z and 0-9 from a prepared directory."
    )
    parser.add_argument(
        "--dataset-dir",
        type=Path,
        default=Path("training_data") / "alnum_stage1",
        help="Prepared dataset directory created by prepare_alnum_dataset.py",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("model_outputs") / "alnum",
        help="Directory where the trained model and metadata will be written.",
    )
    parser.add_argument("--image-size", type=int, default=128)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--validation-split", type=float, default=0.15)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--learning-rate", type=float, default=1e-3)
    parser.add_argument("--progress-json", type=Path, default=None)
    parser.add_argument("--progress-html", type=Path, default=None)
    return parser


def build_model(image_size: int, num_classes: int) -> keras.Model:
    inputs = keras.Input(shape=(image_size, image_size, 3))

    x = layers.RandomRotation(0.03)(inputs)
    x = layers.RandomTranslation(0.05, 0.05)(x)
    x = layers.RandomZoom(0.1)(x)
    x = layers.RandomContrast(0.1)(x)
    x = layers.Rescaling(1.0 / 255.0)(x)

    for filters, dropout_rate in [(32, 0.10), (64, 0.10), (128, 0.15), (256, 0.20)]:
        x = layers.Conv2D(filters, 3, padding="same", use_bias=False)(x)
        x = layers.BatchNormalization()(x)
        x = layers.Activation("relu")(x)
        x = layers.Conv2D(filters, 3, padding="same", use_bias=False)(x)
        x = layers.BatchNormalization()(x)
        x = layers.Activation("relu")(x)
        x = layers.MaxPooling2D()(x)
        x = layers.Dropout(dropout_rate)(x)

    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dense(256, activation="relu")(x)
    x = layers.Dropout(0.40)(x)
    outputs = layers.Dense(num_classes, activation="softmax")(x)
    return keras.Model(inputs=inputs, outputs=outputs, name="isl_alnum_cnn")


def create_datasets(
    dataset_dir: Path,
    image_size: int,
    batch_size: int,
    validation_split: float,
    seed: int,
) -> tuple[tf.data.Dataset, tf.data.Dataset, list[str]]:
    common_kwargs = dict(
        directory=str(dataset_dir),
        labels="inferred",
        label_mode="int",
        image_size=(image_size, image_size),
        batch_size=batch_size,
        validation_split=validation_split,
        seed=seed,
    )

    train_ds = keras.utils.image_dataset_from_directory(
        subset="training",
        shuffle=True,
        **common_kwargs,
    )
    val_ds = keras.utils.image_dataset_from_directory(
        subset="validation",
        shuffle=False,
        **common_kwargs,
    )

    class_names = train_ds.class_names
    autotune = tf.data.AUTOTUNE
    train_ds = train_ds.prefetch(autotune)
    val_ds = val_ds.prefetch(autotune)
    return train_ds, val_ds, class_names


def write_metadata(
    output_dir: Path,
    class_names: list[str],
    history: dict[str, list[float]],
    metrics: dict[str, float],
) -> None:
    label_map = {str(index): label for index, label in enumerate(class_names)}
    (output_dir / "label_map.json").write_text(
        json.dumps(label_map, indent=2),
        encoding="utf-8",
    )
    (output_dir / "history.json").write_text(
        json.dumps(history, indent=2),
        encoding="utf-8",
    )
    (output_dir / "metrics.json").write_text(
        json.dumps(metrics, indent=2),
        encoding="utf-8",
    )
    (output_dir / "class_names.txt").write_text(
        "\n".join(class_names),
        encoding="utf-8",
    )


def main() -> None:
    args = build_arg_parser().parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

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
    print(f"\nSaved trained model to {args.output_dir / 'model.keras'}")


if __name__ == "__main__":
    main()
