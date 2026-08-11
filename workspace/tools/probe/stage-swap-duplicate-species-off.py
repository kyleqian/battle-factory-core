#!/usr/bin/env python3
"""Stage and record the OFF swap duplicate-species rejection branch.

The canonical Battle-1 swap roster has no duplicate species.  This probe
replays only its established prefix through the input-ready enemy picker, then
changes *only* enemy slot 0's encrypted species word from GROVYLE (278) to
MAGBY (240).  MAGBY is player slot 1, not the selected replacement slot 0,
which is the precise source predicate for Swap_AlreadyHasSameSpecies.

Run through tools/run-mgba-probe.py; it writes RAM/task evidence only and
never creates images or uses the staged value as production data.
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
from pathlib import Path

if len(sys.argv) != 2:
    raise SystemExit(f"usage: {sys.argv[0]} <output.json>")

OUTPUT_PATH = Path(sys.argv[1])
HERE, ROOT = Path(__file__).resolve().parent, Path(__file__).resolve().parents[2]


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit("could not find harness root above worktree")


HARNESS = find_harness_root(ROOT)
sys.path.insert(0, str(HARNESS / "oracle"))
from emerald_core import EmeraldOracle  # noqa: E402

REFERENCE = (ROOT / "reference" / "pokeemerald").resolve()
TRACE = ROOT / "tools/compare/traces-groundtruth/battle1-swapyes-b.json"
BOOTSTRAP = HARNESS / "oracle/bootstrap/factory-battle-scene-off.json"
GTASKS, TASK_SIZE = 0x03005E00, 0x28
SFACTORY_SWAP_SCREEN, GPLAYERPARTY, GENEMYPARTY = 0x03001284, 0x020244EC, 0x02024744
GSAVEBLOCK2PTR, GRNGVALUE = 0x03005D90, 0x03005D80
GSPECIALVAR_RESULT = 0x020375F0
PARTY_MON_SIZE, RENTALS_OFFSET = 0x64, 0xE70
HANDLE_CHOOSE, CANT_HAVE_SAME = 0x0819CE40, 0x0819F488
CHECKPOINTS = {29935, 29937, 29938, 29961, 29962, 29982, 29983, 29984, 29986}
RGB_DIR = Path(os.environ["FACTORY_SWAP_DUPLICATE_RGB_DIR"]) if os.environ.get("FACTORY_SWAP_DUPLICATE_RGB_DIR") else None
SUBSTRUCT_ORDERS = (
    (0, 1, 2, 3), (0, 1, 3, 2), (0, 2, 1, 3), (0, 3, 1, 2), (0, 2, 3, 1), (0, 3, 2, 1),
    (1, 0, 2, 3), (1, 0, 3, 2), (2, 0, 1, 3), (3, 0, 1, 2), (2, 0, 3, 1), (3, 0, 2, 1),
    (1, 2, 0, 3), (1, 3, 0, 2), (2, 1, 0, 3), (3, 1, 0, 2), (2, 3, 0, 1), (3, 2, 0, 1),
    (1, 2, 3, 0), (1, 3, 2, 0), (2, 1, 3, 0), (3, 1, 2, 0), (2, 3, 1, 0), (3, 2, 1, 0),
)


def u16(oracle: EmeraldOracle, address: int) -> int:
    return oracle.read_u8(address) | oracle.read_u8(address + 1) << 8


def u32(oracle: EmeraldOracle, address: int) -> int:
    return u16(oracle, address) | u16(oracle, address + 2) << 16


def bytes_at(oracle: EmeraldOracle, address: int, size: int) -> bytes:
    return bytes(oracle.read_u8(address + offset) for offset in range(size))


def party_species(oracle: EmeraldOracle, base: int, slot: int) -> int:
    mon = base + slot * PARTY_MON_SIZE
    key = u32(oracle, mon) ^ u32(oracle, mon + 4)
    type0 = SUBSTRUCT_ORDERS[u32(oracle, mon) % 24][0]
    return (u32(oracle, mon + 0x20 + type0 * 12) ^ key) & 0xFFFF


def stage_enemy_species(oracle: EmeraldOracle, slot: int, species: int) -> dict[str, int]:
    """Replace species plus its required BoxPokemon checksum, nothing else."""
    mon = GENEMYPARTY + slot * PARTY_MON_SIZE
    key = u32(oracle, mon) ^ u32(oracle, mon + 4)
    type0 = SUBSTRUCT_ORDERS[u32(oracle, mon) % 24][0]
    species_address = mon + 0x20 + type0 * 12
    before = u32(oracle, species_address)
    decoded = before ^ key
    encoded = (decoded & ~0xFFFF) | species
    stored = encoded ^ key
    oracle.write_u8(species_address, stored & 0xFF)
    oracle.write_u8(species_address + 1, (stored >> 8) & 0xFF)
    # GetMonData validates this checksum before it can read the secure species
    # substruct.  Recompute it after the identity-word edit; this is integrity
    # metadata for the same staged input, not a separate party mutation.
    checksum = sum(
        u16(oracle, mon + 0x20 + offset) ^ ((key >> (8 * (offset % 4))) & 0xFFFF)
        for offset in range(0, 48, 2)
    ) & 0xFFFF
    oracle.write_u8(mon + 0x1C, checksum & 0xFF)
    oracle.write_u8(mon + 0x1D, checksum >> 8)
    return {"address": species_address, "beforeStoredWord": before, "afterStoredWord": u32(oracle, species_address), "checksumAddress": mon + 0x1C, "checksum": checksum}


def active_swap_task(oracle: EmeraldOracle) -> dict[str, int] | None:
    for task_id in range(16):
        address = GTASKS + task_id * TASK_SIZE
        if oracle.read_u8(address + 4):
            func = u32(oracle, address) & ~1
            if func in (HANDLE_CHOOSE, CANT_HAVE_SAME):
                return {"id": task_id, "func": func, "state": u16(oracle, address + 8)}
    return None


def snapshot(oracle: EmeraldOracle, tick: int) -> dict[str, object]:
    screen = u32(oracle, SFACTORY_SWAP_SCREEN)
    task = active_swap_task(oracle)
    return {
        "tick": tick,
        "framebufferSha256": hashlib.sha256(oracle.screen_rgb()).hexdigest(),
        "rng": f"0x{u32(oracle, GRNGVALUE):08x}",
        "specialVarResult": u16(oracle, GSPECIALVAR_RESULT),
        "task": None if task is None else {**task, "name": {HANDLE_CHOOSE: "Swap_Task_HandleChooseMons", CANT_HAVE_SAME: "Swap_TaskCantHaveSameMons"}[task["func"]]},
        "swapScreen": None if not screen else {
            "cursorPos": oracle.read_u8(screen + 3), "playerMonId": oracle.read_u8(screen + 0x12),
            "inEnemyScreen": oracle.read_u8(screen + 0x14), "monSwapped": oracle.read_u8(screen + 0x20),
        },
        "playerSpecies": [party_species(oracle, GPLAYERPARTY, slot) for slot in range(3)],
        "enemySpecies": [party_species(oracle, GENEMYPARTY, slot) for slot in range(3)],
    }


def dump_rgb(oracle: EmeraldOracle, tick: int) -> None:
    if RGB_DIR is not None and 29935 <= tick <= 29986:
        RGB_DIR.mkdir(parents=True, exist_ok=True)
        (RGB_DIR / f"{tick - 29935:03d}.rgb").write_bytes(oracle.screen_rgb())


def main() -> None:
    trace = json.loads(TRACE.read_text())
    oracle = EmeraldOracle(REFERENCE / "pokeemerald.gba", REFERENCE / "pokeemerald.map", BOOTSTRAP)
    oracle.new_session()
    tick = 0
    for segment in trace["segments"][:153]:
        for _ in range(int(segment["frames"])):
            oracle.advance(segment.get("buttons", [])); tick += 1
    for _ in range(132):
        oracle.advance([]); tick += 1
    # The transition-in install frame rejects this A edge.  The following
    # picker snapshot is the staging point and the next *fresh* A is the
    # accepted duplicate selection.
    assert tick == 29934
    oracle.advance(["A"]); tick += 1
    task_at_picker = active_swap_task(oracle)
    assert tick == 29935 and task_at_picker is not None and task_at_picker["func"] == HANDLE_CHOOSE and task_at_picker["state"] == 1

    player_before = bytes_at(oracle, GPLAYERPARTY, PARTY_MON_SIZE * 3)
    rentals_base = u32(oracle, GSAVEBLOCK2PTR) + RENTALS_OFFSET
    rentals_before = bytes_at(oracle, rentals_base, 12 * 6)
    enemy_before = bytes_at(oracle, GENEMYPARTY, PARTY_MON_SIZE * 3)
    assert [party_species(oracle, GPLAYERPARTY, i) for i in range(3)] == [95, 240, 153]
    assert [party_species(oracle, GENEMYPARTY, i) for i in range(3)] == [278, 198, 17]
    mutation = stage_enemy_species(oracle, 0, 240)
    enemy_staged = bytes_at(oracle, GENEMYPARTY, PARTY_MON_SIZE * 3)
    changed = [offset for offset, pair in enumerate(zip(enemy_before, enemy_staged)) if pair[0] != pair[1]]
    assert changed == [mutation["checksumAddress"] - GENEMYPARTY, mutation["checksumAddress"] - GENEMYPARTY + 1, mutation["address"] - GENEMYPARTY, mutation["address"] - GENEMYPARTY + 1]
    assert [party_species(oracle, GENEMYPARTY, i) for i in range(3)] == [240, 198, 17]

    rows = [snapshot(oracle, tick)]
    dump_rgb(oracle, tick)

    def record_if_checkpoint() -> None:
        dump_rgb(oracle, tick)
        if tick in CHECKPOINTS:
            rows.append(snapshot(oracle, tick))
    # Release the deliberately rejected install-frame A, then take the first
    # fresh picker edge through Swap_ActionMon's duplicate branch.
    oracle.advance([]); tick += 1; record_if_checkpoint()
    oracle.advance(["A"]); tick += 1; record_if_checkpoint()
    assert active_swap_task(oracle) is not None and active_swap_task(oracle)["func"] == CANT_HAVE_SAME

    sent_early_b = sent_close_b = sent_install_right = released_install_right = sent_fresh_right = False
    while not sent_fresh_right:
        task = active_swap_task(oracle)
        buttons: list[str] = []
        if task and task["func"] == CANT_HAVE_SAME and task["state"] == 0 and not sent_early_b:
            buttons = ["B"]; sent_early_b = True
        elif task and task["func"] == CANT_HAVE_SAME and task["state"] == 1 and not sent_close_b:
            buttons = ["B"]; sent_close_b = True
        elif task and task["func"] == CANT_HAVE_SAME and task["state"] == 4 and not sent_install_right:
            buttons = ["RIGHT"]; sent_install_right = True
        elif task and task["func"] == HANDLE_CHOOSE and task["state"] == 1 and sent_install_right and not released_install_right:
            released_install_right = True
        elif task and task["func"] == HANDLE_CHOOSE and task["state"] == 1 and released_install_right and not sent_fresh_right:
            buttons = ["RIGHT"]; sent_fresh_right = True
        oracle.advance(buttons); tick += 1; record_if_checkpoint()
        if tick > 30150:
            raise RuntimeError("duplicate rejection did not return to picker")

    assert bytes_at(oracle, GPLAYERPARTY, PARTY_MON_SIZE * 3) == player_before
    assert bytes_at(oracle, rentals_base, 12 * 6) == rentals_before
    assert bytes_at(oracle, GENEMYPARTY, PARTY_MON_SIZE * 3) == enemy_staged
    OUTPUT_PATH.write_text(json.dumps({
        "profile": "battle-scene-off", "canonicalPrefix": str(TRACE.relative_to(ROOT)),
        "staging": {"tick": 29935, "enemySlot": 0, "fromSpecies": 278, "toSpecies": 240, "duplicatePlayerSlot": 1,
                    "mutation": mutation, "changedEnemyBytes": changed},
        "edges": {
            "pickerA": {"rejected": 29935, "acceptedFresh": 29937},
            "duplicateMessageB": {"rejected": 29938, "accepted": 29961},
            "returnPickerRight": {"rejected": 29983, "acceptedFresh": 29986},
        },
        "timeline": {"duplicateTask": 29937, "messageInputReady": 29961, "closeMonPic": 29962,
                     "selectAcceptRestored": 29982, "pickerInstalled": 29984},
        "rows": rows,
        "invariants": {"playerPartyPreserved": True, "rentalRecordsPreserved": True,
                       "enemyPartyPreservedAfterStaging": True, "copySwappedMonDataNotReached": True},
    }, indent=2) + "\n")


main()
