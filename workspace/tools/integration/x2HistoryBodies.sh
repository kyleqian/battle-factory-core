#!/bin/sh
# x2-history #148: per-frame battler x2/y2 across every body of the ONIX-paired mechanic lab scenarios (prep11Probe.py, PREP11_ALWAYS=1, direct mGBA, fresh process each).
# env: SCEN_DIR (default tools/battle-lab; x2HistoryOnixPairs.py output for the ONIX-vs-ONIX copies), BODIES_TAG (raw dir name under /tmp/x2h)
# usage (workspace root): sh tools/integration/x2HistoryBodies.sh <runTag> [filterSubstring]    raw: /tmp/x2h/bodies/<runTag>/<scenario>.json
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python PREP11_ALWAYS=1
RUN=${1:-r1}; FILT=${2:-}; export FX=/tmp/x2h/${BODIES_TAG:-bodies}/$RUN; mkdir -p $FX
D=${SCEN_DIR:-tools/battle-lab}; ls $D/mechanic-*-player-*-opponent-onix.json $D/mechanic-*-opponent-*-player-onix.json | grep -F -- "$FILT" \
 | xargs -P 8 -n 1 sh -c 'python3 tools/run-mgba-probe.py $FX/$(basename $0) -- $PY tools/integration/prep11Probe.py $0 $FX/$(basename $0) >/dev/null 2>&1'
ls $FX | wc -l
