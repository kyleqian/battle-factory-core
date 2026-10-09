#!/usr/bin/env python3
"""aud56: fold the audit, the exposure ranking and the live-share census delta into tools/integration/fixtures/aud56-live-receipt.json.

usage: aud56Receipt.py <scratch-dir> <out.json>
<scratch-dir> holds census-{before,after}.{json,jsonl} (liveShareCensus.ts seeds 0..299 on a860ded6a / this branch),
exposure-{before,after}.json (aud56ExposureCensus.ts), delta.json (prep43CensusDelta.py) and base-head.txt.
"""
import hashlib, json, subprocess, sys
from pathlib import Path

d, out = Path(sys.argv[1]), Path(sys.argv[2])
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
audit = json.loads(Path("tools/integration/fixtures/aud56-net-zero-audit.json").read_text())


def census(name):
    r = json.loads((d / f"{name}.json").read_text())
    o = r["overall"]
    return {"reportSha256": sha(d / f"{name}.json"), "commandsSha256": sha(d / f"{name}.jsonl"), "battleDigest": r["battleDigest"],
            "commandDigest": r.get("commandDigest"), "battles": r["battles"]["played"], "commands": o["commands"], "live": o["live"],
            "liveFrames": o["liveFrames"], "frames": o["frames"], "liveSharePctByCount": o["liveSharePctByCount"],
            "liveSharePctByFrames": o["liveSharePctByFrames"]}


before, after = census("census-before"), census("census-after")
bl = [json.loads(l) for l in (d / "census-before.jsonl").read_text().splitlines() if l]
al = [json.loads(l) for l in (d / "census-after.jsonl").read_text().splitlines() if l]
regressions = [{"index": i, "battle": x["battle"], "move": x["move"], "side": x["side"], "after": y.get("decline")}
               for i, (x, y) in enumerate(zip(bl, al)) if x["status"] == "live" and y["status"] != "live"]
exp_after = json.loads((d / "exposure-after.json").read_text())
receipt = {
    "schema": "aud56-live-receipt/v1",
    "issue": "ISSUES #156",
    "base": (d / "base-head.txt").read_text().strip(),
    "branchSrcTree": subprocess.run(["git", "rev-parse", "HEAD:workspace/src"], capture_output=True, text=True).stdout.strip(),
    "audit": {"receipt": "tools/integration/fixtures/aud56-net-zero-audit.json", "receiptSha256": sha(Path("tools/integration/fixtures/aud56-net-zero-audit.json")),
              "jobs": audit["jobs"], "runs": audit["runs"], "allIdenticalAB": audit["allIdenticalAB"],
              "units": [{k: u[k] for k in ("unit", "key", "verdict", "completeInstances", "fromKnownEntry", "species", "createdPerInstance",
                                           "lateOwners", "jobs", "sourceBattlerRule", "reason") if k in u} for u in audit["units"]]},
    "exposureBefore": {"receipt": "tools/integration/fixtures/aud56-exposure-before-seeds0-299.json",
                       "ranking": [{k: x[k] for k in ("unit", "allocatorBodies", "liveBodiesKnownHost", "eventsKnownHost", "events")}
                                   for x in json.loads(Path("tools/integration/fixtures/aud56-exposure-before-seeds0-299.json").read_text())["aud56Exposure"]]},
    "census": {"tool": "tools/integration/liveShareCensus.ts --seeds=0..299", "before": before, "after": after,
               "pairing": "prep43CensusDelta.py", "commandRecordsIdentical": bl == al,
               "liveDeltaCommands": after["live"] - before["live"], "liveDeltaFrames": after["liveFrames"] - before["liveFrames"],
               "liveToFallback": regressions,
               "allocatorHostInvalidationsByGeneralUnitsAfter": [x for x in exp_after["allocatorInvalidationsAll"] if x["unit"].startswith("general animation")]},
    "denseWindows": "none required: no NOT-net-zero unit is kept live (every kept unit is NET-ZERO; unaudited ids invalidate)",
}
out.write_text(json.dumps(receipt, indent=1) + "\n")
print(json.dumps({k: receipt["census"][k] for k in ("commandRecordsIdentical", "liveDeltaCommands", "liveDeltaFrames")}),
      len(regressions), "regressions")
