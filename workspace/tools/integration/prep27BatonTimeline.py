#!/usr/bin/env python3
"""prep27: Baton Pass ROM timeline (E-relative boundaries) from prep27Probes.sh raw runs.
usage: prep27BatonTimeline.py <rawdir> [out.json].  E = last frame with gAnimScriptActive (body); k = frame - E; age = frame - first active frame.
Boundaries are derived from per-frame state transitions only (no hand-entered numbers)."""
import json, sys
from pathlib import Path
RAW = Path(sys.argv[1]); out = {}
for p in sorted(RAW.glob("*.json")):
    d = json.loads(p.read_text()); E = d["E"]; R = {int(k) - E: v for k, v in d["rows"].items()}; ks = sorted(R)
    side = "player" if "baton-pass-player" in p.name or "baton-player" in p.name else "opponent"; a = 0 if side == "player" else 1
    def first(pred, lo=-200, hi=10**6):
        for k in ks:
            if lo <= k <= hi and pred(R[k]): return k
    def trans(get, frm, to, lo=-200):
        prev = None
        for k in ks:
            if k < lo: continue
            v = get(R[k])
            if prev is not None and prev == frm and v == to: return k
            prev = v
    b0 = first(lambda r: r["anim"] == 1); body = {"firstActive": b0, "lastActive": 0, "activeFrames": 0 - b0 + 1}
    t = {}
    t["attackerHide"] = trans(lambda r: r["b"][a][5], 0, 1)             # invisible 0->1 (age = k - firstActive)
    t["attackerHideAge"] = t["attackerHide"] - b0
    t["hbHideAfterBody"] = trans(lambda r: r["h"][a][5], 0, 1, 0)
    t["attackerSpriteFree"] = trans(lambda r: r["b"][a][6], 1, 0, 0)   # first in-use 1->0 after body end
    t["ctrlOpenParty"] = first(lambda r: r["ctrl"][a] == "OpenPartyMenuToChooseMon", 0)
    t["cb2InitParty"] = first(lambda r: r["cb2"] == "CB2_InitPartyMenu", 0)
    t["cb2UpdateParty"] = first(lambda r: r["cb2"] == "CB2_UpdatePartyMenu", 0)
    t["partyCloseTask"] = first(lambda r: "Task_ClosePartyMenuAndSetCB2" in r["tasks"].values(), 0)
    t["cb2Reshow"] = first(lambda r: r["cb2"] == "CB2_SetUpReshowBattleScreenAfterMenu", 0)
    t["cb2BackToBattle"] = trans(lambda r: r["cb2"], "CB2_ReshowBattleScreenAfterMenu", "BattleMainCB2", 0)
    t["partyIndexChange"] = trans(lambda r: r["pidx"][a], R[0]["pidx"][a], [x for x in (R[k]["pidx"][a] for k in ks if k > 0) if x != R[0]["pidx"][a]][0], 0) if True else None
    t["speciesChange"] = first(lambda r: r["species"][a] != R[0]["species"][a], 0)
    t["ballSpawn"] = next((s["f"] - E for s in d["spawns"] if s["ev"] == "+" and s["cb"] == "SpriteCB_WaitForBattlerBallReleaseAnim" and s["f"] - E > 0), None)
    t["monSendOutSpawn"] = next((s["f"] - E for s in d["spawns"] if s["ev"] == "+" and s["cb"] in ("SpriteCB_PlayerMonSendOut_1", "SpriteCB_OpponentMonSendOut") and s["f"] - E > 0), None)
    t["firstParticle"] = next((s["f"] - E for s in d["spawns"] if s["ev"] == "+" and s["cb"] == "PokeBallOpenParticleAnimation_Step1" and s["f"] - E > 0), None)
    t["healthboxSlideSpawn"] = next((s["f"] - E for s in d["spawns"] if s["ev"] == "+" and s["cb"] == "SpriteCB_HealthBar" and s["f"] - E > 0), None)
    rb = t["returnToBall"] = trans(lambda r: r["b"][a][6], 1, 0, t["cb2BackToBattle"] or 0)   # instant returntoball: sprite destroyed (after the reshown battle screen for the player)
    t["healthboxHideAtReturn"] = first(lambda r: r["h"][a][5] == 1 and R[rb - 1]["h"][a][5] == 0, rb) if rb else None
    t["healthboxShown"] = trans(lambda r: r["h"][a][5], 1, 0, rb or 0)
    base = R[rb]["txt"][:2]
    t["textStart"] = first(lambda r: r["txt"][:2] != base, rb)
    t["textLastChange"] = max(k for k in ks if k > rb and R[k]["txt"][:2] != R[k - 1]["txt"][:2]) if t["textStart"] is not None else None
    # text printer: first frame of the first printer after body end (SWITCHINMON) -> counter byte changes each frame
    t["partyOpenFrames"] = [t["cb2InitParty"], t["cb2BackToBattle"]]
    t["mainTurnPassed"] = first(lambda r: r["main"] == "BattleTurnPassed", 0)
    t["ctrlWaitMonSelection"] = first(lambda r: r["ctrl"][a] == "WaitForMonSelection", 0)
    # send-in tail: controller callbacks for the replaced side
    tail = []; prev = None
    for k in ks:
        if k >= 0 and R[k]["ctrl"][a] != prev: tail.append([k, R[k]["ctrl"][a]]); prev = R[k]["ctrl"][a]
    out[p.stem] = {"side": side, "E": E, "body": body, "t": t, "ctrlTail": tail}
if len(sys.argv) > 2: Path(sys.argv[2]).write_text(json.dumps(out, indent=1))
for n, v in out.items(): print(n, v["side"], v["body"], json.dumps(v["t"]))
