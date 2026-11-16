#!/usr/bin/env bash
# aud248: T2 for one seed/scene = romDriveSeed.sh chain + ROM sound pass (hybrid lab on the frozen trace). Usage: tools/audio/aud248RunSeed.sh SEED on|off OUTDIR
# Writes OUTDIR/<seed>-<scene>.{engine,drive,frozen,tl,cmp,snd}.json; prints the chain summary line (or "FAIL seed scene why"). Skips finished stages.
set -uo pipefail
S=$1; SC=$2; D=$3; T="$D/$S-$SC"; mkdir -p "$D"
[ -s "$T.cmp.json" ] || tools/audio/romDriveSeed.sh "$S" "$SC" "$D" > "$T.chain.log" 2>&1 || { echo "FAIL $S $SC chain"; exit 1; }
if [ ! -s "$T.snd.json" ]; then
  rm -f "$T.snd.json" "$T.snd.json.log"
  # aud251: the drive stops at gBattleOutcome != 0, before the victory BGM / SE_BALL_OPEN of the last resolution; the sound pass runs AUD_TAIL_FRAMES (default 500) idle frames longer
  python3 - "$T" "${AUD_TAIL_FRAMES:-500}" <<'PY'
import json, sys
t, n = sys.argv[1], int(sys.argv[2])
f = json.load(open(f"{t}.frozen.json"))
if n > 0: f["trace"]["segments"].append({"frames": n, "buttons": []})
json.dump(f, open(f"{t}.frozen-tail.json", "w"))
PY
  python3 tools/run-mgba-probe.py "$T.snd.json" -- python3 tools/audio/soundEventProbe.py "$T.snd.json" lab "$T.frozen-tail.json" --profile "$SC" --fast > /dev/null 2>&1 || { echo "FAIL $S $SC sound"; exit 1; }
fi
tail -1 "$T.chain.log" 2>/dev/null || echo "OK $S $SC (chain log from earlier run)"
