#!/bin/bash
# speciesAudit8: stage target + attacker swaps of Baton Pass 226 / Endeavor 283 (reuses speciesAudit6Stage.py) -> $W/list*.tsv, $W/scenarios/
cd "$(dirname "$0")/../.." || exit 1
W=${1:-tools/integration/fixtures/species-audit-8}; mkdir -p $W; B=tools/integration/fixtures/baton-endeavor-live; S=tools/integration/speciesAudit6Stage.py
TA=($B/baton-accepted-opponent-aipom-onix.json $B/baton-accepted-player-aipom-onix.json $B/endeavor-accepted-opponent-onix-grovyle.json $B/endeavor-accepted-player-onix-grovyle.json)
: > $W/list1.tsv; : > $W/list3.tsv
for sp in "FLYGON 334" "GOLBAT 42" "STEELIX 208" "TYRANITAR 248" "WAILORD 314" "PICHU 172" "RATTATA 19" "ONIX 95"; do set -- $sp; t=$(echo $1|tr A-Z a-z)
  python3 $S --species $1 --id $2 --tag $t --boost attacker --out $W "${TA[@]}" >> $W/list1.tsv
  python3 $S --swap attacker --ev 252 --species $1 --id $2 --tag $t --out $W "${TA[@]}" >> $W/list1.tsv; done
python3 $S --species SHEDINJA --id 303 --genderless --tag shedinja --boost attacker --out $W "${TA[@]}" >> $W/list1.tsv
python3 $S --swap attacker --ev 252 --species SHEDINJA --id 303 --genderless --tag shedinja --out $W "${TA[@]}" >> $W/list1.tsv
python3 $S --swap attacker --ev 252 --species STEELIX --id 208 --shiny --tag shinysteelix --out $W "${TA[@]}" >> $W/list3.tsv
python3 $S --species STEELIX --id 208 --shiny --tag shinysteelixT --boost attacker --out $W "${TA[@]}" >> $W/list3.tsv
wc -l $W/list*.tsv
