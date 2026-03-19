from __future__ import annotations

import argparse
import csv
import hashlib
import shutil
from pathlib import Path

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp', '.webp'}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Build a unified full alphabet dataset from prepared and public sources.')
    parser.add_argument('--prepared-dir', type=Path, default=Path('training_data') / 'alnum_stage1')
    parser.add_argument('--public-dir', type=Path, default=Path('public_datasets') / 'isl_alphabet_github')
    parser.add_argument('--output-dir', type=Path, default=Path('training_data') / 'alnum_full')
    parser.add_argument('--clean', action='store_true')
    return parser.parse_args()


def safe_name(text: str) -> str:
    return hashlib.md5(text.encode('utf-8'), usedforsecurity=False).hexdigest()[:10]


def normalize_label(label: str) -> str:
    return label.strip().upper()


def prepare_dir(path: Path, clean: bool) -> None:
    if clean and path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def copy_class_dirs(source_dir: Path, source_name: str, output_dir: Path, manifest_rows: list[dict[str, str]]) -> None:
    if not source_dir.exists():
        return
    for class_dir in source_dir.iterdir():
        if not class_dir.is_dir():
            continue
        label = normalize_label(class_dir.name)
        target_dir = output_dir / label
        target_dir.mkdir(parents=True, exist_ok=True)
        for file in class_dir.rglob('*'):
            if not file.is_file() or file.suffix.lower() not in IMAGE_EXTENSIONS:
                continue
            target_name = f"{source_name}_{safe_name(str(file))}{file.suffix.lower()}"
            target_path = target_dir / target_name
            shutil.copy2(file, target_path)
            manifest_rows.append({'label': label, 'source': source_name, 'source_path': str(file), 'target_path': str(target_path.relative_to(output_dir))})


def write_manifest(output_dir: Path, rows: list[dict[str, str]]) -> None:
    manifest = output_dir / 'manifest.csv'
    with manifest.open('w', newline='', encoding='utf-8') as fh:
        writer = csv.DictWriter(fh, fieldnames=['label', 'source', 'source_path', 'target_path'])
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    args = parse_args()
    prepare_dir(args.output_dir, args.clean)
    manifest_rows: list[dict[str, str]] = []
    copy_class_dirs(args.prepared_dir, 'prepared_stage1', args.output_dir, manifest_rows)
    copy_class_dirs(args.public_dir, 'public_alphabet', args.output_dir, manifest_rows)
    write_manifest(args.output_dir, manifest_rows)
    print(f'Prepared unified alphabet dataset at {args.output_dir}')
    print(f'Total copied samples: {len(manifest_rows)}')


if __name__ == '__main__':
    main()
