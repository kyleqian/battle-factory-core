#!/bin/sh
# d4tails (S10A D4 accounting of the short-body / early fade-restore class): main-loop pass counters (speciesAudit2Counters.py, the issue151Counters.sh
# instrument) for battle-lab scenarios, 2 fresh direct-mGBA processes each, then d4tailsCounters.py reports per animation body of the named moves the body
# rows (activation .. last active) and the lag frames (playTime pass delta 0) as body ages, and r0 == r1.
# usage: d4tailsCounters.sh <outDir> <parallel> <out.json> <scenario.json>...
cd "$(dirname "$0")/../.." || exit 1
export PYTHONPATH=${PYTHONPATH:-${POKEBENCH_VENDOR_DIR:-../../vendor}/libmgba-py}
VPY=${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python
OUT=$1; P=$2; JSON=$3; shift 3; mkdir -p "$OUT"
for scen in "$@"; do
  stem=$(basename "$scen" .json)
  for r in 0 1; do echo "$scen $OUT/$stem.run$r.json"; done
done | xargs -P "$P" -n 2 sh -c 'python3 tools/run-mgba-probe.py "$2" -- '"$VPY"' tools/integration/speciesAudit2Counters.py "$1" "$2" >/dev/null 2>&1 || [ -s "$2" ] || echo "probe failed $2"' _
python3 -I tools/integration/d4tailsCounters.py "$OUT" "$JSON" "$@"
