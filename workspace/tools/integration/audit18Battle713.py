#!/usr/bin/env python3
"""Live audit 18 target 3: census battle 713 (seed 713) per command on 82690e775 vs this tree (audit18Census713.ts `hosts`: the allocator
history / order host state at the command's first frame, the sprite-allocator input, the battler sprites shown). Prints every command
whose status differs and the host state of the commands around it.
usage: audit18Battle713.py <b50c4dabd.jsonl> <master.jsonl>"""
import json, sys

a = [json.loads(l) for l in open(sys.argv[1])]
b = [json.loads(l) for l in open(sys.argv[2])]
assert [(x["moveId"], x["side"]) for x in a] == [(x["moveId"], x["side"]) for x in b], "command key sequences differ"
changed = [i for i, (x, y) in enumerate(zip(a, b)) if x["status"] != y["status"]]
print("commands", len(a), "status changes", [(i, a[i]["move"], a[i]["side"], a[i]["status"], b[i]["status"]) for i in changed])
for i in range(max(0, min(changed) - 4), min(len(a), max(changed) + 3)):
    x, y = a[i], b[i]
    print(f"{i:>2} {x['move'][:12]:<12} {x['side'][:3]} 82690e775 {x['status']:<8} {json.dumps(x['hosts'])} {(x.get('decline') or {}).get('reason', '')}")
    print(f"   {'':<12} {'':<3} master    {y['status']:<8} {json.dumps(y['hosts'])} {(y.get('decline') or {}).get('reason', '')}")
