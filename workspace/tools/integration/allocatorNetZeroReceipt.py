#!/usr/bin/env python3
"""Fold raw probe pairs into tools/integration/fixtures/allocator-net-zero-audit.json."""
import hashlib, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FX = ROOT / "tools/integration/fixtures"
RAW = FX / "allocator-net-zero-raw"
manifest = json.loads((FX / "allocator-net-zero-manifest.json").read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
ref = ROOT / "reference/pokeemerald"
moves, netzero, notnz, notaudited = {}, [], {}, {}
for mid, entry in manifest.items():
    rows, seen = [], set()
    for fx in entry["fixtures"]:
        if fx["scenario"] in seen:
            continue
        seen.add(fx["scenario"])
        stem = Path(fx["scenario"]).stem
        p0, p1 = RAW / f"{mid}-{stem}-0.json", RAW / f"{mid}-{stem}-1.json"
        row = {"orientation": fx["orientation"], "scenario": fx["scenario"], "sourceFixture": fx["sourceFixture"],
               "integrationFixture": fx["integrationFixture"], "fallback": fx.get("fallback")}
        if not (p0.is_file() and p1.is_file()):
            row["status"] = "not-run"; rows.append(row); continue
        row["rawSha256"] = [sha(p0), sha(p1)]
        row["runsIdentical"] = p0.read_bytes() == p1.read_bytes()
        d = json.loads(p0.read_text())
        row["activationSequence"] = [(a["move"], a["start"], a["end"]) for a in d["activationSequence"]]
        bodies = []
        for b in d["bodies"]:
            b["netZero"] = b["baseline"] == b["end"] and b["created"] == b["destroyed"] if "baseline" in b else False
            b["lateFlag"] = bool(b.get("lateChanges"))
            bodies.append({k: b.get(k) for k in ("activation", "cleanup", "baseline", "end", "created", "destroyed",
                                                "lateChanges", "lateFlag", "netZero", "endEqualsBaselineTable", "intervals", "error")
                           if b.get(k) is not None or k in ("netZero",)})
        row["bodies"] = bodies
        if not bodies:
            row["status"] = "move-never-active"
        elif not row["runsIdentical"]:
            row["status"] = "runs-differ"
        else:
            row["status"] = "audited"
            row["netZero"] = all(b.get("netZero") for b in bodies)
        rows.append(row)
    moves[mid] = {"name": entry["name"], "scenarios": rows}
    aud = [r for r in rows if r["status"] == "audited"]
    if not rows:
        notaudited[mid] = "no accepted fixture / scenario found"
    elif not aud:
        notaudited[mid] = "; ".join(sorted({r["status"] for r in rows}))
    elif all(r["netZero"] for r in aud) and len(aud) == len(rows):
        netzero.append(int(mid))
    else:
        notnz[mid] = [{"scenario": Path(r["scenario"]).stem, "status": r["status"], "bodies": [
            {k: b.get(k) for k in ("activation", "cleanup", "baseline", "end", "created", "destroyed", "lateChanges", "error")}
            for b in r.get("bodies", []) if not b.get("netZero")]} for r in rows if r["status"] != "audited" or not r["netZero"]]
lateFlagged = sorted({int(m) for m, e in moves.items() for r in e["scenarios"] for b in r.get("bodies", []) if b.get("lateFlag")})
out = {
    "schema": "allocator-net-zero-audit/v1", "profile": "battle-scene-on",
    "definition": "docs/allocator-net-zero-audit.md",
    "referenceSha256": {n: sha(ref / n) for n in ("pokeemerald.gba", "pokeemerald.elf", "pokeemerald.map")},
    "toolSha256": {n: sha(ROOT / n) for n in ("tools/compare/allocatorNetZeroProbe.py", "tools/integration/allocatorNetZeroBatch.py",
                                              "tools/integration/allocatorNetZeroManifest.py", "tools/integration/allocatorNetZeroReceipt.py")},
    "summary": {"netZeroIds": sorted(netzero), "notNetZero": notnz, "netZeroWithLateChangesInNext8Frames": sorted(set(lateFlagged) & set(netzero)), "notAudited": notaudited,
                "counts": {"moves": len(moves), "netZero": len(netzero), "notNetZero": len(notnz), "notAudited": len(notaudited)}},
    "moves": moves,
}
(FX / "allocator-net-zero-audit.json").write_text(json.dumps(out, indent=1) + "\n")
print(json.dumps(out["summary"]["counts"]), "\nnotNZ", json.dumps(notnz)[:3000], "\nnotAudited", notaudited)
