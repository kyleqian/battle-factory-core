#!/usr/bin/env python3
"""Rank the remaining unsupported Level-50 moves by how big a worker step they are.

`npm run animation:coverage` ranks component TRACKS by implementation reuse.
That is not the same as step size: the zero-new-component moves left on the
Level-50 ladder all carry >=9 components, while several one-new-component moves
(SUBSTITUTE, FACADE, MINIMIZE, HAZE) are only a handful of script lines. The
2026-08-07 session measured this the hard way — a 4-line move closed in one
45-minute round, a 6-component move took two, and a 9-component/~30-line move
failed three consecutive rounds.

So this ranks by the size of the thing a worker actually has to port: the number
of substantive lines in the move's own `battle_anim_scripts.s` blocks, then the
number of components with no exact representative yet, then total components.

Usage: python3 tools/animation/rank-remaining.py [limit]
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LIMIT = int(sys.argv[1]) if len(sys.argv) > 1 else 40

coverage = json.loads((ROOT / "ANIMATION_COVERAGE.json").read_text())
components = json.loads(
    (ROOT / "src" / "data" / "gen" / "battle-animation-components.json").read_text()
)
script_lines = (
    ROOT / "reference" / "pokeemerald" / "data" / "battle_anim_scripts.s"
).read_text().split("\n")

exact = {entry["move"] for entry in coverage["entries"] if entry["status"] == "exact"}
moves = {move["move"]: move for move in components["moves"]}

proven: set[str] = set()
for name in exact:
    if name in moves:
        proven |= set(moves[name]["componentIds"])

# Label -> [start, end) line span, where a label owns everything up to the next one.
label_pattern = re.compile(r"^([A-Za-z_][A-Za-z0-9_]*):")
spans: dict[str, tuple[int, int]] = {}
current: str | None = None
start = 0
for index, line in enumerate(script_lines):
    match = label_pattern.match(line)
    if match:
        if current is not None:
            spans[current] = (start, index)
        current, start = match.group(1), index
if current is not None:
    spans[current] = (start, len(script_lines))


def block_size(label: str) -> int | None:
    """Substantive command lines in one script block (no comments, no directives)."""
    if label not in spans:
        return None
    begin, end = spans[label]
    body = (line.strip() for line in script_lines[begin:end])
    return sum(
        1 for line in body if line and not line.startswith("@") and not line.startswith(".")
    )


rows = []
for name, move in moves.items():
    if move["tier"] != "level50" or name in exact:
        continue
    sizes = [block_size(block) for block in move["blocks"]]
    unresolved = [
        block for block, size in zip(move["blocks"], sizes) if size is None
    ]
    total = sum(size for size in sizes if size is not None)
    new = [c for c in move["componentIds"] if c not in proven]
    rows.append((total, len(new), len(move["componentIds"]), name, new, unresolved))

rows.sort()
print(f"{len(rows)} unsupported Level-50 moves; smallest {min(LIMIT, len(rows))} first\n")
print(f"{'lines':>5} {'new':>3} {'comp':>4}  move")
for total, new_count, comp_count, name, new, unresolved in rows[:LIMIT]:
    trailer = ",".join(component.split(":")[-1] for component in new)
    if unresolved:
        trailer += f"  [UNRESOLVED BLOCKS: {','.join(unresolved)}]"
    print(f"{total:>5} {new_count:>3} {comp_count:>4}  {name:<26} new={trailer}")
