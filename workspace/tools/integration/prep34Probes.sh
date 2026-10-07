#!/bin/sh
# prep34 probes (run from workspace/). Direct mGBA only (never the shared HTTP oracles); every scenario twice from fresh processes, cmp'd.
# usage: OUT=<fresh dir> sh tools/integration/prep34Probes.sh [es|memento ...]   (OUT is required; nothing is reused implicitly)
set -e
[ -n "$OUT" ] || { echo "OUT=<dir> required"; exit 2; }
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
mkdir -p "$OUT"; WHICH=${*:-es memento}
probe() { for r in 1 2; do ( mkdir -p "$OUT/$2-r$r-rgb"; $PY $1 tools/battle-lab/$2.json "$OUT/$2-r$r.json" "$OUT/$2-r$r-rgb" > "$OUT/$2-r$r.log" 2>&1 || true ) & done; }
for w in $WHICH; do case $w in
  es) for s in mechanic-extreme-speed-player-arcanine-dugtrio mechanic-extreme-speed-arcanine-dugtrio prep34-extreme-speed-alt-player-smeargle-golem prep34-extreme-speed-alt-opponent-smeargle-golem; do probe tools/integration/prep34ExtremeSpeedProbe.py $s; done ;;
  memento) for s in mechanic-memento-player-weezing-opponent-onix mechanic-memento-opponent-weezing-player-onix prep34-memento-alt-player-muk-golem prep34-memento-alt-opponent-muk-golem prep34-memento-after-scanline-player-muk-golem; do probe tools/compare/mementoProbe.py $s; done ;;
esac; done
wait
for f in "$OUT"/*-r1.json; do cmp -s "$f" "${f%-r1.json}-r2.json" || { echo "DIFF $f"; exit 1; }; [ -s "$f" ] || { echo "EMPTY $f"; exit 1; }; done; echo "probes: r1 == r2 byte-identical ($(ls "$OUT"/*-r1.json | wc -l | tr -d ' ') scenarios)"
