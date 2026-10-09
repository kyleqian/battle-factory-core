#!/usr/bin/env python3
"""later48: Dig + Return later-body scenarios after allocator-NON-net-zero predecessors (the supervisor's S10A allocator concern).

The prep48 bases (prep48Scenarios.py: both attacker sides, VIBRAVA/CHANSEY + FLYGON/GOLEM for Dig x4, DRAGONAIR/ONIX + SNORLAX/GOLEM for
Return x3), with the foe lead's move list replaced; the ROM computes every outcome. In production each predecessor leaves the allocator
host `historyKnown` false (liveMoveSpriteAllocator.ts / factoryRoundBattleOrchestrator.ts), while the order host keeps a known lend:
  wisp:  Will-O-Wisp 261 x4 (NOT in LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS; order plan 261) + the end-turn Status_Burn (a status
         animation: crossedUnknownGraphics; order plan STATUS_BRN).
  toxic: Toxic 92 x4 (audited net-zero body) + the end-turn Status_Poison (status animation; order plan STATUS_PSN).
Writes tools/integration/fixtures/later48/scenarios/ (the traces are prep48's).
"""
import json
from pathlib import Path

DIG = {
    "opp-vibrava-chansey": ("tools/battle-lab/mechanic-dig-opponent-vibrava-player-chansey.json", "player"),
    "ply-vibrava-chansey": ("tools/battle-lab/mechanic-dig-player-vibrava-opponent-chansey.json", "opponent"),
    "opp-flygon-golem": ("tools/battle-lab/prep18-dig-altopp-flygon-golem.json", "player"),
    "ply-flygon-golem": ("tools/battle-lab/prep18-dig-alt-flygon-golem.json", "opponent"),
}
RETURN = {
    "opp-dragonair-onix": ("tools/battle-lab/mechanic-return-opponent-dragonair-player-onix.json", "player"),
    "ply-dragonair-onix": ("tools/battle-lab/mechanic-return-player-dragonair-opponent-onix.json", "opponent"),
    "opp-snorlax-golem": ("tools/battle-lab/prep18-return-altopp-snorlax-golem.json", "player"),
    "ply-snorlax-golem": ("tools/battle-lab/prep18-return-alt-snorlax-golem.json", "opponent"),
}
VARIANTS = (("wisp", [261, 261, 261, 261]), ("toxic", [92, 92, 92, 92]))
OUT = Path("tools/integration/fixtures/later48/scenarios")
OUT.mkdir(parents=True, exist_ok=True)
for prefix, bases, turns, last, other in (("dig", DIG, 4, 1400, 1100), ("return", RETURN, 3, 1200, 1000)):
    for name, (path, foe) in bases.items():
        base = json.loads(Path(path).read_text())
        for variant, moves in VARIANTS:
            s = json.loads(json.dumps(base))
            s["overrides"]["parties"][foe][0]["moves"] = moves
            seg = []
            for turn in range(turns):
                seg += [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]},
                        {"frames": last if turn == turns - 1 else other, "buttons": []}]
            s["trace"] = {"segments": seg}
            (OUT / f"{prefix}-{name}-{variant}.json").write_text(json.dumps(s, indent=1) + "\n")
print(sorted(p.name for p in OUT.glob("*.json")))
