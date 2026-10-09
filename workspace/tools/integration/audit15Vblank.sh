#!/bin/sh
# Live audit 15: VBlank-write probe (audit15VblankProbe.py) for the Light Screen chain / control windows, two fresh processes each, then
# the per-row IO vs buffered BLDALPHA table (audit15VblankTable.py).   usage: sh tools/integration/audit15Vblank.sh <out-dir>
OUT=$1; mkdir -p "$OUT"
export PYTHONPATH=${PYTHONPATH:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
PY=${PY:-/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python}
S=tools/integration/fixtures/audit-15/scenarios
for spec in "double-team-light-screen-opp 449" "ctl-light-screen-opp 77" "double-team-light-screen-ply 453" "ctl-light-screen-ply 73" \
            "faint-attack-light-screen-ply 410"; do
  set -- $spec
  for r in 1 2; do
    ( python3 tools/run-mgba-probe.py "$OUT/$1-r$r.json" -- $PY tools/integration/audit15VblankProbe.py "$S/$1.json" "$OUT/$1-r$r.json" \
        $(($2 + 50)) $(($2 + 64)) > /dev/null 2>&1; rm -f "$OUT/$1-r$r.json.log" ) &
  done
done
wait
