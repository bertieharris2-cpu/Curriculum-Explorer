# Curriculum Explorer — Bettws Curriculum Hubs

Curriculum Explorer turns the Bettws Master Dataset (an Excel workbook of maths and
Preparing for Adulthood learning statements) into two self-contained, browsable web pages
for staff. Each page lets you explore the curriculum by strand, level, phase and route,
search statements, see the teaching steps, probing questions, misconceptions and notes
attached to each one, and print tidy A4 copies.

This repository holds the build pipeline: a Python extractor that reads the spreadsheet,
one shared HTML template, and a build script that bakes the data into the two pages.

## The two hubs

- **Bettws Maths Curriculum Hub** — https://claude.ai/artifact/G7ZgXPAjHHUDJkphQ8K5ty
- **Bettws PFA Curriculum Hub** — https://claude.ai/artifact/7ecDGZ4qhk3cJs66RNoXBf

The pages never read the spreadsheet live. Each build bakes the dataset into the HTML;
republishing updates the same links.

## Files
- `dataset/` — put the current `Bettws-Master-Dataset-v*.xlsx` here. The build always
  picks the highest-numbered file; old versions can stay.
- `extract.py` — reads the dataset into `out/data.json` (live statements only, with
  steps/probes/notes from the layer sheets, PFA_Layers, Algebra_WPS3_Detail, the gap
  register and New_Learning_Order).
- `hub_template.html` — one template for both pages; `MODE` = `main` or `pfa` decides views.
- `build.py` — stamps out `out/bettws-maths-hub.html` and `out/bettws-pfa-hub.html`.
- `out/` — build output (git-ignored; safe to delete and rebuild).
- `requirements.txt` — Python dependencies.

## Rebuild after a new dataset version
```
python3 extract.py
python3 build.py
```
Then publish both files in `out/` to their existing artifact URLs (above).
Needs Python 3 with `pandas` and `openpyxl` (`pip install -r requirements.txt`).

## Rules the pages follow (from Bertie's rulings — keep them)
- Maths hub shows main-curriculum statements only and carries **no PFA labels**: no
  pfa_class, pfa_area, purpose lines, thread tags or route counts (ruling 01-09).
- PFA hub: Outcomes = life statements by `sort_order`; Destinations = PFA-direct maths
  statements outside the number spine, grouped by `pfa_area` (fallback `strand`);
  Number Route = the spine with PFA-direct bold, feeders grey, curriculum-internal hidden.
- Statement codes sit at the end of the line, small, in amber. Bettws ids are never renumbered.
- Ladder cells get teal bars, repeated-exposure cells sand bars; `ladder_note` containing
  PROVISIONAL is flagged as awaiting Bertie's tick.
- Algebra WPS 3 is shown in `presentation_order` (equals sign first), not code order.
- Print: A4, a phase/step bar never strands away from its statements (`.keep` wrapper
  around bar + first card, `break-inside: avoid` on cards). Never shrink text to save pages.
- Strand codes always appear with a plain-language reminder (`STRAND_SHORT` in extract.py).

## Known dataset quirks surfaced by the pages (not page bugs)
- PDM, Angles & Rotation and Probability statements carry level "WPS 2.3" although ruled
  one collapsed WPS 2 level — they appear in the 2.3 column of the structure grid.
- Layer refs like `STAT-3-30..35` (ranges) attach at strand level, not per statement.
- PFA_Layers rows for `CAL-3-05` and `PFA-MM-03` point at retired statements and are dropped.

## Adding a view
Add an entry to `VIEWS` in the template, a `vName()` renderer, and a branch in `renderMain()`.
Use `card(s, opts)` for statements and `levelBlock` / `phaseBlock` / `spineBlocks` for grouping
so the print rules come for free.
