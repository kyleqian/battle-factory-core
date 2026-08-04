import { describe, it, expect } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
  type FactoryFullTurnBattlerConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { createBattleCommandPresentation } from "../src/engine/battleCommandPresentation.ts";
import { createBattleResolutionPresentation } from "../src/engine/battleResolutionPresentation.ts";
import type { BattleCommandDecision, BattleCommandRequest } from "../src/engine/battleDecisionBoundary.ts";

/**
 * ISSUES #72 batch 2: the Taunt-pair idiom (PROGRESS 896/batch 1) continued
 * from STRINGID_PKMNSXWOREOFF down the ranked REACHABLE list -- EFFECT_ROAR's
 * Ingrain/Suction Cups pair, the trainer-battle force-out tail, the
 * Intimidate switch-in loop, Damp/Volt Absorb/Water Absorb/Inner Focus's
 * ability-blocks-the-move's-own-effect shapes, Keen Eye/Hyper Cutter's
 * specific-stat-loss block, and Reflect/Light Screen's end-of-turn wear-off.
 * Each `it` red-verifies via `git stash -- src/engine/battleResolutionPresentation.ts
 * src/engine/factoryBattleScriptFullTurnDecision.ts src/engine/battleEndTurnOrchestration.ts
 * src/engine/battleScriptEvents.ts` (throws the exact completeness-guard
 * error, or a TS error for the new targetBattler field, pre-fix).
 */

const SPLASH = 150;
const GROWL = 45;
const ROAR = 46;
const INGRAIN = 275;
const SELFDESTRUCT = 120;
const THUNDERSHOCK = 84;
const FAKE_OUT = 252;

const SPECIES_WOBBUFFET = 202; // pure Psychic -- arbitrary neutral filler.
const SPECIES_MURKROW = 198; // Dark/Flying, arbitrary attacker.
const SPECIES_EKANS = 23; // real ABILITY_INTIMIDATE slot-0 carrier (species-stats.json).

const AT = (battler: 0 | 1): BattleCommandDecision =>
  Object.freeze({ kind: "use-move", moveSlot: 0, targetBattler: battler });
const USE = (slot: 0 | 1 | 2 | 3, battler: 0 | 1): BattleCommandDecision =>
  Object.freeze({ kind: "use-move", moveSlot: slot, targetBattler: battler });

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
    opponentTrainer: Object.freeze({ className: "COOLTRAINER", name: "REY" }),
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

function statusedTargetConfig(
  overrides: Partial<FactoryFullTurnBattlerConfig> = {},
): FactoryFullTurnBattlerConfig {
  return Object.freeze({
    species: SPECIES_WOBBUFFET,
    moveId: SPLASH,
    attack: 60,
    defense: 60,
    spAttack: 60,
    spDefense: 90,
    speed: 60,
    hp: 200,
    maxHp: 200,
    ...overrides,
  });
}

const ATTACKER = (moveId: number, overrides: Partial<FactoryFullTurnBattlerConfig> = {}): FactoryFullTurnBattlerConfig =>
  Object.freeze({
    species: SPECIES_MURKROW,
    moveId,
    attack: 60,
    defense: 60,
    spAttack: 85,
    spDefense: 60,
    speed: 91,
    hp: 190,
    maxHp: 190,
    ...overrides,
  });

describe("presentation-string ISSUES #72 batch 2 -- EFFECT_ROAR's Ingrain/Suction Cups pair", () => {
  it("STRINGID_PKMNANCHORSITSELFWITH resolves the rooted target's own name and Suction Cups", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: statusedTargetConfig({ ability: 21 /* ABILITY_SUCTION_CUPS */ }),
      trainer: ATTACKER(ROAR),
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(0), AT(0));
    expect(messageIds).toContain("STRINGID_PKMNANCHORSITSELFWITH");
    expect(lines).toContainEqual([`${field.player.name} anchors`, "itself with SUCTION CUPS!"]);
  });

  it("STRINGID_PKMNANCHOREDITSELF resolves the rooted target's own name after a real 2-turn Ingrain-then-Roar sequence", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: {
        species: SPECIES_MURKROW,
        moveId: ROAR,
        moves: [ROAR, SPLASH, 0, 0] as [number, number, number, number],
        attack: 60, defense: 60, spAttack: 85, spDefense: 60,
        speed: 91, hp: 190, maxHp: 190,
      },
      trainer: {
        species: SPECIES_WOBBUFFET,
        moveId: INGRAIN,
        moves: [INGRAIN, SPLASH, 0, 0] as [number, number, number, number],
        attack: 60, defense: 60, spAttack: 60, spDefense: 90,
        speed: 60, hp: 200, maxHp: 200,
      },
    });
    const initial = createFactoryFullTurnBattleState(config);
    if (initial.boundary.kind !== "decision-required") throw new Error("expected player boundary");
    const t1p = submitFactoryFullTurnDecision(initial, {
      requestId: 1, side: "player", decision: USE(1, 0),
    });
    if (t1p.kind !== "decision-required") throw new Error("expected trainer boundary");
    const t1t = submitFactoryFullTurnDecision(t1p.state, {
      requestId: 2, side: "trainer", decision: USE(0, 1),
    });
    if (t1t.kind !== "decision-required") throw new Error("expected turn-2 player boundary");
    expect(t1t.state.rules.rulesContext.battlers[1]!.status3 & (1 << 10)).not.toBe(0);

    const t2p = submitFactoryFullTurnDecision(t1t.state, {
      requestId: 3, side: "player", decision: USE(0, 1),
    });
    if (t2p.kind !== "decision-required") throw new Error("expected turn-2 trainer boundary");
    const t2t = submitFactoryFullTurnDecision(t2p.state, {
      requestId: 4, side: "trainer", decision: USE(1, 1),
    });

    const command = createBattleCommandPresentation(
      t1t.nextRequest as BattleCommandRequest,
      t1t.state.rules.rulesContext,
      0,
    );
    const resolution = createBattleResolutionPresentation({
      sourceRequest: t1t.nextRequest as BattleCommandRequest,
      sourceDecision: USE(0, 1),
      beforeRules: t1t.state.rules,
      transition: t2t,
      fieldBoundary: command.field,
      confirmHandoff: {
        fightDisplayCursor: command.fightDisplayCursor,
        idleBounceElapsed: command.idleBounceElapsed,
      },
      opponentTrainer: Object.freeze({ className: "COOLTRAINER", name: "REY" }),
    });
    const messageIds = t2t.events
      .filter((event) => event.payload.kind === "message")
      .map((event) => (event.payload as { messageId: string }).messageId);
    const lines = resolution.segments
      .flatMap((segment) => segment.commands)
      .filter((cmd): cmd is Extract<typeof cmd, { type: "message" }> => cmd.type === "message")
      .map((cmd) => cmd.lines);
    expect(messageIds).toContain("STRINGID_PKMNANCHOREDITSELF");
    expect(lines).toContainEqual([`Foe ${command.field.opponent.name} anchored`, "itself with its roots!"]);
  });
});

describe("presentation-string ISSUES #72 batch 2 -- trainer-battle force-out", () => {
  it("STRINGID_PKMNWASDRAGGEDOUT resolves the forced-out target's own name", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: ATTACKER(ROAR),
      trainer: statusedTargetConfig(),
      trainerBenchHp: [200, 0] as [number, number],
      trainerBenchOverride: [{
        species: 66, abilityNum: 0, moves: [33, 0, 0, 0],
        maxHP: 200, attack: 80, defense: 100, speed: 50,
        spAttack: 40, spDefense: 60,
      }, undefined] as FactoryFullTurnConfig["trainerBenchOverride"],
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(1), AT(1));
    expect(messageIds).toContain("STRINGID_PKMNWASDRAGGEDOUT");
    expect(lines).toContainEqual([`Foe ${field.opponent.name} was`, "dragged out!"]);
  });
});

describe("presentation-string ISSUES #72 batch 2 -- Intimidate switch-in loop", () => {
  // The trainer (not the player) switches in the Intimidate holder, so the
  // player's own action stays a plain "use-move" decision -- createBattleResolutionPresentation's
  // confirm-handoff only supports a player-side move-cursor source decision,
  // same constraint the existing "fires incoming Intimidate" test
  // (factoryBattleScriptFullTurnDecision.test.ts) sidesteps by never calling it.
  function intimidateSwitchConfig(playerAbility: number): FactoryFullTurnConfig {
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
        species: SPECIES_EKANS, abilityNum: 0, moves: [35, 0, 0, 0],
        maxHP: 200, attack: 80, defense: 200, speed: 50,
        spAttack: 40, spDefense: 100,
      }, undefined] as FactoryFullTurnConfig["trainerBenchOverride"],
    });
  }

  it("STRINGID_PKMNCUTSATTACKWITH resolves the switching-in Intimidate holder and the opposing target", () => {
    const config = intimidateSwitchConfig(0);
    const { messageIds, lines, field } = runFullTurn(
      config,
      AT(0),
      { kind: "switch", partyIndex: 1 },
    );
    expect(messageIds).toContain("STRINGID_PKMNCUTSATTACKWITH");
    // {B_SCR_ACTIVE_NAME_WITH_PREFIX} resolves battler 1's identity (scriptingBattler,
    // the switched-in Intimidate holder) against the presentation field
    // snapshot frozen at the START of the turn (command.field, pre-switch) --
    // same pre-existing characteristic the rest of this layer's mid-turn
    // switch presentation already has, not something this fix changes.
    expect(lines).toContainEqual([`Foe ${field.opponent.name}’s INTIMIDATE`, `cuts ${field.player.name}’s ATTACK!`]);
  });

  it("STRINGID_PREVENTEDFROMWORKING resolves the blocking ability holder and Intimidate's own holder", () => {
    const config = intimidateSwitchConfig(29 /* ABILITY_CLEAR_BODY */);
    const { messageIds, lines, field } = runFullTurn(
      config,
      AT(0),
      { kind: "switch", partyIndex: 1 },
    );
    expect(messageIds).toContain("STRINGID_PREVENTEDFROMWORKING");
    expect(lines).toContainEqual([
      `${field.player.name}’s CLEAR BODY`,
      `prevented Foe ${field.opponent.name}’s`,
      "INTIMIDATE from working!",
    ]);
  });
});

describe("presentation-string ISSUES #72 batch 2 -- ability-blocks-the-move's-own-effect cluster", () => {
  it("STRINGID_PKMNSXPREVENTSFLINCHING resolves the flinch-immune target and Inner Focus (real 2-turn switch-in-then-Fake-Out sequence, MOVE_EFFECT_CERTAIN's only carrier)", () => {
    // EFFECT_FAKE_OUT's own `jumpifnotfirstturn` gate (battleScriptJumpifnotfirstturnOpcode.ts)
    // means Fake Out only succeeds with isFirstTurn !== 0 -- this full-turn
    // reducer's initial battler construction hardcodes isFirstTurn: 0
    // (factoryBattleScriptFullTurnDecision.ts:478, no config override exists),
    // but a real switch-in (createSwitchindataupdateOpcodeHandler) sets it to
    // 2 (battleScriptSwitchinOpcode.ts:482), so a genuine switch-then-attack
    // 2-turn sequence stages it without any staging shortcut.
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: statusedTargetConfig({ ability: 39 /* ABILITY_INNER_FOCUS */ }),
      trainer: {
        species: SPECIES_WOBBUFFET, moveId: SPLASH,
        attack: 60, defense: 60, spAttack: 60, spDefense: 90, speed: 1, hp: 200,
      },
      trainerBenchHp: [200, 0] as [number, number],
      trainerBenchOverride: [{
        species: SPECIES_MURKROW, abilityNum: 0, moves: [FAKE_OUT, 0, 0, 0], pp: [5, 0, 0, 0],
        maxHP: 190, attack: 60, defense: 60, speed: 91, spAttack: 85, spDefense: 60,
      }, undefined] as FactoryFullTurnConfig["trainerBenchOverride"],
    });
    const initial = createFactoryFullTurnBattleState(config);
    if (initial.boundary.kind !== "decision-required") throw new Error("expected player boundary");
    const t1p = submitFactoryFullTurnDecision(initial, {
      requestId: 1, side: "player", decision: AT(0),
    });
    if (t1p.kind !== "decision-required") throw new Error("expected trainer boundary");
    const t1t = submitFactoryFullTurnDecision(t1p.state, {
      requestId: 2, side: "trainer", decision: { kind: "switch", partyIndex: 1 },
    });
    if (t1t.kind !== "decision-required") throw new Error("expected turn-2 player boundary");
    expect(t1t.state.rules.rulesContext.battlers[1]!.isFirstTurn).toBe(2);

    const t2p = submitFactoryFullTurnDecision(t1t.state, {
      requestId: 3, side: "player", decision: AT(0),
    });
    if (t2p.kind !== "decision-required") throw new Error("expected turn-2 trainer boundary");
    const t2t = submitFactoryFullTurnDecision(t2p.state, {
      requestId: 4, side: "trainer", decision: AT(0),
    });

    const command = createBattleCommandPresentation(
      t1t.nextRequest as BattleCommandRequest,
      t1t.state.rules.rulesContext,
      0,
    );
    const resolution = createBattleResolutionPresentation({
      sourceRequest: t1t.nextRequest as BattleCommandRequest,
      sourceDecision: AT(0),
      beforeRules: t1t.state.rules,
      transition: t2t,
      fieldBoundary: command.field,
      confirmHandoff: {
        fightDisplayCursor: command.fightDisplayCursor,
        idleBounceElapsed: command.idleBounceElapsed,
      },
      opponentTrainer: Object.freeze({ className: "COOLTRAINER", name: "REY" }),
    });
    const messageIds = t2t.events
      .filter((event) => event.payload.kind === "message")
      .map((event) => (event.payload as { messageId: string }).messageId);
    const lines = resolution.segments
      .flatMap((segment) => segment.commands)
      .filter((cmd): cmd is Extract<typeof cmd, { type: "message" }> => cmd.type === "message")
      .map((cmd) => cmd.lines);
    expect(messageIds).toContain("STRINGID_PKMNSXPREVENTSFLINCHING");
    expect(lines).toContainEqual([`${command.field.player.name}’s INNER FOCUS`, "prevents flinching!"]);
  });

  it("STRINGID_PKMNSXPREVENTSYLOSS resolves the stat-loss-immune target, Hyper Cutter, and ATTACK", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: statusedTargetConfig({ ability: 52 /* ABILITY_HYPER_CUTTER */ }),
      trainer: ATTACKER(GROWL),
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(0), AT(0));
    expect(messageIds).toContain("STRINGID_PKMNSXPREVENTSYLOSS");
    expect(lines).toContainEqual([`${field.player.name}’s HYPER CUTTER`, "prevents ATTACK loss!"]);
  });

  it("STRINGID_PKMNPREVENTSUSAGE resolves the Damp holder, Damp, the attacker, and the blocked move", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: statusedTargetConfig({ ability: 6 /* ABILITY_DAMP */ }),
      trainer: ATTACKER(SELFDESTRUCT),
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(0), AT(0));
    expect(messageIds).toContain("STRINGID_PKMNPREVENTSUSAGE");
    expect(lines).toContainEqual([
      `${field.player.name}’s DAMP`,
      `prevents Foe ${field.opponent.name}`,
      "from using SELFDESTRUCT!",
    ]);
  });

  it("STRINGID_PKMNRESTOREDHPUSING resolves the Volt Absorb target healing from below-full HP", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: statusedTargetConfig({ ability: 10 /* ABILITY_VOLT_ABSORB */, hp: 100, maxHp: 200 }),
      trainer: ATTACKER(THUNDERSHOCK),
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(0), AT(0));
    expect(messageIds).toContain("STRINGID_PKMNRESTOREDHPUSING");
    expect(lines).toContainEqual([`${field.player.name} restored HP`, "using its VOLT ABSORB!"]);
  });

  it("STRINGID_PKMNSXMADEYUSELESS resolves the Volt Absorb target at full HP and the blocked move", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: statusedTargetConfig({ ability: 10 /* ABILITY_VOLT_ABSORB */, hp: 200, maxHp: 200 }),
      trainer: ATTACKER(THUNDERSHOCK),
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(0), AT(0));
    expect(messageIds).toContain("STRINGID_PKMNSXMADEYUSELESS");
    expect(lines).toContainEqual([`${field.player.name}’s VOLT ABSORB`, "made THUNDERSHOCK useless!"]);
  });
});

describe("presentation-string ISSUES #72 batch 2 -- end-of-turn side-status wear-off", () => {
  it("STRINGID_PKMNSXWOREOFF resolves the affected side's own Ally/Foe prefix and Reflect's own name", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: statusedTargetConfig(),
      trainer: ATTACKER(SPLASH),
    });
    const initial = createFactoryFullTurnBattleState(config);
    if (initial.boundary.kind !== "decision-required") throw new Error("expected player boundary");
    const rc = initial.rules.rulesContext;
    const staged = Object.freeze({
      ...initial,
      rules: Object.freeze({
        ...initial.rules,
        rulesContext: Object.freeze({
          ...rc,
          sideStatuses: Object.freeze([1 /* SIDE_STATUS_REFLECT */, 0]) as readonly [number, number],
          sideTimers: Object.freeze([
            Object.freeze({ ...rc.sideTimers[0], reflectTimer: 1, reflectBattlerId: 0 as const }),
            rc.sideTimers[1],
          ]) as readonly [typeof rc.sideTimers[0], typeof rc.sideTimers[1]],
        }),
      }),
    });
    if (staged.boundary.kind !== "decision-required") throw new Error("expected player boundary");
    const afterPlayer = submitFactoryFullTurnDecision(staged, {
      requestId: 1, side: "player", decision: AT(0),
    });
    if (afterPlayer.kind !== "decision-required") throw new Error("expected trainer boundary");
    const transition = submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 2, side: "trainer", decision: AT(1),
    });
    const messageIds = transition.events
      .filter((event) => event.payload.kind === "message")
      .map((event) => (event.payload as { messageId: string }).messageId);
    expect(messageIds).toContain("STRINGID_PKMNSXWOREOFF");

    const command = createBattleCommandPresentation(
      staged.boundary.request as BattleCommandRequest,
      staged.rules.rulesContext,
      0,
    );
    const resolution = createBattleResolutionPresentation({
      sourceRequest: staged.boundary.request as BattleCommandRequest,
      sourceDecision: AT(0),
      beforeRules: staged.rules,
      transition,
      fieldBoundary: command.field,
      confirmHandoff: {
        fightDisplayCursor: command.fightDisplayCursor,
        idleBounceElapsed: command.idleBounceElapsed,
      },
      opponentTrainer: Object.freeze({ className: "COOLTRAINER", name: "REY" }),
    });
    const lines = resolution.segments
      .flatMap((segment) => segment.commands)
      .filter((cmd): cmd is Extract<typeof cmd, { type: "message" }> => cmd.type === "message")
      .map((cmd) => cmd.lines);
    expect(lines).toContainEqual(["Ally’s REFLECT", "wore off!"]);
  });
});
