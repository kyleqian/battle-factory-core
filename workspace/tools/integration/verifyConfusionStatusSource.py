#!/usr/bin/env python3
"""Verify the bounded Status_Confusion source witness produced by its probe."""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path


if len(sys.argv) != 3:
    raise SystemExit("usage: verifyConfusionStatusSource.py <evidence-dir> <receipt.json>")


DUCK_TAG = 10073
BENT_SPOON_TAG = 10097


def sha256(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def transitions(rows: list[dict[str, object]], tag: int) -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    loads: list[dict[str, object]] = []
    frees: list[dict[str, object]] = []
    before = [0xFFFF] * 16
    for row in rows:
        tags = row["tags"]
        assert isinstance(tags, list)
        load_banks = [index for index, value in enumerate(tags) if value == tag and before[index] != tag]
        free_banks = [index for index, value in enumerate(tags) if before[index] == tag and value == 0xFFFF]
        if load_banks:
            loads.append({"row": row, "banks": load_banks})
        if free_banks:
            frees.append({"row": row, "banks": free_banks})
        before = tags
    return loads, frees


def main() -> None:
    evidence_dir, receipt_path = map(Path, sys.argv[1:])
    receipt_runs: list[dict[str, object]] = []
    source_hashes: dict[str, str] | None = None
    for orientation, affected in (("player", 1), ("opponent", 0)):
        fresh_digest: str | None = None
        for fresh in range(2):
            path = evidence_dir / f"{orientation}-{fresh}.json"
            raw = path.read_bytes()
            data = json.loads(raw)
            digest = sha256(raw)
            if fresh_digest is not None:
                assert digest == fresh_digest, f"{orientation}: twice-fresh source output differs"
            fresh_digest = digest
            assert data["orientation"] == orientation
            if source_hashes is None:
                source_hashes = data["sourceSha256"]
            else:
                assert data["sourceSha256"] == source_hashes
            events = data["nonMoveAnimationEvents"]
            assert len(events) == 2, f"{orientation}: expected apply and confused-turn Status_Confusion starts"
            assert all(event["nearestLabel"] == "Status_Confusion" and event["offset"] == 3
                       for event in events), f"{orientation}: wrong status script"
            assert all(event["attacker"] == affected and event["target"] == affected
                       for event in events), f"{orientation}: status script targets wrong battler"
            rows = data["rows"]
            loads, frees = transitions(rows, DUCK_TAG)
            assert len(loads) == len(frees) == 2, f"{orientation}: duck lifecycle count"
            assert [load["row"]["currentMove"] for load in loads] == [109, 325]
            assert all(load["banks"] == [7] and load["row"]["reserved"] == 4 for load in loads)
            assert all(free["banks"] == [7] and free["row"]["reserved"] == 4 for free in frees)
            # The second status script is the confused Haunter's stock pre-move
            # animation.  A real Shadow Punch subsequently starts and allocates
            # its scratch palette; hashes deliberately preserve evidence without
            # turning source RAM into production palette constants.
            shadows = [event for event in data["moveAnimationEvents"] if event["moveId"] == 325]
            assert shadows, f"{orientation}: no actual Shadow Punch animation"
            shadow_after_status = next(event for event in shadows if event["tick"] > frees[1]["row"]["tick"])
            scratch = next(row for row in rows if row["tick"] > shadow_after_status["tick"]
                           and row["currentMove"] == 325 and BENT_SPOON_TAG in row["tags"])
            bank = scratch["tags"].index(BENT_SPOON_TAG)
            unfaded = scratch["unfadedObj"][bank * 16:(bank + 1) * 16]
            faded = scratch["fadedObj"][bank * 16:(bank + 1) * 16]
            assert unfaded != faded, f"{orientation}: expected live blend dependency"
            receipt_runs.append({
                "orientation": orientation, "freshRun": fresh, "sha256": digest,
                "statusTicks": [event["tick"] for event in events],
                "duckLoads": [{"tick": load["row"]["tick"], "currentMove": load["row"]["currentMove"],
                               "banks": load["banks"]} for load in loads],
                "duckFrees": [free["row"]["tick"] for free in frees],
                "shadowPunchTick": shadow_after_status["tick"], "shadowScratchBank": bank,
                "scratchUnfadedSha256": sha256(json.dumps(unfaded).encode()),
                "scratchFadedSha256": sha256(json.dumps(faded).encode()),
            })
    receipt = {
        "schema": "status-confusion-source-witness/v1",
        "claim": "Source-only ownership witness: legal Confuse Ray starts Status_Confusion on the affected battler, loads/frees ANIM_TAG_DUCK in bank 7, and leaves a separately observed following actual Shadow Punch scratch/blend dependency. No production palette value, live provider, framebuffer, timing, or arbitrary-history claim.",
        "evidenceDirectory": evidence_dir.name, "sourceSha256": source_hashes,
        "runs": receipt_runs,
    }
    receipt_path.write_text(json.dumps(receipt, indent=2) + "\n")
    print(json.dumps({"runs": len(receipt_runs), "receipt": str(receipt_path), "checks": "passed"}))


if __name__ == "__main__":
    main()
