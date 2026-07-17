#!/usr/bin/env python3
"""Dev-time RAM inspection: dump the anchor draft screen's gRngValue and its
six rental-mon candidates from a live mGBA session.

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/extract/inspect-anchor.py src/data/gen/anchor-state.json

Ground-truth sources (see reference/pokeemerald, cited inline below):
  - gRngValue: a COMMON_DATA global (src/random.c), read via the linker map.
  - gSaveBlock2Ptr->frontier.rentalMons[i].monId (i=0..5): the six draft
    candidates' index into gBattleFrontierMons, set by
    GenerateInitialRentalMons (src/battle_factory.c:595) before any pick is
    made.
  - sFactorySelectScreen->mons[i].monData: a full `struct Pokemon` per
    candidate, built by CreateFrontierFactorySelectableMons
    (src/battle_factory_screen.c:1736) via CreateMonWithEVSpreadNatureOTID +
    CalculateMonStats when the draft screen initializes
    (Select_InitMonsData, battle_factory_screen.c:1289) - i.e. already
    populated at the anchor. `sFactorySelectScreen` is a file-static pointer
    with no linker-map entry (locals aren't listed there); its address
    (0x0300127c) was resolved once via
    `arm-none-eabi-nm reference/pokeemerald/pokeemerald.elf | grep sFactorySelectScreen`
    and is pinned below with that provenance - re-derive if the reference
    build is ever bumped.

Quirks (see ROADMAP.md Domain notes): mGBA spews log lines to stdout (never
parsed here - all results go to the output file); the interpreter segfaults
at teardown *after* results are written (exit 139 is benign - check the
output file, not the exit code).
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

if len(sys.argv) != 2:
    raise SystemExit(f"usage: {sys.argv[0]} <output.json>")
OUTPUT_PATH = Path(sys.argv[1])

HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent
REFERENCE_POKEEMERALD = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()


def find_harness_root(start: Path) -> Path:
    """Walk upward from `start` for the dir owning oracle/emerald_core.py.

    Not derived from REFERENCE_POKEEMERALD's resolved path: that symlink
    chain (run root -> harness reference/ -> vendor/pokeemerald) collapses
    to a location outside the harness tree, so parent-counting from it picks
    the wrong ancestor. This works the same whether invoked from a plain run
    root or from a nested `.worktrees/<name>/` worktree root.
    """
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit(f"could not find the harness root (oracle/emerald_core.py) above {start}")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
ORACLE_DIR = HARNESS_ROOT / "oracle"
sys.path.insert(0, str(ORACLE_DIR))

from emerald_core import EmeraldOracle  # noqa: E402

ROM_PATH = REFERENCE_POKEEMERALD / "pokeemerald.gba"
MAP_PATH = REFERENCE_POKEEMERALD / "pokeemerald.map"
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory.json"

EXPECTED_CANONICAL_SHA256 = "9c89c74113f29e7d4595571c3aceb728417c4fe441b644ec0022fb498463f297"

# -- symbol addresses -------------------------------------------------------

# sFactorySelectScreen: static struct FactorySelectScreen *
# (src/battle_factory_screen.c) - file-static, not in the linker map; nm'd
# from the pinned reference build's ELF (see module docstring).
SFACTORY_SELECT_SCREEN_ADDR = 0x0300127C

# -- struct BoxPokemon / struct Pokemon layout (include/pokemon.h) ----------
# Verified against pret/pokeemerald's include/pokemon.h field order + GBA/EABI
# natural alignment; sizes cross-checked against the well-known canonical
# gen-3 constants (sizeof(BoxPokemon) == 80, sizeof(Pokemon) == 100).
BOXMON_SECURE_OFFSET = 0x20  # union secure { u32 raw[12]; ... }
POKEMON_STATUS_OFFSET = 0x50
POKEMON_LEVEL_OFFSET = 0x54
POKEMON_HP_OFFSET = 0x56
POKEMON_MAXHP_OFFSET = 0x58
POKEMON_ATTACK_OFFSET = 0x5A
POKEMON_DEFENSE_OFFSET = 0x5C
POKEMON_SPEED_OFFSET = 0x5E
POKEMON_SPATTACK_OFFSET = 0x60
POKEMON_SPDEFENSE_OFFSET = 0x62
SIZEOF_POKEMON = 0x64

# GetSubstruct's SUBSTRUCT_CASE table (src/pokemon.c:3603-3633): for
# personality % 24 == n, substructType X (0=Growth,1=Attacks,2=EVs&
# Condition,3=Misc) lives at raw block position table[n][X] among the 4
# 12-byte blocks in the (decrypted) secure region.
SUBSTRUCT_ORDER_TABLE = {
    0: (0, 1, 2, 3), 1: (0, 1, 3, 2), 2: (0, 2, 1, 3), 3: (0, 3, 1, 2),
    4: (0, 2, 3, 1), 5: (0, 3, 2, 1), 6: (1, 0, 2, 3), 7: (1, 0, 3, 2),
    8: (2, 0, 1, 3), 9: (3, 0, 1, 2), 10: (2, 0, 3, 1), 11: (3, 0, 2, 1),
    12: (1, 2, 0, 3), 13: (1, 3, 0, 2), 14: (2, 1, 0, 3), 15: (3, 1, 0, 2),
    16: (2, 3, 0, 1), 17: (3, 2, 0, 1), 18: (1, 2, 3, 0), 19: (1, 3, 2, 0),
    20: (2, 1, 3, 0), 21: (3, 1, 2, 0), 22: (2, 3, 1, 0), 23: (3, 2, 1, 0),
}

# -- struct SaveBlock2 / struct RentalMon layout (include/global.h) --------
SAVEBLOCK2_RENTALMONS_OFFSET = 0xE70  # struct RentalMon rentalMons[6]; (absolute, see global.h:448)
SIZEOF_RENTALMON = 12  # u16 monId; [pad2]; u32 personality; u8 ivs; u8 abilityNum; [pad2]
RENTALMON_MONID_OFFSET = 0

# -- struct FactorySelectScreen / FactorySelectableMon (battle_factory_screen.c) --
# 9 leading u8/bool8 fields (menuCursorPos..unused) then 3 bytes of padding
# to 4-align `mons` (struct FactorySelectableMon embeds a struct Pokemon,
# whose u32 fields require 4-byte alignment).
SELECT_SCREEN_MONS_OFFSET = 12
SIZEOF_FACTORY_SELECTABLE_MON = 108  # u16 monId; u16 ballSpriteId; u8 selectedId; [pad3]; struct Pokemon monData;
SELECTABLE_MON_MONID_OFFSET = 0
SELECTABLE_MON_MONDATA_OFFSET = 8
SELECTABLE_MONS_COUNT = 6


def parse_int_defines(text: str, prefix: str) -> dict[int, str]:
    """Reverse-map `#define {prefix}NAME <int>` lines to {int: "{prefix}NAME"}."""
    result: dict[int, str] = {}
    pattern = re.compile(rf"^#define\s+({re.escape(prefix)}[A-Z0-9_]+)\s+(\d+)\s*$", re.MULTILINE)
    for name, value in pattern.findall(text):
        result[int(value)] = name
    return result


def load_reverse_lookup(relative_path: str, prefix: str) -> dict[int, str]:
    text = (REFERENCE_POKEEMERALD / relative_path).read_text()
    return parse_int_defines(text, prefix)


SPECIES_NAMES = load_reverse_lookup("include/constants/species.h", "SPECIES_")
MOVE_NAMES = load_reverse_lookup("include/constants/moves.h", "MOVE_")
NATURE_NAMES = load_reverse_lookup("include/constants/pokemon.h", "NATURE_")


def find_species_abilities(species_name: str) -> list[str]:
    text = (REFERENCE_POKEEMERALD / "src/data/pokemon/species_info.h").read_text()
    block_match = re.search(rf"\[{re.escape(species_name)}\]\s*=\s*\{{(.*?)\n    \}},", text, re.DOTALL)
    if not block_match:
        raise ValueError(f"could not find species_info.h block for {species_name}")
    abilities_match = re.search(r"\.abilities\s*=\s*\{([^}]+)\}", block_match.group(1))
    if not abilities_match:
        raise ValueError(f"no .abilities field for {species_name}")
    return [part.strip() for part in abilities_match.group(1).split(",") if part.strip()]


def decrypt_secure_words(oracle: EmeraldOracle, pokemon_addr: int, personality: int, ot_id: int) -> list[int]:
    key = (personality ^ ot_id) & 0xFFFFFFFF
    words = []
    for i in range(12):
        raw = oracle.read_u32(pokemon_addr + BOXMON_SECURE_OFFSET + i * 4)
        words.append((raw ^ key) & 0xFFFFFFFF)
    return words


def substruct_words(words: list[int], order: tuple[int, int, int, int], substruct_type: int) -> list[int]:
    position = order[substruct_type]
    return words[position * 3:position * 3 + 3]


def decode_pokemon(oracle: EmeraldOracle, addr: int) -> dict:
    personality = oracle.read_u32(addr + 0x00)
    ot_id = oracle.read_u32(addr + 0x04)
    checksum_stored = oracle.core.memory.u16[addr + 0x1C]

    words = decrypt_secure_words(oracle, addr, personality, ot_id)
    checksum_computed = 0
    for word in words:
        checksum_computed = (checksum_computed + (word & 0xFFFF) + (word >> 16)) & 0xFFFF
    if checksum_computed != checksum_stored:
        raise ValueError(
            f"BoxPokemon checksum mismatch at {addr:#x}: stored {checksum_stored:#x}, computed {checksum_computed:#x}"
        )

    order = SUBSTRUCT_ORDER_TABLE[personality % 24]

    growth = substruct_words(words, order, 0)
    species_id = growth[0] & 0xFFFF

    attacks = substruct_words(words, order, 1)
    moves_raw = [attacks[0] & 0xFFFF, attacks[0] >> 16, attacks[1] & 0xFFFF, attacks[1] >> 16]
    pp_raw = [attacks[2] & 0xFF, (attacks[2] >> 8) & 0xFF, (attacks[2] >> 16) & 0xFF, (attacks[2] >> 24) & 0xFF]

    evCond = substruct_words(words, order, 2)
    evs = {
        "hp": evCond[0] & 0xFF,
        "attack": (evCond[0] >> 8) & 0xFF,
        "defense": (evCond[0] >> 16) & 0xFF,
        "speed": (evCond[0] >> 24) & 0xFF,
        "spAttack": evCond[1] & 0xFF,
        "spDefense": (evCond[1] >> 8) & 0xFF,
    }

    misc = substruct_words(words, order, 3)
    iv_word = misc[1]
    ivs = {
        "hp": iv_word & 0x1F,
        "attack": (iv_word >> 5) & 0x1F,
        "defense": (iv_word >> 10) & 0x1F,
        "speed": (iv_word >> 15) & 0x1F,
        "spAttack": (iv_word >> 20) & 0x1F,
        "spDefense": (iv_word >> 25) & 0x1F,
    }
    is_egg = (iv_word >> 30) & 1
    ability_num = (iv_word >> 31) & 1

    species_name = SPECIES_NAMES.get(species_id, f"SPECIES_{species_id}")
    abilities = find_species_abilities(species_name)

    return {
        "personality": personality,
        "otId": ot_id,
        "species": species_name,
        "nature": NATURE_NAMES.get(personality % 25, f"NATURE_{personality % 25}"),
        "isEgg": bool(is_egg),
        "abilityNum": ability_num,
        "ability": abilities[ability_num] if ability_num < len(abilities) else None,
        "ivs": ivs,
        "evs": evs,
        "moves": [MOVE_NAMES.get(m, f"MOVE_{m}") for m in moves_raw],
        "pp": pp_raw,
        "level": oracle.read_u8(addr + POKEMON_LEVEL_OFFSET),
        "status": oracle.read_u32(addr + POKEMON_STATUS_OFFSET),
        "stats": {
            "hp": oracle.core.memory.u16[addr + POKEMON_HP_OFFSET],
            "maxHp": oracle.core.memory.u16[addr + POKEMON_MAXHP_OFFSET],
            "attack": oracle.core.memory.u16[addr + POKEMON_ATTACK_OFFSET],
            "defense": oracle.core.memory.u16[addr + POKEMON_DEFENSE_OFFSET],
            "speed": oracle.core.memory.u16[addr + POKEMON_SPEED_OFFSET],
            "spAttack": oracle.core.memory.u16[addr + POKEMON_SPATTACK_OFFSET],
            "spDefense": oracle.core.memory.u16[addr + POKEMON_SPDEFENSE_OFFSET],
        },
    }


def main() -> None:
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    if oracle.canonical_screen_sha256 != EXPECTED_CANONICAL_SHA256:
        raise SystemExit(
            f"canonical_screen_sha256 mismatch: got {oracle.canonical_screen_sha256}, "
            f"expected {EXPECTED_CANONICAL_SHA256} - the bootstrap anchor has drifted"
        )

    rng_value = oracle.read_u32(oracle.symbols["gRngValue"])

    save_block2_addr = oracle.read_u32(oracle.symbols["gSaveBlock2Ptr"])
    rentalmons_base = save_block2_addr + SAVEBLOCK2_RENTALMONS_OFFSET

    select_screen_addr = oracle.read_u32(SFACTORY_SELECT_SCREEN_ADDR)
    if select_screen_addr == 0:
        raise SystemExit("sFactorySelectScreen is NULL - the draft select screen isn't initialized in this bootstrap")
    mons_base = select_screen_addr + SELECT_SCREEN_MONS_OFFSET

    rentals = []
    for i in range(SELECTABLE_MONS_COUNT):
        rentalmon_addr = rentalmons_base + i * SIZEOF_RENTALMON
        save_mon_id = oracle.core.memory.u16[rentalmon_addr + RENTALMON_MONID_OFFSET]

        selectable_addr = mons_base + i * SIZEOF_FACTORY_SELECTABLE_MON
        selectable_mon_id = oracle.core.memory.u16[selectable_addr + SELECTABLE_MON_MONID_OFFSET]
        if save_mon_id != selectable_mon_id:
            raise ValueError(
                f"slot {i}: gSaveBlock2Ptr->frontier.rentalMons[{i}].monId ({save_mon_id}) != "
                f"sFactorySelectScreen->mons[{i}].monId ({selectable_mon_id}) - offset math is wrong"
            )

        pokemon_addr = selectable_addr + SELECTABLE_MON_MONDATA_OFFSET
        decoded = decode_pokemon(oracle, pokemon_addr)
        rentals.append({"frontierMonIndex": selectable_mon_id, **decoded})

    result = {
        "canonicalScreenSha256": oracle.canonical_screen_sha256,
        "gRngValue": rng_value,
        "rentals": rentals,
    }
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(result, indent=2) + "\n")
    print(f"wrote {OUTPUT_PATH} ({len(rentals)} rentals, gRngValue={rng_value:#x})")


if __name__ == "__main__":
    main()
