#!/usr/bin/env python3
"""prep18: BG/IO-register, scroll, software-matrix and scanline-effect state at each body's activation (prep18Probe.py outputs, default /tmp/p18c/r1),
compared across accepted player / accepted opponent / fresh alternate species, per move and body, and against the prep16 first-body constant S0.
usage: prep18Activation.py [probe-dir] [out-json]"""
import hashlib, json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
D = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/p18c/r1")
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else ROOT / "tools/integration/fixtures/prep18/prep18-activation.json")
MOVES = {91: "DIG", 224: "MEGAHORN", 261: "WILL_O_WISP", 210: "FURY_CUTTER", 216: "RETURN", 228: "PURSUIT"}
S0 = {"dispcnt": 0xbf40, "bg0": 0x9800, "bg1": 0x9c00, "bg2": 0x5e00, "bg3": 0x5a0b}
IDENT = [256, 0, 0, 256]
def h(x): return hashlib.sha1(json.dumps(x).encode()).hexdigest()[:10]
def sig(a):
    sc = a["scan"]; banks = sc["banks"]
    nz = [sum(1 for v in b if v) for b in banks]
    return {"regs": a["regs"], "bgXY": a["bgXY"], "hwScroll": a["hwScroll"], "nonIdentityMatrices": [i for i, m in enumerate(a["swMatrices"]) if m != IDENT], "bitmap": a["bitmap"],
            "scan": {"srcBuffer": sc["srcBuffer"], "state": sc["state"], "dmaDest": sc["dmaDest"], "dmaControl": sc["dmaControl"], "waveTaskId": sc["waveTaskId"], "nonzero": nz, "sha1": [h(b) for b in banks]},
            "firstBodyS0": all(a["regs"][k] == v for k, v in S0.items())}
res = {}
for f in sorted(D.glob("*.json")):
    j = json.loads(f.read_text())
    for bi, b in enumerate(x for x in j["bodies"] if x["move"] in MOVES):
        res.setdefault(f.stem, []).append({"move": MOVES[b["move"]], "bodyIndex": bi, "start": b["start"], **sig(b["atActivation"])})
OUT.write_text(json.dumps(res, indent=1))
# cross-scenario equality per (move family, body index)
import re
fam = {}
for key, rows in res.items():
    m = re.match(r"mechanic-(.*?)-(player|opponent)-", key)
    side, variant = (m.group(2), m.group(1)) if m else ("altopp" if "-altopp-" in key else "alt", re.match(r"prep18-(.*?)-alt(?:opp)?-", key).group(1))
    for r in rows:
        fam.setdefault((variant, r["bodyIndex"]), {})[side] = r
summary = {}
for (variant, bi), d in sorted(fam.items()):
    p = d.get("player")
    ob = d.get("opponent")
    out = {}
    for s, r in d.items():
        out[s] = {"S0": r["firstBodyS0"], "dispcnt/bgcnt": [hex(r["regs"][k]) for k in ("dispcnt", "bg0", "bg1", "bg2", "bg3")], "bld": [r["regs"][k] for k in ("bldcnt", "bldalpha", "bldy")], "bgXY": r["bgXY"], "hw": r["hwScroll"],
                  "nonIdM": r["nonIdentityMatrices"], "scan": (r["scan"]["srcBuffer"], r["scan"]["state"], r["scan"]["nonzero"], r["scan"]["sha1"])}
    same = lambda r, q: r["regs"] == q["regs"] and r["bgXY"] == q["bgXY"] and r["hwScroll"] == q["hwScroll"] and r["nonIdentityMatrices"] == q["nonIdentityMatrices"] and r["scan"] == q["scan"]
    eq = {s: same(r, ob if s == "altopp" else p) for s, r in d.items() if s != "player"}  # altopp is compared with the accepted OPPONENT scenario
    summary[f"{variant}#body{bi}"] = {"equalToAcceptedSameSide": eq, "bySide": out}
    print(variant, f"body{bi}", "equalToAcceptedSameSide", eq)
    for s, o in out.items(): print("   ", s, json.dumps(o))

OUT.with_name("prep18-activation-summary.json").write_text(json.dumps(summary, indent=1))
