#!/bin/sh
# S10A Substitute swaps: fresh direct-mGBA probes (prep37Probe.py; never the shared HTTP oracles), every scenario twice
# from fresh processes, r1 == r2 cmp'd. Extends prep37Probes.sh with the subswap-* scenarios (a subbed battler's own move).
# usage (from workspace/): OUT=<fresh dir> sh tools/integration/substSwapProbes.sh [scenario-basename ...]
set -e
[ -n "$OUT" ] || { echo "OUT=<dir> required"; exit 2; }
export PYTHONPATH=${POKEBENCH_VENDOR_DIR:-../../vendor}/libmgba-py PY=${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python
mkdir -p "$OUT"
ALL="subswap-ctrl-player-golem-onix-headbutt subswap-on-opponent-golbat-slowbro-bodyslam subswap-on-opponent-golem-onix-headbutt subswap-on-opponent-onix-golem-headbutt subswap-on-opponent-persian-slowbro-bodyslam subswap-on-opponent-persian-slowbro-leechseed subswap-on-opponent-persian-slowbro-seismictoss subswap-on-player-golem-onix-headbutt subswap-on-player-persian-golbat-bodyslam subswap-on-player-persian-slowbro-bodyslam subswap-on-player-persian-slowbro-leechseed subswap-on-player-persian-slowbro-seismictoss subswap-on-player-zigzagoon-onix-headbutt"
for s in ${*:-$ALL}; do
  for r in 1 2; do
    [ ! -e "$OUT/$s-r$r.json" ] || { echo "refusing to reuse $OUT/$s-r$r.json"; exit 2; }
    ( python3 tools/run-mgba-probe.py "$OUT/$s-r$r.json" -- $PY tools/integration/prep37Probe.py tools/battle-lab/$s.json "$OUT/$s-r$r.json" "$OUT/$s-r$r-rgb" > "$OUT/$s-r$r.out" 2>&1 || echo "FAIL $s r$r" ) &
  done
done
wait
for f in "$OUT"/*-r1.json; do [ -s "$f" ] || { echo "EMPTY $f"; exit 1; }; cmp -s "$f" "${f%-r1.json}-r2.json" || { echo "DIFF $f"; exit 1; }; done
echo "probes: r1 == r2 byte-identical ($(ls "$OUT"/*-r1.json | wc -l | tr -d ' ') scenarios)"
