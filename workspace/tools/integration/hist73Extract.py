#!/usr/bin/env python3
"""hist73: allocator net-zero receipt from hist73Probe.py raw runs (a copy of prep52Extract.py; docs/next-adapters-hist73.md).

usage: hist73Extract.py <out-dir> <receipt.json>
Per unit (hist73Probe.UNITS; key = move id -> bodies with sAnimMoveIndex == id, or script label -> bodies whose script is the
label and sAnimMoveIndex == 0), per scenario: runs A and B must be byte-identical (else the row is "A != B" and not used). Body
classes: complete (activation and cleanup inside the trace) or incomplete (listed, excluded). Late changes (occupied-set changes in
the 8 frames after cleanup) are attributed: "next action: healthbox hit effect" (sInvisibleSpriteTemplate +
SpriteCB_HitAnimHealthoxEffect, Cmd_hitanimation's DoHitAnimHealthboxEffect after a damaging body -- not the body's own sprite,
docs/allocator-net-zero-audit.md "Late changes"), "next action: next animation script" (a later interval is active by that
frame), else "unowned". Verdict:
  NET-ZERO      every complete body has baseline == end and created == destroyed with no unowned late change, at least one
                complete body per side (gBattleAnimAttacker 0 / 1) starts from the known entry [0,1,2,6,8,60,61,62,63], and every
                scenario pair is identical;
  KNOWN-DELTA   end != baseline but the surviving / freed slots (template, callback) are the same in every complete body;
  NOT NET-ZERO  otherwise;  NOT REACHED  no complete body.
"""
import hashlib, json, sys
from pathlib import Path

sys.path.insert(0, "tools/integration")
import hist73Probe as P

KNOWN = [0, 1, 2, 6, 8, 60, 61, 62, 63]
HIT = ["sInvisibleSpriteTemplate", "SpriteCB_HitAnimHealthoxEffect"]
out, receipt = Path(sys.argv[1]), Path(sys.argv[2])


def late_owner(change, later_starts):
    if any(s <= change["frame"] for s in later_starts):
        return "next action: next animation script"
    if change["added"] and all(v == HIT for v in change["added"].values()) and not change["removed"]:
        return "next action: healthbox hit effect"
    return "unowned"


units, summary = [], {}
for unit in P.unique_units():
    name, key = unit[0], unit[1]
    rows, bodies_all = [], []
    for ident, base, variant in P.jobs_of(unit):
        a, b = (out / "raw" / f"{ident}-{r}.json" for r in "AB")
        if not a.is_file() or not b.is_file():
            rows.append({"scenario": ident, "base": base, "variant": variant, "status": "missing"}); continue
        ra, rb = a.read_bytes(), b.read_bytes()
        row = {"scenario": ident, "base": base, "variant": variant, "sha256": hashlib.sha256(ra).hexdigest()[:16],
               "identicalAB": ra == rb}
        raw = json.loads(ra)
        starts = [x["activation"] for x in raw["bodies"]]
        sel = [x for x in raw["bodies"] if (x["moveIndex"] == key if isinstance(key, int) else x["script"] == key and x["moveIndex"] == 0)]
        row["bodies"] = []
        for x in sel:
            if "error" in x:
                row["bodies"].append({"activation": x["activation"], "attacker": x["attacker"], "script": x["script"], "excluded": x["error"]}); continue
            later = [s for s in starts if s > x["activation"]]
            late = [{"frame": c["frame"], "added": c["added"], "removed": c["removed"], "owner": late_owner(c, later)} for c in x["lateChanges"]]
            body = {"activation": x["activation"], "cleanup": x["cleanup"], "script": x["script"], "attacker": x["attacker"],
                    "baseline": x["baseline"], "end": x["end"], "created": x["created"], "destroyed": x["destroyed"],
                    "survivors": x["survivors"], "freed": x["freed"], "late": late,
                    "netZero": x["baseline"] == x["end"] and x["created"] == x["destroyed"] and all(c["owner"] != "unowned" for c in late)}
            row["bodies"].append(body)
            if row["identicalAB"]:
                bodies_all.append(body)
        rows.append(row)
    complete = bodies_all
    sides = {s: sum(1 for x in complete if x["attacker"] == s and x["baseline"] == KNOWN) for s in (0, 1)}
    identical = all(r.get("identicalAB") for r in rows)
    if not complete:
        verdict = "NOT REACHED"
    elif all(x["netZero"] for x in complete) and identical and sides[0] and sides[1]:
        verdict = "NET-ZERO"
    elif all(x["netZero"] for x in complete):
        verdict = "NET-ZERO (one side only)" if identical else "NET-ZERO (A != B somewhere)"
    elif len({json.dumps([x["survivors"], x["freed"]]) for x in complete}) == 1 and any(x["end"] != x["baseline"] for x in complete):
        verdict = "KNOWN-DELTA"
    else:
        verdict = "NOT NET-ZERO"
    summary.setdefault(verdict, []).append(name)
    units.append({"unit": name, "key": key, "verdict": verdict, "completeBodies": len(complete),
                  "bodiesFromKnownEntry": {"player": sides[0], "opponent": sides[1]},
                  "createdPerBody": sorted({x["created"] for x in complete}),
                  "lateOwners": sorted({c["owner"] for x in complete for c in x["late"]}), "rows": rows})
doc = {"schema": "hist73-net-zero-audit/v1", "knownEntry": KNOWN,
       "probeSha256": hashlib.sha256(Path("tools/integration/prep52NetZeroProbe.py").read_bytes()).hexdigest()[:16],
       "summary": summary, "units": units}
receipt.parent.mkdir(parents=True, exist_ok=True)
receipt.write_text(json.dumps(doc, indent=1) + "\n")
for u in units:
    print(f'{u["verdict"]:<26} {u["unit"]:<18} key={u["key"]!s:<24} bodies={u["completeBodies"]:>2} known-entry ply/opp={u["bodiesFromKnownEntry"]["player"]}/{u["bodiesFromKnownEntry"]["opponent"]} created={u["createdPerBody"]} late={u["lateOwners"]}')
