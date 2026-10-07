#!/usr/bin/env python3
"""prep29: per-move measured body signature from prep29Probe.py state probes (/tmp/p22s) + Random2 attribution probes (/tmp/p22r2).
For each scenario: body window (first anim-active frame = activation A, first inactive = end), activation allocator state, spawn/free stream relative to A
(slot, template, callback, subpriority, bank), task create/free stream, BG/blend register events, Random2 draw frames, palette snapshot sha1 at activation.
Cross-scenario equality (accepted player/opponent + alternates) is the 'K' (constant under the known-entry allocator) measurement.
usage: prep29Analyze.py STATE_DIR R2_DIR OUT_DIR"""
import hashlib, json, sys
from pathlib import Path
SD, RD, OUT = map(Path, sys.argv[1:4])
OUT.mkdir(parents=True, exist_ok=True)
MOVES = {"bonemerang": ("Move_BONEMERANG", 155), "eruption": ("Move_ERUPTION", 284), "rapid-spin": ("Move_RAPID_SPIN", 229), "spit-up": ("Move_SPIT_UP", 255), "luster-purge": ("Move_LUSTER_PURGE", 295), "outrage": ("Move_OUTRAGE", 200)}
h = lambda o: hashlib.sha1(json.dumps(o, sort_keys=True).encode()).hexdigest()[:12]
def scenarios(move):
    k = move
    return sorted({p.name[:-8] for p in SD.glob("*-r1.json") if (p.name.startswith(f"mechanic-{k}-") or p.name.startswith(f"prep29-{k}-alt-"))})
def sig(name):
    d = json.loads((SD / f"{name}-r1.json").read_text()); r2 = json.loads((RD / f"{name}-r1.json").read_text())
    names = {str(int(k) + 1): v for k, v in ((k, v) for k, v in d["taskFuncNames"].items())}
    strip = lambda j: {k: v for k, v in j.items() if k != "finalStateSha1"}
    out = {"scenario": name, "twiceIdentical": d == json.loads((SD / f"{name}-r2.json").read_text()) and strip(r2) == strip(json.loads((RD / f"{name}-r2.json").read_text()))}
    return d, r2, names, out
res = {}
for mv, (label, mid) in MOVES.items():
    rows = []
    for sc in scenarios(mv):
        d, r2, names, o = sig(sc)
        b = [x for x in d["bodies"] if x["move"] == mid]
        if not b: o["error"] = "no body"; rows.append(o); continue
        b = b[0]; A, E = b["start"], b["end"]
        act = b["atActivation"]
        end1 = b.get("atEnd+1", {})
        o.update({"activation": A, "endExclusive": E, "bodyFrames": E - A, "rng2AtActivation": act["rng2"], "bitmapAtActivation": act["bitmap"], "tasksAtActivation": act["tasks"], "spritesAtActivation": act["sprites"],
                  "spriteOrderAtActivation": act["spriteOrder"], "battlerSub": act["battlerSub"], "battlerXY": act["battlerXY"], "battlerX2Y2": act["battlerX2Y2"], "battlerPalNum": act["battlerPalNum"],
                  "netZero": end1.get("bitmap") == act["bitmap"] and end1.get("tasks") == act["tasks"] and end1.get("sprites") == act["sprites"],
                  "paletteSha": {"objUnfaded": h(act["objUnfaded"]), "objFaded": h(act["objFaded"]), "bgUnfaded": h(act["bgUnfaded"])}})
        sp = [x for x in d["spawns"] if A <= x["f"] <= E + 1]
        o["spawns"] = [[x["f"] - A, x["slot"], x["ev"]] + ([hex(x["tmpl"]), x["sub"], hex(x["cb"]), x["attr"][2] >> 12, (x["attr"][2] & 0x3ff)] if x["ev"] == "+" else []) for x in sp]
        o["spawnSig"] = h([[a, b_, c] + e[:2] + e[2:] for a, b_, c, *e in o["spawns"]])
        o["slotStream"] = h([[a, b_, c] for a, b_, c, *_ in o["spawns"]])
        o["nSpawns"] = sum(1 for s in o["spawns"] if s[2] == "+")
        te = [[f - A, {k: (names.get(str(v), hex(v))) for k, v in tf.items()}, dat] for f, tf, dat in d["taskEvents"] if A - 1 <= f <= E + 1]
        o["taskStream"] = te; o["taskSig"] = h(te); o["taskSlotSig"] = h([[a, b_] for a, b_, _c in te if a >= 1])
        re_ = [[f - A, rg] for f, rg in d["regEvents"] if A <= f <= E + 1]
        o["regEventCount"] = len(re_); o["regSig"] = h(re_)
        act_regs = act["regs"]
        blend = [[f - A, {k: v for k, v in rg.items() if k in ("dispcnt", "bldcnt", "bldalpha", "bldy")}] for f, rg in d["regEvents"] if A <= f <= E + 1]
        o["win"] = {k: act_regs.get(k) for k in ("win0h", "win0v", "win1h", "win1v", "winin", "winout")}
        o["blendRegSig"] = h(blend); o["bgScrollSig"] = h([[f - A, {k: v for k, v in rg.items() if k.startswith("bg")}] for f, rg in d["regEvents"] if A <= f <= E + 1])
        # Task_UpdateMonBg data == [spriteSlot, x+x2, y+y2, 32-(x+x2), 32-(y+y2)] of the battler at activation?
        mon = []
        for f, tf, dat in d["taskEvents"]:
            if A <= f <= E:
                for k, fn in tf.items():
                    if names.get(str(fn), "") == "Task_UpdateMonBg" and (k, tuple(dat[k][:5])) not in mon: mon.append((k, tuple(dat[k][:5])))
        pos = [[act["battlerXY"][b][0] + act["battlerX2Y2"][b][0], act["battlerXY"][b][1] + act["battlerX2Y2"][b][1]] for b in (0, 1)]
        o["monbgTasks"] = [[k, list(v)] for k, v in mon]
        o["monbgMatchesBattlerAtActivation"] = [any(v[1:5] == (p[0], p[1], 32 - p[0], 32 - p[1]) for p in pos) for k, v in mon]
        o["orderChanges"] = len([1 for f, od in d["orderSeries"] if A <= f <= E])
        o["orderFirst"] = [od for f, od in d["orderSeries"] if A <= f <= E][:1]
        # Random2: draw frames inside the body
        nt = [x for x in r2["singleSteppedNonTrivial"] if A <= x["frame"] <= E]
        o["random2Callers"] = r2["singleSteppedCallerTotals"]; o["random2DrawFrames"] = [[x["frame"] - A, x["random2Calls"], [c for c in x["callers"] if not c.startswith("RfuMain1")]] for x in nt]
        o["random2Draws"] = sum(len(x[2]) for x in o["random2DrawFrames"])
        o["rng2Series"] = None
        rows.append(o)
    ok = [r for r in rows if "error" not in r]
    res[mv] = {"label": label, "moveId": mid, "scenarios": [r["scenario"] for r in rows],
               "equal": {f: len({json.dumps(r[f], sort_keys=True) for r in ok}) == 1 for f in ("bodyFrames", "bitmapAtActivation", "tasksAtActivation", "spritesAtActivation", "spriteOrderAtActivation", "slotStream", "spawnSig", "taskSig", "taskSlotSig", "regSig", "blendRegSig", "bgScrollSig", "random2Draws", "netZero")},
               "distinct": {f: sorted({json.dumps(r[f], sort_keys=True)[:80] for r in ok}) for f in ("bodyFrames", "slotStream", "spawnSig", "taskSig", "taskSlotSig", "regSig", "blendRegSig", "bgScrollSig", "random2Draws")},
               "rows": rows}
    import re
    side = lambda n: re.search(r"(?:mechanic-[a-z-]+?|alt)-(player|opponent)-", n).group(1)
    FIELDS = ("bodyFrames", "bitmapAtActivation", "tasksAtActivation", "spritesAtActivation", "spriteOrderAtActivation", "slotStream", "spawnSig", "taskSlotSig", "taskSig", "blendRegSig", "bgScrollSig", "random2Draws", "netZero", "nSpawns")
    res[mv]["perSideAcceptedEqualsAlternate"] = {sd: {f: [r[f] for r in ok if side(r["scenario"]) == sd and "-alt-" not in r["scenario"]] == [r[f] for r in ok if side(r["scenario"]) == sd and "-alt-" in r["scenario"]] for f in FIELDS} for sd in ("player", "opponent")}
    res[mv]["perSideMonbgMatch"] = {sd: [r["monbgMatchesBattlerAtActivation"] for r in ok if side(r["scenario"]) == sd] for sd in ("player", "opponent")}
    json.dump(res[mv], open(OUT / f"{mv}.json", "w"), indent=0, separators=(",", ":"))
    print(mv, "n", len(ok), "frames", res[mv]["distinct"]["bodyFrames"], "draws", res[mv]["distinct"]["random2Draws"], "spawns", [(r["scenario"][-12:], r["nSpawns"]) for r in ok])
    for sd, v in res[mv]["perSideAcceptedEqualsAlternate"].items(): print("   ", sd, "NOT-equal:", [k for k, x in v.items() if not x], "monbg", res[mv]["perSideMonbgMatch"][sd])
