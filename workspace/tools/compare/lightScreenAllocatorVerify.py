#!/usr/bin/env python3
"""Verify six fresh Light Screen allocator lifecycle witnesses."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit("usage: lightScreenAllocatorVerify.py <raw-directory> <receipt.json>")

RAW, RECEIPT = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
PROBE = ROOT / "tools/compare/lightScreenAllocatorProbe.py"
NAMES = ("player-exeggcute-a", "player-exeggcute-b",
         "opponent-exeggcute-a", "opponent-exeggcute-b",
         "player-slowpoke-a", "player-slowpoke-b")


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    rows = {name: json.loads((RAW / f"{name}.json").read_text()) for name in NAMES}
    expected_allocations = {
        "player": [(310, 3, "wall"), (322, 4, "sparkle"),
                   (330, 5, "sparkle"), (337, 7, "sparkle"),
                   (346, 4, "sparkle"), (354, 5, "sparkle"),
                   (362, 7, "sparkle")],
        "opponent": [(220, 3, "wall"), (232, 4, "sparkle"),
                     (240, 5, "sparkle"), (247, 7, "sparkle"),
                     (256, 4, "sparkle"), (264, 5, "sparkle"),
                     (272, 7, "sparkle")],
    }
    expected_clocks = {"player": {"start": 303, "cleanup": 388},
                       "opponent": {"start": 213, "cleanup": 298},
                       "slowpoke": {"start": 306, "cleanup": 391}}
    probe_sha = digest(PROBE)
    summaries = []
    for name, row in rows.items():
        if row["schema"] != "light-screen-allocator-lifecycle/v1":
            raise RuntimeError(f"{name}: schema")
        if row["toolSha256"] != probe_sha:
            raise RuntimeError(f"{name}: stale probe identity")
        ref = ROOT / "reference/pokeemerald"
        for filename, expected_sha in row["referenceSha256"].items():
            if digest(ref / filename) != expected_sha:
                raise RuntimeError(f"{name}: stale reference {filename}")
        for filename, expected_sha in row["sourceSha256"].items():
            if digest(ref / filename) != expected_sha:
                raise RuntimeError(f"{name}: stale source {filename}")
        side = ("opponent" if name.startswith("opponent") else
                "slowpoke" if "slowpoke" in name else "player")
        allocation_side = "player" if side == "slowpoke" else side
        got = [(x["frame"], x["slot"], x["kind"])
               for x in row["lightScreenAllocations"]]
        expected = expected_allocations[allocation_side]
        if side == "slowpoke":
            expected = [(frame + 3, slot, kind) for frame, slot, kind in expected]
        if got != expected:
            raise RuntimeError(f"{name}: allocations {got}")
        if row["animationClock"] != expected_clocks[side]:
            raise RuntimeError(f"{name}: clock {row['animationClock']}")
        checkpoint_slots = [x["slot"] for x in row["checkpoint"]["sprites"]]
        if checkpoint_slots != [0, 1, 2, 3, 4, 6, 8, 60, 61, 62, 63]:
            raise RuntimeError(f"{name}: checkpoint {checkpoint_slots}")
        events = row["events"]
        if not any(e["phase"] == "pre-checkpoint" and not e["occupied"]
                   and len(e["freed"]) >= 10 for e in events):
            raise RuntimeError(f"{name}: battle ResetSpriteData not observed")
        templates = {n for e in events for a in e["allocated"]
                     for n in a["templateNames"]}
        for required in ("sHealthboxPlayerSpriteTemplates",
                         "sHealthboxOpponentSpriteTemplates",
                         "sHealthbarSpriteTemplates", "gSpriteTemplate_EnemyShadow",
                         "sStatusSummaryBarSpriteTemplates",
                         "sStatusSummaryBallsSpriteTemplates", "gMultiuseSpriteTemplate"):
            if required not in templates:
                raise RuntimeError(f"{name}: missing lifecycle {required}")
        summaries.append({"name": name, "rawSha256": digest(RAW / f"{name}.json"),
                          "checkpointStep": row["checkpoint"]["step"],
                          "checkpointSlots": checkpoint_slots,
                          "animationClock": row["animationClock"],
                          "allocations": got})
    for a, b in (("player-exeggcute-a", "player-exeggcute-b"),
                 ("opponent-exeggcute-a", "opponent-exeggcute-b"),
                 ("player-slowpoke-a", "player-slowpoke-b")):
        # Raw payloads are deterministic; scenario strings match within a pair.
        if digest(RAW / f"{a}.json") != digest(RAW / f"{b}.json"):
            raise RuntimeError(f"fresh pair differs: {a}/{b}")
    git = lambda *args: subprocess.run(["git", *args], cwd=ROOT, check=True,
                                       capture_output=True, text=True).stdout.strip()
    receipt = {
        "schema": "light-screen-allocator-verification/v1",
        "testedCommit": git("rev-parse", "HEAD"),
        "testedTree": git("write-tree"),
        "probeSha256": probe_sha,
        "verifierSha256": digest(Path(__file__)),
        "referenceSha256": next(iter(rows.values()))["referenceSha256"],
        "sourceSha256": next(iter(rows.values()))["sourceSha256"],
        "runs": summaries,
        "historyBound": next(iter(rows.values()))["historyBound"],
        "verdict": "fresh BattleLab ordinary-singles entry is deterministic through ResetSpriteData, healthboxes, shadow, intro party summaries/sendout, command-cursor destruction, and first legal Light Screen cleanup; unknown entry/switch/summary/substitute/transform histories remain unknown",
        "providerPromoted": False,
        "unresolvedProviderStep": "dense once-per-VBlank diffs still coalesce same-frame DestroySprite/CreateSprite replacements during trainer/battler sendout (notably dynamic gMultiuseSpriteTemplate and ball-particle reuse); exact in-frame source call order must be ported before a runtime recipe is honest",
    }
    RECEIPT.parent.mkdir(parents=True, exist_ok=True)
    RECEIPT.write_text(json.dumps(receipt, indent=2) + "\n")
    print(json.dumps({"runs": len(summaries), "allocations": "7/7 each",
                      "testedCommit": receipt["testedCommit"],
                      "testedTree": receipt["testedTree"]}))


if __name__ == "__main__":
    main()
