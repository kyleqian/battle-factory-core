#!/usr/bin/env python3
"""prep22: Fire Punch receipt from /tmp/p22/*-r{1,2}.json (prep22Probe.py). usage: prep22FirePunchReceipt.py PROBE_DIR OUT.json"""
import hashlib, json, sys
D, OUT = sys.argv[1:3]
SC = {"player-burn": "prep22-fire-punch-player-seed11", "player-noburn": "prep22-fire-punch-player-seed1", "player-faint": "prep22-fire-punch-faint-player",
      "opponent-burn": "prep22-fire-punch-opponent-seed2", "opponent-noburn": "prep22-fire-punch-opponent-seed1", "opponent-faint": "prep22-fire-punch-faint-opponent"}
res = {}
for name, k in SC.items():
    a, b = (json.load(open(f"{D}/{k}-r{r}.json")) for r in (1, 2))
    fp = next(x for x in a["bodies"] if x["move"] == 7)
    s, e = fp["start"], fp["end"]
    sig = [(x["f"] - s, x["slot"], x["ev"], hex(x.get("tmpl", 0)), x.get("x"), x.get("y")) for x in a["spawns"] if s <= x["f"] <= e + 1]
    statusBodies = [(x["start"], x["end"]) for x in a["bodies"] if x["move"] == 0]
    st = [x for x in a["statusSeries"] if x[0] > e]
    tgt = 1 if name.startswith("player") else 0  # target mon index (1 = opponent mon)
    burnSet = next((x[0] for x in a["statusSeries"] if x[1 + tgt] == 0x10 and x[0] > s), None)
    first = lambda f: [x for x in a["scriptSeries"] if x[3] == f]
    burnBody = [(x["start"], x["end"]) for x in a["bodies"] if x["move"] == 0]
    res[name] = {
        "scenario": k, "twiceIdentical": a == b, "activation": s, "endExclusive": e, "bodyFrames": e - s,
        "scriptLabels": [x[3] for x in a["scriptSeries"] if x[1]],
        "firePunchSpawnSigSha1": hashlib.sha1(json.dumps([(r, sl, ev, t) for r, sl, ev, t, _x, _y in sig]).encode()).hexdigest()[:12],
        "firePunchSpawnCount": len(sig), "spawnTemplates": sorted({t for _r, _s, ev, t, _x, _y in sig if ev == "+"}),
        "burnTemplatesInBody": [t for _r, _s, ev, t, _x, _y in sig if ev == "+" and t == "0x8595504"],
        "targetBurnedAtFrame": burnSet, "burnedAtFrameRelEnd": None if burnSet is None else burnSet - e,
        "statusBurnBodies": [{"start": x, "end": y, "frames": y - x, "startRelFirePunchEnd": x - e} for x, y in burnBody],
        "burnFlameSpawnsRelStatusBody": [(r, sl) for r, sl, ev, t, _x, _y in [(x["f"] - burnBody[0][0], x["slot"], x["ev"], hex(x.get("tmpl", 0)), 0, 0) for x in a["spawns"] if burnBody and burnBody[0][0] <= x["f"] <= burnBody[0][1] + 1] if ev == "+"] if burnBody else [],
        "targetHpSeries": [x for x in a["statusSeries"]][:6],
    }
sigs = {}
for n, r in res.items(): sigs.setdefault(n.split("-")[0], set()).add(r["firePunchSpawnSigSha1"])
res["_summary"] = {"spawnSignatureEqualAcrossOutcomesPerSide": {s: len(v) == 1 for s, v in sigs.items()}, "allTwiceIdentical": all(r["twiceIdentical"] for k, r in res.items() if k[0] != "_")}
json.dump(res, open(OUT, "w"), indent=1)
print(json.dumps(res["_summary"]))
for n, r in res.items():
    if n[0] != "_": print(n, r["activation"], r["endExclusive"], r["bodyFrames"], r["firePunchSpawnCount"], r["burnTemplatesInBody"], r["burnedAtFrameRelEnd"], r["statusBurnBodies"][:1])
