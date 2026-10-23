#!/bin/bash
# lsd198: ROM frames of the Scene ON Leech Seed drain (both orientations, each twice from fresh processes), then the dense production-vs-ROM compare of
# lsd198DrainDense.ts for both orientations on r1 and r2 (the two outputs must be identical). usage (from workspace/): OUT=<fresh dir> bash tools/integration/lsd198Probes.sh
set -e
[ -n "$OUT" ] || { echo "OUT=<dir> required"; exit 2; }
P=mechanic-leech-seed-player-exeggcute-opponent-onix; O=mechanic-leech-seed-opponent-exeggcute-player-onix
JOBS="tools/battle-lab/$P.json:on tools/battle-lab/$O.json:on" bash tools/integration/lsd194Probes.sh
python3 tools/integration/lsd186RomRuns.py "$OUT/$P.json-on-r1.json" "$OUT/$O.json-on-r1.json" > "$OUT/runs.json"
for c in "player 57 $P p" "opponent 4 $O o"; do
  set -- $c
  for r in 1 2; do
    node --experimental-strip-types --no-warnings tools/integration/lsd198DrainDense.ts "$OUT/runs.json" "$3.json-on-r1.json" "$OUT/$3.json-on-r$r.json.rgb.gz" "$OUT/$4-on-r$r.json" --side=$1 --seed=$2 | cut -c1-400
  done
  cmp "$OUT/$4-on-r1.json" "$OUT/$4-on-r2.json" && echo "$4: dense r1 == r2"
done
