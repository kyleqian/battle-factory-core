#!/bin/sh
# ord124 reproduction (docs/ord124-order-plans.md). Run from workspace/ with a FRESH <out-dir> INSIDE the repo; direct mGBA only.
#   sh tools/integration/ord124Run.sh <fresh-out-dir>                 # rungs 1-3: probes x2, checks, windows, census 0..999 x2 (~6 min)
#   ORD124_TESTS=1 sh tools/integration/ord124Run.sh <fresh-out-dir>  # + the 9 sprite-order test files in the patched copy (fold pins)
# Every tree is a git-archive copy of the FIXED base b1c4c8300 (+ tools/integration/fixtures/ord124/ord124-order-plans.diff for the
# patched copy). Receipts land in <out-dir>/rec; `same` / `DIFF` lines compare them with tools/integration/fixtures/ord124/.
set -e
OUT=${1:?usage: ord124Run.sh <fresh-out-dir>}
[ ! -e "$OUT" ] || { echo "refusing: $OUT exists"; exit 1; }
mkdir -p "$OUT/rec"; OUT=$(cd "$OUT" && pwd); ROOT=$(pwd)
T=tools/integration; F=$T/fixtures/ord124; REC=$OUT/rec; BASE=b1c4c8300
MGBA_PY=${MGBA_PY:-/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python}
LIBMGBA_PY=${LIBMGBA_PY:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
same() { if cmp -s "$1" "$2"; then echo "same $(basename "$2")"; else echo "DIFF $(basename "$2")"; fi; }
copy() {  # copy <dir> [diff...]: git-archive copy of BASE (+ the diffs), node_modules / reference / artifacts linked, its own git repo
  d=$1; shift
  git archive --format=tar $BASE . | (mkdir -p "$d" && tar -x -C "$d")
  for l in node_modules reference artifacts; do ln -s "$ROOT/$l" "$d/$l"; done
  for p in "$@"; do (cd "$d" && patch -s -p1 < "$ROOT/$p"); done
  (cd "$d" && git init -q && git add -A > /dev/null && git -c user.email=w@x -c user.name=w commit -qm copy \
    && git -c user.email=w@x -c user.name=w commit -q --allow-empty -m extra)
}
copy "$OUT/base"
copy "$OUT/patched" $F/ord124-order-plans.diff
# the patch regenerates the table byte for byte from its generator
(cd "$OUT/patched" && cp src/engine/spriteOrderProductionPlans.ts "$OUT/table-patched.ts" \
  && node --experimental-strip-types --no-warnings $T/spriteOrderProductionTable.ts > /dev/null && git diff --quiet -- src/engine/spriteOrderProductionPlans.ts) \
  && echo "table regenerates byte-identically (patched copy)" || echo "TABLE DIFF"

# RUNG 1 + 3 census 0..999 (10 --index-from shards, hist73Merge.py) on both copies; attribution of every lend-unknown / later-body decline
sh $T/stg107Census.sh "$OUT/census-base" "$OUT/base"
sh $T/stg107Census.sh "$OUT/census-patched" "$OUT/patched"
python3 $T/ord124Attribution.py "$OUT/census-base/merged.jsonl" "$REC/ord124-attr-base.json" | tail -1
python3 $T/ord124Attribution.py "$OUT/census-patched/merged.jsonl" "$REC/ord124-attr-patched.json" | tail -1
python3 $T/ord124CensusPair.py "$OUT/census-base" "$OUT/census-patched" "$REC/ord124-census-pair.json"
python3 $T/land82CensusCheck.py "$OUT/census-base" "$OUT/census-base/merged.json" "$OUT/census-base/merged.jsonl" "$OUT/census-patched" \
  "$OUT/census-patched/merged.json" "$OUT/census-patched/merged.jsonl" "$REC/ord124-census-check.json" > /dev/null
for f in ord124-attr-base.json ord124-attr-patched.json ord124-census-pair.json ord124-census-check.json; do same "$F/$f" "$REC/$f"; done

# RUNG 2: sSpriteOrder probes (Odor Sleuth / False Swipe / Hyper Beam; every job A / B in one batch), two fresh batches, units r1 == r2,
# then the per-window check of the plan rows (plans69's committed Odor Sleuth units + these)
for b in 1 2; do
  PYTHONPATH=$LIBMGBA_PY "$MGBA_PY" $T/ord124Probe.py "$OUT/probe$b" --jobs 12 | tail -1
  python3 $T/ord124Extract.py "$OUT/probe$b" "$OUT/units$b.json"
done
same "$OUT/units1.json" "$OUT/units2.json"; cp "$OUT/units1.json" "$REC/ord124-units.json"
# (from workspace/: this checkout's src/engine is the base's, and ord124Check.ts reads $F/ord124-plan-rows.json)
node --experimental-strip-types --no-warnings $T/ord124Check.ts "$REC/ord124-check.json" $T/fixtures/plans69/units.json "$REC/ord124-units.json" | head -5
for f in ord124-units.json ord124-check.json; do same "$F/$f" "$REC/$f"; done

# RUNG 3: the windows AFTER the bodies (Harden / Mega Punch defenders) — CHAIN lend vs ROM sSpriteOrder (two fresh probe batches, r1 == r2)
# in both copies, then audit21Check (aud110Align windows, two more fresh probes inside) through the production renderer of both copies
python3 $T/ord124Stage.py "$OUT/sc0" | tail -1
mkdir -p "$OUT/sc"; for f in "$OUT"/sc0/ord124-*.json; do cp "$f" "$OUT/sc/pb-$(basename "$f")"; done
for b in 1 2; do
  AUDIT20_JOBS=12 python3 $T/audit20Probes.py "$OUT/probe-w$b" "$OUT"/sc/*.json | grep -v " exit 0$" || true
  python3 $T/audit20Fixtures.py "$OUT/probe-w$b" "$OUT/fx$b" "$OUT/sc" > "$OUT/derive$b.txt"
  # the order-host bodies themselves have no live adapter (fallback): their windows are history only
  awk '$2=="ODOR_SLEUTH"||$2=="FALSE_SWIPE"{print $1}' "$OUT/derive$b.txt" | while read f; do rm "$OUT/fx$b/$f"; done
  ls "$OUT/fx$b"/*.json | sed 's/-c[0-9]*\.json$//' | sort -u | xargs -n 1 basename > "$OUT/names$b.txt"
  for tree in base patched; do
    (cd "$OUT/$tree" && while read n; do AUDIT20_LENDS_ONLY=1 node --experimental-strip-types --no-warnings $T/audit20Check.ts "$OUT/fx$b" "$n" /dev/null; done \
      < "$OUT/names$b.txt") > "$OUT/lends$b-$tree.jsonl"
  done
done
same "$OUT/derive1.txt" "$OUT/derive2.txt"; same "$OUT/lends1-base.jsonl" "$OUT/lends2-base.jsonl"; same "$OUT/lends1-patched.jsonl" "$OUT/lends2-patched.jsonl"
cp "$OUT/derive1.txt" "$REC/ord124-rung3-derive.txt"
cp "$OUT/lends1-base.jsonl" "$REC/ord124-rung3-lends-base.jsonl"; cp "$OUT/lends1-patched.jsonl" "$REC/ord124-rung3-lends-patched.jsonl"
python3 $T/aud110Align.py "$OUT/fx1" "$OUT/fxa" > /dev/null
for tree in base patched; do
  STF115_CHECK=audit21Check sh $T/stf115Check.sh "$OUT/fxa" "$OUT/$tree" "$OUT/check-$tree"
  python3 $T/stf115Summary.py "$OUT/check-$tree" "$OUT/lends1-$tree.jsonl" > "$REC/ord124-rung3-windows-$tree.txt"
  grep "^TOTAL all" "$REC/ord124-rung3-windows-$tree.txt" | sed "s/^/$tree: /"
done
for f in ord124-rung3-derive.txt ord124-rung3-lends-base.jsonl ord124-rung3-lends-patched.jsonl ord124-rung3-windows-base.txt \
  ord124-rung3-windows-patched.txt; do same "$F/$f" "$REC/$f"; done

# fold pins (optional): the 9 sprite-order test files in the patched copy with ord124-fold-test-pins.diff applied
if [ -n "$ORD124_TESTS" ]; then
  (cd "$OUT/patched" && patch -s -p1 < "$ROOT/$F/ord124-fold-test-pins.diff" && npx vitest run tests/spriteOrderFly63.test.ts tests/spriteOrderPrep65.test.ts \
    tests/cf78NeedleArmTie.test.ts tests/spriteOrderAbsInvRoutes.test.ts tests/spriteOrderGigaDrainGeometry.test.ts tests/spriteOrderEventTransform.test.ts \
    tests/spriteOrderPlans51.test.ts tests/spriteOrderProvider.test.ts tests/spriteOrderPrep64.test.ts 2>&1 | grep -E "Test Files|Tests ")
fi
