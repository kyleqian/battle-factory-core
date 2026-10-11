#!/bin/sh
# ret88 reproduction (docs/ret88-return-weak.md). Run from workspace/ with a FRESH <out-dir> INSIDE the repo (the probe tools find ../oracle
# from there); direct mGBA processes only (never the shared HTTP oracles). Nothing outside <out-dir> is written.
#   sh tools/integration/ret88Run.sh <fresh-out-dir>                # probes x2 batches (r1 == r2) + plan rows + Weak windows + consumers + parity
#   RET88_CENSUS=1 sh tools/integration/ret88Run.sh <fresh-out-dir> # + the seeds 0..999 census, base d46cdfff1 vs HEAD (10 shards each)
# Receipt files land in <out-dir>/rec; `same` / `DIFF` lines compare them with tools/integration/fixtures/ret88/.
set -e
OUT=${1:?usage: ret88Run.sh <fresh-out-dir>}
[ ! -e "$OUT" ] || { echo "refusing: $OUT exists"; exit 1; }
mkdir -p "$OUT/rec"; OUT=$(cd "$OUT" && pwd)
T=tools/integration; F=$T/fixtures/ret88; N="node --experimental-strip-types --no-warnings"; REC=$OUT/rec
export PYTHONPATH=${PYTHONPATH:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
PY=${PY:-/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python}
same() { if cmp -s "$1" "$2"; then echo "same $(basename "$2")"; else echo "DIFF $(basename "$2")"; fi; }
# 1. sSpriteOrder probes (12 jobs x A/B), twice as whole batches
for b in 1 2; do
  $PY $T/ret88Probe.py "$OUT/probe$b" --jobs "${RET88_JOBS:-12}" | tail -1
  python3 $T/ret88Extract.py "$OUT/probe$b" "$OUT/probe$b/units.json" > /dev/null
  $N $T/ret88Check.ts "$OUT/probe$b/units.json" "$OUT/probe$b/check.json" | tail -1
done
same "$OUT/probe1/units.json" "$OUT/probe2/units.json"; same "$OUT/probe1/check.json" "$OUT/probe2/check.json"
cp "$OUT/probe1/units.json" "$OUT/probe1/check.json" "$REC/"
$N $T/ret88PlanRows.ts "$REC/check.json" "$REC/plan-rows.json" > /dev/null
for f in units.json check.json plan-rows.json; do same "$F/$f" "$REC/$f"; done
# 2. ReturnWeak body windows (+ the consumer scenarios' Return bodies) and consumers after a ReturnWeak
sh $T/ret88Consumers.sh "$OUT/consumers" | tail -1
sh $T/ret88Windows.sh "$OUT/windows" "$OUT/consumers/sc" | tail -1
cp "$OUT/windows/summary.txt" "$REC/weak-windows-summary.txt"; cp "$OUT/consumers/summary.txt" "$REC/consumer-windows-summary.txt"
cp "$OUT/consumers/lends-pi.txt" "$REC/consumer-lends-pi.txt"
for f in weak-windows-summary.txt consumer-windows-summary.txt consumer-lends-pi.txt; do same "$F/$f" "$REC/$f"; done
# 3. Scene ON / OFF parity on two census routes with friendship-0 Returns (battles 22, 171)
for s in 22 171; do $N $T/ret88Parity.ts --seed=$s --streak=$(( (s * 11) % 49 )) --out="$REC/parity-$s.json" > /dev/null; same "$F/parity-$s.json" "$REC/parity-$s.json"; done
# 4. census (optional, ~5 min per arm)
if [ -n "$RET88_CENSUS" ]; then
  sh $T/ret88Census.sh shards "$OUT/census-base" d46cdfff1
  sh $T/ret88Census.sh shards "$OUT/census-final" HEAD
  sh $T/ret88Census.sh compare "$OUT/census-base" "$OUT/census-final" "$OUT/cmp" | head -1
  python3 $T/ret88Flips.py "$OUT/census-base/merged.jsonl" "$OUT/census-final/merged.jsonl" "$REC/census-flips.json" | head -1
  same "$F/census-flips.json" "$REC/census-flips.json"
fi
