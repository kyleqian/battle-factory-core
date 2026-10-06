#!/bin/sh
# BG-register history bulk probe (direct mGBA, Scene ON, fresh process per scenario).
# usage (workspace root): sh tools/integration/bgHistoryRun.sh <runTag> <glob-prefix...>   raw: /tmp/bgh/<runTag>/<scenario>.json
# e.g. sh tools/integration/bgHistoryRun.sh r1 'mechanic-*' 'prep16-*' 'prep11-*'
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
RUN=$1; shift; export FX=/tmp/bgh/$RUN; mkdir -p $FX
for g in "$@"; do ls tools/battle-lab/$g.json 2>/dev/null; done | grep -v -- '-off.json$' | sort -u \
 | xargs -P ${JOBS:-8} -n 1 sh -c 'python3 tools/run-mgba-probe.py $FX/$(basename $0) -- $PY tools/integration/bgHistoryProbe.py $0 $FX/$(basename $0) >/dev/null 2>&1'
ls $FX/*.json | wc -l
