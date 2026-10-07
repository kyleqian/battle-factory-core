#!/bin/sh
# prep27 Baton Pass ROM probes (direct mGBA, Scene ON, fresh process each).  usage (workspace root): OUT=/tmp/p27/r1 sh tools/integration/prep27Probes.sh
# 4 scenarios: 2 species pairs x 2 attacker sides.  Player side answers the party screen (RIGHT,A,A) at E+75/+100/+130; opponent side needs no input.
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
OUT=${OUT:-/tmp/p27/r1}; mkdir -p "$OUT"; export FS_WINDOW=${FS_WINDOW:-480} FS_PROFILE=battle-scene-on
PL="75:RIGHT:3,100:A:3,130:A:3"
for s in mechanic-baton-pass-player-aipom-opponent-onix prep27-baton-player-ninjask-opponent-golem; do P27_PRESS=$PL $PY tools/integration/prep27BatonProbe.py tools/battle-lab/$s.json $OUT/$s.json >/dev/null 2>&1 & done
for s in mechanic-baton-pass-opponent-aipom-player-onix prep27-baton-opponent-ninjask-player-golem; do $PY tools/integration/prep27BatonProbe.py tools/battle-lab/$s.json $OUT/$s.json >/dev/null 2>&1 & done
wait; ls $OUT | wc -l
