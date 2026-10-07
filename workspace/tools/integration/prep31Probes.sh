#!/bin/sh
# prep31 probes (run from workspace/). Direct mGBA only (never the shared HTTP oracles); every scenario twice from fresh processes, cmp'd.
# usage: OUT=<fresh dir> sh tools/integration/prep31Probes.sh [superpower|spitup ...]   (OUT is required; nothing is reused implicitly)
set -e
[ -n "$OUT" ] || { echo "OUT=<dir> required"; exit 2; }
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
mkdir -p "$OUT"; WHICH=${*:-superpower spitup}
probe() { for r in 1 2; do ( mkdir -p "$OUT/$2-r$r-rgb"; $PY tools/compare/$1 tools/battle-lab/$2.json "$OUT/$2-r$r.json" "$OUT/$2-r$r-rgb" > "$OUT/$2-r$r.log" 2>&1 || true ) & done; }
for w in $WHICH; do case $w in
  superpower) for s in prep25-superpower-alt-player-machamp-golem prep25-superpower-alt-opponent-machamp-golem prep31-superpower-alt-player-machamp-weezing prep31-superpower-alt-opponent-weezing-snorlax; do probe superpowerProbe.py $s; done ;;
  spitup) for s in prep29-spit-up-alt-player-seviper-golem-one-stockpile prep29-spit-up-alt-player-seviper-golem-two-stockpile prep29-spit-up-alt-player-seviper-golem-three-stockpile prep29-spit-up-alt-opponent-seviper-golem-one-stockpile prep29-spit-up-alt-opponent-seviper-golem-two-stockpile prep29-spit-up-alt-opponent-seviper-golem-three-stockpile; do probe spitUpProbe.py $s; done ;;
esac; done
wait
for f in "$OUT"/*-r1.json; do cmp -s "$f" "${f%-r1.json}-r2.json" || { echo "DIFF $f"; exit 1; }; [ -s "$f" ] || { echo "EMPTY $f"; exit 1; }; done; echo "probes: r1 == r2 byte-identical ($(ls "$OUT"/*-r1.json | wc -l | tr -d ' ') scenarios)"
