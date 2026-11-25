#!/usr/bin/env bash
# usage: all.sh TAG [SEEDS...] -> rescore Scene OFF seeds of t2final-20261124 (default: all 24) on the CURRENT src into .integration/evidence/ihm1/all-TAG, then the scoreboard (TOTAL + per-seed lines)
cd "$(dirname "$0")/../../.."
M=/srv/pokebench/pokeemerald-factory-core/workspace/.integration/evidence/t2final-20261124; D=.integration/evidence/ihm1/all-$1; mkdir -p $D; shift
SEEDS=${*:-$(for f in $M/*-off.req.json; do basename $f -off.req.json; done)}
for s in $SEEDS; do nice -n 10 tools/audio/aud249Rescore.sh $M $D $s off >/dev/null 2>$D/$s-off.err || echo FAIL $s; done
python3 tools/audio/soundScoreboard.py $D 2>&1 | head -40 | cut -c1-170
