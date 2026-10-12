#!/usr/bin/env python3
"""shp116 (docs/shp116-shadow-lead-and-shadow-punch-d4.md): census delta base 681da5c10 -> shp116 (liveShareCensus.ts seeds 0..999, ten
--index-from shards per tree; shadow105CensusDelta.py's checks with shp116's two expectations).

usage: shp116CensusDelta.py <base-shard-dir> <final-shard-dir> <base battleResolutionPresentationRender.ts> <out.json>
Checks: the command KEY sequence (battle, kind, moveId, side, attacker, target) is identical (or, for a battle whose run stopped at the
frame budget, one tree's key sequence is a prefix of the other's); every shard's battleDigestExcludingFrames is identical; status changes
(live / partial / fallback) are counted; per command, frames(final) - frames(base) ==
  (a) N(move) for the commands the base's elevated-opponent decline zeroed (a move command of a LIVE_MOVE_IDLE_LEAD_ROWS id, N parsed from
      the base source, with a defined adapter duration, no Substitute swap, and the OPPONENT's species (the attacker on the opponent
      side, the target on the player side) gEnemyMonElevation > 0 by name in src/data/gen/enemy-mon-elevations.json) -- shadow105;
  (b) + 1 for a Shadow Punch (325) move command with a defined adapter duration -- sp103's restore lag row;
and 0 for every other command.
"""
import collections, json, re, sys
from pathlib import Path

bdir, fdir, src, out = sys.argv[1:5]
text = Path(src).read_text()
table = text[text.index("const LIVE_MOVE_IDLE_LEAD_ROWS"):]; table = table[:table.index("]);")]
lead = {int(a): int(b) for a, b in re.findall(r"\[(\d+), (\d+)\]", table)}
elev = json.loads((Path(__file__).resolve().parents[2] / "src/data/gen/enemy-mon-elevations.json").read_text())
norm = lambda n: re.sub(r"[^A-Z0-9]+", "_", n.upper()).strip("_")
key = lambda c: (c["battle"], c["kind"], c.get("moveId"), c["side"], c["attacker"], c["target"])
load = lambda d: [json.loads(l) for k in range(10) for l in open(f"{d}/r{k}.jsonl") if l.strip()]
B, F = load(bdir), load(fdir)
dig = lambda d: [json.load(open(f"{d}/r{k}.json"))["battleDigestExcludingFrames"] for k in range(10)]
res = {"leadMoves": len(lead), "commands": [len(B), len(F)], "keySequenceIdentical": [key(c) for c in B] == [key(c) for c in F],
       "battleDigestExcludingFramesIdentical": dig(bdir) == dig(fdir)}
if not res["keySequenceIdentical"]:
    bb, fb = collections.defaultdict(list), collections.defaultdict(list)
    for c in B: bb[c["battle"]].append(key(c))
    for c in F: fb[c["battle"]].append(key(c))
    diff = sorted(b for b in set(bb) | set(fb) if bb[b] != fb[b])
    res["keyDiffBattles"] = [{"battle": b, "commands": [len(bb[b]), len(fb[b])],
                              "prefix": bb[b][:len(fb[b])] == fb[b] or fb[b][:len(bb[b])] == bb[b]} for b in diff]
status = collections.Counter((b["status"], f["status"]) for b, f in zip(B, F) if key(b) == key(f) and b["status"] != f["status"])
res["statusChanges"] = {f"{a}->{b}": n for (a, b), n in status.items()}
bad, per_move, frames = [], collections.defaultdict(lambda: [0, 0]), [sum(c["frames"] for c in B), sum(c["frames"] for c in F)]
moved = {"leadCommands": 0, "leadLive": 0, "leadFrames": 0, "shadowPunchCommands": 0, "shadowPunchFrames": 0,
         "leadPlayerAttacker": 0, "leadOpponentAttacker": 0}
fi = {key(c) + (i,): c for i, c in enumerate(F)}
for b, f in zip(B, F):
    if key(b) != key(f): continue
    d = f["frames"] - b["frames"]
    move = b["kind"] == "move" and b.get("duration") is not None and b.get("swapFrames", 0) == 0
    opp = b["attacker"] if b["side"] == "opponent" else b["target"]
    n = lead.get(b.get("moveId"), 0) if move and elev.get(norm(opp), 0) > 0 else 0
    sp = 1 if b["kind"] == "move" and b.get("moveId") == 325 and b.get("duration") is not None else 0
    if d != n + sp:
        bad.append({"battle": b["battle"], "moveId": b.get("moveId"), "side": b["side"], "attacker": b["attacker"], "target": b["target"],
                    "kind": b["kind"], "status": [b["status"], f["status"]], "frames": [b["frames"], f["frames"]], "expected": n + sp})
        continue
    if n:
        moved["leadCommands"] += 1; moved["leadFrames"] += n; moved["leadLive"] += b["status"] == "live"
        moved["leadPlayerAttacker" if b["side"] == "player" else "leadOpponentAttacker"] += 1
        per_move[(b["moveId"], b["side"])][0] += 1; per_move[(b["moveId"], b["side"])][1] += n
    if sp:
        moved["shadowPunchCommands"] += 1; moved["shadowPunchFrames"] += 1
res.update({**moved, "frames": frames, "frameDelta": frames[1] - frames[0], "frameDeltaMismatches": len(bad), "mismatches": bad[:40],
            "perMoveSide": {f"{m}:{s}": {"commands": v[0], "frames": v[1]} for (m, s), v in sorted(per_move.items())}})
Path(out).write_text(json.dumps(res, indent=1) + "\n")
print(json.dumps({k: v for k, v in res.items() if k not in ("mismatches", "perMoveSide")}))
