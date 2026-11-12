#!/usr/bin/env python3
"""Tag divergence cards with likely-cause signatures and cross them with the re-run on the newer engine.

Usage (from the workspace root): tags.py CARDS.json RERUN_DIR OUT.json
"""
import json, sys, os, collections

cards = json.load(open(sys.argv[1]))
rerun = sys.argv[2]
G = "src/data/gen/"
moves = {m["name"]: m for m in json.load(open(G + "moves.json"))["moves"]}
RECOIL_EFFECTS = {"EFFECT_RECOIL", "EFFECT_DOUBLE_EDGE", "EFFECT_RECOIL_IF_MISS"}
AI_ITEM = {"CHOICE_BAND", "THICK_CLUB", "LIGHT_BALL", "DEEP_SEA_TOOTH", "DEEP_SEA_SCALE", "SOUL_DEW", "METAL_POWDER"}

def rerun_state(seed):
    p = f"{rerun}/{seed}.summary.json"
    if not os.path.exists(p) or os.path.getsize(p) == 0:
        return "no-result"
    j = json.load(open(p))
    ok = j["engineError"] is None and j["divergence"] is None and j["matched"] == j["engineStates"] and j["drive"]["stop"] == "outcome"
    return "now-matches" if ok else f"still {j['matched']}/{j['engineStates']}"

rows = []
for c in cards:
    tags = []
    msgs = set(c.get("messages") or [])
    em = c.get("engineMoves") or []
    names = [x.split(":", 1)[1] for x in em]
    effs = {moves[n]["effect"] for n in names if n in moves}
    before = c.get("before") or [{}, {}]
    flags = " ".join(" ".join(b.get("flags", [])) for b in before)
    prev, eng = c.get("prevRow"), c.get("engineRow")
    if c.get("engineError"):
        tags.append("ENGINE-ERROR")
    if "PKMNGOTENCORE" in msgs or "encoreTimer" in flags or (prev and 227 in prev[5:7]):
        tags.append("ENCORE")
    if "PKMNHITWITHRECOIL" in msgs:
        if "STRUGGLE" in names:
            tags.append("STRUGGLE-RECOIL")
        elif effs & RECOIL_EFFECTS:
            tags.append("RECOIL-MOVE")
        else:
            tags.append("RECOIL-ON-NON-RECOIL-MOVE")
    elif "STRUGGLE" in names or "STRUGGLE" in (c.get("romMoves") or []):
        tags.append("STRUGGLE")
    if "ITHURTCONFUSION" in msgs:
        tags.append("CONFUSION-SELF-HIT")
    if "PKMNINLOVE" in msgs:
        tags.append("INFATUATION")
    if msgs & {"PKMNFASTASLEEP", "PKMNWOKEUP"}:
        tags.append("SLEEP-TURN")
    # opponent replacement: engine shows a new opponent mon; the ROM shows hp1 -> 0 -> a different value
    if eng and prev and "SWITCHINMON" in msgs and "TARGETFAINTED" in msgs:
        rh = c.get("romHp") or []
        rom_new = None
        for i, (h0, h1) in enumerate(rh):
            if h1 == 0:
                nxt = [x for x in rh[i + 1:] if x[1] > 0]
                rom_new = nxt[0][1] if nxt else None
                break
        if rom_new is not None and rom_new != eng[3]:
            tags.append("OPP-REPLACEMENT-DIFFERS")
        elif rom_new is None:
            tags.append("AFTER-OPP-FAINT (rom replacement not seen)")
        else:
            tags.append("AFTER-OPP-FAINT (same replacement hp)")
    if prev and prev[2] == 0:
        tags.append("AFTER-PLAYER-FAINT")
    if len(before) > 1 and before[1].get("holdEffect") in AI_ITEM or (len(before) > 1 and str(before[1].get("holdEffect", "")).endswith("_POWER")):
        tags.append("OPP-HOLDS-DAMAGE-ITEM")
    if not tags:
        tags.append("(none)")
    rows.append({"seed": c["seed"], "tier": c["challengeNum"], "class": c["class"], "stop": c["stop"], "matched": f"{c['matched']}/{c['engineStates']}", "tags": tags,
                 "rerun": rerun_state(c["seed"]), "engineMoves": em, "romMoves": c.get("romMoves"),
                 "P": f"{before[0].get('species')}/{before[0].get('ability')}/{before[0].get('holdEffect')}" if before[0] else None,
                 "O": f"{before[1].get('species')}/{before[1].get('ability')}/{before[1].get('holdEffect')}" if len(before) > 1 and before[1] else None,
                 "prevRow": prev, "engineRow": eng, "romHp": (c.get("romHp") or [])[:6], "messages": (c.get("messages") or [])[:12]})

json.dump(rows, open(sys.argv[3], "w"), indent=1)
n = len(rows)
fixed = sum(r["rerun"] == "now-matches" for r in rows)
print(f"mismatched on the old engine: {n}; now match on the newer engine: {fixed}; still mismatched: {n - fixed - sum(r['rerun']=='no-result' for r in rows)}; no result: {sum(r['rerun']=='no-result' for r in rows)}")
first = collections.Counter(); firstfixed = collections.Counter(); anyc = collections.Counter(); anyfixed = collections.Counter()
for r in rows:
    k = r["tags"][0]
    first[k] += 1
    if r["rerun"] == "now-matches": firstfixed[k] += 1
    for t in r["tags"]:
        anyc[t] += 1
        if r["rerun"] == "now-matches": anyfixed[t] += 1
print("\nany tag (a battle can carry several):")
for k, v in anyc.most_common():
    print(f"  {v:4d}  now-match {anyfixed[k]:3d}  {k}")
print("\nseeds per tag (still mismatched only):")
bytag = collections.defaultdict(list)
for r in rows:
    if r["rerun"] != "now-matches":
        for t in r["tags"]:
            bytag[t].append(r["seed"])
for k, v in sorted(bytag.items(), key=lambda kv: -len(kv[1])):
    print(f"  {k}: {v[:40]}")
