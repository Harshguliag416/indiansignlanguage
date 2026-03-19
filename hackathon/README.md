# Hackathon Pack

This folder contains the materials for the ISL Bridge hackathon presentation.

## What gets generated

Running the generator script creates these files in `hackathon/output`:

- `isl_bridge_hackathon_master_pack.pdf`
- `isl_bridge_pitch_script.pdf`
- `isl_bridge_hourly_update_sheet.pdf`
- `working_brief.json`
- `working_brief.md`
- `learning_status.csv`
- `hourly_progress_log.csv`

## Source PDFs

The generator reads:

- `C:\Users\harsh\Downloads\Hackathon2026_ProblemStatement.pdf`
- `C:\Users\harsh\Downloads\Itenary .pdf`

## How to regenerate

```powershell
cd h:\HACKATHON\isl-bridge
python hackathon\generate_hackathon_pack.py
```

## Notes

- The pack is grounded in the current repo state.
- It confirms the `Open Innovation` track from the provided problem statement PDF.
- It presents the current scope honestly as `letters + words/phrases for the demo`, with sentence translation as a later milestone.
