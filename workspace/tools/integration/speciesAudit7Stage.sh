#!/bin/bash
# speciesAudit7: stage target + attacker swaps of the audit-7 adapters (reuses speciesAudit6Stage.py) -> $W/list*.tsv, $W/scenarios/
cd "$(dirname "$0")/../.." || exit 1
W=${1:-tools/integration/fixtures/species-audit-7}; mkdir -p $W; F=tools/integration/fixtures; S=tools/integration/speciesAudit6Stage.py
TA=($F/return-live/accepted-opponent-dragonair-player-onix.json $F/return-live/accepted-player-dragonair-opponent-onix.json $F/return-live/alt-player-snorlax-opponent-golem.json $F/return-live/alt-opponent-snorlax-player-golem.json $F/sheer-cold-live/sheer-cold-opponent-dewgong-player-chansey.json $F/sheer-cold-live/sheer-cold-player-dewgong-opponent-chansey.json)
TB=($F/q2-live/hyper-voice-opponent-exploud-player-slowking.json $F/q2-live/hyper-voice-player-exploud-opponent-slowking.json $F/q2-live/smog-opponent-magby-player-onix.json $F/q2-live/smog-player-magby-opponent-onix.json $F/q2-live/sand-tomb-opponent-dugtrio-player-onix.json $F/q2-live/sand-tomb-player-dugtrio-opponent-onix.json $F/q2-live/sky-attack-opponent-fearow-player-shuckle-charge.json $F/q2-live/sky-attack-player-fearow-opponent-shuckle-charge.json)
TW=($F/later-bodies-lb26/wisp-o-tackle.json $F/later-bodies-lb26/wisp-p-tackle.json $F/later-bodies-lb26/wisp-o-psychic.json $F/later-bodies-lb26/wisp-p-psychic.json)
: > $W/list1.tsv; : > $W/list2.tsv; : > $W/list3.tsv
for sp in "FLYGON 334" "GOLBAT 42" "STEELIX 208" "TYRANITAR 248" "WAILORD 314" "PICHU 172" "RATTATA 19" "ONIX 95"; do set -- $sp; t=$(echo $1|tr A-Z a-z)
  python3 $S --species $1 --id $2 --tag $t --boost attacker --out $W "${TA[@]}" >> $W/list1.tsv
  python3 $S --swap attacker --ev 252 --species $1 --id $2 --tag $t --out $W "${TA[@]}" >> $W/list1.tsv; done
python3 $S --species SHEDINJA --id 303 --genderless --tag shedinja --boost attacker --out $W "${TA[@]}" >> $W/list1.tsv
for sp in "FLYGON 334" "GOLBAT 42" "STEELIX 208" "PICHU 172" "RATTATA 19" "WAILORD 314"; do set -- $sp; t=$(echo $1|tr A-Z a-z)
  python3 $S --species $1 --id $2 --tag $t --boost attacker --out $W "${TB[@]}" >> $W/list2.tsv
  python3 $S --swap attacker --ev 252 --species $1 --id $2 --tag $t --out $W "${TB[@]}" >> $W/list2.tsv; done
for sp in "FLYGON 334" "GOLBAT 42" "STEELIX 208" "RATTATA 19"; do set -- $sp; t=$(echo $1|tr A-Z a-z)
  python3 $S --species $1 --id $2 --tag $t --boost attacker --out $W "${TW[@]}" >> $W/list2.tsv
  python3 $S --swap attacker --ev 252 --species $1 --id $2 --tag $t --out $W "${TW[@]}" >> $W/list2.tsv; done
python3 $S --swap attacker --ev 252 --species STEELIX --id 208 --shiny --tag shinysteelix --out $W "${TA[@]}" "${TB[@]}" "${TW[@]}" >> $W/list3.tsv
python3 $S --species STEELIX --id 208 --shiny --tag shinysteelixT --boost attacker --out $W "${TA[@]}" >> $W/list3.tsv
wc -l $W/list*.tsv
