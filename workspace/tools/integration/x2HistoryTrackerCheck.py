#!/usr/bin/env python3
"""x2-history #148: replay check of the proposed tracker over the ROM bodies.
Rule: per battler state idle|zeroed.  First body / new species on the battler (send-in) -> idle (x2 = species rest: 1 for ONIX and RATTATA, else 0; y2 = 0).  After a body, for each role
(attacker, target) the move's table class (fixtures/x2-history/move-end-state-x2-onix-pairs.json) 'zeroed' -> zeroed; 'unchanged'/'transient' -> keep; unknown/mixed -> keep (counted as 'unclassified').
Prediction at each later body's activation: x2 = rest if idle else 0.  Compared with the ROM x2 at the activation frame of EVERY body of the 395 original ONIX-paired scenarios (r1) -- the
class table was derived from the ONIX-vs-ONIX copies, so these are different scenario/species contexts.  Also the same check for the faint+send-in scenario receipt.
usage: x2HistoryTrackerCheck.py   -> fixtures/x2-history/tracker-check.json"""
import json, collections
from pathlib import Path
FX = Path("tools/integration/fixtures/x2-history")
tab = json.loads((FX / "move-end-state-x2-onix-pairs.json").read_text())["table"]
bodies = json.loads((FX / "bodies-x2.json").read_text())["scenarios"]
REST = {95: 1, 19: 1}  # ONIX, RATTATA (internal ids: ONIX 95; RATTATA 19 -- verified against species-rest-x2.json by the caller)
def cls(move, role):
    c = tab.get(str(move), {}).get(role, {}).get("x2Class", "unknown")
    return c.split(":")[0]
tot = collections.Counter(); miss = []; per = collections.defaultdict(collections.Counter)
for sc, v in bodies.items():
    st = [None, None]; last_sp = [None, None]
    for i, b in enumerate(v["bodies"]):
        for bt in (0, 1):
            sp = b["species"][bt]
            if last_sp[bt] != sp: st[bt] = "idle"; last_sp[bt] = sp   # first body or a new species on the battler = send-in
        for role in ("attacker", "target"):
            bt = b[role]["battler"]; sp = b["species"][bt]
            pred = REST.get(sp, 0) if st[bt] == "idle" and bt == 1 else 0  # rest x2 is a FRONT-sprite (opponent, battler 1) property; back sprites rest at 0
            rom = b[role]["atStart"][0]
            ok = pred == rom
            kind = "first" if i == 0 else "later"
            tot[(kind, "ok" if ok else "bad")] += 1
            if not ok: miss.append({"scenario": sc, "body": i, "move": b["move"], "role": role, "species": sp, "pred": pred, "rom": rom, "prevMove": v["bodies"][i - 1]["move"] if i else None})
        for role in ("attacker", "target"):
            c = cls(b["move"], role); bt = b[role]["battler"]
            if c == "zeroed": st[bt] = "zeroed"
            elif c in ("unchanged", "transient", "rest0"): pass
            else: tot[("unclassified-" + c, role)] += 1
nonrest = sum(1 for m in miss)
out = {"bodiesChecked": sum(v for k, v in tot.items() if k[0] in ("first", "later")), "counts": {"%s/%s" % k: v for k, v in sorted(tot.items())}, "mismatches": miss[:60], "mismatchCount": nonrest,
       "mismatchByPrevMove": collections.Counter(str(m["prevMove"]) for m in miss).most_common(15)}
(FX / "tracker-check.json").write_text(json.dumps(out, indent=1)); print(json.dumps({k: out[k] for k in ("bodiesChecked", "counts", "mismatchCount", "mismatchByPrevMove")}))
for m in miss[:12]: print(m)
