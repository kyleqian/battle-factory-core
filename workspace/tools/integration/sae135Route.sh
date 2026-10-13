#!/bin/sh
# sae135Route.sh <tree-workspace> <seed:slot:on> <out.json>   (one sar131RouteRender.ts route in one tree; sae135Run.sh step 5)
cd "$1" && node --experimental-strip-types --no-warnings tools/integration/sar131RouteRender.ts --routes=$2 --out=$3 > $3.log 2>&1
