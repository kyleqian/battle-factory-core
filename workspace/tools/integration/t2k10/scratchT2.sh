#!/usr/bin/env bash
# usage: scratchT2.sh OUTDIR SCENE [SEED...]  -> re-score the given seeds (default: all of the scene) of the T2 seeds dir with the CURRENT engine into OUTDIR and print the scene's mass line
# (the scratch-edit delta of a recipe: run once on the base tree, once with the edit, diff the TOTAL lines; ROM files come from the t2n seeds dir, so only the engine replay runs)
set -u
. "$(dirname "${BASH_SOURCE[0]}")/../evidenceDir.sh"
D=$1; SC=$2; shift 2; E=$(resolve_seeds_dir "") || exit 2; mkdir -p "$D"; rm -f "$D"/*-$SC.engine.json
SEEDS=${*:-$(cat "$E/$SC.seeds")}
for s in $SEEDS; do tools/audio/aud249Rescore.sh "$E" "$D" "$s" "$SC" >/dev/null 2>"$D/$s-$SC.err" || echo "FAIL $s $SC"; done
python3 tools/audio/soundScoreboard.py "$D" --per-seed 2>&1 | grep -E "^TOTAL|^seed|^  [0-9]+ " | head -40
