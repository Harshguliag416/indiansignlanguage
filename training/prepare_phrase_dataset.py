from __future__ import annotations

import argparse
import csv
import hashlib
import re
import shutil
import zipfile
from pathlib import Path

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp', '.webp'}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Build a unified word/phrase dataset from all usable public sources.')
    parser.add_argument('--everyday-dir', type=Path, default=Path('public_datasets') / 'isl_everyday_phrases_words' / 'images for phrases')
    parser.add_argument('--common-dir', type=Path, default=Path('public_datasets') / 'isl_common_phrases' / 'MP_Data')
    parser.add_argument('--real-life-dir', type=Path, default=Path('public_datasets') / 'isl_real_life_words')
    parser.add_argument('--csltr-word-dir', type=Path, default=Path('public_datasets') / 'isl_csltr' / 'ISL_CSLRT_Corpus' / 'Frames_Word_Level')
    parser.add_argument('--output-dir', type=Path, default=Path('training_data') / 'phrases_full')
    parser.add_argument('--clean', action='store_true')
    return parser.parse_args()


def slugify(label: str) -> str:
    text = label.strip().lower().replace('_', ' ')
    text = re.sub(r'[^a-z0-9]+', '_', text)
    return text.strip('_')


def safe_name(text: str) -> str:
    return hashlib.md5(text.encode('utf-8'), usedforsecurity=False).hexdigest()[:10]


def prepare_dir(path: Path, clean: bool) -> None:
    if clean and path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def copy_class_dirs(source_dir: Path, source_name: str, output_dir: Path, rows: list[dict[str, str]]) -> None:
    if not source_dir.exists():
        return
    for class_dir in source_dir.iterdir():
        if not class_dir.is_dir():
            continue
        label = slugify(class_dir.name)
        target_dir = output_dir / label
        target_dir.mkdir(parents=True, exist_ok=True)
        for file in class_dir.rglob('*'):
            if not file.is_file() or file.suffix.lower() not in IMAGE_EXTENSIONS:
                continue
            target_name = f"{source_name}_{safe_name(str(file))}{file.suffix.lower()}"
            target_path = target_dir / target_name
            shutil.copy2(file, target_path)
            rows.append({'label': label, 'source': source_name, 'source_path': str(file), 'target_path': str(target_path.relative_to(output_dir))})


def extract_class_zips(source_dir: Path, source_name: str, output_dir: Path, rows: list[dict[str, str]]) -> None:
    if not source_dir.exists():
        return
    for zip_path in source_dir.glob('*.zip'):
        label = slugify(zip_path.stem)
        target_dir = output_dir / label
        target_dir.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(zip_path) as zf:
            for info in zf.infolist():
                if info.is_dir():
                    continue
                inner = Path(info.filename)
                if inner.suffix.lower() not in IMAGE_EXTENSIONS:
                    continue
                target_name = f"{source_name}_{safe_name(zip_path.name + '::' + info.filename)}{inner.suffix.lower()}"
                target_path = target_dir / target_name
                with zf.open(info) as src, target_path.open('wb') as dst:
                    shutil.copyfileobj(src, dst)
                rows.append({'label': label, 'source': source_name, 'source_path': f'{zip_path}!{info.filename}', 'target_path': str(target_path.relative_to(output_dir))})


def write_manifest(output_dir: Path, rows: list[dict[str, str]]) -> None:
    manifest = output_dir / 'manifest.csv'
    with manifest.open('w', newline='', encoding='utf-8') as fh:
        writer = csv.DictWriter(fh, fieldnames=['label', 'source', 'source_path', 'target_path'])
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    args = parse_args()
    prepare_dir(args.output_dir, args.clean)
    rows: list[dict[str, str]] = []
    copy_class_dirs(args.everyday_dir, 'everyday_phrases', args.output_dir, rows)
    copy_class_dirs(args.common_dir, 'common_phrases', args.output_dir, rows)
    extract_class_zips(args.real_life_dir, 'real_life_words', args.output_dir, rows)
    copy_class_dirs(args.csltr_word_dir, 'csltr_word_frames', args.output_dir, rows)
    write_manifest(args.output_dir, rows)
    print(f'Prepared unified word/phrase dataset at {args.output_dir}')
    print(f'Total copied samples: {len(rows)}')


if __name__ == '__main__':
    main()
