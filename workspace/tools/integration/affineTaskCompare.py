#!/usr/bin/env python3
"""Compare the ROM probe (affine-task raw) against the accepted Scene-ON dense-state evidence, per age.

usage: affineTaskCompare.py [--json out.json]
For each (move, orientation) the dense-state frames (tools/compare/evidence/<move>-<side>-dense-state.json.gz, the
accepted reducer input) give per frame: in-use sprites with the affine flag (attr[0] bit 8) -> matrixNum, and the task table
(slot, func symbol).  The probe rows (tools/integration/fixtures/affine-task/raw/<scenario>-0.json) give the same two
sets per age (age = frame - gAnimScriptActive rise of the body whose sAnimMoveIndex == move).  Reported: number of
ages compared, ages whose (matrix set, task set) differ, first differing age.  Also the full event lists
(matrix+/- and task+/- with slot) from the dense state, for the doc.
"""
import gzip, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "tools/integration/fixtures/affine-task/raw"
sys.path.insert(0, str(Path(__file__).parent))
from affineTaskBatch import MOVES  # noqa: E402

NAMES = {62: "aurora-beam", 218: "frustration", 32: "horn-drill", 13: "razor-wind", 350: "rock-blast", 69: "seismic-toss",
         254: "stockpile", 129: "swift", 85: "thunderbolt", 271: "trick", 253: "uproar", 192: "zap-cannon"}
SIDE = ("player-back", "opponent-front")


def dense_states(path):
    d = json.load(gzip.open(path))
    out = []
    for f in d["frames"]:
        if not f["animScriptActive"]:
            continue  # inter-body gap frames inside a multi-body window (Razor Wind, Rock Blast)
        mats = sorted(s["matrixNum"] for s in f["sprites"] if s["attr"][0] >> 8 & 1)
        tasks = sorted((t["slot"], t["func"]["symbol"]) for t in f["tasks"])
        out.append((mats, tasks))
    return out


def probe_states(raw, mv):
    rows = raw["rows"]
    bodies, cur = [], None
    for i, r in enumerate(rows):
        if r["act"] and r["mv"] == mv and cur is None:
            cur = i
        if cur is not None and not r["act"]:
            bodies.append((cur, i)); cur = None
    res = []
    for a, b in bodies:
        end = rows[-1]["n"] + 1  # continuous from the rise: the dense window may span more than one body
        states, k = [], a
        for n in range(rows[a]["n"], end):
            while k + 1 < len(rows) and rows[k + 1]["n"] <= n:
                k += 1
            r = rows[k]
            if not r["act"] or r["mv"] != mv:
                continue  # dense windows keep only gAnimScriptActive frames (bodies of this move concatenated)
            states.append((sorted(r["mats"].values()), sorted((t[0], t[1]) for t in r["tasks"])))
        res.append(states)
    return res


def events(states):
    ev, pm, pt = [], [], []
    for age, (m, t) in enumerate(states):
        for x in sorted(set(m) - set(pm)): ev.append([age, "matrix+", x])
        for x in sorted(set(pm) - set(m)): ev.append([age, "matrix-", x])
        for x in sorted(set(t) - set(pt)): ev.append([age, "task+", x[0], x[1]])
        for x in sorted(set(pt) - set(t)): ev.append([age, "task-", x[0], x[1]])
        pm, pt = m, t
    return ev


if __name__ == "__main__":
    out = sys.argv[2] if sys.argv[1:2] == ["--json"] else None
    res = {}
    for mid, slugs in MOVES.items():
        name = NAMES[mid]
        for side, slug in zip(SIDE, slugs):
            stem = Path(slug).name.lstrip("@")
            dense = dense_states(ROOT / f"tools/compare/evidence/{name}-{side.split('-')[0]}-dense-state.json.gz")
            raw = json.load(open(RAW / f"{stem}-0.json"))
            bodies = probe_states(raw, mid)
            best = None
            for bi, p in enumerate(bodies):
                n = min(len(p), len(dense))
                bad = [a for a in range(n) if p[a] != dense[a]]
                cand = {"body": bi, "denseFrames": len(dense), "probeFrames": len(p), "differingAges": len(bad), "firstDiff": bad[0] if bad else None}
                if best is None or cand["differingAges"] < best["differingAges"]:
                    best = cand
                    if bad:
                        best["firstDiffDense"] = dense[bad[0]]; best["firstDiffProbe"] = p[bad[0]]
            best["denseEvents"] = events(dense)
            res[f"{name}/{side}"] = best
            print(f"{name:12s} {side:14s} body={best['body']} dense={best['denseFrames']} probe={best['probeFrames']} differing={best['differingAges']} first={best['firstDiff']}")
            if best["firstDiff"] is not None:
                print("    dense", best["firstDiffDense"], "\n    probe", best["firstDiffProbe"])
    if out:
        Path(out).write_text(json.dumps(res, separators=(",", ":")) + "\n")
