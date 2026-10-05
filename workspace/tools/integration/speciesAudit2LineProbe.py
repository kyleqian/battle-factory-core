#!/usr/bin/env python3
"""speciesAudit2: intra-frame palette-write locator. usage: speciesAudit2LineProbe.py <scenario.json> <out.json> <frame> (steps the CPU through frame <frame>;
samples BG-palette hash, REG_VCOUNT, PC symbol every 16 instructions; records every change). Derived from prep11Probe.py setup.
(old doc follows) prep11: direct-mGBA (Scene ON, fresh process) per-body input probe for the S10A SMALL-INPUT moves.
usage: prep11Probe.py <scenario.json> <output.json>      (run from the workspace root with the mgba venv; see prep11Probes.sh)
Per frame: gAnimScriptActive / sAnimMoveIndex -> every animation body (move id, start frame, end frame).  At each body's activation frame and at end+1 records
gAnimMovePower, gBattleMovePower, gDynamicBasePower, gAnimMoveDmg, gBattleMoveDamage, gBattleScripting.animTurn/animTargetsHit, gMultiHitCounter, gCurrentMove,
gBattlerAttacker/Target, both battlers' hp/maxHP/status1/species, gOamMatrixAllocBitmap, active task count, sSpriteOrder (64), in-use sprite slots.
Also logs every CHANGE of gBattleMovePower / gDynamicBasePower / gAnimMovePower with the frame and gCurrentMove (the stale-power writers)."""
import json, os, subprocess, sys
ALWAYS = os.environ.get("PREP11_ALWAYS") == "1"  # log series/spawns/tasks for the whole run (forced-switch continuation)
from pathlib import Path
SCEN, OUT = map(Path, sys.argv[1:3]); TARGET = int(sys.argv[3])
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
import bisect, hashlib
funcs = sorted((a, n) for n, a in sym.items())
addrs = [a for a, _ in funcs]
def fn(pc):
    i = bisect.bisect_right(addrs, pc & ~1) - 1
    return funcs[i][1] if i >= 0 else "?"
core = o.core
def pal():
    return hashlib.md5(bytes(core.memory.u8[0x05000000 + k] for k in range(0, 0x200, 2))).hexdigest()
f = 0; events = []
for seg in req["trace"]["segments"]:
    for _ in range(seg["frames"]):
        if f + 1 == TARGET:
            o._set_buttons(seg.get("buttons", []))
            last = pal(); n = 0; ring = []; start = u16(0x04000006)
            events.append({"start_vcount": start, "pal": last})
            fc = core.frame_counter
            while core.frame_counter == fc:
                core.step(); n += 1
                pcn = core.cpu.pc
                if pcn >= 0x08000000 or 0x03000000 <= pcn < 0x04000000:
                    if not ring or ring[-1][0] != fn(pcn): ring.append((fn(pcn), n, u16(0x04000006))); ring[:] = ring[-6:]
                if n % 16 == 0:
                    p = pal()
                    if p != last:
                        events.append({"n": n, "vcount": u16(0x04000006), "pc": core.cpu.pc if hasattr(core.cpu, "pc") else None, "fn": fn(core.cpu.pc) if hasattr(core.cpu, "pc") else None, "lastRomFns": list(ring)}); last = p
            events.append({"end_n": n, "vcount": u16(0x04000006)})
            f += 1
        else:
            o.advance(seg.get("buttons", [])); f += 1
OUT.write_text(json.dumps({"scenario": SCEN.name, "frame": TARGET, "events": events}, indent=1))
