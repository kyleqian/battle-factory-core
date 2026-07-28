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
  createBattleScriptRngState,
  createBattleScriptSchedulerState,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import {
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
} from "../src/engine/battleScriptProgram.ts";
import { BATTLE_SCRIPT_STATUS2_MASKS } from "../src/engine/battleScriptSourceConstants.ts";

const FURY_CUTTER = 210;
const EXPLOSION = 153;
const program = loadBattleScriptProgram();
const instruction = program.instructions.find(
  (candidate) => candidate.opcodeName === "B_SCR_OP_FURYCUTTERCALC",
)!;

function battler(
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? 100,
    moves: changes.moves ?? ([FURY_CUTTER, 33, 0, 0] as const),
    pp: changes.pp ?? ([20, 35, 0, 0] as const),
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
    statStages: changes.statStages ?? ([6, 6, 6, 6, 6, 6, 6, 6] as const),
    types: changes.types ?? (["TYPE_GRASS", "TYPE_GRASS"] as const),
    species: changes.species ?? 278,
    attack: changes.attack ?? 50,
    defense: changes.defense ?? 50,
    spAttack: changes.spAttack ?? 50,
    spDefense: changes.spDefense ?? 50,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 70,
    partyIndex: changes.partyIndex ?? 0,
  });
}

function rules(
  attackerChanges: Partial<BattleScriptRulesBattler> = {},
  contextChanges: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler({ side: 0, ...attackerChanges }),
      battler({ side: 1, species: 242, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: FURY_CUTTER,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    ...contextChanges,
  });
}

function ports(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: () => true,
    prepareMessage: () => null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: () => null,
    resolveByteOperand: () => null,
  });
}

function stepFuryCutter(
  rulesContext: BattleScriptRulesContext,
): BattleScriptMachineState<BattleScriptRulesContext> {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectFuryCutter",
    rulesContext,
    1,
    ports(),
  );
  const state = Object.freeze({
    ...execution.state,
    programCounter: instruction.programCounter,
    callStack: Object.freeze([]),
    scheduler: createBattleScriptSchedulerState(),
    rng: createBattleScriptRngState(1),
    events: Object.freeze([]),
  });
  const result = stepBattleScriptMachine(program, state, execution.handlers);
  if (result.kind !== "advanced") {
    throw new Error(`furycuttercalc did not advance: ${result.kind}`);
  }
  return result.state;
}

describe("source-complete B_SCR_OP_FURYCUTTERCALC registration", () => {
  it("pins the sole operandless one-byte 0xb5 instruction and dispatcher", () => {
    expect(program.instructions.filter(
      (candidate) => candidate.opcodeName === "B_SCR_OP_FURYCUTTERCALC",
    )).toHaveLength(1);
    expect(instruction).toMatchObject({
      opcodeId: 0xb5,
      dispatcher: "Cmd_furycuttercalc",
      operands: [],
      source: { label: "BattleScript_FuryCutterHit" },
    });
  });

  it("increments the normal attacker-owned u8 sequence through 10/20/40/80/160", () => {
    let current = rules();
    for (const [counter, power] of [10, 20, 40, 80, 160].entries()) {
      const after = stepFuryCutter(current);
      expect(after.programCounter).toBe(instruction.programCounter + 1);
      expect(after.rulesContext.battlers[0].furyCutterCounter).toBe(counter + 1);
      expect(after.rulesContext.dynamicBasePower).toBe(power);
      expect(after.rulesContext.battlers[0].status2).toBe(0);
      expect(after.rulesContext.lockedMoves[0]).toBe(0);
      expect(after.rng).toEqual(createBattleScriptRngState(1));
      expect(after.events).toEqual([]);
      current = createBattleScriptRulesContext(after.rulesContext);
    }
  });

  it.each([
    { rawCounter: 5, nextCounter: 5, dynamicBasePower: 160 },
    { rawCounter: 6, nextCounter: 7, dynamicBasePower: 640 },
    { rawCounter: 255, nextCounter: 0, dynamicBasePower: 10 },
  ])(
    "mirrors the source u8 transition from raw $rawCounter to $nextCounter",
    ({ rawCounter, nextCounter, dynamicBasePower }) => {
      const after = stepFuryCutter(rules(
        {
          furyCutterCounter: rawCounter,
          status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_DEFENSE_CURL,
        },
        { dynamicBasePower: 777, lockedMoves: [7, 8, 9, 10] },
      ));
      expect(after.rulesContext.battlers[0]).toMatchObject({
        furyCutterCounter: nextCounter,
        status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_DEFENSE_CURL,
      });
      expect(after.rulesContext.dynamicBasePower).toBe(dynamicBasePower);
      expect(after.rulesContext.lockedMoves).toEqual([7, 8, 9, 10]);
    },
  );

  it("wraps gDynamicBasePower as u16 after each source multiplication", () => {
    const after = stepFuryCutter(rules(
      {
        furyCutterCounter: 9,
        moves: [EXPLOSION, 33, 0, 0],
      },
      { currentMove: EXPLOSION },
    ));
    expect(after.rulesContext.currentMovePower).toBe(250);
    expect(after.rulesContext.battlers[0].furyCutterCounter).toBe(10);
    expect(after.rulesContext.dynamicBasePower).toBe(62_464);
  });

  it("owns the selected attacker rather than battler zero", () => {
    const before = rules({ furyCutterCounter: 4 }, {
      selectorRoles: { attacker: 2, target: 1, effectBattler: 1 },
    });
    const after = stepFuryCutter(before);
    expect(after.rulesContext.battlers[0]).toBe(before.battlers[0]);
    expect(after.rulesContext.battlers[0].furyCutterCounter).toBe(4);
    expect(after.rulesContext.battlers[2].furyCutterCounter).toBe(1);
  });

  it.each([1 << 0, 1 << 3, 1 << 5])(
    "no-effect flag 0x%s resets only the attacker counter and jumps to MoveMissedPause",
    (moveResultFlag) => {
      const before = rules(
        { furyCutterCounter: 4, rolloutTimer: 3 },
        { moveResultFlags: moveResultFlag, dynamicBasePower: 777, lockedMoves: [9, 8, 7, 6] },
      );
      const after = stepFuryCutter(before);
      expect(after.programCounter).toBe(
        resolveBattleScriptLabel(program, "BattleScript_MoveMissedPause")!.programCounter,
      );
      expect(after.rulesContext.battlers[0]).toMatchObject({
        furyCutterCounter: 0,
        rolloutTimer: 3,
      });
      expect(after.rulesContext.dynamicBasePower).toBe(777);
      expect(after.rulesContext.lockedMoves).toEqual([9, 8, 7, 6]);
      expect(after.rng.calls).toBe(0);
    },
  );

  it("pins the post-type no-effect edge back through BattleScript_FuryCutterHit", () => {
    const hitLabel = resolveBattleScriptLabel(program, "BattleScript_FuryCutterHit")!;
    const block = program.instructions.slice(
      hitLabel.programCounter,
      hitLabel.programCounter + 8,
    );
    expect(block.map(({ opcodeName }) => opcodeName)).toEqual([
      "B_SCR_OP_FURYCUTTERCALC",
      "B_SCR_OP_CRITCALC",
      "B_SCR_OP_DAMAGECALC",
      "B_SCR_OP_TYPECALC",
      "B_SCR_OP_JUMPIFBYTE",
      "B_SCR_OP_ADJUSTNORMALDAMAGE",
      "B_SCR_OP_GOTO",
      "B_SCR_OP_ATTACKCANCELER",
    ]);
    expect(block[4]!.operands).toMatchObject([
      { expression: "CMP_COMMON_BITS" },
      { expression: "gMoveResultFlags" },
      { expression: "MOVE_RESULT_NO_EFFECT" },
      { expression: "BattleScript_FuryCutterHit" },
    ]);

    const rulesContext = rules({}, {
      battlers: [
        battler({ side: 0 }),
        battler({
          side: 1,
          ability: 25, // ABILITY_WONDER_GUARD
          species: 292,
          types: ["TYPE_BUG", "TYPE_GHOST"],
        }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    });
    const execution = createBattleScriptStatusRulesExecution(
      program,
      "BattleScript_FuryCutterHit",
      rulesContext,
      1,
      ports(),
    );
    let state = execution.state;
    const visited: number[] = [];
    for (let count = 0; count < 8; count += 1) {
      visited.push(state.programCounter);
      const stepped = stepBattleScriptMachine(program, state, execution.handlers);
      if (stepped.kind !== "advanced") {
        throw new Error(`Fury Cutter post-type loop stopped at ${stepped.kind}`);
      }
      state = stepped.state;
      if (
        state.programCounter
        === resolveBattleScriptLabel(program, "BattleScript_MoveMissedPause")!.programCounter
      ) break;
    }
    expect(visited.filter((pc) => pc === instruction.programCounter)).toHaveLength(2);
    expect(state.programCounter).toBe(
      resolveBattleScriptLabel(program, "BattleScript_MoveMissedPause")!.programCounter,
    );
    expect(state.rulesContext.moveResultFlags & 1).toBe(1);
    expect(state.rulesContext.battlers[0].furyCutterCounter).toBe(0);
  });
});
