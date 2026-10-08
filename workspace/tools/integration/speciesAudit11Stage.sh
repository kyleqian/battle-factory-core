#!/bin/bash
# speciesAudit11: stage target + attacker swaps of the adapters merged since audit 10 (Dive 291 setup first; then Extreme Speed 245, Ice Ball 301
# counter 0, Memento 262 first body) on their accepted s10a-live pairs, both orientations (reuses speciesAudit6Stage.py) -> $W/list-<move>.tsv,
# $W/scenarios/. Species immune to the move as TARGET (no ROM body) are left out per move. usage: speciesAudit11Stage.sh [W] [move...]
# Gender papercut fix as audit 10: genderless species get their gender forced here (speciesAudit6Stage.py copies the party gender).
# (bash 3.2: no associative arrays; species lists are "NAME:id" words)
cd "$(dirname "$0")/../.." || exit 1
W=${1:-tools/integration/fixtures/species-audit-11}; shift; mkdir -p $W; S=tools/integration/speciesAudit6Stage.py
X=tools/integration/fixtures/s10a-live
MOVES=${*:-dive extreme-speed ice-ball memento}
GENDERLESS=" SHEDINJA SUICUNE "
fixgender() {  # force the swapped party[0] gender for genderless species
  python3 - "$@" <<'PY'
import json, sys
name, path, side = sys.argv[1], sys.argv[2], sys.argv[3]
sc = json.load(open(path)); p = sc["overrides"]["parties"][side][0]; p["gender"] = "genderless"
json.dump(sc, open(path, "w"), separators=(",", ":")); open(path, "a").write("\n")
PY
}
stage() {  # $1 = target|attacker, $2 = NAME:id, extra args...; appends to $L
  local role=$1 e=$2; shift 2; local n=${e%%:*} id=${e##*:}; local t=$(echo $n | tr A-Z a-z) args
  if [ $role = target ]; then args="--boost attacker"; else args="--swap attacker --ev 252"; fi
  python3 $S $args --species $n --id $id --tag $t "$@" --out $W "${FX[@]}" 2>/dev/null | while IFS="$(printf '\t')" read stem fx sc side; do
    case "$GENDERLESS" in *" $n "*) fixgender $n "$sc" "$side";; esac; printf '%s\t%s\t%s\t%s\n' "$stem" "$fx" "$sc" "$side"; done >> $L
}
# elevated / levitating first (FLYGON, SHEDINJA, GOLBAT, WEEZING), tall / large (STEELIX, TYRANITAR, WAILORD), small (PICHU), idle rests (RATTATA, ONIX)
ALLT="FLYGON:334 SHEDINJA:303 GOLBAT:42 WEEZING:110 STEELIX:208 TYRANITAR:248 WAILORD:314 PICHU:172 RATTATA:19 ONIX:95"
for mv in $MOVES; do
  case $mv in  # accepted pairs (both orientations); target swaps minus immune species; attacker swaps incl. the legal Factory users of the move
    dive) ACC="$X/dive-player-chinchou-opponent-onix.json $X/dive-opponent-chinchou-player-onix.json"
      TGT="$ALLT"  # setup body only: the target's typing / ability never gates it
      ATK="CLAMPERL:373 CLOYSTER:91 LUVDISC:325 POLITOED:186 SEEL:86 SUICUNE:245 $ALLT";;
    extreme-speed) ACC="$X/extreme-speed-alt-player-smeargle-golem.json $X/extreme-speed-alt-opponent-smeargle-golem.json"  # the ARCANINE pair stages set ids, no parties
      TGT="FLYGON:334 GOLBAT:42 WEEZING:110 STEELIX:208 TYRANITAR:248 WAILORD:314 PICHU:172 RATTATA:19 ONIX:95"  # Ghost (SHEDINJA) immune
      ATK="ARCANINE:59 $ALLT";;
    ice-ball) ACC="$X/ice-ball-player-spheal-opponent-registeel.json $X/ice-ball-opponent-spheal-player-registeel.json"
      TGT="FLYGON:334 GOLBAT:42 WEEZING:110 STEELIX:208 TYRANITAR:248 WAILORD:314 PICHU:172 RATTATA:19 ONIX:95"  # Wonder Guard (SHEDINJA) immune
      ATK="SEALEO:342 DELIBIRD:225 $ALLT";;
    memento) ACC="$X/memento-player-weezing-opponent-onix.json $X/memento-opponent-weezing-player-onix.json"
      TGT="$ALLT"; ATK="$ALLT";;  # WEEZING is the only legal Factory user
  esac
  FX=($ACC); L=$W/list-$mv.tsv; : > $L
  for e in $TGT; do stage target $e; done
  for e in $ATK; do stage attacker $e; done
  stage attacker STEELIX:208 --shiny --tag shinysteelix  # later --tag wins in argparse
  wc -l $L
done
