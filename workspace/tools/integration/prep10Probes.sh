#!/bin/sh
# prep10: run prep10Probe.py (direct mGBA, fresh process each) over the BattleLab scenarios of the prep10 moves.
# usage (workspace root): sh tools/integration/prep10Probes.sh <runTag> [filterSubstring]   outputs: tools/integration/fixtures/prep10-probes/<runTag>/<scenario>.json
export PYTHONPATH=${POKEBENCH_VENDOR_DIR:-../../vendor}/libmgba-py
export PY=${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python
RUN=${1:-r1}; FILT=${2:-}
export FX=tools/integration/fixtures/prep10-probes/$RUN; mkdir -p $FX
ls tools/battle-lab/mechanic-*.json tools/integration/fixtures/prep10-scenarios/*.json 2>/dev/null | grep -E "magnitude|reversal|flail|pain-split|spark|fire-punch|endeavor|rock-blast|razor-wind" | grep -F -- "$FILT" \
 | xargs -P 8 -n 1 sh -c '$PY tools/integration/prep10Probe.py "$0" "$FX/$(basename $0)" > /dev/null 2>&1'
ls $FX | wc -l
