import { describe, expect, it } from "vitest";
import {
  createBattleScriptRngState,
  stepBattleScriptMachine,
} from "../src/engine/battleScriptMachine.ts";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesContext,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
} from "../src/engine/battleScriptProgram.ts";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

const TRICK = 271;
const TACKLE = 33;
const ITEM_NONE = 0;
const ITEM_ORANGE_MAIL = 121;
const ITEM_RETRO_MAIL = 132;
const ITEM_ENIGMA_BERRY = 175;
const ITEM_CHOICE_BAND = 186;
const ITEM_LEFTOVERS = 200;
const ABILITY_STICKY_HOLD = 60;
const BATTLE_TYPE_TRAINER = 1 << 3;
const BATTLE_TYPE_FACTORY = 1 << 19;
const BATTLE_TYPE_TRAINER_HILL = 1 << 26;
const FACTORY_TRAINER = BATTLE_TYPE_TRAINER | BATTLE_TYPE_FACTORY;
const SEED = 0x1788_2f43;

const program = loadBattleScriptProgram();
const instruction = program.instructions.find(
  ({ opcodeName }) => opcodeName === "B_SCR_OP_TRYSWAPITEMS",
)!;

function config() {
  return {
    requestId: 1,
    rngSeed: SEED,
    player: {
      species: 162,
      moveId: TRICK,
      moves: [TRICK, 218, 247, 266] as const,
      pp: [10, 20, 15, 20] as const,
      ability: 50,
      item: ITEM_CHOICE_BAND,
      friendship: 0,
      attack: 120,
      defense: 100,
      spAttack: 80,
      spDefense: 90,
      speed: 140,
      hp: 160,
      types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
    },
    trainer: {
      species: 242,
      moveId: TACKLE,
      moves: [TACKLE, TACKLE, TACKLE, TACKLE] as const,
      pp: [35, 35, 35, 35] as const,
      ability: 30,
      item: ITEM_LEFTOVERS,
      attack: 30,
      defense: 220,
      spAttack: 30,
      spDefense: 220,
      speed: 5,
      hp: 350,
      types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
    },
  };
}

function ports(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: (context) =>
      context.state.scheduler.pendingControllerBattlers.length === 0,
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
    resolveAttackerBattler: (context) =>
      context.state.rulesContext.selectorRoles.attacker,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_context, operand) =>
      operand.expression === "B_WAIT_TIME_SHORT" ? 32 : null,
    resolveByteOperand: () => null,
  });
}

type RulesChanges = Readonly<{
  attacker?: 0 | 1;
  target?: 0 | 1;
  flags?: number;
  items?: readonly [number, number];
  abilities?: readonly [number, number];
  knockedOffMons?: readonly [number, number];
  choicedMove?: readonly [number, number, number, number];
}>;

function rules(changes: RulesChanges = {}): BattleScriptRulesContext {
  const initial = createFactoryFullTurnBattleState(config());
  const base = initial.rules.rulesContext;
  const items = changes.items ?? [ITEM_CHOICE_BAND, ITEM_LEFTOVERS];
  const abilities = changes.abilities ?? [50, 30];
  const battlers = base.battlers.map((battler, index) =>
    index < 2
      ? Object.freeze({
        ...battler,
        item: items[index]!,
        ability: abilities[index]!,
      })
      : battler
  );
  const party = {
    player: base.party.player.map((member, index) =>
      index === 0 ? { ...member, item: items[0] } : member
    ),
    opponent: base.party.opponent.map((member, index) =>
      index === 0 ? { ...member, item: items[1] } : member
    ),
  };
  const attacker = changes.attacker ?? 0;
  const target = changes.target ?? 1;
  return createBattleScriptRulesContext({
    ...base,
    battlers,
    party,
    selectorRoles: { attacker, target, effectBattler: target, fainted: null },
    scriptingBattler: attacker,
    currentMove: TRICK,
    currentMovePosition: 0,
    chosenMove: TRICK,
    battleTopology: {
      ...base.battleTopology,
      battleTypeFlags: changes.flags ?? FACTORY_TRAINER,
    },
    knockedOffMons: changes.knockedOffMons,
    choicedMove: changes.choicedMove,
  });
}

function stepOpcode(source: BattleScriptRulesContext) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectTrick",
    source,
    SEED,
    ports(),
  );
  const before = Object.freeze({
    ...execution.state,
    programCounter: instruction.programCounter,
  });
  const result = stepBattleScriptMachine(program, before, execution.handlers);
  if (result.kind !== "advanced") {
    throw new Error(`tryswapitems stopped at ${result.kind}`);
  }
  return { before, after: result.state };
}

describe("source-complete B_SCR_OP_TRYSWAPITEMS registration", () => {
  it("pins opcode 0xd2, its four-byte relocation pointer, five-byte success advance, and exact Trick script order", () => {
    expect(program.instructions.filter(
      ({ opcodeName }) => opcodeName === "B_SCR_OP_TRYSWAPITEMS",
    )).toEqual([instruction]);
    expect(instruction).toMatchObject({
      opcodeId: 0xd2,
      dispatcher: "Cmd_tryswapitems",
      operands: [
        expect.objectContaining({
          widthBytes: 4,
          expression: "BattleScript_ButItFailed",
        }),
      ],
      source: { label: "BattleScript_EffectTrick" },
    });
    expect(
      1 + instruction.operands.reduce(
        (sum, operand) => sum + operand.widthBytes,
        0,
      ),
    ).toBe(5);
    const entry = resolveBattleScriptLabel(program, "BattleScript_EffectTrick")!;
    expect(program.instructions.slice(
      entry.programCounter,
      entry.programCounter + 7,
    ).map(({ opcodeName }) => opcodeName)).toEqual([
      "B_SCR_OP_ATTACKCANCELER",
      "B_SCR_OP_ATTACKSTRING",
      "B_SCR_OP_PPREDUCE",
      "B_SCR_OP_JUMPIFSTATUS2",
      "B_SCR_OP_ACCURACYCHECK",
      "B_SCR_OP_TRYSWAPITEMS",
      "B_SCR_OP_ATTACKANIMATION",
    ]);
  });

  it.each([
    ["Trainer Hill", { flags: FACTORY_TRAINER | BATTLE_TYPE_TRAINER_HILL }],
    ["opponent attacker in a regular battle", {
      attacker: 1, target: 0, flags: BATTLE_TYPE_TRAINER,
    }],
    ["attacker's knocked-off party slot in a regular battle", {
      flags: BATTLE_TYPE_TRAINER, knockedOffMons: [1, 0],
    }],
    ["target's knocked-off party slot in a regular battle", {
      flags: BATTLE_TYPE_TRAINER, knockedOffMons: [0, 1],
    }],
    ["two empty items", { items: [ITEM_NONE, ITEM_NONE] }],
    ["attacker Enigma Berry", { items: [ITEM_ENIGMA_BERRY, ITEM_LEFTOVERS] }],
    ["target Enigma Berry", { items: [ITEM_CHOICE_BAND, ITEM_ENIGMA_BERRY] }],
  ] as const)("ordinary rejection: %s jumps to the relocation pointer with no mutation/RNG/event", (_name, changes) => {
    const source = rules(changes);
    const { before, after } = stepOpcode(source);
    expect(after.programCounter).toBe(
      resolveBattleScriptLabel(program, "BattleScript_ButItFailed")!
        .programCounter,
    );
    expect(after.rulesContext).toBe(source);
    expect(after.rng).toBe(before.rng);
    expect(after.events).toBe(before.events);
    expect(after.scheduler).toBe(before.scheduler);
  });

  it("rejects every Mail id in both orientations through the ordinary relocation pointer", () => {
    const failurePc = resolveBattleScriptLabel(
      program,
      "BattleScript_ButItFailed",
    )!.programCounter;
    for (
      let item = ITEM_ORANGE_MAIL;
      item <= ITEM_RETRO_MAIL;
      item += 1
    ) {
      for (const items of [
        [item, ITEM_LEFTOVERS],
        [ITEM_CHOICE_BAND, item],
      ] as const) {
        const { before, after } = stepOpcode(rules({ items }));
        expect(after.programCounter, `${item}/${items[0] === item ? "attacker" : "target"}`)
          .toBe(failurePc);
        expect(after.rulesContext).toBe(before.rulesContext);
        expect(after.rng).toBe(before.rng);
      }
    }
  });

  it("Sticky Hold uses its fixed script, sets the target ability through the existing RecordAbilityBattle seam, and leaves items untouched", () => {
    const source = rules({ abilities: [50, ABILITY_STICKY_HOLD] });
    const { before, after } = stepOpcode(source);
    expect(after.programCounter).toBe(
      resolveBattleScriptLabel(
        program,
        "BattleScript_StickyHoldActivates",
      )!.programCounter,
    );
    expect(after.rulesContext).toEqual({
      ...source,
      lastUsedAbility: ABILITY_STICKY_HOLD,
      aiObservedAbilityIds: [0, ABILITY_STICKY_HOLD, 0, 0],
    });
    expect(after.rulesContext.battlers).toBe(source.battlers);
    expect(after.rulesContext.party).toBe(source.party);
    expect(after.rng).toBe(before.rng);
    expect(after.events).toBe(before.events);
  });

  it("success creates the exact transient active/controller/change/Choice state with zero local RNG", () => {
    const source = rules({
      choicedMove: [TRICK, TACKLE, 0, 0],
    });
    const { before, after } = stepOpcode(source);
    expect(after.programCounter).toBe(instruction.programCounter + 1);
    expect(after.rulesContext.battlers[0].item).toBe(ITEM_NONE);
    expect(after.rulesContext.battlers[1].item).toBe(ITEM_CHOICE_BAND);
    expect(after.rulesContext.party.player[0].item).toBe(ITEM_LEFTOVERS);
    expect(after.rulesContext.party.opponent[0].item).toBe(ITEM_CHOICE_BAND);
    expect(after.rulesContext.changedItems).toEqual([
      ITEM_LEFTOVERS, 0, 0, 0,
    ]);
    expect(after.rulesContext.choicedMove).toEqual([0, 0, 0, 0]);
    expect(after.rulesContext.multistringChooser).toBe(2);
    expect(after.rulesContext.battleTextBuff1Item).toBe(ITEM_LEFTOVERS);
    expect(after.rulesContext.battleTextBuff2Item).toBe(ITEM_CHOICE_BAND);
    expect(after.scheduler.pendingControllerBattlers).toEqual([0, 1]);
    expect(after.events.slice(-2).map((event) =>
      event.kind === "set-battler-item"
        ? { kind: event.kind, battler: event.battler, item: event.item }
        : { kind: event.kind }
    )).toEqual([
      { kind: "set-battler-item", battler: 0, item: ITEM_LEFTOVERS },
      { kind: "set-battler-item", battler: 1, item: ITEM_CHOICE_BAND },
    ]);
    expect(after.rng).toBe(before.rng);
    expect(after.rng).toEqual(createBattleScriptRngState(SEED));
  });

  it.each([
    ["takes the target item", [ITEM_NONE, ITEM_LEFTOVERS], 0],
    ["gives the attacker item", [ITEM_CHOICE_BAND, ITEM_NONE], 1],
  ] as const)("%s and selects the source item-result message row", (_name, items, chooser) => {
    const { after } = stepOpcode(rules({ items }));
    expect(after.rulesContext.multistringChooser).toBe(chooser);
    expect(after.rulesContext.changedItems[0]).toBe(items[1]);
    expect(after.rulesContext.party.player[0].item).toBe(items[1]);
    expect(after.rulesContext.party.opponent[0].item).toBe(items[0]);
  });

  it("spends PP before Sticky Hold's fixed failure script in a complete submitted turn", () => {
    const source = config();
    const initial = createFactoryFullTurnBattleState({
      ...source,
      trainer: {
        ...source.trainer,
        ability: ABILITY_STICKY_HOLD,
      },
    });
    const player = submitFactoryFullTurnDecision(initial, {
      requestId: 1,
      side: "player",
      decision: {
        kind: "use-move",
        moveSlot: 0,
        targetBattler: 1,
      },
    });
    if (player.kind !== "decision-required") {
      throw new Error(`expected trainer decision, got ${player.kind}`);
    }
    const result = submitFactoryFullTurnDecision(player.state, {
      requestId: 2,
      side: "trainer",
      decision: {
        kind: "use-move",
        moveSlot: 0,
        targetBattler: 0,
      },
    });
    if (result.kind !== "decision-required") {
      throw new Error(`expected next-turn decision, got ${result.kind}`);
    }
    const context = result.state.rules.rulesContext;
    expect(context.battlers[0].pp[0]).toBe(9);
    expect(context.battlers[0].item).toBe(ITEM_CHOICE_BAND);
    expect(context.battlers[1].item).toBe(ITEM_LEFTOVERS);
    expect(context.party.player[0].item).toBe(ITEM_CHOICE_BAND);
    expect(context.party.opponent[0].item).toBe(ITEM_LEFTOVERS);
    expect(result.events.some(
      ({ payload }) => payload.kind === "set-battler-item",
    )).toBe(false);
    expect(result.events.some(
      ({ payload }) =>
        payload.kind === "message"
        && payload.messageId === "STRINGID_PKMNSXMADEYINEFFECTIVE",
    )).toBe(true);
  });

  it("runs Furret Trick end-to-end through submitBattleDecision: PP first, both persistent items swapped, and MOVEEND_CHANGED_ITEMS restores/clears the attacker slot", () => {
    const initial = createFactoryFullTurnBattleState(config());
    const player = submitFactoryFullTurnDecision(initial, {
      requestId: 1,
      side: "player",
      decision: {
        kind: "use-move",
        moveSlot: 0,
        targetBattler: 1,
      },
    });
    if (player.kind !== "decision-required") {
      throw new Error(`expected trainer decision, got ${player.kind}`);
    }
    const result = submitFactoryFullTurnDecision(player.state, {
      requestId: 2,
      side: "trainer",
      decision: {
        kind: "use-move",
        moveSlot: 0,
        targetBattler: 0,
      },
    });
    if (result.kind !== "decision-required") {
      throw new Error(
        `expected next-turn decision, got ${result.kind} ${
          result.kind === "machine-barrier"
            ? JSON.stringify(result.barrier)
            : ""
        }`,
      );
    }

    const context = result.state.rules.rulesContext;
    expect(context.battlers[0].pp[0]).toBe(9);
    expect(context.battlers[0].item).toBe(ITEM_LEFTOVERS);
    expect(context.battlers[1].item).toBe(ITEM_CHOICE_BAND);
    expect(context.party.player[0].item).toBe(ITEM_LEFTOVERS);
    expect(context.party.opponent[0].item).toBe(ITEM_CHOICE_BAND);
    expect(context.changedItems).toEqual([0, 0, 0, 0]);
    expect(result.events.filter(
      ({ payload }) => payload.kind === "set-battler-item",
    ).map(({ payload, provenance }) => ({
      battler: payload.kind === "set-battler-item"
        ? payload.battler
        : null,
      item: payload.kind === "set-battler-item" ? payload.item : null,
      opcode: provenance?.opcodeName,
    }))).toEqual([
      {
        battler: 0,
        item: ITEM_LEFTOVERS,
        opcode: "B_SCR_OP_TRYSWAPITEMS",
      },
      {
        battler: 1,
        item: ITEM_CHOICE_BAND,
        opcode: "B_SCR_OP_TRYSWAPITEMS",
      },
    ]);
    const ppEvent = result.events.find(
      ({ payload }) =>
        payload.kind === "set-battler-pp-data"
        && payload.battler === 0,
    );
    expect(ppEvent?.payload).toMatchObject({ pp: 9 });
    expect(ppEvent?.provenance?.opcodeName).toBe("B_SCR_OP_PPREDUCE");
    expect(result.events.find(
      ({ payload }) =>
        payload.kind === "message"
        && payload.messageId === "STRINGID_PKMNOBTAINEDXYOBTAINEDZ",
    )?.payload).toEqual({
      kind: "message",
      messageId: "STRINGID_PKMNOBTAINEDXYOBTAINEDZ",
      substitutions: ["LEFTOVERS", "CHOICE BAND"],
    });
    // One accuracy roll for Trick plus Tackle's four standard hit-chain
    // rolls; the direct opcode test above proves tryswapitems adds none.
    expect(result.state.rng.calls).toBe(6);
  });
});
