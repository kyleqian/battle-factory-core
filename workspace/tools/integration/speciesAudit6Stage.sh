#!/bin/bash
# speciesAudit6: stage target + attacker swaps of the audit-6 adapters -> $W/list*.tsv, $W/scenarios/  (tier1 = Fire Punch / Curse / Psych Up, tier2 = Signal Beam / Lovely Kiss / Spikes / Octazooka)
cd "$(dirname "$0")/../.." || exit 1
W=${1:-tools/integration/fixtures/species-audit-6}; mkdir -p $W; F=tools/integration/fixtures; S=tools/integration/speciesAudit6Stage.py
T1=($F/r2-gates/fp-p-snorlax-alakazam.json $F/r2-gates/fp-p-hitmonchan-golbat.json $F/r2-gates/fp-o-golbat-machamp.json $F/r2-gates/fp-o-snorlax-golem.json $F/curse-live/stats-player-snorlax-opponent-magikarp.json $F/curse-live/stats-opponent-snorlax-player-magikarp.json $F/r2-gates/pua-hypno-golbat-b0.json)
R=$F/r3-profile-live
T2=($R/signal-beam-player-ariados-opponent-chansey.json $R/signal-beam-opponent-ariados-player-chansey.json $R/lovely-kiss-player-jynx-opponent-onix.json $R/lovely-kiss-opponent-jynx-player-onix.json $R/spikes-player-qwilfish-opponent-onix.json $R/spikes-opponent-qwilfish-player-onix.json $R/octazooka-player-octillery-opponent-onix.json $R/octazooka-opponent-octillery-player-onix.json)
: > $W/list1.tsv; : > $W/list2.tsv; : > $W/list3.tsv
for sp in "STEELIX 208" "TYRANITAR 248" "WAILORD 314" "PICHU 172" "FLYGON 334" "GOLBAT 42" "RATTATA 19" "ONIX 95"; do set -- $sp; t=$(echo $1|tr A-Z a-z)
  python3 $S --species $1 --id $2 --tag $t --boost attacker --out $W "${T1[@]}" >> $W/list1.tsv
  python3 $S --swap attacker --ev 252 --species $1 --id $2 --tag $t --out $W "${T1[@]}" >> $W/list1.tsv; done
python3 $S --species SHEDINJA --id 303 --genderless --tag shedinja --boost attacker --out $W "${T1[@]}" >> $W/list1.tsv
python3 $S --swap attacker --ev 252 --species SHEDINJA --id 303 --genderless --tag shedinja --out $W "${T1[@]}" >> $W/list1.tsv
for sp in "STEELIX 208" "PICHU 172" "FLYGON 334" "RATTATA 19" "WAILORD 314" "TYRANITAR 248"; do set -- $sp; t=$(echo $1|tr A-Z a-z)
  python3 $S --species $1 --id $2 --tag $t --boost attacker --out $W "${T2[@]}" >> $W/list2.tsv
  python3 $S --swap attacker --ev 252 --species $1 --id $2 --tag $t --out $W "${T2[@]}" >> $W/list2.tsv; done
python3 $S --species SHEDINJA --id 303 --genderless --tag shedinja --boost attacker --out $W "${T2[@]}" >> $W/list2.tsv
# shiny STEELIX attacker (decline) for every move, both orientations
python3 $S --swap attacker --ev 252 --species STEELIX --id 208 --shiny --tag shinysteelix --out $W "${T1[@]}" "${T2[@]}" >> $W/list3.tsv
wc -l $W/list*.tsv
