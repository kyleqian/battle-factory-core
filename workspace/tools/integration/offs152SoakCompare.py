#!/usr/bin/env python3
"""offs152 R4: vanilla soak (Scene OFF) base vs final: every seed OK and its decisions (outcome / battle / turn / carry / depth / end
state / last actions) identical; frames may move (the Scene OFF switch-in / forced switch-out timing).
usage: offs152SoakCompare.py <soak-base.json> <soak-final.json>"""
import json, sys
b = json.load(open(sys.argv[1]))["results"]; f = json.load(open(sys.argv[2]))["results"]
k = lambda r: (r["seed"], r["outcome"], r["battle"], r["turn"], r["maxCarriedWinStreak"], r["maxBattleDepth"], r["endState"], r["lastActions"])
ok = sum(r["outcome"] == "OK" for r in f); same = sum(k(x) == k(y) for x, y in zip(b, f))
print(f"{'SAME' if ok == len(f) == same else 'DIFF'} R4 soak vanilla: {ok} / {len(f)} OK, {same} / {len(f)} decisions identical to base")
sys.exit(0 if ok == len(f) == same else 1)
