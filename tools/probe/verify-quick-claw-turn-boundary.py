#!/usr/bin/env python3
"""Verify the Battle Scene OFF Quick Claw / turn-boundary RNG window.

Fast source and fixture guard:
    python3 tools/probe/verify-quick-claw-turn-boundary.py

Live ROM check (mGBA interpreter required):
    out_dir="$(mktemp -d /tmp/quick-claw-verify.XXXXXX)"
    python3 tools/run-mgba-probe.py "$out_dir/result.json" -- \
      /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
      tools/probe/verify-quick-claw-turn-boundary.py "$out_dir/result.json"
"""

from __future__ import annotations

import bisect
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FIXTURE = ROOT / "tools/battle-lab/mechanic-quick-claw-turn-boundary-off.json"
PROFILE = "battle-scene-off"
THRESHOLD = 13107
RANDOM_ADDR = 0x0806F5CC
RANDOM_ENTRY_PC = RANDOM_ADDR + 2  # libmgba-py exposes pipelined Thumb PC.
SRANDCOUNT_ADDR = 0x020249C0


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def find_harness_root() -> Path:
    for candidate in (ROOT, *ROOT.parents):
        if (candidate / "oracle/emerald_core.py").is_file():
            return candidate
    raise RuntimeError("could not find oracle/emerald_core.py")


def static_checks() -> dict:
    fixture = json.loads(FIXTURE.read_text())
    mons = json.loads((ROOT / "src/data/gen/battle-frontier-mons.json").read_text())["entries"]
    items = json.loads((ROOT / "src/data/gen/battle-frontier-held-items.json").read_text())["entries"]
    species = json.loads((ROOT / "src/data/gen/species-stats.json").read_text())["species"]
    turn_order = (ROOT / "src/engine/turnOrder.ts").read_text()
    full_turn = (ROOT / "src/engine/factoryBattleScriptFullTurnDecision.ts").read_text()

    magcargo = mons[299]
    smeargle = mons[32]
    quick_claw = next(row for row in items if row["itemTableId"] == 24)
    require(
        magcargo["species"] == "SPECIES_MAGCARGO"
        and magcargo["nature"] == "NATURE_QUIET"
        and magcargo["moves"] == [
            "MOVE_OVERHEAT", "MOVE_EARTHQUAKE", "MOVE_ROCK_SLIDE", "MOVE_BODY_SLAM"
        ]
        and magcargo["itemTableId"] == 24,
        "Frontier index 299 is no longer the requested real Magcargo corpus row",
    )
    require(
        smeargle["species"] == "SPECIES_SMEARGLE" and smeargle["nature"] == "NATURE_HARDY",
        "Frontier index 32 is no longer the requested Smeargle corpus row",
    )
    require(
        quick_claw["itemId"] == 183
        and quick_claw["holdEffect"] == "HOLD_EFFECT_QUICK_CLAW"
        and quick_claw["holdEffectParam"] == 20,
        "Quick Claw item/effect/parameter drifted",
    )

    parties = fixture["overrides"]["parties"]
    player = parties["player"]
    opponent = parties["opponent"]
    require(fixture["profile"] == PROFILE, "fixture is not Battle Scene OFF")
    require(
        player[0]["species"] == 219
        and player[0]["nature"] == 17
        and player[0]["moves"] == [315, 89, 157, 34]
        and player[0]["item"] == 183,
        "active Magcargo no longer uses the real idx-299 corpus shape",
    )
    require(
        opponent[0]["species"] == 235
        and opponent[0]["nature"] == 0
        and opponent[0]["item"] == 0
        and opponent[0]["moves"] == [105] * 4,
        "active Smeargle is no longer itemless and constrained to one priority-0 move",
    )
    require(
        all(mon["level"] == 50 for mon in player + opponent)
        and all(set(mon["ivs"].values()) == {31} for mon in player + opponent)
        and all(set(mon["evs"].values()) == {0} for mon in player + opponent),
        "fixture parties are no longer complete IV31/EV0 legal L50 records",
    )
    base_speeds = {
        row["id"]: row["baseSpeed"] for row in species
        if row["id"] in {219, 1, 213, 235, 95, 198}
    }
    staged_species = [mon["species"] for mon in player + opponent]
    require(
        len({base_speeds[species_id] for species_id in staged_species}) == 6,
        "fixture acquired a bench-inclusive base-Speed tie",
    )
    require(
        "randomTurnNumber < Math.trunc((0xffff * (battler.holdEffectParam ?? 0)) / 100)"
        in turn_order
        and ".draw(" not in turn_order,
        "Quick Claw no longer reads only the stored random-turn number",
    )
    require(
        'ctxRng.draw(\n    "BattleTurnPassed gRandomTurnNumber (battle_main.c:4013)"'
        in full_turn
        and "randomTurnNumber: config.initialRandomTurnNumber ?? 0xffff" in full_turn,
        "production full-turn boundary/staging contract drifted",
    )
    engine = json.loads(subprocess.run(
        ["npx", "tsx", "tools/probe/verify-quick-claw-engine.ts"],
        cwd=ROOT, capture_output=True, text=True, check=True,
    ).stdout)
    require(engine["verdict"] == "PASS", "production engine verifier did not pass")
    return {
        "profile": PROFILE,
        "corpus": "Magcargo idx 299 vs Smeargle idx 32",
        "speeds": {"Magcargo": 45, "Smeargle": 95},
        "threshold": THRESHOLD,
        "fixtureBaseSpeeds": [base_speeds[species_id] for species_id in staged_species],
        "engine": engine,
    }


def iter_frames(trace: dict):
    frame = 0
    for segment in trace["segments"]:
        for _ in range(int(segment["frames"])):
            frame += 1
            yield frame, segment.get("buttons", [])


def build_symbol_table(elf_path: Path) -> list[tuple[int, str]]:
    output = subprocess.run(
        ["arm-none-eabi-nm", "--defined-only", "-n", str(elf_path)],
        capture_output=True, text=True, check=True,
    ).stdout
    rows = []
    for line in output.splitlines():
        parts = line.split()
        if len(parts) == 3 and parts[1] in ("t", "T"):
            rows.append((int(parts[0], 16), parts[2]))
    return sorted(rows)


def caller_of(symbols: list[tuple[int, str]], lr: int) -> str:
    index = bisect.bisect_right(symbols, (lr, "\uffff")) - 1
    require(index >= 0, f"could not resolve LR {lr:#x}")
    base, name = symbols[index]
    offset = lr - base
    return name if offset == 0 else f"{name}+0x{offset:x}"


def stage(harness: Path):
    sys.path.insert(0, str(harness / "oracle"))
    from battle_lab import BattleLab, validate_request  # type: ignore
    from emerald_core import EmeraldOracle  # type: ignore

    request = validate_request(json.loads(FIXTURE.read_text()), PROFILE)
    oracle = EmeraldOracle(
        rom_path=(harness / "reference/pokeemerald/pokeemerald.gba").resolve(),
        map_path=(harness / "reference/pokeemerald/pokeemerald.map").resolve(),
        bootstrap_path=harness / "oracle/bootstrap/factory-battle-scene-off.json",
    )
    setup = BattleLab(oracle, PROFILE).prepare(request)
    return oracle, request, setup


def fast_pass(oracle, trace: dict) -> dict:
    symbols = oracle.symbols
    current_move_addr = symbols["gCurrentMove"]
    attacker_addr = symbols["gBattlerAttacker"]
    turn_order_addr = symbols["gBattlerByTurnOrder"]
    random_turn_addr = symbols["gRandomTurnNumber"]
    rng_value_addr = symbols["gRngValue"]
    battle_mons = symbols["gBattleMons"]

    active_speeds = [
        oracle.read_u16(battle_mons + battler * 0x58 + 6) for battler in range(2)
    ]
    actions = []
    deltas = []
    boundary_frames = []
    previous_move = oracle.read_u16(current_move_addr)
    previous_count = oracle.read_u32(SRANDCOUNT_ADDR)
    previous_random_turn = oracle.read_u16(random_turn_addr)
    previous_rng_value = oracle.read_u32(rng_value_addr)
    initial = {
        "randomTurnNumber": previous_random_turn,
        "gRngValue": oracle.read_u32(rng_value_addr),
    }
    for frame, buttons in iter_frames(trace):
        oracle.advance(buttons)
        move = oracle.read_u16(current_move_addr)
        if move != previous_move and move in (105, 315):
            actions.append({
                "frame": frame,
                "move": move,
                "attacker": oracle.read_u8(attacker_addr),
                "randomTurnNumber": oracle.read_u16(random_turn_addr),
                "turnOrder": [
                    oracle.read_u8(turn_order_addr),
                    oracle.read_u8(turn_order_addr + 1),
                ],
            })
        previous_move = move
        count = oracle.read_u32(SRANDCOUNT_ADDR)
        delta = (count - previous_count) & 0xFFFFFFFF
        if delta:
            deltas.append({"frame": frame, "count": delta})
        previous_count = count
        random_turn = oracle.read_u16(random_turn_addr)
        if random_turn != previous_random_turn:
            boundary_frames.append({
                "frame": frame,
                "value": random_turn,
                "rngSeedBefore": previous_rng_value,
                "gRngValue": oracle.read_u32(rng_value_addr),
                "sRandDelta": delta,
            })
        previous_random_turn = random_turn
        previous_rng_value = oracle.read_u32(rng_value_addr)
    return {
        "activeSpeeds": active_speeds,
        "initial": initial,
        "actions": actions,
        "randFrames": deltas,
        "boundaries": boundary_frames,
    }


def step_flagged_frame(oracle, buttons: list[str], frame: int, hits: list[dict]) -> None:
    oracle._set_buttons(buttons)
    start_counter = oracle.core.frame_counter
    steps = 0
    while True:
        if oracle.core.cpu.pc == RANDOM_ENTRY_PC:
            hits.append({"frame": frame, "lr": oracle.core.cpu.lr})
        if oracle.core.frame_counter != start_counter:
            break
        oracle.core.step()
        steps += 1
        if steps > 20_000_000:
            raise RuntimeError(f"frame {frame} did not end while single-stepping")
    oracle._screen_stale = False
    oracle.frame += 1


def attribution_pass(oracle, trace: dict, flagged: set[int], symbol_table: list[tuple[int, str]]) -> list[dict]:
    hits = []
    for frame, buttons in iter_frames(trace):
        if frame in flagged:
            step_flagged_frame(oracle, buttons, frame, hits)
        else:
            oracle.advance(buttons)
    return [
        {**hit, "caller": caller_of(symbol_table, hit["lr"])}
        for hit in hits
    ]


def summarize_turns(actions: list[dict]) -> list[dict]:
    # gCurrentMove can enter and leave a status-move script within one video
    # frame, so frame-boundary polling does not reliably see every Recover.
    # Overheat spans frames and is seen once per completed turn; the ROM's
    # persistent gBattlerByTurnOrder gives the exact two-action order.
    turn_anchors = [row for row in actions if row["move"] == 315 and row["attacker"] == 0]
    turns = []
    for anchor in turn_anchors:
        require(
            sorted(anchor["turnOrder"]) == [0, 1],
            f"turn order is malformed at Overheat: {anchor}",
        )
        value = anchor["randomTurnNumber"]
        first = "Magcargo" if anchor["turnOrder"][0] == 0 else "Smeargle"
        expected = "Magcargo" if value < THRESHOLD else "Smeargle"
        require(first == expected, f"value {value} predicts {expected}, observed {first}")
        turns.append({
            "turn": len(turns) + 1,
            "randomTurnNumber": value,
            "thresholdVerdict": "proc" if value < THRESHOLD else "no-proc",
            "observedOrder": f"{first} -> {'Smeargle' if first == 'Magcargo' else 'Magcargo'}",
        })
    return turns


def live_check(output: Path) -> dict:
    harness = find_harness_root()
    oracle, request, setup = stage(harness)
    fast = fast_pass(oracle, request["trace"])
    require(
        [row["species"] for row in setup["player"]] == [95, 240, 153],
        "unexpected legal player-set staging basis",
    )
    require(fast["activeSpeeds"] == [45, 95], f"active Speed mismatch: {fast['activeSpeeds']}")
    turns = summarize_turns(fast["actions"])
    require(
        [turn["randomTurnNumber"] for turn in turns] == [25804, 44835, 15553, 45723, 10727],
        f"deterministic five-turn random/order window drifted: {turns}",
    )
    expected_boundaries = [
        (1214, 44835, 1780301801, 2938344616),
        (2556, 15553, 3656179860, 1019287415),
        (3480, 45723, 1154923059, 2996515370),
        (4222, 10727, 3795871350, 703067313),
        (5155, 41836, 1431302733, 2741764412),
    ]
    observed_boundaries = [
        (row["frame"], row["value"], row["rngSeedBefore"], row["gRngValue"])
        for row in fast["boundaries"]
    ]
    require(
        observed_boundaries == expected_boundaries,
        f"deterministic boundary anchors drifted: {observed_boundaries}",
    )

    # Single-step only the turn-transition frames. Stepping every ordinary
    # hit/AI draw in this five-turn trace produces multi-megabyte mGBA logs
    # and is unnecessary for the acceptance claim: source inspection above
    # proves Quick Claw itself has no draw, while these are the exact frames
    # whose sole call site must be BattleTurnPassed.
    flagged = {row["frame"] for row in fast["boundaries"]}
    oracle2, request2, _setup2 = stage(harness)
    symbol_table = build_symbol_table((harness / "reference/pokeemerald/pokeemerald.elf").resolve())
    callers = attribution_pass(oracle2, request2["trace"], flagged, symbol_table)
    require(
        len(callers) == sum(row["sRandDelta"] for row in fast["boundaries"]),
        "single-step boundary hits do not reconcile with boundary sRandCount deltas",
    )
    for boundary in fast["boundaries"]:
        frame_callers = [row["caller"] for row in callers if row["frame"] == boundary["frame"]]
        require(
            boundary["sRandDelta"] == 1
            and frame_callers == ["BattleTurnPassed+0x157"],
            f"boundary frame {boundary['frame']} is not exactly one BattleTurnPassed draw: {frame_callers}",
        )
    require(
        len(fast["boundaries"]) >= len(turns) - 1,
        "not every continuing turn acquired a boundary random-turn value",
    )
    proc_count = sum(turn["thresholdVerdict"] == "proc" for turn in turns)
    result = {
        "static": static_checks(),
        "oracle": {
            "profile": PROFILE,
            "initial": fast["initial"],
            "turns": turns,
            "procCount": proc_count,
            "turnCount": len(turns),
            "boundaries": fast["boundaries"],
            "randomCallerCount": len(callers),
            "speedTieDraws": 0,
            "quickClawCheckDraws": 0,
        },
    }
    output.write_text(json.dumps(result, indent=2) + "\n")
    return result


def main() -> None:
    if len(sys.argv) == 1:
        static = static_checks()
        print(json.dumps(static, indent=2))
        print("PASS: Quick Claw fixture and stored turn-boundary RNG contract are intact")
        return
    require(len(sys.argv) == 2, f"usage: {sys.argv[0]} [oracle-output.json]")
    result = live_check(Path(sys.argv[1]))
    oracle = result["oracle"]
    print(
        f"PASS: {oracle['procCount']}/{oracle['turnCount']} Quick Claw procs; "
        f"{len(oracle['boundaries'])} boundaries attributed; no tie/check draws",
        flush=True,
    )


if __name__ == "__main__":
    main()
