#!/usr/bin/env python3
"""Dev-time per-tick RAM probe: replay a button-segment script from the
canonical anchor and dump chosen memory addresses' values every tick.

Reusable, generic version of the ad hoc scripts prior sessions built and
deleted (see PROGRESS.md #38's papercut note) - kept committed per
PAPERCUTS.md so the next chase (ISSUES #12/#13 or anything else needing
tick-by-tick ground truth) doesn't have to rebuild this from scratch.

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/ram-probe.py <spec.json> <output.json>

<spec.json> shape:
{
  "segments": [{"buttons": ["A"], "frames": 2}, {"buttons": [], "frames": 28}, ...],
  "trace": "../../compare/traces-groundtruth/example.json", // optional alternative to segments
  "watch": [
    {"name": "cursorPos", "addr": "sFactorySelectScreen+3", "size": 1},
    {"name": "coeff", "addr": "sFactorySelectScreen+0x2A8", "size": 1, "deref": true},
    {"name": "sSinIndex", "path": [
        {"symbol": "gBattleSpritesDataPtr"},
        {"derefU32": true},
        {"add": 4},
        {"derefU32": true},
        {"add": 3},
        {"derefU8Scaled": 68},
        {"addSymbol": "gSprites"},
        {"add": 46}
    ], "size": 2}
  ],
  "startTick": 0   // optional, record only from this tick onward (default 0)
  "oracleProfile": "battle-scene-off" // optional; defaults to battle-scene-on
}
"addr" is either "<hexOrDecimal>" (absolute), or "<symbolOrPointerLabel>+<offset>"
where the base before "+" is either a linker symbol (resolved via
oracle's symbol table) or one of the pinned raw pointer labels below.
If "deref" is true, the base is read as a u32 pointer and dereferenced
before adding the offset (use this for file-static struct pointers like
sFactorySelectScreen, which point at a heap-allocated struct).

"path" is a generic multi-hop alternative to "addr", for chasing more than
one pointer deep (e.g. gBattleSpritesDataPtr -> healthBoxesData[battler] ->
a dynamically-allocated sprite slot, an id read at runtime, not a fixed
offset). A running cursor starts undefined and each hop transforms it:
  {"symbol": "name"}        cursor = address of linker symbol `name`
  {"add": N}                cursor += N
  {"addSymbol": "name"}     cursor += address of linker symbol `name`
  {"derefU32": true}        cursor = read_u32(cursor)  (follow a pointer)
  {"derefU8Scaled": M}      cursor = read_u8(cursor) * M  (turn a byte read
                             at `cursor` - e.g. a dynamic sprite/slot id -
                             into a scaled array index for the next hop)
The final cursor is the address `read_sized` reads from (per the watch's
own "size", same as "addr").

Output: {"ticks": [{"tick": 0, "cursorPos": 0, "coeff": 0, ...}, ...]}

Quirks (see ROADMAP.md Domain notes): mGBA spews log lines to stdout
(never parsed here - all results go to the output file); the interpreter
segfaults at teardown *after* results are written (exit 139 is benign -
check the output file, not the exit code).
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


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit(f"could not find the harness root (oracle/emerald_core.py) above {start}")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
ORACLE_DIR = HARNESS_ROOT / "oracle"
sys.path.insert(0, str(ORACLE_DIR))

from emerald_core import EmeraldOracle  # noqa: E402

REFERENCE_POKEEMERALD = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE_POKEEMERALD / "pokeemerald.gba"
MAP_PATH = REFERENCE_POKEEMERALD / "pokeemerald.map"
BOOTSTRAPS = {
    "battle-scene-on": ORACLE_DIR / "bootstrap" / "factory.json",
    "battle-scene-off": ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json",
}

# Pinned file-static pointer labels not in the linker map (nm'd from the
# pinned reference build's ELF once; see tools/extract/inspect-anchor.py).
RAW_POINTER_LABELS = {
    "sFactorySelectScreen": 0x0300127C,
}


def resolve_base(oracle: EmeraldOracle, label: str) -> int:
    if label in RAW_POINTER_LABELS:
        return RAW_POINTER_LABELS[label]
    if label.lower().startswith("0x"):
        return int(label, 16)
    if label.isdigit():
        return int(label)
    addr = oracle.symbols.get(label)
    if addr is None:
        raise KeyError(f"unknown symbol/label {label!r}")
    return addr


def resolve_path(oracle: EmeraldOracle, path: list) -> int:
    cursor: int | None = None
    for hop in path:
        if "symbol" in hop:
            cursor = resolve_base(oracle, hop["symbol"])
        elif "add" in hop:
            cursor = cursor + int(hop["add"])
        elif "addSymbol" in hop:
            cursor = cursor + resolve_base(oracle, hop["addSymbol"])
        elif hop.get("derefU32"):
            cursor = oracle.read_u32(cursor)
        elif "derefU8Scaled" in hop:
            cursor = oracle.read_u8(cursor) * int(hop["derefU8Scaled"])
        else:
            raise ValueError(f"unrecognized path hop {hop!r}")
    if cursor is None:
        raise ValueError("empty path")
    return cursor


def resolve_addr(oracle: EmeraldOracle, watch: dict) -> int:
    if "path" in watch:
        return resolve_path(oracle, watch["path"])
    spec = watch["addr"]
    if "+" in spec:
        label, offset_str = spec.split("+", 1)
        offset = int(offset_str, 16) if offset_str.lower().startswith("0x") else int(offset_str)
    else:
        label, offset = spec, 0
    base = resolve_base(oracle, label)
    if watch.get("deref"):
        base = oracle.read_u32(base)
    return base + offset


def read_sized(oracle: EmeraldOracle, addr: int, size: int) -> int:
    if size == 1:
        return oracle.read_u8(addr)
    if size == 4:
        return oracle.read_u32(addr)
    if size == 2:
        lo = oracle.read_u8(addr)
        hi = oracle.read_u8(addr + 1)
        return lo | (hi << 8)
    raise ValueError(f"unsupported size {size}")


def main() -> None:
    spec = json.loads(SPEC_PATH.read_text())
    profile = spec.get("oracleProfile", "battle-scene-on")
    if profile not in BOOTSTRAPS:
        raise ValueError(f"unknown oracleProfile {profile!r}; expected one of {tuple(BOOTSTRAPS)}")
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAPS[profile])
    oracle.new_session()

    if "trace" in spec:
        trace_path = (SPEC_PATH.parent / spec["trace"]).resolve()
        segments = json.loads(trace_path.read_text())["segments"]
    else:
        segments = spec["segments"]

    watches = spec["watch"]
    start_tick = int(spec.get("startTick", 0))
    ticks_out = []
    tick = 0

    def record():
        row = {"tick": tick}
        for w in watches:
            addr = resolve_addr(oracle, w)
            row[w["name"]] = read_sized(oracle, addr, int(w.get("size", 1)))
        ticks_out.append(row)

    if tick >= start_tick:
        record()

    for segment in segments:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            if tick >= start_tick:
                record()

    OUTPUT_PATH.write_text(json.dumps({"ticks": ticks_out}, indent=0))


main()
