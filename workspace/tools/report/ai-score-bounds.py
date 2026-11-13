"""parity-mac fourth pass: bounds on what the three Factory AI scripts can add to or take from one move's score in one decision.

  python3 tools/report/ai-score-bounds.py          prints the bounds and the conclusion; exit 1 if the conclusion does not hold

Why (docs/parity-mac/ai-scripts-unusable-slots.md, "Not covered"): C's final pick (`ChooseMoveOrAction_Singles`, battle_ai_script_commands.c) takes the
highest score over all four slots, the ones masked by `CheckMoveLimitations` included (they start at 0, usable ones at 100, `BattleAI_SetupAIData`
:326-341), and `Cmd_score` flattens a negative score to 0 (:703-711). The engine keeps masked slots out of the pool and does not flatten. The two differ
only if a masked slot's score can reach a usable slot's. This script reads `data/battle_ai_scripts.s` and proves it cannot:

  for every path through AI_CheckBadMove, AI_TryToFaint and AI_CheckViability (the Factory's three scripts, GetAiScriptsInBattleFactory)
    lowest  = the sum of the negative `score` commands on the path   (a usable slot's score is at least 100 + the three lowest sums)
    highest = the sum of the positive `score` commands on the path   (a masked slot's score is at most the three highest sums; flattening only
              removes negative steps, so the positive steps alone are an upper bound)

Branch conditions are ignored (every `if_*` is taken both ways), so the bounds are wider than what can happen. `call LABEL` runs LABEL to its `end` and
returns; `end` at the top level ends the script. A backward jump would make the walk loop: the script refuses the file if one exists.
"""
import re, sys
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "reference/pokeemerald/data/battle_ai_scripts.s"
SCRIPTS = ("AI_CheckBadMove", "AI_TryToFaint", "AI_CheckViability")


def parse(text):
    labels, commands = {}, []
    for raw in text.splitlines():
        line = raw.split("@")[0].rstrip()
        m = re.match(r"^(\w+):+\s*$", line)
        if m:
            labels[m.group(1)] = len(commands)
            continue
        m = re.match(r"^\s+(\S+)\s*(.*)$", line)
        if not m or m.group(1).startswith("."):
            if m and m.group(1) in (".byte", ".2byte", ".4byte"):
                commands.append(("data", []))  # a table: never executed (reached only as an operand)
            continue
        commands.append((m.group(1), [a.strip() for a in m.group(2).split(",")] if m.group(2) else []))
    return labels, commands


def bounds(labels, commands):
    sys.setrecursionlimit(100000)
    on_stack = set()

    @lru_cache(maxsize=None)
    def walk(i):
        """(lowest negative sum, highest positive sum) from command i to the `end` of the current call depth."""
        if i in on_stack:
            raise SystemExit(f"ai-score-bounds: a jump back to command {i} ({commands[i]}): the walk assumes no loops")
        on_stack.add(i)
        try:
            name, args = commands[i]
            if name == "end":
                return (0, 0)
            if name == "data":
                raise SystemExit(f"ai-score-bounds: fell into a data table at command {i}")
            if name == "goto":
                return walk(labels[args[0]])
            nxt = walk(i + 1)
            if name == "score":
                v = int(args[0])
                return (nxt[0] + min(v, 0), nxt[1] + max(v, 0))
            if name == "call":
                sub = walk(labels[args[0]])
                return (sub[0] + nxt[0], sub[1] + nxt[1])
            if name.startswith("if_"):
                target = walk(labels[args[-1]])
                return (min(nxt[0], target[0]), max(nxt[1], target[1]))
            return nxt
        finally:
            on_stack.discard(i)

    return {s: walk(labels[s]) for s in SCRIPTS}


def main():
    labels, commands = parse(SOURCE.read_text())
    result = bounds(labels, commands)
    for name, (low, high) in result.items():
        print(f"{name}: lowest {low}, highest +{high}")
    usable_low = 100 + sum(low for low, _ in result.values())
    masked_high = sum(high for _, high in result.values())
    print(f"a usable slot ends a decision at {usable_low} or more; a masked slot at {masked_high} or less")
    ok = usable_low > masked_high
    print("a masked slot can never reach a usable slot's score" if ok else "NOT PROVEN: the bounds overlap")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
