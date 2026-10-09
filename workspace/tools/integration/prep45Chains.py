#!/usr/bin/env python3
"""prep45: sprite-ORDER host invalidator CHAINS -> which units must be planned together (docs/next-adapters-prep45.md).

usage: prep45Chains.py <before.jsonl> <out.json> [--cleared "unit|unit|..." [--after <after.jsonl>]]
Input: prep45OrderCensus.ts --commands output (master src). A "sprite-order lend unknown" decline can only become live when EVERY
unit of its chain (all order-host-invalidating units since the host was last known) stops invalidating. Units are the production
reason texts with the attacker side dropped from body units ("no EXACT plan: body 28:opponent" -> "body 28 SAND_ATTACK"): a plan is
only accepted when proven on both sides. Reports per unit: first-unit frames, solo (chain is only this unit), involvement, the
excluded-owner tag, and a greedy order by unlocked fallback frames over the NON-excluded units (each step adds the unit that unlocks
most frames given those already cleared; zero-gain ties pick the most-involved unit) plus the same greedy over all units. With
--cleared (normalized unit names), the predicted unlock of exactly that set; with --after (the patched census --commands output, same
command sequence), the measured outcome of every before-decline paired line by line (predicted live / measured live agreement).
"""
import json, re, sys
from collections import defaultdict, Counter

src, out = sys.argv[1], sys.argv[2]
moves = {m["id"]: m["move"].removeprefix("MOVE_") for m in json.load(open("src/data/gen/moves.json"))["moves"]}
cleared = set(sys.argv[sys.argv.index("--cleared") + 1].split("|")) if "--cleared" in sys.argv else set()

def norm(u):
    m = re.fullmatch(r"no EXACT plan: body (\d+):(player|opponent)", u)
    if m:
        i = int(m.group(1)); base = i - 10000 if i > 10000 else i
        return f"body {i} {moves.get(base, '?')}{' (2nd branch)' if i > 10000 else ''}"
    m = re.fullmatch(r"no EXACT plan: (general|status) animation (\S+)(?: \(wrapped ([^)]+)\))?", u)
    if m:
        return f"{m.group(1)} animation {m.group(2)}" + (f" {m.group(3).replace(' ', '_')}" if m.group(3) else "")
    return u

# Units owned by other steps (the prep45 brief): Giga Drain geometry, Rain Dance / RAIN_CONTINUES words, the retained locked-action
# continuation (orchestrator), post-KO / switch reseed paths.
EXCLUDED = {
    "body 202 GIGA_DRAIN": "species-geometry step", "body 240 RAIN_DANCE": "Random2 words step",
    "general animation RAIN_CONTINUES": "Random2 words step", "command resolution without an action prompt": "orchestrator step",
}
def excluded(u):
    if u in EXCLUDED: return EXCLUDED[u]
    if u.startswith("battle-start seed"):
        return "battle-start seed (not a presentation unit)"
    if "send-out" in u or "switch-in" in u or "summary" in u or "faint" in u or "reshow" in u \
            or u.startswith("previous resolution") or u.startswith("resolution without"):
        return "post-KO / switch reseed path"
    return None

rows = [c for c in (json.loads(l) for l in open(src) if l.strip()) if c.get("orderChain") is not None]
fb = lambda c: c["frames"] - c["liveFrames"]
for c in rows:
    c["chain"] = list(dict.fromkeys(norm(u) for u in c["orderChain"])) or ["(empty chain)"]
total = sum(fb(c) for c in rows)
first, solo, inv = defaultdict(lambda: [0, 0]), defaultdict(lambda: [0, 0]), defaultdict(lambda: [0, 0])
for c in rows:
    first[c["chain"][0]][0] += 1; first[c["chain"][0]][1] += fb(c)
    if len(c["chain"]) == 1:
        solo[c["chain"][0]][0] += 1; solo[c["chain"][0]][1] += fb(c)
    for u in set(c["chain"]):
        inv[u][0] += 1; inv[u][1] += fb(c)
unlocked = lambda s: [c for c in rows if set(c["chain"]) <= s]
def greedy(pool, limit=40):
    out, s = [], set()
    while len(out) < limit:
        base = sum(fb(c) for c in unlocked(s))
        cands = [u for u in pool if u not in s]
        if not cands: break
        best = max(cands, key=lambda u: (sum(fb(c) for c in unlocked(s | {u})) - base, inv[u][1], u))
        s.add(best); got = unlocked(s)
        out.append({"add": best, "gainFrames": sum(fb(c) for c in got) - base, "cumulativeCommands": len(got), "cumulativeFrames": sum(fb(c) for c in got)})
    return out
pool = [u for u in inv if not excluded(u)]
rec = Counter(len(c.get("orderRecoveriesBefore", [])) for c in rows)
recBy = Counter(x for c in rows for x in set(c.get("orderRecoveriesBefore", [])))
pred = unlocked(cleared) if cleared else []
measured = None
if "--after" in sys.argv:
    allb = [json.loads(l) for l in open(src) if l.strip()]
    alla = [json.loads(l) for l in open(sys.argv[sys.argv.index("--after") + 1]) if l.strip()]
    assert len(allb) == len(alla) and all((x["battle"], x["kind"], x["moveId"], x["side"], x["frames"]) == (y["battle"], y["kind"], y["moveId"], y["side"], y["frames"]) for x, y in zip(allb, alla))
    predicted_ids = {id(c) for c in pred}
    rowsb = [(b, a) for b, a in zip(allb, alla) if b.get("orderChain") is not None]
    cell = lambda p, m: [n for n, (b, a) in enumerate(rowsb) if (set(dict.fromkeys(norm(u) for u in b["orderChain"]) or ["(empty chain)"]) <= cleared) == p and (a["status"] == "live") == m]
    tt, tf, ft = cell(True, True), cell(True, False), cell(False, True)
    fbo = lambda ns: sum(rowsb[n][0]["frames"] - rowsb[n][0]["liveFrames"] for n in ns)
    measured = {"predictedLiveMeasuredLive": [len(tt), fbo(tt)], "predictedLiveMeasuredNotLive": [len(tf), fbo(tf)],
                "notPredictedMeasuredLive": [len(ft), fbo(ft)],
                "mismatchExamples": [{"battle": rowsb[n][0]["battle"], "move": rowsb[n][0]["move"], "side": rowsb[n][0]["side"],
                                      "chainBefore": rowsb[n][0]["orderChain"], "afterStatus": rowsb[n][1]["status"],
                                      "afterDecline": rowsb[n][1].get("decline"), "afterChain": rowsb[n][1].get("orderChain")} for n in (tf + ft)[:12]]}
result = {
    "schema": "prep45-order-chains/v1", "declines": len(rows), "fallbackFrames": total,
    "chainLength": {str(k): v for k, v in sorted(Counter(len(c["chain"]) for c in rows).items())},
    "chainLengthFrames": {str(k): sum(fb(c) for c in rows if len(c["chain"]) == k) for k in sorted({len(c["chain"]) for c in rows})},
    "recoveriesEarlierInBattle": {str(k): v for k, v in sorted(rec.items())},
    "recoveredByEarlierInBattle": dict(sorted(recBy.items())),
    "units": sorted(({"unit": u, "excluded": excluded(u), "firstCommands": first[u][0], "firstFrames": first[u][1],
                      "involvedCommands": v[0], "involvedFrames": v[1], "soloCommands": solo[u][0], "soloFrames": solo[u][1]}
                     for u, v in inv.items()), key=lambda r: (-r["firstFrames"], -r["involvedFrames"], r["unit"])),
    "greedyNonExcluded": greedy(pool),
    "greedyAll": greedy(list(inv), 25),
    **({"cleared": sorted(cleared), "predictedUnlockCommands": len(pred), "predictedUnlockFrames": sum(fb(c) for c in pred)} if cleared else {}),
    **({"measured": measured} if measured else {}),
}
open(out, "w").write(json.dumps(result, indent=1) + "\n")
print(f'{len(rows)} declines / {total} frames; chain lengths {result["chainLength"]}')
if cleared:
    print(f'predicted unlock for {len(cleared)} cleared units: {len(pred)} commands / {result["predictedUnlockFrames"]} frames')
if measured:
    print("measured: predicted&live %s, predicted&not-live %s, not-predicted&live %s" % (measured["predictedLiveMeasuredLive"], measured["predictedLiveMeasuredNotLive"], measured["notPredictedMeasuredLive"]))
print("greedy (non-excluded):")
for g in result["greedyNonExcluded"][:30]:
    print(f'  +{g["add"]:<55} gain {g["gainFrames"]:>6} -> {g["cumulativeCommands"]:>4} cmds / {g["cumulativeFrames"]:>6} frames')
print("first-unit ranking:")
for r in result["units"][:30]:
    print(f'  first {r["firstFrames"]:>6} / {r["firstCommands"]:>3}  inv {r["involvedFrames"]:>6} / {r["involvedCommands"]:>3}  solo {r["soloFrames"]:>5}  {r["unit"]}{"  [" + r["excluded"] + "]" if r["excluded"] else ""}')
