#!/usr/bin/env python3
"""cfm1: the pre-move confusion chain (BattleScript_MoveUsedIsConfused) per frame, ROM vs engine, Scene ON and OFF of one lab.

usage: python3 tools/integration/cfm1Chain.py RUN_DIR LAB [LAB...]   (RUN_DIR = a labCompare.sh --scene both run dir)
ROM rows = hcr3mProbe rows (first frame of each script label in the chain, ON extra rows = exec / anim flag changes), glyph = printstring (tp rising) + 1.
Engine = b4mEngine cmds: message / status-animation starts around the chain. Prints ON - OFF per matching ROM row."""
import json
import sys
from pathlib import Path

CHAIN = "BattleScript_MoveUsedIsConfused"


def chains(path):
    d = json.load(open(path))
    names, rows = d["names"], d["rows"]
    out, cur = [], None
    for r in rows:
        n = names.get(hex(r[1]), "?")
        if n == CHAIN + "+0x0":
            cur = []
            out.append(cur)
        if cur is not None:
            cur.append((r[0], n, r[2], r[3], r[9] & 1))
            if cur and len(cur) > 3 and n.startswith("BattleScript_HitFromAtkString+0x1") or n.startswith("BattleScript_DoSelfConfusionDmg") and False:
                cur = None
    return out


def key_rows(chain):
    o = {}
    for f, n, ex, an, tp in chain:
        short = n.replace("BattleScript_", "")
        if short.endswith("+0x3") and "MoveUsedIsConfused" in short and ex and tp and "print1" not in o:
            o["print1"] = f
        if "MoveUsedIsConfused+0x3" in short and "print1" in o and not ex and "wm_release" not in o:
            o["wm_release"] = f
        if "MoveUsedIsConfused+0x6" in short:
            o.setdefault("wm_end(+0x6)", f)
        if "MoveUsedIsConfused+0xc" in short:
            o.setdefault("status2anim(+0xc)", f)
            if an == 0 and "anim_end" not in o and "anim_seen" in o:
                o["anim_end"] = f
            if an:
                o["anim_seen"] = f
            if not ex and "ex_release" not in o and "status2anim(+0xc)" in o and (an == 0) and f > o["status2anim(+0xc)"]:
                o["ex_release"] = f
        if "MoveUsedIsConfusedRet" in short:
            o.setdefault("return", f)
        if "HitFromAtkCanceler" in short and "return" in o:
            o.setdefault("attackcanceler", f)
        if "AtkString+0x1" in short and "return" in o:
            o.setdefault("used_print", f)
        if "DoSelfConfusionDmg" in short or "ConfusionDmg" in short:
            o.setdefault("selfhit", f)
        if "HitFromAtkAnimation" in short:
            o.setdefault("atkanim", f)
    o.pop("anim_seen", None)
    return o


def main():
    run = Path(sys.argv[1])
    for lab in sys.argv[2:]:
        rows = {}
        eng = {}
        for sc in ("on", "off"):
            rows[sc] = [key_rows(c) for c in chains(run / f"{lab}.{sc}.rom.json")]
            eng[sc] = json.load(open(run / f"{lab}.{sc}.eng.json"))["cmds"]
        print(f"== {lab}: {len(rows['on'])} ON chain(s), {len(rows['off'])} OFF chain(s)")
        for k, (a, b) in enumerate(zip(rows["on"], rows["off"])):
            print(f"-- chain {k}")
            print(f"   {'row':20s} {'ROM ON':>7s} {'ROM OFF':>8s} {'ON-OFF':>7s}")
            for key in ["print1", "wm_release", "wm_end(+0x6)", "status2anim(+0xc)", "anim_end", "ex_release", "return", "attackcanceler", "used_print", "selfhit", "atkanim"]:
                x, y = a.get(key), b.get(key)
                if x is None and y is None:
                    continue
                print(f"   {key:20s} {x if x is not None else '-':>7} {y if y is not None else '-':>8} {(x - y) if x is not None and y is not None else '-':>7}")
            lo = a.get("print1", 0) - 3
            hi = a.get("used_print", a.get("selfhit", lo + 300)) + 3
            for sc, o in (("on", a), ("off", b)):
                lo_s = o.get("print1", 0) - 3
                hi_s = o.get("used_print", o.get("selfhit", lo_s + 300)) + 3
                cm = [(c[0], c[3], c[5], c[6]) for c in eng[sc] if lo_s <= c[0] <= hi_s and c[3] in ("message", "status-animation")]
                print(f"   ENG {sc.upper()} cmds: {cm}  (ROM glyph = print row + 1: print1 {o.get('print1', -1) + 1}, used {o.get('used_print', -1) + 1})")


main()
