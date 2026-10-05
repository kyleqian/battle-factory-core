#!/bin/sh
# usage (workspace root): sh tools/integration/elevatedPostbodyRun.sh <tag> <tail> <opp|plr|all> <fixture.json>...
# dense harness (2 fresh direct-mGBA runs per fixture, retained RGB in /tmp/ep/<tag>/ev) then elevatedPostbodyCompare.ts -> /tmp/ep/<tag>/compare.json
tag=$1; tail=$2; win=$3; shift 3; d=/tmp/ep/$tag; rm -rf "$d"; mkdir -p "$d"
sh tools/integration/liveFixtureBatch.sh "$d/ev" "$d/sum" "$@" > "$d/sum.txt" 2>&1
EP_ROWS=1 node --experimental-strip-types --no-warnings tools/integration/elevatedPostbodyCompare.ts "$d/ev" "$tail" "$win" "$@" > "$d/compare.json"
node -e '
const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));
for(const r of j) console.log(r.fixture.padEnd(70),"run",r.run,"body",r.bodyRowsResidual,"post",r.postExact+"/"+r.postRows,"px",r.postRowsResidual,r.digest.slice(0,8));' "$d/compare.json"
