#!/bin/sh
# prep26 reproduction (run from workspace/).  Direct mGBA only (never the shared HTTP oracles).
#   sh tools/integration/prep26Run.sh                                  # probes (each scenario twice, cmp'd) + checkers + pixels; receipts -> $REC
#   REC=/tmp/rec2 SKIP_PROBES=1 sh tools/integration/prep26Run.sh      # second checker pass; cmp the receipts against tools/integration/fixtures/prep26
#   STAGES="iceball" sh tools/integration/prep26Run.sh                 # subset (iceball revenge superpower)
set -e
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
OUT=${OUT:-/tmp/p26/alt}; REC=${REC:-tools/integration/fixtures/prep26}; STAGES=${STAGES:-iceball revenge superpower}; mkdir -p "$REC"; export OUT
[ -n "$SKIP_PROBES" ] || sh tools/integration/prep26Probes.sh $STAGES 2>&1 | grep -v "Segmentation fault"
for w in $STAGES; do case $w in
iceball)
  I=$OUT/prep25-ice-ball-alt
  npx vite-node tools/integration/prep26IceBallCheck.ts $I-player-glalie-golem-r1.json:player $I-opponent-glalie-golem-r1.json:opponent --out=$REC/iceball-check.json > /dev/null
  npx vite-node tools/integration/prep26IceBallPixels.ts $I-player-glalie-golem-r1.json:$I-player-glalie-golem-r1-rgb:player:GLALIE,GOLEM $I-opponent-glalie-golem-r1.json:$I-opponent-glalie-golem-r1-rgb:opponent:GLALIE,GOLEM --out=$REC/iceball-pixels.json > /dev/null
  for n in oam palette registers words; do npx vite-node tools/integration/prep26IceBallPixels.ts --neg=$n --out=$REC/iceball-neg-$n.json > /dev/null; done
  npx vite-node tools/integration/prep26IceBallCheck.ts --neg=lag --out=$REC/iceball-neg-lag.json > /dev/null ;;
revenge) ;;
superpower) ;;
esac; done
echo "receipts in $REC"
