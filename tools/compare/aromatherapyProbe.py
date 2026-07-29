#!/usr/bin/env python3
"""Complete Scene-ON MOVE_AROMATHERAPY source/RGB lifecycle receipt."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: aromatherapyProbe.py <scenario> <output.json> <rgb-dir>")

SCENARIO, OUTPUT, RGB = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE = 312
MOVE_NAME = "Move_AROMATHERAPY"
END_NAME = "Move_FAKE_TEARS"
SMALL = "gAromatherapySmallFlowerSpriteTemplate"
BIG = "gAromatherapyBigFlowerSpriteTemplate"
STAR = "gSparklingStarsSpriteTemplate"
RING = "gBlendThinRingExpandingSpriteTemplate"
EXPECTED = {SMALL: 7, BIG: 2, STAR: 2, RING: 1}


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    ref = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    output = subprocess.run(["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    pairs = [(int(parts[0], 16), parts[2]) for line in output.splitlines() if len(parts := line.split()) == 3 and all(c in "0123456789abcdefABCDEF" for c in parts[0])]
    names = {name: address for address, name in pairs}
    by_address = {address: name for address, name in pairs}
    sy = oracle.symbols
    sprites, tasks = sy["gSprites"], sy["gTasks"]
    active, ptr = names["gAnimScriptActive"], names["sBattleAnimScriptPtr"]
    start, end = names[MOVE_NAME], names[END_NAME]
    RGB.mkdir(parents=True, exist_ok=True)

    def u16(address: int) -> int:
        return oracle.read_u8(address) | oracle.read_u8(address + 1) << 8

    def u32(address: int) -> int:
        return u16(address) | u16(address + 2) << 16

    def ident(address: int) -> str | None:
        return by_address.get(address & ~1)

    def live_sprites() -> list[dict]:
        result = []
        for slot in range(64):
            base = sprites + slot * 0x44
            if oracle.read_u8(base + 0x3e) & 1:
                result.append({"slot": slot, "template": ident(u32(base + 0x14)), "callback": ident(u32(base + 0x1c))})
        return result

    def live_tasks() -> list[str | None]:
        return [ident(u32(base)) for slot in range(16) if oracle.read_u8((base := tasks + slot * 0x28) + 4)]

    rows: list[dict] = []
    frame, started, done = 0, False, False

    def take() -> None:
        nonlocal started, done
        if done:
            return
        current_move = lab.snapshot()["engine"]["currentMove"]
        script = u32(ptr)
        if not started:
            if current_move != MOVE or not oracle.read_u8(active) or not start <= script < end:
                return
            started = True
        elif not oracle.read_u8(active):
            done = True
        rgb = oracle.screen_rgb()
        (RGB / f"{frame:05d}.rgb").write_bytes(rgb)
        rows.append({
            "frame": frame,
            "sha256": hashlib.sha256(rgb).hexdigest(),
            "gAnimScriptActive": oracle.read_u8(active),
            "script": ident(script),
            "scriptOffset": script - start if start <= script < end else None,
            "visualTaskCount": oracle.read_u8(sy["gAnimVisualTaskCount"]),
            "sprites": live_sprites(),
            "tasks": live_tasks(),
            "battlers": lab.snapshot()["battlers"],
        })

    take()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            take()
    if not rows or rows[-1]["gAnimScriptActive"]:
        raise RuntimeError(f"{MOVE_NAME} complete body through first inactive cleanup was not observed")

    def starts(template: str) -> int:
        count, prior = 0, set()
        for row in rows:
            current = {sprite["slot"] for sprite in row["sprites"] if sprite["template"] == template}
            count += len(current - prior)
            prior = current
        return count

    lifecycles = {template: starts(template) for template in EXPECTED}
    if lifecycles != EXPECTED:
        raise RuntimeError(f"{MOVE_NAME} lifecycle changed: {lifecycles}")
    topology = {
        "templates": sorted({sprite["template"] for row in rows for sprite in row["sprites"] if sprite["template"]}),
        "callbacks": sorted({sprite["callback"] for row in rows for sprite in row["sprites"] if sprite["callback"]}),
        "tasks": sorted({task for row in rows for task in row["tasks"] if task}),
    }
    if "AnimFlyingParticle_Step" not in topology["callbacks"] or "AnimTask_StatusClearedEffect" not in topology["tasks"]:
        raise RuntimeError(f"{MOVE_NAME} topology changed: {topology}")
    OUTPUT.write_text(json.dumps({
        "schema": "aromatherapy-dense-evidence/v1", "setup": setup,
        "sourceWindow": {"startFrame": rows[0]["frame"], "endFrame": rows[-1]["frame"], "frameCount": len(rows)},
        "sourceSymbols": {MOVE_NAME: start, END_NAME: end},
        "lifecycleCounts": lifecycles, "topology": topology, "frames": rows,
    }, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: source {rows[0]['frame']}..{rows[-1]['frame']} ({len(rows)} frames), lifecycles {lifecycles}")


if __name__ == "__main__":
    main()
