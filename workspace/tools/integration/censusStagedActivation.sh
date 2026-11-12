#!/bin/sh
# Staged (censusStageActivation.py boundary) activation probes for moves without a BattleLab scenario. Direct mGBA, Scene ON. Run from workspace root.
export PYTHONPATH=${POKEBENCH_VENDOR_DIR:-../../vendor}/libmgba-py
PY=${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python
D=tools/integration/fixtures/census-activation
for sm in "player rock-slide" "opponent rock-slide" "player endeavor" "opponent endeavor" "player ice-punch" "opponent ice-punch" "player fire-punch" "opponent fire-punch"; do
  set -- $sm
  $PY tools/integration/censusStageActivation.py $D/stage-$2-$1.json - $1 $2 > /dev/null 2>&1
done
