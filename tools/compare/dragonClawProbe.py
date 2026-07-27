#!/usr/bin/env python3
"""Dense MOVE_DRAGON_CLAW task/sprite/OAM/register/palette/RGB evidence."""
from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: dragonClawProbe.py <scenario> <output.json> <rgb-dir>")
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
    sprites, tasks = oracle.symbols["gSprites"], oracle.symbols["gTasks"]
    battler_ids = oracle.symbols["gBattlerSpriteIds"]
    faded, unfaded = oracle.symbols["gPlttBufferFaded"], oracle.symbols["gPlttBufferUnfaded"]
    templates = {
        name: oracle.symbols[name] for name in (
            "gFireSpinSpriteTemplate", "gClawSlashSpriteTemplate",
            "gHorizontalLungeSpriteTemplate", "gShakeMonOrPlatformSpriteTemplate",
        )
    }
    nm = subprocess.run(["arm-none-eabi-nm", str(reference / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    all_symbols = {line.split()[2]: int(line.split()[0], 16) | 1 for line in nm.splitlines() if len(line.split()) == 3}
    watched = {
        name: all_symbols[name] for name in (
            "AnimTask_BlendBattleAnimPal", "AnimTask_BlendBattleAnimPal_Step",
            "AnimTask_ShakeMon", "AnimTask_ShakeMon_Step",
            "SoundTask_PlaySE1WithPanning", "AnimParticleInVortex",
            "AnimParticleInVortex_Step", "AnimClawSlash",
            "AnimHorizontalLunge", "AnimShakeMonOrBattlePlatforms",
            "AnimShakeMonOrBattlePlatforms_Step",
        ) if name in all_symbols
    }
    def u16(a: int) -> int: return oracle.read_u8(a) | (oracle.read_u8(a + 1) << 8)
    def s16(a: int) -> int:
        v = u16(a)
        return v - 0x10000 if v >= 0x8000 else v
    def block(addr: int, size: int) -> bytes: return bytes(oracle.read_u8(addr + i) for i in range(size))
    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        return {
            "slot": slot, "template": oracle.read_u32(base + 0x14),
            "callback": oracle.read_u32(base + 0x1c), "raw": block(base, 0x44).hex(),
            "x": s16(base + 0x20), "y": s16(base + 0x22),
            "x2": s16(base + 0x24), "y2": s16(base + 0x26),
            "animNum": oracle.read_u8(base + 0x2b),
            "data": [s16(base + 0x2e + i * 2) for i in range(8)],
        }
    def active_tasks() -> list[dict]:
        return [{
            "slot": slot, "func": oracle.read_u32(tasks + slot * 0x28),
            "data": [s16(tasks + slot * 0x28 + 8 + i * 2) for i in range(16)],
        } for slot in range(16) if oracle.read_u8(tasks + slot * 0x28 + 4)]
    rows = []
    def capture(frame: int) -> None:
        snap = lab.snapshot()
        if snap["engine"]["currentMove"] != 337:
            return
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        ids = [oracle.read_u8(battler_ids + i) for i in range(2)]
        active = [slot for slot in range(64) if oracle.read_u8(sprites + slot * 0x44 + 0x3e) & 1]
        active_sprites = [sprite(i) for i in active]
        rows.append({
            "frame": frame, "sha256": hashlib.sha256(rgb).hexdigest(),
            "attacker": snap["engine"]["activeBattler"],
            "player": snap["battlers"]["player"], "opponent": snap["battlers"]["opponent"],
            "registers": {name: u16(addr) for name, addr in {
                "DISPCNT": 0x4000000, "BLDCNT": 0x4000050,
                "BLDALPHA": 0x4000052, "BLDY": 0x4000054,
            }.items()},
            "tasks": active_tasks(), "battlerSprites": [sprite(i) for i in ids],
            "activeSprites": active_sprites,
            "effectSprites": {
                name: [value for value in active_sprites if value["template"] == template]
                for name, template in templates.items()
            },
            "fadedPalette": [u16(faded + i * 2) for i in range(512)],
            "unfadedPalette": [u16(unfaded + i * 2) for i in range(512)],
            "hardwarePalette": [u16(0x5000000 + i * 2) for i in range(512)],
            "hardwareOam": block(0x7000000, 0x400).hex(),
        })
    frame = 0
    capture(frame)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            capture(frame)
    OUTPUT.write_text(json.dumps({
        "schema": "dragon-claw-dense-evidence/v1", "setup": setup,
        "symbols": {**watched, **templates}, "frames": rows,
    }) + "\n")
    print(f"wrote {OUTPUT} ({len(rows)} move frames; {rows[0]['frame'] if rows else '-'}..{rows[-1]['frame'] if rows else '-'})")
main()
