#!/usr/bin/env python3
"""Dense MOVE_POISON_TAIL source-component evidence for legal Scene-ON fixtures."""
from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: poisonTailProbe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB_DIR = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    reference = (ROOT / "reference" / "pokeemerald").resolve()
    oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    RGB_DIR.mkdir()
    sprites, matrices, tasks = oracle.symbols["gSprites"], oracle.symbols["gOamMatrices"], oracle.symbols["gTasks"]
    battler_ids = oracle.symbols["gBattlerSpriteIds"]
    faded, unfaded = oracle.symbols["gPlttBufferFaded"], oracle.symbols["gPlttBufferUnfaded"]
    bg1_x, bg1_y = oracle.symbols["gBattle_BG1_X"], oracle.symbols["gBattle_BG1_Y"]
    se1_info, se1_tracks = oracle.symbols["gMPlayInfo_SE1"], oracle.symbols["gMPlayTrack_SE1"]
    song_table = oracle.symbols["gSongTable"]
    nm = subprocess.run(["arm-none-eabi-nm", str(reference / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    symbols = {line.split()[2]: int(line.split()[0], 16) | 1 for line in nm.splitlines() if len(line.split()) == 3}
    templates = {name: oracle.symbols[name] for name in (
        "gHorizontalLungeSpriteTemplate",
        "gBasicHitSplatSpriteTemplate",
        "gPoisonBubbleSpriteTemplate",
    )}
    task_names = (
        "AnimTask_MetallicShine", "AnimTask_MetallicShine_Step",
        "AnimTask_ShakeMon", "AnimTask_ShakeMon_Step",
        "SoundTask_LoopSEAdjustPanning", "SoundTask_LoopSEAdjustPanning_Step",
    )
    task_funcs = {symbols[name] for name in task_names}
    def u16(a: int) -> int: return oracle.read_u8(a) | (oracle.read_u8(a + 1) << 8)
    def s16(a: int) -> int:
        v = u16(a)
        return v - 0x10000 if v >= 0x8000 else v
    def s8(a: int) -> int:
        v = oracle.read_u8(a)
        return v - 0x100 if v >= 0x80 else v
    def block(a: int, size: int) -> bytes:
        return bytes(oracle.read_u8(a + i) for i in range(size))
    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        matrix_num = (u16(base + 2) >> 9) & 0x1f
        matrix = matrices + matrix_num * 8
        hw_matrix = 0x07000006 + matrix_num * 0x20
        return {"slot":slot,"raw":block(base,0x44).hex(),
                "attr0":u16(base),"attr1":u16(base+2),"attr2":u16(base+4),
                "x":s16(base+0x20),"y":s16(base+0x22),"x2":s16(base+0x24),"y2":s16(base+0x26),
                "template":oracle.read_u32(base+0x14),"callback":oracle.read_u32(base+0x1c),
                "subpriority":oracle.read_u8(base+0x43),"matrixNum":matrix_num,
                "matrix":{"a":s16(matrix),"b":s16(matrix+2),"c":s16(matrix+4),"d":s16(matrix+6)},
                "hardwareMatrix":{"a":s16(hw_matrix),"b":s16(hw_matrix+8),"c":s16(hw_matrix+16),"d":s16(hw_matrix+24)},
                "data":[s16(base+0x2e+i*2) for i in range(8)]}
    def battler(i: int) -> dict: return sprite(oracle.read_u8(battler_ids + i))
    def active_tasks() -> list[dict]:
        result = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if oracle.read_u8(base + 4) == 0: continue
            func = oracle.read_u32(base)
            if func in task_funcs:
                result.append({"slot":slot,"func":func,"data":[s16(base+8+i*2) for i in range(16)]})
        return result
    rows = []
    def capture(frame: int) -> None:
        snap = lab.snapshot()
        if snap["engine"]["currentMove"] != 342: return
        active = []
        active_all = []
        for slot in range(64):
            base = sprites + slot * 0x44
            if oracle.read_u8(base+0x3e) & 1:
                item = sprite(slot)
                active_all.append(item)
                if item["template"] in templates.values(): active.append(item)
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        rows.append({"frame":frame,"sha256":hashlib.sha256(rgb).hexdigest(),
          "player":snap["battlers"]["player"],"opponent":snap["battlers"]["opponent"],
          "playerSprite":battler(0),"opponentSprite":battler(1),"sprites":active,
          "activeSprites":active_all,
          "tasks":active_tasks(),"fadedPalette":[u16(faded+i*2) for i in range(512)],
          "unfadedPalette":[u16(unfaded+i*2) for i in range(512)],
          "hardwarePalette":[u16(0x05000000+i*2) for i in range(512)],
          "hardwareOam":[[u16(0x07000000+i*8+j) for j in (0,2,4)] for i in range(128)],
          "se1":{"songHeader":oracle.read_u32(se1_info),"status":oracle.read_u32(se1_info+4),
                 "tracks":[{"flags":oracle.read_u8(se1_tracks+i*0x50),
                            "pan":s8(se1_tracks+i*0x50+0x14),
                            "panX":s8(se1_tracks+i*0x50+0x15)} for i in range(3)]},
          "bg1X":s16(bg1_x),"bg1Y":s16(bg1_y),
          "registers":{name:u16(addr) for name,addr in {
            "DISPCNT":0x04000000,"BG1CNT":0x0400000a,
            "BG1HOFS":0x04000014,"BG1VOFS":0x04000016,
            "WIN0H":0x04000040,"WIN0V":0x04000044,
            "WININ":0x04000048,"WINOUT":0x0400004a,
            "BLDCNT":0x04000050,"BLDALPHA":0x04000052}.items()}})
    frame = 0
    capture(frame)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", [])); frame += 1; capture(frame)
    OUTPUT.write_text(json.dumps({"schema":"poison-tail-dense-evidence/v1","setup":setup,
      "templates":templates,"taskFuncs":{name:symbols[name] for name in task_names},
      "songHeaders":{"SE_M_HARDEN":oracle.read_u32(song_table+120*8),
                     "SE_M_VITAL_THROW2":oracle.read_u32(song_table+123*8),
                     "SE_M_TOXIC":oracle.read_u32(song_table+148*8)},"frames":rows}) + "\n")
    print(f"wrote {OUTPUT} ({len(rows)} frames; {rows[0]['frame'] if rows else '-'}..{rows[-1]['frame'] if rows else '-'})")
main()
