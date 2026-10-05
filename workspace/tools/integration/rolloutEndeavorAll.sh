#!/bin/sh
# usage (workspace root): sh tools/integration/rolloutEndeavorAll.sh <runTag>   -> tools/integration/fixtures/rollout-endeavor/probes/<runTag>/*.json  (all relied-on probes; compare two tags with cmp)
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py
export PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
RUN=${1:-r1}; export FX=tools/integration/fixtures/rollout-endeavor/probes/$RUN; mkdir -p $FX
{ ls tools/battle-lab/rollout-endeavor-*.json | while read s; do echo "$s $FX/$(basename $s)"; done
  echo "x $FX/staged-endeavor-player.json --stage=player:283:5"; echo "x $FX/staged-endeavor-opponent.json --stage=opponent:283:5"
  echo "tools/battle-lab/mechanic-endeavor-success.json $FX/mechanic-endeavor-success.json"; } \
 | xargs -P 6 -L 1 sh -c '$PY tools/integration/rolloutEndeavorProbe.py "$0" "$1" $2 > /dev/null 2>&1'
ls $FX | wc -l
