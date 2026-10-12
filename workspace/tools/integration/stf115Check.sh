#!/bin/sh
# stf115 (docs/stf115-struggle-declines.md): audit20Check.ts (production render of every live body's full dense window, two FRESH direct-mGBA
# probes per scenario, r1 == r2) for every scenario of a fixture dir, IN a given tree (a git-archive copy, patched or not), 6 in parallel.
# usage (from workspace/): [STF115_CHECK=audit21Check] sh tools/integration/stf115Check.sh <fx-dir> <tree-dir> <fresh-check-dir>
# STF115_CHECK=audit21Check renders aud110Align.py windows (Taunt / Harden / Swagger at production's accepted start; aud110 s1).
set -e
FX=$(cd "$1" && pwd); TREE=$(cd "$2" && pwd); OUT=$3
[ ! -e "$OUT" ] || { echo "$OUT exists (need a fresh dir)" >&2; exit 2; }
mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd)
ls "$FX"/*.json | sed 's/-c[0-9]*\.json$//' | sort -u | xargs -n 1 basename > "$OUT/names.txt"
cd "$TREE"
C=${STF115_CHECK:-audit20Check} FX=$FX OUT=$OUT xargs -n 1 -P 6 sh -c 'node --experimental-strip-types --no-warnings tools/integration/$C.ts "$FX" "$0" "$OUT/check-$0.json" > "$OUT/$0.log" 2>&1 || echo "FAILED $0"' < "$OUT/names.txt"
