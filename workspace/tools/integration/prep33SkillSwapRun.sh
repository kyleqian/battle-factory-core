#!/bin/sh
# prep33 Skill Swap stage (called by prep33Run.sh with OUT / REC set): derived-field check over 6 windows + negative controls.
set -e
[ -n "$OUT" ] && [ -n "$REC" ] || { echo "OUT and REC required"; exit 2; }
E=tools/compare/evidence
W="$E/skill-swap-player-dense-state.json.gz:player $E/skill-swap-opponent-dense-state.json.gz:opponent"
for s in prep22-skill-swap-alt-player-alakazam-golem:player prep22-skill-swap-alt-opponent-alakazam-golem:opponent prep33-skill-swap-alt-player-espeon-weezing:player prep33-skill-swap-alt-opponent-weezing-snorlax:opponent; do
  W="$W $OUT/${s%%:*}-r1.json:${s##*:}"; done
npx vite-node tools/integration/prep33SkillSwapCheck.ts $W --out=$REC/skillswap-check.json 2> /dev/null
for n in anchor lag; do npx vite-node tools/integration/prep33SkillSwapCheck.ts $W --neg=$n --out=$REC/skillswap-neg-$n.json 2> /dev/null; done
