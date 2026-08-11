#!/usr/bin/env python3
"""Re-check the Rank-3 direct item-manipulation family's Covet representative.

See docs/item-manipulation-family-ground-truth.md for the full source
citations this re-derives, and docs/gate6-family-worklist.md's Rank 3 for the
family this receipt represents (MOVE_COVET / MOVE_EFFECT_STEAL_ITEM, one of
the four moves whose entry script writes gBattleMons[].item directly instead
of going through ItemBattleEffects).

Fast source/fixture check (no oracle):
    python3 tools/probe/verify-item-manipulation-covet-off.py

Live Battle Scene OFF check (runs both fixtures, writes dense per-frame
receipts, asserts the steal/control divergence):
    out_dir="$(mktemp -d /tmp/item-manipulation-covet-verify.XXXXXX)"
    python3 tools/run-mgba-probe.py "$out_dir/result.json" -- \
      python3 tools/probe/verify-item-manipulation-covet-off.py "$out_dir/result.json"
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STEAL_FIXTURE = ROOT / "tools/battle-lab/mechanic-item-manipulation-covet-steal-off.json"
CONTROL_FIXTURE = ROOT / "tools/battle-lab/mechanic-item-manipulation-covet-control-off.json"
STEAL_RECEIPT = ROOT / "tools/probe/receipts/item-manipulation-covet-steal-off.json"
CONTROL_RECEIPT = ROOT / "tools/probe/receipts/item-manipulation-covet-control-off.json"
SRANDCOUNT_ADDR = 0x020249C0
ITEM_NONE = 0
CHERI_BERRY = 133
WHITE_HERB = 180


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def source_and_fixture_checks() -> dict:
    commands = (ROOT / "reference/pokeemerald/src/battle_script_commands.c").read_text()
    scripts = (ROOT / "reference/pokeemerald/data/battle_scripts_1.s").read_text()
    moves_h = (ROOT / "reference/pokeemerald/src/data/battle_moves.h").read_text()

    steal_start = commands.index("case MOVE_EFFECT_STEAL_ITEM:")
    steal_arm = commands[steal_start:commands.index("case MOVE_EFFECT_PREVENT_ESCAPE:", steal_start)]
    require("BATTLE_TYPE_TRAINER_HILL" in steal_arm, "MOVE_EFFECT_STEAL_ITEM lost its Trainer Hill guard")
    require("ABILITY_STICKY_HOLD" in steal_arm, "MOVE_EFFECT_STEAL_ITEM lost its Sticky Hold guard")
    require(
        "gBattleMons[gBattlerAttacker].item != ITEM_NONE" in steal_arm,
        "the occupied-attacker guard (this receipt's control condition) changed shape",
    )
    require("ITEM_ENIGMA_BERRY" in steal_arm and "IS_ITEM_MAIL" in steal_arm, "Enigma Berry / Mail guards left the steal arm")
    require(
        "gLastUsedItem = *changedItem = gBattleMons[gBattlerTarget].item;" in steal_arm
        and "gBattleMons[gBattlerTarget].item = ITEM_NONE;" in steal_arm,
        "the target-side item transfer into gBattleStruct->changedItems changed shape",
    )

    moveend = commands[commands.index("case MOVEEND_CHANGED_ITEMS:"):commands.index("case MOVEEND_ITEM_EFFECTS_ALL:")]
    require(
        "gBattleMons[i].item = *changedItem;" in moveend,
        "MOVEEND_CHANGED_ITEMS no longer commits gBattleStruct->changedItems into gBattleMons[].item",
    )

    require(commands.count("ItemBattleEffects(ITEMEFFECT_MOVE_END") >= 1, "sanity: ITEMEFFECT_MOVE_END dispatch missing")

    require(
        scripts.count("BattleScript_EffectThief::\n\tsetmoveeffect MOVE_EFFECT_STEAL_ITEM\n\tgoto BattleScript_EffectHit") == 1,
        "BattleScript_EffectThief (MOVE_COVET's entry script) changed shape",
    )
    require("seteffectwithchance" in scripts[scripts.index("BattleScript_EffectHit::"):scripts.index("BattleScript_MoveEnd::")], "BattleScript_EffectHit no longer rolls seteffectwithchance before moveend")

    seteffect_start = commands.index("static void Cmd_seteffectwithchance(void)\n{")
    seteffect = commands[seteffect_start:commands.index("static void Cmd_seteffectprimary(void)", seteffect_start)]
    require(
        "Random() % 100 < percentChance" in seteffect,
        "Cmd_seteffectwithchance no longer rolls Random() for the secondary-effect chance gate",
    )

    covet_block = moves_h[moves_h.index("[MOVE_COVET] ="):moves_h.index("[MOVE_COVET] =") + 300]
    require(".effect = EFFECT_THIEF" in covet_block, "MOVE_COVET's effect is no longer EFFECT_THIEF")
    require(".accuracy = 100" in covet_block, "MOVE_COVET is no longer a 100-accuracy move")
    require(".secondaryEffectChance = 100" in covet_block, "MOVE_COVET's steal chance is no longer guaranteed-on-hit")

    steal = json.loads(STEAL_FIXTURE.read_text())
    control = json.loads(CONTROL_FIXTURE.read_text())
    require(steal["profile"] == "battle-scene-off" == control["profile"], "fixture profile drifted")

    player_steal = steal["overrides"]["parties"]["player"][0]
    player_control = control["overrides"]["parties"]["player"][0]
    opp_steal = steal["overrides"]["parties"]["opponent"][0]
    opp_control = control["overrides"]["parties"]["opponent"][0]
    require(player_steal["species"] == 289 and player_steal["moves"] == [343, 343, 343, 343], "attacker is no longer Linoone carrying Covet x4")
    require(opp_steal["species"] == 41 and opp_control["species"] == 41, "defender is no longer Zubat on both fixtures")
    require(player_steal["item"] == 0, "steal fixture's attacker is no longer itemless")
    require(player_control["item"] == 180, "control fixture's attacker no longer holds White Herb (item 180)")
    require(opp_steal["item"] == 133 and opp_control["item"] == 133, "defender is no longer holding Cheri Berry (item 133) on both fixtures")

    player_steal_no_item = {k: v for k, v in player_steal.items() if k != "item"}
    player_control_no_item = {k: v for k, v in player_control.items() if k != "item"}
    require(player_steal_no_item == player_control_no_item, "fixtures diverge on more than just the attacker's item")
    require(steal["overrides"]["parties"]["opponent"] == control["overrides"]["parties"]["opponent"], "opponent parties diverge between steal and control fixtures")

    species = json.loads((ROOT / "src/data/gen/species-stats.json").read_text())["species"]
    species_by_id = {row["id"]: row for row in species}
    require(species_by_id[289]["abilities"][1] == "ABILITY_NONE", "Linoone acquired a second ability")
    require(species_by_id[41]["abilities"][1] == "ABILITY_NONE", "Zubat acquired a second ability")
    require(species_by_id[289]["baseSpeed"] > species_by_id[41]["baseSpeed"], "Linoone is no longer faster than Zubat by base stat")

    manifest = json.loads((ROOT / "docs/gate6-coverage-manifest.json").read_text())
    level50_sets = manifest["sections"]["corpus"]["level50Sets"]
    linoone_203 = next(s for s in level50_sets if s["setId"] == 203)
    zubat_25 = next(s for s in level50_sets if s["setId"] == 25)
    require(
        linoone_203["species"] == "SPECIES_LINOONE" and linoone_203["item"] == "BATTLE_FRONTIER_ITEM_WHITE_HERB"
        and "MOVE_COVET" in linoone_203["moves"],
        "worklist's Linoone set 203 / White Herb / Covet carrier claim no longer holds",
    )
    require(
        zubat_25["species"] == "SPECIES_ZUBAT" and zubat_25["item"] == "BATTLE_FRONTIER_ITEM_CHERI_BERRY",
        "worklist's Zubat set 25 / Cheri Berry carrier claim no longer holds",
    )

    return {
        "occupiedAttackerGuard": "gBattleMons[gBattlerAttacker].item != ITEM_NONE short-circuits the steal (this receipt's control condition)",
        "moveendCommit": "MOVEEND_CHANGED_ITEMS commits gBattleStruct->changedItems into gBattleMons[].item before MOVEEND_ITEM_EFFECTS_ALL",
        "secondaryEffectRoll": "Cmd_seteffectwithchance always rolls Random() for the 100% steal chance -- not a certain-effect bypass",
        "fixtures": "Linoone (Covet x4, itemless vs White-Herb-holding) vs Zubat (Cheri Berry); single-ability, ordered speeds (100 vs 55 base)",
        "carrierClaims": "Level-50 set 203 (Linoone/White Herb/Covet) and set 25 (Zubat/Cheri Berry) confirmed in the generated corpus",
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

    def compact() -> dict:
        state = lab.snapshot()
        return {
            "rngValue": state["rngValue"],
            "player": {
                "item": state["battlers"]["player"]["item"],
                "partyItem": state["parties"]["player"][0]["item"],
                "hp": state["battlers"]["player"]["hp"],
                "pp": state["battlers"]["player"]["pp"],
            },
            "opponent": {
                "item": state["battlers"]["opponent"]["item"],
                "partyItem": state["parties"]["opponent"][0]["item"],
                "hp": state["battlers"]["opponent"]["hp"],
                "pp": state["battlers"]["opponent"]["pp"],
            },
        }

    initial = compact()
    frames = [{"frame": 0, **initial}]
    rand_before_total = oracle.read_u32(SRANDCOUNT_ADDR)
    for frame, buttons in iter_frames(request["trace"]):
        oracle.advance(buttons)
        frames.append({"frame": frame, **compact()})
    rand_after_total = oracle.read_u32(SRANDCOUNT_ADDR)
    final = frames[-1]

    def first_frame(predicate):
        for row in frames:
            if predicate(row):
                return row["frame"]
        return None

    return {
        "fixture": str(fixture_path.relative_to(ROOT)),
        "initial": initial,
        "final": final,
        "frames": frames,
        "summary": {
            "attackerItemTransitionFrame": first_frame(lambda r: r["player"]["item"] != initial["player"]["item"]),
            "attackerPartyItemTransitionFrame": first_frame(lambda r: r["player"]["partyItem"] != initial["player"]["partyItem"]),
            "defenderItemTransitionFrame": first_frame(lambda r: r["opponent"]["item"] != initial["opponent"]["item"]),
            "defenderPartyItemTransitionFrame": first_frame(lambda r: r["opponent"]["partyItem"] != initial["opponent"]["partyItem"]),
            "totalRandomCalls": (rand_after_total - rand_before_total) & 0xFFFFFFFF,
        },
    }


def oracle_check(output: Path) -> dict:
    # Each mGBA core is a process-global singleton (tools/run-mgba-probe.py's
    # documented convention, also used by verify-item-move-end-paralysis-off.py)
    # -- one subprocess per fixture, since a second EmeraldOracle() in the same
    # process crashes.
    import subprocess
    import tempfile

    def run_single(fixture_path: Path, receipt_path: Path) -> dict:
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "single.json"
            proc = subprocess.run(
                [sys.executable, str(Path(__file__).resolve()), "--single", str(fixture_path), str(out)],
                cwd=str(ROOT),
            )
            require(out.is_file(), f"{fixture_path.name} subprocess exited {proc.returncode} with no output")
            result = json.loads(out.read_text())
            receipt_path.write_text(json.dumps(result, indent=2) + "\n")
            return result

    steal = run_single(STEAL_FIXTURE, STEAL_RECEIPT)
    control = run_single(CONTROL_FIXTURE, CONTROL_RECEIPT)

    require(steal["initial"]["player"]["item"] == ITEM_NONE, f"steal run's attacker did not start itemless: {steal['initial']}")
    require(control["initial"]["player"]["item"] == WHITE_HERB, f"control run's attacker did not start holding White Herb: {control['initial']}")
    require(steal["initial"]["opponent"]["item"] == CHERI_BERRY == control["initial"]["opponent"]["item"], "defender did not start holding Cheri Berry in both arms")

    require(steal["summary"]["attackerItemTransitionFrame"] is not None, "steal run: attacker's live item never changed (Covet never stole anything)")
    require(steal["final"]["player"]["item"] == CHERI_BERRY, f"steal run: attacker did not finish holding the stolen Cheri Berry: {steal['final']}")
    require(steal["final"]["opponent"]["item"] == ITEM_NONE, f"steal run: defender did not finish itemless: {steal['final']}")
    require(steal["summary"]["attackerPartyItemTransitionFrame"] is not None, "steal run: attacker's PARTY record item never synced to the stolen item")
    require(steal["final"]["player"]["partyItem"] == CHERI_BERRY, "steal run: attacker's party record does not reflect the stolen Cheri Berry")
    require(steal["summary"]["defenderPartyItemTransitionFrame"] is not None, "steal run: defender's PARTY record item never synced to itemless")
    require(steal["final"]["opponent"]["partyItem"] == ITEM_NONE, "steal run: defender's party record still shows the stolen Cheri Berry")

    require(control["summary"]["attackerItemTransitionFrame"] is None, "control run: attacker's item changed even though it started occupied (steal should be blocked)")
    require(control["summary"]["defenderItemTransitionFrame"] is None, "control run: defender's item changed even though the steal should be blocked")
    require(control["final"]["player"]["item"] == WHITE_HERB, "control run: attacker no longer holds its own White Herb")
    require(control["final"]["opponent"]["item"] == CHERI_BERRY, "control run: defender lost its Cheri Berry despite the occupied-attacker guard")

    require(
        steal["final"]["opponent"]["hp"] < steal["initial"]["opponent"]["hp"],
        "steal run: Covet dealt no damage (defender HP unchanged)",
    )
    require(
        steal["final"]["opponent"]["hp"] == control["final"]["opponent"]["hp"]
        and steal["initial"]["opponent"]["hp"] == control["initial"]["opponent"]["hp"],
        f"Covet's damage to the defender diverged between the steal and control arms: "
        f"steal={steal['initial']['opponent']['hp']}->{steal['final']['opponent']['hp']} "
        f"control={control['initial']['opponent']['hp']}->{control['final']['opponent']['hp']}",
    )
    require(
        steal["final"]["player"]["pp"][0] == control["final"]["player"]["pp"][0] == 39,
        f"Covet PP did not decrement by exactly 1 in both arms: steal={steal['final']['player']['pp']} control={control['final']['player']['pp']}",
    )
    require(
        sum(35 - pp for pp in steal["final"]["opponent"]["pp"]) == sum(35 - pp for pp in control["final"]["opponent"]["pp"]) == 1,
        f"Zubat's Tackle PP did not decrement by exactly 1 total in both arms: "
        f"steal={steal['final']['opponent']['pp']} control={control['final']['opponent']['pp']}",
    )
    require(
        steal["summary"]["totalRandomCalls"] == control["summary"]["totalRandomCalls"],
        "steal and control arms no longer consume identical Random() call counts -- "
        f"steal={steal['summary']['totalRandomCalls']} control={control['summary']['totalRandomCalls']} "
        "(the occupied-attacker guard is a deterministic branch inside SetMoveEffect, not an extra RNG roll, "
        "so this family's control has no RNG divergence at all, unlike Rank 1's full-paralysis-roll divergence)",
    )

    result = {"steal": steal, "control": control}
    output.write_text(json.dumps({"static": source_and_fixture_checks(), "oracle": {
        "steal": {"initial": steal["initial"], "final": steal["final"], "summary": steal["summary"]},
        "control": {"initial": control["initial"], "final": control["final"], "summary": control["summary"]},
    }}, indent=2) + "\n")
    return result


def main() -> None:
    if len(sys.argv) == 4 and sys.argv[1] == "--single":
        # Internal worker mode: run exactly one fixture in this process and
        # dump its dense per-frame trace as JSON. Invoked as a subprocess by
        # oracle_check() so each mGBA core gets its own process; the output
        # doubles as this family's committed receipt (tools/probe/receipts/).
        metrics = run_fixture(Path(sys.argv[2]))
        Path(sys.argv[3]).write_text(json.dumps(metrics, indent=2) + "\n")
        return
    static = source_and_fixture_checks()
    if len(sys.argv) == 1:
        print(json.dumps(static, indent=2))
        print("PASS: source arms intact, single moveend-commit site, fixtures verified against the generated corpus")
        return
    if len(sys.argv) != 2:
        raise SystemExit(f"usage: {sys.argv[0]} [oracle-output.json]")
    result = oracle_check(Path(sys.argv[1]))
    print(
        "PASS: steal run attacker acquires Cheri Berry@"
        f"{result['steal']['summary']['attackerItemTransitionFrame']} (party-synced@{result['steal']['summary']['attackerPartyItemTransitionFrame']}), "
        f"defender loses it@{result['steal']['summary']['defenderItemTransitionFrame']}; "
        "control run: no item transition on either side; "
        f"defender HP {result['steal']['initial']['opponent']['hp']}->{result['steal']['final']['opponent']['hp']} identical both arms; "
        f"RNG calls steal={result['steal']['summary']['totalRandomCalls']} control={result['control']['summary']['totalRandomCalls']} (equal)",
        flush=True,
    )


if __name__ == "__main__":
    main()
