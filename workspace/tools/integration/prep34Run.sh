#!/bin/sh
# prep34 reproduction (run from workspace/).  Direct mGBA only (never the shared HTTP oracles).  Both dirs are caller-given; nothing in /tmp is reused implicitly.
#   OUT=<fresh probe dir> REC=<receipt dir> sh tools/integration/prep34Run.sh                 # probes (each scenario twice, cmp'd) + checkers + pixels + negative controls
#   OUT=<existing probe dir> REC=<dir2> SKIP_PROBES=1 sh tools/integration/prep34Run.sh       # second checker pass over the same probes; cmp the receipts
#   STAGES="es" ...                                                                            # subset (es memento)
set -e
[ -n "$OUT" ] && [ -n "$REC" ] || { echo "usage: OUT=<probe dir> REC=<receipt dir> sh tools/integration/prep34Run.sh"; exit 2; }
STAGES=${STAGES:-es}; mkdir -p "$REC"; export OUT
[ -n "$SKIP_PROBES" ] || sh tools/integration/prep34Probes.sh $STAGES 2>&1 | grep -v "Segmentation fault"
for w in $STAGES; do case $w in
es)
  A=$OUT/mechanic-extreme-speed; B=$OUT/prep34-extreme-speed-alt
  W="$A-player-arcanine-dugtrio-r1.json:player $A-arcanine-dugtrio-r1.json:opponent $B-player-smeargle-golem-r1.json:player $B-opponent-smeargle-golem-r1.json:opponent"
  npx vite-node tools/integration/prep34ExtremeSpeedCheck.ts $W --out=$REC/es-check.json > /dev/null
  npx vite-node tools/integration/prep34ExtremeSpeedCheck.ts $W --yoffset=hardcoded --out=$REC/es-neg-check-yoffset-hardcoded.json > /dev/null
  for n in age scroll anchor; do npx vite-node tools/integration/prep34ExtremeSpeedCheck.ts $W --neg=$n --out=$REC/es-neg-check-$n.json > /dev/null; done
  PX="$A-player-arcanine-dugtrio-r1.json:$A-player-arcanine-dugtrio-r1-rgb:player $A-arcanine-dugtrio-r1.json:$A-arcanine-dugtrio-r1-rgb:opponent"
  npx vite-node tools/integration/prep34ExtremeSpeedPixels.ts $PX --out=$REC/es-pixels.json > /dev/null
  for g in 42 44; do npx vite-node tools/integration/prep34ExtremeSpeedPixels.ts $PX --age0=$g --out=$REC/es-neg-pixels-age0-$g.json > /dev/null; done ;;
memento)
  sh tools/integration/prep34MementoStage.sh ;;
esac; done
echo "receipts in $REC"
