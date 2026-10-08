#!/bin/sh
# prep39 reproduction (run from workspace/). Direct mGBA only (never the shared HTTP oracles). Both dirs are caller-given.
#   OUT=<fresh probe dir> REC=<receipt dir> sh tools/integration/prep39Run.sh              # probes (twice fresh, cmp'd) + checkers
#   OUT=<existing probe dir> REC=<dir2> SKIP_PROBES=1 sh tools/integration/prep39Run.sh    # second checker pass; cmp the receipts
set -e
[ -n "$OUT" ] && [ -n "$REC" ] || { echo "usage: OUT=<probe dir> REC=<receipt dir> sh tools/integration/prep39Run.sh"; exit 2; }
mkdir -p "$REC"
ALL="prep37-on-player-persian-slowbro prep37-on-opponent-persian-slowbro prep37-off-player-persian-slowbro prep37-on-opponent-golbat-slowbro prep39-on-player-persian-onix prep39-on-opponent-rattata-slowbro prep39-on-player-golem-onix prep39-on-opponent-golem-onix"
[ -n "$SKIP_PROBES" ] || sh tools/integration/prep39Probes.sh $ALL 2>&1 | grep -v "Segmentation fault"
ARGS=""
for s in $ALL; do ARGS="$ARGS $OUT/$s-r1.json:$OUT/$s-r1-rgb"; done
python3 tools/integration/prep39ProbeDigest.py "$OUT" "$REC/probes.json"
# the model through the production compositor: every window, every row (alternate-phase rows attributed, never accepted silently)
npx vite-node tools/integration/prep39FadeCheck.ts $ARGS --attribute --out="$REC/fade-check.json" | tail -1
# negative controls (no attribution) on the accepted GOLEM<->ONIX pair + the PERSIAN<->SLOWBRO pair: each must FAIL
ARGS=""
for s in prep39-on-player-golem-onix prep39-on-opponent-golem-onix prep37-on-player-persian-slowbro prep37-on-opponent-persian-slowbro; do ARGS="$ARGS $OUT/$s-r1.json:$OUT/$s-r1-rgb"; done
for n in age+1 alpha-step2 no-white lag0-obj; do
  npx vite-node tools/integration/prep39FadeCheck.ts $ARGS --neg=$n --out="$REC/fade-neg-$n.json" | tail -1 | grep -q '^FAIL$' || { echo "negative $n did not fail"; exit 1; }
done
npx vite-node tools/integration/prep39FadeCheck.ts $ARGS --io-lag=0 --out="$REC/fade-neg-iolag0.json" | tail -1 | grep -q '^FAIL$' || { echo "negative io-lag=0 did not fail"; exit 1; }
echo "negatives: age+1 alpha-step2 no-white lag0-obj io-lag=0 all FAIL"
echo "receipts in $REC"
