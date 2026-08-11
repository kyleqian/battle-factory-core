"""Symbol lookup for the pokeemerald oracle.

Parses the linker map (`pokeemerald.map`) produced by the reference build and
exposes name -> address for RAM/ROM symbols. The parse is cached to a JSON
sidecar keyed on the map file's (mtime, size) so server restarts are fast.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

# EWRAM, IWRAM, and cartridge ROM — everything a poke or watch could target.
_VALID_RANGES = (
    (0x02000000, 0x0204FFFF),
    (0x03000000, 0x03007FFF),
    (0x08000000, 0x09FFFFFF),
)

# Two shapes appear in the ld map: plain section symbols ("0x02037590  gPlayerAvatar")
# and linker assignments from the sym_* scripts ("0x030022c0  gMain = .").
_LINE = re.compile(r"^\s+0x0{0,8}([0-9a-f]{7,9})\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*=\s*\.)?\s*$")


def _in_range(addr: int) -> bool:
    return any(lo <= addr <= hi for lo, hi in _VALID_RANGES)


def parse_map(map_path: str | Path) -> dict[str, int]:
    """Parse the ld map into {symbol: address}. First definition wins."""
    symbols: dict[str, int] = {}
    with open(map_path, "r", errors="replace") as fh:
        for line in fh:
            match = _LINE.match(line)
            if not match:
                continue
            addr = int(match.group(1), 16)
            name = match.group(2)
            if _in_range(addr) and name not in symbols:
                symbols[name] = addr
    return symbols


def load_symbols(map_path: str | Path, cache_path: str | Path | None = None) -> dict[str, int]:
    map_path = Path(map_path)
    stat = map_path.stat()
    key = f"{int(stat.st_mtime)}:{stat.st_size}"
    cache_path = Path(cache_path) if cache_path else map_path.parent / ".symbols-cache.json"
    try:
        cached = json.loads(cache_path.read_text())
        if cached.get("key") == key:
            return cached["symbols"]
    except (OSError, ValueError, KeyError):
        pass
    symbols = parse_map(map_path)
    try:
        cache_path.write_text(json.dumps({"key": key, "symbols": symbols}))
    except OSError:
        pass  # cache is best-effort; a read-only reference tree is fine
    return symbols
