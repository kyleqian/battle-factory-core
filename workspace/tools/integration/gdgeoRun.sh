#!/bin/sh
# gdgeo reproduction (run from workspace/; direct mGBA processes only, never the shared HTTP oracles).
#   OUT=/tmp/gdgeo-repro REC=/tmp/gdgeo-rec sh tools/integration/gdgeoRun.sh     # ~1 min: GD 24 + MD 14 jobs x A/B probes, extract, checks
#   SKIP_PROBES=1 ...   reuse $OUT/raw and $OUT/md/raw
# Writes receipts into $REC and compares them with tools/integration/fixtures/gdgeo/ (same / DIFF per file).
set -e
: "${OUT:?set OUT=<scratch dir>}"; : "${REC:?set REC=<receipt dir>}"
export PYTHONPATH=${PYTHONPATH:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
T=tools/integration; F=$T/fixtures/gdgeo; N="node --experimental-strip-types --no-warnings"
mkdir -p "$OUT/md" "$REC"
if [ -z "$SKIP_PROBES" ]; then python3 $T/gdgeoProbe.py "$OUT" --jobs 12; python3 $T/gdgeoProbe.py "$OUT/md" --jobs 12 --md; fi
python3 $T/gdgeoExtract.py "$OUT" "$REC/units.json"
python3 $T/gdgeoExtract.py "$OUT/md" "$REC/md-units.json" --md
python3 $T/gdgeoMechanism.py "$OUT/raw" "$REC/mechanism.json"
python3 $T/gdgeoMechanism.py "$OUT/md/raw" "$REC/md-mechanism.json"
$N $T/gdgeoModelCheck.ts "$REC/units.json" "$REC/model-check.json" "$REC/mechanism.json" | tail -1
$N $T/gdgeoModelCheck.ts "$REC/md-units.json" "$REC/md-model-check.json" "$REC/md-mechanism.json" | tail -1
$N $T/gdgeoCheck.ts "$REC/check.json" "$REC/units.json" $T/fixtures/prep43/units.json | head -1
$N $T/gdgeoCheck.ts "$REC/md-check.json" "$REC/md-units.json" | head -1
for f in units.json mechanism.json model-check.json check.json md-units.json md-mechanism.json md-model-check.json md-check.json; do
  cmp -s "$REC/$f" "$F/$f" && echo "same  $f" || echo "DIFF  $f"
done
