#!/bin/sh
# speciesAudit9: prep22Probe.py (direct mGBA, Scene ON, fresh process each) on the swapped scenarios of list rows x 2 fresh runs (r1, r2): the
# window, the measured CPU phase (body rows, monbg BGnCNT row) and the D3 rng2 are derived from each swapped scenario's OWN ROM state and must
# agree between the two runs. Cached (existing non-empty outputs are kept). usage: speciesAudit9Probes.sh <outDir> <list.tsv>...
cd "$(dirname "$0")/../.." || exit 1
PY=${MGBA_PY:-/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python}
export PYTHONPATH=${PYTHONPATH:-/Users/kyle/Developer/pokebench/vendor/libmgba-py} PY OUT=$1; shift; mkdir -p "$OUT"
cut -f3 "$@" | sort -u | while read s; do for r in 1 2; do echo "$s $r"; done; done | xargs -P ${JOBS:-10} -n 2 sh -c \
 'o="$OUT/$(basename "$0" .json)-r$1.json"; [ -s "$o" ] || python3 tools/run-mgba-probe.py "$o" -- $PY tools/integration/prep22Probe.py "$0" "$o" >/dev/null 2>&1 || echo "probe failed $o"'
ls "$OUT"/*-r[12].json | wc -l
