#!/usr/bin/env bash
# NOTE: superseded for new work by tools/integration/labCompare.sh (one ROM probe + engine + aligned SE table tool); kept because receipts reference it.
# b4m: ROM probe + engine commands + table for battle labs (tools/battle-lab/<name>.json). Usage: tools/integration/b4mRun.sh OUTDIR lab-name [lab-name ...]
set -uo pipefail
D=$1; shift; mkdir -p "$D"
for N in "$@"; do
  rm -f "$D/$N.rom.json" "$D/$N.rom.json.log" "$D/$N.eng.json"
  python3 tools/run-mgba-probe.py "$D/$N.rom.json" -- python3 tools/integration/hcr3mProbe.py "$D/$N.rom.json" "tools/battle-lab/$N.json" --profile on >/dev/null 2>&1 || echo "rom probe failed: $N"
  node --experimental-strip-types --no-warnings tools/integration/b4mEngine.ts "$N" "$D/$N.eng.json" 2>&1 | grep -m1 Error
  python3 tools/integration/b4mTable.py "$D" "$N" --span 0:0 | cut -c1-260
done
