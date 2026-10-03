#!/usr/bin/env python3
"""Verify the bounded stock Status_Burn source/resource witness."""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path


if len(sys.argv) != 3:
    raise SystemExit("usage: verifyBurnStatusSource.py <evidence-dir> <receipt.json>")


ROOT = Path(__file__).resolve().parents[2]
REFERENCE = (ROOT / "reference/pokeemerald").resolve()
SMALL_EMBER_TAG = 10029  # source: ANIM_SPRITES_START + 29
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


def source_audit(source_hashes: dict[str, str]) -> dict[str, object]:
    def read(path: str) -> str:
        value = (REFERENCE / path).read_text()
        assert hashlib.sha256(value.encode()).hexdigest() == source_hashes[path], f"source changed: {path}"
        return value

    util = read("src/battle_gfx_sfx_util.c")
    status = read("src/battle_anim_status_effects.c")
    scripts = read("data/battle_anim_scripts.s")
    fire = read("src/battle_anim_fire.c")
    anim = read("src/battle_anim.c")
    decompress = read("src/decompress.c")
    palette = read("src/palette.c")
    registry = read("src/data/battle_anim.h")
    constants = read("include/constants/battle_anim.h")
    battle = read("include/constants/battle.h")
    moves = read("include/constants/moves.h")
    learnsets = read("src/data/pokemon/level_up_learnsets.h")
    for token in ("else if (status == STATUS1_BURN)", "LaunchStatusAnimation(gActiveBattler, B_ANIM_STATUS_BRN)"):
        assert token in util, f"burn dispatch drifted: {token}"
    for token in ("gBattleAnimAttacker = battler;", "gBattleAnimTarget = battler;", "LaunchBattleAnimation(gBattleAnims_StatusConditions, statusAnimId, FALSE)", "Task_DoStatusAnimation"):
        assert token in status, f"status launch drifted: {token}"
    body = scripts[scripts.index("Status_Burn:\n"):scripts.index("Status_Infatuation:\n")]
    assert body == ("Status_Burn:\n"
                    "\tloadspritegfx ANIM_TAG_SMALL_EMBER\n"
                    "\tplaysewithpan SE_M_FLAME_WHEEL, SOUND_PAN_TARGET\n"
                    "\tcall BurnFlame\n\tcall BurnFlame\n\tcall BurnFlame\n"
                    "\twaitforvisualfinish\n\tend\n"
                    "BurnFlame:\n"
                    "\tcreatesprite gBurnFlameSpriteTemplate, ANIM_TARGET, 2, -24, 24, 24, 24, 20, 1, 1\n"
                    "\tdelay 4\n\treturn\n\n"), "Status_Burn body drifted"
    for token in (".tileTag = ANIM_TAG_SMALL_EMBER", ".paletteTag = ANIM_TAG_SMALL_EMBER", ".anims = gAnims_BasicFire", ".callback = AnimBurnFlame", "gBattleAnimArgs[0] = -gBattleAnimArgs[0]", "gBattleAnimArgs[2] = -gBattleAnimArgs[2]", "sprite->callback = AnimTravelDiagonally"):
        assert token in fire, f"BurnFlame template/callback drifted: {token}"
    for token in ("LoadCompressedSpriteSheetUsingHeap", "LoadCompressedSpritePaletteUsingHeap", "AddSpriteIndex", "FreeSpriteTilesByTag", "FreeSpritePaletteByTag", "sAnimSpriteIndexArray[i] = 0xFFFF"):
        assert token in anim, f"animation resource lifecycle drifted: {token}"
    for token in ("LoadCompressedSpritePaletteUsingHeap", "LoadSpritePalette(&dest)"):
        assert token in decompress, f"sprite palette loader drifted: {token}"
    for token in ("void LoadCompressedPalette", "gPlttBufferUnfaded", "gPlttBufferFaded"):
        assert token in palette, f"palette load ownership drifted: {token}"
    for token in ("{gBattleAnimSpriteGfx_SmallEmber, 0x0A00, ANIM_TAG_SMALL_EMBER}", "{gBattleAnimSpritePal_SmallEmber, ANIM_TAG_SMALL_EMBER}"):
        assert token in registry, f"Small Ember registry drifted: {token}"
    for token in ("#define ANIM_SPRITES_START 10000", "#define ANIM_TAG_SMALL_EMBER                (ANIM_SPRITES_START + 29)"):
        assert token in constants, f"Small Ember tag drifted: {token}"
    assert "#define STATUS1_BURN             (1 << 4)" in battle
    assert "#define MOVE_WILL_O_WISP 261" in moves and "#define MOVE_SHADOW_PUNCH 325" in moves
    assert "LEVEL_UP_MOVE(17, MOVE_WILL_O_WISP)" in learnsets
    return {"statusScript": {"tag": SMALL_EMBER_TAG, "flameCalls": 3, "delayPerCall": 4},
            "resource": {"sheetBytes": 0x0A00, "cmdEndFreesTrackedTags": True,
                         "loadWritesUnfadedAndFaded": True},
            "callback": "AnimBurnFlame flips local args then delegates to AnimTravelDiagonally; no palette ownership inferred from local motion."}


def main() -> None:
    evidence_dir, receipt_path = map(Path, sys.argv[1:])
    receipt_runs: list[dict[str, object]] = []
    source_hashes: dict[str, str] | None = None
    baseline: dict[str, object] = {}
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
                baseline = source_audit(source_hashes)
            else:
                assert data["sourceSha256"] == source_hashes
            statuses = data["statusEvents"]
            assert len(statuses) >= 2, f"{orientation}: application and later stock burn status animation required"
            assert all(event["nearestLabel"] == "Status_Burn" and event["offset"] == 3 for event in statuses), f"{orientation}: wrong status script/pointer"
            assert all(event["attacker"] == affected and event["target"] == affected for event in statuses), f"{orientation}: Status_Burn affected wrong battler"
            rows = data["rows"]
            loads, frees = transitions(rows, SMALL_EMBER_TAG)
            assert len(loads) == len(frees) == len(statuses), f"{orientation}: Small Ember lifecycle count"
            assert loads[0]["row"]["currentMove"] == 261, f"{orientation}: first burn status was not Will-O-Wisp application"
            assert loads[1]["row"]["currentMove"] == 0, f"{orientation}: later burn status was not a stock status phase"
            for load, free in zip(loads, frees):
                assert load["banks"] == free["banks"] and load["row"]["reserved"] == free["row"]["reserved"], f"{orientation}: resource bank/reservation did not cleanly restore"
                bank = load["banks"][0]
                before = next(row for row in rows if row["tick"] < load["row"]["tick"] and row["tags"][bank] == 0xFFFF)
                assert load["row"]["unfadedObj"][bank * 16:(bank + 1) * 16] != before["unfadedObj"][bank * 16:(bank + 1) * 16], f"{orientation}: Small Ember did not populate an allocatable unfaded row"
            moves = data["moveEvents"]
            wisps = [event for event in moves if event["moveId"] == 261]
            shadows = [event for event in moves if event["moveId"] == 325]
            assert wisps and shadows, f"{orientation}: ordinary source move route incomplete"
            later_free = frees[1]
            shadow_after = next((event for event in shadows if event["tick"] > later_free["row"]["tick"]), None)
            assert shadow_after is not None, f"{orientation}: no actual following Shadow Punch after later Status_Burn cleanup"
            scratch = next((row for row in rows if row["tick"] > shadow_after["tick"] and BENT_SPOON_TAG in row["tags"]), None)
            assert scratch is not None, f"{orientation}: following Shadow Punch scratch unavailable"
            scratch_bank = scratch["tags"].index(BENT_SPOON_TAG)
            unfaded = scratch["unfadedObj"][scratch_bank * 16:(scratch_bank + 1) * 16]
            faded = scratch["fadedObj"][scratch_bank * 16:(scratch_bank + 1) * 16]
            assert unfaded != faded, f"{orientation}: expected following scratch faded dependency"
            receipt_runs.append({
                "orientation": orientation, "freshRun": fresh, "sha256": digest,
                "statusTicks": [event["tick"] for event in statuses],
                "smallEmberLoads": [{"tick": load["row"]["tick"], "currentMove": load["row"]["currentMove"], "banks": load["banks"], "reserved": load["row"]["reserved"]} for load in loads],
                "smallEmberFrees": [{"tick": free["row"]["tick"], "banks": free["banks"], "reserved": free["row"]["reserved"]} for free in frees],
                "shadowPunchAfterLaterCleanupTick": shadow_after["tick"], "shadowScratchBank": scratch_bank,
                "scratchUnfadedSha256": sha256(json.dumps(unfaded).encode()), "scratchFadedSha256": sha256(json.dumps(faded).encode()),
            })
    receipt = {
        "schema": "status-burn-source-witness/v1",
        "claim": "Source-only ownership witness: legal accurate Will-O-Wisp starts Status_Burn on the affected battler, loads/frees source-derived Small Ember, and is followed by an actual Shadow Punch scratch/blend dependency. No production palette value, provider, framebuffer, timing, or arbitrary-history claim.",
        "evidenceDirectory": evidence_dir.name, "sourceSha256": source_hashes,
        "sourceAudit": baseline, "runs": receipt_runs,
        "referenceSha256": {name: sha256((REFERENCE / name).read_bytes()) for name in ("pokeemerald.gba", "pokeemerald.elf", "pokeemerald.map")},
        "toolSha256": {str(path.relative_to(ROOT)): sha256(path.read_bytes()) for path in (ROOT / "tools/integration/burnStatusSourceProbe.py", ROOT / "tools/integration/verifyBurnStatusSource.py")},
        "testedGit": {"commit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(), "tree": subprocess.check_output(["git", "rev-parse", "HEAD^{tree}"], cwd=ROOT, text=True).strip()},
    }
    receipt_path.write_text(json.dumps(receipt, indent=2) + "\n")
    print(json.dumps({"runs": len(receipt_runs), "receipt": str(receipt_path), "checks": "passed"}))


if __name__ == "__main__":
    main()
