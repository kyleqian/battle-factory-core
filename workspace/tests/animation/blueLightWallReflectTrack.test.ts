import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compactSemanticReceiptSha256 } from "../../tools/compare/semanticReceipt.ts";

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

type ReflectReceipt = {
  readonly schema: string;
  readonly scenario: string;
  readonly probe: string;
  readonly orientation: string;
  readonly denseWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly wallFrame: number;
  };
  readonly attacker: { readonly species: string; readonly geometry: Geometry };
  readonly target: { readonly species: string; readonly geometry: Geometry };
  readonly allocatorProfile: { readonly wall: number; readonly sparkles: readonly number[] };
  readonly fieldProfile: {
    readonly playerHp: number;
    readonly playerMaxHp: number;
    readonly opponentHp: number;
    readonly opponentMaxHp: number;
    readonly playerGender: string;
    readonly opponentGender: string;
  };
};

type BrickBreakReceipt = {
  readonly schema: string;
  readonly oracleProfile: string;
  readonly orientation: string;
  readonly scenario: string;
  readonly probe: string;
  readonly sourceWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
  };
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
};

type CrushClawReceipt = {
  readonly schema: string;
  readonly oracleProfile: string;
  readonly move: string;
  readonly pair: string;
  readonly orientation: string;
  readonly scenario: string;
  readonly probe: string;
  readonly appStage: { readonly presentationAge: number };
  readonly denseWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
  };
  readonly attacker: { readonly species: string; readonly geometry: Geometry };
  readonly target: { readonly species: string; readonly geometry: Geometry };
  readonly fieldProfile: {
    readonly playerHp: number;
    readonly playerMaxHp: number;
    readonly opponentHp: number;
    readonly opponentMaxHp: number;
    readonly playerGender: string;
    readonly opponentGender: string;
  };
  readonly evidenceSchema: string;
  readonly evidenceSha256: string;
  readonly secondFreshEvidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly acceptance: {
    readonly status: string;
    readonly framebufferMatching: number;
    readonly componentMatching: number;
  };
};

const trackComponents = [
  "asset:ANIM_TAG_BLUE_LIGHT_WALL",
  "asset:ANIM_TAG_SPARKLE_4",
  "sprite:gReflectWallSpriteTemplate",
  "sprite:gReflectSparkleSpriteTemplate",
] as const;

const trackGoal = "FULFILLED: This exact four-component boundary remains fulfilled only because MOVE_REFLECT, MOVE_BRICK_BREAK, and MOVE_CRUSH_CLAW independently retain source-derived reducers, typed seams, production compositors, complete legal bilateral Battle Scene ON fixtures, and twice-fresh dense source/component/hardware/audio/raw-RGB/actual-core framebuffer proof. MOVE_REFLECT independently owns its unthinned 208/208 player-back frames 39-246 and 211/211 opponent-front frames 39-249 Move_REFLECT 0x082d009f..Move_BARRIER 0x082d00f2 body: BLUE_LIGHT_WALL, three SPARKLE_4 lifecycles, alpha/palette rotation, opponent visibility, Reflect audio, tags, predecessor OAM/palette transfer, registers, and first inactive cleanup. MOVE_BRICK_BREAK independently owns four natural controller-selected Move_BRICK_BREAK 0x082ce092..Move_YAWN 0x082ce253 bodies: 151/151 normal player-back/opponent-front and 192/192 Reflect-shattered player-back/opponent-front rows, with semantic/raw-RGB receipts, normal wall/shard lifecycle 0/0 and shattered lifecycle 1/4, lunge, hitsplats, fist, TORN_METAL wall/shards, palette, monbg, audio, hardware, registers, and cleanup. MOVE_CRUSH_CLAW independently owns its bilateral 69/69 Move_CRUSH_CLAW 0x082ceaf7..Move_AROMATHERAPY 0x082ceb66 lunge, source-observed ShakeMon2, four-claw-slash, audio, map, hardware/state, raw-RGB, and actual-core framebuffer body. Crush Claw loads BLUE_LIGHT_WALL and TORN_METAL but instantiates no Reflect or Brick Break wall template and receives no wall-body credit. Reflect transfers no sparkle, wall, palette, timing, or latch fact to Brick Break or Crush Claw; Brick Break transfers no TORN_METAL wall, shard, branch, monbg, lunge, palette, timing, or latch fact; Crush Claw transfers no lunge, shake, claw, timing, or latch fact. Shared components waive no move-owned acceptance.";

const reflectReceipts = [
  {
    fixturePath: "tools/compare/fixtures/reflect-player-shuppet-opponent-shuckle.json",
    fixtureSha256: "c4a1bee01563d97742d5ca94ba131cd19585b41cfeeddb97a1cf64d4b8b95b20",
    scenarioPath: "tools/battle-lab/mechanic-reflect-player-shuppet-opponent-shuckle.json",
    scenarioSha256: "974f13d5da8cff168d991002da9f494b5b1c050ec3253ef41ba52426adfdc93a",
    orientation: "player-to-opponent",
    attackerSide: "player" as const,
    window: { startFrame: 39, endFrame: 246, wallFrame: 72 },
    attackerGeometry: {
      side: "player" as const,
      spriteCorner: { x: 40, y: 56 },
      animationCenter: { x: 72, y: 88 },
      battlePositionCenter: { x: 72, y: 80 },
    },
    targetGeometry: {
      side: "opponent" as const,
      spriteCorner: { x: 144, y: 17 },
      animationCenter: { x: 176, y: 49 },
      battlePositionCenter: { x: 176, y: 40 },
    },
    fieldProfile: {
      playerHp: 167, playerMaxHp: 167, opponentHp: 127, opponentMaxHp: 127,
      playerGender: "female", opponentGender: "male",
    },
  },
  {
    fixturePath: "tools/compare/fixtures/reflect-opponent-shuppet-player-shuckle.json",
    fixtureSha256: "8d29de481b59eef8ae59d0f2c25257a92f7570b620727b9ef96572c643cc0676",
    scenarioPath: "tools/battle-lab/mechanic-reflect-opponent-shuppet-player-shuckle.json",
    scenarioSha256: "58bd81a81aa1535e672e9327aed1a4955731b65c625edae3781887c42c0a91d7",
    orientation: "opponent-to-player",
    attackerSide: "opponent" as const,
    window: { startFrame: 39, endFrame: 249, wallFrame: 76 },
    attackerGeometry: {
      side: "opponent" as const,
      spriteCorner: { x: 144, y: 20 },
      animationCenter: { x: 176, y: 52 },
      battlePositionCenter: { x: 176, y: 40 },
    },
    targetGeometry: {
      side: "player" as const,
      spriteCorner: { x: 40, y: 59 },
      animationCenter: { x: 72, y: 91 },
      battlePositionCenter: { x: 72, y: 80 },
    },
    fieldProfile: {
      playerHp: 127, playerMaxHp: 127, opponentHp: 167, opponentMaxHp: 167,
      playerGender: "male", opponentGender: "female",
    },
  },
] as const;

const brickBreakReceipts = [
  {
    fixturePath: "tools/compare/fixtures/brick-break-normal-player-lombre-opponent-onix.json",
    fixtureSha256: "f3796f763b261fd4c1384bf35f0b4f049b9e06e8f79537dc92411289599bd8c3",
    scenarioPath: "tools/battle-lab/mechanic-brick-break-normal-player-lombre-opponent-onix.json",
    scenarioSha256: "78b48090dde3b74669b3ae1226f7fb58de862524bf5bbd9199b5678a723f3256",
    body: "normal",
    orientation: "player-back",
    attackerSide: "player" as const,
    window: { startFrame: 234, endFrame: 384, frameCount: 151 },
    evidence: "ad3d3e90b70fde1595dda316a773e887f17123df5ad5815086159ddb52398b5d",
    raw: "67687eb221c4efb306fdca646b78fd181469aa22ef98e48d7006b4a9ec2c27cb",
    lifecycle: { wall: 0, shard: 0 },
  },
  {
    fixturePath: "tools/compare/fixtures/brick-break-normal-opponent-lombre-player-onix.json",
    fixtureSha256: "696e3bf1e4fe20c3d4665246dd2da0c522ba90bde51f903e8bbe34b4ee0e3ffb",
    scenarioPath: "tools/battle-lab/mechanic-brick-break-normal-opponent-lombre-player-onix.json",
    scenarioSha256: "d012093e4c294c42ebdc1a7bbca72f97254d9edf5b1726211fec50276ea6c84c",
    body: "normal",
    orientation: "opponent-front",
    attackerSide: "opponent" as const,
    window: { startFrame: 220, endFrame: 370, frameCount: 151 },
    evidence: "b1ac1081da160add8d9e92f878e3051199a909987735dc5bf06cd921bb1f8fab",
    raw: "4a03768b6549b364296e3639833e7c5d0cd6dedcec567ee62f20e32fd94c2645",
    lifecycle: { wall: 0, shard: 0 },
  },
  {
    fixturePath: "tools/compare/fixtures/brick-break-player-lombre-opponent-onix.json",
    fixtureSha256: "0c7b6fabe4b0f9742366a76f4d9ec52a554c229d404e3c0bf98890ecb79fff14",
    scenarioPath: "tools/battle-lab/mechanic-brick-break-player-lombre-opponent-onix.json",
    scenarioSha256: "91fcc4cecb9986382a54bf04c1d0402440740f24e77a6c51fd4f80e14bcad6f0",
    body: "shattered-wall",
    orientation: "player-back",
    attackerSide: "player" as const,
    window: { startFrame: 288, endFrame: 479, frameCount: 192 },
    evidence: "e484e602be861db10e4042c2a6de75e5f6e261e533515d48d8597637db5c4697",
    raw: "e1b36f8036f30386af0c7cdaac9645f73bb9eb526802c3179e745871cf637363",
    lifecycle: { wall: 1, shard: 4 },
  },
  {
    fixturePath: "tools/compare/fixtures/brick-break-opponent-lombre-player-onix.json",
    fixtureSha256: "b916d8b473f35a80fcb503a41b38b0197cdc4a6148cf4bcf48b31c640066c9ab",
    scenarioPath: "tools/battle-lab/mechanic-brick-break-opponent-lombre-player-onix.json",
    scenarioSha256: "a5504e1ed5ab1e441cbc8ca1c76bfc5d1eed6ec634b332bff3c540f246272c38",
    body: "shattered-wall",
    orientation: "opponent-front",
    attackerSide: "opponent" as const,
    window: { startFrame: 289, endFrame: 480, frameCount: 192 },
    evidence: "f0314f159cb9b141c107cbe078382ebb4ff7379c4ce2c835aa9b921c65bbe27a",
    raw: "8402d60c9605e852c0f099dbc617c80dc21d005097ed1985395b647564ae23bc",
    lifecycle: { wall: 1, shard: 4 },
  },
] as const;

const crushClawReceipts = [
  {
    fixturePath: "tools/compare/fixtures/crush-claw-player-grovyle-opponent-onix.json",
    fixtureSha256: "7d810abf3df16e6d2ffba46b61fba660baad6288b1d6a5c19081664c718b89e2",
    scenarioPath: "tools/battle-lab/mechanic-crush-claw-player-grovyle-opponent-onix.json",
    scenarioSha256: "00e9e60805292cb885ea9f393affcfd0f09ffaba00380ab6cfb32e24f48f9a78",
    orientation: "player-to-opponent",
    attackerSide: "player" as const,
    window: { startFrame: 77, endFrame: 145, frameCount: 69 },
    attackerGeometry: {
      side: "player" as const,
      spriteCorner: { x: 40, y: 56 },
      animationCenter: { x: 72, y: 88 },
      battlePositionCenter: { x: 72, y: 80 },
    },
    targetGeometry: {
      side: "opponent" as const,
      spriteCorner: { x: 144, y: 10 },
      animationCenter: { x: 176, y: 42 },
      battlePositionCenter: { x: 176, y: 40 },
    },
    fieldProfile: {
      playerHp: 146, playerMaxHp: 146, opponentHp: 142, opponentMaxHp: 142,
      playerGender: "male", opponentGender: "male",
    },
    evidence: "515abad038862c35a86d480f333560459f83bc103687837187f9448e1b7c6f06",
    raw: "9e2c28d1edc910be89d157035334f10c234b92f4c3b3a72e240bfe922dd52508",
    mapPath: "tools/compare/evidence/crush-claw-changemap-player.txt",
    mapSha256: "2153040a09ff8249c894f15105255e8002a01a752e51314a19839c5df7d9d6e6",
  },
  {
    fixturePath: "tools/compare/fixtures/crush-claw-opponent-grovyle-player-onix.json",
    fixtureSha256: "3255b094e52208e550aa5ab93fb86765bab9cea201a419229cd76aafab3e3b3f",
    scenarioPath: "tools/battle-lab/mechanic-crush-claw-opponent-grovyle-player-onix.json",
    scenarioSha256: "f70623665e0d89cd657734af28d0028213081f708b998fffcdebdac7c420465b",
    orientation: "opponent-to-player",
    attackerSide: "opponent" as const,
    window: { startFrame: 81, endFrame: 149, frameCount: 69 },
    attackerGeometry: {
      side: "opponent" as const,
      spriteCorner: { x: 144, y: 12 },
      animationCenter: { x: 176, y: 44 },
      battlePositionCenter: { x: 176, y: 40 },
    },
    targetGeometry: {
      side: "player" as const,
      spriteCorner: { x: 40, y: 48 },
      animationCenter: { x: 72, y: 88 },
      battlePositionCenter: { x: 72, y: 80 },
    },
    fieldProfile: {
      playerHp: 142, playerMaxHp: 142, opponentHp: 146, opponentMaxHp: 146,
      playerGender: "male", opponentGender: "male",
    },
    evidence: "639bdc9ad5a4809e603582a9de27b328f5c8d119707411aee4b41526411ab229",
    raw: "b61b5eb2e20bd83c44016e40b389553ca2fa068526450911b010bea110407f69",
    mapPath: "tools/compare/evidence/crush-claw-changemap-opponent.txt",
    mapSha256: "48c15852ff59b26d11c1d6c08b391d92621cc652c4fc12ca489e3cd9bcd66c4b",
  },
] as const;

const scenarioExpectations = [
  {
    path: "tools/battle-lab/mechanic-reflect-player-shuppet-opponent-shuckle.json",
    sha256: "974f13d5da8cff168d991002da9f494b5b1c050ec3253ef41ba52426adfdc93a",
    playerSetIds: [187, 186, 185], opponentSetIds: [135, 188, 184],
    idleFrames: 500, captureFrames: [0, 534], attackerSide: "player" as const,
    attacker: { species: 354, move: 115 }, target: { species: 213, move: 33 },
  },
  {
    path: "tools/battle-lab/mechanic-reflect-opponent-shuppet-player-shuckle.json",
    sha256: "58bd81a81aa1535e672e9327aed1a4955731b65c625edae3781887c42c0a91d7",
    playerSetIds: [135, 188, 184], opponentSetIds: [187, 186, 185],
    idleFrames: 500, captureFrames: [0, 534], attackerSide: "opponent" as const,
    attacker: { species: 354, move: 115 }, target: { species: 213, move: 33 },
  },
  {
    path: "tools/battle-lab/mechanic-brick-break-normal-player-lombre-opponent-onix.json",
    sha256: "78b48090dde3b74669b3ae1226f7fb58de862524bf5bbd9199b5678a723f3256",
    playerSetIds: [131, 130, 129], opponentSetIds: [135, 140, 141],
    idleFrames: 600, captureFrames: [0, 634], attackerSide: "player" as const,
    attacker: { species: 296, move: 280 }, target: { species: 95, move: 33 },
  },
  {
    path: "tools/battle-lab/mechanic-brick-break-normal-opponent-lombre-player-onix.json",
    sha256: "d012093e4c294c42ebdc1a7bbca72f97254d9edf5b1726211fec50276ea6c84c",
    playerSetIds: [135, 140, 141], opponentSetIds: [131, 130, 129],
    idleFrames: 600, captureFrames: [0, 634], attackerSide: "opponent" as const,
    attacker: { species: 296, move: 280 }, target: { species: 95, move: 33 },
  },
  {
    path: "tools/battle-lab/mechanic-brick-break-player-lombre-opponent-onix.json",
    sha256: "91fcc4cecb9986382a54bf04c1d0402440740f24e77a6c51fd4f80e14bcad6f0",
    playerSetIds: [131, 130, 129], opponentSetIds: [135, 140, 141],
    idleFrames: 600, captureFrames: [0, 634], attackerSide: "player" as const,
    attacker: { species: 296, move: 280 }, target: { species: 95, move: 115 },
  },
  {
    path: "tools/battle-lab/mechanic-brick-break-opponent-lombre-player-onix.json",
    sha256: "a5504e1ed5ab1e441cbc8ca1c76bfc5d1eed6ec634b332bff3c540f246272c38",
    playerSetIds: [135, 140, 141], opponentSetIds: [131, 130, 129],
    idleFrames: 600, captureFrames: [0, 634], attackerSide: "opponent" as const,
    attacker: { species: 296, move: 280 }, target: { species: 95, move: 115 },
  },
  {
    path: "tools/battle-lab/mechanic-crush-claw-player-grovyle-opponent-onix.json",
    sha256: "00e9e60805292cb885ea9f393affcfd0f09ffaba00380ab6cfb32e24f48f9a78",
    playerSetIds: [161, 162, 163], opponentSetIds: [156, 157, 158],
    idleFrames: 600, captureFrames: [0, 100, 200, 300, 634], attackerSide: "player" as const,
    attacker: { species: 278, move: 306 }, target: { species: 95, move: 33 },
  },
  {
    path: "tools/battle-lab/mechanic-crush-claw-opponent-grovyle-player-onix.json",
    sha256: "f70623665e0d89cd657734af28d0028213081f708b998fffcdebdac7c420465b",
    playerSetIds: [161, 162, 163], opponentSetIds: [156, 157, 158],
    idleFrames: 600, captureFrames: [0, 100, 200, 300, 634], attackerSide: "opponent" as const,
    attacker: { species: 278, move: 306 }, target: { species: 95, move: 33 },
  },
] as const;

const monKeys = [
  "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature",
  "ppUps", "shiny", "species",
];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];

function json<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function digest(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function sourceBody(source: string, first: string, next: string): string {
  const start = source.indexOf(first + ":");
  const end = source.indexOf(next + ":", start + first.length + 1);
  if (start < 0 || end < 0) throw new Error("missing source body " + first + "/" + next);
  return source.slice(start, end);
}

function pointer(symbols: string, symbol: string): string {
  const match = symbols.match(new RegExp("^([0-9a-fA-F]+)\\s+\\w\\s+" + symbol + "$", "m"));
  if (!match) throw new Error("missing ELF symbol " + symbol);
  return "0x" + match[1]!.toLowerCase();
}

function expectCompleteLegalParty(party: readonly BattleMon[]): void {
  expect(party).toHaveLength(3);
  for (const mon of party) {
    expect(Object.keys(mon).sort()).toEqual(monKeys.slice().sort());
    expect(Object.keys(mon.ivs).sort()).toEqual(statKeys);
    expect(Object.keys(mon.evs).sort()).toEqual(statKeys);
    expect(mon.level).toBe(50);
    expect(Number.isInteger(mon.species) && mon.species > 0).toBe(true);
    expect(Number.isInteger(mon.nature) && mon.nature >= 0 && mon.nature < 25).toBe(true);
    expect(Object.values(mon.ivs).every((value) => (
      Number.isInteger(value) && value >= 0 && value <= 31
    ))).toBe(true);
    expect(Object.values(mon.evs).every((value) => (
      Number.isInteger(value) && value >= 0 && value <= 255
    ))).toBe(true);
    expect(Object.values(mon.evs).reduce((total, value) => total + value, 0)).toBeLessThanOrEqual(510);
    expect(mon.moves).toHaveLength(4);
    expect(mon.moves.every((move) => Number.isInteger(move) && move > 0)).toBe(true);
    expect(mon.ppUps).toEqual([0, 0, 0, 0]);
    expect(mon.item).toBeGreaterThanOrEqual(0);
    expect(mon.abilitySlot).toBe(0);
    expect(mon.friendship).toBe(70);
    expect(["male", "female", "genderless"]).toContain(mon.gender);
    expect(mon.shiny).toBe(false);
    for (const transient of [
      "hp", "currentHp", "status", "status1", "status2", "statStages",
      "weather", "sideConditions", "outcome",
    ]) expect(mon).not.toHaveProperty(transient);
  }
}

describe("blue-light-wall-reflect standalone fulfilled component-track ratchet", () => {
  it("pins the exact authoritative source bodies, ELF intervals, audit output, and no-wall transfer", () => {
    const reflectAudit = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/reflectSourceAudit.ts",
    ], { encoding: "utf8" })) as Record<string, unknown>;
    expect(reflectAudit).toEqual({
      move: "MOVE_REFLECT",
      body: "wall + three SPARKLE_4 sprites + alpha/audio/teardown",
      siblingsRemainIndependent: {
        MOVE_BRICK_BREAK: "exact independently through normal and separate gBrickBreakWall/shard shattered-wall bodies",
        MOVE_CRUSH_CLAW: "exact independently through its lunge/ShakeMon2/four claw-slash body; it loads BLUE_LIGHT_WALL yet creates no wall template",
      },
    });
    expect(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/brickBreakSourceAudit.ts",
    ], { encoding: "utf8" })).toBe(
      "TORN_METAL audit: Brick Break 46 L50 carriers, lowest set 131/FRONTIER_MON_LOMBRE; "
      + "normal plus four-shard wall bodies exact; Crush Claw 11-carrier lunge/ShakeMon2/"
      + "four-claw body exact, loads BLUE_LIGHT_WALL but instantiates no wall body\n",
    );

    const symbols = execFileSync("arm-none-eabi-nm", [
      "-a", "reference/pokeemerald/pokeemerald.elf",
    ], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    expect({
      Move_REFLECT: pointer(symbols, "Move_REFLECT"),
      Move_BARRIER: pointer(symbols, "Move_BARRIER"),
      Move_BRICK_BREAK: pointer(symbols, "Move_BRICK_BREAK"),
      Move_YAWN: pointer(symbols, "Move_YAWN"),
      Move_CRUSH_CLAW: pointer(symbols, "Move_CRUSH_CLAW"),
      Move_AROMATHERAPY: pointer(symbols, "Move_AROMATHERAPY"),
      gReflectWallSpriteTemplate: pointer(symbols, "gReflectWallSpriteTemplate"),
      gReflectSparkleSpriteTemplate: pointer(symbols, "gReflectSparkleSpriteTemplate"),
      gBrickBreakWallSpriteTemplate: pointer(symbols, "gBrickBreakWallSpriteTemplate"),
      gBrickBreakWallShardSpriteTemplate: pointer(symbols, "gBrickBreakWallShardSpriteTemplate"),
      gHorizontalLungeSpriteTemplate: pointer(symbols, "gHorizontalLungeSpriteTemplate"),
      gClawSlashSpriteTemplate: pointer(symbols, "gClawSlashSpriteTemplate"),
      AnimDefensiveWall: pointer(symbols, "AnimDefensiveWall"),
      AnimWallSparkle: pointer(symbols, "AnimWallSparkle"),
      AnimBrickBreakWall: pointer(symbols, "AnimBrickBreakWall"),
      AnimBrickBreakWallShard: pointer(symbols, "AnimBrickBreakWallShard"),
      AnimTask_WindUpLunge: pointer(symbols, "AnimTask_WindUpLunge"),
      AnimTask_ShakeMon2: pointer(symbols, "AnimTask_ShakeMon2"),
      AnimClawSlash: pointer(symbols, "AnimClawSlash"),
    }).toEqual({
      Move_REFLECT: "0x082d009f", Move_BARRIER: "0x082d00f2",
      Move_BRICK_BREAK: "0x082ce092", Move_YAWN: "0x082ce253",
      Move_CRUSH_CLAW: "0x082ceaf7", Move_AROMATHERAPY: "0x082ceb66",
      gReflectWallSpriteTemplate: "0x08596578",
      gReflectSparkleSpriteTemplate: "0x085965f4",
      gBrickBreakWallSpriteTemplate: "0x08595f90",
      gBrickBreakWallShardSpriteTemplate: "0x08595fa8",
      gHorizontalLungeSpriteTemplate: "0x0857fe28",
      gClawSlashSpriteTemplate: "0x08597138",
      AnimDefensiveWall: "0x0810f1ec", AnimWallSparkle: "0x0810f58c",
      AnimBrickBreakWall: "0x0810d40c", AnimBrickBreakWallShard: "0x0810d4f4",
      AnimTask_WindUpLunge: "0x080d5c50", AnimTask_ShakeMon2: "0x080d52d0",
      AnimClawSlash: "0x081144bc",
    });

    const scripts = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
    const reflect = sourceBody(scripts, "Move_REFLECT", "Move_BARRIER");
    const brickBreak = sourceBody(scripts, "Move_BRICK_BREAK", "Move_YAWN");
    const crushClaw = sourceBody(scripts, "Move_CRUSH_CLAW", "Move_AROMATHERAPY");
    const rom = readFileSync("reference/pokeemerald/pokeemerald.gba");
    const bodies = [
      {
        text: reflect, bytes: rom.subarray(0x2d009f, 0x2d00f2), textSha256: "ef8b6cdb0fc4b926832b936356d5b060841c6f5dc724f8007ef961d5b379cc1f",
        byteSha256: "ef622300c78c06ef4c26b76a2d41cf52d1921d02da94475ebfb3749d0e88f797", byteLength: 83,
      },
      {
        text: brickBreak, bytes: rom.subarray(0x2ce092, 0x2ce253), textSha256: "1b13632f40e92742816f6d637c6a893e1f3d213fd00f161ea36791afb0fa6d5d",
        byteSha256: "3bd8694f2c46b7b9416b50b9445b82fd091aeb176300b96c1bc95404529eb9db", byteLength: 449,
      },
      {
        text: crushClaw, bytes: rom.subarray(0x2ceaf7, 0x2ceb66), textSha256: "8886ccc17acd3c8eaa2f47cb8eac953547e7ee7fd7dc82102c33dd3ded1486ef",
        byteSha256: "f96286033cacc8aaaf75c5b63d5a911a4a7d6a7e5f07e5f84b5c5944ceb5e6f5", byteLength: 111,
      },
    ];
    for (const body of bodies) {
      expect(createHash("sha256").update(body.text).digest("hex")).toBe(body.textSha256);
      expect([body.bytes.length, createHash("sha256").update(body.bytes).digest("hex")])
        .toEqual([body.byteLength, body.byteSha256]);
    }

    for (const token of [
      "loadspritegfx ANIM_TAG_SPARKLE_4", "loadspritegfx ANIM_TAG_BLUE_LIGHT_WALL",
      "setalpha 0, 16", "waitplaysewithpan SE_M_REFLECT, SOUND_PAN_ATTACKER, 15",
      "createsprite gReflectWallSpriteTemplate, ANIM_ATTACKER, 1, 40, 0, ANIM_TAG_BLUE_LIGHT_WALL",
      "createsprite gReflectSparkleSpriteTemplate, ANIM_ATTACKER, 2, 30, 0, ANIM_ATTACKER, TRUE",
      "createsprite gReflectSparkleSpriteTemplate, ANIM_ATTACKER, 2, 19, -12, ANIM_ATTACKER, TRUE",
      "createsprite gReflectSparkleSpriteTemplate, ANIM_ATTACKER, 2, 10, 20, ANIM_ATTACKER, TRUE",
      "blendoff",
    ]) expect(reflect).toContain(token);
    expect((reflect.match(/createsprite gReflectSparkleSpriteTemplate/g) ?? [])).toHaveLength(3);
    for (const token of [
      "loadspritegfx ANIM_TAG_TORN_METAL",
      "choosetwoturnanim BrickBreakNormal, BrickBreakShatteredWall",
      "BrickBreakNormal:", "BrickBreakShatteredWall:", "gHorizontalLungeSpriteTemplate",
      "createvisualtask AnimTask_WindUpLunge", "simple_palette_blend",
      "gBrickBreakWallSpriteTemplate", "gBrickBreakWallShardSpriteTemplate",
      "playsewithpan SE_M_BRICK_BREAK", "clearmonbg ANIM_TARGET",
    ]) expect(brickBreak).toContain(token);
    expect((brickBreak.match(/gBrickBreakWallShardSpriteTemplate/g) ?? [])).toHaveLength(4);
    for (const token of [
      "loadspritegfx ANIM_TAG_BLUE_LIGHT_WALL", "loadspritegfx ANIM_TAG_TORN_METAL",
      "gHorizontalLungeSpriteTemplate", "AnimTask_ShakeMon2", "create_claw_slash_sprite",
      "playsewithpan SE_M_RAZOR_WIND", "blendoff", "clearmonbg ANIM_TARGET",
    ]) expect(crushClaw).toContain(token);
    expect((crushClaw.match(/create_claw_slash_sprite/g) ?? [])).toHaveLength(4);
    for (const excluded of [
      "gReflectWallSpriteTemplate", "gReflectSparkleSpriteTemplate",
      "gBrickBreakWallSpriteTemplate", "gBrickBreakWallShardSpriteTemplate",
    ]) expect(crushClaw).not.toContain(excluded);
    expect(reflect).not.toContain("ANIM_TAG_TORN_METAL");
    expect(reflect).not.toContain("create_claw_slash_sprite");
    expect(brickBreak).not.toContain("gReflectWallSpriteTemplate");
    expect(brickBreak).not.toContain("gReflectSparkleSpriteTemplate");
    expect(brickBreak).not.toContain("create_claw_slash_sprite");

    const psychic = readFileSync("reference/pokeemerald/src/battle_anim_psychic.c", "utf8");
    const fight = readFileSync("reference/pokeemerald/src/battle_anim_fight.c", "utf8");
    const dark = readFileSync("reference/pokeemerald/src/battle_anim_dark.c", "utf8");
    for (const token of [
      "gReflectWallSpriteTemplate", "gReflectSparkleSpriteTemplate", "AnimDefensiveWall",
      "AnimWallSparkle", "ANIMCMD_FRAME(64, 3)", "DestroySpriteAndMatrix",
    ]) expect(psychic).toContain(token);
    for (const token of [
      "gBrickBreakWallSpriteTemplate", "gBrickBreakWallShardSpriteTemplate",
      "AnimBrickBreakWall", "AnimBrickBreakWallShard", "sprite->data[6] = -3",
      "sprite->data[7] = -3", "if (++sprite->data[0] > 40)",
    ]) expect(fight).toContain(token);
    expect(dark).toContain("AnimClawSlash");
  });

  it("pins both Reflect receipts and all four natural Brick Break receipt, topology, lifecycle, audio, hardware, register, and cleanup bodies", () => {
    for (const expected of reflectReceipts) {
      const stored = json<ReflectReceipt>(expected.fixturePath);
      expect(digest(expected.fixturePath)).toBe(expected.fixtureSha256);
      expect(digest(expected.scenarioPath)).toBe(expected.scenarioSha256);
      expect(stored).toMatchObject({
        schema: "scene-on-portable-evidence/v1",
        scenario: expected.scenarioPath,
        probe: "tools/compare/reflectProbe.py",
        orientation: expected.orientation,
        denseWindow: expected.window,
        attacker: {
          species: "MINUN", geometry: expected.attackerGeometry,
        },
        target: {
          species: "SHUCKLE", geometry: expected.targetGeometry,
        },
        allocatorProfile: { wall: 3, sparkles: [4, 5, 4] },
        fieldProfile: expected.fieldProfile,
      });
      expect(stored.denseWindow.endFrame - stored.denseWindow.startFrame + 1).toBe(
        expected.orientation === "player-to-opponent" ? 208 : 211,
      );
    }
    expect(reflectReceipts.reduce((total, receipt) => (
      total + receipt.window.endFrame - receipt.window.startFrame + 1
    ), 0)).toBe(419);

    for (const expected of brickBreakReceipts) {
      const stored = json<BrickBreakReceipt>(expected.fixturePath);
      expect(digest(expected.fixturePath)).toBe(expected.fixtureSha256);
      expect(digest(expected.scenarioPath)).toBe(expected.scenarioSha256);
      expect(stored).toEqual({
        schema: "brick-break-portable-evidence/v1",
        oracleProfile: "battle-scene-on",
        orientation: expected.orientation,
        scenario: expected.scenarioPath,
        probe: "tools/compare/brickBreakProbe.py",
        sourceWindow: expected.window,
        evidenceSha256: expected.evidence,
        rawRgbSha256: expected.raw,
      });
      expect(stored.sourceWindow.endFrame - stored.sourceWindow.startFrame + 1)
        .toBe(expected.window.frameCount);
      expect(expected.lifecycle).toEqual(expected.body === "normal"
        ? { wall: 0, shard: 0 } : { wall: 1, shard: 4 });
    }
    expect(brickBreakReceipts.filter((receipt) => receipt.body === "normal").reduce(
      (total, receipt) => total + receipt.window.frameCount, 0,
    )).toBe(302);
    expect(brickBreakReceipts.filter((receipt) => receipt.body === "shattered-wall").reduce(
      (total, receipt) => total + receipt.window.frameCount, 0,
    )).toBe(384);
    expect(brickBreakReceipts.reduce((total, receipt) => total + receipt.window.frameCount, 0))
      .toBe(686);

    const reflectPortable = readFileSync("tools/compare/reflectPortable.ts", "utf8");
    for (const token of [
      "reflect-dense-evidence/v2", "const rows = new Map", "const wall =",
      "const sparkles =", "expectedSparkles", "wallMatch", "rotatedPalette",
      "row.registers.bldcnt === 16192", "row.registers.bldalpha",
      "opponentBattlerHidden", "row.visualTaskCount === row.effectSprites.length",
      "row.soundTaskCount === Number(view.soundTaskActive)", "priorVisible",
      "hardwareOam", "hardwarePalettes", "paletteTags", "row.se1.songHeader",
      "track.panX ===", "createHash(\"sha256\").update(raw)", "240 * 160",
      "framebufferMatches", "for (let runNumber = 1; runNumber <= 2; runNumber++)",
    ]) expect(reflectPortable).toContain(token);
    const brickPortable = readFileSync("tools/compare/brickBreakPortable.ts", "utf8");
    for (const token of [
      "brick-break-dense-evidence/v1", "compactSemanticReceiptSha256",
      "const expectedLifecycles = body === \"normal\"",
      "{ wall: 0, shard: 0 }", "{ wall: 1, shard: 4 }",
      "same(fixture.sourceWindow, probe.sourceWindow)",
      "same(probe.lifecycleCounts, expectedLifecycles)", "oracle.sprites.filter",
      "Boolean(oracle.active) !== predicted.active", "oracle.registers.bldcnt",
      "oracle.paletteTags.includes(10208)", "oracle.tileTags.includes(10208)",
      "probe.songHeaders[predicted.sound]", "oracle.se1.songHeader",
      "createHash(\"sha256\").update(raw)", "rawWindow.digest(\"hex\")",
      "fresh reproducibility", "240 * 160", "for (let pass = 1; pass <= 2; pass += 1)",
    ]) expect(brickPortable).toContain(token);
    expect(brickPortable).not.toContain("reflectAtAge");
    expect(brickPortable).not.toContain("crushClawAtAge");
  });

  it("pins every untouched complete legal three-mon party-only fixture and ordinary controller input", () => {
    for (const expected of scenarioExpectations) {
      const staged = json<Scenario>(expected.path);
      expect(digest(expected.path)).toBe(expected.sha256);
      expect(staged).toMatchObject({
        schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50,
        challengeNum: 0, battleNum: 0, trainerId: 50, seed: 305419897,
        playerSetIds: expected.playerSetIds, opponentSetIds: expected.opponentSetIds,
      });
      expect(Object.keys(staged.overrides)).toEqual(["parties"]);
      expect(Object.keys(staged.overrides.parties).sort()).toEqual(["opponent", "player"]);
      expectCompleteLegalParty(staged.overrides.parties.player);
      expectCompleteLegalParty(staged.overrides.parties.opponent);
      expect(staged.trace.segments).toEqual([
        { frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] },
        { frames: 2, buttons: ["A"] }, { frames: expected.idleFrames, buttons: [] },
      ]);
      expect(staged.trace.captureFrames).toEqual(expected.captureFrames);
      expect(staged.trace.segments.every((segment) => segment.buttons.every(
        (button) => button === "A",
      ))).toBe(true);
      const targetSide: Side = expected.attackerSide === "player" ? "opponent" : "player";
      const attacker = staged.overrides.parties[expected.attackerSide][0]!;
      const target = staged.overrides.parties[targetSide][0]!;
      expect(attacker).toMatchObject({
        species: expected.attacker.species,
        moves: [expected.attacker.move, expected.attacker.move, expected.attacker.move, expected.attacker.move],
      });
      expect(target).toMatchObject({
        species: expected.target.species,
        moves: [expected.target.move, expected.target.move, expected.target.move, expected.target.move],
      });
    }
    expect(scenarioExpectations).toHaveLength(8);
  });

  it("pins the bilateral Crush Claw map, lunge, shake, claw, audio, hardware, state, raw-RGB, and framebuffer obligations", () => {
    for (const expected of crushClawReceipts) {
      const stored = json<CrushClawReceipt>(expected.fixturePath);
      expect(digest(expected.fixturePath)).toBe(expected.fixtureSha256);
      expect(digest(expected.scenarioPath)).toBe(expected.scenarioSha256);
      expect(digest(expected.mapPath)).toBe(expected.mapSha256);
      expect(readFileSync(expected.mapPath, "utf8")).toContain(
        "# MOVE_CRUSH_CLAW displayed-timing spec",
      );
      expect(readFileSync(expected.mapPath, "utf8")).toContain(
        "# Every visible event displays exactly ONE frame after the RAM state that causes it.",
      );
      expect(stored).toMatchObject({
        schema: "scene-on-portable-evidence/v1",
        oracleProfile: "battle-scene-on",
        move: "CRUSH_CLAW",
        orientation: expected.orientation,
        scenario: expected.scenarioPath,
        probe: "tools/compare/crushClawProbe.py",
        appStage: { presentationAge: 0 },
        denseWindow: expected.window,
        attacker: { species: "GROVYLE", geometry: expected.attackerGeometry },
        target: { species: "ONIX", geometry: expected.targetGeometry },
        fieldProfile: expected.fieldProfile,
        evidenceSchema: "crush-claw-dense-evidence/v1",
        evidenceSha256: expected.evidence,
        secondFreshEvidenceSha256: expected.evidence,
        rawRgbSha256: expected.raw,
        acceptance: { status: "exact", componentMatching: 69, framebufferMatching: 69 },
      });
      expect(stored.denseWindow.endFrame - stored.denseWindow.startFrame + 1).toBe(69);
      expect(stored.pair).toContain("FRONTIER_MON_GROVYLE_2 set 293");
    }
    expect(crushClawReceipts.reduce((total, receipt) => total + receipt.window.frameCount, 0))
      .toBe(138);

    const reducer = readFileSync("src/animation/crushClaw.ts", "utf8");
    for (const token of [
      "Complete source-relative", "Move_CRUSH_CLAW", "visual body",
      "LUNGE_FIRST_STEP_AGE = 13", "SLASH_1_SPAWN_AGE = 19",
      "SHAKE_FIRST_STEP_AGE = 19", "SLASH_2_SPAWN_AGE = 33",
      "BLEND_OFF_AGE = 55", "horizontalLungeX2AtTick", "shakeMon2OffsetAtTick",
      "clawSlashAnimFrame", "playsewithpan SE_M_RAZOR_WIND",
      "blendOn: age >= LUNGE_FIRST_STEP_AGE && age < BLEND_OFF_AGE",
    ]) expect(reducer).toContain(token);
    const portable = readFileSync("tools/compare/crushClawPortable.ts", "utf8");
    for (const token of [
      "createScratchDir", "tools/run-mgba-probe.py", "fixture.evidenceSchema",
      "evidenceHash", "secondFreshEvidenceSha256", "rawRgbSha256",
      "sceneOnCrushClawView", "targetIdleX2", "lungeShape", "attackerShape",
      "targetShape", "slashShape", "shakeShape", "soundShape", "blendShape",
      "AnimTask_ShakeMon2", "SE_M_RAZOR_WIND", "0x3f40", "0x080c",
      "componentMatches", "framebufferMatches", "240 * 160",
      "fixture.acceptance.status === \"exact\"",
    ]) expect(portable).toContain(token);
    expect(portable).not.toContain("reflectAtAge");
    expect(portable).not.toContain("brickBreakAtAge");
  });

  it("keeps reducers, typed seam, compositor, portable verification, and source-observed latch obligations move-owned", () => {
    const reflectReducer = readFileSync("src/animation/reflect.ts", "utf8");
    for (const token of [
      "Source-relative reducer for Move_REFLECT", "SPARKLE_ARGS", "sparkleAtAge",
      "wallLive", "paletteRotationSteps", "opponentBattlerHidden",
      "soundTaskActive", "active: age >= 0 && age <= 67",
    ]) expect(reflectReducer).toContain(token);
    const brickReducer = readFileSync("src/animation/brickBreak.ts", "utf8");
    for (const token of [
      "BRICK_BREAK_NORMAL_FRAME_COUNT = 151",
      "BRICK_BREAK_SHATTERED_FRAME_COUNT = 192",
      "Complete source-relative reducer for both", "Move_BRICK_BREAK",
      "body === \"shattered-wall\"", "kind: \"wall\"", "kind: \"shard\"",
      "windUpLungeAtTick", "battlerDisplayAge", "SE_M_BRICK_BREAK",
    ]) expect(brickReducer).toContain(token);
    const seam = readFileSync("src/animation/sceneOnPresentation.ts", "utf8");
    for (const token of [
      "export function sceneOnReflectView", "reflectAtAge(",
      "export function sceneOnBrickBreakView", "brickBreakAtAge(",
      "export function sceneOnCrushClawView", "crushClawAtAge(",
    ]) expect(seam).toContain(token);
    const compositor = readFileSync("src/engine/battleScene.ts", "utf8");
    for (const token of [
      "state.config.move === \"REFLECT\"", "sceneOnReflectView",
      "state.config.move === \"BRICK_BREAK\"", "sceneOnBrickBreakView",
      "state.config.move === \"CRUSH_CLAW\"", "sceneOnCrushClawView",
      "unsupported staged REFLECT pair", "unsupported staged BRICK_BREAK pair",
      "unsupported staged CRUSH_CLAW pair", "age: state.age - 1",
    ]) expect(compositor).toContain(token);
    expect(readFileSync("src/engine/core.ts", "utf8")).toContain("sceneOnPresentation");

    const latches = readFileSync("ANIMATION_LATCHES.md", "utf8");
    for (const token of [
      "The latch is per-MECHANISM", "Never inherit a latch from a sibling move.",
      "Default expectation where nothing is measured: visible events display ONE",
      "Sprite-driven", "Palette writes", "AnimTask_ShakeMon2", "RAM+2",
      "AnimTask_TranslateMonElliptical(RespectSide)", "CRUSH_CLAW",
      "Some RAM transitions never reach pixels",
    ]) expect(latches).toContain(token);
    expect(trackGoal).toContain("predecessor OAM/palette transfer");
    expect(trackGoal).toContain("Reflect transfers no sparkle, wall, palette, timing, or latch fact");
    expect(trackGoal).toContain("Brick Break transfers no TORN_METAL wall, shard, branch, monbg, lunge, palette, timing, or latch fact");
    expect(trackGoal).toContain("Crush Claw transfers no lunge, shake, claw, timing, or latch fact");
  });

  it("fulfills only the unchanged exact four-component boundary at 233 Level-50 moves", () => {
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
    expect(coverage.entries).toHaveLength(233);
    expect(coverage.entries.filter((entry) => (
      level50Moves.has(entry.move) && entry.status === "exact"
    ))).toHaveLength(233);
    expect(coverage.entries.filter((entry) => (
      level50Moves.has(entry.move) && (entry.status === "partial" || entry.status === "staged")
    ))).toEqual([]);
    expect(coverage.entries.filter((entry) => [
      "MOVE_REFLECT", "MOVE_BRICK_BREAK", "MOVE_CRUSH_CLAW",
    ].includes(entry.move))).toEqual([
      expect.objectContaining({ move: "MOVE_BRICK_BREAK", status: "exact" }),
      expect.objectContaining({ move: "MOVE_CRUSH_CLAW", status: "exact" }),
      expect.objectContaining({ move: "MOVE_REFLECT", status: "exact" }),
    ]);
    expect(coverage.componentTracks.filter((track) => track.id === "blue-light-wall-reflect"))
      .toEqual([{
        id: "blue-light-wall-reflect",
        components: [...trackComponents],
        representatives: ["MOVE_REFLECT", "MOVE_BRICK_BREAK", "MOVE_CRUSH_CLAW"],
        fulfilled: true,
        goal: trackGoal,
      }]);
  });

  it("normalizes only an asserted-empty Brick Break transport field", () => {
    const fresh = {
      schema: "brick-break-transport-test",
      setup: { preCheckpointCaptures: [], label: "brick" },
      frames: [0, true, "line\n"],
    };
    const historic = "{\"schema\":\"brick-break-transport-test\",\"setup\":{\"label\":\"brick\"},\"frames\":[0,true,\"line\\n\"]}\n";
    expect(compactSemanticReceiptSha256(fresh)).toBe(
      createHash("sha256").update(historic).digest("hex"),
    );
    expect(() => compactSemanticReceiptSha256({
      ...fresh,
      setup: { label: "brick" },
    })).toThrow("setup.preCheckpointCaptures must be []");
    expect(() => compactSemanticReceiptSha256({
      ...fresh,
      setup: { ...fresh.setup, preCheckpointCaptures: [1] },
    })).toThrow("setup.preCheckpointCaptures must be []");
  });
});
