#!/bin/sh
# prep13: prep13Probe.py (direct mGBA, Scene ON, fresh process each) over the accepted + alternate scenarios of Ice Beam / Water Spout / Hidden Power / Hyper Beam.
# usage (workspace root): sh tools/integration/prep13Probes.sh <runTag> [filter]   -> /tmp/prep13-probes/<runTag>/<scenario>.json (raw, not committed)
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py
export PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
RUN=${1:-r1}; FILT=${2:-}
export FX=/tmp/prep13-probes/$RUN; mkdir -p $FX
ls tools/battle-lab/mechanic-*.json tools/battle-lab/prep13-*.json | grep -E "mechanic-(ice-beam|water-spout|hidden-power|hyper-beam)-(player|opponent)-|prep13-" | grep -F -- "$FILT" \
 | xargs -P ${JOBS:-9} -n 1 sh -c '$PY tools/integration/prep13Probe.py "$0" "$FX/$(basename $0)" > /dev/null 2>&1'
ls $FX | wc -l
