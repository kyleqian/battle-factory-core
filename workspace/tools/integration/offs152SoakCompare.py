#!/usr/bin/env python3
"""offs152 R4: vanilla soak (Scene OFF, frame budget 600,000) base vs final. offs152 shortens Scene OFF send-ins (102 -> 62..145 frames)
and forced switch-outs, so a budget-ended run gets further in the same frames: the end position (battle, turn) and the frame stamps
legitimately move. Claim: every seed OK in both trees, max carried win streak and max battle depth equal, and the final tree's end
position at or after the base's. (Gameplay / RNG identity is the route census's claim: offs152RouteDelta.py.)
usage: offs152SoakCompare.py <soak-base.json> <soak-final.json>"""
import json, sys
b = json.load(open(sys.argv[1]))["results"]; f = json.load(open(sys.argv[2]))["results"]
ok = sum(x["outcome"] == "OK" and y["outcome"] == "OK" for x, y in zip(b, f))
same = sum((x["maxCarriedWinStreak"], x["maxBattleDepth"]) == (y["maxCarriedWinStreak"], y["maxBattleDepth"]) for x, y in zip(b, f))
ahead = sum((y["battle"], y["turn"]) >= (x["battle"], x["turn"]) for x, y in zip(b, f))
good = ok == same == ahead == len(f)
print(f"{'SAME' if good else 'DIFF'} R4 soak vanilla: {ok} / {len(f)} OK both trees, carry + depth equal {same} / {len(f)}, "
      f"final position >= base {ahead} / {len(f)}")
sys.exit(0 if good else 1)
