#!/bin/sh
# Staged (censusStageActivation.py boundary) activation probes for moves without a BattleLab scenario. Direct mGBA, Scene ON. Run from workspace root.
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
D=tools/integration/fixtures/census-activation
for sm in "player rock-slide" "opponent rock-slide" "player endeavor" "opponent endeavor"; do
  set -- $sm
  $PY tools/integration/censusStageActivation.py $D/stage-$2-$1.json - $1 $2 > /dev/null 2>&1
done
