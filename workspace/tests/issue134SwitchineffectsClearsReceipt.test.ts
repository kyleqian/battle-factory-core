import { describe, expect, it } from "vitest";
import controlFixture from "../tools/battle-lab/issue134-switchineffects-clears-control-off.json" with { type: "json" };
import intimidateFixture from "../tools/battle-lab/issue134-switchineffects-clears-intimidate-off.json" with { type: "json" };
import receipt from "../tools/probe/receipts/issue134-switchineffects-clears-off.json" with { type: "json" };
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptPartyMemberInput,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";

/**
 * ISSUES #134 receipt. `tools/probe/receipts/issue134-switchineffects-clears-off.json`
 * is the stock ROM's own answer to the audit's finding 1
 * (`docs/faint-replacement-audit-2026-08-26.md` section 4a): does an
 * Intimidate switch-in clear `SIDE_STATUS_SPIKES_DAMAGED`, so that the NEXT
 * switch-in on that side takes Spikes damage?
 *
 * The ROM says yes -- `battle_script_commands.c:5268` runs for Intimidate
 * because `battle_util.c:2559-2565`'s ON_SWITCHIN case sets only
 * `STATUS3_INTIMIDATE_POKES` and breaks with no `effect++`, so
 * `AbilityBattleEffects` returns 0 and `Cmd_switchineffects` enters its
 * `if (!Ability && !Item)` body. Both receipt arms damage the third entrant.
 *
 * These cases replay the receipt's two player-side entries through the kernel's
 * own `Cmd_switchineffects` on the voluntary-switch path
 * (`data/battle_scripts_1.s:3118` `switchineffects BS_ATTACKER`, the opcode the
 * ROM trace shows running: every `SIDE_STATUS_SPIKES_DAMAGED` clear frame in
 * the receipt resolves to `BattleScript_DoSwitchOut+32`), carrying the side
 * state from the first entry into the second exactly as the battle does.
 */
const program = loadBattleScriptProgram();
const TACKLE = 33;
const SIDE_STATUS_SPIKES = 1 << 4;
const SIDE_STATUS_SPIKES_DAMAGED = 1 << 9;
/** include/constants/abilities.h. */
const ABILITY_STURDY = 5;
const ABILITY_OBLIVIOUS = 12;
const ABILITY_INTIMIDATE = 22;
const ABILITY_GUTS = 62;
/** src/data/gen/species-{stats,types}.json. */
const TAUROS = 128;
const MACHOP = 66;
const WHISCASH = 324;
const FORRETRESS = 205;
const BATTLE_TYPE_TRAINER = 1 << 3;
const BATTLE_TYPE_FACTORY = 1 << 19;

const SPECIES_PROFILE: Readonly<Record<number, { ability: number; types: readonly [string, string] }>> =
  Object.freeze({
    [TAUROS]: { ability: ABILITY_INTIMIDATE, types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const },
    [MACHOP]: { ability: ABILITY_GUTS, types: ["TYPE_FIGHTING", "TYPE_FIGHTING"] as const },
    [WHISCASH]: { ability: ABILITY_OBLIVIOUS, types: ["TYPE_WATER", "TYPE_GROUND"] as const },
    [FORRETRESS]: { ability: ABILITY_STURDY, types: ["TYPE_BUG", "TYPE_STEEL"] as const },
  });

const EMPTY_SLOT: BattleScriptPartyMemberInput = { species: 0, isEgg: false, hp: 0 };
const EMPTY_PARTY = [EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT];

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? 100,
    moves: changes.moves ?? Object.freeze([TACKLE, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([35, 0, 0, 0]),
    status1: 0,
    status2: 0,
    status3: changes.status3 ?? 0,
    substituteHP: 0,
    rolloutTimer: 0,
    furyCutterCounter: 0,
    truantCounter: 0,
    rechargeTimer: 0,
    flinchImmobility: 0,
    disabledMove: 0,
    usedDisabledMove: 0,
    tauntTimer: 0,
    usedTauntedMove: 0,
    usedImprisonedMove: 0,
    item: 0,
    statStages: [6, 6, 6, 6, 6, 6, 6, 6],
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 0,
    attack: 0,
    defense: 0,
    spAttack: 0,
    spDefense: 0,
    level: 50,
    friendship: 70,
    partyIndex: changes.partyIndex ?? 0,
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

/** `data/battle_scripts_1.s:3118` -- the voluntary-switch `switchineffects BS_ATTACKER`. */
const SWITCHINEFFECTS_PC = (() => {
  const found = program.instructions.find(
    (instruction) => instruction.opcodeName === "B_SCR_OP_SWITCHINEFFECTS"
      && instruction.source.label === "BattleScript_DoSwitchOut",
  );
  if (!found) throw new Error("no switchineffects instruction under BattleScript_DoSwitchOut");
  return found.programCounter;
})();

interface EntryResult {
  readonly hp: number;
  readonly sideStatuses0: number;
  readonly hitMarker: number;
}

/**
 * Runs one player-side entry through `Cmd_switchineffects` and its pushed
 * Spikes script, exactly as the ROM's `BattleScript_DoSwitchOut` does, and
 * returns the entrant's HP plus the side state it leaves behind.
 */
function runEntry(options: {
  readonly species: number;
  readonly maxHP: number;
  readonly sideStatuses0: number;
  readonly spikesLayers: number;
  readonly hitMarker?: number;
}): EntryResult {
  const profile = SPECIES_PROFILE[options.species];
  if (!profile) throw new Error(`no species profile for ${options.species}`);
  const rulesContext: BattleScriptRulesContext = createBattleScriptRulesContext({
    battlers: [
      battler({
        side: 0,
        species: options.species,
        ability: profile.ability,
        types: profile.types,
        hp: options.maxHP,
        maxHP: options.maxHP,
        partyIndex: 1,
      }),
      battler({
        side: 1,
        species: FORRETRESS,
        ability: ABILITY_STURDY,
        types: SPECIES_PROFILE[FORRETRESS]!.types,
        hp: 150,
        maxHP: 150,
      }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 0, fainted: 0 },
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
    hitMarker: options.hitMarker ?? 0,
    multiHitCounter: 0,
    monToSwitchIntoId: [6, 6, 6, 6],
    sideStatuses: [options.sideStatuses0, 0],
    sideTimers: [{ spikesAmount: options.spikesLayers }, {}],
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags: BATTLE_TYPE_TRAINER | BATTLE_TYPE_FACTORY,
      battlerPositions: [0, 1, 2, 3],
    },
    party: { player: EMPTY_PARTY, opponent: EMPTY_PARTY },
  });
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_DoSwitchOut",
    rulesContext,
    1,
    externalPorts(),
  );
  let state: BattleScriptMachineState<BattleScriptRulesContext> = Object.freeze({
    ...execution.state,
    programCounter: SWITCHINEFFECTS_PC,
  });
  for (let guard = 0; guard < 400 && state.programCounter !== SWITCHINEFFECTS_PC + 1; guard += 1) {
    for (const pending of state.scheduler.pendingControllerBattlers) {
      state = acknowledgeBattleScriptMachineController(state, pending);
    }
    const next = stepBattleScriptMachine(program, state, execution.handlers);
    if (next.kind === "halted" || next.kind === "unsupported") {
      throw new Error(`switchineffects stopped at ${next.kind}: ${JSON.stringify(next.state.haltReason)}`);
    }
    state = next.state;
  }
  if (state.programCounter !== SWITCHINEFFECTS_PC + 1) {
    throw new Error("switchineffects never advanced past its own opcode");
  }
  return {
    hp: state.rulesContext.battlers[0].hp,
    sideStatuses0: state.rulesContext.sideStatuses[0],
    hitMarker: state.rulesContext.hitMarker,
  };
}

describe("ISSUES #134 receipt -- switchineffects clears SPIKES_DAMAGED on every ON_SWITCHIN-returns-0 exit", () => {
  it.each([
    ["intimidate", intimidateFixture],
    ["control", controlFixture],
  ] as const)("%s arm: the committed fixture matches the receipt's recorded fixture", (arm, fixture) => {
    const recorded = receipt.arms[arm];
    expect(recorded.fixture).toBe(`tools/battle-lab/issue134-switchineffects-clears-${arm}-off.json`);
    expect(fixture.overrides.parties.player.map((mon) => mon.species))
      .toEqual(recorded.rom.playerPartySpecies);
    expect(fixture.overrides.parties.opponent[0].moves).toEqual([191, 191, 191, 191]);
  });

  it.each(["intimidate", "control"] as const)(
    "%s arm: the kernel reproduces the ROM's per-entry Spikes damage and SPIKES_DAMAGED state",
    (arm) => {
      const recorded = receipt.arms[arm].rom;
      const [firstEntry, secondEntry] = recorded.entries;

      const first = runEntry({
        species: firstEntry.species,
        maxHP: firstEntry.maxHp,
        sideStatuses0: SIDE_STATUS_SPIKES,
        spikesLayers: firstEntry.spikesLayersAtEntry,
      });
      expect(first.hp).toBe(firstEntry.hpAfterEntry);
      expect(firstEntry.maxHp - first.hp).toBe(firstEntry.spikesDamage);
      expect((first.sideStatuses0 & SIDE_STATUS_SPIKES_DAMAGED) !== 0)
        .toBe(firstEntry.spikesDamagedBitAtWindowEnd);

      // The second entry inherits the side state the first one left behind --
      // this is the cell the port used to leave dirty.
      const second = runEntry({
        species: secondEntry.species,
        maxHP: secondEntry.maxHp,
        sideStatuses0: first.sideStatuses0,
        spikesLayers: secondEntry.spikesLayersAtEntry,
      });
      expect(second.hp).toBe(secondEntry.hpAfterEntry);
      expect(secondEntry.maxHp - second.hp).toBe(secondEntry.spikesDamage);
      expect((second.sideStatuses0 & SIDE_STATUS_SPIKES_DAMAGED) !== 0)
        .toBe(secondEntry.spikesDamagedBitAtWindowEnd);
    },
  );

  it("both arms end the third entrant on the same HP -- the Intimidate arm is not a special case", () => {
    expect(receipt.arms.intimidate.rom.entries[1].hpAfterEntry)
      .toBe(receipt.arms.control.rom.entries[1].hpAfterEntry);
  });

  it("the ROM never left a HITMARKER_FAINTED bit set in either arm (no faint in this fixture)", () => {
    expect(receipt.arms.intimidate.rom.hitMarkerFaintedEvents).toEqual([]);
    expect(receipt.arms.control.rom.hitMarkerFaintedEvents).toEqual([]);
  });
});
