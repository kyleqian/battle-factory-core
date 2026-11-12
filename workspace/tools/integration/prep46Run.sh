#!/bin/sh
# prep46 reproduction (run from workspace/ of a clean checkout; direct mGBA processes only, never the shared HTTP oracles).
#   OUT=/tmp/p46-repro REC=/tmp/p46-rec sh tools/integration/prep46Run.sh   # ~5 min: probes (12 jobs x 2 fresh), census x2, replays x2
#   SKIP_PROBES=1 ...   reuse $OUT/raw;   SKIP_CENSUS=1 ...   skip the two 300-battle census runs (and the chain / delta receipts)
# Writes receipts into $REC; compare with tools/integration/fixtures/prep46/ (the loop at the end prints same/DIFF per file).
# The src experiment is applied from the committed .diff (it adds src/engine/liveWordsOrderCarry.ts) and ALWAYS reverted.
set -e
: "${OUT:?set OUT=<scratch dir>}"; : "${REC:?set REC=<receipt dir>}"
export PYTHONPATH=${PYTHONPATH:-${POKEBENCH_VENDOR_DIR:-../../vendor}/libmgba-py}
PY=${PY:-${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python}
T=tools/integration; F=$T/fixtures/prep46; N="node --experimental-strip-types --no-warnings"
NEW=src/engine/liveWordsOrderCarry.ts
mkdir -p "$OUT" "$REC"
test -z "$(git status --short src)" || { echo "src is not clean"; exit 1; }
trap 'git checkout -- src; rm -f $NEW' EXIT
if [ -z "$SKIP_PROBES" ]; then $PY $T/prep46Probe.py "$OUT" --jobs 12; fi
python3 $T/prep46Words.py "$OUT" "$REC/words.json" > /dev/null
python3 $T/prep46Extract.py "$OUT" "$OUT/units.json" > "$REC/units-summary.txt"
$N $T/prep46Carry.ts "$OUT/units.json" "$REC/carry.json" > /dev/null
$N $T/prep46Chain.ts "$OUT/units.json" "$REC/chain.json" | grep -c EXACT | sed 's/^/chains EXACT: /'
$N $T/prep46SubStream.ts "$REC/substream.json"
$N $T/prep45CorpusReplay.ts "$REC/replay-before.json" | head -2
if [ -z "$SKIP_CENSUS" ]; then
  census() { $N $T/prep45OrderCensus.ts --seeds=0..299 --out="$1" --commands="$2" 2>&1 | tail -1; }
  census "$REC/census-before-seeds0-299.json" "$OUT/census-before.jsonl"
  python3 $T/prep45Chains.py "$OUT/census-before.jsonl" "$REC/chains-before-seeds0-299.json" > /dev/null
fi
git apply $F/prep46-temp-src.diff
$N $T/prep45CorpusReplay.ts "$REC/replay-after.json" | head -2
npx vitest run tests/spriteOrderDeferredLend.test.ts 2>&1 | grep -E "Tests +[0-9]"
if [ -z "$SKIP_CENSUS" ]; then
  census "$REC/census-after-seeds0-299.json" "$OUT/census-after.jsonl"
fi
git checkout -- src; rm -f $NEW
if [ -z "$SKIP_CENSUS" ]; then
  W="body 28 SAND_ATTACK|body 189 MUD_SLAP|body 240 RAIN_DANCE"
  python3 $T/prep45Chains.py "$OUT/census-before.jsonl" "$REC/chains-predict.json" --cleared "$W" --after "$OUT/census-after.jsonl" | sed -n 2,3p
  python3 $T/prep45Chains.py "$OUT/census-before.jsonl" "$REC/chains-predict-with-rain.json" --cleared "$W|general animation RAIN_CONTINUES" | sed -n 2p
  python3 $T/prep43CensusDelta.py "$REC/census-before-seeds0-299.json" "$OUT/census-before.jsonl" \
    "$REC/census-after-seeds0-299.json" "$OUT/census-after.jsonl" "$REC/census-delta-seeds0-299.json" | head -2
fi
test -z "$(git status --short src)" && echo "src reverted"
for f in "$REC"/*.json "$REC"/*.txt; do cmp -s "$f" "$F/$(basename "$f")" && echo "same  $(basename "$f")" || echo "DIFF  $(basename "$f")"; done
