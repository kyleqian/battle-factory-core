import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type FixtureBattler = {
  readonly species: string;
  readonly side?: "player" | "opponent";
  readonly geometry?: { readonly side: "player" | "opponent" };
};

type Fixture = {
  readonly schema: string;
  readonly oracleProfile: string;
  readonly move: string;
  readonly probe: string;
  readonly attacker: FixtureBattler;
  readonly target: FixtureBattler;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number };
  readonly appStage: {
    readonly presentationAge?: number;
    readonly firstFramePresentationAge?: number;
  };
};

function fixture(path: string): Fixture {
  return JSON.parse(readFileSync(path, "utf8")) as Fixture;
}

function side(battler: FixtureBattler): "player" | "opponent" {
  return battler.geometry?.side ?? battler.side!;
}

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function sourceBody(source: string, start: string, end: string): string {
  const startAt = source.indexOf(start);
  expect(startAt).toBeGreaterThanOrEqual(0);
  const endAt = source.indexOf(end, startAt);
  expect(endAt).toBeGreaterThan(startAt);
  return source.slice(startAt, endAt);
}

const fulfilledGoal = "FULFILLED: MOVE_FIRE_PUNCH, MOVE_ICE_PUNCH, and MOVE_THUNDER_PUNCH each retain independently exact bilateral complete Scene-ON contracts. Fire's ONIX/GROVYLE shared-adapter windows close at 225/225 and 277/277 through its ember/burn/residual status and controller path; Ice's close at 462/462 and 1294/1294 through its own crystals, freeze, frozen-cube, Sitrus, and controller path; Thunder's legal ONIX/MURKROW windows close at 104/104 component and framebuffer frames per orientation through its lightning, delay-2 black ramps, double inversion, fist/two-hitsplat/ShakeMon, monbg, and teardown source body. All runs preserve source/fixture/window/hardware/framebuffer evidence; shared HANDS_AND_FEET, IMPACT, fist/hitsplat, or ShakeMon never grants a sibling acceptance or latch.";

describe("elemental-punch component-track receipt ratchet", () => {
  it("pins all six independent bilateral fixtures, dense windows, and immutable receipts", () => {
    const paths = [
      "tools/compare/fixtures/fire-punch-onix-grovyle.json",
      "tools/compare/fixtures/fire-punch-grovyle-onix.json",
      "tools/compare/fixtures/ice-punch-onix-grovyle.json",
      "tools/compare/fixtures/ice-punch-grovyle-onix.json",
      "tools/compare/fixtures/thunder-punch-player-onix-opponent-murkrow.json",
      "tools/compare/fixtures/thunder-punch-opponent-onix-player-murkrow.json",
    ];

    expect(paths.map((path) => {
      const entry = fixture(path);
      return [
        entry.schema,
        entry.oracleProfile,
        entry.move,
        entry.probe,
        entry.attacker.species,
        side(entry.attacker),
        entry.target.species,
        side(entry.target),
        entry.denseWindow.startFrame,
        entry.denseWindow.endFrame,
        entry.denseWindow.endFrame - entry.denseWindow.startFrame + 1,
        entry.appStage.presentationAge ?? entry.appStage.firstFramePresentationAge,
        sha256(path),
      ];
    })).toEqual([
      ["scene-on-portable-compare/v1", "battle-scene-on", "FIRE_PUNCH", "tools/probe/stage-fire-punch-portable-on.py", "ONIX", "player", "GROVYLE", "opponent", 2313, 2537, 225, 0,
        "b0df76e942e514f16eefb4ee0f7bd9dfe568717a5672cf303d996e3dc53a4846"],
      ["scene-on-portable-compare/v1", "battle-scene-on", "FIRE_PUNCH", "tools/probe/stage-fire-punch-portable-on.py", "GROVYLE", "opponent", "ONIX", "player", 2081, 2357, 277, 0,
        "f3207a93847c1c17efb4904fa940806ba25a6a50bcd28dfc7f915ef54005cece"],
      ["scene-on-portable-compare/v1", "battle-scene-on", "ICE_PUNCH", "tools/probe/stage-fire-punch-portable-on.py", "ONIX", "player", "GROVYLE", "opponent", 2339, 2800, 462, 0,
        "dcb6afa146b5a8f8f907ca28ae9d327c32a01c669aa9fa93e58a7ab6b2c636b9"],
      ["scene-on-portable-compare/v1", "battle-scene-on", "ICE_PUNCH", "tools/probe/stage-fire-punch-portable-on.py", "GROVYLE", "opponent", "ONIX", "player", 1966, 3259, 1294, 0,
        "4e6d13d0b52f7a8a8aa2399dd6c80d18bc27705934f5aa105f9f7fcee2c9c11f"],
      ["scene-on-portable-component/v1", "battle-scene-on", "THUNDER_PUNCH", "tools/probe/run-battle-lab-rgb.py", "ONIX", "player", "MURKROW", "opponent", 401, 504, 104, 0,
        "18b7e3a9ce1eccac7cbb750ec126075ec0678410db80caf8f416cd11002874b7"],
      ["scene-on-portable-component/v1", "battle-scene-on", "THUNDER_PUNCH", "tools/probe/run-battle-lab-rgb.py", "ONIX", "opponent", "MURKROW", "player", 452, 555, 104, 0,
        "138a9d9ba1b99ce640d8ec711b1f289898adc36e1b3e8f5557b4a3cecba218aa"],
    ]);
  });

  it("keeps Fire, Ice, and Thunder source bodies distinct despite shared contact components", () => {
    const source = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
    const fire = sourceBody(source, "Move_FIRE_PUNCH:", "Move_LEER:");
    const ice = sourceBody(source, "Move_ICE_PUNCH:", "Move_REST:");
    const thunder = sourceBody(source, "Move_THUNDER_PUNCH:", "Move_SACRED_FIRE:");

    expect(fire).toContain("loadspritegfx ANIM_TAG_SMALL_EMBER");
    expect(fire.match(/gFireSpiralInwardSpriteTemplate/g)).toHaveLength(4);
    expect(fire).toContain("call FireSpreadEffect");
    expect(fire).toContain("AnimTask_BlendBattleAnimPal, 10, F_PAL_TARGET, 2, 0, 9, RGB_RED");
    expect(fire).toContain("createvisualtask AnimTask_ShakeMon, 2, ANIM_TARGET, 0, 3, 15, 1");
    expect(fire).not.toContain("ANIM_TAG_ICE_CRYSTALS");
    expect(fire).not.toContain("ANIM_TAG_LIGHTNING");

    expect(ice).toContain("loadspritegfx ANIM_TAG_ICE_CRYSTALS");
    expect(ice.match(/gIceCrystalSpiralInwardSmall/g)).toHaveLength(4);
    expect(ice.match(/gIceCrystalSpiralInwardLarge/g)).toHaveLength(4);
    expect(ice).toContain("call IceCrystalEffectShort");
    expect(ice).toContain("simple_palette_blend selector=F_PAL_BG, delay=1, initial_blend_y=0, target_blend_y=7, color=RGB_BLACK");
    expect(ice).toContain("createvisualtask AnimTask_ShakeMon, 5, ANIM_TARGET, 0, 5, 3, 1");
    expect(ice).not.toContain("ANIM_TAG_SMALL_EMBER");
    expect(ice).not.toContain("ANIM_TAG_LIGHTNING");

    expect(thunder).toContain("loadspritegfx ANIM_TAG_LIGHTNING");
    expect(thunder.match(/createsprite gLightningSpriteTemplate/g)).toHaveLength(3);
    expect(thunder.match(/invert_screen_color scenery=TRUE, attacker=TRUE, target=TRUE/g)).toHaveLength(2);
    expect(thunder.match(/create_basic_hitsplat_sprite/g)).toHaveLength(2);
    expect(thunder).toContain("simple_palette_blend selector=F_PAL_BG, delay=2, initial_blend_y=0, target_blend_y=16, color=RGB_BLACK");
    expect(thunder).toContain("createvisualtask AnimTask_ShakeMon, 2, ANIM_TARGET, 0, 3, 15, 1");
    expect(thunder).not.toContain("ANIM_TAG_SMALL_EMBER");
    expect(thunder).not.toContain("ANIM_TAG_ICE_CRYSTALS");
  });

  it("requires each portable verifier and move-owned latch obligations", () => {
    const fireAndIcePortable = readFileSync("tools/compare/firePunchPortable.ts", "utf8");
    expect(fireAndIcePortable).toContain('fixture.move === "ICE_PUNCH"');
    expect(fireAndIcePortable).toContain("tools/run-mgba-probe.py");
    expect(fireAndIcePortable).toContain("fixture.denseWindow.startFrame");
    expect(fireAndIcePortable).toContain("render(state)");
    expect(fireAndIcePortable).toContain("matching === total");

    const thunderPortable = readFileSync("tools/compare/thunderPunchPortable.ts", "utf8");
    expect(thunderPortable).toContain("tools/run-mgba-probe.py");
    expect(thunderPortable).toContain("sceneOnThunderPunchView");
    expect(thunderPortable).toContain("render(engine)");
    expect(thunderPortable).toContain("componentMatching === total && framebufferMatching === total");

    const latches = readFileSync("ANIMATION_LATCHES.md", "utf8");
    expect(latches).toContain("The latch is per-MECHANISM (per source task, per sprite class), never");
    expect(latches).toContain("Never inherit a latch from a sibling move.");
    expect(latches).toContain("When a ledger entry and a change map disagree, the change map wins.");
    expect(latches).toContain("Bank change maps per orientation during staging");
    expect(latches).toContain("visible events display ONE\n   frame after the RAM write.");
    expect(latches).toContain("Sprite-driven `x2` / plain OAM edits / script-`createsprite` sprites | RAM+1 | five-move rule (TAKE_DOWN wind-down, 2026-08-07); COUNTER fists/hitsplats/slides");
    expect(latches).toContain("`AnimTask_ShakeMon` | RAM+1 | COUNTER (2026-08-08) — NOT +2");
    expect(latches).toContain("Freshly allocated OAM **affine matrix** | needs TWO displays to reach hardware; removal is a plain OAM edit at ONE");
  });

  it("fulfills only the three independently exact elemental-punch representatives", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8")) as {
      readonly entries: readonly { readonly move: string; readonly status: string }[];
      readonly componentTracks: readonly unknown[];
    };
    const moves = new Set(["MOVE_FIRE_PUNCH", "MOVE_ICE_PUNCH", "MOVE_THUNDER_PUNCH"]);
    expect(coverage.entries.filter((entry) => entry.status === "exact")).toHaveLength(231);
    expect(coverage.entries.filter((entry) => moves.has(entry.move)).map((entry) => [
      entry.move, entry.status,
    ]).sort(([left], [right]) => left.localeCompare(right))).toEqual([
      ["MOVE_FIRE_PUNCH", "exact"],
      ["MOVE_ICE_PUNCH", "exact"],
      ["MOVE_THUNDER_PUNCH", "exact"],
    ]);
    expect(coverage.componentTracks.filter((track: unknown) =>
      (track as { readonly id?: string }).id === "elemental-punch",
    )).toEqual([
      {
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
      },
    ]);
  });
});
