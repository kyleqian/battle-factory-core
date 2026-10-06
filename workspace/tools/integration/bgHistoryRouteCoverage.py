#!/usr/bin/env python3
"""BG-register history: coverage of the field-delta rule over ordinary generated routes.  usage: bgHistoryRouteCoverage.py PROBE_DIR ROUTE_BODIES_JSON OUT_JSON
Rule = bgHistoryAnalyze.build_effects over all lab bodies (move, attacker side) keys; a route body is 'rule-known' when every EARLIER move body of the route has a table key whose fields are all keep/set
(no mixed, no map on a field the chain cannot supply) AND the route has no stat/status body between (those are not move-animation commands: counted as caveat, not modelled).  Whole route treated as one battle."""
import json, sys, glob, collections, subprocess
from pathlib import Path
me = json.loads(subprocess.run([sys.executable, str(Path(__file__).parent / "bgHistoryAnalyze.py"), sys.argv[1], "/tmp/bgh/_ana"], capture_output=True, text=True).stdout and Path("/tmp/bgh/_ana/move-effects.json").read_text())
rows = me["rows"]
def known(move, side):
    ks = [v for k, v in rows.items() if v["move"] == move and v["side"] == side and not v["statKey"]]
    if not ks: return "absent"
    return "known" if all(v["class"] in ("unchanged", "sets-fixed(+keeps)") for v in ks) else "context-dependent"
rb = json.load(open(sys.argv[2]))["routes"]
C = collections.Counter(); cons = []; unknownMoves = collections.Counter()
for r in rb:
    prior = []
    for i, b in enumerate(r["bodies"]):
        k = known(b["moveId"], b["attacker"])
        if i == 0: C["firstBodies"] += 1
        else:
            C["laterBodies"] += 1; ok = all(p == "known" for p in prior)
            C["laterChainKnown" if ok else "laterChainUnknown"] += 1
            if b["live"]: C["laterLive"] += 1; C["laterLiveChainKnown"] += ok
        if b["moveId"] in (315, 318, 244): cons.append({"seed": r["seed"], "i": i, "move": b["moveId"], "side": b["attacker"], "live": b["live"], "priorMoves": [(p["moveId"], p["attacker"]) for p in r["bodies"][:i]], "chainKnown": all(p == "known" for p in prior)})
        if k != "known": unknownMoves[(b["moveId"], b["attacker"], k)] += 1
        prior.append(k)
    C["routes"] += 1; C["errors"] += bool(r.get("error"))
out = {"counts": dict(C), "consumerBodies": cons, "nonKnownMoveKeys": {f"{a}/{b}/{c}": n for (a, b, c), n in unknownMoves.most_common()}}
Path(sys.argv[3]).write_text(json.dumps(out, indent=0, separators=(",", ":")))
print(out["counts"]); print(len(cons), "consumer bodies"); print(json.dumps(cons)[:1500]); print(list(out["nonKnownMoveKeys"].items())[:25])
