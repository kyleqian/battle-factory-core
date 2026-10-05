#!/bin/sh
# prep10: staged-route probes (fire-punch / endeavor, both attacker sides), two fresh runs each.  usage (workspace root): sh tools/integration/prep10StageProbes.sh <runTag>
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
D=tools/integration/fixtures/prep10-probes/stage-${1:-r1}; mkdir -p $D
for m in fire-punch endeavor; do for s in player opponent; do $PY tools/integration/prep10StageProbe.py $D/$m-$s.json $s $m > /dev/null 2>&1 & done; done; wait
ls $D | wc -l
