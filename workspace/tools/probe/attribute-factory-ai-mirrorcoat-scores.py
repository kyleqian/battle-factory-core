#!/usr/bin/env python3
"""Per-draw attribution + AI score-array dump for the MirrorCoat fixture pair.

Variant of `attribute-factory-ai-random-callers.py` for the committed
`mechanic-factory-ai-cv-mirrorcoat-*` fixtures: same sRandCount fast pass,
then a targeted single-step pass that additionally reads the ROM's live
`AI_THINKING_STRUCT->score[]` (`battle.h:176-188`, offset +4) and funcResult
(+8) at every entry into `Random()`, plus the score array at the end of each
flagged frame. `AI_THINKING_STRUCT` is `gBattleResources->ai`
(`battle_ai_script_commands.c:24`); `gBattleResources` lives at 0x020244a8
and `ai` is field offset 20 (`battle.h:229`).

Run through the teardown-tolerant wrapper with the harness's mGBA python:
    python3 tools/run-mgba-probe.py /tmp/scores.json -- \\
        /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \\
        tools/probe/attribute-factory-ai-mirrorcoat-scores.py \\
        <fixture.json> /tmp/scores.json
"""

from __future__ import annotations

import bisect
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit(f"usage: {sys.argv[0]} <mechanicLab-fixture.json> <output.json>")
FIXTURE_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])

HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit(f"could not find the harness root (oracle/emerald_core.py) above {start}")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
ORACLE_DIR = HARNESS_ROOT / "oracle"
sys.path.insert(0, str(ORACLE_DIR))

from emerald_core import EmeraldOracle  # noqa: E402
from battle_lab import BattleLab, validate_request  # noqa: E402

REFERENCE_POKEEMERALD = (HARNESS_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE_POKEEMERALD / "pokeemerald.gba"
MAP_PATH = REFERENCE_POKEEMERALD / "pokeemerald.map"
ELF_PATH = REFERENCE_POKEEMERALD / "pokeemerald.elf"
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"
PROFILE = "battle-scene-off"

RANDOM_ADDR = 0x0806F5CC
RANDOM_ENTRY_PC = RANDOM_ADDR + 2
SRANDCOUNT_ADDR = 0x020249C0
GBATTLE_RESOURCES_ADDR = 0x020244A8
AI_FIELD_OFFSET = 20  # struct BattleResources::ai (battle.h:229)
SCORE_OFFSET = 4  # struct AI_ThinkingStruct::score (battle.h:181)
FUNCRESULT_OFFSET = 8  # struct AI_ThinkingStruct::funcResult (battle.h:182)
MOVESET_INDEX_OFFSET = 1  # struct AI_ThinkingStruct::movesetIndex (battle.h:179)
MOVE_CONSIDERED_OFFSET = 2  # struct AI_ThinkingStruct::moveConsidered (battle.h:180)
GBATTLE_MONS_ADDR = 0x02024084  # struct BattlePokemon gBattleMons[] (battle.h:647)
GACTIVE_BATTLER_ADDR = 0x02024064  # u32 gActiveBattler
GAISCRIPT_PTR_ADDR = 0x0203AB38  # const u8 *gAIScriptPtr (battle_ai_script_commands.c static)
BATTLEPOKEMON_SIZE = 0x58  # sizeof(struct BattlePokemon)
MOVES_OFFSET = 0x0C  # struct BattlePokemon::moves (pokemon.h:268)
DECISION_WINDOW_START, DECISION_WINDOW_END = (100, 732)  # exclusive/inclusive


def build_symbol_table() -> list[tuple[int, str]]:
    out = subprocess.run(
        ["arm-none-eabi-nm", "--defined-only", "-n", str(ELF_PATH)],
        capture_output=True,
        text=True,
        check=True,
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


def caller_of(symbol_table: list[tuple[int, str]], addr: int) -> str:
    idx = bisect.bisect_right(symbol_table, (addr, "￿")) - 1
    if idx < 0:
        return f"<unknown 0x{addr:08x}>"
    base, name = symbol_table[idx]
    offset = addr - base
    return name if offset == 0 else f"{name}+0x{offset:x}"


def load_fixture() -> dict:
    fixture = json.loads(FIXTURE_PATH.read_text())
    return validate_request(fixture, PROFILE)


def stage(oracle: EmeraldOracle):
    lab = BattleLab(oracle, PROFILE)
    request = load_fixture()
    setup = lab.prepare(request)
    return lab, request, setup


def rand_count(oracle: EmeraldOracle) -> int:
    return oracle.read_u32(SRANDCOUNT_ADDR)


def ai_pointer(oracle: EmeraldOracle) -> int:
    resources = oracle.read_u32(GBATTLE_RESOURCES_ADDR)
    return oracle.read_u32(resources + AI_FIELD_OFFSET)


def ai_scores(oracle: EmeraldOracle) -> list[int]:
    ai = ai_pointer(oracle)
    return [oracle.read_u8(ai + SCORE_OFFSET + i) for i in range(4)]


def ai_funcresult(oracle: EmeraldOracle) -> int:
    return oracle.read_u32(ai_pointer(oracle) + FUNCRESULT_OFFSET)


def ai_user_moves(oracle: EmeraldOracle) -> list[int]:
    battler = oracle.read_u32(GACTIVE_BATTLER_ADDR) & 0xFFFFFFFF
    base = GBATTLE_MONS_ADDR + battler * BATTLEPOKEMON_SIZE
    return [oracle.read_u16(base + MOVES_OFFSET + 2 * i) for i in range(4)]


def iter_trace_frames(trace: dict):
    frame = 0
    for segment in trace["segments"]:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            frame += 1
            yield frame, buttons


def pass1_fast_deltas(oracle: EmeraldOracle, trace: dict) -> list[tuple[int, int]]:
    deltas: list[tuple[int, int]] = []
    prev = rand_count(oracle)
    for frame, buttons in iter_trace_frames(trace):
        oracle.advance(buttons)
        cur = rand_count(oracle)
        delta = (cur - prev) & 0xFFFFFFFF
        if delta:
            deltas.append((frame, delta))
        prev = cur
    return deltas


def step_through_flagged_frame(
    oracle: EmeraldOracle,
    buttons: list[str],
    hits: list[dict],
    frame_scores: dict[int, list[int]],
    symbol_table: list[tuple[int, str]],
) -> None:
    oracle._set_buttons(buttons)
    start_fc = oracle.core.frame_counter
    steps = 0
    max_steps = 20_000_000
    while True:
        pc = oracle.core.cpu.pc
        if pc == RANDOM_ENTRY_PC:
            hits.append({
                "frame": oracle.frame + 1,
                "lr": oracle.core.cpu.lr,
                "caller": caller_of(symbol_table, oracle.core.cpu.lr),
                "scores": list(ai_scores(oracle)),
                "funcResult": ai_funcresult(oracle),
                "aiUserMoves": list(ai_user_moves(oracle)),
                "movesetIndex": oracle.read_u8(ai_pointer(oracle) + MOVESET_INDEX_OFFSET),
                "moveConsidered": oracle.read_u16(ai_pointer(oracle) + MOVE_CONSIDERED_OFFSET),
                "scriptPtr": oracle.read_u32(GAISCRIPT_PTR_ADDR),
            })
        if oracle.core.frame_counter != start_fc:
            break
        oracle.core.step()
        steps += 1
        if steps > max_steps:
            raise RuntimeError(f"frame did not end after {max_steps} single steps")
    frame_scores[oracle.frame + 1] = list(ai_scores(oracle))
    oracle._screen_stale = False
    oracle.frame += 1


def pass2_attribute_flagged_frames(
    oracle: EmeraldOracle,
    trace: dict,
    flagged_frames: set[int],
    symbol_table: list[tuple[int, str]],
):
    hits: list[dict] = []
    frame_scores: dict[int, list[int]] = {}
    for frame, buttons in iter_trace_frames(trace):
        if frame in flagged_frames:
            step_through_flagged_frame(oracle, buttons, hits, frame_scores, symbol_table)
        else:
            oracle.advance(buttons)
    return hits, frame_scores


def main() -> None:
    symbol_table = build_symbol_table()

    oracle = EmeraldOracle(rom_path=ROM_PATH, map_path=MAP_PATH, bootstrap_path=BOOTSTRAP_PATH)
    lab, request, setup = stage(oracle)
    trace = request["trace"]
    deltas = pass1_fast_deltas(oracle, trace)

    window_deltas = [(f, d) for f, d in deltas if DECISION_WINDOW_START < f <= DECISION_WINDOW_END]
    window_total = sum(d for _f, d in window_deltas)
    flagged_frames = {f for f, _d in window_deltas}

    oracle2 = EmeraldOracle(rom_path=ROM_PATH, map_path=MAP_PATH, bootstrap_path=BOOTSTRAP_PATH)
    stage(oracle2)
    hits, frame_scores = pass2_attribute_flagged_frames(oracle2, trace, flagged_frames, symbol_table)
    final_count_pass2 = rand_count(oracle2)

    by_caller: dict[str, int] = {}
    for hit in hits:
        by_caller[hit["caller"]] = by_caller.get(hit["caller"], 0) + 1

    result = {
        "fixture": str(FIXTURE_PATH),
        "seed": request["seed"],
        "decisionWindow": {"start_exclusive": DECISION_WINDOW_START, "end_inclusive": DECISION_WINDOW_END},
        "windowTotal_sRandCount": window_total,
        "flaggedFrames": sorted(flagged_frames),
        "pass2_hitCount": len(hits),
        "pass2_finalRandCount": final_count_pass2,
        "orderedDrawTable": hits,
        "frameScoresAtFrameEnd": [{"frame": f, "score": s} for f, s in sorted(frame_scores.items())],
        "callerSummary": [
            {"callerFunction": name, "count": count}
            for name, count in sorted(by_caller.items(), key=lambda kv: (-kv[1], kv[0]))
        ],
    }
    OUTPUT_PATH.write_text(json.dumps(result, indent=2) + "\n")
    print(f"wrote {OUTPUT_PATH}: window total={window_total} pass2 hits={len(hits)}", flush=True)


if __name__ == "__main__":
    main()
