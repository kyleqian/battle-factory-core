#!/usr/bin/env bash
# aud243d: the census ROM replay chain for one seed/scene (docs/aud243d-rom-driver.md). Usage: tools/audio/romDriveSeed.sh SEED on|off OUTDIR
# request -> ROM setup -> engine replay (decisions) -> closed-loop ROM drive (frozen trace) -> romStateTimeline on the frozen trace -> compare. Prints one JSON summary line.
set -euo pipefail
S=$1; SC=$2; D=$3; mkdir -p "$D"; T="$D/$S-$SC"
# opl3: REPLAY_LEVEL=open drives the seed's census battle at Open Level (docs/opl3-open-level-rom-replay.md); its files are SEED-SCENE-open.*. Default 50, unchanged.
LV=${REPLAY_LEVEL:-50}
case "$LV" in 50) ;; open) T="$T-open" ;; *) echo "REPLAY_LEVEL must be 50 or open, got $LV" >&2; exit 2 ;; esac
export ROM_REPLAY_LEVEL=$LV
NODE="node --experimental-strip-types --no-warnings tools/integration/soundCensusRomReplay.ts"
PROBE="python3 tools/run-mgba-probe.py"
rm -f "$T".{setup-probe,setup,drive,tl}.json* "$T".{req,engine,frozen,cmp}.json
$NODE request --seed="$S" --scene="$SC" --out="$T.req.json"
$PROBE "$T.setup-probe.json" -- python3 tools/audio/soundEventProbe.py "$T.setup-probe.json" lab "$T.req.json" --profile "$SC" --frames 1 --setup-out "$T.setup.json" >/dev/null 2>&1
$NODE replay --seed="$S" --scene="$SC" --setup="$T.setup.json" --out="$T.engine.json"
$PROBE "$T.drive.json" -- python3 tools/audio/soundEventProbe.py "$T.drive.json" lab "$T.req.json" --profile "$SC" --drive "$T.engine.json" --drive-out "$T.frozen.json" >/dev/null 2>&1
$PROBE "$T.tl.json" -- python3 tools/audio/romStateTimeline.py "$T.tl.json" "$T.frozen.json" --profile "$SC" >/dev/null 2>&1
$NODE compare --seed="$S" --scene="$SC" --engine="$T.engine.json" --rom="$T.tl.json" --out="$T.cmp.json" >/dev/null
python3 - "$T" <<'PY'
import json, sys
t = sys.argv[1]
e, d, c, tl = (json.load(open(f"{t}.{k}.json")) for k in ("engine", "drive", "cmp", "tl"))
dr = d["drive"]
print(json.dumps({"seed": e["seed"], "scene": e["scene"], **({"lvlMode": e["lvlMode"]} if "lvlMode" in e else {}), "engineError": e["error"], "engineDecisions": len(e["decisions"]), "drive": {k: dr[k] for k in ("stop", "frames", "decisionsConsumed", "outcome")},
                  "frozenTimelineEqualsDrive": dr["timeline"] == tl["rows"], "matched": c["matched"], "engineStates": c["engineRows"] - 1, "divergence": c["divergence"]}))
PY
