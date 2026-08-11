#!/usr/bin/env python3
"""Per-frame diff analysis over oracle battle-lab captures for the mid-battle switch window.

Prints, per captured frame: changed-pixel count vs previous captured frame in
several screen regions (full frame, message box, player-sprite area,
opponent-sprite area), plus the semantic snapshot. Long zero-change runs are
holds; bursts are typing/animations/transitions.
"""
import json, sys
from PIL import Image

def region(crop):
    return crop

def main():
    dirs = sys.argv[1:]
    prev_px = prev_box = prev_pl = prev_op = None
    rows = []
    for d in dirs:
        m = json.load(open(f"{d}/manifest.json"))
        for c in m["captures"]:
            img = Image.open(f"{d}/{c['file']}").convert("RGB")
            full = img.crop((0, 0, 240, 160)).tobytes()
            box = img.crop((2, 125, 238, 160)).tobytes()
            pl = img.crop((0, 0, 120, 120)).tobytes()
            op = img.crop((120, 0, 240, 120)).tobytes()
            chg_full = 0 if prev_px is None else sum(1 for a, b in zip(full, prev_px) if a != b)
            chg_box = 0 if prev_box is None else sum(1 for a, b in zip(box, prev_box) if a != b)
            chg_pl = 0 if prev_pl is None else sum(1 for a, b in zip(pl, prev_pl) if a != b)
            chg_op = 0 if prev_op is None else sum(1 for a, b in zip(op, prev_op) if a != b)
            st = c.get("state", {})
            b = st.get("battlers", {})
            e = st.get("engine", {})
            pb = b.get("player", {})
            ob = b.get("opponent", {})
            rows.append((
                c["frame"], chg_full, chg_box, chg_pl, chg_op,
                pb.get("partyIndex", ""), ob.get("partyIndex", ""),
                pb.get("hp", ""), ob.get("hp", ""),
                e.get("currentMove", ""), e.get("playerControllerCommand", ""),
                e.get("opponentControllerCommand", ""), e.get("controllerExecFlags", ""),
            ))
            prev_px, prev_box, prev_pl, prev_op = full, box, pl, op
    print(f"{'frame':>5} {'full':>6} {'box':>6} {'ply':>6} {'opp':>6} {'pIdx':>4} {'oIdx':>4} {'pHP':>4} {'oHP':>4} {'move':>4} {'pCmd':>4} {'oCmd':>4} {'exec':>4}")
    for r in rows:
        print(f"{r[0]:5d} {r[1]:6d} {r[2]:6d} {r[3]:6d} {r[4]:6d} {r[5]:>4} {r[6]:>4} {r[7]:>4} {r[8]:>4} {r[9]:>4} {r[10]:>4} {r[11]:>4} {r[12]:>4}")

if __name__ == "__main__":
    main()
