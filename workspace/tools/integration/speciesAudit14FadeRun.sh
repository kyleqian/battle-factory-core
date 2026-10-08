#!/bin/sh
# speciesAudit14 fade check (run from workspace/): fadeLiveCheck.ts (the PRODUCTION fade view as committed: no patch) on every
# speciesAudit14FadeStage.py stem, once per fresh run (r1, r2) -> <receipt dir>/fade-r{1,2}.json (+ .txt); the per-window lines of
# the two runs must be identical (digest of the line set printed). Then the three fadeLiveCheck negatives on r1 (each must FAIL).
# usage: sh tools/integration/speciesAudit14FadeRun.sh <probe dir> <scenario dir> <receipt dir>
[ $# -ge 3 ] || { echo "usage: speciesAudit14FadeRun.sh <probe dir> <scenario dir> <receipt dir>"; exit 2; }
PR=$1 SC=$2 REC=$3; mkdir -p "$REC"
for r in 1 2; do
  ARGS=""; for s in $(cut -f1 "$SC/list.tsv"); do ARGS="$ARGS $PR/$s-r$r.json:$PR/$s-r$r-rgb"; done
  sh -c "npx vite-node tools/integration/fadeLiveCheck.ts $ARGS --out=$REC/fade-r$r.json" > "$REC/fade-r$r.txt" 2>&1
done
for r in 1 2; do grep ' dense=' "$REC/fade-r$r.txt" | sed "s/-r$r\.json//g" | shasum -a 256 | cut -c1-16; done
tail -1 "$REC/fade-r1.txt"
ARGS=""; for s in $(cut -f1 "$SC/list.tsv"); do ARGS="$ARGS $PR/$s-r1.json:$PR/$s-r1-rgb"; done
for n in age+1 no-fade no-x2; do sh -c "npx vite-node tools/integration/fadeLiveCheck.ts $ARGS --neg=$n --out=$REC/fade-neg-$n.json" | tail -1 | sed "s/^/negative $n: /"; done
