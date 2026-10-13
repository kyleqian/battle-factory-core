#!/usr/bin/env python3
"""ord149: per-command census delta (liveShareCensus merged.jsonl, base vs patched; pairing by line, which land82CensusCheck pins 0 mismatches)
listing every command whose status or decline (without its gate line) changed, with the battle's earlier Astonish 310 bodies (side, command index).
usage: ord149CensusDelta.py <base merged.jsonl> <patched merged.jsonl> <out.json>"""
import json, sys
from pathlib import Path

base = [json.loads(l) for l in Path(sys.argv[1]).read_text().splitlines()]
patched = [json.loads(l) for l in Path(sys.argv[2]).read_text().splitlines()]
assert len(base) == len(patched)
astonish, index_in_battle, changed = {}, {}, []


def decline(row):  # the gate's source line moves with any patch above it: compared without it (reported as is)
    d = row["decline"]
    return None if d is None else {k: v for k, v in d.items() if k != "gate"}


for i, (b, p) in enumerate(zip(base, patched)):
    assert (b["battle"], b["kind"], b.get("moveId"), b.get("side"), b["frames"]) == (p["battle"], p["kind"], p.get("moveId"), p.get("side"), p["frames"])
    k = index_in_battle[b["battle"]] = index_in_battle.get(b["battle"], -1) + 1
    if b.get("moveId") == 310 and b["kind"] == "move":
        astonish.setdefault(b["battle"], []).append(f"{b['side']}@{k}")
    if (b["status"], decline(b)) != (p["status"], decline(p)):
        changed.append({"battle": b["battle"], "command": k, "kind": b["kind"], "move": b.get("move"), "side": b.get("side"), "frames": b["frames"],
                        "before": [b["status"], b["decline"]], "after": [p["status"], p["decline"]],
                        "earlierAstonish": [a for a in astonish.get(b["battle"], []) if int(a.split("@")[1]) < k]})
lifted = [c for c in changed if c["before"][0] != "live" and c["after"][0] == "live"]
out = {"schema": "ord149-census-delta/v1", "commands": len(base), "changed": changed,
       "lifted": {"commands": len(lifted), "frames": sum(c["frames"] for c in lifted)},
       "regressed": sum(c["before"][0] == "live" and c["after"][0] != "live" for c in changed),
       "changedWithoutEarlierPlayerAstonish": sum(not any(a.startswith("player@") for a in c["earlierAstonish"]) for c in changed)}
Path(sys.argv[3]).write_text(json.dumps(out, indent=1, sort_keys=True) + "\n")
for c in changed:
    print(c["battle"], c["command"], c["move"], c["side"], c["frames"], c["before"], "->", c["after"], c["earlierAstonish"])
print(f"changed {len(changed)}; lifted {out['lifted']}; regressed {out['regressed']}; without an earlier player Astonish {out['changedWithoutEarlierPlayerAstonish']}")
