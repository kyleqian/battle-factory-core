#!/bin/sh
# sad133 runner (docs/sad133-status-animation-render-2.md, ISSUES #168 slices SA6 / SA7 / SA8). Run from workspace/ (a checkout or a
# fresh git-archive copy inside the repo); direct mGBA only (never the shared HTTP oracles). Nothing outside <out-dir> is written.
#   sh tools/integration/sad133Run.sh <fresh-out-dir-inside-the-repo> [--census]     (~8 min; with --census ~6 min more)
# 1. copies <out>/final (this workspace's files) and <out>/base (git archive of 7ae8aff49, the sar131 tip, from the first enclosing
#    repo that has it), node_modules / reference linked;
# 2. stp128 probes in the final copy: 14 scenarios x {r1 (window dump), r2} (stp128Job.sh, 7 parallel), r1 == r2 == the committed
#    stp128 probe-sha256.json; stp128Receipt.py r1 == the committed rom-windows.json;
# 3. stp128NpzToRaw.py + sad133ProductionCompare.ts twice (r1 == r2 == fixtures/sad133/production-compare.json) + the 7 controls
#    (sad133Controls.py == fixtures/sad133/controls.json); sad133X2.ts (x2 tracker vs ROM);
# 4. sar131's PSN / PRZ windows on the final code: sar131Probes.sh, sar131Rom.py == committed, sar131ProductionCompare.ts == the
#    committed sar131 production-compare.json;
# 5. sar131RouteRender.ts on 5 Scene ON CONFUSION routes in both copies, sad133RouteDelta.py == fixtures/sad133/routes-delta.json;
# 6. (--census) sad133Census.sh base / final, sar131CensusDelta.py == fixtures/sad133/census-delta.json;
# 7. tests/sad133StatusAnimationRender.test.ts in the final copy; sad133Receipt.py == fixtures/sad133-live-receipt.json (the census
#    section only with --census).
# Raw frame dumps are deleted at the end (SAD133_KEEP_RAW=1 keeps them); delete <out-dir> afterwards (~2 GB with the copies).
set -u
OUT=${1:?usage: sad133Run.sh <fresh-out-dir> [--census]}
CENSUS=${2:-}
BASE=7ae8aff493c3dff3f35cbabaed7a9009dfa70513
W=$(pwd)
[ -f "$W/tools/integration/sad133Run.sh" ] || { echo "run from workspace/"; exit 2; }
mkdir -p "$OUT"
[ -z "$(ls -A "$OUT")" ] || { echo "refusing: $OUT is not empty"; exit 2; }
OUT=$(cd "$OUT" && pwd)
case "$OUT" in "$(cd .. && pwd)"/*) ;; *) echo "refusing: $OUT is outside the repo"; exit 2;; esac
RUN="$OUT/run"; mkdir -p "$RUN/cmp"
fail=0
NODE="node --experimental-strip-types --no-warnings"
FX=tools/integration/fixtures/sad133; ST=tools/integration/fixtures/stp128; SR=tools/integration/fixtures/sar131
check() { if cmp -s "$1" "$2"; then echo "SAME $3"; else echo "DIFF $3"; fail=1; fi; }

# 1. copies: final = this workspace's files; base = the sar131 tip from the first enclosing git repo that has it
mkdir -p "$OUT/final/workspace"
tar -cf - --exclude ./node_modules --exclude ./reference --exclude ./artifacts --exclude ./.integration --exclude ./dist --exclude ./.git . \
  | tar -x -C "$OUT/final/workspace"
d=$W; REPO=""
while [ "$d" != "/" ]; do
  if git -C "$d" cat-file -e "$BASE^{commit}" 2> /dev/null; then REPO=$d; break; fi
  d=$(dirname "$d")
done
[ -n "$REPO" ] || { echo "base $BASE not found in any enclosing git repo"; exit 2; }
mkdir -p "$OUT/base"
git -C "$REPO" archive "$BASE" workspace | tar -x -C "$OUT/base"
for t in base final; do
  ln -s "$W/node_modules" "$OUT/$t/workspace/node_modules"
  ln -s "$W/reference" "$OUT/$t/workspace/reference"
done
F="$OUT/final/workspace"
echo "base $BASE (from $REPO); final = $W"

# 2. stp128 probes + ROM windows (final copy)
mkdir -p "$RUN/probes/r1" "$RUN/probes/r2" "$RUN/dump"
(cd "$F" && ls "$ST"/scenarios/*.json | while read -r s; do echo "$RUN/probes/r1 $s $RUN/dump"; done | xargs -P 7 -n 3 sh tools/integration/stp128Job.sh)
(cd "$F" && ls "$ST"/scenarios/*.json | while read -r s; do echo "$RUN/probes/r2 $s"; done | xargs -P 7 -n 2 sh tools/integration/stp128Job.sh)
n=0; same=0
for p in "$RUN/probes/r1"/*.json; do n=$((n + 1)); cmp -s "$p" "$RUN/probes/r2/$(basename "$p")" && same=$((same + 1)); done
echo "stp128 probes r1 == r2: $same / $n" | tee "$RUN/probes-r1-r2.txt"; [ "$same" -eq "$n" ] && [ "$n" -eq 14 ] || fail=1
python3 - "$RUN" "$ST/probe-sha256.json" <<'PYEOF' || fail=1
import hashlib, json, os, sys
out, rec = sys.argv[1], json.load(open(sys.argv[2]))
same = sum(hashlib.sha256(open(os.path.join(out, "probes", r, k), "rb").read()).hexdigest() == v[r] for k, v in rec.items() for r in ("r1", "r2"))
print(f"stp128 probe outputs == committed sha256: {same} / {2 * len(rec)}")
sys.exit(0 if same == 2 * len(rec) else 1)
PYEOF
(cd "$F" && python3 tools/integration/stp128Receipt.py "$RUN/probes/r1" "$ST/scenario-index.json" "$RUN/rom-windows.json" > /dev/null)
check "$ST/rom-windows.json" "$RUN/rom-windows.json" "stp128 rom-windows.json"

# 3. comparator through production (final copy), controls, x2
(cd "$F" && python3 tools/integration/stp128NpzToRaw.py "$RUN/dump" "$ST/rom-windows.json" "$RUN/raw" > /dev/null) || fail=1
(cd "$F" && $NODE tools/integration/sad133ProductionCompare.ts "$RUN/raw" "$RUN/cmp/r1.json" | tail -1)
(cd "$F" && $NODE tools/integration/sad133ProductionCompare.ts "$RUN/raw" "$RUN/cmp/r2.json" > /dev/null)
check "$RUN/cmp/r1.json" "$RUN/cmp/r2.json" "comparator r1 == r2"
check "$FX/production-compare.json" "$RUN/cmp/r1.json" "sad133 production-compare.json"
args=""
for x in age+1 wrong-side no-shake no-ghost no-ducks no-cube lag-swap; do
  (cd "$F" && $NODE tools/integration/sad133ProductionCompare.ts "$RUN/raw" "$RUN/cmp/neg-$x.json" --neg=$x > /dev/null)
  args="$args $x=$RUN/cmp/neg-$x.json"
done
(cd "$F" && python3 tools/integration/sad133Controls.py "$RUN/controls.json" $args)
check "$FX/controls.json" "$RUN/controls.json" "sad133 controls.json"
(cd "$F" && $NODE tools/integration/sad133X2.ts "$RUN/x2.json")

# 4. sar131 PSN / PRZ windows on the final code
(cd "$F" && sh tools/integration/sar131Probes.sh "$RUN/sar131" "$SR/scenarios" > /dev/null 2>&1)
cat "$RUN/sar131/done"; grep -q "r1 == r2: 7 / 7" "$RUN/sar131/done" || fail=1
(cd "$F" && python3 tools/integration/sar131Rom.py "$RUN/sar131/probes/r1" "$SR/scenario-index.json" "$RUN/sar131-rom-r1.json" > /dev/null)
check "$SR/receipts/rom-r1.json" "$RUN/sar131-rom-r1.json" "sar131 rom-r1.json"
(cd "$F" && python3 tools/integration/sar131NpzToRaw.py "$RUN/sar131/dump" "$RUN/sar131-rom-r1.json" "$RUN/sar131-raw" > /dev/null)
(cd "$F" && $NODE tools/integration/sar131ProductionCompare.ts "$RUN/sar131-raw" "$RUN/sar131-cmp.json" | tail -1 | sed "s/^/sar131 PSN \/ PRZ: /")
check "$SR/production-compare.json" "$RUN/sar131-cmp.json" "sar131 production-compare.json"

# 5. production routes, both trees (the same route tool)
cp tools/integration/sar131RouteRender.ts "$OUT/base/workspace/tools/integration/"
R="5:0:on,24:0:on,19:0:on,22:0:on,9:0:on"
for t in base final; do
  (cd "$OUT/$t/workspace" && $NODE tools/integration/sar131RouteRender.ts --routes=$R --out="$RUN/routes-$t.json" > "$RUN/routes-$t.log" 2>&1) &
done
wait
python3 tools/integration/sad133RouteDelta.py "$RUN/routes-base.json" "$RUN/routes-final.json" "$RUN/routes-delta.json" | tail -1
check "$FX/routes-delta.json" "$RUN/routes-delta.json" "sad133 routes-delta.json"

# 6. census
if [ "$CENSUS" = "--census" ]; then
  sh tools/integration/sad133Census.sh "$OUT/base/workspace" "$OUT/census-base" > /dev/null 2>&1 &
  sh tools/integration/sad133Census.sh "$F" "$OUT/census-final" > /dev/null 2>&1 &
  wait
  python3 tools/integration/sar131CensusDelta.py "$OUT/census-base" "$OUT/census-final" "$RUN/census-delta.json" | head -2
  check "$FX/census-delta.json" "$RUN/census-delta.json" "sad133 census-delta.json"
fi

# 7. tier-1 test in the final copy, receipt
(cd "$F" && npx vitest run --no-watch tests/sad133StatusAnimationRender.test.ts > "$RUN/test.log" 2>&1) \
  && echo "sad133 test: $(grep -E 'Tests ' "$RUN/test.log" | tr -s ' ')" || { echo "sad133 test FAILED"; fail=1; }
python3 tools/integration/sad133Receipt.py "$RUN" "$RUN/receipt.json" > /dev/null
python3 - "$W/tools/integration/fixtures/sad133-live-receipt.json" "$RUN/receipt.json" "$CENSUS" <<'PY' || fail=1
import json, sys
old, new = json.load(open(sys.argv[1])), json.load(open(sys.argv[2]))
if sys.argv[3] != "--census":
    old.pop("census", None); new.pop("census", None)
    old["verdicts"].pop("censusZeroChanges", None); new["verdicts"].pop("censusZeroChanges", None)
same = old == new and all(new["verdicts"].values())
print(("SAME" if same else "DIFF") + " sad133-live-receipt.json (all verdicts true)" + ("" if sys.argv[3] == "--census" else " (census section not rerun)"))
sys.exit(0 if same else 1)
PY
[ "${SAD133_KEEP_RAW:-0}" = 1 ] || rm -rf "$RUN/dump" "$RUN/raw" "$RUN/sar131/dump" "$RUN/sar131-raw"
[ "$fail" -eq 0 ] && echo "ALL SAME" || { echo "SOME DIFF"; exit 1; }
