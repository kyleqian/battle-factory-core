#!/bin/sh
# ice72 reproduction (run from workspace/; direct mGBA processes only, never the shared HTTP oracles).
#   sh tools/integration/ice72Run.sh <fresh-out-dir>     # ~1 min: 5 jobs x 2 fresh runs (r1), again (r2), extract, predictions, chain check
# r1 and r2 are independent fresh probe batches (each job's A / B runs in one batch); every artefact of r1 must equal r2's, and the
# receipts are compared byte for byte with tools/integration/fixtures/ice72/ (same / DIFF).
set -e
OUT=${1:?usage: ice72Run.sh <fresh-out-dir>}
[ ! -e "$OUT" ] || { echo "out dir exists: $OUT" >&2; exit 2; }
export PYTHONPATH=${PYTHONPATH:-${POKEBENCH_VENDOR_DIR:-../../vendor}/libmgba-py}
PY=${PY:-${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python}
T=tools/integration; F=$T/fixtures/ice72; N="node --experimental-strip-types --no-warnings"
for r in r1 r2; do
  mkdir -p "$OUT/$r"
  $PY $T/ice72Probe.py "$OUT/$r" | tee "$OUT/$r/probes.txt"
  python3 $T/ice72Extract.py "$OUT/$r" "$OUT/$r/units.json" > "$OUT/$r/units-summary.txt"
  ICE72_OUT="$OUT/$r" ICE72_PREDICT="$OUT/$r/predictions.json" $N $T/ice72Chain.ts "$OUT/$r/units.json" "$OUT/$r/chain.json"
  ICE72_OUT="$OUT/$r" $N $T/ice72Chain.ts "$OUT/$r/units.json" "$OUT/$r/chain.json" "$OUT/$r/ice72-lend-vectors.json" | sed 's/[[:space:]]*$//' > "$OUT/$r/chain.txt"
  shasum -a 256 "$OUT/$r"/raw/*.json | sed "s|$OUT/$r/||" > "$OUT/$r/raw.sha256"
done
for f in probes.txt units-summary.txt raw.sha256 units.json predictions.json chain.json chain.txt ice72-lend-vectors.json; do
  cmp -s "$OUT/r1/$f" "$OUT/r2/$f" && echo "r1 == r2  $f" || echo "r1 != r2  $f"
done
for f in units-summary.txt raw.sha256 predictions.json chain.json chain.txt ice72-lend-vectors.json; do
  cmp -s "$OUT/r1/$f" "$F/$f" && echo "same  $f" || echo "DIFF  $f"
done
tail -1 "$OUT/r1/chain.txt"
