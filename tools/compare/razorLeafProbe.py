#!/usr/bin/env python3
"""Dense source-component evidence for legal Scene-ON RAZOR LEAF fixtures."""
from __future__ import annotations
import json, subprocess, sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit("usage: razorLeafProbe.py <scenario> <output.json>")
SCENARIO, OUTPUT = Path(sys.argv[1]), Path(sys.argv[2])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    reference = (ROOT / "reference" / "pokeemerald").resolve()
    oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map",
                           HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    sprites, tasks = oracle.symbols["gSprites"], oracle.symbols["gTasks"]
    battler_ids, song_table = oracle.symbols["gBattlerSpriteIds"], oracle.symbols["gSongTable"]
    faded, unfaded = oracle.symbols["gPlttBufferFaded"], oracle.symbols["gPlttBufferUnfaded"]
    nm = subprocess.run(["arm-none-eabi-nm", str(reference / "pokeemerald.elf")],
                        check=True, capture_output=True, text=True).stdout
    symbols = {p[2]: int(p[0], 16) | 1 for line in nm.splitlines()
               if len(p := line.split()) == 3}
    templates = {name: oracle.symbols[name] for name in
                 ("gRazorLeafParticleSpriteTemplate", "gRazorLeafCutterSpriteTemplate")}
    callbacks = {name: symbols[name] for name in
                 ("AnimRazorLeafParticle", "AnimRazorLeafParticle_Step1",
                  "AnimRazorLeafParticle_Step2", "AnimTranslateLinearSingleSineWave",
                  "AnimTranslateLinearSingleSineWave_Step")}
    shake_funcs = {symbols[name] for name in ("AnimTask_ShakeMon2", "AnimTask_ShakeMon2_Step")}
    def u16(a: int) -> int: return oracle.read_u8(a) | (oracle.read_u8(a + 1) << 8)
    def s16(a: int) -> int:
        v = u16(a)
        return v - 0x10000 if v >= 0x8000 else v
    def s8(a: int) -> int:
        v = oracle.read_u8(a)
        return v - 0x100 if v >= 0x80 else v
    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        return {"slot": slot, "attr0": u16(base), "attr1": u16(base+2),
                "attr2": u16(base+4), "x": s16(base+0x20), "y": s16(base+0x22),
                "x2": s16(base+0x24), "y2": s16(base+0x26),
                "template": oracle.read_u32(base+0x14),
                "callback": oracle.read_u32(base+0x1c),
                "invisible": bool(oracle.read_u8(base+0x3e) & 4),
                "subpriority": oracle.read_u8(base+0x43),
                "data": [s16(base+0x2e+i*2) for i in range(8)]}
    def battler(i: int) -> dict: return sprite(oracle.read_u8(battler_ids + i))
    def active_shakes() -> list[dict]:
        result = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if oracle.read_u8(base + 4) == 0: continue
            func = oracle.read_u32(base)
            if func in shake_funcs:
                result.append({"slot": slot, "func": func,
                               "data": [s16(base+8+i*2) for i in range(16)]})
        return result
    rows = []
    def capture(frame: int) -> None:
        snap = lab.snapshot()
        if snap["engine"]["currentMove"] != 75: return
        active = []
        for slot in range(64):
            base = sprites + slot * 0x44
            if oracle.read_u8(base+0x3e) & 1:
                item = sprite(slot)
                if item["template"] in templates.values(): active.append(item)
        se1_info, se1_tracks = oracle.symbols["gMPlayInfo_SE1"], oracle.symbols["gMPlayTrack_SE1"]
        rows.append({"frame": frame, "playerSprite": battler(0), "opponentSprite": battler(1),
          "sprites": active, "tasks": active_shakes(),
          "hardwareOam": [[u16(0x07000000+i*8+j) for j in (0,2,4)] for i in range(128)],
          "fadedPalette": [u16(faded+i*2) for i in range(512)],
          "unfadedPalette": [u16(unfaded+i*2) for i in range(512)],
          "hardwarePalette": [u16(0x05000000+i*2) for i in range(512)],
          "bldcnt": u16(0x04000050), "bldalpha": u16(0x04000052),
          "se1": {"songHeader": oracle.read_u32(se1_info),
                  "tracks": [{"flags": oracle.read_u8(se1_tracks+i*0x50),
                              "panX": s8(se1_tracks+i*0x50+0x15)} for i in range(3)]}})
    frame = 0
    capture(frame)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", [])); frame += 1; capture(frame)
    headers = {"SE_M_RAZOR_WIND": oracle.read_u32(song_table+136*8),
               "SE_M_RAZOR_WIND2": oracle.read_u32(song_table+160*8),
               "SE_M_POISON_POWDER": oracle.read_u32(song_table+169*8)}
    OUTPUT.write_text(json.dumps({"schema": "razor-leaf-dense-evidence/v1",
      "setup": setup, "templates": templates, "callbacks": callbacks,
      "songHeaders": headers, "frames": rows}) + "\n")
    print(f"wrote {OUTPUT} ({len(rows)} frames; {rows[0]['frame'] if rows else '-'}..{rows[-1]['frame'] if rows else '-'})")
main()
