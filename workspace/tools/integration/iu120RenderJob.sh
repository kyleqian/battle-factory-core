#!/bin/sh
# iu120RenderJob.sh <tree-workspace> <out-dir> <tag> <battle> <move> <side>: one idle94RouteRender.ts row log (docs/iu120-universal-rows.md).
cd "$1" && node --experimental-strip-types --no-warnings tools/integration/idle94RouteRender.ts --seed="$4" --streak=$(( ($4 * 11) % 49 )) \
  --move="$5" --side="$6" --out="$2/$3-b$4-$5-$6.json" > /dev/null
