#!/usr/bin/env python3
"""fa185 receipt: merges two d4aTimingCheck passes over the Faint Attack windows (fa185TimingCheck.sh OUT dirs, one process per fixture, two
fresh runs each) with the d4tails counters into tools/integration/fixtures/fa185-live-receipt.json. Top-level `windows` (fixture +
selectedPhase) feed the all-fixture d4a regression. usage: python3 -I tools/integration/fa185Receipt.py <checkDirA> <checkDirB> <testedSrcTree>
[<regressionSummary>] (from workspace/)"""
import glob, json, sys

check_a, check_b, src_tree = sys.argv[1:4]
regression = json.load(open(sys.argv[4])) if len(sys.argv) > 4 else None
def load(d):
    out = {}
    for p in glob.glob(f"{d}/*.json"):
        for e in json.load(open(p)):
            out[e["fixture"]] = e
    return out
A, B = load(check_a), load(check_b)
assert sorted(A) == sorted(B) and len(A) == 10, (len(A), len(B))
windows = []
for fx in sorted(A):
    a, b = A[fx], B[fx]
    runs = a["runs"] + b["runs"]
    raw = json.load(open(fx))
    side = json.load(open(raw["sourceFixture"]))["attacker"]["geometry"]["side"]
    assert a["selectedPhase"] == b["selectedPhase"] and runs[0]["affectedAges"] == runs[-1]["affectedAges"]
    windows.append({"fixture": fx, "sourceFixture": raw["sourceFixture"], "move": "FAINT_ATTACK", "side": side, "measuredPhase": a["measuredPhase"],
                    "policyPhase": a["policyPhase"], "selectedPhase": a["selectedPhase"], "rows": a["window"], "expectedDuration": a["expectedDuration"],
                    "denseWindow": raw["denseWindow"], "px": [r["residualPixels"] for r in runs], "affectedAges": runs[0]["affectedAges"],
                    "maxPixelsPerRow": runs[0]["maxPixelsPerRow"], "digestsIdentical": len({r["digest"] for r in runs}) == 1,
                    "documentedAges": a["documentedAges"], "violations": sorted(set(a["violations"]) | set(b["violations"])),
                    "timingEvidence": raw["timingEvidence"]})
sel = [w for w in windows if w["selectedPhase"]]
oth = [w for w in windows if not w["selectedPhase"]]
receipt = {
    "schema": "fa185-live-receipt/v1",
    "step": "S10A fa185: Faint Attack (185) per-side optional restore lag at 205 -> faithful timing (ISSUES #152 'Faint Attack (185) short bodies')",
    "testedSrcTree": src_tree,
    "policyVersion": "live-move-timing.v1.dominant-measured-phase.tie-no-optional-event",
    "policy": {"player": {"lag": 1, "noLag": 6, "chosen": "no-event", "bodyRows": 225, "liveWindowRows": 220},
               "opponent": {"lag": 2, "noLag": 1, "chosen": "event", "bodyRows": 226, "liveWindowRows": 221}},
    "derivation": ("Move_FAINT_ATTACK ends `clearmonbg ANIM_ATTACKER; delay 1; restorebg; waitbgfadein; end` (data/battle_anim_scripts.s:5186-5190). "
                   "Cmd_restorebg (src/battle_anim.c:1217) creates Task_FadeToBg (tBackgroundId -1): state 0 (:1150-1155) BeginHardwarePaletteFade(0xE8, 0, 0, 16, 0) "
                   "= the BG3 fade to black (reducer ages 184..199); state 1 (:1158-1162) when the fade ends; state 2 (:1163-1175) LoadDefaultBg -> "
                   "DrawMainBattleBackground (the battle-terrain VRAM decompress) AND BeginHardwarePaletteFade(0xE8, 0, 16, 0, 1) = the default-BG swap "
                   "and the 16-step fade-in, in the same task step; state 3 (:1178-1182) DestroyTask + sAnimBackgroundFadeState = 0, which releases "
                   "Cmd_waitbgfadein (:1243) and `end`. The optional lag (body age 205) is the decompress frame overrunning VBlank under the black screen "
                   "(display-neutral itself), so without it everything from the state-2 step on runs one frame earlier: the reducer profile's "
                   "defaultBgSwapAge 204 -> 203 and doneAge 219 -> 218 (faintAttack.ts faintAttackRestoreProfile), every earlier age unchanged, the live "
                   "window 221 -> 220 rows; the wrong phase differs exactly on ages 203..218 (the swap row + 15 fade-in rows). Not fitted: the residual of "
                   "both other-phase windows equals this shift."),
    "windows": windows,
    "summary": {"fixtures": len(windows), "policyPhase": len(sel), "policyPhaseZeroPx": sum(1 for w in sel if set(w["px"]) == {0}),
                "otherPhase": len(oth), "otherPhaseOnlyDocumented": sum(1 for w in oth if not w["violations"]),
                "violations": sum(len(w["violations"]) for w in windows), "digestsIdentical": all(w["digestsIdentical"] for w in windows)},
    "excluded": ["tools/integration/fixtures/species-audit/derived-shuckle/prep6-faint-attack-alt-base.json (the staged SHUCKLE scenario again)",
                 "tools/integration/fixtures/prep6-faint-attack-alt-base.json (_prep6-faint-attack-base: no counter body, no phase label)"],
    "commands": ["python3 -I tools/integration/fa185Windows.py",
                 "OUT=SCRATCH/checkA P=6 sh tools/integration/fa185TimingCheck.sh; OUT=SCRATCH/checkB P=6 sh tools/integration/fa185TimingCheck.sh",
                 "python3 -I tools/integration/fa185Receipt.py SCRATCH/checkA SCRATCH/checkB $(git rev-parse HEAD:workspace/src) [SCRATCH/regression.json]"],
}
if regression: receipt["d4aRegressionAll"] = regression
with open("tools/integration/fixtures/fa185-live-receipt.json", "w") as f:
    json.dump(receipt, f, indent=1); f.write("\n")
print(json.dumps(receipt["summary"]))
