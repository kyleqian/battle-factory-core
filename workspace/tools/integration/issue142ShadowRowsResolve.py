#!/usr/bin/env python3
"""ISSUES #142 shadow rows, step 1 (static): resolve every live id x orientation to its accepted
fixture window and to the move-script activation frame of the same scenario.

Window mapping = tools/integration/liveAdapterFramebuffer.ts verifyLiveAdapterFramebuffer:
  fixture = sourceFixture merged under the live fixture; window = fixture.denseWindow ?? fixture.sourceWindow;
  live row i = ROM frame window.startFrame + i, live age = i + (denseWindow.ageOffset ?? 0).
Activation = tools/integration/fixtures/allocator-net-zero-audit{,-ext}.json bodies[].activation.
Writes JSON to argv[1] (an intermediate for issue142ShadowRows.ts).  usage: issue142ShadowRowsResolve.py out.json
"""
import json, glob, os, re, sys, collections
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
os.chdir(ROOT)
LIVE_IDS = [2,5,9,11,12,14,21,23,25,27,29,34,36,38,39,41,42,43,44,47,48,49,50,51,55,65,66,67,68,74,75,78,79,83,92,93,94,95,97,101,103,105,106,108,109,112,113,114,115,122,124,131,136,147,148,151,154,156,158,162,163,172,178,180,182,186,188,201,204,208,211,213,223,227,231,232,235,242,243,246,247,257,264,272,277,280,281,287,290,302,305,306,319,320,321,325,334,335,336,337,342,343,347,56,61,197,238,259,294,341,86,87,107,116,203,207,263,339]
src = open("src/engine/liveMoveAnimation.ts").read()
m = re.search(r"LIVE_MOVE_ANIMATION_IDS = Object\.freeze\(\[(.*?)\] as const\)", src, re.S)
body = re.sub(r"//.*", "", m.group(1))
assert [int(x) for x in re.findall(r"\d+", body)] == LIVE_IDS, "LIVE_MOVE_ANIMATION_IDS drifted"
names = {r["id"]: r["move"][5:] for r in json.load(open("src/data/gen/moves.json"))["moves"]}

def load(p): return json.load(open(p))
def merged(path):
    d = load(path)
    if "sourceFixture" in d:
        return {**load(d["sourceFixture"]), **d}, d
    return d, d
idx = collections.defaultdict(list)   # (move, scenario) -> [(path, merged, live)]
bymove = collections.defaultdict(list)
for p in sorted(glob.glob("tools/compare/fixtures/*.json") + glob.glob("tools/integration/fixtures/*.json")):
    try: d = load(p)
    except Exception: continue
    if not isinstance(d, dict) or "move" not in d: continue
    try: mg, live = merged(p)
    except Exception: continue
    if "scenario" not in mg: continue
    ent = (p, mg, live)
    idx[(mg["move"], mg["scenario"])].append(ent); bymove[mg["move"]].append(ent)
def pref(e):  # accepted non-alternate fixtures first; integration (live-window owner) before compare
    p = e[0]; b = os.path.basename(p)
    return (b.startswith(("altspecies", "issue")), not p.startswith("tools/integration"), "alt" in b, b)
audit = {}
for f in ("allocator-net-zero-audit.json", "allocator-net-zero-audit-ext.json"):
    d = load("tools/integration/fixtures/" + f)["moves"]
    for k, v in d.items():
        for s in v["scenarios"]: audit.setdefault((int(k), s["orientation"]), []).append({**s, "auditFile": f})
def side_of(mg):
    a = mg.get("attacker") or {}
    sd = (a.get("geometry") or {}).get("side") or a.get("side") or mg.get("attackerSide")
    if sd: return sd
    mm = re.search(r"mechanic-.*?-(player|opponent)-", os.path.basename(mg["scenario"]))   # slug: <move>-<attacker side>-<mon>-...
    return mm.group(1) if mm else None
# Accepted windows that live in evidence receipts, not in a fixture's denseWindow/sourceWindow (accepted evidence):
MANUAL = {  # (id, orientation): (scenario, start, end, receipt)
    (103, "player"): ("tools/battle-lab/mechanic-screech-player-voltorb-opponent-onix.json", 72, 134, "tools/compare/fixtures/screech-evidence.json orientations.player-back.window"),
    (103, "opponent"): ("tools/battle-lab/mechanic-screech-opponent-voltorb-player-onix.json", 76, 138, "tools/compare/fixtures/screech-evidence.json orientations.opponent-front.window"),
    (14, "player"): ("tools/battle-lab/mechanic-swords-dance-player-ledian-opponent-onix.json", 74, 143, "tools/compare/fixtures/swords-dance-receipts.json orientations[player-back]"),
    (14, "opponent"): ("tools/battle-lab/mechanic-swords-dance-opponent-ledian-player-onix.json", 78, 147, "tools/compare/fixtures/swords-dance-receipts.json orientations[opponent-front]"),
    (246, "player"): ("tools/battle-lab/mechanic-ancient-power-player-baltoy-opponent-onix.json", 225, 352, "tools/compare/fixtures/ancient-power-dense-evidence.json source.sourceWindow (shared by both orientations)"),
    (246, "opponent"): ("tools/battle-lab/mechanic-ancient-power-opponent-baltoy-player-onix.json", 225, 352, "tools/compare/fixtures/ancient-power-dense-evidence.json source.sourceWindow (shared by both orientations)"),
}
for _o, _w0n, _w1n, _w0s, _w1s, _sc in (("player", 234, 384, 288, 479, "player-lombre-opponent-onix"), ("opponent", 220, 370, 289, 480, "opponent-lombre-player-onix")):
    # compare fixtures brick-break[-normal]-<scenario>.json sourceWindow (no 'move' key, so not indexed); body = request.turn 0 normal / 1 shattered-wall
    MANUAL[(280, _o)] = [("tools/battle-lab/mechanic-brick-break-normal-%s.json" % _sc, _w0n, _w1n, "tools/compare/fixtures/brick-break-normal-%s.json sourceWindow" % _sc, "normal"),
                         ("tools/battle-lab/mechanic-brick-break-%s.json" % _sc, _w0s, _w1s, "tools/compare/fixtures/brick-break-%s.json sourceWindow" % _sc, "shattered-wall")]
def window_of(mg):
    w = mg.get("denseWindow") or mg.get("sourceWindow")
    return (w["startFrame"], w["endFrame"], (mg.get("denseWindow") or {}).get("ageOffset", 0), "denseWindow" if mg.get("denseWindow") else "sourceWindow") if w else None
def body_pick(bodies, start):
    # body whose script interval contains the window start; else nearest activation
    cont = [b for b in bodies if b["activation"] <= start <= b["cleanup"]]
    pool = cont or bodies
    return min(pool, key=lambda b: abs(b["activation"] - start)), bool(cont)

out = {}
for i in LIVE_IDS:
    N = names[i]
    for o in ("player", "opponent"):
        row = {"id": i, "move": N, "orientation": o, "candidates": [], "notes": []}
        scs = [s for s in audit.get((i, o), []) if s.get("status") == "audited" and s.get("bodies")]
        seen = set()
        for s in scs:
            for e in sorted(idx.get((N, s["scenario"]), []), key=pref):
                if side_of(e[1]) != o or e[0] in seen: continue
                seen.add(e[0])
                w = window_of(e[1])
                if not w: row["notes"].append(f"{e[0]}: no window"); continue
                b, cont = body_pick(s["bodies"], w[0])
                row["candidates"].append({"fixture": e[0], "scenario": s["scenario"], "audit": s["auditFile"],
                    "windowStart": w[0], "windowEnd": w[1], "ageOffset": w[2], "windowKind": w[3],
                    "body": e[1].get("body", "normal"), "bodies": [[x["activation"], x["cleanup"]] for x in s["bodies"]],
                    "activationFrame": b["activation"], "cleanup": b["cleanup"], "bodyContainsWindowStart": cont})
        if not row["candidates"] and (i, o) in MANUAL:
            ents = MANUAL[(i, o)] if isinstance(MANUAL[(i, o)], list) else [MANUAL[(i, o)] + ("normal",)]
            for sc, a0, a1, rc, bodyk in ents:
              for s in scs:
                if s["scenario"] == sc:
                    b, cont = body_pick(s["bodies"], a0)
                    row["candidates"].append({"fixture": rc, "scenario": sc, "audit": s["auditFile"], "windowStart": a0, "windowEnd": a1,
                        "ageOffset": 0, "windowKind": "receipt", "body": bodyk, "bodies": [[x["activation"], x["cleanup"]] for x in s["bodies"]],
                        "activationFrame": b["activation"], "cleanup": b["cleanup"], "bodyContainsWindowStart": cont})
        if not row["candidates"]:
            # accepted fixture exists but no audited (move, scenario) pair matches: activation must be probed
            alts = sorted([e for e in bymove.get(N, []) if side_of(e[1]) == o and window_of(e[1])
                           and not os.path.basename(e[0]).startswith(("altspecies", "issue"))], key=pref)
            seenS = set()
            for e in alts:
                if e[1]["scenario"] in seenS: continue
                seenS.add(e[1]["scenario"]); w = window_of(e[1])
                row.setdefault("probeNeeded", []).append({"fixture": e[0], "scenario": e[1]["scenario"], "windowStart": w[0], "windowEnd": w[1],
                    "ageOffset": w[2], "windowKind": w[3], "body": e[1].get("body", "normal"), "probeMoveId": e[1].get("probeMoveId") or (i if "mechanic-poison-fang" in e[1]["scenario"] else None)})
        out[f"{i}:{o}"] = row
json.dump(out, open(sys.argv[1], "w"), indent=1)
gap = [k for k, v in out.items() if not v["candidates"]]
print(len(out), "rows; no-candidate:", len(gap)); print(gap)

jobs = {}
for k, v in out.items():
    for pn in v.get("probeNeeded", []):
        jobs[(pn["scenario"], pn["probeMoveId"])] = 1
json.dump([{"scenario": a, "probeMoveId": b} for a, b in sorted(jobs, key=str)], open(sys.argv[1] + ".jobs", "w"), indent=1)
print("probe jobs:", len(jobs))
