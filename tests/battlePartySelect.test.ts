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

function liveSelectorParts() {
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
  return { request, rulesContext: battle.rules.rulesContext };
}

function liveSelector() {
  const { request, rulesContext } = liveSelectorParts();
  return createBattlePartySelectState(request, rulesContext);
}

describe("voluntary battle party selector", () => {
  it("opens on slot 0, never the active battler's slot (OpenPartyMenuInBattle keepCursorPos=FALSE)", () => {
    // docs/party-menu-rank6-ground-truth.md §2: OpenPartyMenuInBattle
    // (party_menu.c:5774-5779) -> InitPartyMenu(keepCursorPos=FALSE) forces
    // gPartyMenu.slotId = 0 (party_menu.c:524-525), so a party menu opened
    // while the active battler sits on slot 1 still opens the cursor on
    // slot 0 (regression: cursor was activePartyIndex). The forced route's
    // fainted-mon default stays its own pin (partySelect.test.ts).
    const { request, rulesContext } = liveSelectorParts();
    const activeOnSlotOne = Object.freeze({
      ...rulesContext,
      battlers: Object.freeze([
        Object.freeze({ ...rulesContext.battlers[0]!, partyIndex: 1 }),
        rulesContext.battlers[1]!,
        rulesContext.battlers[2]!,
        rulesContext.battlers[3]!,
      ]) as typeof rulesContext.battlers,
    });
    const state = createBattlePartySelectState(request, activeOnSlotOne);
    expect(state.cursor).toBe(0);
    expect(state.rows[0].active).toBe(false);
    expect(state.rows[1].active).toBe(true);
  });

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

  it("draws the banked pokeball sprite and CANCEL text at the oracle's measured window (ISSUES #80 slice 5)", () => {
    // docs/party-menu-rank6-ground-truth.md §6 addendum: the CANCEL pokeball
    // button window overpaints the baked bg box at x184-237 y134-153. Pins one
    // ball-red pixel and one CANCEL white-ink pixel at oracle-measured spots.
    const state = liveSelector();
    const fb = createFramebuffer();
    renderBattlePartySelect(fb, state);
    const px = (x: number, y: number) => {
      const i = (y * 240 + x) * 4;
      return [fb[i]!, fb[i + 1]!, fb[i + 2]!] as const;
    };
    // Ball red (181,66,0) at (190,140); the sprite blits pixel-0 transparent.
    expect(px(190, 140)).toEqual([181, 66, 0]);
    // CANCEL ink white (255,255,255) at (206,141) (sFontColorTable[0] LIGHT_GRAY).
    expect(px(206, 141)).toEqual([255, 255, 255]);
  });

  it("shows the OPEN pokeball frame on the cursor slot and CLOSED elsewhere, following navigation (ISSUES #80 settled band)", () => {
    // AnimatePartySlot (party_menu.c:861-865): the cursor slot gets anim 1
    // (open, sheet rows [32,64)) and every other slot anim 0 (closed).
    // Marker pixels (measured from the oracle match): slot 0's ball at (9,22)
    // and slot 1's at (95,13) are open-orange (247,181,123) on the cursor slot
    // and closed-red (181,66,0) otherwise.
    let state = liveSelector();
    const render = () => {
      const fb = createFramebuffer();
      renderBattlePartySelect(fb, state);
      const px = (x: number, y: number) => {
        const i = (y * 240 + x) * 4;
        return [fb[i]!, fb[i + 1]!, fb[i + 2]!] as const;
      };
      return { slot0: px(9, 22), slot1: px(95, 13) };
    };
    expect(state.cursor).toBe(0);
    expect(render()).toEqual({ slot0: [247, 181, 123], slot1: [181, 66, 0] });
    state = advanceBattlePartySelect(state, new Set(["DOWN"]));
    expect(state.cursor).toBe(1);
    expect(render()).toEqual({ slot0: [181, 66, 0], slot1: [247, 181, 123] });
    state = advanceBattlePartySelect(state, new Set(["DOWN"]));
    state = advanceBattlePartySelect(state, new Set(["DOWN"]));
    expect(state.cursor).toBe("cancel");
    expect(render()).toEqual({ slot0: [181, 66, 0], slot1: [181, 66, 0] });
  });

  it("closes the SEND OUT submenu on the confirm edge (ISSUES #80 slice 6)", () => {
    // docs/party-menu-rank6-ground-truth.md §7: the confirm A lands while the
    // submenu is open; the real menu closes the submenu and starts the fade on
    // the same edge (oracle frame 964 = settled menu, no submenu window).
    let state = liveSelector();
    state = advanceBattlePartySelect(state, new Set(["DOWN"]));
    state = advanceBattlePartySelect(state, new Set(["A"]));
    expect(state.submenuOpen).toBe(true);
    state = advanceBattlePartySelect(state, new Set(["A"]));
    expect(state.outcome).toMatchObject({ kind: "select", partyIndex: 1 });
    expect(state.submenuOpen).toBe(false);
    expect(state.closeElapsed).toBe(0);
  });

  it("blends the settled menu to black on a mid-fade close frame and holds black (ISSUES #80 slice 6)", () => {
    // Measured close schedule (docs/party-menu-rank6-ground-truth.md §7):
    // menu fade-out 965-978 (standard fade-to-black, y=2..14 held 2 frames),
    // then full black 979-1018. closeElapsed 4 -> the y=4 blend frame; the
    // CANCEL text shadow (115,115,115) at (220,145) becomes blendComponentToBlack
    // (5-bit 14, y=4) = (82,82,82). closeElapsed 30 is inside the black hold.
    const base = liveSelector();
    const px = (fb: Uint8Array, x: number, y: number) => {
      const i = (y * 240 + x) * 4;
      return [fb[i]!, fb[i + 1]!, fb[i + 2]!] as const;
    };
    const midFade: BattlePartySelectState = { ...base, closeElapsed: 4 };
    const fadeFb = createFramebuffer();
    renderBattlePartySelect(fadeFb, midFade);
    expect(px(fadeFb, 220, 145)).toEqual([82, 82, 82]);
    const blackHold: BattlePartySelectState = { ...base, closeElapsed: 30 };
    const blackFb = createFramebuffer();
    renderBattlePartySelect(blackFb, blackHold);
    expect(px(blackFb, 220, 145)).toEqual([0, 0, 0]);
    expect(px(blackFb, 4, 4)).toEqual([0, 0, 0]);
    expect(px(blackFb, 236, 156)).toEqual([0, 0, 0]);
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
