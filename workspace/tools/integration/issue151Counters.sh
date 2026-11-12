#!/bin/sh
# issue151: main-loop pass counters (speciesAudit2Counters.py) for fixtures, 2 fresh direct-mGBA processes each; prints digest equality and lag frames
# (playTime pass delta 0) inside each fixture's dense window, as ages. usage: issue151Counters.sh <outDir> <parallel> <fixture.json>...
cd "$(dirname "$0")/../.." || exit 1
export PYTHONPATH=${PYTHONPATH:-${POKEBENCH_VENDOR_DIR:-../../vendor}/libmgba-py}
VPY=${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python
OUT=$1; P=$2; shift 2; mkdir -p "$OUT"
for fx in "$@"; do
  scen=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['scenario'])" "$fx"); stem=$(basename "$fx" .json)
  for r in 0 1; do echo "$scen $OUT/$stem.run$r.json"; done
done | xargs -P "$P" -n 2 sh -c 'python3 tools/run-mgba-probe.py "$2" -- '"$VPY"' tools/integration/speciesAudit2Counters.py "$1" "$2" >/dev/null 2>&1 || echo "probe failed $2"' _
for fx in "$@"; do
  stem=$(basename "$fx" .json)
  python3 - "$fx" "$OUT/$stem.run0.json" "$OUT/$stem.run1.json" <<'PY'
import hashlib, json, sys
fx = json.load(open(sys.argv[1])); w = fx["denseWindow"]; a, b = w["startFrame"], w["endFrame"]
runs = [json.load(open(p)) for p in sys.argv[2:4]]
dig = [hashlib.sha256(json.dumps(r["rows"]).encode()).hexdigest()[:16] for r in runs]
c = runs[0]["cols"].index("playTimeVBlanks"); r = runs[0]["rows"]
lag = [i for i in range(a, b + 2) if r[i][c] == r[i - 1][c]]
print(f"{sys.argv[1].split('/')[-1][:-5]}: window {a}-{b} digests {dig[0]} {dig[1]} identical {dig[0] == dig[1]} lag ages {[i - a for i in lag]}")
PY
done
