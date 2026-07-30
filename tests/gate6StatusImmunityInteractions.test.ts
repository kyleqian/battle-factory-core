import { describe, expect, it } from "vitest";
import {
  gate6Context,
  runGate6ScriptToTerminal,
} from "./gate6StatusInteractionHelpers.ts";

const TOXIC = 92;
const THUNDER_WAVE = 86;
const STATUS1_TOXIC_POISON = 1 << 7;
const STATUS1_PARALYSIS = 1 << 6;
const ABILITY_LIMBER = 7;
const ABILITY_IMMUNITY = 17;
const ABILITY_THICK_FAT = 47;

function messageIds(state: ReturnType<typeof runGate6ScriptToTerminal>) {
  return state.events.flatMap((event) =>
    event.kind === "message" ? [event.messageId] : []
  );
}

describe("Gate-6 R8 status x ability immunity", () => {
  it("runs Toxic through Immunity's ability-specific pre-accuracy tail, spending PP without durable status", () => {
    const context = gate6Context(
      1,
      { moves: [TOXIC, TOXIC, TOXIC, TOXIC], pp: [10, 10, 10, 10] },
      {
        species: 143,
        ability: ABILITY_IMMUNITY,
        types: ["TYPE_NORMAL", "TYPE_NORMAL"],
      },
      { currentMove: TOXIC },
    );
    const state = runGate6ScriptToTerminal(
      "BattleScript_EffectToxic",
      context,
      3034451114,
    );

    expect(state.rulesContext.battlers[0]!.status1).toBe(0);
    expect(state.rulesContext.battlers[1]!.pp).toEqual([9, 10, 10, 10]);
    // MoveEnd's later immunity scan resets gLastUsedAbility after the
    // prevention tail; the durable AI observation proves which ability was
    // recorded by the source branch.
    expect(state.rulesContext.aiObservedAbilityIds[0]).toBe(ABILITY_IMMUNITY);
    expect(state.rng.calls).toBe(0);
    expect(messageIds(state)).toContain(
      "STRINGID_PKMNPREVENTSPOISONINGWITH",
    );
    expect(messageIds(state)).not.toContain("STRINGID_BUTITFAILED");
  });

  it("runs the same Toxic script against same-species Thick Fat and applies exactly toxic status", () => {
    const context = gate6Context(
      1,
      { moves: [TOXIC, TOXIC, TOXIC, TOXIC], pp: [10, 10, 10, 10] },
      {
        species: 143,
        ability: ABILITY_THICK_FAT,
        types: ["TYPE_NORMAL", "TYPE_NORMAL"],
      },
      { currentMove: TOXIC },
    );
    const state = runGate6ScriptToTerminal(
      "BattleScript_EffectToxic",
      context,
      3034451114,
    );

    expect(state.rulesContext.battlers[0]!.status1).toBe(
      STATUS1_TOXIC_POISON,
    );
    expect(state.rulesContext.battlers[1]!.pp).toEqual([9, 10, 10, 10]);
    expect(state.rng.ledger.map((entry) => entry.reason)).toEqual([
      "accuracycheck",
    ]);
    expect(messageIds(state)).toContain("STRINGID_PKMNBADLYPOISONED");
  });

  it("runs Thunder Wave through Limber's ability-specific pre-type/accuracy tail, spending PP without durable status", () => {
    const context = gate6Context(
      1,
      {
        moves: [THUNDER_WAVE, THUNDER_WAVE, THUNDER_WAVE, THUNDER_WAVE],
        pp: [20, 20, 20, 20],
      },
      {
        species: 53,
        ability: ABILITY_LIMBER,
        types: ["TYPE_NORMAL", "TYPE_NORMAL"],
      },
      { currentMove: THUNDER_WAVE },
    );
    const state = runGate6ScriptToTerminal(
      "BattleScript_EffectParalyze",
      context,
      3034451114,
    );

    expect(state.rulesContext.battlers[0]!.status1).toBe(0);
    expect(state.rulesContext.battlers[1]!.pp).toEqual([19, 20, 20, 20]);
    expect(state.rulesContext.aiObservedAbilityIds[0]).toBe(ABILITY_LIMBER);
    expect(state.rng.calls).toBe(0);
    expect(messageIds(state)).toContain(
      "STRINGID_PKMNPREVENTSPARALYSISWITH",
    );
    expect(messageIds(state)).not.toContain("STRINGID_BUTITFAILED");
  });

  it("runs the same Thunder Wave script against an ordinary Normal target and applies exactly paralysis", () => {
    const context = gate6Context(
      1,
      {
        moves: [THUNDER_WAVE, THUNDER_WAVE, THUNDER_WAVE, THUNDER_WAVE],
        pp: [20, 20, 20, 20],
      },
      {
        species: 143,
        ability: ABILITY_THICK_FAT,
        types: ["TYPE_NORMAL", "TYPE_NORMAL"],
      },
      { currentMove: THUNDER_WAVE },
    );
    const state = runGate6ScriptToTerminal(
      "BattleScript_EffectParalyze",
      context,
      3034451114,
    );

    expect(state.rulesContext.battlers[0]!.status1).toBe(STATUS1_PARALYSIS);
    expect(state.rulesContext.battlers[1]!.pp).toEqual([19, 20, 20, 20]);
    expect(state.rng.ledger.map((entry) => entry.reason)).toEqual([
      "accuracycheck",
    ]);
    expect(messageIds(state)).toContain("STRINGID_PKMNWASPARALYZED");
  });
});
