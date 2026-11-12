#!/bin/sh
# Ice Ball chain probes for the deferred-lend fixtures (run from workspace/): direct mGBA only (never the shared HTTP oracles), each scenario
# twice from fresh processes, cmp'd. The mGBA teardown SIGSEGV on exit is known; outputs are complete.
# usage: OUT=/tmp/lend-ib sh tools/integration/lendIceBallProbes.sh
set -e
export PYTHONPATH=${POKEBENCH_VENDOR_DIR:-../../vendor}/libmgba-py PY=${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python
OUT=${OUT:-/tmp/lend-ib}; mkdir -p "$OUT"
for s in mechanic-ice-ball-player-spheal-opponent-onix mechanic-ice-ball-opponent-spheal-player-onix prep25-ice-ball-alt-player-glalie-golem prep25-ice-ball-alt-opponent-glalie-golem; do
  for r in 1 2; do ( mkdir -p "$OUT/$s-r$r-rgb"; $PY tools/compare/iceBallProbe.py tools/battle-lab/$s.json "$OUT/$s-r$r.json" "$OUT/$s-r$r-rgb" > "$OUT/$s-r$r.log" 2>&1 || true ) & done
done
wait
for f in "$OUT"/*-r1.json; do cmp -s "$f" "${f%-r1.json}-r2.json" || { echo "DIFF $f"; exit 1; }; done; echo "probes: r1 == r2 byte-identical"
