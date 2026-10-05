#!/usr/bin/env python3
"""prep9: allocator profile derived from the ROM spawn logs (fixtures/prep9-probes/<run>/*.json) vs the accepted literals, per scenario.
usage (workspace root): python3 tools/integration/prep9Allocator.py [run=r1] > tools/integration/fixtures/prep9-allocator.json
Per scenario: slots (spawn order = frame, slot ascending; first-free allocation) of hitsplat / orbs / stars / paletteController (gSimplePaletteBlend sprites) / sunlight rays / task slots,
the baseline occupied sprite slots at activation, and the sSpriteOrder at activation restricted to the move's slot set (= the accepted `orderSeed` shape).
Template names come from the ROM ELF symbol table (arm-none-eabi-nm).  Accepted literals are parsed from tools/compare/{giga,mega}DrainFramebuffer.ts / dreamEaterFramebuffer.ts / sunnyDayActualCore.ts."""
import json, glob, subprocess, bisect, sys, re
from pathlib import Path
RUN = sys.argv[1] if len(sys.argv) > 1 else "r1"
FX = Path("tools/integration/fixtures")
nm = subprocess.run(["arm-none-eabi-nm", "-n", "reference/pokeemerald/pokeemerald.elf"], capture_output=True, text=True).stdout.split("\n")
syms = sorted((int(p[0], 16), p[2]) for p in (l.split() for l in nm) if len(p) == 3); addrs = [a for a, _ in syms]
def name(a):
    i = bisect.bisect_right(addrs, a) - 1; return syms[i][1] if i >= 0 and a - addrs[i] < 0x80 else None
KIND = {"gBasicHitSplatSpriteTemplate": "hitsplat", "gAbsorptionOrbSpriteTemplate": "orbs", "gHealingBlueStarSpriteTemplate": "stars", "gSimplePaletteBlendSpriteTemplate": "paletteController",
        "gSunlightRaySpriteTemplate": "rays", "sInvisibleSpriteTemplate": "monbgInvisible"}
def lit(path, key, as_json=True):
    t = Path(path).read_text(); m = re.search(key + r":\s*(\[[^\]]*\]|\d+)", t); return json.loads(m.group(1)) if m else None
ACC = {}
for mv, f in ((202, "tools/compare/gigaDrainFramebuffer.ts"), (72, "tools/compare/megaDrainFramebuffer.ts"), (138, "tools/compare/dreamEaterFramebuffer.ts")):
    ACC[mv] = {k: lit(f, k) for k in ("hitsplat", "orbs", "stars", "paletteController", "orderSeed")}
ACC[71] = {**json.load(open("tools/compare/fixtures/absorb-player-lombre-opponent-onix.json"))["allocatorProfile"], "orderSeed": None}
out = {"run": RUN, "acceptedLiterals": ACC, "scenarios": {}}
for f in sorted(glob.glob(str(FX / f"prep9-probes/{RUN}/*.json"))):
    d = json.load(open(f)); n = Path(f).stem
    if d["activation"] is None: out["scenarios"][n] = {"activation": None}; continue
    a = d["activation"]; r = {"move": d["move"], "activation": a, "end": d["end"], "bodyFrames": d["end"] - a}
    sp = sorted([s for s in d["spawns"] if s["kind"] == "sprite+" and s["f"] > a], key=lambda s: (s["f"], s["slot"]))
    for s in sp:
        k = KIND.get(name(s["tmpl"]), name(s["tmpl"])); r.setdefault(k, []).append(s["slot"])
        r.setdefault("ages", {}).setdefault(k, []).append(s["f"] - a)
    tk = sorted([s for s in d["spawns"] if s["kind"] == "task+" and s["f"] > a], key=lambda s: (s["f"], s["slot"]))
    r["tasks"] = [{"age": s["f"] - a, "slot": s["slot"], "func": name(s["func"])} for s in tk]
    act = d["snapshots"]["act"]; r["baselineOccupied"] = sorted(map(int, act["sprites"].keys())); r["baselineTasks"] = {k: name(v["func"]) for k, v in act["tasks"].items()}
    used = sorted(set(sum([r.get(k, []) for k in ("hitsplat", "orbs", "stars")], [])))
    r["slotSet"] = used; r["orderAtActivationRestricted"] = [s for s in act["spriteOrder"] if s in used]; r["spriteOrderAtActivation"] = act["spriteOrder"]
    out["scenarios"][n] = r
# accepted-literal equality for the accepted scenarios
for n, r in out["scenarios"].items():
    if r.get("activation") is None or not n.endswith("-accepted") or r["move"] not in ACC: continue
    A = ACC[r["move"]]; r["vsAccepted"] = {k: {"accepted": A[k], "rom": (r.get(k) if k in ("orbs", "stars") else (r.get(k) or [None])[0] if k != "orderSeed" else (r["orderAtActivationRestricted"] if A[k] is not None else None)), } for k in A}
    for k, v in r["vsAccepted"].items(): v["equal"] = v["accepted"] == v["rom"]
# cross-scenario constancy per move
by = {}
for n, r in out["scenarios"].items():
    if r.get("activation") is None: continue
    by.setdefault(r["move"], []).append((n, r))
out["constancy"] = {}
for mv, rows in by.items():
    c = {}
    for k in ("hitsplat", "orbs", "stars", "paletteController", "rays", "baselineOccupied", "orderAtActivationRestricted", "tasks"):
        vals = {json.dumps([{kk: vv for kk, vv in t.items() if kk != "age"} for t in r[k]] if k == "tasks" else r.get(k)) for _, r in rows}; c[k] = {"distinct": len(vals), "scenarios": len(rows)}
    c["ages"] = len({json.dumps(r.get("ages")) for _, r in rows}); out["constancy"][mv] = c
print(json.dumps(out, indent=1))
