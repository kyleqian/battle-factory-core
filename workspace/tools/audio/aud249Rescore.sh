#!/usr/bin/env bash
# aud249: re-score T2 against the CURRENT engine. The ROM files of an aud248RunSeed.sh directory (req / setup / drive / frozen / tl / snd) depend only on the
# engine's decisions, so a sound-only change reuses them: only the engine replay (+ state compare) is rerun. Usage: tools/audio/aud249Rescore.sh FROM_DIR TO_DIR SEED on|off
# drv1: the replay presses its message-dismiss A on the ROM driver's A frames (--romdrive = the copied drive file); AUD249_NO_ROMDRIVE=1 keeps the old every-even-frame cadence.
set -euo pipefail
F=$1; D=$2; S=$3; SC=$4; mkdir -p "$D"
for k in req setup drive frozen tl snd; do cp "$F/$S-$SC.$k.json" "$D/$S-$SC.$k.json"; done
# drv2: a forced-move anchor the ROM driver closed on a press the ROM ignored is moved to the press it accepted (romForcedAnchorFix.py); AUD249_FORCED_ANCHOR=0 keeps the driver's anchors.
[ "${AUD249_FORCED_ANCHOR:-}" = 0 ] || python3 tools/audio/romForcedAnchorFix.py "$F/$S-$SC.drive.json" "$F/$S-$SC.snd.json" "$D/$S-$SC.drive.json" 2>"$D/$S-$SC.anchorfix.log"
NODE="node --experimental-strip-types --no-warnings tools/integration/soundCensusRomReplay.ts"
RD=(--romdrive="$D/$S-$SC.drive.json"); [ -n "${AUD249_NO_ROMDRIVE:-}" ] && RD=()
# drv2: with the ROM drive the replay also presses A while a button message is already acceptable (fch2m); AUD249_DISMISS_ACCEPT=0 restores the awaiting-only gate (drv1 / t2k4 baselines).
[ "${AUD249_DISMISS_ACCEPT:-}" = 0 ] && RD+=(--dismiss-accept=0)
$NODE replay --seed="$S" --scene="$SC" --setup="$D/$S-$SC.setup.json" "${RD[@]}" --out="$D/$S-$SC.engine.json"
$NODE compare --seed="$S" --scene="$SC" --engine="$D/$S-$SC.engine.json" --rom="$D/$S-$SC.tl.json" --out="$D/$S-$SC.cmp.json" > /dev/null
