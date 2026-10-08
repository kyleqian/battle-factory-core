#!/bin/sh
# speciesAudit13 probes (run from workspace/): tools/integration/prep38Probe.py on the speciesAudit13Stage.py scenarios, every scenario twice
# from fresh processes, the two frame series (incl. every RGB sha256) compared. Direct mGBA only (never the shared HTTP oracles).
# usage: OUT=<fresh dir> SC=<scenario dir> [JOBS=n] sh tools/integration/speciesAudit13Probes.sh [stem ...]
set -e
[ -n "$OUT" ] && [ -n "$SC" ] || { echo "OUT=<dir> SC=<scenario dir> required"; exit 2; }
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python OUT SC
mkdir -p "$OUT"
STEMS=${*:-$(cut -f1 $SC/list.tsv)}
for s in $STEMS; do for r in 1 2; do echo "$s $r"; done; done | xargs -P ${JOBS:-10} -n 2 sh -c \
 'o="$OUT/$0-r$1.json"; [ ! -e "$o" ] || { echo "refusing to reuse $o"; exit 0; }; python3 tools/run-mgba-probe.py "$o" -- $PY tools/integration/prep38Probe.py "$SC/$0.json" "$o" "$OUT/$0-r$1-rgb" > "$OUT/$0-r$1.out" 2>&1 || echo "FAIL $0 r$1"'
for s in $STEMS; do f="$OUT/$s-r1.json"; [ -s "$f" ] || { echo "EMPTY $f"; continue; }
  python3 -c 'import json,sys; a,b=(json.load(open(p))["frames"] for p in sys.argv[1:]); sys.exit(a!=b)' "$f" "$OUT/$s-r2.json" || echo "DIFF $s"; done
echo "probes done ($(ls "$OUT"/*-r1.json | wc -l | tr -d ' ') scenarios)"
