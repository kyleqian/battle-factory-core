#!/usr/bin/env python3
"""ISSUES #142 shadow rows: activation frames of every move script in a scenario (Scene ON, direct mGBA).
Copy of altSpecies3Activation.py whose carrier patch table covers every poison-fang-scenario probe that substitutes a move
(poisonFangProbe.py:24-65 for 41/44/158/207; superFangProbe.py:36-56 for 162), so the probed run equals the accepted source run.

usage: prep6ActivationTail.py <scenario.json> <output.json> <moveId>
Copy of issue142ActivationProbe.py plus the capture-free tail of fireBlastProbe.py:82-85 (sparse A presses, up to 1200 frames) until moveId has run and ended.
probeMoveId 44 applies poisonFangProbe.py's runtime Meowth/BITE carrier patch (species 41 -> MEOWTH, moves [44]*4)
Detection is allocatorNetZeroProbe.py's: gAnimScriptActive rising edge with sAnimMoveIndex.
Output: {"intervals":[{"move","start","end"}]} (start = first active frame, end = first inactive frame).
"""
import json, os, subprocess, sys
from pathlib import Path
SCEN, OUT = map(Path, sys.argv[1:3]); PMID = None; TAIL_MOVE = int(sys.argv[3])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request
from emerald_core import EmeraldOracle
ref = ROOT / "reference" / "pokeemerald"
raw = json.loads(SCEN.read_text())
PATCH = {  # probeMoveId -> (species, nature, evs, item, player moves, opponent moves) for the species-41 carrier (poisonFangProbe.py / superFangProbe.py)
    41: (15, 3, dict(hp=0, attack=255, defense=0, speed=255, spAttack=0, spDefense=0), 198, [41] * 4, [41] * 4),
    44: (52, 24, dict(hp=255, attack=255, defense=0, speed=0, spAttack=0, spDefense=0), None, [44] * 4, [44] * 4),
    158: (20, 3, dict(hp=0, attack=255, defense=0, speed=255, spAttack=0, spDefense=0), None, [158] * 4, [158] * 4),
    207: (19, 6, dict(hp=255, attack=255, defense=0, speed=0, spAttack=0, spDefense=0), 187, [207] * 4, [207] * 4),
    162: (20, 3, dict(hp=0, attack=255, defense=0, speed=255, spAttack=0, spDefense=0), 196, [162, 158, 247, 184], [162] * 4),
}
if PMID in PATCH:
    sp, nat, evs, item, pm, om = PATCH[PMID]
    for side in ("player", "opponent"):
        mon = raw["overrides"]["parties"][side][0]
        if mon["species"] == 41:
            mon.update({"species": sp, "nature": nat, "moves": pm if side == "player" else om, "evs": evs})
            if item is not None: mon["item"] = item
            if PMID == 162: mon.update({"level": 50, "ivs": dict(hp=31, attack=31, defense=31, speed=31, spAttack=31, spDefense=31), "ppUps": [0] * 4, "abilitySlot": 0, "friendship": 70, "gender": "male", "shiny": False})
req = validate_request(raw, "battle-scene-on")
o = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
lab = BattleLab(o, "battle-scene-on"); lab.prepare(req)
nm = subprocess.run(["arm-none-eabi-nm", "-n", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
sym = {p[2]: int(p[0], 16) for p in (l.split() for l in nm.splitlines()) if len(p) == 3}
PTR = os.environ.get("A3_TRACE_PTR") == "1"
FADE = os.environ.get("A3_TRACE_FADE") == "1"  # raw gPaletteFade + vblank-ish counters per frame, for tail-duration attribution
ptrs, fades = [], []
def sample():
    if FADE: fades.append([o.read_u8(sym["gPaletteFade"] + i) for i in range(12)] + [o.read_u8(sym["gTasks"] + 0)])
    if PTR: ptrs.append(o.read_u32(sym["sBattleAnimScriptPtr"]))
    return bool(o.read_u8(sym["gAnimScriptActive"])), o.read_u8(sym["sAnimMoveIndex"]) | o.read_u8(sym["sAnimMoveIndex"] + 1) << 8
rows = [sample()]; f = 0
for seg in req["trace"]["segments"]:
    for _ in range(seg["frames"]):
        o.advance(seg.get("buttons", [])); f += 1; rows.append(sample())
for tail_age in range(1200):
    seen = any(m == TAIL_MOVE and a for a, m in rows)
    if seen and not rows[-1][0]: break
    o.advance(["A"] if not seen and tail_age % 30 < 2 else []); f += 1; rows.append(sample())
iv = []
for fr, (a, m) in enumerate(rows):
    if iv and iv[-1]["end"] is None and (not a or iv[-1]["move"] != m): iv[-1]["end"] = fr
    if a and (not iv or iv[-1]["end"] is not None): iv.append({"move": m, "start": fr, "end": None})
extra = {}
if PTR:  # script-pointer schedule per interval: [frame, ptr] whenever the pointer changes while active
    extra["schedule"] = [[[fr, ptrs[fr]] for fr in range(i["start"], (i["end"] or f) + 1) if fr == i["start"] or ptrs[fr] != ptrs[fr - 1]] for i in iv]
if FADE: extra["fades"] = fades
OUT.write_text(json.dumps({"frames": f, "intervals": iv, **extra}))
