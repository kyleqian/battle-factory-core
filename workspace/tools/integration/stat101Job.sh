#!/bin/sh
# stat101Job.sh <outdir> <on|off> <scenario.json>   (run from an archive copy's workspace/; STAT101_PY = the mGBA venv python)
# One stat101Probe.py job in a fresh direct mGBA process; a crashed job (exit 138 / 139 without valid JSON) reruns once.
o=$1/$(basename "$3" .json)-$2.json
python3 tools/run-mgba-probe.py "$o" -- "$STAT101_PY" tools/integration/stat101Probe.py "$3" "$2" "$o" > /dev/null 2>&1 || { rm -f "$o"; python3 tools/run-mgba-probe.py "$o" -- "$STAT101_PY" tools/integration/stat101Probe.py "$3" "$2" "$o" > /dev/null 2>&1; }
rm -f "$o.log"
