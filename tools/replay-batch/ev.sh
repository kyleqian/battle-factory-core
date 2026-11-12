#!/bin/sh
# Engine replay with per-turn events (--events=1) for one mismatched seed; needs the batch's SEED-off.setup.json.
# Usage (cwd = workspace/): REPLAY_OUT=/abs/outdir ../tools/replay-batch/ev.sh SEED   -> OUTDIR/ev/SEED.ev.json
D=${REPLAY_OUT:?set REPLAY_OUT to an absolute output directory}; mkdir -p "$D/ev"
[ -s "$D/ev/$1.ev.json" ] && exit 0
node --experimental-strip-types --no-warnings tools/integration/soundCensusRomReplay.ts replay --seed="$1" --scene=off --setup="$D/$1-off.setup.json" --events=1 --out="$D/ev/$1.ev.json" 2>/dev/null
