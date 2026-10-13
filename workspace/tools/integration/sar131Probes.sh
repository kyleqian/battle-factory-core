#!/bin/sh
# sar131Probes.sh <out-dir> <scenario-dir>   (run from workspace/ or an archive copy's workspace/)
# Direct mGBA only (stat101Probe.py, the dense per-row probe with STAT101_DUMP window frames), Scene ON (battle-scene-on), every scenario
# twice in fresh processes: r1 (with the window dump) then r2 (no dump); never the same job twice in parallel. A crashed job reruns once
# (stat101Job.sh). Writes <out-dir>/probes/r{1,2}/<scenario>-on.json, <out-dir>/dump/*.npz, <out-dir>/done.
set -eu
OUT=$1; SC=$2
mkdir -p "$OUT/probes/r1" "$OUT/probes/r2" "$OUT/dump"
export STAT101_PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
for f in "$SC"/*.json; do echo "$OUT/probes/r1 on $f"; done | STAT101_DUMP="$OUT/dump" xargs -n 3 -P 7 sh tools/integration/stat101Job.sh
for f in "$SC"/*.json; do echo "$OUT/probes/r2 on $f"; done | xargs -n 3 -P 7 sh tools/integration/stat101Job.sh
n=0; t=0
for f in "$OUT"/probes/r1/*.json; do t=$((t + 1)); cmp -s "$f" "$OUT/probes/r2/$(basename "$f")" && n=$((n + 1)); done
echo "probes r1 == r2: $n / $t" > "$OUT/done"
