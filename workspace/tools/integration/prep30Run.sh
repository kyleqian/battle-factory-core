#!/bin/sh
# prep30 reproduction (run from workspace/).  Direct mGBA only (never the shared HTTP oracles).  Every output goes to the caller-given dirs.
#   sh tools/integration/prep30Run.sh OUT_DIR REC_DIR [extrasensory] [psywave]     # probes (x2, cmp'd) into OUT_DIR, receipts into REC_DIR
#   SKIP_PROBES=1 sh tools/integration/prep30Run.sh OUT_DIR REC_DIR ...             # reuse the probes already in OUT_DIR (explicit), e.g. a second checker pass
# Compare REC_DIR with tools/integration/fixtures/prep30/ (cmp).
set -e
[ -n "$2" ] || { echo "usage: $0 OUT_DIR REC_DIR [extrasensory] [psywave]" >&2; exit 2; }
OUT=$1; REC=$2; shift 2; STAGES=${*:-extrasensory psywave}; mkdir -p "$OUT" "$REC"
[ -n "$SKIP_PROBES" ] || sh tools/integration/prep30Probes.sh "$OUT" $STAGES 2>&1 | grep -v "Segmentation fault"
for w in $STAGES; do case $w in
extrasensory)
  P=$OUT/prep25-extrasensory-alt; Q=$OUT/prep30-extrasensory-alt
  ALT="$P-player-alakazam-golem-r1.json:player $P-opponent-alakazam-golem-r1.json:opponent $Q-player-espeon-crobat-r1.json:player $Q-opponent-espeon-crobat-r1.json:opponent"
  ALTPX="$P-player-alakazam-golem-r1.json:$P-player-alakazam-golem-r1-rgb:player $P-opponent-alakazam-golem-r1.json:$P-opponent-alakazam-golem-r1-rgb:opponent $Q-player-espeon-crobat-r1.json:$Q-player-espeon-crobat-r1-rgb:player $Q-opponent-espeon-crobat-r1.json:$Q-opponent-espeon-crobat-r1-rgb:opponent"
  npx vite-node tools/integration/prep30ExtrasensoryCheck.ts $ALT --out=$REC/extrasensory-check.json > /dev/null
  npx vite-node tools/integration/prep30ExtrasensoryCheck.ts $ALT --phase=flip --out=$REC/extrasensory-check-flip.json > /dev/null
  npx vite-node tools/integration/prep30ExtrasensoryPixels.ts $ALTPX --out=$REC/extrasensory-pixels.json > /dev/null
  npx vite-node tools/integration/prep30ExtrasensoryPixels.ts $ALTPX --phase=flip --out=$REC/extrasensory-pixels-flip.json > /dev/null
  npx vite-node tools/integration/prep30ExtrasensoryPixels.ts $ALTPX --feed=corpus --out=$REC/extrasensory-pixels-corpus-fed.json > /dev/null
  mkdir -p "$OUT/xs-split"; for S in 0 8 12 16 18 20 22 24 26 28 30 36; do
    npx vite-node tools/integration/prep30ExtrasensoryPixels.ts $ALTPX --split=$S --out=$OUT/xs-split/s$S.json > /dev/null & done; wait
  python3 tools/integration/prep30SplitSummary.py $REC/extrasensory-split.json $OUT/xs-split/s*.json > /dev/null
  for n in oam palette scanline; do npx vite-node tools/integration/prep30ExtrasensoryPixels.ts --neg=$n --out=$REC/extrasensory-neg-$n.json > /dev/null; done ;;
psywave)
  P=$OUT/prep25-psywave-alt; Q=$OUT/prep30-psywave-alt
  ALT="$P-player-alakazam-golem-r1.json:player $P-opponent-alakazam-golem-r1.json:opponent $Q-player-espeon-crobat-r1.json:player $Q-opponent-espeon-crobat-r1.json:opponent"
  ALTPX="$P-player-alakazam-golem-r1.json:$P-player-alakazam-golem-r1-rgb:player $P-opponent-alakazam-golem-r1.json:$P-opponent-alakazam-golem-r1-rgb:opponent $Q-player-espeon-crobat-r1.json:$Q-player-espeon-crobat-r1-rgb:player $Q-opponent-espeon-crobat-r1.json:$Q-opponent-espeon-crobat-r1-rgb:opponent"
  npx vite-node tools/integration/prep30PsywaveCheck.ts $ALT --out=$REC/psywave-check.json > /dev/null
  npx vite-node tools/integration/prep30PsywaveCheck.ts $ALT --phase=flip --out=$REC/psywave-check-flip.json > /dev/null
  npx vite-node tools/integration/prep30PsywavePixels.ts $ALTPX --out=$REC/psywave-pixels.json > /dev/null
  npx vite-node tools/integration/prep30PsywavePixels.ts $ALTPX --phase=flip --out=$REC/psywave-pixels-flip.json > /dev/null
  npx vite-node tools/integration/prep30PsywavePixels.ts $ALTPX --feed=corpus --out=$REC/psywave-pixels-corpus-fed.json > /dev/null
  for n in oam palette; do npx vite-node tools/integration/prep30PsywavePixels.ts --neg=$n --out=$REC/psywave-neg-$n.json > /dev/null; done ;;
esac; done
echo "receipts in $REC"
