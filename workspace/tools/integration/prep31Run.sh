#!/bin/sh
# prep31 reproduction (run from workspace/).  Direct mGBA only (never the shared HTTP oracles).  Both dirs are caller-given; nothing in /tmp is reused implicitly.
#   OUT=<fresh probe dir> REC=<receipt dir> sh tools/integration/prep31Run.sh                 # probes (each scenario twice, cmp'd) + checkers + pixels + negative controls
#   OUT=<existing probe dir> REC=<dir2> SKIP_PROBES=1 sh tools/integration/prep31Run.sh       # second checker pass over the same probes; cmp the receipts
#   STAGES="superpower" ...                                                                    # subset (superpower spitup)
set -e
[ -n "$OUT" ] && [ -n "$REC" ] || { echo "usage: OUT=<probe dir> REC=<receipt dir> sh tools/integration/prep31Run.sh"; exit 2; }
STAGES=${STAGES:-superpower spitup}; mkdir -p "$REC"; export OUT
[ -n "$SKIP_PROBES" ] || sh tools/integration/prep31Probes.sh $STAGES 2>&1 | grep -v "Segmentation fault"
for w in $STAGES; do case $w in
superpower)
  P=$OUT/prep25-superpower-alt; Q=$OUT/prep31-superpower-alt
  ALT="$P-player-machamp-golem-r1.json:player $P-opponent-machamp-golem-r1.json:opponent $Q-player-machamp-weezing-r1.json:player $Q-opponent-weezing-snorlax-r1.json:opponent"
  npx vite-node tools/integration/prep31SuperpowerCheck.ts $ALT --out=$REC/superpower-check.json > /dev/null
  npx vite-node tools/integration/prep31SuperpowerPixels.ts $P-player-machamp-golem-r1.json:$P-player-machamp-golem-r1-rgb:player:MACHAMP,GOLEM $P-opponent-machamp-golem-r1.json:$P-opponent-machamp-golem-r1-rgb:opponent:MACHAMP,GOLEM \
    $Q-player-machamp-weezing-r1.json:$Q-player-machamp-weezing-r1-rgb:player:MACHAMP,WEEZING $Q-opponent-weezing-snorlax-r1.json:$Q-opponent-weezing-snorlax-r1-rgb:opponent:WEEZING,SNORLAX --out=$REC/superpower-pixels.json > /dev/null
  for n in oam palette registers phase; do npx vite-node tools/integration/prep31SuperpowerCheck.ts --neg=$n --out=$REC/superpower-neg-check-$n.json > /dev/null; done
  for n in oam palette registers; do npx vite-node tools/integration/prep31SuperpowerPixels.ts --neg=$n --out=$REC/superpower-neg-pixels-$n.json > /dev/null; done ;;
spitup) [ -f tools/integration/prep31SpitUpRun.sh ] && sh tools/integration/prep31SpitUpRun.sh ;;
esac; done
echo "receipts in $REC"
