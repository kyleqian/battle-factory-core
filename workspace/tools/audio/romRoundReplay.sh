#!/usr/bin/env bash
# Round replay (docs/parity-mac/round-replay.md): one whole Battle Factory round on the real ROM and the engine's round orchestrator, compared at the start of
# every battle and turn by turn. Chain: request (battle number 0 of the challenge) -> tools/audio/romRoundDriver.py (lab staging of battle 1, then the ROM plays
# the round; at each battle start it runs the engine's `round` mode for the decisions) -> `round-compare`.
# Usage (cwd = workspace/): REPLAY_OUT=/abs/outdir tools/audio/romRoundReplay.sh SEED [POLICY [SWAP [CHALLENGE]]]
#   POLICY census (default) | ai-v1 | random-v1.  SWAP never (default) | weakest | random.  CHALLENGE 0..7 (0-based; default: the census mapping's challenge).
#   REPLAY_SCENE=on|off (default off). REPLAY_FRAME_BUDGET / REPLAY_DRIVE_FRAMES: engine frame budget / ROM frame cap per battle.
#   REPLAY_PROMPT_DELAY=K@N: wait K more frames at the swap prompt after battle N (0-based) before answering; the ID gets -dK@N.
#   ROM_REPLAY_SWAP_OVERRIDE=N:player|enemy: after battle N (0-based) cancel the swap (YES, then back out at that list); the ID gets -oN-LIST.
#   REPLAY_ROUNDS=R: R rounds back to back (the ROM plays the Lobby and each new draft; a lost round is followed by a new challenge); the ID gets -rR.
#   REPLAY_SYMBOLS=1: the player holds the silver Factory symbol (challenge 5's seventh battle is then gold Noland); the ID gets -gold.
# Writes OUTDIR/ID.cmp.json (ID = SEED-POLICY-SWAP[-cC][-on]), keeps OUTDIR/ID.drive.json and OUTDIR/ID.d/ (setups, engine.json), appends "ID rc=N" to done.txt.
# rc: 11 request, 14 ROM round drive, 16 compare.
set -uo pipefail
SC=${REPLAY_SCENE:-off}
D=${REPLAY_OUT:?set REPLAY_OUT to an absolute output directory}; mkdir -p "$D"
S=$1; P=${2:-census}; W=${3:-never}; C=${4:-${ROM_REPLAY_CHALLENGE:-}}
ID="$S-$P-$W"; [ -n "$C" ] && ID="$ID-c$C"; [ "$SC" = on ] && ID="$ID-on"; [ -n "${REPLAY_PROMPT_DELAY:-}" ] && ID="$ID-d$REPLAY_PROMPT_DELAY"; G=${REPLAY_SYMBOLS:-0}; [ "$G" = 1 ] && ID="$ID-gold"; [ -n "${ROM_REPLAY_SWAP_OVERRIDE:-}" ] && ID="$ID-o${ROM_REPLAY_SWAP_OVERRIDE/:/-}"; R=${REPLAY_ROUNDS:-1}; [ "$R" != 1 ] && ID="$ID-r$R"
T="$D/$ID"
export ROM_REPLAY_POLICY=$P ROM_REPLAY_SYMBOLS=$G ROM_REPLAY_ROUND=1 ROM_REPLAY_CHALLENGE=$C ROM_REPLAY_SWAP=$W
NODE="node --experimental-strip-types --no-warnings tools/integration/soundCensusRomReplay.ts"
PROBE="python3 tools/run-mgba-probe.py --max-log-bytes 8192"
rm -f "$T".{req,drive,cmp}.json "$T".drive.json.log; rm -rf "$T.d"
run() {
  $NODE request --seed="$S" --scene="$SC" --round=1 --out="$T.req.json" || return 11
  $PROBE "$T.drive.json" -- python3 tools/audio/romRoundDriver.py "$T.drive.json" "$T.req.json" --seed "$S" --profile "$SC" --policy "$P" --swap "$W" \
    --dir "$T.d" ${C:+--challenge "$C"} ${REPLAY_PROMPT_DELAY:+--prompt-delay "$REPLAY_PROMPT_DELAY"} --symbols "$G" --rounds "$R" ${REPLAY_DRIVE_FRAMES:+--frames "$REPLAY_DRIVE_FRAMES"} ${REPLAY_FRAME_BUDGET:+--frame-budget "$REPLAY_FRAME_BUDGET"} >/dev/null 2>&1 || return 14
  $NODE round-compare --seed="$S" --engine="$T.d/engine.json" --drive="$T.drive.json" --out="$T.cmp.json" >/dev/null || return 16
}
run 2> "$T.stderr"; rc=$?
echo "$ID rc=$rc" >> "$D/done.txt"
