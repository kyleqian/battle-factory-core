#!/usr/bin/env python3
"""Re-check the Rank-4 direct ability-manipulation family's Role Play representative.

See docs/ability-manipulation-family-ground-truth.md for the full source
citations this re-derives (both Cmd_trycopyability and Cmd_tryswapabilities),
and docs/gate6-family-worklist.md's Rank 4 for the family this receipt
represents. Skill Swap already has committed oracle evidence
(docs/skill-swap-off-evidence.md, tools/battle-lab/mechanic-skill-swap-girafarig-shuckle-off.json,
tools/battle-lab/mechanic-immunity-limber-skill-swap-off.json) so this receipt
only stages the genuinely missing half: MOVE_ROLE_PLAY / Cmd_trycopyability.

Fast source/fixture check (no oracle):
    python3 tools/probe/verify-ability-manipulation-roleplay-off.py

Live Battle Scene OFF check (runs both fixtures, writes dense per-frame
receipts, asserts the copy/blocked divergence):
    out_dir="$(mktemp -d /tmp/ability-manipulation-roleplay-verify.XXXXXX)"
    python3 tools/run-mgba-probe.py "$out_dir/result.json" -- \
      python3 tools/probe/verify-ability-manipulation-roleplay-off.py "$out_dir/result.json"
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
COPY_FIXTURE = ROOT / "tools/battle-lab/mechanic-ability-manipulation-roleplay-copy-off.json"
CONTROL_FIXTURE = ROOT / "tools/battle-lab/mechanic-ability-manipulation-roleplay-control-off.json"
COPY_RECEIPT = ROOT / "tools/probe/receipts/ability-manipulation-roleplay-copy-off.json"
CONTROL_RECEIPT = ROOT / "tools/probe/receipts/ability-manipulation-roleplay-control-off.json"
SRANDCOUNT_ADDR = 0x020249C0
ABILITY_SYNCHRONIZE = 28
ABILITY_LIMBER = 7
ABILITY_WONDER_GUARD = 25


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def source_and_fixture_checks() -> dict:
    commands = (ROOT / "reference/pokeemerald/src/battle_script_commands.c").read_text()
    scripts = (ROOT / "reference/pokeemerald/data/battle_scripts_1.s").read_text()
    moves_h = (ROOT / "reference/pokeemerald/src/data/battle_moves.h").read_text()

    copy_start = commands.index("static void Cmd_trycopyability(void)\n{")
    copy_fn = commands[copy_start:commands.index("static void Cmd_trywish(void)", copy_start)]
    require("ability != ABILITY_NONE" in copy_fn, "Cmd_trycopyability lost its ABILITY_NONE target guard")
    require("ability != ABILITY_WONDER_GUARD" in copy_fn, "Cmd_trycopyability lost its Wonder Guard target guard")
    require(
        "gBattleMons[gBattlerAttacker].ability = gBattleMons[gBattlerTarget].ability;" in copy_fn,
        "Cmd_trycopyability no longer overwrites the attacker's active ability from the target's",
    )
    require(
        "gLastUsedAbility = gBattleMons[gBattlerTarget].ability;" in copy_fn,
        "Cmd_trycopyability no longer records gLastUsedAbility on a successful copy",
    )

    swap_start = commands.index("static void Cmd_tryswapabilities(void)\n{")
    swap_fn = commands[swap_start:commands.index("static void Cmd_tryimprison(void)", swap_start)]
    require(
        "gBattleMons[gBattlerAttacker].ability == ABILITY_NONE" in swap_fn
        and "gBattleMons[gBattlerTarget].ability == ABILITY_NONE" in swap_fn,
        "Cmd_tryswapabilities lost its both-sides-ABILITY_NONE guard",
    )
    require(
        "gBattleMons[gBattlerAttacker].ability == ABILITY_WONDER_GUARD" in swap_fn
        and "gBattleMons[gBattlerTarget].ability == ABILITY_WONDER_GUARD" in swap_fn,
        "Cmd_tryswapabilities lost its symmetric (attacker OR target) Wonder Guard guard",
    )
    require(
        "gBattleMons[gBattlerAttacker].ability = gBattleMons[gBattlerTarget].ability;" in swap_fn
        and "gBattleMons[gBattlerTarget].ability = abilityAtk;" in swap_fn,
        "Cmd_tryswapabilities no longer exchanges both active ability bytes",
    )
    require("gLastUsedAbility" not in swap_fn, "Cmd_tryswapabilities unexpectedly now writes gLastUsedAbility (Role Play does, Skill Swap historically does not)")

    require(
        "BattleScript_EffectRolePlay::\n\tattackcanceler\n\tattackstring\n\tppreduce\n\taccuracycheck BattleScript_ButItFailed, NO_ACC_CALC_CHECK_LOCK_ON\n\ttrycopyability BattleScript_ButItFailed"
        in scripts,
        "BattleScript_EffectRolePlay's opening sequence changed shape",
    )
    require(
        "BattleScript_EffectSkillSwap::\n\tattackcanceler\n\tattackstring\n\tppreduce\n\taccuracycheck BattleScript_ButItFailed, NO_ACC_CALC_CHECK_LOCK_ON\n\ttryswapabilities BattleScript_ButItFailed"
        in scripts,
        "BattleScript_EffectSkillSwap's opening sequence changed shape",
    )

    roleplay_block = moves_h[moves_h.index("[MOVE_ROLE_PLAY] ="):moves_h.index("[MOVE_ROLE_PLAY] =") + 320]
    require(".effect = EFFECT_ROLE_PLAY" in roleplay_block, "MOVE_ROLE_PLAY's effect is no longer EFFECT_ROLE_PLAY")
    require(".accuracy = 100" in roleplay_block, "MOVE_ROLE_PLAY is no longer a 100-accuracy move")
    require(".flags = 0," in roleplay_block, "MOVE_ROLE_PLAY unexpectedly gained a Protect/Mirror-Move/Magic-Coat flag")

    copy = json.loads(COPY_FIXTURE.read_text())
    control = json.loads(CONTROL_FIXTURE.read_text())
    require(copy["profile"] == "battle-scene-off" == control["profile"], "fixture profile drifted")

    player_copy = copy["overrides"]["parties"]["player"][0]
    player_control = control["overrides"]["parties"]["player"][0]
    opp_copy = copy["overrides"]["parties"]["opponent"][0]
    opp_control = control["overrides"]["parties"]["opponent"][0]
    require(player_copy["species"] == 64 and player_copy["moves"] == [272, 272, 272, 272], "attacker is no longer Kadabra carrying Role Play x4")
    require(player_copy == player_control, "attacker party entry diverges between the copy and control fixtures")
    require(opp_copy["species"] == 132 and opp_copy["abilitySlot"] == 0, "copy fixture's defender is no longer Ditto/abilitySlot 0 (Limber)")
    require(opp_control["species"] == 303 and opp_control["abilitySlot"] == 0, "control fixture's defender is no longer Shedinja/abilitySlot 0 (Wonder Guard)")
    require(copy["overrides"]["parties"]["player"] == control["overrides"]["parties"]["player"], "player parties diverge between copy and control fixtures")

    species = json.loads((ROOT / "src/data/gen/species-stats.json").read_text())["species"]
    species_by_id = {row["id"]: row for row in species}
    require(species_by_id[132]["abilities"] == ["ABILITY_LIMBER", "ABILITY_NONE"], "Ditto is no longer single-ability Limber")
    require(species_by_id[303]["abilities"] == ["ABILITY_WONDER_GUARD", "ABILITY_NONE"], "Shedinja is no longer single-ability Wonder Guard")
    require(species_by_id[64]["baseSpeed"] > species_by_id[132]["baseSpeed"], "Kadabra is no longer faster than Ditto by base stat")
    require(species_by_id[64]["baseSpeed"] > species_by_id[303]["baseSpeed"], "Kadabra is no longer faster than Shedinja by base stat")

    manifest = json.loads((ROOT / "docs/gate6-coverage-manifest.json").read_text())
    level50_sets = manifest["sections"]["corpus"]["level50Sets"]
    kadabra_169 = next(s for s in level50_sets if s["setId"] == 169)
    ditto_54 = next(s for s in level50_sets if s["setId"] == 54)
    require(
        kadabra_169["species"] == "SPECIES_KADABRA" and "MOVE_ROLE_PLAY" in kadabra_169["moves"],
        "worklist's Kadabra set 169 / Role Play carrier claim no longer holds",
    )
    require(ditto_54["species"] == "SPECIES_DITTO", "worklist's Ditto set 54 carrier claim no longer holds")

    return {
        "trycopyabilityGuard": "target ability == ABILITY_NONE or == ABILITY_WONDER_GUARD short-circuits the copy (target-only, unlike swap's symmetric check)",
        "tryswapabilitiesGuard": "both-ABILITY_NONE or either-side ABILITY_WONDER_GUARD short-circuits the swap (symmetric)",
        "gLastUsedAbility": "trycopyability writes it on success, tryswapabilities never writes it",
        "fixtures": "Kadabra (Role Play x4) vs Ditto/Limber (copy succeeds) or Shedinja/Wonder Guard (copy blocked); single-ability defenders, ordered speeds (105 vs 48/40 base)",
        "carrierClaims": "Level-50 set 169 (Kadabra/Role Play) and set 54 (Ditto) confirmed in the generated corpus; Shedinja (control) is not a Level-50 roster carrier -- it is a source-derived control built from the guard condition itself, per the brief",
        "skillSwapAudit": "Cmd_tryswapabilities already witnessed by docs/skill-swap-off-evidence.md and docs/immunity-abilities-ground-truth.md -- no new Skill Swap fixture staged this step",
    }


def iter_frames(trace: dict):
    frame = 0
    for segment in trace["segments"]:
        for _ in range(int(segment["frames"])):
            frame += 1
            yield frame, segment.get("buttons", [])


DISPLAYED_STRING_BYTES = 96


def decode_displayed(raw: list[int]) -> str:
    chars: list[str] = []
    punctuation = {
        0x00: " ", 0xAB: "!", 0xAC: "?", 0xAD: ".", 0xAE: "-",
        0xB4: "'", 0xB8: ",", 0xBA: "/", 0xF0: ":",
    }
    for value in raw:
        if value == 0xFF:
            break
        if value == 0xFE:
            chars.append("\n")
        elif value in punctuation:
            chars.append(punctuation[value])
        elif 0xA1 <= value <= 0xAA:
            chars.append(str(value - 0xA1))
        elif 0xBB <= value <= 0xD4:
            chars.append(chr(ord("A") + value - 0xBB))
        elif 0xD5 <= value <= 0xEE:
            chars.append(chr(ord("a") + value - 0xD5))
        elif value in (0xFA, 0xFB):
            chars.append("\n")
        else:
            chars.append(f"<{value:02X}>")
    return "".join(chars)


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
    symbols = oracle.symbols

    def compact() -> dict:
        state = lab.snapshot()
        raw = [
            oracle.read_u8(symbols["gDisplayedStringBattle"] + offset)
            for offset in range(DISPLAYED_STRING_BYTES)
        ]
        return {
            "player": {
                "ability": state["battlers"]["player"]["ability"],
                "partyAbility": state["parties"]["player"][0]["ability"],
                "pp": state["battlers"]["player"]["pp"],
            },
            "opponent": {
                "ability": state["battlers"]["opponent"]["ability"],
                "partyAbility": state["parties"]["opponent"][0]["ability"],
            },
            "lastUsedAbility": oracle.read_u8(symbols["gLastUsedAbility"]),
            "currentMove": oracle.read_u16(symbols["gCurrentMove"]),
            "displayedString": decode_displayed(raw),
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
            "attackerAbilityTransitionFrame": first_frame(lambda r: r["player"]["ability"] != initial["player"]["ability"]),
            "copyMessageFrame": first_frame(lambda r: "copied the foe's" in r["displayedString"].lower() or "copied" in r["displayedString"].lower()),
            "totalRandomCalls": (rand_after_total - rand_before_total) & 0xFFFFFFFF,
        },
    }


def oracle_check(output: Path) -> dict:
    # Each mGBA core is a process-global singleton -- one subprocess per
    # fixture, mirroring verify-item-manipulation-covet-off.py /
    # verify-item-move-end-paralysis-off.py's convention.
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

    copy = run_single(COPY_FIXTURE, COPY_RECEIPT)
    control = run_single(CONTROL_FIXTURE, CONTROL_RECEIPT)

    require(copy["initial"]["player"]["ability"] == ABILITY_SYNCHRONIZE, f"copy run's attacker did not start with Synchronize: {copy['initial']}")
    require(control["initial"]["player"]["ability"] == ABILITY_SYNCHRONIZE, f"control run's attacker did not start with Synchronize: {control['initial']}")
    require(copy["initial"]["opponent"]["ability"] == ABILITY_LIMBER, "copy run's defender did not start with Limber")
    require(control["initial"]["opponent"]["ability"] == ABILITY_WONDER_GUARD, "control run's defender did not start with Wonder Guard")

    require(copy["summary"]["attackerAbilityTransitionFrame"] is not None, "copy run: attacker's active ability never changed (Role Play never copied anything)")
    require(copy["final"]["player"]["ability"] == ABILITY_LIMBER, f"copy run: attacker did not finish holding the copied Limber: {copy['final']}")
    require(copy["final"]["opponent"]["ability"] == ABILITY_LIMBER, "copy run: defender's own ability unexpectedly changed")
    require(copy["final"]["lastUsedAbility"] == ABILITY_LIMBER, "copy run: gLastUsedAbility was not set to the copied ability")
    require(copy["final"]["player"]["partyAbility"] == ABILITY_SYNCHRONIZE, "copy run: attacker's PERSISTENT party ability changed (it must not)")
    require(copy["final"]["opponent"]["partyAbility"] == ABILITY_LIMBER, "copy run: defender's PERSISTENT party ability changed (it must not)")

    require(control["summary"]["attackerAbilityTransitionFrame"] is None, "control run: attacker's active ability changed even though the target holds Wonder Guard (copy should be blocked)")
    require(control["final"]["player"]["ability"] == ABILITY_SYNCHRONIZE, "control run: attacker's active ability drifted from Synchronize despite the block")
    # NOTE: gLastUsedAbility is NOT checked here for the control arm. AbilityBattleEffects()
    # unconditionally sets gLastUsedAbility = gBattleMons[battler].ability at the top of every
    # call (battle_util.c:2471-2473), including the routine ABILITYEFFECT_ON_SWITCHIN/ENDTURN
    # bookkeeping every battler gets every turn regardless of which move was used -- so
    # Shedinja's own end-of-turn ability check alone sets gLastUsedAbility=25 (Wonder Guard)
    # in this arm, with nothing to do with Cmd_trycopyability. The attacker's active-ability
    # field (asserted above) is the only reliable signal for whether the copy itself fired.

    require(
        copy["final"]["player"]["pp"][0] == control["final"]["player"]["pp"][0] == 9,
        f"Role Play PP did not decrement by exactly 1 in both arms (PP is spent before the guard runs): copy={copy['final']['player']['pp']} control={control['final']['player']['pp']}",
    )
    require(
        copy["summary"]["totalRandomCalls"] == control["summary"]["totalRandomCalls"],
        "copy and control arms no longer consume identical Random() call counts -- "
        f"copy={copy['summary']['totalRandomCalls']} control={control['summary']['totalRandomCalls']} "
        "(Cmd_trycopyability and its NO_ACC_CALC_CHECK_LOCK_ON accuracycheck are both zero-RNG; any nonzero "
        "total here is entirely the Factory AI's forced-Splash equal-slot roll, identical in both arms)",
    )

    output.write_text(json.dumps({"static": source_and_fixture_checks(), "oracle": {
        "copy": {"initial": copy["initial"], "final": copy["final"], "summary": copy["summary"]},
        "control": {"initial": control["initial"], "final": control["final"], "summary": control["summary"]},
    }}, indent=2) + "\n")
    return {"copy": copy, "control": control}


def main() -> None:
    if len(sys.argv) == 4 and sys.argv[1] == "--single":
        metrics = run_fixture(Path(sys.argv[2]))
        Path(sys.argv[3]).write_text(json.dumps(metrics, indent=2) + "\n")
        return
    static = source_and_fixture_checks()
    if len(sys.argv) == 1:
        print(json.dumps(static, indent=2))
        print("PASS: source arms intact, dispatch sites confirmed, fixtures verified against the generated corpus")
        return
    if len(sys.argv) != 2:
        raise SystemExit(f"usage: {sys.argv[0]} [oracle-output.json]")
    result = oracle_check(Path(sys.argv[1]))
    print(
        "PASS: copy run attacker's active ability Synchronize(28)->Limber(7) at frame "
        f"{result['copy']['summary']['attackerAbilityTransitionFrame']}, gLastUsedAbility=7, persistent records untouched; "
        "control run (Wonder Guard target): active ability never changes; "
        f"PP both arms 10->9; RNG calls copy={result['copy']['summary']['totalRandomCalls']} "
        f"control={result['control']['summary']['totalRandomCalls']} (equal)",
        flush=True,
    )


if __name__ == "__main__":
    main()
