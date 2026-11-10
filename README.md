# Curriculum Explorer — Bettws Curriculum pages

This repository turns the Bettws Master Dataset (an Excel workbook of maths and Preparing for
Adulthood learning statements) into three self-contained web pages:

- **Bettws Curriculum Explorer** — the staff version. A green side menu of strands in six
  families, progression levels side by side on a rail you slide across, statements as plain
  rows that open into bulleted small steps and questions, a search that reads the small steps
  too, the PFA section as its own mode, the mapped enquiries, A4 printing with the school's
  green-and-gold frame, and learning intention cards. Three text sizes, light and dark, full
  screen. It adds to an iPad home screen and works offline once opened. It carries only what a
  teacher needs on a Tuesday: none of the dataset's working columns, views or filters.
- **Bertie's version** of the Explorer — the same, plus "How strands are taught" (the ladder,
  family and spine views from the design prototype) and Review mode, which keeps notes on any
  page in the artifact's shared log so Claude can read them back.
- **Bettws Maths Curriculum Hub** and **Bettws PFA Curriculum Hub** — Bertie's working views,
  with all the extra data (notes, rulings, the gap register, the structure grid, the WPS 3
  teaching order). They are the record of the earlier views and filters and keep building as
  they always have.

Nothing reads the spreadsheet live: each build bakes the dataset in. The staff version has no
login, no server, no database, no analytics and no tracking of any kind.

## Where the pages are

| Page | GitHub Pages (no account needed) | claude.ai copy |
| --- | --- | --- |
| Curriculum Explorer (staff) | https://bertieharris2-cpu.github.io/Curriculum-Explorer/explorer/ | https://claude.ai/artifact/Y32QAUiZvCjnSHR4Nn14Jf |
| Curriculum Explorer (Bertie's version) | https://bertieharris2-cpu.github.io/Curriculum-Explorer/explorer-bertie/ | https://claude.ai/artifact/EwortvdBmz4MYYCVGdoBTm |
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
3. Ask Claude to republish the four files in `out/` to their claude.ai links above. Those links
   stay the same.

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

## The dataset as the pages read it

- **Statements:** `Bettws_Statements`, `status = live` only. The main view shows
  `curriculum = main`; the PFA section shows `pfa_class = PFA-direct` across both curricula.
- **Small steps and questions:** every sheet named `*_Layers` (NCP_WPS1, NCP_WPS2, NCP_WPS3,
  FDP, Money, Time, Measures, Shape, PDM, AR, DUR, Statistics, Probability, Algebra), plus
  `Algebra_WPS3_Detail` and `PFA_Layers`. A blank `ref` repeats the one above it. Staff see:
  L2-step and L2-detail as **small steps** (L2-subdetail nested, L2-variation as "any of these
  count"), L3-probe and L3-pattern-probe as **questions to ask**, L3-ask-yourself as **ask
  yourself**, L2-what-counts, L3-misconception as "watch for", and the teaching notes. Working
  rows (L1-note, pending, ruling, wording proposals) stay in the hubs. Phase big ideas
  (L1-bigidea) head the number spine's phases; level ideas (L1-level-idea) head the level columns.
- **B Squared:** `bsquared_step` holds one or several steps (`2.1, 2.2`) in the labels of the
  BSquared_Archive sheet, or a WPS fallback label (`WPS 2.1`, with an optional `+`) where
  B Squared has nothing close. The Explorer shows the value as a small `B²` chip, pre-fills
  the learning intention card's progression line from the B Squared steps of the chosen
  statements (fallback labels are shown but never written on the card), and the validator
  accepts both sets of labels and nothing else. `BSquared_Links` is Bertie's record and is not
  read by the pages.
- **Enquiries:** `Enquiry_Links`, read-only, phase by phase.
- Never shown to staff: BSquared_Archive, BSquared_Links, Gaps_Register, Checks, Mappings,
  CfW_Reference, README, and the columns `qc_verdict`, `qc_comment`, `source`,
  `boundary_note`, `ladder_note`, `notes`.

## Files

| File | What it is |
| --- | --- |
| `dataset/` | the current `Bettws-Master-Dataset-v*.xlsx` |
| `validate.py` | the checks, the build report and `CHANGES.md` (`--record`) |
| `extract.py` | reads the workbook into `out/data.json` (hubs) and `out/explorer-data.json` (staff) |
| `build.py` | bakes the pages: `out/` by default, `site/` with `--site` |
| `explorer/index.html` | the Explorer's shell |
| `explorer/proto-core.css` | the stylesheet of Bertie's reviewed prototype (31-10), lifted verbatim: change the look here |
| `explorer/app.css` | additions: the PFA colour, print, the card maker, the text-size variables |
| `explorer/app.js` | the app: browse, strand rail, map, PFA, enquiries, search, basket, card maker, print, review |
| `explorer/shapes.css`, `explorer/shapes.js` | "How strands are taught", the prototype's look-book module (Bertie's version only) |
| `explorer/fonts/` | Lexend (OFL) and Atkinson Hyperlegible (OFL) |
| `explorer/assets/`, `explorer/vendor/` | the logo and faces image; jsPDF (MIT) |
| `explorer/private/` | git-ignored: the learner font for the card, if you have it (see below) |
| `explorer/design-tokens.json` | the first design system's tokens, kept for reference |
| `hub_template.html` | the two hubs; `MODE` = `main` or `pfa` |
| `index_template.html` | the GitHub Pages landing page |
| `build/manifest.json` | the last recorded build, for the change report |
| `CHANGES.md` | the WAS / NOW change log |
| `tests/explorer.test.js` | drives both built Explorers in headless Chromium (`node tests/explorer.test.js`) |
| `CLAUDE.md` | the standing rules every Claude Code session reads first |
| `.github/workflows/pages.yml` | validates, builds and publishes the GitHub Pages site |

Needs Python 3 with `pandas`, `openpyxl` and `Pillow` (`pip install -r requirements.txt`).
The browser test needs Playwright with Chromium.

## The staff Explorer

- **Browse:** the strands as tiles in six families, each with its teaching shape (climb in
  order, climb then keep using it, measure it, come round again, picked up every day) and
  which levels it has. The side menu lists the same strands.
- **A strand:** its levels side by side on a rail (swipe, the arrows, or the level bar), rising
  like stairs for a ladder strand, with the joins between levels named; or one level at a time.
  The number spine's phases head each column with their big idea.
- **A statement:** the "I can…" text exactly as the dataset has it, its code small at the end,
  the `B²` chip, "Why this matters" where a purpose line exists, and behind the chevron its
  small steps as bullets, "any of these count", what counts, questions to ask, ask yourself,
  watch for and teaching notes. "Show all small steps" opens a whole strand at once.
- **Curriculum map:** strands down the side, levels across, darker tiles for more statements.
- **Search** across statement text, purpose lines, codes and small steps, grouped by strand.
- **Preparing for adulthood:** its own plum mode with the Outcomes, the Destinations and the
  Number Route (goals in full, stepping stones quieter, main-only hidden).
- **Enquiries:** the mapped enquiries, read-only, phase by phase.
- **Print:** A4 with the green-and-gold double frame on every page; a phase heading never
  strands at the foot of a page; no text shrinks.
- **Learning intentions:** the + on any statement collects up to six; the card maker is a
  rebuild of the standalone Learning Intentions tool (editable rows with faces, card and page
  preview, adjustable width, copies, PDF download, open-to-print, favourites with export and
  import). The progression line is pre-set from the B Squared steps of the chosen statements.
- **My pupils** is marked for phase 2.

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
- Ladder and repeated-exposure always carry a word; `ladder_note` containing PROVISIONAL is
  flagged in the hubs as awaiting Bertie's tick (staff never see it).
- Algebra WPS 3 is shown in `presentation_order` (equals sign first), not code order.
- Print: A4, a phase heading never strands away from its statements (`.keep` wraps heading +
  first statement, rows never split). Never shrink text to save pages.
- Strand codes always appear with a plain-language reminder (`STRAND_SHORT` in extract.py).

## Known dataset quirks surfaced by the pages (not page bugs)
- PDM, Angles & Rotation and Probability statements carry level "WPS 2.3" although ruled
  one collapsed WPS 2 level — they appear in the 2.3 column of the structure grid and map.
- Layer refs like `STAT-3-30..35` (ranges) attach at strand level, not per statement.
- Layer rows for `PDM-3-05`, `SHP-3-05`, `CAL-2.1-01`, `CAL-3-05` and `PFA-MM-03` point at
  retired or split statements and are dropped (listed by `make validate`).
- Enquiry_Links rows with DCF codes are digital-competence outcomes, not Bettws statements;
  the Explorer shows their task text without a link.

## Adding a view
Hubs: add an entry to `VIEWS` in `hub_template.html`, a `vName()` renderer, and a branch in
`renderMain()`. Explorer: add a page function in `explorer/app.js`, a name in `fromHash()` and
the `PG` table in `render()`, and use `stmt(s, opts)` for statements so the small steps, the
basket button and the print rules come for free.
