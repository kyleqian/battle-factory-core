#!/usr/bin/env python3
"""Dense software/hardware/pixel evidence for legal Scene-ON MOVE_SCARY_FACE."""
from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: scaryFaceProbe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB_DIR = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
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
    matrices = oracle.symbols["gOamMatrices"]
    battler_ids = oracle.symbols["gBattlerSpriteIds"]
    visual_count = oracle.symbols["gAnimVisualTaskCount"]
    sound_count = oracle.symbols["gAnimSoundTaskCount"]
    faded = oracle.symbols["gPlttBufferFaded"]
    unfaded = oracle.symbols["gPlttBufferUnfaded"]
    song_table = oracle.symbols["gSongTable"]
    se1_info = oracle.symbols["gMPlayInfo_SE1"]
    se2_info = oracle.symbols["gMPlayInfo_SE2"]
    se1_tracks = oracle.symbols["gMPlayTrack_SE1"]
    se2_tracks = oracle.symbols["gMPlayTrack_SE2"]
    nm = subprocess.run(["arm-none-eabi-nm", str(reference / "pokeemerald.elf")],
                        check=True, capture_output=True, text=True).stdout
    symbols = {p[2]: int(p[0], 16) | 1 for line in nm.splitlines()
               if len(p := line.split()) == 3}
    palette_tags = symbols["sSpritePaletteTags"] & ~1
    task_names = ("AnimSimplePaletteBlend", "AnimSimplePaletteBlend_Step",
                  "AnimTask_ScaryFace", "AnimTask_ScaryFace_Step",
                  "AnimTask_ShakeTargetInPattern")
    task_funcs = {symbols[name]: name for name in task_names}
    callbacks = {symbols[name]: name for name in
                 ("AnimEyeSparkle", "AnimEyeSparkle_Step", "AnimSimplePaletteBlend",
                  "AnimSimplePaletteBlend_Step", "DestroyAnimSprite")}
    eye_template = oracle.symbols["gEyeSparkleSpriteTemplate"]
    blend_template = oracle.symbols["gSimplePaletteBlendSpriteTemplate"]
    def u16(a: int) -> int: return oracle.read_u8(a) | (oracle.read_u8(a + 1) << 8)
    def s16(a: int) -> int:
        v = u16(a)
        return v - 0x10000 if v >= 0x8000 else v
    def s8(a: int) -> int:
        v = oracle.read_u8(a)
        return v - 0x100 if v >= 0x80 else v
    def player(info: int, tracks: int) -> dict:
        return {"songHeader": oracle.read_u32(info), "status": oracle.read_u32(info+4),
                "tracks": [{"flags": oracle.read_u8(tracks+i*0x50),
                            "panX": s8(tracks+i*0x50+0x15)} for i in range(3)]}
    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        matrix_num = (u16(base + 2) >> 9) & 0x1f
        matrix = matrices + matrix_num * 8
        return {"slot": slot, "x": s16(base+0x20), "y": s16(base+0x22),
                "x2": s16(base+0x24), "y2": s16(base+0x26),
                "attr0": u16(base), "attr1": u16(base+2), "attr2": u16(base+4),
                "matrixNum": matrix_num,
                "matrix": {"a": s16(matrix), "b": s16(matrix+2),
                           "c": s16(matrix+4), "d": s16(matrix+6)},
                "subpriority": oracle.read_u8(base+0x43),
                "invisible": bool(oracle.read_u8(base+0x3e) & 4),
                "template": oracle.read_u32(base+0x14),
                "callback": callbacks.get(oracle.read_u32(base+0x1c), "other"),
                "animFrame": oracle.read_u8(base+0x2b),
                "data": [s16(base+0x2e+i*2) for i in range(8)]}
    def battler(i: int) -> dict: return sprite(oracle.read_u8(battler_ids + i))
    def active_tasks() -> list[dict]:
        result = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if oracle.read_u8(base + 4) == 0: continue
            func = oracle.read_u32(base)
            if func in task_funcs:
                result.append({"slot": slot, "func": task_funcs[func],
                               "data": [s16(base+8+i*2) for i in range(16)]})
        return result
    rows = []
    RGB_DIR.mkdir(parents=True, exist_ok=True)
    def capture(frame: int) -> None:
        if lab.snapshot()["engine"]["currentMove"] != 184: return
        active = []
        for slot in range(64):
            base = sprites + slot * 0x44
            if oracle.read_u8(base+0x3e) & 1:
                active.append(sprite(slot))
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        rows.append({"frame": frame, "sha256": hashlib.sha256(rgb).hexdigest(),
                     "sprites": [item for item in active
                                 if item["template"] in (eye_template, blend_template)],
                     "active": active, "tasks": active_tasks(),
                     "player": battler(0), "opponent": battler(1),
                     "visualTaskCount": oracle.read_u8(visual_count),
                     "soundTaskCount": oracle.read_u8(sound_count),
                     "hardwareOam": [[u16(0x07000000+i*8+j) for j in (0,2,4)]
                                     for i in range(128)],
                     "hardwareMatrices": [
                         {"a": s16(0x07000006+i*0x20), "b": s16(0x0700000e+i*0x20),
                          "c": s16(0x07000016+i*0x20), "d": s16(0x0700001e+i*0x20)}
                         for i in range(32)],
                     "fadedPalette": [u16(faded+i*2) for i in range(512)],
                     "unfadedPalette": [u16(unfaded+i*2) for i in range(512)],
                     "hardwarePalette": [u16(0x05000000+i*2) for i in range(512)],
                     "paletteTags": [u16(palette_tags+i*2) for i in range(16)],
                     "bg1x": s16(oracle.symbols["gBattle_BG1_X"]),
                     "bg1y": s16(oracle.symbols["gBattle_BG1_Y"]),
                     "dispcnt": u16(0x04000000), "bg1cnt": u16(0x0400000a),
                     "bg1hofs": u16(0x04000014), "bg1vofs": u16(0x04000016),
                     "bldcnt": u16(0x04000050), "bldalpha": u16(0x04000052),
                     "bldy": u16(0x04000054),
                     "se1": player(se1_info, se1_tracks),
                     "se2": player(se2_info, se2_tracks)})
    frame = 0
    capture(frame)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", [])); frame += 1; capture(frame)
    OUTPUT.write_text(json.dumps({"schema": "scary-face-dense-evidence/v2",
      "setup": setup, "templates": {"eye": eye_template, "blend": blend_template},
      "songHeaders": {"SE_M_STRING_SHOT2": oracle.read_u32(song_table+130*8),
                      "SE_M_PSYBEAM": oracle.read_u32(song_table+189*8),
                      "SE_M_LEER": oracle.read_u32(song_table+192*8)},
      "frames": rows}) + "\n")
    print(f"wrote {OUTPUT} ({len(rows)} frames; {rows[0]['frame'] if rows else '-'}..{rows[-1]['frame'] if rows else '-'})")
main()
