#!/bin/sh
# prep23 reproduction (run from workspace/). Direct mGBA only; probes twice, cmp'd; checks + pixels write compact receipts.
#   sh tools/integration/prep23Run.sh      (~3 min)
set -e
OUT=${OUT:-/tmp/p23}; REC=tools/integration/fixtures/prep23; mkdir -p "$REC"
[ -f "$OUT/prep23-curse-stat-alt2-onix-pidgeot-r1.json" ] || sh tools/integration/prep23Probes.sh
EV=tools/compare/evidence; A=$OUT/prep14-curse-stat-alt-miltank-golem-r1; B=$OUT/prep23-curse-stat-altopp-miltank-golem-r1; C=$OUT/prep23-curse-stat-alt2-onix-pidgeot-r1
npx vite-node tools/integration/prep23CurseStatsCheck.ts sp:$EV/curse-stats-player-dense-state.json.gz:player so:$EV/curse-stats-opponent-dense-state.json.gz:opponent \
  alt-miltank-golem-player:$A.json:player alt-miltank-golem-opponent:$B.json:opponent alt-onix-pidgeot-player:$C.json:player --out=$REC/stats-check.json
npx vite-node tools/integration/prep23CurseStatsPixels.ts sp:$EV/curse-stats-player-dense-state.json.gz:tar=$EV/curse-stats-player-raw-rgb.tar.gz:player:SNORLAX,MAGIKARP \
  so:$EV/curse-stats-opponent-dense-state.json.gz:tar=$EV/curse-stats-opponent-raw-rgb.tar.gz:opponent:SNORLAX,MAGIKARP \
  alt-miltank-golem-player:$A.json:$A-rgb:player:MILTANK,GOLEM alt-miltank-golem-opponent:$B.json:$B-rgb:opponent:MILTANK,GOLEM alt-onix-pidgeot-player:$C.json:$C-rgb:player:ONIX,PIDGEOT --out=$REC/stats-pixels.json
