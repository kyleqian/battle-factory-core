#!/bin/sh
# spark62: run spark62Probe.py (direct mGBA, fresh process each) over the spark62 lab scenarios (explicit lab seed 12, ISSUES #154).
# usage (workspace root): sh tools/integration/spark62Probes.sh <runTag>   outputs: tools/integration/fixtures/spark62-probes/<runTag>/<scenario>.json
export PYTHONPATH=${POKEBENCH_VENDOR_DIR:-../../vendor}/libmgba-py
export PY=${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python
RUN=${1:-r1}
export FX=tools/integration/fixtures/spark62-probes/$RUN; mkdir -p $FX
ls tools/integration/fixtures/spark62-scenarios/*.json | xargs -P 8 -n 1 sh -c '$PY tools/integration/spark62Probe.py "$0" "$FX/$(basename $0)" > /dev/null 2>&1'
ls $FX | wc -l
