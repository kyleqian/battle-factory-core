#!/bin/sh
# Runs issue142ActivationProbe.py on the 20 accepted scenarios of the prep5 moves (4 parallel fresh mGBA). Run from workspace root.
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
OUT=tools/integration/fixtures/prep5-activation
printf '%s\n' heal-bell-player-chimecho-opponent-onix heal-bell-opponent-chimecho-player-onix mist-ball-player-latias-opponent-registeel mist-ball-opponent-latias-player-registeel \
 aromatherapy-player-vileplume-opponent-onix aromatherapy-opponent-vileplume-player-onix perish-song-player-murkrow-opponent-onix perish-song-opponent-murkrow-player-onix \
 dragon-rage-charmeleon-onix dragon-rage-onix-charmeleon follow-me-player-togetic-opponent-onix follow-me-opponent-togetic-player-onix taunt-player-murkrow-opponent-shuckle taunt-opponent-murkrow-player-shuckle \
 metronome-player-chansey-opponent-onix metronome-opponent-chansey-player-onix leaf-blade-player-sceptile-opponent-onix leaf-blade-opponent-sceptile-player-onix belly-drum-player-poliwrath-opponent-onix belly-drum-opponent-poliwrath-player-onix |
 xargs -P 4 -n 1 sh -c 'n=$0; '"$PY"' tools/integration/issue142ActivationProbe.py tools/battle-lab/mechanic-$n.json '"$OUT"'/mechanic-$n.json > '"$OUT"'/$n.log 2>&1'
