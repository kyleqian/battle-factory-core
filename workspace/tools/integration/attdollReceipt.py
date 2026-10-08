#!/usr/bin/env python3
"""attdoll receipt: summarize attdollLiveCheck.ts receipts (one or two fresh passes) per (move, attacker side) cell.

usage: python3 tools/integration/attdollReceipt.py <out.json> <REC dir> [<REC dir 2>]   (prints a text table to stdout)

Per cell: every subbed-attacker composite window (swap-in .. swap-back first inactive row) through production, px per run, the
exact rows, the ROM body rows vs production's framed body (a D4 body-length phase other than the shipped one is listed as such),
the order input (fixture = production's lend; none = the order tracker has no lend for that history, doll-free too), and the tail
rows k+1 (production latch vs no latch) and k+2. A claimed cell must be 0 px on every row of every window whose ROM body is the
shipped phase and whose order input is production's lend.
"""
import json, sys, glob, os

out, recs = sys.argv[1], sys.argv[2:]
passes = []
for rec in recs:
    rows = []
    for f in sorted(glob.glob(os.path.join(rec, "prep40-*.json"))):
        for r in json.load(open(f))["results"]:
            r["_stem"] = os.path.basename(f)[:-5]
            rows.append(r)
    passes.append(rows)
base = passes[0]
cells = {}
for r in base:
    if r.get("kind") != "swap" or "prod" not in r:
        continue
    cells.setdefault((r["move"], r["side"]), []).append(r)
table, claimed, declined = [], [], []
ok = True
for (move, side), ws in sorted(cells.items()):
    wins = []
    for w in ws:
        fr = w.get("framing") or {"rows": w["adapterDuration"], "shift": 0}
        shipped = (w["romBodyRows"] + 1) == fr["rows"]
        win = {"stem": w["_stem"], "window": w["window"], "rows": w["rows"], "romBodyRows": w["romBodyRows"], "framedBodyRows": fr["rows"],
               "shift": fr["shift"], "adapterDuration": w["adapterDuration"], "productionDuration": w["productionDuration"],
               "orderInput": w["orderInput"], "pinnedRng2": w["pinnedRng2"], "px": w["prod"]["px"], "exactRows": w["prod"]["exactRows"],
               "identical": w["prod"]["identical"], "digests": w["prod"]["digests"], "tail": w.get("tail"),
               "class": "exact" if w["prod"]["px"] == [0, 0] else
                        ("no-order-lend (doll-free too)" if w["orderInput"] == "none" else
                         ("d4-other-phase" if not shipped else "RESIDUAL"))}
        if len(passes) > 1:
            twin = [x for x in passes[1] if x["_stem"] == w["_stem"] and x.get("window") == w["window"] and x.get("kind") == "swap"]
            win["pass2Identical"] = bool(twin) and twin[0]["prod"]["digests"] == w["prod"]["digests"] and twin[0].get("tail") == w.get("tail")
        wins.append(win)
    presented = all(w["swapPresented"] for w in ws)
    entry = {"move": move, "side": side, "moveId": ws[0]["moveId"], "presented": presented, "cell": ws[0]["cell"], "windows": wins}
    if presented:
        claimed.append(entry)
        if any(w["class"] == "RESIDUAL" for w in wins) or not all(w["identical"] for w in wins) or any(w.get("pass2Identical") is False for w in wins):
            ok = False
        if any(w["tail"] is None or w["tail"]["rowK1"]["production"] != [0, 0] or w["tail"]["rowK2"]["production"] != [0, 0] for w in wins):
            ok = False
    else:
        declined.append({"move": move, "side": side, "moveId": ws[0]["moveId"],
                         "fallbackPx": [w["px"] for w in wins]})
tails = [w["tail"] for c in claimed for w in c["windows"]]
receipt = {
    "schema": "attdoll-live-receipt/v1",
    "passes": len(passes),
    "claimedCells": len(claimed),
    "claimedWindows": sum(len(c["windows"]) for c in claimed),
    "claimedRows": sum(w["rows"] for c in claimed for w in c["windows"]),
    "exactWindows": sum(1 for c in claimed for w in c["windows"] if w["class"] == "exact"),
    "tail": {"windows": len(tails), "rowK1ProductionZero": sum(1 for t in tails if t["rowK1"]["production"] == [0, 0]),
             "rowK1WithoutLatchPx": sorted({tuple(t["rowK1"]["withoutLatch"]) for t in tails}),
             "rowK2ProductionZero": sum(1 for t in tails if t["rowK2"]["production"] == [0, 0])},
    "ok": ok,
    "claimed": claimed,
    "declined": declined,
}
json.dump(receipt, open(out, "w"), indent=1)
open(out, "a").write("\n")
for c in claimed:
    for w in c["windows"]:
        print(f'{c["move"]:<14} {c["side"]:<8} rows {w["rows"]:>3} body {w["romBodyRows"]:>3} framed {w["framedBodyRows"]}:{w["shift"]} order {w["orderInput"]:<7} px {w["px"][0]}/{w["px"][1]} exact {w["exactRows"]} tail k1 {w["tail"]["rowK1"]["production"]} (no latch {w["tail"]["rowK1"]["withoutLatch"]}) k2 {w["tail"]["rowK2"]["production"]} {w["class"]}')
for d in declined:
    print(f'DECLINED {d["move"]} {d["side"]} fallback px {d["fallbackPx"]}')
print(f'claimed cells {receipt["claimedCells"]} windows {receipt["claimedWindows"]} rows {receipt["claimedRows"]} exact windows {receipt["exactWindows"]} ok {ok}')
print(json.dumps(receipt["tail"]))
