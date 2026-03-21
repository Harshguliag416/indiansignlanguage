from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import shutil
from pathlib import Path

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a fixed-word dataset for Option B from prepared phrase data and your custom samples."
    )
    parser.add_argument(
        "--source-dir",
        type=Path,
        default=Path("training_data") / "phrases_full",
        help="Prepared phrase dataset with one folder per label.",
    )
    parser.add_argument(
        "--custom-dir",
        type=Path,
        default=Path("training_data") / "custom_words",
        help="Your own extra word images. Put samples in custom_words/<word>/",
    )
    parser.add_argument(
        "--targets-file",
        type=Path,
        default=Path("training") / "word_targets.json",
        help="JSON file describing the target words and aliases.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("training_data") / "words_live",
        help="Output dataset directory for the fixed-word model.",
    )
    parser.add_argument("--clean", action="store_true")
    parser.add_argument(
        "--min-samples-warning",
        type=int,
        default=20,
        help="Warn if a requested word ends up with fewer than this many images.",
    )
    return parser.parse_args()


def slugify(label: str) -> str:
    text = label.strip().lower().replace("_", " ")
    text = re.sub(r"[^a-z0-9]+", "_", text)
    return text.strip("_")


def safe_name(text: str) -> str:
    return hashlib.md5(text.encode("utf-8"), usedforsecurity=False).hexdigest()[:10]


def prepare_dir(path: Path, clean: bool) -> None:
    if clean and path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def iter_images(source_dir: Path):
    if not source_dir.exists() or not source_dir.is_dir():
        return []
    return [
        path
        for path in source_dir.rglob("*")
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    ]


def copy_images(files: list[Path], output_dir: Path, source_name: str, source_label: str, target_label: str, rows: list[dict[str, str]]) -> int:
    if not files:
        return 0

    target_dir = output_dir / target_label
    target_dir.mkdir(parents=True, exist_ok=True)
    copied = 0
    for file in files:
        target_name = f"{source_name}_{safe_name(str(file))}{file.suffix.lower()}"
        target_path = target_dir / target_name
        shutil.copy2(file, target_path)
        rows.append(
            {
                "label": target_label,
                "source": source_name,
                "source_label": source_label,
                "source_path": str(file),
                "target_path": str(target_path.relative_to(output_dir)),
            }
        )
        copied += 1
    return copied


def load_targets(targets_file: Path) -> list[dict[str, object]]:
    payload = json.loads(targets_file.read_text(encoding="utf-8"))
    targets = payload.get("targets") if isinstance(payload, dict) else None
    if not isinstance(targets, list) or not targets:
        raise ValueError(f"No targets found in {targets_file}")
    return targets


def write_manifest(output_dir: Path, rows: list[dict[str, str]]) -> None:
    manifest = output_dir / "manifest.csv"
    with manifest.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(
            fh,
            fieldnames=["label", "source", "source_label", "source_path", "target_path"],
        )
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    args = parse_args()
    prepare_dir(args.output_dir, args.clean)
    rows: list[dict[str, str]] = []
    summary: dict[str, dict[str, object]] = {}

    for item in load_targets(args.targets_file):
        raw_label = str(item.get("label") or "").strip()
        if not raw_label:
            continue
        label = slugify(raw_label)
        aliases = item.get("aliases") or [label]
        aliases = [slugify(str(alias)) for alias in aliases if str(alias).strip()]
        custom_files = iter_images(args.custom_dir / label)
        alias_counts: dict[str, int] = {}
        total = 0

        for alias in aliases:
            files = iter_images(args.source_dir / alias)
            alias_counts[alias] = len(files)
            total += copy_images(files, args.output_dir, "prepared_phrase", alias, label, rows)

        total += copy_images(custom_files, args.output_dir, "custom_word", label, label, rows)

        summary[label] = {
            "aliases": aliases,
            "prepared_counts": alias_counts,
            "custom_count": len(custom_files),
            "total_count": total,
            "status": "ready" if total else "missing",
            "warning": "low_samples" if 0 < total < args.min_samples_warning else "",
        }

    write_manifest(args.output_dir, rows)
    summary_payload = {
        "targets_file": str(args.targets_file),
        "source_dir": str(args.source_dir),
        "custom_dir": str(args.custom_dir),
        "output_dir": str(args.output_dir),
        "total_copied": len(rows),
        "missing_labels": [label for label, item in summary.items() if item["total_count"] == 0],
        "low_sample_labels": [
            label
            for label, item in summary.items()
            if 0 < int(item["total_count"]) < args.min_samples_warning
        ],
        "targets": summary,
    }
    (args.output_dir / "summary.json").write_text(
        json.dumps(summary_payload, indent=2),
        encoding="utf-8",
    )

    print(f"Prepared fixed-word dataset at {args.output_dir}")
    print(f"Total copied samples: {len(rows)}")
    if summary_payload["missing_labels"]:
        print("Missing labels:", ", ".join(summary_payload["missing_labels"]))
    if summary_payload["low_sample_labels"]:
        print("Low-sample labels:", ", ".join(summary_payload["low_sample_labels"]))


if __name__ == "__main__":
    main()
