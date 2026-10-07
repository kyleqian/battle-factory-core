#!/usr/bin/env python3
"""speciesAudit6 derive: swapped fixture from the swapped scenario's OWN ROM probe (never live output): window = swapped body activation + accepted
offset, HP/gender/personality from gBattleMons at activation, presentationRngActivation = gRng2Value at the swapped activation edge.
usage: speciesAudit6Derive.py list.tsv probedir outdir"""
import json, sys, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
bd, out = sys.argv[2], sys.argv[3]; os.makedirs(out, exist_ok=True)
S_ = {s["id"]: s for s in json.load(open(f"{ROOT}/src/data/gen/species-stats.json"))["species"]}
def gender(sp, pers):
    r = S_[sp]["genderRatio"]
    return "none" if r == 255 else "female" if r == 254 else "male" if r == 0 else ("male" if (pers & 255) >= r else "female")
def probe(scen): return json.load(open(f"{bd}/{os.path.basename(scen)}"))
for l in open(sys.argv[1]):
    k, orig, sw, tside = l.rstrip("\n").split("\t")
    of = json.load(open(orig))
    if of.get("sourceFixture"): of = {**json.load(open(f"{ROOT}/{of['sourceFixture']}")), **of}
    key = "denseWindow" if of.get("denseWindow") else "sourceWindow"; W = of[key]; S, E = W["startFrame"], W["endFrame"]
    try: op, sp = probe(of["scenario"]), probe(sw)
    except Exception as e: print(k, "NO-PROBE", e); continue
    ob = [(b["move"], b["start"], b["end"], b) for b in op["bodies"]]; sb = [(b["move"], b["start"], b["end"], b) for b in sp["bodies"]]
    side = lambda b: "player" if b["atActivation"]["attacker"] == 0 else "opponent"
    idx = [i for i, b in enumerate(ob) if b[1] <= S]
    if not idx: print(k, "BODY-MISMATCH"); continue
    i = idx[-1]; occ = sum(1 for b in ob[:i + 1] if b[0] == ob[i][0]); js = [j for j, b in enumerate(sb) if b[0] == ob[i][0]]
    if len(js) < occ: print(k, "BODY-MISSING", [b[:3] for b in ob], [b[:3] for b in sb]); continue
    j = js[occ - 1]
    if side(sb[j][3]) != side(ob[i][3]): print(k, "BODY-SIDE-MISMATCH"); continue
    reordered = [b[0] for b in ob[:i]] != [b[0] for b in sb[:j]]
    off = S - ob[i][1]; s2 = sb[j][1] + off; e2 = s2 + (E - S); olen, slen = ob[i][2] - ob[i][1], sb[j][2] - sb[j][1]
    if olen != slen: e2 = min(e2, sb[j][2])
    act = sb[j][3]["atActivation"]; m = act["mons"]
    f = {kk: v for kk, v in of.items() if kk not in ("sourceFixture", "note", "presentationRngActivation", "precedingBodies")}
    f["scenario"] = os.path.relpath(sw, ROOT) if os.path.isabs(sw) else sw
    nm = lambda i: S_[m[i]["species"]]["name"].replace("SPECIES_", "")
    aside = of["attacker"]["geometry"]["side"]; ai = 0 if aside == "player" else 1
    f["target"] = {**of["target"], "species": nm(1 - ai)}
    if "attacker" in of: f["attacker"] = {**of["attacker"], "species": nm(ai)}
    if "attackerPersonality" in of: f["attackerPersonality"] = m[ai]["personality"]
    if j > 0: f["precedingBodies"] = [{"moveId": sb[q][0], "side": side(sb[q][3])} for q in range(j)]
    if of.get("precedingBodies"): f["precedingBodies"] = of["precedingBodies"]  # keep the accepted fixture's own list (statAnimation keys)
    if "bodyIndex" in f and not of.get("precedingBodies"): f["bodyIndex"] = j
    f["fieldProfile"] = {**of["fieldProfile"], "playerHp": m[0]["hp"], "playerMaxHp": m[0]["maxHP"], "opponentHp": m[1]["hp"], "opponentMaxHp": m[1]["maxHP"],
                         "playerGender": gender(m[0]["species"], m[0]["personality"]), "opponentGender": gender(m[1]["species"], m[1]["personality"])}
    f[key] = {**W, "startFrame": s2, "endFrame": e2}
    if "frameCount" in f[key]: f[key]["frameCount"] = e2 - s2 + 1
    if of.get("presentationRngActivation"):
        f["presentationRngActivation"] = {"value": act["rng2"], "source": f"speciesAudit6: gRng2Value at the swapped scenario's own activation frame {sb[j][1]} (prep14Probe atActivation.rng2)"}
    f["speciesAudit6"] = {"acceptedWindow": [S, E], "bodyIndex": j, "origBodyIndex": i, "turnOrderChanged": reordered, "origBody": ob[i][:3], "swappedBody": sb[j][:3], "offset": off,
                          "origRng2": ob[i][3]["atActivation"]["rng2"], "swappedRng2": act["rng2"], "hp": [m[0]["hp"], m[1]["hp"]], "frames": [op["frames"], sp["frames"]]}
    json.dump(f, open(f"{out}/{k}.json", "w"), indent=1); open(f"{out}/{k}.json", "a").write("\n")
    print(f"{k}\tbody{j} {'REORDERED ' if reordered else ''}orig{ob[i][:3]} sw{sb[j][:3]} acc[{S},{E}]->[{s2},{e2}] rng2 {ob[i][3]['atActivation']['rng2']}->{act['rng2']} len {olen}/{slen}")
