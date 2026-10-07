#!/bin/sh
# lb21: direct-mGBA bodies probe of one lb21 scenario (fresh process). usage (workspace root): lb21Probe.sh <runTag> <tag> [scenario-json]
# raw -> /tmp/lb21/<runTag>/<tag>/out.json (+ rgb dir); the probe is overheatBodiesProbe.py for oh-*, psychUpBodiesProbe.py for pu-*.
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
D=/tmp/lb21/$1/$2; mkdir -p $D; S=${3:-tools/battle-lab/lb21-$2.json}
case $2 in oh*) P=overheatBodiesProbe;; *) P=psychUpBodiesProbe;; esac
python3 tools/run-mgba-probe.py $D/out.json -- $PY tools/compare/$P.py $S $D/out.json $D/rgb >/dev/null 2>&1
