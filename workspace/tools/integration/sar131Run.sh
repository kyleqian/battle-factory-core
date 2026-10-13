#!/bin/sh
# sar131 runner (docs/sar131-status-animation-render.md, ISSUES #168 slice SA4). Run from workspace/; direct mGBA only (never the shared
# HTTP oracles); production is read only in git-archive copies inside the FRESH <out-dir> (refused if non-empty; must be inside the repo
# so the copies find ../oracle). Nothing outside <out-dir> is written or removed.
#   sh tools/integration/sar131Run.sh <fresh-out-dir> [--census]     (~4 min; with --census ~7 min more, 20 shards in parallel)
# 1. archive copies <out>/base (2ada2a415, the sa125 tree: status-animation command, no pixels) and <out>/final (HEAD) + this checkout's
#    sar131 tools / fixtures;
# 2. sar131Stage.py == the committed scenarios / scenario-index.json;
# 3. sar131Probes.sh in the final copy: 7 scenarios x Scene ON x {r1 (window dump), r2}, r1 == r2 == receipts/probe-sha256.txt;
#    sar131Rom.py r1 == receipts/rom-r1.json, r2 == r1;
# 4. sar131NpzToRaw.py + sar131ProductionCompare.ts (final copy) twice (r1 == r2 == production-compare.json) + the six controls;
#    sar131NextBodyX2.ts == next-body-x2.json;
# 5. sar131RouteRender.ts on 5 Scene ON routes in both copies, sar131RouteDelta.py == routes-delta.json;
# 6. (--census) sar131Census.sh shards base / final, sar131CensusDelta.py == census-delta.json;
# 7. sar131Receipt.py == tools/integration/fixtures/sar131-live-receipt.json (the census section only with --census).
set -eu
OUT=${1:?usage: sar131Run.sh <fresh-out-dir> [--census]}
CENSUS=${2:-}
BASE=2ada2a415
W=$(pwd)
[ -f "$W/tools/integration/sar131Run.sh" ] || { echo "run from workspace/"; exit 2; }
mkdir -p "$OUT"
[ -z "$(ls -A "$OUT")" ] || { echo "refusing: $OUT is not empty"; exit 2; }
OUT=$(cd "$OUT" && pwd)
case "$OUT" in "$(cd .. && pwd)"/*) ;; *) echo "refusing: $OUT is outside the repo"; exit 2;; esac
RUN="$OUT/run"
mkdir -p "$RUN/cmp"
fail=0
NODE="node --experimental-strip-types --no-warnings"
FX=tools/integration/fixtures/sar131
check() { if cmp -s "$1" "$2"; then echo "SAME $3"; else echo "DIFF $3"; fail=1; fi; }

# 1. archive copies
for t in base final; do
  rev=$BASE; [ "$t" = final ] && rev=HEAD
  mkdir -p "$OUT/$t"
  git -C .. archive "$rev" workspace | tar -x -C "$OUT/$t"
  ln -s "$W/node_modules" "$OUT/$t/workspace/node_modules"
  ln -s "$W/reference" "$OUT/$t/workspace/reference"
  cp tools/integration/sar131* "$OUT/$t/workspace/tools/integration/"
  mkdir -p "$OUT/$t/workspace/$FX" && cp -R "$FX/." "$OUT/$t/workspace/$FX/"
done
echo "final production src $(git rev-parse HEAD:workspace/src)"
F="$OUT/final/workspace"

# 2. staging
python3 tools/integration/sar131Stage.py "$OUT/stage/scenarios" > /dev/null
diff -r "$FX/scenarios" "$OUT/stage/scenarios" > /dev/null && echo "SAME scenarios ($(ls "$FX/scenarios" | wc -l | tr -d ' '))" || { echo "DIFF scenarios"; fail=1; }
check "$FX/scenario-index.json" "$OUT/stage/scenario-index.json" scenario-index

# 3. probes + ROM windows
(cd "$F" && sh tools/integration/sar131Probes.sh "$RUN/probes" "$FX/scenarios")
cat "$RUN/probes/done"; grep -q "r1 == r2: 7 / 7" "$RUN/probes/done" || fail=1
(cd "$RUN/probes/probes/r1" && shasum -a 256 *.json) > "$RUN/probe-sha256.txt"
check "$FX/receipts/probe-sha256.txt" "$RUN/probe-sha256.txt" probe-sha256
python3 tools/integration/sar131Rom.py "$RUN/probes/probes/r1" "$FX/scenario-index.json" "$RUN/rom-r1.json" > /dev/null
python3 tools/integration/sar131Rom.py "$RUN/probes/probes/r2" "$FX/scenario-index.json" "$RUN/rom-r2.json" > /dev/null
check "$FX/receipts/rom-r1.json" "$RUN/rom-r1.json" rom-r1.json
check "$RUN/rom-r1.json" "$RUN/rom-r2.json" "rom r2 == r1"

# 4. comparator through production (final copy), controls, next body
python3 tools/integration/sar131NpzToRaw.py "$RUN/probes/dump" "$RUN/rom-r1.json" "$RUN/raw" > /dev/null
(cd "$F" && $NODE tools/integration/sar131ProductionCompare.ts "$RUN/raw" "$RUN/cmp/r1.json" | tail -1)
(cd "$F" && $NODE tools/integration/sar131ProductionCompare.ts "$RUN/raw" "$RUN/cmp/r2.json" > /dev/null)
check "$RUN/cmp/r1.json" "$RUN/cmp/r2.json" "comparator r1 == r2"
check "$FX/production-compare.json" "$RUN/cmp/r1.json" production-compare.json
for x in age+1 no-shake no-blend no-sparks wrong-side base-x2; do
  (cd "$F" && $NODE tools/integration/sar131ProductionCompare.ts "$RUN/raw" "$RUN/cmp/neg-$x.json" --neg=$x | tail -1 | sed "s/^/control $x: /")
done
(cd "$F" && $NODE tools/integration/sar131NextBodyX2.ts "$RUN/raw" "$RUN/next-body.json" | tail -1)
check "$FX/next-body-x2.json" "$RUN/next-body.json" next-body-x2.json

# 5. production routes, both trees
R="87:0:on,0:0:on,12:0:on,2:0:on,76:0:on"
for t in base final; do
  (cd "$OUT/$t/workspace" && $NODE tools/integration/sar131RouteRender.ts --routes=$R --out="$RUN/routes-$t.json" > "$RUN/routes-$t.log" 2>&1) &
done
wait
python3 tools/integration/sar131RouteDelta.py "$RUN/routes-base.json" "$RUN/routes-final.json" "$RUN/routes-delta.json" | tail -1
check "$FX/routes-delta.json" "$RUN/routes-delta.json" routes-delta.json

# 6. census
if [ "$CENSUS" = "--census" ]; then
  sh tools/integration/sar131Census.sh shards "$OUT/census-base" $BASE > /dev/null 2>&1 &
  sh tools/integration/sar131Census.sh shards "$OUT/census-final" HEAD > /dev/null 2>&1 &
  wait
  python3 tools/integration/sar131CensusDelta.py "$OUT/census-base" "$OUT/census-final" "$RUN/census-delta.json" | head -2
  check "$FX/census-delta.json" "$RUN/census-delta.json" census-delta.json
fi

# 7. receipt
python3 tools/integration/sar131Receipt.py "$RUN" "$RUN/receipt.json" > /dev/null
python3 - "$W/tools/integration/fixtures/sar131-live-receipt.json" "$RUN/receipt.json" "$CENSUS" <<'PY' || fail=1
import json, sys
old, new = json.load(open(sys.argv[1])), json.load(open(sys.argv[2]))
if sys.argv[3] != "--census":
    old.pop("census", None); new.pop("census", None)
    old["verdicts"].pop("censusZeroFrameChanges", None); new["verdicts"].pop("censusZeroFrameChanges", None)
same = old == new
print(("SAME" if same else "DIFF") + " sar131-live-receipt.json" + ("" if sys.argv[3] == "--census" else " (census section not rerun)"))
sys.exit(0 if same else 1)
PY
[ "$fail" -eq 0 ] && echo "ALL SAME" || { echo "SOME DIFF"; exit 1; }
