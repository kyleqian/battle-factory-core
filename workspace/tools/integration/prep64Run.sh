#!/bin/sh
# prep64: reproduce every receipt under tools/integration/fixtures/prep64/ (docs/next-adapters-prep64.md).
# usage (from workspace/): OUT=<fresh probe dir> REC=<fresh receipt dir> [SKIP_PROBES=1] [SKIP_CENSUS=1] sh tools/integration/prep64Run.sh
#   probes (~30 s): 10 jobs x 2 fresh runs (sprite order + state) and 10 x 2 (allocator net-zero), direct mGBA, never the HTTP oracles
#   census (~2 x 150 s): seeds 0..299 on the unpatched tree and with patches/prep64-substitute-fade.diff applied (reverted after)
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
if [ -z "${SKIP_CENSUS:-}" ]; then
  sh tools/integration/prep64Census.sh "$OUT/census" "$REC"
fi
