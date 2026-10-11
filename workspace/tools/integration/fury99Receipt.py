#!/usr/bin/env python3
"""fury99: the live receipt (tools/integration/fixtures/fury99-live-receipt.json) from a fury99Probes.sh dir + a later58Check.sh receipt.

usage: fury99Receipt.py <probe-dir> <check.json> <out.json>
  windows: every Fury Cutter fixture's verdict / rows / two-run residual px / digests (later58Check.ts through the production renderer).
  probes:  per scenario r1 == r2 (byte-identical probe JSON incl. per-frame RGB sha256 and palette RAM).
  blendRows: per counter, the hardware rows whose palette RAM differs from the activation row (banks 1-3, 16, 17; the monbg bank).
  pinned:  every row (age, frame, ROM RGB sha256 of the r1 probe) of one window per counter 2..5 (both sides), for the Tier-1 test.
"""
import json, sys
from pathlib import Path

probe_dir, check, out = Path(sys.argv[1]), json.loads(Path(sys.argv[2]).read_text()), Path(sys.argv[3])
PINNED = ["fury-cutter-pla-grovyle-blissey-splash-1", "fury-cutter-opp-scyther-golem-growl-2", "fury-cutter-opp-grovyle-blissey-splash-3",
          "fury-cutter-pla-scyther-golem-growl-4"]
probes, blend, pinned = {}, {}, {}
for p1 in sorted((probe_dir / "r1").glob("*.json")):
    a = p1.read_bytes()
    probes[p1.stem] = a == (probe_dir / "r2" / p1.name).read_bytes()
    j = json.loads(a)
    frames = {f["frame"]: f for f in j["frames"]}
    k = 0
    for b in j["bodies"]:
        if b["label"] != "Move_FURY_CUTTER":
            continue
        counter, start = b["furyCutterCounter"][b["attacker"]], b["startFrame"]
        base = frames[start]["pltt"]
        rows = {bank: [f - start for f in range(start, b["endFrame"] + 1) if frames[f]["pltt"][bank] != base[bank]] for bank in ("1", "2", "3", "16", "17")}
        blend.setdefault(str(counter), set()).add(json.dumps(rows, sort_keys=True))
        name = f"{p1.stem}-{k}"
        if name in PINNED:
            pinned[name] = {"fixture": name, "counter": counter, "verdict": next(r["verdict"] for r in check["rows"] if r["fixture"] == f"{name}.json"),
                            "rows": [[f - start, f, frames[f]["sha256"]] for f in range(start, b["endFrame"] + 1)]}
        k += 1
windows = [{"fixture": r["fixture"].removesuffix(".json"), "side": r["side"], "attacker": r["attacker"], "target": r["target"],
            "preceding": r["preceding"], "live": r["live"], "verdict": r["verdict"],
            "runs": [[x["exactRows"], x["rows"], x["residualPixels"], x["digest"]] for x in r["runs"]],
            "lentOrderEqualsRom": r["state"]["lentOrderEqualsRom"], "romX2": r["state"]["romX2"]} for r in check["rows"]]
receipt = {
    "schema": "fury99-live-receipt/v1",
    "doc": "docs/fury99-fury-cutter-counters.md",
    "gate": "case 210: counter = request.rolloutCounter (plans54 payload; else the later58 power rule) in 1..5; known lend; firstBody or both rests {0,0}; non-shiny",
    "summary": {"probesR1EqualsR2": f"{sum(probes.values())}/{len(probes)}", "windows": len(windows),
                "exactBothRuns": sum(1 for w in windows if w["verdict"] == "exact" and all(r[2] == 0 and r[0] == r[1] for r in w["runs"])),
                "digestsAgree": sum(1 for w in windows if w["runs"][0][3] == w["runs"][1][3])},
    "probes": probes,
    "blendRows": {c: [json.loads(v) for v in sorted(vs)] for c, vs in sorted(blend.items())},
    "windows": windows,
    "pinned": pinned,
}
out.write_text(json.dumps(receipt, indent=1) + "\n")
print(json.dumps(receipt["summary"]), {c: len(v) for c, v in receipt["blendRows"].items()}, sorted(pinned))
