#!/bin/sh
# prep26 probes (run from workspace/). Direct mGBA only (never the shared HTTP oracles); every scenario twice from fresh processes, cmp'd. OUT=/tmp/p26/alt
# usage: sh tools/integration/prep26Probes.sh [iceball|revenge|superpower ...]   (default: iceball revenge)
set -e
export PYTHONPATH=${POKEBENCH_VENDOR_DIR:-../../vendor}/libmgba-py PY=${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python
OUT=${OUT:-/tmp/p26/alt}; mkdir -p "$OUT"; WHICH=${*:-iceball revenge}
probe() { for r in 1 2; do ( mkdir -p "$OUT/$2-r$r-rgb"; $PY tools/compare/$1 tools/battle-lab/$2.json "$OUT/$2-r$r.json" "$OUT/$2-r$r-rgb" > "$OUT/$2-r$r.log" 2>&1 || true ) & done; }
for w in $WHICH; do case $w in
  iceball) for s in prep25-ice-ball-alt-player-glalie-golem prep25-ice-ball-alt-opponent-glalie-golem; do probe iceBallProbe.py $s; done ;;
  revenge) for s in prep25-revenge-alt-player-machoke-golem prep25-revenge-alt-opponent-machoke-golem; do probe revengeProbe.py $s; done ;;
  superpower) for s in prep25-superpower-alt-player-machamp-golem prep25-superpower-alt-opponent-machamp-golem; do probe superpowerProbe.py $s; done ;;
esac; done
wait
for f in "$OUT"/*-r1.json; do cmp -s "$f" "${f%-r1.json}-r2.json" || { echo "DIFF $f"; exit 1; }; done; echo "probes: r1 == r2 byte-identical"
