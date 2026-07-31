#!/usr/bin/env python3
"""Dev-time RAM probe: `gPlayerParty`/`gEnemyParty` ground truth at Battle 2's
settled first action menu (ISSUES #39 rank-1 evidence gap; see
docs/battle2-party-ground-truth.md).

`tests/battle2CommandAdapterPreviewEquivalence.test.ts` flagged two facts the
repo has never pinned: ONIX's and KABUTO's real personality bytes (the legacy
fixture hardcodes gender "male"/"male"; the personality-less staged kernel
config derives "female"/"female" instead), and the player's real bench
composition (the legacy fixture hardcodes two switch decisions the staged
kernel config has zero evidence for). This probe replays the ALREADY-
COMMITTED canonical route to that menu verbatim --
`tools/compare/traces-groundtruth/battle1-winline-b-swap.json`, which
ROADMAP.md records reaches "battle 2's settled first action menu (FISHERMAN
JENSON / KABUTO)" at its final frame -- and reads both parties directly out
of RAM there. No new route is invented: out-of-battle RNG advances every
VBlank, so only replaying the committed button script byte-for-byte
reproduces the same battle 2 pairing (rngSeed 3530724670, matching
BATTLE2_TURN1_KERNEL_CONFIG in src/engine/battle2CommandAdapterPreview.ts).

Struct layout and decryption approach copied from (not imported -- that
script raises on import unless argv has exactly one path argument)
tools/extract/inspect-anchor.py: struct BoxPokemon's encrypted substructs,
GetSubstruct's SUBSTRUCT_CASE order table, and struct Pokemon's trailing
plaintext fields (status/level/hp/stats). Applied here to `gPlayerParty`/
`gEnemyParty` (struct Pokemon party[PARTY_SIZE], PARTY_SIZE=6,
include/pokemon.h:374+376) instead of the anchor draft's
`sFactorySelectScreen->mons[i].monData`.

Run through the teardown-safe wrapper:
    python3 tools/run-mgba-probe.py <fresh-output.json> -- \\
        tools/probe/dump-battle2-party-ground-truth.py <fresh-output.json>

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
ROUTE_TRACE_PATH = WORKTREE_ROOT / "tools" / "compare" / "traces-groundtruth" / "battle1-winline-b-swap.json"


def find_harness_root(start: Path) -> Path:
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
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"

# Battle-scene-off's bootstrap is byte-identical to battle-scene-on's at
# frame 0 (its own description field; confirmed live via `bin/oracle info`
# under the battle-scene-off profile) - same expected hash inspect-anchor.py
# pins for the on-profile bootstrap.
EXPECTED_CANONICAL_SHA256 = "9c89c74113f29e7d4595571c3aceb728417c4fe441b644ec0022fb498463f297"

# -- struct BoxPokemon / struct Pokemon layout (include/pokemon.h), copied
# from tools/extract/inspect-anchor.py -----------------------------------
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

PARTY_SIZE = 6  # include/constants/global.h:33

# GetSubstruct's SUBSTRUCT_CASE table (src/pokemon.c:3603-3633), copied from
# tools/extract/inspect-anchor.py.
SUBSTRUCT_ORDER_TABLE = {
    0: (0, 1, 2, 3), 1: (0, 1, 3, 2), 2: (0, 2, 1, 3), 3: (0, 3, 1, 2),
    4: (0, 2, 3, 1), 5: (0, 3, 2, 1), 6: (1, 0, 2, 3), 7: (1, 0, 3, 2),
    8: (2, 0, 1, 3), 9: (3, 0, 1, 2), 10: (2, 0, 3, 1), 11: (3, 0, 2, 1),
    12: (1, 2, 0, 3), 13: (1, 3, 0, 2), 14: (2, 1, 0, 3), 15: (3, 1, 0, 2),
    16: (2, 3, 0, 1), 17: (3, 2, 0, 1), 18: (1, 2, 3, 0), 19: (1, 3, 2, 0),
    20: (2, 1, 3, 0), 21: (3, 1, 2, 0), 22: (2, 3, 1, 0), 23: (3, 2, 1, 0),
}


def parse_int_defines(text: str, prefix: str) -> dict[int, str]:
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

# Both mons' genderRatio (src/data/pokemon/species_info.h), read directly
# from the pinned reference source rather than a generic PERCENT_FEMALE(...)
# macro evaluator (out of proportion for two species):
#   SPECIES_ONIX:   .genderRatio = PERCENT_FEMALE(50)   -> min(254, 127.5) -> 127
#   SPECIES_KABUTO: .genderRatio = PERCENT_FEMALE(12.5) -> min(254, 31.875) -> 31
GENDER_RATIOS = {"SPECIES_ONIX": 127, "SPECIES_KABUTO": 31}


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


def decode_pokemon(oracle: EmeraldOracle, addr: int) -> dict | None:
    """Returns None for an empty party slot (species 0, all-zero struct)."""
    personality = oracle.read_u32(addr + 0x00)
    ot_id = oracle.read_u32(addr + 0x04)
    checksum_stored = oracle.core.memory.u16[addr + 0x1C]

    words = decrypt_secure_words(oracle, addr, personality, ot_id)
    checksum_computed = 0
    for word in words:
        checksum_computed = (checksum_computed + (word & 0xFFFF) + (word >> 16)) & 0xFFFF

    order = SUBSTRUCT_ORDER_TABLE[personality % 24]
    growth = substruct_words(words, order, 0)
    species_id = growth[0] & 0xFFFF

    if species_id == 0:
        # SPECIES_NONE: an empty slot never had CreateMon called on it, so
        # its checksum is meaningless (still zero, but not worth asserting).
        return None

    if checksum_computed != checksum_stored:
        raise ValueError(
            f"BoxPokemon checksum mismatch at {addr:#x}: stored {checksum_stored:#x}, computed {checksum_computed:#x}"
        )

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
    nature_id = personality % 25
    gender_ratio = GENDER_RATIOS.get(species_name)
    gender = None
    if gender_ratio is not None:
        gender = "female" if gender_ratio > (personality & 0xFF) else "male"

    return {
        "personality": personality,
        "otId": ot_id,
        "species": species_name,
        "natureId": nature_id,
        "nature": NATURE_NAMES.get(nature_id, f"NATURE_{nature_id}"),
        "genderRatio": gender_ratio,
        "genderFromPersonality": gender,
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


def decode_party(oracle: EmeraldOracle, base_addr: int) -> list[dict | None]:
    return [decode_pokemon(oracle, base_addr + i * SIZEOF_POKEMON) for i in range(PARTY_SIZE)]


def main() -> None:
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    if oracle.canonical_screen_sha256 != EXPECTED_CANONICAL_SHA256:
        raise SystemExit(
            f"canonical_screen_sha256 mismatch: got {oracle.canonical_screen_sha256}, "
            f"expected {EXPECTED_CANONICAL_SHA256} - the bootstrap anchor has drifted"
        )
    oracle.new_session()

    route = json.loads(ROUTE_TRACE_PATH.read_text())
    tick = 0
    for segment in route["segments"]:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1

    player_party_addr = oracle.symbols["gPlayerParty"]
    enemy_party_addr = oracle.symbols["gEnemyParty"]
    battler_party_indexes_addr = oracle.symbols["gBattlerPartyIndexes"]

    result = {
        "routeTrace": str(ROUTE_TRACE_PATH.relative_to(WORKTREE_ROOT)),
        "finalTick": tick,
        "canonicalScreenSha256": oracle.canonical_screen_sha256,
        "gBattlerPartyIndexes": {
            "player": oracle.read_u16(battler_party_indexes_addr),
            "opponent": oracle.read_u16(battler_party_indexes_addr + 2),
        },
        "gPlayerParty": decode_party(oracle, player_party_addr),
        "gEnemyParty": decode_party(oracle, enemy_party_addr),
    }
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(result, indent=2) + "\n")
    print(f"wrote {OUTPUT_PATH} at tick {tick}")


if __name__ == "__main__":
    main()
