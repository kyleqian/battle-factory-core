#!/usr/bin/env python3
"""Set Options > Battle Scene to ON inside factory.sav (bootstrap v5).

Flips `optionsBattleSceneOff` (SaveBlock2 offset 0x14, u16 bit 10 -> byte
0x15 bit 2) to 0 in every valid SaveBlock2 sector of both save slots, and
recomputes each edited sector's checksum. Everything else is byte-identical.

Layout per reference/pokeemerald (save.h / save.c):
  32 sectors x 0x1000; slots A/B = sectors 0-13 / 14-27 (rotated ids).
  Sector: data[3968], unused[116], u16 id @0xFF4, u16 checksum @0xFF6,
  u32 signature @0xFF8 (must be 0x08012025), u32 counter @0xFFC.
  checksum = 16-bit fold of the u32-sum over the sector's USED data size
  (min(sizeof(struct SaveBlock2), 3968)) - re-derived from the file itself
  below by finding the size at which the stored checksum verifies, rather
  than trusting a hard-coded struct size.

Idempotent: running on an already-edited save is a no-op. The pristine
file is recoverable via git (oracle/bootstrap/factory.sav is tracked).
"""
import struct
import sys
from pathlib import Path

SAV = Path(__file__).parent / "factory.sav"
SECTOR_SIZE = 0x1000
SECTOR_DATA_SIZE = 3968
SIGNATURE = 0x08012025
OPTIONS_HI = 0x15          # SaveBlock2 + 0x15: options u16 hi byte
BATTLE_SCENE_OFF_MASK = 0x04  # u16 bit 10 -> hi-byte bit 2


def fold_checksum(data: bytes) -> int:
    total = 0
    for (word,) in struct.iter_unpack("<I", data):
        total = (total + word) & 0xFFFFFFFF
    return ((total >> 16) + total) & 0xFFFF


def derive_used_size(data: bytes, stored: int) -> int | None:
    for size in range(4, SECTOR_DATA_SIZE + 1, 4):
        if fold_checksum(data[:size]) == stored:
            return size
    return None


def main() -> None:
    raw = bytearray(SAV.read_bytes())
    assert len(raw) == 0x20000, f"unexpected save size {len(raw)}"
    edits = []
    for sector in range(28):  # both slots; HoF/TrainerHill/Recorded untouched
        base = sector * SECTOR_SIZE
        sec_id, stored_ck = struct.unpack_from("<HH", raw, base + 0xFF4)
        signature, counter = struct.unpack_from("<II", raw, base + 0xFF8)
        if signature != SIGNATURE or sec_id != 0:
            continue
        data = bytes(raw[base : base + SECTOR_DATA_SIZE])
        used = derive_used_size(data, stored_ck)
        assert used is not None, (
            f"sector {sector}: stored checksum does not verify at any size - "
            "refusing to edit an inconsistent save"
        )
        byte = raw[base + OPTIONS_HI]
        if not (byte & BATTLE_SCENE_OFF_MASK):
            edits.append((sector, counter, used, "already ON"))
            continue
        raw[base + OPTIONS_HI] = byte & ~BATTLE_SCENE_OFF_MASK
        new_ck = fold_checksum(bytes(raw[base : base + used]))
        struct.pack_into("<H", raw, base + 0xFF6, new_ck)
        edits.append((sector, counter, used, f"0x{byte:02x}->0x{raw[base + OPTIONS_HI]:02x}, ck 0x{stored_ck:04x}->0x{new_ck:04x}"))
    assert edits, "no valid SaveBlock2 sector found - wrong file?"
    SAV.write_bytes(bytes(raw))
    for sector, counter, used, what in edits:
        print(f"sector {sector} (counter {counter}, used size 0x{used:x}): {what}")


if __name__ == "__main__":
    main()
