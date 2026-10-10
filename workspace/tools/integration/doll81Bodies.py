#!/usr/bin/env python3
"""doll81: the anim-script bodies of each doll81 probe (r1; doll81Probes.sh gates r1 == r2) with the displayed-doll state at activation.
prep40Probe.py rows (`att` / `self`) and prep38Probe.py rows (`def`) are both read. One line per body: frame span, script, attacker side
-> target side, behindSubstitute of player / opponent on the previous row (the displayed doll), HP of both.
usage: doll81Bodies.py <probe dir> <list.tsv>   -> stdout"""
import json, sys
D, LIST = sys.argv[1], sys.argv[2]
SIDE = {0: "p", 1: "o"}
for line in open(LIST):
    stem, move, mid, side, atk, dfn, fam = line.rstrip("\n").split("\t")
    fr = json.load(open(f"{D}/{stem}-r1.json"))["frames"]
    act = lambda r: bool(r.get("animScriptActive", r.get("active")))  # noqa: E731
    doll = lambda b: b.get("behindSubstitute", b.get("doll"))  # noqa: E731
    out, start = [], None
    for i, r in enumerate(fr):
        if act(r) and start is None: start = i
        elif not act(r) and start is not None:
            a, p = fr[start], fr[start - 1]
            sc = next((x["script"] for x in fr[start:i] if x.get("script")), None)
            at, tg = a.get("animAttacker", a.get("attacker")), a.get("animTarget", a.get("target"))
            out.append(f"{a['frame']}..{r['frame']} {sc} {SIDE.get(at, at)}->{SIDE.get(tg, tg)} doll={''.join('D' if doll(b) else '-' for b in p['battlers'])}"
                       f" hp={[b['hp'] for b in a['battlers']]}")
            start = None
    print(stem, fam, f"({atk}->{dfn})")
    for o in out: print("   ", o)
