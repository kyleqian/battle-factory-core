#!/bin/sh
# trn176 runner (docs/trn176-action-transition.md). Run from workspace/; direct mGBA only (never the shared HTTP oracles); sequential.
#   sh tools/integration/trn176Run.sh <fresh-out-dir>
# 1. re-stage the scenarios (must equal the committed ones and scenario-index.json);
# 2. probes: scenarios x Scene OFF x {r1, r2} (idle94Probe.py), r1 == r2 byte for byte (and == receipts/probe-sha256.json if present);
# 3. off148Rom.py r1 == receipts/rom-r1.json, r2 == r1.
set -eu
OUT=${1:?usage: trn176Run.sh <fresh-out-dir>}
W=$(pwd)
[ -f "$W/tools/integration/trn176Run.sh" ] || { echo "run from workspace/"; exit 2; }
mkdir -p "$OUT"
[ -z "$(ls -A "$OUT")" ] || { echo "refusing: $OUT is not empty"; exit 2; }
F=tools/integration/fixtures/trn176
PY=${TRN176_PY:-/srv/pokebench/vendor/mgba-venv/bin/python}
fail=0
check() { if cmp -s "$1" "$2"; then echo "SAME $3"; else echo "DIFF $3"; fail=1; fi; }
python3 tools/integration/trn176Stage.py "$OUT/stage/scenarios" > /dev/null
diff -r "$F/scenarios" "$OUT/stage/scenarios" > /dev/null && echo "SAME scenarios" || { echo "DIFF scenarios"; fail=1; }
check "$F/scenario-index.json" "$OUT/stage/scenario-index.json" scenario-index
mkdir -p "$OUT/probes/r1" "$OUT/probes/r2"
for r in r1 r2; do
  for f in "$F"/scenarios/*.json; do
    o="$OUT/probes/$r/$(basename "$f" .json)-off.json"
    python3 tools/run-mgba-probe.py "$o" -- "$PY" tools/integration/idle94Probe.py "$f" off "$o" > /dev/null 2>&1 || { rm -f "$o"; python3 tools/run-mgba-probe.py "$o" -- "$PY" tools/integration/idle94Probe.py "$f" off "$o" > /dev/null 2>&1; }
    rm -f "$o.log"
  done
done
n=0; same=0
for f in "$OUT/probes/r1"/*.json; do n=$((n + 1)); cmp -s "$f" "$OUT/probes/r2/$(basename "$f")" && same=$((same + 1)); done
echo "probes: $same / $n r1 == r2"; [ "$same" -eq "$n" ] || fail=1
python3 tools/integration/off148Rom.py "$OUT/probes/r1" "$F/scenario-index.json" "$OUT/rom-r1.json" > /dev/null
python3 tools/integration/off148Rom.py "$OUT/probes/r2" "$F/scenario-index.json" "$OUT/rom-r2.json" > /dev/null
check "$OUT/rom-r1.json" "$OUT/rom-r2.json" "rom r2 == r1"
[ ! -f "$F/receipts/rom-r1.json" ] || check "$F/receipts/rom-r1.json" "$OUT/rom-r1.json" "rom-r1.json"
python3 - "$OUT" <<'PYEOF'
import hashlib, json, os, sys
out = sys.argv[1]
rec = {"schema": "trn176-probe-sha256/v1", "probes": {}}
for k in sorted(os.listdir(os.path.join(out, "probes", "r1"))):
    rec["probes"][k] = {r: hashlib.sha256(open(os.path.join(out, "probes", r, k), "rb").read()).hexdigest() for r in ("r1", "r2")}
json.dump(rec, open(os.path.join(out, "probe-sha256.json"), "w"), indent=1)
PYEOF
[ "$fail" -eq 0 ] && echo "trn176Run: OK" || { echo "trn176Run: FAIL"; exit 1; }
