import { describe, expect, it } from "vitest";
import digFixture from "../tools/battle-lab/gate6-r2-hail-off.json" with { type: "json" };
import controlFixture from "../tools/battle-lab/gate6-r2-hail-control-off.json" with { type: "json" };
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  createBattleScriptStatusRulesHandlers,
  type BattleScriptPartyMemberInput,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import { runBattleEndTurnOrchestration } from "../src/engine/battleEndTurnOrchestration.ts";

const program = loadBattleScriptProgram();
const BATTLE_TYPE_FACTORY = 1 << 19;
const B_WEATHER_HAIL_TEMPORARY = 1 << 7;
const STATUS3_UNDERGROUND = 1 << 7;
const B_WAIT_TIME_LONG = 64;

function battler(
  changes: Partial<BattleScriptRulesBattler> & { maxHP?: number } = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? changes.hp ?? 100,
    moves: changes.moves ?? Object.freeze([0, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([0, 0, 0, 0]),
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
  }) as unknown as BattleScriptRulesBattler;
}

function partySlot(species: number, hp: number): BattleScriptPartyMemberInput {
  return { species, isEgg: false, hp };
}

function rules(status3: number) {
  const empty: BattleScriptPartyMemberInput = { species: 0, isEgg: false, hp: 0 };
  return createBattleScriptRulesContext({
    battlers: [
      battler({
        side: 0,
        species: 51,
        hp: 142,
        maxHP: 142,
        status3,
        types: ["TYPE_GROUND", "TYPE_GROUND"],
      }),
      battler({
        side: 1,
        species: 144,
        hp: 197,
        maxHP: 197,
        types: ["TYPE_ICE", "TYPE_FLYING"],
      }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1, fainted: null },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: 0,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    weather: B_WEATHER_HAIL_TEMPORARY,
    weatherTimer: 5,
    battlerByTurnOrder: [0, 1, 2, 3],
    party: {
      player: [partySlot(51, 142), empty, empty, empty, empty, empty],
      opponent: [partySlot(144, 197), empty, empty, empty, empty, empty],
    },
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags: BATTLE_TYPE_FACTORY,
      battlerPositions: [0, 1, 0xff, 0xff],
    },
  } satisfies BattleScriptRulesContextInput);
}

function ports(): BattleScriptStatusRulesExternalPorts {
  const externalPorts: BattleScriptStatusRulesExternalPorts = {
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
    resolveAttackerBattler: () => 0,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_context, operand) =>
      operand.expression === "B_WAIT_TIME_LONG" ? B_WAIT_TIME_LONG : null,
    resolveByteOperand: () => null,
  };
  return Object.freeze(externalPorts);
}

function runEndTurn(status3: number) {
  const external = ports();
  const context = rules(status3);
  const initial = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_HandleFaintedMon",
    context,
    0x1234_5678,
    external,
  ).state;
  return runBattleEndTurnOrchestration(
    program,
    createBattleScriptStatusRulesHandlers(program, external),
    initial,
  );
}

function eventKindsAndMessages(
  events: readonly { kind: string; messageId?: string }[],
) {
  return events.map((event) =>
    event.kind === "message" ? `message:${event.messageId}` : event.kind
  );
}

describe("Gate-6 R2 semi-invulnerability × damaging weather", () => {
  it("keeps both checked-in scenarios as complete honest parties and uses hail because Dugtrio is intrinsically sand-immune", () => {
    for (const fixture of [digFixture, controlFixture]) {
      expect(fixture.profile).toBe("battle-scene-off");
      expect(fixture.overrides.parties.player).toHaveLength(3);
      expect(fixture.overrides.parties.opponent).toHaveLength(3);
      for (const mon of [
        ...fixture.overrides.parties.player,
        ...fixture.overrides.parties.opponent,
      ]) {
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
      }
      expect(fixture.overrides.parties.player[0]?.species).toBe(51);
      expect(fixture.overrides.parties.opponent[0]).toMatchObject({
        species: 144,
        moves: [258, 258, 258, 258],
      });
    }
    expect(digFixture.overrides.parties.player[0]?.moves).toEqual([91, 91, 91, 91]);
    expect(controlFixture.overrides.parties.player[0]?.moves).toEqual([45, 45, 45, 45]);
  });

  it("suppresses the entire hail damage/message branch while underground", () => {
    const result = runEndTurn(STATUS3_UNDERGROUND);
    expect(result.kind).toBe("next-turn");
    if (result.kind !== "next-turn") throw new Error(`expected next-turn, got ${result.kind}`);
    expect(result.state.rulesContext).toMatchObject({
      weather: B_WEATHER_HAIL_TEMPORARY,
      weatherTimer: 4,
    });
    expect(result.state.rulesContext.battlers[0]).toMatchObject({
      hp: 142,
      status3: STATUS3_UNDERGROUND,
    });
    expect(result.state.rulesContext.party.player[0]?.hp).toBe(142);
    expect(eventKindsAndMessages(result.state.events)).toContain(
      "message:STRINGID_HAILCONTINUES",
    );
    expect(eventKindsAndMessages(result.state.events)).not.toContain(
      "message:STRINGID_PKMNPELTEDBYHAIL",
    );
    expect(result.state.events.some((event) => event.kind === "hp-change")).toBe(false);
  });

  it("after surfacing, orders the continues message before exact floor(maxHP/16) chip and its damage message", () => {
    const result = runEndTurn(0);
    expect(result.kind).toBe("next-turn");
    if (result.kind !== "next-turn") throw new Error(`expected next-turn, got ${result.kind}`);
    expect(result.state.rulesContext.battlers[0].hp).toBe(134);
    expect(result.state.rulesContext.party.player[0]?.hp).toBe(134);
    expect(result.state.rulesContext.battleMoveDamage).toBe(0);
    const ordered = eventKindsAndMessages(result.state.events);
    const continues = ordered.indexOf("message:STRINGID_HAILCONTINUES");
    const damageMessage = ordered.indexOf("message:STRINGID_PKMNPELTEDBYHAIL");
    const healthBar = ordered.indexOf("health-bar-update");
    const hpChange = ordered.indexOf("hp-change");
    expect([continues, damageMessage, healthBar, hpChange]).toEqual(
      [...[continues, damageMessage, healthBar, hpChange]].sort((a, b) => a - b),
    );
    expect(continues).toBeGreaterThanOrEqual(0);
    expect(142 - result.state.rulesContext.battlers[0].hp).toBe(
      Math.floor(142 / 16),
    );
  });
});
