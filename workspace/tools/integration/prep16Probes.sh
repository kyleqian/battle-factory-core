#!/bin/sh
# prep16: run prep16Probe.py on every tools/battle-lab/prep16-*.json twice (fresh processes), compare.  usage (workspace root): sh tools/integration/prep16Probes.sh [OUTDIR]
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py
PY=${MGBA_PY:-/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python}
OUT=${1:-/tmp/p16}; mkdir -p "$OUT/r1" "$OUT/r2"
for f in tools/battle-lab/prep16-*.json; do k=$(basename $f .json); for r in r1 r2; do echo "$k $r"; done; done | xargs -P ${JOBS:-12} -n 2 sh -c \
 'python3 tools/run-mgba-probe.py "'$OUT'/$1/$0.json" -- '$PY' tools/integration/prep16Probe.py tools/battle-lab/$0.json "'$OUT'/$1/$0.json" >/dev/null 2>&1'
bad=0; for f in $OUT/r1/*.json; do cmp -s $f $OUT/r2/$(basename $f) || { echo "DIFF $f"; bad=1; }; done
[ $bad = 0 ] && echo "prep16 probes: r1 == r2 byte-identical ($(ls $OUT/r1/*.json | wc -l) scenarios)"
