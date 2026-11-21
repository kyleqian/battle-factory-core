#!/bin/bash
# fsc2m: <outdir> <case> <on|off> <policy> [frames]: per-frame probe + sound replay of one lab (labs from fsc2mLabs.py in <outdir>/labs).
set -e
cd "$(dirname "$0")/../.."
E=$1; C=$2; S=$3; P=$4; N=${5:-640}; T=$(echo "$P" | tr ':' '_')
python3 tools/run-mgba-probe.py "$E/r-$C-$S-$T.json" -- python3 tools/integration/fsc2mProbe.py "$E/labs/fsc2m-$C-$S.json" "$S" "$E/r-$C-$S-$T.json" "$P" "$N" >/dev/null
python3 tools/integration/fsc2mReplay.py "$E/labs/fsc2m-$C-$S.json" "$E/r-$C-$S-$T.json" "$E/labs/rp-$C-$S-$T.json"
python3 tools/run-mgba-probe.py "$E/s-$C-$S-$T.json" -- python3 tools/audio/soundEventProbe.py "$E/s-$C-$S-$T.json" lab "$E/labs/rp-$C-$S-$T.json" --profile "$S" --fast >/dev/null
