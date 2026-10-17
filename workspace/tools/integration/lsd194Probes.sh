#!/bin/bash
# lsd194: ROM frames (probe rows + raw RGB) of the Leech Seed turn-end drain, each scenario twice from fresh processes, both scenes,
# at most 2 concurrent direct-mGBA processes. usage (from workspace/): OUT=<fresh dir> sh tools/integration/lsd194Probes.sh
set -e
[ -n "$OUT" ] || { echo "OUT=<dir> required"; exit 2; }
PY=${LSD194_PY:-/srv/pokebench/vendor/mgba-venv/bin/python}
export PYTHONPATH=${LSD194_PYTHONPATH:-/srv/pokebench/vendor/libmgba-py} SUB183_MAX_FRAMES=${SUB183_MAX_FRAMES:-1000}
mkdir -p "$OUT"
# scenario:mode
JOBS=${JOBS:-"$(for s in off108-snore-ply-primeape-snorlax off108-bulk-up-ply-primeape-onix mechanic-hit-chain-crit-off scratch-message-hold-dense-probe gate6-ohko-hit-off; do for m in off on; do printf "tools/integration/fixtures/lsd194/scenarios/$s.json:$m "; done; done)"}
LIST="$OUT/.jobs"; : > "$LIST"
for j in $JOBS; do for r in 1 2; do echo "${j%:*} ${j#*:} $r" >> "$LIST"; done; done
run_one() {
  s=$1; m=$2; r=$3; o="$OUT/$(basename $s)-$m-r$r.json"
  case $s in */*) sp=$s;; *) sp=tools/battle-lab/$s.json;; esac
  [ ! -e "$o" ] || { echo "refusing to reuse $o"; exit 2; }
  python3 tools/run-mgba-probe.py "$o" -- "$PY" tools/integration/sub183RomFrames.py "$sp" $m "$o" > "$o.out" 2>&1 || echo "FAIL $s $m r$r"
}
while read -r s m r; do
  run_one "$s" "$m" "$r" &
  while [ "$(jobs -r | wc -l)" -ge 2 ]; do sleep 1; done
done < "$LIST"
wait
for f in "$OUT"/*-r1.json; do [ -s "$f" ] || { echo "EMPTY $f"; exit 1; }; cmp -s "$f" "${f%-r1.json}-r2.json" || { echo "DIFF $f"; exit 1; }; zcat "$f.rgb.gz" | sha256sum | cut -c1-16 > "$f.sha"; zcat "${f%-r1.json}-r2.json.rgb.gz" | sha256sum | cut -c1-16 | cmp -s - "$f.sha" || { echo "RGB DIFF $f"; exit 1; }; done
echo "probes: r1 == r2 byte-identical (rows + rgb) ($(ls "$OUT"/*-r1.json | wc -l | tr -d ' ') scenarios)"
