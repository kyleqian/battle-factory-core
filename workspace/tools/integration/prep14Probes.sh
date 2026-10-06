#!/bin/sh
# prep14: direct-mGBA Random2 attribution probes (random2RouteProbe.py --lab --step-sample 0 --step-anim), 2 fresh processes per scenario, run in parallel.
# usage (workspace root): tools/integration/prep14Probes.sh OUTDIR key...   key = scenario basename without .json (mechanic-*/prep14-*)
PY=${MGBA_PY:-/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python}
OUT=${1:-/tmp/p14}; shift; mkdir -p "$OUT"
for k in "$@"; do for r in 1 2; do echo "$k $r"; done; done | xargs -P ${JOBS:-12} -n 2 sh -c \
 'python3 tools/run-mgba-probe.py "'$OUT'/$0-r$1.json" -- '$PY' tools/integration/random2RouteProbe.py tools/battle-lab/$0.json "'$OUT'/$0-r$1.json" --lab --step-sample 0 --step-anim >/dev/null 2>&1'
for k in "$@"; do python3 - "$OUT/$k-r1.json" "$OUT/$k-r2.json" "$k" <<'PYEOF'
import json, sys
try: a, b = (json.load(open(p)) for p in sys.argv[1:3])
except Exception as e: print(sys.argv[3], "MISSING", e); sys.exit()
diff = [k for k in a if a[k] != b[k]]
print(sys.argv[3], "identical (all fields except finalStateSha1)" if diff in ([], ["finalStateSha1"]) else f"DIFFER {diff}", "| runsSha1", a["runsSha1"][:12])
PYEOF
done
