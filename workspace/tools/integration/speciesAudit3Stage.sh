#!/bin/bash
# speciesAudit3: stage all swaps of the accepted pairs. usage: speciesAudit3Stage.sh <workdir>  -> <workdir>/list.tsv (name, orig fixture, swapped scenario, target side)
cd "$(dirname "$0")/../.." || exit 1
W=${1:-tools/integration/fixtures/species-audit-3}; mkdir -p $W; : > $W/list.tsv; F=tools/integration/fixtures; S=tools/integration/speciesAudit3Stage.py
PL=($F/prep13-live/ice-beam-player-delcatty-opponent-shuckle.json $F/prep14-live/rain-dance-player-wooper-opponent-onix.json $F/prep13-live/hyper-beam-player-aerodactyl-opponent-onix.json $F/prep14-live/water-pulse-player-lombre-opponent-onix.json $F/random2-r1/double-kick-player-nidorina-opponent-onix.json $F/random2-r1/flail-player-krabby-opponent-onix.json $F/random2-r1/astonish-player-loudred-opponent-onix.json $F/random2-r1/thrash-player-tauros-opponent-onix.json $F/random2-r1/wish-player-illumise-opponent-onix.json $F/prep13-live/water-spout-player-wailmer-opponent-shuckle.json $F/prep13-live/hidden-power-player-unown-opponent-onix.json $F/prep14-live/hail-player-delibird-opponent-onix.json)
OP=(); for p in "${PL[@]}"; do OP+=("$(echo $p | sed 's/player-\([a-z]*\)-opponent-/opponent-\1-player-/')"); done
for sp in "GOLBAT 42" "SHUCKLE 213" "GOLEM 76" "RATTATA 19"; do set -- $sp; python3 $S --species $1 --id $2 --tag $(echo $1|tr A-Z a-z) --out $W "${PL[@]}" >> $W/list.tsv; done
for sp in "GOLEM 76" "RATTATA 19"; do set -- $sp; python3 $S --species $1 --id $2 --tag $(echo $1|tr A-Z a-z) --out $W "${OP[@]}" >> $W/list.tsv; done
wc -l $W/list.tsv
