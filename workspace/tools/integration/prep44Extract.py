#!/usr/bin/env python3
"""prep44: fold the prep44Probe.py raw pairs into a compact net-zero receipt (allocatorNetZeroExtReceipt.py's definition).

usage: prep44Extract.py <out-dir> <receipt.json>
Per (move, scenario): both fresh runs byte-identical (sha256 of each), activation sequence, and per body of the move: baseline
(occupied OBJ slots at activation-1), end (at cleanup), created/destroyed counts in [activation, cleanup], late changes (8 frames
after cleanup). NET-ZERO per body = end == baseline and created == destroyed; a move is NET-ZERO only if every body of both
orientations is, in identical run pairs. Verdicts: NET-ZERO / NOT-NET-ZERO / NOT-AUDITED (runs differ, never active, missing).
"""
import hashlib, json, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from prep44Probe import ROOT, jobs, scenario  # noqa: E402

out, receipt = Path(sys.argv[1]), Path(sys.argv[2])
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
moves = {}
for mid, name, stem, orient in jobs():
    p0, p1 = out / "raw" / f"{mid}-{Path(stem).name}-0.json", out / "raw" / f"{mid}-{Path(stem).name}-1.json"
    row = {"scenario": stem, "orientation": orient}
    if not (p0.is_file() and p1.is_file()):
        row["status"] = "not-run"
    else:
        row["rawSha256"] = [sha(p0), sha(p1)]
        row["runsIdentical"] = p0.read_bytes() == p1.read_bytes()
        d = json.loads(p0.read_text())
        row["activationSequence"] = [[a["move"], a["start"], a["end"]] for a in d["activationSequence"]]
        row["bodies"] = [{"activation": b.get("activation"), "cleanup": b.get("cleanup"), "baseline": b.get("baseline"), "end": b.get("end"),
                          "created": b.get("created"), "destroyed": b.get("destroyed"), "lateChanges": len(b.get("lateChanges") or []),
                          "netZero": "baseline" in b and b["baseline"] == b["end"] and b["created"] == b["destroyed"]} for b in d["bodies"]]
        row["status"] = ("move-never-active" if not row["bodies"] else "runs-differ" if not row["runsIdentical"]
                         else "window-incomplete" if any(b.get("error") for b in d["bodies"]) else "audited")
        if row["status"] == "audited":
            row["netZero"] = all(b["netZero"] for b in row["bodies"])
    m = moves.setdefault(str(mid), {"name": name, "scenarios": []})
    m["scenarios"].append(row)
for m in moves.values():
    rows = m["scenarios"]
    orients = {r["orientation"] for r in rows if r["status"] == "audited"}
    if any(r["status"] == "audited" and not r["netZero"] for r in rows):
        m["verdict"] = "NOT-NET-ZERO"
    elif {"player", "opponent"} <= orients:
        m["verdict"] = "NET-ZERO"
    else:
        m["verdict"] = "NOT-AUDITED: " + ", ".join(sorted({r["status"] for r in rows if r["status"] != "audited"}) or ["orientation missing"])
ref = ROOT / "reference/pokeemerald"
result = {
    "schema": "prep44-allocator-net-zero/v1", "profile": "battle-scene-on", "definition": "docs/allocator-net-zero-audit.md (unchanged probe)",
    "referenceSha256": {n: sha(ref / n) for n in ("pokeemerald.gba", "pokeemerald.elf")},
    "toolSha256": {n: sha(ROOT / n) for n in ("tools/compare/allocatorNetZeroProbe.py", "tools/integration/prep44Probe.py")},
    "scenarioSha256": {stem: sha(scenario(stem)) for _, _, stem, _ in jobs()},
    "summary": {v: sorted(int(k) for k, m in moves.items() if m["verdict"] == v) for v in ("NET-ZERO", "NOT-NET-ZERO")}
    | {"notAudited": {k: m["verdict"] for k, m in moves.items() if m["verdict"].startswith("NOT-AUDITED")}},
    "moves": moves,
}
receipt.write_text(json.dumps(result, indent=1) + "\n")
print(json.dumps(result["summary"]))
for k, m in moves.items():
    print(k, m["name"], m["verdict"], [(r["orientation"], r["status"], [(b["baseline"] == b["end"], b["created"], b["destroyed"]) for b in r.get("bodies", [])]) for r in m["scenarios"]])
