#!/bin/sh
# D4 timing regression over every timing fixture named by a receipt window with `selectedPhase` (run from workspace/): one d4aTimingCheck
# process per fixture (two fresh oracle runs each), P in parallel. usage: OUT=/tmp/d4a-all P=12 sh tools/integration/d4aRegressionAll.sh
OUT=${OUT:-/tmp/d4a-all}; P=${P:-12}; mkdir -p "$OUT"
python3 -I - > "$OUT/fixtures.txt" <<'PY'
import json, glob, os
fx = set()
for p in glob.glob("tools/integration/fixtures/*receipt*.json"):
    try: d = json.load(open(p))
    except Exception: continue
    ws = d.get("windows") if isinstance(d, dict) else d
    for w in ws if isinstance(ws, list) else []:
        if isinstance(w, dict) and "selectedPhase" in w and "fixture" in w and os.path.exists(w["fixture"]): fx.add(w["fixture"])
print("\n".join(sorted(fx)))
PY
export OUT
xargs -n 1 -P "$P" sh -c 'n=$(echo "$1" | tr "/" "_"); node --experimental-strip-types --no-warnings tools/integration/d4aTimingCheck.ts "$OUT/$n.json" "$1" > "$OUT/$n.log" 2>&1; echo "$? $1" >> "$OUT/exit.txt"' sh < "$OUT/fixtures.txt"
echo "fixtures $(wc -l < "$OUT/fixtures.txt") nonzero-exit $(grep -vc '^0 ' "$OUT/exit.txt")"
