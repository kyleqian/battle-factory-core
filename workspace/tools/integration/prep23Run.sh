#!/bin/sh
# prep23 reproduction (run from workspace/). Direct mGBA only; probes twice, cmp'd; checks + pixels write compact receipts.
#   sh tools/integration/prep23Run.sh      (~3 min)
set -e
OUT=${OUT:-/tmp/p23}; REC=${REC:-tools/integration/fixtures/prep23}; mkdir -p "$REC"
[ -f "$OUT/prep23-curse-stat-alt2-onix-pidgeot-r1.json" ] || sh tools/integration/prep23Probes.sh
EV=tools/compare/evidence; A=$OUT/prep14-curse-stat-alt-miltank-golem-r1; B=$OUT/prep23-curse-stat-altopp-miltank-golem-r1; C=$OUT/prep23-curse-stat-alt2-onix-pidgeot-r1
npx vite-node tools/integration/prep23CurseStatsCheck.ts sp:$EV/curse-stats-player-dense-state.json.gz:player so:$EV/curse-stats-opponent-dense-state.json.gz:opponent \
  alt-miltank-golem-player:$A.json:player alt-miltank-golem-opponent:$B.json:opponent alt-onix-pidgeot-player:$C.json:player --out=$REC/stats-check.json
npx vite-node tools/integration/prep23CurseStatsPixels.ts sp:$EV/curse-stats-player-dense-state.json.gz:tar=$EV/curse-stats-player-raw-rgb.tar.gz:player:SNORLAX,MAGIKARP \
  so:$EV/curse-stats-opponent-dense-state.json.gz:tar=$EV/curse-stats-opponent-raw-rgb.tar.gz:opponent:SNORLAX,MAGIKARP \
  alt-miltank-golem-player:$A.json:$A-rgb:player:MILTANK,GOLEM alt-miltank-golem-opponent:$B.json:$B-rgb:opponent:MILTANK,GOLEM alt-onix-pidgeot-player:$C.json:$C-rgb:player:ONIX,PIDGEOT --out=$REC/stats-pixels.json
npx vite-node tools/integration/prep23CurseGhostCheck.ts gp:$EV/curse-ghost-player-dense-state.json.gz:player go:$EV/curse-ghost-opponent-dense-state.json.gz:opponent \
  alt-gengar-golem-player:$OUT/prep14-curse-ghost-alt-gengar-golem-r1.json:player alt-gengar-golem-opponent:$OUT/prep23-curse-ghost-altopp-gengar-golem-r1.json:opponent --out=$REC/ghost-check.json
G=$OUT/prep14-curse-ghost-alt-gengar-golem-r1; H=$OUT/prep23-curse-ghost-altopp-gengar-golem-r1
npx vite-node tools/integration/prep23CurseGhostPixels.ts gp:$EV/curse-ghost-player-dense-state.json.gz:tar=$EV/curse-ghost-player-raw-rgb.tar.gz:player:HAUNTER,MAGIKARP \
  go:$EV/curse-ghost-opponent-dense-state.json.gz:tar=$EV/curse-ghost-opponent-raw-rgb.tar.gz:opponent:HAUNTER,MAGIKARP \
  alt-gengar-golem-player:$G.json:$G-rgb:player:GENGAR,GOLEM alt-gengar-golem-opponent:$H.json:$H-rgb:opponent:GENGAR,GOLEM --out=$REC/ghost-pixels.json
