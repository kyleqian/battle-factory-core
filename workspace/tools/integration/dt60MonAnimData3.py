#!/usr/bin/env python3
"""dt60: which Pokemon (send-out) animations can leave the battler sprite's data[3] non-zero (static source analysis).

usage: dt60MonAnimData3.py [--check] <output.json>
AnimTask_DoubleTeam's clones are struct copies of the attacker's battler sprite (CloneBattlerSpriteWithBlend,
battle_anim_mons.c:1626-1645), so AnimDoubleTeam's 2-frame step counter data[3] (battle_anim_effects_1.c:5223-5243) starts at the
battler sprite's data[3]. In battle that field is last written by the send-out mon animation: Task_HandleMonAnimation zeroes
data[2..7] before the first anim callback and restores only data[0..2] at the end (pokemon_animation.c:911-939). An animation whose
call graph (every function reachable from its sMonAnimFunctions entry through direct calls or `sprite->callback = F`) never writes
`data[3]` therefore leaves data[3] == 0; any other animation is classified "writes" (its final value is not derived here).
The output lists every ANIM_* id of sMonAnimFunctions with its entry function and that classification.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "reference/pokeemerald/src/pokemon_animation.c"
WRITE = re.compile(r"data\[3\]\s*(?:=(?!=)|\+=|-=|\*=|/=|%=|<<=|>>=|&=|\|=|\^=|\+\+|--)|(?:\+\+|--)\s*(?:\w+->|\w+\.)data\[3\]")
DEF = re.compile(r"^(?:static\s+)?(?:inline\s+)?[A-Za-z_][\w\s\*]*?\b([A-Za-z_]\w*)\s*\(([^;{)]*)\)\s*$")


def functions(text: str) -> dict[str, str]:
    lines, out, i = text.splitlines(), {}, 0
    while i < len(lines):
        m = DEF.match(lines[i])
        if m and i + 1 < len(lines) and lines[i + 1].strip() == "{":
            depth, body, j = 0, [], i + 1
            while j < len(lines):
                depth += lines[j].count("{") - lines[j].count("}")
                body.append(lines[j])
                j += 1
                if depth == 0:
                    break
            out[m.group(1)] = "\n".join(body)
            i = j
        else:
            i += 1
    return out


def main() -> None:
    args = [a for a in sys.argv[1:] if a != "--check"]
    text = SOURCE.read_text()
    fns = functions(text)
    table = re.search(r"sMonAnimFunctions\[\]\)\(struct Sprite \*sprite\) =\s*\{(.*?)\};", text, re.S)
    assert table, "sMonAnimFunctions not found"
    entries = re.findall(r"\[(ANIM_\w+)\]\s*=\s*(\w+)", table.group(1))
    assert len(entries) > 100, len(entries)
    ident = re.compile(r"\b([A-Za-z_]\w*)\b")
    # Task_HandleMonAnimation / launchers are not part of an anim's own call graph (they zero data[2..7] before the first callback).
    excluded = {"Task_HandleMonAnimation", "LaunchAnimationTaskForFrontSprite", "LaunchAnimationTaskForBackSprite", "StartMonSummaryAnimation"}
    edges = {name: {t for t in ident.findall(body) if t in fns and t != name and t not in excluded} for name, body in fns.items()}
    direct = {name for name, body in fns.items() if WRITE.search(body)}
    result = {}
    for anim, entry in entries:
        assert entry in fns, (anim, entry)
        seen, stack = set(), [entry]
        while stack:
            f = stack.pop()
            if f in seen:
                continue
            seen.add(f)
            stack.extend(edges[f] - seen)
        writers = sorted(seen & direct)
        result[anim] = {"entry": entry, "writesData3": bool(writers), "writers": writers}
    out = {"schema": "dt60-mon-anim-data3/v1", "source": "reference/pokeemerald/src/pokemon_animation.c (sMonAnimFunctions; static call graph)",
           "rule": "writesData3 false => the battler sprite's data[3] is 0 after this send-out animation (Task_HandleMonAnimation zeroes data[2..7])",
           "anims": result}
    rendered = json.dumps(out, indent=1, sort_keys=True) + "\n"
    target = Path(args[0])
    if "--check" in sys.argv:
        if target.read_text() != rendered:
            raise SystemExit(f"{target} is stale")
        print(f"{target} up to date ({len(result)} anims, {sum(not v['writesData3'] for v in result.values())} leave data[3] == 0)")
        return
    target.write_text(rendered)
    print(f"wrote {target}: {len(result)} anims, {sum(not v['writesData3'] for v in result.values())} leave data[3] == 0")


main()
