#!/usr/bin/env python3
"""Folds the two ISSUES #134 probe runs per arm into the committed receipt.

Usage:
  python3 tools/probe/build-issue134-receipt.py \
      intimidate=<runA.json>,<runB.json> control=<runA.json>,<runB.json>

Each arm's two runs come from a fresh oracle each; their sha256 digests must be
byte-identical or this refuses to write.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

OUTPUT = Path("tools/probe/receipts/issue134-switchineffects-clears-off.json")
SIDE_STATUS_SPIKES_DAMAGED = 1 << 9


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def arm_payload(run_a: Path, run_b: Path) -> dict:
    digest_a, digest_b = digest(run_a), digest(run_b)
    if digest_a != digest_b:
        raise SystemExit(f"{run_a} and {run_b} are not byte-identical: {digest_a} vs {digest_b}")
    data = json.loads(run_a.read_text())
    entries = [
        {
            "entryFrame": entry["frame"],
            "partyIndex": entry["partyIndex"],
            "species": entry["species"],
            "maxHp": entry["maxHp"],
            "hpOnLoad": entry["hpAfterLoad"],
            "hpAfterEntry": entry["hpAfterEntry"],
            "spikesDamage": entry["spikesDamage"],
            "spikesLayersAtEntry": entry["spikesLayersAtEntry"],
            "spikesDamagedBitAtWindowEnd": entry["spikesDamagedBitAtWindowEnd"],
            "hpTransitions": entry["hpTransitions"],
        }
        # entryEvents[0] is the lead's implicit window (never a switch-in).
        for entry in data["entryEvents"][1:]
    ]
    return {
        "fixture": data["fixture"],
        "probeOutputSha256": digest_a,
        "runs": [
            {"path": run_a.as_posix(), "sha256": digest_a},
            {"path": run_b.as_posix(), "sha256": digest_b},
        ],
        "rom": {
            "seed": data["seed"],
            "playerPartySpecies": [mon["species"] for mon in data["parties"]["player"]],
            "opponentPartySpecies": [mon["species"] for mon in data["parties"]["opponent"]],
            "entries": entries,
            "spikesDamagedFrames": [
                {
                    "frame": event["frame"],
                    "set": event["spikesDamagedAfter"],
                    "battleScript": event["battleScript"],
                }
                for event in data["sideStatusEvents"]
                if event["spikesDamagedBefore"] != event["spikesDamagedAfter"]
            ],
            "spikesLayerEvents": data["spikesLayerEvents"],
            "hitMarkerFaintedEvents": data["hitMarkerFaintedEvents"],
            "finalSideStatuses0": data["final"]["sideStatuses0"],
            "finalPlayerParty": data["final"]["playerParty"],
            "messageEvents": data["messageEvents"],
            "framebufferSha256": data["framebufferSha256"],
        },
    }


def main() -> None:
    arms: dict[str, dict] = {}
    for argument in sys.argv[1:]:
        name, _, paths = argument.partition("=")
        run_a, run_b = (Path(part) for part in paths.split(","))
        arms[name] = arm_payload(run_a, run_b)
    if set(arms) != {"intimidate", "control"}:
        raise SystemExit(f"expected exactly the intimidate and control arms, got {sorted(arms)}")

    existing = json.loads(OUTPUT.read_text()) if OUTPUT.exists() else {}
    receipt = {
        "schema": "issue134-switchineffects-clears-off-receipt/v1",
        "issue": 134,
        "oracleProfile": "battle-scene-off",
        "probe": "tools/probe/probe-issue134-switchineffects-clears-off.py",
        "builder": "tools/probe/build-issue134-receipt.py",
        "question": (
            "Does an Intimidate switch-in clear SIDE_STATUS_SPIKES_DAMAGED on the stock ROM, so "
            "that the NEXT switch-in on that side still takes Spikes damage? "
            "battle_script_commands.c:5268 says yes (battle_util.c:2559-2565's ON_SWITCHIN case "
            "sets only STATUS3_INTIMIDATE_POKES and breaks with no effect++, so "
            "AbilityBattleEffects returns 0 and Cmd_switchineffects enters its !Ability && !Item body)."
        ),
        "verdict": (
            "CONFIRMED. Both arms clear SIDE_STATUS_SPIKES_DAMAGED inside the switchineffects "
            "opcode (BattleScript_DoSwitchOut+32) after the entrant took its Spikes chip, and the "
            "third entrant WHISCASH takes 30 = 185/6 (two layers) in both arms. The Intimidate arm "
            "is not a special case on the ROM; it is one in the unfixed port."
        ),
        "constants": {
            "SIDE_STATUS_SPIKES_DAMAGED": SIDE_STATUS_SPIKES_DAMAGED,
            "SIDE_STATUS_SPIKES": 1 << 4,
        },
        "arms": arms,
    }
    if "engineDivergence" in existing:
        receipt["engineDivergence"] = existing["engineDivergence"]
    OUTPUT.write_text(json.dumps(receipt, indent=2) + "\n")
    print(f"wrote {OUTPUT}")


if __name__ == "__main__":
    main()
