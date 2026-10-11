#!/usr/bin/env python3
"""idle98: ROM anchors of EVERY animation body in the damaging-move scenarios (idle94Probe.py ON + OFF outputs).

usage: idle98Compare.py <probe-dir> <scenario-index.json> <out.json>     (<probe-dir>/<scenario>-{on,off}.json)
A Scene ON move body = a gAnimScriptActive rise A whose pointer minus 1 (X, the attackanimation byte) was the script pointer on an earlier
frame (F_att = the first frame of the pointer run on X / X+1 that leads to A). E = first inactive frame, F_after = first frame on X+2
(waitanimation released), F_es = first frame on X+3 (effectivenesssound done: the hit path's hitanimation is next), G = the last screen
change before F_att. pre = A - F_att, post = F_after - E. pre rows = F_att .. A-1 vs F_att-1; post rows = E .. F_after-1 vs E and E-1.
The k-th ON body on X with (gCurrentMove, gBattlerAttacker) is paired with the k-th Scene OFF frame run on X with the same pair
(Cmd_attackanimation -> BattleScript_Pausex20 in OFF), giving the OFF span and the mode-independence checks (F_att - G, F_es - F_after).
Other rises (no earlier frame on X: playanimation general animations, e.g. B_ANIM_STATS_CHANGE) are listed per mode with their
active length and the number of screen changes while active. A scenario whose attacker never reaches an animation (the Dynamic Punch
miss) gets the pointer runs from its "used" message to the next message, ON vs OFF.
"""
import json, os, sys

probe_dir, index_path, out_path = sys.argv[1:4]
index = json.load(open(index_path))


def runs_on(rows, X, start=0):
    """frame runs [first, last] where ptr == X, from start"""
    out, f = [], start
    while f < len(rows):
        if rows[f]["ptr"] == X:
            g = f
            while g + 1 < len(rows) and rows[g + 1]["ptr"] == X:
                g += 1
            out.append((f, g))
            f = g + 1
        else:
            f += 1
    return out


def last_change_before(rows, f):
    return max((r["f"] for i, r in enumerate(rows[:f]) if i and r["scr"] != rows[i - 1]["scr"]), default=None)


def first(rows, pred, start):
    return next((r["f"] for r in rows[start:] if pred(r)), None)


def rises(rows):
    return [i for i, r in enumerate(rows) if i and r["act"] and not rows[i - 1]["act"]]


out = {"schema": "idle98-compare/v1", "scenarios": {}}
summary = {"bodies": 0, "pre3": 0, "post2": 0, "preStatic": 0, "postEqualsE": 0, "off35": 0, "attMinusGSame": 0, "esMinusAfterSame": 0,
           "pairedOff": 0}
for name, meta in sorted(index.items()):
    stem = name[:-5]
    on = json.load(open(os.path.join(probe_dir, f"{stem}-on.json")))["rows"]
    off = json.load(open(os.path.join(probe_dir, f"{stem}-off.json")))["rows"]
    bodies, others, seen = [], [], {}
    for A in rises(on):
        X = on[A]["ptr"] - 1
        E = first(on, lambda r: not r["act"], A)
        before = [f for f in range(A) if on[f]["ptr"] == X]
        if not before or E is None:
            others.append({"A": A, "E": E, "len": None if E is None else E - A, "mv": on[A]["mv"], "atk": on[A]["atk"], "ptr": on[A]["ptr"],
                           "screenChanges": sum(on[f]["scr"] != on[f - 1]["scr"] for f in range(A + 1, (E or len(on) - 1) + 1))})
            continue
        F_att = A
        while on[F_att - 1]["ptr"] in (X, X + 1):
            F_att -= 1
        while on[F_att]["ptr"] != X:
            F_att += 1
        F_after = first(on, lambda r: r["ptr"] == X + 2, A)
        F_es = first(on, lambda r: r["ptr"] == X + 3, A)
        G = last_change_before(on, F_att)
        mv, atk = on[A]["mv"], on[A]["atk"]
        k = seen.get((X, mv, atk), 0)
        seen[(X, mv, atk)] = k + 1
        off_runs = [r for r in runs_on(off, X) if off[r[0]]["mv"] == mv and off[r[0]]["atk"] == atk]
        b = {"mv": mv, "atk": atk, "X": X, "G": G, "F_att": F_att, "A": A, "E": E, "F_after": F_after, "F_es": F_es,
             "pre": A - F_att, "post": F_after - E, "E_minus_A": E - A, "spanOn": F_after - F_att,
             "attMinusG_on": F_att - G, "esMinusAfter_on": None if F_es is None else F_es - F_after,
             "preRowsStatic": all(on[f]["scr"] == on[F_att - 1]["scr"] for f in range(F_att, A)),
             "rowAEqualsPre": on[A]["scr"] == on[F_att - 1]["scr"],
             "postRowsEqualE": all(on[f]["scr"] == on[E]["scr"] for f in range(E, F_after)),
             "postRowsEqualEminus1": all(on[f]["scr"] == on[E - 1]["scr"] for f in range(E, F_after)),
             "rowEEqualsEminus1": on[E]["scr"] == on[E - 1]["scr"],
             "firstChangeAfterE": first(on, lambda r: r["scr"] != on[E]["scr"], E)}
        if k < len(off_runs):
            fa = off_runs[k][0]
            fafter = first(off, lambda r: r["ptr"] == X + 2, fa)
            fes = first(off, lambda r: r["ptr"] == X + 3, fa)
            g = last_change_before(off, fa)
            b.update({"off": {"G": g, "F_att": fa, "F_after": fafter, "F_es": fes, "span": fafter - fa, "attMinusG": fa - g,
                              "esMinusAfter": None if fes is None else fes - fafter,
                              "activeRises": sum(1 for i in rises(off) if fa <= i < fafter)}})
            summary["pairedOff"] += 1
            summary["off35"] += int(b["off"]["span"] == 35)
            summary["attMinusGSame"] += int(b["off"]["attMinusG"] == b["attMinusG_on"])
            summary["esMinusAfterSame"] += int(b["off"]["esMinusAfter"] == b["esMinusAfter_on"])
        summary["bodies"] += 1
        summary["pre3"] += int(b["pre"] == 3)
        summary["post2"] += int(b["post"] == 2)
        summary["preStatic"] += int(b["preRowsStatic"])
        summary["postEqualsE"] += int(b["postRowsEqualE"])
        bodies.append(b)
    off_others = []
    for A in rises(off):
        E = first(off, lambda r: not r["act"], A)
        off_others.append({"A": A, "E": E, "len": None if E is None else E - A, "mv": off[A]["mv"], "atk": off[A]["atk"], "ptr": off[A]["ptr"],
                           "screenChanges": sum(off[f]["scr"] != off[f - 1]["scr"] for f in range(A + 1, (E or len(off) - 1) + 1))})
    rec = {**meta, "bodies": bodies, "otherRisesOn": others, "risesOff": off_others}
    battler = 0 if meta["attackerSide"] == "player" else 1
    if not any(b["mv"] == meta["move"] and b["atk"] == battler for b in bodies):
        def ptr_runs(rows):
            s = first(rows, lambda r: r["mv"] == meta["move"] and r["atk"] == battler, 0)
            rr, f = [], s
            while f < len(rows) and len(rr) < 40:
                g = f
                while g + 1 < len(rows) and rows[g + 1]["ptr"] == rows[f]["ptr"]:
                    g += 1
                rr.append([rows[f]["ptr"], f, g - f + 1])
                f = g + 1
            return rr
        rec["noAttackerBody"] = {"ptrRunsOn": ptr_runs(on), "ptrRunsOff": ptr_runs(off)}
        nb = rec["noAttackerBody"]
        # through the "attack missed!" message: the first 11 pointer runs (attackstring .. the 32-frame pause .. resultmessage's wait)
        nb["first11RunsEqualOnOff"] = nb["ptrRunsOn"][:11] == nb["ptrRunsOff"][:11]
        for mode, rows in (("on", on), ("off", off)):
            runs = nb["ptrRunsOn" if mode == "on" else "ptrRunsOff"]
            pause = next(x for x in runs if x[2] == 32)  # BattleScript_MoveMissedPause: pause B_WAIT_TIME_SHORT
            G = last_change_before(rows, pause[1])
            M = first(rows, lambda r: r["scr"] != rows[r["f"] - 1]["scr"], pause[1])
            nb[mode] = {"G": G, "pauseStart": pause[1], "pauseFrames": pause[2], "firstChangeAfterPause": M, "G1ToNextChange": M - G - 1}
    out["scenarios"][stem] = rec
    for b in bodies:
        o = b.get("off", {})
        print(f"{stem:46s} mv {b['mv']:3d} atk {b['atk']} A {b['A']:4d} pre {b['pre']} post {b['post']} E-A {b['E_minus_A']:3d} span {b['spanOn']:3d} "
              f"off {o.get('span')} attG {b['attMinusG_on']}/{o.get('attMinusG')} esAft {b['esMinusAfter_on']}/{o.get('esMinusAfter')} "
              f"preStatic {b['preRowsStatic']} rowA=pre {b['rowAEqualsPre']} post=E {b['postRowsEqualE']} post=E-1 {b['postRowsEqualEminus1']}")
out["summary"] = summary
json.dump(out, open(out_path, "w"), indent=1)
print(json.dumps(summary))
