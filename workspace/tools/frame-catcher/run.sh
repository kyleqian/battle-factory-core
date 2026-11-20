#!/bin/sh
# Frame catcher (tools/frame-catcher/README.md): engine run, ROM run and compare for each trace, JOBS at a time.
#   tools/frame-catcher/run.sh OUTDIR TRACE.json [TRACE.json ...]
# env: GAME=<workspace whose src/ is played> (default: this workspace), JOBS (default 3), KEEP=1 keeps the frame stores.
# Run from workspace/. OUTDIR/<trace name>/report.md per battle, OUTDIR/summary.md over all of them.
set -eu
[ $# -ge 2 ] || { echo "usage: tools/frame-catcher/run.sh OUTDIR TRACE.json [TRACE.json ...]" >&2; exit 2; }
OUT=$(cd "$(dirname "$1")" && pwd)/$(basename "$1"); shift
mkdir -p "$OUT"
HERE=$(cd "$(dirname "$0")" && pwd)
WS=$(cd "$HERE/../.." && pwd)
GAME=${GAME:-$WS}
JOBS=${JOBS:-3}
one() {
  trace=$1
  name=$(basename "$trace" .json)
  dir="$OUT/$name"
  rm -rf "$dir"; mkdir -p "$dir/rom"
  start=$(date +%s)
  node --experimental-strip-types --no-warnings "$HERE/engineRun.mjs" "$trace" "$dir/engine" --game "$GAME" > "$dir/engine.log" 2>&1
  e=$(date +%s)
  (cd "$WS" && python3 tools/run-mgba-probe.py "$dir/rom/done.json" -- python3 tools/frame-catcher/romRun.py "$dir/engine" "$dir/rom") > "$dir/rom.log" 2>&1
  r=$(date +%s)
  python3 "$HERE/compare.py" "$dir" --title "$name" ${KEEP:+--keep-stores} > "$dir/compare.log" 2>&1
  c=$(date +%s)
  echo "{\"engineSeconds\": $((e - start)), \"romSeconds\": $((r - e)), \"compareSeconds\": $((c - r))}" > "$dir/times.json"
  echo "$name: $(tail -1 "$dir/compare.log") ($((c - start)) s)"
}
if [ "${FRAME_CATCHER_ONE:-}" = 1 ]; then one "$1"; exit; fi
for t in "$@"; do (cd "$(dirname "$t")" && echo "$(pwd)/$(basename "$t")"); done |
  FRAME_CATCHER_ONE=1 GAME="$GAME" xargs -P "$JOBS" -I{} sh "$0" "$OUT" {}
python3 "$HERE/summary.py" "$OUT"
