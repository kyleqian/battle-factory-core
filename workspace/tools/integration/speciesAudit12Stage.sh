#!/bin/bash
# speciesAudit12: stage target + attacker swaps of the last adapters merged in S10A (Substitute 164 body and Skill Swap 285 first; then Flatter 260,
# Eruption 284) on their accepted s10a-live pairs, both orientations (reuses speciesAudit6Stage.py) -> $W/list-<move>.tsv, $W/scenarios/.
# Same recipe as speciesAudit11Stage.sh (genderless gender fix; species that make the move FAIL in the ROM, i.e. no body, are left out per move).
# usage: speciesAudit12Stage.sh [W] [move...]   (bash 3.2: species lists are "NAME:id" words)
cd "$(dirname "$0")/../.." || exit 1
W=${1:-tools/integration/fixtures/species-audit-12}; shift; mkdir -p $W; S=tools/integration/speciesAudit6Stage.py
X=tools/integration/fixtures/s10a-live
MOVES=${*:-substitute skill-swap flatter eruption}
GENDERLESS=" SHEDINJA ARTICUNO ZAPDOS RAIKOU REGISTEEL BALTOY "
FEMALE=" BLISSEY JYNX NIDORAN_F NIDORINA "; MALE=" NIDORINO "
fixgender() {  # force the swapped party[0] gender: genderless / female-only / male-only species (speciesAudit6Stage.py copies the party gender)
  python3 - "$@" <<'PY'
import json, sys
g, path, side = sys.argv[1], sys.argv[2], sys.argv[3]
sc = json.load(open(path)); p = sc["overrides"]["parties"][side][0]; p["gender"] = g
json.dump(sc, open(path, "w"), separators=(",", ":")); open(path, "a").write("\n")
PY
}
stage() {  # $1 = target|attacker, $2 = NAME:id, extra args...; appends to $L
  local role=$1 e=$2; shift 2; local n=${e%%:*} id=${e##*:}; local t=$(echo $n | tr A-Z a-z | tr -d _) args
  if [ $role = target ]; then args="--boost attacker"; else args="--swap attacker --ev 252"; fi
  python3 $S $args --species $n --id $id --tag $t "$@" --out $W "${FX[@]}" 2>/dev/null | while IFS="$(printf '\t')" read stem fx sc side; do
    case "$GENDERLESS" in *" $n "*) fixgender genderless "$sc" "$side";; esac
    case "$FEMALE" in *" $n "*) fixgender female "$sc" "$side";; esac
    case "$MALE" in *" $n "*) fixgender male "$sc" "$side";; esac
    printf '%s\t%s\t%s\t%s\n' "$stem" "$fx" "$sc" "$side"; done >> $L
}
# elevated / levitating first (FLYGON, SHEDINJA, GOLBAT, WEEZING), tall / large (STEELIX, TYRANITAR, WAILORD), small (PICHU), idle rests (RATTATA, ONIX)
ALLT="FLYGON:334 SHEDINJA:303 GOLBAT:42 WEEZING:110 STEELIX:208 TYRANITAR:248 WAILORD:314 PICHU:172 RATTATA:19 ONIX:95"
NOSHED="FLYGON:334 GOLBAT:42 WEEZING:110 STEELIX:208 TYRANITAR:248 WAILORD:314 PICHU:172 RATTATA:19 ONIX:95"
for mv in $MOVES; do
  case $mv in  # accepted pairs (both orientations); target swaps; attacker swaps incl. the legal Factory users of the move (battle-frontier-mons.json)
    substitute) ACC="$X/substitute-player-golem-opponent-onix.json $X/substitute-opponent-golem-player-onix.json"
      TGT="$ALLT"  # the target never gates the body
      ATK="ARTICUNO:144 ZAPDOS:145 SHUCKLE:213 BLISSEY:242 MACHAMP:68 JYNX:124 $NOSHED";;  # SHEDINJA: 1 HP <= maxHP/4 -> Substitute fails (no body)
    skill-swap) ACC="$X/skill-swap-player-girafarig-opponent-shuckle.json $X/skill-swap-opponent-girafarig-player-shuckle.json"
      TGT="$NOSHED"  # Wonder Guard (SHEDINJA) makes Skill Swap fail in either role
      ATK="ALAKAZAM:65 GENGAR:94 VENOMOTH:49 DUSKULL:361 KECLEON:317 $NOSHED";;
    flatter) ACC="$X/flatter-player-nidorina-opponent-onix.json $X/flatter-opponent-nidorina-player-onix.json"
      TGT="$ALLT"; ATK="NIDORAN_F:29 NIDORINO:33 $ALLT";;
    eruption) ACC="$X/eruption-player-barboach-opponent-onix.json $X/eruption-opponent-barboach-player-onix.json"
      TGT="$ALLT"  # Fire lands on SHEDINJA (super effective)
      ATK="CAMERUPT:340 $ALLT";;
  esac
  FX=($ACC); L=$W/list-$mv.tsv; : > $L
  for e in $TGT; do stage target $e; done
  for e in $ATK; do stage attacker $e; done
  stage attacker STEELIX:208 --shiny --tag shinysteelix  # later --tag wins in argparse
  wc -l $L
done
