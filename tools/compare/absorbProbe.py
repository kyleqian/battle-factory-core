#!/usr/bin/env python3
"""Dense Scene-ON RAM/audio evidence for legal MOVE_ABSORB orientations."""
from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: absorbProbe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB_DIR = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    reference = ROOT / "reference" / "pokeemerald"
    oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    sprites, tasks, matrices = oracle.symbols["gSprites"], oracle.symbols["gTasks"], oracle.symbols["gOamMatrices"]
    battler_ids, visual, sound = oracle.symbols["gBattlerSpriteIds"], oracle.symbols["gAnimVisualTaskCount"], oracle.symbols["gAnimSoundTaskCount"]
    faded, unfaded = oracle.symbols["gPlttBufferFaded"], oracle.symbols["gPlttBufferUnfaded"]
    orb_template = oracle.symbols["gAbsorptionOrbSpriteTemplate"]
    se1, se2, se1_tracks, se2_tracks = (oracle.symbols[n] for n in ("gMPlayInfo_SE1", "gMPlayInfo_SE2", "gMPlayTrack_SE1", "gMPlayTrack_SE2"))
    nm = subprocess.run(["arm-none-eabi-nm", str(reference / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    names = {line.split()[2]: int(line.split()[0], 16) | 1 for line in nm.splitlines() if len(line.split()) == 3}
    callback_names = {names[n]: n for n in ("AnimAbsorptionOrb", "AnimAbsorptionOrb_Step", "DestroyAnimSprite")}
    def u16(a: int) -> int: return oracle.read_u8(a) | (oracle.read_u8(a + 1) << 8)
    def s16(a: int) -> int:
        v = u16(a); return v - 0x10000 if v >= 0x8000 else v
    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44; matrix = matrices + ((u16(base + 2) >> 9) & 31) * 8
        return {"slot": slot, "template": oracle.read_u32(base + 0x14), "callback": callback_names.get(oracle.read_u32(base + 0x1c), "other"), "x":s16(base+0x20),"y":s16(base+0x22),"x2":s16(base+0x24),"y2":s16(base+0x26),"subpriority":oracle.read_u8(base+0x43),"attr0":u16(base),"attr1":u16(base+2),"attr2":u16(base+4),"matrix":[s16(matrix+i) for i in (0,2,4,6)],"data":[s16(base+0x2e+i*2) for i in range(8)]}
    def player(info: int, tracks: int) -> dict:
        return {"songHeader":oracle.read_u32(info),"status":oracle.read_u32(info+4),"tracks":[{"flags":oracle.read_u8(tracks+i*0x50),"panX":oracle.read_u8(tracks+i*0x50+0x15)} for i in range(3)]}
    rows = []; RGB_DIR.mkdir(parents=True, exist_ok=True)
    def capture(frame: int) -> None:
        snap = lab.snapshot()
        if snap["engine"]["currentMove"] != 71: return
        active = [sprite(slot) for slot in range(64) if oracle.read_u8(sprites+slot*0x44+0x3e)&1]
        rgb = oracle.screen_rgb(); (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        rows.append({"frame":frame,"sha256":hashlib.sha256(rgb).hexdigest(),"orbs":[s for s in active if s["template"]==orb_template],"activeTaskSlots":[slot for slot in range(16) if oracle.read_u8(tasks+slot*0x28+4)],"player":sprite(oracle.read_u8(battler_ids)),"opponent":sprite(oracle.read_u8(battler_ids+1)),"visualTaskCount":oracle.read_u8(visual),"soundTaskCount":oracle.read_u8(sound),"bldcnt":u16(0x04000050),"bldalpha":u16(0x04000052),"fadedPalette":[u16(faded+i*2) for i in range(512)],"unfadedPalette":[u16(unfaded+i*2) for i in range(512)],"se1":player(se1,se1_tracks),"se2":player(se2,se2_tracks)})
    frame = 0; capture(frame)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]): oracle.advance(segment.get("buttons", [])); frame += 1; capture(frame)
    if not rows or not any(row["orbs"] for row in rows): raise RuntimeError("MOVE_ABSORB/orb body was not reached")
    OUTPUT.write_text(json.dumps({"schema":"absorb-dense-evidence/v1","setup":setup,"template":orb_template,"frames":rows})+"\n")
    print(f"wrote {OUTPUT} ({len(rows)} move frames; {rows[0]['frame']}..{rows[-1]['frame']})")
if __name__ == "__main__": main()
