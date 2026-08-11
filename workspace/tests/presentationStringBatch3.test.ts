import { describe, it, expect } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
  type FactoryFullTurnBattlerConfig,
  type FactoryFullTurnDecisionRules,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { createBattleCommandPresentation } from "../src/engine/battleCommandPresentation.ts";
import { createBattleResolutionPresentation } from "../src/engine/battleResolutionPresentation.ts";
import {
  createBattleState,
  type BattleCommandRequest,
  type BattleCommandDecision,
  type BattleDecisionTransitionResult,
  type BattleKernelSemanticEvent,
} from "../src/engine/battleDecisionBoundary.ts";

/**
 * ISSUES #70 batch 3: the final 12 of the original 31 unranked ids
 * (docs/issue70-stringid-reachability.md), grouped in 4 sub-families per
 * ISSUES.md's own brief. Mirrors batch 1/2's shape: a staged full-turn
 * repro through the production kernel for every id with a real
 * non-zero-incidence trigger; the direct resolver-branch idiom (synthetic
 * event straight into createBattleResolutionPresentation) only for the one
 * genuinely zero-incidence id the reachability doc itself flags (row 40,
 * PKMNTRANSFORMEDINTO -- "no legal L50 rental carries Transform").
 *
 * Red-verified once pre-fix via `git stash` on the touched engine files
 * (battleResolutionPresentation.ts's messageLines branches,
 * factoryBattleScriptFullTurnDecision.ts's prepareMessage substitutions +
 * effectBattler event field + stockpileCounter staging field,
 * battleScriptEvents.ts's effectBattler payload field,
 * battleEndTurnOrchestration.ts's STAT_UP_BERRIES scriptingBattler wiring):
 * every `it` below threw battleStringResolver's exact completeness-guard
 * error before this change.
 */

const MOVE_TACKLE = 33;
const MOVE_SPLASH = 150;
const MOVE_TOXIC = 92;
const MOVE_WILL_O_WISP = 261;
const MOVE_THUNDER_WAVE = 86;
const MOVE_SPORE = 147;
const MOVE_STOCKPILE = 254;
const MOVE_SWALLOW = 256;
const MOVE_UPROAR = 253;

const ABILITY_NONE = 0;
const ABILITY_LIMBER = 7;
const ABILITY_INSOMNIA = 15;
const ABILITY_IMMUNITY = 17;
const ABILITY_SYNCHRONIZE = 28;
const ABILITY_WATER_VEIL = 41;

const ITEM_SALAC_BERRY = 170;

/** include/constants/battle.h -- STATUS2_UPROAR_TURN(n) occupies bits 4-6; any nonzero value in the mask means "still has uproar turns left." */
const STATUS2_UPROAR = 0x70;

const PLAYER_BASE: FactoryFullTurnBattlerConfig = Object.freeze({
  species: 12, // BUTTERFREE
  moveId: MOVE_TACKLE,
  moves: [MOVE_TACKLE, MOVE_TACKLE, MOVE_TACKLE, MOVE_TACKLE] as const,
  pp: [35, 35, 35, 35] as const,
  ability: ABILITY_NONE,
  item: 0,
  friendship: 0,
  attack: 60,
  defense: 60,
  spAttack: 80,
  spDefense: 80,
  speed: 120,
  hp: 200,
  maxHp: 200,
  types: ["TYPE_BUG", "TYPE_FLYING"] as const,
});

const TRAINER_BASE: FactoryFullTurnBattlerConfig = Object.freeze({
  species: 198, // MURKROW
  moveId: MOVE_TACKLE,
  moves: [MOVE_TACKLE, MOVE_TACKLE, MOVE_TACKLE, MOVE_TACKLE] as const,
  pp: [35, 35, 35, 35] as const,
  ability: ABILITY_NONE,
  item: 0,
  friendship: 0,
  attack: 60,
  defense: 60,
  spAttack: 60,
  spDefense: 60,
  speed: 60,
  hp: 200,
  maxHp: 200,
  types: ["TYPE_DARK", "TYPE_FLYING"] as const,
});

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
    opponentTrainer: null,
  });

  const messageIds = transition.events
    .filter((event) => event.payload.kind === "message")
    .map((event) => (event.payload as { messageId: string }).messageId);
  const lines = resolution.segments
    .flatMap((segment) => segment.commands)
    .filter((cmd): cmd is Extract<typeof cmd, { type: "message" }> => cmd.type === "message")
    .map((cmd) => cmd.lines);

  return { messageIds, lines, field: command.field };
}

/** Same brute-force-across-seeds idiom as batch-1/2, for accuracy-gated triggers. */
function runFullTurnUntil(
  buildConfig: (seed: number) => FactoryFullTurnConfig,
  playerDecision: BattleCommandDecision,
  trainerDecision: BattleCommandDecision,
  targetMessageId: string,
  maxSeed = 150,
) {
  for (let seed = 1; seed <= maxSeed; seed += 1) {
    const result = runFullTurn(buildConfig(seed), playerDecision, trainerDecision);
    if (result.messageIds.includes(targetMessageId)) return result;
  }
  throw new Error(`no seed in 1..${maxSeed} produced ${targetMessageId}`);
}

const AT = (battler: 0 | 1): BattleCommandDecision =>
  Object.freeze({ kind: "use-move", moveSlot: 0, targetBattler: battler });
const SELF = (battler: 0 | 1): BattleCommandDecision =>
  Object.freeze({ kind: "use-move", moveSlot: 0, targetBattler: battler });

const PROVENANCE = Object.freeze({
  programCounter: 1,
  opcodeId: 1,
  opcodeName: "test",
  dispatcher: "test",
  sourceLabel: "BattleScript_Test",
  sourceStatementLine: 1,
  instructionExecution: 1,
});

function event(
  sequence: number,
  payload: BattleKernelSemanticEvent["payload"],
): BattleKernelSemanticEvent {
  return Object.freeze({
    sequence,
    payload: Object.freeze(payload),
    provenance: Object.freeze(PROVENANCE),
  });
}

/** The "direct resolver-branch" idiom for row 40's genuine zero-incidence id. */
function directResolution(events: readonly BattleKernelSemanticEvent[]) {
  const config: FactoryFullTurnConfig = Object.freeze({
    requestId: 1,
    rngSeed: 1,
    player: PLAYER_BASE,
    trainer: TRAINER_BASE,
  });
  const initial = createFactoryFullTurnBattleState(config);
  if (initial.boundary.kind !== "decision-required" || initial.boundary.request.kind !== "command") {
    throw new Error("fixture has no source command");
  }
  const nextRequest = initial.boundary.request;
  const state = createBattleState({ rules: initial.rules, rngSeed: 9, request: nextRequest });
  const transition = Object.freeze({
    kind: "decision-required" as const,
    state,
    events: Object.freeze(events),
    nextRequest,
  }) as BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>;
  const command = createBattleCommandPresentation(nextRequest, initial.rules.rulesContext, 0);
  const resolution = createBattleResolutionPresentation({
    sourceRequest: nextRequest,
    sourceDecision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
    beforeRules: initial.rules,
    transition,
    fieldBoundary: command.field,
    confirmHandoff: { fightDisplayCursor: 0, idleBounceElapsed: 0 },
    opponentTrainer: null,
  });
  const lines = resolution.segments
    .flatMap((segment) => segment.commands)
    .filter((cmd): cmd is Extract<typeof cmd, { type: "message" }> => cmd.type === "message")
    .map((cmd) => cmd.lines);
  return { lines, field: command.field };
}

describe("presentation-string batch 3 (ISSUES #70 final 12 ids)", () => {
  it("row 6: STRINGID_PKMNPREVENTSPOISONINGWITH -- Toxic vs an Immunity holder", () => {
    const { messageIds, lines, field } = runFullTurnUntil(
      (seed) => Object.freeze({
        requestId: 1,
        rngSeed: seed,
        player: Object.freeze({ ...PLAYER_BASE, moveId: MOVE_TOXIC, moves: [MOVE_TOXIC, MOVE_TOXIC, MOVE_TOXIC, MOVE_TOXIC] as const }),
        trainer: Object.freeze({ ...TRAINER_BASE, moveId: MOVE_SPLASH, moves: [MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH] as const, ability: ABILITY_IMMUNITY }),
      }),
      AT(1),
      SELF(1),
      "STRINGID_PKMNPREVENTSPOISONINGWITH",
    );
    expect(messageIds).toContain("STRINGID_PKMNPREVENTSPOISONINGWITH");
    expect(lines).toContainEqual([
      `Foe ${field.opponent.name}’s IMMUNITY`,
      "prevents poisoning!",
    ]);
  });

  it("row 9: STRINGID_PKMNSXPREVENTSBURNS -- Will-O-Wisp vs a Water Veil holder", () => {
    const { messageIds, lines, field } = runFullTurnUntil(
      (seed) => Object.freeze({
        requestId: 1,
        rngSeed: seed,
        player: Object.freeze({ ...PLAYER_BASE, moveId: MOVE_WILL_O_WISP, moves: [MOVE_WILL_O_WISP, MOVE_WILL_O_WISP, MOVE_WILL_O_WISP, MOVE_WILL_O_WISP] as const }),
        trainer: Object.freeze({ ...TRAINER_BASE, moveId: MOVE_SPLASH, moves: [MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH] as const, ability: ABILITY_WATER_VEIL }),
      }),
      AT(1),
      SELF(1),
      "STRINGID_PKMNSXPREVENTSBURNS",
    );
    expect(messageIds).toContain("STRINGID_PKMNSXPREVENTSBURNS");
    expect(lines).toContainEqual([
      `Foe ${field.opponent.name}’s WATER VEIL`,
      "prevents burns!",
    ]);
  });

  it("row 10: STRINGID_PKMNPREVENTSPARALYSISWITH -- Thunder Wave vs a Limber holder", () => {
    const { messageIds, lines, field } = runFullTurnUntil(
      (seed) => Object.freeze({
        requestId: 1,
        rngSeed: seed,
        player: Object.freeze({ ...PLAYER_BASE, moveId: MOVE_THUNDER_WAVE, moves: [MOVE_THUNDER_WAVE, MOVE_THUNDER_WAVE, MOVE_THUNDER_WAVE, MOVE_THUNDER_WAVE] as const }),
        trainer: Object.freeze({ ...TRAINER_BASE, moveId: MOVE_SPLASH, moves: [MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH] as const, ability: ABILITY_LIMBER }),
      }),
      AT(1),
      SELF(1),
      "STRINGID_PKMNPREVENTSPARALYSISWITH",
    );
    expect(messageIds).toContain("STRINGID_PKMNPREVENTSPARALYSISWITH");
    expect(lines).toContainEqual([
      `Foe ${field.opponent.name}’s LIMBER`,
      "prevents paralysis!",
    ]);
  });

  it("row 7: STRINGID_PKMNSXPREVENTSYSZ -- Synchronize mirrors Toxic back onto an Immunity-holding attacker", () => {
    const { messageIds, lines, field } = runFullTurnUntil(
      (seed) => Object.freeze({
        requestId: 1,
        rngSeed: seed,
        player: Object.freeze({ ...PLAYER_BASE, moveId: MOVE_TOXIC, moves: [MOVE_TOXIC, MOVE_TOXIC, MOVE_TOXIC, MOVE_TOXIC] as const, ability: ABILITY_IMMUNITY }),
        trainer: Object.freeze({ ...TRAINER_BASE, moveId: MOVE_SPLASH, moves: [MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH] as const, ability: ABILITY_SYNCHRONIZE }),
      }),
      AT(1),
      SELF(1),
      "STRINGID_PKMNSXPREVENTSYSZ",
    );
    expect(messageIds).toContain("STRINGID_PKMNSXPREVENTSYSZ");
    expect(lines).toContainEqual([
      `${field.player.name}’s IMMUNITY`,
      `prevents Foe ${field.opponent.name}’s`,
      "SYNCHRONIZE from working!",
    ]);
  });

  it("row 8: STRINGID_PKMNSXHADNOEFFECTONY -- Synchronize mirrors Toxic back onto a Poison-type attacker", () => {
    const { messageIds, lines, field } = runFullTurnUntil(
      (seed) => Object.freeze({
        requestId: 1,
        rngSeed: seed,
        player: Object.freeze({ ...PLAYER_BASE, moveId: MOVE_TOXIC, moves: [MOVE_TOXIC, MOVE_TOXIC, MOVE_TOXIC, MOVE_TOXIC] as const, types: ["TYPE_POISON", "TYPE_POISON"] as const }),
        trainer: Object.freeze({ ...TRAINER_BASE, moveId: MOVE_SPLASH, moves: [MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH] as const, ability: ABILITY_SYNCHRONIZE }),
      }),
      AT(1),
      SELF(1),
      "STRINGID_PKMNSXHADNOEFFECTONY",
    );
    expect(messageIds).toContain("STRINGID_PKMNSXHADNOEFFECTONY");
    expect(lines).toContainEqual([
      `Foe ${field.opponent.name}’s SYNCHRONIZE`,
      `had no effect on ${field.player.name}!`,
    ]);
  });

  it("row 12: STRINGID_PKMNCANTSLEEPINUPROAR2 -- Spore vs a target already mid-Uproar", () => {
    const { messageIds, lines, field } = runFullTurn(
      Object.freeze({
        requestId: 1,
        rngSeed: 1,
        player: Object.freeze({ ...PLAYER_BASE, moveId: MOVE_SPORE, moves: [MOVE_SPORE, MOVE_SPORE, MOVE_SPORE, MOVE_SPORE] as const }),
        trainer: Object.freeze({ ...TRAINER_BASE, moveId: MOVE_SPLASH, moves: [MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH] as const, status2: STATUS2_UPROAR, lockedMove: MOVE_UPROAR }),
      }),
      AT(1),
      SELF(1),
    );
    expect(messageIds).toContain("STRINGID_PKMNCANTSLEEPINUPROAR2");
    expect(lines).toContainEqual([
      `But Foe ${field.opponent.name} can’t`,
      "sleep in an UPROAR!",
    ]);
  });

  it("row 13: STRINGID_UPROARKEPTPKMNAWAKE -- Spore vs a target whose OPPONENT (not itself) is mid-Uproar", () => {
    const { messageIds, lines, field } = runFullTurn(
      Object.freeze({
        requestId: 1,
        rngSeed: 1,
        player: Object.freeze({ ...PLAYER_BASE, moveId: MOVE_SPORE, moves: [MOVE_SPORE, MOVE_SPORE, MOVE_SPORE, MOVE_SPORE] as const, status2: STATUS2_UPROAR, lockedMove: MOVE_UPROAR }),
        trainer: Object.freeze({ ...TRAINER_BASE, moveId: MOVE_SPLASH, moves: [MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH] as const }),
      }),
      AT(1),
      SELF(1),
    );
    expect(messageIds).toContain("STRINGID_UPROARKEPTPKMNAWAKE");
    expect(lines).toContainEqual([
      "But the UPROAR kept",
      `Foe ${field.opponent.name} awake!`,
    ]);
  });

  it("row 14: STRINGID_PKMNSTAYEDAWAKEUSING -- Spore vs an Insomnia holder, no Uproar in play", () => {
    const { messageIds, lines, field } = runFullTurn(
      Object.freeze({
        requestId: 1,
        rngSeed: 1,
        player: Object.freeze({ ...PLAYER_BASE, moveId: MOVE_SPORE, moves: [MOVE_SPORE, MOVE_SPORE, MOVE_SPORE, MOVE_SPORE] as const }),
        trainer: Object.freeze({ ...TRAINER_BASE, moveId: MOVE_SPLASH, moves: [MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH] as const, ability: ABILITY_INSOMNIA }),
      }),
      AT(1),
      SELF(1),
    );
    expect(messageIds).toContain("STRINGID_PKMNSTAYEDAWAKEUSING");
    expect(lines).toContainEqual([
      `Foe ${field.opponent.name} stayed awake`,
      "using its INSOMNIA!",
    ]);
  });

  it("row 11: STRINGID_USINGITEMSTATOFPKMNROSE -- a Salac Berry holder ends its turn below 1/4 HP", () => {
    const { messageIds, lines, field } = runFullTurn(
      Object.freeze({
        requestId: 1,
        rngSeed: 1,
        player: Object.freeze({ ...PLAYER_BASE, moveId: MOVE_SPLASH, moves: [MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH] as const, item: ITEM_SALAC_BERRY, hp: 40, maxHp: 200 }),
        trainer: Object.freeze({ ...TRAINER_BASE, moveId: MOVE_SPLASH, moves: [MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH] as const }),
      }),
      SELF(0),
      SELF(1),
    );
    expect(messageIds).toContain("STRINGID_USINGITEMSTATOFPKMNROSE");
    expect(lines).toContainEqual([
      "Using SALAC BERRY, the SPEED",
      `of ${field.player.name} rose!`,
    ]);
  });

  it("row 21: STRINGID_PKMNSTOCKPILED -- a real Stockpile use", () => {
    const { messageIds, lines, field } = runFullTurn(
      Object.freeze({
        requestId: 1,
        rngSeed: 1,
        player: Object.freeze({ ...PLAYER_BASE, moveId: MOVE_STOCKPILE, moves: [MOVE_STOCKPILE, MOVE_STOCKPILE, MOVE_STOCKPILE, MOVE_STOCKPILE] as const }),
        trainer: Object.freeze({ ...TRAINER_BASE, moveId: MOVE_SPLASH, moves: [MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH] as const }),
      }),
      SELF(0),
      SELF(1),
    );
    expect(messageIds).toContain("STRINGID_PKMNSTOCKPILED");
    expect(lines).toContainEqual([`${field.player.name} STOCKPILED`, "1!"]);
  });

  it("row 22: STRINGID_PKMNHPFULL -- Swallow with a banked Stockpile at full HP (self-targeting)", () => {
    const { messageIds, lines, field } = runFullTurn(
      Object.freeze({
        requestId: 1,
        rngSeed: 1,
        player: Object.freeze({ ...PLAYER_BASE, moveId: MOVE_SWALLOW, moves: [MOVE_SWALLOW, MOVE_SWALLOW, MOVE_SWALLOW, MOVE_SWALLOW] as const, stockpileCounter: 1 }),
        trainer: Object.freeze({ ...TRAINER_BASE, moveId: MOVE_SPLASH, moves: [MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH] as const }),
      }),
      SELF(0),
      SELF(1),
    );
    expect(messageIds).toContain("STRINGID_PKMNHPFULL");
    expect(lines).toContainEqual([`${field.player.name}’s`, "HP is full!"]);
  });

  it("row 40: STRINGID_PKMNTRANSFORMEDINTO -- direct resolver branch (zero-incidence: no legal L50 rental carries Transform), B_ATK_NAME_WITH_PREFIX/B_BUFF1", () => {
    const { lines, field } = directResolution([
      event(0, {
        kind: "message",
        messageId: "STRINGID_PKMNTRANSFORMEDINTO",
        substitutions: ["MURKROW"],
        actionSnapshot: { attacker: 0, currentMove: 144, currentMovePosition: 0 },
      }),
    ]);
    expect(lines).toContainEqual([`${field.player.name} transformed`, "into MURKROW!"]);
  });
});
