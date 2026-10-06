#!/bin/bash
# speciesAudit4: stage target + attacker swaps of the P3 first-body adapters (Overheat, Silver Wind, Psych Up player-only) -> $W/list.tsv, $W/listA.tsv
cd "$(dirname "$0")/../.." || exit 1
W=${1:-tools/integration/fixtures/species-audit-4}; mkdir -p $W; F=tools/integration/fixtures/prep16-live; S=tools/integration/speciesAudit4Stage.py
PL=($F/overheat-player-solrock-opponent-shuckle.json $F/silver-wind-player-butterfree-opponent-onix.json $F/psych-up-player-jumpluff-opponent-shuckle-first-body.json)
OP=($F/overheat-opponent-magcargo-player-shuckle.json $F/silver-wind-opponent-butterfree-player-onix-first-body.json)
: > $W/list.tsv; : > $W/listA.tsv
for sp in "GOLBAT 42" "SHUCKLE 213" "GOLEM 76" "RATTATA 19"; do set -- $sp; python3 $S --species $1 --id $2 --tag $(echo $1|tr A-Z a-z) --boost attacker --out $W "${PL[@]}" >> $W/list.tsv; done
for sp in "GOLEM 76" "RATTATA 19"; do set -- $sp; python3 $S --species $1 --id $2 --tag $(echo $1|tr A-Z a-z) --boost attacker --out $W "${OP[@]}" >> $W/list.tsv; done
python3 $S --swap attacker --ev 252 --species GOLEM --id 76 --tag golem --out $W "${PL[@]}" >> $W/listA.tsv
python3 $S --swap attacker --species GOLBAT --id 42 --tag golbat --out $W "${OP[@]}" >> $W/listA.tsv
# listB: extra breadth. ONIX target (player-side too), SHUCKLE player-side target, more attacker species (player: GOLBAT/RATTATA/SHUCKLE; opponent: RATTATA/SHUCKLE/GOLEM)
: > $W/listB.tsv
python3 $S --species ONIX --id 95 --tag onix --boost attacker --out $W "${PL[@]}" "${OP[@]}" >> $W/listB.tsv
python3 $S --species SHUCKLE --id 213 --tag shuckle --boost attacker --out $W "${OP[@]}" >> $W/listB.tsv
for sp in "GOLBAT 42" "RATTATA 19" "SHUCKLE 213"; do set -- $sp; python3 $S --swap attacker --ev 252 --species $1 --id $2 --tag $(echo $1|tr A-Z a-z) --out $W "${PL[@]}" >> $W/listB.tsv; done
for sp in "RATTATA 19" "SHUCKLE 213" "GOLEM 76"; do set -- $sp; python3 $S --swap attacker --species $1 --id $2 --tag $(echo $1|tr A-Z a-z) --out $W "${OP[@]}" >> $W/listB.tsv; done
wc -l $W/list.tsv $W/listA.tsv $W/listB.tsv
