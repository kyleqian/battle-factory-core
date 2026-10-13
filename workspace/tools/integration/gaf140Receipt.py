#!/usr/bin/env python3
"""gaf140 (docs/gaf140-status-gate-age.md): the live receipt, a pure function of the gaf140 evidence files in <dir>
(production-compare.json, controls.json, probe-sha256.json, rom-r1.json, routes-delta.json and, with --census, census-delta.json).
usage: gaf140Receipt.py <dir> <out.json> [--census] [--compare=<committed receipt>]   (--compare: exit 1 unless equal; without --census
the committed receipt's census section is not compared)
"""
import json, sys

d, out = sys.argv[1], sys.argv[2]
census = "--census" in sys.argv
cmp_path = next((a[10:] for a in sys.argv if a.startswith("--compare=")), None)
J = lambda n: json.load(open(f"{d}/{n}"))
pc, ctl, probes, rom, routes = J("production-compare.json"), J("controls.json"), J("probe-sha256.json"), J("rom-r1.json"), J("routes-delta.json")
wins = {k: v for k, v in pc.items() if k != "summary"}
receipt = {
    "schema": "gaf140-live-receipt/v1",
    "fix": {"field": "status-animation timing.seGateFrames (present only when > 0) = the IsBattleSEPlaying gate; minimumFrames unchanged = gate + STATUS_ANIMATION_ADDED_ROWS[animation]",
            "age": "render effect only from command age >= seGateFrames, effect age = command age - seGateFrames (the field as it is, shadow and rest included, on the gate rows)",
            "base": "74cbec2b8", "baseSrc": "11e979d67d25dfa45936aff7bf22b608f1492d71", "fixCommit": "e7dfc2be9",
            "fixSrc": "81aae6038c695d8d2b532bc8e6ee92b43d525d76"},
    "probes": {"scenarios": len(probes), "r1EqualsR2": sum(v["r1"] == v["r2"] for v in probes.values()),
               "seg127Match": sum(v["seg127Match"] for v in rom.values())},
    "gatedWindows": {"summary": pc["summary"],
                     "perWindow": {k: {"animation": v["animation"], "side": v["side"], "label": v["label"], "gate": v["gate"],
                                       "rowsCompared": v["rows"]["compared"], "px": v["fullScreen"]["px"], "gateRowsPx": v["gateRows"]["px"],
                                       "perRowMismatches": v["perRowMismatches"], "nextCommandRows": v["nextCommandRows"]}
                                   for k, v in wins.items()}},
    "controls": {k: {"zeroPxWindows": v["summary"]["zeroPxWindows"], "gateRowsZeroPxWindows": v["summary"]["gateRowsZeroPxWindows"],
                     "windows": v["summary"]["windows"]} for k, v in ctl.items()},
    "routes": {k: (v if k == "verdict" else {kk: v[kk] for kk in ("verdict", "sameTimeline", "presentedFrames", "statusAnimationCommands",
                                                                 "gatedCommands", "ungatedStatusAnimationDiffering", "firstFrameAfterGated", "unexplained")})
               for k, v in routes.items()},
}
if census:
    c = J("census-delta.json")
    receipt["census"] = {k: c[k] for k in ("moveRecords", "keyMismatches", "frameChanges", "statusChanges", "liveFrameChanges", "declineChanges",
                                           "battleMismatches", "segmentMismatches", "allShardDigestsSame", "totals")}
json.dump(receipt, open(out, "w"), indent=1)
open(out, "a").write("\n")
if cmp_path:
    committed = json.load(open(cmp_path))
    if not census:
        committed.pop("census", None)
    same = committed == receipt
    print("SAME receipt" if same else "DIFF receipt")
    sys.exit(0 if same else 1)
