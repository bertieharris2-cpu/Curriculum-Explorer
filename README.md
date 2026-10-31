# Curriculum Explorer — Bettws Curriculum pages

This repository turns the Bettws Master Dataset (an Excel workbook of maths and Preparing for
Adulthood learning statements) into three self-contained web pages:

- **Bettws Curriculum Explorer** — the staff version. Browse the maths curriculum by strand and
  progression step, open a statement's small steps and probing questions, switch to the PFA
  section, read the mapped enquiries, print tidy A4 lists, and make learning intention cards.
  It adds to an iPad home screen and works offline once opened. It carries only what a teacher
  needs on a Tuesday: none of the dataset's working columns, views or filters.
- **Bettws Maths Curriculum Hub** and **Bettws PFA Curriculum Hub** — Bertie's working views,
  with all the extra data (notes, rulings, the gap register, the structure grid, the WPS 3
  teaching order). They are the record of the earlier views and filters and keep building as
  they always have.

Nothing reads the spreadsheet live: each build bakes the dataset in. No login, no server, no
database, no analytics, no tracking of any kind.

## Where the pages are

| Page | GitHub Pages (no account needed) | claude.ai copy |
| --- | --- | --- |
| Curriculum Explorer (staff) | https://bertieharris2-cpu.github.io/Curriculum-Explorer/explorer/ | https://claude.ai/artifact/Y32QAUiZvCjnSHR4Nn14Jf |
| Curriculum Explorer (Bertie's version) | https://bertieharris2-cpu.github.io/Curriculum-Explorer/explorer-bertie/ | |
| Maths Curriculum Hub | https://bertieharris2-cpu.github.io/Curriculum-Explorer/bettws-maths-hub.html | https://claude.ai/artifact/G7ZgXPAjHHUDJkphQ8K5ty |
| PFA Curriculum Hub | https://bertieharris2-cpu.github.io/Curriculum-Explorer/bettws-pfa-hub.html | https://claude.ai/artifact/7ecDGZ4qhk3cJs66RNoXBf |

The landing page https://bertieharris2-cpu.github.io/Curriculum-Explorer/ links to all of them.
On an iPad, open the Explorer in Safari once, tap Share → **Add to Home Screen**, and it opens
like an app and works in the woods.

## Publishing a new dataset version

1. Drop the new `Bettws-Master-Dataset-v*.xlsx` into `dataset/`. The build always uses the
   highest-numbered file; two files with the same number stop the build.
2. Run the one command:
   ```
   make publish
   ```
   It runs **validate → extract → build → record** and then commits the dataset, `CHANGES.md`
   and `build/manifest.json` and pushes. GitHub Pages rebuilds every page from the push within
   a few minutes (progress under the **Actions** tab).
3. Ask Claude to republish the two hub files in `out/` to their claude.ai links above (and the
   Explorer to its link, if it has one). Those links stay the same.

Each step is also its own command: `make validate`, `make build` (everything into `out/`),
`make site` (the GitHub Pages copy in `site/`), `make serve` (open `site/` locally).

### If a check fails

`make validate` stops the build and nothing is published; the previous site stays live. It
says what failed in plain English, for example a missing sheet or column, a duplicate
`bettws_id` among live rows, or a layer row that names an id the dataset has never had. Fix
the workbook and run again. Warnings (a layer row pointing at a retired statement, an unknown
B Squared label) do not stop the build; the rows are dropped and listed in `CHANGES.md`.

### The change report

After each successful build `validate.py --record` writes the top of `CHANGES.md` in a
WAS / NOW format: statements added, retired, reworded or moved since the last recorded
build, by code and strand, plus the live counts by curriculum and strand. The record it
compares against is `build/manifest.json`; commit both with the dataset.

## The B Squared step column

`bsquared_step` on `Bettws_Statements` is coming from Bertie (v1.22 or later). It holds the
nearest B Squared step for each statement, one value (`2.2`) or several (`2.1, 2.2`), using the
labels of the BSquared_Archive sheet (`1.1` to `3.3`, and `Pre-4` to `Pre-6`). Until then, and
for any statement left blank, the value is "not set": the build does not fail, nothing is
guessed, and the build report counts how many live statements still have no step. When steps
exist the Explorer shows them as a small `B²` chip on each statement, lets staff filter search
results by step, and pre-fills the learning intention card's progression line from the chosen
statements.

## Files

| File | What it is |
| --- | --- |
| `dataset/` | the current `Bettws-Master-Dataset-v*.xlsx` |
| `validate.py` | the checks, the build report and `CHANGES.md` (`--record`) |
| `extract.py` | reads the workbook into `out/data.json` (hubs) and `out/explorer-data.json` (staff) |
| `build.py` | bakes the pages: `out/` by default, `site/` with `--site` |
| `explorer/` | the staff app: `index.html` shell, `app.css`, `app.js`, `design-tokens.json` (the design system's tokens, mirrored), `fonts/` (Atkinson Hyperlegible, OFL), `assets/` (logo, faces), `vendor/` (jsPDF, MIT), `sw.js` (offline cache for the site copy) |
| `explorer/private/` | git-ignored: the learner font for the card, if you have it (see below) |
| `hub_template.html` | the two hubs; `MODE` = `main` or `pfa` |
| `index_template.html` | the GitHub Pages landing page |
| `build/manifest.json` | the last recorded build, for the change report |
| `CHANGES.md` | the WAS / NOW change log |
| `tests/explorer.test.js` | drives the built Explorer in headless Chromium (`node tests/explorer.test.js`) |
| `CLAUDE.md` | the standing rules every Claude Code session reads first |
| `.github/workflows/pages.yml` | validates, builds and publishes the GitHub Pages site |

Needs Python 3 with `pandas`, `openpyxl` and `Pillow` (`pip install -r requirements.txt`).
The browser test needs Playwright with Chromium.

## The staff Explorer

- **Home:** "Browse the curriculum", and "My pupils" greyed out until phase 2.
- **Browse:** strand → progression step → statements, or the strand-by-step map as an
  alternative entry. The number spine is shown by level and phase ("WPS 2.2 · Phase 4 ·
  Unitising"). Algebra WPS 3 is in teaching order.
- **Statement card:** the "I can…" text exactly as the dataset has it, its code small at the
  end, "Why this matters" where a purpose line exists, level and ladder/exposure chips, and
  "Small steps and questions" behind a tap (L2 rows, L3 probes, the NCP "what counts" lines).
- **Search** across statement text, purpose lines and codes, with Ladder / Met again and again
  filters and, once the column exists, a B Squared step filter.
- **PFA section:** a clearly separate mode in the PFA colour with the Outcomes (life statements
  by area and `sort_order`), the Destinations (PFA-direct maths beyond the spine, by `pfa_area`)
  and the Number Route (the spine: goals in full, stepping stones quieter, main-only hidden).
- **Enquiries:** the mapped enquiries from Enquiry_Links, read-only, phase by phase, with the
  maths nested under the life goal it serves, and the line "Have an idea? Bring it to Bertie
  and he'll map it."
- **Print this list:** A4 with the green-and-gold double frame on every page; a phase or
  section title never strands at the foot of a page away from its statements; no text shrinks.
- **Learning intentions:** every statement has "Add to learning intentions". Chosen statements
  collect in a basket (up to six, and it says so plainly when full). "Make the card" opens a
  rebuild of the standalone Learning Intentions tool: date, up to six editable intentions with
  three faces on every row, live preview of one card and the whole A4 page, adjustable width
  (two across at 96 mm or narrower), copies, PDF download, open-to-print, and favourites with
  export and import (the file is the same format as the standalone tool's). The progression
  line shows the B Squared steps of the chosen statements and is left blank where none is
  recorded; staff can also switch steps on and off themselves. No pupil names go on the card.
- **Bertie's version** (`explorer-bertie/`) is the same app with the phase 2 "Profile builder"
  marked out on Home. The builder itself is phase 2.

### The learner font

The card uses *BMD Letters for Learners – Hatted J* when it can. Its author licenses it for
personal and classroom use only, so it is not in this public repository and not on GitHub
Pages. For a local build with the font, put the `.ttf` from the Learning Intentions tool into
`explorer/private/` (git-ignored) and run `make build`; without it the card prints in
Helvetica, and the preview uses the system font.

## Rules the pages follow (from Bertie's rulings — keep them)
- Maths hub shows main-curriculum statements only and carries **no PFA labels**: no
  pfa_class, pfa_area, purpose lines, thread tags or route counts (ruling 01-09).
- Staff Explorer main view (brief of 31-10): curriculum = main, no PFA labels, badges, counts or
  mentions anywhere. "Why this matters" is shown where a purpose line exists. The four
  `curriculum = both` statements belong to the strand "PFA Maths", so they appear in the PFA
  section only. The `notes` column is Bertie's working notes (most mention PFA) and stays out.
- PFA hub and PFA section: Outcomes = life statements by `sort_order`; Destinations =
  PFA-direct maths statements outside the number spine, grouped by `pfa_area` (fallback
  `strand`); Number Route = the spine with PFA-direct in full, feeders quieter,
  curriculum-internal hidden.
- Statement codes sit at the end of the line, small. Bettws ids are never renumbered.
- Ladder cells are teal, repeated-exposure cells sand, always with the word; `ladder_note`
  containing PROVISIONAL is flagged in the hubs as awaiting Bertie's tick (staff never see it).
- Algebra WPS 3 is shown in `presentation_order` (equals sign first), not code order.
- Print: A4, a phase/step bar never strands away from its statements (`.keep` wrapper around
  heading + first card, `break-inside: avoid` on cards). Never shrink text to save pages.
- Strand codes always appear with a plain-language reminder (`STRAND_SHORT` in extract.py).

## Known dataset quirks surfaced by the pages (not page bugs)
- PDM, Angles & Rotation and Probability statements carry level "WPS 2.3" although ruled
  one collapsed WPS 2 level — they appear in the 2.3 column of the structure grid and map.
- Layer refs like `STAT-3-30..35` (ranges) attach at strand level, not per statement.
- Layer rows for `PDM-3-05`, `SHP-3-05`, `CAL-3-05` and `PFA-MM-03` point at retired statements
  and are dropped (listed by `make validate`).
- Enquiry_Links rows with DCF codes are digital-competence outcomes, not Bettws statements;
  the Explorer shows their task text without a card.

## Adding a view
Hubs: add an entry to `VIEWS` in `hub_template.html`, a `vName()` renderer, and a branch in
`renderMain()`. Explorer: add a route in `render()` in `explorer/app.js` and a `vName()`
screen; use `card(s, opts)` for statements and `group()` / `phaseGroups()` for grouping so
the print rules come for free.
