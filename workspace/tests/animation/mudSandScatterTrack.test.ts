import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { animationCoverageSummary } from "../../tools/animation/coverage.ts";

type Fixture = {
  readonly schema: string;
  readonly oracleProfile: string;
  readonly move: string;
  readonly orientation?: string;
  readonly pair: string;
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
  };
  readonly appStage: Readonly<Record<string, number>>;
  readonly controllerProfile?: {
    readonly accuracyStageBefore: number;
    readonly accuracyStageAfter: number;
    readonly resultTextFirstAge: number;
    readonly currentMoveResetAge: number;
  } | null;
  readonly acceptance: {
    readonly status: string;
    readonly result: string;
  };
};

type ComponentGraph = {
  readonly moves: readonly {
    readonly move: string;
    readonly componentIds: readonly string[];
  }[];
};

const fixturePaths = [
  "tools/compare/fixtures/sand-attack-pidgeotto-onix.json",
  "tools/compare/fixtures/sand-attack-player-pidgeotto-onix.json",
  "tools/compare/fixtures/mud-slap-pidgeotto-onix.json",
  "tools/compare/fixtures/mud-slap-player-pidgeotto-onix.json",
] as const;

const fulfilledGoal =
  "FULFILLED: MOVE_SAND_ATTACK retains its own complete bilateral Battle Scene ON controller contract at 269/269 RGB frames each: signed attacker slide, six RNG-resolved five-dirt waves with live stable SortSprites ordering, accuracy-decrease banner, typed result/controller release, and MOVE_NONE cleanup. MOVE_MUD_SLAP independently retains its distinct 16x16 gMudSlapMudSpriteTemplate body at 51/51 source OAM plus 51/51 RGB in both source-required orientations; its generic hit/damage/accuracy/controller tail remains outside this script-body window. ANIM_TAG_MUD_SAND and gSlideMonToOffsetSpriteTemplate/gSlideMonToOriginalPosSpriteTemplate share only source asset/slide choreography: no projectile program, GPU/OAM/affine/painter latch, or acceptance transfers between moves.";

function fixture(path: string): Fixture {
  return JSON.parse(readFileSync(path, "utf8")) as Fixture;
}

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function receipt(path: string) {
  const entry = fixture(path);
  return {
    path,
    schema: entry.schema,
    oracleProfile: entry.oracleProfile,
    move: entry.move,
    orientation: entry.orientation ?? null,
    pair: entry.pair,
    scenario: entry.scenario,
    probe: entry.probe,
    denseWindow: {
      startFrame: entry.denseWindow.startFrame,
      endFrame: entry.denseWindow.endFrame,
      frameCount: entry.denseWindow.endFrame - entry.denseWindow.startFrame + 1,
    },
    appStage: entry.appStage,
    controllerProfile: entry.controllerProfile ?? null,
    acceptance: entry.acceptance,
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

describe("mud-sand-scatter component-track receipt ratchet", () => {
  it("pins all four independent bilateral fixtures, complete windows, and hashes", () => {
    expect(fixturePaths.map(receipt)).toEqual([
      {
        path: fixturePaths[0],
        schema: "scene-on-portable-evidence/v1",
        oracleProfile: "battle-scene-on",
        move: "SAND_ATTACK",
        orientation: null,
        pair: "PIDGEOTTO (opponent-front) -> ONIX (player-back)",
        scenario: "tools/battle-lab/mechanic-sand-attack-pidgeotto-onix.json",
        probe: "tools/probe/run-battle-lab-rgb.py",
        denseWindow: { startFrame: 46, endFrame: 314, frameCount: 269 },
        appStage: { oracleFrame: 46, presentationAge: 7 },
        controllerProfile: {
          accuracyStageBefore: 6,
          accuracyStageAfter: 5,
          resultTextFirstAge: 183,
          currentMoveResetAge: 275,
        },
        acceptance: { status: "exact", result: "269/269 dense frames exact with zero differing pixels." },
        fixtureSha256: "5cbe513437c21641d14a226a4e80259c7d3f70f1cf3bab70be5c0bb4902260b6",
      },
      {
        path: fixturePaths[1],
        schema: "scene-on-portable-evidence/v1",
        oracleProfile: "battle-scene-on",
        move: "SAND_ATTACK",
        orientation: "player-to-opponent",
        pair: "PIDGEOTTO (player-back) -> ONIX (opponent-front)",
        scenario: "tools/battle-lab/mechanic-sand-attack-player-pidgeotto-onix.json",
        probe: "tools/probe/run-battle-lab-rgb.py",
        denseWindow: { startFrame: 46, endFrame: 314, frameCount: 269 },
        appStage: { oracleFrame: 46, presentationAge: 7 },
        controllerProfile: {
          accuracyStageBefore: 6,
          accuracyStageAfter: 5,
          resultTextFirstAge: 179,
          currentMoveResetAge: 275,
        },
        acceptance: { status: "exact", result: "269/269 dense frames exact with zero differing pixels." },
        fixtureSha256: "458f666332d19844b896f7e843c7690cff016bd24178c9ea0c401a50ef722270",
      },
      {
        path: fixturePaths[2],
        schema: "scene-on-portable-evidence/v1",
        oracleProfile: "battle-scene-on",
        move: "MUD_SLAP",
        orientation: null,
        pair: "PIDGEOTTO (opponent-front) -> ONIX (player-back)",
        scenario: "tools/battle-lab/mechanic-mud-slap-pidgeotto-onix.json",
        probe: "tools/probe/run-battle-lab-rgb.py",
        denseWindow: { startFrame: 84, endFrame: 134, frameCount: 51 },
        appStage: { oracleFrame: 84, presentationAge: 45 },
        controllerProfile: null,
        acceptance: {
          status: "exact",
          result: "51/51 source OAM frames and 51/51 dense RGB frames exact for the complete move-owned body before generic hit/controller ownership.",
        },
        fixtureSha256: "db020ba29566dcfb82fd4cbf50040aabc5dfb95b5540003047657e63327c624b",
      },
      {
        path: fixturePaths[3],
        schema: "scene-on-portable-evidence/v1",
        oracleProfile: "battle-scene-on",
        move: "MUD_SLAP",
        orientation: "player-to-opponent",
        pair: "PIDGEOTTO (player-back) -> ONIX (opponent-front)",
        scenario: "tools/battle-lab/mechanic-mud-slap-player-pidgeotto-onix.json",
        probe: "tools/probe/run-battle-lab-rgb.py",
        denseWindow: { startFrame: 80, endFrame: 130, frameCount: 51 },
        appStage: { oracleFrame: 80, presentationAge: 41 },
        controllerProfile: null,
        acceptance: {
          status: "exact",
          result: "51/51 source OAM frames and 51/51 dense RGB frames exact for the complete opposite-side move-owned body before generic hit/controller ownership.",
        },
        fixtureSha256: "f46da0861957411c33acfa848ad015c94d32df8a4cbebf4eaa0042fc67eb6a96",
      },
    ]);
  });

  it("keeps the dirt and mud source bodies distinct while sharing only the asset and signed slides", () => {
    const scripts = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
    const sandAttack = sourceBody(scripts, "Move_SAND_ATTACK:", "SandAttackDirt:");
    const sandAttackDirt = sourceBody(scripts, "SandAttackDirt:", "Move_MUD_SLAP:");
    const mudSlap = sourceBody(scripts, "Move_MUD_SLAP:", "MudSlapMud:");
    const mudSlapMud = sourceBody(scripts, "MudSlapMud:", "Move_DRAGON_RAGE:");
    const ground = readFileSync("reference/pokeemerald/src/battle_anim_ground.c", "utf8");
    const sandTemplate = sourceBody(
      ground,
      "const struct SpriteTemplate gSandAttackDirtSpriteTemplate",
      "static const union AnimCmd sAnim_MudSlapMud",
    );
    const mudAnim = sourceBody(
      ground,
      "static const union AnimCmd sAnim_MudSlapMud",
      "const struct SpriteTemplate gMudSlapMudSpriteTemplate",
    );
    const mudTemplate = sourceBody(
      ground,
      "const struct SpriteTemplate gMudSlapMudSpriteTemplate",
      "const struct SpriteTemplate gMudsportMudSpriteTemplate",
    );
    const dirtScatter = sourceBody(
      ground,
      "// Moves a small dirt projectile towards the target mon.",
      "// Moves a particle of dirt in the Mud Sport animation.",
    );
    const movement = readFileSync("reference/pokeemerald/src/battle_anim_mon_movement.c", "utf8");
    const slideTemplates = sourceBody(
      movement,
      "const struct SpriteTemplate gSlideMonToOriginalPosSpriteTemplate",
      "// Task to facilitate simple shaking of a pokemon's picture in battle.",
    );
    const slideOriginal = sourceBody(
      movement,
      "// Linearly slides a mon's bg picture back to its original sprite position.",
      "// Linearly translates a mon to a target offset.",
    );
    const slideOffset = sourceBody(
      movement,
      "// Linearly translates a mon to a target offset.",
      "static void SlideMonToOffsetAndBack",
    );
    const graph = JSON.parse(readFileSync(
      "src/data/gen/battle-animation-components.json",
      "utf8",
    )) as ComponentGraph;
    const sandComponents = graph.moves.find(({ move }) => move === "MOVE_SAND_ATTACK")?.componentIds;
    const mudComponents = graph.moves.find(({ move }) => move === "MOVE_MUD_SLAP")?.componentIds;

    expect(sandComponents).toBeDefined();
    expect(mudComponents).toBeDefined();
    expect(sandComponents!.filter((component) => mudComponents!.includes(component))).toEqual([
      "asset:ANIM_TAG_MUD_SAND",
      "sprite:gSlideMonToOffsetSpriteTemplate",
      "sprite:gSlideMonToOriginalPosSpriteTemplate",
    ]);
    expect(new Set([sandAttack + sandAttackDirt, mudSlap + mudSlapMud]).size).toBe(2);

    expect(sandAttack).toContain("loadspritegfx ANIM_TAG_MUD_SAND");
    expect(sandAttack).toContain("monbg ANIM_ATK_PARTNER");
    expect(sandAttack).toContain("splitbgprio ANIM_ATTACKER");
    expect(sandAttack).toContain("setalpha 12, 8");
    expect(sandAttack).toContain("clearmonbg ANIM_ATK_PARTNER");
    expect(sandAttack).toContain("blendoff");
    expect(sandAttack.match(/call SandAttackDirt/g)).toHaveLength(6);
    expect(sandAttackDirt.match(/createsprite gSandAttackDirtSpriteTemplate/g)).toHaveLength(5);
    expect(sandAttackDirt).toContain("delay 2");
    expect(sandAttackDirt).toContain("return");
    expect(sandAttackDirt).not.toContain("gMudSlapMudSpriteTemplate");

    expect(mudSlap).toContain("loadspritegfx ANIM_TAG_MUD_SAND");
    expect(mudSlap.match(/call MudSlapMud/g)).toHaveLength(6);
    expect(mudSlapMud.match(/createsprite gMudSlapMudSpriteTemplate/g)).toHaveLength(5);
    expect(mudSlapMud).toContain("delay 2");
    expect(mudSlapMud).toContain("return");
    expect(mudSlap).not.toContain("monbg");
    expect(mudSlap).not.toContain("clearmonbg");
    expect(mudSlap).not.toContain("blendoff");
    expect(mudSlapMud).not.toContain("gSandAttackDirtSpriteTemplate");

    expect(sandTemplate).toContain(".oam = &gOamData_AffineOff_ObjNormal_8x8");
    expect(sandTemplate).toContain(".anims = gDummySpriteAnimTable");
    expect(sandTemplate).toContain(".callback = AnimDirtScatter");
    expect(mudAnim).toContain("ANIMCMD_FRAME(1, 1)");
    expect(mudTemplate).toContain(".oam = &gOamData_AffineOff_ObjNormal_16x16");
    expect(mudTemplate).toContain(".anims = sAnims_MudSlapMud");
    expect(mudTemplate).toContain(".callback = AnimDirtScatter");
    for (const required of [
      "InitSpritePosToAnimAttacker(sprite, TRUE)",
      "xOffset = Random2() & 0x1F",
      "yOffset = Random2() & 0x1F",
      "sprite->callback = StartAnimLinearTranslation",
      "StoreSpriteCallbackInData6(sprite, DestroySpriteAndMatrix)",
    ]) expect(dirtScatter).toContain(required);

    for (const required of [
      "gSlideMonToOffsetSpriteTemplate",
      "gSlideMonToOriginalPosSpriteTemplate",
      ".oam = &gDummyOamData",
      ".callback = SlideMonToOffset",
      ".callback = SlideMonToOriginalPos",
    ]) expect(slideTemplates).toContain(required);
    expect(slideOffset).toContain("gBattleAnimArgs[1] = -gBattleAnimArgs[1]");
    expect(slideOffset).toContain("TranslateSpriteLinearByIdFixedPoint");
    expect(slideOriginal).toContain("SlideMonToOriginalPos_Step");
    expect(slideOriginal).toContain("monSprite->x2 = (s8)(sprite->data[3] >> 8) + sprite->data[5]");
  });

  it("requires the portable comparator's move-owned RGB and Mud Slap source-OAM contracts without adding a latch claim", () => {
    const portable = readFileSync("tools/compare/sandAttackPortable.ts", "utf8");
    const latches = readFileSync("ANIMATION_LATCHES.md", "utf8");

    for (const rule of [
      "The latch is per-MECHANISM (per source task, per sprite class), never",
      "Never inherit a latch from a sibling move.",
      "When a ledger entry and a change map disagree, the change map wins.",
      "Bank change maps per orientation during staging",
      "Default expectation where nothing is measured: visible events display ONE",
    ]) expect(latches).toContain(rule);

    for (const required of [
      "tools/run-mgba-probe.py",
      "fixture.denseWindow.startFrame",
      "createSceneOnMovePresentation",
      "const rgba = render(state)",
      "mudSlapSourceMudAtAge",
      "componentMatching === total",
      "matching === total",
    ]) expect(portable).toContain(required);
    expect(portable).not.toContain("hardwareOam");
    expect(portable).not.toContain("hardwareMatrices");
    expect(portable).not.toContain("hardwarePalette");
  });

  it("fulfills only mud-sand-scatter while preserving both independently exact move statuses", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8")) as {
      readonly entries: readonly { readonly move: string; readonly status: string; readonly covered: readonly string[] }[];
      readonly componentTracks: readonly {
        readonly id: string;
        readonly components: readonly string[];
        readonly representatives: readonly string[];
        readonly fulfilled?: boolean;
        readonly goal?: string;
      }[];
    };
    const moves = new Set(["MOVE_SAND_ATTACK", "MOVE_MUD_SLAP"]);
    const accepted = coverage.entries.filter((entry) => moves.has(entry.move));

    expect(coverage.entries.filter((entry) => entry.status === "exact")).toHaveLength(236);
    expect(coverage.entries.filter((entry) => entry.status === "partial" || entry.status === "staged"))
      .toHaveLength(0);
    expect(animationCoverageSummary()[0]).toEqual({
      tier: "level50",
      total: 276,
      exact: 236,
      partial: 0,
      staged: 0,
      unsupported: 40,
    });
    expect(accepted.map(({ move, status }) => [move, status]).sort(([left], [right]) =>
      left.localeCompare(right))).toEqual([
      ["MOVE_MUD_SLAP", "exact"],
      ["MOVE_SAND_ATTACK", "exact"],
    ]);
    expect(accepted.find(({ move }) => move === "MOVE_SAND_ATTACK")?.covered.join(" "))
      .toContain("typed result, controller command release, and MOVE_NONE cleanup");
    expect(accepted.find(({ move }) => move === "MOVE_MUD_SLAP")?.covered.join(" "))
      .toContain("generic hit, HP damage, accuracy result, and controller tails remain separately owned");
    expect(coverage.componentTracks.filter((track) => track.id === "mud-sand-scatter")).toEqual([{
      id: "mud-sand-scatter",
      components: [
        "asset:ANIM_TAG_MUD_SAND",
        "sprite:gSlideMonToOffsetSpriteTemplate",
        "sprite:gSlideMonToOriginalPosSpriteTemplate",
      ],
      representatives: ["MOVE_SAND_ATTACK", "MOVE_MUD_SLAP"],
      fulfilled: true,
      goal: fulfilledGoal,
    }]);
  });
});
