#!/bin/sh
# gaf140 runner (docs/gaf140-status-gate-age.md, ISSUES #168: the IsBattleSEPlaying-gated status animation's age). Run from workspace/
# (this checkout or a fresh git-archive copy inside the repo); direct mGBA only (never the shared HTTP oracles). Nothing outside
# <out-dir> is written.
#   sh tools/integration/gaf140Run.sh <fresh-out-dir> [--census]     (~4 min; with --census ~5 min more, 20 shards in parallel)
# 1. gaf140Windows.py == fixtures/gaf140/windows.json (seg127's 16 gate > 0 receipts);
# 2. gaf140Probes.sh: 16 scenarios x Scene ON x {r1 (window dump), r2}: r1 == r2, == probe-sha256.json; gaf140Rom.py r1 == rom-r1.json
#    (16 / 16 at seg127's X / gate), r2 == r1;
# 3. gaf140NpzToRaw.py + gaf140Compare.ts (production == production-compare.json: 16 / 16 windows 0 px on every row) and the three
#    controls prefix / gate-1 / gate+1 (gaf140Controls.py == controls.json: 0 / 16 each);
# 4. sar131RouteRender.ts on 4 Scene ON routes with a gated status animation, in <out>/base (git archive of 74cbec2b8 from the first
#    enclosing repo that has it) and in this workspace; gaf140RouteDelta.py == routes-delta.json;
# 5. (--census) sa125LiveShareCensus.ts seeds 0..999 (10 shards per tree, sar131Census.sh's shape) base / this workspace,
#    sar131CensusDelta.py == census-delta.json;
# 6. gaf140Receipt.py == tools/integration/fixtures/gaf140-live-receipt.json (the census section only with --census).
# Raw frame dumps and the base copy are deleted at the end (GAF140_KEEP=1 keeps them).
set -u
OUT="$1"; CENSUS="${2:-}"; BASE=74cbec2b8
[ -e "$OUT" ] && { echo "refusing: $OUT exists"; exit 2; }
mkdir -p "$OUT/ev"; OUT=$(cd "$OUT" && pwd)
W=$(pwd); F=tools/integration/fixtures/gaf140; fail=0
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
check() { cmp -s "$1" "$2" && echo "SAME $3" || { echo "DIFF $3"; fail=1; }; }
# 1. windows
python3 tools/integration/gaf140Windows.py "$OUT/windows.json" > /dev/null
check "$F/windows.json" "$OUT/windows.json" "windows.json"
# 2. probes
sh tools/integration/gaf140Probes.sh "$OUT/rom"
cat "$OUT/rom/done"; grep -q "r1 == r2: 16 / 16" "$OUT/rom/done" || fail=1
python3 tools/integration/gaf140Rom.py "$OUT/rom/probes/r1" "$F/windows.json" "$OUT/ev/rom-r1.json" > /dev/null || fail=1
python3 tools/integration/gaf140Rom.py "$OUT/rom/probes/r2" "$F/windows.json" "$OUT/rom-r2.json" > /dev/null || fail=1
check "$F/rom-r1.json" "$OUT/ev/rom-r1.json" "rom-r1.json"
check "$OUT/ev/rom-r1.json" "$OUT/rom-r2.json" "rom r2 == r1"
# 3. production comparator + controls
"$PY" tools/integration/gaf140NpzToRaw.py "$OUT/rom/dump" "$OUT/ev/rom-r1.json" "$OUT/raw" > /dev/null
node --experimental-strip-types --no-warnings tools/integration/gaf140Compare.ts "$OUT/ev/rom-r1.json" "$OUT/raw" "$OUT/ev/production-compare.json" | tail -1 &
for n in prefix gate-1 gate+1; do
  node --experimental-strip-types --no-warnings tools/integration/gaf140Compare.ts --neg=$n "$OUT/ev/rom-r1.json" "$OUT/raw" "$OUT/compare-$n.json" > "$OUT/compare-$n.log" 2>&1 &
done
wait
check "$F/production-compare.json" "$OUT/ev/production-compare.json" "production-compare.json"
python3 tools/integration/gaf140Controls.py "$OUT" "$OUT/rom" "$OUT/ev"
check "$F/controls.json" "$OUT/ev/controls.json" "controls.json"
check "$F/probe-sha256.json" "$OUT/ev/probe-sha256.json" "probe-sha256.json"
# 4. routes (base archive copy vs this workspace)
d=$W; REPO=""
while [ "$d" != "/" ]; do
  if git -C "$d" cat-file -e "$BASE^{commit}" 2> /dev/null; then REPO=$(git -C "$d" rev-parse --show-toplevel); break; fi
  d=$(dirname "$d")
done
[ -n "$REPO" ] || { echo "no enclosing repo has $BASE"; exit 1; }
mkdir -p "$OUT/base" "$OUT/routes"
git -C "$REPO" archive "$BASE" workspace | tar -x -C "$OUT/base" --strip-components=1
ln -s "$W/node_modules" "$OUT/base/node_modules"
[ -e "$W/reference" ] && ln -s "$W/reference" "$OUT/base/reference"
ROUTES="41:0:on 92:0:on 2:1:on 22:1:on"; PAIRS=""
for r in $ROUTES; do
  n=$(echo "$r" | tr ':' '-')
  (cd "$OUT/base" && node --experimental-strip-types --no-warnings tools/integration/sar131RouteRender.ts --routes=$r --out="$OUT/routes/base-$n.json" > "$OUT/routes/base-$n.log" 2>&1) &
  node --experimental-strip-types --no-warnings tools/integration/sar131RouteRender.ts --routes=$r --out="$OUT/routes/final-$n.json" > "$OUT/routes/final-$n.log" 2>&1 &
  PAIRS="$PAIRS $OUT/routes/base-$n.json $OUT/routes/final-$n.json"
done
wait
python3 tools/integration/gaf140RouteDelta.py "$OUT/ev/routes-delta.json" $PAIRS || fail=1
check "$F/routes-delta.json" "$OUT/ev/routes-delta.json" "routes-delta.json"
# 5. census
if [ "$CENSUS" = "--census" ]; then
  cp "$W/tools/integration/sa125LiveShareCensus.ts" "$OUT/base/tools/integration/"
  mkdir -p "$OUT/census-base" "$OUT/census-final"
  for t in base final; do
    if [ "$t" = base ]; then TREE="$OUT/base"; else TREE="$W"; fi
    for i in 0 1 2 3 4 5 6 7 8 9; do a=$((i * 100)); b=$((a + 99)); C="$OUT/census-$t"
      (cd "$TREE" && node --max-old-space-size=4096 --experimental-strip-types --no-warnings tools/integration/sa125LiveShareCensus.ts \
        --seeds=$a..$b --index-from=$a --out="$C/r$i.json" --commands="$C/r$i.jsonl" --stats="$C/s$i.jsonl" > "$C/r$i.log" 2>&1) &
    done
  done
  wait
  python3 tools/integration/sar131CensusDelta.py "$OUT/census-base" "$OUT/census-final" "$OUT/ev/census-delta.json" > /dev/null
  check "$F/census-delta.json" "$OUT/ev/census-delta.json" "census-delta.json"
fi
# 6. receipt
python3 tools/integration/gaf140Receipt.py "$OUT/ev" "$OUT/receipt.json" $CENSUS --compare=tools/integration/fixtures/gaf140-live-receipt.json || fail=1
if [ "${GAF140_KEEP:-0}" != 1 ]; then rm -rf "$OUT/raw" "$OUT/rom/dump" "$OUT/base"; fi
[ "$fail" -eq 0 ] && echo "gaf140Run: ALL SAME" || { echo "gaf140Run: FAILED"; exit 1; }
