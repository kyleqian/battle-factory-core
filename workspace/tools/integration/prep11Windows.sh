#!/bin/sh
# prep11: run each move's OWN accepted source probe (tools/compare/<move>Probe.py) on the lab scenario and summarise its recorded source window
# (first/last frame it records = the accepted window of that probe). usage: prep11Windows.sh <runTag>  -> /tmp/prep11-win/<tag>/<scenario>.summary.json
RUN=${1:-r1}; OUT=/tmp/prep11-win/$RUN; mkdir -p $OUT
VENDOR=$(dirname "$(realpath reference/pokeemerald)")
run() { # probe scenario
  probe=$1; scen=$2; base=$(basename $scen .json); T=$(mktemp -d)
  python3 tools/run-mgba-probe.py $T/p.json -- "$VENDOR/mgba-venv/bin/python" tools/compare/$probe.py $scen $T/p.json $T/rgb >/dev/null 2>&1
  python3 - $T/p.json $OUT/$base.summary.json <<'PY'
import json,sys
try: d=json.load(open(sys.argv[1]))
except Exception as e: json.dump({"error":str(e)},open(sys.argv[2],"w")); raise SystemExit
fr=d.get("frames") or d.get("rows") or []
fs=[f["frame"] for f in fr] if fr and isinstance(fr,list) and isinstance(fr[0],dict) else []
json.dump({"keys":list(d.keys())[:12],"first":fs[0] if fs else None,"last":fs[-1] if fs else None,"n":len(fs),"contiguous":bool(fs) and fs==list(range(fs[0],fs[-1]+1)),"sourceWindow":d.get("sourceWindow")},open(sys.argv[2],"w"))
PY
  rm -rf $T
}
export -f run 2>/dev/null
for pair in roarProbe:roar whirlwindProbe:whirlwind leechSeedProbe:leech-seed triAttackProbe:tri-attack destinyBondProbe:destiny-bond recycleProbe:recycle petalDanceProbe:petal-dance rolloutProbe:rollout airCutterProbe:air-cutter foresightProbe:foresight skyUppercutProbe:sky-uppercut spiderWebProbe:spider-web; do
  probe=${pair%%:*}; key=${pair##*:}
  for scen in tools/battle-lab/mechanic-$key-player-*.json tools/battle-lab/mechanic-$key-opponent-*.json; do [ -f $scen ] && echo "$probe $scen"; done
done | xargs -P 6 -L 1 sh -c '
  probe=$0; scen=$1; base=$(basename $scen .json); T=$(mktemp -d)
  python3 tools/run-mgba-probe.py $T/p.json -- "'$VENDOR'/mgba-venv/bin/python" tools/compare/$probe.py $scen $T/p.json $T/rgb >/dev/null 2>&1
  python3 - $T/p.json '$OUT'/$base.summary.json <<PY
import json,sys
try: d=json.load(open(sys.argv[1]))
except Exception as e: json.dump({"error":str(e)},open(sys.argv[2],"w")); raise SystemExit
fr=d.get("frames") or d.get("rows") or []
fs=[f["frame"] for f in fr] if fr and isinstance(fr,list) and isinstance(fr[0],dict) else []
json.dump({"keys":list(d.keys())[:12],"first":fs[0] if fs else None,"last":fs[-1] if fs else None,"n":len(fs),"contiguous":bool(fs) and fs==list(range(fs[0],fs[-1]+1)),"sourceWindow":d.get("sourceWindow")},open(sys.argv[2],"w"))
PY
  rm -rf $T'
ls $OUT | wc -l
