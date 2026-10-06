#!/usr/bin/env python3
"""x2-history #148: faint + send-in receipt.  usage: x2HistoryFaintSendIn.py <rawRun1.json> <rawRun2.json>  (prep11Probe.py PREP11_ALWAYS=1 raw of fixtures/x2-history/scenarios/x2h-faint-sendin-onix.json, two fresh runs)
Rule prediction vs ROM x2 of the opponent battler (battler 1) at every body activation; the new species after the faint (PIDGEY -> ONIX) re-establishes idle (x2 = 1)."""
import json, sys
from pathlib import Path
a, b = (Path(p).read_bytes() for p in sys.argv[1:3]); d = json.loads(a)
ser = {r[0]: r for r in d["battlerSeries"]}
tab = json.loads(Path("tools/integration/fixtures/x2-history/move-end-state-x2-onix-pairs.json").read_text())["table"]
st, last, rows = "idle", None, []
for i, bd in enumerate(d["bodies"]):
    at = bd["atActivation"]; sp = at["mons"][1]["species"]
    if sp != last: st, last = "idle", sp
    pred = (1 if sp in (95, 19) else 0) if st == "idle" else 0
    role = "attacker" if at["attacker"] == 1 else "target"
    rows.append({"move": bd["move"], "start": bd["start"], "end": bd["end"], "opponentSpecies": sp, "oppRole": role, "predictedX2": pred, "romX2AtActivation": ser[bd["start"]][9], "romX2AtEnd1": ser[bd["end"] + 1][9], "match": pred == ser[bd["start"]][9]})
    if tab.get(str(bd["move"]), {}).get(role, {}).get("x2Class", "").startswith("zeroed"): st = "zeroed"
ev = [e for e in d["speciesEvents"]]
out = {"scenario": d["scenario"], "r1EqualsR2": a == b, "speciesEvents[frame,[sp0,sp1,idx0,idx1],move,anim,spriteIds]": ev, "bodies": rows, "allMatch": all(r["match"] for r in rows)}
Path("tools/integration/fixtures/x2-history/faint-sendin-receipt.json").write_text(json.dumps(out, indent=1)); print(json.dumps(out)[:1200])
