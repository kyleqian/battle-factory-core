"""Frame catcher: the ROM's 100-byte Pokemon records (struct Pokemon, include/pokemon.h), with no emulator (romRun.py reads and writes
them in the ROM's RAM; tools/test_frame_catcher.py tests them)."""
import struct
import sys
from pathlib import Path

_HARNESS = next(p for p in Path(__file__).resolve().parents if (p / "oracle/battle_lab.py").is_file())
if str(_HARNESS / "oracle") not in sys.path:
    sys.path.insert(0, str(_HARNESS / "oracle"))
from battle_lab import SUBSTRUCT_POSITIONS  # noqa: E402  (stdlib only, no emulator)

POKEMON_SIZE = 100
STAT_ORDER = ("hp", "attack", "defense", "speed", "spAttack", "spDefense")
ABILITY_BIT = 1 << 31  # the misc substructure's IV word: 30 bits of IVs, isEgg (bit 30), abilityNum (bit 31)


def decrypt_mon(raw):
    """The four logical substructures (growth, attacks, EVs, misc) of a record, and whether its checksum holds."""
    personality, ot_id = struct.unpack_from("<II", raw, 0)
    key = personality ^ ot_id
    data = raw[32:80]
    plain = b"".join(struct.pack("<I", struct.unpack_from("<I", data, o)[0] ^ key) for o in range(0, 48, 4))
    order = SUBSTRUCT_POSITIONS[personality % 24]
    logical = [plain[order[i] * 12:order[i] * 12 + 12] for i in range(4)]
    ok = sum(struct.unpack("<24H", plain)) & 0xFFFF == struct.unpack_from("<H", raw, 28)[0]
    return logical, ok


def encrypt_mon(raw, logical, personality, ot_id):
    """`raw` with the logical substructures `logical` stored under `personality` and `ot_id` (order, key and checksum)."""
    order = SUBSTRUCT_POSITIONS[personality % 24]
    phys = [None] * 4
    for i in range(4):
        phys[order[i]] = logical[i]
    plain = b"".join(phys)
    key = personality ^ ot_id
    enc = b"".join(struct.pack("<I", struct.unpack_from("<I", plain, o)[0] ^ key) for o in range(0, 48, 4))
    out = bytearray(raw)
    struct.pack_into("<II", out, 0, personality, ot_id)
    struct.pack_into("<H", out, 28, sum(struct.unpack("<24H", plain)) & 0xFFFF)
    out[32:80] = enc
    return bytes(out)


def species_of(raw):
    logical, ok = decrypt_mon(raw)
    return struct.unpack_from("<H", logical[0], 0)[0] if ok else None


def ability_num(raw):
    logical, ok = decrypt_mon(raw)
    return (struct.unpack_from("<I", logical[3], 4)[0] >> 31) if ok else None


def gender(personality, ratio):
    """GetGenderFromSpeciesAndPersonality (pokemon.c) with the species' genderRatio."""
    if ratio == 0xFF:
        return "genderless"
    if ratio == 0xFE:
        return "female"
    if ratio == 0:
        return "male"
    return "female" if (personality & 0xFF) < ratio else "male"


def with_personality(raw, personality, ot_id, two_abilities):
    """The record `raw` as CreateMon would have built it with `personality` and `ot_id` (pokemon.c CreateBoxMon, CreateMon): the same
    data re-stored under the new key and substructure order, and the ability bit set to personality & 1 when the species has a second
    ability (left as it is otherwise, as CreateBoxMon leaves it). Gender, shininess and Spinda's spots are read from the personality;
    the stats depend on it only through the nature, so the nature must stay (CreateMonWithEVSpreadNatureOTID draws for the set's)."""
    logical, ok = decrypt_mon(raw)
    if not ok:
        raise ValueError("the record's checksum does not hold")
    old = struct.unpack_from("<I", raw, 0)[0]
    if old % 25 != personality % 25:
        raise ValueError(f"personality {personality} has nature {personality % 25}, the record's is {old % 25}")
    misc = bytearray(logical[3])
    if two_abilities:
        word = struct.unpack_from("<I", misc, 4)[0]
        struct.pack_into("<I", misc, 4, (word & ~ABILITY_BIT & 0xFFFFFFFF) | ((personality & 1) << 31))
    return encrypt_mon(raw, [logical[0], logical[1], logical[2], bytes(misc)], personality, ot_id)
