#!/usr/bin/env python3
"""Attribute coalesced battle-entry sprite allocator calls in exact order.

Pass one uses the ordinary frame API to select only frames whose final sprite
table hides multiple operations or same-slot template reuse.  A fresh pass
single-steps those frames and records the stock allocator entry/return ABI.
No framebuffer, ROM patch, breakpoint, or staged mutable battle state is used.
"""
from __future__ import annotations

import bisect
import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit(f"usage: {sys.argv[0]} <scenario.json> <output.json>")

SCENARIO, OUTPUT = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents)
               if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

PROFILE = "battle-scene-on"
SPRITE_SIZE = 0x44
THUMB_PIPELINE = 2
MAX_FRAME_STEPS = 20_000_000


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def symbol_data() -> tuple[dict[str, int], dict[int, list[str]], list[tuple[int, str]]]:
    elf = ROOT / "reference/pokeemerald/pokeemerald.elf"
    text = subprocess.run(
        ["arm-none-eabi-nm", "--defined-only", "-n", str(elf)],
        check=True, capture_output=True, text=True,
    ).stdout
    names: dict[str, int] = {}
    by_address: dict[int, list[str]] = {}
    functions: list[tuple[int, str]] = []
    for line in text.splitlines():
        fields = line.split()
        if len(fields) != 3:
            continue
        address_text, kind, name = fields
        address = int(address_text, 16) & ~1
        names[name] = address
        by_address.setdefault(address, []).append(name)
        if kind in ("t", "T"):
            functions.append((address, name))
    functions.sort()
    return names, by_address, functions


NAMES, ADDRESS_NAMES, FUNCTIONS = symbol_data()
ALLOCATOR_NAMES = ("CreateSprite", "CreateSpriteAtEnd", "CreateSpriteAt", "DestroySprite")
ALLOCATORS = {NAMES[name]: name for name in ALLOCATOR_NAMES}


def caller_of(address: int) -> str:
    address &= ~1
    index = bisect.bisect_right(FUNCTIONS, (address, "\uffff")) - 1
    if index < 0:
        return f"<unknown {address:#010x}>"
    base, name = FUNCTIONS[index]
    offset = address - base
    return name if offset == 0 else f"{name}+0x{offset:x}"


def new_stage() -> tuple[EmeraldOracle, BattleLab, dict]:
    request = validate_request(json.loads(SCENARIO.read_text()), PROFILE)
    ref = ROOT / "reference/pokeemerald"
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map",
                           HARNESS / "oracle/bootstrap/factory.json")
    return oracle, BattleLab(oracle, PROFILE), request


def sprite_identity(oracle: EmeraldOracle, slot: int) -> tuple[int, int] | None:
    base = NAMES["gSprites"] + SPRITE_SIZE * slot
    if not oracle.read_u8(base + 0x3E) & 1:
        return None
    return oracle.read_u32(base + 0x14), oracle.read_u32(base + 0x1C)


def occupied(oracle: EmeraldOracle) -> dict[int, tuple[int, int]]:
    return {slot: identity for slot in range(64)
            if (identity := sprite_identity(oracle, slot)) is not None}


def first_trace_frames(trace: dict, count: int):
    yielded = 0
    for segment in trace["segments"]:
        for _ in range(int(segment["frames"])):
            if yielded == count:
                return
            yielded += 1
            yield segment.get("buttons", [])


def sprite_rows(oracle: EmeraldOracle) -> list[dict]:
    rows = []
    for slot, (template, callback) in occupied(oracle).items():
        rows.append({
            "slot": slot,
            "template": hex(template),
            "templateNames": ADDRESS_NAMES.get(template & ~1, []),
            "callback": hex(callback),
            "callbackNames": ADDRESS_NAMES.get(callback & ~1, []),
        })
    return rows


def fast_flagged_steps() -> tuple[list[int], dict[int, dict], dict, list[dict], list[dict]]:
    oracle, lab, request = new_stage()
    step = 0
    prior = occupied(oracle)
    changes: dict[int, dict] = {}
    original_advance = oracle.advance

    def advance(buttons):
        nonlocal step, prior
        result = original_advance(buttons)
        step += 1
        current = occupied(oracle)
        freed = sorted(set(prior) - set(current))
        allocated = sorted(slot for slot, value in current.items()
                           if slot not in prior or prior[slot][0] != value[0])
        replacements = sorted(slot for slot in allocated if slot in prior)
        if len(freed) + len(allocated) > 1 or replacements:
            changes[step] = {
                "freed": freed, "allocated": allocated,
                "replacements": replacements,
                "occupiedBefore": sorted(prior), "occupiedAfter": sorted(current),
            }
        prior = current
        return result

    oracle.advance = advance
    setup = lab.prepare(request)
    command_prompt = sprite_rows(oracle)
    for buttons in first_trace_frames(request["trace"], 40):
        advance(buttons)
    first_move = sprite_rows(oracle)
    # Battle's ResetSpriteData is the last full clear. Exclude draft/transition
    # allocation batches before that source-owned lifecycle boundary.
    resets = [candidate for candidate, change in changes.items()
              if not change["occupiedAfter"] and len(change["freed"]) >= 10]
    if not resets:
        raise RuntimeError("battle ResetSpriteData boundary was not observed")
    reset = max(resets)
    flagged = sorted(candidate for candidate in changes if candidate > reset)
    # Entry topology is complete before the trace; move-body frames are not
    # needed to derive its persistent host.
    return flagged, changes, setup, command_prompt, first_move


def template_snapshot(oracle: EmeraldOracle, address: int) -> dict:
    pointers = {
        "oam": oracle.read_u32(address + 4),
        "anims": oracle.read_u32(address + 8),
        "images": oracle.read_u32(address + 12),
        "affineAnims": oracle.read_u32(address + 16),
        "callback": oracle.read_u32(address + 20),
    }
    return {
        "address": hex(address),
        "names": ADDRESS_NAMES.get(address & ~1, []),
        "tileTag": oracle.read_u16(address),
        "paletteTag": oracle.read_u16(address + 2),
        **{key: hex(value) for key, value in pointers.items()},
        "callbackNames": ADDRESS_NAMES.get(pointers["callback"] & ~1, []),
    }


def step_frame(oracle: EmeraldOracle, buttons: list[str], logical_step: int,
               calls: list[dict]) -> None:
    oracle._set_buttons(buttons)
    start_counter = oracle.core.frame_counter
    pending: list[dict] = []
    instruction = 0
    while oracle.core.frame_counter == start_counter:
        executing = (int(oracle.core.cpu.pc) - THUMB_PIPELINE) & ~1
        # Returns are observed before the next instruction retires, while r0
        # still contains CreateSprite's u8 result.
        for call in list(reversed(pending)):
            if executing == call["returnAddress"]:
                call["resultSlot"] = int(oracle.core.cpu.gprs[0]) & 0xFF if call["kind"] != "DestroySprite" else None
                call["occupiedAfter"] = sorted(occupied(oracle))
                pending.remove(call)
        kind = ALLOCATORS.get(executing)
        if kind is not None:
            registers = [int(oracle.core.cpu.gprs[index]) for index in range(4)]
            link_register = int(oracle.core.cpu.lr)
            if kind == "CreateSpriteAt":
                slot_argument, template = registers[0] & 0xFF, registers[1]
            elif kind == "DestroySprite":
                slot_argument = (registers[0] - NAMES["gSprites"]) // SPRITE_SIZE
                template = None
            else:
                slot_argument, template = None, registers[0]
            call = {
                "sequence": len(calls), "step": logical_step,
                "instruction": instruction, "kind": kind,
                "entryAddress": hex(executing),
                "callerLr": hex(link_register & 0xFFFFFFFF),
                "caller": caller_of(link_register),
                "returnAddress": link_register & ~1,
                "slotArgument": slot_argument,
                "template": template_snapshot(oracle, template) if template is not None else None,
                "occupiedBefore": sorted(occupied(oracle)),
            }
            calls.append(call)
            pending.append(call)
        oracle.core.step()
        instruction += 1
        if instruction > MAX_FRAME_STEPS:
            raise RuntimeError(f"step {logical_step} exceeded instruction limit")
    if pending:
        raise RuntimeError(f"step {logical_step} ended with pending calls: {pending}")
    oracle._screen_stale = False
    oracle.frame += 1


def exact_calls(flagged: set[int]) -> tuple[list[dict], dict, list[dict], list[dict], dict]:
    oracle, lab, request = new_stage()
    step = 0
    calls: list[dict] = []
    original_advance = oracle.advance

    def advance(buttons):
        nonlocal step
        step += 1
        if step in flagged:
            step_frame(oracle, buttons, step, calls)
            return None
        return original_advance(buttons)

    oracle.advance = advance
    setup = lab.prepare(request)
    command_prompt = sprite_rows(oracle)
    for buttons in first_trace_frames(request["trace"], 40):
        advance(buttons)
    first_move = sprite_rows(oracle)
    ids = {
        "battlerSpriteIds": [oracle.read_u8(NAMES["gBattlerSpriteIds"] + index) for index in range(2)],
        "healthboxSpriteIds": [oracle.read_u8(NAMES["gHealthboxSpriteIds"] + index) for index in range(2)],
    }
    for call in calls:
        call["returnAddress"] = hex(call["returnAddress"])
    return calls, setup, command_prompt, first_move, ids


def main() -> None:
    flagged, changes, fast_setup, fast_prompt, fast_first_move = fast_flagged_steps()
    calls, exact_setup, exact_prompt, exact_first_move, ids = exact_calls(set(flagged))
    if fast_setup != exact_setup:
        raise RuntimeError("fresh targeted pass staged a different battle")
    if fast_prompt != exact_prompt or fast_first_move != exact_first_move:
        raise RuntimeError("targeted stepping changed the entry topology")
    ref = ROOT / "reference/pokeemerald"
    source_files = ("src/sprite.c", "src/battle_interface.c", "src/battle_gfx_sfx_util.c",
                    "src/battle_controller_player.c", "src/battle_controller_opponent.c",
                    "src/pokeball.c", "src/util.c")
    payload = {
        "schema": "known-entry-sprite-allocator-calls/v1",
        "scenario": str(SCENARIO),
        "profile": PROFILE,
        "method": "ordinary fast frame selection plus fresh targeted instruction stepping",
        "framebufferRead": False, "romOrRamPatched": False,
        "referenceSha256": {name: sha(ref / name) for name in
                            ("pokeemerald.gba", "pokeemerald.elf", "pokeemerald.map")},
        "sourceSha256": {name: sha(ref / name) for name in source_files},
        "toolSha256": sha(Path(__file__)),
        "flaggedSteps": flagged,
        "frameDeltas": {str(step): changes[step] for step in flagged},
        "calls": calls,
        "commandPrompt": fast_prompt,
        "firstMove": fast_first_move,
        **ids,
        "historyBound": "fresh ordinary BattleLab singles entry before first legal move; unknown switch, summary, substitute, transform, and alternate entry paths excluded",
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, separators=(",", ":")) + "\n")
    print(json.dumps({"output": str(OUTPUT), "flagged": len(flagged), "calls": len(calls)}))


if __name__ == "__main__":
    main()
