#!/bin/sh
# rst139Probes.sh <out-dir> <scenario-dir>   (run from workspace/ or an archive copy's workspace/)
# Direct mGBA only (rst139Probe.py), Scene ON, every scenario twice in fresh processes: r1 (with the full-frame dump) then r2 (no
# dump); never the same job twice in parallel; a crashed job reruns once (rst139Job.sh). Writes <out-dir>/probes/r{1,2}/*.json,
# <out-dir>/dump/*.npz, <out-dir>/done.
set -eu
OUT=$1; SC=$2
mkdir -p "$OUT/probes/r1" "$OUT/probes/r2" "$OUT/dump"
for f in "$SC"/*.json; do echo "$OUT/probes/r1 $f $OUT/dump"; done | xargs -n 3 -P 8 sh tools/integration/rst139Job.sh
for f in "$SC"/*.json; do echo "$OUT/probes/r2 $f"; done | xargs -n 2 -P 8 sh tools/integration/rst139Job.sh
n=0; t=0
for f in "$OUT"/probes/r1/*.json; do t=$((t + 1)); cmp -s "$f" "$OUT/probes/r2/$(basename "$f")" && n=$((n + 1)); done
echo "probes r1 == r2: $n / $t" > "$OUT/done"
