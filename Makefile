# Bettws Curriculum Explorer — one command per job.
#
#   make validate   check the dataset (sheets, columns, duplicate ids, layer refs, counts)
#   make build      validate → extract → build the hubs and the Explorer into out/ → record CHANGES.md
#   make site       the same, plus the GitHub Pages copy in site/
#   make publish    site, then commit the dataset, CHANGES.md and the build record and push.
#                   GitHub Pages rebuilds from the push. If validation fails nothing is pushed
#                   and the previous site stays live.
#   make serve      open the site copy locally (http://localhost:8765/)
#   make clean      delete out/ and site/ (safe: both are rebuilt)

PY ?= python3
BRANCH := $(shell git rev-parse --abbrev-ref HEAD)

.PHONY: validate extract build site publish serve clean tokens

validate:
	$(PY) validate.py

extract: validate
	$(PY) extract.py

build: extract
	$(PY) build.py
	$(PY) validate.py --record

site: build
	$(PY) build.py --site

publish: site
	git add dataset CHANGES.md build/manifest.json
	git diff --cached --quiet || git commit -m "Publish dataset $$($(PY) -c "import json;print(json.load(open('out/data.json'))['version'])")"
	git push -u origin $(BRANCH)
	@echo "Pushed to $(BRANCH). GitHub Pages rebuilds from main within a few minutes."
	@echo "The claude.ai copies: publish out/bettws-maths-hub.html and out/bettws-pfa-hub.html to their artifact links (see README)."

serve: site
	@echo "Serving site/ at http://localhost:8765/ (Ctrl+C to stop)"
	cd site && $(PY) -m http.server 8765

tokens:
	$(PY) -c "import build" >/dev/null 2>&1 || true

clean:
	rm -rf out/*.html out/*.json site
