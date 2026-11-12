#!/bin/sh
# tmr136Probes.sh <out-dir> <scenario.json>...   (run from workspace/ or an archive copy's workspace/)
# Direct mGBA only (tmr136Probe.py = prep48Probe.py with a 12-frame tail), Scene ON, each scenario twice in fresh processes: r1 for every
# scenario in parallel, then r2 (never the same job twice in parallel). A crashed job (run-mgba-probe.py exit != 0) reruns once.
# Writes <out-dir>/r{1,2}/<name>/p.json + rgb/%05d.rgb and <out-dir>/done ("probes r1 == r2: n / t" over the per-frame sha256 lists).
set -u
OUT=$1; shift
PY=${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python
export PYTHONPATH="${PYTHONPATH:-${POKEBENCH_VENDOR_DIR:-../../vendor}/libmgba-py}"
job() {
  d="$OUT/$1/$(basename "$2" .json)"; rm -rf "$d"; mkdir -p "$d"
  python3 tools/run-mgba-probe.py "$d/p.json" -- "$PY" tools/integration/tmr136Probe.py "$2" "$d/p.json" "$d/rgb" > "$d/log.txt" 2>&1 \
    || { rm -rf "$d"; mkdir -p "$d"; python3 tools/run-mgba-probe.py "$d/p.json" -- "$PY" tools/integration/tmr136Probe.py "$2" "$d/p.json" "$d/rgb" > "$d/log.txt" 2>&1; }
}
for run in r1 r2; do
  for f in "$@"; do job "$run" "$f" & done
  wait
done
n=0; t=0
for f in "$@"; do
  b=$(basename "$f" .json); t=$((t + 1))
  python3 -c 'import json,sys; a,b=(json.load(open(p)) for p in sys.argv[1:]); sys.exit(0 if a["frames"]==b["frames"] and a["bodies"]==b["bodies"] else 1)' \
    "$OUT/r1/$b/p.json" "$OUT/r2/$b/p.json" && n=$((n + 1))
done
echo "probes r1 == r2: $n / $t" > "$OUT/done"; cat "$OUT/done"
