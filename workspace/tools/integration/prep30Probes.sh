#!/bin/sh
# prep30 probes (run from workspace/).  Direct mGBA only (never the shared HTTP oracles); every scenario twice from fresh processes, cmp'd.
# usage: sh tools/integration/prep30Probes.sh OUT_DIR [extrasensory|psywave ...]      (OUT_DIR must be given; nothing under /tmp is reused implicitly)
set -e
[ -n "$1" ] || { echo "usage: $0 OUT_DIR [extrasensory|psywave ...]" >&2; exit 2; }
OUT=$1; shift; WHICH=${*:-extrasensory psywave}; mkdir -p "$OUT"
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
probe() { for r in 1 2; do ( mkdir -p "$OUT/$2-r$r-rgb"; $PY tools/compare/$1 tools/battle-lab/$2.json "$OUT/$2-r$r.json" "$OUT/$2-r$r-rgb" > "$OUT/$2-r$r.log" 2>&1 || true ) & done; }
for w in $WHICH; do for side in player opponent; do
  probe ${w}Probe.py prep25-$w-alt-$side-alakazam-golem; probe ${w}Probe.py prep30-$w-alt-$side-espeon-crobat; done; done
wait
n=0; for w in $WHICH; do for side in player opponent; do for s in prep25-$w-alt-$side-alakazam-golem prep30-$w-alt-$side-espeon-crobat; do f=$OUT/$s-r1.json; [ -s "$f" ] || { echo "EMPTY $f"; exit 1; }; cmp -s "$f" "${f%-r1.json}-r2.json" || { echo "DIFF $f"; exit 1; }; n=$((n+1)); done; done; done
for d in "$OUT"/*-r1-rgb; do diff -rq "$d" "${d%-r1-rgb}-r2-rgb" > /dev/null || { echo "RGB DIFF $d"; exit 1; }; done
echo "probes: $n scenarios, r1 == r2 byte-identical (state json + rgb dirs)"
