#!/bin/sh
# dmg264: census 0..999 on the observation-only instrumented UNFIXED tree (tools/integration/dmg264Instrument.py), 25-seed parts through one pool; resumable (a finished part is skipped).
#   sh tools/integration/dmg264InstrumentedCensus.sh <tree> <outdir> <on|off>...      (DMG264_JOBS=5 default)
set -eu
TREE=$1; OUT=$2; shift 2; mkdir -p "$OUT/parts"; OUT=$(cd "$OUT" && pwd); : > "$OUT/jobs"
for scene in "$@"; do for p in $(seq 0 39); do [ -s "$OUT/parts/$scene-p$p.jsonl" ] || echo "$scene $p" >> "$OUT/jobs"; done; done
export TREE OUT
[ ! -s "$OUT/jobs" ] || xargs -P "${DMG264_JOBS:-5}" -L 1 sh -c 'a=$(($2 * 25)); b=$((a + 24)); rm -f "$OUT/parts/$1-p$2.events.jsonl"; cd "$TREE" && DMG264_LOG="$OUT/parts/$1-p$2.events.jsonl" node --max-old-space-size=4096 --experimental-strip-types --no-warnings tools/integration/lsd194Census.ts --seeds=$a..$b --scene="$1" --out="$OUT/parts/$1-p$2.jsonl.tmp" > "$OUT/parts/$1-p$2.log" 2>&1 && mv "$OUT/parts/$1-p$2.jsonl.tmp" "$OUT/parts/$1-p$2.jsonl" || echo "FAIL $1 p$2"' sh < "$OUT/jobs"
for scene in "$@"; do n=0; for p in $(seq 0 39); do [ -s "$OUT/parts/$scene-p$p.jsonl" ] && n=$((n + 1)); done; echo "$scene parts $n/40"; done
