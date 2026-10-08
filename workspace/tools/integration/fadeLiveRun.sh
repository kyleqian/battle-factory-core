#!/bin/sh
# S10A Substitute fade live (run from workspace/). Direct mGBA only (never the shared HTTP oracles). Both dirs are caller-given.
#   OUT=<fresh probe dir> REC=<receipt dir> sh tools/integration/fadeLiveRun.sh              # prep39 probes (twice fresh, cmp'd) + check
#   OUT=<existing probe dir> REC=<dir2> SKIP_PROBES=1 sh tools/integration/fadeLiveRun.sh    # second check pass; cmp the receipts
set -e
[ -n "$OUT" ] && [ -n "$REC" ] || { echo "usage: OUT=<probe dir> REC=<receipt dir> sh tools/integration/fadeLiveRun.sh"; exit 2; }
mkdir -p "$REC"
ALL="prep37-on-player-persian-slowbro prep37-on-opponent-persian-slowbro prep37-off-player-persian-slowbro prep37-on-opponent-golbat-slowbro prep39-on-player-persian-onix prep39-on-opponent-rattata-slowbro prep39-on-player-golem-onix prep39-on-opponent-golem-onix"
[ -n "$SKIP_PROBES" ] || sh tools/integration/prep39Probes.sh $ALL 2>&1 | grep -v "Segmentation fault"
ARGS=""
for s in $ALL; do ARGS="$ARGS $OUT/$s-r1.json:$OUT/$s-r1-rgb"; done
python3 tools/integration/prep39ProbeDigest.py "$OUT" "$REC/probes.json"
npx vite-node tools/integration/fadeLiveCheck.ts $ARGS --out="$REC/fade-live-check.json" | tail -${TAIL:-1}
