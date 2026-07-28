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
import { stepBattleScriptMachine } from "../src/engine/battleScriptMachine.ts";

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
const ABILITY_INTIMIDATE = 22;
const ABILITY_TRUANT = 54;

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

function opponentBench(): BattleScriptPartyMemberInput[] {
  return [
    { species: SUNKERN, hp: 0, status1: 0, moves: [TACKLE, 0, 0, 0] },
    EMPTY_SLOT,
    { species: MACHOP, hp: 145, status1: 0, moves: [KARATE_CHOP, 0, 0, 0] },
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
    prepareMessage: () => null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: () => null,
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

  it("switchindataupdate: rebuilds species/hp/status1/types from the party record and resets stat stages/status2/status3/the modeled DisableStruct fields to neutral", () => {
    const rc = context({
      battlers: [
        battler({ side: 0, species: URSARING, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }),
        battler({
          side: 1,
          species: SUNKERN,
          hp: 0,
          types: ["TYPE_GRASS", "TYPE_GRASS"],
          partyIndex: 2, // already flipped by getswitchedmondata
          ability: ABILITY_GUTS,
          status2: 0x1234,
          status3: 0x40,
          statStages: [2, 2, 2, 2, 2, 2, 2, 2],
          rolloutTimer: 3,
          furyCutterCounter: 2,
          disabledMove: KARATE_CHOP,
          disableTimer: 5,
          disableTimerStartValue: 5,
          tauntTimer: 4,
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
    expect(updated.types).toEqual(["TYPE_FIGHTING", "TYPE_FIGHTING"]);
    expect(updated.statStages).toEqual([6, 6, 6, 6, 6, 6, 6, 6]);
    expect(updated.status2).toBe(0);
    expect(updated.status3).toBe(0);
    expect(updated.rolloutTimer).toBe(0);
    expect(updated.furyCutterCounter).toBe(0);
    expect(updated.disabledMove).toBe(0);
    expect(updated.disableTimer).toBe(0);
    expect(updated.disableTimerStartValue).toBe(0);
    expect(updated.tauntTimer).toBe(0);
    // ability/item/moves/pp are not rebuilt (untracked, see file header) -- ability stays stale.
    expect(updated.ability).toBe(ABILITY_GUTS);
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

  it("switchindataupdate: doubles Baton Pass sure-hit ownership stays behind a named identity barrier", () => {
    const rc = context({
      currentMove: 226,
      battleTopology: {
        battlersCount: 4,
        battleTypeFlags:
          BATTLE_TYPE_TRAINER | BATTLE_TYPE_FACTORY | (1 << 0),
        battlerPositions: [0, 1, 2, 3],
      },
      battlers: [
        battler({ side: 0, status3: 1 << 3 }),
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
      sourceLine: 3180,
    });
  });

  it("switchindataupdate: STATUS2_ESCAPE_PREVENTION on another battler is a named barrier (battlerPreventingEscape identity not modeled)", () => {
    const STATUS2_ESCAPE_PREVENTION = 1 << 26;
    const rc = context({
      battlers: [
        battler({ side: 0, species: URSARING, types: ["TYPE_NORMAL", "TYPE_NORMAL"], status2: STATUS2_ESCAPE_PREVENTION }),
        battler({ side: 1, species: SUNKERN, hp: 0, types: ["TYPE_GRASS", "TYPE_GRASS"], partyIndex: 2, ability: ABILITY_GUTS }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    });
    const { result } = stepAtProgramCounter(SWITCHINDATAUPDATE_PC, rc);
    expect(result.kind).toBe("halted");
    expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch" });
  });

  it("switchindataupdate: STATUS3_ALWAYS_HITS on another battler is a named barrier (battlerWithSureHit identity not modeled)", () => {
    const STATUS3_ALWAYS_HITS = (1 << 3) | (1 << 4);
    const rc = context({
      battlers: [
        battler({ side: 0, species: URSARING, types: ["TYPE_NORMAL", "TYPE_NORMAL"], status3: STATUS3_ALWAYS_HITS }),
        battler({ side: 1, species: SUNKERN, hp: 0, types: ["TYPE_GRASS", "TYPE_GRASS"], partyIndex: 2, ability: ABILITY_GUTS }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    });
    const { result } = stepAtProgramCounter(SWITCHINDATAUPDATE_PC, rc);
    expect(result.kind).toBe("halted");
    expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch" });
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

  it("switchineffects: Spikes is a named barrier (structurally unreachable -- sideStatuses only carries Safeguard)", () => {
    const SIDE_STATUS_SPIKES = 1 << 4;
    const rc = context({ sideStatuses: [0, SIDE_STATUS_SPIKES] });
    const { result } = stepAtProgramCounter(SWITCHINEFFECTS_PC, rc);
    expect(result.kind).toBe("halted");
    expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch" });
  });

  it("switchineffects: Truant switch-in-hack is a named barrier", () => {
    const rc = context({
      battlers: [
        battler({ side: 0, species: URSARING, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }),
        battler({ side: 1, species: SUNKERN, hp: 0, types: ["TYPE_GRASS", "TYPE_GRASS"], partyIndex: 0, ability: ABILITY_TRUANT }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    });
    const { result } = stepAtProgramCounter(SWITCHINEFFECTS_PC, rc);
    expect(result.kind).toBe("halted");
    expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch" });
  });

  it("switchineffects: AbilityBattleEffects(ABILITYEFFECT_ON_SWITCHIN) is a named barrier for a trigger ability (e.g. Intimidate)", () => {
    const rc = context({
      battlers: [
        battler({ side: 0, species: URSARING, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }),
        battler({ side: 1, species: SUNKERN, hp: 0, types: ["TYPE_GRASS", "TYPE_GRASS"], partyIndex: 0, ability: ABILITY_INTIMIDATE }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    });
    const { result } = stepAtProgramCounter(SWITCHINEFFECTS_PC, rc);
    expect(result.kind).toBe("halted");
    expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch" });
  });
});
