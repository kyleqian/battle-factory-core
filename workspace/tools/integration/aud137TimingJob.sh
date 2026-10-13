#!/bin/sh
# aud137TimingJob.sh <outdir> <scenario.json> [seed]   (run from a workspace/ checkout; one seg127Probe.py Scene ON job in a fresh direct
# mGBA process, seg127Run.sh's job shape: a crashed job reruns once; the optional seed overrides the scenario's lab seed: <stem>-s<seed>-on.json)
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
if [ -n "$3" ]; then
  o="$1/$(basename "$2" .json)-s$3-on.json"
  python3 tools/run-mgba-probe.py "$o" -- "$PY" tools/integration/seg127Probe.py "$2" on "$o" --seed "$3" > /dev/null 2>&1 || { rm -f "$o"; python3 tools/run-mgba-probe.py "$o" -- "$PY" tools/integration/seg127Probe.py "$2" on "$o" --seed "$3" > /dev/null 2>&1; }
else
  o="$1/$(basename "$2" .json)-on.json"
  python3 tools/run-mgba-probe.py "$o" -- "$PY" tools/integration/seg127Probe.py "$2" on "$o" > /dev/null 2>&1 || { rm -f "$o"; python3 tools/run-mgba-probe.py "$o" -- "$PY" tools/integration/seg127Probe.py "$2" on "$o" > /dev/null 2>&1; }
fi
rm -f "$o.log"
