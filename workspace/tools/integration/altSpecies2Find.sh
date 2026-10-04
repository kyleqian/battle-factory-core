#!/bin/sh
# usage: altSpecies2Find.sh <case> : provisional write at the accepted start, locate the true start with altSpeciesFindStart.ts, rewrite
set -e
c=$1
b=$(python3 -c "
import json,sys
cs={x['name']:x for x in json.load(open('tools/integration/altSpecies2Cases.json'))['cases']}
d=json.load(open(cs['$c']['baseSource']));w=d.get('denseWindow') or d.get('sourceWindow');print(w['startFrame'])")
out=$(python3 tools/integration/altSpecies2Stage.py write $c $b 2>&1)
dir=$(echo "$out" | sed -n 's/^PROBEDIR //p')
best=$(node --experimental-strip-types tools/integration/altSpeciesFindStart.ts tools/integration/fixtures/altspecies2-$c.json $dir | python3 -c "import json,sys;d=json.load(sys.stdin);print(d['best'][0], d['best'][1], d['next'][0])")
echo "$c base=$b best=$best"
st=$(echo $best | cut -d' ' -f1)
python3 tools/integration/altSpecies2Stage.py write $c $st 2>&1 | grep -E "^wrote" | cut -c1-120
