import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { animationCoverageSummary } from "../../tools/animation/coverage.ts";

type DenseWindow = {
  readonly startFrame: number;
  readonly endFrame: number;
};

type Fixture = {
  readonly schema: string;
  readonly oracleProfile: string;
  readonly move: string;
  readonly orientation?: string;
  readonly pair: string;
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow: DenseWindow;
  readonly appStage: Readonly<Record<string, number>>;
  readonly acceptance?: Readonly<Record<string, string>>;
};

const fixturePaths = [
  "tools/compare/fixtures/quick-attack-pidgeotto-onix.json",
  "tools/compare/fixtures/quick-attack-player-pidgeotto-onix.json",
  "tools/compare/fixtures/extreme-speed-arcanine-dugtrio.json",
  "tools/compare/fixtures/extreme-speed-player-arcanine-dugtrio.json",
  "tools/compare/fixtures/aerial-ace-pidgeotto-onix.json",
  "tools/compare/fixtures/aerial-ace-player-pidgeotto-onix.json",
] as const;

const fulfilledGoal =
  "FULFILLED: MOVE_QUICK_ATTACK, MOVE_EXTREME_SPEED, and MOVE_AERIAL_ACE each retain independently exact bilateral complete Battle Scene ON contracts. Quick Attack’s opponent-front→player-back and player-back→opponent-front controller windows close at 219/219 and 214/214 through elliptical travel, four blended TraceMon afterimages, its IMPACT, target ShakeMon, teardown, generic hit, and MOVE_NONE cleanup. Extreme Speed’s BG_HIGHSPEED fade/darken/restore, affine/contact, three hitsplats, 24 SPEED_DUST spawns, blink/reappearance, cleanup windows close at 303/303 in both source-selected orientations. Aerial Ace’s CUT slice, ellipse/TraceMon/palette/shake body and controller windows close independently at 236/236 and 232/232. Shared IMPACT, SPEED_DUST, ShakeMon, fadetobg, and restorebg never transfer a source body, GPU/OAM/affine/painter claim, latch, or acceptance across moves.";

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
    acceptance: entry.acceptance ?? null,
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

describe("fast-contact component-track receipt ratchet", () => {
  it("pins all six independent bilateral fixture identities, windows, and hashes", () => {
    expect(fixturePaths.map(receipt)).toEqual([
      {
        path: fixturePaths[0],
        schema: "scene-on-portable-compare/v1",
        oracleProfile: "battle-scene-on",
        move: "QUICK_ATTACK",
        orientation: null,
        pair: "PIDGEOTTO (opponent-front) -> ONIX (player-back)",
        scenario: "tools/battle-lab/mechanic-quick-attack-pidgeotto-onix.json",
        probe: "tools/probe/run-battle-lab-rgb.py",
        denseWindow: { startFrame: 46, endFrame: 264, frameCount: 219 },
        appStage: { oracleFrame: 46, presentationAge: 7 },
        acceptance: null,
        fixtureSha256: "fe76b0cf80a7ac7bced1351a96d5eb1f6c64128078d03738dba0c07bfef8bf35",
      },
      {
        path: fixturePaths[1],
        schema: "scene-on-portable-compare/v1",
        oracleProfile: "battle-scene-on",
        move: "QUICK_ATTACK",
        orientation: "player-to-opponent",
        pair: "PIDGEOTTO (player-back) -> ONIX (opponent-front)",
        scenario: "tools/battle-lab/mechanic-quick-attack-player-pidgeotto-onix.json",
        probe: "tools/probe/run-battle-lab-rgb.py",
        denseWindow: { startFrame: 46, endFrame: 259, frameCount: 214 },
        appStage: { oracleFrame: 46, presentationAge: 7 },
        acceptance: null,
        fixtureSha256: "427402258ba22b39c7999cd1c90328be4a757e62229aa9c9a9875caac140644d",
      },
      {
        path: fixturePaths[2],
        schema: "scene-on-portable-evidence/v1",
        oracleProfile: "battle-scene-on",
        move: "EXTREME_SPEED",
        orientation: "opponent-to-player",
        pair: "ARCANINE (opponent-front) -> DUGTRIO (player-back)",
        scenario: "tools/battle-lab/mechanic-extreme-speed-arcanine-dugtrio.json",
        probe: "tools/probe/run-battle-lab-rgb.py",
        denseWindow: { startFrame: 91, endFrame: 393, frameCount: 303 },
        appStage: { oracleFrame: 91, presentationAge: 52 },
        acceptance: {
          status: "exact",
          scope: "complete move-owned source window through animation age 354: fade/background, attacker affine disappearance, contact, dust, reappearance, restore, and cleanup",
        },
        fixtureSha256: "af15420ee00f04b3577d4e28b62c17e2ccf2835ab9da733008adff467bae9ee0",
      },
      {
        path: fixturePaths[3],
        schema: "scene-on-portable-evidence/v1",
        oracleProfile: "battle-scene-on",
        move: "EXTREME_SPEED",
        orientation: "player-to-opponent",
        pair: "ARCANINE (player-back) -> DUGTRIO (opponent-front)",
        scenario: "tools/battle-lab/mechanic-extreme-speed-player-arcanine-dugtrio.json",
        probe: "tools/probe/run-battle-lab-rgb.py",
        denseWindow: { startFrame: 87, endFrame: 389, frameCount: 303 },
        appStage: { oracleFrame: 87, presentationAge: 48 },
        acceptance: {
          status: "exact",
          scope: "complete opposite-side move-owned source window through animation age 354: fade/background, attacker affine disappearance, contact, dust, reappearance, restore, and cleanup",
        },
        fixtureSha256: "2703bc0a2b86fadaeda489fff31129b7b195f2896c02c0789163b4da97a6b055",
      },
      {
        path: fixturePaths[4],
        schema: "scene-on-portable-evidence/v1",
        oracleProfile: "battle-scene-on",
        move: "AERIAL_ACE",
        orientation: null,
        pair: "PIDGEOTTO (opponent-front) -> ONIX (player-back)",
        scenario: "tools/battle-lab/mechanic-aerial-ace-pidgeotto-onix.json",
        probe: "tools/probe/run-battle-lab-rgb.py",
        denseWindow: { startFrame: 46, endFrame: 281, frameCount: 236 },
        appStage: { oracleFrame: 46, presentationAge: 7 },
        acceptance: { status: "exact", result: "236/236 dense frames exact with zero differing pixels." },
        fixtureSha256: "8928b1205cffaea7a13a9f5a0381e13f8b36061fc310c9e53a2332e8a91c2544",
      },
      {
        path: fixturePaths[5],
        schema: "scene-on-portable-evidence/v1",
        oracleProfile: "battle-scene-on",
        move: "AERIAL_ACE",
        orientation: "player-to-opponent",
        pair: "PIDGEOTTO (player-back) -> ONIX (opponent-front)",
        scenario: "tools/battle-lab/mechanic-aerial-ace-player-pidgeotto-onix.json",
        probe: "tools/probe/run-battle-lab-rgb.py",
        denseWindow: { startFrame: 46, endFrame: 277, frameCount: 232 },
        appStage: { oracleFrame: 46, presentationAge: 7 },
        acceptance: { status: "exact", result: "232/232 dense frames exact with zero differing pixels." },
        fixtureSha256: "7a1a9f2c1888f8609c5fa434c878ce2d13731d615fddc0a950936e155fecbccf",
      },
    ]);
  });

  it("keeps each authoritative source body distinct despite the shared fast-contact components", () => {
    const scripts = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
    const quickAttack = sourceBody(scripts, "Move_QUICK_ATTACK:", "Move_RAGE:");
    const extremeSpeed = sourceBody(scripts, "Move_EXTREME_SPEED:", "Move_UPROAR:");
    const aerialAce = sourceBody(scripts, "Move_AERIAL_ACE:", "Move_IRON_DEFENSE:");
    const movement = readFileSync("reference/pokeemerald/src/battle_anim_mon_movement.c", "utf8");
    const shakeMon = sourceBody(
      movement,
      "void AnimTask_ShakeMon(u8 taskId)",
      "// Task to facilitate simple shaking of a pokemon's picture in battle.",
    );
    const effects = readFileSync("reference/pokeemerald/src/battle_anim_effects_2.c", "utf8");
    const speedDust = sourceBody(
      effects,
      "const struct SpriteTemplate gSpeedDustSpriteTemplate",
      "const s8 gSpeedDustPosTable",
    );
    const speedDustTable = sourceBody(
      effects,
      "const s8 gSpeedDustPosTable[][2] =",
      "const union AnimCmd gBellAnimCmds",
    );
    const speedDustTask = sourceBody(
      effects,
      "void AnimTask_SpeedDust(u8 taskId)",
      "void AnimTask_LoadMusicNotesPals",
    );

    expect(new Set([quickAttack, extremeSpeed, aerialAce]).size).toBe(3);

    expect(quickAttack).toContain("loadspritegfx ANIM_TAG_IMPACT");
    expect(quickAttack).toContain("monbg ANIM_ATK_PARTNER");
    expect(quickAttack).toContain("AnimTask_TranslateMonEllipticalRespectSide, 2, ANIM_ATTACKER, 24, 6, 1, 5");
    expect(quickAttack).toContain("AnimTask_TraceMonBlended, 2, 0, 4, 7, 3");
    expect(quickAttack).toContain("AnimTask_ShakeMon, 2, ANIM_TARGET, 5, 0, 6, 1");
    expect(quickAttack).toContain("create_basic_hitsplat_sprite ANIM_TARGET, 4");
    expect(quickAttack).toContain("waitforvisualfinish");
    expect(quickAttack).toContain("clearmonbg ANIM_ATK_PARTNER");
    expect(quickAttack).toContain("blendoff");
    expect(quickAttack).not.toContain("ANIM_TAG_SPEED_DUST");
    expect(quickAttack).not.toContain("fadetobg");
    expect(quickAttack).not.toContain("gCuttingSliceSpriteTemplate");

    expect(extremeSpeed).toContain("loadspritegfx ANIM_TAG_SPEED_DUST");
    expect(extremeSpeed).toContain("loadspritegfx ANIM_TAG_IMPACT");
    expect(extremeSpeed).toContain("fadetobg BG_HIGHSPEED_OPPONENT");
    expect(extremeSpeed).toContain("fadetobg BG_HIGHSPEED_PLAYER");
    expect(extremeSpeed).toContain("AnimTask_StartSlidingBg, 5, -2304, 0, 1, -1");
    expect(extremeSpeed).toContain("AnimTask_AttackerStretchAndDisappear");
    expect(extremeSpeed.match(/create_mon_edge_hitsplat_sprite/g)).toHaveLength(3);
    expect(extremeSpeed).toContain("AnimTask_SpeedDust");
    expect(extremeSpeed).toContain("AnimTask_ExtremeSpeedMonReappear");
    expect(extremeSpeed).toContain("restorebg");
    expect(extremeSpeed).not.toContain("AnimTask_TraceMonBlended");
    expect(extremeSpeed).not.toContain("gCuttingSliceSpriteTemplate");

    expect(aerialAce).toContain("loadspritegfx ANIM_TAG_CUT");
    expect(aerialAce).toContain("monbg ANIM_TARGET");
    expect(aerialAce).toContain("AnimTask_TranslateMonEllipticalRespectSide, 2, ANIM_ATTACKER, 24, 6, 1, 5");
    expect(aerialAce).toContain("AnimTask_TraceMonBlended, 2, 0, 4, 7, 3");
    expect(aerialAce).toContain("createsprite gCuttingSliceSpriteTemplate");
    expect(aerialAce).toContain("AnimTask_ShakeMon, 2, ANIM_TARGET, 0, 3, 10, 1");
    expect(aerialAce).toContain("complex_palette_blend");
    expect(aerialAce).toContain("waitforvisualfinish");
    expect(aerialAce).toContain("clearmonbg ANIM_TARGET");
    expect(aerialAce).toContain("blendoff");
    expect(aerialAce).not.toContain("ANIM_TAG_IMPACT");
    expect(aerialAce).not.toContain("ANIM_TAG_SPEED_DUST");
    expect(aerialAce).not.toContain("fadetobg");

    expect(shakeMon).toContain("gSprites[spriteId].x2 = gBattleAnimArgs[1]");
    expect(shakeMon).toContain("gTasks[taskId].func = AnimTask_ShakeMon_Step");
    expect(speedDust).toContain(".tileTag = ANIM_TAG_SPEED_DUST");
    expect(speedDust).toContain(".paletteTag = ANIM_TAG_SPEED_DUST");
    expect(speedDust).toContain(".callback = AnimSpeedDust");
    const speedDustPositions = speedDustTable.match(/\{(?:-?\d+), (?:-?\d+)\}/g) ?? [];
    const cycleLimit = Number(speedDustTask.match(/if \(\+\+task->data\[3\] > (\d+)\)/)?.[1]);
    expect(speedDustPositions).toHaveLength(4);
    expect(speedDustTask).toContain("CreateSprite(&gSpeedDustSpriteTemplate");
    expect(speedDustTask).toContain("if (++task->data[2] > 3)");
    expect(cycleLimit).toBe(5);
    expect(speedDustPositions.length * (cycleLimit + 1)).toBe(24);
  });

  it("requires each portable comparator's own complete RGB obligation without inheriting a latch", () => {
    const latches = readFileSync("ANIMATION_LATCHES.md", "utf8");
    for (const rule of [
      "The latch is per-MECHANISM (per source task, per sprite class), never",
      "Never inherit a latch from a sibling move.",
      "When a ledger entry and a change map disagree, the change map wins.",
      "Bank change maps per orientation during staging",
      "Default expectation where nothing is measured: visible events display ONE",
    ]) expect(latches).toContain(rule);

    const contracts: ReadonlyArray<readonly [string, readonly string[]]> = [
      ["tools/compare/quickAttackPortable.ts", ["tools/run-mgba-probe.py", "fixture.denseWindow.startFrame", "const rgba = render(state)", "oracle probe ${digest}", "matching === total"]],
      ["tools/compare/extremeSpeedPortable.ts", ["tools/run-mgba-probe.py", "fixture.denseWindow.startFrame", "createSceneOnMovePresentation", "const rgba = render(state)", "matching === total"]],
      ["tools/compare/aerialAcePortable.ts", ["tools/run-mgba-probe.py", "fixture.denseWindow.startFrame", "const rgba = render(state)", "oracle probe ${digest}", "matching === total"]],
    ];
    for (const [path, required] of contracts) {
      const portable = readFileSync(path, "utf8");
      for (const needle of required) expect(portable).toContain(needle);
    }
  });

  it("fulfills only fast-contact while retaining all three independently exact move statuses", () => {
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
    const moves = new Set(["MOVE_QUICK_ATTACK", "MOVE_EXTREME_SPEED", "MOVE_AERIAL_ACE"]);

    expect(coverage.entries.filter((entry) => entry.status === "exact")).toHaveLength(238);
    expect(coverage.entries.filter((entry) => entry.status === "partial")).toHaveLength(0);
    expect(coverage.entries.filter((entry) => entry.status === "staged")).toHaveLength(0);
    expect(animationCoverageSummary()[0]).toEqual({
      tier: "level50",
      total: 276,
      exact: 238,
      partial: 0,
      staged: 0,
      unsupported: 38,
    });
    expect(coverage.entries.filter((entry) => moves.has(entry.move)).map((entry) => [
      entry.move,
      entry.status,
    ]).sort(([left], [right]) => left.localeCompare(right))).toEqual([
      ["MOVE_AERIAL_ACE", "exact"],
      ["MOVE_EXTREME_SPEED", "exact"],
      ["MOVE_QUICK_ATTACK", "exact"],
    ]);
    expect(coverage.componentTracks.filter((track) => track.id === "fast-contact")).toEqual([{
      id: "fast-contact",
      components: [
        "asset:ANIM_TAG_IMPACT",
        "asset:ANIM_TAG_SPEED_DUST",
        "task:AnimTask_ShakeMon",
        "visualCommand:fadetobg",
        "visualCommand:restorebg",
      ],
      representatives: ["MOVE_QUICK_ATTACK", "MOVE_EXTREME_SPEED", "MOVE_AERIAL_ACE"],
      fulfilled: true,
      goal: fulfilledGoal,
    }]);
  });
});
