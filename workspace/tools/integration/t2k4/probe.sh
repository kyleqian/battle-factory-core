#!/usr/bin/env bash
# usage: probe.sh [--force] SEED SCENE DECISION [SPAN]  -> $T2K4_DIR/p/SCENE/ (ROM probe + engine cmdtrace + hcr3mCmp window); run from workspace/
# Inputs: $T2K4_DIR/t2/SEED-SCENE.{drive,snd,frozen,setup}.json (override the dir with T2K4_T2_DIR). SPAN default -40:700 (frames from the commit; use -40:1600 for late windows).
# An existing $T2K4_DIR/p/SCENE/SEED-on.rom.json is a capture from a possibly different decision: without --force this stops (exit 2) and says so; --force re-captures it.
set -e
trap 'echo "probe.sh: stopped at line $LINENO (exit $?): $BASH_COMMAND" >&2' ERR
FORCE=; [ "$1" = --force ] && { FORCE=--force; shift; }
[ $# -ge 3 ] || { sed -n 2,4p "$0" >&2; exit 2; }
S=$1; SC=$2; DEC=$3; SPAN=${4:--40:700}; T=${T2K4_DIR:-.integration/evidence/t2k4}; SRC=${T2K4_T2_DIR:-$T/t2}; D=$T/p/$SC
for k in drive snd frozen setup; do
  [ -f "$SRC/$S-$SC.$k.json" ] || { echo "probe.sh: missing $SRC/$S-$SC.$k.json (needs the rescoreAll.sh dir; set T2K4_DIR=EVIDENCE_DIR or T2K4_T2_DIR=DIR holding SEED-SCENE.{drive,snd,frozen,setup}.json)" >&2; exit 2; }
done
if [ -e "$D/$S-on.rom.json" ] && [ -z "$FORCE" ]; then
  echo "probe.sh: stopped: ROM capture $D/$S-on.rom.json already exists (its --from window belongs to the decision it was made for; run-mgba-probe refuses stale output); rerun with --force to overwrite it" >&2; exit 2
fi
mkdir -p "$D"
for k in drive snd frozen setup; do cp "$SRC/$S-$SC.$k.json" "$D/$S-on.$k.json"; done
FROM=$(python3 -c "import json;a=json.load(open('$D/$S-on.drive.json'))['drive']['anchors'];print(max(0,a[$DEC]['commitFrame']-60))")
nice -n 10 node --experimental-strip-types --no-warnings tools/integration/soundCensusRomReplay.ts replay --seed=$S --scene=$SC --setup=$D/$S-on.setup.json --romdrive=$D/$S-on.drive.json --cmdtrace=1 --out=$D/$S-on.eng-cmd.json >/dev/null
nice -n 10 python3 tools/run-mgba-probe.py $FORCE $D/$S-on.rom.json -- python3 tools/integration/hcr3mProbe.py $D/$S-on.rom.json $D/$S-on.frozen.json --profile $SC --from $FROM > $D/$S.probe.log 2>&1 || { echo "probe.sh: ROM probe failed; see $D/$S.probe.log:" >&2; tail -3 "$D/$S.probe.log" >&2; exit 1; }
python3 tools/integration/hcr3mCmp.py $D $S --decision $DEC --span $SPAN > $D/$S-d$DEC.cmp.txt
wc -l $D/$S-d$DEC.cmp.txt
HI=${SPAN#*:}; LATE=$(python3 tools/integration/hcr3mCmp.py $D $S --decision $DEC --span $((HI+1)):1000000 | tail -n +2 | wc -l)
echo "probe.sh: span $SPAN (frames from the commit); $LATE more rows after frame $HI"; [ "$LATE" -eq 0 ] || echo "probe.sh: late window cut off; rerun with SPAN ${SPAN%%:*}:$((HI+900))"
