#!/usr/bin/env python3
"""shadow105 (docs/next-adapters-shadow105.md): census delta of the temp patch fixtures/shadow105/shadow105-lead-row0-shadow.diff
(liveShareCensus.ts seeds 0..999, ten --index-from shards per tree; idle94CensusDelta.py's checks with shadow105's expectation).

usage: shadow105CensusDelta.py <base-shard-dir> <patched-shard-dir> <base battleResolutionPresentationRender.ts> <out.json>
Checks: the command KEY sequence (battle, kind, moveId, side, attacker, target) is identical; every shard's battleDigestExcludingFrames is
identical; status changes (live / partial / fallback) are counted; per command, frames(patched) - frames(base) == N(move) exactly for the
commands the base's elevated-attacker decline zeroed (a move command of a LIVE_MOVE_IDLE_LEAD_ROWS id, N parsed from the base source,
with a defined adapter duration, no Substitute swap, attacker side opponent, attacker species gEnemyMonElevation > 0 by name in
src/data/gen/enemy-mon-elevations.json) and 0 for every other command.
"""
import collections, json, re, sys
from pathlib import Path

bdir, pdir, src, out = sys.argv[1:5]
text = Path(src).read_text()
table = text[text.index("const LIVE_MOVE_IDLE_LEAD_ROWS"):]; table = table[:table.index("]);")]
lead = {int(a): int(b) for a, b in re.findall(r"\[(\d+), (\d+)\]", table)}
elev = json.loads((Path(__file__).resolve().parents[2] / "src/data/gen/enemy-mon-elevations.json").read_text())
norm = lambda n: re.sub(r"[^A-Z0-9]+", "_", n.upper()).strip("_")
key = lambda c: (c["battle"], c["kind"], c.get("moveId"), c["side"], c["attacker"], c["target"])
load = lambda d: [json.loads(l) for k in range(10) for l in open(f"{d}/r{k}.jsonl") if l.strip()]
B, P = load(bdir), load(pdir)
dig = lambda d: [json.load(open(f"{d}/r{k}.json"))["battleDigestExcludingFrames"] for k in range(10)]
res = {"leadMoves": len(lead), "commands": [len(B), len(P)], "keySequenceIdentical": [key(c) for c in B] == [key(c) for c in P],
       "battleDigestExcludingFramesIdentical": dig(bdir) == dig(pdir)}
status = collections.Counter((b["status"], p["status"]) for b, p in zip(B, P) if b["status"] != p["status"])
res["statusChanges"] = {f"{a}->{b}": n for (a, b), n in status.items()}
bad, per_move, live_moved, frames = [], collections.defaultdict(lambda: [0, 0]), 0, [0, 0]
for b, p in zip(B, P):
    frames[0] += b["frames"]; frames[1] += p["frames"]
    d = p["frames"] - b["frames"]
    n = lead.get(b.get("moveId"), 0) if (b["kind"] == "move" and b.get("duration") is not None and b.get("swapFrames", 0) == 0
                                         and b["side"] == "opponent" and elev.get(norm(b["attacker"]), 0) > 0) else 0
    if d != n:
        bad.append({"battle": b["battle"], "moveId": b.get("moveId"), "side": b["side"], "attacker": b["attacker"], "kind": b["kind"],
                    "status": [b["status"], p["status"]], "frames": [b["frames"], p["frames"]], "expected": n})
    elif n:
        per_move[(b["moveId"], b["attacker"])][0] += 1; per_move[(b["moveId"], b["attacker"])][1] += n
        live_moved += b["status"] == "live"
res.update({"commandsMovedByN": sum(v[0] for v in per_move.values()), "liveMoved": live_moved, "framesAdded": sum(v[1] for v in per_move.values()),
            "frames": frames, "frameDeltaMismatches": len(bad), "mismatches": bad[:40],
            "perMoveAttacker": {f"{m}:{a}": {"commands": v[0], "frames": v[1]} for (m, a), v in sorted(per_move.items())}})
Path(out).write_text(json.dumps(res, indent=1) + "\n")
print(json.dumps({k: v for k, v in res.items() if k not in ("mismatches", "perMoveAttacker")}))
