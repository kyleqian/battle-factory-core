#!/usr/bin/env python3
"""prep64: SUBSTITUTE_FADE allocator verdict from prep64Probes.py --netzero (aud56Extract.py's rule, keyed by script label).

usage (from workspace/): prep64NetZero.py <probe-out-dir> <netzero.json>
Every job's two fresh runs must be byte-identical (A == B); only A is read. Intervals with sAnimMoveIndex 0 and script label
General_SubstituteFade are the instances. Verdict per Battle Scene profile (docs/allocator-net-zero-audit.md definition, as in
aud56Extract.py): NET-ZERO = >= 1 complete instance per side from aud56's known entry, and EVERY complete instance has baseline == end,
created == destroyed, no unowned late change (8 frames after cleanup; owned only by the next animation script or the healthbox hit
effect), and tiles / palette tags / matrices equal at baseline and end.
"""
import hashlib, json, sys
from pathlib import Path

sys.path.insert(0, "tools/integration")
import prep64Probes as J

KNOWN_ENTRY = [0, 1, 2, 6, 8, 60, 61, 62, 63]  # aud56Extract.KNOWN_ENTRY
HIT = ["sInvisibleSpriteTemplate", "SpriteCB_HitAnimHealthoxEffect"]
LABEL = "General_SubstituteFade"


def late_owner(change, later_starts):
    if any(s <= change["frame"] for s in later_starts):
        return "next action: next animation script"
    if change["added"] and all(v == HIT for v in change["added"].values()) and not change["removed"]:
        return "next action: healthbox hit effect"
    return "unowned"


out, dest = Path(sys.argv[1]), Path(sys.argv[2])
rows, scen = {}, []
for ident, profile, base, ops in J.JOBS:
    a, b = out / "raw-nz" / f"{ident}-A.json", out / "raw-nz" / f"{ident}-B.json"
    if not a.exists():
        continue
    same = b.exists() and a.read_bytes() == b.read_bytes()
    sc = json.loads((out / "scenarios" / f"{ident}.json").read_text())
    species = {side: sc["overrides"]["parties"][side][0]["species"] for side in ("player", "opponent")}
    scen.append({"job": ident, "profile": profile, "base": base, "ops": [list(o) for o in ops], "seed": sc["seed"], "leads": species,
                 "identicalAB": same, "rawSha256": hashlib.sha256(a.read_bytes()).hexdigest()})
    if not same:
        continue
    r = json.loads(a.read_text())
    starts = [x["activation"] for x in r["bodies"]]
    for x in r["bodies"]:
        if x["moveIndex"] != 0 or x["script"] != LABEL:
            continue
        side = "player" if x["attacker"] in (0, 2) else "opponent"
        row = {"job": ident, "activation": x["activation"], "side": side, "species": species[side]}
        if "error" in x:
            row["incomplete"] = x["error"]
        else:
            later = [s for s in starts if s > x["activation"]]
            late = [{"frame": c["frame"], "owner": late_owner(c, later)} for c in x["lateChanges"]]
            row.update({"cleanup": x["cleanup"], "baseline": x["baseline"], "end": x["end"], "created": x["created"], "destroyed": x["destroyed"],
                        "survivors": x["survivors"], "freed": x["freed"], "late": late, "gfx": x["gfx"], "gfxNetZero": x["gfxNetZero"],
                        "netZero": x["baseline"] == x["end"] and x["created"] == x["destroyed"] and x["gfxNetZero"]
                        and all(c["owner"] != "unowned" for c in late)})
        rows.setdefault(profile, []).append(row)

verdicts = {}
for profile, inst in sorted(rows.items()):
    complete = [r for r in inst if "incomplete" not in r]
    known = {s: sum(1 for r in complete if r["side"] == s and r["baseline"] == KNOWN_ENTRY) for s in ("player", "opponent")}
    bad = [r for r in complete if not r["netZero"]]
    verdict = ("NOT REACHED" if not complete else "NOT NET-ZERO" if bad else "NET-ZERO" if known["player"] and known["opponent"]
               else f"NET-ZERO ({'player' if known['player'] else 'opponent'} battler only)")
    verdicts[profile] = {"unit": "SUBSTITUTE_FADE", "key": LABEL, "verdict": verdict, "completeInstances": len(complete),
                         "incompleteInstances": len(inst) - len(complete), "fromKnownEntry": known,
                         "species": sorted({r["species"] for r in complete}), "createdPerInstance": sorted({r["created"] for r in complete}),
                         "lateOwners": sorted({c["owner"] for r in complete for c in r["late"]}), "notNetZero": bad, "instances": inst}
receipt = {"schema": "prep64-net-zero/v1", "knownEntry": KNOWN_ENTRY, "jobs": len(scen), "runs": 2 * len(scen),
           "allIdenticalAB": all(s["identicalAB"] for s in scen),
           "probeSha256": hashlib.sha256(Path("tools/integration/prep64NetZeroProbe.py").read_bytes()).hexdigest(),
           "verdicts": verdicts, "scenarios": scen}
dest.parent.mkdir(parents=True, exist_ok=True)
dest.write_text(json.dumps(receipt, indent=1) + "\n")
for profile, v in verdicts.items():
    print(f'{profile:16} {v["verdict"]:<12} n={v["completeInstances"]} (+{v["incompleteInstances"]} incomplete) known-entry ply/opp='
          f'{v["fromKnownEntry"]["player"]}/{v["fromKnownEntry"]["opponent"]} species={v["species"]} created={v["createdPerInstance"]} late={v["lateOwners"]}')
print("jobs", len(scen), "A==B all:", receipt["allIdenticalAB"])
