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
 * ISSUES #70, newly-found gap: `STRINGID_PKMNHURTBY` (battle_message.c:148,
 * `{B_ATK_NAME_WITH_PREFIX} is hurt\nby {B_BUFF1}!`), printed by
 * `BattleScript_WrapTurnDmg` (battle_scripts_1.s:3829-3833) whenever
 * `ENDTURN_WRAP`'s own recurring-damage branch fires
 * (battle_util.c:1592-1621, `runWrapTick`/`WRAP_TURN_DMG_LABEL`,
 * battleEndTurnOrchestration.ts). Real Gen3 behavior deals a trapping move's
 * first damage tick on the SAME turn it lands, so this is reachable on the
 * very first successful use of any of the 6 trapping moves (Bind/Wrap/Fire
 * Spin/Clamp/Whirlpool/Sand Tomb) -- higher real-world severity than an
 * unmapped id that only needs a rare follow-up trigger. Discovered while
 * staging batch 2's wrap-family repros (tests/presentationStringBatch2.test.ts,
 * rows 16-20), which fell back to the direct-resolver idiom specifically
 * because this gap crashed first and masked their own strings.
 *
 * This id IS stageable (unlike the batch-2 wrap-family rows' own initial-hit
 * strings, whose repro is blocked by this same gap): a real Bind use lands
 * and its own end-of-turn tick fires within the same staged turn. Uses the
 * staged full-turn idiom, not the synthetic-event fallback.
 *
 * Red-verified once pre-fix via `git stash` on the two touched engine files
 * (battleResolutionPresentation.ts's new STRINGID_PKMNHURTBY messageLines
 * branch, factoryBattleScriptFullTurnDecision.ts's new prepareMessage
 * substitution): threw battleStringResolver's exact completeness-guard
 * error ("STRINGID_PKMNHURTBY references placeholder {B_BUFF1} with no
 * resolver supplied") before this change.
 */

const MOVE_BIND = 20;
const MOVE_SPLASH = 150;

const ABILITY_NONE = 0;

const PLAYER_BASE: FactoryFullTurnBattlerConfig = Object.freeze({
  species: 12, // BUTTERFREE
  moveId: MOVE_BIND,
  moves: [MOVE_BIND, MOVE_BIND, MOVE_BIND, MOVE_BIND] as const,
  pp: [20, 20, 20, 20] as const,
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
  moveId: MOVE_SPLASH,
  moves: [MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH] as const,
  pp: [40, 40, 40, 40] as const,
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

/** Same brute-force-across-seeds idiom as batch-1/2, for accuracy-gated Bind. */
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

describe("presentation-string STRINGID_PKMNHURTBY (ISSUES #70, wrap end-of-turn tick)", () => {
  it("staged Bind: the same turn's end-of-turn wrap-damage tick prints STRINGID_PKMNHURTBY with the trapping move's own name", () => {
    const { messageIds, lines, field } = runFullTurnUntil(
      (seed) => Object.freeze({
        requestId: 1,
        rngSeed: seed,
        player: PLAYER_BASE,
        trainer: TRAINER_BASE,
      }),
      AT(1),
      SELF(1),
      "STRINGID_PKMNHURTBY",
    );
    // The initiating hit's own string still fires first, same turn.
    expect(messageIds).toContain("STRINGID_PKMNSQUEEZEDBYBIND");
    expect(messageIds).toContain("STRINGID_PKMNHURTBY");
    // BS_ATTACKER is reassigned to the trapped battler (the trainer's mon,
    // battler 1) for this tick -- not the player who cast Bind.
    expect(lines).toContainEqual([
      `Foe ${field.opponent.name} is hurt`,
      "by BIND!",
    ]);
  });
});
