#!/usr/bin/env python3
"""stq132: fold stq132Compare.ts outputs (main + negative controls) into tools/integration/fixtures/stq132/compare.json.
usage: stq132CompareReceipt.py <out.json> <main.json> [<control-name>=<control.json> ...]
"""
import json, sys

out, main, *controls = sys.argv[1:]
m = json.load(open(main))
windows = {}
for key, r in m["result"].items():
    windows[key] = {"animation": r["animation"], "side": r["side"], "species": r["species"], "elevatedOpponentShadow": r["elevatedOpponentShadow"],
                    "rect": r["rect"], "rows": r["rows"], "fullPx": r["fullPx"], "rectPx": r["rectPx"], "badRows": r["badRows"],
                    "residual": None if r["fullPx"] == 0 else r["perRowBad"], "afterWindow": r["afterWindow"],
                    "productionCornerEqualsRom": r["productionCorner"] == r["romCorner"]}
summary = {}
for key, w in windows.items():
    s = summary.setdefault(f"{w['animation']}/{w['side']}", {"windows": 0, "rows": 0, "fullPx": 0, "rectPx": 0})
    s["windows"] += 1; s["rows"] += w["rows"]; s["fullPx"] += w["fullPx"]; s["rectPx"] += w["rectPx"]
ctl = {}
for c in controls:
    name, path = c.split("=", 1)
    d = json.load(open(path))
    ctl[name] = {"windows": d["windows"], "cleanWindows": d["cleanWindows"],
                 "failedWindows": sorted(k for k, r in d["result"].items() if r["fullPx"]),
                 "fullPx": sum(r["fullPx"] for r in d["result"].values())}
json.dump({"schema": "stq132-compare-receipt/v1", "windows": m["windows"], "cleanWindows": m["cleanWindows"],
           "summary": summary, "controls": ctl, "perWindow": windows}, open(out, "w"), indent=1)
open(out, "a").write("\n")
print(f"{m['cleanWindows']} / {m['windows']} windows 0 px; controls " + ", ".join(f"{k}: {v['cleanWindows']} clean" for k, v in ctl.items()))
