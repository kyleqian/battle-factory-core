#!/usr/bin/env python3
"""Defect A's real next instrument (top ANIMATION_PROGRESS.md entry, "Next
action"): capture the oracle's own true pre-OBJ composite directly, instead
of reconstructing it from tileset/palette asset data.

Source read first (`src/gpu_regs.c`): pokeemerald buffers GPU register
writes and only flushes a register to real hardware during vblank if
`SetGpuReg` was called for it that frame (`sGpuRegWaitingList`,
`CopyBufferedValuesToGpuRegs`). `SetGpuReg(REG_OFFSET_DISPCNT, ...)` is only
called once, at battle-scene setup (`battle_main.c:2434`), never again during
a move's scale window. So the REAL hardware `DISPCNT` register can be poked
directly (bypassing the RAM shadow `sGpuRegBuffer` the game reads back via
`GetGpuReg`) without the game's own logic ever noticing or re-flushing over
it - the poke is invisible to game logic, visible only to the PPU.

Technique: replay a scenario normally up to tick `T-1` (byte-identical to
every other probe in this family), then clear DISPCNT bit 12 (OBJ display
enable, GBATEK) on the real hardware register immediately before the ONE
`advance()` call that renders tick `T`, and capture the resulting frame.
Since nothing in that frame's game logic re-asserts DISPCNT, the PPU composes
that frame's BG layers only - the exact "target2" pixel the real, OBJ-enabled
frame would have alpha-blended the scaled sprite against. A second,
unmodified control pass captures the same tick normally (OBJ enabled) so the
already-cited oracle pixel values (ANIMATION_PROGRESS.md) can be
cross-checked byte-for-byte against this harness's own replay, proving the
poke doesn't perturb anything else.

DISPCNT bit layout (GBATEK): bit12 = screen display OBJ.

Poke mechanism, verified directly against this harness (not assumed): the
oracle wrapper's own `write_u8`/`write_u16` (`oracle/emerald_core.py`) go
through libmgba-py's `MemoryView.raw_write`, bound to the native core's
`rawWriteN` function. Empirically that path is a silent no-op for anything
other than plain WRAM/IWRAM (verified here: a WRAM scratch byte round-trips
through `write_u8` correctly, but a palette-RAM, OAM, or IO-register
round-trip through `write_u16` does not change on read-back at all - `rawWrite`
is only wired to the flat RAM backing array, not to palette/OAM/IO's separate
backing structures). The working path for those regions is the *bus* write
(`MemoryView._bus_write`, bound to the native `busWriteN` function) - the same
path real CPU store instructions use, side effects included - verified here to
actually flip DISPCNT's OBJ bit on read-back. This probe calls `_bus_write`
directly since the shared `EmeraldOracle.write_u16` cannot do this poke.

Run with the harness's mGBA-enabled interpreter (NOT system python3), via:
    python3 tools/run-mgba-probe.py <fresh-output.json> -- \
        <mgba-python> tools/probe/dump-scale-window-underlayer.py \
        <scenario.json> <output.json> <comma-separated-target-ticks> <rgb-out-dir>
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 5:
    raise SystemExit(
        f"usage: {sys.argv[0]} <scenario.json> <output.json> <targetTicksCsv> <rgbOutDir>"
    )
SCENARIO_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
TARGET_TICKS = sorted({int(t) for t in sys.argv[3].split(",") if t})
RGB_DIR = Path(sys.argv[4])

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

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

REFERENCE_POKEEMERALD = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE_POKEEMERALD / "pokeemerald.gba"
MAP_PATH = REFERENCE_POKEEMERALD / "pokeemerald.map"

DISPCNT = 0x04000000
DISPCNT_OBJ_ON = 0x1000


def bus_write_u16(oracle: EmeraldOracle, addr: int, value: int) -> None:
    mv = oracle.core.memory.u16
    mv._bus_write(mv._core, addr, value & 0xFFFF)


def make_oracle() -> tuple[EmeraldOracle, dict]:
    scenario = json.loads(SCENARIO_PATH.read_text())
    profile = scenario.get("profile", "battle-scene-on")
    bootstrap = ORACLE_DIR / "bootstrap" / (
        "factory.json" if profile == "battle-scene-on" else "factory-battle-scene-off.json"
    )
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, bootstrap)
    request = validate_request(scenario, profile)
    lab = BattleLab(oracle, profile)
    lab.prepare(request)
    return oracle, request


def replay_to(oracle: EmeraldOracle, request: dict, target: int, disable_obj_for_final_frame: bool) -> dict:
    """Replay from a fresh session to `target` (inclusive); if
    `disable_obj_for_final_frame`, clear DISPCNT's OBJ bit right before the
    single advance() call that renders tick `target`. Returns the DISPCNT
    values observed immediately before and after that final advance()."""
    tick = 0
    dispcnt_before = None
    dispcnt_after = None
    for segment in request["trace"]["segments"]:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            if disable_obj_for_final_frame and tick == target - 1:
                current = oracle.read_u16(DISPCNT)
                bus_write_u16(oracle, DISPCNT, current & ~DISPCNT_OBJ_ON)
                dispcnt_before = oracle.read_u16(DISPCNT)
            oracle.advance(buttons)
            tick += 1
            if tick == target:
                dispcnt_after = oracle.read_u16(DISPCNT)
                return {"dispcntBefore": dispcnt_before, "dispcntAfter": dispcnt_after}
        if tick >= target:
            break
    raise SystemExit(f"scenario ended before reaching tick {target} (stopped at {tick})")


def main() -> None:
    RGB_DIR.mkdir(parents=True, exist_ok=True)
    rows = []
    for target in TARGET_TICKS:
        oracle, request = make_oracle()
        info = replay_to(oracle, request, target, disable_obj_for_final_frame=False)
        control_rgb = oracle.screen_rgb()
        (RGB_DIR / f"{target:05d}_control.rgb").write_bytes(control_rgb)

        oracle, request = make_oracle()
        info2 = replay_to(oracle, request, target, disable_obj_for_final_frame=True)
        noobj_rgb = oracle.screen_rgb()
        (RGB_DIR / f"{target:05d}_noobj.rgb").write_bytes(noobj_rgb)

        rows.append({
            "tick": target,
            "control": info,
            "noObj": info2,
        })

    OUTPUT_PATH.write_text(json.dumps({"ticks": rows}, indent=0))
    print(f"wrote {OUTPUT_PATH}; rgb captures in {RGB_DIR} for ticks {TARGET_TICKS}")


main()
