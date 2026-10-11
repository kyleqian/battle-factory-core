#!/bin/sh
# scd112 runner (docs/scd112-stats-change-render.md, ISSUES #166 slice d). Run from workspace/; direct mGBA only (never the shared HTTP
# oracles); production is read only in git-archive copies inside the FRESH <out-dir> (refused if non-empty; must be inside the repo).
# Nothing outside <out-dir> is written or removed.
#   sh tools/integration/scd112Run.sh <fresh-out-dir> [--census]        (~3 min; with --census ~10 min more, 20 shards in parallel)
# 1. stat102Run.sh <out>/stat102: the 22 stat101 probe jobs x2 (r1 == r2), the raw window frames, stat102's reducer comparator (ALL SAME);
# 2. archive copies <out>/base (1cfac3f7f, the sc106 tree: stats-change command, no pixels) and <out>/final (HEAD) + this checkout's
#    scd112 tools;
# 3. scd112ProductionCompare.ts in the final copy, twice (r1 == r2), plus the controls (--neg=age+1 / no-rest / no-shadow) and the
#    x2-tracker Growl experiment;
# 4. scd112RouteRender.ts on 8 production routes in both copies, scd112RouteDelta.py (frames / timeline identical, pixels only on
#    stats-change frames);
# 5. (--census) sc106LiveShareCensus.ts seeds 0..999 (ten --index-from shards) in both copies, scd112CensusDelta.py (identical);
# 6. scd112Receipt.py == tools/integration/fixtures/scd112-live-receipt.json (the census section only with --census).
set -eu
OUT=${1:?usage: scd112Run.sh <fresh-out-dir> [--census]}
CENSUS=${2:-}
BASE=1cfac3f7f
W=$(pwd)
[ -f "$W/tools/integration/scd112Run.sh" ] || { echo "run from workspace/"; exit 2; }
mkdir -p "$OUT"
[ -z "$(ls -A "$OUT")" ] || { echo "refusing: $OUT is not empty"; exit 2; }
OUT=$(cd "$OUT" && pwd)
case "$OUT" in "$(cd .. && pwd)"/*) ;; *) echo "refusing: $OUT is outside the repo"; exit 2;; esac
RUN="$OUT/run"
mkdir -p "$RUN"
fail=0
NODE="node --experimental-strip-types --no-warnings"

# 1. ROM frames
sh tools/integration/stat102Run.sh "$OUT/stat102" > "$RUN/stat102.log" 2>&1 || true
tail -1 "$RUN/stat102.log"
grep -q '^ALL SAME' "$RUN/stat102.log" || fail=1

# 2. archive copies
for t in base final; do
  rev=$BASE; [ "$t" = final ] && rev=HEAD
  mkdir -p "$OUT/$t"
  git -C .. archive "$rev" workspace | tar -x -C "$OUT/$t"
  ln -s "$W/node_modules" "$OUT/$t/workspace/node_modules"
  cp tools/integration/scd112* "$OUT/$t/workspace/tools/integration/"
done
echo "final production src $(git rev-parse HEAD:workspace/src)"

# 3. comparator through production (final copy)
F="$OUT/final/workspace"
(cd "$F" && $NODE tools/integration/scd112ProductionCompare.ts "$OUT/stat102" "$RUN/compare.json" | tail -1)
(cd "$F" && $NODE tools/integration/scd112ProductionCompare.ts "$OUT/stat102" "$RUN/compare-r2.json" > /dev/null)
cmp -s "$RUN/compare.json" "$RUN/compare-r2.json" && echo "SAME comparator r1 == r2" || { echo "DIFF comparator r1 != r2"; fail=1; }
rm "$RUN/compare-r2.json"
for x in age+1 no-rest no-shadow; do
  (cd "$F" && $NODE tools/integration/scd112ProductionCompare.ts "$OUT/stat102" "$RUN/compare-neg-$x.json" --neg=$x | tail -1 | sed "s/^/control $x: /")
done
(cd "$F" && $NODE tools/integration/scd112ProductionCompare.ts "$OUT/stat102" "$RUN/compare-tracker-growl-zeroed.json" --tracker-growl-zeroed | tail -1 | sed "s/^/experiment tracker-growl-zeroed: /")

# 4. production routes, both trees
R1="0:2:on,3:3:on,3:1:on,6:0:on"; R2="13:3:on,14:0:on,3:3:off,0:2:off"
for t in base final; do
  (cd "$OUT/$t/workspace" && $NODE tools/integration/scd112RouteRender.ts --routes=$R1 --out="$RUN/routes-$t-1.json" > "$RUN/routes-$t-1.log" 2>&1) &
  (cd "$OUT/$t/workspace" && $NODE tools/integration/scd112RouteRender.ts --routes=$R2 --out="$RUN/routes-$t-2.json" > "$RUN/routes-$t-2.log" 2>&1) &
done
wait
python3 tools/integration/scd112RouteDelta.py "$RUN/routes-base-1.json,$RUN/routes-base-2.json" "$RUN/routes-final-1.json,$RUN/routes-final-2.json" \
  "$RUN/route-delta.json" | tail -1 || fail=1

# 5. census
if [ "$CENSUS" = "--census" ]; then
  for t in base final; do
    mkdir -p "$OUT/census-$t"
    for k in 0 1 2 3 4 5 6 7 8 9; do
      (cd "$OUT/$t/workspace" && $NODE tools/integration/sc106LiveShareCensus.ts --seeds=$((k * 100))..$((k * 100 + 99)) \
        --index-from=$((k * 100)) --out="$OUT/census-$t/r$k.json" --commands="$OUT/census-$t/r$k.jsonl" \
        --stats="$OUT/census-$t/s$k.jsonl" > "$OUT/census-$t/r$k.log" 2>&1) &
    done
  done
  wait
  python3 tools/integration/scd112CensusDelta.py "$OUT/census-base" "$OUT/census-final" "$RUN/census-delta.json" || fail=1
fi

# 6. receipt
python3 tools/integration/scd112Receipt.py "$RUN" "$OUT/receipt.json" > /dev/null
python3 - "$OUT/receipt.json" tools/integration/fixtures/scd112-live-receipt.json "$CENSUS" <<'PY' || fail=1
import json, sys
new, old = json.load(open(sys.argv[1])), json.load(open(sys.argv[2]))
if sys.argv[3] != "--census":
    new.pop("census"); old.pop("census")
same = new == old
print(("SAME" if same else "DIFF") + " scd112-live-receipt.json" + ("" if sys.argv[3] == "--census" else " (census section not rerun)"))
sys.exit(0 if same else 1)
PY
[ "$fail" -eq 0 ] && echo "ALL SAME" || { echo "SOME DIFF"; exit 1; }
