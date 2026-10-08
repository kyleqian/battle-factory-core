#!/bin/sh
# prep37 reproduction (run from workspace/). Direct mGBA only (never the shared HTTP oracles). Both dirs are caller-given.
#   OUT=<fresh probe dir> REC=<receipt dir> sh tools/integration/prep37Run.sh              # probes (twice fresh, cmp'd) + every checker
#   OUT=<existing probe dir> REC=<dir2> SKIP_PROBES=1 sh tools/integration/prep37Run.sh    # second checker pass; cmp the receipts
set -e
[ -n "$OUT" ] && [ -n "$REC" ] || { echo "usage: OUT=<probe dir> REC=<receipt dir> sh tools/integration/prep37Run.sh"; exit 2; }
mkdir -p "$REC"
[ -n "$SKIP_PROBES" ] || sh tools/integration/prep37Probes.sh 2>&1 | grep -v "Segmentation fault"
M=$OUT/mechanic-substitute; Q=$OUT/prep37
ACC="$M-player-golem-opponent-onix-r1.json:$M-player-golem-opponent-onix-r1-rgb $M-opponent-golem-player-onix-r1.json:$M-opponent-golem-player-onix-r1-rgb"
ALT="$Q-on-player-persian-slowbro-r1.json:$Q-on-player-persian-slowbro-r1-rgb $Q-on-opponent-persian-slowbro-r1.json:$Q-on-opponent-persian-slowbro-r1-rgb $Q-off-player-persian-slowbro-r1.json:$Q-off-player-persian-slowbro-r1-rgb $Q-on-opponent-golbat-slowbro-r1.json:$Q-on-opponent-golbat-slowbro-r1-rgb"
python3 tools/integration/prep37ProbeDigest.py "$OUT" "$REC/probes.json"
SCR=$(mktemp -d "${TMPDIR:-/tmp}/prep37-patch-XXXXXX")
# item 1: body (87 rows) with production-derived inputs
npx vite-node tools/integration/prep37BodyCheck.ts $ACC $ALT --renderer=unchanged --out=$REC/body-unchanged.json
npx vite-node tools/integration/prep37BodyCheck.ts $ACC $ALT --renderer=patched --scratch=$SCR --out=$REC/body-patched.json
for n in age0+1 dollY+1 idleRest0; do npx vite-node tools/integration/prep37BodyCheck.ts $ACC $ALT --renderer=patched --scratch=$SCR --neg=$n --out=$REC/body-neg-$n.json > /dev/null; done
rm -rf "$SCR"
# item 2: persistent field state + status-animation windows (Scene ON both orientations, Scene OFF player)
python3 tools/integration/prep37Field.py $REC/field.json $ALT
# item 3(c): static-fallback pixel cost per status window (ROM frames only)
python3 tools/integration/prep37Fallback.py $REC/field.json $REC/fallback.json $ALT > /dev/null
# item 3(b): live adapters vs a doll defender (source scan)
npx vite-node tools/integration/prep37Adapters.ts --out=$REC/adapters.json > /dev/null
echo "receipts in $REC"
