#!/bin/sh
# S10A policy-gap probes: direct mGBA (never the shared HTTP oracles), Scene ON, two fresh runs (A, B) per scenario of both
# the per-frame sSpriteOrder probe (spriteOrderEventProbe.py) and the allocator call-stream probe (spriteOrderGapCallProbe.py).
# usage (from workspace/): OUT=/tmp/pgprobe sh tools/integration/spriteOrderPolicyGapsProbe.sh [name ...]
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
OUT=${OUT:-/tmp/pgprobe}; L=tools/battle-lab; S=tools/integration/fixtures/prep7-scenarios; G=tools/integration/fixtures/sprite-order-policy-gaps/scenarios
mkdir -p $OUT
LIST="104 $S/mechanic-double-team-player-dragonair-onix.json dt-player
104 $S/mechanic-double-team-opponent-dragonair-onix.json dt-opponent
313 $L/mechanic-fake-tears-player-delcatty-opponent-shuckle.json ft-player
313 $L/mechanic-fake-tears-opponent-delcatty-player-shuckle.json ft-opponent
297 $L/mechanic-feather-dance-player-pidgeotto-onix.json fd-player
297 $L/mechanic-feather-dance-pidgeotto-onix.json fd-opponent
283 $G/endeavor-player-diglett-opponent-chansey.json en-player
283 $G/endeavor-opponent-diglett-player-chansey.json en-opponent
313 $G/fake-tears-player-onix-opponent-tackle-pidgeotto.json ftb-player
313 $G/fake-tears-opponent-onix-player-tackle-pidgeotto.json ftb-opponent
313 $G/fake-tears-player-dragonair-opponent-tackle-chansey.json ftc-player
313 $G/fake-tears-opponent-dragonair-player-tackle-chansey.json ftc-opponent"
[ $# -gt 0 ] && LIST=$(echo "$LIST" | grep -E " ($(echo $* | tr ' ' '|'))\$")
for run in A B; do
  echo "$LIST" | xargs -P 4 -L 1 sh -c '$0 tools/compare/spriteOrderEventProbe.py $1 $2 '$OUT'/rows-$3-'$run'.json >/dev/null 2>&1' $PY
  echo "$LIST" | xargs -P 4 -L 1 sh -c '$0 tools/compare/spriteOrderGapCallProbe.py $2 '$OUT'/calls-$3-'$run'.json >/dev/null 2>&1' $PY
done
ls -la $OUT
