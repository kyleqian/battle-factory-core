#!/bin/sh
# lb26: direct-mGBA bodies probe of one lb26 scenario (fresh process). usage (workspace root): lb26Probe.sh <outRoot> <tag>   e.g. lb26Probe.sh /tmp/lb26/a curse-p-tackle
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
D=$1/$2; mkdir -p $D
case $2 in curse*) P=curseBodiesProbe;; wisp*) P=willOWispBodiesProbe;; pursuit*) P=pursuitBodiesProbe;; esac
python3 tools/run-mgba-probe.py $D/out.json -- $PY tools/compare/$P.py tools/battle-lab/lb26-$2.json $D/out.json $D/rgb >/dev/null 2>&1
rm -rf $D/rgb
