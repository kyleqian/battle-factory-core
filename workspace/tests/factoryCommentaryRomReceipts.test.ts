/**
 * ROM ground-truth receipts for `src/engine/factoryCommentary.ts`, closing
 * Gate-5 acceptance-audit item (d)'s "zero ROM ground truth for any
 * non-canonical party" gap (`docs/gate5-acceptance-audit.md` clause (d)).
 *
 * Provenance: `docs/commentary-preview-report-receipts.md` records the full
 * method (bootstrap anchor, probe invocation, frame numbers, PNG sha256
 * digests). Summary: `BattleLab.preview_report(seed=N)`
 * (`oracle/battle_lab.py:667-759`, `../../oracle/BATTLE_LAB.md` "Report
 * preview" section) replays the attendant scouting-report dialogue from the
 * `bootstrap/factory-pre-report.json` anchor and returns
 * `report.opponentSetIds` (the three real `gFrontierTempParty` set IDs) and
 * the raw `typeVar`/`styleVar` (`gSpecialVar_0x8005`/`0x8006`) the ROM
 * computed and the script dispatches on verbatim
 * (`data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:207-226,
 * 265-283` `call_if_eq VAR_0x8005/VAR_0x8006`). These integers ARE the
 * report's dispatch key for the printed lines, not a derived summary of
 * them, so they are used directly as ground truth here; a subset was also
 * spot-checked against the OCR'd on-screen sentence (digests + verdicts in
 * the doc above) to confirm the dispatch mapping. `seed` only selects which
 * real opponent is generated — it cannot choose a specific one — so each
 * entry below is whatever party that seed actually produced, read back
 * after generation, not a hand-picked matchup.
 *
 * Hermetic: no oracle call at test time, only these captured literals.
 */

import { describe, expect, it } from "vitest";
import movesData from "../src/data/gen/moves.json" with { type: "json" };
import {
  FACTORY_NO_FAVORITE_TYPE,
  FACTORY_STYLE,
  getFactoryOpponentBattleStyle,
  getFactoryOpponentFavoriteType,
  type FactoryCommentaryParty,
  type FactoryCommentaryPartyMember,
  type FactoryFavoriteTypeResult,
  type FactoryBattleStyle,
} from "../src/engine/factoryCommentary.ts";

type MoveRow = Readonly<{ move: string; id: number }>;
const MOVE_ID = new Map(
  (movesData as { moves: MoveRow[] }).moves.map((row) => [row.move, row.id]),
);

function move(symbol: string): number {
  const id = MOVE_ID.get(symbol);
  if (id === undefined) throw new Error(`unknown ROM-receipt move ${symbol}`);
  return id;
}

type RomPartyMon = Readonly<{
  setId: number;
  species: string;
  moves: readonly [string, string, string, string];
}>;

function member(mon: RomPartyMon): FactoryCommentaryPartyMember {
  return {
    speciesName: mon.species,
    moves: mon.moves.map(move) as unknown as readonly [number, number, number, number],
  };
}

/**
 * `BattleLab.preview_report(seed=N)`'s `report.opponentSetIds`, joined
 * against `src/data/gen/battle-frontier-mons.json` (the same
 * `FRONTIER_MONS` table `createFactoryCorpusPartyMember` reads its
 * `speciesName`/`moves` fields from — commentary needs no other field, so
 * no personality/IV/ability synthesis is needed to reproduce this join)
 * for the species/move symbols. Canonical comparison party (audit's
 * "differs from the canonical one" bar): BUTTERFREE/HAUNTER/QUILAVA, sets
 * 153/179/181, typeVar 18 (no favorite), styleVar 5 (weakening) — see
 * `tests/factoryCommentary.test.ts`'s "keeps the canonical upcoming
 * opponent equivalent to frozen presentation".
 */
const ROM_RECEIPTS: readonly {
  seed: number;
  party: readonly [RomPartyMon, RomPartyMon, RomPartyMon];
  typeVar: FactoryFavoriteTypeResult;
  styleVar: FactoryBattleStyle;
  bothDifferFromCanonical: boolean;
}[] = [
  {
    seed: 1,
    party: [
      { setId: 115, species: "SPECIES_VOLTORB", moves: ["MOVE_SPARK", "MOVE_SCREECH", "MOVE_ROLLOUT", "MOVE_LIGHT_SCREEN"] },
      { setId: 189, species: "SPECIES_COMBUSKEN", moves: ["MOVE_EMBER", "MOVE_DOUBLE_KICK", "MOVE_QUICK_ATTACK", "MOVE_SAND_ATTACK"] },
      { setId: 181, species: "SPECIES_QUILAVA", moves: ["MOVE_FLAME_WHEEL", "MOVE_FURY_SWIPES", "MOVE_SWIFT", "MOVE_SMOKESCREEN"] },
    ],
    typeVar: 10, // FIRE
    styleVar: FACTORY_STYLE.WEAKENING,
    bothDifferFromCanonical: false, // style matches canonical (weakening)
  },
  {
    seed: 2,
    party: [
      { setId: 154, species: "SPECIES_BEEDRILL", moves: ["MOVE_TWINEEDLE", "MOVE_PURSUIT", "MOVE_ENDEAVOR", "MOVE_AGILITY"] },
      { setId: 125, species: "SPECIES_CACNEA", moves: ["MOVE_NEEDLE_ARM", "MOVE_FAINT_ATTACK", "MOVE_COTTON_SPORE", "MOVE_SAND_ATTACK"] },
      { setId: 155, species: "SPECIES_POLIWHIRL", moves: ["MOVE_WATER_PULSE", "MOVE_DOUBLE_SLAP", "MOVE_ICY_WIND", "MOVE_RAIN_DANCE"] },
    ],
    typeVar: FACTORY_NO_FAVORITE_TYPE,
    styleVar: FACTORY_STYLE.WEAKENING,
    bothDifferFromCanonical: false, // same type+style as canonical, different party entirely
  },
  {
    seed: 3,
    party: [
      { setId: 120, species: "SPECIES_PHANPY", moves: ["MOVE_ROLLOUT", "MOVE_DEFENSE_CURL", "MOVE_ROCK_TOMB", "MOVE_SANDSTORM"] },
      { setId: 119, species: "SPECIES_HOUNDOUR", moves: ["MOVE_CRUNCH", "MOVE_EMBER", "MOVE_ROAR", "MOVE_PROTECT"] },
      { setId: 177, species: "SPECIES_PARASECT", moves: ["MOVE_SLASH", "MOVE_PSYBEAM", "MOVE_STUN_SPORE", "MOVE_FLASH"] },
    ],
    typeVar: FACTORY_NO_FAVORITE_TYPE,
    styleVar: FACTORY_STYLE.NONE,
    bothDifferFromCanonical: false, // type matches canonical (no favorite)
  },
  {
    seed: 4,
    party: [
      { setId: 137, species: "SPECIES_FARFETCHD", moves: ["MOVE_SLASH", "MOVE_KNOCK_OFF", "MOVE_SWORDS_DANCE", "MOVE_AGILITY"] },
      { setId: 175, species: "SPECIES_CHARMELEON", moves: ["MOVE_SLASH", "MOVE_FIRE_SPIN", "MOVE_SWORDS_DANCE", "MOVE_AERIAL_ACE"] },
      { setId: 121, species: "SPECIES_SPOINK", moves: ["MOVE_PSYWAVE", "MOVE_BOUNCE", "MOVE_MAGIC_COAT", "MOVE_CONFUSE_RAY"] },
    ],
    typeVar: FACTORY_NO_FAVORITE_TYPE,
    styleVar: FACTORY_STYLE.PREPARATION,
    bothDifferFromCanonical: false, // type matches canonical (no favorite)
  },
  {
    seed: 13,
    party: [
      { setId: 152, species: "SPECIES_MAWILE", moves: ["MOVE_CRUNCH", "MOVE_FAKE_TEARS", "MOVE_IRON_DEFENSE", "MOVE_BATON_PASS"] },
      { setId: 121, species: "SPECIES_SPOINK", moves: ["MOVE_PSYWAVE", "MOVE_BOUNCE", "MOVE_MAGIC_COAT", "MOVE_CONFUSE_RAY"] },
      { setId: 185, species: "SPECIES_WOBBUFFET", moves: ["MOVE_COUNTER", "MOVE_MIRROR_COAT", "MOVE_CHARM", "MOVE_SAFEGUARD"] },
    ],
    typeVar: 14, // PSYCHIC
    styleVar: FACTORY_STYLE.FLEXIBLE,
    bothDifferFromCanonical: true,
  },
  {
    seed: 14,
    party: [
      { setId: 199, species: "SPECIES_FURRET", moves: ["MOVE_SLAM", "MOVE_PROTECT", "MOVE_HELPING_HAND", "MOVE_FOLLOW_ME"] },
      { setId: 110, species: "SPECIES_GRIMER", moves: ["MOVE_SLUDGE", "MOVE_ROCK_TOMB", "MOVE_ACID_ARMOR", "MOVE_MINIMIZE"] },
      { setId: 145, species: "SPECIES_SPINDA", moves: ["MOVE_DIZZY_PUNCH", "MOVE_TEETER_DANCE", "MOVE_PSYBEAM", "MOVE_FAINT_ATTACK"] },
    ],
    typeVar: 0, // NORMAL
    styleVar: FACTORY_STYLE.NONE,
    bothDifferFromCanonical: true,
  },
  {
    seed: 17,
    party: [
      { setId: 147, species: "SPECIES_NIDORINO", moves: ["MOVE_DOUBLE_KICK", "MOVE_WATER_PULSE", "MOVE_MUD_SLAP", "MOVE_FLATTER"] },
      { setId: 114, species: "SPECIES_DROWZEE", moves: ["MOVE_CONFUSION", "MOVE_HEADBUTT", "MOVE_DISABLE", "MOVE_BARRIER"] },
      { setId: 184, species: "SPECIES_MURKROW", moves: ["MOVE_FAINT_ATTACK", "MOVE_FLY", "MOVE_TORMENT", "MOVE_TAUNT"] },
    ],
    typeVar: FACTORY_NO_FAVORITE_TYPE,
    styleVar: FACTORY_STYLE.SLOW_STEADY,
    bothDifferFromCanonical: false, // type matches canonical (no favorite)
  },
  {
    seed: 19,
    party: [
      { setId: 172, species: "SPECIES_VOLBEAT", moves: ["MOVE_SILVER_WIND", "MOVE_CONFUSE_RAY", "MOVE_QUICK_ATTACK", "MOVE_HELPING_HAND"] },
      { setId: 159, species: "SPECIES_LEDIAN", moves: ["MOVE_COMET_PUNCH", "MOVE_BATON_PASS", "MOVE_SWORDS_DANCE", "MOVE_AGILITY"] },
      { setId: 153, species: "SPECIES_BUTTERFREE", moves: ["MOVE_SILVER_WIND", "MOVE_PSYBEAM", "MOVE_TOXIC", "MOVE_WHIRLWIND"] },
    ],
    typeVar: 6, // BUG
    styleVar: FACTORY_STYLE.NONE,
    bothDifferFromCanonical: true,
  },
  {
    seed: 20,
    party: [
      { setId: 118, species: "SPECIES_DELIBIRD", moves: ["MOVE_PRESENT", "MOVE_ICE_BALL", "MOVE_AERIAL_ACE", "MOVE_HAIL"] },
      { setId: 194, species: "SPECIES_MAGCARGO", moves: ["MOVE_ROCK_SLIDE", "MOVE_EMBER", "MOVE_ACID_ARMOR", "MOVE_SANDSTORM"] },
      { setId: 147, species: "SPECIES_NIDORINO", moves: ["MOVE_DOUBLE_KICK", "MOVE_WATER_PULSE", "MOVE_MUD_SLAP", "MOVE_FLATTER"] },
    ],
    typeVar: FACTORY_NO_FAVORITE_TYPE,
    styleVar: FACTORY_STYLE.WEATHER,
    bothDifferFromCanonical: false, // type matches canonical (no favorite)
  },
  {
    seed: 22,
    party: [
      { setId: 153, species: "SPECIES_BUTTERFREE", moves: ["MOVE_SILVER_WIND", "MOVE_PSYBEAM", "MOVE_TOXIC", "MOVE_WHIRLWIND"] },
      { setId: 195, species: "SPECIES_PUPITAR", moves: ["MOVE_DIG", "MOVE_BITE", "MOVE_SCARY_FACE", "MOVE_SANDSTORM"] },
      { setId: 122, species: "SPECIES_ARON", moves: ["MOVE_METAL_CLAW", "MOVE_AERIAL_ACE", "MOVE_METAL_SOUND", "MOVE_ROAR"] },
    ],
    typeVar: 5, // ROCK
    styleVar: FACTORY_STYLE.WEAKENING,
    bothDifferFromCanonical: false, // style matches canonical (weakening)
  },
];

describe("Battle Factory commentary — ROM ground-truth receipts", () => {
  it.each(ROM_RECEIPTS.map((r) => [r.seed, r] as const))(
    "seed %i: port reproduces the ROM's typeVar/styleVar for the actually-generated party",
    (_seed, receipt) => {
      const party = receipt.party.map(member) as unknown as FactoryCommentaryParty;
      const favoriteType = getFactoryOpponentFavoriteType(party);
      const battleStyle = getFactoryOpponentBattleStyle(party);
      expect(favoriteType.result).toBe(receipt.typeVar);
      expect(battleStyle.result).toBe(receipt.styleVar);
    },
  );

  it("samples at least two distinct favorite types and two distinct styles", () => {
    const types = new Set(ROM_RECEIPTS.map((r) => r.typeVar));
    const styles = new Set(ROM_RECEIPTS.map((r) => r.styleVar));
    expect(types.size).toBeGreaterThanOrEqual(2);
    expect(styles.size).toBeGreaterThanOrEqual(2);
  });

  it("includes at least one seed whose type and style both differ from the canonical party", () => {
    const canonicalType: FactoryFavoriteTypeResult = FACTORY_NO_FAVORITE_TYPE;
    const canonicalStyle: FactoryBattleStyle = FACTORY_STYLE.WEAKENING;
    const bothDiffer = ROM_RECEIPTS.filter(
      (r) => r.typeVar !== canonicalType && r.styleVar !== canonicalStyle,
    );
    expect(bothDiffer.length).toBeGreaterThan(0);
    expect(bothDiffer.map((r) => r.seed)).toEqual(
      ROM_RECEIPTS.filter((r) => r.bothDifferFromCanonical).map((r) => r.seed),
    );
  });
});
