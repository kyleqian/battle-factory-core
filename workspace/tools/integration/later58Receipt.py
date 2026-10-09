#!/usr/bin/env python3
"""later58: the live receipt (tools/integration/fixtures/later58-live-receipt.json) from later58Check.ts receipts + the r1 / r2 probes.

usage: later58Receipt.py <probes-dir with r1/ r2/> <out.json> <check.json>... (a later check file wins per fixture)
Per lifted move: the narrowed gate, fixture / verdict counts (first vs later body; exact = 0 px in the policy's phase, other-phase-documented =
the D4 alternate phase with residual only on the documented rows, declined, FAIL), the probe r1 == r2 count of its scenarios, the history state at
the later activations, and PINNED rows (age, ROM frame, ROM RGB sha256 of the r1 probe) of chosen later windows: every row whose residual is 0 in
the check (for an other-phase window: the rows outside the documented residual) -- tests/animation/later58LiveGates.test.ts re-renders them.
"""
import json, sys
from collections import Counter
from pathlib import Path

probes, out, checks = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3:]
rows = {}
for c in checks:
    for r in json.loads(Path(c).read_text())["rows"]:
        rows[r["fixture"]] = r
GATES = {
    "SIGNAL_BEAM": ("signalBeam324", "known lend AND (firstBody OR both species front-idle rests {0,0}) AND non-shiny"),
    "MACH_PUNCH": ("machPunch183", "known lend AND (firstBody OR both species front-idle rests {0,0}) AND non-shiny AND zero target rest (unchanged)"),
    "SHEER_COLD": ("sheerCold329", "known lend AND (firstBody OR both species front-idle rests {0,0}) AND non-shiny"),
    "EXTRASENSORY": ("extrasensory326", "known lend AND (firstBody OR (OPPONENT attacker AND both species front-idle rests {0,0})) AND non-shiny"),
    "SKY_ATTACK": ("skyAttack143", "charge: known lend AND (firstBody OR both species front-idle rests {0,0}) AND non-shiny (later charge: WIN0 (0,0)); strike unchanged"),
    "BONEMERANG": ("bonemerang155", "known lend AND (firstBody OR afterBonemerangHit1 OR both species front-idle rests {0,0}) AND non-shiny"),
    "OUTRAGE": ("outrage200", "known lend AND (firstBody OR both species front-idle rests {0,0}) AND non-shiny"),
    "MEMENTO": ("memento262", "UNCHANGED (first body only): the scanline entry is read and a scanline predecessor (Psywave) changes it; no production scanline-history input"),
}
PINS = {
    "SIGNAL_BEAM": ["signal-beam-pla-venomoth-golem-growl-2.json", "signal-beam-opp-ariados-chansey-qa-1.json"],
    "MACH_PUNCH": ["mach-punch-pla-hitmonchan-chansey-splash-1.json", "mach-punch-opp-machamp-golem-growl-2.json"],
    "SHEER_COLD": ["sheer-cold-pla-dewgong-chansey-qa-0.json", "sheer-cold-opp-dewgong-chansey-splash-s1-0.json"],
    "EXTRASENSORY": ["extrasensory-opp-nuzleaf-shuckle-splash-2.json", "extrasensory-opp-alakazam-golem-qa-1.json"],
    "SKY_ATTACK": ["sky-attack-opp-pidgeot-golem-qa-2.json", "sky-attack-pla-fearow-shuckle-splash-2.json"],
    "BONEMERANG": ["bonemerang-opp-rhydon-golem-splash-2.json", "bonemerang-pla-rhydon-golem-growl-1.json"],
    "OUTRAGE": ["outrage-opp-flygon-golem-qa-1.json", "outrage-pla-flygon-golem-growl-2.json"],
    "MEMENTO": [],
}
def alloc_components(later):
    """Per allocator component (from the r1 probe at activation): later activations equal to the same scenario's first body of the move."""
    n = Counter()
    for r in later:
        probe = json.loads((probes / "r1" / f"{r['fixture'].rsplit('-', 1)[0]}.json").read_text())
        body = next(b for b in probe["bodies"] if b["startFrame"] == r["window"][0])
        first = next(b for b in probe["bodies"] if b["label"] == body["label"] and b["attacker"] == body["attacker"])
        for k in ("tileBitmapSha", "paletteTags", "matrixBitmap", "tasks", "tileTagsSha"):
            n[k] += body["at"][k] == first["at"][k]
    return {k: f"{v}/{len(later)}" for k, v in n.items()}
# A first-body Extrasensory window of the accepted ALAKAZAM -> GOLEM player pair reproduces that window's documented per-window scanout-split
# residual (docs/animation-integration-live-status.json alternatePhaseResidual.windows["extrasensory-alt-player-alakazam-golem"]).
status = json.loads(Path("docs/animation-integration-live-status.json").read_text())
split = next(e for e in status["faithfulTimingAdapters"] if e["id"] == 326)["alternatePhaseResidual"]["windows"]["extrasensory-alt-player-alakazam-golem"]["ages"]
for r in rows.values():
    if r["move"] == "EXTRASENSORY" and r["firstBody"] and r["verdict"] == "FAIL" and r["affectedAges"] == f"{split[0]}..{split[-1]} ({len(split)})":
        r["verdict"] = "documented-window extrasensory-alt-player-alakazam-golem"
moves = sorted({r["move"] for r in rows.values()}, key=list(GATES).index)
receipt = {"schema": "later58-live-receipt/v1", "gates": {GATES[m][0]: GATES[m][1] for m in moves}, "windows": {}, "pinned": {}}
for m in moves:
    mine = [r for r in rows.values() if r["move"] == m]
    scen = sorted({r["fixture"].rsplit("-", 1)[0] for r in mine})
    same = sum((probes / "r1" / f"{s}.json").read_bytes() == (probes / "r2" / f"{s}.json").read_bytes() for s in scen)
    later = [r for r in mine if not r["firstBody"]]
    receipt["windows"][m] = {
        "fixtures": len(mine), "scenarios": len(scen), "probeR1EqualsR2": f"{same}/{len(scen)}",
        "freshRunsAgree": sum(len({x["digest"] for x in r["runs"]}) == 1 for r in mine),
        "verdicts": {f"{'first' if r else 'later'} {s} {v}": n for (r, s, v), n in sorted(Counter((r["firstBody"], r["side"], r["verdict"]) for r in mine).items())},
        "laterPredecessors": sorted({r["preceding"] for r in later}),
        "laterNotExact": [{"fixture": r["fixture"], "verdict": r["verdict"], "px": r["runs"][0]["residualPixels"], "ages": r["affectedAges"]}
                          for r in later if r["verdict"] != "exact"],
        "laterState": {
            "registersNotS0": dict(Counter(json.dumps(r["state"]["registersNotS0"], sort_keys=True) for r in later)),
            "scanline(state,bank0LinesNotS0,asFirstBody)": dict(Counter(json.dumps([r["state"]["scanline"]["state"], r["state"]["scanline"]["bank0LinesNotS0"], r["state"]["scanline"]["asFirstBody"]]) for r in later)),
            "allocatorComponentsAsFirstBody": alloc_components(later),
            "bgMapsAsFirstBody": dict(Counter(str(r["state"]["bgMapsAsFirstBody"]) for r in later)),
            "lentOrderEqualsRom": dict(Counter(str(r["state"]["lentOrderEqualsRom"]) for r in later)),
            "romX2": dict(Counter(json.dumps(r["state"]["romX2"]) for r in later)),
        },
    }
    for name in PINS[m]:
        r = rows[name]
        assert not r["firstBody"] and r["verdict"] in ("exact", "other-phase-documented"), name
        fx = json.loads((Path("tools/integration/fixtures/later58/live") / name).read_text())
        probe = json.loads((probes / "r1" / f"{name.rsplit('-', 1)[0]}.json").read_text())
        shas = {x["frame"]: x["sha256"] for x in probe["frames"]}
        w = fx["denseWindow"]
        bad = set()
        if r["affectedAges"]:
            a, n = r["affectedAges"].split(" ")[0].split(".."), int(r["affectedAges"].split("(")[1].rstrip(")"))
            bad = set(range(int(a[0]), int(a[1]) + 1))
            assert len(bad) == n, name
        receipt["pinned"][name.removesuffix(".json")] = {"fixture": f"tools/integration/fixtures/later58/live/{name}", "verdict": r["verdict"],
            "rows": [[f - w["startFrame"], f, shas[f]] for f in range(w["startFrame"], w["endFrame"] + 1) if f - w["startFrame"] not in bad]}
out.write_text(json.dumps(receipt, indent=0, separators=(",", ":")) + "\n")
for m in moves:
    print(m, json.dumps(receipt["windows"][m]["verdicts"]), receipt["windows"][m]["probeR1EqualsR2"])
