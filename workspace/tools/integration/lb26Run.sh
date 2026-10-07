#!/bin/sh
# lb26 full reproduction (workspace root; direct mGBA only). usage: lb26Run.sh <outDir>   -> <outDir>/{curse,oam}-receipt.json
# Needs a clean src for the Curse half; applies/reverts the temporary firstBody bypass for Will-O-Wisp / Pursuit (tracked-file edit, reverted below).
set -e
O=${1:?outDir}; mkdir -p $O; export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
FX=tools/integration/fixtures/later-bodies-lb26
python3 tools/integration/lb26Scenarios.py
T=$(ls tools/battle-lab/lb26-*.json | xargs -n1 basename | sed 's/lb26-//;s/.json//')
for r in a b; do echo "$T" | xargs -P ${JOBS:-8} -n 1 sh -c 'sh tools/integration/lb26Probe.sh '$O'/'$r' $0'; done
mkdir -p $O/h; echo "$T" | xargs -P ${JOBS:-8} -n 1 sh -c 'python3 tools/run-mgba-probe.py '$O'/h/$0.json -- $PY tools/integration/bgHistoryProbe.py tools/battle-lab/lb26-$0.json '$O'/h/$0.json >/dev/null 2>&1'
python3 tools/integration/lb26Fixtures.py $O/a $O/h >/dev/null     # regenerates the fixtures (must be byte-identical to the committed ones)
git diff --exit-code -- $FX
CF=$(ls $FX | grep '^curse' | sed 's/.json//'); OF=$(ls $FX | grep -E '^(wisp|pursuit)' | sed 's/.json//')
for p in p1 p2; do sed "s|/tmp/lb26/dense|$O/dense|" tools/integration/lb26Dense.sh > $O/dense.sh; sh $O/dense.sh $p $CF; done
python3 tools/integration/lb26Receipt.py $O/dense/p1 $O/dense/p2 $O/a $O/b $O/curse-receipt.json curse
git apply $FX/lb26-temp-bypass.patch          # TEMPORARY
trap 'git checkout src' EXIT
for p in p1 p2; do sh $O/dense.sh $p $OF; done
python3 tools/integration/lb26Receipt.py $O/dense/p1 $O/dense/p2 $O/a $O/b $O/oam-receipt.json wisp pursuit
