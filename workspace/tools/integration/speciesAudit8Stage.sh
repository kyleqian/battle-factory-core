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
# part 2: the other fixtures of the receipt (elevated / small pairs), target swaps (+ attacker swaps for Baton), list6.tsv
TB=($B/baton-prep27-opponent-ninjask-golem.json $B/baton-prep27-player-ninjask-golem.json $B/baton-s10a-opponent-jolteon-golbat.json $B/baton-s10a-player-jolteon-golbat.json $B/baton-s10a-opponent-onix-golbat.json)
TE=($B/endeavor-prep27-opponent-abra-blissey.json $B/endeavor-prep27-player-abra-blissey.json $B/endeavor-prep27-opponent-diglett-chansey.json $B/endeavor-prep27-player-diglett-chansey.json $B/endeavor-s10a-opponent-golbat-chansey.json $B/endeavor-s10a-player-diglett-golbat.json)
: > $W/list6.tsv
for sp in "FLYGON 334" "GOLBAT 42" "STEELIX 208" "PICHU 172" "RATTATA 19" "ONIX 95"; do set -- $sp; t=$(echo $1|tr A-Z a-z)
  python3 $S --species $1 --id $2 --tag $t --boost attacker --out $W "${TB[@]}" "${TE[@]}" >> $W/list6.tsv
  python3 $S --swap attacker --ev 252 --species $1 --id $2 --tag $t --out $W "${TB[@]}" >> $W/list6.tsv; done
wc -l $W/list6.tsv
# part 3: slow attackers keep the accepted turn order by boosting the TARGET's speed instead (STEELIX / TYRANITAR / shiny STEELIX Baton Pass attackers) -> list8.tsv
: > $W/list8.tsv
for sp in "STEELIX 208" "TYRANITAR 248"; do set -- $sp; t=$(echo $1|tr A-Z a-z)
  python3 $S --swap attacker --ev 0 --boost target --species $1 --id $2 --tag ${t}B --out $W $B/baton-accepted-opponent-aipom-onix.json $B/baton-accepted-player-aipom-onix.json >> $W/list8.tsv; done
python3 $S --swap attacker --ev 0 --boost target --species STEELIX --id 208 --shiny --tag shinysteelixB --out $W $B/baton-accepted-opponent-aipom-onix.json $B/baton-accepted-player-aipom-onix.json >> $W/list8.tsv
