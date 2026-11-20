// pmw1 (frame catcher 2026-11-20, docs/fcp1-frame-catcher-pictures.md): the battle party menu's message window while it closes.
// ROM (seed 1 `winning-swap`, the catcher's ROM run): a cancel from the party list (B, or A on CANCEL: HandleChooseMonCancel ->
// Task_ClosePartyMenu) fades out with "Choose a POKéMON." in the wide sDefaultPartyMsgWindowTemplate (8 of 8 cancels; ours drew the
// submenu's narrow "Do what with this PKMN?" window, 128 frames); the forced send-out's SEND OUT confirm keeps the narrow window
// through its fade-out (ours went back to "Choose a POKéMON.").
import { describe, expect, it } from "vitest";
import {
  advanceBattlePartySelect,
  battlePartySelectStateForForcedParty,
  createBattlePartySelectState,
  PARTY_SELECT_OPEN_TOTAL_FRAMES,
  renderBattlePartySelect,
  type BattlePartySelectState,
} from "../src/engine/battlePartySelect.ts";
import { advancePartySelect, INITIAL_PARTY_SELECT_STATE, PARTY_LIST_INPUT_ELAPSED, type PartySelectState } from "../src/engine/partySelect.ts";
import { createFramebuffer } from "../src/engine/framebuffer.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import {
  advanceFactoryRoundPresentation,
  completeFactoryRoundPresentation,
  createFactoryRoundBattleOrchestrator,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";
import type { FactoryRentalRecord } from "../src/engine/battleScenario.ts";
import type { GbaButton } from "../src/input.ts";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };

const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));
function record(setId: number): FactoryRentalRecord {
  const set = frontierMonsData.entries[setId]!;
  const personality = natureByName.get(set.nature)!;
  const input = { setId, personality, fixedIv: 31, abilitySlot: (personality & 1) as 0 | 1 };
  return Object.freeze({ ...input, abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot });
}
const RECORDS = [record(664), record(678), record(527)] as const;

function voluntarySelector(): BattlePartySelectState {
  let carrier = createFactoryRoundBattleOrchestrator({
    id: "pmw1-voluntary", rngValue: 4, factoryWinStreak: 0, playerTrainerId: 0x12345678, battleTowerLevel50WinStreak: 0,
    facilityState: { rentsCount: 0 },
    rentals: { type: "currentRecords", playerRentalRecords: RECORDS, savedRentalRecords: [...RECORDS, record(1), record(2), record(3)] },
  });
  carrier = advanceFactoryRoundPresentation(completeFactoryRoundPresentation(carrier, { commandId: carrier.round.presentation!.command.commandId }));
  const battle = carrier.battle!;
  if (battle.boundary.kind !== "decision-required" || battle.boundary.request.kind !== "command") throw new Error("expected a command");
  let state = createBattlePartySelectState(battle.boundary.request, battle.rules.rulesContext, undefined, RECORDS);
  for (let i = 0; i < PARTY_SELECT_OPEN_TOTAL_FRAMES; i += 1) state = advanceBattlePartySelect(state, new Set());
  return state;
}

const step = (state: BattlePartySelectState, ...keys: (GbaButton | null)[]): BattlePartySelectState =>
  keys.reduce((s, key) => advanceBattlePartySelect(s, key === null ? new Set() : new Set([key])), state);
const forcedStep = (state: PartySelectState, ...keys: (GbaButton | null)[]): PartySelectState =>
  keys.reduce((s, key) => advancePartySelect(s, key === null ? new Set() : new Set([key])), state);

const draw = (state: BattlePartySelectState): Uint8Array => {
  const fb = createFramebuffer();
  renderBattlePartySelect(fb, state);
  return fb;
};
/**
 * The wide sDefaultPartyMsgWindowTemplate's interior (x 130's colour, faded or not) reaches x 175 on row 145; the narrow sDoWhatWithMonMsgWindowTemplate's frame
 * ends at x 141, so x 140 .. 170 are its frame edge and the menu behind it.
 */
const px = (fb: Uint8Array, x: number, y: number): string => [fb[(y * 240 + x) * 4]!, fb[(y * 240 + x) * 4 + 1]!, fb[(y * 240 + x) * 4 + 2]!].join(",");
const wideWindow = (fb: Uint8Array): boolean => [140, 145, 150, 160, 170].every((x) => px(fb, x, 145) === px(fb, 130, 145));

describe("pmw1: the party menu's message window through its close", () => {
  it("a cancel (B or A on CANCEL) keeps the wide \"Choose a POKéMON.\" window, as the ROM fades out", () => {
    const open = voluntarySelector();
    expect(wideWindow(draw(open))).toBe(true);
    const onCancel = step(open, "DOWN", null, "DOWN", null, "DOWN", null);
    expect(onCancel.cursor).toBe("cancel");
    for (const closing of [step(onCancel, "A"), step(open, "B")]) {
      expect(closing.outcome).toEqual({ kind: "cancel" });
      for (const frames of [0, 1, 2, 8, 14]) expect(wideWindow(draw(step(closing, ...Array(frames).fill(null)))), `+${frames}`).toBe(true);
    }
  });

  it("the submenu shows the narrow \"Do what with this PKMN?\" window (the layout the close must not show after a cancel)", () => {
    const open = voluntarySelector();
    const submenu = step(open, "A", null, null, null, null, null);
    expect(submenu.submenuOpen).toBe(true);
    expect(wideWindow(draw(submenu))).toBe(false);
  });

  it("the forced send-out: after the SEND OUT confirm the narrow window stays (as while the submenu was open)", () => {
    const ready = { ...INITIAL_PARTY_SELECT_STATE, elapsed: PARTY_LIST_INPUT_ELAPSED - 1 };
    const submenu = forcedStep(ready, "DOWN", "A");
    const confirmed = forcedStep(submenu, "A");
    expect(confirmed.sendOutElapsed).toBe(0);
    expect(wideWindow(draw(battlePartySelectStateForForcedParty(submenu)))).toBe(false);
    const later = forcedStep(confirmed, null, null, null);
    expect(later.sendOutElapsed).toBe(3);
    expect(battlePartySelectStateForForcedParty(later).sendOutConfirmed).toBe(true);
    expect(wideWindow(draw(battlePartySelectStateForForcedParty(later)))).toBe(false);
    expect(wideWindow(draw(battlePartySelectStateForForcedParty(ready)))).toBe(true);
  });
});
