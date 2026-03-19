from __future__ import annotations

import csv
import json
import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "hackathon" / "output"
PROBLEM_PDF = Path(r"C:\Users\harsh\Downloads\Hackathon2026_ProblemStatement.pdf")
ITINERARY_PDF = Path(r"C:\Users\harsh\Downloads\Itenary .pdf")


TEAM = [
    {
        "name": "Tushar Bhatt",
        "role": "Team Leader & Frontend Developer",
        "focus": "Owns the demo flow, app UX, and final presentation transitions.",
    },
    {
        "name": "Harsh Gulia",
        "role": "Backend Developer",
        "focus": "Owns backend APIs, model-loading flow, deployment explanation, and integration status.",
    },
    {
        "name": "Vikas",
        "role": "Database Engineer",
        "focus": "Owns the data-flow explanation and positions MongoDB as current or future support depending on live usage.",
    },
    {
        "name": "Arjun",
        "role": "AI Model Integration",
        "focus": "Owns datasets, model pipeline, training story, and the learned-versus-pending tracker.",
    },
]

SPEAKING_ORDER = [
    "Tushar: intro + frontend/demo",
    "Harsh: backend/integration",
    "Arjun: AI/model/data",
    "Vikas: database/scale/roadmap",
]

PERCENT_RULES = [
    "0-20%: setup and understanding",
    "20-40%: core pipeline assembled",
    "40-60%: partial working demo",
    "60-80%: stable demo path with backups",
    "80-100%: polished presentation-ready system",
]

DEFAULT_OBSERVER_ANSWERS = [
    (
        "What are you doing now?",
        "We are stabilizing the letters and phrase recognition demo and validating the live prediction flow.",
    ),
    (
        "How much is done?",
        "Core architecture and dataset pipeline are in place; current focus is demo stability and model integration.",
    ),
    (
        "How much is left?",
        "Main remaining work is final integration, validation, and presentation polish.",
    ),
    (
        "What have you completed?",
        "Dataset organization, model-training groundwork, frontend/backend structure, and the current recognition demo path.",
    ),
]

JUDGE_QA = [
    (
        "Why does ISL Bridge matter?",
        "It reduces the communication gap between sign language users and non-signers in everyday and urgent situations.",
    ),
    (
        "Why focus on letters and phrases first?",
        "That gives us a reliable demo-ready foundation with clear user value, while keeping the model scope realistic for the hackathon timeframe.",
    ),
    (
        "Why defer sentence translation?",
        "Sentence recognition needs longer sequence modeling and tighter evaluation; we already prepared the data path, but we prioritized reliability for the live demo.",
    ),
    (
        "Why MediaPipe?",
        "MediaPipe gives us efficient hand-landmark extraction, which reduces background noise and keeps the system practical for real-time use.",
    ),
    (
        "Why TensorFlow?",
        "It fits our current training and serving setup, supports quick experimentation, and is easy to integrate with the existing Python backend.",
    ),
    (
        "What data are you using?",
        "We combined public ISL datasets for alphabet, words, phrases, and sentence-level research, then prepared separate training paths for the hackathon scope.",
    ),
    (
        "What is the current accuracy?",
        "We only quote measured benchmark results. The current hackathon story is reliability-focused for letters and phrases, not a claim of full sentence mastery.",
    ),
    (
        "What is already working?",
        "The backend model-serving path, dataset preparation pipeline, and the demo app flow are in place; the demo is centered on stable letters and phrase recognition.",
    ),
    (
        "How will this scale after the hackathon?",
        "The next milestones are real landmark capture in the app, improved phrase training, then sentence-level sequence models and multilingual output.",
    ),
    (
        "Where does MongoDB fit?",
        "MongoDB is positioned for history, analytics, user feedback, and future personalization rather than being the core blocker for sign prediction.",
    ),
    (
        "How can judges run it?",
        "We keep the code in Git, use free-tier-friendly services, and can provide either a live demo path or a recorded end-to-end fallback if local setup is inconvenient.",
    ),
]

RISK_AND_FALLBACK = [
    "Live demo network or backend issue: keep a screen recording and screenshots ready.",
    "Model confidence instability: demo only a curated set of letters and high-value phrases.",
    "Judge setup friction: provide a clear README and a backup recorded walkthrough.",
    "Unfinished sentence support: frame it as the next milestone backed by already-prepared datasets and pipeline work.",
]

ROADMAP = [
    "Milestone 1: replace simulated landmarks with real MediaPipe extraction in the app.",
    "Milestone 2: deploy a stronger letters-and-phrases model and validate on curated demo classes.",
    "Milestone 3: add sentence-level sequence recognition and improve translation output.",
]


@dataclass
class EventBrief:
    track: str
    duration: str
    team_size: str
    deliverable: str
    pitch_duration: str
    judging_dimensions: list[str]
    rules: list[str]
    requirements: list[str]
    bonus: list[str]
    schedule: list[tuple[str, str, str]]


def clean_text(text: str) -> str:
    return " ".join((text or "").replace("\x00", " ").split())


def read_pdf_pages(path: Path) -> list[str]:
    reader = PdfReader(str(path))
    return [clean_text(page.extract_text() or "") for page in reader.pages]


def find_page_containing(pages: Iterable[str], needle: str) -> int:
    for index, page in enumerate(pages, start=1):
        if needle.lower() in page.lower():
            return index
    raise ValueError(f"Could not find '{needle}' in PDF text.")


def parse_open_innovation(problem_pages: list[str], itinerary_pages: list[str]) -> EventBrief:
    open_page = find_page_containing(problem_pages, "Open Innovation Challenge")
    section_text = " ".join(problem_pages[open_page - 1 : open_page + 2])
    itinerary_text = " ".join(itinerary_pages)

    def extract(pattern: str, default: str) -> str:
        match = re.search(pattern, section_text, re.IGNORECASE)
        return match.group(1).strip() if match else default

    track = extract(r"Track\s+([A-Za-z ]+?)\s+Background", "Open Innovation")
    duration = extract(r"Duration\s+([0-9]+ Hours)", "36 Hours")
    team_size = extract(r"Team Size\s+([0-9]+ ?- ?[0-9]+ Members|[0-9]+ ?Members)", "2-4 Members")
    deliverable = extract(r"Deliverable\s+([A-Za-z ]+?)\s+Track", "Any Format")
    pitch_duration = extract(r"answer questions clearly in a ([0-9]+-minute pitch)", "5-minute pitch")

    judging_dimensions = [
        "Problem Clarity & Validation",
        "Solution Originality & Insight",
        "Technical Execution",
        "Potential Impact",
        "Presentation & Communication",
    ]
    requirements = [
        "Write a problem statement in the README covering user group, pain point, and why existing solutions are insufficient.",
        "Build a working prototype judges can operate end to end.",
        "Document deployment path, next milestones, and privacy or safety considerations.",
        "Keep the code original, version-controlled, and technically substantial for a 36-hour build.",
    ]
    bonus = [
        "Conduct at least 3 structured user interviews and share insights.",
        "Deploy a public live version on free-tier hosting.",
        "Add an in-product feedback loop or analytics dashboard.",
        "Explain a sustainable operational or financial model beyond the hackathon.",
    ]
    rules = [
        "Declare Open Innovation at registration and do not switch tracks after the hackathon begins.",
        "Keep code version-controlled in a public or judge-shared Git repository.",
        "Use sandbox or test environments; do not expose production credentials.",
        "Prefer free tiers and open-source tools only.",
        "Submit through the hackathon portal before the 36-hour deadline.",
    ]

    return EventBrief(
        track=track,
        duration=duration,
        team_size=team_size,
        deliverable=deliverable,
        pitch_duration=pitch_duration,
        judging_dimensions=judging_dimensions,
        rules=rules,
        requirements=requirements,
        bonus=bonus,
        schedule=parse_itinerary(itinerary_text),
    )


def parse_itinerary(text: str) -> list[tuple[str, str, str]]:
    schedule: list[tuple[str, str, str]] = []
    matches = list(re.finditer(r"(\d{1,2}:\d{2}:\d{2}\s+[AP]M)\s+(.+?)(?=(\d{1,2}:\d{2}:\d{2}\s+[AP]M)|$)", text))
    day = "Day 1"
    for match in matches:
        start = match.start()
        prefix = text[max(0, start - 80) : start]
        if "DAY 2" in prefix:
            day = "Day 2"
        schedule.append((day, match.group(1), match.group(2).strip()))
    return schedule


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def load_metrics(path: Path) -> dict:
    if not path.exists():
        return {}
    return load_json(path)


def count_manifest_rows(path: Path) -> int:
    if not path.exists():
        return 0
    with path.open("r", encoding="utf-8", newline="") as handle:
        return max(sum(1 for _ in handle) - 1, 0)


def list_training_labels(path: Path) -> list[str]:
    if not path.exists():
        return []
    return sorted([item.name for item in path.iterdir() if item.is_dir()])


def bytes_to_gb(total_bytes: int) -> float:
    return round(total_bytes / (1024 ** 3), 2)


def summarize_public_datasets(base: Path) -> tuple[int, int, float]:
    directories = [item for item in base.iterdir() if item.is_dir()]
    file_count = 0
    byte_count = 0
    for directory in directories:
        for file_path in directory.rglob("*"):
            if file_path.is_file():
                file_count += 1
                byte_count += file_path.stat().st_size
    return len(directories), file_count, bytes_to_gb(byte_count)


def get_current_state() -> dict:
    backend_labels = list(load_json(ROOT / "backend" / "model" / "label_map.json").values())
    alnum_metrics = load_metrics(ROOT / "training_output" / "alnum_stage2_bench" / "metrics.json")
    sentence_metrics = load_metrics(ROOT / "training_output" / "sentences_bench" / "metrics.json")
    alnum_labels = list_training_labels(ROOT / "training_data" / "alnum_full")
    phrase_labels = list_training_labels(ROOT / "training_data" / "phrases_full")
    public_dataset_count, public_file_count, public_size_gb = summarize_public_datasets(ROOT / "public_datasets")

    return {
        "backend_labels": backend_labels,
        "backend_sign_count": len(backend_labels),
        "alnum_metrics": alnum_metrics,
        "sentence_metrics": sentence_metrics,
        "alnum_labels": alnum_labels,
        "phrase_labels": phrase_labels,
        "alnum_samples": count_manifest_rows(ROOT / "training_data" / "alnum_full" / "manifest.csv"),
        "phrase_samples": count_manifest_rows(ROOT / "training_data" / "phrases_full" / "manifest.csv"),
        "public_dataset_count": public_dataset_count,
        "public_file_count": public_file_count,
        "public_size_gb": public_size_gb,
        "frontend_landmarks_are_simulated": True,
        "backend_model_shape": "63 landmark values -> 29 classes",
    }


def build_problem_summary() -> str:
    return (
        "ISL Bridge addresses the communication gap between Indian Sign Language users and "
        "people who do not understand signing in classrooms, hospitals, help desks, and urgent situations. "
        "Existing communication tools rarely translate hand signs in real time in an accessible, low-cost way. "
        "Our prototype uses camera input, MediaPipe hand-landmark extraction, TensorFlow-based recognition, "
        "and a lightweight app interface to convert signs into readable and speakable output. "
        "For the hackathon, we are focusing on a reliable letters-and-phrases demo rather than claiming full "
        "sentence translation, while keeping the architecture ready for sequence-based expansion afterward."
    )


def category_of_label(label: str) -> str:
    if label in {"del", "nothing", "space"}:
        return "control"
    if len(label) == 1 and label.isdigit():
        return "digit"
    if len(label) == 1 and label.isalpha() and label.upper() == label:
        return "letter"
    return "phrase"


def build_learning_status_rows(state: dict) -> list[dict]:
    backend_set = set(state["backend_labels"])
    alnum_set = set(state["alnum_labels"])
    phrase_set = set(state["phrase_labels"])
    all_labels = sorted(backend_set | alnum_set | phrase_set, key=lambda value: (category_of_label(value), value))

    rows = []
    for label in all_labels:
        in_backend = label in backend_set
        in_alnum = label in alnum_set
        in_phrase = label in phrase_set
        if in_backend:
            status = "live_in_backend"
        elif in_alnum or in_phrase:
            status = "prepared_not_deployed"
        else:
            status = "not_prepared"
        rows.append(
            {
                "category": category_of_label(label),
                "label": label,
                "status": status,
                "in_current_backend_model": "yes" if in_backend else "no",
                "in_prepared_alnum_dataset": "yes" if in_alnum else "no",
                "in_prepared_phrase_dataset": "yes" if in_phrase else "no",
            }
        )
    return rows


def write_csv(path: Path, rows: list[dict]) -> None:
    if not rows:
        return
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def build_hourly_progress_rows(schedule: list[tuple[str, str, str]]) -> list[dict]:
    rows = []
    for day, time_text, event in schedule:
        if "Reporting Time" not in event and "Evaluation" not in event and "Presentation" not in event:
            continue
        rows.append(
            {
                "day": day,
                "time": time_text,
                "checkpoint": event,
                "owner": "",
                "completed_last_hour": "",
                "working_now": "",
                "next_step": "",
                "blocker": "",
                "percent_complete": "",
                "left_before_demo": "",
            }
        )
    return rows


def styles():
    base = getSampleStyleSheet()
    base.add(
        ParagraphStyle(
            name="TitleCenter",
            parent=base["Title"],
            alignment=TA_CENTER,
            fontSize=24,
            leading=30,
            textColor=colors.HexColor("#0F172A"),
        )
    )
    base.add(
        ParagraphStyle(
            name="Section",
            parent=base["Heading2"],
            fontSize=15,
            leading=20,
            textColor=colors.HexColor("#0A6E4F"),
            spaceAfter=8,
        )
    )
    base.add(
        ParagraphStyle(
            name="BodyTight",
            parent=base["BodyText"],
            fontSize=10,
            leading=14,
            spaceAfter=5,
        )
    )
    base.add(
        ParagraphStyle(
            name="Small",
            parent=base["BodyText"],
            fontSize=9,
            leading=12,
            spaceAfter=4,
        )
    )
    return base


def bullet_lines(items: Iterable[str]) -> str:
    return "<br/>".join(f"&bull; {item}" for item in items)


def build_table(data: list[list[str]], col_widths: list[float]) -> Table:
    table = Table(data, colWidths=col_widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#D9F4EA")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#0F172A")),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#94A3B8")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("PADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def generate_master_pdf(path: Path, brief: EventBrief, state: dict) -> None:
    s = styles()
    doc = SimpleDocTemplate(str(path), pagesize=A4, leftMargin=40, rightMargin=40, topMargin=40, bottomMargin=40)
    story = [
        Paragraph("ISL Bridge - Real-Time Sign Language Translator", s["TitleCenter"]),
        Spacer(1, 8),
        Paragraph("Hackathon Master Pack", s["Heading2"]),
        Paragraph(
            f"Confirmed track: <b>{brief.track}</b> | Duration: <b>{brief.duration}</b> | Pitch: <b>{brief.pitch_duration}</b>",
            s["BodyTight"],
        ),
        Paragraph(
            "Hackathon-ready scope: letters and common words/phrases for a reliable demo. Sentence translation is positioned as the next milestone.",
            s["BodyTight"],
        ),
        Spacer(1, 8),
        Paragraph("Team", s["Section"]),
        build_table(
            [["Name", "Role", "Focus"]]
            + [[member["name"], member["role"], member["focus"]] for member in TEAM],
            [1.4 * inch, 2.0 * inch, 3.7 * inch],
        ),
        Spacer(1, 10),
        Paragraph("Problem Statement Summary", s["Section"]),
        Paragraph(build_problem_summary(), s["BodyTight"]),
        Paragraph("Open Innovation Requirements", s["Section"]),
        Paragraph(bullet_lines(brief.requirements), s["BodyTight"]),
        Paragraph("Judging Dimensions", s["Section"]),
        Paragraph(bullet_lines(brief.judging_dimensions), s["BodyTight"]),
        Paragraph("Rules and Constraints", s["Section"]),
        Paragraph(bullet_lines(brief.rules), s["BodyTight"]),
        Paragraph("Hackathon Schedule", s["Section"]),
        build_table([["Day", "Time", "Event"]] + [list(item) for item in brief.schedule], [0.9 * inch, 1.3 * inch, 4.9 * inch]),
        Spacer(1, 10),
        Paragraph("Current Technical State", s["Section"]),
        Paragraph(
            bullet_lines(
                [
                    f"Backend currently serves {state['backend_model_shape']} with {state['backend_sign_count']} live labels.",
                    "Current backend label map covers A-Z plus del, nothing, and space.",
                    f"Prepared training data currently includes {len(state['alnum_labels'])} alphanumeric labels across {state['alnum_samples']} samples.",
                    f"Prepared phrase data currently includes {len(state['phrase_labels'])} labels across {state['phrase_samples']} samples.",
                    f"Public dataset pool in the repo: {state['public_dataset_count']} datasets, {state['public_file_count']} files, about {state['public_size_gb']} GB.",
                    "Frontend demo screen still simulates landmarks, so the presentation must distinguish current live serving from the next integration step.",
                ]
            ),
            s["BodyTight"],
        ),
        Paragraph("Measured Benchmark Notes", s["Section"]),
        Paragraph(
            bullet_lines(
                [
                    f"Alphanumeric stage benchmark top-3 accuracy: {round(state['alnum_metrics'].get('top3_accuracy', 0) * 100, 2)}%.",
                    f"Sentence benchmark top-3 accuracy: {round(state['sentence_metrics'].get('top3_accuracy', 0) * 100, 2)}%.",
                    "Use these only when asked. The main demo story is reliability and scope discipline, not headline accuracy claims.",
                ]
            ),
            s["BodyTight"],
        ),
        Paragraph("Demo Flow", s["Section"]),
        Paragraph(
            bullet_lines(
                [
                    "Problem and impact",
                    "Input capture",
                    "MediaPipe landmark extraction",
                    "Backend/model prediction",
                    "Readable or speakable output",
                    "Roadmap to sentence-level translation",
                ]
            ),
            s["BodyTight"],
        ),
        Paragraph("Observer Update Template", s["Section"]),
        Paragraph(
            bullet_lines(
                [
                    "What we completed in the last hour",
                    "What is working now",
                    "What we are doing next",
                    "What risk/blocker remains",
                    "Estimated percent complete",
                    "What is left before demo readiness",
                ]
            ),
            s["BodyTight"],
        ),
        Paragraph("Percent-Complete Rubric", s["Section"]),
        Paragraph(bullet_lines(PERCENT_RULES), s["BodyTight"]),
        Paragraph("Default Observer Answers", s["Section"]),
        Paragraph(bullet_lines([f"{question} {answer}" for question, answer in DEFAULT_OBSERVER_ANSWERS]), s["BodyTight"]),
        Paragraph("Judge Q&A", s["Section"]),
        Paragraph(bullet_lines([f"{question} {answer}" for question, answer in JUDGE_QA]), s["Small"]),
        Paragraph("Risk and Fallback Plan", s["Section"]),
        Paragraph(bullet_lines(RISK_AND_FALLBACK), s["BodyTight"]),
        Paragraph("Next Milestones", s["Section"]),
        Paragraph(bullet_lines(ROADMAP), s["BodyTight"]),
        Paragraph("Speaking Order", s["Section"]),
        Paragraph(bullet_lines(SPEAKING_ORDER), s["BodyTight"]),
    ]
    doc.build(story)


def generate_pitch_pdf(path: Path) -> None:
    s = styles()
    doc = SimpleDocTemplate(str(path), pagesize=A4, leftMargin=40, rightMargin=40, topMargin=40, bottomMargin=40)
    story = [
        Paragraph("ISL Bridge - 1 Minute Pitch and Demo Script", s["TitleCenter"]),
        Spacer(1, 10),
        Paragraph(
            "We built ISL Bridge to reduce the communication gap between sign language users and non-signers. "
            "Our prototype uses camera input, MediaPipe hand landmarks, and TensorFlow-based recognition to convert signs into readable and speakable output.",
            s["BodyTight"],
        ),
        Paragraph(
            "For the hackathon, we focused on the most reliable and demo-ready layer: letters and high-value words or phrases. "
            "That let us build a practical end-to-end prototype instead of over-claiming sentence translation before the pipeline was stable.",
            s["BodyTight"],
        ),
        Paragraph(
            "We already prepared the broader dataset and training path for sentence-level expansion after the event. "
            "So what you see today is a focused, usable assistive-technology demo with a clear roadmap to grow into richer ISL translation.",
            s["BodyTight"],
        ),
        Spacer(1, 10),
        Paragraph("Demo Sequence", s["Section"]),
        Paragraph(
            bullet_lines(
                [
                    "Tushar: introduce the problem, user, and live demo screen.",
                    "Harsh: explain backend prediction flow and how the model is served.",
                    "Arjun: explain datasets, model training path, and why letters plus phrases is the current scope.",
                    "Vikas: explain how the system scales with persistence, feedback, analytics, and future platform features.",
                ]
            ),
            s["BodyTight"],
        ),
    ]
    doc.build(story)


def generate_hourly_pdf(path: Path, schedule: list[tuple[str, str, str]]) -> None:
    s = styles()
    doc = SimpleDocTemplate(str(path), pagesize=A4, leftMargin=36, rightMargin=36, topMargin=36, bottomMargin=36)
    filtered = [item for item in schedule if "Reporting Time" in item[2] or "Evaluation" in item[2] or "Presentation" in item[2]]
    data = [["Day", "Time", "Checkpoint", "Status Notes"]] + [[day, time_text, event, ""] for day, time_text, event in filtered]
    story = [
        Paragraph("ISL Bridge - Hourly Observer Update Sheet", s["TitleCenter"]),
        Spacer(1, 8),
        Paragraph(
            "Use the same short structure every time: what we completed, what is working now, what is next, blocker, percent complete, and what is left.",
            s["BodyTight"],
        ),
        build_table(data, [0.8 * inch, 1.2 * inch, 3.0 * inch, 2.1 * inch]),
        Spacer(1, 10),
        Paragraph("Percent Rubric", s["Section"]),
        Paragraph(bullet_lines(PERCENT_RULES), s["BodyTight"]),
    ]
    doc.build(story)


def generate_working_brief_json(path: Path, brief: EventBrief, state: dict) -> None:
    payload = {
        "track": brief.track,
        "duration": brief.duration,
        "team_size": brief.team_size,
        "deliverable": brief.deliverable,
        "pitch_duration": brief.pitch_duration,
        "judging_dimensions": brief.judging_dimensions,
        "requirements": brief.requirements,
        "bonus": brief.bonus,
        "rules": brief.rules,
        "schedule": [{"day": day, "time": time_text, "event": event} for day, time_text, event in brief.schedule],
        "team": TEAM,
        "repo_state": state,
        "speaking_order": SPEAKING_ORDER,
    }
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def generate_working_brief_markdown(path: Path, brief: EventBrief, state: dict) -> None:
    lines = [
        "# ISL Bridge Working Brief",
        "",
        f"- Track: `{brief.track}`",
        f"- Duration: `{brief.duration}`",
        f"- Team size rule: `{brief.team_size}`",
        f"- Deliverable: `{brief.deliverable}`",
        f"- Pitch duration: `{brief.pitch_duration}`",
        "",
        "## Confirmed Schedule",
        "",
    ]
    for day, time_text, event in brief.schedule:
        lines.append(f"- {day} {time_text}: {event}")
    lines.extend(
        [
            "",
            "## Current Repo State",
            "",
            f"- Live backend labels: `{state['backend_sign_count']}`",
            f"- Prepared alphanumeric labels: `{len(state['alnum_labels'])}` across `{state['alnum_samples']}` samples",
            f"- Prepared phrase labels: `{len(state['phrase_labels'])}` across `{state['phrase_samples']}` samples",
            f"- Public dataset pool: `{state['public_dataset_count']}` datasets, `{state['public_file_count']}` files, `{state['public_size_gb']}` GB",
            "- Frontend demo screen still uses simulated landmarks today.",
            "",
            "## Team",
            "",
        ]
    )
    for member in TEAM:
        lines.append(f"- {member['name']} - {member['role']}: {member['focus']}")
    lines.extend(["", "## Speaking Order", ""])
    lines.extend([f"- {entry}" for entry in SPEAKING_ORDER])
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    problem_pages = read_pdf_pages(PROBLEM_PDF)
    itinerary_pages = read_pdf_pages(ITINERARY_PDF)
    brief = parse_open_innovation(problem_pages, itinerary_pages)
    state = get_current_state()

    learning_status_rows = build_learning_status_rows(state)
    hourly_rows = build_hourly_progress_rows(brief.schedule)

    write_csv(OUTPUT_DIR / "learning_status.csv", learning_status_rows)
    write_csv(OUTPUT_DIR / "hourly_progress_log.csv", hourly_rows)
    generate_working_brief_json(OUTPUT_DIR / "working_brief.json", brief, state)
    generate_working_brief_markdown(OUTPUT_DIR / "working_brief.md", brief, state)
    generate_master_pdf(OUTPUT_DIR / "isl_bridge_hackathon_master_pack.pdf", brief, state)
    generate_pitch_pdf(OUTPUT_DIR / "isl_bridge_pitch_script.pdf")
    generate_hourly_pdf(OUTPUT_DIR / "isl_bridge_hourly_update_sheet.pdf", brief.schedule)

    status_counts = Counter(row["status"] for row in learning_status_rows)
    print("Hackathon pack generated.")
    print(f"Output directory: {OUTPUT_DIR}")
    print(f"Learning status counts: {dict(status_counts)}")
    print(f"Schedule checkpoints captured: {len(hourly_rows)}")


if __name__ == "__main__":
    main()
