#!/usr/bin/env python3
"""Per-draw-site attribution for the `AI_CV_DefenseUp` / `AI_CV_SpDefUp`
"5-6 draws where the derivation predicts 4" anomaly
(`docs/factory-ai-checkviability-ground-truth.md` §18.4, recurring at
§22.3-22.4) — the follow-up instrument entry 488/489's own carried Next list
flagged and this probe settles.

`tools/probe/attribute-factory-ai-random-callers.py` (PROGRESS entry 455) is
the proven two-pass recipe this script reuses verbatim for passes 1/2
(sRandCount per-frame delta, then targeted single-step reading `cpu.pc`/
`cpu.lr`). §18.4/22.4 already ran that script and got as far as resolving
each `Random()` call's *C-level caller* (`Cmd_if_random_less_than+0x7` for
the handler's own draws) — but `Cmd_if_random_less_than` is ONE shared C
function serving all 144 `if_random_less_than` sites across the entire AI
script table (`data/battle_ai_scripts.s`), so every one of those calls
resolves to the *same* LR regardless of which AI script instruction fired
it. That is the exact resolution gap this probe closes: `gAIScriptPtr`
(`src/battle_ai_script_commands.c:154`, EWRAM `0x0203ab38`) still points at
the *start* of the currently-executing `if_random_less_than` instruction at
the moment `Cmd_if_random_less_than` calls `Random()` (`Cmd_if_random_less_
than`'s body only advances it *after* the call returns, both branches:
`battle_ai_script_commands.c:664-670`) — so reading it at the same single-
step tick as the `Random()`-entry hit gives the exact AI-script byte address
of the firing instruction, one memory read away, no LCG inversion or extra
breakpoints needed.

That address is bisected against every `d`/`D`-kind ELF symbol whose name
starts with `AI_` (697 of them — the complete label set `data/battle_ai_
scripts.s` assigns across every CBM/CV/other handler, verified against
`arm-none-eabi-nm`), giving a `<nearest label>+0x<offset>` for *every* hit,
not just the two handlers this probe targets. The five `if_random_less_than`
sites belonging to `AI_CV_DefenseUp`/`AI_CV_SpDefUp` are further named to
their exact DRAW SITE number (1-5, matching the doc's own §18.1 assembly
citations) via a hand-verified offset table (this file's `DRAW_SITE_TABLE`)
— every offset independently confirmed by disassembling the actual ROM bytes
at each handler's address range (`arm-none-eabi-nm` for the label addresses,
then a raw byte walk decoding each AI-script opcode against `sBattleAICmdTable`,
`battle_ai_script_commands.c:160-260`; see this file's own dev notes in the
project's `docs/factory-ai-draw-discrepancy-probe.md` for the full byte-level
derivation). Any hit whose caller is `Cmd_if_random_less_than`-family but
whose script address is NOT one of those ten known offsets is real,
positively-identified evidence the extra draw comes from a *different*
AI script region (e.g. `AI_TryToFaint`, `AI_SetupFirstTurn`) reached within
the same decision window under Factory AI's mask-7 (CheckBadMove +
TryToFaint + CheckViability) flag loop — not a silent "unresolved" bucket.

Run with the harness's mGBA-enabled interpreter (NOT system python3), through
the teardown-segfault-tolerant wrapper:
    python3 tools/run-mgba-probe.py /tmp/cv-defenseup-physicallastmove.json -- \\
        /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \\
        tools/probe/attribute-factory-ai-cv-drawsite-callers.py \\
        tools/battle-lab/mechanic-factory-ai-cv-defenseup-physicallastmove-off.json \\
        /tmp/cv-defenseup-physicallastmove.json \\
        0 732
"""

from __future__ import annotations

import bisect
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) not in (3, 5):
    raise SystemExit(
        f"usage: {sys.argv[0]} <mechanicLab-fixture.json> <output.json> [windowStartExclusive windowEndInclusive]"
    )
FIXTURE_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
WINDOW_OVERRIDE = (int(sys.argv[3]), int(sys.argv[4])) if len(sys.argv) == 5 else None

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

# `bin/oracle symbols Random` (§1.2 of docs/factory-ai-ground-truth.md).
RANDOM_ADDR = 0x0806F5CC
# libmgba-py's `cpu.pc` reads the *pipelined* PC (Thumb: executing-instruction
# address + 2), confirmed by `attribute-factory-ai-random-callers.py`'s own
# single-step walk through Random()'s 13-instruction body.
RANDOM_ENTRY_PC = RANDOM_ADDR + 2
# `src/random.c:5` — EWRAM_DATA static u32 sRandCount, incremented once per
# Random() call.
SRANDCOUNT_ADDR = 0x020249C0
# `src/battle_ai_script_commands.c:154` — EWRAM_DATA const u8 *gAIScriptPtr,
# the AI script interpreter's own instruction cursor. Confirmed via
# `bin/oracle symbols gAIScriptPtr` == `arm-none-eabi-nm`'s `0203ab38 B
# gAIScriptPtr`. `Cmd_if_random_less_than` (`:664-670`) reads this BEFORE
# calling Random(), so at the moment of the Random()-entry single-step hit it
# still points at the start of the firing `if_random_less_than` instruction
# (opcode byte), not wherever the interpreter will land next.
SCRIPT_PTR_ADDR = 0x0203AB38
DECISION_WINDOW_START, DECISION_WINDOW_END = WINDOW_OVERRIDE or (100, 732)  # exclusive/inclusive

# Hand-verified (raw ROM byte walk against `sBattleAICmdTable`,
# `battle_ai_script_commands.c:160-260`) offsets of each handler's five
# `if_random_less_than` DRAW SITEs, relative to the nearest preceding `AI_`
# label the ELF symbol table actually carries (mid-script addresses like the
# DRAW SITE itself are never their own label). `(label, offset) -> (site
# name, gate, threshold)`. See docs/factory-ai-draw-discrepancy-probe.md for
# the full byte-by-byte derivation this table is transcribed from.
DRAW_SITE_TABLE = {
    ("AI_CV_DefenseUp", 0x08): ("DefenseUp DRAW SITE 1", "Gate A else (opponent's own DEF stage >= 9)", 100),
    ("AI_CV_DefenseUp2", 0x07): ("DefenseUp DRAW SITE 2", "Gate B else (opponent's own HP == 100%)", 128),
    ("AI_CV_DefenseUp3", 0x07): ("DefenseUp DRAW SITE 3", "Gate C else (opponent's own HP >= 70%)", 200),
    ("AI_CV_DefenseUp4", 0x1C): ("DefenseUp DRAW SITE 4", "Gate F true (target's last move is in the physical-types list)", 60),
    ("AI_CV_DefenseUp5", 0x00): ("DefenseUp DRAW SITE 5", "Gate E true (target's last move power == 0, incl. never-moved)", 60),
    ("AI_CV_SpDefUp", 0x08): ("SpDefUp DRAW SITE 1", "Gate A else (opponent's own SPDEF stage >= 9)", 100),
    ("AI_CV_SpDefUp2", 0x07): ("SpDefUp DRAW SITE 2", "Gate B else (opponent's own HP == 100%)", 128),
    ("AI_CV_SpDefUp3", 0x07): ("SpDefUp DRAW SITE 3", "Gate C else (opponent's own HP >= 70%)", 200),
    ("AI_CV_SpDefUp4", 0x1C): ("SpDefUp DRAW SITE 4", "Gate F true (target's last move is NOT in the physical-types list -- inverted vs DefenseUp)", 60),
    ("AI_CV_SpDefUp5", 0x00): ("SpDefUp DRAW SITE 5", "Gate E true (target's last move power == 0, incl. never-moved)", 60),
}

# C-level callers with a settled classification from
# `attribute-factory-ai-random-callers.py`'s own prior runs (§18.4/22.4) --
# reused here so this probe's table lines up with the doc's existing ledger.
KNOWN_OUTSIDE_CALLERS = {
    "BattleAI_SetupAIData": "known-outside: AI setup (simulated-damage seeding, once per movesetIndex slot)",
    "BattleTurnPassed": "known-outside: end-of-turn bookkeeping, unrelated to any AI script",
    "ChooseMoveOrAction_Singles": "known-outside: AI tie-break among equal-scored moves (Random() % numOfBestMoves)",
    "Cmd_accuracycheck": "known-outside: the real move's own accuracy roll",
    "Cmd_adjustnormaldamage": "known-outside: the real move's own damage-roll variance (85-100%)",
    "Cmd_critcalc": "known-outside: the real move's own crit-chance roll",
    "Cmd_damagecalc": "known-outside: the real move's own damage calculation entry point",
}
HIT_CHAIN_CALLERS = {
    "Cmd_seteffectwithchance": "hit-chain proc: the executed move's own secondary-effect chance roll",
}


def build_symbol_table() -> list[tuple[int, str]]:
    """Every defined text-section symbol (local + global), sorted by address --
    the bisection table for mapping a Random() caller LR to its enclosing
    C function, including static (file-scope) functions the linker map omits."""
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


def build_ai_script_symbol_table() -> list[tuple[int, str]]:
    """Every `AI_`-prefixed data-section label, sorted by address -- the
    bisection table for mapping a live `gAIScriptPtr` value to the nearest
    preceding AI script label + byte offset. Covers all 697 labels
    `data/battle_ai_scripts.s` assembles (every CBM/CV/other handler), not
    just the two this probe targets."""
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
        if kind not in ("d", "D"):
            continue
        if not name.startswith("AI_"):
            continue
        table.append((int(addr_hex, 16), name))
    table.sort(key=lambda pair: pair[0])
    return table


def resolve(symbol_table: list[tuple[int, str]], addr: int) -> tuple[str, int]:
    idx = bisect.bisect_right(symbol_table, (addr, "￿")) - 1
    if idx < 0:
        return f"<unknown 0x{addr:08x}>", 0
    base, name = symbol_table[idx]
    return name, addr - base


def caller_of(symbol_table: list[tuple[int, str]], addr: int) -> str:
    name, offset = resolve(symbol_table, addr)
    return name if offset == 0 else f"{name}+0x{offset:x}"


def classify(caller_label: str, script_label: str, script_offset: int) -> tuple[str, str]:
    """Returns (category, detail) for one Random() draw."""
    is_if_random = caller_label.split("+")[0] in (
        "Cmd_if_random_less_than",
        "Cmd_if_random_greater_than",
        "Cmd_if_random_equal",
        "Cmd_if_random_not_equal",
    )
    if is_if_random:
        key = (script_label, script_offset)
        site = DRAW_SITE_TABLE.get(key)
        if site is not None:
            site_name, gate, threshold = site
            return "ai-decision-policy-own", f"{site_name} ({gate}, if_random_less_than {threshold}) @ {script_label}+0x{script_offset:x}"
        return (
            "ai-decision-other-script",
            f"AI script draw outside the two handlers' 10 known sites: {script_label}+0x{script_offset:x} "
            f"(resolve against data/battle_ai_scripts.s for the exact instruction)",
        )
    base_caller = caller_label.split("+")[0]
    if base_caller in KNOWN_OUTSIDE_CALLERS:
        return "known-outside", KNOWN_OUTSIDE_CALLERS[base_caller]
    if base_caller in HIT_CHAIN_CALLERS:
        return "hit-chain-proc", HIT_CHAIN_CALLERS[base_caller]
    return "OTHER", f"unclassified caller {caller_label}"


def load_fixture() -> dict:
    fixture = json.loads(FIXTURE_PATH.read_text())
    return validate_request(fixture, PROFILE)


def stage(oracle: EmeraldOracle) -> tuple[BattleLab, dict, dict]:
    lab = BattleLab(oracle, PROFILE)
    request = load_fixture()
    setup = lab.prepare(request)
    return lab, request, setup


def rand_count(oracle: EmeraldOracle) -> int:
    return oracle.read_u32(SRANDCOUNT_ADDR)


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
    oracle: EmeraldOracle, buttons: list[str], hits: list[tuple[int, int, int, int]]
) -> None:
    """Single-step exactly one frame's worth of instructions, recording every
    (pc, lr, scriptPtr, sRandCountBefore) tuple where pc lands on Random()'s
    entry address."""
    oracle._set_buttons(buttons)
    start_fc = oracle.core.frame_counter
    steps = 0
    max_steps = 20_000_000
    while True:
        pc = oracle.core.cpu.pc
        if pc == RANDOM_ENTRY_PC:
            script_ptr = oracle.read_u32(SCRIPT_PTR_ADDR)
            before = rand_count(oracle)
            hits.append((oracle.frame + 1, oracle.core.cpu.lr, script_ptr, before))
        if oracle.core.frame_counter != start_fc:
            break
        oracle.core.step()
        steps += 1
        if steps > max_steps:
            raise RuntimeError(f"frame did not end after {max_steps} single steps")
    oracle._screen_stale = False
    oracle.frame += 1


def pass2_attribute_flagged_frames(
    oracle: EmeraldOracle, trace: dict, flagged_frames: set[int]
) -> list[tuple[int, int, int, int]]:
    hits: list[tuple[int, int, int, int]] = []
    for frame, buttons in iter_trace_frames(trace):
        if frame in flagged_frames:
            step_through_flagged_frame(oracle, buttons, hits)
        else:
            oracle.advance(buttons)
    return hits


def main() -> None:
    c_symbol_table = build_symbol_table()
    ai_symbol_table = build_ai_script_symbol_table()

    oracle = EmeraldOracle(rom_path=ROM_PATH, map_path=MAP_PATH, bootstrap_path=BOOTSTRAP_PATH)
    lab, request, setup = stage(oracle)
    trace = request["trace"]
    deltas = pass1_fast_deltas(oracle, trace)
    final_count_pass1 = rand_count(oracle)

    window_deltas = [(f, d) for f, d in deltas if DECISION_WINDOW_START < f <= DECISION_WINDOW_END]
    window_total = sum(d for _f, d in window_deltas)
    flagged_frames = {f for f, _d in window_deltas}

    oracle2 = EmeraldOracle(rom_path=ROM_PATH, map_path=MAP_PATH, bootstrap_path=BOOTSTRAP_PATH)
    stage(oracle2)
    hits = pass2_attribute_flagged_frames(oracle2, trace, flagged_frames)
    final_count_pass2 = rand_count(oracle2)

    hits.sort(key=lambda tup: (tup[0], tup[3]))
    ordered_table = []
    category_counts: dict[str, int] = {}
    for frame, lr, script_ptr, before in hits:
        caller_label = caller_of(c_symbol_table, lr)
        script_label, script_offset = resolve(ai_symbol_table, script_ptr)
        category, detail = classify(caller_label, script_label, script_offset)
        category_counts[category] = category_counts.get(category, 0) + 1
        ordered_table.append(
            {
                "frame": frame,
                "sRandCountBefore": before,
                "callerLr": hex(lr),
                "callerFunction": caller_label,
                "scriptPtr": hex(script_ptr),
                "scriptLabel": f"{script_label}+0x{script_offset:x}" if script_offset else script_label,
                "category": category,
                "detail": detail,
            }
        )

    # PASS/FAIL: every window delta from pass 1 must be independently
    # reproduced, one-for-one, by pass 2's single-stepped hits -- and every
    # single hit must carry a non-empty classification (an "OTHER"/
    # "ai-decision-other-script" bucket is a legitimate answer; a hit with no
    # category at all is not, and would mean this script's own logic is
    # broken, not that the anomaly is unexplained).
    reconciled = window_total == len(hits)
    all_classified = all(row["category"] for row in ordered_table)
    passed = reconciled and all_classified and len(hits) > 0

    result = {
        "fixture": str(FIXTURE_PATH),
        "seed": request["seed"],
        "setup": {
            "player": [mon["species"] for mon in setup["player"]],
            "opponent": [mon["species"] for mon in setup["opponent"]],
        },
        "decisionWindow": {"start_exclusive": DECISION_WINDOW_START, "end_inclusive": DECISION_WINDOW_END},
        "pass1_finalRandCount": final_count_pass1,
        "pass2_finalRandCount": final_count_pass2,
        "windowTotal_sRandCount": window_total,
        "flaggedFrames": sorted(flagged_frames),
        "orderedCallerTable": ordered_table,
        "categoryCounts": category_counts,
        "reconciliation": {
            "pass1WindowTotal": window_total,
            "pass2HitCount": len(hits),
            "matches": reconciled,
        },
        "check": {
            "reconciled": reconciled,
            "allHitsClassified": all_classified,
            "nonEmptyWindow": len(hits) > 0,
            "PASS": passed,
        },
    }
    OUTPUT_PATH.write_text(json.dumps(result, indent=2) + "\n")
    status = "PASS" if passed else "FAIL"
    print(
        f"wrote {OUTPUT_PATH}: window total={window_total} pass2 hits={len(hits)} "
        f"categories={category_counts} check={status}",
        flush=True,
    )
    if not passed:
        raise SystemExit(f"attribution incomplete: {result['check']}")


if __name__ == "__main__":
    main()
