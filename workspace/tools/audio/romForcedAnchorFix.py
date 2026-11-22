#!/usr/bin/env python3
"""drv2: move the commit anchor of a forced-move decision (Encore / Struggle: the action menu's FIGHT commits, no move menu) to the frame the ROM accepted the press.

usage: romForcedAnchorFix.py DRIVE.json SND.json OUT.json
romDecisionDriver.py closes a forced decision's anchor on its first A (commitFrame = menuOpenFrame + 1), but the ROM can still be inside the previous end-of-turn script (s2230 d20:
`DisabledNoMore` end2) and ignores that press; the 17-frame pulse is accepted later and plays SE_SELECT (id 5). The engine commits on the press it takes, so a ROM segment that starts at the
ignored press is early by the gap and every row of the window reads engine-early by it (T2 s2230 d20 -21, d21 -18). The anchor becomes the first SE 5 at or after the driver's
commit (the same frame, +0, for every forced anchor of the other T2 seeds), at most 40 frames on and never past the next anchor's menu; `commitFrameDriver` keeps the old value.
"""
import json, sys

CAP = 40


def fix(drive, snd):
    se5 = sorted(e["frame"] for e in snd["events"] if e["kind"] == "se" and e["id"] == 5)
    anchors = drive["drive"]["anchors"]
    moved = []
    for i, a in enumerate(anchors):
        if a.get("kind") != "move" or "moveMenuFrame" in a or "fightMenuFrame" in a:
            continue
        nxt = anchors[i + 1]["menuOpenFrame"] if i + 1 < len(anchors) else None
        later = [f for f in se5 if f >= a["commitFrame"]]
        if not later or later[0] == a["commitFrame"] or later[0] - a["commitFrame"] > CAP or (nxt is not None and later[0] >= nxt):
            continue
        a["commitFrameDriver"] = a["commitFrame"]
        a["commitFrame"] = later[0]
        moved.append((a["index"], a["commitFrameDriver"], later[0]))
    return moved


if __name__ == "__main__":
    drive, snd = json.load(open(sys.argv[1])), json.load(open(sys.argv[2]))
    moved = fix(drive, snd)
    json.dump(drive, open(sys.argv[3], "w"))
    for m in moved:
        print("decision %d: commit %d -> %d (+%d)" % (m[0], m[1], m[2], m[2] - m[1]), file=sys.stderr)
