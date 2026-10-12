#!/bin/sh
# iu120 runner (docs/iu120-universal-rows.md). Run from workspace/ on the iu120 tree. The base (master 9d23a17c4) is a git-archive copy
# inside the FRESH <out-dir> (refused if non-empty; must be inside the repo so the copy finds ../oracle); the final tree is this
# checkout. Nothing outside <out-dir> is written or removed. No mGBA, no shared oracle.
#   sh tools/integration/iu120Run.sh <fresh-out-dir> [--census]
# 1. render routes: idle98's 14 routes x {base, final} x {r1, r2} (idle94RouteRender.ts); iu120RenderCheck.py == receipts/render-check.json;
# 2. Scene parity: idle94Route.ts battles 154 / 268 ON + OFF in both trees; iu120SceneParity.py == receipts/scene-parity.json;
# 3. --census: liveShareCensus.ts seeds 0..999 (ten --index-from shards) in both trees, hist73Merge.py per tree,
#    iu120CensusDelta.py == census-delta.json.
set -eu
OUT=${1:?usage: iu120Run.sh <fresh-out-dir> [--census]}
CENSUS=${2:-}
W=$(pwd)
[ -f "$W/tools/integration/iu120Run.sh" ] || { echo "run from workspace/"; exit 2; }
mkdir -p "$OUT"
[ -z "$(ls -A "$OUT")" ] || { echo "refusing: $OUT is not empty"; exit 2; }
OUT=$(cd "$OUT" && pwd)
case "$OUT" in "$(cd .. && pwd)"/*) ;; *) echo "refusing: $OUT is outside the repo"; exit 2;; esac
F=tools/integration/fixtures/iu120
SRC=src/engine/battleResolutionPresentationRender.ts
fail=0
check() { if cmp -s "$1" "$2"; then echo "SAME $3"; else echo "DIFF $3"; fail=1; fi; }
mkdir -p "$OUT/base"
git -C .. archive 9d23a17c4 workspace | tar -x -C "$OUT/base"
ln -s "$W/node_modules" "$OUT/base/workspace/node_modules"
ln -s "$W/reference" "$OUT/base/workspace/reference"
B="$OUT/base/workspace"
grep -q LIVE_MOVE_UNMEASURED_UNIVERSAL_ROW_IDS "$B/$SRC" && { echo "base already carries iu120"; exit 1; }
grep -q LIVE_MOVE_UNMEASURED_UNIVERSAL_ROW_IDS "$SRC" || { echo "this tree lacks iu120"; exit 1; }

# 1. render routes
mkdir -p "$OUT/render"
for t in base final; do for r in r1 r2; do while read -r b m sd; do
  if [ "$t" = base ]; then tree=$B; else tree=$W; fi
  echo "$tree $OUT/render $( [ "$t" = base ] && echo base || echo patched )-$r $b $m $sd"
done < "$F/render-routes.txt"; done; done | xargs -P 8 -n 6 sh tools/integration/iu120RenderJob.sh
python3 tools/integration/iu120RenderCheck.py "$OUT/render" "$F/render-routes.txt" "$SRC" "$OUT/render-check.json" | tail -1
check "$F/receipts/render-check.json" "$OUT/render-check.json" "render-check.json"

# 2. Scene parity
mkdir -p "$OUT/routes"
for b in 154 268; do for sc in on off; do
  (cd "$B" && node --experimental-strip-types --no-warnings tools/integration/idle94Route.ts --seed=$b --streak=$(( (b * 11) % 49 )) --scene=$sc \
    --out="$OUT/routes/base-b$b-$sc.json" > /dev/null)
  node --experimental-strip-types --no-warnings tools/integration/idle94Route.ts --seed=$b --streak=$(( (b * 11) % 49 )) --scene=$sc \
    --out="$OUT/routes/final-b$b-$sc.json" > /dev/null
done; done
python3 tools/integration/iu120SceneParity.py "$OUT/routes" "$OUT/scene-parity.json" 154 268 > /dev/null
check "$F/receipts/scene-parity.json" "$OUT/scene-parity.json" "scene-parity.json"

# 3. census
if [ "$CENSUS" = "--census" ]; then
  for t in base final; do
    mkdir -p "$OUT/census-$t"
    if [ "$t" = base ]; then tree=$B; else tree=$W; fi
    (cd "$tree" && for k in 0 1 2 3 4 5 6 7 8 9; do
      node --experimental-strip-types --no-warnings tools/integration/liveShareCensus.ts --seeds=$((k * 100))..$((k * 100 + 99)) --index-from=$((k * 100)) \
        --out="$OUT/census-$t/r$k.json" --commands="$OUT/census-$t/r$k.jsonl" > "$OUT/census-$t/r$k.log" 2>&1 &
    done; wait)
    python3 tools/integration/hist73Merge.py "$OUT/census-$t" "$OUT/census-$t.merged.json" "$OUT/census-$t.merged.jsonl" > /dev/null
  done
  python3 tools/integration/iu120CensusDelta.py "$OUT/census-base" "$OUT/census-final" "$SRC" "$OUT/census-delta.json" | head -1
  check "$F/census-delta.json" "$OUT/census-delta.json" "census-delta.json"
fi
[ "$fail" -eq 0 ] && echo "iu120Run: ALL SAME" || { echo "iu120Run: DIFFERENCES (see above)"; exit 1; }
