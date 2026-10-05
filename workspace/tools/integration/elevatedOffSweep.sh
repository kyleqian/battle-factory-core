#!/bin/sh
# usage (workspace root): sh tools/integration/elevatedOffSweep.sh <outDir> [trace...]   (default: all tools/compare/traces/*.json)
# App-frame hashes per trace on the CURRENT tree; run once clean and once with the patch applied, then elevatedOffDiff.mjs.
out=$1; shift; [ $# -eq 0 ] && set -- tools/compare/traces/*.json
rm -rf "$out"; mkdir -p "$out"
printf '%s\n' "$@" | xargs -n 12 -P 4 node --experimental-strip-types --no-warnings tools/integration/elevatedOffAppSweep.ts "$out"
