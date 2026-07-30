import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  createBattleScriptStatusRulesHandlers,
  type BattleScriptPartyMemberInput,
  type BattleScriptPartyState,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { stepBattleScriptMachine } from "../src/engine/battleScriptMachine.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import { runBattleEndTurnOrchestration } from "../src/engine/battleEndTurnOrchestration.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import { initializeFreshFactoryBattle } from "../src/engine/factoryBattleStart.ts";

const program = loadBattleScriptProgram();
const TACKLE = 33;
const BATON_PASS = 226;
const ITEM_WHITE_HERB = 180;
const ITEM_LUM_BERRY = 141;
const SAND_ATTACK = 28;
const PIDGEOT_SET = 355;
const ABILITY_KEEN_EYE = 51;
const STATUS2_CONFUSION_TURN_2 = 2;
const STATUS2_SUBSTITUTE = 1 << 24;
const MACHAMP_SET = 431;
const GRANBULL_SET = 376;
const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));

function corpusMember(setId: number) {
  const set = frontierMonsData.entries[setId]!;
  return createFactoryCorpusPartyMember({
    setId,
    personality: natureByName.get(set.nature)!,
    fixedIv: 31,
    abilitySlot: 0,
  });
}

function corpusParty(activeSetId: number, activeItem?: number): BattleScriptPartyState {
  const active = corpusMember(activeSetId);
  return Object.freeze([
    Object.freeze(activeItem === undefined ? active : { ...active, item: activeItem }),
    corpusMember(300),
    corpusMember(301),
    corpusMember(302),
    corpusMember(303),
    corpusMember(304),
  ]) as unknown as BattleScriptPartyState;
}

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    moves: changes.moves ?? Object.freeze([TACKLE, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([35, 0, 0, 0]),
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
    item: changes.item ?? 0,
    statStages: changes.statStages ?? [6, 6, 6, 6, 6, 6, 6, 6],
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 0,
    attack: changes.attack ?? 0,
    defense: changes.defense ?? 0,
    spAttack: changes.spAttack ?? 0,
    spDefense: changes.spDefense ?? 0,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 0,
    partyIndex: changes.partyIndex ?? 0,
  });
}

const EMPTY_SLOT: BattleScriptPartyMemberInput = { species: 0, isEgg: false, hp: 0 };
const EMPTY_PARTY = [EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT];
const recipient: BattleScriptPartyMemberInput = {
  species: 1,
  abilityNum: 0,
  ivs: { hp: 31, attack: 31, defense: 31, speed: 31, spAttack: 31, spDefense: 31 },
  personality: 0x1234_5678,
  experience: 117360,
  level: 50,
  friendship: 70,
  hp: 120,
  maxHP: 120,
  attack: 69,
  defense: 69,
  speed: 65,
  spAttack: 85,
  spDefense: 85,
  status1: 0,
  item: 0,
  moves: [TACKLE, TACKLE, TACKLE, TACKLE],
  pp: [35, 35, 35, 35],
};

function switchContext(currentMove: number): BattleScriptRulesContextInput {
  return {
    battlers: [
      battler({
        side: 0,
        species: 301,
        ability: 3,
        partyIndex: 1,
        hp: 100,
        status2: STATUS2_SUBSTITUTE,
        substituteHP: 31,
        statStages: [6, 8, 6, 6, 6, 6, 6, 6],
        types: ["TYPE_BUG", "TYPE_FLYING"],
      }),
      battler({ side: 1, species: 129, ability: 33, types: ["TYPE_WATER", "TYPE_WATER"] }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ],
    selectorRoles: { attacker: 0, target: 0, effectBattler: 0, fainted: 0 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    monToSwitchIntoId: [1, 6, 6, 6],
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags: (1 << 3) | (1 << 19),
      battlerPositions: [0, 1, 2, 3],
    },
    party: {
      player: [EMPTY_SLOT, recipient, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT],
      opponent: EMPTY_PARTY,
    },
  };
}

const ports = Object.freeze({
  isControllerIdle: () => true,
  prepareMessage: (_context, operand) =>
    operand.expression.startsWith("STRINGID_")
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
    operand.expression === "B_WAIT_TIME_LONG"
      ? 64
      : operand.expression === "B_WAIT_TIME_SHORT"
        ? 32
        : null,
  resolveByteOperand: () => null,
} satisfies BattleScriptStatusRulesExternalPorts);

function runR13StatChange(statChanger: number) {
  const rulesContext = createBattleScriptRulesContext({
    ...switchContext(SAND_ATTACK),
    battlers: [
      battler({
        side: 0,
        species: 18,
        ability: ABILITY_KEEN_EYE,
        statStages: [6, 6, 6, 6, 6, 6, 6, 6],
        types: ["TYPE_NORMAL", "TYPE_FLYING"],
      }),
      battler({ side: 1, species: 210, ability: 22 }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ],
    selectorRoles: { attacker: 1, target: 0, effectBattler: 0, fainted: 0 },
    scriptingBattler: 1,
    currentMove: SAND_ATTACK,
    statChanger,
  });
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectAccuracyDown",
    rulesContext,
    1,
    ports,
  );
  const pc = program.instructions.find(
    (instruction) =>
      instruction.opcodeName === "B_SCR_OP_STATBUFFCHANGE"
      && instruction.source.label === "BattleScript_EffectStatDown",
  )?.programCounter;
  if (pc === undefined) throw new Error("missing Sand-Attack STATBUFFCHANGE");
  const result = stepBattleScriptMachine(
    program,
    Object.freeze({ ...execution.state, programCounter: pc }),
    execution.handlers,
  );
  if (result.kind !== "advanced") {
    throw new Error(`R13 stat change stopped at ${result.kind}`);
  }
  return result.state;
}

function runSwitchDataUpdate(currentMove: number) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_HandleFaintedMon",
    createBattleScriptRulesContext(switchContext(currentMove)),
    1,
    ports,
  );
  const pc = program.instructions.find(
    (instruction) => instruction.opcodeName === "B_SCR_OP_SWITCHINDATAUPDATE",
  )?.programCounter;
  if (pc === undefined) throw new Error("missing SWITCHINDATAUPDATE");
  const result = stepBattleScriptMachine(
    program,
    Object.freeze({ ...execution.state, programCounter: pc }),
    execution.handlers,
  );
  if (result.kind !== "advanced") throw new Error(`switch update stopped at ${result.kind}`);
  return result.state.rulesContext.battlers[0];
}

function runR9ItemPass(item: number) {
  const rulesContext = createBattleScriptRulesContext({
    ...switchContext(TACKLE),
    battlers: [
      battler({
        side: 0,
        species: 68,
        ability: 62,
        item,
        partyIndex: 0,
        status2: STATUS2_CONFUSION_TURN_2,
        statStages: [6, 8, 6, 6, 6, 6, 6, 6],
        types: ["TYPE_FIGHTING", "TYPE_FIGHTING"],
      }),
      battler({ side: 1, species: 94, ability: 26, types: ["TYPE_GHOST", "TYPE_POISON"] }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ],
    party: {
      player: corpusParty(MACHAMP_SET, item),
      opponent: corpusParty(300),
    },
  });
  const handlers = createBattleScriptStatusRulesHandlers(program, ports);
  const initial = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_HandleFaintedMon",
    rulesContext,
    1,
    ports,
  ).state;
  const result = runBattleEndTurnOrchestration(program, handlers, initial);
  if (result.kind !== "next-turn") {
    throw new Error(`R9 item pass stopped at ${result.kind}`);
  }
  return result.state.rulesContext.battlers[0];
}

describe("Gate-6 R12b and R11 entry/item interactions", () => {
  it("orders Granbull Intimidate before Machamp's White Herb restore and consumes the herb without hook RNG", () => {
    const result = initializeFreshFactoryBattle({
      requestId: 1,
      rngSeed: 3,
      playerParty: corpusParty(MACHAMP_SET, ITEM_WHITE_HERB),
      opponentParty: corpusParty(GRANBULL_SET),
    });
    const player = result.state.rules.rulesContext.battlers[0];
    const payloads = result.events.map((event) => event.payload);
    const messages = payloads.flatMap((payload) =>
      payload.kind === "message" ? [payload.messageId] : []
    );
    const attackCut = payloads.findIndex((payload) =>
      payload.kind === "stat-stage-change"
      && payload.battler === 0
      && payload.stat === "attack"
      && payload.from === 6
      && payload.to === 5
    );
    const herbMessage = payloads.findIndex((payload) =>
      payload.kind === "message"
      && payload.messageId === "STRINGID_PKMNSITEMRESTOREDSTATUS"
    );
    const herbRemoval = payloads.findIndex((payload) =>
      payload.kind === "set-battler-item" && payload.battler === 0 && payload.item === 0
    );

    expect(messages).toEqual([
      "STRINGID_PKMNCUTSATTACKWITH",
      "STRINGID_PKMNSITEMRESTOREDSTATUS",
    ]);
    expect([attackCut, herbMessage, herbRemoval]).toEqual(
      [...[attackCut, herbMessage, herbRemoval]].sort((a, b) => a - b),
    );
    expect(attackCut).toBeGreaterThanOrEqual(0);
    expect(player.statStages[1]).toBe(6);
    expect(player.item).toBe(0);
    expect(result.state.rng.calls).toBe(2);
  });

  it("retains Substitute HP and +2 Attack through Baton Pass but clears both on an ordinary switch", () => {
    const baton = runSwitchDataUpdate(BATON_PASS);
    expect(baton).toMatchObject({
      species: 1,
      partyIndex: 1,
      status2: STATUS2_SUBSTITUTE,
      substituteHP: 31,
      statStages: [6, 8, 6, 6, 6, 6, 6, 6],
    });

    const ordinary = runSwitchDataUpdate(TACKLE);
    expect(ordinary).toMatchObject({
      species: 1,
      partyIndex: 1,
      status2: 0,
      substituteHP: 0,
      statStages: [6, 6, 6, 6, 6, 6, 6, 6],
    });
  });
});

describe("Gate-6 R9 Swagger into Lum Berry versus White Herb", () => {
  it("Lum cures Swagger confusion without undoing +2 Attack, while White Herb sees no negative stage and leaves both the boost and confusion intact", () => {
    const lum = runR9ItemPass(ITEM_LUM_BERRY);
    expect(lum).toMatchObject({
      item: 0,
      statStages: [6, 8, 6, 6, 6, 6, 6, 6],
      status2: 0,
    });

    const whiteHerb = runR9ItemPass(ITEM_WHITE_HERB);
    expect(whiteHerb).toMatchObject({
      item: ITEM_WHITE_HERB,
      statStages: [6, 8, 6, 6, 6, 6, 6, 6],
      status2: STATUS2_CONFUSION_TURN_2,
    });
  });
});

describe("Gate-6 R13 Keen Eye stat-drop specificity", () => {
  it("rejects Sand-Attack through the specific ability-message branch while allowing Granbull Intimidate to lower Attack", () => {
    const accuracy = runR13StatChange(0x96);
    expect(accuracy.rulesContext.battlers[0].statStages).toEqual(
      [6, 6, 6, 6, 6, 6, 6, 6],
    );
    expect(accuracy.rulesContext.lastUsedAbility).toBe(ABILITY_KEEN_EYE);
    expect(accuracy.rulesContext.aiObservedAbilityIds[0]).toBe(ABILITY_KEEN_EYE);
    expect(
      program.instructions[accuracy.programCounter]?.source.label,
    ).toBe("BattleScript_AbilityNoSpecificStatLoss");

    const attack = runR13StatChange(0x91);
    expect(attack.rulesContext.battlers[0].statStages[1]).toBe(5);
    expect(attack.events).toContainEqual(
      expect.objectContaining({
        kind: "stat-stage-change",
        battler: 0,
        stat: "attack",
        from: 6,
        to: 5,
      }),
    );

    const entry = initializeFreshFactoryBattle({
      requestId: 13,
      rngSeed: 3,
      playerParty: corpusParty(PIDGEOT_SET),
      opponentParty: corpusParty(GRANBULL_SET),
    });
    expect(entry.state.rules.rulesContext.battlers[0]).toMatchObject({
      ability: ABILITY_KEEN_EYE,
      statStages: [6, 5, 6, 6, 6, 6, 6, 6],
    });
    expect(
      entry.events
        .map((event) => event.payload)
        .filter((payload) => payload.kind === "message")
        .map((payload) => payload.messageId),
    ).toEqual(["STRINGID_PKMNCUTSATTACKWITH"]);
  });
});
