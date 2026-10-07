#!/bin/bash
# speciesAudit10: stage target + attacker swaps of the adapters merged since audit 9 (Shock Wave 351, Superpower 276 first; then Psywave 149,
# Extrasensory 326, Nightmare 171, Spit Up 255) on their accepted pairs, both orientations (reuses speciesAudit6Stage.py) -> $W/list-<move>.tsv,
# $W/scenarios/. Species that are immune to the move as TARGET (no ROM body) are left out per move. usage: speciesAudit10Stage.sh [W] [move...]
# Papercut fixes vs audit 9: genderless / single-gender species get their gender set here (speciesAudit6Stage.py copies the party gender).
# (bash 3.2: no associative arrays; species lists are "NAME:id" words)
cd "$(dirname "$0")/../.." || exit 1
W=${1:-tools/integration/fixtures/species-audit-10}; shift; mkdir -p $W; S=tools/integration/speciesAudit6Stage.py
D=tools/integration/fixtures/d4a-live; X=tools/integration/fixtures/s10a-live
MOVES=${*:-shock-wave superpower psywave extrasensory nightmare spit-up}
GENDERLESS=" SHEDINJA MAGNETON MAGNEMITE REGIROCK REGISTEEL "; FEMALE=" NIDOQUEEN "
fixgender() {  # $1 = list rows just written; force the swapped party[0] gender for single-gender species
  python3 - "$@" <<'PY'
import json, sys
G = {"SHEDINJA": "genderless", "MAGNETON": "genderless", "MAGNEMITE": "genderless", "REGIROCK": "genderless", "REGISTEEL": "genderless", "NIDOQUEEN": "female"}
name, path, side = sys.argv[1], sys.argv[2], sys.argv[3]
sc = json.load(open(path)); p = sc["overrides"]["parties"][side][0]; p["gender"] = G[name]
json.dump(sc, open(path, "w"), separators=(",", ":")); open(path, "a").write("\n")
PY
}
stage() {  # $1 = target|attacker, $2 = NAME:id, extra args...; appends to $L
  local role=$1 e=$2; shift 2; local n=${e%%:*} id=${e##*:}; local t=$(echo $n | tr A-Z a-z) args
  if [ $role = target ]; then args="--boost attacker"; else args="--swap attacker --ev 252"; fi
  python3 $S $args --species $n --id $id --tag $t "$@" --out $W "${FX[@]}" 2>/dev/null | while IFS="$(printf '\t')" read stem fx sc side; do
    case "$GENDERLESS$FEMALE" in *" $n "*) fixgender $n "$sc" "$side";; esac; printf '%s\t%s\t%s\t%s\n' "$stem" "$fx" "$sc" "$side"; done >> $L
}
ALLT="FLYGON:334 SHEDINJA:303 GOLBAT:42 WEEZING:110 STEELIX:208 TYRANITAR:248 WAILORD:314 PICHU:172 RATTATA:19 ONIX:95"
for mv in $MOVES; do
  case $mv in  # accepted pairs (both orientations); target swaps minus immune species; attacker swaps incl. legal Factory users of the move
    shock-wave) ACC="$D/shock-wave-player-flaaffy-opponent-corsola.json $D/shock-wave-opponent-flaaffy-player-corsola.json"
      TGT="GOLBAT:42 WEEZING:110 MAGNETON:82 CASTFORM:385 TYRANITAR:248 WAILORD:314 PICHU:172 RATTATA:19"  # Ground (FLYGON/STEELIX/ONIX) + Wonder Guard immune
      ATK="MAGNETON:82 MAGNEMITE:81 CASTFORM:385 NOSEPASS:320 PICHU:172 $ALLT";;
    superpower) ACC="$X/superpower-player-nidoqueen-opponent-onix.json $X/superpower-opponent-registeel-player-regirock.json"
      TGT="FLYGON:334 GOLBAT:42 WEEZING:110 STEELIX:208 TYRANITAR:248 WAILORD:314 PICHU:172 RATTATA:19 ONIX:95"  # Ghost (SHEDINJA) immune
      ATK="REGIROCK:401 REGISTEEL:403 NIDOQUEEN:31 $ALLT";;
    psywave) ACC="$D/psywave-player-luvdisc-opponent-onix.json $D/psywave-opponent-swablu-player-onix.json"
      TGT="FLYGON:334 GOLBAT:42 WAILORD:314 PICHU:172 RATTATA:19"; ATK="CHIMECHO:411 SPOINK:351 FLYGON:334 STEELIX:208 WAILORD:314 ONIX:95 RATTATA:19";;
    extrasensory) ACC="$D/extrasensory-player-nuzleaf-opponent-shuckle.json $D/extrasensory-opponent-nuzleaf-player-shuckle.json"
      TGT="FLYGON:334 GOLBAT:42 WAILORD:314 PICHU:172 RATTATA:19"; ATK="STANTLER:234 EXPLOUD:372 FLYGON:334 STEELIX:208 WAILORD:314 ONIX:95 RATTATA:19";;
    nightmare) ACC="$D/nightmare-player-haunter-opponent-shuckle.json $D/nightmare-opponent-haunter-player-shuckle.json"
      TGT="FLYGON:334 GOLBAT:42 WAILORD:314 PICHU:172 RATTATA:19"; ATK="HYPNO:97 FLYGON:334 STEELIX:208 WAILORD:314 ONIX:95 RATTATA:19";;
    spit-up) ACC="$X/spit-up-player-1.json $X/spit-up-opponent-1.json $X/spit-up-player-3.json $X/spit-up-opponent-3.json"
      TGT="FLYGON:334 GOLBAT:42 WAILORD:314 PICHU:172 RATTATA:19"; ATK="FLYGON:334 STEELIX:208 WAILORD:314 ONIX:95 RATTATA:19";;
  esac
  FX=($ACC); L=$W/list-$mv.tsv; : > $L
  for e in $TGT; do stage target $e; done
  for e in $ATK; do stage attacker $e; done
  stage attacker STEELIX:208 --shiny --tag shinysteelix  # later --tag wins in argparse
  wc -l $L
done
