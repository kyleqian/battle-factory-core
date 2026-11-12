#!/bin/sh
# prep38 probes (run from workspace/). Direct mGBA only (never the shared HTTP oracles); every scenario twice from fresh processes, then
# the frame series (incl. every RGB sha256) of r1 and r2 are cmp'd. usage: OUT=<fresh dir> [JOBS=n] sh tools/integration/prep38Probes.sh [stem ...]
set -e
[ -n "$OUT" ] || { echo "OUT=<dir> required"; exit 2; }
export PYTHONPATH=${POKEBENCH_VENDOR_DIR:-../../vendor}/libmgba-py PY=${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python OUT
SC=tools/integration/fixtures/prep38/scenarios
mkdir -p "$OUT"
STEMS=${*:-$(cut -f1 $SC/list.tsv)}
for s in $STEMS; do for r in 1 2; do echo "$s $r"; done; done | xargs -P ${JOBS:-10} -n 2 sh -c \
 'o="$OUT/$0-r$1.json"; [ ! -e "$o" ] || { echo "refusing to reuse $o"; exit 0; }; python3 tools/run-mgba-probe.py "$o" -- $PY tools/integration/prep38Probe.py tools/integration/fixtures/prep38/scenarios/$0.json "$o" "$OUT/$0-r$1-rgb" > "$OUT/$0-r$1.out" 2>&1 || echo "FAIL $0 r$1"'
for s in $STEMS; do f="$OUT/$s-r1.json"; [ -s "$f" ] || { echo "EMPTY $f"; continue; }
  python3 -c 'import json,sys; a,b=(json.load(open(p))["frames"] for p in sys.argv[1:]); sys.exit(a!=b)' "$f" "$OUT/$s-r2.json" || echo "DIFF $s"; done
echo "probes done ($(ls "$OUT"/*-r1.json | wc -l | tr -d ' ') scenarios)"
