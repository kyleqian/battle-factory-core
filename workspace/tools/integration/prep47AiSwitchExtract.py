#!/usr/bin/env python3
"""prep47 (C): AI-switch probe rows (prep47AiSwitchProbe.py) -> the recall + send-in span (pure python3, no mGBA).

usage (from workspace/): prep47AiSwitchExtract.py <out-dir> <ai-switch-units.json>
Span = from the first gAnimScriptActive rising edge with sAnimMoveIndex 0 (the switch-out special animation) up to the next rising
edge (the next move body). Per job: identicalAB, sha256 of run A's rows, F0 at the span's first frame, every allocation window
{f, C, D, F}, the next body's move and first-frame free order, and the span's plan text in the production encoding
(prep43Extract.plan_text: n-index = k-th sprite created in the span, o<slot> = an occupant that predates it).
"""
import hashlib, json, sys
from pathlib import Path

sys.path.insert(0, "tools/integration")
import spriteOrderBodyPlans as P
import prep43Extract as X
import prep47AiSwitchProbe as J

if __name__ == "__main__":
    out = Path(sys.argv[1])
    result = {"schema": "prep47-ai-switch-units/v1", "jobs": {}}
    for cls, job, player, opponent in J.JOBS:
        a, b = out / "raw" / f"{job}-A.json", out / "raw" / f"{job}-B.json"
        if not a.exists():
            continue
        _, W = P.windows(a)
        edges = [i for i, w in enumerate(W) if w["act"] and (i == 0 or not W[i - 1]["act"])]
        rec = next((i for i in edges if W[i]["mv"] == 0), None)
        nxt = next((i for i in edges if rec is not None and i > rec), None)
        entry = {"class": cls, "player": list(player), "opponent": list(opponent), "identicalAB": b.exists() and a.read_bytes() == b.read_bytes(),
                 "rowsSha256A": hashlib.sha256(json.dumps(json.loads(a.read_text())["rows"], separators=(",", ":")).encode()).hexdigest(),
                 "recallFrame": None}
        if rec is not None and nxt is not None:
            wins = [{"f": w["n"], "C": [[s, m] for s, m in P.create_modes(w["pmask"], w["C"])], "D": w["D"], "F": w["obsF"]}
                    for w in W[rec:nxt] if w["C"] or w["D"]]
            text, survivors = X.plan_text(wins)
            entry.update(recallFrame=W[rec]["n"], F0=W[rec]["F"], windows=wins, plan=text, survivorSlots=survivors,
                         nextBodyMove=W[nxt]["mv"], nextBodyFrame=W[nxt]["n"], nextBodyF0=W[nxt]["F"])
        result["jobs"][job] = entry
    Path(sys.argv[2]).write_text(json.dumps(result, separators=(",", ":"), sort_keys=True) + "\n")
    print(len(result["jobs"]), "jobs;", sum(not j["identicalAB"] for j in result["jobs"].values()), "A/B differ;",
          len({j.get("plan") for j in result["jobs"].values()}), "distinct span plans")
