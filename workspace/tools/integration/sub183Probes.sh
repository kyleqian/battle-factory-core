#!/bin/sh
# sub183: ROM frames (probe rows + raw RGB) of the Substitute turn, each scenario twice from fresh processes, both scenes (direct mGBA only).
# usage (from workspace/): OUT=<fresh dir> sh tools/integration/sub183Probes.sh   (SUB183_MAX_FRAMES caps each trace; default 700)
set -e
[ -n "$OUT" ] || { echo "OUT=<dir> required"; exit 2; }
PY=${SUB183_PY:-/srv/pokebench/vendor/mgba-venv/bin/python}
export PYTHONPATH=${SUB183_PYTHONPATH:-/srv/pokebench/vendor/libmgba-py} SUB183_MAX_FRAMES=${SUB183_MAX_FRAMES:-700}
mkdir -p "$OUT"
# name:mode
JOBS=${JOBS:-"sub157-off-opponent-persian-slowbro:off prep37-off-player-persian-slowbro:off prep37-on-opponent-persian-slowbro:on prep37-on-player-persian-slowbro:on"}
for j in $JOBS; do
  s=${j%:*}; m=${j#*:}
  for r in 1 2; do
    o="$OUT/$s-$m-r$r.json"
    [ ! -e "$o" ] || { echo "refusing to reuse $o"; exit 2; }
    ( python3 tools/run-mgba-probe.py "$o" -- "$PY" tools/integration/sub183RomFrames.py tools/battle-lab/$s.json $m "$o" > "$o.out" 2>&1 || echo "FAIL $s $m r$r" ) &
  done
done
wait
for f in "$OUT"/*-r1.json; do [ -s "$f" ] || { echo "EMPTY $f"; exit 1; }; cmp -s "$f" "${f%-r1.json}-r2.json" || { echo "DIFF $f"; exit 1; }; zcat "$f.rgb.gz" | sha256sum | cut -c1-16 > "$f.sha"; zcat "${f%-r1.json}-r2.json.rgb.gz" | sha256sum | cut -c1-16 | cmp -s - "$f.sha" || { echo "RGB DIFF $f"; exit 1; }; done
echo "probes: r1 == r2 byte-identical (rows + rgb) ($(ls "$OUT"/*-r1.json | wc -l | tr -d ' ') scenarios)"
