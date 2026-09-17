import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;

const root = resolve(import.meta.dirname, "../..");

const trackComponents = [
  "task:AnimTask_ShakeTargetInPattern",
  "task:AnimTask_ScaryFace",
  "asset:ANIM_TAG_EYE_SPARKLE",
  "sprite:gEyeSparkleSpriteTemplate",
] as const;

const trackGoal = "FULFILLED: This exact four-component boundary remains fulfilled only because MOVE_SCARY_FACE, MOVE_GLARE, MOVE_THUNDER, and MOVE_TRI_ATTACK each independently retain its own authoritative source body, source-derived reducer, typed Scene-ON seam, production compositor, complete legal bilateral party-only Battle Scene ON fixtures, and twice-fresh unthinned source/component/seam/hardware/palette/register/audio/immutable-state/raw-RGB/actual-core framebuffer proof. MOVE_SCARY_FACE independently owns both EYE_SPARKLE sprites' one-display OAM transfer, its AnimTask_ScaryFace BG/palette work, and its shared-argument overwrite before the two-display battler-task ShakeTargetInPattern body. MOVE_GLARE independently owns task-created eye-dot two-display paint/one-display removal, script-created sparkle display age 115, both palette ramps, its ScaryFace task, and its separately measured target shake. MOVE_THUNDER independently owns twelve LIGHTNING sprites, BG_THUNDER fade/slide/restore, palette and six-inversion schedule, its runtime argument overwrite, and target-shake hardware order. MOVE_TRI_ATTACK independently owns triangle ages 4..84, eight flames 107..153, three lightning 158..191, seven ice crystals 208..280, palette sprites 86..123 and 244..281, target shakes 129..146 and 186..203, 283/283 predecessor OAM/matrix/palette transfers, reverse stable OAM-rank equal-Y paint order, pattern-0 creation-row pose, and 8-bit attr0 Y wrap. Rules 1, 2, and 5 remain per-mechanism: no latch, timing, overwrite, palette, BG, sprite, task, audio, compositor, or acceptance fact transfers among siblings; where a mechanism is unmeasured, one display remains only the hypothesis.";

const receipts = [
  {
    move: "SCARY_FACE", side: "player" as const,
    fixture: "tools/compare/fixtures/scary-face-player-rhyhorn-opponent-shuckle.json",
    fixtureSha256: "8c89d2cff60692597376d2d37a971f68fa033666b3a9a8702554d4401f47e369",
    scenario: "tools/battle-lab/mechanic-scary-face-player-rhyhorn-opponent-shuckle.json",
    scenarioSha256: "1348531491adda6ebcfa3db4dd2fb8e8bcbe7bf80c643c809a9d3d7f41f39c5e",
    window: { startFrame: 79, endFrame: 268, frameCount: 190 }, attacker: 111,
  },
  {
    move: "SCARY_FACE", side: "opponent" as const,
    fixture: "tools/compare/fixtures/scary-face-opponent-rhyhorn-player-shuckle.json",
    fixtureSha256: "6eb4cc2cbadae74f7041110265b316fbc8aaaae980c1d3138edd3739824f65eb",
    scenario: "tools/battle-lab/mechanic-scary-face-opponent-rhyhorn-player-shuckle.json",
    scenarioSha256: "0d49ff90bd9f0a1918dedcc256351fe98c748878ea61d2a71b7db1b030ed808f",
    window: { startFrame: 83, endFrame: 272, frameCount: 190 }, attacker: 111,
  },
  {
    move: "GLARE", side: "player" as const,
    fixture: "tools/compare/fixtures/glare-player-dunsparce-opponent-shuckle.json",
    fixtureSha256: "6408340031d5000d3d277dcb8ea2009362437314b5874d26452266a0f51e0358",
    scenario: "tools/battle-lab/mechanic-glare-player-dunsparce-opponent-shuckle.json",
    scenarioSha256: "33c7db918a71853c96606cadc6399830e6845497badfad2c22c7145d3e650546",
    window: { startFrame: 74, endFrame: 286, frameCount: 213 }, attacker: 206,
  },
  {
    move: "GLARE", side: "opponent" as const,
    fixture: "tools/compare/fixtures/glare-opponent-dunsparce-player-shuckle.json",
    fixtureSha256: "ca42f6840bfb43343ba33ab560a19e4e8759679b60cc25cbed6dd960289bd3af",
    scenario: "tools/battle-lab/mechanic-glare-opponent-dunsparce-player-shuckle.json",
    scenarioSha256: "f48f04feca873f2cbec8df559522b1c1c759e41446efdfb91122b92bb6a5d988",
    window: { startFrame: 78, endFrame: 290, frameCount: 213 }, attacker: 206,
  },
  {
    move: "THUNDER", side: "player" as const,
    fixture: "tools/compare/fixtures/thunder-player-magneton-opponent-shuckle.json",
    fixtureSha256: "c9fd4dad3353c261d92802beaabeb1557e1cb3f5549bd77d67ed897817498a44",
    scenario: "tools/battle-lab/mechanic-thunder-player-magneton-opponent-shuckle.json",
    scenarioSha256: "9d6ab4c925aa4da594d462733dbf3e320f602af2d87bc2b1f39f5777a0366377",
    window: { startFrame: 76, endFrame: 337, frameCount: 262 }, attacker: 82,
  },
  {
    move: "THUNDER", side: "opponent" as const,
    fixture: "tools/compare/fixtures/thunder-opponent-magneton-player-shuckle.json",
    fixtureSha256: "14c5260eb0fa3508ed12f6c262cf3a04d8505ac16fd252c94d3b49fcef3c8dfa",
    scenario: "tools/battle-lab/mechanic-thunder-opponent-magneton-player-shuckle.json",
    scenarioSha256: "c6759316fae64d83ed7689022206412144802a877e36da223d240564fcbcfba2",
    window: { startFrame: 80, endFrame: 341, frameCount: 262 }, attacker: 82,
  },
  {
    move: "TRI_ATTACK", side: "player" as const,
    fixture: "tools/compare/fixtures/tri-attack-evidence.json",
    fixtureSha256: "93677feb49a4a7c1d807726822b6259ab6a9a9cc346ad6e7258792b1da41b448",
    scenario: "tools/battle-lab/mechanic-tri-attack-player-porygon-opponent-shuckle.json",
    scenarioSha256: "56490844b7ecb2d5b02b59390132f7426077dca4ae4c0073afc80c6d904f4ac1",
    window: { startFrame: 77, endFrame: 360, frameCount: 284 }, attacker: 137,
  },
  {
    move: "TRI_ATTACK", side: "opponent" as const,
    fixture: "tools/compare/fixtures/tri-attack-evidence.json",
    fixtureSha256: "93677feb49a4a7c1d807726822b6259ab6a9a9cc346ad6e7258792b1da41b448",
    scenario: "tools/battle-lab/mechanic-tri-attack-opponent-porygon-player-shuckle.json",
    scenarioSha256: "3ac3e334e32428a02a661c1ab874013f0379b5892e06e32a3c3eca1863d602ad",
    window: { startFrame: 81, endFrame: 364, frameCount: 284 }, attacker: 137,
  },
] as const;

const monKeys = [
  "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature",
  "ppUps", "shiny", "species",
] as const;
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"] as const;

function json(path: string): Json {
  return JSON.parse(readFileSync(resolve(root, path), "utf8")) as Json;
}

function digest(path: string): string {
  return createHash("sha256").update(readFileSync(resolve(root, path))).digest("hex");
}

function sourceBody(source: string, start: string, end: string): string {
  const first = source.indexOf(`${start}:`);
  const last = source.indexOf(`${end}:`, first + 1);
  if (first < 0 || last < 0) throw new Error(`missing ${start}..${end}`);
  return source.slice(first, last);
}

function pointer(symbols: string, symbol: string): string {
  const match = symbols.match(new RegExp(`^([0-9a-fA-F]+)\\s+\\w\\s+${symbol}$`, "m"));
  if (!match) throw new Error(`missing ELF symbol ${symbol}`);
  return `0x${match[1]!.toLowerCase()}`;
}

function expectCompleteLegalParty(party: readonly Json[]): void {
  expect(party).toHaveLength(3);
  for (const mon of party) {
    expect(Object.keys(mon).sort()).toEqual([...monKeys].sort());
    expect(Object.keys(mon.ivs).sort()).toEqual([...statKeys]);
    expect(Object.keys(mon.evs).sort()).toEqual([...statKeys]);
    expect(mon.level).toBe(50);
    expect(mon.moves).toHaveLength(4);
    expect(mon.ppUps).toEqual([0, 0, 0, 0]);
    expect(mon.abilitySlot).toBe(0);
    expect(mon.shiny).toBe(false);
    expect(["male", "female", "genderless"]).toContain(mon.gender);
    const ivs = Object.values(mon.ivs) as number[];
    const evs = Object.values(mon.evs) as number[];
    expect(ivs.every((value) => Number.isInteger(value) && value >= 0 && value <= 31)).toBe(true);
    expect(evs.every((value) => Number.isInteger(value) && value >= 0 && value <= 255)).toBe(true);
    expect(evs.reduce((sum, value) => sum + value, 0)).toBeLessThanOrEqual(510);
    for (const transient of [
      "hp", "currentHp", "status", "status1", "status2", "statStages", "weather", "sideConditions", "outcome",
    ]) expect(mon).not.toHaveProperty(transient);
  }
}

function triAttackProduction(): Json {
  return JSON.parse(execFileSync(process.execPath, [
    "--experimental-strip-types", "tools/compare/triAttackFramebuffer.ts",
  ], { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 })) as Json;
}

describe("shake-target-in-pattern-scary-face standalone fulfilled component-track ratchet", () => {
  it("pins the exact four-component boundary plus four distinct authoritative source bodies, pointers, ROM hashes, and tokens", () => {
    const symbols = execFileSync("arm-none-eabi-nm", [
      "-a", "reference/pokeemerald/pokeemerald.elf",
    ], { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
    expect({
      Move_SCARY_FACE: pointer(symbols, "Move_SCARY_FACE"), Move_SWEET_KISS: pointer(symbols, "Move_SWEET_KISS"),
      Move_GLARE: pointer(symbols, "Move_GLARE"), Move_BARRAGE: pointer(symbols, "Move_BARRAGE"),
      Move_THUNDER: pointer(symbols, "Move_THUNDER"), Move_THUNDER_PUNCH: pointer(symbols, "Move_THUNDER_PUNCH"),
      Move_TRI_ATTACK: pointer(symbols, "Move_TRI_ATTACK"), Move_WILL_O_WISP: pointer(symbols, "Move_WILL_O_WISP"),
      AnimTask_ShakeTargetInPattern: pointer(symbols, "AnimTask_ShakeTargetInPattern"),
      AnimTask_ScaryFace: pointer(symbols, "AnimTask_ScaryFace"),
      AnimTask_GlareEyeDots: pointer(symbols, "AnimTask_GlareEyeDots"),
      gEyeSparkleSpriteTemplate: pointer(symbols, "gEyeSparkleSpriteTemplate"),
      gGlareEyeDotSpriteTemplate: pointer(symbols, "gGlareEyeDotSpriteTemplate"),
      gLightningSpriteTemplate: pointer(symbols, "gLightningSpriteTemplate"),
    }).toEqual({
      Move_SCARY_FACE: "0x082d3f69", Move_SWEET_KISS: "0x082d3fcc",
      Move_GLARE: "0x082cd0ca", Move_BARRAGE: "0x082cd133",
      Move_THUNDER: "0x082cf935", Move_THUNDER_PUNCH: "0x082cfa8f",
      Move_TRI_ATTACK: "0x082d4595", Move_WILL_O_WISP: "0x082d4709",
      AnimTask_ShakeTargetInPattern: "0x0810a094",
      AnimTask_ScaryFace: "0x081064f8", AnimTask_GlareEyeDots: "0x0815e114",
      gEyeSparkleSpriteTemplate: "0x08593a84", gGlareEyeDotSpriteTemplate: "0x085ce7ec",
      gLightningSpriteTemplate: "0x085956c0",
    });

    const scripts = readFileSync(resolve(root, "reference/pokeemerald/data/battle_anim_scripts.s"), "utf8");
    const rom = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"));
    const bodies = [
      {
        name: "SCARY_FACE", text: sourceBody(scripts, "Move_SCARY_FACE", "Move_SWEET_KISS"),
        bytes: rom.subarray(0x2d3f69, 0x2d3fcc), textSha256: "8083b665ea36cc8cbce52949f8ec10371298cdb5b9352bdccb4ea50a78cc2241",
        bytesSha256: "be5777390a14870ce046737f19d5ad96a745ecce6665c4035509ac569741aebf", byteLength: 99,
      },
      {
        name: "GLARE", text: sourceBody(scripts, "Move_GLARE", "Move_BARRAGE"),
        bytes: rom.subarray(0x2cd0ca, 0x2cd133), textSha256: "1f1fdc0091ce529fcb2acb875b1e799f52347b5afe5a09c07484b8bd30dec169",
        bytesSha256: "b9deda5ecf5391fbe8dc3c0b917650966c90be25710a4037392b45d4aa7e7735", byteLength: 105,
      },
      {
        name: "THUNDER", text: sourceBody(scripts, "Move_THUNDER", "Move_THUNDER_PUNCH"),
        bytes: rom.subarray(0x2cf935, 0x2cfa8f), textSha256: "0c39d383fd2405381f597bc41a3d9eaf126b2ba8c0b2f7d06ee197466100ae69",
        bytesSha256: "b6d31b9fd092ca4aa2b14b34b2102889b1d7ed97e9b24ae1dc1cf794f5c9dd59", byteLength: 346,
      },
      {
        name: "TRI_ATTACK", text: sourceBody(scripts, "Move_TRI_ATTACK", "Move_WILL_O_WISP"),
        bytes: rom.subarray(0x2d4595, 0x2d4709), textSha256: "ac0223c3d6245ec0d062aebb7c6c611352c610cbad267c1cac05af22ebb602fe",
        bytesSha256: "86d2d0432dd6648fcb29c176d3f1f275a1a53ec9a7234b3bdd860be600935396", byteLength: 372,
      },
    ] as const;
    for (const body of bodies) {
      expect(createHash("sha256").update(body.text).digest("hex")).toBe(body.textSha256);
      expect([body.bytes.length, createHash("sha256").update(body.bytes).digest("hex")])
        .toEqual([body.byteLength, body.bytesSha256]);
    }
    expect(new Set(bodies.map((body) => body.textSha256)).size).toBe(4);

    const [scary, glare, thunder, tri] = bodies.map((body) => body.text);
    for (const token of [
      "loadspritegfx ANIM_TAG_EYE_SPARKLE", "createvisualtask AnimTask_ScaryFace, 5",
      "createsprite gEyeSparkleSpriteTemplate, ANIM_ATTACKER, 0, -16, -8",
      "createsprite gEyeSparkleSpriteTemplate, ANIM_ATTACKER, 0, 16, -8",
      "createvisualtask AnimTask_ShakeTargetInPattern, 3, 20, 1, FALSE",
      "simple_palette_blend selector=F_PAL_BG | F_PAL_ATK_SIDE | F_PAL_DEF_PARTNER, delay=3, initial_blend_y=16, target_blend_y=0, color=RGB_BLACK",
    ]) expect(scary).toContain(token);
    expect(scary.indexOf("createvisualtask AnimTask_ShakeTargetInPattern")
      ).toBeLessThan(scary.lastIndexOf("initial_blend_y=16"));
    for (const token of [
      "loadspritegfx ANIM_TAG_SMALL_RED_EYE", "createvisualtask AnimTask_GlareEyeDots, 5, 0",
      "createsprite gEyeSparkleSpriteTemplate, ANIM_ATTACKER, 0, -16, -8",
      "createvisualtask AnimTask_ScaryFace, 5",
      "createvisualtask AnimTask_ShakeTargetInPattern, 3, 20, 1, FALSE",
      "createvisualtask AnimTask_BlendBattleAnimPal, 5, F_PAL_BG, 0, 0, 16, RGB_BLACK",
      "createvisualtask AnimTask_BlendBattleAnimPal, 5, F_PAL_BG, 0, 16, 0, RGB_BLACK",
    ]) expect(glare).toContain(token);
    for (const token of [
      "loadspritegfx ANIM_TAG_LIGHTNING", "fadetobg BG_THUNDER",
      "createvisualtask AnimTask_StartSlidingBg, 5, -256, 0, 1, -1",
      "createvisualtask AnimTask_ShakeTargetInPattern, 2, 30, 3, TRUE, 0",
      "restorebg", "setarg 7, 0xFFFF",
    ]) expect(thunder).toContain(token);
    expect((thunder.match(/createsprite gLightningSpriteTemplate/g) ?? [])).toHaveLength(12);
    expect((thunder.match(/invert_screen_color/g) ?? [])).toHaveLength(6);
    for (const token of [
      "loadspritegfx ANIM_TAG_TRI_ATTACK_TRIANGLE", "gTriAttackTriangleSpriteTemplate",
      "loadspritegfx ANIM_TAG_FIRE", "gLargeFlameScatterSpriteTemplate",
      "createvisualtask AnimTask_ShakeTargetInPattern, 2, 20, 3, TRUE, 1",
      "loadspritegfx ANIM_TAG_LIGHTNING", "createvisualtask AnimTask_ShakeTargetInPattern, 2, 20, 3, TRUE, 0",
      "loadspritegfx ANIM_TAG_ICE_CRYSTALS", "call IceCrystalEffectShort",
    ]) expect(tri).toContain(token);
    expect((tri.match(/gLargeFlameScatterSpriteTemplate/g) ?? [])).toHaveLength(8);
    expect((tri.match(/gLightningSpriteTemplate/g) ?? [])).toHaveLength(3);
    expect(scary).not.toContain("BG_THUNDER");
    expect(glare).not.toContain("gLightningSpriteTemplate");
    expect(thunder).not.toContain("gEyeSparkleSpriteTemplate");
  });

  it("pins all eight untouched complete legal party-only bilateral fixtures, scenarios, and byte hashes", () => {
    for (const expected of receipts) {
      const fixture = json(expected.fixture);
      const stage = json(expected.scenario);
      expect(digest(expected.fixture)).toBe(expected.fixtureSha256);
      expect(digest(expected.scenario)).toBe(expected.scenarioSha256);
      expect(stage).toMatchObject({
        schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50,
      });
      expect(Object.keys(stage.overrides)).toEqual(["parties"]);
      expect(Object.keys(stage.overrides.parties).sort()).toEqual(["opponent", "player"]);
      expectCompleteLegalParty(stage.overrides.parties.player);
      expectCompleteLegalParty(stage.overrides.parties.opponent);
      expect(stage.trace.segments.every((segment: Json) => segment.buttons.every(
        (button: string) => button === "A",
      ))).toBe(true);
      const attacker = stage.overrides.parties[expected.side][0];
      expect(attacker.species).toBe(expected.attacker);
      expect(new Set(attacker.moves).size).toBe(1);

      if (expected.move === "TRI_ATTACK") {
        const orientation = expected.side === "player" ? "player-back" : "opponent-front";
        const retained = fixture.orientations[orientation];
        expect(retained.scenario).toBe(expected.scenario);
        expect(retained.scenarioSha256).toBe(expected.scenarioSha256);
        expect(retained.sourceWindow).toEqual({ ...expected.window, sourceFrameCount: 248 });
      } else {
        const window = fixture.denseWindow ?? fixture.sourceAnimationWindow;
        expect(window).toMatchObject({
          startFrame: expected.window.startFrame, endFrame: expected.window.endFrame,
        });
        expect(window.endFrame - window.startFrame + 1).toBe(expected.window.frameCount);
        expect(fixture.scenario).toBe(expected.scenario);
      }
    }
    expect(receipts).toHaveLength(8);
    // Tri Attack deliberately retains one bilateral receipt; its two distinct
    // party-only scenarios are nevertheless independently hash-pinned above.
    expect(new Set(receipts.map((receipt) => receipt.fixture)).size).toBe(7);
  });

  it("keeps Scary Face's own 190/190 bilateral portable proof, eye transfer, battler-task transfer, overwrite, and cleanup separate", () => {
    const fixtures = receipts.filter((receipt) => receipt.move === "SCARY_FACE");
    for (const expected of fixtures) {
      const fixture = json(expected.fixture);
      expect(fixture).toMatchObject({
        schema: "scene-on-portable-component/v1", oracleProfile: "battle-scene-on", move: "SCARY_FACE",
        attackerSide: expected.side,
        denseWindow: { startFrame: expected.window.startFrame, endFrame: expected.window.endFrame },
        attacker: { species: "RHYHORN", geometry: { side: expected.side } },
        target: { species: "SHUCKLE", geometry: { side: expected.side === "player" ? "opponent" : "player" } },
      });
      expect(fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1).toBe(190);
    }
    const audit = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/scaryFaceSourceAudit.ts",
    ], { cwd: root, encoding: "utf8" })) as Json;
    expect(audit).toEqual({
      move: "MOVE_SCARY_FACE", taskLiteral: { maxShakes: 20, offset: 1, vertical: false, pattern: 0 },
      observedDelayedRuntimeArgs: { maxShakes: 20, offset: 3, vertical: false, pattern: 16 },
      eyeFrames: [0, 4, 8, 4, 0], eyeFrameDuration: 4,
      siblingsRemainUnsupported: ["GLARE", "THUNDER", "TRI_ATTACK"],
    });
    const portable = readFileSync(resolve(root, "tools/compare/scaryFacePortable.ts"), "utf8");
    for (const token of [
      "for (let runNumber = 1; runNumber <= 2; runNumber += 1)", "${exact}/190 exact",
      "same(shake.data.slice(1, 5), [20, 1, 0, 16])", "hardwareOam", "hardwarePalette",
      "framebuffer", "createScratchDir", "tools/run-mgba-probe.py", "render(engine)",
    ]) expect(portable).toContain(token);
    const reducer = readFileSync(resolve(root, "src/animation/scaryFace.ts"), "utf8");
    for (const token of [
      "SCARY_FACE_CLEAN_BOUNDARY_AGE = 189", "scaryFaceAtAge", "runtimeArgs", "shakeNum,",
      "scaryFacePaletteBlackCoeffAtAge", "scaryFaceAttackerPaletteBlackCoeffAtAge",
    ]) expect(reducer).toContain(token);
  });

  it("keeps Glare's own unthinned 213/213 bilateral receipt, two-display dots, one-display removal, age-115 sparkles, palette ramps, shake, and cleanup", () => {
    const expected = [
      {
        fixture: "tools/compare/fixtures/glare-player-dunsparce-opponent-shuckle.json",
        evidence: "67acdfad1ac0e6ebcd4e58be993d2e3fded3979405e0eb77724142dc27ca3db5",
        raw: "676cc2a4ab462a12ab1f06c01a75d1eab1db346ed40db0eb815ba94e9bd16beb",
        map: "tools/compare/evidence/glare-changemap-player.txt",
        mapSha256: "a566d026821e7d583f147f0cd9d351fc7c028b450509fe448a3821d02b100b2e",
      },
      {
        fixture: "tools/compare/fixtures/glare-opponent-dunsparce-player-shuckle.json",
        evidence: "2aa1e8a7769c723575d8dff345e3629ec39d320b2185c9b16ca1790716401644",
        raw: "eb5d27eadf6348be044b1b04e6b74bd887cac4ada819ef29301a311f9d7678c8",
        map: "tools/compare/evidence/glare-changemap-opponent.txt",
        mapSha256: "d6d2e70e4c804abadee0c4d7ca33b6b912907a2e5226bdd9bba62b676305b500",
      },
    ] as const;
    for (const receipt of expected) {
      const fixture = json(receipt.fixture);
      expect(fixture).toMatchObject({
        schema: "scene-on-portable-evidence/v1", oracleProfile: "battle-scene-on", move: "GLARE", moveId: 137,
        sourceBounds: { start: "0x082cd0ca", endExclusive: "0x082cd133", cleanupOffset: 104 },
        sourceAnimationWindow: { frameCount: 213 }, evidenceSha256: receipt.evidence,
        rawRgbSha256: receipt.raw, changeMap: receipt.map, changeMapSha256: receipt.mapSha256,
        freshRuns: 2, freshProbeAndRgbEquality: true,
        acceptance: { status: "exact", componentMatching: 213, framebufferMatching: 213,
          productionReducer: true, productionCompositor: true },
      });
      expect(digest(receipt.map)).toBe(receipt.mapSha256);
      expect(fixture.sourceAnimationWindow.endFrame - fixture.sourceAnimationWindow.startFrame + 1).toBe(213);
      expect(fixture.receipt).toContain("first inactive cleanup");
    }
    const reducer = readFileSync(resolve(root, "src/animation/glare.ts"), "utf8");
    for (const token of [
      "GLARE_SOURCE_FRAME_COUNT = 213", "GLARE_DOT_PAIR_COUNT = 13", "GLARE_DOT_LIFETIME = 37",
      "GLARE_SPARKLE_FIRST_AGE = 112", "GLARE_SHAKE_FIRST_AGE = 118",
      "glareDisplayedDotsAtAge", "glareDisplayedSparklesAtAge", "GLARE_DISPLAYED_TARGET_X2_AGES_118_140",
      "active: age >= 0 && age < GLARE_CLEANUP_AGE",
    ]) expect(reducer).toContain(token);
    const portable = readFileSync(resolve(root, "tools/compare/glarePortable.ts"), "utf8");
    for (const token of [
      "for (let pass = 1; pass <= 2; pass += 1)", "213/213 component+seam; 213/213 framebuffer",
      "frame-changemap.py", "gGlareEyeDotSpriteTemplate", "gEyeSparkleSpriteTemplate",
      "targetHardwareX2", "hardwareOam", "hardwarePalette", "render(engine)",
    ]) expect(portable).toContain(token);
  });

  it("keeps Thunder's own unthinned 262/262 bilateral receipt, twelve lightning lives, BG/palette/inversion schedule, overwrite, hardware shake order, and cleanup", () => {
    const expected = [
      {
        fixture: "tools/compare/fixtures/thunder-player-magneton-opponent-shuckle.json",
        evidence: "e2cbab666552c493a9ac7d7d0bf38bad7ed09deac2ef93d7badb6ff0dc3fdc93",
        raw: "bb5b5dffeb62acfe4f74e57e3b64be887c685c9305f59ac63c5bbf30c28c14a2",
        first: "69f1739effbab59b8d989fe305525b31b76ef37b9d23c1d0933edb85b05ad165",
        cleanup: "69f1739effbab59b8d989fe305525b31b76ef37b9d23c1d0933edb85b05ad165",
      },
      {
        fixture: "tools/compare/fixtures/thunder-opponent-magneton-player-shuckle.json",
        evidence: "45a17da410f2703625028eafe85d34a5aff5d70af3944698eb001c3415607f7f",
        raw: "f6d879f0e4b659ed4940604b8179d5440843eb1d1e98040466a66bb0098c6f7a",
        first: "ad75714240458ddb9e9f23b8b253698fe9786d4cba861ef75e3da674467a2d6b",
        cleanup: "6a5b24b4ae6727b3a9002058c3b67572a74ad4e689ff6025339ef4426df02bb5",
      },
    ] as const;
    for (const receipt of expected) {
      const fixture = json(receipt.fixture);
      expect(fixture).toMatchObject({
        schema: "scene-on-portable-evidence/v1", oracleProfile: "battle-scene-on", move: "THUNDER", moveId: 87,
        sourceBounds: { start: "0x082cf935", endExclusive: "0x082cfa8f", cleanupOffset: 345 },
        sourceAnimationWindow: { frameCount: 262 }, evidenceSha256: receipt.evidence, rawRgbSha256: receipt.raw,
        freshRuns: 2, acceptance: { status: "exact", componentMatching: 262, framebufferMatching: 262 },
      });
      expect(fixture.sourceAnimationWindow.endFrame - fixture.sourceAnimationWindow.startFrame + 1).toBe(262);
      expect(fixture.firstFrameSha256).toBe(receipt.first);
      expect(fixture.cleanupFrameSha256).toBe(receipt.cleanup);
      expect(fixture.receipt).toContain("first inactive offset-345 cleanup");
    }
    const reducer = readFileSync(resolve(root, "src/animation/thunder.ts"), "utf8");
    for (const token of [
      "THUNDER_SOURCE_FRAME_COUNT = 262", "THUNDER_LIGHTNING_CREATION_AGES", "THUNDER_LIGHTNING_SLOTS",
      "THUNDER_DISPLAYED_TARGET_Y2_AGES_174_208", "THUNDER_SHAKE_PATTERN_0", "thunderDisplayedTargetY2AtAge",
      "sourceArgs: [30, 3, true, 0]", "runtimeOffset: 3 | 257 | 2", "runtimeOffset,", "invertPhase",
      "const active = age >= 0 && age < THUNDER_CLEANUP_AGE;",
    ]) expect(reducer).toContain(token);
    const portable = readFileSync(resolve(root, "tools/compare/thunderPortable.ts"), "utf8");
    for (const token of [
      "for (let repeat = 1; repeat <= 2; repeat += 1)", "tools/run-mgba-probe.py",
      "gLightningSpriteTemplate", "thunderDisplayedTargetY2AtAge", "hardwareOam", "hardwarePalette",
      "framebuffer", "rawRgbSha256", "sceneOnThunderView", "render(engine)",
    ]) expect(portable).toContain(token);
  });

  it("keeps Tri Attack's own 284/284 bilateral maps, topology, cleanup, predecessor transfer, wrap, and material altered control", () => {
    const fixture = json("tools/compare/fixtures/tri-attack-evidence.json");
    expect(fixture).toMatchObject({
      schema: "tri-attack-bilateral-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_TRI_ATTACK",
      status: "unsupported-evidence", coverageCredit: false,
      acceptance: { freshRunsPerOrientation: 2, denseRows: { "player-back": 284, "opponent-front": 284 } },
      evidenceScope: { fullDenseRowsRetained: true, firstInactiveCleanupRetained: true, twiceFreshByteIdentical: true },
    });
    const expectedPhases = {
      triangle: [[3, 4, 84]],
      fire: [[4, 107, 135], [5, 107, 135], [7, 110, 138], [9, 113, 141], [10, 116, 144], [11, 119, 147], [12, 122, 150], [3, 125, 153]],
      lightning: [[3, 158, 185], [4, 161, 188], [5, 164, 191]],
      ice: [[3, 208, 244], [4, 214, 250], [5, 220, 256], [7, 226, 262], [9, 232, 268], [10, 238, 274], [11, 244, 280]],
      simplePaletteBlend: [[3, 86, 123], [12, 244, 281]],
      tasks: [[0, 48, 86], [0, 129, 146], [0, 186, 203]],
    };
    for (const [side, start, end, raw, map] of [
      ["player-back", 77, 360, "fb703918f565c8e7a615d95ca42d2f9e6223bd1aed43dbd22c1230d539c99ded", "458161ea456f9f13fe0f1a05126dab3dea42ae1c90a1ad418729d07f56c453f3"],
      ["opponent-front", 81, 364, "8aeca5bf6d6b15274a22f3699f0942743eaf964a78ecf9faf2e060ecd4202149", "04ce911b92f0bc848504357bb1847a0ef91b83a1df10886ba605191428f4814b"],
    ] as const) {
      const retained = fixture.orientations[side];
      expect(retained.sourceWindow).toEqual({ startFrame: start, endFrame: end, frameCount: 284, sourceFrameCount: 248 });
      expect(retained.rawRgbSequenceSha256).toBe(raw);
      expect(retained.repeatRawRgbSequenceSha256).toBe(raw);
      expect(retained.repeatProbeJsonSha256).toBe(retained.probeJsonSha256);
      expect(digest(retained.changeMap)).toBe(map);
      expect(retained.cleanup).toEqual({ age: 283, frame: end, active: false, visualTasks: 0, soundTasks: 0, ownedSprites: 0, ownedTasks: 0 });
      for (const [phase, values] of Object.entries(expectedPhases)) {
        const retainedRows = retained.lifecycle[phase].map((item: Json) => phase === "tasks"
          ? [item.slot, item.start, item.end] : [item.slot, item.start, item.end]);
        expect(retainedRows).toEqual(values);
      }
      expect(retained.latches).toMatchObject({
        hardwareOamEqualsPrecedingSoftware: "283/283", hardwareMatricesEqualsPrecedingSoftware: "283/283",
        hardwarePaletteEqualsPrecedingFaded: "283/283", hardwareOamExceptions: [],
        hardwareMatrixExceptions: [], hardwarePaletteExceptions: [],
      });
    }
    const production = triAttackProduction();
    const comparisons = production.comparisons as readonly Json[];
    expect(comparisons.map(({ orientation, totalRows, zeroRows, componentExactRows, residualPixels, peakResidualPixels, failures }) => ({
      orientation, totalRows, zeroRows, componentExactRows, residualPixels, peakResidualPixels, failureRows: failures.length,
    }))).toEqual([
      { orientation: "player-back", totalRows: 284, zeroRows: 284, componentExactRows: 284, residualPixels: 0, peakResidualPixels: 0, failureRows: 0 },
      { orientation: "opponent-front", totalRows: 284, zeroRows: 284, componentExactRows: 284, residualPixels: 0, peakResidualPixels: 0, failureRows: 0 },
    ]);
    const altered = production.alteredControl;
    expect(altered).toMatchObject({
      species: ["MAGBY", "ONIX"], sides: ["opponent", "player"],
      allocator: { triangleSlot: 15, triangleMatrixId: 11, effectSubpriority: 26 },
      geometry: { attackerPositionCenter: { x: 174, y: 44 }, targetPictureCenter: { x: 70, y: 89 } },
    });
    expect(altered.baseFramebufferSha256).not.toBe(altered.alteredFramebufferSha256);
  });

  it("keeps portable/source/evidence/production verifier obligations move-owned, preserves the import boundary, and grants no transfer credit", () => {
    const sourceAudit = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/triAttackSourceAudit.ts",
    ], { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 })) as Json;
    // The retained source/evidence receipt predates promotion.  It stays immutable;
    // the current exact state is pinned only by coverage below.
    expect(sourceAudit).toMatchObject({
      move: "MOVE_TRI_ATTACK", status: "unsupported-evidence", coverageCredit: false,
      pointerOwned: { root: { start: "0x82d4595", endExclusive: "0x82d4709" } },
      siblings: [
        { move: "MOVE_SCARY_FACE", status: "exact" }, { move: "MOVE_GLARE", status: "exact" },
        { move: "MOVE_THUNDER", status: "exact" }, { move: "MOVE_TRI_ATTACK", status: "unsupported" },
      ],
    });
    const triEvidence = readFileSync(resolve(root, "tools/compare/triAttackEvidence.ts"), "utf8");
    for (const token of [
      "tools/compare/triAttackSourceAudit.ts", "hardwareOamEqualsPrecedingSoftware", "283/283",
      "AnimTask_ShakeTargetInPattern", "rawRgbSequenceSha256", "repeatRawRgbSequenceSha256",
      "inheritedSiblingLatchFacts: false", "generalizedTransferFacts: false", "inferredSiblingCredit: false",
    ]) expect(triEvidence).toContain(token);
    const triProduction = readFileSync(resolve(root, "tools/compare/triAttackFramebuffer.ts"), "utf8");
    for (const token of [
      "Strict hermetic actual-core comparator", "triAttackRowsFor", "sceneOnTriAttackView",
      "createSceneOnMovePresentation", "render(engine)", "inspectTriAttackAlteredControl",
      "MAGBY", "ONIX", "spriteOrderSeed",
    ]) expect(triProduction).toContain(token);

    const seam = readFileSync(resolve(root, "src/animation/sceneOnPresentation.ts"), "utf8");
    for (const token of [
      "sceneOnScaryFaceView", "scaryFaceAtAge(", "sceneOnGlareView", "glareAtAge(",
      "sceneOnThunderView", "thunderAtAge(", "sceneOnTriAttackView", "triAttackAtAge(",
    ]) expect(seam).toContain(token);
    const compositor = readFileSync(resolve(root, "src/engine/battleScene.ts"), "utf8");
    for (const token of [
      "state.config.move === \"SCARY_FACE\"", "sceneOnScaryFaceView", "state.config.move === \"GLARE\"",
      "sceneOnGlareView", "state.config.move === \"THUNDER\"", "sceneOnThunderView",
      "state.config.move === \"TRI_ATTACK\"", "sceneOnTriAttackView", "TRI_ATTACK presentation requires opposite battler sides",
    ]) expect(compositor).toContain(token);
    expect(readFileSync(resolve(root, "src/engine/core.ts"), "utf8")).toContain("sceneOnPresentation");

    const latches = readFileSync(resolve(root, "ANIMATION_LATCHES.md"), "utf8");
    for (const token of [
      "The latch is per-MECHANISM", "Never inherit a latch from a sibling move.",
      "Default expectation where nothing is measured: visible events display ONE", "Tri Attack triangle / eight flames / dual target shakes / three lightning / seven ice crystals",
    ]) expect(latches).toContain(token);

    const coverage = json("ANIMATION_COVERAGE.json");
    expect(coverage.entries).toHaveLength(258);
    expect(coverage.entries.filter((entry: Json) => entry.status === "exact")).toHaveLength(258);
    expect(coverage.entries.filter((entry: Json) => entry.status === "partial" || entry.status === "staged")).toEqual([]);
    expect(["MOVE_SCARY_FACE", "MOVE_GLARE", "MOVE_THUNDER", "MOVE_TRI_ATTACK"].map((move) =>
      coverage.entries.find((entry: Json) => entry.move === move),
    )).toEqual([
      expect.objectContaining({ move: "MOVE_SCARY_FACE", status: "exact" }),
      expect.objectContaining({ move: "MOVE_GLARE", status: "exact" }),
      expect.objectContaining({ move: "MOVE_THUNDER", status: "exact" }),
      expect.objectContaining({ move: "MOVE_TRI_ATTACK", status: "exact" }),
    ]);
    expect(276 - coverage.entries.length).toBe(19);
    expect(coverage.componentTracks.filter((track: Json) => track.id === "shake-target-in-pattern-scary-face"))
      .toEqual([{
        id: "shake-target-in-pattern-scary-face", components: [...trackComponents],
        representatives: ["MOVE_SCARY_FACE", "MOVE_GLARE", "MOVE_THUNDER", "MOVE_TRI_ATTACK"],
        fulfilled: true, goal: trackGoal,
      }]);
    for (const excluded of [
      "Scary Face transfers", "Glare transfers", "Thunder transfers", "Tri Attack transfers",
      "generic transferred rule", "sibling credit",
    ]) expect(trackGoal).not.toContain(excluded);
    for (const required of [
      "no latch, timing, overwrite, palette, BG, sprite, task, audio, compositor, or acceptance fact transfers",
      "one display remains only the hypothesis", "MOVE_SCARY_FACE", "MOVE_GLARE", "MOVE_THUNDER", "MOVE_TRI_ATTACK",
    ]) expect(trackGoal).toContain(required);
  });
});
