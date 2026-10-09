#!/usr/bin/env python3
"""prep48 (1): the census commands that decline at the LATER-BODY gates, with their real preceding units (docs/next-adapters-prep48.md).

usage: prep48Gates.py <prep48OrderCensus --commands jsonl> <out.json>
Input: tools/integration/prep48OrderCensus.ts --commands output; every GATED_MOVE_IDS command carries `history` = the battle's unit log
through its own body (the own move-animation token is the last one; checked). Per consumer (move, side, body = Dig setup / unleash by the
10000 branch) and per decline reason: count, frames; the bodies before it (move tokens only), the units since the previous body, and the
Dig-specific shapes (setup: which bodies ran before; unleash: was the setup the battle's first body / which units since the setup).
"""
import json, re, sys
from collections import Counter, defaultdict

src, out = sys.argv[1], sys.argv[2]
cmds = [json.loads(l) for l in open(src) if l.strip()]
BODY = re.compile(r"^B(\d+)([po])$")
def own_token(c):
    return f"B{c['moveId']}{c['side'][0]}"
rows, mismatch = [], 0
for i, c in enumerate(cmds):
    if "history" not in c: continue
    h = c["history"]
    # the own body: the last body token (Dig unleash = 10091)
    last = max((k for k, t in enumerate(h) if BODY.match(t)), default=None)
    tok = h[last] if last is not None else None
    m = BODY.match(tok) if tok else None
    if not m or int(m.group(1)) % 10000 != c["moveId"] or m.group(2) != c["side"][0]: mismatch += 1; continue
    before = h[:last]
    bodies = [t for t in before if BODY.match(t)]
    prev = max((k for k, t in enumerate(before) if BODY.match(t)), default=None)
    since = before[prev + 1:] if prev is not None else before
    unit = "unleash" if int(m.group(1)) >= 10000 else ("setup" if c["moveId"] == 91 else "body")
    r = {"battle": c["battle"], "index": i, "move": c["move"], "moveId": c["moveId"], "side": c["side"], "body": unit,
         "status": c["status"], "frames": c["frames"], "reason": (c["decline"] or {}).get("reason"),
         "bodiesBefore": bodies, "sincePrevBody": since, "prevBody": before[prev] if prev is not None else None,
         "attacker": c["attacker"], "target": c["target"]}
    if unit == "unleash":
        # the matching setup = the last B91<side> before it
        s = max((k for k, t in enumerate(before) if t == f"B91{c['side'][0]}"), default=None)
        r["setupFirstBody"] = s is not None and not any(BODY.match(t) for t in before[:s])
        r["sinceSetup"] = before[s + 1:] if s is not None else None
        r["bodiesBeforeSetup"] = [t for t in before[:s] if BODY.match(t)] if s is not None else None
    rows.append(r)

def agg(sel):
    return {"count": len(sel), "frames": sum(r["frames"] for r in sel)}
LATER = "later-body (order lend not a first body)"
summary = defaultdict(lambda: {"live": {"count": 0, "frames": 0}, "laterBody": {"count": 0, "frames": 0}, "other": Counter()})
for r in rows:
    k = f"{r['moveId']} {r['move']} {r['side']} {r['body']}"
    s = summary[k]
    if r["status"] == "live": s["live"]["count"] += 1; s["live"]["frames"] += r["frames"]
    elif r["reason"] == LATER: s["laterBody"]["count"] += 1; s["laterBody"]["frames"] += r["frames"]
    else: s["other"][r["reason"]] += 1
later = [r for r in rows if r["reason"] == LATER and r["status"] != "live"]
byPrev = defaultdict(Counter)
for r in later:
    byPrev[f"{r['move']} {r['side']} {r['body']}"][r["prevBody"] or "(none)"] += 1
dig_unleash = [r for r in later if r["body"] == "unleash"]
digShapes = Counter((r["side"], "setup first body" if r["setupFirstBody"] else f"setup after {len(r['bodiesBeforeSetup'] or [])} bodies",
                     " ".join(t for t in (r["sinceSetup"] or []) if t not in ("P",))) for r in dig_unleash)
res = {
    "schema": "prep48-gates/v1", "source": src.split("/")[-1], "ownTokenMismatch": mismatch,
    "laterBodyTotal": agg(later),
    "perConsumer": {k: {"live": v["live"], "laterBody": v["laterBody"], "other": dict(v["other"])} for k, v in sorted(summary.items(), key=lambda kv: -kv[1]["laterBody"]["frames"])},
    "laterBodyByPrevBody": {k: dict(v.most_common()) for k, v in byPrev.items()},
    "digUnleashShapes": [{"side": a, "setup": b, "sinceSetup": c, "count": n} for (a, b, c), n in digShapes.most_common()],
    "laterBodyDeclines": [{k: r[k] for k in ("battle", "index", "move", "side", "body", "frames", "attacker", "target", "prevBody", "sincePrevBody")}
                          | ({"bodiesBefore": len(r["bodiesBefore"])}) | ({"setupFirstBody": r["setupFirstBody"], "sinceSetup": r["sinceSetup"]} if r["body"] == "unleash" else {})
                          for r in later],
}
json.dump(res, open(out, "w"), indent=0, separators=(",", ":"))
print(f"later-body declines {res['laterBodyTotal']}; own-token mismatches {mismatch}")
for k, v in res["perConsumer"].items():
    if v["laterBody"]["count"]: print(f"  {k}: later {v['laterBody']}, live {v['live']}, other {v['other']}")
