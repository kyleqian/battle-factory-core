#!/bin/sh
# usage: liveFixtureBatch.sh <evidence-dir> <summary-dir> <fixture.json>...   (4 parallel, 2 fresh runs each, foreground)
ev="$1"; out="$2"; shift 2; mkdir -p "$out"
printf '%s\n' "$@" | xargs -P 4 -n 1 sh tools/integration/liveFixtureOne.sh "$ev" "$out"
node -e '
const fs=require("fs"),d=process.argv[1];const res={};
for(const f of fs.readdirSync(d).filter(x=>x.endsWith(".out"))){try{const j=JSON.parse(fs.readFileSync(d+"/"+f,"utf8"));res[f.slice(0,-4)]={rows:j[0].rows,residual:j.map(r=>r.residualPixels),exactRows:j.map(r=>r.exactRows)}}catch(e){res[f.slice(0,-4)]={error:fs.readFileSync(d+"/"+f.replace(".out",".err"),"utf8").slice(-300)}}}
fs.writeFileSync(d+"/summary.json",JSON.stringify(res,null,1));console.log(JSON.stringify(res))' "$out"
