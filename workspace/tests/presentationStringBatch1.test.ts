import { describe, it, expect } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
  type FactoryFullTurnBattlerConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { createBattleCommandPresentation } from "../src/engine/battleCommandPresentation.ts";
import { createBattleResolutionPresentation } from "../src/engine/battleResolutionPresentation.ts";
import type { BattleCommandRequest, BattleCommandDecision } from "../src/engine/battleDecisionBoundary.ts";

/**
 * ISSUES #70 batch 1: the ranked top-8 rows of docs/issue70-stringid-
 * reachability.md's "Ranked top-N by crash risk" table (15 STRINGIDs) --
 * each hit battleStringResolver's completeness guard whenever a currently-
 * wired opcode reached it, same defect class as #65/#68
 * (tests/murkrowTormentSubjectedPresentationRepro.test.ts). Stages the exact
 * trigger scenario the reachability doc names for each row through the
 * production kernel + resolution presentation path (the same
 * constrained-AI idiom AGENTS.md documents: give every opponent slot the
 * same move so the Factory AI's mask-7 policy is not actually exercised).
 *
 * Red-verified once pre-fix via `git stash` on the two source commits
 * (battleResolutionPresentation.ts's messageLines branches +
 * factoryBattleScriptFullTurnDecision.ts's prepareMessage substitutions):
 * every `it` below threw "battleStringResolver: STRINGID_... references
 * placeholder {...} with no resolver supplied" before this change.
 */

const MOVE_ABSORB = 71;
const MOVE_TACKLE = 33;
const MOVE_PROTECT = 182;
const MOVE_EARTHQUAKE = 89;
const MOVE_ENDURE = 203;
const MOVE_SUBSTITUTE = 164;
const MOVE_SPLASH = 150;
const MOVE_REFLECT = 115;
const MOVE_DOUBLE_SLAP = 3;

const ABILITY_NONE = 0;
const ABILITY_WONDER_GUARD = 25;
const ABILITY_LEVITATE = 26;
const ABILITY_POISON_POINT = 38;

const ITEM_LUM_BERRY = 141;
const STATUS1_POISON = 1 << 3;

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

/**
 * Several rows below are RNG-gated (accuracy rolls, 30%-chance contact
 * abilities). Runs the same staged scenario across a small range of seeds
 * through the real production kernel (no stubbing) until one produces the
 * target STRINGID, exactly like brute-forcing a real rental matchup's
 * favorable turn -- not a shortcut around the mechanic itself.
 */
function runFullTurnUntil(
  buildConfig: (seed: number) => FactoryFullTurnConfig,
  playerDecision: BattleCommandDecision,
  trainerDecision: BattleCommandDecision,
  targetMessageId: string,
  maxSeed = 80,
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

describe("presentation-string batch 1 (ISSUES #70 ranked rows 1-8)", () => {
  it("row 1: STRINGID_PKMNENERGYDRAINED -- Absorb-family hit on a non-Liquid-Ooze target", () => {
    const build = (seed: number): FactoryFullTurnConfig => Object.freeze({
      requestId: 1,
      rngSeed: seed,
      player: Object.freeze({ ...PLAYER_BASE, moveId: MOVE_ABSORB, moves: [MOVE_ABSORB, MOVE_ABSORB, MOVE_ABSORB, MOVE_ABSORB] as const }),
      trainer: Object.freeze({ ...TRAINER_BASE, ability: ABILITY_NONE }),
    });
    const { messageIds, lines, field } = runFullTurnUntil(
      build,
      AT(1),
      AT(0),
      "STRINGID_PKMNENERGYDRAINED",
    );
    expect(messageIds).toContain("STRINGID_PKMNENERGYDRAINED");
    expect(lines).toContainEqual([`Foe ${field.opponent.name} had its`, "energy drained!"]);
  });

  it("row 2: STRINGID_PKMNPROTECTEDITSELF / AVOIDEDDAMAGE / PKMNMAKESGROUNDMISS -- Cmd_resultmessage's shared miss-string dispatch", () => {
    // PKMNPROTECTEDITSELF: the trainer's Protect blocks the player's Tackle.
    const protect = runFullTurnUntil(
      (seed) => Object.freeze({
        requestId: 1,
        rngSeed: seed,
        player: Object.freeze({ ...PLAYER_BASE, moveId: MOVE_TACKLE }),
        trainer: Object.freeze({ ...TRAINER_BASE, moveId: MOVE_PROTECT, moves: [MOVE_PROTECT, MOVE_PROTECT, MOVE_PROTECT, MOVE_PROTECT] as const }),
      }),
      AT(1),
      SELF(1),
      "STRINGID_PKMNPROTECTEDITSELF",
    );
    expect(protect.lines).toContainEqual([`Foe ${protect.field.opponent.name}`, "protected itself!"]);

    // AVOIDEDDAMAGE: Wonder Guard blocks a not-super-effective Tackle.
    const avoided = runFullTurnUntil(
      (seed) => Object.freeze({
        requestId: 1,
        rngSeed: seed,
        player: Object.freeze({ ...PLAYER_BASE, moveId: MOVE_TACKLE }),
        trainer: Object.freeze({ ...TRAINER_BASE, ability: ABILITY_WONDER_GUARD }),
      }),
      AT(1),
      AT(0),
      "STRINGID_AVOIDEDDAMAGE",
    );
    expect(avoided.lines).toContainEqual([
      `Foe ${avoided.field.opponent.name} avoided`,
      "damage with WONDER GUARD!",
    ]);

    // PKMNMAKESGROUNDMISS: Levitate blocks Earthquake.
    const groundMiss = runFullTurnUntil(
      (seed) => Object.freeze({
        requestId: 1,
        rngSeed: seed,
        player: Object.freeze({ ...PLAYER_BASE, moveId: MOVE_EARTHQUAKE, moves: [MOVE_EARTHQUAKE, MOVE_EARTHQUAKE, MOVE_EARTHQUAKE, MOVE_EARTHQUAKE] as const }),
        trainer: Object.freeze({ ...TRAINER_BASE, ability: ABILITY_LEVITATE }),
      }),
      AT(1),
      AT(0),
      "STRINGID_PKMNMAKESGROUNDMISS",
    );
    expect(groundMiss.lines).toContainEqual([
      `Foe ${groundMiss.field.opponent.name} makes GROUND`,
      "moves miss with LEVITATE!",
    ]);

    // STRINGID_PKMNAVOIDEDATTACK's own trigger (battleScriptHitChainOpcode.ts:1212-1213,
    // isDoubleAvoided) is gated on BATTLE_TYPE_DOUBLE, structurally unreachable
    // in this engine's singles-only Factory L50 scope -- not independently
    // repro'd, matching the reachability doc's own "not separately computed"
    // note for this id (row 31). Its messageLines branch shares the exact
    // same B_DEF_NAME_WITH_PREFIX-only shape proven above for
    // PKMNPROTECTEDITSELF/PKMNENDUREDHIT/SUBSTITUTEDAMAGED.
  });

  it("row 3: STRINGID_PKMNPOISONEDBY -- Poison Point's on-contact status block", () => {
    const { messageIds, lines, field } = runFullTurnUntil(
      (seed) => Object.freeze({
        requestId: 1,
        rngSeed: seed,
        player: Object.freeze({ ...PLAYER_BASE, moveId: MOVE_TACKLE }),
        trainer: Object.freeze({ ...TRAINER_BASE, ability: ABILITY_POISON_POINT }),
      }),
      AT(1),
      AT(0),
      "STRINGID_PKMNPOISONEDBY",
    );
    expect(messageIds).toContain("STRINGID_PKMNPOISONEDBY");
    expect(lines).toContainEqual([
      `Foe ${field.opponent.name}’s POISON POINT`,
      `poisoned ${field.player.name}!`,
    ]);
  });

  it("row 4: STRINGID_PKMNSITEMCUREDPROBLEM -- end-of-turn Lum Berry cure", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: Object.freeze({
        ...PLAYER_BASE,
        moveId: MOVE_SPLASH,
        moves: [MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH] as const,
        item: ITEM_LUM_BERRY,
        status1: STATUS1_POISON,
      }),
      trainer: Object.freeze({
        ...TRAINER_BASE,
        moveId: MOVE_SPLASH,
        moves: [MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH] as const,
      }),
    });
    const { messageIds, lines, field } = runFullTurn(config, SELF(0), SELF(1));
    expect(messageIds).toContain("STRINGID_PKMNSITEMCUREDPROBLEM");
    expect(lines).toContainEqual([`${field.player.name}’s LUM BERRY`, "cured its poison problem!"]);
  });

  it("row 5: STRINGID_PKMNENDUREDHIT -- an Endure carrier survives a would-be KO", () => {
    const { messageIds, lines, field } = runFullTurnUntil(
      (seed) => Object.freeze({
        requestId: 1,
        rngSeed: seed,
        player: Object.freeze({ ...PLAYER_BASE, moveId: MOVE_TACKLE }),
        trainer: Object.freeze({
          ...TRAINER_BASE,
          moveId: MOVE_ENDURE,
          moves: [MOVE_ENDURE, MOVE_ENDURE, MOVE_ENDURE, MOVE_ENDURE] as const,
          hp: 1,
          maxHp: 200,
          defense: 5,
        }),
      }),
      AT(1),
      SELF(1),
      "STRINGID_PKMNENDUREDHIT",
    );
    expect(messageIds).toContain("STRINGID_PKMNENDUREDHIT");
    expect(lines).toContainEqual([`Foe ${field.opponent.name} ENDURED`, "the hit!"]);
  });

  it("row 6: STRINGID_SUBSTITUTEDAMAGED -- a damaging hit lands on an active Substitute", () => {
    const { messageIds, lines, field } = runFullTurnUntil(
      (seed) => Object.freeze({
        requestId: 1,
        rngSeed: seed,
        player: Object.freeze({ ...PLAYER_BASE, moveId: MOVE_TACKLE, speed: 40 }),
        trainer: Object.freeze({
          ...TRAINER_BASE,
          moveId: MOVE_SUBSTITUTE,
          moves: [MOVE_SUBSTITUTE, MOVE_SUBSTITUTE, MOVE_SUBSTITUTE, MOVE_SUBSTITUTE] as const,
          speed: 200,
          hp: 200,
          maxHp: 200,
          defense: 200,
        }),
      }),
      AT(1),
      SELF(1),
      "STRINGID_SUBSTITUTEDAMAGED",
    );
    expect(messageIds).toContain("STRINGID_SUBSTITUTEDAMAGED");
    expect(lines).toContainEqual(["The SUBSTITUTE took damage", `for Foe ${field.opponent.name}!`]);
  });

  it("row 7: STRINGID_PKMNRAISEDDEF -- Reflect's own success message", () => {
    const { messageIds, lines } = runFullTurnUntil(
      (seed) => Object.freeze({
        requestId: 1,
        rngSeed: seed,
        player: Object.freeze({
          ...PLAYER_BASE,
          moveId: MOVE_REFLECT,
          moves: [MOVE_REFLECT, MOVE_REFLECT, MOVE_REFLECT, MOVE_REFLECT] as const,
        }),
        trainer: Object.freeze({ ...TRAINER_BASE, moveId: MOVE_SPLASH, moves: [MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH] as const }),
      }),
      SELF(0),
      SELF(1),
      "STRINGID_PKMNRAISEDDEF",
    );
    expect(messageIds).toContain("STRINGID_PKMNRAISEDDEF");
    expect(lines).toContainEqual(["Ally’s REFLECT", "raised DEFENSE!"]);
  });

  it("row 8: STRINGID_HITXTIMES -- a multi-hit move completes its hit sequence", () => {
    const { messageIds, lines } = runFullTurnUntil(
      (seed) => Object.freeze({
        requestId: 1,
        rngSeed: seed,
        player: Object.freeze({
          ...PLAYER_BASE,
          moveId: MOVE_DOUBLE_SLAP,
          moves: [MOVE_DOUBLE_SLAP, MOVE_DOUBLE_SLAP, MOVE_DOUBLE_SLAP, MOVE_DOUBLE_SLAP] as const,
        }),
        trainer: Object.freeze({ ...TRAINER_BASE, moveId: MOVE_SPLASH, moves: [MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH] as const }),
      }),
      AT(1),
      SELF(1),
      "STRINGID_HITXTIMES",
    );
    expect(messageIds).toContain("STRINGID_HITXTIMES");
    const hitLine = lines.find((line) => /^Hit \d time\(s\)!$/.test(line[0] ?? ""));
    expect(hitLine).toBeDefined();
    const hitCount = Number(hitLine![0]!.match(/^Hit (\d) time\(s\)!$/)![1]);
    expect(hitCount).toBeGreaterThanOrEqual(2);
    expect(hitCount).toBeLessThanOrEqual(5);
  });
});
