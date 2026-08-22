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
 * ISSUES #106: `STRINGID_PKMNATTACK` (`"{B_BUFF1}'s attack!"`, Beat Up's own
 * per-party-member printstring, `BattleScript_BeatUpLoop`,
 * data/battle_scripts_1.s:1946-1951) had no `{B_BUFF1}` resolver, crashing
 * the soak driver's `winning`-policy seed 203 (reached indirectly via
 * METRONOME -> BEAT UP) via the FATAL completeness guard (ISSUES #72 user
 * decision). `Cmd_trydobeatup` (battleScriptBeatUpOpcode.ts) already records
 * the looping party member as `rulesContext.battleTextBuff1MonNick`
 * (`{battler, partyIndex}`, the same general-purpose carrier
 * `STRINGID_PKMNTRACED` uses) on each loop iteration -- this was a pure
 * missing-messageLines-case + missing-substitutions-wiring gap, same class
 * as #100/#101/#105, not an unmodeled effect. Staged here with Beat Up used
 * DIRECTLY (not via Metronome) against a real 3-member healthy player
 * party, so the loop really iterates every conscious, non-status member.
 */

const BEAT_UP = 251;
const SPLASH = 150;

const SPECIES_WOBBUFFET = 202; // pure Psychic -- arbitrary neutral filler, all three party members share it.

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

  return { messageIds, lines, field: command.field };
}

function wobbuffetConfig(moveId: number, overrides: Record<string, unknown> = {}) {
  return Object.freeze({
    species: SPECIES_WOBBUFFET,
    moveId,
    attack: 60,
    defense: 60,
    spAttack: 60,
    spDefense: 60,
    speed: 60,
    hp: 200,
    maxHp: 200,
    ...overrides,
  });
}

const BENCH_MEMBER = Object.freeze({
  species: SPECIES_WOBBUFFET,
  personality: 1,
  level: 50,
  hp: 200,
  maxHP: 200,
  moves: [SPLASH, SPLASH, SPLASH, SPLASH] as const,
  pp: [10, 10, 10, 10] as const,
});

describe("presentation-string ISSUES #106 -- Beat Up's STRINGID_PKMNATTACK", () => {
  it("names each conscious party member in turn (real player BEAT UP, 3-member healthy party, direct use not via Metronome)", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: wobbuffetConfig(BEAT_UP, { speed: 200 }),
      trainer: wobbuffetConfig(SPLASH, { speed: 1 }),
      playerBenchHp: [200, 200] as const,
      playerBenchOverride: [BENCH_MEMBER, BENCH_MEMBER] as const,
    });
    const { messageIds, lines } = runFullTurn(config, AT(1), AT(1));
    const beatUpMessages = messageIds.filter((id) => id === "STRINGID_PKMNATTACK");
    expect(beatUpMessages).toHaveLength(3);
    expect(lines).toContainEqual(["WOBBUFFET’s attack!"]);
  });
});
