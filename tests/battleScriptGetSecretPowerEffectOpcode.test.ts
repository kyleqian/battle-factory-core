import { describe, expect, it } from "vitest";
import {
  BATTLE_SCRIPT_BATTLE_ENVIRONMENT_BUILDING,
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  createBattleScriptRngState,
  createBattleScriptSchedulerState,
  stepBattleScriptMachine,
} from "../src/engine/battleScriptMachine.ts";
import {
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
} from "../src/engine/battleScriptProgram.ts";
import { secretPowerMoveEffectForEnvironment } from "../src/engine/battleScriptGetSecretPowerEffectOpcode.ts";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

const SECRET_POWER = 290;
const FOLLOW_ME = 266;
const STATUS1_PARALYSIS = 1 << 6;
// The stock mechanic-lab run starts from seed 3; legal-party construction and
// battle setup consume that stream before input. Its first action boundary is
// this exact value, which is the equivalent seed for the generic full-turn
// seam (that seam begins at action selection rather than CB2_InitBattle).
const EVIDENCE_ACTION_RNG_SEED = 983_916_074;
const program = loadBattleScriptProgram();
const instruction = program.instructions.find(
  (candidate) =>
    candidate.opcodeName === "B_SCR_OP_GETSECRETPOWEREFFECT",
)!;

function battler(
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 14,
    hp: changes.hp ?? 138,
    maxHP: changes.maxHP ?? 138,
    moves: changes.moves ?? ([SECRET_POWER, 185, 104, 215] as const),
    pp: changes.pp ?? ([20, 20, 15, 5] as const),
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
    item: changes.item ?? 142,
    statStages: changes.statStages
      ?? ([6, 6, 6, 6, 6, 6, 6, 6] as const),
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 301,
    attack: changes.attack ?? 106,
    defense: changes.defense ?? 99,
    spAttack: changes.spAttack ?? 50,
    spDefense: changes.spDefense ?? 50,
    speed: changes.speed ?? 60,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 70,
    partyIndex: changes.partyIndex ?? 0,
  });
}

function rules(
  changes: Partial<BattleScriptRulesContextInput> = {},
) {
  return createBattleScriptRulesContext({
    battlers: [
      battler(),
      battler({
        side: 1,
        ability: 30,
        hp: 362,
        maxHP: 362,
        item: 0,
        moves: [FOLLOW_ME, 0, 0, 0],
        pp: [20, 0, 0, 0],
        species: 242,
        attack: 30,
        defense: 62,
        spAttack: 95,
        spDefense: 155,
        speed: 75,
      }),
      battler({ hp: 0, maxHP: 0, moves: [0, 0, 0, 0], pp: [0, 0, 0, 0] }),
      battler({ side: 1, hp: 0, maxHP: 0, moves: [0, 0, 0, 0], pp: [0, 0, 0, 0] }),
    ],
    selectorRoles: {
      attacker: 0,
      target: 1,
      effectBattler: 1,
      fainted: null,
    },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: SECRET_POWER,
    currentMovePosition: 0,
    gBattleEnvironment: BATTLE_SCRIPT_BATTLE_ENVIRONMENT_BUILDING,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0xee,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    lockedMoves: [9, 8, 7, 6],
    ...changes,
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

function stepOpcode(gBattleEnvironment: number) {
  const before = rules({ gBattleEnvironment });
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectSecretPower",
    before,
    0x1234_5678,
    ports(),
  );
  const result = stepBattleScriptMachine(
    program,
    Object.freeze({
      ...execution.state,
      programCounter: instruction.programCounter,
      callStack: Object.freeze([]),
      scheduler: createBattleScriptSchedulerState(),
      rng: createBattleScriptRngState(0x1234_5678),
      events: Object.freeze([]),
    }),
    execution.handlers,
  );
  if (result.kind !== "advanced") {
    throw new Error(`getsecretpowereffect stopped at ${result.kind}`);
  }
  return { before, after: result.state };
}

describe("source-complete B_SCR_OP_GETSECRETPOWEREFFECT registration", () => {
  it("pins the sole one-byte instruction and the Secret Power -> EffectHit graph", () => {
    expect(program.instructions.filter(
      (candidate) =>
        candidate.opcodeName === "B_SCR_OP_GETSECRETPOWEREFFECT",
    )).toHaveLength(1);
    expect(instruction).toMatchObject({
      opcodeId: 0xe4,
      dispatcher: "Cmd_getsecretpowereffect",
      operands: [],
      source: { label: "BattleScript_EffectSecretPower" },
    });
    const entry = resolveBattleScriptLabel(
      program,
      "BattleScript_EffectSecretPower",
    )!;
    const effectHit = resolveBattleScriptLabel(program, "BattleScript_EffectHit")!;
    const [getEffect, goToHit] = program.instructions.slice(
      entry.programCounter,
      entry.programCounter + 2,
    );
    expect([getEffect!.opcodeName, goToHit!.opcodeName]).toEqual([
      "B_SCR_OP_GETSECRETPOWEREFFECT",
      "B_SCR_OP_GOTO",
    ]);
    expect(goToHit!.operands[0]!.expression).toBe("BattleScript_EffectHit");
    expect(effectHit.programCounter).not.toBe(entry.programCounter);
  });

  it("maps every u8 environment through the opcode, including all raw unknown defaults", () => {
    const explicit = new Map([
      [0, 2],
      [1, 1],
      [2, 27],
      [3, 23],
      [4, 22],
      [5, 24],
      [6, 7],
      [7, 8],
    ]);
    for (let environment = 0; environment <= 0xff; environment += 1) {
      const expected = explicit.get(environment) ?? 5;
      expect(
        secretPowerMoveEffectForEnvironment(environment),
        `pure mapping for environment ${environment}`,
      ).toBe(expected);
      const { after } = stepOpcode(environment);
      expect(
        after.rulesContext.moveEffectByte,
        `opcode mapping for environment ${environment}`,
      ).toBe(expected);
    }
  });

  it("always advances exactly one byte and owns no RNG, events, HP, PP, or lock state", () => {
    const { before, after } = stepOpcode(
      BATTLE_SCRIPT_BATTLE_ENVIRONMENT_BUILDING,
    );
    expect(after.programCounter).toBe(instruction.programCounter + 1);
    expect(after.rulesContext).toEqual({ ...before, moveEffectByte: 5 });
    expect(after.rulesContext.battlers).toBe(before.battlers);
    expect(after.rulesContext.party).toBe(before.party);
    expect(after.rulesContext.lockedMoves).toBe(before.lockedMoves);
    expect(after.rng).toEqual(createBattleScriptRngState(0x1234_5678));
    expect(after.events).toEqual([]);
  });

  it("defaults only legacy focused construction to GRASS and validates/persists the source u8", () => {
    expect(rules({ gBattleEnvironment: undefined }).gBattleEnvironment).toBe(0);
    const building = rules({
      gBattleEnvironment: BATTLE_SCRIPT_BATTLE_ENVIRONMENT_BUILDING,
    });
    expect(building.gBattleEnvironment).toBe(
      BATTLE_SCRIPT_BATTLE_ENVIRONMENT_BUILDING,
    );
    expect(Object.isFrozen(building)).toBe(true);
    expect(() => rules({ gBattleEnvironment: -1 })).toThrow(
      /gBattleEnvironment/,
    );
    expect(() => rules({ gBattleEnvironment: 256 })).toThrow(
      /gBattleEnvironment/,
    );
  });

  it("runs the evidenced Delcatty carrier through the generic Factory full-turn seam", () => {
    const initial = createFactoryFullTurnBattleState({
      requestId: 1,
      rngSeed: EVIDENCE_ACTION_RNG_SEED,
      player: {
        species: 301,
        moveId: SECRET_POWER,
        moves: [SECRET_POWER, 185, 104, 215],
        pp: [20, 20, 15, 5],
        ability: 14,
        item: 142,
        friendship: 70,
        attack: 106,
        defense: 99,
        spAttack: 50,
        spDefense: 50,
        speed: 60,
        hp: 138,
        // The committed mechanic-lab capture's active battler exposes type
        // ids [6,4] for this staged carrier; retain that observed battle
        // state so the generic damage receipt remains 362 -> 311.
        types: ["TYPE_BUG", "TYPE_GROUND"],
      },
      trainer: {
        species: 242,
        // The evidence Blissey's Splash reaches an unrelated unregistered
        // incrementgamestat tail. Follow Me is an existing shared, zero-RNG
        // action, so Delcatty enters Secret Power with the evidenced stream.
        moveId: FOLLOW_ME,
        pp: [20, 0, 0, 0],
        ability: 30,
        attack: 30,
        defense: 62,
        spAttack: 95,
        spDefense: 155,
        speed: 75,
        hp: 362,
        types: ["TYPE_NORMAL", "TYPE_NORMAL"],
      },
    });
    expect(initial.rules.rulesContext.gBattleEnvironment).toBe(
      BATTLE_SCRIPT_BATTLE_ENVIRONMENT_BUILDING,
    );
    const afterPlayer = submitFactoryFullTurnDecision(initial, {
      requestId: 1,
      side: "player",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
    });
    if (afterPlayer.kind !== "decision-required") {
      throw new Error("expected trainer decision");
    }
    const result = submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 2,
      side: "trainer",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
    });
    if (result.kind !== "decision-required") {
      throw new Error(`expected next-turn decision, got ${result.kind}`);
    }
    const context = result.state.rules.rulesContext;
    expect(context.gBattleEnvironment).toBe(
      BATTLE_SCRIPT_BATTLE_ENVIRONMENT_BUILDING,
    );
    expect(context.battlers[0].hp).toBe(138);
    expect(context.battlers[0].pp).toEqual([19, 20, 15, 5]);
    expect(context.battlers[1].hp).toBe(311);
    expect(context.battlers[1].pp).toEqual([19, 0, 0, 0]);
    expect(context.battlers[1].status1).toBe(STATUS1_PARALYSIS);
    expect(context.party.opponent[0].status1).toBe(STATUS1_PARALYSIS);
    expect(result.state.rng).toMatchObject({
      value: 1_633_612_974,
      calls: 4,
    });
    expect(result.events.find(({ payload }) =>
      payload.kind === "set-battler-pp-data"
      && payload.battler === 0
    )?.provenance?.opcodeName).toBe("B_SCR_OP_PPREDUCE");
    expect(result.events.find(({ payload }) =>
      payload.kind === "hp-change"
      && payload.battler === 1
    )?.provenance?.opcodeName).toBe("B_SCR_OP_DATAHPUPDATE");
    expect(result.events.find(({ payload }) =>
      payload.kind === "set-battler-status-data"
      && payload.battler === 1
    )?.provenance?.opcodeName).toBe("B_SCR_OP_SETEFFECTWITHCHANCE");
  });
});
