#!/bin/sh
# prep27 Endeavor dense body probes (direct mGBA, Scene ON, fresh process each).  usage (workspace root): OUT=/tmp/p27/e1 sh tools/integration/prep27EndeavorProbes.sh
# 4 scenarios: 2 species pairs (DIGLETT->CHANSEY, ABRA->BLISSEY) x 2 attacker sides; probe = tools/compare/sweetScentProbe.py with the Move_ENDEAVOR env of the accepted dense corpora.
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
export POKEBENCH_ANIM_PROBE_MOVE_ID=283 POKEBENCH_ANIM_PROBE_MOVE_NAME=Move_ENDEAVOR POKEBENCH_ANIM_PROBE_END_NAME=Move_ERUPTION POKEBENCH_ANIM_PROBE_SCHEMA=endeavor-dense-evidence/v1
OUT=${OUT:-/tmp/p27/e1}; mkdir -p $OUT
for s in player-diglett-chansey opponent-diglett-chansey player-abra-blissey opponent-abra-blissey; do rm -rf $OUT/$s-rgb
  ( $PY tools/compare/sweetScentProbe.py tools/battle-lab/prep27-endeavor-$s.json $OUT/$s.json $OUT/$s-rgb >/dev/null 2>&1 || true ) & done; wait
ls $OUT/*.json | wc -l
