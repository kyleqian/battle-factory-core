#!/bin/sh
# prep33 probes (run from workspace/). Direct mGBA only (never the shared HTTP oracles); every scenario twice from fresh processes, cmp'd.
# usage: OUT=<fresh dir> sh tools/integration/prep33Probes.sh [shockwave|skillswap ...]   (OUT is required; nothing is reused implicitly)
set -e
[ -n "$OUT" ] || { echo "OUT=<dir> required"; exit 2; }
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
mkdir -p "$OUT"; WHICH=${*:-shockwave skillswap}
probe() { for r in 1 2; do ( rm -rf "$OUT/$2-r$r.json" "$OUT/$2-r$r-rgb"; mkdir -p "$OUT/$2-r$r-rgb"; $PY tools/compare/$1 tools/battle-lab/$2.json "$OUT/$2-r$r.json" "$OUT/$2-r$r-rgb" > "$OUT/$2-r$r.log" 2>&1 || true ) & done; }
for w in $WHICH; do case $w in
  shockwave) for s in prep22-shock-wave-alt-player-manectric-wailmer prep22-shock-wave-alt-opponent-manectric-wailmer prep33-shock-wave-alt-player-raichu-weezing prep33-shock-wave-alt-opponent-weezing-snorlax; do probe shockWaveProbe.py $s; done ;;
  skillswap) for s in prep22-skill-swap-alt-player-alakazam-golem prep22-skill-swap-alt-opponent-alakazam-golem prep33-skill-swap-alt-player-espeon-weezing prep33-skill-swap-alt-opponent-weezing-snorlax; do probe skillSwapProbe.py $s; done ;;
esac; done
wait
for f in "$OUT"/*-r1.json; do cmp -s "$f" "${f%-r1.json}-r2.json" || { echo "DIFF $f"; exit 1; }; [ -s "$f" ] || { echo "EMPTY $f"; exit 1; }; diff -rq "${f%.json}-rgb" "${f%-r1.json}-r2-rgb" > /dev/null || { echo "RGB DIFF $f"; exit 1; }; done; echo "probes: r1 == r2 byte-identical, state + RGB ($(ls "$OUT"/*-r1.json | wc -l | tr -d ' ') scenarios)"
