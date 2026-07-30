import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  createBattleScriptStatusRulesHandlers,
  type BattleScriptPartyMemberInput,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { runBattleEndTurnOrchestration } from "../src/engine/battleEndTurnOrchestration.ts";
import type { BattleScriptSemanticEvent } from "../src/engine/battleScriptEvents.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";

const program = loadBattleScriptProgram();
const BATTLE_TYPE_FACTORY = 1 << 19;
const B_WEATHER_SANDSTORM_TEMPORARY = 1 << 3;
const ITEM_SITRUS_BERRY = 142;
const ITEM_LEFTOVERS = 200;

function battler(
  changes: Partial<BattleScriptRulesBattler> & { maxHP?: number } = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? changes.hp ?? 100,
    moves: changes.moves ?? Object.freeze([33, 0, 0, 0]),
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
    species: changes.species ?? 1,
    attack: changes.attack ?? 50,
    defense: changes.defense ?? 50,
    spAttack: changes.spAttack ?? 50,
    spDefense: changes.spDefense ?? 50,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 70,
    partyIndex: changes.partyIndex ?? 0,
  });
}

function partySlot(species: number, hp: number): BattleScriptPartyMemberInput {
  return { species, isEgg: false, hp };
}

const EMPTY_SLOT: BattleScriptPartyMemberInput = {
  species: 0,
  isEgg: false,
  hp: 0,
};

function endTurnContext(
  item: number,
  hp: number,
  weather: number,
): ReturnType<typeof createBattleScriptRulesContext> {
  return createBattleScriptRulesContext({
    battlers: [
      battler({
        side: 0,
        hp,
        maxHP: 160,
        item,
        types: ["TYPE_NORMAL", "TYPE_NORMAL"],
      }),
      battler({
        side: 1,
        species: 74,
        hp: 160,
        maxHP: 160,
        types: ["TYPE_ROCK", "TYPE_GROUND"],
      }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1, fainted: null },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: 33,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    weather,
    weatherTimer: weather === 0 ? 0 : 5,
    battlerByTurnOrder: [0, 1, 2, 3],
    party: {
      player: [partySlot(1, hp), EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT],
      opponent: [partySlot(74, 160), EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT],
    },
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags: BATTLE_TYPE_FACTORY,
      battlerPositions: [0, 1, 0xff, 0xff],
    },
  } satisfies BattleScriptRulesContextInput);
}

const ports = Object.freeze({
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
  resolveAttackerBattler: () => 0 as const,
  resolveBattlerAtPosition: () => null,
  resolveHalfwordOperand: (_context, operand) =>
    operand.expression === "B_WAIT_TIME_LONG" ? 64 : null,
  resolveByteOperand: () => null,
} satisfies BattleScriptStatusRulesExternalPorts);

function runEndTurn(item: number, hp: number, weather: number) {
  const rulesContext = endTurnContext(item, hp, weather);
  const initial = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_HandleFaintedMon",
    rulesContext,
    0x1234_5678,
    ports,
  ).state;
  const result = runBattleEndTurnOrchestration(
    program,
    createBattleScriptStatusRulesHandlers(program, ports),
    initial,
  );
  if (result.kind !== "next-turn") {
    throw new Error(`K1 end-turn pass stopped at ${result.kind}`);
  }
  return result.state;
}

function hpChangesForBattler(
  events: readonly BattleScriptSemanticEvent[],
  battlerId: number,
) {
  return events.flatMap((event) =>
    event.kind === "hp-change" && event.battler === battlerId
      ? [{ from: event.from, to: event.to }]
      : []
  );
}

describe("Gate-6 K1 weather × held-item end-turn ordering", () => {
  it("finishes sand chip before Leftovers heals, while the no-weather control performs only the heal", () => {
    const sand = runEndTurn(
      ITEM_LEFTOVERS,
      100,
      B_WEATHER_SANDSTORM_TEMPORARY,
    );
    expect(hpChangesForBattler(sand.events, 0)).toEqual([
      { from: 100, to: 90 },
      { from: 90, to: 100 },
    ]);
    expect(sand.rulesContext.battlers[0]).toMatchObject({
      hp: 100,
      item: ITEM_LEFTOVERS,
    });
    expect(sand.rulesContext.party.player[0]?.hp).toBe(100);

    const clear = runEndTurn(ITEM_LEFTOVERS, 100, 0);
    expect(hpChangesForBattler(clear.events, 0)).toEqual([
      { from: 100, to: 110 },
    ]);
    expect(clear.rulesContext.battlers[0].hp).toBe(110);
  });

  it("lets weather chip cross Sitrus's half-HP gate before the item pass; without weather the berry stays dormant", () => {
    const sand = runEndTurn(
      ITEM_SITRUS_BERRY,
      85,
      B_WEATHER_SANDSTORM_TEMPORARY,
    );
    expect(hpChangesForBattler(sand.events, 0)).toEqual([
      { from: 85, to: 75 },
      { from: 75, to: 105 },
    ]);
    expect(sand.rulesContext.battlers[0]).toMatchObject({
      hp: 105,
      item: 0,
    });
    expect(sand.rulesContext.party.player[0]?.hp).toBe(105);

    const clear = runEndTurn(ITEM_SITRUS_BERRY, 85, 0);
    expect(hpChangesForBattler(clear.events, 0)).toEqual([]);
    expect(clear.rulesContext.battlers[0]).toMatchObject({
      hp: 85,
      item: ITEM_SITRUS_BERRY,
    });
  });
});
