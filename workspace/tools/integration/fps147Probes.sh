#!/bin/sh
# fps147Probes.sh <out-dir> [<scenario-dir>]   (run from workspace/; docs/fps147-focus-punch-setup.md; default: the committed scenarios)
# Direct mGBA only (fps147Probe.py), Scene ON, the staged scenarios (fixtures/fps147/scenarios), every scenario twice in fresh processes:
# r1 (with the raw window dump) then r2 (no dump); a crashed job (teardown only accepted by run-mgba-probe.py) reruns once.
# Writes <out-dir>/probes/r{1,2}/<stem>.json, <out-dir>/dump/<stem>.rgb, <out-dir>/done ("probes r1 == r2: n / t").
set -eu
OUT=$1
SCEN=${2:-tools/integration/fixtures/fps147/scenarios}
mkdir -p "$OUT/probes/r1" "$OUT/probes/r2" "$OUT/dump"
PY=${MGBA_PY:-/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python}
job() {
  o=$1/$(basename "$2")
  python3 tools/run-mgba-probe.py "$o" -- "$PY" tools/integration/fps147Probe.py "$2" "$o" > /dev/null 2>&1 \
    || { rm -f "$o"; python3 tools/run-mgba-probe.py "$o" -- "$PY" tools/integration/fps147Probe.py "$2" "$o" > /dev/null 2>&1; }
  rm -f "$o.log"
}
for f in "$SCEN"/*.json; do FPS147_DUMP="$OUT/dump" job "$OUT/probes/r1" "$f" & done
wait
for f in "$SCEN"/*.json; do job "$OUT/probes/r2" "$f" & done
wait
n=0; t=0
for f in "$OUT"/probes/r1/*.json; do t=$((t + 1)); cmp -s "$f" "$OUT/probes/r2/$(basename "$f")" && n=$((n + 1)); done
echo "probes r1 == r2: $n / $t" > "$OUT/done"
cat "$OUT/done"
