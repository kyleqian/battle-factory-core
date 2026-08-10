#!/usr/bin/env python3
"""Re-check the Rank-5 pre-emptive Own Tempo confusion-guard family's Confuse Ray representative.

See docs/own-tempo-guard-family-ground-truth.md for the full source
citations this re-derives (all five jumpifability guards, both fail-script
labels, Swagger's stat-raise/confuse split, and the Teeter Dance self-hit
correction), and docs/gate6-family-worklist.md's Rank 5 for the family this
receipt represents (MOVE_CONFUSE_RAY / BattleScript_EffectConfuse's
jumpifability BS_TARGET, ABILITY_OWN_TEMPO guard).

Fast source/fixture check (no oracle):
    python3 tools/probe/verify-own-tempo-guard-confuseray-off.py

Live Battle Scene OFF check (runs both fixtures, writes dense per-frame
receipts, asserts the block/control divergence):
    out_dir="$(mktemp -d /tmp/own-tempo-guard-confuseray-verify.XXXXXX)"
    python3 tools/run-mgba-probe.py "$out_dir/result.json" -- \
      python3 tools/probe/verify-own-tempo-guard-confuseray-off.py "$out_dir/result.json"
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BLOCK_FIXTURE = ROOT / "tools/battle-lab/mechanic-own-tempo-guard-confuseray-block-off.json"
CONTROL_FIXTURE = ROOT / "tools/battle-lab/mechanic-own-tempo-guard-confuseray-control-off.json"
BLOCK_RECEIPT = ROOT / "tools/probe/receipts/own-tempo-guard-confuseray-block-off.json"
CONTROL_RECEIPT = ROOT / "tools/probe/receipts/own-tempo-guard-confuseray-control-off.json"
SRANDCOUNT_ADDR = 0x020249C0
ABILITY_INNER_FOCUS = 39
ABILITY_OWN_TEMPO = 20
ABILITY_LIMBER = 7
STATUS2_CONFUSION_MASK = 0x7


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def source_and_fixture_checks() -> dict:
    commands = (ROOT / "reference/pokeemerald/src/battle_script_commands.c").read_text()
    util = (ROOT / "reference/pokeemerald/src/battle_util.c").read_text()
    scripts = (ROOT / "reference/pokeemerald/data/battle_scripts_1.s").read_text()
    moves_h = (ROOT / "reference/pokeemerald/src/data/battle_moves.h").read_text()

    jumpifability_start = commands.index("static void Cmd_jumpifability(void)\n{")
    jumpifability_fn = commands[jumpifability_start:commands.index("static void Cmd_jumpifsideaffecting(void)", jumpifability_start)]
    require("RecordAbilityBattle(battler, gLastUsedAbility);" in jumpifability_fn, "Cmd_jumpifability's BS_TARGET branch no longer records ability history")
    require("gBattlescriptCurrInstr = jumpPtr;" in jumpifability_fn, "Cmd_jumpifability no longer jumps on a match")

    require(
        "BattleScript_EffectConfuse::\n\tattackcanceler\n\tattackstring\n\tppreduce\n\tjumpifability BS_TARGET, ABILITY_OWN_TEMPO, BattleScript_OwnTempoPrevents\n\tjumpifstatus2 BS_TARGET, STATUS2_SUBSTITUTE, BattleScript_ButItFailed\n\tjumpifstatus2 BS_TARGET, STATUS2_CONFUSION, BattleScript_AlreadyConfused\n\taccuracycheck BattleScript_ButItFailed, ACC_CURR_MOVE"
        in scripts,
        "BattleScript_EffectConfuse's guard order changed (jumpifability must precede Substitute/already-confused/accuracycheck)",
    )
    require(
        "BattleScript_OwnTempoPrevents::\n\tpause B_WAIT_TIME_SHORT\n\tprintstring STRINGID_PKMNPREVENTSCONFUSIONWITH\n\twaitmessage B_WAIT_TIME_LONG\n\tgoto BattleScript_MoveEnd"
        in scripts,
        "BattleScript_OwnTempoPrevents changed shape",
    )
    require(
        "BattleScript_TeeterDanceOwnTempoPrevents::\n\tpause B_WAIT_TIME_SHORT\n\tprintstring STRINGID_PKMNPREVENTSCONFUSIONWITH\n\twaitmessage B_WAIT_TIME_LONG\n\tgoto BattleScript_TeeterDanceDoMoveEndIncrement"
        in scripts,
        "BattleScript_TeeterDanceOwnTempoPrevents no longer redirects into the per-target loop continuation (distinct from the generic OwnTempoPrevents)",
    )
    require(
        "jumpifbyteequal gBattlerAttacker, gBattlerTarget, BattleScript_TeeterDanceLoopIncrement\n\tjumpifability BS_TARGET, ABILITY_OWN_TEMPO, BattleScript_TeeterDanceOwnTempoPrevents"
        in scripts,
        "Teeter Dance's self-exclusion (skip when target==attacker) no longer precedes its Own Tempo check -- "
        "this is the source evidence that the user is excluded from its own Teeter Dance, contra the worklist's self-hit claim",
    )
    require(
        "setstatchanger STAT_ATK, 2, FALSE\n\tstatbuffchange STAT_CHANGE_ALLOW_PTR, BattleScript_SwaggerTryConfuse"
        in scripts
        and "BattleScript_SwaggerTryConfuse::\n\tjumpifability BS_TARGET, ABILITY_OWN_TEMPO, BattleScript_OwnTempoPrevents"
        in scripts,
        "Swagger's stat-raise-before-confuse-attempt split changed shape",
    )

    canceler_start = util.index("case CANCELER_CONFUSED:")
    canceler_confused = util[canceler_start:util.index("case CANCELER_PARALYZED:", canceler_start)]
    require("Random() & 1" in canceler_confused, "CANCELER_CONFUSED's self-hit-chance roll changed shape")
    require(
        "CalculateBaseDamage(&gBattleMons[gBattlerAttacker], &gBattleMons[gBattlerAttacker], MOVE_POUND, 0, 40, 0, gBattlerAttacker, gBattlerAttacker);" in canceler_confused,
        "CANCELER_CONFUSED's typeless self-hit damage calc (Pound-shaped, power 40) changed shape",
    )
    adjustnormaldamage2_start = commands.index("static void Cmd_adjustnormaldamage2(void)\n{")
    require(
        "ApplyRandomDmgMultiplier();" in commands[adjustnormaldamage2_start:adjustnormaldamage2_start + 300],
        "Cmd_adjustnormaldamage2 (BattleScript_DoSelfConfusionDmg's damage-variance step) no longer rolls ApplyRandomDmgMultiplier",
    )

    confuse_block = moves_h[moves_h.index("[MOVE_CONFUSE_RAY] ="):moves_h.index("[MOVE_CONFUSE_RAY] =") + 320]
    require(".effect = EFFECT_CONFUSE" in confuse_block, "MOVE_CONFUSE_RAY's effect is no longer EFFECT_CONFUSE")
    require(".accuracy = 100" in confuse_block, "MOVE_CONFUSE_RAY is no longer a 100-accuracy move")
    sweet_kiss_block = moves_h[moves_h.index("[MOVE_SWEET_KISS] ="):moves_h.index("[MOVE_SWEET_KISS] =") + 320]
    require(".effect = EFFECT_CONFUSE" in sweet_kiss_block, "MOVE_SWEET_KISS no longer shares EFFECT_CONFUSE with Confuse Ray")

    block = json.loads(BLOCK_FIXTURE.read_text())
    control = json.loads(CONTROL_FIXTURE.read_text())
    require(block["profile"] == "battle-scene-off" == control["profile"], "fixture profile drifted")

    player_block = block["overrides"]["parties"]["player"][0]
    player_control = control["overrides"]["parties"]["player"][0]
    opp_block = block["overrides"]["parties"]["opponent"][0]
    opp_control = control["overrides"]["parties"]["opponent"][0]
    require(player_block["species"] == 41 and player_block["moves"] == [109, 109, 109, 109], "attacker is no longer Zubat carrying Confuse Ray x4")
    require(player_block == player_control, "attacker party entry diverges between the block and control fixtures")
    require(opp_block["species"] == 235 and opp_block["abilitySlot"] == 0, "block fixture's defender is no longer Smeargle/abilitySlot 0 (Own Tempo)")
    require(opp_control["species"] == 132 and opp_control["abilitySlot"] == 0, "control fixture's defender is no longer Ditto/abilitySlot 0 (Limber)")

    species = json.loads((ROOT / "src/data/gen/species-stats.json").read_text())["species"]
    species_by_id = {row["id"]: row for row in species}
    require(species_by_id[235]["abilities"] == ["ABILITY_OWN_TEMPO", "ABILITY_NONE"], "Smeargle is no longer single-ability Own Tempo")
    require(species_by_id[132]["abilities"] == ["ABILITY_LIMBER", "ABILITY_NONE"], "Ditto is no longer single-ability Limber")
    # Zubat needs speed EV compensation: base 55 < Smeargle's base 75.
    require(species_by_id[41]["baseSpeed"] < species_by_id[235]["baseSpeed"], "Zubat is no longer slower than Smeargle by base stat (speed-EV compensation may be unnecessary now)")
    require(player_block["evs"]["speed"] == 252, "attacker no longer runs max speed EV to outrun Smeargle")

    manifest = json.loads((ROOT / "docs/gate6-coverage-manifest.json").read_text())
    level50_sets = manifest["sections"]["corpus"]["level50Sets"]
    zubat_25 = next(s for s in level50_sets if s["setId"] == 25)
    smeargle_32 = next(s for s in level50_sets if s["setId"] == 32)
    require(
        zubat_25["species"] == "SPECIES_ZUBAT" and "MOVE_CONFUSE_RAY" in zubat_25["moves"],
        "worklist's Zubat set 25 / Confuse Ray carrier claim no longer holds",
    )
    require(smeargle_32["species"] == "SPECIES_SMEARGLE", "worklist's Smeargle set 32 carrier claim no longer holds")

    return {
        "jumpifabilityOrder": "BattleScript_EffectConfuse's jumpifability BS_TARGET OWN_TEMPO precedes Substitute/already-confused/accuracycheck -- block arm skips the accuracy roll entirely",
        "failScripts": "BattleScript_OwnTempoPrevents -> generic MoveEnd (Confuse Ray/Sweet Kiss/Swagger/Flatter); BattleScript_TeeterDanceOwnTempoPrevents -> per-target loop continuation (distinct)",
        "swaggerSplit": "stat-raise (setstatchanger/statbuffchange) executes before BattleScript_SwaggerTryConfuse's jumpifability -- confirmed unconditional relative to Own Tempo",
        "teeterDanceSelfHit": "jumpifbyteequal attacker==target precedes the Own Tempo check inside the loop -- the user is unconditionally excluded, correcting the worklist's self-hit claim",
        "fixtures": "Zubat (Confuse Ray x4, max speed EV) vs Smeargle/Own Tempo (blocked) or Ditto/Limber (confusion applies); single-ability defenders, ordered speeds (Zubat EV-boosted to 107 vs Smeargle 95 / Ditto 68)",
        "carrierClaims": "Level-50 set 25 (Zubat/Confuse Ray) and set 32 (Smeargle/Own Tempo) confirmed in the generated corpus",
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
                "status2": state["battlers"]["player"]["status2"],
                "pp": state["battlers"]["player"]["pp"],
            },
            "opponent": {
                "ability": state["battlers"]["opponent"]["ability"],
                "status2": state["battlers"]["opponent"]["status2"],
            },
            "currentMove": oracle.read_u16(symbols["gCurrentMove"]),
            "displayedString": decode_displayed(raw),
        }

    initial = compact()
    frames = [{"frame": 0, **initial}]
    random_frames = []
    rand_before = oracle.read_u32(SRANDCOUNT_ADDR)
    rand_before_total = rand_before
    for frame, buttons in iter_frames(request["trace"]):
        oracle.advance(buttons)
        after = compact()
        rand_after = oracle.read_u32(SRANDCOUNT_ADDR)
        delta = (rand_after - rand_before) & 0xFFFFFFFF
        if delta:
            random_frames.append({
                "frame": frame,
                "randomCalls": delta,
                "currentMove": after["currentMove"],
            })
        frames.append({"frame": frame, **after})
        rand_before = rand_after
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
        "randomFrames": random_frames,
        "summary": {
            "defenderConfusionTransitionFrame": first_frame(
                lambda r: (r["opponent"]["status2"] & STATUS2_CONFUSION_MASK) != (initial["opponent"]["status2"] & STATUS2_CONFUSION_MASK)
            ),
            "preventsMessageFrame": first_frame(lambda r: "prevents confusion" in r["displayedString"].lower().replace("\n", " ")),
            "confusedMessageFrame": first_frame(lambda r: "became confused" in r["displayedString"].lower().replace("\n", " ")),
            "totalRandomCalls": (rand_after_total - rand_before_total) & 0xFFFFFFFF,
        },
    }


def oracle_check(output: Path) -> dict:
    # Each mGBA core is a process-global singleton -- one subprocess per
    # fixture, mirroring verify-item-manipulation-covet-off.py /
    # verify-ability-manipulation-roleplay-off.py's convention.
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

    block = run_single(BLOCK_FIXTURE, BLOCK_RECEIPT)
    control = run_single(CONTROL_FIXTURE, CONTROL_RECEIPT)

    require(block["initial"]["opponent"]["ability"] == ABILITY_OWN_TEMPO, f"block run's defender did not start with Own Tempo: {block['initial']}")
    require(control["initial"]["opponent"]["ability"] == ABILITY_LIMBER, f"control run's defender did not start with Limber: {control['initial']}")
    require((block["initial"]["opponent"]["status2"] & STATUS2_CONFUSION_MASK) == 0, "block run's defender started already confused")
    require((control["initial"]["opponent"]["status2"] & STATUS2_CONFUSION_MASK) == 0, "control run's defender started already confused")

    require(block["summary"]["defenderConfusionTransitionFrame"] is None, "block run: defender's confusion status2 bits changed even though it holds Own Tempo")
    require((block["final"]["opponent"]["status2"] & STATUS2_CONFUSION_MASK) == 0, "block run: defender finished confused despite Own Tempo")
    require(block["summary"]["preventsMessageFrame"] is not None, "block run: 'prevents confusion' message never printed")
    require(block["summary"]["confusedMessageFrame"] is None, "block run: 'became confused' message printed despite the block")

    require(control["summary"]["defenderConfusionTransitionFrame"] is not None, "control run: defender's confusion status2 bits never changed (Confuse Ray never applied)")
    require((control["final"]["opponent"]["status2"] & STATUS2_CONFUSION_MASK) != 0, "control run: defender did not finish confused")
    require(control["summary"]["confusedMessageFrame"] is not None, "control run: 'became confused' message never printed")
    require(control["summary"]["preventsMessageFrame"] is None, "control run: 'prevents confusion' message printed even though the defender lacks Own Tempo")

    require(
        block["final"]["player"]["pp"][0] == control["final"]["player"]["pp"][0] == 9,
        f"Confuse Ray PP did not decrement by exactly 1 in both arms: block={block['final']['player']['pp']} control={control['final']['player']['pp']}",
    )
    require(block["final"]["player"]["ability"] == ABILITY_INNER_FOCUS == control["final"]["player"]["ability"], "attacker's own ability changed (jumpifability only reads, never writes)")
    require(block["final"]["opponent"]["ability"] == ABILITY_OWN_TEMPO, "block run: defender's own ability changed")
    require(control["final"]["opponent"]["ability"] == ABILITY_LIMBER, "control run: defender's own ability changed")

    # Attribute every Random() call by the currentMove active when it fired, mirroring
    # probe-immunity-limber-off.py's expected_draws convention. Both arms also draw an
    # identical, currentMove==0 6-call burst (1 then 5) a few frames after the turn's
    # messages finish -- confirmed byte-identical in both arms by this same check, so it
    # nets to zero in any block-vs-control comparison; it is the Factory AI's speculative
    # next-turn evaluation (both fixtures force the same Splash x4 opponent), not anything
    # this family's guard or MOVE_EFFECT_CONFUSION controls, so it is asserted present but
    # not attributed to Confuse Ray/Own Tempo specifically.
    block_draws = [(row["currentMove"], row["randomCalls"]) for row in block["randomFrames"]]
    control_draws = [(row["currentMove"], row["randomCalls"]) for row in control["randomFrames"]]
    require(
        block_draws == [(0, 1), (0, 5)],
        f"block run's Random() ledger changed shape (expected zero calls attributable to Confuse Ray/Splash, "
        f"only the post-turn AI burst): {block_draws}",
    )
    require(
        control_draws == [(109, 1), (109, 1), (150, 1), (150, 1), (0, 1), (0, 5)],
        "control run's Random() ledger changed shape (expected: Confuse Ray's accuracycheck roll, then "
        "Cmd_seteffectprimary's confusion-duration roll, both while currentMove==109 [CONFUSE_RAY]; then "
        "the confused defender's own CANCELER_CONFUSED self-hit-chance roll and (this seed happens to "
        "self-hit) Cmd_adjustnormaldamage2's damage-variance roll, both while currentMove==150 [SPLASH]; "
        f"then the same post-turn AI burst as the block arm): {control_draws}",
    )
    require(
        control["summary"]["totalRandomCalls"] == block["summary"]["totalRandomCalls"] + 4,
        "control/block total Random() call delta is no longer 4 -- "
        f"block={block['summary']['totalRandomCalls']} control={control['summary']['totalRandomCalls']} "
        "(1 skipped accuracycheck + 1 confusion-duration roll + 1 self-hit-chance roll + 1 self-hit-damage "
        "roll, per docs/own-tempo-guard-family-ground-truth.md section 5 -- the last two are themselves "
        "stochastic on whether the newly-confused defender happens to hurt itself on its own next turn, "
        "which this fixture's fixed seed does)",
    )

    output.write_text(json.dumps({"static": source_and_fixture_checks(), "oracle": {
        "block": {"initial": block["initial"], "final": block["final"], "summary": block["summary"]},
        "control": {"initial": control["initial"], "final": control["final"], "summary": control["summary"]},
    }}, indent=2) + "\n")
    return {"block": block, "control": control}


def main() -> None:
    if len(sys.argv) == 4 and sys.argv[1] == "--single":
        metrics = run_fixture(Path(sys.argv[2]))
        Path(sys.argv[3]).write_text(json.dumps(metrics, indent=2) + "\n")
        return
    static = source_and_fixture_checks()
    if len(sys.argv) == 1:
        print(json.dumps(static, indent=2))
        print("PASS: source guards intact, both fail-script labels confirmed distinct, fixtures verified against the generated corpus")
        return
    if len(sys.argv) != 2:
        raise SystemExit(f"usage: {sys.argv[0]} [oracle-output.json]")
    result = oracle_check(Path(sys.argv[1]))
    print(
        "PASS: block run (Smeargle/Own Tempo) defender never confused, 'prevents confusion' at frame "
        f"{result['block']['summary']['preventsMessageFrame']}; control run (Ditto/Limber) defender confused at frame "
        f"{result['control']['summary']['defenderConfusionTransitionFrame']}; PP both arms 10->9; "
        f"RNG calls block={result['block']['summary']['totalRandomCalls']} control={result['control']['summary']['totalRandomCalls']} "
        "(control = block + 4: skipped accuracycheck, confusion-duration roll, and the newly-confused "
        "defender's own self-hit-chance + self-hit-damage rolls on this seed)",
        flush=True,
    )


if __name__ == "__main__":
    main()
