#!/bin/sh
# adp1 window probes (run from workspace/): direct mGBA only (never the shared HTTP oracles); trf174Probe.py records every frame.
# usage: OUT=<fresh dir> sh tools/integration/adp1Probes.sh [scenario-basename ...]
set -e
[ -n "$OUT" ] || { echo "OUT=<dir> required"; exit 2; }
export PYTHONPATH=${POKEBENCH_VENDOR_DIR:-/srv/pokebench/vendor}/libmgba-py PY=${POKEBENCH_VENDOR_DIR:-/srv/pokebench/vendor}/mgba-venv/bin/python
mkdir -p "$OUT"
ALL="adp1-withdraw-opponent adp1-rock-smash-player adp1-rock-smash-opponent adp1-beat-up-player adp1-beat-up-opponent"
set -- ${*:-$ALL}
for s in "$@"; do
  ( python3 tools/run-mgba-probe.py "$OUT/$s.json" -- $PY tools/integration/trf174Probe.py tools/battle-lab/$s.json "$OUT/$s.json" "$OUT/$s-rgb" > "$OUT/$s.out" 2>&1 || echo "FAIL $s" ) &
done
wait
ls "$OUT"/*.json
