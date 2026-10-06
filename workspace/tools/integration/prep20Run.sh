#!/bin/sh
# prep20 reproduction (run from workspace/). Direct mGBA only (never the shared HTTP oracles); every alternate probe twice from fresh processes, cmp'd.
#   sh tools/integration/prep20Run.sh        (~4 min: 14 probe processes, then 5 checkers)
set -e
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
OUT=${OUT:-/tmp/p20/alt}; mkdir -p "$OUT"
probe() { # probe <script> <scenario>   -> $OUT/<scenario>-r{1,2}.json (+ -rgb dirs)
  for r in 1 2; do ( mkdir -p "$OUT/$2-r$r-rgb"; $PY tools/compare/$1 tools/battle-lab/$2.json "$OUT/$2-r$r.json" "$OUT/$2-r$r-rgb" > "$OUT/$2-r$r.log" 2>&1 ) & done; }
for s in prep18-will-o-wisp-alt-banette-golem prep18-will-o-wisp-altopp-banette-golem; do probe willOWispProbe.py $s; done
for s in prep18-pursuit-alt-umbreon-golem prep18-pursuit-altopp-umbreon-golem; do probe pursuitProbe.py $s; done
for s in prep18-fury-cutter-alt-scyther-golem prep18-fury-cutter-altopp-scyther-golem prep18-fury-cutter-six-hits; do probe furyCutterProbe.py $s; done
for s in prep18-megahorn-alt-heracross-golem prep18-megahorn-altopp-heracross-golem; do probe megaHornProbe.py $s; done
wait
for f in "$OUT"/*-r1.json; do cmp -s "$f" "${f%-r1.json}-r2.json" || { echo "DIFF $f"; exit 1; }; done; echo "alternate probes: r1 == r2 byte-identical"
W=$OUT/prep18-will-o-wisp; P=$OUT/prep18-pursuit; F=$OUT/prep18-fury-cutter; M=$OUT/prep18-megahorn
npx vite-node tools/integration/prep20WispCheck.ts $W-alt-banette-golem-r1.json $W-altopp-banette-golem-r1.json
npx vite-node tools/integration/prep20WispPixels.ts $W-alt-banette-golem-r1.json $W-alt-banette-golem-r1-rgb $W-altopp-banette-golem-r1.json $W-altopp-banette-golem-r1-rgb
npx vite-node tools/integration/prep20PursuitCheck.ts --pixels $P-alt-umbreon-golem-r1.json:$P-alt-umbreon-golem-r1-rgb:player-back:UMBREON,GOLEM $P-altopp-umbreon-golem-r1.json:$P-altopp-umbreon-golem-r1-rgb:opponent-front:UMBREON,GOLEM
npx vite-node tools/integration/prep20FuryCutterCheck.ts --pixels $F-alt-scyther-golem-r1.json:$F-alt-scyther-golem-r1-rgb:player:SCYTHER,GOLEM $F-altopp-scyther-golem-r1.json:$F-altopp-scyther-golem-r1-rgb:opponent:SCYTHER,GOLEM --six=$F-six-hits-r1.json:$F-six-hits-r1-rgb
npx vite-node tools/integration/prep20MegahornCheck.ts --pixels $M-alt-heracross-golem-r1.json:$M-alt-heracross-golem-r1-rgb:player:HERACROSS,GOLEM $M-altopp-heracross-golem-r1.json:$M-altopp-heracross-golem-r1-rgb:opponent:HERACROSS,GOLEM
