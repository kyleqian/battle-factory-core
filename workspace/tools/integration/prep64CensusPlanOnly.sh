#!/bin/sh
# prep64: the split measurement -- census seeds 0..299 with ONLY the plan row (fixtures/prep64/prep64-temp-src-plan-only.diff: the
# appended prep64/plan-rows.json + regenerated table, no allocator set entry), ALWAYS reverted, paired against prep64Census.sh's
# unpatched run.
# usage (from workspace/ of a clean checkout): sh tools/integration/prep64CensusPlanOnly.sh <prep64Census.sh scratch dir> <receipt dir>
set -eu
SCR=$1; REC=$2
T=tools/integration; F=$T/fixtures/prep64; N="node --experimental-strip-types --no-warnings"
TABLE=$T/spriteOrderProductionTable.ts
test -f "$SCR/census-before.jsonl" || { echo "run prep64Census.sh $SCR first"; exit 1; }
test -z "$(git status --short src $TABLE)" || { echo "src / table generator not clean"; exit 1; }
trap 'git checkout -- src $TABLE' EXIT
git apply $F/prep64-temp-src-plan-only.diff
$N $TABLE > /dev/null
git diff -- src $TABLE | cmp - $F/prep64-temp-src-plan-only.diff && echo "plan-only table regenerates identically"
$N $T/prep61OrderCensus.ts --seeds=0..299 --out="$REC/census-plan-only-seeds0-299.json" --commands="$SCR/census-plan-only.jsonl" \
  2>&1 | tail -1
git checkout -- src $TABLE
test -z "$(git status --short src $TABLE)" && echo "src reverted"
python3 $T/prep43CensusDelta.py "$REC/census-before-seeds0-299.json" "$SCR/census-before.jsonl" \
  "$REC/census-plan-only-seeds0-299.json" "$SCR/census-plan-only.jsonl" "$REC/census-delta-plan-only-seeds0-299.json" | head -2
