#!/usr/bin/env python3
"""speciesAudit: derive the swapped scenario's dense window from its OWN source body activation frames (never from live output).
For each list.tsv row: bodies(orig) / bodies(swapped) from prep11Probe.py (body = gAnimScriptActive run: move, start, end).  The accepted window
[S,E] sits at offset S-start_k from the activation of the last original body k with start_k <= S; the swapped window is
[start'_k + (S-start_k), +(E-S)] on the SAME body index k (move sequence must match).  Writes tools/integration/fixtures/species-audit/derived/<stem>.json
(fixture copy with the derived denseWindow/sourceWindow) and prints a table.  usage: speciesAuditDerive.py list.tsv bodiesdir"""
import json, sys, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
out = f"{ROOT}/tools/integration/fixtures/species-audit/derived"; os.makedirs(out, exist_ok=True)
bd = sys.argv[2]
def bodies(scen):
    d = json.load(open(f"{bd}/{os.path.basename(scen)}")); return [(b["move"], b["start"], b["end"]) for b in d["bodies"]], d["frames"]
def mons(scen, i):  # ROM battler HP at the window body's activation edge (gBattleMons): the healthbox input the swap changes (Tackle damage, earlier hits)
    return json.load(open(f"{bd}/{os.path.basename(scen)}"))["bodies"][i]["atActivation"]["mons"]
for l in open(sys.argv[1]):
    k, orig, aud, sw = l.rstrip("\n").split("\t")
    of = json.load(open(f"{ROOT}/{orig}"))
    if of.get("sourceFixture"): of = {**json.load(open(f"{ROOT}/{of['sourceFixture']}")), **of}
    af = json.load(open(f"{ROOT}/{aud}"))
    key = "denseWindow" if of.get("denseWindow") else "sourceWindow"; W = of[key]; S, E = W["startFrame"], W["endFrame"]
    try: ob, of_n = bodies(of["scenario"]); sb, sf_n = bodies(sw)
    except Exception as e: print(k, "NO-BODIES", e); continue
    idx = [i for i, b in enumerate(ob) if b[1] <= S]
    if not idx or [b[0] for b in ob[:idx[-1] + 1]] != [b[0] for b in sb[:idx[-1] + 1]]:  # preceding bodies + the window body must agree (later ones may differ)
        print(k, "BODY-MISMATCH", ob, sb); continue
    i = idx[-1]; off = S - ob[i][1]; s2 = sb[i][1] + off; e2 = s2 + (E - S)
    if olen != slen: e2 = min(e2, sb[i][2])  # the swapped ROM body is shorter: its probe records nothing past the body end
    olen, slen = ob[i][2] - ob[i][1], sb[i][2] - sb[i][1]
    f = dict(af); m = mons(sw, i); mo = mons(of["scenario"], i)
    f["fieldProfile"] = {**af["fieldProfile"], "playerHp": m[0]["hp"], "playerMaxHp": m[0]["maxHP"], "opponentHp": m[1]["hp"], "opponentMaxHp": m[1]["maxHP"]}
    hpNote = {"orig": [mo[0]["hp"], mo[1]["hp"]], "swapped": [m[0]["hp"], m[1]["hp"]], "acceptedProfile": [of["fieldProfile"]["playerHp"], of["fieldProfile"]["opponentHp"]]}
    f[key] = {**W, "startFrame": s2, "endFrame": e2}
    f["speciesAudit"] = {"acceptedWindow": [S, E], "bodyIndex": i, "origBody": ob[i], "swappedBody": sb[i], "offsetFromActivation": off, "romHpAtActivation": hpNote}
    json.dump(f, open(f"{out}/{k}.json", "w"), indent=1); open(f"{out}/{k}.json", "a").write("\n")
    flag = "" if (olen == slen and sb[i][1] + 0 >= 0 and e2 < sf_n) else " **LEN/RANGE**"
    print(f"{k}\tbody{i}/{len(ob)} move{ob[i][0]} orig[{ob[i][1]},{ob[i][2]}] sw[{sb[i][1]},{sb[i][2]}] acc[{S},{E}] -> [{s2},{e2}] len {olen}/{slen} frames {of_n}/{sf_n}{flag} hp {hpNote}")
