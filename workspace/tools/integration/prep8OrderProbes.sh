#!/bin/sh
# prep8: direct-mGBA per-frame sSpriteOrder probes (tools/compare/spriteOrderEventProbe.py, Scene ON, fresh run each) + one activation probe
# (issue142ActivationProbe.py) per accepted allocator-plan-v2 lab scenario (the 24 scenarios of affineTaskBatch.py MOVES, minus Razor Wind/Rock Blast), both orientations.
# Run from workspace root. Raw per-frame rows stay local (fixtures/prep8-raw is gitignored-by-policy: not committed), receipts in prep8-activation/.
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
FX=tools/integration/fixtures
L=tools/battle-lab/mechanic-; T=tools/compare/fixtures
mkdir -p $FX/prep8-raw $FX/prep8-activation
cat <<J | xargs -P 4 -L 1 sh -c '$0 tools/compare/spriteOrderEventProbe.py $1 $2 '$FX'/prep8-raw/$3.json > /dev/null 2>&1' $PY
62 ${L}aurora-beam-player-seadra-opponent-onix.json aurora-beam-player
62 ${L}aurora-beam-opponent-seadra-player-onix.json aurora-beam-opponent
218 ${L}frustration-player-furret-opponent-onix.json frustration-player
218 ${L}frustration-opponent-furret-player-onix.json frustration-opponent
32 ${L}horn-drill-player-seaking-opponent-onix.json horn-drill-player
32 ${L}horn-drill-opponent-seaking-player-onix.json horn-drill-opponent
69 ${L}seismic-toss-player-kecleon-opponent-onix.json seismic-toss-player
69 ${L}seismic-toss-opponent-kecleon-player-onix.json seismic-toss-opponent
254 ${L}stockpile-player-pelipper-opponent-delcatty.json stockpile-player
254 ${L}stockpile-opponent-pelipper-player-delcatty.json stockpile-opponent
129 ${L}swift-player-staryu-opponent-onix.json swift-player
129 ${L}swift-opponent-staryu-player-onix.json swift-opponent
85 ${L}thunderbolt-player-delcatty-opponent-shuckle.json thunderbolt-player
85 ${L}thunderbolt-opponent-delcatty-player-shuckle.json thunderbolt-opponent
271 $T/trick-player-furret-opponent-chansey.json trick-player
271 $T/trick-opponent-furret-player-chansey.json trick-opponent
253 ${L}uproar-player-vigoroth-opponent-onix.json uproar-player
253 ${L}uproar-opponent-vigoroth-player-onix.json uproar-opponent
192 ${L}zap-cannon-player-forretress-opponent-shuckle.json zap-cannon-player
192 ${L}zap-cannon-opponent-forretress-player-shuckle.json zap-cannon-opponent
J
for f in ${L}aurora-beam-player-seadra-opponent-onix ${L}aurora-beam-opponent-seadra-player-onix ${L}frustration-player-furret-opponent-onix ${L}frustration-opponent-furret-player-onix ${L}horn-drill-player-seaking-opponent-onix ${L}horn-drill-opponent-seaking-player-onix ${L}seismic-toss-player-kecleon-opponent-onix ${L}seismic-toss-opponent-kecleon-player-onix ${L}stockpile-player-pelipper-opponent-delcatty ${L}stockpile-opponent-pelipper-player-delcatty ${L}swift-player-staryu-opponent-onix ${L}swift-opponent-staryu-player-onix ${L}thunderbolt-player-delcatty-opponent-shuckle ${L}thunderbolt-opponent-delcatty-player-shuckle $T/trick-player-furret-opponent-chansey $T/trick-opponent-furret-player-chansey ${L}uproar-player-vigoroth-opponent-onix ${L}uproar-opponent-vigoroth-player-onix ${L}zap-cannon-player-forretress-opponent-shuckle ${L}zap-cannon-opponent-forretress-player-shuckle; do
  n=$(basename $f); $PY tools/integration/issue142ActivationProbe.py $f.json $FX/prep8-activation/$n.json > /dev/null 2>&1 &
done; wait
ls $FX/prep8-raw $FX/prep8-activation
