#!/usr/bin/env python3
"""Build one 'divergence card' per mismatched seed and group the cards.

Usage (from the workspace root): cards.py BATCH_DIR EV_DIR OUT.json
BATCH_DIR holds SEED-off.{req,engine,tl,cmp}.json + SEED.summary.json; EV_DIR holds SEED.ev.json (engine replay --events=1).
"""
import json, sys, os, collections

batch, evdir, out = sys.argv[1], sys.argv[2], sys.argv[3]
G = "src/data/gen/"
moves = {m["id"]: m for m in json.load(open(G + "moves.json"))["moves"]}
abil = {a["id"]: a["name"].replace("ABILITY_", "") for a in json.load(open(G + "ability-item-hooks.json"))["universes"]["abilities"]}
items = {i["itemId"]: (i["item"].replace("ITEM_", ""), i["holdEffect"].replace("HOLD_EFFECT_", "")) for i in json.load(open(G + "item-hold-effects.json"))["items"]}
species = {s["id"]: s["name"].replace("SPECIES_", "") for s in json.load(open(G + "species-stats.json"))["species"]}

def mv(i):
    m = moves.get(i)
    return f"{m['name']}" if m else str(i)

def eff(i):
    m = moves.get(i)
    return m["effect"].replace("EFFECT_", "") if m else "?"

def dedup(seq):
    o = []
    for x in seq:
        if not o or o[-1] != x:
            o.append(x)
    return o

def battler_brief(b):
    st = []
    if b["status1"]: st.append(f"s1={b['status1']}")
    if b["status2"]: st.append(f"s2={b['status2']}")
    if b["status3"]: st.append(f"s3={b['status3']}")
    for k in ("encoreTimer", "disableTimer", "tauntTimer", "substituteHP", "truantCounter", "perishSongTimer"):
        if b.get(k): st.append(f"{k}={b[k]}")
    stages = b.get("statStages")
    if stages and any(s != 6 for s in stages): st.append("stages=" + ",".join(map(str, stages)))
    it = items.get(b["item"], (str(b["item"]), "?"))
    return {"species": species.get(b["species"], b["species"]), "ability": abil.get(b["ability"], b["ability"]), "item": it[0], "holdEffect": it[1],
            "hp": f"{b['hp']}/{b['maxHP']}", "moves": [mv(m) for m in b["moves"]], "pp": b["pp"], "flags": st}

cards = []
seeds = sorted(int(f.split(".")[0]) for f in os.listdir(batch) if f.endswith(".summary.json") and os.path.getsize(os.path.join(batch, f)) > 0)
for s in seeds:
    sm = json.load(open(f"{batch}/{s}.summary.json"))
    ok = sm["engineError"] is None and sm["divergence"] is None and sm["matched"] == sm["engineStates"] and sm["drive"]["stop"] == "outcome"
    if ok:
        continue
    req = json.load(open(f"{batch}/{s}-off.req.json"))
    e = json.load(open(f"{batch}/{s}-off.engine.json"))
    tl = json.load(open(f"{batch}/{s}-off.tl.json"))
    c = json.load(open(f"{batch}/{s}-off.cmp.json"))
    card = {"seed": s, "challengeNum": req.get("challengeNum"), "trainerId": req.get("trainerId"), "stop": sm["drive"]["stop"], "matched": sm["matched"], "engineStates": sm["engineStates"],
            "engineError": sm["engineError"]}
    E = e["timeline"]; R = tl["rows"]
    div = c["divergence"]["engine"] if c.get("divergence") else None
    card["engineRow"] = div
    idx = next((i for i, r in enumerate(E) if r == div), None) if div else None
    prev = E[idx - 1] if idx else (E[0] if E else None)
    card["prevRow"] = prev
    # ROM rows after the last matched state (state = row[1:]) -- up to 40
    j = None
    if prev is not None:
        for k, r in enumerate(R):
            if r[1:] == prev[1:]:
                j = k
    after = R[(j + 1) if j is not None else 0:][:40]
    card["romMoves"] = [mv(x) for x in dedup([r[1] for r in after if r[1] != 0])][:6]
    card["romHp"] = dedup([(r[2], r[3]) for r in after])[:8]
    card["romRngEqEngine"] = bool(div) and any(r[4] == div[4] for r in after)
    card["romHpEqEngine"] = bool(div) and any((r[2], r[3]) == (div[2], div[3]) for r in after)
    # engine diverging turn from the events replay
    evp = f"{evdir}/{s}.ev.json"
    turn = None
    if div and os.path.exists(evp) and os.path.getsize(evp) > 0:
        te = json.load(open(evp)).get("turnEvents") or []
        exact = [t for t in te if t["frame"] == div[0]]
        prior = [t for t in te if t["frame"] <= div[0]]
        turn = exact[0] if exact else (prior[-1] if prior else None)
        card["noDecisionTurn"] = not exact
    if turn:
        used = [(ev["actionSnapshot"]["attacker"], ev["actionSnapshot"]["currentMove"]) for ev in turn["events"] if ev.get("messageId") == "STRINGID_USEDMOVE" and ev.get("actionSnapshot")]
        card["engineMoves"] = [f"{'P' if a == 0 else 'O'}:{mv(m)}" for a, m in used]
        card["engineMoveEffects"] = [f"{'P' if a == 0 else 'O'}:{eff(m)}" for a, m in used]
        card["labels"] = dedup([ev["label"].replace("BattleScript_", "") for ev in turn["events"] if ev.get("label")])[:14]
        card["messages"] = dedup([ev["messageId"].replace("STRINGID_", "") for ev in turn["events"] if ev.get("messageId")])[:14]
        card["before"] = [battler_brief(b) for b in turn["battlersBefore"][:2]]
    # coarse class
    em = [x.split(":", 1)[1] for x in card.get("engineMoves", [])]
    rm = card["romMoves"]
    if sm["engineError"]:
        cls = "engine-error"
    elif div is None:
        cls = "no-divergence-row"
    elif card.get("noDecisionTurn"):
        cls = "engine-auto-turn (no player prompt)"
    elif em and rm and em[:len(rm)] != rm[:len(em)]:
        cls = "different move or order"
    elif card["romHpEqEngine"] and not card["romRngEqEngine"]:
        cls = "same HP, dice differ"
    elif not card["romHpEqEngine"]:
        cls = "same moves, HP differs"
    else:
        cls = "other"
    card["class"] = cls
    cards.append(card)

json.dump(cards, open(out, "w"), indent=1)
total = len(seeds)
print(f"summaries {total}; mismatched {len(cards)}")
by = collections.Counter(c["class"] for c in cards)
for k, v in by.most_common():
    print(f"  {v:4d}  {k}")
print("by stop:", dict(collections.Counter(c["stop"] for c in cards)))
print("by challenge tier:", dict(sorted(collections.Counter(c["challengeNum"] for c in cards).items())))
