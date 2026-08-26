#!/usr/bin/env python3
"""ISSUES #128 stock-ROM receipt probe (Battle Scene OFF, read-only).

Run only through tools/run-mgba-probe.py, with the harness's mGBA-enabled
interpreter, one arm at a time:

    python3 tools/run-mgba-probe.py /tmp/out.json -- \
        <mgba-venv>/bin/python tools/probe/probe-issue128-ability-history-off.py \
        tools/battle-lab/issue128-ability-history-intimidate-off.json /tmp/out.json

What it proves, without staging any transient battle state:

1. `BATTLE_HISTORY->abilities[0..3]` right after battle start. The source tail
   of `AbilityBattleEffects` records `(battler, gLastUsedAbility)` whenever the
   dispatch had an effect and `caseID < ABILITYEFFECT_CHECK_OTHER_SIDE`
   (`src/battle_util.c:3194-3195`), and BOTH battle-start dispatch sites pass
   the literal `0` (`src/battle_main.c:3880` INTIMIDATE1, `:3882` TRACE), so
   `RecordAbilityBattle` (an unguarded
   `BATTLE_HISTORY->abilities[battler] = abilityId`,
   `src/battle_ai_script_commands.c:643-646`) always writes slot 0 -- the
   PLAYER's slot -- no matter which battler holds the ability.

   Address arithmetic (cited, not guessed):
     `gBattleResources` (symbol) -> u32 ptr to `struct BattleResources`;
     `battleHistory` is its 7th pointer member (`include/battle.h`
     `struct BattleResources`), so + 6*4 = +24;
     `struct BattleHistory` (`include/battle.h`) opens with
     `struct UsedMoves usedMoves[MAX_BATTLERS_COUNT]`, and
     `struct UsedMoves { u16 moves[MAX_MON_MOVES]; u16 unknown[MAX_MON_MOVES]; }`
     = 4*2 + 4*2 = 16 bytes, MAX_BATTLERS_COUNT = 4 -> `abilities` at +64.

2. Every `Random()` draw in the AI's turn-1 decision window, attributed to its
   caller function. `Cmd_get_ability` reads `abilities[battler]` FIRST and
   returns without drawing when it is non-zero; only the two-ability fallthrough
   draws `Random() & 1`. The player lead is Golduck (Damp / Cloud Nine), so the
   control arm must show `Cmd_get_ability` draws that the Intimidate/Trace arms
   do not.

Pass 1 counts draws per frame with `sRandCount` (`src/random.c:5,14` -- a real
source global bumped once per `Random()` call) at full speed. Pass 2 re-stages
the identical fixture fresh and single-steps ONLY the flagged frames up to and
including the AI's turn-1 decision, reading `cpu.lr` at every entry to
`Random()` and bisecting it against the ELF's text symbols.
"""

from __future__ import annotations

import bisect
import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit(f"usage: {sys.argv[0]} <fixture.json> <output.json>")

FIXTURE_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent


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

PROFILE = "battle-scene-off"
REFERENCE = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE / "pokeemerald.gba"
MAP_PATH = REFERENCE / "pokeemerald.map"
ELF_PATH = REFERENCE / "pokeemerald.elf"
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"

# `bin/oracle symbols Random`; libmgba-py's cpu.pc is the pipelined PC (+2 in
# Thumb), so the entry check compares against RANDOM_ADDR + 2.
RANDOM_ADDR = 0x0806F5CC
RANDOM_ENTRY_PC = RANDOM_ADDR + 2
SRANDCOUNT_ADDR = 0x020249C0

# struct BattleResources: battleHistory is member index 6 (include/battle.h).
BATTLE_HISTORY_PTR_OFFSET = 6 * 4
# struct BattleHistory: usedMoves[4] of struct UsedMoves (16 bytes) precede
# `u8 abilities[MAX_BATTLERS_COUNT]` (include/battle.h, include/constants/global.h:82).
ABILITIES_OFFSET = 4 * 16
DISPLAYED_STRING_BYTES = 128


def decode_displayed(raw: list[int]) -> str:
    chars: list[str] = []
    punctuation = {
        0x00: " ", 0xAB: "!", 0xAC: "?", 0xAD: ".", 0xAE: "-",
        0xB4: "’", 0xB8: ",", 0xBA: "/", 0xF0: ":",
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


def build_symbol_table() -> list[tuple[int, str]]:
    out = subprocess.run(
        ["arm-none-eabi-nm", "--defined-only", "-n", str(ELF_PATH)],
        capture_output=True, text=True, check=True,
    ).stdout
    table: list[tuple[int, str]] = []
    for line in out.splitlines():
        parts = line.split()
        if len(parts) != 3:
            continue
        addr_hex, kind, name = parts
        if kind not in ("t", "T"):
            continue
        table.append((int(addr_hex, 16), name))
    table.sort(key=lambda pair: pair[0])
    return table


def symbol_address(symbol_table: list[tuple[int, str]], name: str) -> int:
    for addr, symbol in symbol_table:
        if symbol == name:
            return addr
    raise SystemExit(f"symbol {name} not found in {ELF_PATH}")


def caller_of(symbol_table: list[tuple[int, str]], addr: int) -> str:
    idx = bisect.bisect_right(symbol_table, (addr, "￿")) - 1
    if idx < 0:
        return f"<unknown 0x{addr:08x}>"
    base, name = symbol_table[idx]
    offset = addr - base
    return name if offset == 0 else f"{name}+0x{offset:x}"


def iter_trace_frames(trace: dict):
    frame = 0
    for segment in trace["segments"]:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            frame += 1
            yield frame, buttons


def party_identity(mon: dict) -> dict:
    return {
        "species": mon["species"],
        "item": mon["item"],
        "abilitySlot": mon["abilitySlot"],
        "ability": mon["ability"],
        "moves": mon["moves"],
    }


class Reader:
    def __init__(self, oracle: EmeraldOracle, lab: BattleLab) -> None:
        self.oracle = oracle
        self.lab = lab
        self.symbols = oracle.symbols

    def ability_history(self) -> list[int]:
        resources = self.oracle.read_u32(self.symbols["gBattleResources"])
        history = self.oracle.read_u32(resources + BATTLE_HISTORY_PTR_OFFSET)
        return [self.oracle.read_u8(history + ABILITIES_OFFSET + i) for i in range(4)]

    def main_func(self) -> int:
        """`gBattleMainFunc` with the Thumb bit masked off."""
        return self.oracle.read_u32(self.symbols["gBattleMainFunc"]) & ~1

    def chosen_moves(self) -> list[int]:
        base = self.symbols["gChosenMoveByBattler"]
        return [self.oracle.read_u16(base + battler * 2) for battler in range(4)]

    def compact(self) -> dict:
        state = self.lab.snapshot()
        player = state["battlers"]["player"]
        opponent = state["battlers"]["opponent"]
        raw = [
            self.oracle.read_u8(self.symbols["gDisplayedStringBattle"] + offset)
            for offset in range(DISPLAYED_STRING_BYTES)
        ]
        return {
            "rngValue": state["rngValue"],
            "abilityHistory": self.ability_history(),
            "chosenMoveByBattler": self.chosen_moves(),
            "battleMainFunc": self.main_func(),
            "lastUsedAbility": self.oracle.read_u8(self.symbols["gLastUsedAbility"]),
            "player": {
                "species": player["species"], "ability": player["ability"],
                "hp": player["hp"], "statStages": player["statStages"],
            },
            "opponent": {
                "species": opponent["species"], "ability": opponent["ability"],
                "hp": opponent["hp"],
            },
            "displayedString": decode_displayed(raw),
        }


def stage() -> tuple[EmeraldOracle, BattleLab, dict, dict]:
    fixture = json.loads(FIXTURE_PATH.read_text())
    request = validate_request(fixture, PROFILE)
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    lab = BattleLab(oracle, PROFILE)
    lab.prepare(request)
    return oracle, lab, request, lab.snapshot()["parties"]


def step_through_frame(oracle: EmeraldOracle, buttons, hits: list[tuple[int, int]]) -> None:
    oracle._set_buttons(buttons)
    start_fc = oracle.core.frame_counter
    steps = 0
    max_steps = 20_000_000
    while True:
        if oracle.core.cpu.pc == RANDOM_ENTRY_PC:
            hits.append((oracle.frame + 1, oracle.core.cpu.lr))
        if oracle.core.frame_counter != start_fc:
            break
        oracle.core.step()
        steps += 1
        if steps > max_steps:
            raise RuntimeError(f"frame did not end after {max_steps} single steps")
    oracle._screen_stale = False
    oracle.frame += 1


def main() -> None:
    symbol_table = build_symbol_table()

    # ---- Pass 1: full-speed per-frame ledger. ----
    oracle, lab, request, parties = stage()
    reader = Reader(oracle, lab)
    trace = request["trace"]

    at_battle_start = reader.compact()
    # `HandleTurnActionSelectionState` (`src/battle_main.c`) is the
    # `gBattleMainFunc` that runs BOTH battlers' action selection, including
    # the opponent controller's `BattleAI_ChooseMoveOrAction`. The battle-lab
    # checkpoint already sits inside turn 1's run of it (the AI has committed
    # BITE and Intimidate has already dropped the player's Attack stage), so
    # the first fully observable AI decision is turn 2's: leave that run, then
    # take the whole of the next one. Both `BATTLE_HISTORY->abilities[0]` and
    # the two-ability player lead are unchanged by then, so it exercises
    # exactly the `Cmd_get_ability` branch #128 is about.
    selection_func = symbol_address(symbol_table, "HandleTurnActionSelectionState")
    ledger: list[dict] = []
    message_events: list[dict] = []
    main_func_runs: list[dict] = []
    previous_message = at_battle_start["displayedString"]
    before = at_battle_start
    rand_before = oracle.read_u32(SRANDCOUNT_ADDR)
    left_first_selection = False
    window_start_exclusive: int | None = None
    window_end: int | None = None

    for frame, buttons in iter_trace_frames(trace):
        oracle.advance(buttons)
        after = reader.compact()
        rand_after = oracle.read_u32(SRANDCOUNT_ADDR)
        delta = (rand_after - rand_before) & 0xFFFFFFFF
        in_selection = after["battleMainFunc"] == selection_func
        if delta:
            ledger.append({
                "frame": frame,
                "randomCalls": delta,
                "rngBefore": before["rngValue"],
                "rngAfter": after["rngValue"],
                "abilityHistory": after["abilityHistory"],
                "chosenMoveByBattler": after["chosenMoveByBattler"],
                "battleMainFunc": caller_of(symbol_table, after["battleMainFunc"]),
                "playerHp": after["player"]["hp"],
                "opponentHp": after["opponent"]["hp"],
            })
        if before["battleMainFunc"] != after["battleMainFunc"]:
            main_func_runs.append({
                "frame": frame, "func": caller_of(symbol_table, after["battleMainFunc"]),
            })
        if not left_first_selection:
            if not in_selection:
                left_first_selection = True
        elif window_start_exclusive is None:
            if in_selection:
                window_start_exclusive = frame - 1
        elif not in_selection:
            window_end = frame - 1
            break
        message = after["displayedString"]
        if message and message != previous_message:
            message_events.append({
                "frame": frame, "text": message, "abilityHistory": after["abilityHistory"],
                "playerStatStages": after["player"]["statStages"],
            })
        previous_message = message
        before = after
        rand_before = rand_after

    if window_start_exclusive is None or window_end is None:
        raise RuntimeError(
            "the trace never completed a second HandleTurnActionSelectionState run "
            f"(start={window_start_exclusive}, end={window_end})"
        )

    after_battle_start_history = at_battle_start["abilityHistory"]
    window = [
        row for row in ledger if window_start_exclusive < row["frame"] <= window_end
    ]
    flagged = {row["frame"] for row in window}
    window_total = sum(row["randomCalls"] for row in window)

    # ---- Pass 2: fresh session, targeted single-step attribution. ----
    oracle2, lab2, request2, _ = stage()
    hits: list[tuple[int, int]] = []
    for frame, buttons in iter_trace_frames(request2["trace"]):
        if frame in flagged:
            step_through_frame(oracle2, buttons, hits)
        else:
            oracle2.advance(buttons)
        if frame >= window_end:
            break

    by_caller: dict[str, int] = {}
    ordered: list[dict] = []
    for frame, lr in hits:
        caller = caller_of(symbol_table, lr)
        by_caller[caller] = by_caller.get(caller, 0) + 1
        ordered.append({"frame": frame, "callerFunction": caller, "lr": hex(lr)})

    get_ability_draws = sum(
        count for name, count in by_caller.items() if name.startswith("Cmd_get_ability")
    )

    result = {
        "schema": "issue128-ability-history-off-receipt/v1",
        "fixture": str(FIXTURE_PATH.as_posix()),
        "oracleProfile": PROFILE,
        "seed": request["seed"],
        "addressing": {
            "gBattleResources": "symbol -> u32 ptr to struct BattleResources",
            "battleHistoryPtrOffset": BATTLE_HISTORY_PTR_OFFSET,
            "abilitiesOffset": ABILITIES_OFFSET,
            "cite": "include/battle.h struct BattleResources (battleHistory = member 6) + struct BattleHistory (usedMoves[4] of struct UsedMoves = 4*(4*2+4*2) = 64 bytes)",
        },
        "parties": {
            "playerLead": party_identity(parties["player"][0]),
            "aiLead": party_identity(parties["opponent"][0]),
        },
        "abilityHistoryAfterBattleStart": after_battle_start_history,
        "atBattleStart": at_battle_start,
        "aiDecisionWindow": {
            "gBattleMainFunc": "HandleTurnActionSelectionState",
            "turn": 2,
            "startExclusive": window_start_exclusive,
            "endInclusive": window_end,
        },
        "battleMainFuncTransitions": main_func_runs,
        "messageEvents": message_events,
        "randomLedgerInWindow": window,
        "windowTotalRandomCalls": window_total,
        "pass2HitCount": len(hits),
        "reconciles": window_total == len(hits),
        "callerSummary": [
            {"callerFunction": name, "count": count}
            for name, count in sorted(by_caller.items(), key=lambda kv: (-kv[1], kv[0]))
        ],
        "orderedCallerTable": ordered,
        "cmdGetAbilityDraws": get_ability_draws,
        "framebufferSha256": hashlib.sha256(oracle.screen_rgb()).hexdigest(),
    }
    OUTPUT_PATH.write_text(json.dumps(result, indent=2) + "\n")
    print(
        f"wrote {OUTPUT_PATH}: abilities={after_battle_start_history} "
        f"window=({window_start_exclusive},{window_end}] windowDraws={window_total} "
        f"get_ability={get_ability_draws}",
        flush=True,
    )


if __name__ == "__main__":
    main()
