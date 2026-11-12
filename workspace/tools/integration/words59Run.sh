#!/bin/sh
# words59 reproduction (run from workspace/; direct mGBA processes only, never the shared HTTP oracles).
#   OUT=/tmp/w59 REC=/tmp/w59-rec sh tools/integration/words59Run.sh     # ~30 s: 3 jobs x 2 fresh runs, extract, words57Chain.ts check
# Writes receipts into $REC; the loop at the end prints same/DIFF against tools/integration/fixtures/words59/.
set -e
: "${OUT:?set OUT=<scratch dir>}"; : "${REC:?set REC=<receipt dir>}"
export PYTHONPATH=${PYTHONPATH:-${POKEBENCH_VENDOR_DIR:-../../vendor}/libmgba-py}
PY=${PY:-${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python}
T=tools/integration; F=$T/fixtures/words59; N="node --experimental-strip-types --no-warnings"
mkdir -p "$OUT" "$REC"
if [ -z "$SKIP_PROBES" ]; then $PY $T/words59Probe.py "$OUT" | tee "$REC/probes.txt"; fi
python3 $T/words59Extract.py "$OUT" "$OUT/units.json" > "$REC/units-summary.txt"
WORDS57_OUT="$OUT" $N $T/words57Chain.ts "$OUT/units.json" "$REC/chain.json" "$REC/words59-lend-vectors.json" | tail -1
for f in "$REC"/chain.json "$REC"/units-summary.txt "$REC"/words59-lend-vectors.json; do cmp -s "$f" "$F/$(basename "$f")" && echo "same  $(basename "$f")" || echo "DIFF  $(basename "$f")"; done
