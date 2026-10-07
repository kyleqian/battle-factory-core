#!/bin/bash
# speciesAudit9: stage target + attacker swaps of the D4 faithful-timing adapters' accepted d4a-live pairs (Megahorn 224, Revenge 279,
# Mach Punch 183, Meteor Mash 309; reuses speciesAudit6Stage.py) -> $W/list-<move>.tsv, $W/scenarios/. usage: speciesAudit9Stage.sh [W] [move...]
# (bash 3.2: no associative arrays; species lists are "NAME:id" words)
cd "$(dirname "$0")/../.." || exit 1
W=${1:-tools/integration/fixtures/species-audit-9}; shift; mkdir -p $W; D=tools/integration/fixtures/d4a-live; S=tools/integration/speciesAudit6Stage.py
MOVES=${*:-megahorn revenge mach-punch meteor-mash}
SPECIES="FLYGON:334 GOLBAT:42 WEEZING:110 STEELIX:208 TYRANITAR:248 WAILORD:314 PICHU:172 RATTATA:19 ONIX:95"
for mv in $MOVES; do
  case $mv in  # accepted pairs (both orientations) + legal Factory users of the move (extra attacker swaps)
    megahorn) ACC="megahorn-player-seaking-opponent-onix megahorn-opponent-seaking-player-onix"; LEGAL="NIDOKING:34 RHYDON:112";;
    revenge) ACC="revenge-player-machamp-opponent-shuckle revenge-opponent-qwilfish-player-shuckle"; LEGAL="HITMONLEE:106 HITMONTOP:237";;
    mach-punch) ACC="mach-punch-player-hitmonchan-opponent-chansey mach-punch-opponent-hitmonchan-player-chansey"; LEGAL="BRELOOM:307 HITMONLEE:106";;
    meteor-mash) ACC="meteor-mash-player-metang-opponent-onix meteor-mash-opponent-metang-player-onix"; LEGAL="METAGROSS:400";;
  esac
  FX=(); for k in $ACC; do FX+=($D/$k.json); done; L=$W/list-$mv.tsv; : > $L
  for e in $SPECIES; do n=${e%%:*}; id=${e##*:}; t=$(echo $n | tr A-Z a-z)
    python3 $S --species $n --id $id --tag $t --boost attacker --out $W "${FX[@]}" >> $L 2>/dev/null
    python3 $S --swap attacker --ev 252 --species $n --id $id --tag $t --out $W "${FX[@]}" >> $L 2>/dev/null; done
  python3 $S --species SHEDINJA --id 303 --genderless --tag shedinja --boost attacker --out $W "${FX[@]}" >> $L
  python3 $S --swap attacker --ev 252 --species SHEDINJA --id 303 --genderless --tag shedinja --out $W "${FX[@]}" >> $L
  for e in $LEGAL; do n=${e%%:*}; id=${e##*:}; t=$(echo $n | tr A-Z a-z)
    python3 $S --swap attacker --ev 252 --species $n --id $id --tag $t --out $W "${FX[@]}" >> $L 2>/dev/null; done
  python3 $S --swap attacker --ev 252 --species STEELIX --id 208 --shiny --tag shinysteelix --out $W "${FX[@]}" >> $L
  python3 $S --species STEELIX --id 208 --shiny --tag shinysteelixT --boost attacker --out $W "${FX[@]}" >> $L
  wc -l $L
done
