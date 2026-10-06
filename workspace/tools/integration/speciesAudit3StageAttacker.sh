#!/bin/bash
# speciesAudit3: attacker-side swaps (GOLEM for player attackers, GOLBAT for opponent attackers) -> <workdir>/listA.tsv. usage: speciesAudit3StageAttacker.sh [workdir]
cd "$(dirname "$0")/../.." || exit 1
W=${1:-tools/integration/fixtures/species-audit-3}; F=tools/integration/fixtures; S=tools/integration/speciesAudit3Stage.py
PL=(); for m in prep13-live/ice-beam-player-delcatty-opponent-shuckle prep14-live/rain-dance-player-wooper-opponent-onix prep13-live/hyper-beam-player-aerodactyl-opponent-onix prep14-live/water-pulse-player-lombre-opponent-onix random2-r1/double-kick-player-nidorina-opponent-onix random2-r1/flail-player-krabby-opponent-onix random2-r1/astonish-player-loudred-opponent-onix random2-r1/thrash-player-tauros-opponent-onix random2-r1/wish-player-illumise-opponent-onix prep13-live/water-spout-player-wailmer-opponent-shuckle prep14-live/hail-player-delibird-opponent-onix; do PL+=($F/$m.json); done
OP=(); for p in "${PL[@]}"; do OP+=("$(echo $p | sed 's/player-\([a-z]*\)-opponent-/opponent-\1-player-/')"); done
: > $W/listA.tsv
python3 $S --swap attacker --species GOLEM --id 76 --tag golem --out $W "${PL[@]}" >> $W/listA.tsv
python3 $S --swap attacker --species GOLBAT --id 42 --tag golbat --out $W "${OP[@]}" >> $W/listA.tsv
wc -l $W/listA.tsv
