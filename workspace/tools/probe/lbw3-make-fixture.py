#!/usr/bin/env python3
"""lbw3: derive the small Tier-1 fixture (tests/fixtures/lbw3/<trace>.json.gz) from a lbw1-lobby-wander-rom.py dump.
usage: python3 tools/probe/lbw3-make-fixture.py ROM.json OUT.json.gz
Per frame after the spawn seed: [run, frozen, drawCount, staticSetIndex, player cur/prv, woman [cx,cy,px,py,face,ty,dl,animNum,animIdx], fat man [...]]."""
import gzip, json, sys
from pathlib import Path

doc = json.loads(Path(sys.argv[1]).read_text())
rows = doc["rows"]
by = {r["f"]: r for r in rows}
CB2 = 0x8085E5D


def ev_of(row, gfx):
    return next((e for e in row["ev"] if e["gfx"] == gfx and not e["player"]), None)


lobby = [r["f"] for r in rows if "ev" in r and len(r["ev"]) >= 7]
spawn = next(f for f in lobby if ev_of(by[f], 16) and ev_of(by[f], 17))
last = max(lobby)
seed = by[spawn]


def npc(e):
    return [*e["cur"], *e["prv"], e["face"], e["data"][1], e["data"][3], e["anim"][0], e["anim"][1]]


def statics(row):
    return [[*e["cur"], *e["prv"], e["elev"]] for e in row["ev"] if e["gfx"] not in (16, 17) and not e["player"]]


frames = []
static_sets = []
for f in range(spawn + 1, last + 1):
    row, prev = by[f], by[f - 1]
    if "ev" not in row:
        break
    st = statics(row)
    if st not in static_sets:
        static_sets.append(st)
    player = next(e for e in row["ev"] if e["player"])
    w, m = ev_of(row, 16), ev_of(row, 17)
    frames.append([
        int(prev["cb2"] == CB2), int(bool(w["frozen"])), row["cnt"] - seed["cnt"], static_sets.index(st),
        *player["cur"], *player["prv"], player["elev"], npc(w), npc(m),
    ])
out = {
    "trace": doc["trace"], "spawnFrame": spawn, "seedRng": seed["rng"], "finalRng": by[spawn + len(frames)]["rng"],
    "grid": {"width": doc["grid"]["width"], "height": doc["grid"]["height"], "blocks": doc["grid"]["blocks"]},
    "staticSets": static_sets, "seedWoman": npc(ev_of(seed, 16)), "seedFat": npc(ev_of(seed, 17)), "frames": frames,
}
Path(sys.argv[2]).write_bytes(gzip.compress(json.dumps(out, separators=(",", ":")).encode(), 9, mtime=0))
