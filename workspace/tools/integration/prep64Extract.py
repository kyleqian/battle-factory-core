#!/usr/bin/env python3
"""prep64: raw probe files (prep64Probes.py) -> compact unit + trigger receipts (pure python3, no mGBA).

usage (from workspace/): prep64Extract.py <out-dir> <units.json>
Run A and run B of every job must be byte-identical files. Units are split as prep43Extract does (body = a gAnimScriptActive
interval from its rising edge, gap = up to the next rising edge; spriteOrderBodyPlans.windows, the production plan encoding).
A body is labelled by the anim script running at its first active frame (prep64Probe `state`): General_SubstituteFade ->
"general SUBSTITUTE_FADE", Move_X -> "body <mv>:<gBattleAnimAttacker side>", else the script label. Per fade the trigger context is recorded from `state`:
the battle-script cursor that launched it, the holder's substituteHP / HP before the breaking hit's datahpupdate and after the fade,
the frames the cursor waited at datahpupdate (the STRINGID_SUBSTITUTEDAMAGED message), the fade's active length, and the next body.
"""
import bisect, hashlib, json, sys
from pathlib import Path

sys.path.insert(0, "tools/integration")
import prep43Extract as X
import prep64Probes as J
import spriteOrderBodyPlans as P

# state row: [n, tf, cursor, hp0, hp1, sub0, sub1, s2sub, behind, act, mv, anim, execFlags, msg, animAttacker]
N, TF, CUR, HP0, HP1, SUB0, SUB1, S2, BEHIND, ACT, MV, ANIM, EXEC, MSG, ATK = range(15)


def label_of(anim, mv, attacker):
    side = "player" if attacker % 2 == 0 else "opponent"
    if anim == "General_SubstituteFade":
        return "general SUBSTITUTE_FADE"
    if anim and anim.startswith("Move_"):
        return f"body {mv}:{side}"
    return anim or f"mv-{mv}"


def units_of(path):
    d, W = P.windows(path)
    st = d["state"]
    keys = [s[N] for s in st]

    def state_at(n):
        return st[max(0, bisect.bisect_right(keys, n) - 1)]

    edges = [i for i, w in enumerate(W) if w["act"] and (i == 0 or not W[i - 1]["act"])]
    edges.append(len(W))
    out = []

    def unit(kind, lo, hi, label):
        wins, stray = [], 0
        for w in W[lo:hi]:
            if w["C"] or w["D"]:
                wins.append({"f": w["n"], "C": [[s, m] for s, m in P.create_modes(w["pmask"], w["C"])], "D": w["D"], "F": w["obsF"]})
            elif w["obsF"] != w["F"]:
                stray += 1
        text, survivors = X.plan_text(wins)
        first = W[min(lo, len(W) - 1)]
        return {"kind": kind, "label": label, "frame": first["n"], "F0": first["F"], "mask0": format(first["pmask"], "x"),
                "truncated": hi >= len(W) and kind == "body", "strayFChanges": stray, "plan": text, "survivorSlots": survivors,
                "windows": wins, "activeFrames": (W[hi - 1]["n"] - first["n"] + 1) if kind == "body" and hi > lo else None}

    for j in range(len(edges) - 1):
        a, b = edges[j], edges[j + 1]
        k = a
        while k < b and W[k]["act"]:
            k += 1
        s = state_at(W[a]["n"])
        out.append(unit("body", a, k, label_of(s[ANIM], W[a]["mv"], s[ATK])))
        out.append(unit("gap", k, b, "gap"))
    return d, out


def triggers(d, units):
    """Per SUBSTITUTE_FADE body: the source path that launched it, read from the per-frame state rows."""
    st, res = d["state"], []
    for i, u in enumerate(units):
        if u["label"] != "general SUBSTITUTE_FADE":
            continue
        k = next(x for x, s in enumerate(st) if s[N] >= u["frame"] and s[ANIM] == "General_SubstituteFade")
        enter = max(x for x in range(k) if st[x][CUR].startswith("BattleScript_SubstituteFade+0"))
        wait = max(x for x in range(enter) if st[x][CUR] != st[enter - 1][CUR])  # last row before the datahpupdate wait
        hold = 0 if st[enter][SUB0] == 0 and st[enter - 1][SUB0] > 0 else 1
        end = next(x for x in range(k, len(st)) if st[x][ANIM] != "General_SubstituteFade")
        nxt = next((v for v in units[i + 1:] if v["kind"] == "body"), None)
        res.append({
            "frame": u["frame"], "holder": ["player", "opponent"][hold], "launchedBy": st[enter - 1][CUR],
            "subHPBeforeDatahpupdate": st[enter - 1][SUB0 + hold], "subHPAfter": st[enter][SUB0 + hold],
            "holderHPBefore": st[enter - 1][HP0 + hold], "holderHPAfterFade": st[end][HP0 + hold],
            "status2SubstituteDuringFade": st[k][S2], "behindSubstituteAtLaunch": st[k][BEHIND], "behindSubstituteAfter": st[end][BEHIND],
            "datahpupdateWaitFrames": st[enter][N] - st[wait + 1][N], "fadeLaunchDelayFrames": st[k][N] - st[enter][N],
            "fadeActiveFrames": st[end][N] - st[k][N], "sAnimMoveIndexDuringFade": st[k][MV],
            "nextBody": None if nxt is None else {"label": nxt["label"], "frame": nxt["frame"], "plan": nxt["plan"]},
        })
    return res


if __name__ == "__main__":
    OUT = Path(sys.argv[1])
    result = {"schema": "prep64-units/v1", "jobs": {}}
    for job in J.JOBS:
        ident = job[0]
        a, b = OUT / "raw" / f"{ident}-A.json", OUT / "raw" / f"{ident}-B.json"
        if not a.exists():
            continue
        same = b.exists() and a.read_bytes() == b.read_bytes()
        d, units = units_of(a)
        result["jobs"][ident] = {
            "profile": job[1], "base": job[2], "ops": [list(o) for o in job[3]], "identicalAB": same,
            "rawSha256A": hashlib.sha256(a.read_bytes()).hexdigest(), "seed": d["seed"], "frameCount": d["frameCount"],
            "fadeTriggers": triggers(d, units), "units": units}
    Path(sys.argv[2]).write_text(json.dumps(result, separators=(",", ":"), sort_keys=True) + "\n")
    print(len(result["jobs"]), "jobs;", sum(not j["identicalAB"] for j in result["jobs"].values()), "A/B differ")
    for name, j in result["jobs"].items():
        bodies = [u for u in j["units"] if u["kind"] == "body"]
        fades = [(i, u) for i, u in enumerate(j["units"]) if u["label"] == "general SUBSTITUTE_FADE"]
        print(f"{name:16} {j['profile']:16} bodies {len(bodies):2} fades {len(fades)}: " + " | ".join(
            f"@{u['frame']} plan [{u['plan']}] wins {len(u['windows'])} stray {u['strayFChanges']} act {u['activeFrames']}" for _, u in fades))
        for t in j["fadeTriggers"]:
            print(f"   {t['holder']:8} via {t['launchedBy']} sub {t['subHPBeforeDatahpupdate']}->{t['subHPAfter']} hp {t['holderHPBefore']}->{t['holderHPAfterFade']}"
                  f" wait {t['datahpupdateWaitFrames']} act {t['fadeActiveFrames']} next {t['nextBody'] and (t['nextBody']['label'], t['nextBody']['plan'][:60])}")
