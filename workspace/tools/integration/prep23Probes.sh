#!/bin/sh
# prep23: independent direct-mGBA dense Curse probes, each scenario twice from fresh processes, then cmp. Run from workspace/.
#   OUT=/tmp/p23 sh tools/integration/prep23Probes.sh
set -e
export PYTHONPATH=${POKEBENCH_VENDOR_DIR:-../../vendor}/libmgba-py PY=${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python
OUT=${OUT:-/tmp/p23}; mkdir -p "$OUT"
for s in prep14-curse-stat-alt-miltank-golem prep14-curse-ghost-alt-gengar-golem prep23-curse-stat-altopp-miltank-golem prep23-curse-stat-alt2-onix-pidgeot prep23-curse-ghost-altopp-gengar-golem; do
  for r in 1 2; do ( mkdir -p "$OUT/$s-r$r-rgb"; $PY tools/compare/curseProbe.py tools/battle-lab/$s.json "$OUT/$s-r$r.json" "$OUT/$s-r$r-rgb" > "$OUT/$s-r$r.log" 2>&1 ) & done
done
wait
for f in "$OUT"/*-r1.json; do cmp -s "$f" "${f%-r1.json}-r2.json" || { echo "DIFF $f"; exit 1; }; done; echo "prep23 probes: r1 == r2 byte-identical"
