import { describe, expect, it } from "vitest";
import {
  drawGeneratedPlayerMaterialize,
  generatedPlayerMaterializeSettleY2,
} from "../src/engine/battleScene.ts";
import {
  playerMaterializeSettleTintCoeff,
  playerMaterializeSettleY2,
  PLAYER_MATERIALIZE_SETTLE_START_TICK,
} from "../src/engine/battleMenu.ts";
import { createBattleCommandFieldRenderView } from "../src/engine/battleCommandPresentationRender.ts";
import type { BattleCommandFieldBattler } from "../src/engine/battleCommandPresentation.ts";

const KADABRA = { species: 64, speciesSymbol: "KADABRA" };
const ONIX = { species: 95, speciesSymbol: "ONIX" };
const GENERATED_PLAYER_NEUTRAL_Y_VISUAL_TICK = 1670;
const KADABRA_SPECIES_ID = 64;
const ONIX_SPECIES_ID = 95;

function battler(species: number): BattleCommandFieldBattler {
  return Object.freeze({
    side: "player",
    battler: 0,
    partyIndex: 0,
    species,
    name: "TEST",
    level: 50,
    gender: "male",
    hp: 100,
    maxHP: 100,
    status: "none",
    moveIds: [1, 2, 3, 4] as const,
    currentPP: [10, 10, 10, 10] as const,
    ppBonuses: 0,
  });
}

function generatedFieldView(playerSpecies: number) {
  return createBattleCommandFieldRenderView(
    Object.freeze({
      player: battler(playerSpecies),
      opponent: battler(1), // BULBASAUR - not under test
    }),
  );
}

function drawAt(playerSpecies: number, playerVisualT: number): Uint8Array {
  const frame = new Uint8Array(240 * 160 * 4);
  drawGeneratedPlayerMaterialize(frame, playerVisualT, generatedFieldView(playerSpecies));
  return frame;
}

describe("generatedPlayerMaterializeSettleY2 (ISSUES #71 entry-891)", () => {
  it("draws a flat y2=0 for a non-ONIX species across the whole settle window", () => {
    for (let t = PLAYER_MATERIALIZE_SETTLE_START_TICK; t < GENERATED_PLAYER_NEUTRAL_Y_VISUAL_TICK + 5; t += 1) {
      expect(generatedPlayerMaterializeSettleY2(KADABRA, t)).toBe(0);
    }
  });

  it("still applies the ONIX-only wobble table for an ONIX lead through the settle window", () => {
    for (let t = PLAYER_MATERIALIZE_SETTLE_START_TICK; t < GENERATED_PLAYER_NEUTRAL_Y_VISUAL_TICK; t += 1) {
      expect(generatedPlayerMaterializeSettleY2(ONIX, t)).toBe(playerMaterializeSettleY2(t));
    }
    // At least one tick in range is non-zero, or this whole test would pass vacuously.
    expect(playerMaterializeSettleY2(PLAYER_MATERIALIZE_SETTLE_START_TICK)).toBe(2);
  });

  it("forces y2=0 for every species, including ONIX, once the Scene OFF release callback clears (>= tick 1670)", () => {
    expect(generatedPlayerMaterializeSettleY2(ONIX, GENERATED_PLAYER_NEUTRAL_Y_VISUAL_TICK)).toBe(0);
    expect(generatedPlayerMaterializeSettleY2(KADABRA, GENERATED_PLAYER_NEUTRAL_Y_VISUAL_TICK)).toBe(0);
  });

  it("requires both species id and symbol to match ONIX (defends the field-art lookup's own species<->symbol mapping)", () => {
    expect(generatedPlayerMaterializeSettleY2({ species: 95, speciesSymbol: "KADABRA" }, PLAYER_MATERIALIZE_SETTLE_START_TICK)).toBe(0);
    expect(generatedPlayerMaterializeSettleY2({ species: 64, speciesSymbol: "ONIX" }, PLAYER_MATERIALIZE_SETTLE_START_TICK)).toBe(0);
  });

  it("leaves the species-generic tint ramp untouched by the species guard", () => {
    expect(playerMaterializeSettleTintCoeff(PLAYER_MATERIALIZE_SETTLE_START_TICK)).toBe(16);
    expect(playerMaterializeSettleTintCoeff(1675)).toBe(16);
    expect(playerMaterializeSettleTintCoeff(1690)).toBe(1);
    expect(playerMaterializeSettleTintCoeff(1691)).toBe(0);
  });
});

describe("drawGeneratedPlayerMaterialize (ISSUES #71 entry-891, render-level pin)", () => {
  it("renders a non-ONIX (KADABRA) generated player identically across the one tick the ONIX wobble table is non-zero", () => {
    // PLAYER_SETTLE_WOBBLE_Y2_TABLE (battleMenu.ts) is [2, 0, 0, ...] - tick
    // PLAYER_MATERIALIZE_SETTLE_START_TICK is the only tick in the whole
    // settle window where a wrongly-applied ONIX table would move the
    // sprite. The tint ramp is identical at both ticks (both <= 1675), so
    // a byte-identical frame here pins a flat y2=0 render for KADABRA.
    const first = drawAt(KADABRA_SPECIES_ID, PLAYER_MATERIALIZE_SETTLE_START_TICK);
    const next = drawAt(KADABRA_SPECIES_ID, PLAYER_MATERIALIZE_SETTLE_START_TICK + 1);
    expect(Array.from(first)).toEqual(Array.from(next));
  });

  it("still renders the ONIX wobble at that same tick for an ONIX generated player", () => {
    const first = drawAt(ONIX_SPECIES_ID, PLAYER_MATERIALIZE_SETTLE_START_TICK);
    const next = drawAt(ONIX_SPECIES_ID, PLAYER_MATERIALIZE_SETTLE_START_TICK + 1);
    expect(Array.from(first)).not.toEqual(Array.from(next));
  });
});
