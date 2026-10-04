#!/usr/bin/env python3
"""Source activation frames of every move script in a scenario (Scene ON, direct mGBA).

usage: altSpecies3Activation.py <scenario.json> <output.json> [probeMoveId]
probeMoveId 44 applies poisonFangProbe.py's runtime Meowth/BITE carrier patch (species 41 -> MEOWTH, moves [44]*4)
Detection is allocatorNetZeroProbe.py's: gAnimScriptActive rising edge with sAnimMoveIndex.
Output: {"intervals":[{"move","start","end"}]} (start = first active frame, end = first inactive frame).
"""
import json, os, subprocess, sys
from pathlib import Path
SCEN, OUT = map(Path, sys.argv[1:3]); PMID = int(sys.argv[3]) if len(sys.argv) > 3 else None
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request
from emerald_core import EmeraldOracle
ref = ROOT / "reference" / "pokeemerald"
raw = json.loads(SCEN.read_text())
if PMID == 44:
    for side in ("player", "opponent"):
        mon = raw["overrides"]["parties"][side][0]
        if mon["species"] == 41:
            mon.update({"species": 52, "nature": 24, "moves": [44] * 4})
            mon["evs"] = {"hp": 255, "attack": 255, "defense": 0, "speed": 0, "spAttack": 0, "spDefense": 0}
req = validate_request(raw, "battle-scene-on")
o = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
lab = BattleLab(o, "battle-scene-on"); lab.prepare(req)
nm = subprocess.run(["arm-none-eabi-nm", "-n", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
sym = {p[2]: int(p[0], 16) for p in (l.split() for l in nm.splitlines()) if len(p) == 3}
PTR = os.environ.get("A3_TRACE_PTR") == "1"
ptrs = []
def sample():
    if PTR: ptrs.append(o.read_u32(sym["sBattleAnimScriptPtr"]))
    return bool(o.read_u8(sym["gAnimScriptActive"])), o.read_u8(sym["sAnimMoveIndex"]) | o.read_u8(sym["sAnimMoveIndex"] + 1) << 8
rows = [sample()]; f = 0
for seg in req["trace"]["segments"]:
    for _ in range(seg["frames"]):
        o.advance(seg.get("buttons", [])); f += 1; rows.append(sample())
iv = []
for fr, (a, m) in enumerate(rows):
    if iv and iv[-1]["end"] is None and (not a or iv[-1]["move"] != m): iv[-1]["end"] = fr
    if a and (not iv or iv[-1]["end"] is not None): iv.append({"move": m, "start": fr, "end": None})
extra = {}
if PTR:  # script-pointer schedule per interval: [frame, ptr] whenever the pointer changes while active
    extra["schedule"] = [[[fr, ptrs[fr]] for fr in range(i["start"], (i["end"] or f) + 1) if fr == i["start"] or ptrs[fr] != ptrs[fr - 1]] for i in iv]
OUT.write_text(json.dumps({"frames": f, "intervals": iv, **extra}))
