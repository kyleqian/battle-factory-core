#!/bin/sh
# Live audit 16: VBlank-write counter evidence (audit15VblankProbe.py: IO vs buffered BLDCNT / BLDALPHA / DISPCNT, sGpuRegWaitingList,
# gMain.vblankCounter1 / 2 per frame) around each one-row residual and the same row of its 0-px control, two fresh processes each.
#   sh tools/integration/audit16Vblank.sh <out-dir>   then   python3 tools/integration/audit16VblankTable.py <out-dir>
# Spec: <scenario> <activation frame> <row>; frames activation+row-3 .. activation+row+3 are recorded.
OUT=$1; mkdir -p "$OUT"
export PYTHONPATH=${PYTHONPATH:-/Users/kyle/Developer/pokebench/vendor/libmgba-py}
PY=${PY:-/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python}
S=tools/integration/fixtures/audit-16/scenarios
for spec in "conf-light-screen-ply 1677 59" "future-sight-light-screen-ply 332 59" "prz-light-screen-ply 1581 19" "ctl-light-screen-ply 73 59" \
            "ctl-light-screen-ply 73 19" "slp-light-screen-ply 1655 59" "slp-light-screen-ply 1655 19" "conf-light-screen-opp 0 59" \
            "ctl-light-screen-opp 77 59" "ctl-double-team-ply 73 2" "ctl-double-team-opp 77 2" "i152-arbok-double-team 75 2" \
            "i152-arbok-swift 75 2" "tools/integration/fixtures/prep7-scenarios/mechanic-double-team-onix-grovyle-firstbody.json 70 2" \
            "pair2-conf-light-screen-opp 931 19" "pair2-conf-light-screen-opp 931 59" "pair2-future-sight-light-screen-opp 324 59" \
            "pair2-seismic-toss-light-screen-opp 446 59" "pair2-ctl-light-screen-pla 75 59" "pair2-slp-light-screen-pla 1658 59" \
            "pair2-ctl-light-screen-opp 79 59" "pair2-ctl-light-screen-opp 79 19" "pair2-prz-light-screen-pla 1582 59"; do
  set -- $spec
  [ "$2" = 0 ] && set -- "$1" "$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['denseWindow']['startFrame'])" tools/integration/fixtures/audit-16/fixtures/$1-c0.json)" "$3"
  case $1 in */*) SC=$1; set -- "$(basename "$1" .json)" "$2" "$3";; *) SC=$S/$1.json;; esac
  for r in 1 2; do
    ( python3 tools/run-mgba-probe.py "$OUT/$1-row$3-r$r.json" -- $PY tools/integration/audit15VblankProbe.py "$SC" "$OUT/$1-row$3-r$r.json" \
        $(($2 + $3 - 3)) $(($2 + $3 + 3)) > /dev/null 2>&1; rm -f "$OUT/$1-row$3-r$r.json.log"; echo "$2" > "$OUT/$1-row$3.activation" ) &
  done
done
wait
