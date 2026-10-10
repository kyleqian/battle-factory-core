#!/bin/sh
# prep64: reproduce every receipt under tools/integration/fixtures/prep64/ (docs/next-adapters-prep64.md).
# usage (from workspace/): OUT=<fresh probe dir> REC=<fresh receipt dir> [SKIP_PROBES=1] [SKIP_CENSUS=1] sh tools/integration/prep64Run.sh
#   probes (~30 s): 10 jobs x 2 fresh runs (sprite order + state) and 10 x 2 (allocator net-zero), direct mGBA, never the HTTP oracles
#   census (~3 x 150 s): seeds 0..299 on the unpatched tree, with fixtures/prep64/prep64-temp-src.diff applied, and with the plan-only
#   split diff (prep64CensusPlanOnly.sh); src is always reverted
# Every receipt written to $REC must equal the committed one: diff -r "$REC" tools/integration/fixtures/prep64 (the census
# receipts are written only when SKIP_CENSUS is unset).
set -eu
: "${OUT:?set OUT to a fresh directory}" "${REC:?set REC to a fresh directory}"
PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py
export PYTHONPATH
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
NODE="node --experimental-strip-types --no-warnings"
mkdir -p "$OUT" "$REC"
if [ -z "${SKIP_PROBES:-}" ]; then
  $PY tools/integration/prep64Probes.py "$OUT" --jobs 10
  $PY tools/integration/prep64Probes.py "$OUT" --jobs 10 --netzero
fi
python3 tools/integration/prep64Extract.py "$OUT" "$REC/units.json"
python3 tools/integration/prep64NetZero.py "$OUT" "$REC/netzero.json"
$NODE tools/integration/prep64Check.ts "$REC/units.json" "$REC/check.json"
python3 tools/integration/prep64PlanRows.py "$REC/check.json" "$REC/plan-rows.json"
cp tools/integration/fixtures/prep64/.gitattributes tools/integration/fixtures/prep64/prep64-temp-src.diff \
  tools/integration/fixtures/prep64/prep64-temp-src-plan-only.diff "$REC/"
if [ -z "${SKIP_CENSUS:-}" ]; then
  sh tools/integration/prep64Census.sh "$OUT/census" "$REC"
  sh tools/integration/prep64CensusPlanOnly.sh "$OUT/census" "$REC"
fi
for f in "$REC"/*; do cmp -s "$f" "tools/integration/fixtures/prep64/$(basename "$f")" && echo "same  $(basename "$f")" || echo "DIFF  $(basename "$f")"; done
