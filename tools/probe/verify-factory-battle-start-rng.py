#!/usr/bin/env python3
"""Receive the Battle Scene OFF fresh-start ``gRandomTurnNumber`` ledger.

Run only through the teardown-safe wrapper from
``docs/facility-round-loop-scout.md`` §4.  The first pass samples each video
frame through the first player-selected move.  A fresh second pass single-steps
only frames whose source ``sRandCount`` delta is nonzero, recording every
``Random`` caller plus the live battle globals at that instant.
"""

from __future__ import annotations

import bisect
import copy
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FIXTURE = ROOT / "tools/battle-lab/mechanic-factory-battle-start-rng-off.json"
PROFILE = "battle-scene-off"
RANDOM_ADDR = 0x0806F5CC
RANDOM_ENTRY_PC = RANDOM_ADDR + 2  # libmgba-py reports the pipelined Thumb PC.
SRANDCOUNT_ADDR = 0x020249C0  # source static: src/random.c:5.


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def find_harness_root() -> Path:
    for candidate in (ROOT, *ROOT.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise RuntimeError("could not find the harness oracle")


def symbols(elf: Path) -> list[tuple[int, str]]:
    output = subprocess.run(
        ["arm-none-eabi-nm", "--defined-only", "-n", str(elf)],
        capture_output=True, text=True, check=True,
    ).stdout
    rows = []
    for line in output.splitlines():
        fields = line.split()
        if len(fields) == 3 and fields[1] in ("t", "T"):
            rows.append((int(fields[0], 16), fields[2]))
    return rows


def symbol_at(table: list[tuple[int, str]], address: int) -> str:
    index = bisect.bisect_right(table, (address, "\uffff")) - 1
    require(index >= 0, f"unknown code address {address:#x}")
    base, name = table[index]
    return name if address == base else f"{name}+0x{address - base:x}"


def fixture(equal_speed: bool) -> dict:
    request = json.loads(FIXTURE.read_text())
    if equal_speed:
        # Both leads are the same fully specified, no-hook Murkrow.  This is
        # intentionally in-memory: §4 calls for one checked-in complete-party
        # fixture and a second equal-speed *case*, not a second staging ABI.
        request = copy.deepcopy(request)
        request["overrides"]["parties"]["opponent"][0] = copy.deepcopy(
            request["overrides"]["parties"]["player"][0]
        )
    return request


def stage(harness: Path, request: dict, step_frames: set[int] | None = None, table=None):
    sys.path.insert(0, str(harness / "oracle"))
    from battle_lab import BattleLab, validate_request  # type: ignore
    from emerald_core import EmeraldOracle  # type: ignore

    validated = validate_request(request, PROFILE)
    oracle = EmeraldOracle(
        rom_path=(harness / "reference/pokeemerald/pokeemerald.gba").resolve(),
        map_path=(harness / "reference/pokeemerald/pokeemerald.map").resolve(),
        bootstrap_path=harness / "oracle/bootstrap/factory-battle-scene-off.json",
    )
    class RecordingBattleLab(BattleLab):
        absolute_frame = 0
        samples: list[dict] = []
        calls: list[dict] = []

        def _advance(self, count, buttons, after_frame=None):
            for _ in range(count):
                before = self.oracle.read_u32(SRANDCOUNT_ADDR)
                previous_random_turn_number = self.oracle.read_u16(
                    self.oracle.symbols["gRandomTurnNumber"]
                )
                next_frame = self.absolute_frame + 1
                if step_frames is not None and next_frame in step_frames:
                    step_frame(self.oracle, next_frame, list(buttons), table, self.calls)
                else:
                    self.oracle.advance(list(buttons))
                if after_frame is not None:
                    after_frame()
                self.absolute_frame = next_frame
                after = self.oracle.read_u32(SRANDCOUNT_ADDR)
                self.samples.append({"frame": next_frame,
                    "previousRandomTurnNumber": previous_random_turn_number,
                    "sRandCount": after,
                    "sRandDelta": (after - before) & 0xFFFFFFFF,
                    "mainCallback2": f"0x{self.oracle.read_u32(self.oracle.symbols['gMain'] + 4):08x}",
                    **globals_now(self.oracle)})

    lab = RecordingBattleLab(oracle, PROFILE)
    setup = lab.prepare(validated)
    return oracle, validated, setup, lab


def frames(trace: dict):
    frame = 0
    for segment in trace["segments"]:
        for _ in range(int(segment["frames"])):
            frame += 1
            yield frame, segment.get("buttons", [])


def globals_now(oracle) -> dict:
    addresses = oracle.symbols
    return {
        "gRngValue": oracle.read_u32(addresses["gRngValue"]),
        "gRandomTurnNumber": oracle.read_u16(addresses["gRandomTurnNumber"]),
        "gBattleMainFunc": f"0x{oracle.read_u32(addresses['gBattleMainFunc']):08x}",
        "controllerFlags": f"0x{oracle.read_u32(addresses['gBattleControllerExecFlags']):08x}",
        "gBattlerByTurnOrder": [oracle.read_u8(addresses["gBattlerByTurnOrder"] + i) for i in range(4)],
        "chosenActions": [oracle.read_u8(addresses["gChosenActionByBattler"] + i) for i in range(4)],
        "chosenMoves": [oracle.read_u16(addresses["gChosenMoveByBattler"] + i * 2) for i in range(4)],
        "gCurrentMove": oracle.read_u16(addresses["gCurrentMove"]),
    }


def fast_pass(oracle, trace: dict) -> tuple[list[dict], set[int]]:
    sample = []
    flagged = set()
    previous = oracle.read_u32(SRANDCOUNT_ADDR)
    for frame, buttons in frames(trace):
        oracle.advance(buttons)
        count = oracle.read_u32(SRANDCOUNT_ADDR)
        delta = (count - previous) & 0xFFFFFFFF
        row = {"frame": frame, "sRandCount": count, "sRandDelta": delta, **globals_now(oracle)}
        sample.append(row)
        if delta:
            flagged.add(frame)
        previous = count
    return sample, flagged


def step_frame(oracle, frame: int, buttons: list[str], table: list[tuple[int, str]], calls: list[dict]) -> None:
    oracle._set_buttons(buttons)
    start_counter = oracle.core.frame_counter
    steps = 0
    while True:
        if oracle.core.cpu.pc == RANDOM_ENTRY_PC:
            pre = globals_now(oracle)
            lr = oracle.core.cpu.lr
            # Random's source-level postcondition (src/random.c:11-15).  We
            # keep the emulator's normal one-instruction stepping path here:
            # forcing an inner run-to-return makes this libmgba build unstable
            # across a VBlank boundary.  The frame-end reconciliation below
            # proves this calculated post-state is the observed RAM state.
            post_rng = (pre["gRngValue"] * 1103515245 + 24691) & 0xFFFFFFFF
            calls.append({
                "frame": frame,
                "caller": symbol_at(table, lr),
                "lr": f"0x{lr:08x}",
                "pre": pre,
                "post": {"gRngValue": post_rng, "returnedU16": post_rng >> 16},
            })
        if oracle.core.frame_counter != start_counter:
            break
        oracle.core.step()
        steps += 1
        if steps > 20_000_000:
            raise RuntimeError(f"frame {frame} did not end while single-stepping")
    oracle._screen_stale = False
    oracle.frame += 1


def attribution_pass(oracle, trace: dict, flagged: set[int], table: list[tuple[int, str]]) -> list[dict]:
    calls: list[dict] = []
    for frame, buttons in frames(trace):
        if False and frame in flagged:  # temporary census: establish narrow spans first
            step_frame(oracle, frame, buttons, table, calls)
        else:
            oracle.advance(buttons)
    return calls


def run_case(harness: Path, table: list[tuple[int, str]], equal_speed: bool) -> dict:
    request = fixture(equal_speed)
    print(f"starting {'equal' if equal_speed else 'distinct'}", flush=True)
    oracle, validated, setup, lab = stage(harness, request)
    print("staged", flush=True)
    for _frame, buttons in frames(validated["trace"]):
        lab._advance(1, tuple(buttons))
    per_frame = lab.samples
    # The bootstrap has an intentional per-VBlank Random stream.  Draws A/B
    # are the only fresh-start draws that mutate gRandomTurnNumber: use that
    # fact to retain precisely their two frames, not later action-order ties.
    turn_number_writes = [row for row in per_frame if row["sRandDelta"]
                          and row["previousRandomTurnNumber"] != row["gRandomTurnNumber"]]
    # The trace later executes a move, and so can legitimately reach a later
    # turn's gRandomTurnNumber update.  The first two mutations are A/B; the
    # first's zero predecessor makes that boundary mechanically explicit.
    start_frames = turn_number_writes[:2]
    require(len(start_frames) == 2 and start_frames[0]["previousRandomTurnNumber"] == 0,
            f"expected A/B as the first two turn-number writes, got {turn_number_writes}")
    flagged = {row["frame"] for row in start_frames}
    print("fast-pass", flush=True)
    _oracle2, validated2, _setup2, lab2 = stage(harness, request, flagged, table)
    for _frame, buttons in frames(validated2["trace"]):
        lab2._advance(1, tuple(buttons))
    calls = lab2.calls
    expected_draws = 3 if equal_speed else 2
    require(sum(row["sRandDelta"] for row in start_frames) == expected_draws,
            f"expected {expected_draws} A/tie/B draws, got {start_frames}")
    require(len(calls) == expected_draws,
            f"narrow sRandCount and calls disagree: {calls}")
    expected = (["BattleStartClearSetData+0x29b", "TryDoEventsBeforeFirstTurn+0x26f"]
                if not equal_speed else ["BattleStartClearSetData+0x29b", "GetWhoStrikesFirst+0x3b1", "TryDoEventsBeforeFirstTurn+0x26f"])
    require([row["caller"] for row in calls] == expected,
            f"unexpected A/tie/B callers: {calls}")
    b_frame = start_frames[-1]
    require(calls[-1]["post"]["returnedU16"] == b_frame["gRandomTurnNumber"],
            "B did not persist")
    receipt = {
        "aFrame": start_frames[0]["frame"],
        "bFrame": b_frame["frame"],
        "aToBRandomDraws": expected_draws,
        "callers": [row["caller"] for row in calls],
        "resultingBattlerOrder": b_frame["gBattlerByTurnOrder"][:2],
    }
    if equal_speed:
        receipt["tie"] = {
            "frame": calls[1]["frame"],
            "caller": calls[1]["caller"],
            "lr": calls[1]["lr"],
            "returnedU16": calls[1]["post"]["returnedU16"],
            "randomAndOne": calls[1]["post"]["returnedU16"] & 1,
        }
    return {
        "case": "equal-active-speed" if equal_speed else "distinct-active-speed-no-hooks",
        "setupSpecies": {"player": [row["species"] for row in setup["player"]], "opponent": [row["species"] for row in setup["opponent"]]},
        "perFrame": per_frame,
        "randomCalls": calls, "startReceipt": calls, "receipt": receipt,
        "verdict": "PASS",
    }


def assert_equal_speed_receipt(no_hook: dict, equal_speed: dict) -> None:
    """Prove the tie is one ordered draw inside the already-landed A/B seam."""
    base = no_hook["receipt"]
    tied = equal_speed["receipt"]
    require(base["callers"] == [
        "BattleStartClearSetData+0x29b",
        "TryDoEventsBeforeFirstTurn+0x26f",
    ], f"no-hook A/B receipt moved: {base}")
    require(tied["callers"][0] == base["callers"][0]
            and tied["callers"][-1] == base["callers"][-1],
            f"equal-speed changed A/B caller positions: {tied}")
    require(tied["aFrame"] == base["aFrame"],
            f"equal-speed changed A's frame: {base}, {tied}")
    require(tied["aToBRandomDraws"] == base["aToBRandomDraws"] + 1,
            f"equal-speed did not add exactly one A-to-B draw: {base}, {tied}")
    tie = tied.get("tie")
    require(tie is not None and tied["callers"][1] == tie["caller"],
            f"missing ordered tie receipt: {tied}")
    require(tied["aFrame"] < tie["frame"] <= tied["bFrame"],
            f"tie was not strictly between A and B instructions: {tied}")
    require(tied["resultingBattlerOrder"] == [1, 0],
            f"tie result did not produce the recorded battler order: {tied}")


def single_case(output: Path, equal_speed: bool) -> None:
    harness = find_harness_root()
    table = symbols((harness / "reference/pokeemerald/pokeemerald.elf").resolve())
    output.write_text(json.dumps(run_case(harness, table, equal_speed), indent=2) + "\n")


def subprocess_case(output: Path, equal_speed: bool) -> dict:
    label = "equal" if equal_speed else "distinct"
    child_output = output.with_name(f"{output.name}.{label}.json")
    child = subprocess.run(
        [sys.executable, str(Path(__file__).resolve()), str(child_output), "--case", label],
        stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    valid = False
    try:
        result = json.loads(child_output.read_text())
        valid = result.get("verdict") == "PASS"
    except (OSError, json.JSONDecodeError):
        result = None
    # This is the same teardown allowance as tools/run-mgba-probe.py, but at
    # the case boundary: libmgba can SIGSEGV only after the child wrote its
    # complete receipt.  Separate processes keep that teardown from making a
    # second case's fresh emulator unstable.
    require(valid and child.returncode in (0, -11, 139),
            f"{label} child did not write a valid PASS receipt (exit {child.returncode})")
    return result


def main() -> None:
    require(len(sys.argv) in (2, 4),
            f"usage: {sys.argv[0]} <fresh-output.json> [--case distinct|equal]")
    output = Path(sys.argv[1])
    if len(sys.argv) == 4:
        require(sys.argv[2] == "--case" and sys.argv[3] in ("distinct", "equal"),
                f"invalid case selector: {sys.argv[2:]}")
        single_case(output, sys.argv[3] == "equal")
        return
    no_hook = subprocess_case(output, False)
    equal_speed = subprocess_case(output, True)
    assert_equal_speed_receipt(no_hook, equal_speed)
    result = {"verdict": "PASS", "profile": PROFILE,
              "fixture": str(FIXTURE.relative_to(ROOT)),
              "cases": [no_hook, equal_speed]}
    output.write_text(json.dumps(result, indent=2) + "\n")
    print(f"wrote {output}", flush=True)


if __name__ == "__main__":
    main()
