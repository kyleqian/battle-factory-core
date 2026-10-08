#!/usr/bin/env python3
"""prep40 summary: per (move, attacker side) verdicts from a prep40Run.sh receipt dir (patched / fallback / drop164 per stem).

Weight = Factory Level-50 use weight of the (move, side) in % of all (move, side) uses (spriteOrderPlanCoverageRank.py weights(); the same
for both sides; prep38's table). Verdicts (every swap window of the stem, both fresh runs, identical per-row digests):
  EXACT-WITH-SWAPS      production composite (the move id added to LIVE_SUBSTITUTE_SWAP_BODY_IDS) 0 px on every row
  NEEDS-BODY-FRAMING    not 0 px as framed by the adapter duration, 0 px when framed by the ROM body rows at adapter age row + shift
  NEEDS-ORDER(+...)     declines / not 0 px with production's order input (none after 164), 0 px with --order=drop-164
  PAIR-RESIDUAL         the residual equals the doll-free control's (same move, same pair, same probe) on the body rows
  MULTIHIT / TWO-TURN   structure classes (see the doc); UNRESOLVED otherwise; NO-WINDOW when the probe has no subbed body
usage: prep40Summary.py <REC> [--json]   (prints the table; writes <REC>/summary.json)
"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from spriteOrderPlanCoverageRank import weights  # noqa: E402

REC = Path(sys.argv[1])
W = weights(); TOT = sum(W.values())
wt = lambda mid: round(W.get(mid, 0) * 100 / (2 * TOT), 3)  # noqa: E731
SC = Path(__file__).resolve().parent / "fixtures/prep40/scenarios/list.tsv"
stems = [l.split("\t") for l in SC.read_text().splitlines()]


def load(mode, stem):
    p = REC / mode / f"{stem}.json"
    return json.loads(p.read_text())["results"] if p.exists() else None


def px(m):
    return None if m is None else m["px"]


table = []
units = []
for stem, move, mid, side, *_ in stems:
    for turn in ((0, 1) if move in ("DIG", "SOLAR_BEAM") else (None,)):
        units.append((stem, move, mid, side, turn))
for stem, move, mid, side, turn in units:
    mid = int(mid)
    pat, fb = load("patched", stem), load("fallback", stem)
    if turn is not None:
        move = f"{move} t{turn}"
        keep_turn = lambda rs, t=turn: None if rs is None else [r for r in rs if r.get("turn", 0) == t or r["kind"] == "swap-without-body"]  # noqa: E731
        pat, fb = keep_turn(pat), keep_turn(fb)
    else:
        keep_turn = lambda rs: rs  # noqa: E731
    if pat is None:
        table.append({"stem": stem, "move": move, "side": side, "weight": wt(mid), "verdict": "NOT-RUN"}); continue
    swaps = [r for r in pat if r["kind"].startswith("swap") and r.get("moveId") == mid]
    nobody = [r for r in pat if r["kind"] == "swap-without-body"]
    plains = [r for r in pat if r["kind"] == "plain" and r["moveId"] == mid]
    row = {"stem": stem, "move": move, "moveId": mid, "side": side, "weight": wt(mid), "windows": len(swaps)}
    if nobody:
        row["swapWithoutBody"] = [{k: r[k] for k in ("frame", "swapInRows", "next", "x2", "tileSwitchRow", "hpAfter") if k in r} for r in nobody]
    if not swaps:
        row["verdict"] = "NO-WINDOW"; table.append(row); continue
    errs = [r["error"] for r in swaps if "error" in r]
    if swaps[0]["kind"] == "swap-multihit" or errs:
        row.update({"kind": swaps[0]["kind"], "rows": swaps[0]["rows"], "romBodyRows": swaps[0]["romBodyRows"], "adapterDuration": None,
                    "prodPx": [], "controls": [], "tail": []})
        if errs: row["errors"] = errs
        if "segments" in swaps[0]: row["segments"] = swaps[0]["segments"]
        row["controls"] = [{"rows": r["rows"], "adapterDuration": r.get("adapterDuration"), "prodPx": px(r["prod"])} for r in plains if "prod" in r]
        row["verdict"] = "MULTIHIT" if swaps[0]["kind"] == "swap-multihit" else "ERROR"
        table.append(row); continue
    allid = all(r["prod"]["identical"] for r in swaps) and all(r.get("aligned", {}).get("identical", True) for r in swaps)
    w0 = swaps[0]
    row.update({k: w0.get(k) for k in ("kind", "rows", "swapInRows", "romBodyRows", "swapBackRows", "adapterDuration", "productionDuration", "orderInput", "turn")})
    row["turns"] = sorted({r.get("turn", 0) for r in swaps})
    row["prodPx"] = [px(r["prod"]) for r in swaps]
    row["prodExactRows"] = [r["prod"]["exactRows"] for r in swaps]
    row["prodBadAges"] = w0["prod"]["badAges"]
    if "aligned" in w0:
        row["aligned"] = [{"framingRows": r["aligned"]["framingRows"], "shift": r["aligned"]["shift"], "px": r["aligned"]["px"],
                           "zeroShifts": r["aligned"]["zeroShifts"], "badAges": r["aligned"]["badAges"], "firstBad": r["aligned"]["firstBad"][:2]}
                          for r in swaps if "aligned" in r]
    if fb:
        row["fallbackPx"] = [px(r["prod"]) for r in fb if r["kind"].startswith("swap") and r.get("moveId") == mid]
    for mode, key in (("drop164", "drop164"), ("firstbody", "firstBody")):
        dd = keep_turn(load(mode, stem))
        if dd:
            dsw = [r for r in dd if r["kind"] == "swap" and r.get("moveId") == mid and "prod" in r]
            row[key] = [{"order": r["orderInput"], "prodPx": px(r["prod"]),
                         **({"alignedShift": r["aligned"]["shift"], "alignedPx": r["aligned"]["px"]} if "aligned" in r else {})} for r in dsw]
    row["controls"] = [{"rows": r["rows"], "adapterDuration": r["adapterDuration"], "prodPx": px(r["prod"]),
                        **({"shift": r["aligned"]["shift"], "alignedPx": r["aligned"]["px"], "badAges": r["aligned"]["badAges"]} if "aligned" in r else {})}
                       for r in plains]
    row["windowsDetail"] = [{"frame": r["frame"], "turn": r.get("turn"), "romBodyRows": r["romBodyRows"], "prodPx": px(r["prod"]),
                             **({"alignedShift": r["aligned"]["shift"], "alignedPx": r["aligned"]["px"], "alignedBadAges": r["aligned"]["badAges"]} if "aligned" in r else {}),
                             "romChangesAfter": r.get("romChangesAfter")} for r in swaps]
    row["tail"] = [{"k1Today": [x["px"] for x in r["tail"]["rowK1"]["today"]], "k1OneRowLonger": [x["px"] for x in r["tail"]["rowK1"]["oneRowLonger"]],
                    "k2Today": [x["px"] for x in r["tail"]["rowK2"]["today"]], "k1Bbox": r["tail"]["rowK1"]["today"][0]["bbox"]}
                   for r in swaps if "tail" in r]
    prod0 = all(p == [0, 0] for p in row["prodPx"])
    # body framing: judged on the FIRST window (history [164, defender body]); later windows reported per window
    al0 = bool(row.get("aligned")) and "aligned" in w0 and row["aligned"][0]["px"] == [0, 0]
    # NEEDS-ORDER: the FIRST window (history [164, defender body]) is 0 px with an order lend (later windows' histories have no lend
    # even doll-free; reported per window)
    lend0 = lambda k: bool(row.get(k)) and (row[k][0]["prodPx"] == [0, 0] or row[k][0].get("alignedPx") == [0, 0])  # noqa: E731
    d0 = lend0("drop164") or lend0("firstBody")
    dprod0 = any(row.get(k) and row[k][0]["prodPx"] == [0, 0] for k in ("drop164", "firstBody"))
    row["orderLend"] = "drop-164" if lend0("drop164") else "first-body" if lend0("firstBody") else None
    ctrl_px = [c.get("alignedPx", c["prodPx"])[0] for c in row["controls"]]
    if not allid:
        v = "UNRESOLVED (r1 != r2)"
    elif w0["kind"] == "swap-multihit":
        v = "MULTIHIT"
    elif prod0:
        v = "EXACT-WITH-SWAPS"
    elif al0:
        v = "NEEDS-BODY-FRAMING"
    elif d0:
        v = "NEEDS-ORDER" if dprod0 else "NEEDS-ORDER+BODY-FRAMING"
    elif ctrl_px and min(ctrl_px) > 0 and any(a["px"][0] == min(ctrl_px) for a in row.get("aligned", [])):
        v = "PAIR-RESIDUAL"
    else:
        v = "UNRESOLVED"
    row["verdict"] = v
    table.append(row)

(REC / "summary.json").write_text(json.dumps(table, indent=1) + "\n")
print(f"{'move':14} {'side':8} {'wt':>6} {'win':>3} {'rows':>4} {'body':>4} {'D':>4} {'prodPx r1/r2':>18} {'aligned(rows:shift px)':>26} {'drop164 | firstbody':>26} {'ctrl':>10} {'fallback':>10} {'tail k1 today/longer':>20}  verdict")
for r in table:
    if "rows" not in r:
        print(f"{r['move']:14} {r['side']:8} {r['weight']:6.3f} {r.get('windows', 0):3}  {r['verdict']}  {json.dumps(r.get('swapWithoutBody', ''))[:200]}"); continue
    al = r.get("aligned", [{}])[0]
    alS = f"{al.get('framingRows')}:{al.get('shift')} {al.get('px', ['', ''])[0]}" if al else "-"
    d = r.get("drop164", [{}])[0] if r.get("drop164") else {}
    f1 = r.get("firstBody", [{}])[0] if r.get("firstBody") else {}
    dS = (f"{d.get('prodPx', [''])[0]}/{d.get('alignedPx', ['-'])[0]}" if d else "-") + " " + (f"{f1.get('prodPx', [''])[0]}/{f1.get('alignedPx', ['-'])[0]}" if f1 else "-")
    c = r["controls"][0] if r["controls"] else None
    cS = f"{c.get('alignedPx', c['prodPx'])[0]}" if c else "-"
    if not r["prodPx"]:
        print(f"{r['move']:14} {r['side']:8} {r['weight']:6.3f} {r['windows']:3} {r['rows']:4} {r['romBodyRows']:4}  {r['verdict']}  {json.dumps(r.get('segments', r.get('errors')))[:300]}"); continue
    t = r["tail"][0] if r["tail"] else None
    tS = f"{t['k1Today'][0]}/{t['k1OneRowLonger'][0]}" if t else "-"
    fbS = str(r.get("fallbackPx", [[None]])[0][0])
    print(f"{r['move']:14} {r['side']:8} {r['weight']:6.3f} {r['windows']:3} {r['rows']:4} {r['romBodyRows']:4} {str(r['adapterDuration']):>4} {str(r['prodPx'][0]):>18} {alS:>26} {dS:>26} {cS:>10} {fbS:>10} {tS:>20}  {r['verdict']}")
