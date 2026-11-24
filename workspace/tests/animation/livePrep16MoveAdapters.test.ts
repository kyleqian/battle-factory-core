import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";
import type { BattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
// apx219: these gate pins read the proven body (an unknown order / allocator history is drawn approximately by the production
// liveMoveAnimationPresentation; tests/apx219SpriteOrderAllocatorApproximate.test.ts).
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveBattlerAnchors, liveMoveAnimationDuration, liveMoveAnimationPresentationProven as liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import { composeLivePalettes, liveBattlerIsShiny } from "../../src/engine/liveMovePaletteComposite.ts";
import { createLiveMovePaletteHost, prepareLiveMovePalette } from "../../src/engine/liveMoveAnimationPalette.ts";
import { prepareLiveMoveSpriteOrder, type LiveMoveSpriteOrderInput } from "../../src/engine/liveMoveSpriteAllocator.ts";
import { createLiveSpriteOrderHost, lendLiveSpriteOrder, openLiveSpriteOrderHostPartyMenu } from "../../src/engine/liveSpriteOrderHost.ts";
import { knownEntrySpriteOrderState } from "../../src/engine/spriteOrderProvider.ts";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { composePalettes as toolComposePalettes } from "../../tools/integration/prep16PaletteComposite.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { iu120Ages } from "../helpers/iu120Rows.ts";

// docs/next-adapters-prep16.md: Overheat (315) and Silver Wind (318), FIRST BODY only. The dense framebuffer proofs are
// tools/integration/fixtures/prep16-live/*.json (receipt prep16-live-adapter-receipt.json).
const request = (moveId: number, attacker: 0 | 1): BattleMoveAnimationRequest => ({
  moveId, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0,
});
function displayed(player: string, opponent: string, personality?: [number | undefined, number | undefined]): BattleResolutionDisplayedField {
  const mon = (name: string, p: number | undefined) => ({
    species: speciesStats.species.find(s => s.name === `SPECIES_${name}`)!.id, speciesSymbol: name, name, level: 50,
    hp: 100, maxHP: 100, gender: "male", status: "none", ...(p === undefined ? {} : { personality: p }),
  });
  return { player: mon(player, personality?.[0]), opponent: mon(opponent, personality?.[1]) } as unknown as BattleResolutionDisplayedField;
}
const firstOrder = (): LiveMoveSpriteOrderInput =>
  ({ ...prepareLiveMoveSpriteOrder(knownEntrySpriteOrderState("ordinary-factory"), request(315, 0)).input!, firstBody: true });
const laterOrder = (): LiveMoveSpriteOrderInput => prepareLiveMoveSpriteOrder(knownEntrySpriteOrderState("ordinary-factory"), request(315, 0)).input!;
const cfg = (f: BattleResolutionDisplayedField, req: BattleMoveAnimationRequest, order?: LiveMoveSpriteOrderInput, age = 0) =>
  liveMoveAnimationPresentation(req, f, age, undefined, undefined, order);
function render(field: BattleResolutionDisplayedField, req: BattleMoveAnimationRequest, age: number, order?: LiveMoveSpriteOrderInput): string {
  const view = {
    field, fieldArt: createBattleCommandFieldArtView(field),
    healthboxes: {
      player: { name: field.player.name, level: 50, gender: "male", hpFraction: 1, status: "none", currentHp: 100, maxHp: 100 },
      opponent: { name: field.opponent.name, level: 50, gender: "male", hpFraction: 1, status: "none" },
    },
    message: { lines: ["X used", "A MOVE!"], visibleCharacters: 99 },
    effect: { type: "move", request: req, age, spriteOrderInput: order },
    visibility: { player: { sprite: true, healthbox: true }, opponent: { sprite: true, healthbox: true } },
    waitCursor: null, bottom: "message", confirmHandoff: null, switchIn: null, midBattleSwitchIn: null,
    switchOut: null, partySummary: null, midBattleSwitchFade: null, midBattleSwitchParticles: null, trainerSlide: null,
  } as unknown as BattleResolutionPresentationRenderView;
  const fb = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(fb, view);
  return createHash("sha256").update(fb).digest("hex");
}
const rulesWithoutSceneMarker = (v: { rules: any }) => {
  const rc = v.rules.rulesContext;
  return { ...v.rules, rulesContext: { ...rc, hitMarker: rc.hitMarker & ~0x80 } };
};

describe("live prep16 move adapters (Overheat, Silver Wind, Psych Up player: first body)", () => {
  it("registers both ids with the first-inactive+1 durations and shadow row 0", () => {
    for (const id of [315, 318]) {
      expect(LIVE_MOVE_ANIMATION_IDS).toContain(id);
      expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[id]).toBe(0);
    }
    for (const a of [0, 1] as const) expect(liveMoveAnimationDuration(request(315, a))).toBe(230);
    expect(liveMoveAnimationDuration(request(318, 0))).toBe(193);
    expect(liveMoveAnimationDuration(request(318, 1))).toBe(196);
  });

  it("palette composite equals the prep16 tool composite and the field-art battler palettes; shiny declines", () => {
    for (const [p, o] of [["SOLROCK", "SHUCKLE"], ["CHARIZARD", "GOLEM"], ["BEAUTIFLY", "GOLEM"], ["BUTTERFREE", "ONIX"]] as const) {
      expect(composeLivePalettes(p, o)).toEqual(toolComposePalettes(p, o));
    }
    expect(composeLivePalettes("NOT_A_SPECIES", "ONIX")).toBeNull();
    const c = composeLivePalettes("SOLROCK", "SHUCKLE")!;
    expect(c.hardware.slice(0, 32).every(w => w === 0)).toBe(true);
    // GET_SHINY_VALUE under the Factory OT 416049562 (hi ^ lo = 0x7156): shiny iff (personality hi ^ lo ^ 0x7156) < 8.
    expect(liveBattlerIsShiny(0x71560000)).toBe(true);
    expect(liveBattlerIsShiny(0x71560008)).toBe(false);
    expect(liveBattlerIsShiny(2349015475)).toBe(false);
    expect(liveBattlerIsShiny(undefined)).toBe(false);
    for (const [id, p, o] of [[315, "SOLROCK", "SHUCKLE"], [318, "BUTTERFREE", "ONIX"]] as const) {
      expect(cfg(displayed(p, o), request(id, 0), firstOrder())).not.toBeNull();
      expect(cfg(displayed(p, o, [0x71560001, undefined]), request(id, 0), firstOrder())).toBeNull();
      expect(cfg(displayed(p, o, [undefined, 0x71560001]), request(id, 0), firstOrder())).toBeNull();
    }
  });

  it("palette provider plans: Overheat loads ember + impact into banks 7/8, Silver Wind sparkle6 into bank 7, unfaded == faded == asset words", () => {
    for (const [id, tags, count] of [[315, [10029, 10135], 2], [318, [10271], 1]] as const) {
      const prepared = prepareLiveMovePalette(createLiveMovePaletteHost(), request(id, 0));
      expect(prepared.input.historyKnown).toBe(true);
      expect(tags.length).toBe(count);
    }
    const host = createLiveMovePaletteHost();
    expect(prepareLiveMovePalette(host, request(315, 0)).next.historyKnown).toBe(true);
  });

  it("Overheat and Silver Wind are gated on any known order (lb21) (later-bodies-bg receipt)", () => {
    for (const [id, p, o] of [[315, "SOLROCK", "SHUCKLE"], [318, "BUTTERFREE", "ONIX"]] as const) {
      const f = displayed(p, o);
      expect(cfg(f, request(id, 0), firstOrder())).not.toBeNull();
      expect(cfg(f, request(id, 0))).toBeNull();
      expect(cfg(f, request(id, 0), laterOrder())).not.toBeNull();
      expect(cfg(f, request(id, 0), { known: false } as never)).toBeNull();
    }
    // The production order host lends `firstBody` until any unit (here a party-menu reset) has been applied.
    const host = createLiveSpriteOrderHost(knownEntrySpriteOrderState("ordinary-factory"));
    expect(lendLiveSpriteOrder(host)).toMatchObject({ known: true, firstBody: true });
    expect(lendLiveSpriteOrder(openLiveSpriteOrderHostPartyMenu(host))?.firstBody).toBeUndefined();
  });

  it("derives Overheat geometry/registers from the anchors: S0 registers, monbg BG by side, composite palettes", () => {
    const f = displayed("CHARIZARD", "GOLEM");
    const art = createBattleCommandFieldArtView(f);
    const player = (cfg(f, request(315, 0), firstOrder())!.config as any).animationInputs;
    expect(player.registers).toMatchObject({ dispcnt: 0xbf40, bg1cnt: 0x9c00, win0h: 240, win0v: 161 });
    expect(player.background).toMatchObject({ controlRegister: "bg1cnt", monbgPaletteBank: 8, setupControl: 0x5c02 });
    const golem = liveBattlerAnchors("opponent", art);
    expect(player.background.setupX).toBe(32 - golem.spriteCenter.x);
    expect(player.background.setupY).toBe(32 - golem.spriteCenter.y);
    expect(player.palettes.hardware.slice(16 * 16, 17 * 16)).toEqual(composeLivePalettes("CHARIZARD", "GOLEM")!.hardware.slice(256, 272));
    expect(player.allocator.spriteOrder).toHaveLength(64);
    const opp = (cfg(displayed("GOLEM", "CHARIZARD"), request(315, 1), firstOrder())!.config as any).animationInputs;
    expect(opp.background).toMatchObject({ controlRegister: "bg2cnt", monbgPaletteBank: 9, setupControl: 0x5e02 });
    expect(opp.attackerSprite).toMatchObject({ slot: 8, subpriority: 40 });
    // The idle-x2 species (ONIX / RATTATA after a send-in) are not drawn with an idle offset by this body: decline.
    expect(cfg(displayed("SOLROCK", "ONIX"), request(315, 0), firstOrder())).toBeNull();
  });

  it("Silver Wind uses the first-body S0 registers for BOTH sides (opponent: bg1cnt 0x9c00, win0 240/161, splitBg1Cnt 0x9c01) and shifts sparkle y with the target picture", () => {
    const opp = (cfg(displayed("ONIX", "BUTTERFREE"), request(318, 1), firstOrder())!.config as any).animationInputs;
    expect(opp.background.registers).toMatchObject({ bg1cnt: 0x9c00, win0h: 240, win0v: 161 });
    expect(opp.background.monbg).toMatchObject({ bg: 2, paletteBank: 9, activeCnt: 0x5e02, splitBg1Cnt: 0x9c01 });
    const player = (cfg(displayed("BUTTERFREE", "ONIX"), request(318, 0), firstOrder())!.config as any).animationInputs;
    expect(player.background.registers).toMatchObject({ bg1cnt: 0x9c00, win0h: 240, win0v: 161 });
    expect(player.background.monbg).toMatchObject({ bg: 1, paletteBank: 8, splitBg1Cnt: 0x5c01 });
    const alt = (cfg(displayed("BEAUTIFLY", "GOLEM"), request(318, 0), firstOrder())!.config as any);
    const art = createBattleCommandFieldArtView(displayed("BEAUTIFLY", "GOLEM"));
    const targetPic = liveBattlerAnchors("opponent", art).picOffsetPoint;
    expect(alt.target.geometry.animationCenter).toEqual({ x: liveBattlerAnchors("opponent", art).spriteCenter.x, y: targetPic.y });
    const delta = targetPic.y - 42;
    expect(alt.animationInputs.sparkleSlots[0].attr[0] & 0xff).toBe((258 + delta) & 0xff);
    expect(delta).not.toBe(0);
  });

  it("renders alternate carriers in both orientations (frames differ over the body; first-body fixtures prove the pixels)", () => {
    for (const [id, a, p, o] of [[315, 0, "CHARIZARD", "GOLEM"], [315, 1, "GOLEM", "CHARIZARD"],
      [318, 0, "BEAUTIFLY", "GOLEM"], [318, 1, "GOLEM", "BEAUTIFLY"]] as const) {
      const f = displayed(p, o), req = request(id, a), order = firstOrder();
      expect(cfg(f, req, order)).not.toBeNull();
      expect(new Set([0, 40, 100, 150].map(age => render(f, req, age, order))).size).toBeGreaterThan(2);
      // A later body's order renders the same body (its inputs never read the activation BG registers or the lent free order).
      expect(render(f, req, 100, laterOrder())).toBe(render(f, req, 100, order));
    }
  }, 240000);

  it("Psych Up (player attacker first body): duration, gate, geometry; the opponent attacker: lb21 orientation inputs", () => {
    expect(LIVE_MOVE_ANIMATION_IDS).toContain(244);
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[244]).toBe(0);
    expect(liveMoveAnimationDuration(request(244, 0))).toBe(179);
    expect(liveMoveAnimationDuration(request(244, 1))).toBe(179); // lb21: the opponent attacker too
    const f = displayed("SKIPLOOM", "GOLEM"), art = createBattleCommandFieldArtView(f);
    expect(cfg(f, request(244, 0))).toBeNull();
    // A later body's known order is accepted (later-bodies-bg receipt: Tackle / Splash / Psychic predecessors dense-exact).
    expect(cfg(f, request(244, 0), laterOrder())).not.toBeNull();
    expect(cfg(displayed("SKIPLOOM", "GOLEM", [0x71560001, undefined]), request(244, 0), firstOrder())).toBeNull();
    expect(cfg(displayed("SKIPLOOM", "ONIX"), request(244, 0), firstOrder())).toBeNull();
    const inputs = (cfg(f, request(244, 0), firstOrder())!.config as any).animationInputs;
    const mine = liveBattlerAnchors("player", art);
    expect(inputs.attackerPictureOrigin).toEqual(mine.picOffsetPoint);
    expect(inputs.monBg).toMatchObject({ layer: "bg2", initialBgCnt: 0x5e00, monBgCnt: 0x5e02, copyPaletteBank: 9 });
    expect(inputs.monBg.baseScroll).toEqual({ x: 32 - mine.spriteCenter.x, y: 32 - mine.spriteCenter.y });
    expect(inputs.matrixSlots).toHaveLength(32);
    expect(inputs.spriteOrder).toHaveLength(64);
    expect(inputs.palettes).toMatchObject({ attackerBank: 16, backgroundBanks: [1, 2, 3] });
    expect(inputs.palettes.resourcePalette).toEqual([0, 32767, 26427, 20087, 13747, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const prepared = prepareLiveMovePalette(createLiveMovePaletteHost(), request(244, 0));
    expect(prepared.input.historyKnown).toBe(true);
    // Opponent attacker (docs/later-bodies-overheat-psychup.md): the documented opponent-orientation inputs, derived from the anchors.
    const fo = displayed("GOLEM", "JUMPLUFF"), artO = createBattleCommandFieldArtView(fo), theirs = liveBattlerAnchors("opponent", artO);
    const oin = (cfg(fo, request(244, 1), laterOrder())!.config as any).animationInputs;
    expect(oin.attackerPictureOrigin).toEqual(theirs.spriteCenter);
    expect(oin.spiral).toMatchObject({ subpriority: 38, painterInsertionIndex: 7 });
    expect(oin.scaleMatrixSlot).toBe(2);
    expect(oin.monBg).toMatchObject({ layer: "bg1", battlerId: 1, copyPaletteBank: 8, initialBgCnt: 0x9c00, monBgCnt: 0x5c02 });
    expect(oin.palettes).toMatchObject({ attackerBank: 17 });
    expect(cfg(displayed("GOLEM", "ONIX"), request(244, 1), firstOrder())).toBeNull(); // idle-offset attacker declines
    expect(new Set([0, 40, 100, 170].map(age => render(f, request(244, 0), age, firstOrder()))).size).toBeGreaterThan(2);
  }, 240000);

  // Ordinary-input routes (prep16 s3 seeds; one turn, party member `slot` knows the move). First body: adapter active every age.
  const routes: { move: string; id: number; seed: number; streak: number; slot: 0 | 1 | 2 | 3; ages: number; active: boolean }[] = [
    { move: "OVERHEAT 4/14 MAGCARGO", id: 315, seed: 4, streak: 14, slot: 0, ages: 230, active: true },
    { move: "OVERHEAT 69/14 SOLROCK", id: 315, seed: 69, streak: 14, slot: 3, ages: 230, active: true },
    { move: "SILVER_WIND 3/7 VOLBEAT", id: 318, seed: 3, streak: 7, slot: 0, ages: 193, active: true },
    { move: "SILVER_WIND 8/7 VENOMOTH", id: 318, seed: 8, streak: 7, slot: 0, ages: 193, active: true },
    { move: "PSYCH_UP 66/7 JUMPLUFF", id: 244, seed: 66, streak: 7, slot: 2, ages: 179, active: true },
    { move: "PSYCH_UP 15/28 METAGROSS", id: 244, seed: 15, streak: 28, slot: 2, ages: 179, active: true },
    // A later body after the foe's Sand-Attack (no production order plan for 28 -> order unknown): the live seam declines and
    // the scene-off view plays (later bodies with a known lend: tests/animation/liveLaterBodiesBg.test.ts). apx219: the body is drawn
    // approximately with the known-entry first-action order (approx:sprite-order-unknown), every age.
    { move: "SILVER_WIND 9/0 BUTTERFREE (not first)", id: 318, seed: 9, streak: 0, slot: 0, ages: 193, active: true },
  ];
  it.each(routes)("completes ordinary $move and preserves ON/OFF rules and RNG", r => {
    const on = generatedCommandAnimationReplay(r.seed, "on", [r.slot], r.streak);
    const off = generatedCommandAnimationReplay(r.seed, "off", [r.slot], r.streak);
    const bodies = on.animations.filter(a => a.moveId === r.id && a.attacker === 0);
    expect(bodies.map(b => b.ages.length)).toEqual([iu120Ages(r.id, r.ages).length]);
    for (const body of bodies) {
      expect(body.ages).toEqual(Array.from({ length: body.ages.length }, (_, age) => age));
      expect(body.adapterActive.every(Boolean)).toBe(r.active);
      expect(body.adapterActive.some(Boolean)).toBe(r.active);
    }
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.stalled).toBe(off.stalled);
    expect(on.boundaries.length).toBeGreaterThan(0);
    expect(off.boundaries).toHaveLength(on.boundaries.length);
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
      expect(on.boundaries[i]!.boundary).toEqual(off.boundaries[i]!.boundary);
    }
  }, 240000);
});
