#!/usr/bin/env python3
"""Re-check the ON_DAMAGE Static scout.

Fast source/fixture check:
    python3 tools/probe/verify-on-damage-static.py

Live Battle Scene OFF check:
    out_dir="$(mktemp -d /tmp/on-damage-static-verify.XXXXXX)"
    python3 tools/run-mgba-probe.py "$out_dir/result.json" -- \
      /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
      tools/probe/verify-on-damage-static.py "$out_dir/result.json"
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FIXTURE = ROOT / "tools/battle-lab/mechanic-on-damage-static-off.json"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def source_and_fixture_checks() -> dict:
    util = (ROOT / "reference/pokeemerald/src/battle_util.c").read_text()
    commands = (ROOT / "reference/pokeemerald/src/battle_script_commands.c").read_text()
    engine = (ROOT / "src/engine/battleScriptMoveEndOpcode.ts").read_text()
    rules = (ROOT / "src/engine/battleScriptRulesContext.ts").read_text()
    moves = json.loads((ROOT / "src/data/gen/moves.json").read_text())["moves"]
    species = json.loads((ROOT / "src/data/gen/species-stats.json").read_text())["species"]
    fixture = json.loads(FIXTURE.read_text())

    on_damage = util[util.index("case ABILITYEFFECT_ON_DAMAGE:"):util.index("case ABILITYEFFECT_IMMUNITY:")]
    for spelling in (
        "ABILITY_COLOR_CHANGE", "ABILITY_ROUGH_SKIN", "ABILITY_EFFECT_SPORE",
        "ABILITY_POISON_POINT", "ABILITY_STATIC", "ABILITY_FLAME_BODY", "ABILITY_CUTE_CHARM",
    ):
        require(spelling in on_damage, f"{spelling} left the source ON_DAMAGE dispatcher")
    require("ABILITY_OBLIVIOUS" in on_damage, "Cute Charm's Oblivious dependency disappeared")
    require("(Random() % 3) == 0" in on_damage, "Static's exact source RNG expression changed")
    require(
        "gBattleCommunication[MOVE_EFFECT_BYTE] = MOVE_EFFECT_AFFECTS_USER | MOVE_EFFECT_PARALYSIS;"
        in on_damage,
        "Static no longer targets paralysis at the attacker",
    )
    require(
        "AbilityBattleEffects(ABILITYEFFECT_ON_DAMAGE, gBattlerTarget, 0, 0, 0)" in commands,
        "Cmd_moveend no longer calls the target ON_DAMAGE dispatcher",
    )
    require(
        "case MOVEEND_ON_DAMAGE_ABILITIES" in engine
        and "unsupportedBranch(" in engine[engine.index("case MOVEEND_ON_DAMAGE_ABILITIES"):],
        "engine state-3 barrier changed; refresh the frozen scout status",
    )
    require(
        'flags.includes("FLAG_MIRROR_MOVE_AFFECTED")' in rules
        and 'flags.includes("FLAG_MAKES_CONTACT")' not in rules,
        "shared numeric move-flag resolver changed; refresh contact-field finding",
    )

    move_by_id = {row["id"]: row for row in moves}
    species_by_id = {row["id"]: row for row in species}
    parties = fixture["overrides"]["parties"]
    staged = parties["player"] + parties["opponent"]
    require(fixture["profile"] == "battle-scene-off", "fixture profile drifted")
    require(move_by_id[1]["move"] == "MOVE_POUND" and "FLAG_MAKES_CONTACT" in move_by_id[1]["flags"],
            "Pound is no longer the contact stimulus")
    require(move_by_id[129]["move"] == "MOVE_SWIFT" and "FLAG_MAKES_CONTACT" not in move_by_id[129]["flags"],
            "Swift is no longer the non-contact control")
    require(all(mon["moves"] == [129] * 4 for mon in parties["opponent"]),
            "opponent move slots are not all identical Swift")
    ability_rows = [species_by_id[mon["species"]]["abilities"] for mon in staged]
    require(all(row[1] == "ABILITY_NONE" for row in ability_rows),
            "fixture acquired a dual-ability species (would shift AI get_ability draws)")
    base_speeds = [species_by_id[mon["species"]]["baseSpeed"] for mon in staged]
    require(len(base_speeds) == len(set(base_speeds)), "fixture acquired a base-Speed tie")
    require(ability_rows[3][0] == "ABILITY_STATIC", "active target is no longer a Static carrier")

    return {
        "sourceDispatcher": "7 cases plus Oblivious only as Cute Charm dependency",
        "engine": "MOVEEND_ON_DAMAGE_ABILITIES registered and barriered",
        "stimulus": "Swellow Pound -> Pikachu Static; opponent slots all Swift",
        "baseSpeeds": base_speeds,
    }


def iter_frames(trace: dict):
    frame = 0
    for segment in trace["segments"]:
        for _ in range(int(segment["frames"])):
            frame += 1
            yield frame, segment.get("buttons", [])


def oracle_check(output: Path) -> dict:
    harness = ROOT
    while not (harness / "oracle/emerald_core.py").is_file():
        require(harness.parent != harness, "could not find oracle/emerald_core.py")
        harness = harness.parent
    sys.path.insert(0, str(harness / "oracle"))
    from battle_lab import BattleLab, validate_request  # type: ignore
    from emerald_core import EmeraldOracle  # type: ignore

    request = validate_request(json.loads(FIXTURE.read_text()), "battle-scene-off")
    oracle = EmeraldOracle(
        rom_path=(harness / "reference/pokeemerald/pokeemerald.gba").resolve(),
        map_path=(harness / "reference/pokeemerald/pokeemerald.map").resolve(),
        bootstrap_path=harness / "oracle/bootstrap/factory-battle-scene-off.json",
    )
    setup = BattleLab(oracle, "battle-scene-off").prepare(request)
    require([m["species"] for m in setup["player"]] == [95, 240, 153],
            "unexpected legal player-set staging basis")

    rand_count_addr = 0x020249C0  # src/random.c's static sRandCount
    previous = oracle.read_u32(rand_count_addr)
    rand_frames: list[dict] = []
    for frame, buttons in iter_frames(request["trace"]):
        oracle.advance(buttons)
        current = oracle.read_u32(rand_count_addr)
        delta = (current - previous) & 0xFFFFFFFF
        if delta:
            rand_frames.append({"frame": frame, "count": delta})
        previous = current

    expected = [
        {"frame": 42, "count": 1},   # accuracy
        {"frame": 64, "count": 1},   # critical
        {"frame": 67, "count": 1},   # damage adjustment
        {"frame": 195, "count": 1},  # move secondary-effect chance
        {"frame": 198, "count": 1},  # Static
    ]
    require(rand_frames == expected, f"unexpected Static-window RNG ledger: {rand_frames}")
    battle_mons = oracle.symbols["gBattleMons"]
    attacker_status1 = oracle.read_u32(battle_mons + 0x4C)
    target_hp = oracle.read_u16(battle_mons + 0x58 + 0x28)
    require(attacker_status1 == (1 << 6), f"attacker status1 is not paralysis: {attacker_status1:#x}")
    require(target_hp == 61, f"contact hit did not land on surviving Pikachu: hp={target_hp}")

    result = {
        "profile": "battle-scene-off",
        "randFrames": rand_frames,
        "procRollPosition": 5,
        "procFired": True,
        "attackerStatus1": attacker_status1,
        "attackerStatus": "paralysis",
        "targetHp": target_hp,
    }
    output.write_text(json.dumps({"static": source_and_fixture_checks(), "oracle": result}, indent=2) + "\n")
    return result


def main() -> None:
    static = source_and_fixture_checks()
    if len(sys.argv) == 1:
        print(json.dumps(static, indent=2))
        print("PASS: ON_DAMAGE Static source, consumer barrier, and fixture are unchanged")
        return
    if len(sys.argv) != 2:
        raise SystemExit(f"usage: {sys.argv[0]} [oracle-output.json]")
    result = oracle_check(Path(sys.argv[1]))
    print(
        f"PASS: Static roll position {result['procRollPosition']}; "
        f"proc={result['procFired']}; attacker={result['attackerStatus']}",
        flush=True,
    )


if __name__ == "__main__":
    main()
