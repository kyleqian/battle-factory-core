#!/bin/sh
# prep11: run prep11Probe.py (direct mGBA, fresh process each) over BattleLab scenarios of the prep11 moves.
# usage (workspace root): sh tools/integration/prep11Probes.sh <runTag> [filterSubstring]   outputs: tools/integration/fixtures/prep11-probes/<runTag>/<scenario>.json (raw, not committed)
export PYTHONPATH=${POKEBENCH_VENDOR_DIR:-../../vendor}/libmgba-py
export PY=${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python
RUN=${1:-r1}; FILT=${2:-}
export FX=/tmp/prep11-probes/$RUN; mkdir -p $FX
ls tools/battle-lab/mechanic-*.json tools/battle-lab/prep11-*.json 2>/dev/null | grep -v "leaf-blade" | grep -E "mechanic-roar|mechanic-factory-ai-roar|whirlwind|baton-pass-(player|opponent)|leech-seed|tri-attack-(player|opponent)|destiny-bond-(player|opponent)|recycle-(player|opponent)|petal-dance|rollout-(player|opponent)|air-cutter|foresight-(player|opponent)|sky-uppercut|spider-web|mechanic-fly-|bounce-(player|spoink)|prep11-" | grep -F -- "$FILT" \
 | xargs -P 8 -n 1 sh -c '$PY tools/integration/prep11Probe.py "$0" "$FX/$(basename $0)" > /dev/null 2>&1'
ls $FX | wc -l
