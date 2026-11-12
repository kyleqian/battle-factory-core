#!/usr/bin/env bash
# One seed of the real-ROM replay, for bulk batches on the Mac (top layer). Same chain as workspace/tools/audio/romDriveSeed.sh
# (request -> ROM setup -> engine replay -> closed-loop ROM drive -> timeline -> compare), Scene OFF, with the probe wrapper's
# log cap lowered. Writes OUTDIR/SEED.summary.json and appends "SEED rc=N" to OUTDIR/done.txt (rc 12 = Brain battle, not drivable).
# Usage (cwd = workspace/): REPLAY_OUT=/abs/outdir ../tools/replay-batch/chain.sh SEED
set -uo pipefail
S=$1; SC=off
D=${REPLAY_OUT:?set REPLAY_OUT to an absolute output directory}; mkdir -p "$D"
T="$D/$S-$SC"
NODE="node --experimental-strip-types --no-warnings tools/integration/soundCensusRomReplay.ts"
PROBE="python3 tools/run-mgba-probe.py --max-log-bytes 8192"
run() {
  $NODE request --seed="$S" --scene="$SC" --out="$T.req.json" || return 11
  $PROBE "$T.setup-probe.json" -- python3 tools/audio/soundEventProbe.py "$T.setup-probe.json" lab "$T.req.json" --profile "$SC" --frames 1 --setup-out "$T.setup.json" >/dev/null 2>&1 || return 12
  $NODE replay --seed="$S" --scene="$SC" --setup="$T.setup.json" --out="$T.engine.json" || return 13
  $PROBE "$T.drive.json" -- python3 tools/audio/soundEventProbe.py "$T.drive.json" lab "$T.req.json" --profile "$SC" --drive "$T.engine.json" --drive-out "$T.frozen.json" >/dev/null 2>&1 || return 14
  $PROBE "$T.tl.json" -- python3 tools/audio/romStateTimeline.py "$T.tl.json" "$T.frozen.json" --profile "$SC" >/dev/null 2>&1 || return 15
  $NODE compare --seed="$S" --scene="$SC" --engine="$T.engine.json" --rom="$T.tl.json" --out="$T.cmp.json" >/dev/null || return 16
  python3 - "$T" > "$D/$S.summary.json" <<'PY' || return 17
import json, sys
t = sys.argv[1]
e, d, c, tl = (json.load(open(f"{t}.{k}.json")) for k in ("engine", "drive", "cmp", "tl"))
dr = d["drive"]
print(json.dumps({"seed": e["seed"], "scene": e["scene"], "engineError": e["error"], "engineDecisions": len(e["decisions"]), "drive": {k: dr[k] for k in ("stop", "frames", "decisionsConsumed", "outcome")},
                  "frozenTimelineEqualsDrive": dr["timeline"] == tl["rows"], "matched": c["matched"], "engineStates": c["engineRows"] - 1, "divergence": c["divergence"]}))
PY
}
run 2> "$D/$S.stderr"; rc=$?
echo "$S rc=$rc" >> "$D/done.txt"
