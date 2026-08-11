import { describe, it, expect } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { createBattleCommandPresentation } from "../src/engine/battleCommandPresentation.ts";
import { createBattleResolutionPresentation } from "../src/engine/battleResolutionPresentation.ts";
import type { BattleCommandDecision, BattleCommandRequest } from "../src/engine/battleDecisionBoundary.ts";

/**
 * ISSUES #72 batch 7: the small-plumbing + known-staging cluster of the
 * remaining REACHABLE-15 list (PROGRESS 904's own classification) --
 * Color Change's battleTextBuff1Type wiring, Spite/Leppa Berry's
 * battleTextBuff1Move+battleTextBuff2ByteNumber pair, Thief/Covet's
 * heldItems[attacker] read, and Trace's new monNickBattler
 * nickname-resolution wiring. Each `it` red-verifies via
 * `git stash -- src/engine/battleResolutionPresentation.ts
 * src/engine/factoryBattleScriptFullTurnDecision.ts
 * src/engine/battleEndTurnOrchestration.ts src/engine/battleScriptEvents.ts`
 * (throws the exact completeness-guard error, or a TS error for the new
 * monNickBattler field, pre-fix). Sand Stream (STRINGID_PKMNSXWHIPPEDUPSANDSTORM)
 * was investigated but not landed -- see ISSUES #72's own note on the
 * `Cmd_end3`/`call-current` ability-script resumption gap it hits.
 */

const SPLASH = 150;
const THUNDERSHOCK = 84;
const SPITE = 180;
const THIEF = 168;

const SPECIES_WOBBUFFET = 202; // pure Psychic -- arbitrary neutral filler.
const SPECIES_MURKROW = 198; // Dark/Flying, arbitrary neutral filler.
const SPECIES_PORYGON = 137; // real ABILITY_TRACE slot-0 carrier (species-stats.json).

const ABILITY_COLOR_CHANGE = 16;
const ABILITY_RAIN_DISH = 44;

const ITEM_LEPPA_BERRY = 138;
const ITEM_ORAN_BERRY = 139;

const AT = (battler: 0 | 1): BattleCommandDecision =>
  Object.freeze({ kind: "use-move", moveSlot: 0, targetBattler: battler });

function runFullTurn(
  config: FactoryFullTurnConfig,
  playerDecision: BattleCommandDecision,
  trainerDecision: BattleCommandDecision,
) {
  const initial = createFactoryFullTurnBattleState(config);
  if (initial.boundary.kind !== "decision-required") {
    throw new Error("expected the player's command boundary");
  }
  const afterPlayer = submitFactoryFullTurnDecision(initial, {
    requestId: 1,
    side: "player",
    decision: playerDecision,
  });
  if (afterPlayer.kind !== "decision-required") {
    throw new Error("expected the trainer's command boundary");
  }
  const transition = submitFactoryFullTurnDecision(afterPlayer.state, {
    requestId: 2,
    side: "trainer",
    decision: trainerDecision,
  });

  const command = createBattleCommandPresentation(
    initial.boundary.request as BattleCommandRequest,
    initial.rules.rulesContext,
    0,
  );
  const resolution = createBattleResolutionPresentation({
    sourceRequest: initial.boundary.request as BattleCommandRequest,
    sourceDecision: playerDecision,
    beforeRules: initial.rules,
    transition,
    fieldBoundary: command.field,
    confirmHandoff: {
      fightDisplayCursor: command.fightDisplayCursor,
      idleBounceElapsed: command.idleBounceElapsed,
    },
    opponentTrainer: Object.freeze({ className: "COOLTRAINER", name: "REY", speechLose: ["", ""] as const }),
  });

  const messageIds = transition.events
    .filter((event) => event.payload.kind === "message")
    .map((event) => (event.payload as { messageId: string }).messageId);
  const lines = resolution.segments
    .flatMap((segment) => segment.commands)
    .filter((cmd): cmd is Extract<typeof cmd, { type: "message" }> => cmd.type === "message")
    .map((cmd) => cmd.lines);

  return { messageIds, lines, field: command.field, transition };
}

describe("presentation-string ISSUES #72 batch 7 -- Color Change", () => {
  it("STRINGID_PKMNCHANGEDTYPEWITH resolves the Color Change holder's own name/ability and the move's type (real damaging hit)", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: {
        species: SPECIES_WOBBUFFET, moveId: SPLASH, ability: ABILITY_COLOR_CHANGE,
        attack: 60, defense: 60, spAttack: 60, spDefense: 90, speed: 60, hp: 200, maxHp: 200,
      },
      trainer: {
        species: SPECIES_MURKROW, moveId: THUNDERSHOCK,
        attack: 60, defense: 60, spAttack: 85, spDefense: 60, speed: 91, hp: 190, maxHp: 190,
      },
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(0), AT(0));
    expect(messageIds).toContain("STRINGID_PKMNCHANGEDTYPEWITH");
    expect(lines).toContainEqual([`${field.player.name}’s COLOR CHANGE`, "made it the ELECTR type!"]);
  });
});

describe("presentation-string ISSUES #72 batch 7 -- Spite", () => {
  it("STRINGID_PKMNREDUCEDPP resolves the target's own reduced move and amount (real staged lastMove)", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: {
        species: SPECIES_WOBBUFFET, moveId: SPITE,
        attack: 60, defense: 60, spAttack: 60, spDefense: 90, speed: 60, hp: 200, maxHp: 200,
      },
      trainer: {
        species: SPECIES_MURKROW, moveId: SPLASH, lastMove: SPLASH,
        moves: [SPLASH, 0, 0, 0] as [number, number, number, number],
        pp: [40, 0, 0, 0] as [number, number, number, number],
        attack: 60, defense: 60, spAttack: 85, spDefense: 60, speed: 91, hp: 190, maxHp: 190,
      },
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(1), AT(1));
    expect(messageIds).toContain("STRINGID_PKMNREDUCEDPP");
    const spiteLine = lines.find((line) => line[1]?.startsWith("SPLASH by "));
    expect(spiteLine).toBeDefined();
    expect(spiteLine![0]).toBe(`Reduced Foe ${field.opponent.name}’s`);
    expect(spiteLine![1]).toMatch(/^SPLASH by [2-5]!$/);
  });
});

describe("presentation-string ISSUES #72 batch 7 -- Leppa Berry end-turn tick", () => {
  it("STRINGID_PKMNSITEMRESTOREDPP resolves the berry holder's own name/item and the restored move (real zero-PP slot)", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: {
        species: SPECIES_WOBBUFFET, moveId: SPLASH,
        moves: [SPLASH, THUNDERSHOCK, 0, 0] as [number, number, number, number],
        pp: [40, 0, 0, 0] as [number, number, number, number],
        item: ITEM_LEPPA_BERRY,
        attack: 60, defense: 60, spAttack: 60, spDefense: 90, speed: 60, hp: 200, maxHp: 200,
      },
      trainer: {
        species: SPECIES_MURKROW, moveId: SPLASH,
        attack: 60, defense: 60, spAttack: 85, spDefense: 60, speed: 91, hp: 190, maxHp: 190,
      },
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(0), AT(1));
    expect(messageIds).toContain("STRINGID_PKMNSITEMRESTOREDPP");
    expect(lines).toContainEqual([`${field.player.name}’s LEPPA BERRY`, "restored THUNDERSHOCK’s PP!"]);
  });
});

describe("presentation-string ISSUES #72 batch 7 -- Thief/Covet", () => {
  it("STRINGID_PKMNSTOLEITEM resolves the attacker/defender and the stolen item (real successful steal)", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: {
        species: SPECIES_WOBBUFFET, moveId: THIEF,
        attack: 60, defense: 60, spAttack: 60, spDefense: 90, speed: 60, hp: 200, maxHp: 200,
      },
      trainer: {
        species: SPECIES_MURKROW, moveId: SPLASH, item: ITEM_ORAN_BERRY,
        attack: 60, defense: 60, spAttack: 85, spDefense: 60, speed: 91, hp: 190, maxHp: 190,
      },
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(1), AT(1));
    expect(messageIds).toContain("STRINGID_PKMNSTOLEITEM");
    expect(lines).toContainEqual([`${field.player.name} stole`, `Foe ${field.opponent.name}’s ORAN BERRY!`]);
  });
});

describe("presentation-string ISSUES #72 batch 7 -- Trace switch-in entry hook", () => {
  function switchInConfig(
    playerAbility: number,
    benchSpecies: number,
  ): FactoryFullTurnConfig {
    return Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: {
        species: SPECIES_WOBBUFFET, moveId: SPLASH, ability: playerAbility,
        attack: 100, defense: 100, spAttack: 100, spDefense: 100, speed: 200, hp: 300,
      },
      trainer: {
        species: SPECIES_WOBBUFFET, moveId: SPLASH,
        attack: 100, defense: 100, spAttack: 100, spDefense: 100, speed: 1, hp: 300,
      },
      trainerBenchHp: [200, 0] as [number, number],
      trainerBenchOverride: [{
        species: benchSpecies, abilityNum: 0, moves: [35, 0, 0, 0],
        maxHP: 200, attack: 80, defense: 200, speed: 50,
        spAttack: 40, spDefense: 100,
      }, undefined] as FactoryFullTurnConfig["trainerBenchOverride"],
    });
  }

  it("STRINGID_PKMNTRACED resolves the tracer's own name, the traced-from mon's nickname-with-prefix, and the copied ability (real Porygon Trace switch-in)", () => {
    const config = switchInConfig(ABILITY_RAIN_DISH, SPECIES_PORYGON);
    const { messageIds, lines, field } = runFullTurn(config, AT(0), { kind: "switch", partyIndex: 1 });
    expect(messageIds).toContain("STRINGID_PKMNTRACED");
    expect(lines).toContainEqual([
      `Foe ${field.opponent.name} TRACED`,
      `${field.player.name}’s RAIN DISH!`,
    ]);
  });

});
