#!/bin/sh
# prep27 reproduction (run from workspace/).  Direct mGBA only.  Probes run twice from fresh processes (R1/R2) and are cmp'd; checkers run on R1.
#   sh tools/integration/prep27Run.sh                       # everything; receipts -> $REC (default tools/integration/fixtures/prep27)
#   REC=/tmp/rec2 SKIP_PROBES=1 sh tools/integration/prep27Run.sh   # second checker pass over the existing /tmp/p27/r1; cmp receipts against tools/integration/fixtures/prep27
set -e
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
R1=${R1:-/tmp/p27/r1}; R2=${R2:-/tmp/p27/r2}; REC=${REC:-tools/integration/fixtures/prep27}; mkdir -p "$REC"
if [ -z "$SKIP_PROBES" ]; then
  OUT=$R1 sh tools/integration/prep27Probes.sh 2>&1 | grep -v "Segmentation fault"; OUT=$R2 sh tools/integration/prep27Probes.sh 2>&1 | grep -v "Segmentation fault"
  for d in flow repl; do for f in $R1/$d/*.json; do cmp "$f" "$R2/$d/$(basename $f)" || { echo "DIFF $f"; exit 1; }; done; done
  for f in $R1/dense/*.json; do cmp "$f" "$R2/dense/$(basename $f)" || { echo "DIFF $f"; exit 1; }; cmp -s "$R1/dense/$(basename $f .json)-rgb/00071.rgb" "$R2/dense/$(basename $f .json)-rgb/00071.rgb" || true; done
  for s in $R1/dense/*-rgb; do b=$(basename $s); for g in $s/*.rgb; do cmp -s "$g" "$R2/dense/$b/$(basename $g)" || { echo "RGB DIFF $g"; exit 1; }; done; done
  echo "probes: R1 == R2 byte-identical (state, dense json, RGB)"
  OUT=$R1/endeavor sh tools/integration/prep27EndeavorProbes.sh 2>&1 | grep -v "Segmentation fault"; OUT=$R2/endeavor sh tools/integration/prep27EndeavorProbes.sh 2>&1 | grep -v "Segmentation fault"
  for f in $R1/endeavor/*.json; do cmp "$f" "$R2/endeavor/$(basename $f)" || { echo "DIFF $f"; exit 1; }; done
  for s in $R1/endeavor/*-rgb; do b=$(basename $s); for g in $s/*.rgb; do cmp -s "$g" "$R2/endeavor/$b/$(basename $g)" || { echo "RGB DIFF $g"; exit 1; }; done; done
  echo "endeavor probes: R1 == R2 byte-identical"
fi
python3 tools/integration/prep27BatonTimeline.py $R1/flow $REC/baton-rom-timeline.json > /dev/null
python3 tools/integration/prep27BatonTimeline.py $R1/repl $REC/baton-rom-replacement.json > /dev/null
D=$R1/dense; A=mechanic-baton-pass-player-aipom-opponent-onix; B=mechanic-baton-pass-opponent-aipom-player-onix; C=prep27-baton-player-ninjask-opponent-golem; E=prep27-baton-opponent-ninjask-player-golem
npx vite-node tools/integration/prep27BatonReducerCheck.ts $D/$A.json:$D/$A-rgb:player:190,95 $D/$B.json:$D/$B-rgb:opponent:190,95 $D/$C.json:$D/$C-rgb:player:302,76 $D/$E.json:$D/$E-rgb:opponent:302,76 --out=$REC/baton-reducer-check.json
for n in center matrix palette; do npx vite-node tools/integration/prep27BatonReducerCheck.ts $D/$A.json:$D/$A-rgb:player:190,95 --neg=$n --out=$REC/baton-reducer-neg-$n.json > /dev/null; done
node --experimental-strip-types tools/integration/prep27ProdBaton.ts /tmp/p27/prodBaton.json $REC/baton-prod-timeline.json > /dev/null
X=$R1/endeavor
npx vite-node tools/integration/prep27EndeavorCheck.ts $X/player-diglett-chansey.json:player:50,113 $X/opponent-diglett-chansey.json:opponent:50,113 $X/player-abra-blissey.json:player:63,242 $X/opponent-abra-blissey.json:opponent:63,242 --out=$REC/endeavor-check.json
for n in y2 power; do npx vite-node tools/integration/prep27EndeavorCheck.ts $X/player-abra-blissey.json:player:63,242 --neg=$n --out=$REC/endeavor-neg-$n.json > /dev/null; done
node --experimental-strip-types tools/integration/prep27W3Predicate.ts > $REC/endeavor-w3-predicate.json
echo "receipts in $REC"
