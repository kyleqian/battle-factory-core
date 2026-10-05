#!/usr/bin/env python3
"""Summarise affine-task-raw/v1 probe outputs: baseline at each move activation, matrix/task timeline, net-zero.

usage: affineTaskAnalyze.py [--json out.json] raw1.json [raw2.json ...]
A "body" is a maximal run of rows with gAnimScriptActive==1 (act rise .. act fall).  Baseline = state on the
frame before the rise; end = state at the last row before the next rise (settled), also state 1 frame after the fall.
Events are bitmap bit set/clear and task slot create/destroy/func-change between consecutive sampled frames.
"""
import json, sys
from pathlib import Path


def tkey(t): return (t[0], t[1], t[2], t[3], t[4])


def bits(x): return [i for i in range(32) if x >> i & 1]


def analyse(raw):
    rows = raw["rows"]
    bodies, cur = [], None
    for i, r in enumerate(rows):
        if r["act"] and cur is None:
            base = rows[i - 1] if i else r
            cur = {"mv": r["mv"], "riseFrame": r["n"], "rowStart": i, "baseline": {"bitmap": base["bitmap"], "tasks": base["tasks"], "mask": base["mask"]}}
        if cur is not None and not r["act"]:
            cur["fallFrame"] = r["n"]; cur["rowEnd"] = i; bodies.append(cur); cur = None
    if cur is not None:
        cur["fallFrame"] = None; cur["rowEnd"] = len(rows) - 1; bodies.append(cur)
    for k, b in enumerate(bodies):
        nxt = bodies[k + 1]["rowStart"] if k + 1 < len(bodies) else len(rows)
        ev, prev = [], rows[b["rowStart"] - 1] if b["rowStart"] else rows[0]
        for r in rows[b["rowStart"]:nxt]:
            a, c = int(prev["bitmap"], 16), int(r["bitmap"], 16)
            for m in bits(c & ~a): ev.append([r["n"], "matrix+", m])
            for m in bits(a & ~c): ev.append([r["n"], "matrix-", m])
            pt = {t[0]: t for t in prev["tasks"]}; ct = {t[0]: t for t in r["tasks"]}
            for s in sorted(set(ct) - set(pt)): ev.append([r["n"], "task+", s, ct[s][1], ct[s][2]])
            for s in sorted(set(pt) - set(ct)): ev.append([r["n"], "task-", s, pt[s][1]])
            prev = r
        end = rows[nxt - 1]
        b["events"] = ev
        b["end"] = {"bitmap": end["bitmap"], "tasks": end["tasks"], "mask": end["mask"], "n": end["n"]}
        b["netZeroMatrix"] = b["end"]["bitmap"] == b["baseline"]["bitmap"]
        b["netZeroTask"] = [tkey(t) for t in b["end"]["tasks"]] == [tkey(t) for t in b["baseline"]["tasks"]]
        b["netZeroSprite"] = b["end"]["mask"] == b["baseline"]["mask"]
        del b["rowStart"], b["rowEnd"]
    return bodies


if __name__ == "__main__":
    args = sys.argv[1:]
    out = None
    if args[:1] == ["--json"]:
        out, args = args[1], args[2:]
    res = {}
    for a in args:
        raw = json.load(open(a)); res[Path(a).stem] = {"route": raw["route"], "move": raw["move"], "bodies": analyse(raw)}
    if out:
        Path(out).write_text(json.dumps(res, separators=(",", ":")) + "\n")
    for name, v in res.items():
        print("==", name)
        for b in v["bodies"]:
            print(f"  mv={b['mv']} rise={b['riseFrame']} fall={b['fallFrame']} base bitmap={b['baseline']['bitmap']} tasks={[(t[0], t[1]) for t in b['baseline']['tasks']]}"
                  f" | end bitmap={b['end']['bitmap']} tasks={[(t[0], t[1]) for t in b['end']['tasks']]} netZero m={b['netZeroMatrix']} t={b['netZeroTask']} s={b['netZeroSprite']} nev={len(b['events'])}")
