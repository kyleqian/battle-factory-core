// Tier-1 pins for src/engine/battleSetup.ts - the S8 engine dependency
// ROADMAP.md's S8 section flags ("wiring the per-battle moveset from
// battle-setup state through EngineState into [the FIGHT submenu] render
// call"), docs/battle-menu-notes.md §13c. Three layers:
//
// 1. Battle 1 identity: the moveset the engine actually derives from a
//    fully-confirmed draft screen (the SAME `activeMonMoveset` core.ts's
//    `tick()` now calls at both `openFightSubmenu` call sites) equals the
//    RAM-dumped gBattleMons moveset for Onix, read straight from the
//    committed dump - not a hand-copied literal.
// 2. Genericity at the battle-setup layer itself: a DIFFERENT rental
//    (MAGBY) resolves correctly too, proving `rentalMoveset`'s species->
//    move-id resolution isn't Onix-special-cased.
// 3. Genericity end-to-end through the STATE plumbing (not just the render
//    layer tests/fightSubmenuText.test.ts already pins): KABUTO's real S8
//    battle-2 moveset (battle2-turn1-battler-dump.json's battler1), placed
//    directly on a `FightSubmenuState.activeMonMoveset` the way core.ts's
//    `openFightSubmenu` would, drives `renderBattleScene` itself (not a
//    direct `buildFightMoveset`/`drawFightSubmenuText` call) and matches an
//    independently-assembled expected image byte-for-byte.

import { describe, expect, it } from "vitest";
import { activeMonMoveset, createBattleSetup, rentalMoveset, type ActiveMonMoveset } from "../src/engine/battleSetup.ts";
import { ANCHOR_DRAFT_SCREEN_STATE, type DraftScreenState } from "../src/engine/factoryDraftScreen.ts";
import { createFramebuffer, SCREEN_WIDTH } from "../src/engine/framebuffer.ts";
import { renderBattleScene } from "../src/engine/battleScene.ts";
import { openFightSubmenu, FIGHT_SUBMENU_SLOT_NAMES, currentPPForActiveMon } from "../src/engine/battleMenu.ts";
import { resolveTurn1CompletedResolutionNextCommandHandoff } from "../src/engine/turn1ResolutionAdapter.ts";
import { resolveTurn2CompletedResolutionNextCommandHandoff } from "../src/engine/turn2ResolutionAdapter.ts";
import { buildFightMoveset, drawFightSubmenuText } from "../src/engine/fightSubmenuText.ts";
import fightSubmenuWindowAsset from "../src/assets/gen/fight-submenu-window.json" with { type: "json" };
import battlerDump from "../src/data/gen/battle2-turn1-battler-dump.json" with { type: "json" };

const fightSubmenuWindow = fightSubmenuWindowAsset as { x: number; y: number; width: number; height: number; slots: Record<string, number[]> };

// battle2-turn1-battler-dump.json's own tick-33031 snapshot (battle 2's
// settled first action menu, pre-turn-1) - battler0 is still ONIX (the
// player's active mon carries over from battle 1 unchanged), battler1 is
// KABUTO (S8 battle 2's real opponent). Same file tests/fightSubmenuText
// .test.ts already cites for KABUTO's own render-layer generality test.
const dump = (
  battlerDump as {
    battlerSnapshots: { "33031": { battler0: { moves: number[]; pp: number[] }; battler1: { moves: number[]; pp: number[] } } };
  }
).battlerSnapshots["33031"];

/** A fully-confirmed draft screen (ONIX/MAGBY/BAYLEEF, pick order 1/2/3) - the same `selectedIds` shape `tests/confirmDecline.test.ts` pins for a real played-through draft screen, reproducing what every committed trace's own button script leaves `draftScreen` in by the time battle starts. */
const CONFIRMED_DRAFT_SCREEN: DraftScreenState = { ...ANCHOR_DRAFT_SCREEN_STATE, selectedIds: [1, 2, 3, 0, 0, 0] };
const TURN1_HANDOFF = resolveTurn1CompletedResolutionNextCommandHandoff(1308);
const TURN2_HANDOFF = resolveTurn2CompletedResolutionNextCommandHandoff(2197);

describe("battleSetup: activeMonMoveset/rentalMoveset (S8 engine dependency, docs/battle-menu-notes.md §13c)", () => {
  it("preserves Battle 2 identity, healed party, and ONIX's actual moves through immutable setup state", () => {
    const setup = createBattleSetup(CONFIRMED_DRAFT_SCREEN, "jenson");
    expect(setup).toMatchObject({
      battleNumber: 2,
      encounter: "jenson",
      trainerClass: "FISHERMAN",
      trainerName: "JENSON",
      opponentLead: "KABUTO",
      playerParty: ["ONIX", "MAGBY", "BAYLEEF"],
      playerPartyHp: [117, 138, 153],
    });
    expect(setup.activeMonMoveset.moveIds).toEqual(dump.battler0.moves);
    expect(setup.activeMonMoveset.maxPP).toEqual(dump.battler0.pp);
  });
  it("battle 1: the engine's own derivation equals the RAM-dumped gBattleMons moveset (battle2-turn1-battler-dump.json's battler0), not a hand-copied literal", () => {
    const moveset = activeMonMoveset(CONFIRMED_DRAFT_SCREEN);
    expect(moveset.moveIds).toEqual(dump.battler0.moves);
    expect(moveset.maxPP).toEqual(dump.battler0.pp);
  });

  it("genericity at the battle-setup layer itself: a different rental (MAGBY) resolves its own real moveset, not Onix's - move ids independently cross-checked against moves.json's own name->id mapping", () => {
    const moveset = rentalMoveset("MAGBY");
    expect(moveset.moveIds).toEqual([7, 108, 109, 123]); // FIRE_PUNCH/SMOKESCREEN/CONFUSE_RAY/SMOG
    expect(moveset.maxPP).toEqual([15, 20, 10, 20]);
  });

  it("activeMonMoveset resolves the PARTY LEAD (pick-rank 1), not simply pool slot 0 - a draft screen that picked BAYLEEF first still resolves to Bayleef", () => {
    // BAYLEEF is pool slot 2; picking it first (selectedId 1) makes it the lead despite not being slot 0.
    const draftScreen: DraftScreenState = { ...ANCHOR_DRAFT_SCREEN_STATE, selectedIds: [2, 3, 1, 0, 0, 0] };
    const moveset = activeMonMoveset(draftScreen);
    expect(moveset).toEqual(rentalMoveset("BAYLEEF"));
  });

  it("throws rather than faking data when no picks are confirmed yet (the pristine anchor draft screen)", () => {
    expect(() => activeMonMoveset(ANCHOR_DRAFT_SCREEN_STATE)).toThrow();
  });

  it("rentalMoveset throws on an unknown species rather than silently returning garbage", () => {
    expect(() => rentalMoveset("MISSINGNO")).toThrow();
  });
});

describe("battleMenu: currentPPForActiveMon (S8 generalization of the old hardcoded onixMoveset PP rule)", () => {
  const moveset: ActiveMonMoveset = { moveIds: [1, 2, 3, 4], maxPP: [10, 20, 20, 10] };

  it("returns maxPP unchanged before turn 1 resolves", () => {
    expect(currentPPForActiveMon(moveset, null)).toEqual([10, 20, 20, 10]);
  });

  it("decrements only slot 0 by 1 once turn 1 resolves - battle 1's own ROCK_SLIDE 9/10 finding, now driven by whatever moveset is supplied instead of a hardcoded pair", () => {
    expect(currentPPForActiveMon(moveset, TURN1_HANDOFF)).toEqual([9, 20, 20, 10]);
  });

  it("generalizes to a wholly different moveset's own maxPP values (KABUTO's), not just Onix's specific 10/20/20/10", () => {
    const kabuto: ActiveMonMoveset = { moveIds: dump.battler1.moves as [number, number, number, number], maxPP: dump.battler1.pp as [number, number, number, number] };
    expect(currentPPForActiveMon(kabuto, null)).toEqual(dump.battler1.pp);
    expect(currentPPForActiveMon(kabuto, TURN1_HANDOFF)).toEqual([dump.battler1.pp[0]! - 1, dump.battler1.pp[1], dump.battler1.pp[2], dump.battler1.pp[3]]);
  });

  it("derives slot 2's DRAGON_BREATH decrement from the completed turn-2 receipt", () => {
    expect(currentPPForActiveMon(moveset, TURN1_HANDOFF, null)).toEqual([9, 20, 20, 10]);
    expect(currentPPForActiveMon(moveset, TURN1_HANDOFF, TURN2_HANDOFF)).toEqual([9, 20, 19, 10]);
  });

  it("an absent turn-2 receipt leaves every pre-existing 2-arg call site unaffected", () => {
    expect(currentPPForActiveMon(moveset, TURN1_HANDOFF)).toEqual([9, 20, 20, 10]);
  });
});

function extractWindowRegion(fb: Uint8Array): number[] {
  const { x, y, width, height } = fightSubmenuWindow;
  const out: number[] = [];
  for (let py = 0; py < height; py += 1) {
    for (let px = 0; px < width; px += 1) {
      const o = ((y + py) * SCREEN_WIDTH + (x + px)) * 4;
      out.push(fb[o]!, fb[o + 1]!, fb[o + 2]!);
    }
  }
  return out;
}

/** Independently assembles the expected FIGHT-window pixels: blit the oracle-harvested chrome patch (same as `battleScene.ts`'s own `drawRect`), then the real text layer on top - the SAME two-step composition `drawFightSubmenuChrome` does, but built here from the low-level primitives directly rather than through any state machine, so it's a genuine independent check on the state-plumbing test below. */
function expectedWindowRegion(moveset: ReturnType<typeof buildFightMoveset>, cursor: 0 | 1 | 2 | 3): number[] {
  const fb = createFramebuffer();
  const slotName = FIGHT_SUBMENU_SLOT_NAMES[cursor];
  const patch = fightSubmenuWindow.slots[slotName]!;
  const { x, y, width, height } = fightSubmenuWindow;
  for (let py = 0; py < height; py += 1) {
    for (let px = 0; px < width; px += 1) {
      const i = (py * width + px) * 3;
      const o = ((y + py) * SCREEN_WIDTH + (x + px)) * 4;
      fb[o] = patch[i]!;
      fb[o + 1] = patch[i + 1]!;
      fb[o + 2] = patch[i + 2]!;
      fb[o + 3] = 255;
    }
  }
  drawFightSubmenuText(fb, x, y, moveset, cursor);
  return extractWindowRegion(fb);
}

describe("battleScene: genericity end-to-end through the STATE plumbing (not just the render layer) - KABUTO's real S8 battle-2 moveset drives renderBattleScene itself", () => {
  const kabutoMoveset: ActiveMonMoveset = {
    moveIds: dump.battler1.moves as [number, number, number, number],
    maxPP: dump.battler1.pp as [number, number, number, number],
  };
  // openFightSubmenu is the SAME constructor core.ts calls - not a hand-built FightSubmenuState literal - so this exercises the real state-machine entry point the S8 rewire added `activeMonMoveset` to.
  const opened = openFightSubmenu(0, kabutoMoveset);

  for (let cursor = 0; cursor < 4; cursor += 1) {
    it(`cursor ${cursor} (${FIGHT_SUBMENU_SLOT_NAMES[cursor]} highlighted): renderBattleScene's FIGHT window matches an independently-assembled expected image byte-for-byte, at full PP`, () => {
      const sm = { ...opened, cursor: cursor as 0 | 1 | 2 | 3, displayCursor: cursor as 0 | 1 | 2 | 3 };
      const fb = createFramebuffer();
      renderBattleScene(fb, { elapsed: 900, sendOutPressElapsed: 380, fightSubmenu: sm, turn1NextCommandHandoff: null, turn3Resolved: false, turn4Resolved: false, turn5NextCommandHandoff: null, turn6NextCommandHandoff: null, turn7NextCommandHandoff: null, turn8NextCommandHandoff: null, turn9NextCommandHandoff: null, turn10NextCommandHandoff: null, turn11NextCommandHandoff: null, turn12NextCommandHandoff: null, opponentFaintDismissElapsed: null, turn13NextCommandHandoff: null });

      const expectedMoveset = buildFightMoveset(kabutoMoveset.moveIds, currentPPForActiveMon(kabutoMoveset, null));
      expect(extractWindowRegion(fb)).toEqual(expectedWindowRegion(expectedMoveset, cursor as 0 | 1 | 2 | 3));
    });
  }

  it("the completed turn-1 receipt's PP decrement also reaches the renderer for a non-Onix moveset (slot 0 only, currentPPForActiveMon's own documented scope)", () => {
    const sm = { ...opened, cursor: 0 as const, displayCursor: 0 as const };
    const fb = createFramebuffer();
    renderBattleScene(fb, { elapsed: 900, sendOutPressElapsed: 380, fightSubmenu: sm, turn1NextCommandHandoff: TURN1_HANDOFF, turn3Resolved: false, turn4Resolved: false, turn5NextCommandHandoff: null, turn6NextCommandHandoff: null, turn7NextCommandHandoff: null, turn8NextCommandHandoff: null, turn9NextCommandHandoff: null, turn10NextCommandHandoff: null, turn11NextCommandHandoff: null, turn12NextCommandHandoff: null, opponentFaintDismissElapsed: null, turn13NextCommandHandoff: null });

    const expectedMoveset = buildFightMoveset(kabutoMoveset.moveIds, currentPPForActiveMon(kabutoMoveset, TURN1_HANDOFF));
    expect(extractWindowRegion(fb)).toEqual(expectedWindowRegion(expectedMoveset, 0));
  });
});
