#!/usr/bin/env python3
"""speciesAudit8: Endeavor needs attacker HP < target HP. For staged Endeavor ATTACKER swaps, give the (unswapped) target party[0] 252 HP EVs
and write <tag>H-<stem> scenarios + list rows (stdout, same format as the stage lists). usage: speciesAudit8EndeavorHp.py W list.tsv..."""
import json, sys, os
W = sys.argv[1]
for lf in sys.argv[2:]:
    for l in open(lf):
        k, orig, sw, tside = l.rstrip("\n").split("\t")
        if "endeavor" not in k or not k.split("-")[0].endswith("A") or k.startswith("shiny"): continue
        sc = json.load(open(sw)); side = "player" if tside == "opponent" else "opponent"  # attacker swapped on tside; target mon is on the other side
        p = sc["overrides"]["parties"][side][0]; ev = p.setdefault("evs", {e: 0 for e in ("hp", "attack", "defense", "speed", "spAttack", "spDefense")})
        ev["hp"] = 252
        for stat in ("attack", "spAttack", "defense", "spDefense", "speed"): ev[stat] = max(0, ev[stat] - max(0, sum(ev.values()) - 510))
        k2 = k.replace("A-", "AH-", 1); out = f"{W}/scenarios/{k2}.json"
        json.dump(sc, open(out, "w"), separators=(",", ":")); open(out, "a").write("\n"); print(f"{k2}\t{orig}\t{out}\t{tside}")
