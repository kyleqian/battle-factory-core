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
 * ISSUES #70 batch 2: the remaining unranked rows of docs/issue70-stringid-
 * reachability.md's per-id classification table (below batch-1's ranked
 * top-8, tests/presentationStringBatch1.test.ts). Mirrors batch-1's shape:
 * stageable ids get a full-turn repro through the production kernel; the
 * zero-incidence ids (no rental carrier / doubles-only / level-tie, per the
 * doc's own sum-check) get a direct resolver-branch unit test instead,
 * since no staged battle can reach them.
 *
 * Red-verified once pre-fix via `git stash` on the two touched engine files
 * (battleResolutionPresentation.ts's messageLines branches,
 * factoryBattleScriptFullTurnDecision.ts's prepareMessage substitutions +
 * flashFireBoosted staging field): every `it` below threw
 * battleStringResolver's exact completeness-guard error (or, for the
 * flashFireBoosted-dependent case, a TypeScript config-shape error) before
 * this change.
 */

const MOVE_TACKLE = 33;
const MOVE_SPLASH = 150;
const MOVE_BIND = 20;
const MOVE_WRAP = 35;
const MOVE_FIRE_SPIN = 83;
const MOVE_CLAMP = 128;
const MOVE_SAND_TOMB = 328;
const MOVE_LEECH_SEED = 73;
const MOVE_TRICK = 271;
const MOVE_EMBER = 52;
const MOVE_REFLECT = 115;
const MOVE_DOOM_DESIRE = 353;

const ABILITY_NONE = 0;
const ABILITY_FLASH_FIRE = 18;

const ITEM_ORAN_BERRY = 139;
const ITEM_KINGS_ROCK = 187;

const STATUS1_FREEZE = 1 << 5;

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

/** Same brute-force-across-seeds idiom as batch-1, for accuracy-gated triggers. */
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

const SELF = (battler: 0 | 1): BattleCommandDecision =>
  Object.freeze({ kind: "use-move", moveSlot: 0, targetBattler: battler });
const AT = (battler: 0 | 1): BattleCommandDecision =>
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

/**
 * The "direct resolver-branch" idiom for the 8 zero-incidence ids: no real
 * battle can stage them (no rental carrier / doubles-only / level-tie), so
 * this builds a synthetic event sequence and feeds it straight through
 * `createBattleResolutionPresentation`, exactly like
 * `tests/battleResolutionPresentation.test.ts`'s own `inputFor` idiom.
 */
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

describe("presentation-string batch 2 (ISSUES #70 remaining rows)", () => {
  // Rows 16-20 (the gWrappedStringIds family) use the direct-resolver idiom
  // rather than a staged full-turn repro: this session discovered that
  // *every* real Bind/Wrap/Fire Spin/Clamp/Sand Tomb use also triggers the
  // SAME turn's end-of-turn wrap-damage tick (battleEndTurnOrchestration.ts's
  // WRAP_TURN_DMG_LABEL, real Gen3 behavior -- the trap deals its first
  // recurring-damage tick on the turn it's set, not just the initiating
  // hit), which prints STRINGID_PKMNHURTBY (battle_message.c:148,
  // `{B_ATK_NAME_WITH_PREFIX} is hurt\nby {B_BUFF1}!`) -- a *separate*,
  // previously-undiscovered resolver gap (not one of #70's 47 ids; it's
  // parsed from the real committed battle-script program, not a TS string
  // literal, so #68's own sweep never found it) that crashes first and masks
  // these rows' own message. Flagged in ISSUES #70 as a new, higher-severity
  // finding rather than fixed here (out of this step's scope). See the doc's
  // rows 16-20 (`battleScriptHitChainOpcode.ts:3692-3727`, TRAPPING_MOVES).
  it("row 16: STRINGID_PKMNSQUEEZEDBYBIND -- direct resolver branch (real Bind repro is blocked by the STRINGID_PKMNHURTBY gap above), B_ATK_NAME_WITH_PREFIX/B_DEF_NAME_WITH_PREFIX", () => {
    const { lines, field } = directResolution([
      event(0, {
        kind: "message",
        messageId: "STRINGID_PKMNSQUEEZEDBYBIND",
        substitutions: [],
        actionSnapshot: { attacker: 0, currentMove: MOVE_BIND, currentMovePosition: 0 },
      }),
    ]);
    expect(lines).toContainEqual([
      `Foe ${field.opponent.name} was squeezed by`,
      `${field.player.name}’s BIND!`,
    ]);
  });

  it("row 17: STRINGID_PKMNWRAPPEDBY -- direct resolver branch (real Wrap repro is blocked by the STRINGID_PKMNHURTBY gap above), B_ATK_NAME_WITH_PREFIX/B_DEF_NAME_WITH_PREFIX", () => {
    const { lines, field } = directResolution([
      event(0, {
        kind: "message",
        messageId: "STRINGID_PKMNWRAPPEDBY",
        substitutions: [],
        actionSnapshot: { attacker: 0, currentMove: MOVE_WRAP, currentMovePosition: 0 },
      }),
    ]);
    expect(lines).toContainEqual([
      `Foe ${field.opponent.name} was WRAPPED by`,
      `${field.player.name}!`,
    ]);
  });

  it("row 18: STRINGID_PKMNTRAPPEDINVORTEX -- direct resolver branch (real Fire Spin/Whirlpool repro is blocked by the STRINGID_PKMNHURTBY gap above), B_DEF_NAME_WITH_PREFIX", () => {
    const { lines, field } = directResolution([
      event(0, {
        kind: "message",
        messageId: "STRINGID_PKMNTRAPPEDINVORTEX",
        substitutions: [],
        actionSnapshot: { attacker: 0, currentMove: MOVE_FIRE_SPIN, currentMovePosition: 0 },
      }),
    ]);
    expect(lines).toContainEqual([
      `Foe ${field.opponent.name} was trapped`,
      "in the vortex!",
    ]);
  });

  it("row 19: STRINGID_PKMNCLAMPED -- direct resolver branch (real Clamp repro is blocked by the STRINGID_PKMNHURTBY gap above), B_ATK_NAME_WITH_PREFIX/B_DEF_NAME_WITH_PREFIX", () => {
    const { lines, field } = directResolution([
      event(0, {
        kind: "message",
        messageId: "STRINGID_PKMNCLAMPED",
        substitutions: [],
        actionSnapshot: { attacker: 0, currentMove: MOVE_CLAMP, currentMovePosition: 0 },
      }),
    ]);
    expect(lines).toContainEqual([
      `${field.player.name} CLAMPED`,
      `Foe ${field.opponent.name}!`,
    ]);
  });

  it("row 20: STRINGID_PKMNTRAPPEDBYSANDTOMB -- direct resolver branch (real Sand Tomb repro is blocked by the STRINGID_PKMNHURTBY gap above), B_DEF_NAME_WITH_PREFIX", () => {
    const { lines, field } = directResolution([
      event(0, {
        kind: "message",
        messageId: "STRINGID_PKMNTRAPPEDBYSANDTOMB",
        substitutions: [],
        actionSnapshot: { attacker: 0, currentMove: MOVE_SAND_TOMB, currentMovePosition: 0 },
      }),
    ]);
    expect(lines).toContainEqual([
      `Foe ${field.opponent.name} was trapped`,
      "by SAND TOMB!",
    ]);
  });

  it("row 28: STRINGID_PKMNEVADEDATTACK -- Leech Seed misses (or re-casts on an already-seeded target)", () => {
    const { messageIds, lines, field } = runFullTurnUntil(
      (seed) => Object.freeze({
        requestId: 1,
        rngSeed: seed,
        player: Object.freeze({ ...PLAYER_BASE, moveId: MOVE_LEECH_SEED, moves: [MOVE_LEECH_SEED, MOVE_LEECH_SEED, MOVE_LEECH_SEED, MOVE_LEECH_SEED] as const }),
        trainer: Object.freeze({ ...TRAINER_BASE, moveId: MOVE_SPLASH, moves: [MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH] as const }),
      }),
      AT(1),
      SELF(1),
      "STRINGID_PKMNEVADEDATTACK",
    );
    expect(messageIds).toContain("STRINGID_PKMNEVADEDATTACK");
    expect(lines).toContainEqual([`Foe ${field.opponent.name} evaded`, "the attack!"]);
  });

  it("row 29: STRINGID_PKMNSEEDED -- Leech Seed lands", () => {
    const { messageIds, lines, field } = runFullTurnUntil(
      (seed) => Object.freeze({
        requestId: 1,
        rngSeed: seed,
        player: Object.freeze({ ...PLAYER_BASE, moveId: MOVE_LEECH_SEED, moves: [MOVE_LEECH_SEED, MOVE_LEECH_SEED, MOVE_LEECH_SEED, MOVE_LEECH_SEED] as const }),
        trainer: Object.freeze({ ...TRAINER_BASE, moveId: MOVE_SPLASH, moves: [MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH] as const }),
      }),
      AT(1),
      SELF(1),
      "STRINGID_PKMNSEEDED",
    );
    expect(messageIds).toContain("STRINGID_PKMNSEEDED");
    expect(lines).toContainEqual([`Foe ${field.opponent.name} was seeded!`]);
  });

  it("row 24: STRINGID_PKMNOBTAINEDX -- Trick, attacker had no item", () => {
    const { messageIds, lines, field } = runFullTurnUntil(
      (seed) => Object.freeze({
        requestId: 1,
        rngSeed: seed,
        player: Object.freeze({ ...PLAYER_BASE, moveId: MOVE_TRICK, moves: [MOVE_TRICK, MOVE_TRICK, MOVE_TRICK, MOVE_TRICK] as const, item: 0 }),
        trainer: Object.freeze({ ...TRAINER_BASE, moveId: MOVE_SPLASH, moves: [MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH] as const, item: ITEM_KINGS_ROCK }),
      }),
      AT(1),
      SELF(1),
      "STRINGID_PKMNOBTAINEDX",
    );
    expect(messageIds).toContain("STRINGID_PKMNOBTAINEDX");
    expect(lines).toContainEqual([`${field.player.name} obtained`, "KING'S ROCK."]);
  });

  it("row 25: STRINGID_PKMNOBTAINEDX2 -- Trick, target had no item", () => {
    const { messageIds, lines, field } = runFullTurnUntil(
      (seed) => Object.freeze({
        requestId: 1,
        rngSeed: seed,
        player: Object.freeze({ ...PLAYER_BASE, moveId: MOVE_TRICK, moves: [MOVE_TRICK, MOVE_TRICK, MOVE_TRICK, MOVE_TRICK] as const, item: ITEM_ORAN_BERRY }),
        trainer: Object.freeze({ ...TRAINER_BASE, moveId: MOVE_SPLASH, moves: [MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH] as const, item: 0 }),
      }),
      AT(1),
      SELF(1),
      "STRINGID_PKMNOBTAINEDX2",
    );
    expect(messageIds).toContain("STRINGID_PKMNOBTAINEDX2");
    expect(lines).toContainEqual([`Foe ${field.opponent.name} obtained`, "ORAN BERRY."]);
  });

  it("row 26: STRINGID_PKMNOBTAINEDXYOBTAINEDZ -- Trick, both sides held an item", () => {
    const { messageIds, lines, field } = runFullTurnUntil(
      (seed) => Object.freeze({
        requestId: 1,
        rngSeed: seed,
        player: Object.freeze({ ...PLAYER_BASE, moveId: MOVE_TRICK, moves: [MOVE_TRICK, MOVE_TRICK, MOVE_TRICK, MOVE_TRICK] as const, item: ITEM_ORAN_BERRY }),
        trainer: Object.freeze({ ...TRAINER_BASE, moveId: MOVE_SPLASH, moves: [MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH] as const, item: ITEM_KINGS_ROCK }),
      }),
      AT(1),
      SELF(1),
      "STRINGID_PKMNOBTAINEDXYOBTAINEDZ",
    );
    expect(messageIds).toContain("STRINGID_PKMNOBTAINEDXYOBTAINEDZ");
    expect(lines).toContainEqual([
      `${field.player.name} obtained`,
      "KING'S ROCK.",
      `Foe ${field.opponent.name} obtained`,
      "ORAN BERRY.",
    ]);
  });

  it("row 41: STRINGID_PKMNRAISEDFIREPOWERWITH -- Flash Fire's first activation", () => {
    const { messageIds, lines, field } = runFullTurnUntil(
      (seed) => Object.freeze({
        requestId: 1,
        rngSeed: seed,
        player: Object.freeze({ ...PLAYER_BASE, moveId: MOVE_EMBER, moves: [MOVE_EMBER, MOVE_EMBER, MOVE_EMBER, MOVE_EMBER] as const }),
        trainer: Object.freeze({ ...TRAINER_BASE, ability: ABILITY_FLASH_FIRE }),
      }),
      AT(1),
      AT(0),
      "STRINGID_PKMNRAISEDFIREPOWERWITH",
    );
    expect(messageIds).toContain("STRINGID_PKMNRAISEDFIREPOWERWITH");
    expect(lines).toContainEqual([
      `Foe ${field.opponent.name}’s FLASH FIRE`,
      "raised its FIRE power!",
    ]);
  });

  it("row 42: STRINGID_PKMNSXMADEYINEFFECTIVE -- Flash Fire's already-boosted re-activation", () => {
    const { messageIds, lines, field } = runFullTurnUntil(
      (seed) => Object.freeze({
        requestId: 1,
        rngSeed: seed,
        player: Object.freeze({ ...PLAYER_BASE, moveId: MOVE_EMBER, moves: [MOVE_EMBER, MOVE_EMBER, MOVE_EMBER, MOVE_EMBER] as const }),
        trainer: Object.freeze({ ...TRAINER_BASE, ability: ABILITY_FLASH_FIRE, flashFireBoosted: 1 }),
      }),
      AT(1),
      AT(0),
      "STRINGID_PKMNSXMADEYINEFFECTIVE",
    );
    expect(messageIds).toContain("STRINGID_PKMNSXMADEYINEFFECTIVE");
    expect(lines).toContainEqual([
      `Foe ${field.opponent.name}’s FLASH FIRE`,
      "made EMBER ineffective!",
    ]);
  });

  it("row 4: STRINGID_PKMNFROZENBY -- direct resolver branch (zero-incidence: no rental ability sets MOVE_EFFECT_FREEZE), B_SCR_ACTIVE_NAME_WITH_PREFIX/B_SCR_ACTIVE_ABILITY/B_EFF_NAME_WITH_PREFIX", () => {
    const { lines, field } = directResolution([
      event(0, { kind: "set-battler-status-data", battler: 1, status1: STATUS1_FREEZE }),
      event(1, {
        kind: "message",
        messageId: "STRINGID_PKMNFROZENBY",
        substitutions: ["MAGMA ARMOR"],
        scriptingBattler: 0,
        actionSnapshot: { attacker: 0, currentMove: MOVE_TACKLE, currentMovePosition: 0 },
      }),
    ]);
    expect(lines).toContainEqual([
      `${field.player.name}’s MAGMA ARMOR`,
      `froze Foe ${field.opponent.name} solid!`,
    ]);
  });

  it("row 23: STRINGID_PKMNMADESLEEP -- direct resolver branch (zero-incidence: no rental ability inflicts sleep on-hit), B_SCR_ACTIVE_NAME_WITH_PREFIX/B_SCR_ACTIVE_ABILITY/B_EFF_NAME_WITH_PREFIX", () => {
    const { lines, field } = directResolution([
      event(0, { kind: "set-battler-status-data", battler: 1, status1: 1 }),
      event(1, {
        kind: "message",
        messageId: "STRINGID_PKMNMADESLEEP",
        substitutions: ["INSOMNIA"],
        scriptingBattler: 0,
        actionSnapshot: { attacker: 0, currentMove: MOVE_TACKLE, currentMovePosition: 0 },
      }),
    ]);
    expect(lines).toContainEqual([
      `${field.player.name}’s INSOMNIA`,
      `made Foe ${field.opponent.name} sleep!`,
    ]);
  });

  it("row 35: STRINGID_PKMNRAISEDDEFALITTLE -- direct resolver branch (zero-incidence: BATTLE_TYPE_DOUBLE-only chooser), B_ATK_PREFIX2/B_CURRENT_MOVE", () => {
    const { lines } = directResolution([
      event(0, {
        kind: "message",
        messageId: "STRINGID_PKMNRAISEDDEFALITTLE",
        substitutions: [],
        actionSnapshot: { attacker: 0, currentMove: MOVE_REFLECT, currentMovePosition: 0 },
      }),
    ]);
    expect(lines).toContainEqual(["Ally’s REFLECT", "raised DEFENSE a little!"]);
  });

  it("row 37: STRINGID_PKMNRAISEDSPDEFALITTLE -- direct resolver branch (zero-incidence: BATTLE_TYPE_DOUBLE-only chooser), B_ATK_PREFIX2/B_CURRENT_MOVE", () => {
    const { lines } = directResolution([
      event(0, {
        kind: "message",
        messageId: "STRINGID_PKMNRAISEDSPDEFALITTLE",
        substitutions: [],
        actionSnapshot: { attacker: 1, currentMove: MOVE_REFLECT, currentMovePosition: 0 },
      }),
    ]);
    expect(lines).toContainEqual(["Foe’s REFLECT", "raised SP. DEF a little!"]);
  });

  it("row 39: STRINGID_PKMNSHROUDEDINMIST -- direct resolver branch (zero-incidence: no legal L50 rental carries Mist), B_ATK_PREFIX2", () => {
    const { lines } = directResolution([
      event(0, {
        kind: "message",
        messageId: "STRINGID_PKMNSHROUDEDINMIST",
        substitutions: [],
        actionSnapshot: { attacker: 0, currentMove: MOVE_TACKLE, currentMovePosition: 0 },
      }),
    ]);
    expect(lines).toContainEqual(["Ally became", "shrouded in MIST!"]);
  });

  it("row 27: STRINGID_PKMNCHOSEXASDESTINY -- direct resolver branch (zero-incidence: MOVE_DOOM_DESIRE never legal at Factory L50), B_ATK_NAME_WITH_PREFIX/B_CURRENT_MOVE", () => {
    const { lines, field } = directResolution([
      event(0, {
        kind: "message",
        messageId: "STRINGID_PKMNCHOSEXASDESTINY",
        substitutions: [],
        actionSnapshot: { attacker: 1, currentMove: MOVE_DOOM_DESIRE, currentMovePosition: 0 },
      }),
    ]);
    expect(lines).toContainEqual([`Foe ${field.opponent.name} chose`, "DOOM DESIRE as its destiny!"]);
  });

  it("row 43: STRINGID_PKMNUNAFFECTED -- direct resolver branch (zero-incidence: mirror-level L50 singles never has targetLevel > attackerLevel), B_DEF_NAME_WITH_PREFIX", () => {
    const { lines, field } = directResolution([
      event(0, {
        kind: "message",
        messageId: "STRINGID_PKMNUNAFFECTED",
        substitutions: [],
        actionSnapshot: { attacker: 0, currentMove: MOVE_TACKLE, currentMovePosition: 0 },
      }),
    ]);
    expect(lines).toContainEqual([`Foe ${field.opponent.name} is`, "unaffected!"]);
  });
});
