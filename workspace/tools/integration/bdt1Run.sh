#!/usr/bin/env bash
# NOTE: superseded for new work by tools/integration/labCompare.sh (one ROM probe + engine + aligned SE table tool); kept because receipts reference it.
# bdt1: per battle lab (tools/battle-lab/<name>.json): the ROM's SEs (soundEventProbe lab, hybrid), the ROM script rows (hcr3mProbe) and the engine's commands / SEs (b4mEngine.ts), then bdt1Table.py.
# Usage: tools/integration/bdt1Run.sh OUTDIR FRAMES lab-name [lab-name ...]   (ROM files are reused when present; ENGINE_ONLY=1 re-runs only the engine side)
set -uo pipefail
D=$1; F=$2; shift 2; mkdir -p "$D"
for N in "$@"; do
  if [ -z "${ENGINE_ONLY:-}" ]; then
    [ -s "$D/$N.rom.json" ] || python3 tools/run-mgba-probe.py "$D/$N.rom.json" -- python3 tools/integration/hcr3mProbe.py "$D/$N.rom.json" "tools/battle-lab/$N.json" --profile on >/dev/null 2>&1 || echo "rom probe failed: $N"
    [ -s "$D/$N.se.json" ] || AUDIO_PROBE_EXTRA_HOOKS=BlendPalette python3 tools/run-mgba-probe.py "$D/$N.se.json" -- python3 tools/audio/soundEventProbe.py "$D/$N.se.json" lab "tools/battle-lab/$N.json" --frames "$F" --profile on --fast --compact >/dev/null 2>&1 || echo "se probe failed: $N"
  fi
  node --experimental-strip-types --no-warnings tools/integration/b4mEngine.ts "$N" "$D/$N.eng.json" 2>&1 | grep -m1 Error
  python3 tools/integration/bdt1Table.py "$D" "$N" ${SPAN:+--span $SPAN}
done
