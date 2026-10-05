#!/bin/sh
# Runs issue142ActivationProbe.py on the accepted scenarios of the prep6 moves (4 parallel fresh mGBA). Run from workspace root.
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
OUT=tools/integration/fixtures/prep6-activation
mkdir -p $OUT
printf '%s\n' self-destruct-player-sudowoodo-opponent-shuckle self-destruct-opponent-sudowoodo-player-shuckle rock-tomb-player-grimer-opponent-onix rock-tomb-opponent-grimer-player-onix \
 pain-split-player-misdreavus-opponent-gengar pain-split-opponent-misdreavus-player-gengar dragon-dance-player-dragonair-opponent-onix dragon-dance-opponent-dragonair-player-onix \
 safeguard-player-bayleef-opponent-onix safeguard-opponent-bayleef-player-onix sweet-scent-player-weepinbell-opponent-onix sweet-scent-opponent-weepinbell-player-onix \
 fire-blast-player-octillery-opponent-onix fire-blast-opponent-octillery-player-onix knock-off-shuppet-onix knock-off-opponent-shuppet-player-onix \
 swallow-player-pelipper-one-stockpile swallow-player-pelipper-two-stockpile swallow-player-pelipper-three-stockpile \
 swallow-opponent-pelipper-one-stockpile swallow-opponent-pelipper-two-stockpile swallow-opponent-pelipper-three-stockpile |
 xargs -P 4 -n 1 sh -c 'n=$0; '"$PY"' tools/integration/issue142ActivationProbe.py tools/battle-lab/mechanic-$n.json '"$OUT"'/mechanic-$n.json > /dev/null 2>&1'
