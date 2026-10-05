#!/bin/sh
# prep7: per-frame gSprites + sSpriteOrder over the move script window (direct mGBA, tools/integration/prep6SpriteDump.py reused unmodified). Run from workspace root.
# Window = [min(activation, accepted window start) - 3, script end + 2] from the census-activation / prep7-activation receipts.
export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
D=tools/integration/fixtures/prep7-sprites
mkdir -p $D
python3 - <<'P' | xargs -P 4 -L 1 sh -c '"$0" tools/integration/prep6SpriteDump.py "$1" "$2" "$3" "$4" >/dev/null 2>&1' $PY
import json
FX = "tools/integration/fixtures"
rows = []
def add(scen, rec, mid, name, lo=None):
    iv = [i for i in json.load(open(rec))["intervals"] if i["move"] == mid][0]
    rows.append((scen, f"{FX}/prep7-sprites/{name}.json", max(0, min(iv["start"], lo if lo is not None else iv["start"]) - 3), iv["end"] + 2))
for n, mid, lo in (("aerial-ace-pidgeotto-onix", 332, 46), ("aerial-ace-player-pidgeotto-onix", 332, 46), ("quick-attack-pidgeotto-onix", 98, 46), ("quick-attack-player-pidgeotto-onix", 98, 46),
                   ("feather-dance-pidgeotto-onix", 297, 46), ("feather-dance-player-pidgeotto-onix", 297, 46), ("fake-tears-opponent-delcatty-player-shuckle", 313, 80), ("fake-tears-player-delcatty-opponent-shuckle", 313, 76),
                   ("sleep-talk-opponent-seaking-player-onix", 214, None), ("sleep-talk-player-seaking-opponent-onix", 214, None)):
    add(f"tools/battle-lab/mechanic-{n}.json", f"{FX}/census-activation/mechanic-{n}.json", mid, n, lo)
for n, mid, nm in (("ice-punch", 8, "ip"), ("rock-slide", 157, "rs"), ("double-team", 104, "dt"), ("fire-blast", 126, "fb1")):
    for side in ("player", "opponent"):
        stem = f"mechanic-{n}-{side}-dragonair-onix"
        add(f"{FX}/prep7-scenarios/{stem}.json", f"{FX}/prep7-activation/{stem}.json", mid, f"{nm}-{side}")
for side in ("player", "opponent"):
    add(f"tools/battle-lab/mechanic-dragon-dance-{side}-dragonair-{'opponent' if side == 'player' else 'player'}-onix.json", f"{FX}/prep6-activation/mechanic-dragon-dance-{side}-dragonair-{'opponent' if side == 'player' else 'player'}-onix.json", 349, f"dd-{side}")
for r in rows: print(*r)
P
ls $D
