#!/bin/sh
# rst139Job.sh <outdir> <scenario.json> [dump-dir]   (run from a workspace/ checkout; one rst139Probe.py job in a fresh direct mGBA process)
# A crashed job (exit 138 / 139 without valid JSON) reruns once. The optional dump dir receives every frame (RST139_DUMP).
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
o="$1/$(basename "$2" .json).json"
if [ -n "${3:-}" ]; then export RST139_DUMP="$3"; fi
python3 tools/run-mgba-probe.py "$o" -- "$PY" tools/integration/rst139Probe.py "$2" "$o" > /dev/null 2>&1 || { rm -f "$o"; python3 tools/run-mgba-probe.py "$o" -- "$PY" tools/integration/rst139Probe.py "$2" "$o" > /dev/null 2>&1; }
rm -f "$o.log"
