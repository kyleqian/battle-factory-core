#!/bin/sh
# fa185: d4aTimingCheck.ts over the Faint Attack windows (tools/integration/fixtures/fa185/windows/*.json), one process per fixture (two fresh
# oracle runs each), P in parallel; selected-phase px / other-phase ages. usage (from workspace/): OUT=<dir> P=6 sh tools/integration/fa185TimingCheck.sh
OUT=${OUT:-/tmp/fa185-check}; P=${P:-6}; mkdir -p "$OUT"; export OUT; : > "$OUT/exit.txt"
ls tools/integration/fixtures/fa185/windows/*.json | xargs -n 1 -P "$P" sh -c 'n=$(basename "$1" .json); node --experimental-strip-types --no-warnings tools/integration/d4aTimingCheck.ts "$OUT/$n.json" "$1" > "$OUT/$n.log" 2>&1; echo "$? $1" >> "$OUT/exit.txt"' sh
echo "fixtures $(ls tools/integration/fixtures/fa185/windows/*.json | wc -l | tr -d ' ') nonzero-exit $(grep -vc '^0 ' "$OUT/exit.txt")"
