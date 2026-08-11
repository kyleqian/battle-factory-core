#!/usr/bin/env python3
"""Re-check the Rank-3 direct item-manipulation family's Recycle receipt.

See docs/item-manipulation-family-ground-truth.md §4/§6 for the full source
citations this re-derives, and docs/gate6-family-worklist.md's Rank 3 for the
family this receipt represents (MOVE_RECYCLE / Cmd_tryrecycleitem -- the one
move in this family with no prior oracle-level evidence). Reuses this
session's own Rank-1 Cheri Berry paralysis-cure carrier pair
(docs/item-move-end-family-ground-truth.md) as the consumed-item precondition:
Cmd_removeitem's berry-cure tail populates gBattleStruct->usedHeldItems, which
is exactly Recycle's own precondition.

Fast source/fixture check (no oracle):
    python3 tools/probe/verify-item-manipulation-recycle-off.py

Live Battle Scene OFF check (runs both fixtures, writes dense per-frame
receipts, asserts the restore/control divergence):
    out_dir="$(mktemp -d /tmp/item-manipulation-recycle-verify.XXXXXX)"
    python3 tools/run-mgba-probe.py "$out_dir/result.json" -- \
      python3 tools/probe/verify-item-manipulation-recycle-off.py "$out_dir/result.json"
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RESTORE_FIXTURE = ROOT / "tools/battle-lab/mechanic-item-manipulation-recycle-restore-off.json"
CONTROL_FIXTURE = ROOT / "tools/battle-lab/mechanic-item-manipulation-recycle-control-off.json"
RESTORE_RECEIPT = ROOT / "tools/probe/receipts/item-manipulation-recycle-restore-off.json"
CONTROL_RECEIPT = ROOT / "tools/probe/receipts/item-manipulation-recycle-control-off.json"
SRANDCOUNT_ADDR = 0x020249C0
ITEM_NONE = 0
CHERI_BERRY = 133
STATUS1_PARALYSIS = 1 << 6


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def source_and_fixture_checks() -> dict:
    commands = (ROOT / "reference/pokeemerald/src/battle_script_commands.c").read_text()
    scripts = (ROOT / "reference/pokeemerald/data/battle_scripts_1.s").read_text()
    moves_h = (ROOT / "reference/pokeemerald/src/data/battle_moves.h").read_text()

    recycle_start = commands.index("static void Cmd_tryrecycleitem(void)\n{")
    recycle = commands[recycle_start:commands.index("static void Cmd_settypetoenvironment(void)\n{", recycle_start)]
    require(
        "*usedHeldItem != ITEM_NONE && gBattleMons[gActiveBattler].item == ITEM_NONE" in recycle,
        "Cmd_tryrecycleitem's precondition changed shape",
    )
    require(
        "gBattleMons[gActiveBattler].item = gLastUsedItem;" in recycle,
        "Cmd_tryrecycleitem no longer assigns the restored item immediately (no MOVEEND_CHANGED_ITEMS deferral)",
    )
    require("*usedHeldItem = ITEM_NONE;" in recycle, "Cmd_tryrecycleitem no longer clears usedHeldItems after restoring")

    removeitem_start = commands.index("static void Cmd_removeitem(void)\n{")
    removeitem = commands[removeitem_start:removeitem_start + 500]
    require(
        "*usedHeldItem = gBattleMons[gActiveBattler].item;" in removeitem
        and "gBattleMons[gActiveBattler].item = ITEM_NONE;" in removeitem,
        "Cmd_removeitem no longer records the removed item into usedHeldItems before clearing it",
    )

    require(
        scripts.count("BattleScript_EffectRecycle::\n\tattackcanceler\n\tattackstring\n\tppreduce\n\ttryrecycleitem") == 1,
        "BattleScript_EffectRecycle changed shape",
    )
    require("accuracycheck" not in scripts[scripts.index("BattleScript_EffectRecycle::"):scripts.index("BattleScript_EffectRevenge::")], "BattleScript_EffectRecycle gained an accuracy check (would add an unexpected Random() call)")

    cure_par_script = scripts[scripts.index("BattleScript_BerryCureParRet::"):scripts.index("BattleScript_BerryCurePsnEnd2::")]
    require("removeitem BS_SCRIPTING" in cure_par_script, "Cheri Berry cure script no longer consumes the item via removeitem (Recycle's precondition source)")

    recycle_block = moves_h[moves_h.index("[MOVE_RECYCLE] ="):moves_h.index("[MOVE_RECYCLE] =") + 300]
    require(".effect = EFFECT_RECYCLE" in recycle_block, "MOVE_RECYCLE's effect is no longer EFFECT_RECYCLE")
    require(".target = MOVE_TARGET_USER" in recycle_block, "MOVE_RECYCLE is no longer self-targeted")

    restore = json.loads(RESTORE_FIXTURE.read_text())
    control = json.loads(CONTROL_FIXTURE.read_text())
    require(restore["profile"] == "battle-scene-off" == control["profile"], "fixture profile drifted")

    restore_opp = restore["overrides"]["parties"]["opponent"][0]
    control_opp = control["overrides"]["parties"]["opponent"][0]
    require(restore_opp["species"] == 41 and control_opp["species"] == 41, "Zubat is no longer the Recycle user on both fixtures")
    require(restore_opp["moves"] == [278, 278, 278, 278] == control_opp["moves"], "Zubat is no longer carrying Recycle x4 on both fixtures")
    require(restore_opp["item"] == 133, "restore fixture's Zubat no longer holds Cheri Berry (item 133)")
    require(control_opp["item"] == 0, "control fixture's Zubat is no longer itemless (never consumed anything)")
    require(restore["overrides"]["parties"]["player"][0]["moves"] == [86, 86, 86, 86], "restore fixture's Pichu is no longer carrying Thunder Wave x4")
    require(control["overrides"]["parties"]["player"][0]["moves"] == [33, 33, 33, 33], "control fixture's Pichu is no longer carrying Tackle x4 (kept inert to avoid the full-paralysis RNG hazard)")

    species = json.loads((ROOT / "src/data/gen/species-stats.json").read_text())["species"]
    species_by_id = {row["id"]: row for row in species}
    require(species_by_id[172]["baseSpeed"] > species_by_id[41]["baseSpeed"], "Pichu is no longer faster than Zubat by base stat")

    manifest = json.loads((ROOT / "docs/gate6-coverage-manifest.json").read_text())
    zubat_25 = next(s for s in manifest["sections"]["corpus"]["level50Sets"] if s["setId"] == 25)
    require(
        zubat_25["species"] == "SPECIES_ZUBAT" and zubat_25["item"] == "BATTLE_FRONTIER_ITEM_CHERI_BERRY",
        "worklist's Zubat set 25 / Cheri Berry carrier claim no longer holds",
    )

    return {
        "recyclePrecondition": "usedHeldItems[attacker] != ITEM_NONE && item == ITEM_NONE, both from Cmd_tryrecycleitem",
        "immediateAssignment": "Cmd_tryrecycleitem assigns gBattleMons[].item directly, no MOVEEND_CHANGED_ITEMS deferral (unlike Steal/Trick)",
        "removeitemLink": "Cmd_removeitem (the berry-cure scripts' tail opcode) is the only site that populates usedHeldItems",
        "fixtures": "Pichu (Thunder Wave x4 restore / Tackle x4 control) vs Zubat (Cheri Berry x Recycle x4 restore / itemless x Recycle x4 control)",
    }


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
            "opponent": {
                "item": state["battlers"]["opponent"]["item"],
                "partyItem": state["parties"]["opponent"][0]["item"],
                "status1": state["battlers"]["opponent"]["status1"],
                "hp": state["battlers"]["opponent"]["hp"],
                "pp": state["battlers"]["opponent"]["pp"],
            },
            "player": {
                "hp": state["battlers"]["player"]["hp"],
                "pp": state["battlers"]["player"]["pp"],
            },
        }

    def frames():
        f = 0
        for segment in request["trace"]["segments"]:
            for _ in range(int(segment["frames"])):
                f += 1
                yield f, segment.get("buttons", [])

    initial = compact()
    trace = [{"frame": 0, **initial}]
    rand_before_total = oracle.read_u32(SRANDCOUNT_ADDR)
    for frame, buttons in frames():
        oracle.advance(buttons)
        trace.append({"frame": frame, **compact()})
    rand_after_total = oracle.read_u32(SRANDCOUNT_ADDR)
    final = trace[-1]

    def first_frame(predicate):
        for row in trace:
            if predicate(row):
                return row["frame"]
        return None

    return {
        "fixture": str(fixture_path.relative_to(ROOT)),
        "initial": initial,
        "final": final,
        "frames": trace,
        "summary": {
            "itemTransitionFrame": first_frame(lambda r: r["opponent"]["item"] != initial["opponent"]["item"]),
            "partyItemTransitionFrame": first_frame(lambda r: r["opponent"]["partyItem"] != initial["opponent"]["partyItem"]),
            "paralysisAppliedFrame": first_frame(lambda r: r["opponent"]["status1"] & STATUS1_PARALYSIS),
            "totalRandomCalls": (rand_after_total - rand_before_total) & 0xFFFFFFFF,
        },
    }


def oracle_check(output: Path) -> dict:
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

    restore = run_single(RESTORE_FIXTURE, RESTORE_RECEIPT)
    control = run_single(CONTROL_FIXTURE, CONTROL_RECEIPT)

    require(restore["initial"]["opponent"]["item"] == CHERI_BERRY, f"restore run's Zubat did not start with Cheri Berry: {restore['initial']}")
    require(control["initial"]["opponent"]["item"] == ITEM_NONE, f"control run's Zubat did not start itemless: {control['initial']}")

    require(restore["summary"]["paralysisAppliedFrame"] is not None, "restore run: Thunder Wave never paralyzed Zubat")
    require(restore["summary"]["itemTransitionFrame"] is not None, "restore run: Zubat's live item never changed at all (expected clear-then-restore)")
    require(restore["final"]["opponent"]["status1"] == 0, f"restore run: Zubat finished paralyzed (Cheri Berry should have cured it): {restore['final']}")
    require(restore["final"]["opponent"]["item"] == CHERI_BERRY, f"restore run: Zubat did not finish holding the Recycle-restored Cheri Berry: {restore['final']}")
    require(restore["final"]["opponent"]["partyItem"] == CHERI_BERRY, "restore run: Zubat's party record does not reflect the restored Cheri Berry")

    require(control["summary"]["paralysisAppliedFrame"] is None, "control run: Zubat got paralyzed even though Pichu's move was inert Tackle")
    require(control["summary"]["itemTransitionFrame"] is None, "control run: Zubat's item changed even though it never consumed anything (Recycle should have no-op'd)")
    require(control["final"]["opponent"]["item"] == ITEM_NONE, "control run: Zubat is no longer itemless at the end")

    require(
        restore["final"]["opponent"]["hp"] == restore["initial"]["opponent"]["hp"],
        "restore run: a non-damaging move sequence (Thunder Wave + Recycle) changed Zubat's HP",
    )
    require(
        sum(10 - pp for pp in restore["final"]["opponent"]["pp"]) == 1,
        f"restore run: Zubat's Recycle PP did not decrement by exactly 1: {restore['final']['opponent']['pp']}",
    )
    require(
        sum(10 - pp for pp in control["final"]["opponent"]["pp"]) == 1,
        f"control run: Zubat's Recycle PP did not decrement by exactly 1: {control['final']['opponent']['pp']}",
    )

    result = {"restore": restore, "control": control}
    output.write_text(json.dumps({"static": source_and_fixture_checks(), "oracle": {
        "restore": {"initial": restore["initial"], "final": restore["final"], "summary": restore["summary"]},
        "control": {"initial": control["initial"], "final": control["final"], "summary": control["summary"]},
    }}, indent=2) + "\n")
    return result


def main() -> None:
    if len(sys.argv) == 4 and sys.argv[1] == "--single":
        metrics = run_fixture(Path(sys.argv[2]))
        Path(sys.argv[3]).write_text(json.dumps(metrics, indent=2) + "\n")
        return
    static = source_and_fixture_checks()
    if len(sys.argv) == 1:
        print(json.dumps(static, indent=2))
        print("PASS: source arms intact, fixtures verified against the generated corpus")
        return
    if len(sys.argv) != 2:
        raise SystemExit(f"usage: {sys.argv[0]} [oracle-output.json]")
    result = oracle_check(Path(sys.argv[1]))
    print(
        "PASS: restore run -- paralysis applied@"
        f"{result['restore']['summary']['paralysisAppliedFrame']}, Zubat's item cleared then Recycle-restored "
        f"(first transition@{result['restore']['summary']['itemTransitionFrame']}), final status1="
        f"{result['restore']['final']['opponent']['status1']} item={result['restore']['final']['opponent']['item']}; "
        f"control run -- no paralysis, no item transition, Recycle no-op'd (usedHeldItems empty)",
        flush=True,
    )


if __name__ == "__main__":
    main()
