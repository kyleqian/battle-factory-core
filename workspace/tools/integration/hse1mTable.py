#!/usr/bin/env python3
"""hse1m: rank the Scene OFF hit-SE windows by the ROM script context in front of the used print (hse1mSplit.py output).

usage: hse1mTable.py ATTR_OFF.json SPLIT.json [NEW_ATTR_OFF.json]   (a re-scored attr file adds the "after" mass of the same rows per class)
A window = the rows from one nonzero offset step to the next (t2k3 own.py ownership); only windows whose stepping row is a hit SE 12 / 13 / 14 at the engine's hit-animation
command are classed. `ctx` = the ROM script labels between the previous MoveEnd / commit and the used print (from the probe's script rows)."""
import collections
import json
import sys

attr = [r for r in json.load(open(sys.argv[1])) if r["tag"] == "m"]
split = {(d["seed"], d["si"], d["rf"]): d for d in json.load(open(sys.argv[2]))}
new = {}
if len(sys.argv) > 3:
    new = {(r["seed"], r["si"], r["rf"], r["sid"], r["kind"]): abs(r["off"]) for r in json.load(open(sys.argv[3])) if r["tag"] == "m"}
seg = collections.defaultdict(list)
for r in attr:
    seg[(r["seed"], r["si"])].append(r)

windows = []
for (seed, si), lst in seg.items():
    lst.sort(key=lambda r: (r["rf"], r["ef"]))
    prev, cur = 0, None
    for r in lst:
        step = r["off"] - prev
        prev = r["off"]
        if step != 0 or cur is None:
            cur = dict(seed=seed, si=si, rf=r["rf"], step=step, off=r["off"], first=r, rows=0, mass=0, after=0, exact=0, fam=set())
            windows.append(cur)
        cur["rows"] += 1
        cur["mass"] += abs(r["off"])
        cur["after"] += new.get((seed, si, r["rf"], r["sid"], r["kind"]), 0)
        cur["exact"] += r["off"] == 0
        cur["fam"].add((r["fam"], r["sid"], r["ecmd"]))


def classify(w):
    f = w["first"]
    if not (f["fam"] == "battle-controller SE" and f["sid"] in (12, 13, 14)):
        return None
    d = split.get((w["seed"], w["si"], f["rf"]))
    if d is None or "ctxRom" not in d:
        return "hit SE, no used-print chain (hit-all / multi-turn / parse miss)" if f["ecmd"] == "hit-animation" else None
    if f["ecmd"] != "hit-animation":
        return None
    c = d["ctxRom"]
    marks = (("NoMovesLeft", "S"), ("MoveUsedIsConfused", "C"), ("DoSelfConfusionDmg", "C"), ("MoveUsedWokeUp", "W"), ("MoveUsedIsInLove", "L"), ("EffectFocusPunch", "F"),
             ("TwoTurnMovesSecondTurn", "T"), ("SecondTurnSemiInvulnerable", "T"), ("MoveMissed", "M"), ("ButItFailed", "M"), ("MonMadeMoveUseless", "M"))
    hit = "S" if d["mv"] == 165 or "NoMovesLeft" in " ".join(c[-4:]) else next((code for lab in reversed(c) for key, code in marks if key in lab), None)
    names = {
        "S": "Struggle after `NoMovesLeft` (no-moves print + A press)",
        "C": "attackcanceler confusion path (`MoveUsedIsConfused[NoMore]`: confusion print)",
        "W": "attackcanceler wake-up path (`MoveUsedWokeUp`: wake-up print)",
        "L": "attackcanceler infatuation path (`MoveUsedIsInLove`)",
        "F": "Focus Punch (`EffectFocusPunch` after `FocusPunchSetUp` print)",
        "T": "two-turn / semi-invulnerable second turn",
        "M": "after a missed / failed / useless action (print, `MoveMissedPause`)",
    }
    if hit in names:
        return names[hit]
    return "plain (previous action's `MoveEnd`, end-turn, item / status rows)"


agg = collections.defaultdict(lambda: dict(win=0, rows=0, mass=0, after=0, steps=[], seeds=set(), ex=[]))
for w in windows:
    k = classify(w)
    if k is None:
        continue
    a = agg[k]
    a["win"] += 1
    a["rows"] += w["rows"]
    a["mass"] += w["mass"]
    a["after"] += w["after"]
    a["steps"].append(w["step"])
    a["seeds"].add(w["seed"])
    a["ex"].append((w["mass"], w["seed"], w["si"], w["rf"], w["step"]))
tw = sum(a["win"] for a in agg.values())
tm = sum(a["mass"] for a in agg.values())
print(f"hit-animation windows {tw}, owned mass {tm}")
for k, a in sorted(agg.items(), key=lambda kv: -kv[1]["mass"]):
    st = sorted(a["steps"])
    print(f"{a['win']:3d} win {a['rows']:4d} rows mass {a['mass']:4d}{(' -> ' + str(a['after'])) if new else ''}  seeds {len(a['seeds']):2d} steps {st[0]}..{st[-1]} median {st[len(st)//2]}  {k}")
    print("      top:", sorted(a["ex"], reverse=True)[:4])
