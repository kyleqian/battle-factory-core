#!/usr/bin/env python3
"""reseed85 windows summary: every window of reseed85Check.ts run in the BASE copy and in the PATCHED copy (reseed85-temp-src.diff): live /
decline, the switch-in re-seed results, the order lend kind, rows, px and the two fresh-probe digests. Gate: on the patched copy every
window is live, both runs' digests equal, px 0; every allocator consumer (PROTECT / REFLECT / LIGHT_SCREEN) of a WORDS route declines on the
base with `sprite allocator history unknown`; every control-route window (ctl-*: no words unit) and every order consumer (SWIFT) has the
same status and px on both copies.
usage: reseed85Windows.py <check-base-dir> <check-patched-dir> <out.json>
"""
import json, sys
from pathlib import Path

base, pat, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
ALLOC = {"PROTECT", "REFLECT", "LIGHT_SCREEN"}


def rows(d):
    res = {}
    for f in sorted(d.glob("check-*.json")):
        for r in json.loads(f.read_text())["rows"]:
            res[r["fixture"]] = r
    return res


b, p = rows(base), rows(pat)
table = []
for name in sorted(p):
    rp, rb = p[name], b.get(name)
    c, cb = rp["chain"], (rb or {}).get("chain", {})
    table.append({"fixture": name, "move": rp["move"], "side": rp["side"], "species": rp["species"], "units": rp["units"],
                  "base": {"live": cb.get("live"), "decline": cb.get("decline"), "reseeds": cb.get("reseeds"), "px": cb.get("px"),
                           "same": None if not cb else cb["digests"][0] == cb["digests"][1]},
                  "patched": {"live": c["live"], "decline": c["decline"], "reseeds": c["reseeds"], "orderDeferred": c["orderDeferred"],
                              "rows": c["rows"], "exactRows": c["exactRows"], "px": c["px"], "digests": c["digests"],
                              "same": c["digests"][0] == c["digests"][1]}})
alloc = [t for t in table if t["move"] in ALLOC and not t["fixture"].startswith("ctl-")]
order = [t for t in table if t["move"] not in ALLOC or t["fixture"].startswith("ctl-")]
summary = {
    "windows": len(table), "wordsAllocatorConsumers": len(alloc), "unchangedExpected": len(order),
    "patchedLiveZeroPx": sum(t["patched"]["live"] and t["patched"]["px"] == 0 and t["patched"]["same"] for t in table),
    "patchedRows": sum(t["patched"]["rows"] for t in table),
    "baseAllocatorDeclines": sum(t["base"]["decline"] == "sprite allocator history unknown" for t in alloc),
    "unchanged": sum(t["base"]["live"] == t["patched"]["live"] and t["base"]["px"] == t["patched"]["px"] for t in order),
}
summary["pass"] = (summary["patchedLiveZeroPx"] == len(table) and summary["baseAllocatorDeclines"] == len(alloc)
                   and summary["unchanged"] == len(order))
out.write_text(json.dumps({"schema": "reseed85-windows/v1", "summary": summary, "windows": table}, indent=1) + "\n")
print(json.dumps(summary))
for t in table:
    print(f"{t['fixture']:40s} {t['move']:12s} {t['side']:8s} base {'live' if t['base']['live'] else 'decl'} px {t['base']['px']} "
          f"reseeds {t['base']['reseeds']} | patched {'live' if t['patched']['live'] else 'decl'} rows {t['patched']['rows']} "
          f"px {t['patched']['px']} r1==r2 {t['patched']['same']} reseeds {t['patched']['reseeds']} deferred {t['patched']['orderDeferred']}")
