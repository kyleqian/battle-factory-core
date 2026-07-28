import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";

const program = loadBattleScriptProgram();
const MOVE_COVET = 343;
const MOVE_KNOCK_OFF = 282;
const ITEM_NONE = 0;
const ITEM_ORANGE_MAIL = 121;
const ITEM_ENIGMA_BERRY = 175;
const ITEM_CHOICE_BAND = 186;
const ITEM_LEFTOVERS = 200;
const ABILITY_STICKY_HOLD = 60;
const BATTLE_TYPE_TRAINER = 1 << 3;
const BATTLE_TYPE_FACTORY = 1 << 19;
const FACTORY_TRAINER = BATTLE_TYPE_TRAINER | BATTLE_TYPE_FACTORY;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    item: changes.item ?? ITEM_NONE,
    hp: changes.hp ?? 200,
    maxHP: changes.maxHP ?? 200,
    moves: changes.moves ?? ([0, 0, 0, 0] as const),
    pp: changes.pp ?? ([10, 0, 0, 0] as const),
    status1: changes.status1 ?? 0,
    status2: changes.status2 ?? 0,
    status3: changes.status3 ?? 0,
    substituteHP: changes.substituteHP ?? 0,
    rolloutTimer: changes.rolloutTimer ?? 0,
    furyCutterCounter: changes.furyCutterCounter ?? 0,
    truantCounter: changes.truantCounter ?? 0,
    rechargeTimer: changes.rechargeTimer ?? 0,
    flinchImmobility: changes.flinchImmobility ?? 0,
    disabledMove: changes.disabledMove ?? 0,
    usedDisabledMove: changes.usedDisabledMove ?? 0,
    tauntTimer: changes.tauntTimer ?? 0,
    usedTauntedMove: changes.usedTauntedMove ?? 0,
    usedImprisonedMove: changes.usedImprisonedMove ?? 0,
    attack: changes.attack ?? 100,
    defense: changes.defense ?? 100,
    spAttack: changes.spAttack ?? 100,
    spDefense: changes.spDefense ?? 100,
    speed: changes.speed ?? 100,
    level: changes.level ?? 50,
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    partyIndex: changes.partyIndex ?? 0,
  });
}

function rules(
  move: number,
  target: Partial<BattleScriptRulesBattler> = {},
  changes: Partial<BattleScriptRulesContextInput> = {},
  attacker: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesContext {
  const attackerState = battler({
    moves: [move, 0, 0, 0],
    pp: [10, 0, 0, 0],
    ...attacker,
  });
  const targetState = battler({ side: 1, ...target });
  return createBattleScriptRulesContext({
    battlers: [
      attackerState,
      targetState,
      battler({ side: 0, hp: 0 }),
      battler({ side: 1, hp: 0 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1, fainted: null },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: move,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags: FACTORY_TRAINER,
      battlerPositions: [0, 1, 2, 3],
    },
    party: {
      player: [
        {
          species: 264,
          hp: attackerState.hp,
          item: attackerState.item,
          moves: attackerState.moves,
          pp: attackerState.pp,
        },
        {}, {}, {}, {}, {},
      ],
      opponent: [
        {
          species: 213,
          hp: targetState.hp,
          item: targetState.item,
          moves: targetState.moves,
          pp: targetState.pp,
        },
        {}, {}, {}, {}, {},
      ],
    },
    ...changes,
  });
}

function ports(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: () => true,
    prepareMessage: (_context, operand) => operand.expression.startsWith("STRINGID_")
      ? Object.freeze({
          kind: "message" as const,
          messageId: operand.expression,
          substitutions: Object.freeze([]),
        })
      : null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => 0 as const,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_context, operand) =>
      operand.expression.startsWith("B_WAIT_TIME_") ? 1 : null,
    resolveByteOperand: () => null,
  });
}

function acknowledge(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptMachineState<BattleScriptRulesContext> {
  let next = state;
  for (const battlerId of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, battlerId);
  }
  return next;
}

function run(entry: string, source: BattleScriptRulesContext, seed = 7) {
  const execution = createBattleScriptStatusRulesExecution(program, entry, source, seed, ports());
  let state = execution.state;
  for (let guard = 0; guard < 1000; guard += 1) {
    const result = stepBattleScriptMachine(program, state, execution.handlers);
    if (result.kind === "halted") return result.state;
    expect(result.kind).not.toBe("unsupported");
    state = result.kind === "blocked" ? acknowledge(result.state) : result.state;
  }
  throw new Error(`${entry} did not terminate`);
}

function messages(state: BattleScriptMachineState<BattleScriptRulesContext>): string[] {
  return state.events.flatMap((event) => event.kind === "message" ? [event.messageId] : []);
}

describe("Family-B Cluster 4 Thief/Covet and Knock Off", () => {
  it("walks Covet to END and transfers both active and persistent party ownership", () => {
    const result = run(
      "BattleScript_EffectThief",
      rules(MOVE_COVET, { item: ITEM_LEFTOVERS }),
    );
    expect(result.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(result.rulesContext.battlers[0].item).toBe(ITEM_LEFTOVERS);
    expect(result.rulesContext.battlers[1].item).toBe(ITEM_NONE);
    expect(result.rulesContext.party.player[0].item).toBe(ITEM_LEFTOVERS);
    expect(result.rulesContext.party.opponent[0].item).toBe(ITEM_NONE);
    expect(result.rulesContext.lastUsedItem).toBe(ITEM_LEFTOVERS);
    expect(result.rulesContext.changedItems).toEqual([0, 0, 0, 0]);
    expect(messages(result)).toContain("STRINGID_PKMNSTOLEITEM");
  });

  it("Sticky Hold blocks Covet ownership while damage and PP processing proceed", () => {
    const source = rules(MOVE_COVET, {
      ability: ABILITY_STICKY_HOLD,
      item: ITEM_CHOICE_BAND,
    });
    const result = run("BattleScript_EffectThief", source);
    expect(result.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(result.rulesContext.battlers[0].pp[0]).toBe(9);
    expect(result.rulesContext.battlers[1].hp).toBeLessThan(source.battlers[1].hp);
    expect(result.rulesContext.battlers[0].item).toBe(ITEM_NONE);
    expect(result.rulesContext.battlers[1].item).toBe(ITEM_CHOICE_BAND);
    expect(result.rulesContext.party.opponent[0].item).toBe(ITEM_CHOICE_BAND);
    expect(result.rulesContext.lastUsedAbility).toBe(ABILITY_STICKY_HOLD);
    expect(messages(result)).toContain("STRINGID_PKMNSXMADEYINEFFECTIVE");
  });

  it.each([
    ["occupied attacker", { attacker: { item: ITEM_CHOICE_BAND }, target: { item: ITEM_LEFTOVERS } }],
    ["empty target", { attacker: {}, target: { item: ITEM_NONE } }],
    ["target Enigma Berry", { attacker: {}, target: { item: ITEM_ENIGMA_BERRY } }],
    ["target Mail", { attacker: {}, target: { item: ITEM_ORANGE_MAIL } }],
  ] as const)("Covet %s is an ownership no-op after the damaging hit", (_name, fixture) => {
    const source = rules(MOVE_COVET, fixture.target, {}, fixture.attacker);
    const result = run("BattleScript_EffectThief", source);
    expect(result.rulesContext.battlers[0].item).toBe(source.battlers[0].item);
    expect(result.rulesContext.battlers[1].item).toBe(source.battlers[1].item);
    expect(result.rulesContext.party.player[0].item).toBe(source.party.player[0].item);
    expect(result.rulesContext.party.opponent[0].item).toBe(source.party.opponent[0].item);
  });

  it("Covet still steals after its damage reduces the target to zero HP", () => {
    const result = run(
      "BattleScript_EffectThief",
      rules(MOVE_COVET, { hp: 1, maxHP: 200, item: ITEM_LEFTOVERS }),
    );
    expect(result.rulesContext.battlers[1].hp).toBe(0);
    expect(result.rulesContext.battlers[0].item).toBe(ITEM_LEFTOVERS);
    expect(result.rulesContext.party.player[0].item).toBe(ITEM_LEFTOVERS);
    expect(result.rulesContext.party.opponent[0].item).toBe(ITEM_NONE);
  });

  it("a knocked-off attacker cannot steal in an ordinary battle but may steal in the Factory", () => {
    const ordinary = rules(
      MOVE_COVET,
      { item: ITEM_LEFTOVERS },
      {
        knockedOffMons: [1, 0],
        battleTopology: {
          battlersCount: 2,
          battleTypeFlags: BATTLE_TYPE_TRAINER,
          battlerPositions: [0, 1, 2, 3],
        },
      },
    );
    const factory = rules(
      MOVE_COVET,
      { item: ITEM_LEFTOVERS },
      { knockedOffMons: [1, 0] },
    );
    expect(run("BattleScript_EffectThief", ordinary).rulesContext.battlers[0].item).toBe(ITEM_NONE);
    expect(run("BattleScript_EffectThief", factory).rulesContext.battlers[0].item).toBe(ITEM_LEFTOVERS);
  });

  it("walks Knock Off to END, clears only the active item, and records the party-slot bit", () => {
    const result = run(
      "BattleScript_EffectKnockOff",
      rules(
        MOVE_KNOCK_OFF,
        { item: ITEM_LEFTOVERS },
        { choicedMove: [0, MOVE_KNOCK_OFF, 0, 0] },
      ),
    );
    expect(result.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(result.rulesContext.battlers[1].item).toBe(ITEM_NONE);
    expect(result.rulesContext.party.opponent[0].item).toBe(ITEM_LEFTOVERS);
    expect(result.rulesContext.knockedOffMons).toEqual([0, 1]);
    expect(result.rulesContext.lastUsedItem).toBe(ITEM_LEFTOVERS);
    expect(result.rulesContext.choicedMove[1]).toBe(0);
    expect(messages(result)).toContain("STRINGID_PKMNKNOCKEDOFF");
  });

  it("Sticky Hold blocks Knock Off, preserves both item records, and exits through MoveEnd", () => {
    const result = run(
      "BattleScript_EffectKnockOff",
      rules(MOVE_KNOCK_OFF, {
        ability: ABILITY_STICKY_HOLD,
        item: ITEM_LEFTOVERS,
      }),
    );
    expect(result.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(result.rulesContext.battlers[1].item).toBe(ITEM_LEFTOVERS);
    expect(result.rulesContext.party.opponent[0].item).toBe(ITEM_LEFTOVERS);
    expect(result.rulesContext.knockedOffMons).toEqual([0, 0]);
    expect(result.rulesContext.lastUsedAbility).toBe(ABILITY_STICKY_HOLD);
    expect(messages(result)).toContain("STRINGID_PKMNSXMADEYINEFFECTIVE");
  });

  it("Knock Off against no item is a no-op after damage and does not set a party-slot bit", () => {
    const source = rules(MOVE_KNOCK_OFF);
    const result = run("BattleScript_EffectKnockOff", source);
    expect(result.rulesContext.battlers[1].hp).toBeLessThan(source.battlers[1].hp);
    expect(result.rulesContext.battlers[1].item).toBe(ITEM_NONE);
    expect(result.rulesContext.knockedOffMons).toEqual([0, 0]);
    expect(messages(result)).not.toContain("STRINGID_PKMNKNOCKEDOFF");
  });

  it("replays canonically with exact standard damaging-effect RNG ledgers", () => {
    const covet = rules(MOVE_COVET, { item: ITEM_LEFTOVERS });
    const knockOff = rules(MOVE_KNOCK_OFF, { item: ITEM_LEFTOVERS });
    expect(run("BattleScript_EffectThief", covet, 0x1234)).toEqual(
      run("BattleScript_EffectThief", covet, 0x1234),
    );
    expect(run("BattleScript_EffectKnockOff", knockOff, 0x1234)).toEqual(
      run("BattleScript_EffectKnockOff", knockOff, 0x1234),
    );
    expect(run("BattleScript_EffectThief", covet, 0x1234).rng.calls).toBe(4);
    expect(run("BattleScript_EffectKnockOff", knockOff, 0x1234).rng.calls).toBe(4);
  });
});
