#!/bin/sh
# speciesAudit: run a fixture's own source probe on its scenario (arg2 optional override) and print first/last/n recorded frames.
# usage: speciesAuditProbeRange.sh <fixture.json> [scenario-override]
VENDOR=$(dirname "$(realpath reference/pokeemerald)")
T=$(mktemp -d)
read PROBE SCEN ARGS <<EOF
$(python3 - "$1" <<'PY'
import json,sys
f=json.load(open(sys.argv[1]))
if f.get("sourceFixture"): f={**json.load(open(f["sourceFixture"])),**f}
print(f["probe"],f["scenario"],"")
PY
)
EOF
[ -n "$2" ] && SCEN=$2
python3 tools/run-mgba-probe.py $T/p.json -- "$VENDOR/mgba-venv/bin/python" $PROBE $SCEN $T/p.json $T/rgb >/dev/null 2>&1
python3 - $T/p.json <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
fr=d.get("sha256") and [{"frame":i} for i in range(len(d["sha256"]))] or d.get("frames") or d.get("rows") or []
if isinstance(fr,int): print("frames int",fr); raise SystemExit
fs=[f["frame"] for f in fr]
print(fs[0],fs[-1],len(fs),"keys",list(d.keys())[:8])
PY
rm -rf $T
