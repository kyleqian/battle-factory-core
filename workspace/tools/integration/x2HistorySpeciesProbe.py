#!/usr/bin/env python3
"""x2-history #148: direct-mGBA (fresh process, Scene ON) battler-sprite x2/y2 of a species on BOTH sides at the first body's activation.
usage: x2HistorySpeciesProbe.py <internalSpeciesId> <output.json> [base-scenario]   (run via tools/run-mgba-probe.py with the mgba venv; see x2HistorySpecies.sh)
Both party[0] mons are replaced by the species (opponent = front sprite, player = back sprite); the lab starts after the send-in. Records per frame (0..activation+2)
both battlers' x2/y2/invisible/anim state, and the x2/y2 at the first body activation (gAnimScriptActive rising edge) -- the value a live adapter would see at age 0."""
import json, subprocess, sys
from pathlib import Path
SP, OUT = int(sys.argv[1]), Path(sys.argv[2])
BASE = Path(sys.argv[3] if len(sys.argv) > 3 else "tools/battle-lab/mechanic-flail-natural-hp-player-krabby-opponent-onix.json")
PMOVE = int(sys.argv[4]) if len(sys.argv) > 4 else 175  # 175 Flail; ghost species need a non-Normal move (44 Bite)
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request
from emerald_core import EmeraldOracle
ref = ROOT / "reference" / "pokeemerald"
req = None; err = None
for gender in ("male", "female", "genderless"):
    d = json.loads(BASE.read_text()); d["profile"] = "battle-scene-on"
    for side in ("player", "opponent"):
        m = d["overrides"]["parties"][side][0]; m["species"] = SP; m["gender"] = gender; m["moves"] = [PMOVE] * 4 if side == "player" else m["moves"]
    try:
        req = validate_request(d, "battle-scene-on")
        o = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
        lab = BattleLab(o, "battle-scene-on"); lab.prepare(req); break
    except Exception as e: req = None; err = str(e)
if req is None: OUT.write_text(json.dumps({"species": SP, "error": err})); sys.exit(0)
nm = subprocess.run(["arm-none-eabi-nm", "-n", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
sym = {p[2]: int(p[0], 16) for p in (l.split() for l in nm.splitlines()) if len(p) == 3}
u8, u16 = o.read_u8, o.read_u16
def sg(a):
    v = u16(a); return v - 0x10000 if v >= 0x8000 else v
def bat():
    r = []
    for b in (0, 1):
        sa = sym["gSprites"] + u8(sym["gBattlerSpriteIds"] + b) * 0x44
        r.append([sg(sa + 0x24), sg(sa + 0x26), u8(sa + 0x3e) >> 2 & 1, u8(sa + 0x2c)])  # x2, y2, invisible, animNum
    return r
series, act, f = [], None, 0
species = lambda: [u16(sym["gBattleMons"] + 0x58 * b) for b in (0, 1)]
def step():
    global act
    s = bat(); series.append([f] + s[0] + s[1])
    if act is None and u8(sym["gAnimScriptActive"]): act = {"frame": f, "battlers": s, "species": species(), "move": u16(sym["sAnimMoveIndex"])}
step()
done = False
for seg in req["trace"]["segments"]:
    for _ in range(seg["frames"]):
        o.advance(seg.get("buttons", [])); f += 1; step()
        if act is not None and f >= act["frame"] + 2: done = True; break
    if done: break
OUT.write_text(json.dumps({"species": SP, "gender": gender, "frames": f, "activation": act, "battlerSeries": series}, separators=(",", ":")))
