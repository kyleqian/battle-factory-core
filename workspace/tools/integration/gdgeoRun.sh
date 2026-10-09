#!/bin/sh
# gdgeo reproduction (run from workspace/; direct mGBA processes only, never the shared HTTP oracles).
#   OUT=/tmp/gdgeo-repro REC=/tmp/gdgeo-rec sh tools/integration/gdgeoRun.sh     # ~1 min: 24 jobs x A/B probes, extract, checks
#   SKIP_PROBES=1 ...   reuse $OUT/raw
# Writes receipts into $REC and compares them with tools/integration/fixtures/gdgeo/ (same / DIFF per file).
set -e
: "${OUT:?set OUT=<scratch dir>}"; : "${REC:?set REC=<receipt dir>}"
export PYTHONPATH=${PYTHONPATH:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
T=tools/integration; F=$T/fixtures/gdgeo; N="node --experimental-strip-types --no-warnings"
mkdir -p "$OUT" "$REC"
if [ -z "$SKIP_PROBES" ]; then python3 $T/gdgeoProbe.py "$OUT" --jobs 12; fi
python3 $T/gdgeoExtract.py "$OUT" "$REC/units.json"
python3 $T/gdgeoMechanism.py "$OUT/raw" "$REC/mechanism.json"
$N $T/gdgeoModelCheck.ts "$REC/units.json" "$REC/model-check.json" "$REC/mechanism.json" | tail -1
$N $T/gdgeoCheck.ts "$REC/check.json" "$REC/units.json" $T/fixtures/prep43/units.json | head -1
for f in units.json mechanism.json model-check.json check.json; do cmp -s "$REC/$f" "$F/$f" && echo "same  $f" || echo "DIFF  $f"; done
