#!/usr/bin/env python3
"""ROM ordering evidence for the stat-changing moves: between the prompt-pair destroy (EndBounceEffect) and the move body (LaunchBattleAnimation, Moves) the
allocator is silent (the `stat` command's opcode `statbuffchange` runs there and allocates nothing); the stat animation (TryHandleLaunchBattleTableAnimation,
General id 1) launches only AFTER the body's last destroy. Also records the two-run identity (sha256 of the A/B probe outputs).
usage: OUT=/tmp/pgprobe python3 tools/integration/spriteOrderPolicyGapsOrder.py [--write]   -> fixtures/sprite-order-policy-gaps/order-evidence.json"""
import hashlib, json, os, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
OUT = Path(os.environ.get("OUT", "/tmp/pgprobe"))
NAMES = ["dt-player", "dt-opponent", "ft-player", "ft-opponent", "ftb-player", "ftb-opponent", "ftc-player", "ftc-opponent", "fd-player", "fd-opponent", "en-player", "en-opponent"]
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
ALLOC = ("CreateSprite", "CreateSpriteAtEnd", "CreateSpriteAt", "DestroySprite")


def analyse(name):
    d = json.loads((OUT / f"calls-{name}-A.json").read_text())
    calls = [c for c in d["calls"] if c["n"] > d["resetFrame"]]
    destroys = [c["n"] for c in calls if c["kind"] == "DestroySprite" and c["caller"].startswith("EndBounceEffect")]
    bodies = [c for c in calls if c["kind"] == "marker:LaunchBattleAnimation" and c["ctx"]["curMove"] in (104, 297, 313, 283)]
    stats = [c for c in calls if c["kind"] == "marker:TryHandleLaunchBattleTableAnimation"]
    row = {"scenario": name, "runsIdentical": sha(OUT / f"calls-{name}-A.json") == sha(OUT / f"calls-{name}-B.json") and sha(OUT / f"rows-{name}-A.json") == sha(OUT / f"rows-{name}-B.json"),
           "sha256": {"calls": sha(OUT / f"calls-{name}-A.json")[:16], "rows": sha(OUT / f"rows-{name}-A.json")[:16]}}
    if not bodies:
        return row
    b = bodies[0]
    first_prompt_destroy = max(n for n in destroys if n < b["n"])  # the commit of the turn that runs this body
    row["move"] = b["ctx"]["curMove"]
    row["commitDestroyFrame"], row["bodyLaunchFrame"] = first_prompt_destroy, b["n"]
    row["firstBodyOfTurn"] = not any(c["kind"] == "marker:LaunchBattleAnimation" and first_prompt_destroy < c["n"] < b["n"] for c in calls)
    row["allocatorCallsBetweenPromptDestroyAndBodyLaunch"] = sum(1 for c in calls if first_prompt_destroy < c["n"] < b["n"] and c["kind"] in ALLOC)
    # the body's allocator activity ends before the stat animation launches
    after = [s for s in stats if s["n"] > b["n"] and s["args"][3] == 1]
    if after:
        s = after[0]
        body_calls = [c for c in calls if b["n"] <= c["n"] < s["n"] and c["kind"] in ALLOC]
        row["statAnimationFrame"], row["statAnimationArgs"] = s["n"], s["args"]
        row["bodyAllocatorCalls"] = len(body_calls)
        row["lastBodyCallFrame"] = max((c["n"] for c in body_calls), default=None)
        row["statLaunchAfterBodyLastCall"] = row["lastBodyCallFrame"] is None or row["lastBodyCallFrame"] < s["n"]
        row["statCopyCalls"] = [(c["n"], c["kind"], c["caller"]) for c in calls if s["n"] <= c["n"] <= s["n"] + 90 and c["kind"] in ALLOC][:3]
    return row


rows = [analyse(n) for n in NAMES]
res = {"schema": "sprite-order-policy-gaps-order/v1", "rows": rows,
       "allRunsIdentical": all(r["runsIdentical"] for r in rows),
       "allSilentBetweenCommitAndFirstBodyOfTurn": all(r.get("allocatorCallsBetweenPromptDestroyAndBodyLaunch", 0) == 0 for r in rows if r.get("firstBodyOfTurn"))}
for r in rows:
    print(json.dumps(r)[:330])
print(res["allRunsIdentical"], res["allSilentBetweenCommitAndFirstBodyOfTurn"])
if "--write" in sys.argv:
    (ROOT / "tools/integration/fixtures/sprite-order-policy-gaps/order-evidence.json").write_text(json.dumps(res, indent=1) + "\n")
