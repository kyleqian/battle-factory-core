#!/bin/sh
# flat77 reproduction (docs/next-adapters-flat77.md). Run from workspace/; direct mGBA only (never the shared HTTP oracles). Production src
# is NOT patched: the temp patch is applied only to a git-archive copy of the FIXED base dd00bdd6e inside <out-dir>. Everything goes under
# the FRESH <out-dir> (refused if non-empty); nothing is removed outside it. Each step prints "same <receipt>" or "DIFF <receipt>".
#   sh tools/integration/flat77Run.sh <fresh-out-dir>            (FLAT77_SKIP_CENSUS=1: skip step 8, ~20 min; FLAT77_TESTS=1: step 10)
# 1. re-stages the scenarios (== fixtures/flat77/scenarios);
# 2. base = git archive dd00bdd6e:workspace, patched = base + fixtures/flat77/flat77-temp-src.diff (node_modules / reference symlinked;
#    the flat77 tools copied in from this checkout);
# 3. predictions: flat77Fixtures.py --predict + flat77Check.ts FLAT77_PREDICT=1 in base (== predict.txt);
# 4. probes: every scenario twice fresh (flat77Probes.sh, == probes-r1r2.txt), fixtures re-derived from r1 (== fixtures/, derive.txt);
# 5. the base lends vs the ROM free order (FLAT77_LENDS_ONLY=1 in base, == lends-base.txt);
# 6. flat77Check.ts per scenario in PATCHED on the committed fixtures (two more fresh probe processes each) (== check/, summary.txt);
# 7. ON / OFF parity on the lifted census route (flat77Parity.ts in patched, == parity-*.json);
# 8. census seeds 0..999 in base and patched (one process each), delta (prep43CensusDelta.py) and the identity gate (flat77KeyCheck.py)
#    (== census/);
# 9. compares; 10. (FLAT77_TESTS=1) the fold pins: the related test files in patched (== tests-patched-summary.txt).
set -e
OUT=${1:?usage: flat77Run.sh <fresh-out-dir>}
if [ -e "$OUT" ] && [ -n "$(ls -A "$OUT" 2>/dev/null)" ]; then echo "refusing: $OUT exists and is not empty"; exit 1; fi
mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd); HERE=$(pwd); W=tools/integration/fixtures/flat77; N="node --experimental-strip-types --no-warnings"
same() { cmp -s "$1" "$2" && echo "same  $2" || echo "DIFF  $2 ($1)"; }
python3 tools/integration/flat77Stage.py "$OUT/sc" > /dev/null
diff -rq "$OUT/sc" $W/scenarios > /dev/null && echo "same  $W/scenarios/" || echo "DIFF  $W/scenarios/"
TOP=$(git rev-parse --show-toplevel)
for d in base patched; do
  mkdir -p "$OUT/$d"; git -C "$TOP" archive dd00bdd6e:workspace | tar -x -C "$OUT/$d"
  rm -rf "$OUT/$d/node_modules" "$OUT/$d/reference"; ln -s "$HERE/node_modules" "$OUT/$d/node_modules"; ln -s "$HERE/reference" "$OUT/$d/reference"
  cp tools/integration/flat77*.py tools/integration/flat77*.ts tools/integration/flat77Probes.sh "$OUT/$d/tools/integration/"
  mkdir -p "$OUT/$d/$W"; cp -R $W/scenarios $W/fixtures "$OUT/$d/$W/"
done
(cd "$OUT/patched" && patch -s -p1 < "$HERE/$W/flat77-temp-src.diff")
# 3. predictions (production hosts on the predicted turn-0 histories)
(cd "$OUT/base" && python3 tools/integration/flat77Fixtures.py --predict "$OUT/pred-fx" > /dev/null \
  && for n in $(ls "$OUT/pred-fx" | sed 's/-c[0-9]*\.json$//' | sort -u); do FLAT77_PREDICT=1 $N tools/integration/flat77Check.ts "$OUT/pred-fx" "$n" /dev/null; done) > "$OUT/predict.txt" 2>&1
same "$OUT/predict.txt" $W/predict.txt
# 4. probes twice fresh + fixtures
sh tools/integration/flat77Probes.sh "$OUT/probe" > /dev/null
same "$OUT/probe/probes-r1r2.txt" $W/probes-r1r2.txt
python3 tools/integration/flat77Fixtures.py "$OUT/probe/r1" "$OUT/fx" > "$OUT/derive.txt"
same "$OUT/derive.txt" $W/derive.txt
diff -rq "$OUT/fx" $W/fixtures > /dev/null && echo "same  $W/fixtures/" || echo "DIFF  $W/fixtures/"
# 5. base lends vs ROM
(cd "$OUT/base" && for n in $(ls $W/fixtures | sed 's/-c[0-9]*\.json$//' | sort -u); do FLAT77_LENDS_ONLY=1 $N tools/integration/flat77Check.ts $W/fixtures "$n" /dev/null; done) > "$OUT/lends-base.txt" 2>&1
same "$OUT/lends-base.txt" $W/lends-base.txt
# 6. patched checks (two more fresh probes per scenario)
mkdir -p "$OUT/check"
(cd "$OUT/patched" && ls $W/fixtures | sed 's/-c[0-9]*\.json$//' | sort -u | xargs -n 1 -P "${FLAT77_JOBS:-6}" sh -c \
  "$N tools/integration/flat77Check.ts $W/fixtures \"\$0\" \"$OUT/check/check-\$0.json\" > \"$OUT/check/\$0.log\" 2>&1 || echo FAILED \$0")
for f in $W/check/*.json; do same "$OUT/check/$(basename "$f")" "$f"; done
python3 tools/integration/flat77Summary.py "$OUT/check" > "$OUT/summary.txt"; same "$OUT/summary.txt" $W/summary.txt
# 7. ON / OFF parity on the lifted census route (seed / streak: the census battle with the lifted later-body Flatter)
for f in $W/parity-*.json; do
  s=$(python3 -c "import json,sys; d=json.load(open(sys.argv[1])); print(d['seed'], d['streak'])" "$f")
  (cd "$OUT/patched" && $N tools/integration/flat77Parity.ts --seed=${s% *} --streak=${s#* } --out="$OUT/$(basename "$f")" > /dev/null)
  same "$OUT/$(basename "$f")" "$f"
done
# 8. census 0..999, base and patched in parallel, delta + identity gate
if [ -z "$FLAT77_SKIP_CENSUS" ]; then
  mkdir -p "$OUT/census"
  for d in base patched; do (cd "$OUT/$d" && $N tools/integration/liveShareCensus.ts --seeds=0..999 --out="$OUT/census/census-$d-seeds0-999.json" \
    --commands="$OUT/census-$d.jsonl" > "$OUT/census-$d.log" 2>&1) & done; wait
  python3 tools/integration/prep43CensusDelta.py "$OUT/census/census-base-seeds0-999.json" "$OUT/census-base.jsonl" \
    "$OUT/census/census-patched-seeds0-999.json" "$OUT/census-patched.jsonl" "$OUT/census/census-delta-seeds0-999.json" > /dev/null
  python3 tools/integration/flat77KeyCheck.py "$OUT/census/census-base-seeds0-999.json" "$OUT/census-base.jsonl" \
    "$OUT/census/census-patched-seeds0-999.json" "$OUT/census-patched.jsonl" > "$OUT/census/keycheck.txt" || true
  python3 tools/integration/flat77CensusFlatter.py "$OUT/census-base.jsonl" "$OUT/census-patched.jsonl" > "$OUT/census/flatter-commands.txt"
  for f in $W/census/*; do same "$OUT/census/$(basename "$f")" "$f"; done
fi
# 10. fold pins (the related test files in the patched copy)
if [ -n "$FLAT77_TESTS" ]; then
  (cd "$OUT/patched" && npm test -- $(cat "$HERE/$W/tests-related-files.txt") > "$OUT/tests-patched.txt" 2>&1 || true)
  grep -E '^ FAIL |^ +Test Files |^ +Tests ' "$OUT/tests-patched.txt" | sed -e 's/ [0-9]*ms$//' -e 's/^ *//' > "$OUT/tests-patched-summary.txt"
  same "$OUT/tests-patched-summary.txt" $W/tests-patched-summary.txt
fi
for d in base patched; do rm -f "$OUT/$d/node_modules" "$OUT/$d/reference"; done
echo "flat77Run done: $OUT"
