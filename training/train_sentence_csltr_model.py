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

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp', '.webp'}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Train a sentence model from CSLTR frame directories.')
    parser.add_argument('--dataset-dir', type=Path, default=Path('public_datasets') / 'isl_csltr' / 'ISL_CSLRT_Corpus' / 'Frames_Sentence_Level')
    parser.add_argument('--output-dir', type=Path, default=Path('model_outputs') / 'sentences_full')
    parser.add_argument('--image-size', type=int, default=96)
    parser.add_argument('--num-frames', type=int, default=16)
    parser.add_argument('--batch-size', type=int, default=8)
    parser.add_argument('--epochs', type=int, default=15)
    parser.add_argument('--validation-split', type=float, default=0.2)
    parser.add_argument('--seed', type=int, default=42)
    return parser.parse_args()


def collect_rows(dataset_dir: Path) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for label_dir in dataset_dir.iterdir():
        if not label_dir.is_dir():
            continue
        for sample_dir in label_dir.iterdir():
            if not sample_dir.is_dir():
                continue
            frame_count = len([p for p in sample_dir.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS])
            if frame_count == 0:
                continue
            rows.append({'label': label_dir.name, 'relative_dir': str(sample_dir.relative_to(dataset_dir)), 'frame_count': str(frame_count)})
    return rows


def stratified_split(rows: list[dict[str, str]], validation_split: float, seed: int):
    random.seed(seed)
    grouped: dict[str, list[dict[str, str]]] = {}
    for row in rows:
        grouped.setdefault(row['label'], []).append(row)
    train_rows=[]; val_rows=[]
    for label, items in grouped.items():
        items = items[:]
        random.shuffle(items)
        val_count = max(1, int(len(items) * validation_split)) if len(items) > 1 else 0
        val_rows.extend(items[:val_count])
        train_rows.extend(items[val_count:])
    class_names = sorted(grouped)
    return train_rows, val_rows, class_names


def choose_indices(frame_count: int, num_frames: int) -> np.ndarray:
    return np.linspace(0, frame_count - 1, num=num_frames, dtype=int)


def load_sequence(sample_dir: Path, image_size: int, num_frames: int) -> np.ndarray:
    frames = sorted([p for p in sample_dir.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS])
    idx = choose_indices(len(frames), num_frames)
    data = []
    for i in idx:
        with Image.open(frames[i]) as img:
            img = img.convert('RGB').resize((image_size, image_size))
            data.append(np.asarray(img, dtype=np.float32))
    return np.stack(data, axis=0)


class SentenceSequence(keras.utils.Sequence):
    def __init__(self, rows, dataset_dir: Path, label_to_index: dict[str, int], image_size: int, num_frames: int, batch_size: int, shuffle: bool):
        super().__init__()
        self.rows = rows[:]
        self.dataset_dir = dataset_dir
        self.label_to_index = label_to_index
        self.image_size = image_size
        self.num_frames = num_frames
        self.batch_size = batch_size
        self.shuffle = shuffle
        self.indexes = np.arange(len(self.rows))
        self.on_epoch_end()

    def __len__(self):
        return math.ceil(len(self.rows) / self.batch_size)

    def __getitem__(self, idx):
        batch_idx = self.indexes[idx*self.batch_size:(idx+1)*self.batch_size]
        batch = [self.rows[i] for i in batch_idx]
        x = np.stack([load_sequence(self.dataset_dir / row['relative_dir'], self.image_size, self.num_frames) for row in batch], axis=0)
        y = np.asarray([self.label_to_index[row['label']] for row in batch], dtype=np.int32)
        return x, y

    def on_epoch_end(self):
        if self.shuffle:
            np.random.shuffle(self.indexes)


def build_model(num_frames: int, image_size: int, num_classes: int) -> keras.Model:
    inputs = keras.Input(shape=(num_frames, image_size, image_size, 3))
    x = layers.Rescaling(1/255.0)(inputs)
    x = layers.Conv3D(16, (3,5,5), padding='same', use_bias=False)(x)
    x = layers.BatchNormalization()(x)
    x = layers.Activation('relu')(x)
    x = layers.MaxPooling3D((1,2,2))(x)
    x = layers.Conv3D(32, (3,3,3), padding='same', use_bias=False)(x)
    x = layers.BatchNormalization()(x)
    x = layers.Activation('relu')(x)
    x = layers.MaxPooling3D((2,2,2))(x)
    x = layers.Conv3D(64, (3,3,3), padding='same', use_bias=False)(x)
    x = layers.BatchNormalization()(x)
    x = layers.Activation('relu')(x)
    x = layers.MaxPooling3D((2,2,2))(x)
    x = layers.GlobalAveragePooling3D()(x)
    x = layers.Dense(256, activation='relu')(x)
    x = layers.Dropout(0.4)(x)
    outputs = layers.Dense(num_classes, activation='softmax')(x)
    return keras.Model(inputs, outputs)


def write_metadata(output_dir: Path, class_names: list[str], history, metrics, train_rows, val_rows):
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / 'label_map.json').write_text(json.dumps({str(i): label for i, label in enumerate(class_names)}, indent=2), encoding='utf-8')
    (output_dir / 'history.json').write_text(json.dumps(history, indent=2), encoding='utf-8')
    (output_dir / 'metrics.json').write_text(json.dumps(metrics, indent=2), encoding='utf-8')
    (output_dir / 'splits.json').write_text(json.dumps({'train_samples': len(train_rows), 'val_samples': len(val_rows)}, indent=2), encoding='utf-8')
    with (output_dir / 'class_names.txt').open('w', encoding='utf-8') as fh:
        fh.write('\n'.join(class_names))


def main() -> None:
    args = parse_args()
    tf.keras.utils.set_random_seed(args.seed)
    rows = collect_rows(args.dataset_dir)
    train_rows, val_rows, class_names = stratified_split(rows, args.validation_split, args.seed)
    label_to_index = {label: i for i, label in enumerate(class_names)}
    train_seq = SentenceSequence(train_rows, args.dataset_dir, label_to_index, args.image_size, args.num_frames, args.batch_size, True)
    val_seq = SentenceSequence(val_rows, args.dataset_dir, label_to_index, args.image_size, args.num_frames, args.batch_size, False)
    model = build_model(args.num_frames, args.image_size, len(class_names))
    model.compile(optimizer=keras.optimizers.Adam(1e-3), loss='sparse_categorical_crossentropy', metrics=['accuracy', keras.metrics.SparseTopKCategoricalAccuracy(k=3, name='top3_accuracy')])
    callbacks = [
        keras.callbacks.ModelCheckpoint(filepath=str(args.output_dir / 'best.keras'), monitor='val_accuracy', save_best_only=True, verbose=1),
        keras.callbacks.EarlyStopping(monitor='val_accuracy', patience=4, restore_best_weights=True, verbose=1),
        keras.callbacks.ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=2, min_lr=1e-5, verbose=1),
    ]
    history = model.fit(train_seq, validation_data=val_seq, epochs=args.epochs, callbacks=callbacks, verbose=1)
    metrics = model.evaluate(val_seq, return_dict=True, verbose=1)
    model.save(args.output_dir / 'model.keras')
    write_metadata(args.output_dir, class_names, history.history, metrics, train_rows, val_rows)
    print(metrics)


if __name__ == '__main__':
    main()
