import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Side = "player" | "opponent";
type Role = "attacker" | "target";

type FixtureBattler = {
  readonly species: string;
  readonly side?: Side;
  readonly geometry?: {
    readonly side: Side;
  };
};

type Fixture = {
  readonly schema: string;
  readonly oracleProfile: string;
  readonly probe: string;
  readonly probeArguments?: readonly string[];
  readonly pair: string;
  readonly move: string;
  readonly scenario?: string;
  readonly geometry?: {
    readonly attacker: FixtureBattler;
    readonly target: FixtureBattler;
  };
  readonly attacker?: FixtureBattler;
  readonly target?: FixtureBattler;
  readonly presentation?: Record<string, number>;
  readonly appStage: {
    readonly presentationAge?: number;
    readonly firstFramePresentationAge?: number;
  };
  readonly denseWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
  };
};

type NormalizedBattler = {
  readonly species: string;
  readonly side: Side;
};

const fulfilledGoal =
  "FULFILLED: MOVE_FIRE_PUNCH, MOVE_ICE_PUNCH, and MOVE_THUNDER_PUNCH each retain independently exact bilateral complete Scene-ON contracts. Fire's ONIX/GROVYLE windows close at 225/225 and 277/277 through its own ember, burn, residual-status, and controller paths; Ice's close at 462/462 and 1294/1294 through its own crystals, freeze, frozen-cube, Sitrus, and controller path; Thunder's legal ONIX/MURKROW windows close at 104/104 component and 104/104 actual-core framebuffer frames per orientation through its lightning, delay-2 black ramps, double inversion, shared fist/two-hitsplat/ShakeMon, monbg, and teardown source body. All runs preserve source, fixture, window, hardware, and framebuffer evidence; shared HANDS_AND_FEET, IMPACT, fist/hitsplat, or ShakeMon never grants a sibling acceptance or latch.";

const fixturePaths = [
  "tools/compare/fixtures/fire-punch-onix-grovyle.json",
  "tools/compare/fixtures/fire-punch-grovyle-onix.json",
  "tools/compare/fixtures/ice-punch-onix-grovyle.json",
  "tools/compare/fixtures/ice-punch-grovyle-onix.json",
  "tools/compare/fixtures/thunder-punch-player-onix-opponent-murkrow.json",
  "tools/compare/fixtures/thunder-punch-opponent-onix-player-murkrow.json",
] as const;

function fixture(path: string): Fixture {
  return JSON.parse(readFileSync(path, "utf8")) as Fixture;
}

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

/**
 * Fire/Ice are legacy portable-compare fixtures with `geometry.attacker` and
 * `geometry.target`; Thunder is a portable-component fixture with those two
 * battlers at the top level and side nested under `battler.geometry`.
 * Keeping this distinction here prevents a receipt ratchet from silently
 * accepting a malformed fixture or crashing while reading a valid one.
 */
function normalizedBattler(entry: Fixture, role: Role): NormalizedBattler {
  const battler = entry.geometry?.[role] ?? entry[role];
  if (!battler) {
    throw new Error(`${entry.move} fixture has no ${role} battler in a known schema`);
  }
  const side = battler.side ?? battler.geometry?.side;
  if (!side) {
    throw new Error(`${entry.move} fixture ${role} has no side in a known schema`);
  }
  return { species: battler.species, side };
}

function receipt(path: string) {
  const entry = fixture(path);
  const attacker = normalizedBattler(entry, "attacker");
  const target = normalizedBattler(entry, "target");
  return {
    path,
    schema: entry.schema,
    oracleProfile: entry.oracleProfile,
    move: entry.move,
    probe: entry.probe,
    probeArguments: entry.probeArguments ?? [],
    scenario: entry.scenario ?? null,
    pair: entry.pair,
    attacker: [attacker.species, attacker.side],
    target: [target.species, target.side],
    orientation: attacker.side === "player" ? "player-back" : "opponent-front",
    denseWindow: {
      startFrame: entry.denseWindow.startFrame,
      endFrame: entry.denseWindow.endFrame,
      frameCount: entry.denseWindow.endFrame - entry.denseWindow.startFrame + 1,
    },
    presentation: entry.presentation ?? null,
    presentationAge: entry.appStage.presentationAge
      ?? entry.appStage.firstFramePresentationAge,
    fixtureSha256: sha256(path),
  };
}

function sourceBody(source: string, start: string, end: string): string {
  const startAt = source.indexOf(start);
  expect(startAt).toBeGreaterThanOrEqual(0);
  const endAt = source.indexOf(end, startAt);
  expect(endAt).toBeGreaterThan(startAt);
  return source.slice(startAt, endAt);
}

describe("elemental-punch component-track receipt ratchet", () => {
  it("pins all six independent bilateral fixtures, windows, and hashes", () => {
    expect(fixturePaths.map(receipt)).toEqual([
      {
        path: fixturePaths[0],
        schema: "scene-on-portable-compare/v1",
        oracleProfile: "battle-scene-on",
        move: "FIRE_PUNCH",
        probe: "tools/probe/stage-fire-punch-portable-on.py",
        probeArguments: [],
        scenario: null,
        pair: "ONIX (player-back) -> GROVYLE (opponent-front)",
        attacker: ["ONIX", "player"],
        target: ["GROVYLE", "opponent"],
        orientation: "player-back",
        denseWindow: { startFrame: 2313, endFrame: 2537, frameCount: 225 },
        presentation: { animationAgeOffset: 0, moveTextStartAge: -1 },
        presentationAge: 0,
        fixtureSha256: "b0df76e942e514f16eefb4ee0f7bd9dfe568717a5672cf303d996e3dc53a4846",
      },
      {
        path: fixturePaths[1],
        schema: "scene-on-portable-compare/v1",
        oracleProfile: "battle-scene-on",
        move: "FIRE_PUNCH",
        probe: "tools/probe/stage-fire-punch-portable-on.py",
        probeArguments: ["opponent"],
        scenario: null,
        pair: "GROVYLE (opponent-front) -> ONIX (player-back)",
        attacker: ["GROVYLE", "opponent"],
        target: ["ONIX", "player"],
        orientation: "opponent-front",
        denseWindow: { startFrame: 2081, endFrame: 2357, frameCount: 277 },
        presentation: { animationAgeOffset: 123, moveTextStartAge: -26 },
        presentationAge: 0,
        fixtureSha256: "f3207a93847c1c17efb4904fa940806ba25a6a50bcd28dfc7f915ef54005cece",
      },
      {
        path: fixturePaths[2],
        schema: "scene-on-portable-compare/v1",
        oracleProfile: "battle-scene-on",
        move: "ICE_PUNCH",
        probe: "tools/probe/stage-fire-punch-portable-on.py",
        probeArguments: ["player", "ice-punch"],
        scenario: null,
        pair: "ONIX (player-back) -> GROVYLE (opponent-front)",
        attacker: ["ONIX", "player"],
        target: ["GROVYLE", "opponent"],
        orientation: "player-back",
        denseWindow: { startFrame: 2339, endFrame: 2800, frameCount: 462 },
        presentation: { moveTextStartAge: -25 },
        presentationAge: 0,
        fixtureSha256: "dcb6afa146b5a8f8f907ca28ae9d327c32a01c669aa9fa93e58a7ab6b2c636b9",
      },
      {
        path: fixturePaths[3],
        schema: "scene-on-portable-compare/v1",
        oracleProfile: "battle-scene-on",
        move: "ICE_PUNCH",
        probe: "tools/probe/stage-fire-punch-portable-on.py",
        probeArguments: ["opponent", "ice-punch"],
        scenario: null,
        pair: "GROVYLE (opponent-front) -> ONIX (player-back)",
        attacker: ["GROVYLE", "opponent"],
        target: ["ONIX", "player"],
        orientation: "opponent-front",
        denseWindow: { startFrame: 1966, endFrame: 3259, frameCount: 1294 },
        presentation: { moveTextStartAge: -25 },
        presentationAge: 0,
        fixtureSha256: "4e6d13d0b52f7a8a8aa2399dd6c80d18bc27705934f5aa105f9f7fcee2c9c11f",
      },
      {
        path: fixturePaths[4],
        schema: "scene-on-portable-component/v1",
        oracleProfile: "battle-scene-on",
        move: "THUNDER_PUNCH",
        probe: "tools/probe/run-battle-lab-rgb.py",
        probeArguments: [],
        scenario: "tools/battle-lab/mechanic-thunder-punch-player-onix-opponent-murkrow.json",
        pair: "ONIX (player-back) -> MURKROW (opponent-front)",
        attacker: ["ONIX", "player"],
        target: ["MURKROW", "opponent"],
        orientation: "player-back",
        denseWindow: { startFrame: 401, endFrame: 504, frameCount: 104 },
        presentation: null,
        presentationAge: 0,
        fixtureSha256: "18b7e3a9ce1eccac7cbb750ec126075ec0678410db80caf8f416cd11002874b7",
      },
      {
        path: fixturePaths[5],
        schema: "scene-on-portable-component/v1",
        oracleProfile: "battle-scene-on",
        move: "THUNDER_PUNCH",
        probe: "tools/probe/run-battle-lab-rgb.py",
        probeArguments: [],
        scenario: "tools/battle-lab/mechanic-thunder-punch-opponent-onix-player-murkrow.json",
        pair: "ONIX (opponent-front) -> MURKROW (player-back)",
        attacker: ["ONIX", "opponent"],
        target: ["MURKROW", "player"],
        orientation: "opponent-front",
        denseWindow: { startFrame: 452, endFrame: 555, frameCount: 104 },
        presentation: null,
        presentationAge: 0,
        fixtureSha256: "138a9d9ba1b99ce640d8ec711b1f289898adc36e1b3e8f5557b4a3cecba218aa",
      },
    ]);
  });

  it("keeps Fire, Ice, and Thunder source bodies distinct", () => {
    const source = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
    const fire = sourceBody(source, "Move_FIRE_PUNCH:", "Move_LEER:");
    const ice = sourceBody(source, "Move_ICE_PUNCH:", "Move_REST:");
    const thunder = sourceBody(source, "Move_THUNDER_PUNCH:", "Move_SACRED_FIRE:");

    expect(new Set([fire, ice, thunder]).size).toBe(3);

    expect(fire).toContain("loadspritegfx ANIM_TAG_HANDS_AND_FEET");
    expect(fire).toContain("loadspritegfx ANIM_TAG_SMALL_EMBER");
    expect(fire).toContain("loadspritegfx ANIM_TAG_IMPACT");
    expect(fire.match(/gFireSpiralInwardSpriteTemplate/g)).toHaveLength(4);
    expect(fire).toContain("call FireSpreadEffect");
    expect(fire).toContain("create_fist_sprite ANIM_TARGET, 3");
    expect(fire).toContain("createvisualtask AnimTask_ShakeMon, 2, ANIM_TARGET, 0, 3, 15, 1");
    expect(fire.match(/create_basic_hitsplat_sprite/g)).toHaveLength(1);
    expect(fire).not.toContain("ANIM_TAG_ICE_CRYSTALS");
    expect(fire).not.toContain("ANIM_TAG_LIGHTNING");

    expect(ice).toContain("loadspritegfx ANIM_TAG_ICE_CRYSTALS");
    expect(ice).toContain("loadspritegfx ANIM_TAG_IMPACT");
    expect(ice).toContain("loadspritegfx ANIM_TAG_HANDS_AND_FEET");
    expect(ice.match(/gIceCrystalSpiralInwardSmall/g)).toHaveLength(4);
    expect(ice.match(/gIceCrystalSpiralInwardLarge/g)).toHaveLength(4);
    expect(ice).toContain("call IceCrystalEffectShort");
    expect(ice).toContain("create_fist_sprite ANIM_ATTACKER, 4");
    expect(ice).toContain("createvisualtask AnimTask_ShakeMon, 5, ANIM_TARGET, 0, 5, 3, 1");
    expect(ice.match(/create_basic_hitsplat_sprite/g)).toHaveLength(1);
    expect(ice).not.toContain("ANIM_TAG_SMALL_EMBER");
    expect(ice).not.toContain("ANIM_TAG_LIGHTNING");

    expect(thunder).toContain("loadspritegfx ANIM_TAG_IMPACT");
    expect(thunder).toContain("loadspritegfx ANIM_TAG_HANDS_AND_FEET");
    expect(thunder).toContain("loadspritegfx ANIM_TAG_LIGHTNING");
    expect(thunder.match(/createsprite gLightningSpriteTemplate/g)).toHaveLength(3);
    expect(thunder.match(/invert_screen_color scenery=TRUE, attacker=TRUE, target=TRUE/g))
      .toHaveLength(2);
    expect(thunder.match(/create_basic_hitsplat_sprite/g)).toHaveLength(2);
    expect(thunder).toContain("simple_palette_blend selector=F_PAL_BG, delay=2, initial_blend_y=0, target_blend_y=16, color=RGB_BLACK");
    expect(thunder).toContain("createvisualtask AnimTask_ShakeMon, 2, ANIM_TARGET, 0, 3, 15, 1");
    expect(thunder).not.toContain("ANIM_TAG_SMALL_EMBER");
    expect(thunder).not.toContain("ANIM_TAG_ICE_CRYSTALS");
  });

  it("requires each move-owned portable comparator and display-latch distinction", () => {
    const fireIcePortable = readFileSync("tools/compare/firePunchPortable.ts", "utf8");
    const thunderPortable = readFileSync("tools/compare/thunderPunchPortable.ts", "utf8");
    const latches = readFileSync("ANIMATION_LATCHES.md", "utf8");

    for (const rule of [
      "The latch is per-MECHANISM (per source task, per sprite class), never",
      "Never inherit a latch from a sibling move.",
      "When a ledger entry and a change map disagree, the change map wins.",
      "Bank change maps per orientation during staging",
      "Default expectation where nothing is measured: visible events display ONE",
    ]) {
      expect(latches).toContain(rule);
    }
    expect(latches).toContain(
      "Sprite-driven `x2` / plain OAM edits / script-`createsprite` sprites | RAM+1",
    );
    expect(latches).toContain("`AnimTask_ShakeMon` | RAM+1");
    expect(latches).toContain(
      "Freshly allocated OAM **affine matrix** | needs TWO displays to reach hardware; removal is a plain OAM edit at ONE",
    );

    expect(fireIcePortable).toContain("tools/run-mgba-probe.py");
    expect(fireIcePortable).toContain('fixture.move === "ICE_PUNCH"');
    expect(fireIcePortable).toContain("fixture.denseWindow.startFrame");
    expect(fireIcePortable).toContain("readFileSync(join(rgbDir");
    expect(fireIcePortable).toContain("const rgba = render(state)");
    expect(fireIcePortable).toContain("matching === total");

    expect(thunderPortable).toContain("tools/run-mgba-probe.py");
    expect(thunderPortable).toContain("sceneOnThunderPunchView");
    expect(thunderPortable).toContain('readFileSync(output, "utf8")');
    expect(thunderPortable).toContain("const rgba = render(engine)");
    expect(thunderPortable).toContain("componentMatching === total && framebufferMatching === total");
  });

  it("fulfills only this track while retaining three exact move statuses", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8")) as {
      readonly entries: readonly { readonly move: string; readonly status: string }[];
      readonly componentTracks: readonly {
        readonly id: string;
        readonly components: readonly string[];
        readonly representatives: readonly string[];
        readonly fulfilled?: boolean;
        readonly goal?: string;
      }[];
    };
    const moves = new Set(["MOVE_FIRE_PUNCH", "MOVE_ICE_PUNCH", "MOVE_THUNDER_PUNCH"]);

    expect(coverage.entries.filter((entry) => entry.status === "exact")).toHaveLength(251);
    expect(coverage.entries.filter((entry) => entry.status === "partial" || entry.status === "staged"))
      .toHaveLength(0);
    expect(coverage.entries.filter((entry) => moves.has(entry.move)).map((entry) => [
      entry.move,
      entry.status,
    ]).sort(([left], [right]) => left.localeCompare(right))).toEqual([
      ["MOVE_FIRE_PUNCH", "exact"],
      ["MOVE_ICE_PUNCH", "exact"],
      ["MOVE_THUNDER_PUNCH", "exact"],
    ]);

    expect(coverage.componentTracks.filter((track) => track.id === "elemental-punch"))
      .toEqual([{
        id: "elemental-punch",
        components: [
          "asset:ANIM_TAG_HANDS_AND_FEET",
          "asset:ANIM_TAG_IMPACT",
          "visualCommand:create_fist_sprite",
          "visualCommand:create_basic_hitsplat_sprite",
          "task:AnimTask_ShakeMon",
        ],
        representatives: ["MOVE_FIRE_PUNCH", "MOVE_ICE_PUNCH", "MOVE_THUNDER_PUNCH"],
        fulfilled: true,
        goal: fulfilledGoal,
      }]);
  });
});
