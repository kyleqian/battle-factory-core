#!/bin/sh
# prep36 reproduction (run from workspace/). Direct mGBA only (never the shared HTTP oracles). Both dirs are caller-given; nothing in /tmp is reused implicitly.
#   OUT=<fresh probe dir> REC=<receipt dir> sh tools/integration/prep36Run.sh             # probes (each scenario twice from fresh processes, state cmp + RGB diff -rq) + check + pixels + negatives
#   OUT=<existing probe dir> REC=<dir2> SKIP_PROBES=1 sh tools/integration/prep36Run.sh   # second checker pass over the same probes; cmp the receipts
set -e
[ -n "$OUT" ] && [ -n "$REC" ] || { echo "usage: OUT=<probe dir> REC=<receipt dir> sh tools/integration/prep36Run.sh"; exit 2; }
mkdir -p "$REC" "$OUT/scratch"
SCEN="prep29-eruption-alt-player-torkoal-golem:player prep29-eruption-alt-opponent-torkoal-golem:opponent prep36-eruption-alt-player-camerupt-golem:player
prep36-eruption-alt-opponent-camerupt-golem:opponent prep36-eruption-alt-player-steelix-golem:player prep36-eruption-alt-opponent-weezing-golem:opponent
prep36-eruption-alt-opponent-onix-golem:opponent"
probe() { for r in 1 2; do ( rm -rf "$OUT/$1-r$r.json" "$OUT/$1-r$r-rgb"; python3 tools/run-mgba-probe.py "$OUT/$1-r$r.json" -- python3 tools/compare/eruptionProbe.py \
  tools/battle-lab/$1.json "$OUT/$1-r$r.json" "$OUT/$1-r$r-rgb" > "$OUT/$1-r$r.out" 2>&1 ) & done; wait; }
if [ -z "$SKIP_PROBES" ]; then
  for s in $SCEN; do n=${s%%:*}; probe $n; f="$OUT/$n-r1.json"; [ -s "$f" ] || { echo "EMPTY $f"; exit 1; }
    cmp -s "$f" "$OUT/$n-r2.json" || { echo "DIFF $f"; exit 1; }; diff -rq "$OUT/$n-r1-rgb" "$OUT/$n-r2-rgb" > /dev/null || { echo "RGB DIFF $n"; exit 1; }
    echo "probe $n: r1 == r2 (state cmp, RGB diff -rq)"; done
fi
EV=tools/compare/evidence
W="$EV/eruption-player-dense-state.json.gz:player:$EV/eruption-player-raw-rgb.tar.gz $EV/eruption-opponent-dense-state.json.gz:opponent:$EV/eruption-opponent-raw-rgb.tar.gz"
for s in $SCEN; do n=${s%%:*}; W="$W $OUT/$n-r1.json:${s##*:}:$OUT/$n-r1-rgb"; done
npx vite-node tools/integration/prep36EruptionCheck.ts $W --pixels --scratch="$OUT/scratch" --out="$REC/eruption-check-pixels.json" 2> /dev/null
NEGW="$EV/eruption-player-dense-state.json.gz:player:$EV/eruption-player-raw-rgb.tar.gz $OUT/prep36-eruption-alt-opponent-camerupt-golem-r1.json:opponent:$OUT/prep36-eruption-alt-opponent-camerupt-golem-r1-rgb"
for n in wave2 ydelta anchor order palette sub; do
  npx vite-node tools/integration/prep36EruptionCheck.ts $NEGW --pixels --neg=$n --scratch="$OUT/scratch" --out="$REC/eruption-neg-$n.json" 2> /dev/null; done
python3 tools/integration/prep36Summary.py "$REC" > "$REC/summary.txt"
echo "receipts in $REC"
