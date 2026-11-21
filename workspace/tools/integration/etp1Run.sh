#!/usr/bin/env bash
# etp1: ROM rows + engine commands for end-turn print labs, both scenes. usage: etp1Run.sh OUTDIR lab-name-without-scene ... (reads tools/battle-lab/<name>-{on,off}.json)
set -uo pipefail
cd "$(dirname "$0")/../.."
OUT=$1; shift
mkdir -p "$OUT"
for N in "$@"; do for S in on off; do
  L="tools/battle-lab/$N-$S.json"; F="$OUT/$N-$S"
  rm -f "$F.rom.json" "$F.rom.json.log"
  python3 tools/run-mgba-probe.py "$F.rom.json" -- python3 tools/integration/hcr3mProbe.py "$F.rom.json" "$L" --profile "$S" >/dev/null 2>&1 &
  node --experimental-strip-types --no-warnings tools/integration/etp1Engine.ts "$N-$S" "$F.eng.json" --scene "$S" 2>&1 | grep -m3 Error
  wait
  rm -f "$F.rom.json.log"
  python3 tools/integration/etp1Table.py "$F.rom.json" "$F.eng.json" > "$F.table.txt"
done; done
