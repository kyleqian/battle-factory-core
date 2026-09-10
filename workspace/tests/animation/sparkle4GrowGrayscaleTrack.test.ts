import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Side = "player" | "opponent";

type BattleMon = {
  readonly species: number;
  readonly level: number;
  readonly nature: number;
  readonly ivs: Readonly<Record<string, number>>;
  readonly evs: Readonly<Record<string, number>>;
  readonly moves: readonly number[];
  readonly ppUps: readonly number[];
  readonly item: number;
  readonly abilitySlot: number;
  readonly friendship: number;
  readonly gender: "male" | "female" | "genderless";
  readonly shiny: boolean;
};

type Scenario = {
  readonly schemaVersion: number;
  readonly mode: string;
  readonly profile: string;
  readonly level: number;
  readonly challengeNum: number;
  readonly battleNum: number;
  readonly trainerId: number;
  readonly playerSetIds: readonly number[];
  readonly opponentSetIds: readonly number[];
  readonly seed: number;
  readonly overrides: { readonly parties: Record<Side, readonly BattleMon[]> };
  readonly trace: {
    readonly segments: readonly { readonly frames: number; readonly buttons: readonly string[] }[];
    readonly captureFrames: readonly number[];
  };
};

type Geometry = {
  readonly side: Side;
  readonly spriteCorner: { readonly x: number; readonly y: number };
  readonly animationCenter: { readonly x: number; readonly y: number };
  readonly battlePositionCenter: { readonly x: number; readonly y: number };
};

type DisableReceipt = {
  readonly schema: string;
  readonly oracleProfile: string;
  readonly move: string;
  readonly moveId: number;
  readonly orientation: string;
  readonly scenario: string;
  readonly probe: string;
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly sourceBounds: { readonly start: string; readonly endExclusive: string };
  readonly attacker: { readonly species: string; readonly geometry: Geometry };
  readonly target: { readonly species: string; readonly geometry: Geometry };
  readonly fieldProfile: Record<string, number | string>;
  readonly probeJsonSha256: string;
  readonly rawRgbSha256: string;
  readonly changeMap: string;
  readonly changeMapSha256: string;
};

type DetectReceipt = {
  readonly schema: string;
  readonly oracleProfile: string;
  readonly move: string;
  readonly orientation: string;
  readonly scenario: string;
  readonly probe: string;
  readonly appStage: { readonly presentationAge: number };
  readonly denseWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
    readonly skipProbeFrames?: number;
    readonly ageOffset?: number;
  };
  readonly attacker: { readonly species: string; readonly geometry: Geometry };
  readonly target: { readonly species: string; readonly geometry: Geometry };
  readonly fieldProfile: Record<string, number | string>;
  readonly evidenceSchema: string;
  readonly evidenceSha256: string;
  readonly secondFreshEvidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly acceptance: { readonly status: string; readonly componentMatching: number; readonly framebufferMatching: number };
};

const trackComponents = [
  "asset:ANIM_TAG_SPARKLE_4",
  "sprite:gSpinningSparkleSpriteTemplate",
  "task:AnimTask_GrowAndGrayscale",
  "visualCommand:monbg",
  "visualCommand:splitbgprio",
  "visualCommand:setalpha",
  "visualCommand:clearmonbg",
  "visualCommand:blendoff",
] as const;

const trackGoal = "FULFILLED: This exact eight-component boundary remains fulfilled only because MOVE_DISABLE and MOVE_DETECT independently retain distinct source-derived reducers, typed Scene-ON seams, production compositors, complete legal bilateral party-only Battle Scene ON fixtures, and twice-fresh unthinned source/component/seam/hardware/palette/register/audio/immutable-state/raw-RGB/actual-core framebuffer proof. MOVE_DISABLE independently owns its 113/113 player-back frames 697-809 and opponent-front frames 214-326 Move_DISABLE 0x082d3a67..Move_RECOVER 0x082d3a95 body: SPARKLE_4, target monbg/splitbgprio, alpha 8:8, SE_M_DETECT/SE_M_BIND, GrowAndGrayscale, ordinary predecessor sparkle/grow/palette scanout, its restored-palette scaled tail, and first-inactive cleanup. MOVE_DETECT independently owns its 110/110 player-back frames 64-173 and deliberate 109/109 opponent-front frames 69-177 (skipProbeFrames:1, ageOffset:1) Move_DETECT 0x082cb3d2..Move_FRUSTRATION 0x082cb430 body: its own BG and attacker palette ramps, its own SPARKLE_4/AnimSpinningSparkle lifecycle, audio, raw RGB, and cleanup; the excluded opponent frame is outgoing enemy-shadow OAM teardown one display behind the script-pointer boundary. Sprite/OAM and faded-palette RAM+1, first-frame loadspritegfx, and every fresh-affine timing fact are rechecked from each move's own retained evidence: Disable's restored-palette tail and Detect's displayed palette/sparkle map do not transfer a generic affine latch. Disable transfers no grow, grayscale, monbg, splitbgprio, alpha, bind-audio, timing, or latch fact to Detect; Detect transfers no palette, sparkle, timing, teardown, or latch fact to Disable. Shared components waive no move-owned acceptance or sibling credit.";

const disableReceipts = [
  {
    fixturePath: "tools/compare/fixtures/disable-player-drowzee-opponent-onix.json",
    fixtureSha256: "c72c8b3fd2c64db0a197ef01f21fb7d5bfc30786a7c488765a026ce78608ef4e",
    scenarioPath: "tools/battle-lab/mechanic-disable-player-drowzee-opponent-onix.json",
    scenarioSha256: "471e9a4ee7c55f326f7f519dd4bb45ee7d12053d77008c8804301a09e6019e1e",
    orientation: "player-back",
    attackerSide: "player" as const,
    window: { startFrame: 697, endFrame: 809, frameCount: 113 },
    geometry: {
      attacker: {
        side: "player" as const,
        spriteCorner: { x: 40, y: 61 }, animationCenter: { x: 72, y: 93 }, battlePositionCenter: { x: 72, y: 80 },
      },
      target: {
        side: "opponent" as const,
        spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 },
      },
    },
    fieldProfile: { playerHp: 110, playerMaxHp: 142, opponentHp: 117, opponentMaxHp: 117, playerGender: "male", opponentGender: "male" },
    probe: "8f7eff0e6957ed815f470d3aebb9ec5bd5edebe673527e702230f4d0f1f7ca38",
    raw: "352068a567a21be80acd8babd5786a34601d10e749eb9817fbd5f48800e1be63",
    mapPath: "tools/compare/evidence/disable-changemap-player.txt",
    map: "7cd84be397dfcda9f074d1aca2780d5bf044d2ad2fb9cf46e6d311f04db39636",
  },
  {
    fixturePath: "tools/compare/fixtures/disable-opponent-drowzee-player-onix.json",
    fixtureSha256: "2613d438b71f99897dcb3a7c0a995e20d78fbedd0497d677b2156e7a494ddf90",
    scenarioPath: "tools/battle-lab/mechanic-disable-opponent-drowzee-player-onix.json",
    scenarioSha256: "21278dbf35857e057ae9012508e006efe190cc9debde0827ce572f2a59844c52",
    orientation: "opponent-front",
    attackerSide: "opponent" as const,
    window: { startFrame: 214, endFrame: 326, frameCount: 113 },
    geometry: {
      attacker: {
        side: "opponent" as const,
        spriteCorner: { x: 144, y: 15 }, animationCenter: { x: 176, y: 47 }, battlePositionCenter: { x: 176, y: 40 },
      },
      target: {
        side: "player" as const,
        spriteCorner: { x: 40, y: 48 }, animationCenter: { x: 72, y: 80 }, battlePositionCenter: { x: 72, y: 80 },
      },
    },
    fieldProfile: { playerHp: 117, playerMaxHp: 117, opponentHp: 125, opponentMaxHp: 142, playerGender: "male", opponentGender: "male" },
    probe: "de6c0403e5baa03de893cd858fbfb4eac4916699dac5d2baf7485a967da1411b",
    raw: "f621f96050f9841139667fb2fb20bdbeeec376c2abfbac093a24a8b1cfee70a9",
    mapPath: "tools/compare/evidence/disable-changemap-opponent.txt",
    map: "3aedbc9d0e0b7b544df548b30e62de8a50e9fcff4e59557468f3b03b05b16b55",
  },
] as const;

const detectReceipts = [
  {
    fixturePath: "tools/compare/fixtures/detect-player-yanma-opponent-onix.json",
    fixtureSha256: "69d9e675b21a7259f27a83008b1867506b74304fb03af608b8ae907317739aa9",
    scenarioPath: "tools/battle-lab/mechanic-detect-player-yanma-opponent-onix.json",
    scenarioSha256: "bde43710fb5ef6bf3ddca481ecd3a1137c2e27540cde8087310f31090fa406b2",
    orientation: "player-to-opponent",
    attackerSide: "player" as const,
    window: { startFrame: 64, endFrame: 173, frameCount: 110 },
    geometry: {
      attacker: {
        side: "player" as const,
        spriteCorner: { x: 40, y: 52 }, animationCenter: { x: 72, y: 84 }, battlePositionCenter: { x: 72, y: 80 },
      },
      target: {
        side: "opponent" as const,
        spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 },
      },
    },
    fieldProfile: { playerHp: 161, playerMaxHp: 161, opponentHp: 142, opponentMaxHp: 142, playerGender: "male", opponentGender: "male" },
    evidence: "2a1054d283c2442589eef01bbf65048e2a0ab2f59a69e63f390c6439d640e34e",
    raw: "274b00b5e15634a4d19eb03c9cc62d8552dd02dffa4348efb927bab545ed5cb0",
  },
  {
    fixturePath: "tools/compare/fixtures/detect-opponent-yanma-player-onix.json",
    fixtureSha256: "2c7bbbb9edac387ba6e2c4dfdd626a75bc7a53980e7c8d0260d7bd28f0a7cc9b",
    scenarioPath: "tools/battle-lab/mechanic-detect-opponent-yanma-player-onix.json",
    scenarioSha256: "e938c2073eedd752d6dbe658df6d9b3f833e1a4c15f1885d3ef22525dfc662ca",
    orientation: "opponent-to-player",
    attackerSide: "opponent" as const,
    window: { startFrame: 69, endFrame: 177, frameCount: 109, skipProbeFrames: 1, ageOffset: 1 },
    geometry: {
      attacker: {
        side: "opponent" as const,
        spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 },
      },
      target: {
        side: "player" as const,
        spriteCorner: { x: 40, y: 48 }, animationCenter: { x: 72, y: 80 }, battlePositionCenter: { x: 72, y: 80 },
      },
    },
    fieldProfile: { playerHp: 142, playerMaxHp: 142, opponentHp: 161, opponentMaxHp: 161, playerGender: "male", opponentGender: "male" },
    evidence: "f8e7f48c77f020ceeb6f2c1ae7ac0ce1dbbfa30af7820d763b840777046c0b93",
    raw: "2086c05aac41c72e0f82c265d658c7d27cee9e8cf3f7ce6d93498f0eb4c39549",
  },
] as const;

const scenarioExpectations = [
  {
    path: disableReceipts[0].scenarioPath, sha256: disableReceipts[0].scenarioSha256,
    attackerSide: "player" as const, playerSetIds: [114, 158, 188], opponentSetIds: [156, 157, 185], seed: 305420121,
    attacker: { species: 96, move: 50 }, target: { species: 95, move: 33 },
    segments: [
      { frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] }, { frames: 2, buttons: ["A"] }, { frames: 450, buttons: [] },
      { frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] }, { frames: 2, buttons: ["A"] }, { frames: 700, buttons: [] },
    ], captureFrames: [0, 1218],
  },
  {
    path: disableReceipts[1].scenarioPath, sha256: disableReceipts[1].scenarioSha256,
    attackerSide: "opponent" as const, playerSetIds: [156, 157, 185], opponentSetIds: [114, 158, 188], seed: 305420121,
    attacker: { species: 96, move: 50 }, target: { species: 95, move: 33 },
    segments: [
      { frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] }, { frames: 2, buttons: ["A"] }, { frames: 450, buttons: [] },
      { frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] }, { frames: 2, buttons: ["A"] }, { frames: 700, buttons: [] },
    ], captureFrames: [0, 1218],
  },
  {
    path: detectReceipts[0].scenarioPath, sha256: detectReceipts[0].scenarioSha256,
    attackerSide: "player" as const, playerSetIds: [161, 162, 163], opponentSetIds: [156, 157, 158], seed: 305419897,
    attacker: { species: 193, move: 197 }, target: { species: 95, move: 33 },
    segments: [
      { frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] }, { frames: 2, buttons: ["A"] }, { frames: 600, buttons: [] },
    ], captureFrames: [0, 100, 200, 300, 634],
  },
  {
    path: detectReceipts[1].scenarioPath, sha256: detectReceipts[1].scenarioSha256,
    attackerSide: "opponent" as const, playerSetIds: [156, 157, 158], opponentSetIds: [161, 162, 163], seed: 305419897,
    attacker: { species: 193, move: 197 }, target: { species: 95, move: 33 },
    segments: [
      { frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] }, { frames: 2, buttons: ["A"] }, { frames: 600, buttons: [] },
    ], captureFrames: [0, 100, 200, 300, 634],
  },
] as const;

const monKeys = [
  "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature",
  "ppUps", "shiny", "species",
] as const;
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"] as const;

function json<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function digest(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function sourceBody(source: string, start: string, end: string): string {
  const first = source.indexOf(`${start}:`);
  const last = source.indexOf(`${end}:`, first);
  if (first < 0 || last < 0) throw new Error(`missing ${start}..${end}`);
  return source.slice(first, last);
}

function pointer(symbols: string, symbol: string): string {
  const match = symbols.match(new RegExp(`^([0-9a-fA-F]+)\\s+\\w\\s+${symbol}$`, "m"));
  if (!match) throw new Error(`missing ELF symbol ${symbol}`);
  return `0x${match[1]!.toLowerCase()}`;
}

function expectCompleteLegalParty(party: readonly BattleMon[]): void {
  expect(party).toHaveLength(3);
  for (const mon of party) {
    expect(Object.keys(mon).sort()).toEqual([...monKeys].sort());
    expect(Object.keys(mon.ivs).sort()).toEqual([...statKeys]);
    expect(Object.keys(mon.evs).sort()).toEqual([...statKeys]);
    expect(mon.level).toBe(50);
    expect(Number.isInteger(mon.species) && mon.species > 0).toBe(true);
    expect(Number.isInteger(mon.nature) && mon.nature >= 0 && mon.nature < 25).toBe(true);
    expect(Object.values(mon.ivs).every((value) => Number.isInteger(value) && value >= 0 && value <= 31)).toBe(true);
    expect(Object.values(mon.evs).every((value) => Number.isInteger(value) && value >= 0 && value <= 255)).toBe(true);
    expect(Object.values(mon.evs).reduce((total, value) => total + value, 0)).toBeLessThanOrEqual(510);
    expect(mon.moves).toHaveLength(4);
    expect(mon.moves.every((move) => Number.isInteger(move) && move > 0)).toBe(true);
    expect(mon.ppUps).toEqual([0, 0, 0, 0]);
    expect(mon.item).toBeGreaterThanOrEqual(0);
    expect(mon.abilitySlot).toBe(0);
    expect(Number.isInteger(mon.friendship) && mon.friendship >= 0 && mon.friendship <= 255).toBe(true);
    expect(["male", "female", "genderless"]).toContain(mon.gender);
    expect(mon.shiny).toBe(false);
    for (const transient of [
      "hp", "currentHp", "status", "status1", "status2", "statStages", "weather", "sideConditions", "outcome",
    ]) expect(mon).not.toHaveProperty(transient);
  }
}

describe("sparkle-4-grow-grayscale standalone fulfilled component-track ratchet", () => {
  it("pins distinct authoritative Disable and Detect bodies, ELF intervals, source tokens, and non-transfer", () => {
    const disableAudit = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/disableSourceAudit.ts",
    ], { encoding: "utf8" })) as Record<string, unknown>;
    expect(disableAudit).toEqual({
      move: "MOVE_DISABLE",
      moveId: 50,
      sourceBounds: { start: "0x082d3a67", endExclusive: "0x082d3a95" },
      taskBounds: { start: "0x081045b0", step: "0x08104614" },
      carrier: "FRONTIER_MON_DROWZEE 114",
      components: [
        "asset:ANIM_TAG_SPARKLE_4",
        "sprite:gSpinningSparkleSpriteTemplate",
        "task:AnimTask_GrowAndGrayscale",
        "monbg/splitbgprio/alpha/cleanup",
        "audio:SE_M_DETECT attacker + SE_M_BIND target",
      ],
    });

    const symbols = execFileSync("arm-none-eabi-nm", [
      "-a", "reference/pokeemerald/pokeemerald.elf",
    ], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    expect({
      Move_DISABLE: pointer(symbols, "Move_DISABLE"), Move_RECOVER: pointer(symbols, "Move_RECOVER"),
      Move_DETECT: pointer(symbols, "Move_DETECT"), Move_FRUSTRATION: pointer(symbols, "Move_FRUSTRATION"),
      gSpinningSparkleSpriteTemplate: pointer(symbols, "gSpinningSparkleSpriteTemplate"),
      gSimplePaletteBlendSpriteTemplate: pointer(symbols, "gSimplePaletteBlendSpriteTemplate"),
      AnimSpinningSparkle: pointer(symbols, "AnimSpinningSparkle"),
      AnimTask_GrowAndGrayscale: pointer(symbols, "AnimTask_GrowAndGrayscale"),
      AnimTask_GrowAndGrayscale_Step: pointer(symbols, "AnimTask_GrowAndGrayscale_Step"),
      AnimTask_BlendBattleAnimPal: pointer(symbols, "AnimTask_BlendBattleAnimPal"),
      StartBlendAnimSpriteColor: pointer(symbols, "StartBlendAnimSpriteColor"),
    }).toEqual({
      Move_DISABLE: "0x082d3a67", Move_RECOVER: "0x082d3a95",
      Move_DETECT: "0x082cb3d2", Move_FRUSTRATION: "0x082cb430",
      gSpinningSparkleSpriteTemplate: "0x0853ee84",
      gSimplePaletteBlendSpriteTemplate: "0x08597274",
      AnimSpinningSparkle: "0x080a8b64",
      AnimTask_GrowAndGrayscale: "0x081045b0",
      AnimTask_GrowAndGrayscale_Step: "0x08104614",
      AnimTask_BlendBattleAnimPal: "0x08116620",
      StartBlendAnimSpriteColor: "0x08116874",
    });

    const scripts = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
    const disable = sourceBody(scripts, "Move_DISABLE", "Move_RECOVER");
    const detect = sourceBody(scripts, "Move_DETECT", "Move_FRUSTRATION");
    const rom = readFileSync("reference/pokeemerald/pokeemerald.gba");
    for (const body of [
      {
        text: disable, bytes: rom.subarray(0x2d3a67, 0x2d3a95), textHash: "d62aefa12495c0984d615a80e42989e8621ee9ec790e2f62ded163256dcb4447",
        byteHash: "66b8b1546fc3e3d3cf55cc15b616d4c0ee7baa408161c978fed3f96f68c4253d", byteLength: 46,
      },
      {
        text: detect, bytes: rom.subarray(0x2cb3d2, 0x2cb430), textHash: "a75aa1f507178688024741a305697dc68a9a0a4741a1e35496c394e48c47966e",
        byteHash: "b6c1329b3424e8a49fce6b74cdd85d324959c34e6a1fdd3a0b22c1be7f5d75af", byteLength: 94,
      },
    ]) {
      expect(createHash("sha256").update(body.text).digest("hex")).toBe(body.textHash);
      expect([body.bytes.length, createHash("sha256").update(body.bytes).digest("hex")])
        .toEqual([body.byteLength, body.byteHash]);
    }

    for (const shared of ["loadspritegfx ANIM_TAG_SPARKLE_4", "createsprite gSpinningSparkleSpriteTemplate"]) {
      expect(disable).toContain(shared);
      expect(detect).toContain(shared);
    }
    for (const token of [
      "monbg ANIM_TARGET", "splitbgprio ANIM_TARGET", "setalpha 8, 8",
      "playsewithpan SE_M_DETECT, SOUND_PAN_ATTACKER",
      "createsprite gSpinningSparkleSpriteTemplate, ANIM_ATTACKER, 13, 24, -16",
      "createvisualtask AnimTask_GrowAndGrayscale, 5",
      "loopsewithpan SE_M_BIND, SOUND_PAN_TARGET, 15, 4", "clearmonbg ANIM_TARGET", "blendoff",
    ]) expect(disable).toContain(token);
    for (const token of [
      "simple_palette_blend selector=F_PAL_BG, delay=2, initial_blend_y=0, target_blend_y=9, color=RGB_BLACK",
      "createvisualtask AnimTask_BlendBattleAnimPal, 10, F_PAL_ATTACKER, 1, 0, 9, RGB_WHITE",
      "createsprite gSpinningSparkleSpriteTemplate, ANIM_ATTACKER, 13, 20, -20",
      "simple_palette_blend selector=F_PAL_BG, delay=2, initial_blend_y=9, target_blend_y=0, color=RGB_BLACK",
      "createvisualtask AnimTask_BlendBattleAnimPal, 10, F_PAL_ATTACKER, 2, 9, 0, RGB_WHITE",
    ]) expect(detect).toContain(token);
    expect(disable).not.toContain("simple_palette_blend");
    for (const token of ["AnimTask_GrowAndGrayscale", "monbg ANIM_TARGET", "splitbgprio", "setalpha 8, 8", "loopsewithpan SE_M_BIND", "clearmonbg"]) {
      expect(detect).not.toContain(token);
    }
  });

  it("pins both complete Disable source/component/seam/hardware/palette/register/audio/state/raw-RGB/framebuffer windows", () => {
    for (const expected of disableReceipts) {
      const stored = json<DisableReceipt>(expected.fixturePath);
      expect(digest(expected.fixturePath)).toBe(expected.fixtureSha256);
      expect(digest(expected.scenarioPath)).toBe(expected.scenarioSha256);
      expect(digest(expected.mapPath)).toBe(expected.map);
      expect(stored).toMatchObject({
        schema: "disable-portable-evidence/v1", oracleProfile: "battle-scene-on", move: "DISABLE", moveId: 50,
        orientation: expected.orientation, scenario: expected.scenarioPath, probe: "tools/compare/disableProbe.py",
        sourceWindow: expected.window, sourceBounds: { start: "0x082d3a67", endExclusive: "0x082d3a95" },
        attacker: { species: "DROWZEE", geometry: expected.geometry.attacker },
        target: { species: "ONIX", geometry: expected.geometry.target }, fieldProfile: expected.fieldProfile,
        probeJsonSha256: expected.probe, rawRgbSha256: expected.raw,
        changeMap: expected.mapPath, changeMapSha256: expected.map,
      });
      expect(stored.sourceWindow.endFrame - stored.sourceWindow.startFrame + 1).toBe(113);
      const map = readFileSync(expected.mapPath, "utf8");
      expect(map).toContain(`# MOVE_DISABLE ${expected.orientation} — 113 frames, 240x160`);
      expect(map).toContain(`static ${expected.window.endFrame - 5}-${expected.window.endFrame}`);
    }
    expect(disableReceipts.reduce((total, entry) => total + entry.window.frameCount, 0)).toBe(226);

    const portable = readFileSync("tools/compare/disablePortable.ts", "utf8");
    for (const token of [
      "for (let runNumber = 1; runNumber <= 2; runNumber += 1)",
      "tools/run-mgba-probe.py", "disable-dense-evidence/v1", "fixture.sourceWindow.frameCount",
      "sceneOnDisableView", "stableBattle", "row.script.inBounds", "row.visualTaskCount", "row.soundTaskCount",
      "AnimTask_GrowAndGrayscale_Step", "Task_UpdateMonBg", "Task_LoopAndPlaySE", "row.registers.bldcnt",
      "hardwareOam", "hardwareMatrices", "hardwarePalette", "fadedPalette", "displayedScale?.grayscale === false",
      "createHash(\"sha256\").update(raw)", "frame-changemap.py", "framebufferDiff", "render(engine)",
      "component ${component}/113", "seam ${seam}/113", "hardware ${hardware}/113", "framebuffer ${framebuffer}/113",
    ]) expect(portable).toContain(token);
    expect(portable).not.toContain("detectAtAge");
    const probe = readFileSync("tools/compare/disableProbe.py", "utf8");
    for (const token of [
      "sBattleAnimScriptPtr", "gAnimScriptActive", "screen_rgb", "hardwareOam", "hardwareMatrices",
      "fadedPalette", "unfadedPalette", "hardwarePalette", "paletteTags", "registers", "se1", "battle",
      "first inactive interpreter row", "not oracle.read_u8(script_active)",
    ]) expect(probe).toContain(token);
  });

  it("pins both complete Detect source/component/seam/hardware/palette/register/audio/state/raw-RGB/framebuffer windows", () => {
    for (const expected of detectReceipts) {
      const stored = json<DetectReceipt>(expected.fixturePath);
      expect(digest(expected.fixturePath)).toBe(expected.fixtureSha256);
      expect(digest(expected.scenarioPath)).toBe(expected.scenarioSha256);
      expect(stored).toMatchObject({
        schema: "scene-on-portable-evidence/v1", oracleProfile: "battle-scene-on", move: "DETECT",
        orientation: expected.orientation, scenario: expected.scenarioPath, probe: "tools/compare/detectProbe.py",
        appStage: { presentationAge: 0 }, denseWindow: expected.window,
        attacker: { species: "YANMA", geometry: expected.geometry.attacker },
        target: { species: "ONIX", geometry: expected.geometry.target }, fieldProfile: expected.fieldProfile,
        evidenceSchema: "detect-dense-evidence/v1", evidenceSha256: expected.evidence,
        secondFreshEvidenceSha256: expected.evidence, rawRgbSha256: expected.raw,
        acceptance: { status: "exact", componentMatching: expected.window.frameCount, framebufferMatching: expected.window.frameCount },
      });
      expect(stored.denseWindow.endFrame - stored.denseWindow.startFrame + 1).toBe(expected.window.frameCount);
    }
    expect(detectReceipts.reduce((total, entry) => total + entry.window.frameCount, 0)).toBe(219);
    expect(detectReceipts[1].window).toEqual({
      startFrame: 69, endFrame: 177, frameCount: 109, skipProbeFrames: 1, ageOffset: 1,
    });

    const portable = readFileSync("tools/compare/detectPortable.ts", "utf8");
    for (const token of [
      "tools/run-mgba-probe.py", "fixture.denseWindow.skipProbeFrames ?? 0", "fixture.evidenceSchema",
      "evidenceHash", "secondFreshEvidenceSha256", "rawRgbSha256", "sceneOnDetectView", "ageOffset",
      "displayedBgBlendY", "displayedAttackerPaletteY", "sparkleTemplate", "componentMatches", "framebufferMatches",
      "render(engine)", "240 * 160", "fixture.acceptance.status === \"exact\"",
    ]) expect(portable).toContain(token);
    expect(portable).not.toContain("disableAtAge");
    const probe = readFileSync("tools/compare/detectProbe.py", "utf8");
    for (const token of [
      "Move_DETECT", "Move_FRUSTRATION", "SKIP_FIRST", "first inactive cleanup", "screen_rgb",
      "gPlttBufferFaded", "gPlttBufferUnfaded", "hardwarePalette", "softwareOam", "hardwareOam", "hardwareMatrices",
      "soundTaskCount", "animScriptActive", "inMoveScript", "\"player\": snap[\"battlers\"][\"player\"]",
      "\"opponent\": snap[\"battlers\"][\"opponent\"]", "\"se1\"", "\"bldcnt\"", "\"bldalpha\"", "\"bldy\"",
    ]) expect(probe).toContain(token);
  });

  it("pins every untouched complete legal three-mon party-only fixture and ordinary controller input", () => {
    for (const expected of scenarioExpectations) {
      const staged = json<Scenario>(expected.path);
      expect(digest(expected.path)).toBe(expected.sha256);
      expect(staged).toMatchObject({
        schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50,
        challengeNum: 0, battleNum: 0, trainerId: 50, seed: expected.seed,
        playerSetIds: expected.playerSetIds, opponentSetIds: expected.opponentSetIds,
      });
      expect(Object.keys(staged.overrides)).toEqual(["parties"]);
      expect(Object.keys(staged.overrides.parties).sort()).toEqual(["opponent", "player"]);
      expectCompleteLegalParty(staged.overrides.parties.player);
      expectCompleteLegalParty(staged.overrides.parties.opponent);
      expect(staged.trace.segments).toEqual(expected.segments);
      expect(staged.trace.captureFrames).toEqual(expected.captureFrames);
      expect(staged.trace.segments.every((segment) => segment.buttons.every((button) => button === "A"))).toBe(true);
      const targetSide: Side = expected.attackerSide === "player" ? "opponent" : "player";
      expect(staged.overrides.parties[expected.attackerSide][0]).toMatchObject({
        species: expected.attacker.species,
        moves: [expected.attacker.move, expected.attacker.move, expected.attacker.move, expected.attacker.move],
      });
      expect(staged.overrides.parties[targetSide][0]).toMatchObject({
        species: expected.target.species,
        moves: [expected.target.move, expected.target.move, expected.target.move, expected.target.move],
      });
    }
    expect(scenarioExpectations).toHaveLength(4);
  });

  it("keeps the two reducers, typed seam, production compositors, and verifier obligations move-owned", () => {
    const disable = readFileSync("src/animation/disable.ts", "utf8");
    for (const token of [
      "Source-shaped reducer for MOVE_DISABLE", "DISABLE_WINDOW_FRAMES = 113", "disableSparkleTileOffsetAtAge",
      "DISABLE_GROW_FIRST_AGE = 24", "displayedTargetScale", "scaled/original-palette tail", "active: age >= 0 && age < DISABLE_WINDOW_FRAMES - 1",
    ]) expect(disable).toContain(token);
    const detect = readFileSync("src/animation/detect.ts", "utf8");
    for (const token of [
      "Source-shaped reducer for MOVE_DETECT", "DETECT_WINDOW_FRAMES = 110", "detectBgBlendYAtAge",
      "detectAttackerPaletteYAtAge", "DETECT_SPARKLE_DISPLAY_FIRST_AGE = 52", "detectSparkleTileOffsetAtAge",
      "active: age >= 0 && age < DETECT_WINDOW_FRAMES - 1",
    ]) expect(detect).toContain(token);
    expect(disable).not.toContain("detectBgBlendYAtAge");
    expect(detect).not.toContain("AnimTask_GrowAndGrayscale");

    const seam = readFileSync("src/animation/sceneOnPresentation.ts", "utf8");
    for (const token of [
      "export function sceneOnDisableView", "disableAtAge(", "export function sceneOnDetectView", "detectAtAge(",
    ]) expect(seam).toContain(token);
    const compositor = readFileSync("src/engine/battleScene.ts", "utf8");
    for (const token of [
      "state.config.move === \"DISABLE\"", "sceneOnDisableView", "displayedTargetScale", "age: disableState.age - 1",
      "unsupported staged DISABLE pair", "state.config.move === \"DETECT\"", "sceneOnDetectView",
      "DISPLAYED schedules", "unsupported staged DETECT pair",
    ]) expect(compositor).toContain(token);
    expect(readFileSync("src/engine/core.ts", "utf8")).toContain("sceneOnPresentation");
  });

  it("rechecks the per-mechanism latch contract from this track's own retained evidence without inheriting it", () => {
    const latches = readFileSync("ANIMATION_LATCHES.md", "utf8");
    for (const token of [
      "The latch is per-MECHANISM (per source task, per sprite class), never",
      "Never inherit a latch from a sibling move.",
      "Default expectation where nothing is measured: visible events display ONE",
      "Sprite-driven `x2` / plain OAM edits / script-`createsprite` sprites | RAM+1",
      "Palette writes (`gPlttBufferFaded`), incl. metallic-shine pulse and BlendPalette ramps | RAM+1",
      "Freshly allocated OAM **affine matrix** | needs TWO displays to reach hardware; removal is a plain OAM edit at ONE",
      "Outgoing animation's OAM teardown (incl. enemy shadow) | lands ONE display behind the script-pointer boundary",
      "`loadspritegfx` VRAM transfer | latches at the window's first frame",
    ]) expect(latches).toContain(token);
    for (const token of [
      "ordinary predecessor sparkle/grow/palette scanout", "restored-palette scaled tail",
      "skipProbeFrames:1, ageOffset:1", "outgoing enemy-shadow OAM teardown", "first-frame loadspritegfx",
      "do not transfer a generic affine latch", "Disable transfers no grow, grayscale, monbg, splitbgprio, alpha, bind-audio, timing, or latch fact to Detect",
      "Detect transfers no palette, sparkle, timing, teardown, or latch fact to Disable",
    ]) expect(trackGoal).toContain(token);
  });

  it("fulfills only the unchanged exact eight-component boundary at 233 Level-50 moves", () => {
    const coverage = json<{
      readonly entries: readonly { readonly move: string; readonly status: string; readonly covered: readonly string[] }[];
      readonly componentTracks: readonly {
        readonly id: string;
        readonly components: readonly string[];
        readonly representatives: readonly string[];
        readonly fulfilled: boolean;
        readonly goal: string;
      }[];
    }>("ANIMATION_COVERAGE.json");
    const inventory = json<{
      readonly tiers: { readonly level50: { readonly moves: readonly { readonly move: string }[] } };
    }>("src/data/gen/factory-animation-inventory.json");
    const level50Moves = new Set(inventory.tiers.level50.moves.map((entry) => entry.move));
    expect(level50Moves.size).toBe(276);
    expect(coverage.entries).toHaveLength(245);
    expect(coverage.entries.filter((entry) => level50Moves.has(entry.move) && entry.status === "exact")).toHaveLength(245);
    expect(coverage.entries.filter((entry) => level50Moves.has(entry.move) && (entry.status === "partial" || entry.status === "staged"))).toEqual([]);
    expect([...level50Moves].filter((move) => !coverage.entries.some((entry) => entry.move === move))).toHaveLength(31);
    expect(coverage.entries.filter((entry) => ["MOVE_DISABLE", "MOVE_DETECT"].includes(entry.move))).toEqual([
      expect.objectContaining({ move: "MOVE_DETECT", status: "exact" }),
      expect.objectContaining({ move: "MOVE_DISABLE", status: "exact" }),
    ]);
    expect(coverage.componentTracks.filter((track) => track.id === "sparkle-4-grow-grayscale")).toEqual([{
      id: "sparkle-4-grow-grayscale", components: [...trackComponents], representatives: ["MOVE_DISABLE", "MOVE_DETECT"],
      fulfilled: true, goal: trackGoal,
    }]);
  });
});
