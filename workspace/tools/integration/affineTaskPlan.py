#!/usr/bin/env python3
"""Replay the exact call lists (fixtures/affine-task/calls) from the known baseline with the production model and derive plan rows.

usage: affineTaskPlan.py [--json out.json]
Model (the proposed allocator plan v2, see docs/allocator-plan-v2-evidence.md): matrix bitmap + 16-slot task table seeded with
baseline bitmap 0x6 / no tasks; AllocOamMatrix -> lowest free bit (sprite.c:1427), CreateTask -> lowest inactive slot (task.c:27);
FreeOamMatrix(m) / DestroyTask(t) clear the id.  For every recorded call the model's id must equal the ROM return value
(`replayMismatches`), and the body must end back at the baseline (`netZero`).  Plan row = ordered ops (age, kind, owner/arg, id).
Also reports whether player and opponent orientations have the identical op list (ages, kinds, ids, owners).
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).parent))
from affineTaskBatch import MOVES  # noqa: E402
CALLS = ROOT / "tools/integration/fixtures/affine-task/calls"
BASE_BITMAP = 0x6
BASE_SPRITES = {0, 1, 2, 6, 8, 60, 61, 62, 63}  # occupied slots at the first move body (docs/sprite-order-factory-entry.md; mask f000000000000147)


def replay(calls):
    bm, tasks, ops, mism = BASE_BITMAP, {}, [], []
    sprites, spriteEndPicks = set(BASE_SPRITES), 0
    peakM = peakT = 0
    for c in calls:
        k = c["kind"]
        if k == "AllocOamMatrix":
            i = next(i for i in range(32) if not bm >> i & 1)
            bm |= 1 << i
            if i != c["ret"]: mism.append([c["age"], k, i, c["ret"]])
            ops.append([c["age"], "matrix+", i, c["caller"]])
        elif k == "FreeOamMatrix":
            bm &= ~(1 << c["arg"]); ops.append([c["age"], "matrix-", c["arg"], c["caller"]])
        elif k == "CreateTask":
            i = next(i for i in range(16) if i not in tasks)
            tasks[i] = c["arg"]
            if i != c["ret"]: mism.append([c["age"], k, i, c["ret"]])
            ops.append([c["age"], "task+", i, c["arg"], c["prio"], c["caller"]])
        elif k == "DestroyTask":
            ops.append([c["age"], "task-", c["arg"], tasks.pop(c["arg"], "?"), c["caller"]])
        elif k == "DestroySprite":
            sprites.discard(c["arg"]); ops.append([c["age"], "sprite-", c["arg"], c["caller"]])
        elif k == "CreateSpriteAt" and c["caller"].split("+")[0] in ("CreateSprite", "CreateSpriteAtEnd"):
            continue  # nested inside the outer CreateSprite* call already modelled
        else:  # CreateSprite* : slot is the lowest free (CreateSprite) or highest free (CreateSpriteAtEnd); the entry hook sees CreateSpriteAt
            low = next(i for i in range(64) if i not in sprites); high = next(i for i in range(63, -1, -1) if i not in sprites)
            if c["ret"] not in (low, high): mism.append([c["age"], k, low, c["ret"]])
            spriteEndPicks += c["ret"] == high and c["ret"] != low
            sprites.add(c["ret"]); ops.append([c["age"], "sprite+", c["ret"], c["arg"], c["caller"]])
        peakM = max(peakM, bin(bm).count("1")); peakT = max(peakT, len(tasks))
    return {"ops": ops, "replayMismatches": mism, "netZero": bm == BASE_BITMAP and not tasks, "netZeroSprites": sprites == BASE_SPRITES, "spriteEndPicks": spriteEndPicks, "endBitmap": f"{bm:08x}",
            "endTasks": {str(k): v for k, v in tasks.items()}, "peakMatrices": peakM, "peakTasks": peakT,
            "matricesUsed": sorted({o[2] for o in ops if o[1] == "matrix+"}), "taskSlotsUsed": sorted({o[2] for o in ops if o[1] == "task+"}),
            "spriteSlotsUsed": sorted({o[2] for o in ops if o[1] == "sprite+"})}


def load(name):
    d = json.load(open(CALLS / f"{name}.json"))
    return d, replay(d["calls"])


if __name__ == "__main__":
    out = sys.argv[2] if sys.argv[1:2] == ["--json"] else None
    res = {}
    for mid, slugs in MOVES.items():
        names = [Path(s).name.lstrip("@") for s in slugs]
        rows = {}
        for n in names:
            d, r = load(n)
            r["rise"], r["fall"], r["calls"] = d["rise"], d["fall"], len(d["calls"])
            rows[n] = r
        a = [(o[:-1]) for o in rows[names[0]]["ops"]] if names else []
        same = len(names) == 2 and all([o[:-1] for o in rows[n]["ops"]] == a for n in names)
        # caller included too:
        ids = lambda n: [(o[1], o[2]) for o in rows[n]["ops"]]
        same_ids = len(names) == 2 and ids(names[0]) == ids(names[1])
        same_full = len(names) == 2 and rows[names[0]]["ops"] == rows[names[1]]["ops"]
        res[str(mid)] = {"scenarios": rows, "orientationOpsIdentical": same, "orientationKindIdSequenceIdentical": same_ids, "orientationOpsIdenticalWithCallers": same_full}
        for n, r in rows.items():
            print(f"{mid:>4} {n:50s} calls={r['calls']:3d} mismatches={len(r['replayMismatches'])} netZero={r['netZero']} spriteNZ={r['netZeroSprites']} peakM={r['peakMatrices']} peakT={r['peakTasks']} mats={r['matricesUsed']} taskSlots={r['taskSlotsUsed']} sprites={r['spriteSlotsUsed']}")
        print(f"     orientation ops identical: {same} (with callers: {same_full}); (kind,id) sequence identical: {same_ids}")
    for n in sorted(p.stem for p in CALLS.glob("*-body*.json")) + ["factory-battle1-turn1-mv104", "factory-battle1-turn1-mv157"]:
        d, r = load(n); res[n] = r
        print(n, "mismatches", len(r["replayMismatches"]), "netZero", r["netZero"], "mats", r["matricesUsed"], "slots", r["taskSlotsUsed"])
    if out:
        Path(out).write_text(json.dumps(res, separators=(",", ":")) + "\n")
