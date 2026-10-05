#!/bin/sh
# Part A: ROM opponent-battler x2 at Leaf Blade body ages 0 and 11 for several target species (one fresh run each).
# usage: prep11LeafIdleX2.sh SPECIES_NAME:internal_id ...   (writes tools/integration/fixtures/prep11/leaf-idle-x2.json)
cd "$(dirname "$0")/../.." || exit 1
VENDOR=$(dirname "$(realpath reference/pokeemerald)")
OUT=tools/integration/fixtures/prep11/leaf-idle-x2.json; echo "{" > $OUT; first=1
for pair in "$@"; do
  name=${pair%%:*}; id=${pair##*:}; T=$(mktemp -d)
  python3 - "$id" "$T/s.json" <<'PY'
import json,sys
s=json.load(open("tools/battle-lab/prep11-leaf-blade-player-sceptile-opponent-golem.json")); s["overrides"]["parties"]["opponent"][0]["species"]=int(sys.argv[1]); open(sys.argv[2],"w").write(json.dumps(s))
PY
  python3 tools/run-mgba-probe.py $T/p.json -- "$VENDOR/mgba-venv/bin/python" tools/compare/leafBladeProbe.py $T/s.json $T/p.json $T/rgb >/dev/null 2>&1
  r=$(python3 - $T/p.json <<'PY'
import json,sys,struct
fr=json.load(open(sys.argv[1]))["frames"]; o=fr[0]["opponentSprite"]["slot"]
print(json.dumps([struct.unpack_from("<hhhh",bytes.fromhex([x for x in fr[i]["sprites"] if x["slot"]==o][0]["raw"]),0x20) for i in (0,5,11)]))
PY
)
  [ $first = 1 ] || echo "," >> $OUT; first=0; echo "\"$name\": $r" >> $OUT; echo "$name $r"; rm -rf $T
done
echo "}" >> $OUT
