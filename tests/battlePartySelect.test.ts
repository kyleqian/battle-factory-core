import { describe, expect, it } from "vitest";
import { createFramebuffer } from "../src/engine/framebuffer.ts";
import {
  advanceBattlePartySelect,
  battlePartyNoEnergyMessage,
  createBattlePartySelectState,
  renderBattlePartySelect,
  type BattlePartySelectState,
} from "../src/engine/battlePartySelect.ts";
import {
  advanceFactoryRoundPresentation,
  completeFactoryRoundPresentation,
  createFactoryRoundBattleOrchestrator,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";
import type { FactoryRentalRecord } from "../src/engine/battleScenario.ts";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";

const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));

function record(setId: number): FactoryRentalRecord {
  const set = frontierMonsData.entries[setId]!;
  const personality = natureByName.get(set.nature)!;
  const input = { setId, personality, fixedIv: 31, abilitySlot: (personality & 1) as 0 | 1 };
  return Object.freeze({
    ...input,
    abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot,
  });
}

function liveSelector() {
  const records = [record(664), record(678), record(527)] as const;
  let carrier = createFactoryRoundBattleOrchestrator({
    id: "voluntary-party-render-test",
    rngValue: 4,
    factoryWinStreak: 0,
    playerTrainerId: 0x12345678,
    battleTowerLevel50WinStreak: 0,
    facilityState: { rentsCount: 0 },
    rentals: {
      type: "currentRecords",
      playerRentalRecords: records,
      savedRentalRecords: [...records, record(1), record(2), record(3)],
    },
  });
  const commandId = carrier.round.presentation!.command.commandId;
  carrier = advanceFactoryRoundPresentation(
    completeFactoryRoundPresentation(carrier, { commandId }),
  );
  const battle = carrier.battle!;
  const request = battle.boundary.kind === "decision-required"
    && battle.boundary.request.kind === "command"
    ? battle.boundary.request
    : null;
  if (!request) throw new Error("expected live player command");
  return createBattlePartySelectState(request, battle.rules.rulesContext);
}

describe("voluntary battle party selector", () => {
  it("constructs and renders all rows from live noncanonical records and SPECIES_* icons", () => {
    const state = liveSelector();
    expect(state.rows.map((row) => row.speciesKey)).toEqual([
      "SPECIES_GRANBULL",
      "SPECIES_HARIYAMA",
      "SPECIES_MACHAMP",
    ]);
    expect(state.rows.map((row) => row.name)).toEqual(["GRANBULL", "HARIYAMA", "MACHAMP"]);
    expect(state.rows.every((row) => row.maxHP > 0 && row.level === 50)).toBe(true);

    const fb = createFramebuffer();
    renderBattlePartySelect(fb, state);
    const iconRegion = fb.slice((2 * 240 + 0) * 4, (58 * 240 + 144) * 4);
    expect(iconRegion.some((channel) => channel !== 0 && channel !== 255)).toBe(true);
  });

  it("follows the source single-layout cursor edges, including Cancel", () => {
    let state = liveSelector();
    state = advanceBattlePartySelect(state, new Set(["UP"]));
    expect(state.cursor).toBe("cancel");
    state = advanceBattlePartySelect(state, new Set(["DOWN"]));
    expect(state.cursor).toBe(0);
    state = advanceBattlePartySelect(state, new Set(["DOWN"]));
    expect(state.cursor).toBe(1);
    state = advanceBattlePartySelect(state, new Set(["DOWN"]));
    expect(state.cursor).toBe(2);
    state = advanceBattlePartySelect(state, new Set(["DOWN"]));
    expect(state.cursor).toBe("cancel");
    state = advanceBattlePartySelect(state, new Set(["UP"]));
    expect(state.cursor).toBe(2);
    state = advanceBattlePartySelect(state, new Set(["LEFT"]));
    expect(state.cursor).toBe(0);
    state = advanceBattlePartySelect(state, new Set(["RIGHT"]));
    expect(state.cursor).toBe(2);
  });

  it("prints the source fainted-row refusal and remains in the selector", () => {
    const base = liveSelector();
    const faintedRow = Object.freeze({
      ...base.rows[1],
      hp: 0,
      fainted: true,
      legal: false,
    });
    let state: BattlePartySelectState = {
      ...base,
      rows: Object.freeze([base.rows[0], faintedRow, base.rows[2]]) as typeof base.rows,
      cursor: 1 as const,
    };
    state = advanceBattlePartySelect(state, new Set(["A"]));
    state = advanceBattlePartySelect(state, new Set(["A"]));
    expect(state.message).toBe("HARIYAMA has no energy\nleft to battle!");
    expect(state.message).toBe(battlePartyNoEnergyMessage(faintedRow));
    expect(state.outcome).toBeNull();
    expect(state.submenuOpen).toBe(false);
    expect(advanceBattlePartySelect(state, new Set()).message).toBe(state.message);
  });
});
