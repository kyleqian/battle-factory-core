#!/bin/sh
# fps147Run.sh <fresh-out-dir>   (run from workspace/; docs/fps147-focus-punch-setup.md)
# Reproduces every fps147 artifact into a fresh directory and compares each with the committed copy:
#   1. fps147Stage.py           -> <out>/fixtures/scenarios/*.json           vs tools/integration/fixtures/fps147/scenarios
#   2. fps147Probes.sh          -> <out>/probes/r{1,2} + <out>/dump (direct mGBA, Scene ON, each job twice fresh; r1 == r2 required)
#   3. fps147Receipt.py         -> <out>/fixtures/{rom-windows,probe-sha256}.json
#   4. fps147Compare.ts (+ the 4 controls) on the rebuilt fixtures -> <out>/fixtures/compare*.json
# Prints "ALL SAME" when every rebuilt file is byte-identical to the committed one (exit 1 otherwise).
set -eu
OUT=$1
[ ! -e "$OUT" ] || { echo "fps147Run: $OUT exists; pass a fresh directory" >&2; exit 2; }
FIX=tools/integration/fixtures/fps147
mkdir -p "$OUT/fixtures"
python3 tools/integration/fps147Stage.py "$OUT/fixtures/scenarios" > /dev/null
sh tools/integration/fps147Probes.sh "$OUT" "$OUT/fixtures/scenarios"
python3 tools/integration/fps147Receipt.py "$OUT" "$OUT/fixtures"
node --experimental-strip-types --no-warnings tools/integration/fps147Compare.ts "$OUT/dump" "$OUT/fixtures/compare.json" \
  --fixtures="$OUT/fixtures" | tail -1
for n in age+1 wrong-side no-shake no-blend; do
  node --experimental-strip-types --no-warnings tools/integration/fps147Compare.ts "$OUT/dump" "$OUT/fixtures/compare-$n.json" \
    --fixtures="$OUT/fixtures" --neg=$n | tail -1
done
bad=0
for f in $(cd "$FIX" && find . -type f | sort); do
  if cmp -s "$FIX/$f" "$OUT/fixtures/$f"; then echo "same  $f"; else echo "DIFF  $f"; bad=1; fi
done
[ "$bad" = 0 ] && echo "ALL SAME" || { echo "DIFFERENCES"; exit 1; }
