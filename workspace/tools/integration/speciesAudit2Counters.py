#!/usr/bin/env python3
"""speciesAudit2: per-frame main-loop pass / VBlank counters (lag-frame instrument). Derived from prep11Probe.py setup.
usage: speciesAudit2Counters.py <scenario.json> <out.json>
Per frame: gMain.vblankCounter1/2, gSaveBlock2Ptr playTime (+1 per main-loop PlayTimeCounter_Update pass), REG_VCOUNT, gAnimScriptActive, sAnimMoveIndex, BLDY, DISPCNT.
(old doc follows) prep11: direct-mGBA (Scene ON, fresh process) per-body input probe for the S10A SMALL-INPUT moves.
usage: prep11Probe.py <scenario.json> <output.json>      (run from the workspace root with the mgba venv; see prep11Probes.sh)
Per frame: gAnimScriptActive / sAnimMoveIndex -> every animation body (move id, start frame, end frame).  At each body's activation frame and at end+1 records
gAnimMovePower, gBattleMovePower, gDynamicBasePower, gAnimMoveDmg, gBattleMoveDamage, gBattleScripting.animTurn/animTargetsHit, gMultiHitCounter, gCurrentMove,
gBattlerAttacker/Target, both battlers' hp/maxHP/status1/species, gOamMatrixAllocBitmap, active task count, sSpriteOrder (64), in-use sprite slots.
Also logs every CHANGE of gBattleMovePower / gDynamicBasePower / gAnimMovePower with the frame and gCurrentMove (the stale-power writers)."""
import json, os, subprocess, sys
ALWAYS = os.environ.get("PREP11_ALWAYS") == "1"  # log series/spawns/tasks for the whole run (forced-switch continuation)
from pathlib import Path
SCEN, OUT = map(Path, sys.argv[1:3])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request
from emerald_core import EmeraldOracle
ref = ROOT / "reference" / "pokeemerald"
_d = json.loads(SCEN.read_text()); _d["profile"] = "battle-scene-on"  # scene-off lab files: same logic; animation bodies only run Scene ON
req = validate_request(_d, "battle-scene-on")
o = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
lab = BattleLab(o, "battle-scene-on"); lab.prepare(req)
nm = subprocess.run(["arm-none-eabi-nm", "-n", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
sym = {p[2]: int(p[0], 16) for p in (l.split() for l in nm.splitlines()) if len(p) == 3}
u8, u16, u32 = o.read_u8, o.read_u16, o.read_u32
def s32(a):
    v = u32(a); return v - (1 << 32) if v >= 1 << 31 else v
M = sym["gMain"]
def row(f):
    sb2 = u32(sym["gSaveBlock2Ptr"])
    pt = (u16(sb2 + 0x0e), u8(sb2 + 0x10), u8(sb2 + 0x11), u8(sb2 + 0x12), u8(sb2 + 0x13))  # hours, minutes, seconds, vblanks, state
    return [f, u32(M + 0x20), u32(M + 0x24), pt[3] + 60 * (pt[2] + 60 * pt[1]), u8(sym["sPlayTimeCounterState"]), u16(0x04000006), int(u8(sym["gAnimScriptActive"])), u16(sym["sAnimMoveIndex"]), u16(0x04000054), u16(0x04000000), u16(M + 0x1c)]
_sb2 = u32(sym["gSaveBlock2Ptr"]); o.write_u16(_sb2 + 0x0e, 0); o.write_u8(_sb2 + 0x10, 0); o.write_u8(_sb2 + 0x11, 0); o.write_u8(_sb2 + 0x12, 0); o.write_u8(sym["sPlayTimeCounterState"], 1)  # run PlayTimeCounter (+1 per main-loop pass); no game logic reads it
rows = [row(0)]; f = 0
for seg in req["trace"]["segments"]:
    for _ in range(seg["frames"]):
        o.advance(seg.get("buttons", [])); f += 1; rows.append(row(f))
OUT.write_text(json.dumps({"scenario": SCEN.name, "cols": ["f", "vblankCounter1", "vblankCounter2", "playTimeVBlanks", "playTimeState", "vcount", "animActive", "animMove", "bldy", "dispcnt", "intrCheck"], "rows": rows}, separators=(",", ":")))
