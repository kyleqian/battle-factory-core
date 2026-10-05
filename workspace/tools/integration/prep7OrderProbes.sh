#!/bin/sh
# prep7: direct-mGBA per-frame sSpriteOrder probes (tools/compare/spriteOrderEventProbe.py, Scene ON, fresh run each) for the four order consumers, both orientations,
# and one activation probe (issue142ActivationProbe.py) per derived scenario. Run from workspace root. Raw rows stay local (prep7-raw is gitignored by size: see doc), receipts in prep7-activation/.
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
FX=tools/integration/fixtures
L=tools/battle-lab; S=$FX/prep7-scenarios
mkdir -p $FX/prep7-raw $FX/prep7-activation
cat <<J | xargs -P 4 -L 1 sh -c '$0 tools/compare/spriteOrderEventProbe.py $1 $2 '$FX'/prep7-raw/$1-$3.json > /dev/null 2>&1' $PY
349 $L/mechanic-dragon-dance-player-dragonair-opponent-onix.json dd-player
349 $L/mechanic-dragon-dance-opponent-dragonair-player-onix.json dd-opponent
126 $L/mechanic-fire-blast-player-octillery-opponent-onix.json fb-player
126 $S/mechanic-fire-blast-player-dragonair-onix.json fb1-player
126 $S/mechanic-fire-blast-opponent-dragonair-onix.json fb1-opponent
104 $S/mechanic-double-team-player-dragonair-onix.json dt-player
104 $S/mechanic-double-team-opponent-dragonair-onix.json dt-opponent
157 $S/mechanic-rock-slide-player-dragonair-onix.json rs-player
157 $S/mechanic-rock-slide-opponent-dragonair-onix.json rs-opponent
8 $S/mechanic-ice-punch-player-dragonair-onix.json ip-player
8 $S/mechanic-ice-punch-opponent-dragonair-onix.json ip-opponent
J
for f in $S/*.json; do n=$(basename $f .json); $PY tools/integration/issue142ActivationProbe.py $f $FX/prep7-activation/$n.json > /dev/null 2>&1 & done; wait
ls $FX/prep7-raw $FX/prep7-activation
