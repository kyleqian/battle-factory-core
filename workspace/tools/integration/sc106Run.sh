#!/bin/sh
# sc106 (S10A, ISSUES #166 slice c): reproduce tools/integration/fixtures/sc106-live-receipt.json from scratch.
#   sh tools/integration/sc106Run.sh <fresh-out-dir-inside-the-repo>        (from workspace/; ~6-10 min, 20 census shards in parallel)
# 1. git-archives the base (52c181d54) and the tested commit (SC106_REV, default HEAD) into <out>/{base,final};
# 2. sc106RouteScan.ts on the anchor routes (6 Scene ON + 2 Scene OFF) in both trees;
# 3. sc106Soak.ts (the randomRoundSoak pin runs with action logs) in both trees;
# 4. sc106LiveShareCensus.ts seeds 0..999 (ten --index-from shards) in both trees, then sc106CensusDelta.py;
# 5. sc106Receipt.py, compared with the committed receipt: prints ALL SAME or the differing keys.
set -eu
OUT=$1
REV=${SC106_REV:-HEAD}
W=$(pwd)
ROOT=$(git rev-parse --show-toplevel)
if [ -e "$OUT" ]; then echo "out dir $OUT exists" >&2; exit 1; fi
mkdir -p "$OUT"
OUT=$(cd "$OUT" && pwd)
for t in base final; do
  rev=52c181d54; [ "$t" = final ] && rev=$REV
  mkdir "$OUT/$t"
  git -C "$ROOT" archive "$rev" | tar -x -C "$OUT/$t"
  ln -s "$W/node_modules" "$OUT/$t/workspace/node_modules"
  for f in sc106RouteScan.ts sc106LiveShareCensus.ts sc106Soak.ts; do cp "$W/tools/integration/$f" "$OUT/$t/workspace/tools/integration/$f"; done
done
for t in base final; do
  mkdir -p "$OUT/run/routes-$t"
  (cd "$OUT/$t/workspace"
   for r in "0 2 on" "3 3 on" "3 1 on" "6 0 on" "13 3 on" "10 2 on" "0 2 off" "13 3 off"; do
     set -- $r
     node --experimental-strip-types --no-warnings tools/integration/sc106RouteScan.ts --seeds=$1..$1 --route=$2,$2,$2,$2,$2,$2,$2,$2 \
       --streak=0 --scene=$3 --out="$OUT/run/routes-$t/$1-$2_$2_$2_$2_$2_$2_$2_$2-$3.json"
   done
   node --experimental-strip-types --no-warnings tools/integration/sc106Soak.ts > "$OUT/run/soak-$t.json")
done
for t in base final; do
  mkdir -p "$OUT/census-$t"
  for k in 0 1 2 3 4 5 6 7 8 9; do
    (cd "$OUT/$t/workspace" && node --experimental-strip-types --no-warnings tools/integration/sc106LiveShareCensus.ts \
      --seeds=$((k * 100))..$((k * 100 + 99)) --index-from=$((k * 100)) --out="$OUT/census-$t/r$k.json" \
      --commands="$OUT/census-$t/r$k.jsonl" --stats="$OUT/census-$t/s$k.jsonl" > "$OUT/census-$t/r$k.log" 2>&1) &
  done
done
wait
python3 "$W/tools/integration/sc106CensusDelta.py" "$OUT/census-base" "$OUT/census-final" "$W/tools/integration/fixtures/stat101/exposure.json" \
  "$OUT/run/census-delta.json" > "$OUT/run/census-delta.log"
python3 "$W/tools/integration/sc106Receipt.py" "$OUT/run" "$OUT/run/receipt.json" > /dev/null
python3 - "$OUT/run/receipt.json" "$W/tools/integration/fixtures/sc106-live-receipt.json" <<'PY'
import json, sys
a, b = json.load(open(sys.argv[1])), json.load(open(sys.argv[2]))
diff = [k for k in sorted(set(a) | set(b)) if a.get(k) != b.get(k)]
print("ALL SAME" if not diff else f"DIFFER: {diff}")
PY
