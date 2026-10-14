#!/usr/bin/env python3
"""fpc177 ROM probe (ISSUES #139 Focus Punch edge routes). Pass 1 of tools/probe/probe-rcp143-random-callers.py (per-frame Random() count,
displayed-string changes, battle-main / script / animation transitions) plus party-index / species / controller-flag watch. No attribution pass.

    python3 tools/run-mgba-probe.py <out.json> -- python3 tools/integration/fpc177Probe.py <card.json> <out.json>
"""

from __future__ import annotations

import argparse
import bisect
import hashlib
import json
import subprocess
import sys
from pathlib import Path

PARSER = argparse.ArgumentParser()
PARSER.add_argument("card", type=Path)
PARSER.add_argument("output", type=Path)
ARGS = PARSER.parse_args()

WORKTREE_ROOT = Path(__file__).resolve().parents[2]


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit(f"could not find harness root above {start}")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
ORACLE_DIR = HARNESS_ROOT / "oracle"
sys.path.insert(0, str(ORACLE_DIR))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

REFERENCE = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
BOOTSTRAPS = {
    "battle-scene-off": ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json",
    "battle-scene-on": ORACLE_DIR / "bootstrap" / "factory.json",
}
RANDOM_ADDR = 0x0806F5CC
RANDOM_ENTRY_PC = RANDOM_ADDR + 2
SRANDCOUNT_ADDR = 0x020249C0
LCG_MULT = 0x41C64E6D
LCG_ADD = 0x6073
MAX_DRAWS_PER_FRAME = 512
DISPLAYED_STRING_BYTES = 160
BATTLE_MON_SIZE = 0x58
BATTLE_MON_HP = 0x28
BATTLE_MON_STATUS2 = 0x50


def parse_range(text: str) -> tuple[int, int] | None:
    if not text:
        return None
    start, end = text.split(":")
    return int(start), int(end)


def lcg(value: int) -> int:
    return (value * LCG_MULT + LCG_ADD) & 0xFFFFFFFF


def lcg_distance(before: int, after: int) -> int:
    value = before & 0xFFFFFFFF
    for k in range(MAX_DRAWS_PER_FRAME + 1):
        if value == (after & 0xFFFFFFFF):
            return k
        value = lcg(value)
    return -1


def nm_symbols() -> tuple[list[tuple[int, str]], dict[str, int]]:
    out = subprocess.run(
        ["arm-none-eabi-nm", "--defined-only", "-n", str(REFERENCE / "pokeemerald.elf")],
        capture_output=True, text=True, check=True,
    ).stdout
    text: list[tuple[int, str]] = []
    every: dict[str, int] = {}
    for line in out.splitlines():
        parts = line.split()
        if len(parts) != 3:
            continue
        address, kind, name = int(parts[0], 16), parts[1], parts[2]
        every.setdefault(name, address)
        if kind in ("t", "T"):
            text.append((address, name))
    text.sort()
    return text, every


def nearest(table: list[tuple[int, str]], address: int, span: int) -> str:
    index = bisect.bisect_right(table, (address, "￿")) - 1
    if index < 0:
        return f"0x{address:08X}"
    base, name = table[index]
    delta = address - base
    if delta > span:
        return f"0x{address:08X}"
    return name if delta == 0 else f"{name}+0x{delta:x}"


def decode_displayed(raw: list[int]) -> str:
    punctuation = {
        0x00: " ", 0xAB: "!", 0xAC: "?", 0xAD: ".", 0xAE: "-", 0xB0: "…",
        0xB4: "’", 0xB8: ",", 0xBA: "/", 0xF0: ":",
    }
    chars: list[str] = []
    for value in raw:
        if value == 0xFF:
            break
        if value in (0xFE, 0xFA, 0xFB):
            chars.append("\n")
        elif value in punctuation:
            chars.append(punctuation[value])
        elif 0xA1 <= value <= 0xAA:
            chars.append(str(value - 0xA1))
        elif 0xBB <= value <= 0xD4:
            chars.append(chr(ord("A") + value - 0xBB))
        elif 0xD5 <= value <= 0xEE:
            chars.append(chr(ord("a") + value - 0xD5))
        else:
            chars.append(f"<{value:02X}>")
    return "".join(chars)


def iter_trace_frames(trace: dict):
    frame = 0
    for segment in trace["segments"]:
        for _ in range(int(segment["frames"])):
            frame += 1
            yield frame, segment.get("buttons", [])


def party_identity(mon: dict) -> dict:
    keys = ("species", "item", "abilitySlot", "ability", "moves", "hp", "maxHp", "stats", "level", "personality")
    return {key: mon[key] for key in keys if key in mon}


def main() -> None:
    card = json.loads(ARGS.card.read_text())
    profile = card.get("profile", "battle-scene-off")
    request = validate_request(card, profile)
    text_table, every_symbol = nm_symbols()
    oracle = EmeraldOracle(REFERENCE / "pokeemerald.gba", REFERENCE / "pokeemerald.map", BOOTSTRAPS[profile])
    lab = BattleLab(oracle, profile)
    lab.prepare(request)
    symbols = oracle.symbols
    script_labels = sorted(
        (address, name) for name, address in symbols.items()
        if name.startswith("BattleScript") or name.startswith("gBattleScriptsForMoveEffects")
    )
    anim_labels = sorted(
        (address, name) for name, address in every_symbol.items()
        if name.startswith(("General_", "Move_", "Special_", "Status_"))
    )
    anim_ptr_addr = every_symbol["sBattleAnimScriptPtr"]
    anim_active_addr = every_symbol["gAnimScriptActive"]
    battle_mons = symbols["gBattleMons"]
    party_indexes = every_symbol["gBattlerPartyIndexes"]
    exec_flags = every_symbol["gBattleControllerExecFlags"]
    parties_before = lab.snapshot()["parties"]

    def main_func() -> str:
        return nearest(text_table, oracle.read_u32(symbols["gBattleMainFunc"]) & ~1, 0x1000)

    def script_label() -> str:
        return nearest(script_labels, oracle.read_u32(symbols["gBattlescriptCurrInstr"]), 0x400)

    def watch() -> dict:
        anim_active = oracle.read_u8(anim_active_addr)
        return {
            "battleMainFunc": main_func(),
            "actionFuncId": oracle.read_u8(symbols["gCurrentActionFuncId"]),
            "turnActionNumber": oracle.read_u8(symbols["gCurrentTurnActionNumber"]),
            "script": script_label(),
            "currentMove": oracle.read_u16(symbols["gCurrentMove"]),
            "attacker": oracle.read_u8(symbols["gBattlerAttacker"]),
            "animActive": anim_active,
            "animScript": nearest(anim_labels, oracle.read_u32(anim_ptr_addr), 0x400) if anim_active else None,
            "activeHp": [oracle.read_u16(battle_mons + b * BATTLE_MON_SIZE + BATTLE_MON_HP) for b in range(2)],
            "species": [oracle.read_u16(battle_mons + b * BATTLE_MON_SIZE) for b in range(2)],
            "partyIndex": [oracle.read_u16(party_indexes + 2 * b) for b in range(2)],
            "execFlags": oracle.read_u32(exec_flags),
        }

    def read_message() -> str:
        return decode_displayed([
            oracle.read_u8(symbols["gDisplayedStringBattle"] + offset) for offset in range(DISPLAYED_STRING_BYTES)
        ])

    previous = watch()
    initial = previous
    previous_message = read_message()
    count_before = oracle.read_u32(SRANDCOUNT_ADDR)
    rng_before = oracle.read_u32(symbols["gRngValue"])
    per_frame: list[dict] = []
    transitions: list[dict] = []
    messages: list[dict] = []
    mismatches: list[dict] = []
    total = 0
    for frame, buttons in iter_trace_frames(request["trace"]):
        oracle.advance(buttons)
        count_after = oracle.read_u32(SRANDCOUNT_ADDR)
        rng_after = oracle.read_u32(symbols["gRngValue"])
        calls = (count_after - count_before) & 0xFFFFFFFF
        lcg_calls = lcg_distance(rng_before, rng_after)
        if lcg_calls != calls:
            mismatches.append({"frame": frame, "sRandCount": calls, "lcgDistance": lcg_calls})
        now = watch()
        if calls:
            per_frame.append({"frame": frame, "calls": calls, "rngBefore": rng_before, "rngAfter": rng_after, "script": now["script"], "battleMainFunc": now["battleMainFunc"]})
        total += calls
        count_before, rng_before = count_after, rng_after
        changed = {key: [previous[key], now[key]] for key in now if now[key] != previous[key]}
        if changed:
            transitions.append({"frame": frame, "changed": changed})
            previous = now
        message = read_message()
        if message != previous_message:
            messages.append({"frame": frame, "text": message})
        previous_message = message
    if mismatches:
        raise SystemExit(f"sRandCount and LCG replay disagree on {len(mismatches)} frame(s): {mismatches[0]}")
    final_snapshot = lab.snapshot()
    result = {
        "schema": "fpc177-probe/v1",
        "card": ARGS.card.as_posix(),
        "oracleProfile": profile,
        "seed": request["seed"],
        "parties": {side: [party_identity(mon) for mon in parties_before[side]] for side in ("player", "opponent")},
        "initial": initial,
        "totalRandomCalls": total,
        "perFrameDraws": per_frame,
        "messages": messages,
        "transitions": transitions,
        "final": {
            "watch": watch(),
            "playerParty": [{"species": m["species"], "hp": m["hp"]} for m in final_snapshot["parties"]["player"]],
            "opponentParty": [{"species": m["species"], "hp": m["hp"]} for m in final_snapshot["parties"]["opponent"]],
            "battleOutcome": final_snapshot["battleOutcome"],
        },
        "framebufferSha256": hashlib.sha256(oracle.screen_rgb()).hexdigest(),
    }
    ARGS.output.write_text(json.dumps(result, indent=1) + "\n")
    print(f"wrote {ARGS.output}: total={total} messages={len(messages)}", flush=True)


if __name__ == "__main__":
    main()
