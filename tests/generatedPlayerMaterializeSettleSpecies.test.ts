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

describe("generatedPlayerMaterializeSettleY2 (ISSUES #71 entry-891, ISSUES #74)", () => {
  it("draws the shared species-agnostic affine-emerge tail (MATERIALIZE_Y2_TABLE's last entry, 2) at the first settle tick for every species, then flat y2=0 for a non-ONIX species the rest of the settle window", () => {
    // ISSUES #74: RAM-probed against both committed generated-route traces
    // (docs/probes/generated-player-materialize-tail-tick/) - the real
    // descent's last nonzero tick lands exactly on
    // PLAYER_MATERIALIZE_SETTLE_START_TICK, species-agnostically, not just
    // for ONIX's own (coincidentally-equal) wobble table.
    expect(generatedPlayerMaterializeSettleY2(KADABRA, PLAYER_MATERIALIZE_SETTLE_START_TICK)).toBe(2);
    for (let t = PLAYER_MATERIALIZE_SETTLE_START_TICK + 1; t < GENERATED_PLAYER_NEUTRAL_Y_VISUAL_TICK + 5; t += 1) {
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

  it("the shared tail tick ignores the species<->symbol guard, but the guard still governs every later settle tick", () => {
    // At PLAYER_MATERIALIZE_SETTLE_START_TICK itself the value is
    // species-agnostic (see the test above), so a mismatched species/symbol
    // pair reads the same shared tail value as everyone else there.
    expect(generatedPlayerMaterializeSettleY2({ species: 95, speciesSymbol: "KADABRA" }, PLAYER_MATERIALIZE_SETTLE_START_TICK)).toBe(2);
    expect(generatedPlayerMaterializeSettleY2({ species: 64, speciesSymbol: "ONIX" }, PLAYER_MATERIALIZE_SETTLE_START_TICK)).toBe(2);
    // One tick later the species-specific branch is live again; a mismatched
    // id/symbol pair must still fail the ONIX guard (defends the field-art
    // lookup's own species<->symbol mapping).
    expect(generatedPlayerMaterializeSettleY2({ species: 95, speciesSymbol: "KADABRA" }, PLAYER_MATERIALIZE_SETTLE_START_TICK + 1)).toBe(0);
    expect(generatedPlayerMaterializeSettleY2({ species: 64, speciesSymbol: "ONIX" }, PLAYER_MATERIALIZE_SETTLE_START_TICK + 1)).toBe(0);
  });

  it("leaves the species-generic tint ramp untouched by the species guard", () => {
    expect(playerMaterializeSettleTintCoeff(PLAYER_MATERIALIZE_SETTLE_START_TICK)).toBe(16);
    expect(playerMaterializeSettleTintCoeff(1675)).toBe(16);
    expect(playerMaterializeSettleTintCoeff(1690)).toBe(1);
    expect(playerMaterializeSettleTintCoeff(1691)).toBe(0);
  });
});

describe("drawGeneratedPlayerMaterialize (ISSUES #71 entry-891, ISSUES #74, render-level pin)", () => {
  it("renders a non-ONIX (KADABRA) generated player's shared tail tick differently from the following (flat) settle tick", () => {
    // ISSUES #74: PLAYER_MATERIALIZE_SETTLE_START_TICK itself draws the
    // shared species-agnostic tail offset (2, MATERIALIZE_Y2_TABLE's last
    // entry), not flat 0 - so it must render differently from the very next
    // tick, which is genuinely flat for a non-ONIX species. The tint ramp is
    // identical at both ticks (both <= 1675), isolating the y2 change.
    const tail = drawAt(KADABRA_SPECIES_ID, PLAYER_MATERIALIZE_SETTLE_START_TICK);
    const next = drawAt(KADABRA_SPECIES_ID, PLAYER_MATERIALIZE_SETTLE_START_TICK + 1);
    expect(Array.from(tail)).not.toEqual(Array.from(next));
  });

  it("still renders the ONIX wobble at that same tick for an ONIX generated player", () => {
    const first = drawAt(ONIX_SPECIES_ID, PLAYER_MATERIALIZE_SETTLE_START_TICK);
    const next = drawAt(ONIX_SPECIES_ID, PLAYER_MATERIALIZE_SETTLE_START_TICK + 1);
    expect(Array.from(first)).not.toEqual(Array.from(next));
  });
});
