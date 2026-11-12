#!/bin/sh
# Census activation probes (direct mGBA, Scene ON, one fresh run per scenario; no shared oracle). Run from workspace root.
# usage: censusActivation.sh [scenario-name ...]   (default: the first recommended batch's scenarios)
export PYTHONPATH=${POKEBENCH_VENDOR_DIR:-../../vendor}/libmgba-py
PY=${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python
OUT=tools/integration/fixtures/census-activation
mkdir -p $OUT
if [ $# -eq 0 ]; then set -- aerial-ace-pidgeotto-onix aerial-ace-player-pidgeotto-onix quick-attack-pidgeotto-onix quick-attack-player-pidgeotto-onix \
 feather-dance-pidgeotto-onix feather-dance-player-pidgeotto-onix fake-tears-opponent-delcatty-player-shuckle fake-tears-player-delcatty-opponent-shuckle \
 sleep-talk-opponent-seaking-player-onix sleep-talk-player-seaking-opponent-onix \
 magnitude-intense-opponent-camerupt-player-onix magnitude-intense-player-camerupt-opponent-onix magnitude-regular-opponent-graveler-player-onix magnitude-regular-player-graveler-opponent-onix \
 reversal-player-delcatty-opponent-vigoroth reversal-player-vigoroth-opponent-delcatty spark-opponent-minun-player-shuckle spark-player-minun-opponent-shuckle endeavor-fail endeavor-success; fi
printf '%s\n' "$@" | xargs -P 4 -n 1 sh -c 'n=$0; '"$PY"' tools/integration/issue142ActivationProbe.py tools/battle-lab/mechanic-$n.json '"$OUT"'/mechanic-$n.json > /dev/null 2>&1'
