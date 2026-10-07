#!/bin/sh
# prep24 probes (run from workspace/). Direct mGBA only; every scenario twice from fresh processes, cmp'd. OUT=/tmp/p24/alt
set -e
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
OUT=${OUT:-/tmp/p24/alt}; mkdir -p "$OUT"
probe() { for r in 1 2; do ( mkdir -p "$OUT/$2-r$r-rgb"; $PY tools/compare/$1 tools/battle-lab/$2.json "$OUT/$2-r$r.json" "$OUT/$2-r$r-rgb" > "$OUT/$2-r$r.log" 2>&1 || true ) & done; }
for s in prep18-megahorn-alt-heracross-golem prep18-megahorn-altopp-heracross-golem prep24-megahorn-alt-heracross-onix prep24-megahorn-altopp-heracross-onix; do probe megaHornProbe.py $s; done
for s in ${RETURN_SCENARIOS:-prep18-return-alt-snorlax-golem prep18-return-altopp-snorlax-golem}; do probe returnProbe.py $s; done
wait
for f in "$OUT"/*-r1.json; do cmp -s "$f" "${f%-r1.json}-r2.json" || { echo "DIFF $f"; exit 1; }; done; echo "probes: r1 == r2 byte-identical"
