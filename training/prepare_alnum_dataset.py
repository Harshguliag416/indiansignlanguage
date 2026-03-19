from __future__ import annotations

import argparse
import csv
import hashlib
import shutil
import string
import zipfile
from collections import Counter
from pathlib import Path, PurePosixPath


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
DEFAULT_DATASET_ROOT = Path.home() / "Downloads" / "Dataset"
ALNUM_LABELS = {str(i) for i in range(10)} | set(string.ascii_uppercase)


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Prepare an A-Z/0-9 ISL dataset from the downloaded zip archives."
    )
    parser.add_argument(
        "--dataset-root",
        type=Path,
        default=DEFAULT_DATASET_ROOT,
        help=f"Directory that contains the downloaded dataset archives (default: {DEFAULT_DATASET_ROOT})",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("training_data") / "alnum_stage1",
        help="Directory where the extracted training images will be written.",
    )
    parser.add_argument(
        "--include-large-alphabet",
        action="store_true",
        help="Include archive (2).zip and merge E1/E2 into E.",
    )
    parser.add_argument(
        "--include-supplemental-letter-zips",
        action="store_true",
        help="Include archive.zip and archive (6).zip as extra letter-only samples.",
    )
    parser.add_argument(
        "--max-per-class-per-source",
        type=int,
        default=0,
        help="Optional cap per class per archive. Use 0 for no cap.",
    )
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Delete the output directory before writing.",
    )
    return parser


def parse_archive_original_images(parts: tuple[str, ...]) -> str | None:
    if len(parts) >= 3 and parts[0] == "dataset" and parts[1] == "original_images":
        return normalize_label(parts[2])
    if len(parts) >= 2 and parts[0] == "original_images":
        return normalize_label(parts[1])
    return None


def parse_archive_indian(parts: tuple[str, ...]) -> str | None:
    if len(parts) >= 2 and parts[0] == "Indian":
        return normalize_label(parts[1])
    return None


def parse_archive_isl_dataset(parts: tuple[str, ...]) -> str | None:
    if len(parts) >= 2 and parts[0] == "ISL_Dataset":
        return normalize_label(parts[1])
    return None


def parse_archive_large_alphabet(parts: tuple[str, ...]) -> str | None:
    for index, value in enumerate(parts):
        if value == "English Alphabet" and index + 1 < len(parts):
            return normalize_large_alphabet_label(parts[index + 1])
    return None


def normalize_large_alphabet_label(label: str) -> str | None:
    label = label.strip().upper()
    if label in {"E1", "E2"}:
        return "E"
    return normalize_label(label)


def normalize_label(label: str) -> str | None:
    label = label.strip().upper()
    if not label:
        return None
    return label if label in ALNUM_LABELS else None


def sanitize_entry_name(entry_name: str) -> str:
    digest = hashlib.md5(entry_name.encode("utf-8"), usedforsecurity=False).hexdigest()[:8]
    basename = PurePosixPath(entry_name).name.replace(" ", "_")
    return f"{digest}_{basename}"


def archive_specs(include_large_alphabet: bool, include_supplemental: bool) -> list[tuple[str, str, callable]]:
    specs: list[tuple[str, str, callable]] = [
        ("archive (1).zip", "archive1", parse_archive_original_images),
        ("archive (3).zip", "archive3", parse_archive_indian),
    ]
    if include_supplemental:
        specs.extend(
            [
                ("archive.zip", "archive_zip", parse_archive_isl_dataset),
                ("archive (6).zip", "archive6", parse_archive_isl_dataset),
            ]
        )
    if include_large_alphabet:
        specs.append(("archive (2).zip", "archive2", parse_archive_large_alphabet))
    return specs


def prepare_output_dir(output_dir: Path, clean: bool) -> None:
    if clean and output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)


def extract_dataset(
    dataset_root: Path,
    output_dir: Path,
    include_large_alphabet: bool,
    include_supplemental: bool,
    max_per_class_per_source: int,
) -> tuple[Counter, Counter]:
    per_source_counts: Counter = Counter()
    per_label_counts: Counter = Counter()
    manifest_rows: list[dict[str, str]] = []

    for zip_name, source_name, parser in archive_specs(include_large_alphabet, include_supplemental):
        zip_path = dataset_root / zip_name
        if not zip_path.exists():
            print(f"Skipping missing archive: {zip_path}")
            continue

        print(f"Reading {zip_path} ...")
        class_counts_for_source: Counter = Counter()

        with zipfile.ZipFile(zip_path) as zf:
            for info in zf.infolist():
                if info.is_dir():
                    continue

                entry_path = PurePosixPath(info.filename)
                if entry_path.suffix.lower() not in IMAGE_EXTENSIONS:
                    continue

                label = parser(entry_path.parts)
                if label is None:
                    continue

                if max_per_class_per_source and class_counts_for_source[label] >= max_per_class_per_source:
                    continue

                class_counts_for_source[label] += 1
                per_source_counts[f"{source_name}:{label}"] += 1
                per_label_counts[label] += 1

                target_dir = output_dir / label
                target_dir.mkdir(parents=True, exist_ok=True)
                target_name = f"{source_name}_{sanitize_entry_name(info.filename)}"
                target_path = target_dir / target_name

                with zf.open(info) as source, target_path.open("wb") as target:
                    shutil.copyfileobj(source, target)

                manifest_rows.append(
                    {
                        "label": label,
                        "source": source_name,
                        "archive": zip_name,
                        "entry_name": info.filename,
                        "relative_path": str(target_path.relative_to(output_dir)),
                    }
                )

        print(
            f"  extracted {sum(class_counts_for_source.values())} images "
            f"across {len(class_counts_for_source)} classes from {zip_name}"
        )

    manifest_path = output_dir / "manifest.csv"
    with manifest_path.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(
            csv_file,
            fieldnames=["label", "source", "archive", "entry_name", "relative_path"],
        )
        writer.writeheader()
        writer.writerows(manifest_rows)

    return per_source_counts, per_label_counts


def main() -> None:
    parser = build_arg_parser()
    args = parser.parse_args()

    prepare_output_dir(args.output_dir, args.clean)
    per_source_counts, per_label_counts = extract_dataset(
        dataset_root=args.dataset_root,
        output_dir=args.output_dir,
        include_large_alphabet=args.include_large_alphabet,
        include_supplemental=args.include_supplemental_letter_zips,
        max_per_class_per_source=args.max_per_class_per_source,
    )

    print("\nPer-label totals:")
    for label in sorted(per_label_counts):
        print(f"  {label}: {per_label_counts[label]}")

    print("\nTop source/label combinations:")
    for source_label, count in per_source_counts.most_common(20):
        print(f"  {source_label}: {count}")

    print(f"\nPrepared dataset at {args.output_dir}")
    print(f"Manifest written to {args.output_dir / 'manifest.csv'}")


if __name__ == "__main__":
    main()
