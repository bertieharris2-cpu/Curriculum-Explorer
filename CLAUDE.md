# Curriculum Explorer — standing rules for Claude

This repository turns the Bettws master dataset into three outputs: the **staff Curriculum
Explorer** (`explorer/`, built to `out/bettws-curriculum-explorer.html` and `site/explorer/`),
plus Bertie's two working hubs (`hub_template.html` → the Maths and PFA hubs). The hubs are
Bertie's record of the earlier views and filters: keep them building as they do; the staff
Explorer must not carry their working columns or views.

## Start of every session

1. Look in `dataset/` for a newer `Bettws-Master-Dataset-v*.xlsx` than the one recorded in
   `build/manifest.json`. If there is one, say so and offer to rebuild (`make build`). Two files
   with the same version number: stop and report, never guess which is right.
2. Run `make validate` before building. If a check fails, do not publish; keep the previous
   site live and explain what failed in plain English.
3. After a successful build, `validate.py --record` writes `CHANGES.md` (WAS / NOW) and the
   build record. Commit both with the dataset.

## Content rules (non-negotiable, from Bertie's brief of 31-10-26)

- Show only `status = live`.
- **Never reword, shorten or truncate a statement.** The text is shown exactly as the dataset
  has it. The `bettws_id` sits small at the end of the line, never as a heading or a name.
- **Main view:** `curriculum = main`, and **no PFA labels, badges, counts or mentions anywhere**.
  No `pfa_class`, `pfa_area`, thread tags or route counts. (The four `curriculum = both`
  statements belong to the strand "PFA Maths", so they appear only in the PFA section.)
- **PFA section:** its own mode, in the PFA colour, with three parts named the Outcomes (life
  statements), the Destinations (PFA-direct maths beyond the number spine, by `pfa_area`) and
  the Number Route (the spine: goals in full, feeders quieter, curriculum-internal hidden).
- WPS 1–2 number statements are named by level and phase ("WPS 2.2 · Phase 4 · Unitising").
- Order statements by `sort_order`, then `phase_number`, then dataset row order. Algebra WPS 3
  follows `presentation_order`.
- "Why this matters" is the `purpose` line, where one exists. Small steps (L2 rows) and
  probing questions (L3 rows) sit behind a tap.
- Staff never see: BSquared_Archive, Gaps_Register, Checks, Mappings, CfW_Reference, README, or
  the columns `qc_verdict`, `qc_comment`, `source`, `boundary_note`, `ladder_note`, `notes`.
- `bsquared_step` (coming from Bertie, v1.22 or later): one or several B Squared steps per
  statement (1.1–3.3, Pre-4 to Pre-6). Missing or unknown values are "not set": the build must
  not fail and must not guess. The learning intention card's progression line is left blank
  for a statement with no step.
- Strand codes always carry a plain-language reminder (`STRAND_SHORT` in `extract.py`).

## Design rules

- Follow the Bettws Curriculum Explorer design system (`explorer/design-tokens.json`, mirrored
  from https://claude.ai/artifact/DzQhsWeqeNxwiV4RWLrHZ5). Every colour, size and type value is
  a token; no hard-coded colours; corner radius 0 everywhere; Atkinson Hyperlegible Next.
- Orange (`accent`) is only the active-state bar, the one hero button on a screen, and a small
  confirmation highlight. Never text, never a large background.
- Never rely on colour alone: ladder/exposure, PFA and gaps always carry a word or icon.
- Plain British English, sentence case, no emoji, no codes as headings.
- Print: A4, the green-and-gold double frame on every page, never shrink text to save pages, and
  **never leave a phase or section title at the foot of a page apart from its statements**
  (`.keep` wraps a heading with its first card; cards never split).
- Works offline once opened, with no CDN links, web fonts or network calls. No login, server,
  database, analytics or tracking.

## Privacy

- No pupil data in the repository or the published site, ever. Profiles and records (phase 2)
  stay on the teacher's iPad. `explorer/private/` is git-ignored.
- The learner font for the card (BMD Letters for Learners) is licensed by its author for
  personal and classroom use only. Keep it out of the public repository: drop the `.ttf` into
  `explorer/private/` for a local build and the card uses it; otherwise the card uses Helvetica.

## Checks

- `make validate` (dataset), `make build` (everything into `out/`), `make site` (GitHub Pages
  copy). `tests/explorer.test.js` drives the built Explorer in headless Chromium:
  `node tests/explorer.test.js`.
