#!/bin/sh
# flat84 reproduction (docs/next-adapters-flat84.md): Flatter 260 as a words-order unit. Run from workspace/; direct mGBA only (never the
# shared HTTP oracles). Production src is NOT patched: the temp patch is applied only to a git-archive copy of the FIXED base b05d384ca
# inside <out-dir>. Everything goes under the FRESH <out-dir> (refused if non-empty). Each step prints "same <receipt>" or "DIFF <receipt>".
#   sh tools/integration/flat84Run.sh <fresh-out-dir>     (~6 min; FLAT84_CENSUS=1: + census 0..999 base vs patched, ~10 min;
#                                                          FLAT84_TESTS=1: + the related test files in the patched copy, ~6 min)
# 1. re-stage the scenarios (== fixtures/flat84/scenarios);
# 2. base = git archive b05d384ca:workspace, patched = base + fixtures/flat84/flat84-temp-src.diff (node_modules / reference symlinked);
# 3. probes: every scenario twice fresh in one batch (flat84Probes.sh, == probes-r1r2.txt); fixtures from r1 (== derive.txt, fixtures/);
# 4. plan: flat84Plan.ts FLAT84_PREDICT=1 (== predict-plan.txt), then plan vs the ROM endOrder (== plan-check.txt) in patched;
# 5. lends: flat77Check.ts FLAT77_LENDS_ONLY=1 in base and patched (== lends-base.txt / lends-patched.txt; predict-lends.txt = the
#    production columns of the patched pass);
# 6. windows: flat84Check.ts per scenario in patched (two more fresh probe processes each; == check/*.json, summary.txt);
# 6b. the KO chain: flat84KoProbe.py (A / B in one batch) + flat84KoExtract.py + flat84KoChain.ts in patched (== ko-chain/);
# 6c. ON / OFF parity (flat77Parity.ts) on census battles 735 / 936 in patched (== parity-*.json);
# 7. (FLAT84_CENSUS=1) flat84Census.sh (== census/census-check.txt, census-delta.json);
# 8. (FLAT84_TESTS=1) the related test files in patched (== tests-patched-summary.txt).
set -e
OUT=${1:?usage: flat84Run.sh <fresh-out-dir>}
if [ -e "$OUT" ] && [ -n "$(ls -A "$OUT" 2>/dev/null)" ]; then echo "refusing: $OUT exists and is not empty"; exit 1; fi
mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd); HERE=$(pwd); W=tools/integration/fixtures/flat84; N="node --experimental-strip-types --no-warnings"
same() { cmp -s "$1" "$2" && echo "same  $2" || echo "DIFF  $2 ($1)"; }
python3 tools/integration/flat84Stage.py "$OUT/sc" > /dev/null
diff -rq "$OUT/sc" $W/scenarios > /dev/null && echo "same  $W/scenarios/" || echo "DIFF  $W/scenarios/"
TOP=$(git rev-parse --show-toplevel)
for d in base patched; do
  mkdir -p "$OUT/$d"; git -C "$TOP" archive b05d384ca:workspace | tar -x -C "$OUT/$d"
  rm -rf "$OUT/$d/node_modules" "$OUT/$d/reference"; ln -s "$HERE/node_modules" "$OUT/$d/node_modules"; ln -s "$HERE/reference" "$OUT/$d/reference"
  cp tools/integration/flat84*.py tools/integration/flat84*.ts tools/integration/flat84*.sh "$OUT/$d/tools/integration/"
  mkdir -p "$OUT/$d/$W"; cp -R $W/scenarios $W/fixtures "$OUT/$d/$W/"
done
(cd "$OUT/patched" && patch -s -p1 < "$HERE/$W/flat84-temp-src.diff")
# 3. probes twice fresh + fixtures
sh tools/integration/flat84Probes.sh "$OUT/probe" > /dev/null
same "$OUT/probe/probes-r1r2.txt" $W/probes-r1r2.txt
python3 tools/integration/flat84Fixtures.py "$OUT/probe/r1" "$OUT/fx" > "$OUT/derive.txt"
same "$OUT/derive.txt" $W/derive.txt
diff -rq "$OUT/fx" $W/fixtures > /dev/null && echo "same  $W/fixtures/" || echo "DIFF  $W/fixtures/"
# 4. plan predictions, then plan vs ROM
(cd "$OUT/patched" && FLAT84_PREDICT=1 $N tools/integration/flat84Plan.ts "$OUT/probe/r1" > "$OUT/predict-plan.txt")
same "$OUT/predict-plan.txt" $W/predict-plan.txt
(cd "$OUT/patched" && $N tools/integration/flat84Plan.ts "$OUT/probe/r1" > "$OUT/plan-check.txt")
same "$OUT/plan-check.txt" $W/plan-check.txt
python3 tools/integration/flat84Vectors.py "$OUT/probe/r1" "$OUT/flatter-vectors.json" > /dev/null
same "$OUT/flatter-vectors.json" $W/flatter-vectors.json
# 5. lends (chain = production hosts fed as the orchestrator feeds them; deferred lends resolved as the render seam resolves them)
for d in base patched; do
  (cd "$OUT/$d" && for n in $(ls $W/fixtures | sed 's/-c[0-9]*\.json$//' | sort -u); do FLAT77_LENDS_ONLY=1 $N tools/integration/flat77Check.ts $W/fixtures "$n" /dev/null; done) > "$OUT/lends-$d.txt" 2>&1
  same "$OUT/lends-$d.txt" $W/lends-$d.txt
done
python3 -c "
import json, sys
for line in open(sys.argv[1]):
    d = json.loads(line); print(json.dumps({k: d[k] for k in ('fixture', 'move', 'live', 'decline', 'deferred', 'lend')}))" "$OUT/lends-patched.txt" > "$OUT/predict-lends.txt"
same "$OUT/predict-lends.txt" $W/predict-lends.txt
# 6. windows through the PATCHED production renderer (two fresh probes per scenario)
mkdir -p "$OUT/check"
(cd "$OUT/patched" && ls $W/fixtures | sed 's/-c[0-9]*\.json$//' | sort -u | xargs -n 1 -P "${FLAT84_JOBS:-7}" sh -c \
  "$N tools/integration/flat84Check.ts $W/fixtures \"\$0\" \"$OUT/check/check-\$0.json\" > \"$OUT/check/\$0.log\" 2>&1 || echo FAILED \$0")
for f in $W/check/*.json; do same "$OUT/check/$(basename "$f")" "$f"; done
python3 tools/integration/flat77Summary.py "$OUT/check" > "$OUT/summary.txt"; same "$OUT/summary.txt" $W/summary.txt
# 6b. KO chain (words57 / ice72 method): fresh A / B probe batch, extract, predictions, chain check in patched (== ko-chain/)
PYTHONPATH=${PYTHONPATH:-/Users/kyle/Developer/pokebench/vendor/libmgba-py} ${PY:-/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python} \
  tools/integration/flat84KoProbe.py "$OUT/ko" > "$OUT/ko-probes.txt"
python3 tools/integration/flat84KoExtract.py "$OUT/ko" "$OUT/ko/units.json" > "$OUT/ko/units-summary.txt"
(cd "$OUT/patched" && ICE72_OUT="$OUT/ko" ICE72_PREDICT="$OUT/ko/predictions.json" $N tools/integration/flat84KoChain.ts "$OUT/ko/units.json" "$OUT/ko/chain.json" > /dev/null \
  && ICE72_OUT="$OUT/ko" $N tools/integration/flat84KoChain.ts "$OUT/ko/units.json" "$OUT/ko/chain.json" "$OUT/ko/lend-vectors.json" | sed 's/[[:space:]]*$//' > "$OUT/ko/chain.txt")
(cd "$OUT/ko" && shasum -a 256 raw/*.json) > "$OUT/ko/raw.sha256"
for f in units-summary.txt predictions.json chain.json chain.txt lend-vectors.json raw.sha256; do same "$OUT/ko/$f" $W/ko-chain/$f; done
# 6c. ON / OFF parity on two lifted census routes (battle 735 = seed 735 streak 0; battle 936 = seed 936 streak 6), patched copy
for f in $W/parity-*.json; do
  s=$(python3 -c "import json,sys; d=json.load(open(sys.argv[1])); print(d['seed'], d['streak'])" "$f")
  (cd "$OUT/patched" && $N tools/integration/flat77Parity.ts --seed=${s% *} --streak=${s#* } --out="$OUT/$(basename "$f")" > /dev/null)
  same "$OUT/$(basename "$f")" "$f"
done
# 7. census 0..999 base vs patched
if [ -n "$FLAT84_CENSUS" ]; then
  sh tools/integration/flat84Census.sh "$OUT/base" "$OUT/patched" "$OUT/census" > /dev/null
  for f in census-check.txt census-delta.json; do same "$OUT/census/$f" $W/census/$f; done
fi
# 8. the related test files in the patched copy
if [ -n "$FLAT84_TESTS" ]; then
  (cd "$OUT/patched" && npm test -- $(cat "$HERE/$W/tests-related-files.txt") > "$OUT/tests-patched.txt" 2>&1 || true)
  grep -E '^ FAIL |^ +Test Files |^ +Tests ' "$OUT/tests-patched.txt" | sed -e 's/ [0-9]*ms$//' -e 's/^ *//' > "$OUT/tests-patched-summary.txt"
  same "$OUT/tests-patched-summary.txt" $W/tests-patched-summary.txt
fi
for d in base patched; do rm -f "$OUT/$d/node_modules" "$OUT/$d/reference"; done
echo "flat84Run done: $OUT"
