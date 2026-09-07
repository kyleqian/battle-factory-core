import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Side = "player" | "opponent";

type Window = {
  readonly startFrame: number;
  readonly endFrame: number;
  readonly frameCount: number;
};

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

type ReversalFixture = {
  readonly schema: string;
  readonly oracleProfile: string;
  readonly scenario: string;
  readonly probe: string;
  readonly orientation: string;
  readonly move: string;
  readonly attacker: { readonly species: string; readonly geometry: { readonly side: Side } };
  readonly target: { readonly species: string; readonly geometry: { readonly side: Side } };
  readonly attackerPictureOffset: Readonly<{ x: number; y: number }>;
  readonly targetPictureOffset: Readonly<{ x: number; y: number }>;
  readonly resolvedShake: Readonly<{ kind: string; amplitude: number }>;
  readonly captureWindow: Window;
  readonly sourceWindow: Window;
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
};

type SwallowCheckpoint = {
  readonly schema: string;
  readonly oracleProfile: string;
  readonly setup: Readonly<Record<string, unknown>>;
  readonly sourceWindow: Window & { readonly rgbSequenceSha256: string };
  readonly branch: Readonly<Record<string, number>>;
  readonly lifecycleCounts: Readonly<Record<string, number>>;
  readonly audio: readonly string[];
  readonly cleanup: Readonly<Record<string, number>>;
  readonly attackerHpRange: Readonly<Record<string, number>>;
  readonly tagPresence: Readonly<Record<string, Readonly<Record<string, number | boolean>>>>;
  readonly topology: Readonly<Record<string, readonly string[]>>;
  readonly registerValues: Readonly<Record<string, readonly number[]>>;
};

type SwallowMatrixBranch = {
  readonly fixture: string;
  readonly freshReceiptSha256: readonly string[];
  readonly orientation: "player-back" | "opponent-front";
  readonly scenario: string;
  readonly stockpiles: 1 | 2 | 3;
};

const trackGoal = "FULFILLED: This exact ten-component boundary remains fulfilled only because MOVE_REVERSAL and MOVE_SWALLOW independently retain their own complete legal Battle Scene ON source bodies, typed seams, source-relative reducers, shared compositors, and twice-fresh dense receipts. MOVE_REVERSAL independently owns both 174/174 bilateral source/component, predecessor hardware OAM/matrix/palette, register, dual-audio, raw-RGB, and zero-residual shared-framebuffer bodies (451..624 player-back and 404..577 opponent-front), including two complex-palette lifecycles, six ReversalOrb callbacks, lunge/fist/IMPACT, and the already-resolved receipt-driven power shake; it receives that shake as input and never derives damage or battle state. MOVE_SWALLOW independently proves all six natural Stockpile branches through first inactive cleanup: player-back 163/178/193 and opponent-front 161/176/191 rows, each with 5/10/15 BLUE_ORB, four BLUE_STAR, deform, two ShakeMon2, audio, tag, selected matrix/OAM/palette latch, immutable-state, raw-RGB, and zero-residual production-framebuffer facts. Swallow grants Reversal no BLUE_STAR, deform, healing, Stockpile branch, or acceptance fact; Reversal grants Swallow no HANDS_AND_FEET, IMPACT, lunge, fist, hitsplat, palette, shake, random, timing, or acceptance fact. Shared BLUE_ORB components never waive either independent move acceptance or transfer a sibling latch.";

const reversalReceipts = [
  {
    fixturePath: "tools/compare/fixtures/reversal-player-vigoroth-opponent-delcatty.json",
    fixtureSha256: "c9407358a4ce28437db6abb1f9427b8889dac91559e37fbbb4371ff27ef53048",
    scenarioPath: "tools/battle-lab/mechanic-reversal-player-vigoroth-opponent-delcatty.json",
    scenarioSha256: "805878bcfbeae3f8708e72a178bd06b8a284afb755650d320ac8e14d92cf2229",
    orientation: "player-vigoroth-to-opponent-delcatty",
    side: "player" as const,
    captureWindow: { startFrame: 414, endFrame: 624, frameCount: 211 },
    sourceWindow: { startFrame: 451, endFrame: 624, frameCount: 174 },
    evidence: "f4f3dce725b38c7f857a76e6a8d890e983c680ca6032dcfaee5553f7cd5b3a0c",
    raw: "1a761bb08df97ee8b7732f58a46d6da5c249ea2a74495052e6ffabcd54ccb621",
    playerSetIds: [326, 327, 328],
    opponentSetIds: [267, 268, 269],
  },
  {
    fixturePath: "tools/compare/fixtures/reversal-player-delcatty-opponent-vigoroth.json",
    fixtureSha256: "e04c4b4a42711012852d2d5795e13f7c3aa4e7316e752d986fce137260b4e348",
    scenarioPath: "tools/battle-lab/mechanic-reversal-player-delcatty-opponent-vigoroth.json",
    scenarioSha256: "a12e063daa3c2e6c84516e3f4553b94a8e9b8bcb42dbf43655f0b93bd6333743",
    orientation: "opponent-vigoroth-to-player-delcatty",
    side: "opponent" as const,
    captureWindow: { startFrame: 363, endFrame: 577, frameCount: 215 },
    sourceWindow: { startFrame: 404, endFrame: 577, frameCount: 174 },
    evidence: "11937052c0e51f13725fbb42723c88d758979c38727e1deddf4a3686c1d82877",
    raw: "0f284e09df395d32a63702ebe3ab349b5edec829345a87b6ca92990dbb7623e1",
    playerSetIds: [267, 268, 269],
    opponentSetIds: [326, 327, 328],
  },
] as const;

const swallowReceipts = [
  {
    fixturePath: "tools/compare/fixtures/swallow-player-pelipper-one-stockpile-checkpoint.json",
    fixtureSha256: "c863ac1beb362972f036b7747f973eda3f630f478cee4ef3565c967bc0c417cb",
    scenarioPath: "tools/battle-lab/mechanic-swallow-player-pelipper-one-stockpile.json",
    scenarioSha256: "75bc0281dba2d51b846b1713780c89d873e50573e6609ec5a645960dc6e8153a",
    orientation: "player-back" as const, stockpiles: 1 as const, attacker: 0,
    sourceWindow: { startFrame: 1247, endFrame: 1409, frameCount: 163, rgbSequenceSha256: "1723b6d66528faf51a26facde57ab0e96ce7a564804f26da828428e29d5f95b8" },
    hp: 57, tagFrames: { blueOrb: 161, blueStar: 158 },
    playerSetIds: [213, 214, 215], opponentSetIds: [162, 163, 165],
  },
  {
    fixturePath: "tools/compare/fixtures/swallow-player-pelipper-two-stockpile-checkpoint.json",
    fixtureSha256: "d15231b88f93b930f63f46fbad6dbb3b2e79fbebb1e31b61da59a312f1659795",
    scenarioPath: "tools/battle-lab/mechanic-swallow-player-pelipper-two-stockpile.json",
    scenarioSha256: "d2692bf367b9f50b89779f1c17bcecbdaf9d46541b8ad65832cea6b4f75f8153",
    orientation: "player-back" as const, stockpiles: 2 as const, attacker: 0,
    sourceWindow: { startFrame: 2174, endFrame: 2351, frameCount: 178, rgbSequenceSha256: "f864b72c9e6580d45a8c9c63810d6e3a04828c8b231b9e747471fd7edf0590c4" },
    hp: 43, tagFrames: { blueOrb: 176, blueStar: 173 },
    playerSetIds: [213, 214, 215], opponentSetIds: [162, 163, 165],
  },
  {
    fixturePath: "tools/compare/fixtures/swallow-player-pelipper-three-stockpile-checkpoint.json",
    fixtureSha256: "357fddee8a847764322b07fcbc8d0827500a37a33fcd8899e471b7cff6ae5427",
    scenarioPath: "tools/battle-lab/mechanic-swallow-player-pelipper-three-stockpile.json",
    scenarioSha256: "f1575ea983b42897686caaf4a098a3def630a14894468e55d12bd7ebde035d0e",
    orientation: "player-back" as const, stockpiles: 3 as const, attacker: 0,
    sourceWindow: { startFrame: 2999, endFrame: 3191, frameCount: 193, rgbSequenceSha256: "f4e2c8b34d7b96529d2d24e787ed66d9ebf2311781a025427d231ea9aafc8b63" },
    hp: 89, tagFrames: { blueOrb: 191, blueStar: 188 },
    playerSetIds: [213, 214, 215], opponentSetIds: [162, 163, 165],
  },
  {
    fixturePath: "tools/compare/fixtures/swallow-opponent-pelipper-one-stockpile-checkpoint.json",
    fixtureSha256: "09a04f0fba54d8b7b834ae5e4c8b0f264545bb0ef11841a9329e310c2bf5506a",
    scenarioPath: "tools/battle-lab/mechanic-swallow-opponent-pelipper-one-stockpile.json",
    scenarioSha256: "5280e8da15dd11b16642321a47dd4d8e19347dbb4308b85a4ddd6fca1ce2e37b",
    orientation: "opponent-front" as const, stockpiles: 1 as const, attacker: 1,
    sourceWindow: { startFrame: 1140, endFrame: 1300, frameCount: 161, rgbSequenceSha256: "62ac89c01abcd2ab14d48b6a0ed3d75a840fa161ddab8b40d551afb7d5feeeba" },
    hp: 104, tagFrames: { blueOrb: 159, blueStar: 156 },
    playerSetIds: [162, 163, 165], opponentSetIds: [213, 214, 215],
  },
  {
    fixturePath: "tools/compare/fixtures/swallow-opponent-pelipper-two-stockpile-checkpoint.json",
    fixtureSha256: "c546ad617e7c69aaa8f8a7a0b25a018eb79fd7084abc4ed22b22bf97323a1fbd",
    scenarioPath: "tools/battle-lab/mechanic-swallow-opponent-pelipper-two-stockpile.json",
    scenarioSha256: "2ba1f9e08c65db57355e746b60355db28c70619f0439e939f0172c275ce49790",
    orientation: "opponent-front" as const, stockpiles: 2 as const, attacker: 1,
    sourceWindow: { startFrame: 2066, endFrame: 2241, frameCount: 176, rgbSequenceSha256: "be8e2bd5631e63d9259355b26a76c5437bc49936f6c391e23c269bfaf53ecc38" },
    hp: 137, tagFrames: { blueOrb: 174, blueStar: 171 },
    playerSetIds: [162, 163, 165], opponentSetIds: [213, 214, 215],
  },
  {
    fixturePath: "tools/compare/fixtures/swallow-opponent-pelipper-three-stockpile-checkpoint.json",
    fixtureSha256: "9fb266c28577258e096948985527fb67eef35935b08e064082d4afc9b7c489a1",
    scenarioPath: "tools/battle-lab/mechanic-swallow-opponent-pelipper-three-stockpile.json",
    scenarioSha256: "ca3f9f3ac07a3b993348edb0483318981870097991e330f4fba2599db583fce7",
    orientation: "opponent-front" as const, stockpiles: 3 as const, attacker: 1,
    sourceWindow: { startFrame: 6979, endFrame: 7169, frameCount: 191, rgbSequenceSha256: "002662dc153f5c0e8768b41c611184527bf4d0c8fd03593610ca29b50d63c96c" },
    hp: 104, tagFrames: { blueOrb: 189, blueStar: 186 },
    playerSetIds: [162, 163, 165], opponentSetIds: [213, 214, 215],
  },
] as const;

const monKeys = [
  "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature",
  "ppUps", "shiny", "species",
];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];
const allowedButtons = new Set(["A", "B", "DOWN", "LEFT", "RIGHT", "UP"]);

function json<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function digest(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function sourceBody(source: string, first: string, next: string): string {
  const start = source.indexOf(`${first}:`);
  const end = source.indexOf(`${next}:`, start + first.length + 1);
  if (start < 0 || end < 0) throw new Error(`missing ${first}/${next}`);
  return source.slice(start, end);
}

function pointer(symbols: string, symbol: string): string {
  const match = symbols.match(new RegExp(`^([0-9a-fA-F]+)\\s+\\w\\s+${symbol}$`, "m"));
  if (!match) throw new Error(`missing ${symbol}`);
  return `0x${match[1]!.toLowerCase()}`;
}

function expectCompleteParty(party: readonly BattleMon[]): void {
  expect(party).toHaveLength(3);
  for (const mon of party) {
    expect(Object.keys(mon).sort()).toEqual(monKeys.slice().sort());
    expect(Object.keys(mon.ivs).sort()).toEqual(statKeys);
    expect(Object.keys(mon.evs).sort()).toEqual(statKeys);
    expect(mon.level).toBe(50);
    expect(mon.moves).toHaveLength(4);
    expect(mon.ppUps).toEqual([0, 0, 0, 0]);
    expect(mon.abilitySlot).toBe(0);
    expect(["male", "female", "genderless"]).toContain(mon.gender);
    expect(mon.shiny).toBe(false);
    for (const transient of ["hp", "status", "stockpileCounter", "statStages"])
      expect(mon).not.toHaveProperty(transient);
  }
}

function expectOrdinaryPartyScenario(
  staged: Scenario,
  playerSetIds: readonly number[],
  opponentSetIds: readonly number[],
): void {
  expect(staged).toMatchObject({
    schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50,
    playerSetIds, opponentSetIds,
  });
  expect(Object.keys(staged.overrides)).toEqual(["parties"]);
  expect(Object.keys(staged.overrides.parties).sort()).toEqual(["opponent", "player"]);
  expectCompleteParty(staged.overrides.parties.player);
  expectCompleteParty(staged.overrides.parties.opponent);
  expect(staged.trace.segments).not.toHaveLength(0);
  expect(staged.trace.segments.every((segment) => (
    Number.isInteger(segment.frames)
    && segment.frames > 0
    && segment.buttons.every((button) => allowedButtons.has(button))
  ))).toBe(true);
  expect(staged.trace.segments.some((segment) => segment.buttons.includes("A"))).toBe(true);
  expect(staged.trace.captureFrames.length).toBeGreaterThan(0);
}

describe("blue-orb-reversal-evidence standalone fulfilled component-track ratchet", () => {
  it("pins the distinct authoritative Reversal and Swallow source bodies, intervals, tokens, and audits", () => {
    expect(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/swallowSourceAudit.ts",
    ], { encoding: "utf8" })).toBe(
      "MOVE_SWALLOW source checkpoint: exact even ROM interval 0x082d4b2e..0x082d4bda "
      + "(0xac bytes, sha256 0242f7d969eb4862f9335d6804dde42d3be39cfddfff34bd3a67cc05acf7dae9); "
      + "set 213 FRONTIER_MON_PELIPPER_1 is the lowest Level-50 carrier in challenge-1 range 162..266; "
      + "animTurn/stockpile 1,2,3 selects 5,10,15 BLUE_ORB sprites before shared four-BLUE_STAR HealingEffect; "
      + "SwallowDeformMon, ShakeMon2(1/0/8/2 then 2/0/12/1), TAKE_DOWN/SPIT_UP/ABSORB_2 audio, "
      + "tag unload and inactive cleanup are pinned; the source body owns no GPU registers.\n",
    );

    const symbols = execFileSync("arm-none-eabi-nm", [
      "-a", "reference/pokeemerald/pokeemerald.elf",
    ], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    expect({
      Move_REVERSAL: pointer(symbols, "Move_REVERSAL"),
      Move_PURSUIT: pointer(symbols, "Move_PURSUIT"),
      Move_SWALLOW: pointer(symbols, "Move_SWALLOW"),
      Move_TRANSFORM: pointer(symbols, "Move_TRANSFORM"),
      gReversalOrbSpriteTemplate: pointer(symbols, "gReversalOrbSpriteTemplate"),
      gHorizontalLungeSpriteTemplate: pointer(symbols, "gHorizontalLungeSpriteTemplate"),
      gFistFootSpriteTemplate: pointer(symbols, "gFistFootSpriteTemplate"),
      gBasicHitSplatSpriteTemplate: pointer(symbols, "gBasicHitSplatSpriteTemplate"),
      AnimTask_ShakeTargetBasedOnMovePowerOrDmg: pointer(symbols, "AnimTask_ShakeTargetBasedOnMovePowerOrDmg"),
      gSwallowBlueOrbSpriteTemplate: pointer(symbols, "gSwallowBlueOrbSpriteTemplate"),
      gSwallowDeformMonAffineAnimCmds: pointer(symbols, "gSwallowDeformMonAffineAnimCmds"),
      AnimSwallowBlueOrb: pointer(symbols, "AnimSwallowBlueOrb"),
      AnimTask_SwallowDeformMon: pointer(symbols, "AnimTask_SwallowDeformMon"),
      AnimTask_ShakeMon2: pointer(symbols, "AnimTask_ShakeMon2"),
      gHealingBlueStarSpriteTemplate: pointer(symbols, "gHealingBlueStarSpriteTemplate"),
    }).toEqual({
      Move_REVERSAL: "0x082ca8a5", Move_PURSUIT: "0x082ca980",
      Move_SWALLOW: "0x082d4b2e", Move_TRANSFORM: "0x082d4bda",
      gReversalOrbSpriteTemplate: "0x085ce5d8", gHorizontalLungeSpriteTemplate: "0x0857fe28",
      gFistFootSpriteTemplate: "0x08595e98", gBasicHitSplatSpriteTemplate: "0x08597358",
      AnimTask_ShakeTargetBasedOnMovePowerOrDmg: "0x080d6388",
      gSwallowBlueOrbSpriteTemplate: "0x085ce418", gSwallowDeformMonAffineAnimCmds: "0x085ce430",
      AnimSwallowBlueOrb: "0x0815b70c", AnimTask_SwallowDeformMon: "0x0815b778",
      AnimTask_ShakeMon2: "0x080d52d0", gHealingBlueStarSpriteTemplate: "0x08592f2c",
    });

    const scripts = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
    const reversal = sourceBody(scripts, "Move_REVERSAL", "Move_PURSUIT");
    const swallow = sourceBody(scripts, "Move_SWALLOW", "Move_TRANSFORM");
    expect(createHash("sha256").update(reversal).digest("hex"))
      .toBe("36e3ad241e1636968fc88360fb6631e7dffc9ad1c962f88d67c05b61302570a9");
    expect(createHash("sha256").update(swallow).digest("hex"))
      .toBe("88d17f417ffdd12d59484afdfc132c29e2cf09cde11862c9a13628ba908e2437");
    const rom = readFileSync("reference/pokeemerald/pokeemerald.gba");
    const reversalBytes = rom.subarray(0x2ca8a5, 0x2ca980);
    const swallowBytes = rom.subarray(0x2d4b2e, 0x2d4bda);
    expect([reversalBytes.length, createHash("sha256").update(reversalBytes).digest("hex")])
      .toEqual([0xdb, "62180037f0e61c6bc3dc9d433bf2d4242c4e28954644e8fa183ee1567fd6e5e5"]);
    expect([swallowBytes.length, createHash("sha256").update(swallowBytes).digest("hex")])
      .toEqual([0xac, "0242f7d969eb4862f9335d6804dde42d3be39cfddfff34bd3a67cc05acf7dae9"]);

    for (const token of [
      "loadspritegfx ANIM_TAG_BLUE_ORB", "loadspritegfx ANIM_TAG_HANDS_AND_FEET",
      "loadspritegfx ANIM_TAG_IMPACT", "complex_palette_blend", "blend_color_cycle",
      "playsewithpan SE_M_DETECT", "playsewithpan SE_M_REVERSAL",
      "playsewithpan SE_M_VITAL_THROW2, SOUND_PAN_TARGET",
      "gReversalOrbSpriteTemplate", "gHorizontalLungeSpriteTemplate", "create_fist_sprite",
      "create_basic_hitsplat_sprite", "AnimTask_ShakeTargetBasedOnMovePowerOrDmg", "waitforvisualfinish",
    ]) expect(reversal).toContain(token);
    expect((reversal.match(/createsprite gReversalOrbSpriteTemplate/g) ?? [])).toHaveLength(6);
    for (const token of [
      "loadspritegfx ANIM_TAG_BLUE_ORB", "loadspritegfx ANIM_TAG_BLUE_STAR",
      "playsewithpan SE_M_TAKE_DOWN", "AnimTask_SwallowDeformMon",
      "AnimTask_ShakeMon2, 2, ANIM_ATTACKER, 1, 0, 8, 2",
      "playsewithpan SE_M_SPIT_UP", "AnimTask_ShakeMon2, 2, ANIM_ATTACKER, 2, 0, 12, 1",
      "call SwallowEffect", "jumpifmoveturn 2, SwallowGood", "jumpifmoveturn 3, SwallowBest",
      "call HealingEffect", "SwallowEffect:", "SwallowGood:", "SwallowBest:",
    ]) expect(swallow).toContain(token);
    expect((swallow.match(/call SwallowEffect/g) ?? [])).toHaveLength(4);
    expect(sourceBody(scripts, "SwallowEffect", "SwallowGood").match(
      /createsprite gSwallowBlueOrbSpriteTemplate/g,
    )).toHaveLength(5);
    expect(reversal).not.toBe(swallow);
  });

  it("pins both 174-row Reversal receipts and all six natural Swallow receipt/topology/lifecycle/audio/tag bodies", () => {
    const reversalEvidence = readFileSync("tools/compare/reversalEvidence.ts", "utf8");
    const reversalPortable = readFileSync("tools/compare/reversalPortable.ts", "utf8");
    for (const expected of reversalReceipts) {
      const stored = json<ReversalFixture>(expected.fixturePath);
      expect(digest(expected.fixturePath)).toBe(expected.fixtureSha256);
      expect(digest(expected.scenarioPath)).toBe(expected.scenarioSha256);
      expect(stored).toMatchObject({
        schema: "scene-on-reversal-evidence/v2", oracleProfile: "battle-scene-on",
        scenario: expected.scenarioPath, probe: "tools/compare/reversalProbe.py",
        orientation: expected.orientation, move: "REVERSAL",
        attacker: { species: "VIGOROTH", geometry: { side: expected.side } },
        target: { species: "DELCATTY", geometry: { side: expected.side === "player" ? "opponent" : "player" } },
        resolvedShake: { kind: "resolved-power-shake", amplitude: 1 },
        captureWindow: expected.captureWindow, sourceWindow: expected.sourceWindow,
        evidenceSha256: expected.evidence, rawRgbSha256: expected.raw,
      });
      expect(stored.sourceWindow.endFrame - stored.sourceWindow.startFrame + 1)
        .toBe(174);
      expect(stored.captureWindow.endFrame - stored.captureWindow.startFrame + 1)
        .toBe(stored.captureWindow.frameCount);
    }
    expect(reversalReceipts.reduce((total, receipt) => total + receipt.sourceWindow.frameCount, 0))
      .toBe(348);
    for (const token of [
      "gComplexPaletteBlendSpriteTemplate", "gReversalOrbSpriteTemplate",
      "gHorizontalLungeSpriteTemplate", "gFistFootSpriteTemplate", "gBasicHitSplatSpriteTemplate",
      "AnimTask_BlendColorCycleLoop", "AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step",
      "AnimComplexPaletteBlend_Step1", "AnimComplexPaletteBlend_Step2", "AnimReversalOrb_Step",
      "sourceFrames.length !== 174", "evidence.lifecycleCounts.complexPaletteBlend !== 2",
      "evidence.lifecycleCounts.reversalOrb !== 6", "songHeaders", "missing ${name}",
    ]) expect(reversalEvidence).toContain(token);
    for (const token of [
      "probe.lifecycleCounts.complexPaletteBlend !== 2", "probe.lifecycleCounts.reversalOrb !== 6",
      "targetShake", "same(actual.hardwareOam, prior.softwareOam)",
      "same(actual.hardwarePalette, prior.fadedPalette)",
      "same(actual.hardwareMatrices[sprite.matrixNum], sprite.matrix)",
      "same(seam.resolvedShake, fixture.resolvedShake)", "components ${components}/174",
      "framebuffers}/174", "for (let pass = 0; pass < 2; pass += 1)",
    ]) expect(reversalPortable).toContain(token);

    const matrixPath = "tools/compare/fixtures/swallow-evidence-matrix.json";
    const matrix = json<{ readonly schema: string; readonly oracleProfile: string; readonly branches: readonly SwallowMatrixBranch[] }>(matrixPath);
    expect(digest(matrixPath)).toBe("aa57eea3a7ced1fefe4897ec8bd6e723b8ee7a69b13fbcf1e2c61afeae24fe3f");
    expect(matrix).toMatchObject({ schema: "swallow-natural-evidence-matrix/v1", oracleProfile: "battle-scene-on" });
    expect(matrix.branches.map((branch) => `${branch.orientation}/${branch.stockpiles}`)).toEqual(
      swallowReceipts.map((receipt) => `${receipt.orientation}/${receipt.stockpiles}`),
    );
    const playerCallbacks = [
      "AnimSpriteOnMonPos", "AnimSwallowBlueOrb", "SpriteCB_HealthBar", "SpriteCB_HealthBoxOther",
      "SpriteCB_SetInvisible", "SpriteCallbackDummy",
    ];
    const opponentCallbacks = [
      "AnimSpriteOnMonPos", "AnimSwallowBlueOrb", "SpriteCB_EnemyShadow", "SpriteCB_HealthBar",
      "SpriteCB_HealthBoxOther", "SpriteCallbackDummy",
    ];
    for (const expected of swallowReceipts) {
      const branch = matrix.branches.find((candidate) => (
        candidate.orientation === expected.orientation && candidate.stockpiles === expected.stockpiles
      ));
      expect(branch).toBeDefined();
      expect(branch!).toEqual({
        fixture: expected.fixturePath,
        freshReceiptSha256: [expected.fixtureSha256, expected.fixtureSha256],
        orientation: expected.orientation,
        scenario: expected.scenarioPath,
        stockpiles: expected.stockpiles,
      });
      expect(digest(expected.fixturePath)).toBe(expected.fixtureSha256);
      expect(digest(expected.scenarioPath)).toBe(expected.scenarioSha256);
      const receipt = json<SwallowCheckpoint>(expected.fixturePath);
      expect(receipt).toMatchObject({
        schema: "swallow-natural-checkpoint/v1", oracleProfile: "battle-scene-on",
        setup: {
          customPartiesBuiltBeforeBattle: true,
          playerLeadSetId: expected.orientation === "player-back" ? 213 : 162,
          opponentLeadSetId: expected.orientation === "player-back" ? 162 : 213,
        },
        sourceWindow: expected.sourceWindow,
        branch: {
          stockpiles: expected.stockpiles, animTurn: expected.stockpiles,
          orbWaves: expected.stockpiles, attackerBattler: expected.attacker,
          targetBattler: expected.attacker,
        },
        lifecycleCounts: { blueOrb: expected.stockpiles * 5, blueStar: 4, deform: 1, shake: 2 },
        audio: ["se_m_absorb_2", "se_m_spit_up", "se_m_take_down"],
        cleanup: { active: 0, visualTaskCount: 0, soundTaskCount: 0 },
        attackerHpRange: { minimum: expected.hp, maximum: expected.hp },
      });
      expect(receipt.sourceWindow.endFrame - receipt.sourceWindow.startFrame + 1)
        .toBe(expected.sourceWindow.frameCount);
      expect(receipt.tagPresence).toEqual({
        blueOrb: { absentAfterCleanup: true, paletteFrames: expected.tagFrames.blueOrb, tileFrames: expected.tagFrames.blueOrb },
        blueStar: { absentAfterCleanup: true, paletteFrames: expected.tagFrames.blueStar, tileFrames: expected.tagFrames.blueStar },
      });
      expect(receipt.topology.callbacks).toEqual(
        expected.orientation === "player-back" ? playerCallbacks : opponentCallbacks,
      );
      expect(receipt.topology.tasks).toEqual([
        "AnimTask_ShakeMon2_Step", "AnimTask_SwallowDeformMon",
      ]);
      expect(receipt.topology.templates).toEqual(expect.arrayContaining([
        "gHealingBlueStarSpriteTemplate", "gSwallowBlueOrbSpriteTemplate",
      ]));
      expect(receipt.registerValues).toEqual({
        bldcnt: [0], bldalpha: [0], bldy: [0], mosaic: [0], winin: [16191], winout: [16191],
      });
    }
    expect(swallowReceipts.reduce((total, receipt) => total + receipt.sourceWindow.frameCount, 0))
      .toBe(1062);
  });

  it("keeps every retained Reversal and Swallow receipt on complete legal three-Pokemon parties with ordinary inputs", () => {
    for (const expected of reversalReceipts) {
      const stored = json<ReversalFixture>(expected.fixturePath);
      const staged = json<Scenario>(expected.scenarioPath);
      expect(stored.scenario).toBe(expected.scenarioPath);
      expectOrdinaryPartyScenario(staged, expected.playerSetIds, expected.opponentSetIds);
      expect(staged).toMatchObject({
        challengeNum: 2, battleNum: 2, trainerId: 110, seed: 305419897,
        trace: {
          segments: [
            { frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] },
            { frames: 2, buttons: ["A"] }, { frames: 900, buttons: [] },
          ],
          captureFrames: [0, 934],
        },
      });
      const attacker = staged.overrides.parties[expected.side][0]!;
      expect(attacker).toMatchObject({ species: 365, moves: [179, 179, 179, 179] });
    }
    for (const expected of swallowReceipts) {
      const staged = json<Scenario>(expected.scenarioPath);
      expectOrdinaryPartyScenario(staged, expected.playerSetIds, expected.opponentSetIds);
      expect(staged).toMatchObject({
        challengeNum: 1, battleNum: 0, trainerId: 100, seed: 305419897,
      });
      const stockingSide: Side = expected.orientation === "player-back" ? "player" : "opponent";
      expect(staged.overrides.parties[stockingSide][0]!.moves).toEqual(expect.arrayContaining([254, 256]));
    }
  });

  it("keeps reducer, seam, compositor, portable verifier, and move-owned latch obligations load-bearing without transfer", () => {
    const reversal = readFileSync("src/animation/reversal.ts", "utf8");
    const swallow = readFileSync("src/animation/swallow.ts", "utf8");
    const seam = readFileSync("src/animation/sceneOnPresentation.ts", "utf8");
    const compositor = readFileSync("src/engine/battleScene.ts", "utf8");
    const reversalPortable = readFileSync("tools/compare/reversalPortable.ts", "utf8");
    const swallowPortable = readFileSync("tools/compare/swallowPortable.ts", "utf8");
    const latches = readFileSync("ANIMATION_LATCHES.md", "utf8");

    for (const token of [
      "Already clamped by the battle/controller owner; this reducer never reads damage.",
      "function targetShakeX2(", "targetX2: targetShakeX2(age, shake)",
      "Pure source-relative reducer for the complete 174-display Move_REVERSAL",
      "battlerDisplayAge: age - 1", "SE_M_DETECT", "SE_M_REVERSAL", "SE_M_VITAL_THROW2",
    ]) expect(reversal).toContain(token);
    for (const token of [
      "immutable caller input; this reducer never heals HP or mutates stockpile.",
      "export function swallowCleanupAge(", "for (let wave = 0; wave < stockpiles; wave += 1)",
      "const displayedAffineMatrix = affineMatrixAtAge(age - 2)",
      "attackerDisplayedY2: age === 48", "effectDisplayAge: age - 1",
    ]) expect(swallow).toContain(token);
    for (const token of [
      "Reversal never derives power or damage and never advances battle state.",
      "readonly resolvedShake: Readonly<ReversalResolvedShakeReceipt>",
      "Narrow self-targeted seam; the caller owns immutable Stockpile state.",
      "readonly stockpileCount: SwallowStockpileCount", "Stockpile presentation only; stat stages and Stockpile state stay external.",
    ]) expect(seam).toContain(token);
    for (const token of [
      "if (state.config.move === \"REVERSAL\")", "const targetDisplayed = sceneOnReversalView({",
      "const orbitPainterOrder", "if (state.config.move === \"SWALLOW\")",
      "const displayedBattler = sceneOnSwallowView({", "const displayedEffects = sceneOnSwallowView({",
      "drawSpriteSheetAffineRotate(", "opponentAttacker && swallowState.age === 0",
    ]) expect(compositor).toContain(token);
    for (const token of [
      "createScratchDir", "tools/run-mgba-probe.py", "compactSemanticReceiptSha256",
      "reversalAtAge", "sceneOnReversalView", "same(probe.sourceWindow, fixture.sourceWindow)",
      "same(actual.hardwareOam, prior.softwareOam)", "same(actual.hardwarePalette, prior.fadedPalette)",
      "same(actual.hardwareMatrices[sprite.matrixNum], sprite.matrix)", "rawDigest !== fixture.rawRgbSha256",
      "const engine: EngineState = {", "...createInitialState()", "const app = render(engine)", "fresh receipt diverged",
    ]) expect(reversalPortable).toContain(token);
    for (const token of [
      "createScratchDir", "tools/run-mgba-probe.py", "swallowAtAge", "sceneOnSwallowView",
      "renderSceneOnMovePresentation", "probe.lifecycleCounts.blueOrb !== row.stockpiles * 5",
      "probe.lifecycleCounts.blueStar !== 4", "probe.lifecycleCounts.deform !== 1",
      "probe.lifecycleCounts.shake !== 2", "selectedOam", "selectedMatrix", "selectedPalette",
      "same(actual.immutableState, immutable)", "same(actual.parties, parties)",
      "for (let pass = 0; pass < passes; pass += 1)", "if (requireExact && !allExact) process.exit(1)",
    ]) expect(swallowPortable).toContain(token);
    for (const token of [
      "The latch is per-MECHANISM", "Never inherit a latch from a sibling move.",
      "Default expectation where nothing is measured", "Sprite-driven `x2` / plain OAM edits / script-`createsprite` sprites",
      "Palette writes (`gPlttBufferFaded`)", "Freshly allocated OAM **affine matrix**",
    ]) expect(latches).toContain(token);

    expect(reversal).not.toContain("blueStar");
    expect(reversal).not.toContain("stockpile");
    for (const forbidden of ["handsAndFeet", "impact", "lunge", "fist", "hitsplat", "paletteBlend", "resolvedShake"])
      expect(swallow).not.toContain(forbidden);
    expect(reversalPortable).not.toContain("swallowAtAge");
    expect(swallowPortable).not.toContain("reversalAtAge");
    expect(trackGoal).toContain("Swallow grants Reversal no BLUE_STAR, deform, healing, Stockpile branch, or acceptance fact");
    expect(trackGoal).toContain("Reversal grants Swallow no HANDS_AND_FEET, IMPACT, lunge, fist, hitsplat, palette, shake, random, timing, or acceptance fact");
  });

  it("fulfills only the unchanged exact ten-component boundary at 235/276 and grants no move or sibling credit", () => {
    const coverage = json<{
      readonly entries: readonly { readonly move: string; readonly status: string; readonly covered: readonly string[] }[];
      readonly componentTracks: readonly unknown[];
    }>("ANIMATION_COVERAGE.json");
    const inventory = json<{ readonly tiers: { readonly level50: { readonly moves: readonly { readonly move: string }[] } } }>(
      "src/data/gen/factory-animation-inventory.json",
    );
    const level50Moves = new Set(inventory.tiers.level50.moves.map((entry) => entry.move));
    expect(level50Moves.size).toBe(276);
    expect(coverage.entries).toHaveLength(235);
    expect(coverage.entries.filter((entry) => level50Moves.has(entry.move) && entry.status === "exact"))
      .toHaveLength(235);
    expect(coverage.entries.filter((entry) => level50Moves.has(entry.move)
      && (entry.status === "partial" || entry.status === "staged"))).toEqual([]);
    const reversal = coverage.entries.find((entry) => entry.move === "MOVE_REVERSAL")!;
    const swallow = coverage.entries.find((entry) => entry.move === "MOVE_SWALLOW")!;
    expect([reversal, swallow]).toEqual([
      expect.objectContaining({ move: "MOVE_REVERSAL", status: "exact" }),
      expect.objectContaining({ move: "MOVE_SWALLOW", status: "exact" }),
    ]);
    expect(reversal.covered.join("\n")).not.toMatch(/BLUE_STAR|deform|HealingEffect|Stockpile branch/);
    expect(swallow.covered.join("\n")).not.toMatch(/HANDS_AND_FEET|IMPACT|lunge|fist|hitsplat|paletteBlend|resolvedShake/);
    expect(coverage.componentTracks.filter((track): track is Record<string, unknown> => (
      typeof track === "object" && track !== null && (track as { id?: unknown }).id === "blue-orb-reversal-evidence"
    ))).toEqual([{
      id: "blue-orb-reversal-evidence",
      components: [
        "asset:ANIM_TAG_BLUE_ORB", "asset:ANIM_TAG_HANDS_AND_FEET", "asset:ANIM_TAG_IMPACT",
        "sprite:gHorizontalLungeSpriteTemplate", "sprite:gReversalOrbSpriteTemplate",
        "task:AnimTask_ShakeTargetBasedOnMovePowerOrDmg", "visualCommand:blend_color_cycle",
        "visualCommand:complex_palette_blend", "visualCommand:create_basic_hitsplat_sprite",
        "visualCommand:create_fist_sprite",
      ],
      representatives: ["MOVE_REVERSAL", "MOVE_SWALLOW"],
      fulfilled: true,
      goal: trackGoal,
    }]);
  });
});
