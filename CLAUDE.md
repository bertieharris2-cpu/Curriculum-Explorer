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
- `bsquared_step` (from v1.22): one or several B Squared steps per statement (1.1–3.3, Pre-4 to
  Pre-6), or a WPS fallback label ("WPS 1", "WPS 2.1", "WPS 2.2", "WPS 2.3", "WPS 2.1/2.2",
  "WPS 3", optionally with "+") where B Squared has no equivalent (ruled 01-11-26). Anything
  else is "not set": the build must not fail and must not guess. The card's progression line
  shows B Squared steps only; a fallback label is shown as a chip but never written on the card.
- Layer sheets are found by name (every `*_Layers` sheet, plus `Algebra_WPS3_Detail` and
  `PFA_Layers`); a blank `ref` repeats the one above. Staff see L2-step / L2-detail (small steps),
  L2-subdetail (nested), L2-variation, L3-probe and L3-pattern-probe (questions to ask),
  L3-ask-yourself (for the adult), L2-what-counts, L3-misconception, and the teaching notes
  (L1-intro, L1-teaching-note, L2-advice, L1-example, L1-related, L1-secure-first). Working rows
  (L1-note, pending, ruling, L1-wording-proposal, L1-proposed-statement, L1-nsm-ref,
  L1-teach-order, context-tag) stay in the hubs.
- Strand codes always carry a plain-language reminder (`STRAND_SHORT` in `extract.py`).

## Design rules

- The look is Bertie's reviewed prototype of 31-10 (Claude Design on Opus): `explorer/proto-core.css`
  is its stylesheet, lifted verbatim, and `explorer/app.css` adds only what the real app needs
  (PFA mode, print, the card maker). Change the look there, not in the markup. Lexend for text,
  Atkinson Hyperlegible Mono for codes, small default type (13.5px) with the three-step text-size
  control; one green side menu of strands in six families; levels side by side on a rail you
  slide across; statements as plain rows that open into bulleted small steps; corner radius 0.
  The design system artifact (https://claude.ai/artifact/DzQhsWeqeNxwiV4RWLrHZ5) still describes
  the first build and needs bringing into line with this look.
- Orange (`--flame`) is only the active-state mark, the one main button on a screen and the
  chosen state of the + button. Never text, never a large background.
- Bertie's version (`explorer-bertie`) alone carries "How strands are taught" (`explorer/shapes.js`,
  the prototype's look-book module) and Review mode (notes to the artifact's `db`). The staff
  version never gets either: no database, nothing tracked.
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
  copy). `tests/explorer.test.js` drives both built Explorers in headless Chromium:
  `node tests/explorer.test.js` (`SHOTS=1` saves screenshots and a print PDF to `out/shots/`).

## Links

- Staff Explorer: https://claude.ai/artifact/Y32QAUiZvCjnSHR4Nn14Jf · Bertie's version (review
  notes, strand shapes): https://claude.ai/artifact/EwortvdBmz4MYYCVGdoBTm · GitHub Pages:
  https://bertieharris2-cpu.github.io/Curriculum-Explorer/ · the hubs: see `build.py`.
