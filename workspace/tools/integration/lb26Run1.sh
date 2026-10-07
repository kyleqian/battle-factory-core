#!/bin/sh
# lb26: probes (+ bgHistoryProbe body lists) for the tags given. usage: lb26Run1.sh <probeRoot> <tag> ...  (h = body lists in <probeRoot>/../h)
R=$1; shift; mkdir -p $R/../h
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
printf '%s\n' "$@" | xargs -P ${JOBS:-8} -n 1 sh -c 'sh tools/integration/lb26Probe.sh '$R' $0'
