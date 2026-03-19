from __future__ import annotations

import argparse
import json
from pathlib import Path

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers


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
        default=Path("training_output") / "alnum",
        help="Directory where the trained model and metadata will be written.",
    )
    parser.add_argument("--image-size", type=int, default=128)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--validation-split", type=float, default=0.15)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--learning-rate", type=float, default=1e-3)
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

    callbacks = [
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


