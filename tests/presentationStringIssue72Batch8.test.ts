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
 * ISSUES #72 batch 8 (docs/issue72-hard-tail-scout.md): the REACHABLE-10
 * hard tail -- Sturdy vs. OHKO (deterministic, not RNG-gated per the
 * scout's own correction), Sand Stream (kernel unblocked by the end3
 * push/pop resumption, PROGRESS 910), Perish Song vs. Soundproof, Destiny
 * Bond + Grudge (both structurally require the plain attacker/defender
 * pair -- the scout's own general proof, docs/issue72-hard-tail-scout.md
 * §1b), Recover's self-heal (the cheapest STRINGID_PKMNREGAINEDHEALTH
 * label), and Focus Band's empirically re-verified rngSeed 62 staging.
 * Each `it` red-verifies via `git stash -- src/engine/battleResolutionPresentation.ts
 * src/engine/factoryBattleScriptFullTurnDecision.ts` (throws the exact
 * completeness-guard error pre-fix).
 */

const SPLASH = 150;
const GUILLOTINE = 12;
const PERISH_SONG = 195;
const RECOVER = 105;
const DESTINY_BOND = 194;
const GRUDGE = 288;
const THUNDERSHOCK = 84;
const TACKLE = 33;

const SPECIES_WOBBUFFET = 202; // pure Psychic -- arbitrary neutral filler.
const SPECIES_MURKROW = 198; // Dark/Flying, arbitrary neutral filler.
const SPECIES_TYRANITAR = 248; // real ABILITY_SAND_STREAM slot-0 carrier.

const ABILITY_STURDY = 5; // real carriers: Aron/Nosepass/Forretress/Donphan/Shuckle/Aggron lines (L50).
const ABILITY_SOUNDPROOF = 43; // real carriers: Loudred/Exploud/Electrode/Mr. Mime lines (L50).

const ITEM_FOCUS_BAND = 196;

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

describe("presentation-string ISSUES #72 batch 8 -- Sturdy vs. OHKO", () => {
  it("STRINGID_PKMNPROTECTEDBY resolves the Sturdy holder's own name/ability (real Guillotine vs. Sturdy, deterministic)", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: statusedTargetConfig({ ability: ABILITY_STURDY }),
      trainer: ATTACKER(GUILLOTINE),
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(0), AT(0));
    expect(messageIds).toContain("STRINGID_PKMNPROTECTEDBY");
    expect(lines).toContainEqual([`${field.player.name} was protected`, "by STURDY!"]);
  });
});

describe("presentation-string ISSUES #72 batch 8 -- Sand Stream switch-in", () => {
  it("STRINGID_PKMNSXWHIPPEDUPSANDSTORM resolves the switching-in Tyranitar's own name/ability (real switch-in, end3 resumption unblocked)", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: {
        species: SPECIES_WOBBUFFET, moveId: SPLASH,
        attack: 100, defense: 100, spAttack: 100, spDefense: 100, speed: 200, hp: 300,
      },
      trainer: {
        species: SPECIES_WOBBUFFET, moveId: SPLASH,
        attack: 100, defense: 100, spAttack: 100, spDefense: 100, speed: 1, hp: 300,
      },
      trainerBenchHp: [200, 0] as [number, number],
      trainerBenchOverride: [{
        species: SPECIES_TYRANITAR, abilityNum: 0, moves: [SPLASH, 0, 0, 0],
        maxHP: 200, attack: 80, defense: 200, speed: 50,
        spAttack: 40, spDefense: 100,
      }, undefined] as FactoryFullTurnConfig["trainerBenchOverride"],
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(0), { kind: "switch", partyIndex: 1 });
    expect(messageIds).toContain("STRINGID_PKMNSXWHIPPEDUPSANDSTORM");
    expect(lines).toContainEqual([`Foe ${field.opponent.name}’s SAND STREAM`, "whipped up a sandstorm!"]);
  });
});

describe("presentation-string ISSUES #72 batch 8 -- Perish Song vs. Soundproof", () => {
  it("STRINGID_PKMNSXBLOCKSY2 resolves the Soundproof holder's own name/ability and the blocked move (real single-turn Perish Song cast)", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: statusedTargetConfig({ ability: ABILITY_SOUNDPROOF }),
      trainer: ATTACKER(PERISH_SONG),
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(0), AT(1));
    expect(messageIds).toContain("STRINGID_PKMNSXBLOCKSY2");
    expect(lines).toContainEqual([`${field.player.name}’s SOUNDPROOF`, "blocks PERISH SONG!"]);
  });
});

describe("presentation-string ISSUES #72 batch 8 -- Destiny Bond + Grudge", () => {
  function faintingConfig(casterMoveId: number): FactoryFullTurnConfig {
    return Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: {
        species: SPECIES_WOBBUFFET, moveId: SPLASH,
        moves: [SPLASH, THUNDERSHOCK, 0, 0] as [number, number, number, number],
        attack: 60, defense: 60, spAttack: 60, spDefense: 90, speed: 200, hp: 200, maxHp: 200,
      },
      trainer: {
        species: SPECIES_MURKROW, moveId: casterMoveId,
        moves: [casterMoveId, SPLASH, 0, 0] as [number, number, number, number],
        attack: 60, defense: 60, spAttack: 30, spDefense: 60, speed: 1, hp: 1, maxHp: 190,
      },
    });
  }

  it("STRINGID_PKMNTOOKFOE resolves the plain attacker/defender pair (real 2-turn Destiny Bond cast-then-counter-kill, player faster)", () => {
    const config = faintingConfig(DESTINY_BOND);
    const initial = createFactoryFullTurnBattleState(config);
    if (initial.boundary.kind !== "decision-required") throw new Error("expected player boundary");
    const t1p = submitFactoryFullTurnDecision(initial, { requestId: 1, side: "player", decision: AT(0) });
    if (t1p.kind !== "decision-required") throw new Error("expected trainer boundary");
    const t1t = submitFactoryFullTurnDecision(t1p.state, { requestId: 2, side: "trainer", decision: AT(1) });
    if (t1t.kind !== "decision-required") throw new Error("expected turn-2 player boundary");

    const t2decision: BattleCommandDecision = Object.freeze({ kind: "use-move", moveSlot: 1, targetBattler: 1 });
    const t2p = submitFactoryFullTurnDecision(t1t.state, { requestId: 3, side: "player", decision: t2decision });
    if (t2p.kind !== "decision-required") throw new Error("expected turn-2 trainer boundary");
    const t2t = submitFactoryFullTurnDecision(t2p.state, { requestId: 4, side: "trainer", decision: AT(1) });

    const command = createBattleCommandPresentation(t1t.nextRequest as BattleCommandRequest, t1t.state.rules.rulesContext, 1);
    const resolution = createBattleResolutionPresentation({
      sourceRequest: t1t.nextRequest as BattleCommandRequest,
      sourceDecision: t2decision,
      beforeRules: t1t.state.rules,
      transition: t2t,
      fieldBoundary: command.field,
      confirmHandoff: { fightDisplayCursor: command.fightDisplayCursor, idleBounceElapsed: command.idleBounceElapsed },
      opponentTrainer: Object.freeze({ className: "COOLTRAINER", name: "REY", speechLose: ["", ""] as const, speechWin: ["", ""] as const }),
    });
    const messageIds = t2t.events
      .filter((event) => event.payload.kind === "message")
      .map((event) => (event.payload as { messageId: string }).messageId);
    const lines = resolution.segments
      .flatMap((segment) => segment.commands)
      .filter((cmd): cmd is Extract<typeof cmd, { type: "message" }> => cmd.type === "message")
      .map((cmd) => cmd.lines);
    expect(messageIds).toContain("STRINGID_PKMNTOOKFOE");
    expect(lines).toContainEqual([`Foe ${command.field.opponent.name} took`, `${command.field.player.name} with it!`]);
  });

  it("STRINGID_PKMNLOSTPPGRUDGE resolves the killing battler's own name and its own just-used move (real 2-turn Grudge cast-then-counter-kill, player faster)", () => {
    const config = faintingConfig(GRUDGE);
    const initial = createFactoryFullTurnBattleState(config);
    if (initial.boundary.kind !== "decision-required") throw new Error("expected player boundary");
    const t1p = submitFactoryFullTurnDecision(initial, { requestId: 1, side: "player", decision: AT(0) });
    if (t1p.kind !== "decision-required") throw new Error("expected trainer boundary");
    const t1t = submitFactoryFullTurnDecision(t1p.state, { requestId: 2, side: "trainer", decision: AT(1) });
    if (t1t.kind !== "decision-required") throw new Error("expected turn-2 player boundary");

    const t2decision: BattleCommandDecision = Object.freeze({ kind: "use-move", moveSlot: 1, targetBattler: 1 });
    const t2p = submitFactoryFullTurnDecision(t1t.state, { requestId: 3, side: "player", decision: t2decision });
    if (t2p.kind !== "decision-required") throw new Error("expected turn-2 trainer boundary");
    const t2t = submitFactoryFullTurnDecision(t2p.state, { requestId: 4, side: "trainer", decision: AT(1) });

    const command = createBattleCommandPresentation(t1t.nextRequest as BattleCommandRequest, t1t.state.rules.rulesContext, 1);
    const resolution = createBattleResolutionPresentation({
      sourceRequest: t1t.nextRequest as BattleCommandRequest,
      sourceDecision: t2decision,
      beforeRules: t1t.state.rules,
      transition: t2t,
      fieldBoundary: command.field,
      confirmHandoff: { fightDisplayCursor: command.fightDisplayCursor, idleBounceElapsed: command.idleBounceElapsed },
      opponentTrainer: Object.freeze({ className: "COOLTRAINER", name: "REY", speechLose: ["", ""] as const }),
    });
    const messageIds = t2t.events
      .filter((event) => event.payload.kind === "message")
      .map((event) => (event.payload as { messageId: string }).messageId);
    const lines = resolution.segments
      .flatMap((segment) => segment.commands)
      .filter((cmd): cmd is Extract<typeof cmd, { type: "message" }> => cmd.type === "message")
      .map((cmd) => cmd.lines);
    expect(messageIds).toContain("STRINGID_PKMNLOSTPPGRUDGE");
    expect(lines).toContainEqual([`${command.field.player.name}’s THUNDERSHOCK lost`, "all its PP due to the GRUDGE!"]);
  });
});

describe("presentation-string ISSUES #72 batch 8 -- Recover's self-heal", () => {
  it("STRINGID_PKMNREGAINEDHEALTH resolves the caster's own name (real Recover, the cheapest self-heal label)", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: statusedTargetConfig({ moveId: RECOVER, hp: 100, maxHp: 200 }),
      trainer: ATTACKER(SPLASH),
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(0), AT(1));
    expect(messageIds).toContain("STRINGID_PKMNREGAINEDHEALTH");
    expect(lines).toContainEqual([`${field.player.name} regained`, "health!"]);
  });
});

describe("presentation-string ISSUES #72 batch 8 -- Focus Band", () => {
  it("STRINGID_PKMNHUNGONWITHX resolves the holder's own name and its own item (real 1/10 proc, rngSeed 62 empirically re-verified)", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 62,
      player: {
        species: SPECIES_WOBBUFFET, moveId: TACKLE, item: ITEM_FOCUS_BAND,
        attack: 60, defense: 60, spAttack: 60, spDefense: 60, speed: 1, hp: 1, maxHp: 200,
      },
      trainer: {
        species: SPECIES_MURKROW, moveId: TACKLE,
        attack: 200, defense: 60, spAttack: 60, spDefense: 60, speed: 91, hp: 190, maxHp: 190,
      },
    });
    const { messageIds, lines, field } = runFullTurn(config, AT(1), AT(0));
    expect(messageIds).toContain("STRINGID_PKMNHUNGONWITHX");
    expect(lines).toContainEqual([`${field.player.name} hung on`, "using its FOCUS BAND!"]);
  });
});

describe("presentation-string ISSUES #72 batch 8 -- Safeguard expiry", () => {
  it("STRINGID_PKMNSAFEGUARDEXPIRED resolves the caster's own side's Ally/Foe prefix (real 5-turn expiry: cast turn 1, silent decrements turns 1-4, fires at end of turn 5)", () => {
    const SAFEGUARD = 219;
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: statusedTargetConfig({ moveId: SAFEGUARD, moves: [SAFEGUARD, SPLASH, 0, 0] as [number, number, number, number] }),
      trainer: ATTACKER(SPLASH),
    });
    const initial = createFactoryFullTurnBattleState(config);
    if (initial.boundary.kind !== "decision-required") throw new Error("expected player boundary");

    const useSplash: BattleCommandDecision = Object.freeze({ kind: "use-move", moveSlot: 1, targetBattler: 0 });
    let state = initial;
    let requestId = 1;
    // Turn 1: cast Safeguard (safeguardTimer 5 -> 4 at this turn's own end-turn tick).
    let afterPlayer = submitFactoryFullTurnDecision(state, { requestId, side: "player", decision: AT(0) });
    if (afterPlayer.kind !== "decision-required") throw new Error("expected trainer boundary");
    requestId += 1;
    let transition = submitFactoryFullTurnDecision(afterPlayer.state, { requestId, side: "trainer", decision: AT(1) });
    if (transition.kind !== "decision-required") throw new Error("expected turn-2 player boundary");
    let lastPlayerRequest = state.boundary.kind === "decision-required" ? state.boundary.request : null;
    let lastPlayerDecision: BattleCommandDecision = AT(0);
    let lastRules = state.rules;

    // Turns 2-5: Splash both sides -- turn 5's own end-turn tick decrements
    // 1 -> 0 and fires BattleScript_SafeguardEnds.
    for (let turn = 2; turn <= 5; turn += 1) {
      if (transition.kind !== "decision-required") throw new Error(`expected turn-${turn} player boundary`);
      lastPlayerRequest = transition.nextRequest as BattleCommandRequest;
      lastPlayerDecision = useSplash;
      lastRules = transition.state.rules;
      requestId += 1;
      afterPlayer = submitFactoryFullTurnDecision(transition.state, { requestId, side: "player", decision: useSplash });
      if (afterPlayer.kind !== "decision-required") throw new Error(`expected turn-${turn} trainer boundary`);
      requestId += 1;
      transition = submitFactoryFullTurnDecision(afterPlayer.state, { requestId, side: "trainer", decision: AT(1) });
    }

    const command = createBattleCommandPresentation(lastPlayerRequest as BattleCommandRequest, lastRules.rulesContext, 1);
    const resolution = createBattleResolutionPresentation({
      sourceRequest: lastPlayerRequest as BattleCommandRequest,
      sourceDecision: lastPlayerDecision,
      beforeRules: lastRules,
      transition,
      fieldBoundary: command.field,
      confirmHandoff: { fightDisplayCursor: command.fightDisplayCursor, idleBounceElapsed: command.idleBounceElapsed },
      opponentTrainer: Object.freeze({ className: "COOLTRAINER", name: "REY", speechLose: ["", ""] as const }),
    });
    const messageIds = transition.events
      .filter((event) => event.payload.kind === "message")
      .map((event) => (event.payload as { messageId: string }).messageId);
    const lines = resolution.segments
      .flatMap((segment) => segment.commands)
      .filter((cmd): cmd is Extract<typeof cmd, { type: "message" }> => cmd.type === "message")
      .map((cmd) => cmd.lines);
    expect(messageIds).toContain("STRINGID_PKMNSAFEGUARDEXPIRED");
    expect(lines).toContainEqual(["Ally’s party is no longer", "protected by SAFEGUARD!"]);
  });
});

describe("presentation-string ISSUES #72 batch 8 -- Future Sight delayed hit", () => {
  it("STRINGID_PKMNTOOKATTACK resolves the recipient's own name and the delayed move's own name (real 3-turn Future Sight cast-then-resolve)", () => {
    const FUTURE_SIGHT = 248;
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: {
        species: SPECIES_WOBBUFFET, moveId: FUTURE_SIGHT,
        moves: [FUTURE_SIGHT, SPLASH, 0, 0] as [number, number, number, number],
        attack: 60, defense: 60, spAttack: 60, spDefense: 90, speed: 60, hp: 200, maxHp: 200,
      },
      trainer: {
        species: SPECIES_MURKROW, moveId: SPLASH,
        attack: 60, defense: 60, spAttack: 85, spDefense: 60, speed: 91, hp: 400, maxHp: 400,
      },
    });
    const initial = createFactoryFullTurnBattleState(config);
    if (initial.boundary.kind !== "decision-required") throw new Error("expected player boundary");
    const useSplash: BattleCommandDecision = Object.freeze({ kind: "use-move", moveSlot: 1, targetBattler: 0 });

    // Turn 1: cast Future Sight (futureSightCounter[1] set to 3).
    const t1p = submitFactoryFullTurnDecision(initial, { requestId: 1, side: "player", decision: AT(1) });
    if (t1p.kind !== "decision-required") throw new Error("expected turn-1 trainer boundary");
    const t1t = submitFactoryFullTurnDecision(t1p.state, { requestId: 2, side: "trainer", decision: AT(1) });
    if (t1t.kind !== "decision-required") throw new Error("expected turn-2 player boundary");

    // Turn 2: filler Splash both sides (counter 3 -> 2, silent).
    const t2p = submitFactoryFullTurnDecision(t1t.state, { requestId: 3, side: "player", decision: useSplash });
    if (t2p.kind !== "decision-required") throw new Error("expected turn-2 trainer boundary");
    const t2t = submitFactoryFullTurnDecision(t2p.state, { requestId: 4, side: "trainer", decision: AT(1) });
    if (t2t.kind !== "decision-required") throw new Error("expected turn-3 player boundary");

    // Turn 3: filler Splash both sides -- this turn's own end-turn tick
    // decrements counter 2 -> 1... wait, needs one more turn; counter starts
    // at 3 and must reach 0 (3 total end-turn ticks after cast).
    const t3p = submitFactoryFullTurnDecision(t2t.state, { requestId: 5, side: "player", decision: useSplash });
    if (t3p.kind !== "decision-required") throw new Error("expected turn-3 trainer boundary");
    const t3t = submitFactoryFullTurnDecision(t3p.state, { requestId: 6, side: "trainer", decision: AT(1) });

    const command = createBattleCommandPresentation(t2t.nextRequest as BattleCommandRequest, t2t.state.rules.rulesContext, 1);
    const resolution = createBattleResolutionPresentation({
      sourceRequest: t2t.nextRequest as BattleCommandRequest,
      sourceDecision: useSplash,
      beforeRules: t2t.state.rules,
      transition: t3t,
      fieldBoundary: command.field,
      confirmHandoff: { fightDisplayCursor: command.fightDisplayCursor, idleBounceElapsed: command.idleBounceElapsed },
      opponentTrainer: Object.freeze({ className: "COOLTRAINER", name: "REY", speechLose: ["", ""] as const }),
    });
    const messageIds = t3t.events
      .filter((event) => event.payload.kind === "message")
      .map((event) => (event.payload as { messageId: string }).messageId);
    const lines = resolution.segments
      .flatMap((segment) => segment.commands)
      .filter((cmd): cmd is Extract<typeof cmd, { type: "message" }> => cmd.type === "message")
      .map((cmd) => cmd.lines);
    expect(messageIds).toContain("STRINGID_PKMNTOOKATTACK");
    expect(lines).toContainEqual([`Foe ${command.field.opponent.name} took the`, "FUTURE SIGHT attack!"]);
  });
});
