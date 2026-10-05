#!/bin/sh
# prep8: order + activation probes for the derived first-body scenarios (prep8Scenarios.py). Run from workspace root.
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
FX=tools/integration/fixtures; S=$FX/prep8-scenarios
cat <<J | xargs -P 3 -L 1 sh -c '$0 tools/compare/spriteOrderEventProbe.py $1 $2 '$FX'/prep8-raw/$3.json > /dev/null 2>&1' $PY
62 $S/mechanic-aurora-beam-player-seadra-opponent-onix-firstbody.json aurora-beam-fb-player
62 $S/mechanic-aurora-beam-opponent-seadra-player-onix-firstbody.json aurora-beam-fb-opponent
32 $S/mechanic-horn-drill-player-seaking-opponent-onix-firstbody.json horn-drill-fb-player
32 $S/mechanic-horn-drill-opponent-seaking-player-onix-firstbody.json horn-drill-fb-opponent
254 $S/mechanic-stockpile-player-pelipper-opponent-delcatty-firstbody.json stockpile-fb-player
254 $S/mechanic-stockpile-opponent-pelipper-player-delcatty-firstbody.json stockpile-fb-opponent
J
for f in $S/*.json; do n=$(basename $f .json); $PY tools/integration/issue142ActivationProbe.py $f $FX/prep8-activation/$n.json > /dev/null 2>&1; done
