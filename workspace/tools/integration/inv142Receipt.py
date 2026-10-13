#!/usr/bin/env python3
"""inv142 (docs/inv142-status-animation-invisible-battler.md): the headline receipt from a run's evidence dir (exposure.json,
rom-r1.json, probe-sha256.json, production-today.json, production-patched.json, controls.json, routes-delta.json[, census-delta.json]).
usage: inv142Receipt.py <ev-dir> <out.json> [--census] [--compare=<committed receipt>]
"""
import json, os, sys

ev, out = sys.argv[1:3]
census = "--census" in sys.argv
cmp_path = next((a[10:] for a in sys.argv if a.startswith("--compare=")), None)
J = lambda n: json.load(open(os.path.join(ev, n)))
exp, rom, today, patched, controls, routes = (J(n) for n in ("exposure.json", "rom-r1.json", "production-today.json", "production-patched.json",
                                                              "controls.json", "routes-delta.json"))
inv = [dict(w, scenario=k) for k, ws in rom.items() for w in ws if w["invisible"]]
played = [w for w in inv if "R" in w]
px = lambda d: {k: v["fullScreen"]["px"] for k, v in d.items() if k != "summary"}
receipt = {
    "schema": "inv142-receipt/v1",
    "exposure": {k: exp[k] for k in ("seeds", "battles", "statusAnimationCommands", "invisibleCommands", "dollCommands", "table")},
    "rom": {"scenarios": len(rom), "probes": len(J("probe-sha256.json")), "invisibleWindowsPlayed": len(played),
            "invisibleReceiptsSkipped": len(inv) - len(played),
            "everyPlayedWindow": {"battlerInvisibleOnEveryActiveRow": all(w["battlerInvisibleRows"] == w["activeRows"] for w in played),
                                  "battlerX2": sorted({tuple(w["battlerX2"]) for w in played}), "spritesCreated": sorted({w["spritesInUseMax"] - w["spritesInUseAtX"] for w in played}),
                                  "visibleAgainAfterF": sorted({(w["visibleBy"], w["visibleAfterF"]) for w in played})}},
    "productionToday": {"zeroPxWindows": today["summary"]["zeroPxWindows"], "windows": today["summary"]["windows"], "px": px(today)},
    "patched": {"zeroPxWindows": patched["summary"]["zeroPxWindows"], "windows": patched["summary"]["windows"], "perRowDigest": patched["summary"]["perRowDigest"],
                "battlerHiddenEveryCommandRow": all(v["rows"]["battlerHiddenRows"] == v["rows"]["commandRows"] for k, v in patched.items() if k != "summary")},
    "controls": {k: {"zeroPxWindows": v["summary"]["zeroPxWindows"], "windows": v["summary"]["windows"]} for k, v in controls.items()},
    "routes": {k: {f: v[f] for f in ("verdict", "frames", "differingFrames", "outsideStatusAnimation", "changedCommands")} for k, v in routes.items()},
}
if census:
    c = J("census-delta.json")
    receipt["census"] = {k: c[k] for k in ("moveRecords", "keyMismatches", "frameChanges", "liveFrameChanges", "declineChanges", "battleMismatches",
                                           "segmentMismatches", "allShardDigestsSame", "totals")}
text = json.dumps(receipt, indent=1, default=list) + "\n"
open(out, "w").write(text)
print(text)
if cmp_path:
    committed = json.load(open(cmp_path))
    if not census:
        committed.pop("census", None)
    same = json.loads(text) == committed
    print("SAME receipt" if same else "DIFF receipt")
    sys.exit(0 if same else 1)
