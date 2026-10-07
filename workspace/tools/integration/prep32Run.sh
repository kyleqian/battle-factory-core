#!/bin/sh
# prep32 reproduction (run from workspace/).  Direct mGBA only (never the shared HTTP oracles).  Both dirs are caller-given; nothing in /tmp is reused implicitly.
#   OUT=<fresh probe dir> REC=<receipt dir> sh tools/integration/prep32Run.sh                 # probes (each scenario twice, cmp'd) + checkers + pixels + negative controls
#   OUT=<existing probe dir> REC=<dir2> SKIP_PROBES=1 sh tools/integration/prep32Run.sh       # second checker pass over the same probes; cmp the receipts
#   STAGES="nightmare" ...                                                                     # subset of: nightmare flatter
set -e
[ -n "$OUT" ] && [ -n "$REC" ] || { echo "usage: OUT=<probe dir> REC=<receipt dir> sh tools/integration/prep32Run.sh"; exit 2; }
STAGES=${STAGES:-nightmare flatter}; mkdir -p "$REC"; export OUT
[ -n "$SKIP_PROBES" ] || sh tools/integration/prep32Probes.sh $STAGES 2>&1 | grep -v "Segmentation fault"
EV=tools/compare/evidence
for w in $STAGES; do case $w in
nightmare)
  CHK="$EV/nightmare-player-dense-state.json.gz:player $EV/nightmare-opponent-dense-state.json.gz:opponent"
  PIX="$EV/nightmare-player-dense-state.json.gz:$EV/nightmare-player-raw-rgb.tar.gz:player:HAUNTER,SHUCKLE $EV/nightmare-opponent-dense-state.json.gz:$EV/nightmare-opponent-raw-rgb.tar.gz:opponent:HAUNTER,KANGASKHAN"
  for s in prep25-nightmare-alt-player-gengar-golem:player:GENGAR,GOLEM prep25-nightmare-alt-opponent-gengar-golem:opponent:GENGAR,GOLEM \
           d4a-nightmare-extra-player-gengar-golbat:player:GENGAR,GOLBAT d4a-nightmare-extra-opponent-gengar-golbat:opponent:GENGAR,GOLBAT \
           d4a-nightmare-extra-player-haunter-snorlax:player:HAUNTER,SNORLAX d4a-nightmare-extra-opponent-haunter-snorlax:opponent:HAUNTER,SNORLAX; do
    n=${s%%:*}; rest=${s#*:}; side=${rest%%:*}; CHK="$CHK $OUT/$n-r1.json:$side"; PIX="$PIX $OUT/$n-r1.json:$OUT/$n-r1-rgb:$rest"; done
  npx vite-node tools/integration/prep32NightmareCheck.ts $CHK --out=$REC/nightmare-check.json > /dev/null
  npx vite-node tools/integration/prep32NightmareCheck.ts $CHK --lend=entry --out=$REC/nightmare-check-lend-entry.json > /dev/null
  npx vite-node tools/integration/prep32NightmarePixels.ts $PIX --out=$REC/nightmare-pixels.json > /dev/null
  for n in palette registers shake phase; do npx vite-node tools/integration/prep32NightmareCheck.ts --neg=$n --out=$REC/nightmare-neg-check-$n.json > /dev/null; done
  for n in palette shake; do npx vite-node tools/integration/prep32NightmarePixels.ts --neg=$n --out=$REC/nightmare-neg-pixels-$n.json > /dev/null; done
  npx vite-node tools/integration/prep32NightmarePixels.ts --lend=entry --out=$REC/nightmare-pixels-lend-entry.json > /dev/null ;;
flatter)
  F=$OUT/prep25-flatter-alt; FW="$EV/flatter-player-dense-state.json.gz $EV/flatter-opponent-dense-state.json.gz $F-player-hypno-golem-r1.json $F-opponent-hypno-golem-r1.json"
  FP="$EV/flatter-player-dense-state.json.gz:$EV/flatter-player-raw-rgb.tar.gz:player:NIDORINA,ONIX $EV/flatter-opponent-dense-state.json.gz:$EV/flatter-opponent-raw-rgb.tar.gz:opponent:NIDORINA,ONIX"
  FP="$FP $F-player-hypno-golem-r1.json:$F-player-hypno-golem-r1-rgb:player:HYPNO,GOLEM $F-opponent-hypno-golem-r1.json:$F-opponent-hypno-golem-r1-rgb:opponent:HYPNO,GOLEM"
  npx vite-node tools/integration/prep32FlatterWords.ts $FW --out=$REC/flatter-words.json > /dev/null
  npx vite-node tools/integration/prep32FlatterCheck.ts $FW --out=$REC/flatter-check.json > /dev/null
  npx vite-node tools/integration/prep32FlatterPixels.ts $FP --out=$REC/flatter-pixels.json > /dev/null
  for n in seed steps; do npx vite-node tools/integration/prep32FlatterWords.ts --neg=$n --out=$REC/flatter-neg-words-$n.json > /dev/null; done
  for n in seed registers palette; do npx vite-node tools/integration/prep32FlatterCheck.ts --neg=$n --out=$REC/flatter-neg-check-$n.json > /dev/null; done
  for n in registers palette; do npx vite-node tools/integration/prep32FlatterPixels.ts --neg=$n --out=$REC/flatter-neg-pixels-$n.json > /dev/null; done ;;
esac; done
echo "receipts in $REC"
