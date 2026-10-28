import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { SceneOnDiveConfig } from "../../src/animation/sceneOnPresentation.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
// apx219: these gate pins read the proven body (an unknown order / allocator history is drawn approximately by the production
// liveMoveAnimationPresentation; tests/apx219SpriteOrderAllocatorApproximate.test.ts).
import {
  liveMoveAnimationDuration, liveMoveAnimationPresentationProven as liveMoveAnimationPresentation, liveMoveOpponentShadowRow, liveSemiInvulnerableHideBattler,
} from "../../src/engine/liveMoveAnimation.ts";
import { LIVE_DIVE_RANDOM2_PLANS, liveMoveRandom2Plan } from "../../src/engine/liveMovePresentationRng.ts";
import { presentationRngFromTrace, presentationRngTraceMetadata } from "../../src/engine/presentationRngHost.ts";
import { liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";
import { random2Route } from "../../tools/integration/random2R1/routeHarness.ts";
import { iu120EffectAges } from "../helpers/iu120Rows.ts";

// dive70 (docs/dive70-dive-attack.md): the Dive 291 ATTACK body (turn 1, DiveAttack + RisingWaterHitEffect) plays live. Receipt:
// tools/integration/fixtures/dive70-live-receipt.json (dive70Receipt.py over liveAdapterFramebuffer.ts: 15 dense windows x 2 fresh direct-mGBA
// runs, words PINNED through the fixture hook wordsChain = the RAM gRng2Value at the setup / attack activation; the order lend comes from the
// production host). Fixtures: tools/integration/fixtures/dive70/*.json (dive70Fixtures.py over prep22Probe.py runs).
interface Window {
  fixture: string; side: "player" | "opponent"; attacker: string; target: string; rows: number; expectedDuration: number;
  runs: { exactRows: number; residualPixels: number; digest: string }[]; r1EqualsR2: boolean; lendEqualsRom: boolean; liveAges: number;
  words: { count: number; draws: number[] }; wordsProvenance: string; romRgbSha256: string[];
}
const receipt = JSON.parse(readFileSync("tools/integration/fixtures/dive70-live-receipt.json", "utf8")) as {
  summary: Record<string, number>; windows: Window[];
  protectMiss: { probe: string; freshRunsAgree: boolean; turn2ProtectSucceeded: boolean; nextDiveBody: string | null }[];
};
const fixtureAt = (path: string) => JSON.parse(readFileSync(path, "utf8")) as Fixture;
const request = (attacker: 0 | 1, turn: number): BattleMoveAnimationRequest => ({
  moveId: 291, attacker, target: (1 - attacker) as 0 | 1, turn, power: 80, damage: 10, friendship: 70, multihit: 0 });
const presentationOf = (f: Fixture, age: number) => {
  const view = liveView(f, age);
  const e = view.effect as unknown as {
    request: BattleMoveAnimationRequest; spriteAllocatorInput: never; spriteOrderInput: never; presentationRng: never; battlerX2Input: never };
  return { view, e, state: liveMoveAnimationPresentation(e.request, view.field, age, undefined, e.spriteAllocatorInput, e.spriteOrderInput,
    e.presentationRng, e.battlerX2Input) };
};
/** The production live render of one fixture row as the oracle's RGB888 sha256. */
const romHashOfLiveRow = (f: Fixture, age: number): string => {
  const rgba = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(rgba, liveView(f, age));
  const rgb = new Uint8Array(240 * 160 * 3);
  for (let p = 0; p < 240 * 160; p += 1) { rgb[3 * p] = rgba[4 * p]!; rgb[3 * p + 1] = rgba[4 * p + 1]!; rgb[3 * p + 2] = rgba[4 * p + 2]!; }
  return createHash("sha256").update(rgb).digest("hex");
};

describe("dive70: Dive 291 attack body live adapter", () => {
  it("the receipt: 15 dense attack windows x 2 fresh runs, 93 / 93 rows 0 px, r1 == r2; both sides, >= 3 species pairs each; pinned words", () => {
    expect(receipt.summary).toEqual({ windows: 15, exactWindows: 15, rows: 1395, r1EqualsR2: 15, lendEqualsRom: 14, protectedAttacksWithoutBody: 8 });
    for (const w of receipt.windows) {
      expect(w.rows, w.fixture).toBe(93);
      expect(w.expectedDuration, w.fixture).toBe(93);
      expect(w.runs.map((r) => [r.exactRows, r.residualPixels]), w.fixture).toEqual([[93, 0], [93, 0]]);
      expect(w.runs[1]!.digest, w.fixture).toBe(w.runs[0]!.digest);
      expect(w.liveAges, w.fixture).toBe(93);
      expect(w.words, w.fixture).toEqual({ count: 56, draws: [20, 4, 4, 4, 4, 4, 4, 4, 4, 4] });
      expect(w.wordsProvenance, w.fixture).toMatch(/^pinned/);
      expect(w.romRgbSha256, w.fixture).toHaveLength(93);
    }
    const pairs = (side: string) => new Set(receipt.windows.filter((w) => w.side === side).map((w) => `${w.attacker}>${w.target}`));
    for (const side of ["player", "opponent"]) {
      expect(pairs(side).size, side).toBeGreaterThanOrEqual(3);
      expect([...pairs(side)].filter((p) => p !== "CHINCHOU>ONIX").length, side).toBeGreaterThanOrEqual(3);
    }
    // the one order-host residual (docs/dive70-dive-attack.md s3): a Whirlpool hit on the hidden opponent diver right before the player's
    // action prompt places the prompt's slots 3 / 4 differently from the ROM; the window is still 0 px
    expect(receipt.windows.filter((w) => !w.lendEqualsRom).map((w) => w.fixture)).toEqual(["tools/integration/fixtures/dive70/var-whirlpool-opp.json"]);
    // a protected attack plays no attack body in the ROM (the next Dive body is a new setup): nothing for the adapter to draw
    const protectedRuns = receipt.protectMiss.filter((p) => p.turn2ProtectSucceeded);
    expect(protectedRuns.length).toBe(8);
    expect(protectedRuns.every((p) => p.freshRunsAgree && p.nextDiveBody === "new setup")).toBe(true);
  });

  it("vector: the production live render of every pinned window row equals the ROM frame (RGB888 sha256), 15 x 93 rows", () => {
    for (const w of receipt.windows) {
      const f = fixtureAt(w.fixture);
      const live = Array.from({ length: 93 }, (_, age) => romHashOfLiveRow(f, age));
      expect(live, w.fixture).toEqual(w.romRgbSha256);
    }
  }, 240000);

  it("93 rows both sides, no hide; the attack reads the resolved lend + 56 host words; shiny / missing words / elevated opponent diver decline", () => {
    expect(liveMoveAnimationDuration(request(0, 1))).toBe(93);
    expect(liveMoveAnimationDuration(request(1, 1))).toBe(93);
    expect(liveSemiInvulnerableHideBattler(request(0, 1))).toBeNull();
    expect(liveSemiInvulnerableHideBattler(request(1, 1))).toBeNull();
    expect(liveMoveRandom2Plan(request(0, 1))).toBe(LIVE_DIVE_RANDOM2_PLANS.attack);
    // the opponent diver is still invisible on its activation frame: no row-0 shadow; a player diver keeps the setup's row
    expect(liveMoveOpponentShadowRow(request(1, 1))).toBeNull();
    expect(liveMoveOpponentShadowRow(request(0, 1))).toBe(liveMoveOpponentShadowRow(request(0, 0)));
    const f = fixtureAt("tools/integration/fixtures/dive70/ply-chinchou-golbat.json");
    const { view, e, state } = presentationOf(f, 40);
    const config = state!.config as SceneOnDiveConfig;
    expect(config.body).toBe("attack");
    expect(config.animationProfile.firstInactiveAge).toBe(92);
    expect(config.animationProfile.impacts).toHaveLength(9);
    expect(config.animationProfile.droplets).toHaveLength(10);
    expect(state!.faithfulRandomHistory).toBe(true);
    // no lend / no host words -> declines
    expect(liveMoveAnimationPresentation(e.request, view.field, 40, undefined, e.spriteAllocatorInput, undefined, e.presentationRng)).toBeNull();
    expect(liveMoveAnimationPresentation(e.request, view.field, 40, undefined, e.spriteAllocatorInput, e.spriteOrderInput, undefined)).toBeNull();
    // st76 (docs/st76-status-gates.md): a displayed status plays live (the live view redraws the healthboxes, status icon included)
    const sick = { ...view.field, opponent: { ...view.field.opponent, status: "poison" as const } };
    expect(liveMoveAnimationPresentation(e.request, sick, 40, undefined, e.spriteAllocatorInput, e.spriteOrderInput, e.presentationRng)).not.toBeNull();
    // an elevated opponent diver (GOLBAT stands in for one) declines
    const g = fixtureAt("tools/integration/fixtures/dive70/opp-chinchou-onix.json");
    const elevated = presentationOf({ ...g, attacker: { ...g.attacker, species: "GOLBAT" } }, 40);
    expect(elevated.state).toBeNull();
    expect(presentationOf(g, 40).state).not.toBeNull();
  });

  it("render-pure: rendering a row twice reads the same words and draws the same frame (the host stream does not advance)", () => {
    const f = fixtureAt("tools/integration/fixtures/dive70/opp-seel-onix.json");
    const first = presentationOf(f, 50), again = presentationOf(f, 50);
    expect((again.state!.config as SceneOnDiveConfig).animationProfile).toEqual((first.state!.config as SceneOnDiveConfig).animationProfile);
    expect(romHashOfLiveRow(f, 50)).toBe(romHashOfLiveRow(f, 50));
  });

  it("ordinary route seed 111 slot 0: both player Dive attacks live at every age on 56 surrogate words; seeds change words not logic; export replay reproduces the frames", () => {
    const SEED_A = 0x1234abcd, SEED_B = 0xfeed0042;
    const a = random2Route(111, "on", [0, 0], 0, SEED_A), b = random2Route(111, "on", [0, 0], 0, SEED_B);
    const attacks = (route: typeof a) => route.bodies.filter((body) => body.moveId === 291 && (body.turn & 1) === 1);
    expect(attacks(a)).toHaveLength(2);
    for (const attack of attacks(a)) {
      expect(attack.ages).toEqual(iu120EffectAges(291, 93));
      expect(attack.active.every(Boolean)).toBe(true);
      expect(attack.provenance).toBe("surrogate");
      expect(attack.words).toHaveLength(56);
    }
    expect(a.run.stalled).toBe(false);
    expect(a.run.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    // a different presentation seed: other words and frames, the same logic, RNG and facility state
    expect(attacks(b).map((x) => x.words)).not.toEqual(attacks(a).map((x) => x.words));
    expect(b.run.boundaries).toEqual(a.run.boundaries);
    expect(b.run.state.facilityState).toEqual(a.run.state.facilityState);
    expect(b.run.state.round.rules.rngValue).toBe(a.run.state.round.rules.rngValue);
    // session export (seed + policy) -> replay: the attack bodies' frames reproduce
    const replayed = random2Route(111, "on", [0, 0], 0, presentationRngFromTrace({ presentationRng: presentationRngTraceMetadata(a.session) }).seed);
    expect(attacks(replayed).map((x) => x.frameDigests)).toEqual(attacks(a).map((x) => x.frameDigests));
  }, 240000);
});
