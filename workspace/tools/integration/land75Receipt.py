#!/usr/bin/env python3
"""land75: the live receipt (tools/integration/fixtures/land75-live-receipt.json) from the committed land75 fixtures.
usage: land75Receipt.py <tested-commit> <tested-src-tree> [gates.json]"""
import json, sys
from pathlib import Path

W = Path("tools/integration/fixtures/land75")
load = lambda p: json.loads((W / p).read_text())
base, final, part_a = load("census/census-base-seeds0-999.json"), load("census/census-final-seeds0-999.json"), load("census/census-stepA-seeds0-999.json")
pred = load("census/chains-predict-base-seeds0-999.json")
o = lambda c: c["overall"]
checks = []
for p in sorted((W / "check").glob("*.json")):
    for r in json.loads(p.read_text())["rows"]:
        c = r["chain"]
        checks.append({"fixture": r["fixture"], "history": r["history"], "rows": c["rows"], "px": c["px"], "live": c["live"],
                       "allocatorInput": c["allocatorInput"], "r1EqualsR2": c["digests"][0] == c["digests"][1], "hideAgree": r["hideAgree"],
                       "romInvisible": r["romInvisible"]})
parity = {}
for s in (533, 713):
    d = load(f"parity-{s}.json")
    parity[str(s)] = {k: d[k] for k in ("seed", "streak", "turnBoundariesCompared", "logicalDigest", "rngEqual", "rulesEqual", "boundaryEqual",
                                        "bodiesOn", "orderKnownBodiesOn", "allocatorKnownBodiesOn", "orderStopsOn")}
receipt = {
    "schema": "land75-live-receipt/v1",
    "base": "dc173666b", "baseSrcTree": "e6f98bf94ce9812aa7c0090e58d82a44eed33526",
    "testedCommit": sys.argv[1], "testedSrcTree": sys.argv[2],
    "partA": {"what": "hist73/net-zero-audit.json's 37 move ids appended to LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS",
              "commit": "01497ab0e"},
    "partB": {"what": "liveSpriteOrderHost.ts: a hidden battler's faint = the shown faint (hidden cleared); a reshow with a hidden opponent = "
                      "the normal reshow (hidden kept); a hidden player at a reshow / a hidden battler's switch-in still invalidate",
              "commit": "eb7b4796f"},
    "census": {"seeds": "0..999 (10 --index-from shards = one run; hist73LiveShareCensus.ts == liveShareCensus.ts + --index-from)",
               "base": o(base), "partAOnly": o(part_a), "final": o(final),
               "battleDigest": [base["battleDigest"], part_a["battleDigest"], final["battleDigest"]],
               "commandKeyDigest": [base["commandKeyDigest"], part_a["commandKeyDigest"], final["commandKeyDigest"]],
               "keycheckFinal": (W / "census/keycheck-final.txt").read_text().splitlines(),
               "keycheckPartA": (W / "census/keycheck-partA.txt").read_text().splitlines(),
               "predictorPartA": {"base": "dc173666b", "cleared": 37, "declines": pred["declines"], "fallbackFrames": pred["fallbackFrames"],
                                  "predicted": [pred["predictedUnlockCommands"], pred["predictedUnlockFrames"]],
                                  "measured": [part_a["overall"]["live"] - base["overall"]["live"],
                                               part_a["overall"]["liveFrames"] - base["overall"]["liveFrames"]]},
               "gain": [final["overall"]["live"] - base["overall"]["live"], final["overall"]["liveFrames"] - base["overall"]["liveFrames"]]},
    "wallRouteDenseCheck": {"tool": "tools/integration/land75Run.sh (audit18Check.ts: production live renderer, two fresh direct-mGBA "
                                    "probe processes per scenario; reproduced byte-for-byte by a second fresh land75Run.sh pass)",
                            "windows": checks, "routeCheck": load("route-check.json")["routes"]},
    "parity": parity,
}
if len(sys.argv) > 3:
    receipt["gates"] = json.loads(Path(sys.argv[3]).read_text())
Path("tools/integration/fixtures/land75-live-receipt.json").write_text(json.dumps(receipt, indent=1) + "\n")
print(json.dumps(receipt["census"]["base"]), json.dumps(receipt["census"]["final"]), receipt["census"]["predictorPartA"])
