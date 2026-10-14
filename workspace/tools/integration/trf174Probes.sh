#!/bin/sh
# trf174 probes (run from workspace/). Direct mGBA only (never the shared HTTP oracles); every scenario twice from fresh processes, cmp'd.
# usage: OUT=<fresh dir> sh tools/integration/trf174Probes.sh [scenario-basename ...]
set -e
[ -n "$OUT" ] || { echo "OUT=<dir> required"; exit 2; }
VENDOR=$(dirname "$(realpath reference/pokeemerald)")
export PYTHONPATH=$VENDOR/libmgba-py PY=$VENDOR/mgba-venv/bin/python
mkdir -p "$OUT"
ALL=""
for prof in on off; do for side in player opponent; do for t in slowbro golbat; do ALL="$ALL trf174-$prof-$side-ditto-$t"; done; done; done
for r in 1 2; do
  for s in ${*:-$ALL}; do
    [ ! -e "$OUT/$s-r$r.json" ] || { echo "refusing to reuse $OUT/$s-r$r.json"; exit 2; }
    ( python3 tools/run-mgba-probe.py "$OUT/$s-r$r.json" -- $PY tools/integration/trf174Probe.py tools/battle-lab/$s.json "$OUT/$s-r$r.json" "$OUT/$s-r$r-rgb" > "$OUT/$s-r$r.out" 2>&1 || echo "FAIL $s r$r" ) &
  done
  wait
done
for f in "$OUT"/*-r1.json; do [ -s "$f" ] || { echo "EMPTY $f"; exit 1; }; cmp -s "$f" "${f%-r1.json}-r2.json" || { echo "DIFF $f"; exit 1; }; done
echo "probes: r1 == r2 byte-identical ($(ls "$OUT"/*-r1.json | wc -l | tr -d ' ') scenarios)"
