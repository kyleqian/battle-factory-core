#!/bin/sh
# words57 reproduction (run from workspace/; direct mGBA processes only, never the shared HTTP oracles).
#   OUT=/tmp/w57 REC=/tmp/w57-rec sh tools/integration/words57Run.sh     # ~1 min: 23 jobs x 2 fresh runs, extract, chain check
#   SKIP_PROBES=1 ...   reuse $OUT/raw
# Writes receipts into $REC; the loop at the end prints same/DIFF against tools/integration/fixtures/words57/.
set -e
: "${OUT:?set OUT=<scratch dir>}"; : "${REC:?set REC=<receipt dir>}"
export PYTHONPATH=${PYTHONPATH:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
PY=${PY:-/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python}
T=tools/integration; F=$T/fixtures/words57; N="node --experimental-strip-types --no-warnings"
mkdir -p "$OUT" "$REC"
if [ -z "$SKIP_PROBES" ]; then $PY $T/words57Probe.py "$OUT" | tee "$REC/probes.txt"; fi
python3 $T/words57Extract.py "$OUT" "$OUT/units.json" > "$REC/units-summary.txt"
WORDS57_OUT="$OUT" $N $T/words57Chain.ts "$OUT/units.json" "$REC/chain.json" | tail -1
for f in "$REC"/chain.json "$REC"/units-summary.txt; do cmp -s "$f" "$F/$(basename "$f")" && echo "same  $(basename "$f")" || echo "DIFF  $(basename "$f")"; done
