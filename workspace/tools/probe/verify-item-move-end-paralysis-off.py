#!/usr/bin/env python3
"""Re-check the ITEMEFFECT_MOVE_END Rank-1 paralysis-cure scout (Cheri Berry).

See docs/item-move-end-family-ground-truth.md for the full source citations
this re-derives, and docs/gate6-family-worklist.md's Rank 1 for the family
this receipt represents (191 Level-50 item-axis rows).

Fast source/fixture check (no oracle):
    python3 tools/probe/verify-item-move-end-paralysis-off.py

Live Battle Scene OFF check (runs both fixtures, asserts the holder/control
divergence):
    out_dir="$(mktemp -d /tmp/item-move-end-verify.XXXXXX)"
    python3 tools/run-mgba-probe.py "$out_dir/result.json" -- \
      python3 tools/probe/verify-item-move-end-paralysis-off.py "$out_dir/result.json"
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CHERI_FIXTURE = ROOT / "tools/battle-lab/mechanic-item-move-end-paralysis-cheri-off.json"
CONTROL_FIXTURE = ROOT / "tools/battle-lab/mechanic-item-move-end-paralysis-control-off.json"
STATUS1_PARALYSIS = 1 << 6
SRANDCOUNT_ADDR = 0x020249C0


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def source_and_fixture_checks() -> dict:
    util = (ROOT / "reference/pokeemerald/src/battle_util.c").read_text()
    commands = (ROOT / "reference/pokeemerald/src/battle_script_commands.c").read_text()
    scripts = (ROOT / "reference/pokeemerald/data/battle_scripts_1.s").read_text()

    move_end_arm = util[util.index("case ITEMEFFECT_MOVE_END:"):util.index("case ITEMEFFECT_KINGSROCK_SHELLBELL:")]
    require("case HOLD_EFFECT_CURE_PAR:" in move_end_arm, "HOLD_EFFECT_CURE_PAR left the ITEMEFFECT_MOVE_END arm")
    require(
        "gBattleMons[battler].status1 & STATUS1_PARALYSIS" in move_end_arm,
        "Cheri Berry's paralysis condition changed shape",
    )
    require(
        "gBattlescriptCurrInstr = BattleScript_BerryCureParRet;" in move_end_arm,
        "Cheri Berry no longer targets BattleScript_BerryCureParRet",
    )
    for effect in (
        "HOLD_EFFECT_CURE_PSN", "HOLD_EFFECT_CURE_BRN", "HOLD_EFFECT_CURE_FRZ",
        "HOLD_EFFECT_CURE_SLP", "HOLD_EFFECT_CURE_CONFUSION", "HOLD_EFFECT_CURE_ATTRACT",
        "HOLD_EFFECT_CURE_STATUS", "HOLD_EFFECT_RESTORE_STATS",
    ):
        require(f"case {effect}:" in move_end_arm, f"{effect} left the ITEMEFFECT_MOVE_END arm")

    require(
        commands.count("ItemBattleEffects(ITEMEFFECT_MOVE_END") == 1,
        "ITEMEFFECT_MOVE_END now has more than one dispatch site",
    )
    dispatch = commands[commands.index("case MOVEEND_ITEM_EFFECTS_ALL:"):commands.index("case MOVEEND_KINGSROCK_SHELLBELL:")]
    require(
        "if (ItemBattleEffects(ITEMEFFECT_MOVE_END, 0, FALSE))" in dispatch,
        "MOVEEND_ITEM_EFFECTS_ALL no longer calls ItemBattleEffects unconditionally for all battlers",
    )

    cure_par_script = scripts[scripts.index("BattleScript_BerryCureParRet::"):scripts.index("BattleScript_BerryCurePsnEnd2::")]
    require("removeitem BS_SCRIPTING" in cure_par_script, "Cheri Berry cure script no longer consumes the item")

    cheri = json.loads(CHERI_FIXTURE.read_text())
    control = json.loads(CONTROL_FIXTURE.read_text())
    require(cheri["profile"] == "battle-scene-off" == control["profile"], "fixture profile drifted")

    player = cheri["overrides"]["parties"]["player"][0]
    opp_cheri = cheri["overrides"]["parties"]["opponent"][0]
    opp_control = control["overrides"]["parties"]["opponent"][0]
    require(player["species"] == 172 and player["moves"] == [86, 86, 86, 86],
            "attacker is no longer Pichu carrying Thunder Wave x4")
    require(opp_cheri["species"] == 41 and opp_control["species"] == 41,
            "defender is no longer Zubat on both fixtures")
    require(opp_cheri["item"] == 133, "holder fixture no longer holds Cheri Berry (item 133)")
    require(opp_control["item"] == 0, "control fixture is no longer itemless")

    # Every other field must be identical between the two fixtures -- the
    # item is the only intended difference.
    opp_cheri_no_item = {k: v for k, v in opp_cheri.items() if k != "item"}
    opp_control_no_item = {k: v for k, v in opp_control.items() if k != "item"}
    require(opp_cheri_no_item == opp_control_no_item, "fixtures diverge on more than just the opponent's item")
    require(
        cheri["overrides"]["parties"]["player"] == control["overrides"]["parties"]["player"],
        "player parties diverge between holder and control fixtures",
    )

    species = json.loads((ROOT / "src/data/gen/species-stats.json").read_text())["species"]
    species_by_id = {row["id"]: row for row in species}
    require(species_by_id[172]["abilities"][1] == "ABILITY_NONE", "Pichu acquired a second ability")
    require(species_by_id[41]["abilities"][1] == "ABILITY_NONE", "Zubat acquired a second ability")
    require(species_by_id[172]["baseSpeed"] > species_by_id[41]["baseSpeed"],
            "Pichu is no longer faster than Zubat by base stat")

    manifest = json.loads((ROOT / "docs/gate6-coverage-manifest.json").read_text())
    level50_sets = manifest["sections"]["corpus"]["level50Sets"]
    zubat_25 = next(s for s in level50_sets if s["setId"] == 25)
    require(
        zubat_25["species"] == "SPECIES_ZUBAT" and zubat_25["item"] == "BATTLE_FRONTIER_ITEM_CHERI_BERRY",
        "worklist's Zubat set 25 / Cheri Berry carrier claim no longer holds",
    )

    return {
        "sourceArm": "9 HOLD_EFFECT_* cases present under ITEMEFFECT_MOVE_END",
        "singleDispatchSite": "MOVEEND_ITEM_EFFECTS_ALL is the only ItemBattleEffects(ITEMEFFECT_MOVE_END...) caller",
        "itemConsumption": "BattleScript_BerryCureParRet ends in removeitem BS_SCRIPTING",
        "fixtures": "Pichu (Thunder Wave x4) vs Zubat (Cheri Berry / itemless control); single-ability, ordered speeds",
        "carrierClaim": "Level-50 set 25 (Zubat / Cheri Berry) confirmed in the generated corpus",
    }


def iter_frames(trace: dict):
    frame = 0
    for segment in trace["segments"]:
        for _ in range(int(segment["frames"])):
            frame += 1
            yield frame, segment.get("buttons", [])


def run_fixture(fixture_path: Path) -> dict:
    harness = ROOT
    while not (harness / "oracle/emerald_core.py").is_file():
        require(harness.parent != harness, "could not find oracle/emerald_core.py")
        harness = harness.parent
    sys.path.insert(0, str(harness / "oracle"))
    from battle_lab import BattleLab, validate_request  # type: ignore
    from emerald_core import EmeraldOracle  # type: ignore

    request = validate_request(json.loads(fixture_path.read_text()), "battle-scene-off")
    oracle = EmeraldOracle(
        rom_path=(harness / "reference/pokeemerald/pokeemerald.gba").resolve(),
        map_path=(harness / "reference/pokeemerald/pokeemerald.map").resolve(),
        bootstrap_path=harness / "oracle/bootstrap/factory-battle-scene-off.json",
    )
    lab = BattleLab(oracle, "battle-scene-off")
    lab.prepare(request)

    battle_mons = oracle.symbols["gBattleMons"]
    opponent_base = battle_mons + 1 * 88  # BATTLE_MON_SIZE

    def opponent_status1() -> int:
        return oracle.read_u32(opponent_base + 0x4C)

    def opponent_item() -> int:
        return oracle.read_u16(opponent_base + 0x2E)

    def opponent_hp() -> int:
        return oracle.read_u16(opponent_base + 0x28)

    def opponent_pp() -> list:
        return [oracle.read_u8(opponent_base + 0x24 + i) for i in range(4)]

    def player_pp() -> list:
        return [oracle.read_u8(battle_mons + 0x24 + i) for i in range(4)]

    rand_before_total = oracle.read_u32(SRANDCOUNT_ADDR)
    initial = {"status1": opponent_status1(), "item": opponent_item(), "hp": opponent_hp()}
    paralysis_applied_frame = None
    paralysis_cured_frame = None
    item_consumed_frame = None
    was_paralyzed = False
    for frame, buttons in iter_frames(request["trace"]):
        oracle.advance(buttons)
        status1 = opponent_status1()
        if status1 & STATUS1_PARALYSIS and paralysis_applied_frame is None:
            paralysis_applied_frame = frame
        if was_paralyzed and not (status1 & STATUS1_PARALYSIS) and paralysis_cured_frame is None:
            paralysis_cured_frame = frame
        was_paralyzed = bool(status1 & STATUS1_PARALYSIS)
        if opponent_item() != initial["item"] and item_consumed_frame is None:
            item_consumed_frame = frame

    rand_after_total = oracle.read_u32(SRANDCOUNT_ADDR)
    return {
        "initialItem": initial["item"],
        "initialHp": initial["hp"],
        "finalHp": opponent_hp(),
        "finalStatus1": opponent_status1(),
        "finalItem": opponent_item(),
        "playerPp": player_pp(),
        "opponentPp": opponent_pp(),
        "paralysisAppliedFrame": paralysis_applied_frame,
        "paralysisCuredFrame": paralysis_cured_frame,
        "itemConsumedFrame": item_consumed_frame,
        "totalRandomCalls": (rand_after_total - rand_before_total) & 0xFFFFFFFF,
    }


def oracle_check(output: Path) -> dict:
    # Each mGBA core is a process-global singleton, so the holder and control
    # runs each get their own subprocess (mirrors tools/run-mgba-probe.py's
    # one-fixture-per-process convention); running both in one process
    # crashes the second EmeraldOracle() construction.
    import subprocess
    import tempfile

    def run_single(fixture_path: Path) -> dict:
        # libmgba's Python bindings can SIGSEGV during interpreter teardown
        # after the JSON is fully written (tools/run-mgba-probe.py's
        # documented, tolerated failure mode) -- accept that only once the
        # output parses as JSON, exactly like that wrapper does.
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "single.json"
            proc = subprocess.run(
                [sys.executable, str(Path(__file__).resolve()), "--single", str(fixture_path), str(out)],
                cwd=str(ROOT),
            )
            require(out.is_file(), f"{fixture_path.name} subprocess exited {proc.returncode} with no output")
            return json.loads(out.read_text())

    holder = run_single(CHERI_FIXTURE)
    control = run_single(CONTROL_FIXTURE)

    require(holder["initialItem"] == 133, f"holder did not start with Cheri Berry: {holder}")
    require(control["initialItem"] == 0, f"control did not start itemless: {control}")
    require(
        holder["paralysisAppliedFrame"] is not None and holder["paralysisAppliedFrame"] == control["paralysisAppliedFrame"],
        f"paralysis application frame diverged: holder={holder['paralysisAppliedFrame']} control={control['paralysisAppliedFrame']}",
    )
    require(holder["paralysisCuredFrame"] is not None, "holder never cured paralysis")
    require(holder["itemConsumedFrame"] is not None, "holder's Cheri Berry was never consumed")
    require(holder["finalStatus1"] == 0, f"holder finished paralyzed: {holder['finalStatus1']:#x}")
    require(holder["finalItem"] == 0, f"holder finished still holding an item: {holder['finalItem']}")
    require(control["paralysisCuredFrame"] is None, "control cured paralysis with no berry present")
    require(control["finalStatus1"] == STATUS1_PARALYSIS,
            f"control's paralysis did not persist: {control['finalStatus1']:#x}")
    require(control["finalItem"] == 0, "control finished holding a phantom item")
    require(holder["finalHp"] == holder["initialHp"] == control["finalHp"] == control["initialHp"],
            "a non-damaging move changed HP")
    require(holder["playerPp"][0] == 19 and control["playerPp"][0] == 19,
            f"Thunder Wave PP did not decrement by exactly 1 in both arms: {holder['playerPp']} {control['playerPp']}")
    require(
        sum(35 - pp for pp in holder["opponentPp"]) == 1 and sum(35 - pp for pp in control["opponentPp"]) == 1,
        f"Zubat's Tackle PP did not decrement by exactly 1 total in both arms: {holder['opponentPp']} {control['opponentPp']}",
    )
    require(
        control["totalRandomCalls"] == holder["totalRandomCalls"] + 1,
        "control's extra full-paralysis roll is no longer exactly one more Random() call than the holder run: "
        f"holder={holder['totalRandomCalls']} control={control['totalRandomCalls']}",
    )

    result = {"holder": holder, "control": control}
    output.write_text(json.dumps({"static": source_and_fixture_checks(), "oracle": result}, indent=2) + "\n")
    return result


def main() -> None:
    if len(sys.argv) == 4 and sys.argv[1] == "--single":
        # Internal worker mode: run exactly one fixture in this process and
        # dump its raw metrics as JSON. Invoked as a subprocess by
        # oracle_check() so each mGBA core gets its own process.
        metrics = run_fixture(Path(sys.argv[2]))
        Path(sys.argv[3]).write_text(json.dumps(metrics))
        return
    static = source_and_fixture_checks()
    if len(sys.argv) == 1:
        print(json.dumps(static, indent=2))
        print("PASS: source arm intact, single dispatch site, fixtures verified against the generated corpus")
        return
    if len(sys.argv) != 2:
        raise SystemExit(f"usage: {sys.argv[0]} [oracle-output.json]")
    result = oracle_check(Path(sys.argv[1]))
    print(
        "PASS: paralysis applied@"
        f"{result['holder']['paralysisAppliedFrame']} (both arms); holder cured@"
        f"{result['holder']['paralysisCuredFrame']} item-consumed@{result['holder']['itemConsumedFrame']}; "
        f"control persists status1={result['control']['finalStatus1']:#x}; "
        f"RNG calls holder={result['holder']['totalRandomCalls']} control={result['control']['totalRandomCalls']}",
        flush=True,
    )


if __name__ == "__main__":
    main()
