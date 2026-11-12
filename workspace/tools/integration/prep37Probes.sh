#!/bin/sh
# prep37 probes (run from workspace/). Direct mGBA only (never the shared HTTP oracles); every scenario twice from fresh processes, cmp'd.
# usage: OUT=<fresh dir> sh tools/integration/prep37Probes.sh [scenario-basename ...]
set -e
[ -n "$OUT" ] || { echo "OUT=<dir> required"; exit 2; }
export PYTHONPATH=${POKEBENCH_VENDOR_DIR:-../../vendor}/libmgba-py PY=${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python
mkdir -p "$OUT"
ALL="mechanic-substitute-player-golem-opponent-onix mechanic-substitute-opponent-golem-player-onix prep37-on-player-persian-slowbro prep37-on-opponent-persian-slowbro prep37-off-player-persian-slowbro prep37-on-opponent-golbat-slowbro"
for s in ${*:-$ALL}; do
  for r in 1 2; do
    [ ! -e "$OUT/$s-r$r.json" ] || { echo "refusing to reuse $OUT/$s-r$r.json"; exit 2; }
    ( python3 tools/run-mgba-probe.py "$OUT/$s-r$r.json" -- $PY tools/integration/prep37Probe.py tools/battle-lab/$s.json "$OUT/$s-r$r.json" "$OUT/$s-r$r-rgb" > "$OUT/$s-r$r.out" 2>&1 || echo "FAIL $s r$r" ) &
  done
done
wait
for f in "$OUT"/*-r1.json; do [ -s "$f" ] || { echo "EMPTY $f"; exit 1; }; cmp -s "$f" "${f%-r1.json}-r2.json" || { echo "DIFF $f"; exit 1; }; done
echo "probes: r1 == r2 byte-identical ($(ls "$OUT"/*-r1.json | wc -l | tr -d ' ') scenarios)"
