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
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";

const program = loadBattleScriptProgram();
const TACKLE = 33;
const STARMIE = 121;
const ABILITY_NATURAL_CURE = 30;
const ABILITY_LEVITATE = 26;
const STATUS1_TOXIC_POISON = 1 << 7;
const STATUS1_TOXIC_TURN_1 = 1 << 8;
const SIDE_STATUS_SPIKES = 1 << 4;
const SIDE_STATUS_SPIKES_DAMAGED = 1 << 9;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? 100,
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
    attack: changes.attack ?? 50,
    defense: changes.defense ?? 50,
    spAttack: changes.spAttack ?? 50,
    spDefense: changes.spDefense ?? 50,
    speed: changes.speed ?? 50,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 70,
    partyIndex: changes.partyIndex ?? 0,
  });
}

const EMPTY_SLOT: BattleScriptPartyMemberInput = {
  species: 0,
  isEgg: false,
  hp: 0,
};

function partyMember(
  changes: Partial<BattleScriptPartyMemberInput> = {},
): BattleScriptPartyMemberInput {
  return {
    species: changes.species ?? STARMIE,
    abilityNum: changes.abilityNum ?? 1,
    ivs: changes.ivs ?? {
      hp: 31,
      attack: 31,
      defense: 31,
      speed: 31,
      spAttack: 31,
      spDefense: 31,
    },
    personality: changes.personality ?? 0x1234_5678,
    experience: changes.experience ?? 125000,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 70,
    hp: changes.hp ?? 135,
    maxHP: changes.maxHP ?? 135,
    attack: changes.attack ?? 95,
    defense: changes.defense ?? 105,
    speed: changes.speed ?? 135,
    spAttack: changes.spAttack ?? 120,
    spDefense: changes.spDefense ?? 105,
    status1: changes.status1 ?? 0,
    item: changes.item ?? 0,
    moves: changes.moves ?? [105, TACKLE, 55, 129],
    pp: changes.pp ?? [20, 35, 25, 20],
  };
}

function rules(
  changes: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler({
        side: 0,
        species: STARMIE,
        ability: ABILITY_NATURAL_CURE,
        types: ["TYPE_WATER", "TYPE_PSYCHIC"],
      }),
      battler({ side: 1, species: 89, types: ["TYPE_POISON", "TYPE_POISON"] }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ],
    selectorRoles: {
      attacker: 0,
      target: 1,
      effectBattler: 1,
      fainted: 1,
    },
    scriptingBattler: 1,
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
    monToSwitchIntoId: [1, 6, 6, 6],
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags: (1 << 3) | (1 << 19),
      battlerPositions: [0, 1, 2, 3],
    },
    party: {
      player: [
        partyMember(),
        partyMember(),
        EMPTY_SLOT,
        EMPTY_SLOT,
        EMPTY_SLOT,
        EMPTY_SLOT,
      ],
      opponent: [
        partyMember({ species: 89, abilityNum: 0 }),
        EMPTY_SLOT,
        EMPTY_SLOT,
        EMPTY_SLOT,
        EMPTY_SLOT,
        EMPTY_SLOT,
      ],
    },
    ...changes,
  });
}

const ports: BattleScriptStatusRulesExternalPorts = Object.freeze({
  isControllerIdle: () => true,
  prepareMessage: (_context, operand) => Object.freeze({
    kind: "message" as const,
    messageId: operand.expression,
    substitutions: Object.freeze([]),
  }),
  prepareSelectionMessage: () => null,
  prepareSelectionMessageFromTable: () => null,
  resolveAttackerBattler: () => null,
  resolveBattlerAtPosition: () => null,
  resolveHalfwordOperand: (_context, operand) =>
    operand.expression === "B_WAIT_TIME_LONG"
      ? 64
      : operand.expression === "B_WAIT_TIME_SHORT"
        ? 32
        : null,
  resolveByteOperand: () => null,
});

function instructionPc(opcodeName: string, label: string): number {
  const instruction = program.instructions.find(
    (candidate) =>
      candidate.opcodeName === opcodeName && candidate.source.label === label,
  );
  if (!instruction) throw new Error(`missing ${opcodeName} under ${label}`);
  return instruction.programCounter;
}

function stepAt(
  pc: number,
  context: BattleScriptRulesContext,
) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_HandleFaintedMon",
    context,
    1,
    ports,
  );
  const result = stepBattleScriptMachine(
    program,
    Object.freeze({ ...execution.state, programCounter: pc }),
    execution.handlers,
  );
  return { execution, result };
}

function finishSpikesScript(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
  handlers: ReturnType<typeof createBattleScriptStatusRulesExecution>["handlers"],
  returnPc: number,
) {
  let current = state;
  for (let guard = 0; guard < 300 && current.programCounter !== returnPc; guard += 1) {
    for (const pending of current.scheduler.pendingControllerBattlers) {
      current = acknowledgeBattleScriptMachineController(current, pending);
    }
    const next = stepBattleScriptMachine(program, current, handlers);
    if (next.kind === "halted" || next.kind === "unsupported") {
      throw new Error(`Spikes script stopped at ${next.kind}`);
    }
    current = next.state;
  }
  expect(current.programCounter).toBe(returnPc);
  return current;
}

const SWITCHOUT_PC = instructionPc(
  "B_SCR_OP_SWITCHOUTABILITIES",
  "BattleScript_DoSwitchOut",
);
const GETSWITCHEDMONDATA_PC = instructionPc(
  "B_SCR_OP_GETSWITCHEDMONDATA",
  "BattleScript_FaintedMonSendOutNew",
);
const SWITCHIN_DATA_PC = instructionPc(
  "B_SCR_OP_SWITCHINDATAUPDATE",
  "BattleScript_FaintedMonSendOutNew",
);
const SWITCHIN_EFFECTS_PC = instructionPc(
  "B_SCR_OP_SWITCHINEFFECTS",
  "BattleScript_FaintedMonSendOutNew",
);

function switchPlayerToPartyIndex(
  context: BattleScriptRulesContext,
  partyIndex: number,
): BattleScriptRulesContext {
  const staged = createBattleScriptRulesContext({
    ...context,
    selectorRoles: { ...context.selectorRoles, fainted: 0 },
    monToSwitchIntoId: context.monToSwitchIntoId.map((value, index) =>
      index === 0 ? partyIndex : value
    ) as unknown as BattleScriptRulesContextInput["monToSwitchIntoId"],
  });
  const indexed = stepAt(GETSWITCHEDMONDATA_PC, staged).result;
  if (indexed.kind !== "advanced") {
    throw new Error(`getswitchedmondata stopped at ${indexed.kind}`);
  }
  const rebuilt = stepAt(
    SWITCHIN_DATA_PC,
    indexed.state.rulesContext,
  ).result;
  if (rebuilt.kind !== "advanced") {
    throw new Error(`switch-in rebuild stopped at ${rebuilt.kind}`);
  }
  return rebuilt.state.rulesContext;
}

describe("Gate-6 R6 Natural Cure switch persistence", () => {
  it("writes Natural Cure's clear into the departing party record so return is clean, while an ordinary Toxic record persists across the same round trip", () => {
    const toxic = STATUS1_TOXIC_POISON | STATUS1_TOXIC_TURN_1;
    const naturalContext = rules({
      battlers: [
        battler({
          side: 0,
          species: STARMIE,
          ability: ABILITY_NATURAL_CURE,
          status1: toxic,
          types: ["TYPE_WATER", "TYPE_PSYCHIC"],
        }),
        battler({ side: 1 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
      party: {
        player: [
          partyMember({ status1: STATUS1_TOXIC_POISON }),
          partyMember(),
          EMPTY_SLOT,
          EMPTY_SLOT,
          EMPTY_SLOT,
          EMPTY_SLOT,
        ],
        opponent: [EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT],
      },
    });
    const natural = stepAt(SWITCHOUT_PC, naturalContext).result;
    if (natural.kind !== "advanced") throw new Error(`Natural Cure stopped at ${natural.kind}`);
    expect(natural.state.rulesContext.battlers[0].status1).toBe(0);
    expect(natural.state.scheduler.pendingControllerBattlers).toEqual([0]);
    expect(natural.state.events).toEqual([]);

    // Cmd_switchoutabilities clears gBattleMons first, then its
    // REQUEST_STATUS_BATTLE controller transfer writes that zero to the
    // departing party slot before the battle script advances.
    expect(natural.state.rulesContext.party.player[0].status1).toBe(0);
    const naturalBench = switchPlayerToPartyIndex(
      natural.state.rulesContext,
      1,
    );
    expect(naturalBench.battlers[0].status1).toBe(0);
    const naturalReturned = switchPlayerToPartyIndex(naturalBench, 0);
    expect(naturalReturned.battlers[0]).toMatchObject({
      species: STARMIE,
      ability: ABILITY_NATURAL_CURE,
      status1: 0,
    });

    const ordinaryContext = createBattleScriptRulesContext({
      ...naturalContext,
      battlers: naturalContext.battlers.map((candidate, index) =>
        index === 0
          ? Object.freeze({
              ...candidate,
              species: 19,
              ability: 50,
              types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
            })
          : candidate
      ) as unknown as BattleScriptRulesContextInput["battlers"],
      party: {
        ...naturalContext.party,
        player: [
          partyMember({
            species: 19,
            abilityNum: 0,
            status1: STATUS1_TOXIC_POISON,
          }),
          partyMember(),
          EMPTY_SLOT,
          EMPTY_SLOT,
          EMPTY_SLOT,
          EMPTY_SLOT,
        ],
      },
    });
    const ordinary = stepAt(SWITCHOUT_PC, ordinaryContext).result;
    if (ordinary.kind !== "advanced") throw new Error(`ordinary switch stopped at ${ordinary.kind}`);
    expect(ordinary.state.rulesContext.battlers[0].status1).toBe(toxic);
    expect(ordinary.state.rulesContext.party.player[0].status1).toBe(
      STATUS1_TOXIC_POISON,
    );
    expect(ordinary.state.scheduler.pendingControllerBattlers).toEqual([]);
    expect(ordinary.state.events).toEqual([]);
    const ordinaryBench = switchPlayerToPartyIndex(
      ordinary.state.rulesContext,
      1,
    );
    expect(ordinaryBench.battlers[0].status1).toBe(0);
    const ordinaryReturned = switchPlayerToPartyIndex(ordinaryBench, 0);
    expect(ordinaryReturned.battlers[0]).toMatchObject({
      species: 19,
      ability: 50,
      status1: STATUS1_TOXIC_POISON,
    });
  });

  it("ordinary switch-in reconstruction resets transient stages and rebuilds either a clean record or only the durable Toxic bit (counter zero)", () => {
    for (const durableStatus of [0, STATUS1_TOXIC_POISON]) {
      const context = rules({
        battlers: [
          battler({
            side: 0,
            species: 19,
            ability: 50,
            partyIndex: 1,
            status1: STATUS1_TOXIC_POISON | (5 << 8),
            statStages: [6, 8, 4, 6, 6, 6, 6, 6],
          }),
          battler({ side: 1 }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
        party: {
          player: [
            EMPTY_SLOT,
            partyMember({ status1: durableStatus }),
            EMPTY_SLOT,
            EMPTY_SLOT,
            EMPTY_SLOT,
            EMPTY_SLOT,
          ],
          opponent: [EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT],
        },
        selectorRoles: {
          attacker: 0,
          target: 1,
          effectBattler: 0,
          fainted: 0,
        },
        scriptingBattler: 0,
      });
      const rebuilt = stepAt(SWITCHIN_DATA_PC, context).result;
      if (rebuilt.kind !== "advanced") throw new Error(`switch-in rebuild stopped at ${rebuilt.kind}`);
      expect(rebuilt.state.rulesContext.battlers[0]).toMatchObject({
        species: STARMIE,
        partyIndex: 1,
        ability: ABILITY_NATURAL_CURE,
        status1: durableStatus,
        statStages: [6, 6, 6, 6, 6, 6, 6, 6],
      });
      expect(rebuilt.state.rulesContext.battlers[0].status1 & (15 << 8)).toBe(0);
    }
  });
});

describe("Gate-6 R15 Spikes switch-in damage, immunity, and event order", () => {
  it.each([
    [1, 160, 20],
    [2, 160, 26],
    [3, 160, 40],
  ] as const)(
    "layer %i applies the source fraction to grounded max HP %i and emits health-bar, HP, then message",
    (layers, maxHP, damage) => {
      const context = rules({
        battlers: [
          battler({ side: 0 }),
          battler({
            side: 1,
            species: 111,
            hp: maxHP,
            maxHP,
            types: ["TYPE_GROUND", "TYPE_ROCK"],
            ability: 31,
          }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
        sideStatuses: [0, SIDE_STATUS_SPIKES],
        sideTimers: [{}, { spikesAmount: layers }],
      });
      const first = stepAt(SWITCHIN_EFFECTS_PC, context);
      if (first.result.kind !== "advanced") {
        throw new Error(`Spikes dispatch stopped at ${first.result.kind}`);
      }
      expect(first.result.state.rulesContext.battleMoveDamage).toBe(damage);
      expect(first.result.state.rulesContext.sideStatuses[1]).toBe(
        SIDE_STATUS_SPIKES | SIDE_STATUS_SPIKES_DAMAGED,
      );
      const completed = finishSpikesScript(
        first.result.state,
        first.execution.handlers,
        SWITCHIN_EFFECTS_PC + 1,
      );
      expect(completed.rulesContext.battlers[1].hp).toBe(maxHP - damage);
      expect(completed.rulesContext.sideStatuses[1]).toBe(SIDE_STATUS_SPIKES);
      expect(completed.rulesContext.sideTimers[1].spikesAmount).toBe(layers);
      expect(completed.events.map((event) => event.kind)).toEqual([
        "health-bar-update",
        "hp-change",
        "message",
      ]);
      expect(completed.events[0]).toMatchObject({
        battler: 1,
        healthValue: damage,
      });
      expect(completed.events[1]).toMatchObject({
        battler: 1,
        from: maxHP,
        to: maxHP - damage,
      });
      expect(completed.events[2]).toMatchObject({
        messageId: "STRINGID_PKMNHURTBYSPIKES",
      });
    },
  );

  it.each([
    ["Flying Pidgeot", ["TYPE_NORMAL", "TYPE_FLYING"] as const, 51],
    ["Levitate Lunatone", ["TYPE_ROCK", "TYPE_PSYCHIC"] as const, ABILITY_LEVITATE],
  ])("%s takes no damage and emits no Spikes event", (_name, types, ability) => {
    const context = rules({
      battlers: [
        battler({ side: 0 }),
        battler({
          side: 1,
          hp: 177,
          maxHP: 177,
          types,
          ability,
        }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
      sideStatuses: [0, SIDE_STATUS_SPIKES],
      sideTimers: [{}, { spikesAmount: 3 }],
    });
    const result = stepAt(SWITCHIN_EFFECTS_PC, context).result;
    if (result.kind !== "advanced") throw new Error(`immune switch stopped at ${result.kind}`);
    expect(result.state.programCounter).toBe(SWITCHIN_EFFECTS_PC + 1);
    expect(result.state.rulesContext.battlers[1].hp).toBe(177);
    expect(result.state.rulesContext.sideStatuses[1]).toBe(SIDE_STATUS_SPIKES);
    expect(result.state.events).toEqual([]);
  });
});
