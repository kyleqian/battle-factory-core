#!/bin/bash
# speciesAudit8: Fire Punch 7 opponent-side attacker swaps (elevated / small / idle-rest species; audit 6 only covered the target swaps + other attackers) -> $W/list7.tsv
cd "$(dirname "$0")/../.." || exit 1
W=${1:-tools/integration/fixtures/species-audit-8}; F=tools/integration/fixtures; S=tools/integration/speciesAudit6Stage.py; : > $W/list7.tsv
for sp in "FLYGON 334" "GOLBAT 42" "ONIX 95" "RATTATA 19" "PICHU 172"; do set -- $sp; t=$(echo $1|tr A-Z a-z)
  python3 $S --swap attacker --ev 0 --boost target --species $1 --id $2 --tag $t --out $W $F/r2-gates/fp-o-snorlax-golem.json $F/r2-gates/fp-o-golbat-machamp.json >> $W/list7.tsv 2>/dev/null; done
python3 $S --swap attacker --ev 0 --boost target --species SHEDINJA --id 303 --genderless --tag shedinja --out $W $F/r2-gates/fp-o-snorlax-golem.json $F/r2-gates/fp-o-golbat-machamp.json $F/r2-gates/fp-p-snorlax-alakazam.json >> $W/list7.tsv 2>/dev/null
cut -f1 $W/list7.tsv | wc -l
