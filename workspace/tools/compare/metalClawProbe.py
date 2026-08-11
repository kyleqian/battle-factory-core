#!/usr/bin/env python3
"""Dense MOVE_METAL_CLAW MetallicShine + claw-slash + lunge + shake evidence."""
from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: metalClawProbe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB_DIR = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE = 232  # MOVE_METAL_CLAW

def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    reference = (ROOT / "reference" / "pokeemerald").resolve()
    oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    RGB_DIR.mkdir()
    sprites, tasks = oracle.symbols["gSprites"], oracle.symbols["gTasks"]
    battler_ids = oracle.symbols["gBattlerSpriteIds"]
    faded, unfaded = oracle.symbols["gPlttBufferFaded"], oracle.symbols["gPlttBufferUnfaded"]
    bg1_x, bg1_y = oracle.symbols["gBattle_BG1_X"], oracle.symbols["gBattle_BG1_Y"]
    global_y = oracle.symbols["gSpriteCoordOffsetY"]
    se1_info, se1_tracks = oracle.symbols["gMPlayInfo_SE1"], oracle.symbols["gMPlayTrack_SE1"]
    nm = subprocess.run(["arm-none-eabi-nm", "-a", str(reference / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    pairs = [(int(p[0], 16), p[2]) for line in nm.splitlines() if len(p := line.split()) == 3 and all(c in "0123456789abcdefABCDEF" for c in p[0])]
    by_address = {a: n for a, n in pairs}
    names = {n: a for a, n in pairs}
    metallic_funcs = {names["AnimTask_MetallicShine"] | 1, names["AnimTask_MetallicShine_Step"] | 1}
    sound_funcs = {names["Task_LoopAndPlaySE"] | 1}
    templates = {
        "claw": oracle.symbols["gClawSlashSpriteTemplate"],
        "lunge": oracle.symbols["gHorizontalLungeSpriteTemplate"],
        "shake": oracle.symbols["gShakeMonOrPlatformSpriteTemplate"],
    }
    watched = {
        "clawCallback": names["AnimClawSlash"] | 1,
        "runStored": names["RunStoredCallbackWhenAnimEnds"] | 1,
        "destroy": names["DestroyAnimSprite"] | 1,
        "shakeStep": names["AnimShakeMonOrBattlePlatforms_Step"] | 1,
    }
    def u16(a: int) -> int: return oracle.read_u8(a) | (oracle.read_u8(a + 1) << 8)
    def s16(a: int) -> int:
        v = u16(a)
        return v - 0x10000 if v >= 0x8000 else v
    def s8(a: int) -> int:
        v = oracle.read_u8(a)
        return v - 0x100 if v >= 0x80 else v
    def block(addr: int, size: int) -> bytes: return bytes(oracle.read_u8(addr + i) for i in range(size))
    def ident(a: int) -> dict: return {"address": a, "symbol": by_address.get(a & ~1)}
    def active_tasks() -> list[dict]:
        result = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if oracle.read_u8(base + 4) == 0: continue
            func = oracle.read_u32(base)
            if func in metallic_funcs | sound_funcs:
                result.append({"slot": slot, "func": ident(func), "data": [s16(base + 8 + i * 2) for i in range(16)]})
        return result
    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        return {"slot": slot, "raw": block(base, 0x44).hex(), "x": s16(base + 0x20), "y": s16(base + 0x22),
                "x2": s16(base + 0x24), "y2": s16(base + 0x26), "callback": ident(oracle.read_u32(base + 0x1c)),
                "template": oracle.read_u32(base + 0x14), "animNum": oracle.read_u8(base + 0x2b),
                "data": [s16(base + 0x2e + i * 2) for i in range(8)]}
    rows = []
    def capture(frame: int) -> None:
        snap = lab.snapshot()
        if snap["engine"]["currentMove"] != MOVE: return
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        ids = [oracle.read_u8(battler_ids + i) for i in range(2)]
        active = [slot for slot in range(64) if oracle.read_u8(sprites + slot * 0x44 + 0x3e) & 1]
        active_sprites = [sprite(i) for i in active]
        effect = {name: [s for s in active_sprites if s["template"] == addr] for name, addr in templates.items()}
        rows.append({"frame": frame, "sha256": hashlib.sha256(rgb).hexdigest(),
          "attacker": snap["engine"]["activeBattler"], "bg1X": s16(bg1_x), "bg1Y": s16(bg1_y),
          "globalY": s16(global_y),
          "player": snap["battlers"]["player"], "opponent": snap["battlers"]["opponent"],
          "registers": {name: u16(addr) for name, addr in {
            "DISPCNT": 0x4000000, "BG1CNT": 0x400000a, "BG1HOFS": 0x4000014, "BG1VOFS": 0x4000016,
            "WIN0H": 0x4000040, "WIN0V": 0x4000044, "WININ": 0x4000048, "WINOUT": 0x400004a,
            "BLDCNT": 0x4000050, "BLDALPHA": 0x4000052}.items()},
          "tasks": active_tasks(), "battlerSprites": [sprite(i) for i in ids],
          "effectSprites": effect, "activeSprites": active_sprites,
          "se1": {"songHeader": oracle.read_u32(se1_info), "status": oracle.read_u32(se1_info + 4),
                  "tracks": [{"flags": oracle.read_u8(se1_tracks + i * 0x50), "pan": s8(se1_tracks + i * 0x50 + 0x14),
                              "panX": s8(se1_tracks + i * 0x50 + 0x15)} for i in range(3)]},
          "fadedPalette": [u16(faded + i * 2) for i in range(512)],
          "unfadedPalette": [u16(unfaded + i * 2) for i in range(512)],
          "hardwarePalette": [u16(0x5000000 + i * 2) for i in range(512)],
          "hardwareOam": block(0x7000000, 0x400).hex(),
          "bgVramSha256": hashlib.sha256(block(0x6000000, 0x10000)).hexdigest()})
    frame = 0
    capture(frame)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", [])); frame += 1; capture(frame)
    first = next((i for i, r in enumerate(rows)
                  if r["tasks"] or any(r["effectSprites"][k] for k in ("claw", "lunge", "shake"))), None)
    if first is None:
        raise RuntimeError("Metal Claw move window never observed")
    # The move-owned body ends when the metallic/sound tasks have all been
    # torn down AND no effect sprites remain AND the blend is off; the first
    # such frame is the first inactive cleanup. (The transient shine->lunge
    # gap keeps effect sprites absent for a frame but the lunge appears on
    # the next capture, so we require the frame AFTER the candidate to stay
    # clean as well.)
    last = next((i for i in range(first + 1, len(rows) - 1)
                 if not rows[i]["tasks"] and rows[i]["registers"]["BLDCNT"] == 0
                 and not any(rows[i]["effectSprites"][k] for k in ("claw", "lunge", "shake"))
                 and not any(rows[i + 1]["effectSprites"][k] for k in ("claw", "lunge", "shake"))), None)
    if last is None:
        raise RuntimeError("Metal Claw inactive cleanup not observed")
    source = rows[first:last + 1]
    topology = {"tasks": sorted({x["func"]["symbol"] for r in source for x in r["tasks"] if x["func"]["symbol"]}),
                "callbacks": sorted({x["callback"]["symbol"] for r in source for x in r["battlerSprites"] + r["activeSprites"] if x["callback"]["symbol"]})}
    required_tasks = {"AnimTask_MetallicShine_Step", "Task_LoopAndPlaySE"}
    if not required_tasks <= set(topology["tasks"]):
        raise RuntimeError(f"Metal Claw topology changed: {topology}")
    result = {"schema": "metal-claw-dense-evidence/v1", "setup": setup,
              "sourceWindow": {"startFrame": source[0]["frame"], "endFrame": source[-1]["frame"], "frameCount": len(source)},
              "symbols": {**watched, **{k: v for k, v in templates.items()}},
              "topology": topology, "frames": source}
    OUTPUT.write_text(json.dumps(result, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: source {source[0]['frame']}..{source[-1]['frame']} ({len(source)} frames)")
if __name__ == "__main__":
    main()
