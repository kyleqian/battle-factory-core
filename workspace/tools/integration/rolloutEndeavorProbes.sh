#!/bin/sh
# usage (workspace root): sh tools/integration/rolloutEndeavorProbes.sh <runTag> [--nosentinel] -- scenario.json...
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
RUN=$1; shift; EXTRA=""; [ "$1" = "--nosentinel" ] && { EXTRA=--nosentinel; shift; }
FX=tools/integration/fixtures/rollout-endeavor/probes/$RUN; mkdir -p $FX
for s in "$@"; do $PY tools/integration/rolloutEndeavorProbe.py "$s" "$FX/$(basename $s)" $EXTRA >/dev/null 2>&1; done
ls $FX
