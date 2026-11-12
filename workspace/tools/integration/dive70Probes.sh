#!/bin/sh
# dive70: fresh direct-mGBA prep22Probe.py runs (bodies, activation state incl. sSpriteOrder, rng2Series) of Dive scenarios, REPS fresh
# processes each, in parallel (workspace root; never the HTTP oracles). usage: dive70Probes.sh OUTDIR REPS scenario.json...
# Output: OUTDIR/<scenario basename>-r<k>.json
PY=${MGBA_PY:-${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python}
export PYTHONPATH=${PYTHONPATH:-${POKEBENCH_VENDOR_DIR:-../../vendor}/libmgba-py}
OUT=$1; REPS=$2; shift 2; mkdir -p "$OUT"
for s in "$@"; do k=$(basename "$s" .json); rm -f "$OUT/$k"-r*.json "$OUT/$k"-r*.json.log; done
for s in "$@"; do r=1; while [ $r -le $REPS ]; do echo "$s $r"; r=$((r+1)); done; done | xargs -P ${JOBS:-8} -n 2 sh -c \
 'k=$(basename "$0" .json); python3 tools/run-mgba-probe.py "'$OUT'/$k-r$1.json" -- '$PY' tools/integration/prep22Probe.py "$0" "'$OUT'/$k-r$1.json" >/dev/null 2>&1; exit 0'
