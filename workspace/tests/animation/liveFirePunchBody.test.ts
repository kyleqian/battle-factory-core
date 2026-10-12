import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";
import type { BattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration, liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { iu120Ages } from "../helpers/iu120Rows.ts";

// r2-gates (docs/next-adapters-prep22.md s0/A): MOVE_FIRE_PUNCH (7) BODY only. The dense framebuffer proofs are
// tools/integration/fixtures/r2-gates/fp-*.json (receipt r2-gates-firepunch-receipt.json); the burn flames belong to the separate
// Status_Burn body and are never drawn by this adapter.
const request = (attacker: 0 | 1): BattleMoveAnimationRequest => ({
  moveId: 7, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0,
});
function displayed(player: string, opponent: string): BattleResolutionDisplayedField {
  const mon = (name: string) => ({
    species: speciesStats.species.find(s => s.name === `SPECIES_${name}`)!.id, speciesSymbol: name, name, level: 50,
    hp: 100, maxHP: 100, gender: "male", status: "none",
  });
  return { player: mon(player), opponent: mon(opponent) } as unknown as BattleResolutionDisplayedField;
}
function render(field: BattleResolutionDisplayedField, req: BattleMoveAnimationRequest, age: number): string {
  const view = {
    field, fieldArt: createBattleCommandFieldArtView(field),
    healthboxes: {
      player: { name: field.player.name, level: 50, gender: "male", hpFraction: 1, status: "none", currentHp: 100, maxHp: 100 },
      opponent: { name: field.opponent.name, level: 50, gender: "male", hpFraction: 1, status: "none" },
    },
    message: { lines: ["X used", "A MOVE!"], visibleCharacters: 99 },
    effect: { type: "move", request: req, age },
    visibility: { player: { sprite: true, healthbox: true }, opponent: { sprite: true, healthbox: true } },
    waitCursor: null, bottom: "message", confirmHandoff: null, switchIn: null, midBattleSwitchIn: null,
    switchOut: null, partySummary: null, midBattleSwitchFade: null, midBattleSwitchParticles: null, trainerSlide: null,
  } as unknown as BattleResolutionPresentationRenderView;
  const fb = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(fb, view);
  return createHash("sha256").update(fb).digest("hex");
}

describe("live Fire Punch body-only adapter (7)", () => {
  it("registers the 101-row body with shadow row 0; the config is the neutral profile at reducer age 27", () => {
    expect(LIVE_MOVE_ANIMATION_IDS).toContain(7);
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[7]).toBe(0);
    for (const a of [0, 1] as const) {
      expect(liveMoveAnimationDuration(request(a))).toBe(101);
      const f = a === 0 ? displayed("ONIX", "GROVYLE") : displayed("GROVYLE", "ONIX");
      const c = liveMoveAnimationPresentation(request(a), f, 0)!.config as any;
      expect(c.move).toBe("FIRE_PUNCH");
      expect(c.animationAgeOffset).toBe(27);
      expect(c.attacker.geometry.side).toBe(a === 0 ? "player" : "opponent");
      // No HP commit / roll / burn inside the body: every profile age is never reached.
      expect(c.resolutionProfile).toMatchObject({ initialStatus: "none", secondaryRollSucceeded: false });
      for (const key of ["hpCommitAge", "hpDrainFirstAge", "hitWobbleFirstAge", "hitBlinkFirstAge", "secondaryRollAge", "currentMoveResetAge"]) {
        expect(c.resolutionProfile[key]).toBeGreaterThanOrEqual(1_000_000);
      }
    }
  });

  it("declines for a shiny battler (no shiny palette exists; audit 6), both sides", () => {
    const shiny = ((416_049_562 >>> 16) ^ (416_049_562 & 0xffff)) << 16 >>> 0;
    for (const side of ["player", "opponent"] as const) {
      const f = displayed("ONIX", "GROVYLE") as any;
      expect(liveMoveAnimationPresentation(request(0), f, 0)).not.toBeNull();
      f[side] = { ...f[side], personality: shiny };
      expect(liveMoveAnimationPresentation(request(0), f, 0)).toBeNull();
    }
  });

  it("renders live species art (alternate pairs, elevated GOLBAT) in both orientations; frames change over the body", () => {
    for (const [a, p, o] of [[0, "HITMONCHAN", "GOLBAT"], [1, "MACHAMP", "GOLBAT"], [0, "SNORLAX", "ALAKAZAM"], [1, "GOLEM", "SNORLAX"]] as const) {
      const f = displayed(p, o), req = request(a);
      expect(liveMoveAnimationPresentation(req, f, 0)).not.toBeNull();
      const frames = [0, 20, 44, 60, 80, 100].map(age => render(f, req, age));
      expect(new Set(frames).size).toBeGreaterThan(3);
      // The live render of a different carrier differs from the staged ONIX/GROVYLE art (no staged-pair throw).
      expect(frames[0]).not.toBe(render(a === 0 ? displayed("ONIX", "GROVYLE") : displayed("GROVYLE", "ONIX"), req, 0));
    }
  }, 240000);

  it("pins the dense receipt: every fixture 0 px twice fresh, outcomes burn / no-burn / faint, both orientations, alternates, later body", () => {
    const path = "tools/integration/fixtures/r2-gates-firepunch-receipt.json";
    if (!existsSync(path)) return;
    const receipt = JSON.parse(readFileSync(path, "utf8"));
    const dir = "tools/integration/fixtures/r2-gates";
    const files = readdirSync(dir).filter(n => n.startsWith("fp-") && n.endsWith(".json") && !n.includes("activations")).map(n => n.replace(/\.json$/, "")).sort();
    expect(Object.keys(receipt.firePunch.fixtures).sort()).toEqual(files);
    const sides = new Set<string>(), outcomes = new Set<string>();
    for (const [name, row] of Object.entries(receipt.firePunch.fixtures) as [string, any][]) {
      const fx = JSON.parse(readFileSync(`${dir}/${name}.json`, "utf8"));
      expect(fx.denseWindow.endFrame - fx.denseWindow.startFrame + 1).toBe(101);
      expect(row.freshRuns).toHaveLength(2);
      for (const run of row.freshRuns) expect([run.rows, run.exactRows, run.residualPixels]).toEqual([101, 101, 0]);
      expect(row.freshRuns[0].digest).toBe(row.freshRuns[1].digest);
      sides.add(fx.attacker.geometry.side);
      outcomes.add(name.replace(/^fp-(staged-)?(player|opponent)-?/, ""));
    }
    expect([...sides].sort()).toEqual(["opponent", "player"]);
    for (const o of ["burn", "noburn", "faint"]) expect(outcomes.has(o)).toBe(true);
    expect(files.filter(n => JSON.parse(readFileSync(`${dir}/${n}.json`, "utf8")).precedingBodies?.length > 0).length).toBeGreaterThan(0);
  });

  // Ordinary routes (generated rentals, one move slot per turn): Fire Punch bodies are live every age and the next prompt is reached;
  // gameplay boundaries/RNG are equal with Scene ON and OFF. Seed 780 burns its target (no flames: Status_Burn is not drawn).
  const P = (seed: number, turns: number) => ([[0, 1, 2, 3], [1, 2, 3, 0]] as const)[seed % 2]!.slice(0, turns) as (0 | 1 | 2 | 3)[];
  const routes = [
    { name: "70 player Magby first body", seed: 70, turns: 2, index: 0, attacker: 0 },
    { name: "180 player Magby first body", seed: 180, turns: 2, index: 0, attacker: 0 },
    { name: "65 foe Magby after Confuse Ray", seed: 65, turns: 2, index: 1, attacker: 1 },
    { name: "389 foe Magby after Confuse Ray + Knock Off", seed: 389, turns: 2, index: 2, attacker: 1 },
    { name: "780 player Magby burn route", seed: 780, turns: 2, index: 0, attacker: 0, burn: true },
  ];
  it.each(routes)("ordinary route $name: active every age, prompt reached, ON/OFF rules/RNG equal", r => {
    const on = generatedCommandAnimationReplay(r.seed, "on", P(r.seed, r.turns), 0, true, true);
    const off = generatedCommandAnimationReplay(r.seed, "off", P(r.seed, r.turns), 0, true, true);
    const body = on.animations[r.index]!;
    expect([body.moveId, body.attacker]).toEqual([7, r.attacker]);
    expect(body.ages).toEqual(iu120Ages(7, 101, r.attacker === 0 ? "player" : "opponent"));
    expect(body.adapterActive.every(Boolean)).toBe(true);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    if (r.burn) expect(on.semanticEvents.some(e => /burn/i.test(JSON.stringify(e.event)))).toBe(true);
    expect(on.stalled).toBe(off.stalled);
    expect(off.boundaries).toHaveLength(on.boundaries.length);
    for (let i = 0; i < on.boundaries.length; i += 1) {
      const strip = (v: { rules: any }) => ({ ...v.rules, rulesContext: { ...v.rules.rulesContext, hitMarker: v.rules.rulesContext.hitMarker & ~0x80 } });
      expect(strip(on.boundaries[i]!)).toEqual(strip(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
      expect(on.boundaries[i]!.boundary).toEqual(off.boundaries[i]!.boundary);
    }
  }, 240000);
});
