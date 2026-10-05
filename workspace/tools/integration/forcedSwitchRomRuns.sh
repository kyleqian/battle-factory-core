#!/bin/sh
# usage (workspace root): sh tools/integration/forcedSwitchRomRuns.sh <runTag>  -> /tmp/fs/<runTag>/<scenario>.json (raw, uncommitted)
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
export FS=/tmp/fs/${1:-r1}; mkdir -p $FS
for s in mechanic-roar-player-houndour-opponent-onix mechanic-roar-opponent-houndour-player-onix prep11-roar-alt-vaporeon mechanic-whirlwind-player-butterfree-opponent-onix mechanic-whirlwind-opponent-butterfree-player-onix prep11-whirlwind-alt-beautifly; do echo $s; done \
 | xargs -P 6 -I{} sh -c '$PY tools/integration/forcedSwitchRomProbe.py tools/battle-lab/{}.json $FS/{}.json > /dev/null 2>&1'
ls $FS | wc -l
