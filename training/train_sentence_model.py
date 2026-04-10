from __future__ import annotations

import argparse
import csv
import json
import math
import random
from pathlib import Path

import numpy as np
import tensorflow as tf
from PIL import Image
from tensorflow import keras
from tensorflow.keras import layers


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Train a sentence-level ISL sequence model from extracted frame folders."
    )
    parser.add_argument(
        "--dataset-dir",
        type=Path,
        default=Path("training_data") / "sentences_top20",
        help="Prepared sentence dataset directory created by prepare_sentence_dataset.py",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("model_outputs") / "sentences",
        help="Directory where the sentence model and metadata will be written.",
    )
    parser.add_argument("--image-size", type=int, default=96)
    parser.add_argument("--num-frames", type=int, default=16)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--epochs", type=int, default=15)
    parser.add_argument("--validation-split", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--learning-rate", type=float, default=1e-3)
    return parser


def read_manifest(dataset_dir: Path) -> list[dict[str, str]]:
    manifest_path = dataset_dir / "manifest.csv"
    with manifest_path.open("r", newline="", encoding="utf-8") as csv_file:
        return list(csv.DictReader(csv_file))


def stratified_split(
    rows: list[dict[str, str]],
    validation_split: float,
    seed: int,
) -> tuple[list[dict[str, str]], list[dict[str, str]], list[str]]:
    random.seed(seed)
    grouped: dict[str, list[dict[str, str]]] = {}
    for row in rows:
        grouped.setdefault(row["label"], []).append(row)

    train_rows: list[dict[str, str]] = []
    val_rows: list[dict[str, str]] = []

    for label, items in grouped.items():
        items = items[:]
        random.shuffle(items)
        val_count = max(1, int(len(items) * validation_split)) if len(items) > 1 else 0
        val_rows.extend(items[:val_count])
        train_rows.extend(items[val_count:])

    class_names = sorted(grouped)
    return train_rows, val_rows, class_names


def choose_frame_indices(frame_count: int, num_frames: int) -> np.ndarray:
    if frame_count == 0:
        raise ValueError("A sample folder does not contain any frames.")
    return np.linspace(0, frame_count - 1, num=num_frames, dtype=int)


def load_sequence(
    sample_dir: Path,
    image_size: int,
    num_frames: int,
) -> np.ndarray:
    frame_paths = sorted(
        [
            path
            for path in sample_dir.iterdir()
            if path.suffix.lower() in {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
        ]
    )
    indices = choose_frame_indices(len(frame_paths), num_frames)
    frames: list[np.ndarray] = []
    for index in indices:
        with Image.open(frame_paths[index]) as image:
            image = image.convert("RGB")
            image = image.resize((image_size, image_size))
            frames.append(np.asarray(image, dtype=np.float32))
    return np.stack(frames, axis=0)


class SentenceSequence(keras.utils.Sequence):
    def __init__(
        self,
        rows: list[dict[str, str]],
        dataset_dir: Path,
        label_to_index: dict[str, int],
        image_size: int,
        num_frames: int,
        batch_size: int,
        shuffle: bool,
    ) -> None:
        self.rows = rows[:]
        self.dataset_dir = dataset_dir
        self.label_to_index = label_to_index
        self.image_size = image_size
        self.num_frames = num_frames
        self.batch_size = batch_size
        self.shuffle = shuffle
        self.indexes = np.arange(len(self.rows))
        self.on_epoch_end()

    def __len__(self) -> int:
        return math.ceil(len(self.rows) / self.batch_size)

    def __getitem__(self, index: int) -> tuple[np.ndarray, np.ndarray]:
        batch_indexes = self.indexes[index * self.batch_size : (index + 1) * self.batch_size]
        batch_rows = [self.rows[i] for i in batch_indexes]

        x_batch = np.stack(
            [
                load_sequence(
                    sample_dir=self.dataset_dir / row["relative_dir"],
                    image_size=self.image_size,
                    num_frames=self.num_frames,
                )
                for row in batch_rows
            ],
            axis=0,
        )
        y_batch = np.asarray(
            [self.label_to_index[row["label"]] for row in batch_rows],
            dtype=np.int32,
        )
        return x_batch, y_batch

    def on_epoch_end(self) -> None:
        if self.shuffle:
            np.random.shuffle(self.indexes)


def build_model(num_frames: int, image_size: int, num_classes: int) -> keras.Model:
    inputs = keras.Input(shape=(num_frames, image_size, image_size, 3))

    x = layers.Rescaling(1.0 / 255.0)(inputs)
    x = layers.Conv3D(16, (3, 5, 5), padding="same", use_bias=False)(x)
    x = layers.BatchNormalization()(x)
    x = layers.Activation("relu")(x)
    x = layers.MaxPooling3D((1, 2, 2))(x)

    x = layers.Conv3D(32, (3, 3, 3), padding="same", use_bias=False)(x)
    x = layers.BatchNormalization()(x)
    x = layers.Activation("relu")(x)
    x = layers.MaxPooling3D((2, 2, 2))(x)

    x = layers.Conv3D(64, (3, 3, 3), padding="same", use_bias=False)(x)
    x = layers.BatchNormalization()(x)
    x = layers.Activation("relu")(x)
    x = layers.MaxPooling3D((2, 2, 2))(x)

    x = layers.GlobalAveragePooling3D()(x)
    x = layers.Dense(256, activation="relu")(x)
    x = layers.Dropout(0.4)(x)
    outputs = layers.Dense(num_classes, activation="softmax")(x)
    return keras.Model(inputs=inputs, outputs=outputs, name="isl_sentence_conv3d")


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
    rows = read_manifest(args.dataset_dir)
    train_rows, val_rows, class_names = stratified_split(
        rows,
        validation_split=args.validation_split,
        seed=args.seed,
    )

    label_to_index = {label: index for index, label in enumerate(class_names)}
    train_seq = SentenceSequence(
        rows=train_rows,
        dataset_dir=args.dataset_dir,
        label_to_index=label_to_index,
        image_size=args.image_size,
        num_frames=args.num_frames,
        batch_size=args.batch_size,
        shuffle=True,
    )
    val_seq = SentenceSequence(
        rows=val_rows,
        dataset_dir=args.dataset_dir,
        label_to_index=label_to_index,
        image_size=args.image_size,
        num_frames=args.num_frames,
        batch_size=args.batch_size,
        shuffle=False,
    )

    model = build_model(args.num_frames, args.image_size, len(class_names))
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=args.learning_rate),
        loss="sparse_categorical_crossentropy",
        metrics=[
            "accuracy",
            keras.metrics.SparseTopKCategoricalAccuracy(k=3, name="top3_accuracy"),
        ],
    )

    callbacks = [
        keras.callbacks.ModelCheckpoint(
            filepath=str(args.output_dir / "best.keras"),
            monitor="val_accuracy",
            save_best_only=True,
            verbose=1,
        ),
        keras.callbacks.EarlyStopping(
            monitor="val_accuracy",
            patience=4,
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
    ]

    history = model.fit(
        train_seq,
        validation_data=val_seq,
        epochs=args.epochs,
        callbacks=callbacks,
        verbose=1,
    )

    metrics_values = model.evaluate(val_seq, return_dict=True, verbose=1)
    model.save(args.output_dir / "model.keras")
    write_metadata(args.output_dir, class_names, history.history, metrics_values)

    print("\nValidation metrics:")
    for name, value in metrics_values.items():
        print(f"  {name}: {value:.4f}")
    print(f"\nSaved trained sentence model to {args.output_dir / 'model.keras'}")


if __name__ == "__main__":
    main()
