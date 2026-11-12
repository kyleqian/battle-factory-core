#!/usr/bin/env python3
"""lsbz receipt: merges two d4aTimingCheck passes over the lsbz windows (lsbzTimingCheck.sh OUT dirs, one process per fixture, two fresh
runs each) into tools/integration/fixtures/lsbz-live-receipt.json. Top-level `windows` (fixture + selectedPhase) feed the all-fixture d4a
regression (d4aRegressionAll.sh). Optional extra JSON sections (the Blizzard grid / probes, the regression, the census, the route parity) are
merged in by key. usage: python3 -I tools/integration/lsbzReceipt.py <checkDirA> <checkDirB> <testedSrcTree> [<key>=<json-file> ...]
(from workspace/)"""
import glob, json, sys

check_a, check_b, src_tree = sys.argv[1:4]
extra = dict(a.split("=", 1) for a in sys.argv[4:])
def load(d):
    out = {}
    for p in glob.glob(f"{d}/*.json"):
        for e in json.load(open(p)):
            out[e["fixture"]] = e
    return out
A, B = load(check_a), load(check_b)
assert sorted(A) == sorted(B), (len(A), len(B))
windows = []
for fx in sorted(A):
    a, b = A[fx], B[fx]
    runs = a["runs"] + b["runs"]
    raw = json.load(open(fx))
    src = json.load(open(raw["sourceFixture"])) if "sourceFixture" in raw else raw
    side = src["attacker"]["geometry"]["side"]
    assert a["selectedPhase"] == b["selectedPhase"] and runs[0]["affectedAges"] == runs[-1]["affectedAges"]
    windows.append({"fixture": fx, "sourceFixture": raw.get("sourceFixture"), "move": raw["move"], "side": side,
                    "pair": f"{src.get('attacker', {}).get('species')} -> {src.get('target', {}).get('species')}",
                    "measuredPhase": a["measuredPhase"], "selectedPhase": a["selectedPhase"], "rows": a["window"],
                    "expectedDuration": a["expectedDuration"], "denseWindow": raw["denseWindow"], "px": [r["residualPixels"] for r in runs],
                    "affectedAges": runs[0]["affectedAges"], "maxPixelsPerRow": runs[0]["maxPixelsPerRow"],
                    "digestsIdentical": len({r["digest"] for r in runs}) == 1, "documentedAges": a["documentedAges"],
                    "violations": sorted(set(a["violations"]) | set(b["violations"])), "timingEvidence": raw.get("timingEvidence")})
def summary(ws):
    sel = [w for w in ws if w["selectedPhase"]]
    oth = [w for w in ws if not w["selectedPhase"]]
    return {"fixtures": len(ws), "policyPhase": len(sel), "policyPhaseZeroPx": sum(1 for w in sel if set(w["px"]) == {0}),
            "otherPhase": len(oth), "otherPhaseOnlyDocumented": sum(1 for w in oth if not w["violations"]),
            "violations": sum(len(w["violations"]) for w in ws), "digestsIdentical": all(w["digestsIdentical"] for w in ws)}
ls = [w for w in windows if w["move"] == "LIGHT_SCREEN"]
receipt = {
    "schema": "lsbz-live-receipt/v1",
    "step": "S10A lsbz: ISSUES #152 timing items: (A) Light Screen (113) opponent row-59 BLDALPHA write phase -> faithful timing; (B) Blizzard (59) opponent geometry-derived duration",
    "testedSrcTree": src_tree,
    "policyVersion": "live-move-timing.v1.dominant-measured-phase.tie-no-optional-event",
    "lightScreen": {
        "policy": {"opponent": {"kind": "bg-write-row", "age": 60, "hold": 2, "direct": 9, "chosen": "no-event", "bodyRows": 88}, "player": "no parameter (direct in 3 of 3)"},
        "mechanism": ("Move_LIGHT_SCREEN's AnimDefensiveWall alpha fade: an OPPONENT attacker's BLDALPHA step written at body row 59 (reducer age 52; "
                      "eva 9 -> 8) reaches the I/O register at once (no-event, the dominant phase) or is buffered by SetGpuReg (VCOUNT outside VBlank, "
                      "sGpuRegWaitingList [0x52]) and lost under the row-60 write (event: row 59 repeats 9/7). Lag ages [68, 69] in both phases "
                      "(audit-15 receipts/vblank/lag-counters.txt); the body is 88 rows either way. lightScreen.ts specialScreenAtAge opponentBlendHold "
                      "(default true = the accepted corpus); liveMoveAnimation.ts case 113 passes the policy phase (false)."),
        "summary": summary(ls),
        "perSide": {s: summary([w for w in ls if w["side"] == s]) for s in ("player", "opponent")},
        "declined": ["audit-15 acc-tackle / tackle / brn light-screen-opp: production decline (allocator host unknown after Tackle / Status_Burn), fallback, no live claim"],
    },
    "blizzard": {
        "rule": "liveMoveAnimationDuration(59) = blizzardImpactStartAge(side, geometry) + 164 (liveMoveAnimation.ts liveBlizzardDuration; geometry = the case-59 attacker / target picOffsetPoint)",
        "source": ("Move_BLIZZARD: the traveling snowballs / large crystals (AnimMoveTwisterParticle-style travel callbacks) destroy themselves when they "
                   "reach the target; `waitforvisualfinish` releases at the first age with none left (blizzard.ts blizzardImpactStartAge: the same "
                   "callback replay geoice uses, at the pair's geometry), and every later script step (impact crystals, monbg / restorebg fade, the "
                   "optional restore lag at impact + 139, the fixed pair impact + 160 / + 161) is relative to it (blizzard.ts scriptOffsetAtAge / "
                   "backgroundBlendY / cleanupAge = impact + 163), so the body is impact + 164 rows in the lag phase (impact + 163 without). Player "
                   "geometries are all impact 208 (372 rows, unchanged); opponent 194..206 (358..370)."),
        "grid": "tools/integration/fixtures/lsbz/blizzard-grid-predictions.json (25 pairs, predictions committed in 05cce9037 before any probe)",
        "counters": "tools/integration/fixtures/lsbz/blizzard-counters.json (24 pairs x 2 fresh direct-mGBA runs, r0 == r1; lag 16 : none 8, every pair the predicted shape)",
        "summary": summary([w for w in windows if w["move"] == "BLIZZARD"]),
        "excluded": ["blizzard-opponent-baltoy-huntail (impact 205): the staging activation probe crashed (run-mgba-probe exit 139, no output); not staged",
                     "geoice control ARBOK -> CATERPIE (impact 198): its body matches the rule (362 rows, lag [337, 358, 359]) and the adapter is live, but "
                     "every row 0..361 differs by the same static 133 px (bbox x 98..221 y 33..103; ROM 4a425a / 526b5a vs live 5ad684 / 73ffad): a battler "
                     "palette region identical at every age, outside the Blizzard program; not a window here"],
    },
    "windows": windows,
    "summary": summary(windows),
    "commands": ["python3 -I tools/integration/lsbzWindows.py",
                 "OUT=SCRATCH/checkA P=10 sh tools/integration/lsbzTimingCheck.sh; OUT=SCRATCH/checkB P=10 sh tools/integration/lsbzTimingCheck.sh",
                 "python3 -I tools/integration/lsbzReceipt.py SCRATCH/checkA SCRATCH/checkB $(git rev-parse HEAD:workspace/src) [key=file.json ...]"],
}
for k, p in extra.items():
    receipt[k] = json.load(open(p))
with open("tools/integration/fixtures/lsbz-live-receipt.json", "w") as f:
    json.dump(receipt, f, indent=1); f.write("\n")
print(json.dumps(receipt["summary"]), json.dumps(receipt["lightScreen"]["perSide"]))
