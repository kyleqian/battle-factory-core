import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveBattlerAnchors, liveMoveAnimationDuration, liveMoveAnimationPresentation,
  liveSemiInvulnerableHideBattler,
} from "../../src/engine/liveMoveAnimation.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import {
  LIVE_SEMI_INVULNERABLE_NONE, applyLiveSemiInvulnerableCommand, createBattleResolutionPresentationRenderView,
} from "../../src/engine/battleResolutionPresentationRender.ts";
import { batonPassAtAge } from "../../src/animation/batonPass.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { iu120Ages } from "../helpers/iu120Rows.ts";

// Baton Pass (226) live body adapter (docs/next-adapters-prep27.md s0.1 / s4). Dense proofs: tools/integration/fixtures/baton-endeavor-live-receipt.json.
const DIR = "tools/integration/fixtures/baton-endeavor-live";
const NAMES = readdirSync(DIR).filter((n) => n.startsWith("baton-") && n.endsWith(".json")).map((n) => n.slice(0, -5)).sort();
const fixtureAt = (name: string) => JSON.parse(readFileSync(`${DIR}/${name}.json`, "utf8")) as Fixture;
const request = (attacker: 0 | 1): BattleMoveAnimationRequest =>
  ({ moveId: 226, attacker, target: attacker, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0 }) as never;
const timeline = JSON.parse(readFileSync("tools/integration/fixtures/prep27/baton-rom-timeline.json", "utf8"));

describe("live Baton Pass (226) body adapter", () => {
  it("is registered with the constant 53-row body (52 active + cleanup) and the activation-frame shadow row", () => {
    expect(LIVE_MOVE_ANIMATION_IDS as readonly number[]).toContain(226);
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[226]).toBe(0);
    for (const attacker of [0, 1] as const) expect(liveMoveAnimationDuration(request(attacker))).toBe(53);
    for (const scenario of Object.values(timeline) as { body: { activeFrames: number }; t: { attackerHideAge: number } }[]) {
      expect(scenario.body.activeFrames + 1).toBe(53);
      expect(scenario.t.attackerHideAge).toBe(9);
    }
    // The reducer's own invisible flag (age >= 9) agrees with the ROM hide age.
    expect(batonPassAtAge(8, { x: 72, y: 97 }).attackerInvisible).toBe(false);
    expect(batonPassAtAge(9, { x: 72, y: 97 }).attackerInvisible).toBe(true);
    const status = JSON.parse(readFileSync("docs/animation-integration-live-status.json", "utf8"));
    expect((status.implementedAdapters as { id: number }[]).map((e) => e.id)).toContain(226);
  });

  it("covers 7 dense fixtures: AIPOM/ONIX accepted, NINJASK/GOLEM prep27, JOLTEON/GOLBAT both orientations + ONIX (front idle rest) opponent", () => {
    expect(NAMES).toHaveLength(7);
    expect(NAMES.filter((n) => n.includes("-player-"))).toHaveLength(3);
    expect(NAMES.filter((n) => n.includes("-opponent-"))).toHaveLength(4);
  });

  it.each(NAMES)("%s: config centre = the live picOffsetPoint anchor and every row renders through the live renderer", (name) => {
    const f = fixtureAt(name);
    const view0 = liveView(f, 0);
    const effect = view0.effect as unknown as { request: BattleMoveAnimationRequest };
    const cfg = liveMoveAnimationPresentation(effect.request, view0.field, 0)!.config as any;
    expect(cfg.move).toBe("BATON_PASS");
    const side = f.attacker.geometry.side;
    expect(cfg.attacker.geometry.animationCenter).toEqual(liveBattlerAnchors(side, createBattleCommandFieldArtView(view0.field)).picOffsetPoint);
    expect(liveMoveAnimationDuration(effect.request, view0.field)).toBe(53);
    for (const age of [0, 9, 30, 52]) {
      const fb = new Uint8Array(240 * 160 * 4);
      renderBattleResolutionLiveView(fb, liveView(f, age));
      expect(fb.some((v) => v !== 0)).toBe(true);
    }
  });

  it("pins the prep27 derived centres (component-exact 53/53 there)", () => {
    const receipt = JSON.parse(readFileSync("tools/integration/fixtures/prep27/baton-reducer-check.json", "utf8")).receipt;
    const pairs: [string, string][] = [["baton-accepted-player-aipom-onix", "player:AIPOM->ONIX"], ["baton-accepted-opponent-aipom-onix", "opponent:AIPOM->ONIX"],
      ["baton-prep27-player-ninjask-golem", "player:NINJASK->GOLEM"], ["baton-prep27-opponent-ninjask-golem", "opponent:NINJASK->GOLEM"]];
    for (const [name, key] of pairs) {
      const view0 = liveView(fixtureAt(name), 0);
      const cfg = liveMoveAnimationPresentation((view0.effect as any).request, view0.field, 0)!.config as any;
      expect(cfg.attacker.geometry.animationCenter).toEqual(receipt[key].derivedCenter);
      expect(cfg.attacker.geometry.spriteCorner).toEqual(receipt[key].derivedCorner);
    }
  });

  it("declines a shiny battler", () => {
    const view = liveView(fixtureAt("baton-prep27-player-ninjask-golem"), 0);
    const req = (view.effect as any).request;
    const shiny = ((416_049_562 >>> 16) ^ (416_049_562 & 0xffff)) >>> 0;
    expect(liveMoveAnimationPresentation(req, view.field, 0)).not.toBeNull();
    for (const side of ["player", "opponent"] as const) {
      expect(liveMoveAnimationPresentation(req, { ...view.field, [side]: { ...view.field[side], personality: shiny } }, 0)).toBeNull();
    }
  });

  it("keeps the attacker hidden after the body until its switch-out / switch-in (presentation-only seam)", () => {
    for (const attacker of [0, 1] as const) {
      expect(liveSemiInvulnerableHideBattler(request(attacker))).toBe(attacker);
      const body = { type: "move-animation", battler: attacker, animation: request(attacker) } as never;
      const hidden = applyLiveSemiInvulnerableCommand(LIVE_SEMI_INVULNERABLE_NONE, body);
      expect(hidden[attacker]).toBe(true);
      expect(hidden[1 - attacker]).toBe(false);
      // Unrelated commands keep it; the battler's switch-out (or switch-in / visibility receipt) clears it.
      expect(applyLiveSemiInvulnerableCommand(hidden, { type: "turn-end" } as never)).toBe(hidden);
      for (const type of ["switch-out", "switch-in", "sprite-visibility", "faint"]) {
        expect(applyLiveSemiInvulnerableCommand(hidden, { type, battler: attacker } as never)[attacker]).toBe(false);
      }
    }
  });

  for (const route of [{ seed: 71, streak: 0, slot: 2 as const, species: "AIPOM" }, { seed: 2, streak: 7, slot: 0 as const, species: "NINJASK" }]) {
    it(`route seed ${route.seed} / streak ${route.streak} (${route.species}): adapter active every age, party screen answered, next prompt, Scene ON/OFF parity`, () => {
      const sprite: boolean[] = [];
      let tracking = false;
      const on = generatedCommandAnimationReplay(route.seed, "on", [route.slot], route.streak, false, true, (state) => {
        const res = state.battleResolutionPresentation as any;
        const cmd = res?.segments[res.segmentIndex]?.commands[res.commandIndex];
        if (cmd?.type === "move-animation" && cmd.animation?.moveId === 226) tracking = true;
        else if (state.battleForcedPartySelect) tracking = false;
        // Between the body and the party screen the attacker is not drawn (ROM: invisible since age 9).
        else if (tracking && res) sprite.push(renderVisible(res));
      });
      const off = generatedCommandAnimationReplay(route.seed, "off", [route.slot], route.streak, false, true);
      const bodies = on.animations.filter((a) => a.moveId === 226 && a.attacker === 0);
      expect(bodies).toHaveLength(1);
      expect(bodies[0]!.player).toBe(route.species);
      expect(bodies[0]!.ages).toEqual(iu120Ages(226, 53));
      expect(bodies[0]!.adapterActive.every(Boolean)).toBe(true);
      expect(sprite.length).toBeGreaterThan(0);
      expect(sprite.every((v) => v === false)).toBe(true);
      expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
      const strip = (v: any) => ({ ...v, nextEventSequence: 0,
        rules: { ...v.rules, rulesContext: { ...v.rules.rulesContext, hitMarker: v.rules.rulesContext.hitMarker & ~0x80 } } });
      expect(JSON.stringify(on.boundaries.map(strip))).toBe(JSON.stringify(off.boundaries.map(strip)));
      expect(on.state.round.rules.rngValue).toBe(off.state.round.rules.rngValue);
      expect(JSON.stringify(on.state.facilityState)).toBe(JSON.stringify(off.state.facilityState));
    });
  }
});

function renderVisible(res: unknown): boolean {
  return (createBattleResolutionPresentationRenderView(res as never) as any).visibility.player.sprite;
}
