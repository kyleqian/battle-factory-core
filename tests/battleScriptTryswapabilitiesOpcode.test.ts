import { describe, expect, it } from "vitest";
import {
  BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT,
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  createBattleScriptRngState,
  stepBattleScriptMachine,
} from "../src/engine/battleScriptMachine.ts";
import {
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
} from "../src/engine/battleScriptProgram.ts";
import {
  BATTLE_SCRIPT_ABILITY_NONE,
  BATTLE_SCRIPT_ABILITY_WONDER_GUARD,
} from "../src/engine/battleScriptTryswapabilitiesOpcode.ts";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

const SKILL_SWAP = 285;
const TACKLE = 33;
const INNER_FOCUS = 39;
const STURDY = 5;
const EVIDENCE_ACTION_RNG_SEED = 3_034_451_114;
const program = loadBattleScriptProgram();
const instruction = program.instructions.find(
  (candidate) =>
    candidate.opcodeName === "B_SCR_OP_TRYSWAPABILITIES",
)!;

function battler(
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? INNER_FOCUS,
    hp: changes.hp ?? 177,
    maxHP: changes.maxHP ?? changes.hp ?? 177,
    moves: changes.moves ?? ([SKILL_SWAP, 0, 0, 0] as const),
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
    item: changes.item ?? 0,
    statStages: changes.statStages
      ?? ([6, 6, 6, 6, 6, 6, 6, 6] as const),
    types: changes.types ?? (["TYPE_PSYCHIC", "TYPE_NORMAL"] as const),
    species: changes.species ?? 203,
    personality: changes.personality ?? 1,
    attack: changes.attack ?? 100,
    defense: changes.defense ?? 100,
    spAttack: changes.spAttack ?? 100,
    spDefense: changes.spDefense ?? 100,
    speed: changes.speed ?? 100,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 70,
    partyIndex: changes.partyIndex ?? 0,
  });
}

function rules(
  attackerAbility: number,
  targetAbility: number,
  moveResultFlags = 0,
  changes: Partial<BattleScriptRulesContextInput> = {},
) {
  return createBattleScriptRulesContext({
    battlers: [
      battler({ ability: attackerAbility }),
      battler({
        side: 1,
        ability: targetAbility,
        species: 213,
        hp: 127,
        maxHP: 127,
        moves: [TACKLE, TACKLE, TACKLE, TACKLE],
        pp: [35, 35, 35, 35],
        types: ["TYPE_BUG", "TYPE_ROCK"],
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
    currentMove: SKILL_SWAP,
    currentMovePosition: 0,
    moveResultFlags,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    lastUsedAbility: 77,
    party: {
      player: [
        { species: 203, hp: 177, moves: [60, 23, 273, SKILL_SWAP] },
        {}, {}, {}, {}, {},
      ],
      opponent: [
        { species: 213, hp: 127, moves: [TACKLE, TACKLE, TACKLE, TACKLE] },
        {}, {}, {}, {}, {},
      ],
    },
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

function stepOpcode(
  attackerAbility: number,
  targetAbility: number,
  moveResultFlags = 0,
) {
  const before = rules(attackerAbility, targetAbility, moveResultFlags);
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectSkillSwap",
    before,
    0x1234_5678,
    ports(),
  );
  const result = stepBattleScriptMachine(
    program,
    Object.freeze({
      ...execution.state,
      programCounter: instruction.programCounter,
    }),
    execution.handlers,
  );
  if (result.kind !== "advanced") {
    throw new Error(`tryswapabilities stopped at ${result.kind}`);
  }
  return { before, after: result.state };
}

function runFullTurn(
  playerAbility: number,
  trainerAbility: number,
) {
  const initial = createFactoryFullTurnBattleState({
    requestId: 1,
    rngSeed: EVIDENCE_ACTION_RNG_SEED,
    player: {
      species: 203,
      moveId: SKILL_SWAP,
      moves: [60, 23, 273, SKILL_SWAP],
      pp: [20, 20, 10, 10],
      ability: playerAbility,
      item: 171,
      friendship: 70,
      attack: 95,
      defense: 85,
      spAttack: 110,
      spDefense: 85,
      speed: 105,
      hp: 177,
      types: ["TYPE_NORMAL", "TYPE_PSYCHIC"],
    },
    trainer: {
      species: 213,
      moveId: TACKLE,
      moves: [TACKLE, TACKLE, TACKLE, TACKLE],
      pp: [35, 35, 35, 35],
      ability: trainerAbility,
      attack: 30,
      defense: 230,
      spAttack: 30,
      spDefense: 230,
      speed: 5,
      hp: 127,
      types: ["TYPE_BUG", "TYPE_ROCK"],
    },
  });
  const modeledPartyBefore = initial.rules.rulesContext.party;
  const afterPlayer = submitFactoryFullTurnDecision(initial, {
    requestId: 1,
    side: "player",
    decision: { kind: "use-move", moveSlot: 3, targetBattler: 1 },
  });
  if (afterPlayer.kind !== "decision-required") {
    throw new Error("expected trainer decision");
  }
  const result = submitFactoryFullTurnDecision(afterPlayer.state, {
    requestId: 2,
    side: "trainer",
    decision: { kind: "use-move", moveSlot: 2, targetBattler: 0 },
  });
  if (result.kind !== "decision-required") {
    throw new Error(`expected next-turn decision, got ${result.kind}`);
  }
  return { initial, modeledPartyBefore, result };
}

describe("source-complete B_SCR_OP_TRYSWAPABILITIES registration", () => {
  it("pins the sole 0xda instruction, one four-byte pointer, and exact EffectSkillSwap program shape", () => {
    expect(program.instructions.filter(
      (candidate) =>
        candidate.opcodeName === "B_SCR_OP_TRYSWAPABILITIES",
    )).toEqual([instruction]);
    expect(instruction).toMatchObject({
      opcodeId: 0xda,
      dispatcher: "Cmd_tryswapabilities",
      operands: [
        expect.objectContaining({
          widthBytes: 4,
          expression: "BattleScript_ButItFailed",
        }),
      ],
      source: { label: "BattleScript_EffectSkillSwap" },
    });
    expect(
      1 + instruction.operands.reduce(
        (sum, operand) => sum + operand.widthBytes,
        0,
      ),
    ).toBe(5);
    const entry = resolveBattleScriptLabel(
      program,
      "BattleScript_EffectSkillSwap",
    )!;
    const names = program.instructions.slice(
      entry.programCounter,
      entry.programCounter + 10,
    ).map(({ opcodeName }) => opcodeName);
    expect(names).toEqual([
      "B_SCR_OP_ATTACKCANCELER",
      "B_SCR_OP_ATTACKSTRING",
      "B_SCR_OP_PPREDUCE",
      "B_SCR_OP_ACCURACYCHECK",
      "B_SCR_OP_TRYSWAPABILITIES",
      "B_SCR_OP_ATTACKANIMATION",
      "B_SCR_OP_WAITANIMATION",
      "B_SCR_OP_PRINTSTRING",
      "B_SCR_OP_WAITMESSAGE",
      "B_SCR_OP_GOTO",
    ]);
  });

  it("matches every guard combination, including both single-NONE success orientations", () => {
    const abilities = [
      BATTLE_SCRIPT_ABILITY_NONE,
      STURDY,
      BATTLE_SCRIPT_ABILITY_WONDER_GUARD,
    ];
    const flags = [0, 1, 8, 32];
    const failurePc = resolveBattleScriptLabel(
      program,
      "BattleScript_ButItFailed",
    )!.programCounter;
    for (const attackerAbility of abilities) {
      for (const targetAbility of abilities) {
        for (const moveResultFlags of flags) {
          const { after } = stepOpcode(
            attackerAbility,
            targetAbility,
            moveResultFlags,
          );
          const fails = (
            (
              attackerAbility === BATTLE_SCRIPT_ABILITY_NONE
              && targetAbility === BATTLE_SCRIPT_ABILITY_NONE
            )
            || attackerAbility === BATTLE_SCRIPT_ABILITY_WONDER_GUARD
            || targetAbility === BATTLE_SCRIPT_ABILITY_WONDER_GUARD
            || (moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT) !== 0
          );
          expect(
            after.programCounter,
            `${attackerAbility}/${targetAbility}/0x${moveResultFlags.toString(16)}`,
          ).toBe(fails ? failurePc : instruction.programCounter + 1);
          expect(after.rulesContext.battlers[0].ability).toBe(
            fails ? attackerAbility : targetAbility,
          );
          expect(after.rulesContext.battlers[1].ability).toBe(
            fails ? targetAbility : attackerAbility,
          );
        }
      }
    }
    expect(stepOpcode(BATTLE_SCRIPT_ABILITY_NONE, STURDY).after.rulesContext.battlers.slice(0, 2).map(({ ability }) => ability)).toEqual([STURDY, BATTLE_SCRIPT_ABILITY_NONE]);
    expect(stepOpcode(STURDY, BATTLE_SCRIPT_ABILITY_NONE).after.rulesContext.battlers.slice(0, 2).map(({ ability }) => ability)).toEqual([BATTLE_SCRIPT_ABILITY_NONE, STURDY]);
    expect(stepOpcode(INNER_FOCUS, STURDY, 2).after.rulesContext.battlers.slice(0, 2).map(({ ability }) => ability)).toEqual([STURDY, INNER_FOCUS]);
  });

  it("owns only the two active ability bytes and no RNG/events/party/HP/status/stages/PP/lastUsedAbility", () => {
    const { before, after } = stepOpcode(INNER_FOCUS, STURDY);
    expect(after.programCounter).toBe(instruction.programCounter + 1);
    expect(after.rulesContext).toEqual({
      ...before,
      battlers: before.battlers.map((candidate, index) => {
        if (index === 0) return { ...candidate, ability: STURDY };
        if (index === 1) return { ...candidate, ability: INNER_FOCUS };
        return candidate;
      }),
    });
    expect(after.rulesContext.party).toBe(before.party);
    expect(after.rulesContext.lastUsedAbility).toBe(77);
    expect(after.rng).toEqual(createBattleScriptRngState(0x1234_5678));
    expect(after.events).toEqual([]);
    expect(Object.isFrozen(after.rulesContext)).toBe(true);
    expect(Object.isFrozen(after.rulesContext.battlers)).toBe(true);
    expect(Object.isFrozen(after.rulesContext.battlers[0])).toBe(true);
  });

  it("runs the accepted Girafarig/Shuckle action-boundary seed through a generic Factory full turn", () => {
    const { initial, modeledPartyBefore, result } = runFullTurn(
      INNER_FOCUS,
      STURDY,
    );
    const context = result.state.rules.rulesContext;
    expect(initial.rng).toMatchObject({
      value: EVIDENCE_ACTION_RNG_SEED,
      calls: 0,
    });
    expect(initial.rules.rulesContext.battlers.slice(0, 2).map(({ ability }) => ability)).toEqual([INNER_FOCUS, STURDY]);
    expect(context.battlers.slice(0, 2).map(({ ability }) => ability)).toEqual([STURDY, INNER_FOCUS]);
    expect(context.battlers[0].hp).toBe(172);
    expect(context.battlers[1].hp).toBe(127);
    expect(context.battlers[0].pp).toEqual([20, 20, 10, 9]);
    expect(context.battlers[1].pp).toEqual([35, 35, 34, 35]);
    expect(result.state.rng).toMatchObject({
      value: 3_031_698_222,
      calls: 4,
    });
    // This engine party slice carries species/isEgg/hp/status1/moves, but no
    // ability or abilityNum. Tackle writes its modeled player HP; these
    // assertions claim only the carried fields' resulting values. Persistent
    // abilities 39/5 belong solely to the accepted oracle receipt.
    expect(context.party.player[0]).toEqual({
      ...modeledPartyBefore.player[0],
      hp: 172,
    });
    expect(context.party.opponent[0]).toEqual(modeledPartyBefore.opponent[0]);
    expect(context.party.player.slice(1)).toEqual(modeledPartyBefore.player.slice(1));
    expect(context.party.opponent.slice(1)).toEqual(modeledPartyBefore.opponent.slice(1));
    expect(result.events.find(({ payload }) =>
      payload.kind === "set-battler-pp-data"
      && payload.battler === 0
    )?.provenance?.opcodeName).toBe("B_SCR_OP_PPREDUCE");
    expect(result.events.some(({ payload }) =>
      payload.kind === "message"
      && payload.messageId === "STRINGID_PKMNSWAPPEDABILITIES"
    )).toBe(true);
  });

  it("spends PP before the shared failure pointer route when both abilities are NONE", () => {
    const { result } = runFullTurn(
      BATTLE_SCRIPT_ABILITY_NONE,
      BATTLE_SCRIPT_ABILITY_NONE,
    );
    const context = result.state.rules.rulesContext;
    expect(context.battlers.slice(0, 2).map(({ ability }) => ability)).toEqual([
      BATTLE_SCRIPT_ABILITY_NONE,
      BATTLE_SCRIPT_ABILITY_NONE,
    ]);
    expect(context.battlers[0].pp).toEqual([20, 20, 10, 9]);
    expect(result.events.find(({ payload }) =>
      payload.kind === "set-battler-pp-data"
      && payload.battler === 0
    )?.provenance?.opcodeName).toBe("B_SCR_OP_PPREDUCE");
    expect(result.events.some(({ payload }) =>
      payload.kind === "message"
      && payload.messageId === "STRINGID_BUTITFAILED"
    )).toBe(true);
    expect(result.events.some(({ payload }) =>
      payload.kind === "message"
      && payload.messageId === "STRINGID_PKMNSWAPPEDABILITIES"
    )).toBe(false);
  });
});
