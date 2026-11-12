#!/bin/sh
# prep22: run prep22Probe.py on scenarios (tools/battle-lab/<key>.json) x REPS fresh processes in parallel (workspace root). usage: prep22Probes.sh OUTDIR REPS key...
PY=${MGBA_PY:-${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python}
export PYTHONPATH=${PYTHONPATH:-${POKEBENCH_VENDOR_DIR:-../../vendor}/libmgba-py}
OUT=$1; REPS=$2; shift 2; mkdir -p "$OUT"
# tools/run-mgba-probe.py refuses to overwrite an existing output (silently, stderr is discarded below): clear stale outputs first
for k in "$@"; do rm -f "$OUT/$k"-r*.json "$OUT/$k"-r*.json.log; done
for k in "$@"; do r=1; while [ $r -le $REPS ]; do echo "$k $r"; r=$((r+1)); done; done | xargs -P ${JOBS:-8} -n 2 sh -c \
 'python3 tools/run-mgba-probe.py "'$OUT'/$0-r$1.json" -- '$PY' tools/integration/prep22Probe.py tools/battle-lab/$0.json "'$OUT'/$0-r$1.json" >/dev/null 2>&1'
