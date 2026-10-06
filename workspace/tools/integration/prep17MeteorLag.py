#!/usr/bin/env python3
"""prep17: per-frame intra-frame timing (VCOUNT at key PCs) around Meteor Mash's restorebg LoadDefaultBg frame, direct mGBA, fresh process.
usage: prep17MeteorLag.py <scenario.json> <out.json> [rel0 rel1]   (rel = rows relative to the 309 activation; default 190..198)
Per row: entry vcounts of VBlank handler / AgbMain Random2 / DrawMainBattleBackground / LZDecompressVram / VBlankIntrWait wrapper, instr count, rng2 advanced?"""
import json, subprocess, sys
from pathlib import Path
SCEN, OUT = map(Path, sys.argv[1:3])
R0, R1 = (int(sys.argv[3]), int(sys.argv[4])) if len(sys.argv) > 4 else (190, 198)
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request
from emerald_core import EmeraldOracle
ref = ROOT / "reference" / "pokeemerald"
_d = json.loads(SCEN.read_text()); _d["profile"] = "battle-scene-on"
req = validate_request(_d, "battle-scene-on")
o = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
lab = BattleLab(o, "battle-scene-on"); lab.prepare(req)
nm = subprocess.run(["arm-none-eabi-nm", "-n", "--defined-only", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
sym = {p[2]: int(p[0], 16) for p in (l.split() for l in nm.splitlines()) if len(p) == 3}
u8, u16, u32 = o.read_u8, o.read_u16, o.read_u32
WATCH = {n: sym[n] & ~1 for n in ("DrawMainBattleBackground", "LZDecompressVram", "VBlankIntrWait", "Random2", "VBlankIntrHandler" if "VBlankIntrHandler" in sym else "VBlankIntr", "AgbMain", "BattleMainCB1", "BattleIntroDrawTrainersPokemonPalette" if False else "AnimateSprites", "BuildOamBuffer", "RunTasks", "LoadOam", "ProcessSpriteCopyRequests", "TransferPlttBuffer", "UpdatePaletteFade", "UpdateOamPriorityInAllOamEntries" if False else "CopyBgTilemapBufferToVram")}
byaddr = {v: k for k, v in WATCH.items()}
def anim():
    return u8(sym["gAnimScriptActive"]), u16(sym["sAnimMoveIndex"])
f = 0; A = None
frames = []
def run_plain():
    global f
    o.advance(seg_buttons); f += 1
for seg in req["trace"]["segments"]:
    seg_buttons = seg.get("buttons", [])
    for _ in range(seg["frames"]):
        a, m = anim()
        if A is None and a and m == 309: A = f
        if A is not None and R0 <= f - A <= R1:
            o._set_buttons(seg_buttons)
            fc = o.core.frame_counter
            ev = []; n = 0; last_pc = None
            while o.core.frame_counter == fc:
                pc = o.core.cpu.pc & ~1  # pipelined PC: entry = pc in [addr+2, addr+4] (Thumb) not seen on the previous step
                hit = byaddr.get(pc - 2) or byaddr.get(pc - 4)
                if hit and hit != last_pc:
                    ev.append([hit, n, u16(0x04000006)])
                last_pc = hit
                o.core.step(); n += 1
            o._screen_stale = False; o.frame += 1; f += 1
            frames.append({"rel": f - 1 - A, "instrs": n, "ev": ev, "endV": u16(0x04000006)})
        else:
            o.advance(seg_buttons); f += 1
OUT.write_text(json.dumps({"scenario": SCEN.name, "A": A, "frames": frames}, separators=(",", ":")))
