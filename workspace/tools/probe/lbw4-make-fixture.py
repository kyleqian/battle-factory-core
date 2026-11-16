#!/usr/bin/env python3
"""lbw4: derive the small Tier-1 fixture (tests/fixtures/lbw4/woman-block.json.gz) from a lbw1-lobby-wander-rom.py dump of
tools/compare/traces/lbw4-woman-block-off.json. usage: python3 tools/probe/lbw4-make-fixture.py ROM.json TRACE.json OUT.json.gz
The window starts at the last frame (>= 5700) where the player and both wanderers have been still for 4 frames, before the first held DOWN.
Per frame: [held DOWN (0/1), rng, player cur/prv (grid), woman [cx,cy,px,py,face,ty,dl,animIdx], fat man [...]]."""
import gzip, json, sys
from pathlib import Path

doc = json.loads(Path(sys.argv[1]).read_text())
trace = json.loads(Path(sys.argv[2]).read_text())
by = {r["f"]: r for r in doc["rows"]}
held = set()
f = 0
for seg in trace["segments"]:
    if "DOWN" in seg["buttons"]:
        held.update(range(f + 1, f + 1 + seg["frames"]))
    f += seg["frames"]


def ev(row, gfx):
    return next(e for e in row["ev"] if e["gfx"] == gfx and not e["player"])


def player(row):
    return next(e for e in row["ev"] if e["player"])


def npc(e):
    return [*e["cur"], *e["prv"], e["face"], e["data"][1], e["data"][3], e["anim"][1]]


def key(row):
    p = player(row)
    return (p["cur"], p["prv"], npc(ev(row, 16))[:5], npc(ev(row, 17))[:5])


first = min(x for x in held if x >= 5700)
start = next(s for s in range(first - 1, 5700, -1) if all(key(by[s - k]) == key(by[s]) for k in range(4)))
end = max(by)
w, m = ev(by[start], 16), ev(by[start], 17)
frames = []
for g in range(start + 1, end + 1):
    row = by[g]
    p = player(row)
    frames.append([int(g in held), row["rng"], *p["cur"], *p["prv"], npc(ev(row, 16)), npc(ev(row, 17))])
out = {
    "trace": doc["trace"], "start": start, "seedRng": by[start]["rng"], "grid": {"width": doc["grid"]["width"], "height": doc["grid"]["height"]},
    "seedPlayer": [*player(by[start])["cur"]], "seedWoman": npc(w), "seedFat": npc(m), "frames": frames,
}
Path(sys.argv[3]).write_bytes(gzip.compress(json.dumps(out, separators=(",", ":")).encode(), 9, mtime=0))
print("start", start, "frames", len(frames))
