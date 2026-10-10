#!/bin/sh
# prep61 reproduction (run from workspace/ of a clean checkout; direct mGBA processes only, never the shared HTTP oracles).
#   OUT=<fresh scratch dir> REC=<fresh receipt dir> sh tools/integration/prep61Run.sh   # ~7 min: probes (26 jobs x 2 fresh), census x2
#   SKIP_PROBES=1 ...   reuse $OUT/probe/raw;   SKIP_CENSUS=1 ...   skip the two 300-battle census runs (and the chain / rank / delta receipts)
# Writes receipts into $REC; compares them with tools/integration/fixtures/prep61/ (the loop at the end prints same/DIFF per file).
# The src experiment is applied from the committed .diff, checked to regenerate byte-identically, and ALWAYS reverted (EXIT trap);
# `git status --short src` must print nothing afterwards.
set -e
: "${OUT:?set OUT=<scratch dir>}"; : "${REC:?set REC=<receipt dir>}"
export PYTHONPATH=${PYTHONPATH:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
PY=${PY:-/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python}
T=tools/integration; F=$T/fixtures/prep61; N="node --experimental-strip-types --no-warnings"
TABLE=$T/spriteOrderProductionTable.ts
mkdir -p "$OUT" "$REC"
test -z "$(git status --short src $TABLE)" || { echo "src / table generator not clean"; exit 1; }
trap 'git checkout -- src $TABLE' EXIT
# (2) ROM evidence: 26 jobs, each twice in fresh mGBA processes (raw A == B is required by the extractor's identicalAB).
if [ -z "$SKIP_PROBES" ]; then $PY $T/prep61Probe.py "$OUT/probe" --jobs 12; fi
python3 $T/prep61Extract.py "$OUT/probe" "$REC/units.json" > "$REC/units-summary.txt"; head -1 "$REC/units-summary.txt"
$N $T/prep61Check.ts "$REC/units.json" "$REC/check.json" > "$REC/check-summary.txt"; tail -1 "$REC/check-summary.txt"
$N $T/prep61PlanRows.ts "$REC/check.json" "$REC/plan-rows.json"
$N $T/prep61DiveWords.ts "$OUT/probe" "$REC/units.json" "$REC/dive-words.json" | grep -c EXACT | sed 's/^/Dive setup bodies exact: /'
$N $T/prep61CorpusReplay.ts --turn-keyed | head -1 > "$REC/replay-before.json"
# (1) rank on the base tree.
if [ -z "$SKIP_CENSUS" ]; then
  $N $T/prep61OrderCensus.ts --seeds=0..299 --out="$REC/census-before-seeds0-299.json" --commands="$OUT/census-before.jsonl" \
    --events="$OUT/events-before.jsonl" 2>&1 | tail -1
  python3 $T/prep45Chains.py "$OUT/census-before.jsonl" "$REC/chains-before-seeds0-299.json" > /dev/null
  python3 $T/prep61Rank.py "$OUT/events-before.jsonl" "$OUT/census-before.jsonl" "$REC/rank-before-seeds0-299.json" > /dev/null
fi
# (3) the temporary production patch (the committed plan rows are the ones the diff's table was generated from).
git apply $F/prep61-temp-src.diff
$N $TABLE > /dev/null
git diff -- src $TABLE | cmp - $F/prep61-temp-src.diff && echo "patch table regenerates identically"
$N $T/prep61CorpusReplay.ts --turn-keyed | head -1 > "$REC/replay-after.json"
if [ -z "$SKIP_CENSUS" ]; then
  $N $T/prep61OrderCensus.ts --seeds=0..299 --out="$REC/census-after-seeds0-299.json" --commands="$OUT/census-after.jsonl" \
    --events="$OUT/events-after.jsonl" 2>&1 | tail -1
fi
git checkout -- src $TABLE
if [ -z "$SKIP_CENSUS" ]; then
  python3 $T/prep45Chains.py "$OUT/census-before.jsonl" "$REC/chains-predict-fly-bounce.json" --cleared "body 19 FLY|body 340 BOUNCE" \
    --after "$OUT/census-after.jsonl" | sed -n 2,3p
  python3 $T/prep45Chains.py "$OUT/census-after.jsonl" "$REC/chains-after-seeds0-299.json" > /dev/null
  python3 $T/prep61Rank.py "$OUT/events-after.jsonl" "$OUT/census-after.jsonl" "$REC/rank-after-seeds0-299.json" > /dev/null
  python3 $T/prep43CensusDelta.py "$REC/census-before-seeds0-299.json" "$OUT/census-before.jsonl" \
    "$REC/census-after-seeds0-299.json" "$OUT/census-after.jsonl" "$REC/census-delta-seeds0-299.json" | head -2
fi
test -z "$(git status --short src $TABLE)" && echo "src reverted"
for f in "$REC"/*.json "$REC"/*.txt; do cmp -s "$f" "$F/$(basename "$f")" && echo "same  $(basename "$f")" || echo "DIFF  $(basename "$f")"; done
