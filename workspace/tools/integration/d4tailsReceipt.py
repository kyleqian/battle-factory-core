#!/usr/bin/env python3
"""d4tails receipt: merges two d4aTimingCheck passes (d4tailsTimingCheck.sh OUT dirs, one process per fixture, two fresh runs each), the two
Confuse Ray production-check passes (speciesAudit14SwapRun.sh summaries, committed under fixtures/d4tails/confuse-ray-production) and the
fresh counters into tools/integration/fixtures/d4tails-live-receipt.json. Top-level `windows` (fixture + selectedPhase) feed d4aRegressionAll.sh.
usage: python3 -I tools/integration/d4tailsReceipt.py <checkDirA> <checkDirB> <testedSrcTree> (from workspace/)"""
import glob, json, os, re, sys

check_a, check_b, src_tree = sys.argv[1:4]
D = "tools/integration/fixtures/d4tails"
def load(d):
    out = {}
    for p in glob.glob(f"{d}/*.json"):
        for e in json.load(open(p)):
            out[e["fixture"]] = e
    return out
A, B = load(check_a), load(check_b)
assert sorted(A) == sorted(B) and len(A) == 28, (len(A), len(B))
windows = []
for fx in sorted(A):
    a, b = A[fx], B[fx]
    runs = a["runs"] + b["runs"]
    fixture = json.load(open(fx))
    move = fixture.get("move") or json.load(open(fixture["sourceFixture"]))["move"]
    assert a["selectedPhase"] == b["selectedPhase"] and runs[0]["affectedAges"] == runs[-1]["affectedAges"]
    windows.append({"fixture": fx, "move": move, "measuredPhase": a["measuredPhase"], "policyPhase": a["policyPhase"], "selectedPhase": a["selectedPhase"],
                    "rows": a["window"], "expectedDuration": a["expectedDuration"], "px": [r["residualPixels"] for r in runs],
                    "affectedAges": runs[0]["affectedAges"], "maxPixelsPerRow": runs[0]["maxPixelsPerRow"],
                    "digestsIdentical": len({r["digest"] for r in runs}) == 1, "documentedAges": a["documentedAges"],
                    "violations": sorted(set(a["violations"]) | set(b["violations"]))})
# Confuse Ray production windows (uninstrumented prep40 probes; attdollLiveCheck via speciesAudit14SwapCheck.ts).
lines = [open(f"{D}/confuse-ray-production/summary-pass{k}.txt").read().splitlines() for k in (1, 2)]
cr_lines = [l for l in lines[0] if "CONFUSE_RAY" in l]
pat = re.compile(r"^(\S+) (\S+) (\S+) CONFUSE_RAY rows=(\d+) .*px=(\d+)/(\d+) identical=(\w+) exact=(\d+) bad=(\S*) max=(\d+)")
prod = []
for l in cr_lines:
    m = pat.match(l); assert m, l
    stem, kind, side, rows, px1, px2, ident, exact, bad, mx = m.groups()
    composite = kind == "swap"
    body_rows = int(rows) - 81 if composite else int(rows)  # the swap composite = 41 swap / idle rows + body + 40 swap-back rows (audit 14)
    w = {"window": f"{stem} ({kind}, {side})", "compositeRows" if composite else "rows": int(rows), "bodyRows": body_rows,
         "px": [int(px1), int(px2)], "r1EqualsR2": ident == "True", "bad": bad, "maxPixelsPerRow": int(mx)}
    if bad:
        w["bodyAges"] = "251..266"
        if composite: w["note"] = "composite rows 292..307 = body ages 251..266 (offset 41); the swap-back rows 311..329, 336..349 run one row early too (docs/live-species-audit-14.md)"
    prod.append(w)
chinchou = [w for w in windows if w["move"] == "CONFUSE_RAY"]
long_ = [w for w in prod if w["bodyRows"] == 270] + chinchou
short = [w for w in prod if w["bodyRows"] == 269]
confuse = {"method": "uninstrumented production windows: tools/integration/speciesAudit14SwapProbes.sh + speciesAudit14SwapRun.sh (prep40Probe, attdollLiveCheck.ts unchanged) on the d4w-cr s14plain and audit-14 s14swap Confuse Ray scenarios, two passes x two fresh runs; plus d4aTimingCheck on the accepted CHINCHOU P / O windows",
           "passesIdentical": [l for l in lines[0] if "CONFUSE_RAY" in l] == [l for l in lines[1] if "CONFUSE_RAY" in l],
           "long": len(long_), "longZeroPx": sum(1 for w in long_ if all(p == 0 for p in w["px"])), "short": len(short),
           "shortBodies": short, "productionWindows": prod,
           "lagPosition": "instrumented counters: 249 in 9 bodies, 250 in 3 (FLYGON / GOLBAT opponent @3410, PICHU player @1771), none in 2; the 270-row @3410 bodies (counted lag 250) are 0 px, so 249 vs 250 is display-neutral",
           "instrumentCaveat": "PICHU player @1771 counts a lag at 250 and 270 rows under the counter instrument (PlayTimeCounter_Update enabled every pass) but runs 269 rows in the uninstrumented production probe (residual 251..266): the phase of a window is its uninstrumented ROM body length; the counters are mechanism evidence"}
counters = json.load(open(f"{D}/counters.json"))
fa = [dict(b, scenario=c["scenario"]) for c in counters for b in c["bodies"] if b["move"] == "FAINT_ATTACK"]
faint = {"landed": False,
         "class": "same CPU-phase class: fixed lags 80, 81, 108, 109, 182, 183 in all 9 bodies; the optional lag at 205 present -> 226 body rows, absent -> 225 (the restore fade one row early, ages 203..218)",
         "bodies": [{"scenario": b["scenario"], "bodyRows": b["bodyRows"] + 1, "lagAges": b["lagAges"]} for b in fa],
         "perSide": {"opponent": {"lag": 2, "noLag": 1, "note": "GOLBAT -> GOLEM, GROVYLE -> ONIX lag; DELCATTY -> GOLEM none"},
                     "player": {"lag": 0, "noLag": 6, "note": "MURKROW -> ONIX, ONIX -> GROVYLE (altspecies3; prep6 receipt 286,928 / 281,024 px on the tail) and the 4 banked species-audit prep6-alt-base bodies: none; the accepted prep6 player body (staged probe, not counter-instrumentable) is 0 px under the live long body, i.e. lag (1 by pixels)"}},
         "reason": "the player-side dominant phase is NO lag (6 : 1), but the live adapter renders the long (lag) body on both sides (liveMoveAnimationDuration(185) = 221 from activation + 4); a faithful player-side policy needs the adapter to end the player restore fade one row earlier, a presentation change outside this grant (renderer change not expected) -> not landed, Faint Attack stays scoped exact"}
icy = [b for c in counters for b in c["bodies"] if b["move"] == "ICY_WIND"]
bl = [b for c in counters for b in c["bodies"] if b["move"] == "BLIZZARD"]
receipt = {
    "schema": "d4tails-live-receipt/v1",
    "step": "S10A d4tails: D4 accounting of the short-body / early fade-restore CPU-phase class (Icy Wind, Blizzard, Faint Attack) and the Confuse Ray phase",
    "testedSrcTree": src_tree,
    "policyVersion": "live-move-timing.v1.dominant-measured-phase.tie-no-optional-event",
    "counters": {"file": f"{D}/counters.json", "scenarios": len(counters), "allR0EqualsR1": all(c["r0EqualsR1"] for c in counters),
                 "icyWind": {"bodies": len(icy), "lag261": sum(261 in b["lagAges"] for b in icy), "fixed": [241, 242]},
                 "blizzard": {"bodies": len(bl), "playerLag347": sum(347 in b["lagAges"] for b in bl), "opponentLag336": sum(336 in b["lagAges"] for b in bl),
                              "opponentNoLag": sum(b["lagAges"] == [356, 357] for b in bl), "geometryShifted": "ARBOK -> CATERPIE [337, 358, 359], WEEZING -> BLASTOISE [335, 356, 357] (impact start != 197; declined; not counted)"}},
    "windows": windows,
    "summary": {m: {"windows": sum(w["move"] == m for w in windows), "policyPhaseZeroPx": sum(w["move"] == m and w["selectedPhase"] and all(p == 0 for p in w["px"]) for w in windows),
                    "otherPhase": sum(w["move"] == m and not w["selectedPhase"] for w in windows), "violations": sum(len(w["violations"]) for w in windows if w["move"] == m)}
                for m in ("ICY_WIND", "BLIZZARD", "CONFUSE_RAY")},
    "confuseRay": confuse,
    "faintAttack": faint,
    "census": "245+13+18 -> 242+13+21 (node tools/integration/remainingAdaptersCensus.mjs --write --doc)",
    "commands": ["sh tools/integration/d4tailsCounters.sh SCRATCH/counters 12 SCRATCH/counters.json $(cat tools/integration/fixtures/d4tails/scenarios.txt)",
                 "python3 -I tools/integration/d4tailsWindows.py",
                 "OUT=SCRATCH/checkA P=10 sh tools/integration/d4tailsTimingCheck.sh; OUT=SCRATCH/checkB P=10 sh tools/integration/d4tailsTimingCheck.sh",
                 "OUT=SCRATCH/crprobe SC=<dir: d4w-cr/scenarios/*.json + species-audit-14/swap-scenarios/s14swap-*confuse-ray*.json + fixtures/d4tails/confuse-ray-production/list.tsv> sh tools/integration/speciesAudit14SwapProbes.sh; sh tools/integration/speciesAudit14SwapRun.sh SCRATCH/crprobe <dir> SCRATCH/crrec 8",
                 "python3 -I tools/integration/d4tailsReceipt.py SCRATCH/checkA SCRATCH/checkB $(git rev-parse HEAD:workspace/src)"],
}
json.dump(receipt, open("tools/integration/fixtures/d4tails-live-receipt.json", "w"), indent=1)
open("tools/integration/fixtures/d4tails-live-receipt.json", "a").write("\n")
print(json.dumps(receipt["summary"]), json.dumps({k: confuse[k] for k in ("passesIdentical", "long", "longZeroPx", "short")}))
