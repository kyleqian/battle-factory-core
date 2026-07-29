#!/usr/bin/env python3
"""Read-only Battle Scene OFF receipts for AbilityBattleEffects ON_SWITCHIN.

The battle lab performs the only writes (legal complete-party construction).
This probe samples the ROM after every emulated frame and records the entry
hook fields, including controller command bytes which preserve print ordering.
"""
from __future__ import annotations
import json, sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit(f"usage: {sys.argv[0]} SCENARIO.json OUTPUT.json")
SCENARIO, OUTPUT = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
def harness_root(start: Path) -> Path:
    for path in (start, *start.parents):
        if (path / "oracle" / "emerald_core.py").is_file(): return path
    raise SystemExit("could not locate oracle harness")
ORACLE = harness_root(ROOT) / "oracle"; sys.path.insert(0, str(ORACLE))
from battle_lab import BattleLab, validate_request
from emerald_core import EmeraldOracle

MON_SIZE = 0x58
SRANDCOUNT = 0x020249C0 # static in src/random.c, intentionally not map-exported
def main() -> None:
    raw = json.loads(SCENARIO.read_text())
    if raw.get("profile") != "battle-scene-off": raise ValueError("requires battle-scene-off")
    request = validate_request(raw, "battle-scene-off")
    ref = (ROOT / "reference" / "pokeemerald").resolve()
    emu = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", ORACLE / "bootstrap" / "factory-battle-scene-off.json")
    s = emu.symbols
    def u16(a: int) -> int: return emu.read_u8(a) | emu.read_u8(a + 1) << 8
    def u32(a: int) -> int: return sum(emu.read_u8(a + i) << (8 * i) for i in range(4))
    def snap() -> dict[str, object]:
        mons, buffers = s["gBattleMons"], s["gBattleBufferA"]
        return {
            "sRandCount": u32(SRANDCOUNT), "gRngValue": u32(s["gRngValue"]),
            "weather": u32(s["gBattleWeather"]), "lastUsedAbility": emu.read_u8(s["gLastUsedAbility"]),
            "abilities": [emu.read_u8(mons + MON_SIZE * i + 0x20) for i in range(2)],
            "attackStages": [emu.read_u8(mons + MON_SIZE * i + 0x18) for i in range(2)],
            "controllerA": [[emu.read_u8(buffers + 0x200 * i + j) for j in range(4)] for i in range(2)],
            "displayedStringRaw": [emu.read_u8(s["gDisplayedStringBattle"] + i) for i in range(48)],
        }
    changes=[]; prior=None; tick=0
    def cap() -> None:
        nonlocal prior
        now=snap()
        if now != prior: changes.append({"tick": tick, **now}); prior=now
    # BattleLab deliberately lets the stock battle initialisation run, which
    # includes the first ON_SWITCHIN dispatch.  Wrap advance *before* prepare
    # so this receipt observes that legal construction-time sequence too.
    original_advance = emu.advance
    def observed_advance(buttons=()):
        nonlocal tick
        result = original_advance(buttons); tick += 1; cap(); return result
    emu.advance = observed_advance
    cap(); BattleLab(emu, "battle-scene-off").prepare(request)
    for segment in request["trace"]["segments"]:
        for _ in range(int(segment["frames"])):
            emu.advance(segment.get("buttons", []))
    OUTPUT.write_text(json.dumps({"profile":"battle-scene-off", "scenario":SCENARIO.name,
        "readOnlyAfterConstruction":True, "totalFrames":tick, "transitions":changes}, indent=2) + "\n")
main()
