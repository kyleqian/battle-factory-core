#!/bin/bash
# speciesAudit5: stage target + attacker swaps of the oam1 first-body adapters (Will-O-Wisp 261, Pursuit 228, Fury Cutter 210) -> $W/list*.tsv, $W/scenarios/
cd "$(dirname "$0")/../.." || exit 1
W=${1:-tools/integration/fixtures/species-audit-5}; mkdir -p $W; F=tools/integration/fixtures/oam1-live; S=tools/integration/speciesAudit5Stage.py
PL=($F/will-o-wisp-player-plusle-opponent-shuckle.json $F/pursuit-player-beedrill-opponent-shuckle.json $F/fury-cutter-counter1-player-grovyle-opponent-blissey.json)
OP=($F/will-o-wisp-opponent-plusle-player-shuckle.json $F/pursuit-opponent-beedrill-player-shuckle.json $F/fury-cutter-counter1-opponent-grovyle-player-blissey.json)
: > $W/list.tsv; : > $W/listA.tsv
# target swaps (both orientations: PL = target on opponent side, OP = target on player side), attacker boosted so it stays the first body
for sp in "STEELIX 208" "TYRANITAR 248" "PICHU 172" "FLYGON 334" "SHEDINJA 303" "WAILORD 314" "RATTATA 19" "ONIX 95"; do set -- $sp; python3 $S --species $1 --id $2 --tag $(echo $1|tr A-Z a-z) --boost attacker --out $W "${PL[@]}" "${OP[@]}" >> $W/list.tsv; done
# attacker swaps
for sp in "STEELIX 208" "PICHU 172" "FLYGON 334" "TYRANITAR 248" "RATTATA 19"; do set -- $sp; python3 $S --swap attacker --ev 252 --species $1 --id $2 --tag $(echo $1|tr A-Z a-z) --out $W "${PL[@]}" >> $W/listA.tsv; python3 $S --swap attacker --ev 252 --species $1 --id $2 --tag $(echo $1|tr A-Z a-z) --out $W "${OP[@]}" >> $W/listA.tsv; done
wc -l $W/list.tsv $W/listA.tsv
# listC: SHEDINJA (genderless, 1 HP) target swaps; shiny battlers (adapters must DECLINE): shiny STEELIX target, shiny STEELIX attacker
: > $W/listC.tsv
python3 $S --species SHEDINJA --id 303 --genderless --tag shedinja --boost attacker --out $W "${PL[@]}" "${OP[@]}" >> $W/listC.tsv
python3 $S --species STEELIX --id 208 --shiny --tag shinysteelix --boost attacker --out $W "${PL[@]}" "${OP[@]}" >> $W/listC.tsv
python3 $S --swap attacker --ev 252 --species STEELIX --id 208 --shiny --tag shinysteelix --out $W "${PL[@]}" "${OP[@]}" >> $W/listC.tsv
wc -l $W/listC.tsv
# listD: ONIX attacker swaps (opponent attacker has idle x2 != 0 -> decline; player attacker = back sprite)
: > $W/listD.tsv
python3 $S --swap attacker --ev 252 --species ONIX --id 95 --tag onix --out $W "${PL[@]}" "${OP[@]}" >> $W/listD.tsv
wc -l $W/listD.tsv
