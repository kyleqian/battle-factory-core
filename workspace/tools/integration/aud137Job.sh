#!/bin/sh
# aud137Job.sh <outdir> <scenario.json> [dump-dir]   (run from a workspace/ checkout; one aud137Probe.py job in a fresh direct mGBA process)
# stq132Job.sh's shape: a crashed job (exit 138 / 139 without valid JSON) reruns once; the optional dump dir receives the window frames.
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
o="$1/$(basename "$2" .json).json"
if [ -n "$3" ]; then export STQ132_DUMP="$3"; fi
python3 tools/run-mgba-probe.py "$o" -- "$PY" tools/integration/aud137Probe.py "$2" "$o" > /dev/null 2>&1 || { rm -f "$o"; python3 tools/run-mgba-probe.py "$o" -- "$PY" tools/integration/aud137Probe.py "$2" "$o" > /dev/null 2>&1; }
rm -f "$o.log"
