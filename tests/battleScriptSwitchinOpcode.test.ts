import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptPartyMemberInput,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import { resolveBattleScriptLabel } from "../src/engine/battleScriptProgram.ts";
import { hiddenPowerFromIvs } from "../src/engine/battleScriptRankedBatch1Opcode.ts";

const program = loadBattleScriptProgram();
const TACKLE = 33;
const KARATE_CHOP = 2;
/**
 * include/constants/battle.h. `BATTLE_TYPE_FRONTIER` (`:91`) is itself an OR
 * of every frontier facility's own bit, including `BATTLE_TYPE_ARENA` (`:77`)
 * -- it is a test-mask macro (`flags & BATTLE_TYPE_FRONTIER`), never a real
 * battle's own concrete `gBattleTypeFlags` value, so fixtures here use only
 * `BATTLE_TYPE_FACTORY`, matching what a real Factory battle actually sets.
 */
const BATTLE_TYPE_TRAINER = 1 << 3;
const BATTLE_TYPE_FACTORY = 1 << 19;
const BATTLE_TYPE_ARENA = 1 << 18;

/** species-types.json: 191=SUNKERN (GRASS/GRASS), 66=MACHOP (FIGHTING/FIGHTING), 217=URSARING (NORMAL/NORMAL). */
const SUNKERN = 191;
const MACHOP = 66;
const URSARING = 217;
/** include/constants/abilities.h. */
const ABILITY_GUTS = 62;
const ABILITY_LEVITATE = 26;
const ABILITY_INTIMIDATE = 22;
const ABILITY_TRACE = 36;
const ABILITY_DRIZZLE = 2;
const ABILITY_SAND_STREAM = 45;
const ABILITY_DROUGHT = 70;
const ABILITY_CLEAR_BODY = 29;
const ABILITY_HYPER_CUTTER = 52;
const ABILITY_WHITE_SMOKE = 73;
const ABILITY_TRUANT = 54;
const ITEM_LEFTOVERS = 200;

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
    perishSongTimer: changes.perishSongTimer,
    perishSongTimerStartValue: changes.perishSongTimerStartValue,
    stockpileCounter: changes.stockpileCounter,
    battlerPreventingEscape: changes.battlerPreventingEscape,
    battlerWithSureHit: changes.battlerWithSureHit,
  });
}

const EMPTY_SLOT: BattleScriptPartyMemberInput = { species: 0, isEgg: false, hp: 0 };
const EMPTY_PARTY = [EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT];

function opponentBench(): BattleScriptPartyMemberInput[] {
  return [
    { species: SUNKERN, hp: 0, status1: 0, moves: [TACKLE, 0, 0, 0] },
    EMPTY_SLOT,
    {
      species: MACHOP,
      abilityNum: 0,
      ivs: { hp: 31, attack: 30, defense: 29, speed: 28, spAttack: 27, spDefense: 26 },
      personality: 0x1234_5678,
      experience: 125000,
      level: 50,
      friendship: 70,
      hp: 145,
      maxHP: 180,
      attack: 97,
      defense: 71,
      speed: 63,
      spAttack: 58,
      spDefense: 66,
      status1: 0,
      item: ITEM_LEFTOVERS,
      moves: [KARATE_CHOP, 0, 0, 0],
    },
    EMPTY_SLOT,
    EMPTY_SLOT,
    EMPTY_SLOT,
  ];
}

function context(contextChanges: Partial<BattleScriptRulesContextInput> = {}): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler({ side: 0, species: URSARING, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }),
      battler({
        side: 1,
        species: SUNKERN,
        hp: 0,
        types: ["TYPE_GRASS", "TYPE_GRASS"],
        partyIndex: 0,
        ability: ABILITY_GUTS,
      }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ],
    selectorRoles: { attacker: 0, target: 0, effectBattler: 0, fainted: 1 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: TACKLE,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    monToSwitchIntoId: [6, 2, 6, 6],
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags: BATTLE_TYPE_TRAINER | BATTLE_TYPE_FACTORY,
      battlerPositions: [0, 1, 2, 3],
    },
    party: { player: EMPTY_PARTY, opponent: opponentBench() },
    ...contextChanges,
  });
}

function externalPorts(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: (ctx: { state: { scheduler: { pendingControllerBattlers: readonly unknown[] } } }) =>
      ctx.state.scheduler.pendingControllerBattlers.length === 0,
    prepareMessage: (_ctx, operand) => Object.freeze({
      kind: "message" as const,
      messageId: operand.expression,
      substitutions: Object.freeze([]),
    }),
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_ctx, operand) =>
      operand.expression === "B_WAIT_TIME_LONG"
        ? 64
        : operand.expression === "B_WAIT_TIME_SHORT" ? 32 : null,
    resolveByteOperand: () => null,
  });
}

function pcFor(opcodeName: string, label: string): number {
  const found = program.instructions.find(
    (instruction) => instruction.opcodeName === opcodeName && instruction.source.label === label,
  );
  if (!found) throw new Error(`no ${opcodeName} instruction under label ${label}`);
  return found.programCounter;
}

const SWITCHHANDLEORDER_PC = pcFor("B_SCR_OP_SWITCHHANDLEORDER", "BattleScript_FaintedMonTryChoose");
const GETSWITCHEDMONDATA_PC = pcFor("B_SCR_OP_GETSWITCHEDMONDATA", "BattleScript_FaintedMonSendOutNew");
const SWITCHINDATAUPDATE_PC = pcFor("B_SCR_OP_SWITCHINDATAUPDATE", "BattleScript_FaintedMonSendOutNew");
const HPTHRESHOLDS_PC = pcFor("B_SCR_OP_HPTHRESHOLDS", "BattleScript_FaintedMonSendOutNew");
const SWITCHINANIM_PC = pcFor("B_SCR_OP_SWITCHINANIM", "BattleScript_FaintedMonSendOutNew");
const VARIOUS_RESET_PLAYER_FAINTED_PC = pcFor("B_SCR_OP_VARIOUS", "BattleScript_FaintedMonSendOutNew");
const SWITCHINEFFECTS_PC = pcFor("B_SCR_OP_SWITCHINEFFECTS", "BattleScript_FaintedMonSendOutNew");
const CANCELALLACTIONS_PC = pcFor("B_SCR_OP_CANCELALLACTIONS", "BattleScript_FaintedMonSendOutNew");
const HIDDENPOWERCALC_PC = pcFor("B_SCR_OP_HIDDENPOWERCALC", "BattleScript_EffectHiddenPower");
const STOCKPILETOHPHEAL_PC = pcFor("B_SCR_OP_STOCKPILETOHPHEAL", "BattleScript_EffectSwallow");

function stepAtProgramCounter(pc: number, rulesContext: BattleScriptRulesContext) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_HandleFaintedMon",
    rulesContext,
    1,
    externalPorts(),
  );
  const patched = Object.freeze({ ...execution.state, programCounter: pc });
  return { execution, result: stepBattleScriptMachine(program, patched, execution.handlers) };
}

describe("production forced-switch tail opcodes (SWITCHHANDLEORDER/GETSWITCHEDMONDATA/SWITCHINDATAUPDATE/SWITCHINANIM/HPTHRESHOLDS/CANCELALLACTIONS/VARIOUS/SWITCHINEFFECTS)", () => {
  it("registers every opcode this file composes", () => {
    for (
      const name of [
        "B_SCR_OP_SWITCHHANDLEORDER",
        "B_SCR_OP_GETSWITCHEDMONDATA",
        "B_SCR_OP_SWITCHINDATAUPDATE",
        "B_SCR_OP_HPTHRESHOLDS",
        "B_SCR_OP_SWITCHINANIM",
        "B_SCR_OP_VARIOUS",
        "B_SCR_OP_SWITCHINEFFECTS",
        "B_SCR_OP_CANCELALLACTIONS",
      ]
    ) {
      expect(program.instructions.some((i) => i.opcodeName === name)).toBe(true);
    }
  });

  it("switchhandleorder: transcribes the already-decided monToSwitchIntoId into battleCommunication0 and advances (SwitchPartyOrder's permutation is not modeled, §5c)", () => {
    const { result } = stepAtProgramCounter(SWITCHHANDLEORDER_PC, context());
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.programCounter).toBe(SWITCHHANDLEORDER_PC + 1);
    expect(result.state.rulesContext.battleCommunication0).toBe(2);
    expect(result.state.rulesContext.monToSwitchIntoId[1]).toBe(2);
  });

  it("switchhandleorder: case 0/1 (multi-battler collection / order-only) is a named barrier", () => {
    const instruction = program.instructions[SWITCHHANDLEORDER_PC]!;
    const patched = Object.freeze({
      ...instruction,
      operands: Object.freeze([instruction.operands[0]!, Object.freeze({ ...instruction.operands[1]!, expression: "0" })]),
    });
    const patchedProgram = Object.freeze({
      ...program,
      instructions: Object.freeze(program.instructions.map((i, index) => (index === SWITCHHANDLEORDER_PC ? patched : i))),
    });
    const execution = createBattleScriptStatusRulesExecution(
      patchedProgram,
      "BattleScript_HandleFaintedMon",
      context(),
      1,
      externalPorts(),
    );
    const state = Object.freeze({ ...execution.state, programCounter: SWITCHHANDLEORDER_PC });
    const result = stepBattleScriptMachine(patchedProgram, state, execution.handlers);
    expect(result.kind).toBe("halted");
    expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch" });
  });

  it("getswitchedmondata: commits gBattlerPartyIndexes[battler] = monToSwitchIntoId[battler] and marks the controller pending", () => {
    const { result } = stepAtProgramCounter(GETSWITCHEDMONDATA_PC, context());
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.programCounter).toBe(GETSWITCHEDMONDATA_PC + 1);
    expect(result.state.rulesContext.battlers[1].partyIndex).toBe(2);
    expect(result.state.scheduler.pendingControllerBattlers).toEqual([1]);
  });

  it("switchindataupdate rebuilds the incoming BattlePokemon wholesale, so Role Play'd Levitate does not survive an ordinary switch", () => {
    const rc = context({
      battlers: [
        battler({ side: 0, species: URSARING, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }),
        battler({
          side: 1,
          species: SUNKERN,
          hp: 0,
          types: ["TYPE_GRASS", "TYPE_GRASS"],
          partyIndex: 2, // already flipped by getswitchedmondata
          ability: ABILITY_LEVITATE,
          status2: 0x1234,
          status3: 0x40,
          statStages: [2, 2, 2, 2, 2, 2, 2, 2],
          rolloutTimer: 3,
          furyCutterCounter: 2,
          disabledMove: KARATE_CHOP,
          disableTimer: 5,
          disableTimerStartValue: 5,
          tauntTimer: 4,
          abilityNum: 1,
          transformedMonPersonality: 50,
        }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    });
    const { result } = stepAtProgramCounter(SWITCHINDATAUPDATE_PC, rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.programCounter).toBe(SWITCHINDATAUPDATE_PC + 1);
    const updated = result.state.rulesContext.battlers[1];
    expect(updated.species).toBe(MACHOP);
    expect(updated.hp).toBe(145);
    expect(updated.status1).toBe(0);
    expect(updated.item).toBe(ITEM_LEFTOVERS);
    expect(updated.types).toEqual(["TYPE_FIGHTING", "TYPE_FIGHTING"]);
    expect(updated.ability).toBe(ABILITY_GUTS);
    expect(updated.ivs).toEqual({ hp: 31, attack: 30, defense: 29, speed: 28, spAttack: 27, spDefense: 26 });
    expect(updated.personality).toBe(0x1234_5678);
    expect(updated.experience).toBe(125000);
    expect(updated.abilityNum).toBe(0);
    expect(updated.transformedMonPersonality).toBe(0);
    expect(updated.level).toBe(50);
    expect(updated.friendship).toBe(70);
    expect(updated.maxHP).toBe(180);
    expect(updated).toMatchObject({
      attack: 97, defense: 71, speed: 63, spAttack: 58, spDefense: 66,
    });
    expect(updated.statStages).toEqual([6, 6, 6, 6, 6, 6, 6, 6]);
    expect(updated.status2).toBe(0);
    expect(updated.status3).toBe(0);
    expect(updated.rolloutTimer).toBe(0);
    expect(updated.furyCutterCounter).toBe(0);
    expect(updated.disabledMove).toBe(0);
    expect(updated.disableTimer).toBe(0);
    expect(updated.disableTimerStartValue).toBe(0);
    expect(updated.tauntTimer).toBe(0);
  });

  it("Hidden Power and maxHP-reading effects consume the incoming member's reconstructed values", () => {
    const switched = stepAtProgramCounter(
      SWITCHINDATAUPDATE_PC,
      context({
        battlers: [
          battler({ side: 0, species: URSARING }),
          battler({
            side: 1,
            species: SUNKERN,
            partyIndex: 2,
            ability: ABILITY_LEVITATE,
            ivs: { hp: 0, attack: 0, defense: 0, speed: 0, spAttack: 0, spDefense: 0 },
            maxHP: 7,
          }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
      }),
    ).result;
    if (switched.kind !== "advanced") throw new Error("expected switch advance");
    const incoming = switched.state.rulesContext.battlers[1];
    const effectContext = createBattleScriptRulesContext({
      ...switched.state.rulesContext,
      selectorRoles: { attacker: 1, target: 0, effectBattler: 0, fainted: 1 },
      battlers: switched.state.rulesContext.battlers.map((candidate, index) =>
        index === 1 ? { ...candidate, stockpileCounter: 1 } : candidate
      ) as unknown as BattleScriptRulesContextInput["battlers"],
    });

    const hiddenPower = stepAtProgramCounter(HIDDENPOWERCALC_PC, effectContext).result;
    if (hiddenPower.kind !== "advanced") throw new Error("expected Hidden Power advance");
    const expectedHiddenPower = hiddenPowerFromIvs(incoming.ivs);
    expect(hiddenPower.state.rulesContext.dynamicBasePower).toBe(expectedHiddenPower.power);
    expect(hiddenPower.state.rulesContext.dynamicMoveType).toBe(expectedHiddenPower.dynamicMoveType);

    const swallow = stepAtProgramCounter(STOCKPILETOHPHEAL_PC, effectContext).result;
    if (swallow.kind !== "advanced") throw new Error("expected Swallow advance");
    expect(swallow.state.rulesContext.battleMoveDamage).toBe(-45);
  });

  it("switchindataupdate suppresses a knocked-off party item but restores an ordinary stored item", () => {
    const active = [
      battler({ side: 0, species: URSARING, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }),
      battler({
        side: 1,
        species: SUNKERN,
        item: 0,
        hp: 0,
        types: ["TYPE_GRASS", "TYPE_GRASS"],
        partyIndex: 2,
        ability: ABILITY_GUTS,
      }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ] as const;
    for (const [knockedOffMons, expectedItem] of [
      [[0, 0], ITEM_LEFTOVERS],
      [[0, 1 << 2], 0],
    ] as const) {
      const rc = context({ battlers: active, knockedOffMons });
      const { result } = stepAtProgramCounter(SWITCHINDATAUPDATE_PC, rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.rulesContext.battlers[1].item).toBe(expectedItem);
      expect(result.state.rulesContext.party.opponent[2].item).toBe(ITEM_LEFTOVERS);
    }
  });

  it("switchindataupdate clears Focus Energy ordinarily, retains it through Baton Pass, and clears Encore in both routes", () => {
    const STATUS2_FOCUS_ENERGY = 1 << 20;
    const STATUS2_TORMENT = 1 << 31;
    const STATUS3_MUDSPORT = 1 << 16;
    const STATUS3_WATERSPORT = 1 << 17;
    const source = {
      battlers: [
        battler({ side: 0, species: URSARING, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }),
        battler({
          side: 1, species: SUNKERN, hp: 0,
          types: ["TYPE_GRASS", "TYPE_GRASS"], partyIndex: 2,
          ability: ABILITY_GUTS,
          status2: (STATUS2_FOCUS_ENERGY | STATUS2_TORMENT) >>> 0,
          encoredMove: KARATE_CHOP,
          encoredMovePos: 2,
          encoreTimer: 4,
          encoreTimerStartValue: 4,
          status3: (1 << 5) | STATUS3_MUDSPORT | STATUS3_WATERSPORT,
          chargeTimer: 2,
          chargeTimerStartValue: 2,
          perishSongTimer: 3,
          perishSongTimerStartValue: 3,
          stockpileCounter: 3,
        }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    };
    const ordinary = stepAtProgramCounter(
      SWITCHINDATAUPDATE_PC,
      context(source),
    ).result;
    if (ordinary.kind !== "advanced") throw new Error("expected ordinary advance");
    expect(ordinary.state.rulesContext.battlers[1].status2).toBe(0);
    expect(ordinary.state.rulesContext.battlers[1]).toMatchObject({
      encoredMove: 0, encoredMovePos: 0, encoreTimer: 0, encoreTimerStartValue: 0,
      perishSongTimer: 0, perishSongTimerStartValue: 0,
      status3: 0, chargeTimer: 0, chargeTimerStartValue: 0,
      stockpileCounter: 0,
    });

    const batonPass = stepAtProgramCounter(
      SWITCHINDATAUPDATE_PC,
      context({ ...source, currentMove: 226 }),
    ).result;
    if (batonPass.kind !== "advanced") throw new Error("expected Baton Pass advance");
    expect(batonPass.state.rulesContext.battlers[1].status2)
      .toBe(STATUS2_FOCUS_ENERGY);
    expect(batonPass.state.rulesContext.battlers[1]).toMatchObject({
      encoredMove: 0, encoredMovePos: 0, encoreTimer: 0, encoreTimerStartValue: 0,
      perishSongTimer: 3, perishSongTimerStartValue: 3,
      status3: (1 << 5) | STATUS3_MUDSPORT | STATUS3_WATERSPORT,
      chargeTimer: 0, chargeTimerStartValue: 0,
      stockpileCounter: 0,
    });
  });

  it("switchindataupdate: clears STATUS2_INFATUATED_WITH(battler) on the other battler", () => {
    const infatuatedBit = 1 << (16 + 1); // STATUS2_INFATUATED_WITH(battler 1)
    const rc = context({
      battlers: [
        battler({ side: 0, species: URSARING, types: ["TYPE_NORMAL", "TYPE_NORMAL"], status2: infatuatedBit }),
        battler({ side: 1, species: SUNKERN, hp: 0, types: ["TYPE_GRASS", "TYPE_GRASS"], partyIndex: 2, ability: ABILITY_GUTS }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    });
    const { result } = stepAtProgramCounter(SWITCHINDATAUPDATE_PC, rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rulesContext.battlers[0].status2 & infatuatedBit).toBe(0);
  });

  it("switchindataupdate: singles clears another battler's wrap owned by the switching battler", () => {
    const STATUS2_WRAPPED = (1 << 13) | (1 << 14) | (1 << 15);
    const rc = context({
      battlers: [
        battler({
          side: 0,
          species: URSARING,
          types: ["TYPE_NORMAL", "TYPE_NORMAL"],
          status2: STATUS2_WRAPPED,
        }),
        battler({
          side: 1,
          species: SUNKERN,
          hp: 0,
          types: ["TYPE_GRASS", "TYPE_GRASS"],
          partyIndex: 2,
          ability: ABILITY_GUTS,
          status3: 1 << 8, // STATUS3_MINIMIZED is deliberately excluded from the Baton Pass mask.
        }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    });
    const { result } = stepAtProgramCounter(SWITCHINDATAUPDATE_PC, rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rulesContext.battlers[0].status2 & STATUS2_WRAPPED).toBe(0);
  });

  it("switchindataupdate: Baton Pass refreshes an opposing singles sure-hit timer to two turns", () => {
    const STATUS3_ALWAYS_HITS_TURN_1 = 1 << 3;
    const STATUS3_ALWAYS_HITS_TURN_2 = 2 << 3;
    const rc = context({
      currentMove: 226,
      battlers: [
        battler({
          side: 0,
          species: URSARING,
          types: ["TYPE_NORMAL", "TYPE_NORMAL"],
          status3: STATUS3_ALWAYS_HITS_TURN_1,
          battlerWithSureHit: 1,
        }),
        battler({
          side: 1,
          species: SUNKERN,
          hp: 0,
          types: ["TYPE_GRASS", "TYPE_GRASS"],
          partyIndex: 2,
          ability: ABILITY_GUTS,
        }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    });
    const { result } = stepAtProgramCounter(SWITCHINDATAUPDATE_PC, rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rulesContext.battlers[0].status3).toBe(
      STATUS3_ALWAYS_HITS_TURN_2,
    );
    expect(result.state.rulesContext.battlers[1].status3 & (1 << 8)).toBe(0);
  });

  it("switchindataupdate: Baton Pass preserves the switching target's saved sure-hit owner", () => {
    const rc = context({
      currentMove: 226,
      battlers: [
        battler({ side: 0 }),
        battler({
          side: 1,
          species: SUNKERN,
          hp: 0,
          types: ["TYPE_GRASS", "TYPE_GRASS"],
          partyIndex: 2,
          ability: ABILITY_GUTS,
          status3: 1 << 3,
          battlerWithSureHit: 0,
        }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    });
    const { result } = stepAtProgramCounter(SWITCHINDATAUPDATE_PC, rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[1]).toMatchObject({
      status3: 1 << 3,
      battlerWithSureHit: 0,
    });
  });

  it("switchindataupdate: doubles wrap ownership stays behind a named identity barrier", () => {
    const STATUS2_WRAPPED = (1 << 13) | (1 << 14) | (1 << 15);
    const rc = context({
      battleTopology: {
        battlersCount: 4,
        battleTypeFlags:
          BATTLE_TYPE_TRAINER | BATTLE_TYPE_FACTORY | (1 << 0),
        battlerPositions: [0, 1, 2, 3],
      },
      battlers: [
        battler({ side: 0, status2: STATUS2_WRAPPED }),
        battler({
          side: 1,
          species: SUNKERN,
          hp: 0,
          types: ["TYPE_GRASS", "TYPE_GRASS"],
          partyIndex: 2,
          ability: ABILITY_GUTS,
        }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    });
    const { result } = stepAtProgramCounter(SWITCHINDATAUPDATE_PC, rc);
    expect(result.kind).toBe("halted");
    expect(result.state.haltReason).toMatchObject({
      kind: "unsupported-branch",
      sourceLine: 3199,
    });
  });

  it("switchindataupdate: doubles Baton Pass refreshes only the opposing lock owned by the departing battler", () => {
    const rc = context({
      currentMove: 226,
      battleTopology: {
        battlersCount: 4,
        battleTypeFlags:
          BATTLE_TYPE_TRAINER | BATTLE_TYPE_FACTORY | (1 << 0),
        battlerPositions: [0, 1, 2, 3],
      },
      battlers: [
        battler({ side: 0, status3: 1 << 3, battlerWithSureHit: 1 }),
        battler({
          side: 1,
          species: SUNKERN,
          hp: 0,
          types: ["TYPE_GRASS", "TYPE_GRASS"],
          partyIndex: 2,
          ability: ABILITY_GUTS,
        }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    });
    const { result } = stepAtProgramCounter(SWITCHINDATAUPDATE_PC, rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[0].status3).toBe(2 << 3);
  });

  it("switchindataupdate: departing Mean Look owner releases the trapped battler", () => {
    const STATUS2_ESCAPE_PREVENTION = 1 << 26;
    const rc = context({
      battlers: [
        battler({
          side: 0,
          species: URSARING,
          types: ["TYPE_NORMAL", "TYPE_NORMAL"],
          status2: STATUS2_ESCAPE_PREVENTION,
          battlerPreventingEscape: 1,
        }),
        battler({ side: 1, species: SUNKERN, hp: 0, types: ["TYPE_GRASS", "TYPE_GRASS"], partyIndex: 2, ability: ABILITY_GUTS }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    });
    const { result } = stepAtProgramCounter(SWITCHINDATAUPDATE_PC, rc);
    expect(result.kind).toBe("advanced");
    expect(result.state.rulesContext.battlers[0].status2).toBe(0);
  });

  it("switchindataupdate: ordinary switch clears a lock owned by the departing battler", () => {
    const STATUS3_ALWAYS_HITS = (1 << 3) | (1 << 4);
    const rc = context({
      battlers: [
        battler({ side: 0, species: URSARING, types: ["TYPE_NORMAL", "TYPE_NORMAL"], status3: STATUS3_ALWAYS_HITS, battlerWithSureHit: 1 }),
        battler({ side: 1, species: SUNKERN, hp: 0, types: ["TYPE_GRASS", "TYPE_GRASS"], partyIndex: 2, ability: ABILITY_GUTS }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    });
    const { result } = stepAtProgramCounter(SWITCHINDATAUPDATE_PC, rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[0]).toMatchObject({ status3: 0, battlerWithSureHit: 0 });
  });

  it("switchindataupdate: ordinary switch also clears the departing target's own marker and owner", () => {
    const rc = context({
      battlers: [
        battler({ side: 0 }),
        battler({
          side: 1,
          species: SUNKERN,
          hp: 0,
          types: ["TYPE_GRASS", "TYPE_GRASS"],
          partyIndex: 2,
          ability: ABILITY_GUTS,
          status3: 1 << 3,
          battlerWithSureHit: 2,
        }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    });
    const { result } = stepAtProgramCounter(SWITCHINDATAUPDATE_PC, rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[1]).toMatchObject({
      status3: 0,
      battlerWithSureHit: 0,
    });
  });

  it("hpthresholds: pure no-op advance (writes only the untracked gBattleStruct->hpScale)", () => {
    const rc = context();
    const { result } = stepAtProgramCounter(HPTHRESHOLDS_PC, rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.programCounter).toBe(HPTHRESHOLDS_PC + 1);
    expect(result.state.rulesContext).toBe(rc);
  });

  it("switchinanim: clears the switched-in battler's gAbsentBattlerFlags bit and marks the controller pending", () => {
    const rc = context({ absentBattlerFlags: 0b11 });
    const { result } = stepAtProgramCounter(SWITCHINANIM_PC, rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.programCounter).toBe(SWITCHINANIM_PC + 1);
    expect(result.state.rulesContext.absentBattlerFlags).toBe(0b01);
    expect(result.state.scheduler.pendingControllerBattlers).toEqual([1]);
  });

  it("switchinanim: BATTLE_TYPE_ARENA is a named barrier (BattleArena_InitPoints not modeled)", () => {
    const rc = context({
      battleTopology: {
        battlersCount: 2,
        battleTypeFlags: BATTLE_TYPE_TRAINER | BATTLE_TYPE_FACTORY | BATTLE_TYPE_ARENA,
        battlerPositions: [0, 1, 2, 3],
      },
    });
    const { result } = stepAtProgramCounter(SWITCHINANIM_PC, rc);
    expect(result.kind).toBe("halted");
    expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch" });
  });

  it("cancelallactions: pure no-op advance (writes only the untracked gActionsByTurnOrder)", () => {
    const { result } = stepAtProgramCounter(CANCELALLACTIONS_PC, context());
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.programCounter).toBe(CANCELALLACTIONS_PC + 1);
  });

  it("various(RESET_PLAYER_FAINTED): clears HITMARKER_PLAYER_FAINTED when both battlers 0/1 are alive and trainer/non-link/non-double", () => {
    const HITMARKER_PLAYER_FAINTED = 1 << 22;
    // Post-switch: battler 1 (originally the fainted SUNKERN) is alive again, standing in for MACHOP.
    const rc = context({
      hitMarker: HITMARKER_PLAYER_FAINTED,
      battlers: [
        battler({ side: 0, species: URSARING, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }),
        battler({ side: 1, species: MACHOP, hp: 145, types: ["TYPE_FIGHTING", "TYPE_FIGHTING"], partyIndex: 2, ability: ABILITY_GUTS }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    });
    const { result } = stepAtProgramCounter(VARIOUS_RESET_PLAYER_FAINTED_PC, rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rulesContext.hitMarker & HITMARKER_PLAYER_FAINTED).toBe(0);
  });

  it("various(RESET_PLAYER_FAINTED): leaves the bit untouched when a battler is fainted", () => {
    const HITMARKER_PLAYER_FAINTED = 1 << 22;
    const rc = context({
      hitMarker: HITMARKER_PLAYER_FAINTED,
      battlers: [
        battler({ side: 0, species: URSARING, hp: 0, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }),
        battler({ side: 1, species: SUNKERN, hp: 0, types: ["TYPE_GRASS", "TYPE_GRASS"], partyIndex: 0, ability: ABILITY_GUTS }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    });
    const { result } = stepAtProgramCounter(VARIOUS_RESET_PLAYER_FAINTED_PC, rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rulesContext.hitMarker & HITMARKER_PLAYER_FAINTED).toBe(HITMARKER_PLAYER_FAINTED);
  });

  it("various: any other case id is a named barrier", () => {
    const instruction = program.instructions[VARIOUS_RESET_PLAYER_FAINTED_PC]!;
    const patched = Object.freeze({
      ...instruction,
      operands: Object.freeze([instruction.operands[0]!, Object.freeze({ ...instruction.operands[1]!, expression: "99" })]),
    });
    const patchedProgram = Object.freeze({
      ...program,
      instructions: Object.freeze(
        program.instructions.map((i, index) => (index === VARIOUS_RESET_PLAYER_FAINTED_PC ? patched : i)),
      ),
    });
    const execution = createBattleScriptStatusRulesExecution(
      patchedProgram,
      "BattleScript_HandleFaintedMon",
      context(),
      1,
      externalPorts(),
    );
    const state = Object.freeze({ ...execution.state, programCounter: VARIOUS_RESET_PLAYER_FAINTED_PC });
    const result = stepBattleScriptMachine(patchedProgram, state, execution.handlers);
    expect(result.kind).toBe("halted");
    expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch" });
  });

  it("switchineffects: clears HITMARKER_FAINTED(battler) and advances when no Spikes/Truant/ability-effect trigger applies", () => {
    const HITMARKER_FAINTED_1 = 1 << (28 + 1);
    const rc = context({ hitMarker: HITMARKER_FAINTED_1 });
    const { result } = stepAtProgramCounter(SWITCHINEFFECTS_PC, rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.programCounter).toBe(SWITCHINEFFECTS_PC + 1);
    expect(result.state.rulesContext.hitMarker & HITMARKER_FAINTED_1).toBe(0);
  });

  it.each([
    [1, 160, 20], [2, 160, 26], [3, 160, 40], [1, 1, 1],
  ] as const)("switchineffects: layer %i deals maxHP source fraction (%i -> %i), emits shared events in order, then clears its guard", (layers, maxHP, damage) => {
    const rc = context({
      battlers: [
        battler({ side: 0, species: URSARING }),
        battler({ side: 1, species: SUNKERN, hp: maxHP, maxHP, partyIndex: 0, ability: ABILITY_GUTS }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
      sideStatuses: [0, 1 << 4],
      sideTimers: [{}, { spikesAmount: layers }],
      hitMarker: (1 << (28 + 1)) | (1 << 6),
    });
    const { execution, result } = stepAtProgramCounter(SWITCHINEFFECTS_PC, rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.programCounter).toBe(resolveBattleScriptLabel(program, "BattleScript_SpikesOnFaintedBattler")!.programCounter);
    expect(result.state.callStack).toEqual([SWITCHINEFFECTS_PC]);
    expect(result.state.rulesContext.battleMoveDamage).toBe(damage);
    expect(result.state.rulesContext.sideStatuses[1]).toBe((1 << 4) | (1 << 9));
    expect(result.state.rulesContext.hitMarker & ((1 << (28 + 1)) | (1 << 6))).toBe(0);

    let state: BattleScriptMachineState<BattleScriptRulesContext> = result.state;
    for (let guard = 0; guard < 300 && state.programCounter !== SWITCHINEFFECTS_PC + 1; guard += 1) {
      for (const pending of state.scheduler.pendingControllerBattlers) {
        state = acknowledgeBattleScriptMachineController(state, pending);
      }
      const next = stepBattleScriptMachine(program, state, execution.handlers);
      if (next.kind === "halted" || next.kind === "unsupported") {
        throw new Error(`Spikes script stopped at ${next.kind}: ${JSON.stringify(next.state.haltReason)}`);
      }
      state = next.state;
    }
    expect(state.programCounter).toBe(SWITCHINEFFECTS_PC + 1);
    expect(state.rulesContext.battlers[1].hp).toBe(maxHP - damage);
    expect(state.rulesContext.sideStatuses[1]).toBe(1 << 4);
    expect(state.rulesContext.sideTimers[1].spikesAmount).toBe(layers);
    expect(state.events.map((event) => event.kind)).toEqual([
      "health-bar-update", "hp-change", "message",
    ]);
    expect(state.events[0]).toMatchObject({ battler: 1, healthValue: damage });
    expect(state.events[1]).toMatchObject({ battler: 1, from: maxHP, to: maxHP - damage });
    expect(state.events[2]).toMatchObject({ messageId: "STRINGID_PKMNHURTBYSPIKES" });
    expect(state.rng).toBe(result.state.rng);
  });

  it.each([
    [["TYPE_FLYING", "TYPE_NORMAL"] as const, 0],
    [["TYPE_GROUND", "TYPE_GROUND"] as const, 26],
  ])("switchineffects: Flying and Levitate are immune and clear a stale damaged guard", (types, ability) => {
    const rc = context({
      battlers: [
        battler({ side: 0 }),
        battler({ side: 1, hp: 99, maxHP: 120, types, ability }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
      sideStatuses: [0, (1 << 4) | (1 << 9)],
      sideTimers: [{}, { spikesAmount: 3 }],
    });
    const { result } = stepAtProgramCounter(SWITCHINEFFECTS_PC, rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.programCounter).toBe(SWITCHINEFFECTS_PC + 1);
    expect(result.state.rulesContext.battlers[1].hp).toBe(99);
    expect(result.state.rulesContext.sideStatuses[1]).toBe(1 << 4);
    expect(result.state.events).toEqual([]);
  });

  it("switchineffects: Truant switch-in hack writes counter 1 before the tail and draws no RNG", () => {
    const rc = context({
      battlers: [
        battler({ side: 0, species: URSARING, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }),
        battler({ side: 1, species: SUNKERN, hp: 0, types: ["TYPE_GRASS", "TYPE_GRASS"], partyIndex: 0, ability: ABILITY_TRUANT }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    });
    const { result } = stepAtProgramCounter(SWITCHINEFFECTS_PC, rc);
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.programCounter).toBe(SWITCHINEFFECTS_PC + 1);
    expect(result.state.rulesContext.battlers[1].truantCounter).toBe(1);
    expect(result.state.rng.calls).toBe(0);
  });

  it("switchineffects: Intimidate marks STATUS3, runs shared statbuffchange, then prints the Attack-cut message", () => {
    const rc = context({
      battlers: [
        battler({ side: 0, species: URSARING, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }),
        battler({ side: 1, species: SUNKERN, hp: 0, types: ["TYPE_GRASS", "TYPE_GRASS"], partyIndex: 0, ability: ABILITY_INTIMIDATE }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    });
    const { execution, result } = stepAtProgramCounter(SWITCHINEFFECTS_PC, rc);
    if (result.kind !== "advanced") throw new Error(`expected callback, got ${result.kind}`);
    expect(result.state.programCounter).toBe(resolveBattleScriptLabel(program, "BattleScript_IntimidateActivates")!.programCounter);
    expect(result.state.rulesContext.battlers[1].status3 & (1 << 19)).toBe(1 << 19);
    let state = result.state;
    for (let guard = 0; guard < 300 && state.programCounter !== SWITCHINEFFECTS_PC + 1; guard += 1) {
      for (const pending of state.scheduler.pendingControllerBattlers) {
        state = acknowledgeBattleScriptMachineController(state, pending);
      }
      const next = stepBattleScriptMachine(program, state, execution.handlers);
      if (next.kind === "halted" || next.kind === "unsupported") {
        throw new Error(`Intimidate script stopped at ${next.kind}: ${JSON.stringify(next.state.haltReason)}`);
      }
      state = next.state;
    }
    expect(state.programCounter).toBe(SWITCHINEFFECTS_PC + 1);
    expect(state.rulesContext.battlers[0].statStages[1]).toBe(5);
    expect(state.events.filter((event) => event.kind === "message").map((event) => event.messageId))
      .toEqual(["STRINGID_PKMNCUTSATTACKWITH"]);
    expect(state.rng.calls).toBe(0);
  });

  it("switchineffects: Intimidate skips Substitute and prints prevention for Clear Body", () => {
    for (const target of [
      battler({ side: 0, status2: 1 << 24, statStages: [6, 6, 6, 6, 6, 6, 6, 6] }),
      battler({ side: 0, ability: ABILITY_CLEAR_BODY, statStages: [6, 6, 6, 6, 6, 6, 6, 6] }),
    ]) {
      const rc = context({ battlers: [
        target,
        battler({ side: 1, ability: ABILITY_INTIMIDATE }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ] });
      const { execution, result } = stepAtProgramCounter(SWITCHINEFFECTS_PC, rc);
      let state = result.state;
      for (let guard = 0; guard < 1_000 && state.programCounter !== SWITCHINEFFECTS_PC + 1; guard += 1) {
        const next = stepBattleScriptMachine(program, state, execution.handlers);
        if (next.kind === "scheduler-progressed" || next.kind === "advanced") state = next.state;
        else if (next.kind === "blocked") {
          state = next.state;
          for (const pending of state.scheduler.pendingControllerBattlers) state = acknowledgeBattleScriptMachineController(state, pending);
        } else throw new Error(`unexpected ${next.kind}`);
      }
      expect(state.rulesContext.battlers[0].statStages[1]).toBe(6);
      const messages = state.events.filter((event) => event.kind === "message").map((event) => event.messageId);
      if (!target.status2) expect(state.rulesContext.lastUsedAbility).toBe(ABILITY_CLEAR_BODY);
      expect(messages).toEqual(target.status2 ? [] : ["STRINGID_PREVENTEDFROMWORKING"]);
    }
  });

  it.each([
    ["Hyper Cutter", 127, ABILITY_HYPER_CUTTER], // Pinsir: Hyper Cutter / NONE
    ["White Smoke", 321, ABILITY_WHITE_SMOKE], // Torkoal: White Smoke / NONE
  ] as const)(
    "switchineffects: a real later-switch Intimidate against single-ability %s prints exact prevention, changes no stage, and draws zero RNG",
    (_abilityName, species, ability) => {
      const rc = context({ battlers: [
        battler({ side: 0, species, ability, statStages: [6, 6, 6, 6, 6, 6, 6, 6] }),
        battler({ side: 1, species: 397, ability: ABILITY_INTIMIDATE }), // Salamence: Intimidate / NONE
        battler({ side: 0 }),
        battler({ side: 1 }),
      ] });
      const { execution, result } = stepAtProgramCounter(SWITCHINEFFECTS_PC, rc);
      let state = result.state;
      for (let guard = 0; guard < 300 && state.programCounter !== SWITCHINEFFECTS_PC + 1; guard += 1) {
        const next = stepBattleScriptMachine(program, state, execution.handlers);
        if (next.kind === "scheduler-progressed" || next.kind === "advanced") state = next.state;
        else if (next.kind === "blocked") {
          state = next.state;
          for (const pending of state.scheduler.pendingControllerBattlers) {
            state = acknowledgeBattleScriptMachineController(state, pending);
          }
        } else {
          throw new Error(`later-switch Intimidate stopped at ${next.kind}: ${JSON.stringify(next.state.haltReason)}`);
        }
      }
      expect(state.programCounter).toBe(SWITCHINEFFECTS_PC + 1);
      expect(state.rulesContext.battlers[0].statStages).toEqual([6, 6, 6, 6, 6, 6, 6, 6]);
      expect(state.rulesContext.lastUsedAbility).toBe(ability);
      expect(state.events.filter((event) => event.kind === "message").map((event) => event.messageId))
        .toEqual(["STRINGID_PREVENTEDFROMWORKING"]);
      expect(state.rng.calls).toBe(0);
    },
  );

  it("battle-start orchestration: faster Drizzle completes its weather message before the slower Intimidate stat drop", () => {
    const rc = context({
      battlers: [
        battler({ side: 0, species: 404, ability: ABILITY_DRIZZLE }), // Kyogre, base Speed 90
        battler({ side: 1, species: 210, ability: ABILITY_INTIMIDATE }), // Granbull, base Speed 45
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
      selectorRoles: { attacker: 0, target: 0, effectBattler: 0, fainted: 0 },
    });
    const first = stepAtProgramCounter(SWITCHINEFFECTS_PC, rc);
    let state = first.result.state;
    for (let guard = 0; guard < 1_000 && state.programCounter !== SWITCHINEFFECTS_PC + 1; guard += 1) {
      const next = stepBattleScriptMachine(program, state, first.execution.handlers);
      if (next.kind === "scheduler-progressed" || next.kind === "advanced") state = next.state;
      else if (next.kind === "blocked") {
        state = next.state;
        for (const pending of state.scheduler.pendingControllerBattlers) {
          state = acknowledgeBattleScriptMachineController(state, pending);
        }
      } else if (next.kind === "halted" && next.state.haltReason?.kind === "end3") {
        // Weather ON_SWITCHIN uses PushCursorAndCallback + end3. The
        // TryDoEventsBeforeFirstTurn owner resumes its C loop externally.
        state = next.state;
        break;
      } else {
        throw new Error(`Drizzle entry script stopped at ${next.kind}: ${JSON.stringify(next.state.haltReason)}`);
      }
    }
    expect(state.rulesContext.battlers[0].statStages[1]).toBe(6);
    expect(state.rulesContext.weather).toBe((1 << 0) | (1 << 2));
    expect(state.events.filter((event) => event.kind === "message").map((event) => event.messageId))
      .toEqual(["STRINGID_PKMNMADEITRAIN"]);

    // TryDoEventsBeforeFirstTurn's gBattlerByTurnOrder scan now advances to
    // the slower battler. Re-enter the same opcode with all machine-global
    // state/events preserved, as the source main loop does after Drizzle's end3.
    state = Object.freeze({
      ...state,
      programCounter: SWITCHINEFFECTS_PC,
      haltReason: null,
      rulesContext: Object.freeze({
        ...state.rulesContext,
        selectorRoles: Object.freeze({ ...state.rulesContext.selectorRoles, fainted: 1 }),
      }),
    });
    for (let guard = 0; guard < 1_000 && state.programCounter !== SWITCHINEFFECTS_PC + 1; guard += 1) {
      const next = stepBattleScriptMachine(program, state, first.execution.handlers);
      if (next.kind === "scheduler-progressed" || next.kind === "advanced") state = next.state;
      else if (next.kind === "blocked") {
        state = next.state;
        for (const pending of state.scheduler.pendingControllerBattlers) {
          state = acknowledgeBattleScriptMachineController(state, pending);
        }
      } else {
        throw new Error(`Intimidate entry script stopped at ${next.kind}: ${JSON.stringify(next.state.haltReason)}`);
      }
    }
    expect(state.rulesContext.battlers[0].statStages[1]).toBe(5);
    expect(state.events.filter((event) => event.kind === "message").map((event) => event.messageId))
      .toEqual(["STRINGID_PKMNMADEITRAIN", "STRINGID_PKMNCUTSATTACKWITH"]);
    expect(state.rng.calls).toBe(0);
  });

  it("switchineffects: Trace copies the live opposing ability and announces it with zero draws", () => {
    const rc = context({ battlers: [
      battler({ side: 0, ability: 5, hp: 100, partyIndex: 0 }),
      battler({ side: 1, ability: ABILITY_TRACE, hp: 100, partyIndex: 2 }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ] });
    const { result } = stepAtProgramCounter(SWITCHINEFFECTS_PC, rc);
    expect(result.state.rulesContext.battlers[1].ability).toBe(5);
    expect(result.state.rulesContext.lastUsedAbility).toBe(5);
    expect(result.state.rulesContext.battleTextBuff1MonNick).toEqual({ battler: 0, partyIndex: 0 });
    expect(result.state.programCounter).toBe(resolveBattleScriptLabel(program, "BattleScript_TraceActivates")!.programCounter);
    expect(result.state.rng.calls).toBe(0);
  });

  it("switchineffects: Drizzle sets permanent rain once and same-weather re-entry is a no-op", () => {
    const rc = context({ battlers: [
      battler({ side: 0 }),
      battler({ side: 1, ability: ABILITY_DRIZZLE }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ] });
    const first = stepAtProgramCounter(SWITCHINEFFECTS_PC, rc).result;
    expect(first.state.rulesContext.weather).toBe((1 << 0) | (1 << 2));
    expect(first.state.programCounter).toBe(resolveBattleScriptLabel(program, "BattleScript_DrizzleActivates")!.programCounter);
    const same = context({ battlers: rc.battlers, weather: (1 << 0) | (1 << 2) });
    const second = stepAtProgramCounter(SWITCHINEFFECTS_PC, same).result;
    expect(second.state.programCounter).toBe(SWITCHINEFFECTS_PC + 1);
    expect(second.state.events).toEqual([]);
    expect(second.state.rng.calls).toBe(0);
  });

  it.each([
    ["Sand Stream", ABILITY_SAND_STREAM, (1 << 3) | (1 << 4), "BattleScript_SandstreamActivates"],
    ["Drought", ABILITY_DROUGHT, (1 << 5) | (1 << 6), "BattleScript_DroughtActivates"],
  ] as const)(
    "switchineffects: %s sets both source temporary+permanent weather bits and draws zero RNG",
    (_name, ability, weather, scriptLabel) => {
      const rc = context({ battlers: [
        battler({ side: 0 }),
        battler({ side: 1, ability }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ] });
      const result = stepAtProgramCounter(SWITCHINEFFECTS_PC, rc).result;
      expect(result.state.rulesContext.weather).toBe(weather);
      expect(result.state.programCounter).toBe(resolveBattleScriptLabel(program, scriptLabel)!.programCounter);
      expect(result.state.rng.calls).toBe(0);
    },
  );
});
