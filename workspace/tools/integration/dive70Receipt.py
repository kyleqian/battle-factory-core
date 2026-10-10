#!/usr/bin/env python3
"""dive70: the live receipt from liveAdapterFramebuffer.ts outputs (two fresh direct-mGBA runs per window), dive70Check.ts lines and the
Protect probes (prep22Probe.py bodies), and the per-row ROM RGB888 sha256 of each window (POKEBENCH_LIVE_EVIDENCE_DIR's
live-comparison.json, run 0 == run 1 asserted) as the vector the Tier-1 test re-renders against.
usage: dive70Receipt.py FBDIR CHECK.jsonl PROBEDIR OUT.json [EVIDENCEDIR]"""
import json, sys
from pathlib import Path
fb, check, probes, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]), Path(sys.argv[4])
evidence = Path(sys.argv[5]) if len(sys.argv) > 5 else None
def rom_rows(stem):
    if evidence is None:
        return None
    r0, r1 = (json.loads((evidence / f"{stem}-run{k}" / "live-comparison.json").read_text())["comparisons"] for k in (0, 1))
    assert [(r["age"], r["source"], r["live"]) for r in r0] == [(r["age"], r["source"], r["live"]) for r in r1], stem
    assert all(r["residualPixels"] == 0 for r in r0), stem
    return [r["source"] for r in r0]
checks = {Path(d["fixture"]).name: d for d in map(json.loads, check.read_text().splitlines())}
windows = []
for name in sorted(checks):
    runs = json.loads((fb / name).read_text())
    f = json.loads(Path(f"tools/integration/fixtures/dive70/{name}").read_text())
    c = checks[name]
    windows.append({"fixture": f"tools/integration/fixtures/dive70/{name}", "scenario": f["scenario"], "side": f["attacker"]["geometry"]["side"],
                    "attacker": f["attacker"]["species"], "target": f["target"]["species"], "window": [f["denseWindow"]["startFrame"], f["denseWindow"]["endFrame"]],
                    "rows": runs[0]["rows"], "expectedDuration": runs[0]["expectedDuration"],
                    "runs": [{"run": r["run"], "exactRows": r["exactRows"], "residualPixels": r["residualPixels"], "digest": r["digest"]} for r in runs],
                    "r1EqualsR2": runs[0]["digest"] == runs[1]["digest"], "lendEqualsRom": c["lendEqualsRom"], "liveAges": c["liveAges"],
                    "words": c["words"], "wordsProvenance": "pinned (RAM gRng2Value at the setup / attack activation, fixture hook wordsChain)",
                    "deferredUnits": c["deferredMarker"]["units"] if c["deferredMarker"] else None,
                    **({} if evidence is None else {"romRgbSha256": rom_rows(Path(name).stem)})})
protect = []
for p in sorted(probes.glob("protect-*-r1.json")):
    d = json.loads(p.read_text())
    bodies = [[b["move"], b["start"], b["end"] - b["start"] + 1, b["atActivation"]["attacker"]] for b in d["bodies"]]
    r2 = json.loads(Path(str(p).replace("-r1.json", "-r2.json")).read_text())
    assert bodies == [[b["move"], b["start"], b["end"] - b["start"] + 1, b["atActivation"]["attacker"]] for b in r2["bodies"]], p
    # a successful turn-2 Protect (the second 182 body) right after the setup: is the next Dive body an attack (93 rows) or a new setup?
    ms = [b[0] for b in bodies]
    protected = len(ms) >= 3 and ms[:3] == [182, 291, 182]
    nxt = next((b for b in bodies[3:] if b[0] == 291), None)
    protect.append({"probe": p.name, "freshRunsAgree": True, "bodies": bodies, "turn2ProtectSucceeded": protected,
                    "nextDiveBody": None if nxt is None else ("attack" if nxt[2] == 93 else "new setup")})
summary = {"windows": len(windows), "exactWindows": sum(all(r["residualPixels"] == 0 and r["exactRows"] == w["rows"] for r in w["runs"]) for w in windows),
           "rows": sum(w["rows"] for w in windows), "r1EqualsR2": sum(w["r1EqualsR2"] for w in windows),
           "lendEqualsRom": sum(w["lendEqualsRom"] for w in windows),
           "protectedAttacksWithoutBody": sum(1 for x in protect if x["turn2ProtectSucceeded"] and x["nextDiveBody"] != "attack")}
out.write_text(json.dumps({"schema": "dive70-live-receipt/v1", "summary": summary, "windows": windows, "protectMiss": protect}, indent=1) + "\n")
print(json.dumps(summary))
