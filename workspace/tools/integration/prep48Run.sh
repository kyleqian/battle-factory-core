#!/bin/sh
# prep48 reproduction (run from workspace/ of a clean checkout; direct mGBA processes only, never the shared HTTP oracles).
#   OUT=/tmp/p48-out REC=/tmp/p48-rec sh tools/integration/prep48Run.sh   # probes 20 scenarios x2 (~3 min), pixel checks (~6 min), census x3 (~6 min)
#   SKIP_PROBES=1 ...   reuse $OUT/r1 (fixtures) and skip the r1/r2 probes + the production-renderer pixel checks (two fresh probes each)
#   SKIP_CENSUS=1 ...   skip the three 300-battle census runs (and the delta / gates receipts)
# Writes receipts into $REC; the loop at the end prints same/DIFF against tools/integration/fixtures/prep48/ (dig-live/, return-live/ too).
# The src experiments are applied from the committed .diff files and ALWAYS reverted; `git status --short src` must print nothing.
#   prep48-temp-src-dig.diff     Dig 91: any known lend (setup at a later body; unleash after a later setup), x2 rest guard
#   prep48-temp-src-return.diff  Return 216: any known lend, x2 rest guard
#   prep48-temp-src-all.diff     both
set -e
: "${OUT:?set OUT=<scratch dir>}"; : "${REC:?set REC=<receipt dir>}"
export PYTHONPATH=${PYTHONPATH:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
PY=${PY:-/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python}
T=tools/integration; F=$T/fixtures/prep48; N="node --experimental-strip-types --no-warnings"
mkdir -p "$OUT" "$REC"
test -z "$(git status --short src)" || { echo "src is not clean"; exit 1; }
trap 'git checkout -- src' EXIT
python3 $T/prep48Scenarios.py > /dev/null
test -z "$(git status --short $F/scenarios)" || { echo "scenarios differ from the committed ones"; exit 1; }
if [ -z "$SKIP_PROBES" ]; then
  for run in r1 r2; do
    rm -rf "$OUT/$run"; mkdir -p "$OUT/$run"
    for s in $F/scenarios/*.json; do
      n=$(basename "$s" .json)
      python3 tools/run-mgba-probe.py "$OUT/$run/$n.json" -- $PY $T/prep48Probe.py "$s" "$OUT/$run/$n.json" "$OUT/$run/rgb-$n" > /dev/null 2>&1 || true
      rm -rf "$OUT/$run/rgb-$n" "$OUT/$run/$n.json.log"
    done
  done
  python3 $T/prep48Probes.py "$OUT/r1" "$OUT/r2" "$REC/probes.json"
fi
rm -rf "$REC/dig-live" "$REC/return-live"
python3 $T/prep48DigFixtures.py "$OUT/r1" "$REC/dig-live" dig > /dev/null
python3 $T/prep48DigFixtures.py "$OUT/r1" "$REC/return-live" return > /dev/null
export POKEBENCH_LIVE_PROBE_SHARE=1 POKEBENCH_LIVE_ORDER_HIT=damaging
$N $T/prep48DigCheck.ts $F/dig-live "$REC/dig-check-before.json" --live-only
$N $T/prep48DigCheck.ts $F/return-live "$REC/return-check-before.json" --live-only
census() { $N $T/prep48OrderCensus.ts --seeds=0..299 --out="$REC/census-$1-seeds0-299.json" --commands="$OUT/census-$1.jsonl" 2>&1 | tail -1; }
if [ -z "$SKIP_CENSUS" ]; then census before; fi
git apply $F/prep48-temp-src-all.diff
if [ -z "$SKIP_PROBES" ]; then
  $N $T/prep48DigCheck.ts $F/dig-live "$REC/dig-check-after.json" 2> /dev/null
  $N $T/prep48DigCheck.ts $F/return-live "$REC/return-check-after.json" 2> /dev/null
fi
if [ -z "$SKIP_CENSUS" ]; then census after-all; fi
git checkout -- src
git apply $F/prep48-temp-src-dig.diff
if [ -z "$SKIP_CENSUS" ]; then census after-dig; fi
git checkout -- src
if [ -z "$SKIP_CENSUS" ]; then
  for v in dig all; do
    python3 $T/prep43CensusDelta.py "$REC/census-before-seeds0-299.json" "$OUT/census-before.jsonl" "$REC/census-after-$v-seeds0-299.json" \
      "$OUT/census-after-$v.jsonl" "$REC/census-delta-$v-seeds0-299.json" | sed -n 1,2p
  done
  python3 $T/prep48Gates.py "$OUT/census-before.jsonl" "$REC/gates-before-seeds0-299.json" | head -1
  python3 $T/prep48Gates.py "$OUT/census-after-all.jsonl" "$REC/gates-after-all-seeds0-299.json" | head -1
fi
test -z "$(git status --short src)" && echo "src reverted"
for f in "$REC"/*.json; do cmp -s "$f" "$F/$(basename "$f")" && echo "same  $(basename "$f")" || echo "DIFF  $(basename "$f")"; done
for d in dig-live return-live; do
  n=$(ls "$REC/$d" | wc -l | tr -d ' '); s=0
  for f in "$REC/$d"/*.json; do cmp -s "$f" "$F/$d/$(basename "$f")" && s=$((s+1)); done
  echo "$d: $s/$n same"
done
