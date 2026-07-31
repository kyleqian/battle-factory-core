/**
 * ISSUES #39 rank-2 decision-side proof: does the ported AI faint-
 * replacement path reproduce DESTIN's two real Battle-1 send-outs?
 *
 * - Turn 5: GROVYLE (opponent party slot 0) faints to Onix's ROCK_SLIDE ->
 *   the ROM sends PIDGEOTTO (slot 2), skipping MURKROW (slot 1).
 * - Turn 13: PIDGEOTTO (slot 2) faints to Onix's DRAGON_BREATH -> the ROM
 *   sends MURKROW (slot 1).
 *
 * Source rule (NOT `ShouldSwitch`/`evaluateFactoryAiSwitchPolicy`, which is
 * the mid-turn *voluntary* switch ladder and is never consulted here): a
 * forced faint replacement is chosen by `OpponentHandleChoosePokemon`
 * (`battle_controller_opponent.c:1621-1676`) calling
 * `GetMostSuitableMonToSwitchInto()` (`battle_ai_switch_items.c:629-790`)
 * synchronously and unconditionally -- confirmed end-to-end, source +
 * live RAM ledger, by `docs/forced-switch-ground-truth.md` §1b/§2/§6. That
 * function is already ported, pure, and RNG-free as
 * `getMostSuitableMonToSwitchInto` (`src/engine/battleAiSwitchInto.ts`) --
 * this file drives that exact function, not `factoryAiSwitchPolicy.ts`.
 *
 * Input facts and citations:
 * - DESTIN's real bench (species/slot/moves, all one trainer otId
 *   416049562) and the real send-out order GROVYLE -> PIDGEOTTO -> MURKROW:
 *   `docs/onix-readylag-destin-bench-probes.md` Probe 2.
 * - The turn-5 event (GROVYLE faints, ROM sends PIDGEOTTO over MURKROW,
 *   `gBattlerPartyIndexes[1]` 0->2 not 0->1) and GROVYLE/ONIX's RAM-read
 *   level-50 stat blocks (atk/def/spAtk/spDef): `docs/battle-turn-notes.md`
 *   §13 (HEADLINE + §5's stat table, ticks 6682-6684).
 * - The turn-13 event (PIDGEOTTO faints to Onix's DRAGON_BREATH, ROM sends
 *   MURKROW) and PIDGEOTTO's own RAM-read stat block:
 *   `docs/battle-turn-notes.md` §13 note 7 (atk 98/def 61/spAtk 56/spDef 56)
 *   and §47-50 (turn 13 DRAGON_BREATH -> faint -> Murkrow switch-in, tick
 *   15887 KO / TURN13_ICONBAR_CREATE_TICK 16847 window).
 * - Species types (ONIX/GROVYLE/PIDGEOTTO/MURKROW) and move
 *   type/power/id: `src/data/gen/species-types.json`,
 *   `src/data/gen/moves.json` (generated, source-derived catalogs already
 *   used throughout `src/engine`).
 * - `AI_CalcDmg`'s formula is the same `CalculateBaseDamage` this engine
 *   already ports as `calculateBaseDamage` (`src/engine/damageCalc.ts`,
 *   itself oracle-pinned by `tests/damageCalc.test.ts` against this same
 *   battle's own RAM dump) -- reused here, not re-derived, per
 *   `battle_script_commands.c:1306-1319`'s `AI_CalcDmg(attacker, defender)`
 *   calling `CalculateBaseDamage(&gBattleMons[attacker],
 *   &gBattleMons[defender], gCurrentMove, ...)` verbatim.
 *
 * RNG: `getMostSuitableMonToSwitchInto` takes no RNG state and draws
 * nothing -- `docs/forced-switch-ground-truth.md` §2b/§3d's live ledgers
 * show the entire switch-in dance (both the AI and player sides) holds
 * `gRngValue` bit-identical across the whole window, for both battle-lab
 * probe fixtures and (by the same source, since Factory uses the vanilla
 * algorithm per §1b) DESTIN's own battle. Zero draws is therefore the
 * correct, cited pin for this decision -- there is nothing to record a
 * `before`/`after` RNG state for.
 */
import { describe, expect, it } from "vitest";
import {
  getMostSuitableMonToSwitchInto,
  type BattleAiSwitchBench,
  type BattleAiSwitchBenchMember,
  type BattleAiSwitchDamageFallback,
} from "../src/engine/battleAiSwitchInto.ts";
import { calculateBaseDamage, NEUTRAL_STAT_STAGES } from "../src/engine/damageCalc.ts";
import speciesTypesData from "../src/data/gen/species-types.json" with { type: "json" };

type SpeciesTypesRow = { name: string; types: [string, string] };
const SPECIES_TYPES_BY_NAME = new Map(
  (speciesTypesData.species as SpeciesTypesRow[]).map((row) => [row.name, row.types]),
);
function typesOf(name: string): readonly [string, string] {
  const types = SPECIES_TYPES_BY_NAME.get(name);
  if (!types) throw new Error(`no species-types.json entry for ${name}`);
  return types;
}

// Move ids (src/data/gen/moves.json), DESTIN's bench + Onix's two kill moves.
const MOVE_SAND_ATTACK = 28;
const MOVE_QUICK_ATTACK = 98;
const MOVE_DOUBLE_TEAM = 104;
const MOVE_FAINT_ATTACK = 185;
const MOVE_FURY_CUTTER = 210;
const MOVE_BRICK_BREAK = 280;
const MOVE_ENDEAVOR = 283;
const MOVE_FEATHER_DANCE = 297;
const MOVE_AERIAL_ACE = 332;
const MOVE_FLY = 19;
const MOVE_TORMENT = 259;
const MOVE_TAUNT = 269;

// Species ids (`docs/battle-turn-notes.md` §13: GROVYLE 278 -> PIDGEOTTO 17;
// `docs/onix-readylag-destin-bench-probes.md` Probe 2: MURKROW otId-shared
// bench slot 1, species confirmed 198 at `docs/battle-turn-notes.md` line
// ~2119's turn-15/16 switch-in RAM read).
const SPECIES_GROVYLE = 278;
const SPECIES_MURKROW = 198;
const SPECIES_PIDGEOTTO = 17;

const ONIX_TYPES = typesOf("SPECIES_ONIX");
const GROVYLE_TYPES = typesOf("SPECIES_GROVYLE");
const PIDGEOTTO_TYPES = typesOf("SPECIES_PIDGEOTTO");
const MURKROW_TYPES = typesOf("SPECIES_MURKROW");

// docs/battle-turn-notes.md §5's RAM-read level-50 stat blocks (atk/def/
// spAtk/spDef), reused verbatim from tests/damageCalc.test.ts's own
// ONIX/GROVYLE fixtures (same battle, same dump).
const ONIX_STATS = {
  attack: 51,
  defense: 187,
  spAttack: 36,
  spDefense: 72,
  level: 50,
  types: ONIX_TYPES,
  statStages: { ...NEUTRAL_STAT_STAGES },
};
const GROVYLE_STATS = {
  attack: 103,
  defense: 56,
  spAttack: 91,
  spDefense: 71,
  level: 50,
  types: GROVYLE_TYPES,
  statStages: { ...NEUTRAL_STAT_STAGES },
};
// docs/battle-turn-notes.md §13 note 7: "this session only confirms
// Pidgeotto's stat block (atk 98, def 61, speed 77, spAtk 56, spDef 56,
// hp 156/156, level 50) via dump-battler-snapshot.py".
const PIDGEOTTO_STATS = {
  attack: 98,
  defense: 61,
  spAttack: 56,
  spDefense: 56,
  level: 50,
  types: PIDGEOTTO_TYPES,
  statStages: { ...NEUTRAL_STAT_STAGES },
};

function benchMember(patch: Partial<BattleAiSwitchBenchMember>): BattleAiSwitchBenchMember {
  return Object.freeze({
    species: patch.species ?? 0,
    hp: patch.hp ?? 0,
    types: patch.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    moves: patch.moves ?? Object.freeze([0, 0, 0, 0]),
  });
}
const EMPTY_SLOT = benchMember({});

// DESTIN's real bench, `docs/onix-readylag-destin-bench-probes.md` Probe
// 2's full-bench table (species/slot/moves; slot order GROVYLE=0,
// MURKROW=1, PIDGEOTTO=2, otId 416049562 shared by all three, no 4th-6th
// slot).
function grovyleSlot(hp: number): BattleAiSwitchBenchMember {
  return benchMember({
    species: SPECIES_GROVYLE,
    hp,
    types: GROVYLE_TYPES,
    moves: [MOVE_FURY_CUTTER, MOVE_ENDEAVOR, MOVE_BRICK_BREAK, MOVE_DOUBLE_TEAM],
  });
}
function murkrowSlot(hp: number): BattleAiSwitchBenchMember {
  return benchMember({
    species: SPECIES_MURKROW,
    hp,
    types: MURKROW_TYPES,
    moves: [MOVE_FAINT_ATTACK, MOVE_FLY, MOVE_TORMENT, MOVE_TAUNT],
  });
}
function pidgeottoSlot(hp: number): BattleAiSwitchBenchMember {
  return benchMember({
    species: SPECIES_PIDGEOTTO,
    hp,
    types: PIDGEOTTO_TYPES,
    moves: [MOVE_AERIAL_ACE, MOVE_QUICK_ATTACK, MOVE_FEATHER_DANCE, MOVE_SAND_ATTACK],
  });
}

// ABILITY_NONE-equivalent placeholder (`tests/battleAiSwitchInto.test.ts`'s
// own convention): only Levitate changes this gate's outcome, and Onix's
// real Gen-3 abilities (Rock Head/Sturdy) are not Levitate, so any
// non-Levitate id is behaviorally identical here.
const NOT_LEVITATE = 0;

describe("Destin's two canonical faint replacements (ISSUES #39 rank-2, decision side)", () => {
  it(
    "turn 5: pass 1 alone cannot resolve it -- Onix (ROCK/GROUND) is immune to both "
      + "remaining candidates' shared FLYING type, so GetMostSuitableMonToSwitchInto's "
      + "typing gate scores both MURKROW and PIDGEOTTO at 0 and falls through to pass 2",
    () => {
      const bench: BattleAiSwitchBench = [
        grovyleSlot(0),
        murkrowSlot(142),
        pidgeottoSlot(156),
        EMPTY_SLOT,
        EMPTY_SLOT,
        EMPTY_SLOT,
      ];
      const result = getMostSuitableMonToSwitchInto(bench, 0, ONIX_TYPES);
      expect(result).toEqual({ kind: "damage-fallback-needed" });
    },
  );

  it(
    "turn 5: GROVYLE faints -> pass 2 (AI_CalcDmg(Grovyle, Onix) with gCurrentMove=ROCK_SLIDE) "
      + "selects PIDGEOTTO (slot 2) over MURKROW (slot 1), matching the real send-out",
    () => {
      // AI_CalcDmg(attacker=Grovyle[still gBattleMons[1], not yet cleared],
      // defender=Onix) with gCurrentMove still Onix's own killing
      // ROCK_SLIDE (power 75, TYPE_ROCK) -- battle_script_commands.c:1306-
      // 1319, no crit (Onix's own turn-5 ROCK_SLIDE crit roll missed,
      // docs/battle-turn-notes.md §13's turn-5 ledger, "crit roll (1 step,
      // no crit)"), no stat-stage changes in play (only move used to alter
      // a stage anywhere in this dossier is Grovyle's own DOUBLE_TEAM,
      // which is self-evasion, outside the atk/def/spAtk/spDef this
      // formula reads).
      const baseDamage = calculateBaseDamage({
        attacker: GROVYLE_STATS,
        defender: ONIX_STATS,
        movePower: 75,
        moveType: "TYPE_ROCK",
        isCriticalHit: false,
      });
      expect(baseDamage).toBe(20);

      const damageFallback: BattleAiSwitchDamageFallback = {
        baseDamage,
        activeTypes: GROVYLE_TYPES,
        opposingTypes: ONIX_TYPES,
        opposingAbility: NOT_LEVITATE,
        opposingStatus2: 0,
      };
      const bench: BattleAiSwitchBench = [
        grovyleSlot(0),
        murkrowSlot(142),
        pidgeottoSlot(156),
        EMPTY_SLOT,
        EMPTY_SLOT,
        EMPTY_SLOT,
      ];
      const result = getMostSuitableMonToSwitchInto(bench, 0, ONIX_TYPES, damageFallback);
      expect(result).toEqual({ kind: "resolved", partyIndex: 2 });
    },
  );

  it(
    "turn 5 winner is robust to baseDamage's exact magnitude: the real driver is pass 2's "
      + "source quirk scoring PIDGEOTTO's non-damaging SAND_ATTACK (GROUND, 2x vs Onix's ROCK) "
      + "above every DARK/FLYING move either candidate has",
    () => {
      for (const baseDamage of [1, 5, 100]) {
        const damageFallback: BattleAiSwitchDamageFallback = {
          baseDamage,
          activeTypes: GROVYLE_TYPES,
          opposingTypes: ONIX_TYPES,
          opposingAbility: NOT_LEVITATE,
          opposingStatus2: 0,
        };
        const bench: BattleAiSwitchBench = [
          grovyleSlot(0),
          murkrowSlot(142),
          pidgeottoSlot(156),
          EMPTY_SLOT,
          EMPTY_SLOT,
          EMPTY_SLOT,
        ];
        const result = getMostSuitableMonToSwitchInto(bench, 0, ONIX_TYPES, damageFallback);
        expect(result).toEqual({ kind: "resolved", partyIndex: 2 });
      }
    },
  );

  it(
    "turn 13: PIDGEOTTO faints to Onix's DRAGON_BREATH -> MURKROW (slot 1) is the sole "
      + "remaining candidate (GROVYLE already dead, PIDGEOTTO the outgoing active) and is "
      + "selected, matching the real send-out",
    () => {
      // AI_CalcDmg(attacker=Pidgeotto[still gBattleMons[1]], defender=Onix)
      // with gCurrentMove=Onix's own killing DRAGON_BREATH (power 60,
      // TYPE_DRAGON) -- docs/battle-turn-notes.md §47-50's turn-13 rungs
      // (DRAGON_BREATH re-targeted at Pidgeotto, HP drain to 0 at tick
      // 15887, Murkrow switch-in). No crit, no active stat-stage changes
      // (same audit as turn 5: no move either side used anywhere in this
      // dossier touches atk/def/spAtk/spDef).
      const baseDamage = calculateBaseDamage({
        attacker: PIDGEOTTO_STATS,
        defender: ONIX_STATS,
        movePower: 60,
        moveType: "TYPE_DRAGON",
        isCriticalHit: false,
      });
      expect(baseDamage).toBe(22);

      const damageFallback: BattleAiSwitchDamageFallback = {
        baseDamage,
        activeTypes: PIDGEOTTO_TYPES,
        opposingTypes: ONIX_TYPES,
        opposingAbility: NOT_LEVITATE,
        opposingStatus2: 0,
      };
      const bench: BattleAiSwitchBench = [
        grovyleSlot(0),
        murkrowSlot(142),
        pidgeottoSlot(0),
        EMPTY_SLOT,
        EMPTY_SLOT,
        EMPTY_SLOT,
      ];
      const result = getMostSuitableMonToSwitchInto(bench, 2, ONIX_TYPES, damageFallback);
      expect(result).toEqual({ kind: "resolved", partyIndex: 1 });
    },
  );

  it(
    "turn 13 winner needs no damage fallback at all to be forced -- MURKROW is the only "
      + "non-fainted, non-active bench slot left, so pass 1's own typing gate returning "
      + "damage-fallback-needed still leaves pass 2 with a single trivial candidate",
    () => {
      const bench: BattleAiSwitchBench = [
        grovyleSlot(0),
        murkrowSlot(142),
        pidgeottoSlot(0),
        EMPTY_SLOT,
        EMPTY_SLOT,
        EMPTY_SLOT,
      ];
      const pass1Only = getMostSuitableMonToSwitchInto(bench, 2, ONIX_TYPES);
      expect(pass1Only).toEqual({ kind: "damage-fallback-needed" });

      for (const baseDamage of [1, 22, 100]) {
        const result = getMostSuitableMonToSwitchInto(bench, 2, ONIX_TYPES, {
          baseDamage,
          activeTypes: PIDGEOTTO_TYPES,
          opposingTypes: ONIX_TYPES,
          opposingAbility: NOT_LEVITATE,
          opposingStatus2: 0,
        });
        expect(result).toEqual({ kind: "resolved", partyIndex: 1 });
      }
    },
  );

  it("getMostSuitableMonToSwitchInto's own signature takes no RNG state -- zero draws by construction", () => {
    expect(getMostSuitableMonToSwitchInto.length).toBe(4);
  });
});
