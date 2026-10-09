#!/bin/sh
# lsbz: d4aTimingCheck.ts over the lsbz windows (tools/integration/fixtures/lsbz/windows/<prefix>*.json), one process per fixture (two fresh
# oracle runs each), P in parallel. usage (from workspace/): OUT=<dir> P=8 sh tools/integration/lsbzTimingCheck.sh [prefix: light-screen | blizzard]
OUT=${OUT:-/tmp/lsbz-check}; P=${P:-8}; PREFIX=${1:-}; mkdir -p "$OUT"; export OUT; : > "$OUT/exit.txt"
ls tools/integration/fixtures/lsbz/windows/"$PREFIX"*.json | xargs -n 1 -P "$P" sh -c 'n=$(basename "$1" .json); node --experimental-strip-types --no-warnings tools/integration/d4aTimingCheck.ts "$OUT/$n.json" "$1" > "$OUT/$n.log" 2>&1; echo "$? $1" >> "$OUT/exit.txt"' sh
echo "fixtures $(ls tools/integration/fixtures/lsbz/windows/"$PREFIX"*.json | wc -l | tr -d ' ') nonzero-exit $(grep -vc '^0 ' "$OUT/exit.txt")"
