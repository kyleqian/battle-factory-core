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
 * ISSUES #108 (the #106/#107 sibling census, PROGRESS 1373): re-examined all
 * five of its confirmed-reachable gaps; two turned out genuinely reachable
 * and are fixed+pinned here (same house pattern as #100/#101/#105/#106/
 * #107 -- a missing `messageLines` case, red-verified via `git stash --
 * src/engine/battleResolutionPresentation.ts
 * src/engine/factoryBattleScriptFullTurnDecision.ts`, reproduces the exact
 * completeness-guard fatal pre-fix), and three turned out DEAD on closer
 * inspection -- the prior census traced the opcode wiring but not the
 * Factory-legal draft pool, and all three fail there:
 *
 * - `STRINGID_PLAYERPICKEDUPMONEY` (Pay Day): `Cmd_givepaydaymoney`'s only
 *   call site is `BattleScript_PayDayMoneyAndPickUpItems`
 *   (battle_scripts_1.s:2940-2943), reached either via
 *   `BattleScript_LocalBattleWonReward`'s fallthrough (Local-only, already
 *   recorded dead in ISSUES.md) or via
 *   `BattleScript_FrontierTrainerBattleWon`'s own `jumpifnotbattletype
 *   BATTLE_TYPE_TRAINER, BattleScript_PayDayMoneyAndPickUpItems`
 *   (`:3027-3028`, `CMP_NO_COMMON_BITS` per the committed
 *   `battle-script-program.json`) -- jumps only when BATTLE_TYPE_TRAINER is
 *   ABSENT, but `HandleEndTurn_BattleWon` (battle_main.c:4967-4972) only
 *   ever enters this label when `BATTLE_TYPE_TRAINER && BATTLE_TYPE_FRONTIER`
 *   are BOTH set, so the jump is always false there and execution falls
 *   through past `givepaydaymoney` straight to `BattleScript_TryPickUpItems`/
 *   `end2` (`:3044-3048`). The only other caller (`battle_main.c:5012`) is
 *   the non-trainer win branch, never taken in a Factory battle.
 * - `STRINGID_PKMNMADEITRAIN`/`STRINGID_PKMNSXINTENSIFIEDSUN` (Drizzle/
 *   Drought switch-in): Kyogre/Groudon are the only Gen 3 species with these
 *   abilities (`species_info.h`), and neither is a `FRONTIER_MON_*` eligible
 *   rental anywhere in the extracted frontier trainer data -- confirmed by
 *   the ability display-name table this engine's `prepareMessage` reads
 *   (`src/data/gen/summary-info.json`, Factory-rental-scoped) having no
 *   entry for either ability id at all. No Factory-legal draft can ever
 *   produce a Drizzle/Drought holder, so the switch-in branches that already
 *   exist in `battleScriptSwitchinOpcode.ts` (structurally identical to Sand
 *   Stream's, which IS reachable and already fixed) are dead in practice.
 *
 * All three are left OUT of `messageLines` deliberately, same DEAD-carrier
 * precedent as `STRINGID_PKMNCANTUSEMOVESEALED` -- the completeness guard
 * stays fatal for them because they should never actually be reached.
 */

const SPLASH = 150;
const RAGE = 99;
const POUND = 1;
const GROWTH = 74;
const SNATCH = 289;

const SPECIES_WOBBUFFET = 202; // pure Psychic -- arbitrary neutral filler.

const STATUS2_RAGE = 1 << 23; // battle_util.h; battleScriptMoveEndOpcode.ts:74's own local copy.

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

describe("presentation-string ISSUES #108 -- Rage's STRINGID_PKMNRAGEBUILDING", () => {
  it("names the RAGE holder that just got hit (real player attack against a staged trainer RAGE status)", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: wobbuffetConfig(POUND, { speed: 200 }),
      // parity-mac: the holder must have CHOSEN Rage this turn. TryClearRageStatuses (battle_util.c:1973-1981) drops a staged
      // STATUS2_RAGE before the first action when the chosen move is anything else (docs/parity-mac/rage-status-clear.md);
      // this trainer used to hold Splash.
      trainer: wobbuffetConfig(RAGE, { speed: 1, status2: STATUS2_RAGE, hp: 300, maxHp: 300 }),
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(1), AT(0));
    expect(messageIds).toContain("STRINGID_PKMNRAGEBUILDING");
    expect(lines).toContainEqual([`Foe ${field.opponent.name}’s RAGE`, "is building!"]);
  });
});

describe("presentation-string ISSUES #108 -- Snatch's STRINGID_PKMNSNATCHEDMOVE", () => {
  it("names the snatcher and the victim (real turn-1 Snatch stealing a real Growth)", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: wobbuffetConfig(SNATCH, { speed: 60 }),
      trainer: wobbuffetConfig(GROWTH, { speed: 200 }),
    });
    // SNATCH's own +4 priority (moves.json) always goes first regardless of
    // Speed, so the trainer's slower-priority GROWTH is the one intercepted
    // even though the trainer is faster.
    const { messageIds, lines, field } = runFullTurn(config, AT(1), AT(1));
    expect(messageIds).toContain("STRINGID_PKMNSNATCHEDMOVE");
    expect(lines).toContainEqual([`${field.player.name} SNATCHED`, `Foe ${field.opponent.name}’s move!`]);
  });
});
