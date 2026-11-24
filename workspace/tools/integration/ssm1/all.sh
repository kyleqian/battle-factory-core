#!/usr/bin/env bash
# usage: all.sh TAG -> rescore every Scene ON seed of t2k9/t2-on on the CURRENT src into ssm1/all-TAG, then the scoreboard
cd "$(dirname "$0")/../../.."
M=/srv/pokebench/pokeemerald-factory-core/workspace/.integration/evidence/t2k9/t2-on; D=.integration/evidence/ssm1/all-$1; mkdir -p $D
for f in $M/*-on.req.json; do s=$(basename $f -on.req.json); nice -n 10 tools/audio/aud249Rescore.sh $M $D $s on >/dev/null 2>$D/$s-on.err || echo FAIL $s; done
python3 tools/audio/soundScoreboard.py $D --out .integration/evidence/ssm1/score-$1.json 2>&1 | sed -n 1,12p | cut -c1-160
