#!/bin/sh
# prep34 reproduction (run from workspace/).  Direct mGBA only (never the shared HTTP oracles).  Both dirs are caller-given; nothing in /tmp is reused implicitly.
#   OUT=<fresh probe dir> REC=<receipt dir> sh tools/integration/prep34Run.sh                 # probes (each scenario twice, cmp'd) + checkers + pixels + negative controls
#   OUT=<existing probe dir> REC=<dir2> SKIP_PROBES=1 sh tools/integration/prep34Run.sh       # second checker pass over the same probes; cmp the receipts
#   STAGES="es" ...                                                                            # subset (es memento; memento also runs the scanline-history probes)
set -e
[ -n "$OUT" ] && [ -n "$REC" ] || { echo "usage: OUT=<probe dir> REC=<receipt dir> sh tools/integration/prep34Run.sh"; exit 2; }
STAGES=${STAGES:-es memento}; mkdir -p "$REC"; export OUT
PROBE_STAGES=$(echo "$STAGES" | sed 's/memento/memento history/')
[ -n "$SKIP_PROBES" ] || sh tools/integration/prep34Probes.sh $PROBE_STAGES 2>&1 | grep -v "Segmentation fault"
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
  M=$OUT; W=""; for s in mechanic-memento-player-weezing-opponent-onix mechanic-memento-opponent-weezing-player-onix prep34-memento-alt-player-weezing-golem prep34-memento-alt-opponent-weezing-golem prep34-memento-after-psywave-player-weezing-chimecho prep34-memento-after-dragon-dance-player-weezing-dragonite; do W="$W $M/$s-r1.json"; done
  npx vite-node tools/integration/prep34MementoCheck.ts $W --out=$REC/memento-check.json > /dev/null
  npx vite-node tools/integration/prep34MementoCheck.ts $W --scanline=captured --out=$REC/memento-check-captured-scanline.json > /dev/null
  npx vite-node tools/integration/prep34MementoCheck.ts $M/prep34-memento-after-psywave-player-weezing-chimecho-r1.json $M/prep34-memento-after-dragon-dance-player-weezing-dragonite-r1.json --win0=zero --out=$REC/memento-check-later-body-win0-zero.json > /dev/null
  for n in top bgx; do npx vite-node tools/integration/prep34MementoCheck.ts $W --neg=$n --out=$REC/memento-neg-check-$n.json > /dev/null; done
  PX="$M/mechanic-memento-player-weezing-opponent-onix-r1.json:$M/mechanic-memento-player-weezing-opponent-onix-r1-rgb $M/mechanic-memento-opponent-weezing-player-onix-r1.json:$M/mechanic-memento-opponent-weezing-player-onix-r1-rgb"
  npx vite-node tools/integration/prep34MementoPixels.ts $PX --out=$REC/memento-pixels.json > /dev/null
  for c in captured swapped zero; do npx vite-node tools/integration/prep34MementoPixels.ts $PX --scanline=$c --out=$REC/memento-pixels-scanline-$c.json > /dev/null; done
  for n in top bgx; do npx vite-node tools/integration/prep34MementoPixels.ts $PX --neg=$n --out=$REC/memento-neg-pixels-$n.json > /dev/null; done
  python3 tools/integration/prep34HistorySummary.py $OUT $REC/scanline-history.json
  python3 tools/integration/prep34Row7Neutral.py $OUT $REC/memento-row7-neutral.json ;;
esac; done
echo "receipts in $REC"
