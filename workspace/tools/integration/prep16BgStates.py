#!/usr/bin/env python3
"""prep16: BG-register state machine across bodies.  State = (IO regs 0x00..0x56 minus nothing, gBattle_BG*_X/Y, software matrices sha, bitmap) read at body activation / end+1 / end+30.
Names states S0.. in order of first appearance (S0 = the first-body activation state).  Records the transition table (state at activation, move, attacker side) -> (state at end+30, state at end+1) and tests
that it is functional (deterministic) over every body of every probe scenario (r1).  Also: next-body activation state == previous end+30 state whenever the gap is >= 30 frames.
usage: prep16BgStates.py PROBE_DIR OUT_JSON"""
import hashlib, json, sys, collections
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
D, OUT = Path(sys.argv[1]), Path(sys.argv[2])
NAMES = {"00": "dispcnt", "08": "bg0cnt", "0a": "bg1cnt", "0c": "bg2cnt", "0e": "bg3cnt", "10": "bg0hofs", "12": "bg0vofs", "14": "bg1hofs", "16": "bg1vofs", "18": "bg2hofs", "1a": "bg2vofs", "1c": "bg3hofs", "1e": "bg3vofs",
         "40": "win0h", "42": "win1h", "44": "win0v", "46": "win1v", "48": "winin", "4a": "winout", "4c": "mosaic", "50": "bldcnt", "52": "bldalpha", "54": "bldy"}
MV = {0: "STAT(0)", 14: "SWORDS_DANCE", 33: "TACKLE", 45: "GROWL", 63: "HYPER_BEAM", 94: "PSYCHIC", 150: "SPLASH", 318: "SILVER_WIND", 244: "PSYCH_UP", 315: "OVERHEAT"}
def flat(s):
    d = {NAMES[k]: v for k, v in s["io"].items() if k in NAMES}; d.update({"var:" + k[8:]: v for k, v in s["bgVars"].items()})
    d["matricesSha"] = hashlib.sha1(json.dumps(s["matrices"]).encode()).hexdigest()[:8]; d["bitmap"] = s["bitmap"]; return d
states, ids = [], {}
def sid(s):
    k = json.dumps(s, sort_keys=True)
    if k not in ids: ids[k] = f"S{len(states)}"; states.append(s)
    return ids[k]
trans = collections.defaultdict(set); chain = collections.Counter(); chainExc = []
ref = None; firstBodies = collections.Counter()
for f in sorted(D.glob("prep16-*.json")):
    if f.name.endswith(".log"): continue
    bodies = json.loads(f.read_text())["bodies"]
    for i, b in enumerate(bodies):
        a = sid(flat(b["atActivation"]))
        if ref is None: ref = a
        if i == 0: firstBodies[(a == ref)] += 1
        side = "player" if b["attacker"] == 0 else "opponent"
        e30 = sid(flat(b["atEnd+30"])) if "atEnd+30" in b else None; e1 = sid(flat(b["atEnd+1"])) if "atEnd+1" in b else None
        trans[(a, MV.get(b["move"], b["move"]), side)].add((e1, e30))
        if i:
            p = bodies[i - 1]; gap = b["start"] - p["end"]
            if "atEnd+30" in p and gap >= 30: chain[flat(p["atEnd+30"]) == flat(b["atActivation"])] += 1
            elif gap < 30 and "atEnd+1" in p: chain["gap<30:" + str(flat(p["atEnd+1"]) == flat(b["atActivation"]))] += 1
base = states[0]
res = {"firstBodyState": "S0", "states": {f"S{i}": {k: [base[k], v] for k, v in s.items() if base[k] != v} for i, s in enumerate(states)},
       "transitions": {f"{a} --{m}/{s}-->": sorted(map(str, v)) for (a, m, s), v in sorted(trans.items())},
       "functional": all(len(v) == 1 for v in trans.values()), "nonFunctional": {f"{a} {m}/{s}": sorted(map(str, v)) for (a, m, s), v in trans.items() if len(v) > 1},
       "chain": {str(k): v for k, v in chain.items()}, "distinctStates": len(states), "firstBodyActivationEqualsS0": {str(k): v for k, v in firstBodies.items()}}
OUT.write_text(json.dumps(res, indent=0, separators=(",", ":")))
print("first bodies == S0:", dict(firstBodies)); print("distinct states", len(states), "functional", res["functional"], "chain", res["chain"]); print("nonFunctional:", res["nonFunctional"])
for k, v in res["states"].items(): print(k, json.dumps(v))
for k, v in res["transitions"].items(): print(k, v)
