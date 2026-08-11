"""Pure path evaluator shared by the mGBA RAM probe and its unit tests."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any


def _integer(value: Any, field: str) -> int:
    try:
        parsed = int(value, 0) if isinstance(value, str) else int(value)
    except (TypeError, ValueError) as error:
        raise ValueError(f"{field} must be an integer, got {value!r}") from error
    return parsed


def read_path_value(
    oracle: Any,
    path: list[dict[str, Any]],
    size: int,
    resolve_base: Callable[[Any, str], int],
    read_sized: Callable[[Any, int, int], int],
) -> int:
    """Resolve a multi-hop address and read it, optionally extracting a bitfield.

    ``{"op": "mask", ...}`` is a terminal operation: it reads ``size`` bytes
    from the address produced by the preceding hops, then returns the requested
    shifted bitfield.
    """

    cursor: int | None = None
    for index, hop in enumerate(path):
        if "symbol" in hop:
            cursor = resolve_base(oracle, str(hop["symbol"]))
        elif "add" in hop:
            if cursor is None:
                raise ValueError(f"path hop {index} adds before establishing a cursor")
            cursor += _integer(hop["add"], "add")
        elif "addSymbol" in hop:
            if cursor is None:
                raise ValueError(f"path hop {index} adds a symbol before establishing a cursor")
            cursor += resolve_base(oracle, str(hop["addSymbol"]))
        elif hop.get("derefU32"):
            if cursor is None:
                raise ValueError(f"path hop {index} dereferences before establishing a cursor")
            cursor = oracle.read_u32(cursor)
        elif "derefU8Scaled" in hop:
            if cursor is None:
                raise ValueError(f"path hop {index} dereferences before establishing a cursor")
            cursor = oracle.read_u8(cursor) * _integer(
                hop["derefU8Scaled"],
                "derefU8Scaled",
            )
        elif hop.get("op") == "mask":
            if cursor is None:
                raise ValueError(f"path hop {index} masks before establishing a cursor")
            if index != len(path) - 1:
                raise ValueError("mask must be the final path hop")
            shift = _integer(hop.get("shift", 0), "mask shift")
            mask = _integer(hop.get("mask"), "mask")
            if shift < 0 or mask < 0:
                raise ValueError("mask shift and mask must be non-negative")
            return (read_sized(oracle, cursor, size) >> shift) & mask
        else:
            raise ValueError(f"unrecognized path hop {hop!r}")

    if cursor is None:
        raise ValueError("empty path")
    return read_sized(oracle, cursor, size)
