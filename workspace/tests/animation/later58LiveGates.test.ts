import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
// apx219: these gate pins read the proven body (an unknown order / allocator history is drawn approximately by the production
// liveMoveAnimationPresentation; tests/apx219SpriteOrderAllocatorApproximate.test.ts).
import { liveMoveAnimationPresentationProven as liveMoveAnimationPresentation } from "../../src/engine/liveMoveAnimation.ts";
import { liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";

// docs/next-adapters-later58.md + tools/integration/fixtures/later58-live-receipt.json: first-body consumers at a LATER body (after Quick
// Attack, Growl + its stat-down body, Splash and the move's own earlier body; both attacker sides, two species pairs, direct mGBA twice fresh).
// The pinned rows are the ROM RGB sha256 of the r1 probe (rows of a D4 other-phase window exclude its documented residual rows).
type Pinned = { fixture: string; verdict: string; rows: [age: number, frame: number, sha256: string][] };
const receipt = JSON.parse(readFileSync("tools/integration/fixtures/later58-live-receipt.json", "utf8")) as { pinned: Record<string, Pinned> };
const LIVE = "tools/integration/fixtures/later58/live";
const fixture = (name: string) => JSON.parse(readFileSync(`${LIVE}/${name}.json`, "utf8")) as Fixture & { precedingBodies?: unknown[] };
const presentation = (f: Fixture, age = 0) => {
  const view = liveView(f, age);
  const e = view.effect as unknown as { request: BattleMoveAnimationRequest; spriteAllocatorInput: never; spriteOrderInput: never; battlerX2Input: never };
  return liveMoveAnimationPresentation(e.request, view.field, age, undefined, e.spriteAllocatorInput, e.spriteOrderInput, undefined, e.battlerX2Input);
};
const rowSha = (f: Fixture, age: number) => {
  const rgba = new Uint8Array(240 * 160 * 4), rgb = new Uint8Array(240 * 160 * 3);
  renderBattleResolutionLiveView(rgba, liveView(f, age));
  for (let p = 0; p < 240 * 160; p++) { rgb[p * 3] = rgba[p * 4]!; rgb[p * 3 + 1] = rgba[p * 4 + 1]!; rgb[p * 3 + 2] = rgba[p * 4 + 2]!; }
  return createHash("sha256").update(rgb).digest("hex");
};
const pinnedOf = (move: string) => Object.keys(receipt.pinned).filter((name) => fixture(name).move === move);
const expectPinnedRows = (name: string) => {
  const { rows } = receipt.pinned[name]!;
  const f = fixture(name);
  expect(f.precedingBodies?.length).toBeGreaterThan(0);
  expect(presentation(f)).not.toBeNull();
  expect(rows.filter(([age, , sha]) => rowSha(f, age) !== sha).map(([age]) => age)).toEqual([]);
};

describe("later58 Signal Beam 324 at a later body", () => {
  it.each(pinnedOf("SIGNAL_BEAM"))("%s: live, every pinned row equals the ROM frame", expectPinnedRows, 180000);

  it("later bodies after Quick Attack / Growl / Splash / its own body are live on rest-free battlers; an opponent ONIX later body declines", () => {
    for (const name of ["signal-beam-pla-ariados-chansey-qa-0", "signal-beam-pla-ariados-chansey-growl-1", "signal-beam-opp-venomoth-golem-splash-2",
      "signal-beam-opp-ariados-chansey-qa-1"]) expect(presentation(fixture(name))?.config.move).toBe("SIGNAL_BEAM");
    // ONIX (front-idle rest x2 1): its Quick Attack zeroes the ROM x2 the tracker keeps (unguarded: 40,367 px at ages 0..36).
    expect(presentation(fixture("signal-beam-pla-ariados-onix-splash-0"))?.config.move).toBe("SIGNAL_BEAM");
    for (const name of ["signal-beam-pla-ariados-onix-qa-0", "signal-beam-pla-ariados-onix-splash-1"]) expect(presentation(fixture(name))).toBeNull();
  });

  it("an unknown lend declines", () => {
    const view = liveView(fixture("signal-beam-pla-ariados-chansey-qa-0"), 0);
    expect(liveMoveAnimationPresentation((view.effect as unknown as { request: BattleMoveAnimationRequest }).request, view.field, 0)).toBeNull();
  });
});

describe("later58 Mach Punch 183 at a later body (D4a: the policy's lag phase)", () => {
  it.each(pinnedOf("MACH_PUNCH"))("%s: live, every pinned row equals the ROM frame", expectPinnedRows, 180000);

  it("later bodies after Quick Attack / Growl / Splash / its own body are live on rest-free battlers; the target-rest guard stays", () => {
    for (const name of ["mach-punch-pla-hitmonchan-chansey-qa-1", "mach-punch-opp-machamp-golem-growl-2", "mach-punch-pla-machamp-golem-splash-2"]) {
      expect(presentation(fixture(name))?.config.move).toBe("MACH_PUNCH");
    }
    const later = fixture("mach-punch-pla-hitmonchan-chansey-qa-1");
    expect(presentation({ ...later, target: { ...later.target, species: "ONIX" } })).toBeNull();
    // An ONIX attacker (opponent, rest x2 1): the first body engages (species audit 9), a later body declines (both rests {0,0} required).
    const opp = fixture("mach-punch-opp-hitmonchan-chansey-splash-1");
    expect(presentation({ ...opp, attacker: { ...opp.attacker, species: "ONIX" } })).toBeNull();
    const first = fixture("mach-punch-opp-hitmonchan-chansey-splash-0");
    expect(presentation({ ...first, attacker: { ...first.attacker, species: "ONIX" } })?.config.move).toBe("MACH_PUNCH");
  });
});

describe("later58 Sheer Cold 329 at a later body (D4: the per-side age-171 policy phase)", () => {
  it.each(pinnedOf("SHEER_COLD"))("%s: live, every pinned row equals the ROM frame", expectPinnedRows, 180000);

  it("later bodies after Quick Attack / Growl / Splash are live on rest-free battlers; an ONIX on either side declines a later body", () => {
    for (const name of ["sheer-cold-pla-dewgong-chansey-qa-0", "sheer-cold-pla-cloyster-golem-growl-s2-0", "sheer-cold-opp-cloyster-golem-qa-0",
      "sheer-cold-opp-dewgong-chansey-splash-s1-0"]) expect(presentation(fixture(name))?.config.move).toBe("SHEER_COLD");
    const later = fixture("sheer-cold-pla-dewgong-chansey-qa-0");
    expect(presentation({ ...later, target: { ...later.target, species: "ONIX" } })).toBeNull();
    const first = fixture("sheer-cold-pla-dewgong-chansey-growl-0");
    expect(first.precedingBodies).toBeUndefined();
    expect(presentation({ ...first, target: { ...first.target, species: "ONIX" } })?.config.move).toBe("SHEER_COLD");
  });
});

describe("later58 Extrasensory 326 at a later body (D4c: opponent attacker only)", () => {
  it.each(pinnedOf("EXTRASENSORY"))("%s: live, every pinned row equals the ROM frame", expectPinnedRows, 180000);

  it("an opponent attacker's later bodies are live on rest-free battlers; a player attacker's later body is live only on a SHUCKLE-class target (asl155)", () => {
    for (const name of ["extrasensory-opp-nuzleaf-shuckle-qa-0", "extrasensory-opp-nuzleaf-shuckle-growl-2", "extrasensory-opp-alakazam-golem-splash-1"]) {
      expect(presentation(fixture(name))?.config.move).toBe("EXTRASENSORY");
    }
    const opp = fixture("extrasensory-opp-nuzleaf-shuckle-qa-0");
    expect(presentation({ ...opp, attacker: { ...opp.attacker, species: "ONIX" } })).toBeNull();
    // asl155 (D4 faithful timing): the dominant later phase (S = 0 on every row) on a target whose first visible monbg line is >= 27 (SHUCKLE);
    // GOLEM's line 18 shows the split on rows where no S dominates: declines
    for (const name of ["extrasensory-pla-nuzleaf-shuckle-qa-0", "extrasensory-pla-nuzleaf-shuckle-splash-1"]) {
      expect(presentation(fixture(name))?.config.move).toBe("EXTRASENSORY");
    }
    expect(presentation(fixture("extrasensory-pla-alakazam-golem-growl-1"))).toBeNull();
    expect(presentation(fixture("extrasensory-pla-nuzleaf-shuckle-splash-0"))?.config.move).toBe("EXTRASENSORY");
  });
});

describe("later58 Sky Attack 143: a later charge", () => {
  it.each(pinnedOf("SKY_ATTACK"))("%s: live, every pinned row equals the ROM frame", expectPinnedRows, 180000);

  it("later charges after Quick Attack / Growl / Splash / its own charge + strike are live on rest-free battlers; an ONIX later charge declines", () => {
    for (const name of ["sky-attack-pla-pidgeot-golem-qa-0", "sky-attack-opp-fearow-shuckle-growl-2", "sky-attack-pla-fearow-shuckle-splash-4"]) {
      const p = presentation(fixture(name));
      expect(p?.config.move).toBe("SKY_ATTACK");
      expect((p!.config as any).animationInputs.background.registers).toMatchObject({ win0h: 0, win0v: 0 });
    }
    const later = fixture("sky-attack-pla-pidgeot-golem-qa-0");
    expect(presentation({ ...later, target: { ...later.target, species: "ONIX" } })).toBeNull();
  });
});

describe("later58 Bonemerang 155: later hits", () => {
  it.each(pinnedOf("BONEMERANG"))("%s: live, every pinned row equals the ROM frame", expectPinnedRows, 180000);

  it("later hits 1 and 2 after Quick Attack / Growl / Splash / its own hits are live on rest-free battlers; an ONIX later hit declines", () => {
    for (const name of ["bonemerang-pla-marowak-chansey-qa-0", "bonemerang-pla-marowak-chansey-qa-1", "bonemerang-opp-marowak-chansey-growl-2",
      "bonemerang-opp-rhydon-golem-qa-1"]) expect(presentation(fixture(name))?.config.move).toBe("BONEMERANG");
    const later = fixture("bonemerang-pla-marowak-chansey-qa-0");
    expect(presentation({ ...later, target: { ...later.target, species: "ONIX" } })).toBeNull();
  });
});

describe("later58 Outrage 200 at a later body", () => {
  it.each(pinnedOf("OUTRAGE"))("%s: live, every pinned row equals the ROM frame", expectPinnedRows, 180000);

  it("later bodies after Quick Attack / Growl / Splash / its own turn are live on rest-free battlers; an opponent ONIX later body declines", () => {
    for (const name of ["outrage-opp-flygon-golem-qa-0", "outrage-opp-flygon-golem-splash-1", "outrage-pla-flygon-golem-qa-2"]) {
      expect(presentation(fixture(name))?.config.move).toBe("OUTRAGE");
    }
    expect(presentation(fixture("outrage-pla-dragonite-onix-splash-0"))?.config.move).toBe("OUTRAGE");
    for (const name of ["outrage-pla-dragonite-onix-splash-1", "outrage-pla-dragonite-onix-qa-0"]) expect(presentation(fixture(name))).toBeNull();
  });
});

describe("later58 Fury Cutter 210: a later counter-1 body (request power 10 / 15)", () => {
  it.each(pinnedOf("FURY_CUTTER"))("%s: live, every pinned row equals the ROM frame", expectPinnedRows, 180000);

  it("the first Fury Cutter after Quick Attack / Growl / Splash is live on rest-free battlers; counter 2+ power and an ONIX decline", () => {
    for (const name of ["fury-cutter-pla-grovyle-blissey-qa-0", "fury-cutter-opp-scyther-golem-splashslow-0", "fury-cutter-pla-scyther-golem-growlslow-0"]) {
      expect(presentation(fixture(name))?.config.move).toBe("FURY_CUTTER");
    }
    const later = fixture("fury-cutter-pla-grovyle-blissey-qa-0");
    expect(later.requestFields?.power).toBe(10);
    expect(presentation({ ...later, requestFields: { ...later.requestFields, power: 15 } })?.config.move).toBe("FURY_CUTTER"); // SWARM
    for (const power of [20, 30, 40, 160]) expect(presentation({ ...later, requestFields: { ...later.requestFields, power } })).toBeNull();
    expect(presentation({ ...later, target: { ...later.target, species: "ONIX" } })).toBeNull();
    // A first body stays live whatever the power (counter 1 is implied).
    const first = fixture("fury-cutter-pla-grovyle-blissey-growl-0");
    expect(first.precedingBodies).toBeUndefined();
    expect(presentation({ ...first, requestFields: { ...first.requestFields, power: 20 } })?.config.move).toBe("FURY_CUTTER");
  });
});
