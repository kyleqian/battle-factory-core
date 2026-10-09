#!/bin/sh
# prep47 reproduction (run from workspace/ of a clean checkout; direct mGBA processes only, never the shared HTTP oracles).
#   OUT=/tmp/p47-repro REC=/tmp/p47-rec sh tools/integration/prep47Run.sh   # ~11 min: probes (46 jobs x 2 fresh, ~1 min), census x4, replays
#   SKIP_PROBES=1 ...   reuse $OUT/{a,b,c}/raw;   SKIP_CENSUS=1 ...   skip the four 300-battle census runs (and the chain / delta receipts)
# Writes receipts into $REC; compare with tools/integration/fixtures/prep47/ (the loop at the end prints same/DIFF per file).
# The src experiments are applied from the committed .diff files and ALWAYS reverted; `git status --short src` must print nothing.
#   prep47-temp-src-retained.diff  (A) the retained locked-action continuation's prompt cycle
#   prep47-temp-src.diff           (A) + (B) the battle-start seed sequence
#   prep47-temp-src-all.diff       (A) + (B) + (C) the opponent voluntary switch-out unit
set -e
: "${OUT:?set OUT=<scratch dir>}"; : "${REC:?set REC=<receipt dir>}"
export PYTHONPATH=${PYTHONPATH:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
PY=${PY:-/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python}
T=tools/integration; F=$T/fixtures/prep47; N="node --experimental-strip-types --no-warnings"
mkdir -p "$OUT" "$REC"
test -z "$(git status --short src)" || { echo "src is not clean"; exit 1; }
trap 'git checkout -- src' EXIT
if [ -z "$SKIP_PROBES" ]; then
  $PY $T/prep47Probe.py "$OUT/a" --jobs 13
  $PY $T/prep47SeedProbe.py "$OUT/b" --jobs 13
  $PY $T/prep47AiSwitchProbe.py "$OUT/c"
fi
python3 $T/prep47Extract.py "$OUT/a" "$REC/units.json"
$N $T/prep47Check.ts "$REC/units.json" "$REC/check.json"
python3 $T/prep47SeedExtract.py "$OUT/b" "$REC/seed-units.json"
$N $T/prep47SeedCheck.ts "$REC/seed-units.json" "$REC/seed-check-before.json"
python3 $T/prep47AiSwitchExtract.py "$OUT/c" "$REC/ai-switch-units.json"
$N $T/prep47AiSwitchCheck.ts "$REC/ai-switch-units.json" "$REC/ai-switch-check-before.json"
$N $T/prep45CorpusReplay.ts "$REC/replay-before.json" | head -2
census() { $N $T/prep47OrderCensus.ts --seeds=0..299 --out="$REC/census-$1-seeds0-299.json" --commands="$OUT/census-$1.jsonl" 2>&1 | tail -1; }
if [ -z "$SKIP_CENSUS" ]; then census before; fi
git apply $F/prep47-temp-src-retained.diff
$N $T/prep45CorpusReplay.ts "$REC/replay-after-retained.json" | head -2
if [ -z "$SKIP_CENSUS" ]; then census after-retained; fi
git checkout -- src
git apply $F/prep47-temp-src.diff
$N $T/prep47SeedCheck.ts "$REC/seed-units.json" "$REC/seed-check-after.json"
if [ -z "$SKIP_CENSUS" ]; then census after-all; fi
git checkout -- src
git apply $F/prep47-temp-src-all.diff
$N $T/prep45CorpusReplay.ts "$REC/replay-after-all3.json" | head -2
$N $T/prep47AiSwitchCheck.ts "$REC/ai-switch-units.json" "$REC/ai-switch-check-after.json"
if [ -z "$SKIP_CENSUS" ]; then census after-all3; fi
git checkout -- src
if [ -z "$SKIP_CENSUS" ]; then
  B="$REC/census-before-seeds0-299.json $OUT/census-before.jsonl"
  for v in after-retained after-all after-all3; do
    python3 $T/prep43CensusDelta.py $B "$REC/census-$v-seeds0-299.json" "$OUT/census-$v.jsonl" "$REC/census-delta-${v#after-}-seeds0-299.json" | head -2
  done
  python3 $T/prep45Chains.py "$OUT/census-before.jsonl" "$REC/chains-before-seeds0-299.json" > /dev/null
  python3 $T/prep45Chains.py "$OUT/census-after-all.jsonl" "$REC/chains-after-all-seeds0-299.json" > /dev/null
  python3 $T/prep45Chains.py "$OUT/census-before.jsonl" "$REC/chains-predict-retained.json" \
    --cleared "command resolution without an action prompt" --after "$OUT/census-after-retained.jsonl" | sed -n 2,3p
  python3 $T/prep45Chains.py "$OUT/census-before.jsonl" "$REC/chains-predict-all.json" \
    --cleared "command resolution without an action prompt|battle-start seed: unknown entry" --after "$OUT/census-after-all.jsonl" | sed -n 2,3p
fi
test -z "$(git status --short src)" && echo "src reverted"
for f in "$REC"/*.json; do cmp -s "$f" "$F/$(basename "$f")" && echo "same  $(basename "$f")" || echo "DIFF  $(basename "$f")"; done
