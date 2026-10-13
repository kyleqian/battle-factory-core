#!/bin/sh
# stq132Job.sh <outdir> <scenario.json> [dump-dir]   (run from a workspace/ checkout; one stq132Probe.py job in a fresh direct mGBA process)
# A crashed job (exit 138 / 139 without valid JSON) reruns once. The optional dump dir receives the window frames (STQ132_DUMP).
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
o="$1/$(basename "$2" .json).json"
if [ -n "$3" ]; then export STQ132_DUMP="$3"; fi
python3 tools/run-mgba-probe.py "$o" -- "$PY" tools/integration/stq132Probe.py "$2" "$o" > /dev/null 2>&1 || { rm -f "$o"; python3 tools/run-mgba-probe.py "$o" -- "$PY" tools/integration/stq132Probe.py "$2" "$o" > /dev/null 2>&1; }
rm -f "$o.log"
