#!/bin/sh
# prep41 Ghost Curse half: P1 probes + counters (8 scenarios x2), dense probes (6 x2, cmp'd), field check (R1) and the model-level
# pixel check at the policy scanline 14. usage: OUT=<scratch> REC=<receipts> sh tools/integration/prep41CurseRun.sh
set -e
cd "$(dirname "$0")/../.."
OUT=${OUT:?OUT=scratch dir}; REC=${REC:?REC=receipt dir}; mkdir -p "$OUT" "$REC"
python3 tools/integration/prep41CurseScenarios.py >/dev/null
git diff --exit-code -- tools/battle-lab >/dev/null && [ -z "$(git status --porcelain tools/battle-lab)" ] || { echo "prep41 scenarios differ from the committed ones"; exit 1; }
sh tools/integration/prep41CurseProbes.sh "$OUT/curse"
sh tools/integration/prep41CurseCounters.sh "$OUT/cursecounters"
python3 tools/integration/prep41CurseSummary.py "$OUT/curse" "$OUT/cursecounters" "$REC/curse-p1.json" >/dev/null
sh tools/integration/prep41CurseDenseProbes.sh "$OUT/cdense" | grep DIFF && exit 1 || true
EV=tools/compare/evidence; O=$OUT/cdense; G=$O/prep14-curse-ghost-alt-gengar-golem-r1; H=$O/prep23-curse-ghost-altopp-gengar-golem-r1; D=$O/prep41-curse-ghost
npx vite-node tools/integration/prep23CurseGhostCheck.ts gp:$EV/curse-ghost-player-dense-state.json.gz:player go:$EV/curse-ghost-opponent-dense-state.json.gz:opponent \
  ga:$G.json:player gb:$H.json:opponent dp1:$D-p-dusclops-golem-r1.json:player dp2:$D-p-dusclops-snorlax-r1.json:player \
  do1:$D-o-dusclops-golem-r1.json:opponent do2:$D-o-dusclops-snorlax-r1.json:opponent --out=$REC/curse-ghost-check.json >/dev/null
npx vite-node tools/integration/prep41CurseGhostPixels.ts --scanline=14 \
  gp:$EV/curse-ghost-player-dense-state.json.gz:tar=$EV/curse-ghost-player-raw-rgb.tar.gz:player:HAUNTER,MAGIKARP \
  go:$EV/curse-ghost-opponent-dense-state.json.gz:tar=$EV/curse-ghost-opponent-raw-rgb.tar.gz:opponent:HAUNTER,MAGIKARP \
  ga:$G.json:$G-rgb:player:GENGAR,GOLEM gb:$H.json:$H-rgb:opponent:GENGAR,GOLEM \
  dp1:$D-p-dusclops-golem-r1.json:$D-p-dusclops-golem-r1-rgb:player:DUSCLOPS,GOLEM dp2:$D-p-dusclops-snorlax-r1.json:$D-p-dusclops-snorlax-r1-rgb:player:DUSCLOPS,SNORLAX \
  do1:$D-o-dusclops-golem-r1.json:$D-o-dusclops-golem-r1-rgb:opponent:DUSCLOPS,GOLEM do2:$D-o-dusclops-snorlax-r1.json:$D-o-dusclops-snorlax-r1-rgb:opponent:DUSCLOPS,SNORLAX \
  --out=$REC/curse-pixels-s14.json >/dev/null
echo "prep41 curse receipts in $REC"
