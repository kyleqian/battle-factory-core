#!/bin/sh
# prep24 reproduction (run from workspace/).  Direct mGBA only (never the shared HTTP oracles).
#   sh tools/integration/prep24Run.sh                  # probes (12+4 fresh processes, each scenario twice, cmp'd), then all checkers; writes receipts to $REC
#   REC=/tmp/x SKIP_PROBES=1 sh tools/integration/prep24Run.sh   # re-run only the checkers (second pass; cmp the receipts)
set -e
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
OUT=${OUT:-/tmp/p24/alt}; REC=${REC:-tools/integration/fixtures/prep24}; mkdir -p "$REC"; export OUT
[ -n "$SKIP_PROBES" ] || sh tools/integration/prep24Probes.sh 2>&1 | grep -v "Segmentation fault"
M=$OUT/prep18-megahorn; N=$OUT/prep24-megahorn; R=$OUT/prep18-return; Q=$OUT/prep24-return
npx vite-node tools/integration/prep24MegahornCheck.ts $M-alt-heracross-golem-r1.json:player $M-altopp-heracross-golem-r1.json:opponent $N-alt-heracross-onix-r1.json:player $N-altopp-heracross-onix-r1.json:opponent --out=$REC/megahorn-model-check.json > /dev/null
npx vite-node tools/integration/prep20MegahornCheck.ts $N-alt-heracross-onix-r1.json:x:player:HERACROSS,ONIX $N-altopp-heracross-onix-r1.json:x:opponent:HERACROSS,ONIX --out=$REC/megahorn-oam-onix-check.json > /dev/null
npx vite-node tools/integration/prep24MegahornPixels.ts $M-alt-heracross-golem-r1.json:$M-alt-heracross-golem-r1-rgb:player:HERACROSS,GOLEM $M-altopp-heracross-golem-r1.json:$M-altopp-heracross-golem-r1-rgb:opponent:HERACROSS,GOLEM $N-alt-heracross-onix-r1.json:$N-alt-heracross-onix-r1-rgb:player:HERACROSS,ONIX $N-altopp-heracross-onix-r1.json:$N-altopp-heracross-onix-r1-rgb:opponent:HERACROSS,ONIX --out=$REC/megahorn-pixels.json > /dev/null
npx vite-node tools/integration/prep24ReturnCheck.ts $R-alt-snorlax-golem-r1.json:player $R-altopp-snorlax-golem-r1.json:opponent $Q-alt-snorlax-pidgeot-r1.json:player $Q-altopp-snorlax-pidgeot-r1.json:opponent --out=$REC/return-model-check.json > /dev/null
npx vite-node tools/integration/prep24ReturnPixels.ts $R-alt-snorlax-golem-r1.json:$R-alt-snorlax-golem-r1-rgb:player $R-altopp-snorlax-golem-r1.json:$R-altopp-snorlax-golem-r1-rgb:opponent $Q-alt-snorlax-pidgeot-r1.json:$Q-alt-snorlax-pidgeot-r1-rgb:player $Q-altopp-snorlax-pidgeot-r1.json:$Q-altopp-snorlax-pidgeot-r1-rgb:opponent --out=$REC/return-pixels.json > /dev/null
npx vite-node tools/integration/prep24ReturnRow0Control.ts $Q-alt-snorlax-pidgeot-r1 > $REC/return-row0-control.txt
for n in registers palette phase; do npx vite-node tools/integration/prep24MegahornPixels.ts --neg=$n --out=$REC/megahorn-neg-$n.json > /dev/null; done
for n in registers palette oam; do npx vite-node tools/integration/prep24ReturnPixels.ts --neg=$n --out=$REC/return-neg-$n.json > /dev/null; done
echo "receipts in $REC"
