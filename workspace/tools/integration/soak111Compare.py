#!/usr/bin/env python3
"""soak111: build the decoupling receipt from soak111Decoupling.ts outputs.

  python3 tools/integration/soak111Compare.py <out-dir> <receipt.json> <identity.json>

<out-dir>/run/<variant>.json + <out-dir>/run/<variant>-logs/ for the variants
  dec       this tree (decoupled press stream)
  dec+off108  this tree + off108-scene-off-pauses.diff
  cpl       the coupled base driver (cd84c00fe) -- control
  cpl+off108  the coupled base + the same patch -- control
Per seed and pair: decision log identical (non-mash notes, frame dropped),
canonical log identical (all notes, frame dropped, mash runs collapsed),
gameplay identical (outcome / endState / battle / turn / error), frames a / b.
"""
import json
import sys

out_dir, receipt_path, identity_path = sys.argv[1:4]


def load(variant):
    with open(f"{out_dir}/run/{variant}.json") as f:
        return {row["seed"]: row for row in json.load(f)["rows"]}


def pair(a_name, b_name):
    a, b = load(a_name), load(b_name)
    rows = []
    for seed in sorted(a):
        ra, rb = a[seed], b[seed]
        rows.append({
            "seed": seed,
            "decisionLogIdentical": ra["decisionsSha256"] == rb["decisionsSha256"],
            "canonicalLogIdentical": ra["canonicalSha256"] == rb["canonicalSha256"],
            "gameplayIdentical": all(ra[k] == rb[k] for k in ("outcome", "endState", "battle", "turn", "errorMessage")),
            "decisionNotes": [ra["decisionNotes"], rb["decisionNotes"]],
            "mashNotes": [ra["mashNotes"], rb["mashNotes"]],
            "frames": [ra["frames"], rb["frames"]],
            "endState": [ra["endState"], rb["endState"]],
            "battleTurn": [f"b{ra['battle']} t{ra['turn']}", f"b{rb['battle']} t{rb['turn']}"],
            "decisionsSha256": [ra["decisionsSha256"], rb["decisionsSha256"]],
        })
    summary = {
        "seeds": len(rows),
        "decisionLogIdentical": sum(r["decisionLogIdentical"] for r in rows),
        "canonicalLogIdentical": sum(r["canonicalLogIdentical"] for r in rows),
        "gameplayIdentical": sum(r["gameplayIdentical"] for r in rows),
        "framesDiffer": sum(r["frames"][0] != r["frames"][1] for r in rows),
    }
    return {"a": a_name, "b": b_name, "summary": summary, "rows": rows}


with open(identity_path) as f:
    identity = json.load(f)
decoupled = pair("dec", "dec+off108")
control = pair("cpl", "cpl+off108")
s = decoupled["summary"]
receipt = {
    "step": "soak111: RandomPlayer press stream decoupled from the decision stream",
    "identity": identity,
    "policy": "full",
    "verdict": {
        "decoupledAllDecisionLogsIdentical": s["decisionLogIdentical"] == s["seeds"],
        "decoupledAllCanonicalLogsIdentical": s["canonicalLogIdentical"] == s["seeds"],
        "decoupledAllGameplayIdentical": s["gameplayIdentical"] == s["seeds"],
        "decoupledSeedsWithFramesMoved": s["framesDiffer"],
        "coupledControlSeedsWithDecisionLogDiverged": control["summary"]["seeds"] - control["summary"]["decisionLogIdentical"],
    },
    "decoupled": decoupled,
    "coupledControl": control,
}
with open(receipt_path, "w") as f:
    json.dump(receipt, f, indent=2)
    f.write("\n")
print(json.dumps(receipt["verdict"]))
print("decoupled", json.dumps(decoupled["summary"]))
print("control  ", json.dumps(control["summary"]))
