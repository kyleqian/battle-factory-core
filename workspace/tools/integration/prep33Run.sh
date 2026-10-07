#!/bin/sh
# prep33 reproduction (run from workspace/).  Direct mGBA only (never the shared HTTP oracles).  Both dirs are caller-given; nothing in /tmp is reused implicitly.
#   OUT=<fresh probe dir> REC=<receipt dir> sh tools/integration/prep33Run.sh              # probes (each scenario twice, cmp'd incl. RGB) + checks + pixels + negatives
#   OUT=<existing probe dir> REC=<dir2> SKIP_PROBES=1 sh tools/integration/prep33Run.sh    # second checker pass over the same probes; cmp the receipts
#   STAGES="shockwave" ...                                                                  # subset (shockwave skillswap)
set -e
[ -n "$OUT" ] && [ -n "$REC" ] || { echo "usage: OUT=<probe dir> REC=<receipt dir> sh tools/integration/prep33Run.sh"; exit 2; }
STAGES=${STAGES:-shockwave skillswap}; mkdir -p "$REC" "$OUT/scratch"; export OUT
[ -n "$SKIP_PROBES" ] || sh tools/integration/prep33Probes.sh $STAGES 2>&1 | grep -v "Segmentation fault"
CFG="--config tools/integration/prep33.vite.config.ts"; E=tools/compare/evidence
for w in $STAGES; do case $w in
shockwave)
  npx vite-node tools/integration/prep33ShockWavePatch.ts "$OUT/scratch/shockWave.prep33.ts" > /dev/null
  PATCHED="$OUT/scratch/shockWave.prep33.ts"
  ACC="$E/shock-wave-player-dense-state.json.gz:player:$E/shock-wave-player-raw-rgb.tar.gz $E/shock-wave-opponent-dense-state.json.gz:opponent:$E/shock-wave-opponent-raw-rgb.tar.gz"
  ALT=""; for s in prep22-shock-wave-alt-player-manectric-wailmer:player prep22-shock-wave-alt-opponent-manectric-wailmer:opponent prep33-shock-wave-alt-player-raichu-weezing:player prep33-shock-wave-alt-opponent-weezing-snorlax:opponent; do
    n=${s%%:*}; ALT="$ALT $OUT/$n-r1.json:${s##*:}:$OUT/$n-r1-rgb"; done
  npx vite-node $CFG tools/integration/prep33ShockWaveCheck.ts $ACC $ALT --out=$REC/shockwave-check-unchanged.json 2> /dev/null
  PREP33_SHOCKWAVE=$PATCHED npx vite-node $CFG tools/integration/prep33ShockWaveCheck.ts $ACC $ALT --pixels --scratch=$OUT/scratch --out=$REC/shockwave-check-patched-pixels.json 2> /dev/null
  NEGW="$E/shock-wave-player-dense-state.json.gz:player:$E/shock-wave-player-raw-rgb.tar.gz $OUT/prep33-shock-wave-alt-opponent-weezing-snorlax-r1.json:opponent:$OUT/prep33-shock-wave-alt-opponent-weezing-snorlax-r1-rgb"
  for n in anchor palette order; do PREP33_SHOCKWAVE=$PATCHED npx vite-node $CFG tools/integration/prep33ShockWaveCheck.ts $NEGW --pixels --neg=$n --scratch=$OUT/scratch --out=$REC/shockwave-neg-$n.json 2> /dev/null; done
  npx vite-node $CFG tools/integration/prep33ShockWaveCheck.ts $NEGW --pixels --scratch=$OUT/scratch --out=$REC/shockwave-neg-unchanged-reducer.json 2> /dev/null ;;
skillswap)
  [ ! -f tools/integration/prep33SkillSwapRun.sh ] || sh tools/integration/prep33SkillSwapRun.sh ;;
esac; done
echo "receipts in $REC"
