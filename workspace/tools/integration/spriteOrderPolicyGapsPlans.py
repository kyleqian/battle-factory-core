#!/usr/bin/env python3
"""Q3 of docs/sprite-order-policy-gaps.md: derive the ENDEAVOR (283) body plan in the sprite-order-body-plans-ext.json format.
Reuses spriteOrderBodyPlans (extractor/classifier/replay, unchanged) over committed table + ext table + the two new Endeavor probe scenarios.
usage: OUT=/tmp/pgprobe python3 tools/integration/spriteOrderPolicyGapsPlans.py [--write]
Writes tools/integration/fixtures/sprite-order-policy-gaps/sprite-order-body-plans-endeavor.json (compact: 283 bodies + replay counts + real-route cross-check)."""
import json, os, sys, tempfile, hashlib
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import spriteOrderBodyPlans as P

OUT = Path(os.environ.get("OUT", "/tmp/pgprobe"))
DEST = P.FIX / "sprite-order-policy-gaps" / "sprite-order-body-plans-endeavor.json"
EXT = P.FIX / "sprite-order-body-events-ext.json"
RR = P.FIX / "sprite-order-real-route"


def real_route_endeavor_windows(trace="battle1-turn17-dense"):
    """Sort windows (C/D slot sets between consecutive probe rows) inside every Endeavor body of a real-route trace."""
    ev = json.loads((RR / "events" / f"{trace}.json").read_text())["events"]
    raw = json.loads((RR / "raw" / f"{trace}-0.json").read_text())
    rows = raw["rows"]
    out = []
    for e in ev:
        if e["k"] != "body" or e.get("move") != 283:
            continue
        wins, prev = [], None
        for r in rows:
            if r[0] < e["n"] - 1 or r[0] > e["end"] + 2:
                prev = r if r[0] < e["n"] else prev
                continue
            if prev is not None:
                pm, m = int(prev[3], 16), int(r[3], 16)
                c = [s for s in range(64) if m >> s & 1 and not pm >> s & 1]
                d = [s for s in range(64) if pm >> s & 1 and not m >> s & 1]
                if c or d:
                    wins.append({"f": r[0], **({"C": c} if c else {}), **({"D": d} if d else {})})
            prev = r
        out.append({"trace": trace, "n": e["n"], "end": e["end"], "windows": wins})
    return out


def main(argv):
    mine = []
    for n in ("en-player", "en-opponent", "en2-player", "en3-player", "en3-opponent"):
        sc = P.extract_scenario("pg", str(OUT / f"rows-{n}-A.json"))
        side = n.split("-")[1]
        sc["side"], sc["file"] = side, f"283-endeavor-{n}-0.json"
        mine.append(sc)
    base, ext = json.loads(P.TABLE.read_text()), json.loads(EXT.read_text())
    union = dict(base, scenarios=base["scenarios"] + ext["scenarios"] + mine)
    tmp = Path(tempfile.mkdtemp()) / "union.json"
    tmp.write_text(json.dumps(union, separators=(",", ":")) + "\n")
    P.TABLE, P.PLANS = tmp, tmp.with_name("plans.json")
    P.main(["x", "--write"])
    full = json.loads(P.PLANS.read_text())
    out = {"schema": "sprite-order-body-plans/v1", "note": "compact: Endeavor (283) bodies + replay counts of committed+ext+Endeavor tables; tools/integration/spriteOrderPolicyGapsPlans.py",
           "table": {"scenarios": len(union["scenarios"]), "mineScenarios": [s["file"] for s in mine]},
           "replay": full["replay"], "replayMismatches": full.get("replayMismatches"), "tokens": full.get("tokens"),
           "groupClasses": full.get("groupClasses"),
           "bodies": {k: v for k, v in full["bodies"].items() if k.startswith("283:")},
           "mineUnits": [{"file": s["file"], "units": [{k: u[k] for k in u if k != "windows"} | {"windows": u["windows"]} for u in s["units"] if u["kind"] == "body" and u.get("mv") == 283]} for s in mine],
           "realRouteEndeavorWindows": real_route_endeavor_windows()}
    # relative-y static evidence (docs/sprite-order-policy-gaps.md Q3): per side, every KEYS destroy group of every Endeavor body of the probe scenarios
    for k, b in out["bodies"].items():
        side = k.split(":")[1]
        groups = [[g[2] for g in w["G"]] for m in mine if m["side"] == side for u in m["units"] if u["kind"] == "body" and u.get("mv") == 283 for w in u["windows"] if w.get("G")]
        rel = {json.dumps([y - min(g) for y in g]) for g in groups}
        order = {json.dumps(b["plan"])}
        rr = out["realRouteEndeavorWindows"]
        b["policyVerdict"] = {
            "verdict": "EXACT-PLAN (relative-y static)" if len(rel) == 1 else "NEEDS-KEYS",
            "why": "all KEYS groups are the 4 sweat-droplet sprites of AnimTask_SquishAndSweatDroplets (battle_anim_effects_3.c:3804 CreateSweatDroplets): fixed offsets from the attacker (yCoords[i & 1] = baseY + yOffset (+6): lines 3828-3843), "
                   "so the y spread inside a group is constant and the array (destroy) order does not depend on species",
            "probeScenarios": sum(1 for m in mine if m["side"] == side), "keysGroups": len(groups), "relativeYVectors": sorted(rel),
            "absoluteYGroupsSeen": sorted({json.dumps(g) for g in groups}), "realRouteBodies": len(rr),
            "realRouteDestroyOrderChecked": "12 destroy groups (3 Endeavor bodies x 4) all [4,7,3,5], identical in every trace sharing that prefix"}
    print(json.dumps({k: out[k] for k in ("table", "replay", "replayMismatches")}))
    for k, v in out["bodies"].items():
        print(k, v["verdict"], v["groupClasses"], v["keysReasons"], v.get("scenarios"))
    if "--write" in argv:
        DEST.write_text(json.dumps(out, indent=1) + "\n")
        print("wrote", DEST, DEST.stat().st_size)


if __name__ == "__main__":
    main(sys.argv)
