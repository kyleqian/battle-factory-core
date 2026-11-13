#!/usr/bin/env bash
# parity-mac fourth pass: one battle of the real-ROM replay with a named test player and the wide compare (docs/parity-mac/replay-players.md, wide-compare.md).
# Chain: request -> ROM setup -> engine replay (decisions + wide states) -> closed-loop ROM drive (timeline + wide states) -> compare. The frozen-trace re-run of
# tools/audio/romDriveSeed.sh is not done here (REPLAY_TIMELINE=1 adds it); the compare reads the drive's own timeline.
# Usage (cwd = workspace/): REPLAY_OUT=/abs/outdir tools/audio/romReplayWide.sh SEED [POLICY [SYMBOLS [CHALLENGE]]]
#                           REPLAY_OUT=/abs/outdir tools/audio/romReplayWide.sh --stage docs/parity-mac/stages/NAME.json   (a staged battle)
#   POLICY census (default) | ai-v1 | random-v1.  SYMBOLS 0 (default) | 1 (seed % 49 == 26 is then the gold Noland battle).
#   CHALLENGE (optional, or ROM_REPLAY_CHALLENGE): the game's 0-based challenge number for this battle (7 = the eighth challenge, sets 372..849). Unset = the
#   census mapping (seed * 11) % 49, which only reaches challenges 1 to 7. The ID gets -cN.
#   REPLAY_SCENE=on|off (default off).  REPLAY_KEEP=1 keeps every file of a matching battle (default: request, setup and summary only).
#   REPLAY_FRAME_BUDGET / REPLAY_DRIVE_FRAMES: engine frame budget / ROM frame cap for very long battles.
# Writes OUTDIR/ID.summary.json (ID = SEED-POLICY, with -gold for SYMBOLS 1 and -on for Scene ON) and appends "ID rc=N" to OUTDIR/done.txt.
# A matching battle also leaves OUTDIR/ID.facts.json.gz (decisions, wide states, per-turn events): the input of the tally (tools/audio/romReplayTally.py).
# rc: 11 request, 12 ROM setup, 13 engine replay, 14 ROM drive, 16 compare, 17 summary.
set -uo pipefail
SC=${REPLAY_SCENE:-off}
D=${REPLAY_OUT:?set REPLAY_OUT to an absolute output directory}; mkdir -p "$D"
if [ "${1:-}" = --stage ]; then
  # A staged battle (docs/parity-mac/staged-battles.md): --stage FILE.json. The ID is the stage's name; the player is the stage's written script.
  STAGE=$2; P=script; G=0; unset ROM_REPLAY_CHALLENGE
  S=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['seed'])" "$STAGE") || exit 2
  ID=$(python3 -c "import json,sys; print('stage-' + json.load(open(sys.argv[1]))['name'])" "$STAGE") || exit 2
  WHICH="--stage=$STAGE"
else
  STAGE=; S=$1; P=${2:-census}; G=${3:-0}; C=${4:-${ROM_REPLAY_CHALLENGE:-}}
  ID="$S-$P"; [ "$G" = 1 ] && ID="$ID-gold"
  [ -n "$C" ] && ID="$ID-c$C"
  WHICH="--seed=$S"
  export ROM_REPLAY_CHALLENGE=$C
fi
[ "$SC" = on ] && ID="$ID-on"
T="$D/$ID"
export ROM_REPLAY_POLICY=$P ROM_REPLAY_SYMBOLS=$G
NODE="node --experimental-strip-types --no-warnings tools/integration/soundCensusRomReplay.ts"
PROBE="python3 tools/run-mgba-probe.py --max-log-bytes 8192"
rm -f "$T".{setup-probe,setup,drive,tl}.json* "$T".{req,engine,frozen,cmp,summary}.json
run() {
  $NODE request $WHICH --scene="$SC" --out="$T.req.json" || return 11
  $PROBE "$T.setup-probe.json" -- python3 tools/audio/soundEventProbe.py "$T.setup-probe.json" lab "$T.req.json" --profile "$SC" --frames 1 --setup-out "$T.setup.json" >/dev/null 2>&1 || return 12
  $NODE replay $WHICH --scene="$SC" --setup="$T.setup.json" --out="$T.engine.json" --events=1 ${REPLAY_FRAME_BUDGET:+--frame-budget=$REPLAY_FRAME_BUDGET} || return 13
  $PROBE "$T.drive.json" -- python3 tools/audio/soundEventProbe.py "$T.drive.json" lab "$T.req.json" --profile "$SC" --drive "$T.engine.json" --drive-out "$T.frozen.json" ${REPLAY_DRIVE_FRAMES:+--frames $REPLAY_DRIVE_FRAMES} >/dev/null 2>&1 || return 14
  if [ "${REPLAY_TIMELINE:-0}" = 1 ]; then
    $PROBE "$T.tl.json" -- python3 tools/audio/romStateTimeline.py "$T.tl.json" "$T.frozen.json" --profile "$SC" >/dev/null 2>&1 || return 15
  fi
  $NODE compare $WHICH --scene="$SC" --engine="$T.engine.json" --drive="$T.drive.json" --out="$T.cmp.json" >/dev/null || return 16
  python3 tools/audio/romReplaySummary.py "$T" "$ID" "$G" ${STAGE:+"$STAGE"} > "$T.summary.json" || return 17
}
run 2> "$T.stderr"; rc=$?
if [ $rc = 0 ] && [ "${REPLAY_KEEP:-0}" != 1 ] && python3 -c "import json,sys; sys.exit(0 if json.load(open(sys.argv[1]))['match'] else 1)" "$T.summary.json"; then
  rm -f "$T".{setup-probe,drive,tl}.json* "$T".{engine,frozen,cmp}.json "$T.stderr"
fi
echo "$ID rc=$rc" >> "$D/done.txt"
