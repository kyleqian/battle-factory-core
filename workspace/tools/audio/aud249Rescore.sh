#!/usr/bin/env bash
# aud249: re-score T2 against the CURRENT engine. The ROM files of an aud248RunSeed.sh directory (req / setup / drive / frozen / tl / snd) depend only on the
# engine's decisions, so a sound-only change reuses them: only the engine replay (+ state compare) is rerun. Usage: tools/audio/aud249Rescore.sh FROM_DIR TO_DIR SEED on|off
set -euo pipefail
F=$1; D=$2; S=$3; SC=$4; mkdir -p "$D"
for k in req setup drive frozen tl snd; do cp "$F/$S-$SC.$k.json" "$D/$S-$SC.$k.json"; done
NODE="node --experimental-strip-types --no-warnings tools/integration/soundCensusRomReplay.ts"
$NODE replay --seed="$S" --scene="$SC" --setup="$D/$S-$SC.setup.json" --out="$D/$S-$SC.engine.json"
$NODE compare --seed="$S" --scene="$SC" --engine="$D/$S-$SC.engine.json" --rom="$D/$S-$SC.tl.json" --out="$D/$S-$SC.cmp.json" > /dev/null
