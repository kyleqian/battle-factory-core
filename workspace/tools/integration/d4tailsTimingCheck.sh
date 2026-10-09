#!/bin/sh
# d4tails: d4aTimingCheck.ts over the d4tails windows (tools/integration/fixtures/d4tails/windows/*.json), one process per fixture (two fresh
# oracle runs each), P in parallel; summary of selected-phase px / other-phase ages. usage (from workspace/): OUT=<dir> P=8 sh tools/integration/d4tailsTimingCheck.sh
OUT=${OUT:-/tmp/d4tails-check}; P=${P:-8}; mkdir -p "$OUT"; export OUT
ls tools/integration/fixtures/d4tails/windows/*.json | xargs -n 1 -P "$P" sh -c 'n=$(basename "$1" .json); node --experimental-strip-types --no-warnings tools/integration/d4aTimingCheck.ts "$OUT/$n.json" "$1" > "$OUT/$n.log" 2>&1; echo "$? $1" >> "$OUT/exit.txt"' sh
echo "fixtures $(ls tools/integration/fixtures/d4tails/windows/*.json | wc -l | tr -d ' ') nonzero-exit $(grep -vc '^0 ' "$OUT/exit.txt")"
