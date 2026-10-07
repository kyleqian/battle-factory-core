#!/bin/sh
# prep27 Baton Pass ROM probes (direct mGBA, Scene ON, fresh process each; never the shared HTTP oracles).
# usage (workspace root): OUT=/tmp/p27/r1 sh tools/integration/prep27Probes.sh [flow|repl|dense]
#   flow  4 scenarios (2 species pairs x 2 attacker sides) -> $OUT/flow: state probe (prep27BatonProbe.py); the player side answers the party screen (RIGHT,A,A at E+75/+100/+130)
#   repl  opponent-attacker NINJASK with 3 other replacement species (SHUCKLE/GOLEM/SABLEYE) -> $OUT/repl
#   dense 4 scenarios -> $OUT/dense: the accepted dense body probe (tools/compare/poisonFangProbe.py, move 226) json + raw RGB dir
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
OUT=${OUT:-/tmp/p27/r1}; export FS_WINDOW=${FS_WINDOW:-480} FS_PROFILE=battle-scene-on
PL="75:RIGHT:3,100:A:3,130:A:3"
FLOW="mechanic-baton-pass-player-aipom-opponent-onix prep27-baton-player-ninjask-opponent-golem mechanic-baton-pass-opponent-aipom-player-onix prep27-baton-opponent-ninjask-player-golem"
for w in ${*:-flow repl dense}; do case $w in
flow) mkdir -p $OUT/flow
  for s in $FLOW; do case $s in *baton-pass-player*|*baton-player*) P=$PL;; *) P="";; esac
    ( P27_PRESS=$P $PY tools/integration/prep27BatonProbe.py tools/battle-lab/$s.json $OUT/flow/$s.json >/dev/null 2>&1 || true ) & done; wait ;;
repl) mkdir -p $OUT/repl
  for n in shuckle golem sableye; do ( FS_WINDOW=300 $PY tools/integration/prep27BatonProbe.py tools/battle-lab/prep27-baton-opponent-ninjask-repl-$n.json $OUT/repl/prep27-baton-opponent-ninjask-repl-$n.json >/dev/null 2>&1 || true ) & done; wait ;;
dense) mkdir -p $OUT/dense
  for s in $FLOW; do ( $PY tools/compare/poisonFangProbe.py tools/battle-lab/$s.json $OUT/dense/$s.json $OUT/dense/$s-rgb 226 >/dev/null 2>&1 || true ) & done; wait ;;
esac; done
ls $OUT/*/ | wc -l
