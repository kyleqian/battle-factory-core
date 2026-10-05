#!/usr/bin/env python3
"""Check that every observed matrix allocation / task creation is the lowest-free one (sprite.c:1427 AllocOamMatrix, task.c:27 CreateTask).

usage: affineTaskLowestFree.py raw.json [...]
Per sampled frame transition: allocations added (new bitmap bits / new task slots).  A transition is CLEAN when it only adds
(no free in the same transition); then the added ids must equal the k lowest free ids of the previous state.  Transitions that both
add and free are AMBIGUOUS (in-frame order invisible) and counted separately.  Task slots: a slot whose func changed in place
(SetTaskFunc) is not a creation.
"""
import json, sys


def check(raw):
    rows = raw["rows"]
    st = {"matrixClean": 0, "matrixAmbiguous": 0, "matrixViolations": [], "taskClean": 0, "taskAmbiguous": 0, "taskViolations": []}
    prev = None
    for r in rows:
        if prev is not None:
            a, b = int(prev["bitmap"], 16), int(r["bitmap"], 16)
            added, freed = b & ~a, a & ~b
            if added:
                if freed:
                    st["matrixAmbiguous"] += 1
                else:
                    ids = [i for i in range(32) if added >> i & 1]
                    free = [i for i in range(32) if not a >> i & 1][:len(ids)]
                    st["matrixClean"] += 1
                    if ids != free:
                        st["matrixViolations"].append([r["n"], ids, free])
            pt = {t[0] for t in prev["tasks"]}; ct = {t[0] for t in r["tasks"]}
            addt, frt = sorted(ct - pt), pt - ct
            if addt:
                if frt:
                    st["taskAmbiguous"] += 1
                else:
                    free = [i for i in range(16) if i not in pt][:len(addt)]
                    st["taskClean"] += 1
                    if addt != free:
                        st["taskViolations"].append([r["n"], addt, free])
        prev = r
    return st


if __name__ == "__main__":
    tot = {}
    for f in sys.argv[1:]:
        s = check(json.load(open(f)))
        print(f.split("/")[-1], {k: (v if not isinstance(v, list) else len(v)) for k, v in s.items()}, s["matrixViolations"][:2], s["taskViolations"][:2])
