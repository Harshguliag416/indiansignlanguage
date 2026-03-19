from __future__ import annotations

import argparse
import csv
import re
import shutil
import zipfile
from collections import defaultdict
from pathlib import Path, PurePosixPath


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
DEFAULT_ARCHIVE = Path.home() / "Downloads" / "Dataset" / "archive (4).zip"


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Prepare a sentence-level frame sequence dataset from archive (4).zip."
    )
    parser.add_argument(
        "--archive-path",
        type=Path,
        default=DEFAULT_ARCHIVE,
        help=f"Path to the sentence-level archive (default: {DEFAULT_ARCHIVE})",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("training_data") / "sentences_top20",
        help="Directory where sentence samples will be extracted.",
    )
    parser.add_argument(
        "--top-k-labels",
        type=int,
        default=20,
        help="Keep the top K sentence labels by sample count.",
    )
    parser.add_argument(
        "--min-samples-per-label",
        type=int,
        default=5,
        help="Only keep sentence labels that have at least this many sample folders.",
    )
    parser.add_argument(
        "--max-samples-per-label",
        type=int,
        default=0,
        help="Optional cap per label. Use 0 for no cap.",
    )
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Delete the output directory before writing.",
    )
    return parser


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "_", text)
    return text.strip("_")


def parse_sentence_entry(entry_name: str) -> tuple[str, str] | None:
    parts = PurePosixPath(entry_name).parts
    if "Frames_Sentence_Level" not in parts:
        return None

    index = parts.index("Frames_Sentence_Level")
    if index + 3 >= len(parts):
        return None

    label = parts[index + 1].strip()
    sample_id = parts[index + 2].strip()
    suffix = PurePosixPath(entry_name).suffix.lower()
    if suffix not in IMAGE_EXTENSIONS:
        return None
    return label, sample_id


def collect_samples(archive_path: Path) -> dict[str, dict[str, list[str]]]:
    grouped: dict[str, dict[str, list[str]]] = defaultdict(lambda: defaultdict(list))
    with zipfile.ZipFile(archive_path) as zf:
        for info in zf.infolist():
            if info.is_dir():
                continue
            parsed = parse_sentence_entry(info.filename)
            if parsed is None:
                continue
            label, sample_id = parsed
            grouped[label][sample_id].append(info.filename)

    for label in grouped:
        for sample_id in grouped[label]:
            grouped[label][sample_id].sort()
    return grouped


def select_labels(
    grouped: dict[str, dict[str, list[str]]],
    min_samples_per_label: int,
    top_k_labels: int,
) -> list[str]:
    eligible = [
        (label, len(samples))
        for label, samples in grouped.items()
        if len(samples) >= min_samples_per_label
    ]
    eligible.sort(key=lambda item: (-item[1], item[0]))
    return [label for label, _ in eligible[:top_k_labels]]


def prepare_output_dir(output_dir: Path, clean: bool) -> None:
    if clean and output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)


def extract_selected_samples(
    archive_path: Path,
    output_dir: Path,
    grouped: dict[str, dict[str, list[str]]],
    selected_labels: list[str],
    max_samples_per_label: int,
) -> list[dict[str, str]]:
    manifest_rows: list[dict[str, str]] = []

    with zipfile.ZipFile(archive_path) as zf:
        for label in selected_labels:
            sample_ids = sorted(grouped[label])
            if max_samples_per_label:
                sample_ids = sample_ids[:max_samples_per_label]

            label_slug = slugify(label)
            for sample_id in sample_ids:
                sample_output_dir = output_dir / label_slug / sample_id
                sample_output_dir.mkdir(parents=True, exist_ok=True)

                frame_names = grouped[label][sample_id]
                for frame_name in frame_names:
                    target_path = sample_output_dir / PurePosixPath(frame_name).name
                    with zf.open(frame_name) as source, target_path.open("wb") as target:
                        shutil.copyfileobj(source, target)

                manifest_rows.append(
                    {
                        "label": label,
                        "label_slug": label_slug,
                        "sample_id": sample_id,
                        "frame_count": str(len(frame_names)),
                        "relative_dir": str(sample_output_dir.relative_to(output_dir)),
                    }
                )

    return manifest_rows


def write_manifest(output_dir: Path, manifest_rows: list[dict[str, str]]) -> None:
    manifest_path = output_dir / "manifest.csv"
    with manifest_path.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(
            csv_file,
            fieldnames=["label", "label_slug", "sample_id", "frame_count", "relative_dir"],
        )
        writer.writeheader()
        writer.writerows(manifest_rows)


def main() -> None:
    args = build_arg_parser().parse_args()
    prepare_output_dir(args.output_dir, args.clean)

    grouped = collect_samples(args.archive_path)
    selected_labels = select_labels(
        grouped,
        min_samples_per_label=args.min_samples_per_label,
        top_k_labels=args.top_k_labels,
    )

    if not selected_labels:
        raise SystemExit("No sentence labels matched the requested filters.")

    manifest_rows = extract_selected_samples(
        archive_path=args.archive_path,
        output_dir=args.output_dir,
        grouped=grouped,
        selected_labels=selected_labels,
        max_samples_per_label=args.max_samples_per_label,
    )
    write_manifest(args.output_dir, manifest_rows)

    print("Selected sentence labels:")
    for label in selected_labels:
        print(f"  {label}: {len(grouped[label])} samples")

    print(f"\nPrepared sentence dataset at {args.output_dir}")
    print(f"Manifest written to {args.output_dir / 'manifest.csv'}")


if __name__ == "__main__":
    main()
