#!/bin/sh
# issue151: ROM-frame shift test. Per fixture, 2 fresh direct-mGBA runs retaining the RGB frames (speciesAudit5Run.ts), then for each age the full-frame
# residual of live(age) vs ROM frame start+age+d, d in -1,0,+1 (speciesAudit3LagShift.ts) and bbox / top ROM<-live colour pairs (speciesAudit5Diff.ts).
# Prints the shift table of each run and whether the two runs' tables are identical. usage: issue151Shift.sh <outDir> <ages> <fixture.json>...   (ages: "170 171 ...")
cd "$(dirname "$0")/../.." || exit 1
export PYTHONPATH=${PYTHONPATH:-${POKEBENCH_VENDOR_DIR:-../../vendor}/libmgba-py}
OUT=$1; AGES=$2; shift 2; mkdir -p "$OUT"
for fx in "$@"; do
  stem=$(basename "$fx" .json); first=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['denseWindow']['startFrame'])" "$fx")
  for r in 0 1; do
    rm -rf "$OUT/ev$r/$stem-run0"
    FRESH=1 POKEBENCH_LIVE_EVIDENCE_DIR="$OUT/ev$r" npx vite-node tools/integration/speciesAudit5Run.ts "$fx" >/dev/null 2>&1 &
  done; wait
  for r in 0 1; do
    npx vite-node tools/integration/speciesAudit3LagShift.ts "$fx" "$OUT/ev$r/$stem-run0" "$first" $AGES > "$OUT/$stem.shift$r.txt" 2>&1
  done
  echo "== $stem (start $first) shift tables identical over 2 fresh runs: $(cmp -s "$OUT/$stem.shift0.txt" "$OUT/$stem.shift1.txt" && echo true || echo false)"
  cat "$OUT/$stem.shift0.txt"
  npx vite-node tools/integration/speciesAudit5Diff.ts "$fx" "$OUT/ev0/$stem-run0" "$first" ${DIFFAGE:-175} 2>&1 | sed 's/^/  diff /'
  [ -n "$TEAR" ] && for r in 0 1; do npx vite-node tools/integration/issue151Tear.ts "$fx" "$OUT/ev$r/$stem-run0" "$first" $TEAR > "$OUT/$stem.tear$r.txt" 2>&1; done && echo "  tear (identical over 2 fresh runs: $(cmp -s "$OUT/$stem.tear0.txt" "$OUT/$stem.tear1.txt" && echo true || echo false))" && sed "s/^/  /" "$OUT/$stem.tear0.txt"
  rm -rf "$OUT/ev0/$stem-run0/rgb" "$OUT/ev1/$stem-run0/rgb"
done
