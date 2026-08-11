#!/usr/bin/env python3
"""Dump the live DMA3 queue around ISSUES #61's FIGHT-opening boundaries.

The generic RAM watch proves that `HandleChooseMoveAfterDma3` waits for the
background-copy busy bits. This companion probe records the request slots
the bits refer to, including non-BG requests which still occupy the circular
DMA3 queue. It is deliberately a source/RAM evidence tool, not runtime data.

Usage (through the validated wrapper):
  python3 tools/run-mgba-probe.py out.json -- \
    tools/probe/dump-issue61-dma-queue.py \
    tools/probe/specs/issue61-fight-reveal-queue-watch.json out.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path


if len(sys.argv) != 3:
    raise SystemExit(f"usage: {sys.argv[0]} <spec.json> <output.json>")

SPEC_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent
DMA3_REQUESTS = 0x03000010
DMA3_REQUEST_SIZE = 16  # `struct Dma3Request`: ptr, ptr, u16, u16, u32.
DMA3_REQUEST_COUNT = 128
DMA3_CURSOR = 0x03000811
BG_DMA_BUSY_BITS = 0x03000938


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit("could not find harness root containing oracle/emerald_core.py")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
sys.path.insert(0, str(HARNESS_ROOT / "oracle"))
from emerald_core import EmeraldOracle  # noqa: E402


def read_u16(oracle: EmeraldOracle, address: int) -> int:
    return oracle.read_u8(address) | (oracle.read_u8(address + 1) << 8)


def queue_snapshot(oracle: EmeraldOracle, tick: int) -> dict[str, object]:
    requests: list[dict[str, int]] = []
    for slot in range(DMA3_REQUEST_COUNT):
        address = DMA3_REQUESTS + slot * DMA3_REQUEST_SIZE
        size = read_u16(oracle, address + 8)
        if size == 0:
            continue
        requests.append({
            "slot": slot,
            "src": oracle.read_u32(address),
            "dest": oracle.read_u32(address + 4),
            "size": size,
            "mode": read_u16(oracle, address + 10),
            "value": oracle.read_u32(address + 12),
        })
    return {
        "tick": tick,
        "cursor": oracle.read_u8(DMA3_CURSOR),
        "bgBusyBits": [oracle.read_u32(BG_DMA_BUSY_BITS + i * 4) for i in range(4)],
        "requests": requests,
    }


def main() -> None:
    spec = json.loads(SPEC_PATH.read_text())
    profile = spec.get("oracleProfile", "battle-scene-on")
    bootstrap_name = {
        "battle-scene-on": "factory.json",
        "battle-scene-off": "factory-battle-scene-off.json",
    }.get(profile)
    if bootstrap_name is None:
        raise ValueError(f"unknown oracle profile {profile!r}")
    trace_path = (SPEC_PATH.parent / spec["trace"]).resolve()
    segments = json.loads(trace_path.read_text())["segments"]
    queue_ticks = frozenset(int(tick) for tick in spec["queueTicks"])

    reference = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
    oracle = EmeraldOracle(
        reference / "pokeemerald.gba",
        reference / "pokeemerald.map",
        HARNESS_ROOT / "oracle" / "bootstrap" / bootstrap_name,
    )
    oracle.new_session()

    snapshots: list[dict[str, object]] = []
    tick = 0
    if tick in queue_ticks:
        snapshots.append(queue_snapshot(oracle, tick))
    for segment in segments:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            if tick in queue_ticks:
                snapshots.append(queue_snapshot(oracle, tick))

    OUTPUT_PATH.write_text(json.dumps({"snapshots": snapshots}, indent=2))


main()
