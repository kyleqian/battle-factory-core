#!/usr/bin/env python3
"""inv142 (docs/inv142-status-animation-invisible-battler.md): merge inv142Exposure.ts's ten shards (seeds 0..999, --index-from) into
one exposure receipt: totals, every invisible-battler status-animation command, and the table animation x side x path x cause.
usage: inv142ExposureSummary.py <shard-dir (e0..e9.json)> <out.json>
"""
import json, os, sys

src, out = sys.argv[1:3]
rows, total, battles = [], 0, 0
for i in range(10):
    d = json.load(open(os.path.join(src, f"e{i}.json")))
    rows += d["invisible"]
    total += d["statusAnimationCommands"]
    battles += len(d["battles"])


def path(r):
    prev = r["previousMessages"][-1] if r["previousMessages"] else ""
    if " is in love with " in prev:
        return "CANCELLER_IN_LOVE (own move cancelled: BattleScript_MoveUsedIsInLove)"
    if (r["nextMessage"] or "").endswith("fell asleep!"):
        return "ENDTURN_YAWN (BattleScript_YawnMakesAsleep)"
    return "other"


def cause(r):
    c = r["cause"]
    parts = (["sprite-visibility receipt"] if c["spriteVisibilityReceipt"] else []) + (["semi-invulnerable live-body hide"] if c["semiInvulnerableBodyHide"] else [])
    return (" + ".join(parts) or ("doll" if r["doll"] else "?")) + f" (hidden by the battler's {r['hiddenBy']} charge body)"


table = {}
for r in rows:
    k = f"{r['animation']} | {r['side']} | {path(r)} | {cause(r)}"
    table[k] = table.get(k, 0) + 1
receipt = {"schema": "inv142-exposure-summary/v1", "seeds": "0..999", "battles": battles, "statusAnimationCommands": total,
           "invisibleCommands": len(rows), "dollCommands": sum(r["doll"] for r in rows),
           "wouldDrawWithVisibilityForced": sum(r["wouldDraw"] for r in rows),
           "table": dict(sorted(table.items())), "commands": rows}
json.dump(receipt, open(out, "w"), indent=1, ensure_ascii=False)
open(out, "a").write("\n")
print(f"{total} status-animation commands / {battles} battles; invisible {len(rows)}")
for k, v in sorted(table.items()):
    print(f"  {v}  {k}")
