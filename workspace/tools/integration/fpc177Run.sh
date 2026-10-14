#!/bin/sh
# fpc177 runner (docs/fpc177-focus-punch-edges.md). Run from workspace/; direct mGBA only (never the shared HTTP oracles); sequential.
#   sh tools/integration/fpc177Run.sh <fresh-out-dir>
# 1. re-stage the cards (must equal the committed ones); 2. fpc177Probe.py over every card x {r1, r2}, r1 == r2 byte for byte;
# 3. fpc177Rom.py folds r1 / r2 into rom rows (must be equal and equal receipts/rom-r1.json if present).
set -eu
OUT=${1:?usage: fpc177Run.sh <fresh-out-dir>}
[ -f tools/integration/fpc177Run.sh ] || { echo "run from workspace/"; exit 2; }
mkdir -p "$OUT"
[ -z "$(ls -A "$OUT")" ] || { echo "refusing: $OUT is not empty"; exit 2; }
F=tools/integration/fixtures/fpc177
PY=${FPC177_PY:-/srv/pokebench/vendor/mgba-venv/bin/python}
fail=0
check() { if cmp -s "$1" "$2"; then echo "SAME $3"; else echo "DIFF $3"; fail=1; fi; }
python3 tools/integration/fpc177Stage.py "$OUT/stage/scenarios" > /dev/null
diff -r "$F/scenarios" "$OUT/stage/scenarios" > /dev/null && echo "SAME scenarios" || { echo "DIFF scenarios"; fail=1; }
check "$F/scenario-index.json" "$OUT/stage/scenario-index.json" scenario-index
mkdir -p "$OUT/probes/r1" "$OUT/probes/r2"
for r in r1 r2; do
  for f in "$F"/scenarios/*.json; do
    o="$OUT/probes/$r/$(basename "$f")"
    python3 tools/run-mgba-probe.py "$o" -- "$PY" tools/integration/fpc177Probe.py "$f" "$o" > /dev/null 2>&1 || { rm -f "$o"; python3 tools/run-mgba-probe.py "$o" -- "$PY" tools/integration/fpc177Probe.py "$f" "$o" > /dev/null 2>&1; }
    rm -f "$o.log"
  done
done
n=0; same=0
for f in "$OUT/probes/r1"/*.json; do n=$((n + 1)); cmp -s "$f" "$OUT/probes/r2/$(basename "$f")" && same=$((same + 1)); done
echo "probes: $same / $n r1 == r2"; [ "$same" -eq "$n" ] || fail=1
python3 tools/integration/fpc177Rom.py "$OUT/probes/r1" "$F/scenario-index.json" "$OUT/rom-r1.json" > /dev/null
python3 tools/integration/fpc177Rom.py "$OUT/probes/r2" "$F/scenario-index.json" "$OUT/rom-r2.json" > /dev/null
check "$OUT/rom-r1.json" "$OUT/rom-r2.json" "rom r2 == r1"
[ ! -f "$F/receipts/rom-r1.json" ] || check "$F/receipts/rom-r1.json" "$OUT/rom-r1.json" "rom-r1.json"
python3 - "$OUT" <<'PYEOF'
import hashlib, json, os, sys
out = sys.argv[1]
rec = {"schema": "fpc177-probe-sha256/v1", "probes": {}}
for k in sorted(os.listdir(os.path.join(out, "probes", "r1"))):
    rec["probes"][k] = {r: hashlib.sha256(open(os.path.join(out, "probes", r, k), "rb").read()).hexdigest() for r in ("r1", "r2")}
json.dump(rec, open(os.path.join(out, "probe-sha256.json"), "w"), indent=1)
PYEOF
[ "$fail" -eq 0 ] && echo "fpc177Run: OK" || { echo "fpc177Run: FAIL"; exit 1; }
