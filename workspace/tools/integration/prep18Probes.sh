#!/bin/sh
# prep18: direct-mGBA Random2 attribution probe of each move's accepted staged scenario, twice from fresh processes, cmp'd.
# usage: tools/integration/prep18Probes.sh OUTDIR [name ...]   (run from workspace/; scenarios: tools/integration/prep18Scenarios.sh table)
set -e
PY=${MGBA_PY:-/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python}
OUT=${1:-/tmp/p18}; shift || true
mkdir -p "$OUT"
LAB=tools/battle-lab
scen() { case $1 in
  dig) echo $LAB/mechanic-dig-player-vibrava-opponent-chansey.json;;
  dig-opp) echo $LAB/mechanic-dig-opponent-vibrava-player-chansey.json;;
  megahorn) echo $LAB/mechanic-megahorn-player-seaking-opponent-onix.json;;
  megahorn-opp) echo $LAB/mechanic-megahorn-opponent-seaking-player-onix.json;;
  will-o-wisp) echo $LAB/mechanic-will-o-wisp-player-shuppet-opponent-shuckle.json;;
  will-o-wisp-opp) echo $LAB/mechanic-will-o-wisp-opponent-shuppet-player-shuckle.json;;
  fury-cutter) echo $LAB/mechanic-fury-cutter-player-grovyle-opponent-blissey.json;;
  fury-cutter-opp) echo $LAB/mechanic-fury-cutter-opponent-grovyle-player-blissey.json;;
  return) echo $LAB/mechanic-return-player-dragonair-opponent-onix.json;;
  return-weak) echo $LAB/mechanic-return-weak-player-dragonair-opponent-onix.json;;
  return-medium) echo $LAB/mechanic-return-medium-player-dragonair-opponent-onix.json;;
  return-strong) echo $LAB/mechanic-return-strong-player-dragonair-opponent-onix.json;;
  pursuit) echo $LAB/mechanic-pursuit-player-beedrill-opponent-shuckle.json;;
  alt-*) ls $LAB/prep18-${1#alt-}-alt-*.json | head -1;;
esac; }
for m in "$@"; do
  s=$(scen $m)
  for r in 1 2; do
    python3 tools/run-mgba-probe.py "$OUT/$m-r$r.json" -- $PY tools/integration/random2RouteProbe.py "$s" "$OUT/$m-r$r.json" --lab --step-sample 0 --step-anim >/dev/null 2>&1
  done
  python3 - "$OUT/$m-r1.json" "$OUT/$m-r2.json" "$m" <<'PYEOF'
import json, sys
a, b = (json.load(open(p)) for p in sys.argv[1:3])
diff = [k for k in a if a[k] != b[k]]
print(sys.argv[3], "identical (all fields except finalStateSha1)" if diff in ([], ["finalStateSha1"]) else f"DIFFER {diff}", "| runsSha1", a["runsSha1"][:12])
PYEOF
done
