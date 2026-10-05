#!/bin/sh
# Fresh direct-mGBA issue142ActivationProbe.py runs for the 28 accepted scenarios of the order-consumer moves (4 parallel). Run from workspace root.
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
OUT=tools/integration/fixtures/order-consumer-activation
printf '%s\n' ember-player-onix-opponent-murkrow ember-opponent-onix-player-murkrow flamethrower-player-onix-opponent-murkrow flamethrower-opponent-onix-player-murkrow \
 rock-throw-player-graveler-opponent-onix rock-throw-opponent-graveler-player-onix dragon-rage-charmeleon-onix dragon-rage-onix-charmeleon \
 heal-bell-player-chimecho-opponent-onix heal-bell-opponent-chimecho-player-onix perish-song-player-murkrow-opponent-onix perish-song-opponent-murkrow-player-onix \
 leaf-blade-player-sceptile-opponent-onix leaf-blade-opponent-sceptile-player-onix blaze-kick-player-onix-opponent-murkrow blaze-kick-opponent-onix-player-murkrow \
 mud-slap-player-pidgeotto-onix mud-slap-pidgeotto-onix sand-attack-player-pidgeotto-onix sand-attack-pidgeotto-onix grudge-player-haunter-opponent-onix grudge-opponent-haunter-player-onix \
 dive-player-chinchou-opponent-onix dive-opponent-chinchou-player-onix magnitude-regular-player-graveler-opponent-onix magnitude-regular-opponent-graveler-player-onix \
 magnitude-intense-player-camerupt-opponent-onix magnitude-intense-opponent-camerupt-player-onix |
 xargs -P 4 -n 1 sh -c 'n=$0; '"$PY"' tools/integration/issue142ActivationProbe.py tools/battle-lab/mechanic-$n.json '"$OUT"'/mechanic-$n.json > '"$OUT"'/$n.log 2>&1'
