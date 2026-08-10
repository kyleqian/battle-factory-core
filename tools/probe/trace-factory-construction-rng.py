#!/usr/bin/env python3
"""Trace Factory construction RNG epochs with LR-attributed Random calls.

This is a dev-time, Scene-OFF evidence probe for ISSUES #55.  It records the
complete LCG chain inside one source construction function, tagging each draw
as a CreateMonWithEVSpreadNatureOTID construction draw or a VBlankIntr ambient
draw.  ``anchor`` uses the canonical draft bootstrap; ``liliana`` replays the
committed WIN GO ON fixture; ``factory-varied`` stages a separate complete
legal Factory battle and traces its opponent construction.

Every invocation must use a fresh output path and the repository wrapper:

    python3 tools/run-mgba-probe.py /tmp/fresh.json -- \
      python3 tools/probe/trace-factory-construction-rng.py /tmp/fresh.json anchor

The wrapper's known teardown SIGSEGV is harmless after valid JSON is written.
"""

from __future__ import annotations

import bisect
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any, Callable


if len(sys.argv) != 3:
    raise SystemExit(f"usage: {sys.argv[0]} <output.json> anchor|liliana|factory-varied")

OUTPUT = Path(sys.argv[1])
CASE = sys.argv[2]
if CASE not in {"anchor", "liliana", "factory-varied"}:
    raise SystemExit(f"unknown case {CASE!r}")

HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit(f"could not find oracle harness above {start}")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
ORACLE_DIR = HARNESS_ROOT / "oracle"
sys.path.insert(0, str(ORACLE_DIR))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402


REFERENCE = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
ROM = REFERENCE / "pokeemerald.gba"
MAP = REFERENCE / "pokeemerald.map"
BOOTSTRAP_OFF = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"

RANDOM_ENTRY_PC = 0x0806F5CE  # Random() entry, mGBA's pipelined Thumb PC
SELECTABLE_ENTRY_PC = 0x0819B486  # CreateFrontierFactorySelectableMons + 2
FILL_FACTORY_ENTRY_PC = 0x081635D6  # FillFactoryFrontierTrainerParty + 2
CREATE_EV_ENTRY_PC = 0x08068636  # CreateMonWithEVSpreadNatureOTID + 2
GET_NATURE_ENTRY_PC = 0x0806D08A  # GetNatureFromPersonality + 2
CREATE_MON_ENTRY_PC = 0x08067B4E  # CreateMon + 2
CREATE_MON_RESUME_PC = 0x0806869E  # instruction after CreateMon BL + pipeline
CALCULATE_STATS_ENTRY_PC = 0x08068D0E  # CalculateMonStats + 2
CALCULATE_STATS_RESUME_PC = 0x080686EC  # instruction after CalculateMonStats BL + pipeline
VBLANK_ENTRY_PC = 0x0800073A  # VBlankIntr + 2
VBLANK_EXIT_PC = 0x080007DC  # VBlankIntr's terminal bx + 2
SELECTABLE_POST_END_PC = 0x0819B614  # after held-item SetMonData, before loop test
FILL_FACTORY_POST_END_PC = 0x0816376E  # after held-item SetMonData, before loop test
SRANDCOUNT_ADDR = 0x020249C0  # src/random.c:5, static EWRAM symbol
SAVE_RENTALS_OFFSET = 0xE70  # include/global.h: SaveBlock2.frontier.rentalMons
RENTAL_MON_STRIDE = 12
FACILITY_MON_STRIDE = 16
FACILITY_MON_NATURE_OFFSET = 12
POKEMON_SIZE = 100

ANCHOR_ENTRY_FRAME = 6696
ANCHOR_LAST_FRAME = 6750
LILIANA_FIRST_FRAME = 11311
LILIANA_LAST_FRAME = 11345

ANCHOR_BOOTSTRAP_SHA256 = "9c89c74113f29e7d4595571c3aceb728417c4fe441b644ec0022fb498463f297"

# The committed v1 receipt intentionally remains frame/cursor-only.  A fresh
# probe can opt into mGBA master-cycle evidence for the construction-clock
# follow-up without changing that receipt's byte contract:
#   FACTORY_CONSTRUCTION_CYCLE_EVIDENCE=1 ... trace-factory-construction-rng.py
CYCLE_EVIDENCE = os.environ.get("FACTORY_CONSTRUCTION_CYCLE_EVIDENCE") == "1"


def cycle_snapshot(oracle: EmeraldOracle, frame: int, pc: int, kind: str, **fields: Any) -> dict[str, Any]:
    global_cycles = int(oracle.core._native.timing.globalCycles)
    frame_cycles = int(oracle.core.frame_cycles)
    cpu_cycles = int(oracle.core.cpu._native.cycles)
    master_cycles = global_cycles + cpu_cycles
    return {
        "kind": kind,
        "frame": frame,
        "globalCycles": global_cycles,
        "cpuCycles": cpu_cycles,
        "masterCycles": master_cycles,
        "cyclePhase": master_cycles % frame_cycles,
        "pc": f"0x{pc:08x}",
        **fields,
    }


def symbols(elf: Path) -> list[tuple[int, str]]:
    output = subprocess.run(
        ["arm-none-eabi-nm", "--defined-only", "-n", str(elf)],
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    rows: list[tuple[int, str]] = []
    for line in output.splitlines():
        fields = line.split()
        if len(fields) == 3 and fields[1] in ("t", "T"):
            rows.append((int(fields[0], 16), fields[2]))
    return rows


SYMBOLS = symbols(REFERENCE / "pokeemerald.elf")


def symbol_at(address: int) -> str:
    index = bisect.bisect_right(SYMBOLS, (address, "\uffff")) - 1
    if index < 0:
        return f"0x{address:08x}"
    base, name = SYMBOLS[index]
    return name if address == base else f"{name}+0x{address - base:x}"


def read_u32(oracle: EmeraldOracle, address: int) -> int:
    return oracle.read_u32(address)


def read_u16(oracle: EmeraldOracle, address: int) -> int:
    return oracle.read_u16(address)


def advance_one_instrumented_frame(
    oracle: EmeraldOracle,
    buttons: list[str],
    frame: int,
    active_frames: set[int],
    calls: list[dict[str, Any]],
    target_entry: int,
    epoch: dict[str, Any],
    normal_advance: Callable[[list[str]], None] | None = None,
    increment_oracle_frame: bool = True,
) -> None:
    """Run one video frame, stepping only selected frames instruction-wise."""
    if frame not in active_frames:
        (normal_advance or oracle.advance)(buttons)
        return

    oracle._set_buttons(buttons)
    start_counter = oracle.core.frame_counter
    steps = 0
    while True:
        pc = oracle.core.cpu.pc
        if CYCLE_EVIDENCE:
            cycle_events = epoch.setdefault("cycleEvents", [])
            awaiting_resume = epoch.get("awaitingVBlankResume")
            if awaiting_resume is not None and pc >= 0x08000800 and epoch.get("return") is None:
                cycle_events.append(cycle_snapshot(
                    oracle, frame, pc, "vblank-resume",
                    interruptIndex=awaiting_resume,
                    resumeFunction=symbol_at(pc - 2),
                ))
                epoch.pop("awaitingVBlankResume", None)
            if pc == target_entry and epoch.get("entry") is None:
                cycle_events.append(cycle_snapshot(
                    oracle, frame, pc, "source-function-entry",
                    sourceFunction=symbol_at(pc - 2),
                ))
            if pc == CREATE_EV_ENTRY_PC:
                mon_index = sum(
                    event["kind"] == "construction-entry"
                    for event in cycle_events
                )
                epoch["currentMonIndex"] = mon_index
                epoch["currentAttempt"] = 0
                epoch["constructionReturnPc"] = oracle.core.cpu.lr
                cycle_events.append(cycle_snapshot(
                    oracle, frame, pc, "construction-entry",
                    monIndex=mon_index,
                    returnPc=f"0x{oracle.core.cpu.lr:08x}",
                ))
            elif pc == GET_NATURE_ENTRY_PC and epoch.get("entry") is not None:
                cycle_events.append(cycle_snapshot(
                    oracle, frame, pc, "personality-attempt-check",
                    monIndex=epoch.get("currentMonIndex"),
                    attempt=epoch.get("currentAttempt"),
                ))
                epoch["currentAttempt"] = int(epoch.get("currentAttempt", 0)) + 1
            elif pc == CREATE_MON_ENTRY_PC and epoch.get("entry") is not None:
                cycle_events.append(cycle_snapshot(
                    oracle, frame, pc, "create-mon-entry",
                    monIndex=epoch.get("currentMonIndex"),
                ))
            elif pc == CREATE_MON_RESUME_PC and epoch.get("entry") is not None:
                cycle_events.append(cycle_snapshot(
                    oracle, frame, pc, "create-mon-return",
                    monIndex=epoch.get("currentMonIndex"),
                ))
            elif (
                pc == CALCULATE_STATS_ENTRY_PC
                and epoch.get("entry") is not None
                and symbol_at(oracle.core.cpu.lr).startswith("CreateMonWithEVSpreadNatureOTID")
            ):
                cycle_events.append(cycle_snapshot(
                    oracle, frame, pc, "calculate-mon-stats-entry",
                    monIndex=epoch.get("currentMonIndex"),
                ))
            elif pc == CALCULATE_STATS_RESUME_PC and epoch.get("entry") is not None:
                cycle_events.append(cycle_snapshot(
                    oracle, frame, pc, "calculate-mon-stats-return",
                    monIndex=epoch.get("currentMonIndex"),
                ))
            elif pc in {SELECTABLE_POST_END_PC, FILL_FACTORY_POST_END_PC} and epoch.get("entry") is not None:
                cycle_events.append(cycle_snapshot(
                    oracle, frame, pc, "factory-post-mon-end",
                    monIndex=epoch.get("currentMonIndex"),
                ))
            elif pc == VBLANK_ENTRY_PC and epoch.get("return") is None:
                interrupt_index = int(epoch.get("interruptCount", 0))
                epoch["interruptCount"] = interrupt_index + 1
                cycle_events.append(cycle_snapshot(
                    oracle, frame, pc, "vblank-entry",
                    interruptIndex=interrupt_index,
                    interruptedMonIndex=epoch.get("currentMonIndex"),
                ))
            elif pc == VBLANK_EXIT_PC and epoch.get("return") is None:
                interrupt_index = int(epoch.get("interruptCount", 1)) - 1
                cycle_events.append(cycle_snapshot(
                    oracle, frame, pc, "vblank-return",
                    interruptIndex=interrupt_index,
                    interruptedMonIndex=epoch.get("currentMonIndex"),
                ))
                epoch["awaitingVBlankResume"] = interrupt_index
            construction_return_pc = epoch.get("constructionReturnPc")
            if construction_return_pc is not None:
                aligned_return = int(construction_return_pc) & ~1
                if pc in {aligned_return, aligned_return + 2}:
                    cycle_events.append(cycle_snapshot(
                        oracle, frame, pc, "construction-return",
                        monIndex=epoch.get("currentMonIndex"),
                    ))
                    epoch.pop("constructionReturnPc", None)
        if pc == RANDOM_ENTRY_PC:
            pre = read_u32(oracle, oracle.symbols["gRngValue"])
            lr = oracle.core.cpu.lr
            post = (pre * 1103515245 + 24691) & 0xFFFFFFFF
            call = {
                "frame": frame,
                "caller": symbol_at(lr),
                "lr": f"0x{lr:08x}",
                "pre": pre,
                "post": post,
                "u16": (post >> 16) & 0xFFFF,
            }
            # mGBA's master-cycle clock is the source timing evidence needed
            # by the follow-up TypeScript construction clock.  Keep it opt-in
            # so the committed v1 receipt remains byte/schema-compatible.
            if CYCLE_EVIDENCE:
                timing = cycle_snapshot(oracle, frame, pc, "random")
                for field in ("globalCycles", "cpuCycles", "masterCycles", "cyclePhase"):
                    call[field] = timing[field]
                if epoch.get("entry") is not None and epoch.get("return") is None:
                    kind = "ambient-random" if symbol_at(lr).startswith("VBlankIntr") else "personality-random"
                    cycle_events.append(cycle_snapshot(
                        oracle, frame, pc, kind,
                        caller=symbol_at(lr),
                        monIndex=None if kind == "ambient-random" else epoch.get("currentMonIndex"),
                        attempt=None if kind == "ambient-random" else epoch.get("currentAttempt"),
                        half=None if kind == "ambient-random" else (
                            "low" if symbol_at(lr).endswith("+0x35") else "high"
                        ),
                    ))
            calls.append(call)
        if pc == target_entry and epoch.get("entry") is None:
            entry = {
                "frame": frame,
                "returnPc": f"0x{oracle.core.cpu.lr:08x}",
                "rngValue": read_u32(oracle, oracle.symbols["gRngValue"]),
                "callStartIndex": len(calls),
            }
            if CYCLE_EVIDENCE:
                timing = cycle_snapshot(oracle, frame, pc, "entry")
                entry["globalCycles"] = timing["globalCycles"]
                entry["cpuCycles"] = timing["cpuCycles"]
                entry["masterCycles"] = timing["masterCycles"]
                entry["frameCycles"] = int(oracle.core.frame_cycles)
                entry["cyclePhase"] = timing["cyclePhase"]
            epoch["entry"] = entry
        pending = epoch.get("entry")
        if pending is not None and epoch.get("return") is None:
            lr = int(pending["returnPc"], 16)
            return_pcs = {lr, lr & ~1, (lr & ~1) + 2}
            if pc in return_pcs:
                returned = {
                    "frame": frame,
                    "returnPc": f"0x{pc:08x}",
                    "rngValue": read_u32(oracle, oracle.symbols["gRngValue"]),
                    "callEndIndex": len(calls),
                }
                if CYCLE_EVIDENCE:
                    timing = cycle_snapshot(oracle, frame, pc, "return")
                    returned["globalCycles"] = timing["globalCycles"]
                    returned["cpuCycles"] = timing["cpuCycles"]
                    returned["masterCycles"] = timing["masterCycles"]
                    returned["cyclePhase"] = timing["cyclePhase"]
                    cycle_events.append(cycle_snapshot(
                        oracle, frame, pc, "source-function-return",
                        sourceFunction=symbol_at(target_entry - 2),
                    ))
                epoch["return"] = returned
        if oracle.core.frame_counter != start_counter:
            break
        oracle.core.step()
        steps += 1
        if steps > 20_000_000:
            raise RuntimeError(f"frame {frame} did not finish while stepping")
    oracle._screen_stale = False
    if increment_oracle_frame:
        oracle.frame += 1


def rental_or_temp_ids(oracle: EmeraldOracle, source: str, count: int) -> list[int]:
    if source == "rentalMons":
        save2 = read_u32(oracle, oracle.symbols["gSaveBlock2Ptr"])
        base = save2 + SAVE_RENTALS_OFFSET
        return [read_u16(oracle, base + i * RENTAL_MON_STRIDE) for i in range(count)]
    base = oracle.symbols["gFrontierTempParty"]
    return [read_u16(oracle, base + i * 2) for i in range(count)]


def target_natures(oracle: EmeraldOracle, set_ids: list[int]) -> list[int]:
    base = oracle.symbols["gBattleFrontierMons"]
    return [read_u8(oracle, base + set_id * FACILITY_MON_STRIDE + FACILITY_MON_NATURE_OFFSET) for set_id in set_ids]


def read_u8(oracle: EmeraldOracle, address: int) -> int:
    return oracle.read_u8(address)


def classify_and_summarize(
    *,
    case: str,
    source_function: str,
    epoch: dict[str, Any],
    calls: list[dict[str, Any]],
    oracle: EmeraldOracle,
    set_ids: list[int],
    source: str,
    expected_mon_count: int,
    fast_rows: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    if epoch.get("entry") is None or epoch.get("return") is None:
        raise RuntimeError(f"{case}: failed to find {source_function} entry/return: {epoch}")
    entry = epoch["entry"]
    returned = epoch["return"]
    epoch_calls = calls[entry["callStartIndex"]:returned["callEndIndex"]]
    if not epoch_calls:
        raise RuntimeError(f"{case}: construction epoch had no Random calls")

    source_calls: list[dict[str, Any]] = []
    source_positions: list[int] = []
    sequence: list[dict[str, Any]] = []
    for sequence_index, call in enumerate(epoch_calls):
        caller = call["caller"]
        if caller.startswith("VBlankIntr"):
            tag = "ambient"
        elif caller.startswith("CreateMonWithEVSpreadNatureOTID"):
            tag = "construction"
        else:
            tag = "other"
        tagged = dict(call)
        tagged["sequenceIndex"] = sequence_index
        tagged["tag"] = tag
        sequence.append(tagged)
        if tag == "construction":
            source_calls.append(tagged)
            source_positions.append(sequence_index)

    if any(item["tag"] == "other" for item in sequence):
        others = sorted({item["caller"] for item in sequence if item["tag"] == "other"})
        raise RuntimeError(f"{case}: unexpected non-construction call(s) in epoch: {others}")
    if len(source_calls) % 2:
        raise RuntimeError(f"{case}: odd number of construction Random calls: {len(source_calls)}")

    natures = target_natures(oracle, set_ids)
    if len(natures) != expected_mon_count:
        raise RuntimeError(f"{case}: expected {expected_mon_count} natures, got {natures}")

    mon_summaries: list[dict[str, Any]] = []
    source_index = 0
    for mon_index, nature in enumerate(natures):
        first_source_index = source_index
        attempts = 0
        accepted_personality: int | None = None
        while source_index < len(source_calls):
            low = source_calls[source_index]
            high = source_calls[source_index + 1] if source_index + 1 < len(source_calls) else None
            if high is None:
                break
            personality = low["u16"] | (high["u16"] << 16)
            attempts += 1
            source_index += 2
            if personality % 25 == nature:
                accepted_personality = personality
                break
        if accepted_personality is None:
            raise RuntimeError(f"{case}: mon {mon_index} never accepted nature {nature}")
        last_source_index = source_index - 1
        mon_calls = source_calls[first_source_index:source_index]
        first_call = mon_calls[0]
        last_call = mon_calls[-1]
        first_sequence = source_positions[first_source_index]
        last_sequence = source_positions[last_source_index]
        for offset, item in enumerate(mon_calls):
            item["monIndex"] = mon_index
            item["attempt"] = offset // 2
            item["half"] = "low" if offset % 2 == 0 else "high"
        mon_summaries.append({
            "monIndex": mon_index,
            "setId": set_ids[mon_index],
            "targetNature": nature,
            "attempts": attempts,
            "constructionDraws": attempts * 2,
            "acceptedPersonality": accepted_personality,
            "firstSequenceIndex": first_sequence,
            "lastSequenceIndex": last_sequence,
            "firstFrame": first_call["frame"],
            "lastFrame": last_call["frame"],
            "startCursor": first_call["pre"],
            "endCursor": last_call["post"],
        })
    if source_index != len(source_calls):
        raise RuntimeError(f"{case}: construction draws remain after {expected_mon_count} mons")

    if sequence[0]["pre"] != entry["rngValue"]:
        raise RuntimeError(f"{case}: epoch entry cursor is not sequence start")
    for previous, current in zip(sequence, sequence[1:]):
        if previous["post"] != current["pre"]:
            raise RuntimeError(f"{case}: RNG gap at sequence {current['sequenceIndex']}")
    if sequence[-1]["post"] != returned["rngValue"]:
        raise RuntimeError(f"{case}: return cursor does not follow final sequence draw")

    frame_counts: list[dict[str, int]] = []
    for frame in range(entry["frame"], returned["frame"] + 1):
        rows = [item for item in sequence if item["frame"] == frame]
        frame_counts.append({
            "frame": frame,
            "construction": sum(item["tag"] == "construction" for item in rows),
            "ambient": sum(item["tag"] == "ambient" for item in rows),
            "total": len(rows),
        })

    result: dict[str, Any] = {
        "case": case,
        "sourceFunction": source_function,
        "sourceSetIds": set_ids,
        "source": source,
        "monCount": expected_mon_count,
        "entry": entry,
        "return": returned,
        "sequence": sequence,
        "frameCounts": frame_counts,
        "monBoundaries": mon_summaries,
        "totals": {
            "construction": sum(item["tag"] == "construction" for item in sequence),
            "ambient": sum(item["tag"] == "ambient" for item in sequence),
            "total": len(sequence),
        },
        "gapless": True,
    }
    if fast_rows is not None:
        # The location-only fast pass is useful while developing a new case,
        # but cycle-mode output is the compact reproducible receipt and does
        # not duplicate hundreds of pre-epoch route frames.
        if not CYCLE_EVIDENCE:
            result["fastFrameEvidence"] = fast_rows
    if CYCLE_EVIDENCE:
        cycle_events = epoch.get("cycleEvents", [])
        result["cycleEvidence"] = {
            "frameCycles": int(oracle.core.frame_cycles),
            "initialMasterCyclePhase": source_calls[0]["cyclePhase"],
            "sourceEntryMasterCyclePhase": entry["cyclePhase"],
            "cyclesSincePriorVBlank": (
                source_calls[0]["masterCycles"]
                - max(
                    event["masterCycles"]
                    for event in cycle_events
                    if event["kind"] == "vblank-entry"
                    and event["masterCycles"] <= source_calls[0]["masterCycles"]
                )
            ),
            "events": cycle_events,
        }
    return result


def run_anchor() -> dict[str, Any]:
    calls: list[dict[str, Any]] = []
    epoch: dict[str, Any] = {}
    active = set(range(ANCHOR_ENTRY_FRAME, ANCHOR_LAST_FRAME + 1))

    original = EmeraldOracle._run_bootstrap

    def instrumented_bootstrap(self: EmeraldOracle, spec: dict[str, Any]) -> int:
        frames = 0
        for segment in spec.get("segments", []):
            buttons = segment.get("buttons", [])
            self._set_buttons(buttons)
            for _ in range(int(segment["frames"])):
                frame = frames + 1
                if frame in active:
                    advance_one_instrumented_frame(
                        self, buttons, frame, active, calls, SELECTABLE_ENTRY_PC, epoch,
                        increment_oracle_frame=False,
                    )
                else:
                    self.core.run_frame()
                frames += 1
        for poke in spec.get("pokes", []):
            addr = self.resolve_poke_addr(poke)
            for index, value in enumerate(poke["bytes"]):
                self.write_u8(addr + index, value)
        self._set_buttons([])
        for _ in range(int(spec.get("settleFrames", 0))):
            frame = frames + 1
            if frame in active:
                advance_one_instrumented_frame(
                    self, [], frame, active, calls, SELECTABLE_ENTRY_PC, epoch,
                    increment_oracle_frame=False,
                )
            else:
                self.core.run_frame()
            frames += 1
        return frames

    EmeraldOracle._run_bootstrap = instrumented_bootstrap
    try:
        oracle = EmeraldOracle(ROM, MAP, BOOTSTRAP_OFF)
    finally:
        EmeraldOracle._run_bootstrap = original
    if oracle.canonical_screen_sha256 != ANCHOR_BOOTSTRAP_SHA256:
        raise RuntimeError(f"anchor canonical screen changed: {oracle.canonical_screen_sha256}")
    set_ids = rental_or_temp_ids(oracle, "rentalMons", 6)
    result = classify_and_summarize(
        case="anchor",
        source_function="CreateFrontierFactorySelectableMons",
        epoch=epoch,
        calls=calls,
        oracle=oracle,
        set_ids=set_ids,
        source="gSaveBlock2Ptr->frontier.rentalMons",
        expected_mon_count=6,
    )
    result["oracleProfile"] = "battle-scene-off"
    result["canonicalScreenSha256"] = oracle.canonical_screen_sha256
    return result


def load_fixture(name: str) -> dict[str, Any]:
    return json.loads((WORKTREE_ROOT / "tools" / "battle-lab" / name).read_text())


def validated_request(raw: dict[str, Any]) -> dict[str, Any]:
    value = dict(raw)
    value.setdefault("preCheckpointCaptureFrames", [])
    value.setdefault("preCheckpointCaptureAllFrames", False)
    value.setdefault("rentalSwapCount", 0)
    return validate_request(value, "battle-scene-off")


def stage_request(oracle: EmeraldOracle, raw: dict[str, Any]) -> dict[str, Any]:
    return BattleLab(oracle, "battle-scene-off").prepare(validated_request(raw))


def run_fixed_fixture(raw: dict[str, Any], first_frame: int, last_frame: int) -> tuple[EmeraldOracle, dict[str, Any], dict[str, Any], list[dict[str, Any]]]:
    oracle = EmeraldOracle(ROM, MAP, BOOTSTRAP_OFF)
    fixture = stage_request(oracle, raw)
    trace = raw["trace"]["segments"]
    for segment in trace:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
    oracle.advance(["A"])
    oracle.advance(["A"])
    calls: list[dict[str, Any]] = []
    epoch: dict[str, Any] = {}
    for frame in range(first_frame, last_frame + 1):
        advance_one_instrumented_frame(
            oracle, [], frame, set(range(first_frame, last_frame + 1)), calls,
            FILL_FACTORY_ENTRY_PC, epoch,
        )
    return oracle, fixture, epoch, calls


def run_liliana() -> dict[str, Any]:
    raw = load_fixture("scratch-win-go-on-swap-offer-no-guide-dismiss-probe.json")
    oracle, _, epoch, calls = run_fixed_fixture(raw, LILIANA_FIRST_FRAME, LILIANA_LAST_FRAME)
    set_ids = rental_or_temp_ids(oracle, "tempParty", 3)
    result = classify_and_summarize(
        case="liliana",
        source_function="FillFactoryFrontierTrainerParty",
        epoch=epoch,
        calls=calls,
        oracle=oracle,
        set_ids=set_ids,
        source="gFrontierTempParty",
        expected_mon_count=3,
    )
    result["oracleProfile"] = "battle-scene-off"
    result["canonicalScreenSha256"] = oracle.canonical_screen_sha256
    return result


def read_party_personalities(oracle: EmeraldOracle) -> tuple[int, int, int]:
    base = oracle.symbols["gEnemyParty"]
    return tuple(read_u32(oracle, base + i * POKEMON_SIZE) for i in range(3))


def run_factory_varied() -> dict[str, Any]:
    raw = load_fixture("factory-varied.json")
    request = validated_request(raw)

    # Pass 1 is frame-granularity evidence used only to locate the opponent
    # party write.  The second fresh pass single-steps that complete interval.
    oracle = EmeraldOracle(ROM, MAP, BOOTSTRAP_OFF)
    fast_rows: list[dict[str, Any]] = []
    route_frame = 0
    original_advance = oracle.advance
    prior_party = read_party_personalities(oracle)

    def observed_advance(buttons: list[str]) -> None:
        nonlocal route_frame, prior_party
        route_frame += 1
        before_count = read_u32(oracle, SRANDCOUNT_ADDR)
        before_rng = read_u32(oracle, oracle.symbols["gRngValue"])
        original_advance(buttons)
        after_count = read_u32(oracle, SRANDCOUNT_ADDR)
        after_rng = read_u32(oracle, oracle.symbols["gRngValue"])
        now_party = read_party_personalities(oracle)
        fast_rows.append({
            "frame": route_frame,
            "randomCalls": (after_count - before_count) & 0xFFFFFFFF,
            "rngBefore": before_rng,
            "rngAfter": after_rng,
            "partyBefore": list(prior_party),
            "partyAfter": list(now_party),
            "partyChanged": now_party != prior_party,
        })
        prior_party = now_party

    oracle.advance = observed_advance  # type: ignore[method-assign]
    stage_request(oracle, raw)
    changed = [row["frame"] for row in fast_rows if row["partyChanged"]]
    if not changed:
        raise RuntimeError("factory-varied: fast pass saw no gEnemyParty construction write")
    first = max(1, min(changed) - 12)
    last = max(changed) + 12

    oracle2 = EmeraldOracle(ROM, MAP, BOOTSTRAP_OFF)
    calls: list[dict[str, Any]] = []
    epoch: dict[str, Any] = {}
    route_frame = 0
    original_advance2 = oracle2.advance
    target_frames = set(range(first, last + 1))

    def targeted_advance(buttons: list[str]) -> None:
        nonlocal route_frame
        route_frame += 1
        advance_one_instrumented_frame(
            oracle2, buttons, route_frame, target_frames, calls,
            FILL_FACTORY_ENTRY_PC, epoch, original_advance2,
        )

    oracle2.advance = targeted_advance  # type: ignore[method-assign]
    stage_request(oracle2, raw)
    set_ids = rental_or_temp_ids(oracle2, "tempParty", 3)
    result = classify_and_summarize(
        case="factory-varied",
        source_function="FillFactoryFrontierTrainerParty",
        epoch=epoch,
        calls=calls,
        oracle=oracle2,
        set_ids=set_ids,
        source="gFrontierTempParty",
        expected_mon_count=3,
        fast_rows=fast_rows,
    )
    result["oracleProfile"] = "battle-scene-off"
    result["canonicalScreenSha256"] = oracle2.canonical_screen_sha256
    result["targetFrameRange"] = [first, last]
    return result


def main() -> None:
    if OUTPUT.exists():
        raise SystemExit(f"refusing existing output path: {OUTPUT}")
    if CASE == "anchor":
        result = run_anchor()
    elif CASE == "liliana":
        result = run_liliana()
    else:
        result = run_factory_varied()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, indent=2) + "\n")
    print(
        f"wrote {OUTPUT}: {result['case']} "
        f"{result['totals']['construction']} construction + "
        f"{result['totals']['ambient']} ambient draws",
        flush=True,
    )


if __name__ == "__main__":
    main()
