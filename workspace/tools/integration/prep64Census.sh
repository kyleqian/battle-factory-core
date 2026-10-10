#!/bin/sh
# prep64: census seeds 0..299 on the unpatched tree and with fixtures/prep64/prep64-temp-src.diff applied (ALWAYS reverted).
# usage (from workspace/ of a clean checkout): sh tools/integration/prep64Census.sh <fresh scratch dir> <receipt dir>   (~2 x 150 s)
# Receipts: census-{before,after}-seeds0-299.json (prep61OrderCensus.ts reports), census-delta-seeds0-299.json (prep43CensusDelta.py:
# paired command sequence, live -> fallback regressions), chains-predict-substitute-fade.json (prep45Chains.py --cleared --after).
set -eu
SCR=$1; REC=$2
T=tools/integration; F=$T/fixtures/prep64; N="node --experimental-strip-types --no-warnings"
TABLE=$T/spriteOrderProductionTable.ts
mkdir -p "$SCR" "$REC"
test -z "$(git status --short src $TABLE)" || { echo "src / table generator not clean"; exit 1; }
trap 'git checkout -- src $TABLE' EXIT
$N $T/prep61OrderCensus.ts --seeds=0..299 --out="$REC/census-before-seeds0-299.json" --commands="$SCR/census-before.jsonl" \
  --events="$SCR/events-before.jsonl" 2>&1 | tail -1
git apply $F/prep64-temp-src.diff
$N $TABLE > /dev/null
git diff -- src $TABLE | cmp - $F/prep64-temp-src.diff && echo "patch table regenerates identically"
$N $T/prep61OrderCensus.ts --seeds=0..299 --out="$REC/census-after-seeds0-299.json" --commands="$SCR/census-after.jsonl" \
  --events="$SCR/events-after.jsonl" 2>&1 | tail -1
git checkout -- src $TABLE
test -z "$(git status --short src $TABLE)" && echo "src reverted"
python3 $T/prep45Chains.py "$SCR/census-before.jsonl" "$REC/chains-predict-substitute-fade.json" \
  --cleared "general animation SUBSTITUTE_FADE" --after "$SCR/census-after.jsonl" | sed -n 2,3p
python3 $T/prep43CensusDelta.py "$REC/census-before-seeds0-299.json" "$SCR/census-before.jsonl" \
  "$REC/census-after-seeds0-299.json" "$SCR/census-after.jsonl" "$REC/census-delta-seeds0-299.json" | head -2
for f in census-before.jsonl census-after.jsonl; do shasum -a 256 "$SCR/$f" | sed "s|$SCR/||"; done
