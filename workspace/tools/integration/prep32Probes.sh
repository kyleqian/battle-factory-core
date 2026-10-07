#!/bin/sh
# prep32 probes (run from workspace/). Direct mGBA only (never the shared HTTP oracles); every scenario twice from fresh processes, cmp'd.
# usage: OUT=<fresh dir> sh tools/integration/prep32Probes.sh [nightmare|flatter ...]   (OUT is required; nothing is reused implicitly)
set -e
[ -n "$OUT" ] || { echo "OUT=<dir> required"; exit 2; }
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
mkdir -p "$OUT"; WHICH=${*:-nightmare flatter}
probe() { for r in 1 2; do ( mkdir -p "$OUT/$2-r$r-rgb"; $PY tools/compare/$1 tools/battle-lab/$2.json "$OUT/$2-r$r.json" "$OUT/$2-r$r-rgb" > "$OUT/$2-r$r.log" 2>&1 || true ) & done; }
for w in $WHICH; do case $w in
  nightmare) for s in prep25-nightmare-alt-player-gengar-golem prep25-nightmare-alt-opponent-gengar-golem d4a-nightmare-extra-player-gengar-golbat d4a-nightmare-extra-opponent-gengar-golbat d4a-nightmare-extra-player-haunter-snorlax d4a-nightmare-extra-opponent-haunter-snorlax; do probe nightmareProbe.py $s; done ;;
  flatter) for s in prep25-flatter-alt-player-hypno-golem prep25-flatter-alt-opponent-hypno-golem; do probe flatterProbe.py $s; done ;;
esac; done
wait
for f in "$OUT"/*-r1.json; do cmp -s "$f" "${f%-r1.json}-r2.json" || { echo "DIFF $f"; exit 1; }; [ -s "$f" ] || { echo "EMPTY $f"; exit 1; }; done; echo "probes: r1 == r2 byte-identical ($(ls "$OUT"/*-r1.json | wc -l | tr -d ' ') scenarios)"
