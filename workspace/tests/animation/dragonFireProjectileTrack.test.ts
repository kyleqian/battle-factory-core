import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

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
  readonly acceptance?: unknown;
};

type ComponentGraph = {
  readonly moves: readonly {
    readonly move: string;
    readonly componentIds: readonly string[];
  }[];
};

const portableFixturePaths = [
  "tools/compare/fixtures/dragon-breath-player-onix-opponent-murkrow.json",
  "tools/compare/fixtures/dragon-breath-opponent-onix-player-murkrow.json",
  "tools/compare/fixtures/dragon-rage-player-charmeleon-opponent-onix.json",
  "tools/compare/fixtures/dragon-rage-opponent-charmeleon-player-onix.json",
  "tools/compare/fixtures/flamethrower-player-onix-opponent-murkrow.json",
  "tools/compare/fixtures/flamethrower-opponent-onix-player-murkrow.json",
  "tools/compare/fixtures/blaze-kick-player-onix-opponent-murkrow.json",
  "tools/compare/fixtures/blaze-kick-opponent-onix-player-murkrow.json",
  "tools/compare/fixtures/ember-player-onix-opponent-murkrow.json",
  "tools/compare/fixtures/ember-opponent-onix-player-murkrow.json",
  "tools/compare/fixtures/fire-spin-player-charmeleon-opponent-onix.json",
  "tools/compare/fixtures/fire-spin-opponent-charmeleon-player-onix.json",
] as const;

const fireBlastFixturePath = "tools/compare/fixtures/fire-blast-evidence.json";

const trackMoves = [
  "MOVE_DRAGON_BREATH",
  "MOVE_DRAGON_RAGE",
  "MOVE_FLAMETHROWER",
  "MOVE_BLAZE_KICK",
  "MOVE_FIRE_BLAST",
  "MOVE_EMBER",
  "MOVE_FIRE_SPIN",
] as const;

const fulfilledGoal =
  "FULFILLED: MOVE_DRAGON_BREATH retains its eleven-spawn gDragonBreathFireSpriteTemplate body at 85/85 in both orientations. MOVE_DRAGON_RAGE independently retains its source-scheduled shake/slide/fire-spit/eight-plume body at 150/150 complete bilateral rows. MOVE_FLAMETHROWER remains exact at 126/126, MOVE_BLAZE_KICK at 78/78, MOVE_EMBER at 63/63, MOVE_FIRE_SPIN at 104/104, and MOVE_FIRE_BLAST independently retains its distinct 15-ring/45-cross/F_PAL_BG body at 197/197 in both orientations. ANIM_TAG_SMALL_EMBER and the bounded create_dragon_breath_fire_sprite, monbg, and splitbgprio component track never transfer a source body, GPU/OAM/matrix/palette/audio/painter fact, latch, or acceptance across moves.";

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function fixture(path: string): Fixture {
  return JSON.parse(readFileSync(path, "utf8")) as Fixture;
}

function portableReceipt(path: string) {
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

describe("dragon-fire-projectile component-track receipt ratchet", () => {
  it("pins exactly two committed portable fixtures per move with all twelve identities, windows, and hashes", () => {
    expect(portableFixturePaths.map(portableReceipt)).toEqual([
      {
        path: portableFixturePaths[0],
        schema: "scene-on-portable-component/v1",
        oracleProfile: "battle-scene-on",
        move: "DRAGON_BREATH",
        orientation: null,
        pair: "ONIX (player-back) -> MURKROW (opponent-front)",
        scenario: "tools/battle-lab/mechanic-dragon-breath-player-onix-opponent-murkrow.json",
        probe: "tools/probe/run-battle-lab-rgb.py",
        denseWindow: { startFrame: 395, endFrame: 479, frameCount: 85 },
        appStage: { firstFramePresentationAge: -2 },
        acceptance: {
          status: "exact",
          result: "85/85 dense projectile/palette/shake/monbg component states and 85/85 dense framebuffers.",
        },
        fixtureSha256: "0578d813d6e90a225cf1503ed91f28726922af8332547e5af25bd376d7f4de82",
      },
      {
        path: portableFixturePaths[1],
        schema: "scene-on-portable-component/v1",
        oracleProfile: "battle-scene-on",
        move: "DRAGON_BREATH",
        orientation: null,
        pair: "ONIX (opponent-front) -> MURKROW (player-back)",
        scenario: "tools/battle-lab/mechanic-dragon-breath-opponent-onix-player-murkrow.json",
        probe: "tools/probe/run-battle-lab-rgb.py",
        denseWindow: { startFrame: 449, endFrame: 533, frameCount: 85 },
        appStage: { firstFramePresentationAge: -2 },
        acceptance: {
          status: "exact",
          result: "85/85 dense projectile/palette/shake/monbg component states and 85/85 dense framebuffers.",
        },
        fixtureSha256: "fb6899db64f7f129981a6a168c4fe179901b62206ea979c8091e418dcfd704dd",
      },
      {
        path: portableFixturePaths[2],
        schema: "scene-on-portable-component/v1",
        oracleProfile: "battle-scene-on",
        move: "DRAGON_RAGE",
        orientation: null,
        pair: "CHARMELEON (player-back) -> ONIX (opponent-front)",
        scenario: "tools/battle-lab/mechanic-dragon-rage-charmeleon-onix.json",
        probe: "tools/probe/dump-dragonrage-rgb.py",
        denseWindow: { startFrame: 89, endFrame: 238, frameCount: 150 },
        appStage: { firstFramePresentationAge: 0 },
        acceptance: null,
        fixtureSha256: "d132c84b99bacb72b228fbe1b2ff65f815120df6f0b6423380684d3403641a8d",
      },
      {
        path: portableFixturePaths[3],
        schema: "scene-on-portable-component/v1",
        oracleProfile: "battle-scene-on",
        move: "DRAGON_RAGE",
        orientation: null,
        pair: "CHARMELEON (opponent-front) -> ONIX (player-back)",
        scenario: "tools/battle-lab/mechanic-dragon-rage-onix-charmeleon.json",
        probe: "tools/probe/dump-dragonrage-rgb.py",
        denseWindow: { startFrame: 93, endFrame: 242, frameCount: 150 },
        appStage: { firstFramePresentationAge: 0 },
        acceptance: null,
        fixtureSha256: "88f332ee5278041b3272b7b0ebe686dc11de7e972af17a07d3a243d4fa9f02d0",
      },
      {
        path: portableFixturePaths[4],
        schema: "scene-on-portable-component/v1",
        oracleProfile: "battle-scene-on",
        move: "FLAMETHROWER",
        orientation: null,
        pair: "ONIX (player-back) -> MURKROW (opponent-front)",
        scenario: "tools/battle-lab/mechanic-flamethrower-player-onix-opponent-murkrow.json",
        probe: "tools/probe/run-battle-lab-rgb.py",
        denseWindow: { startFrame: 395, endFrame: 520, frameCount: 126 },
        appStage: { firstFramePresentationAge: -11 },
        acceptance: null,
        fixtureSha256: "6a33118c2afe2de9bca7d81f92244d087d1f621a5ab74d10fb5f93617162a491",
      },
      {
        path: portableFixturePaths[5],
        schema: "scene-on-portable-component/v1",
        oracleProfile: "battle-scene-on",
        move: "FLAMETHROWER",
        orientation: null,
        pair: "ONIX (opponent-front) -> MURKROW (player-back)",
        scenario: "tools/battle-lab/mechanic-flamethrower-opponent-onix-player-murkrow.json",
        probe: "tools/probe/run-battle-lab-rgb.py",
        denseWindow: { startFrame: 449, endFrame: 574, frameCount: 126 },
        appStage: { firstFramePresentationAge: -11 },
        acceptance: null,
        fixtureSha256: "6eb7ff75817fdd4afb10daa321d949f5062a6cb563b86729124122e6c4309766",
      },
      {
        path: portableFixturePaths[6],
        schema: "scene-on-portable-component/v1",
        oracleProfile: "battle-scene-on",
        move: "BLAZE_KICK",
        orientation: null,
        pair: "ONIX (player-back) -> MURKROW (opponent-front)",
        scenario: "tools/battle-lab/mechanic-blaze-kick-player-onix-opponent-murkrow.json",
        probe: "tools/probe/run-battle-lab-rgb.py",
        denseWindow: { startFrame: 399, endFrame: 476, frameCount: 78 },
        appStage: { firstFramePresentationAge: 0 },
        acceptance: null,
        fixtureSha256: "c7e15008b3f87cd24f557fa7b67fcd4501da38c3122bfc49995ee80f60c77d8d",
      },
      {
        path: portableFixturePaths[7],
        schema: "scene-on-portable-component/v1",
        oracleProfile: "battle-scene-on",
        move: "BLAZE_KICK",
        orientation: null,
        pair: "ONIX (opponent-front) -> MURKROW (player-back)",
        scenario: "tools/battle-lab/mechanic-blaze-kick-opponent-onix-player-murkrow.json",
        probe: "tools/probe/run-battle-lab-rgb.py",
        denseWindow: { startFrame: 453, endFrame: 530, frameCount: 78 },
        appStage: { firstFramePresentationAge: 0 },
        acceptance: null,
        fixtureSha256: "0d1032f7e026bd14ead2fd9f7b97a2c346a2d93eeaf07e56c81c0b4e8495041e",
      },
      {
        path: portableFixturePaths[8],
        schema: "scene-on-portable-component/v1",
        oracleProfile: "battle-scene-on",
        move: "EMBER",
        orientation: null,
        pair: "ONIX (player-back) -> MURKROW (opponent-front)",
        scenario: "tools/battle-lab/mechanic-ember-player-onix-opponent-murkrow.json",
        probe: "tools/probe/run-battle-lab-rgb.py",
        denseWindow: { startFrame: 388, endFrame: 450, frameCount: 63 },
        appStage: { firstFramePresentationAge: 0 },
        acceptance: null,
        fixtureSha256: "b49655100da323d34d2f0bd33d4d5df1039e70d1cc522843cb5f853976b81c87",
      },
      {
        path: portableFixturePaths[9],
        schema: "scene-on-portable-component/v1",
        oracleProfile: "battle-scene-on",
        move: "EMBER",
        orientation: null,
        pair: "ONIX (opponent-front) -> MURKROW (player-back)",
        scenario: "tools/battle-lab/mechanic-ember-opponent-onix-player-murkrow.json",
        probe: "tools/probe/run-battle-lab-rgb.py",
        denseWindow: { startFrame: 442, endFrame: 504, frameCount: 63 },
        appStage: { firstFramePresentationAge: 0 },
        acceptance: null,
        fixtureSha256: "e04cdd6831cd113a3376c67fe2051ddd0f807d754efad3d122419a0c5be8801d",
      },
      {
        path: portableFixturePaths[10],
        schema: "scene-on-portable-component/v1",
        oracleProfile: "battle-scene-on",
        move: "FIRE_SPIN",
        orientation: null,
        pair: "CHARMELEON legal Level-50 Factory set-175 player-back -> ONIX opponent-front",
        scenario: "tools/battle-lab/mechanic-fire-spin-player-charmeleon-opponent-onix.json",
        probe: "tools/compare/fireSpinProbe.py",
        denseWindow: { startFrame: 80, endFrame: 183, frameCount: 104 },
        appStage: { presentationAge: 0 },
        acceptance: null,
        fixtureSha256: "2d91fe3e9036aea98a5416a7dfc69084b36f9a4e4a022c4ccb876f41dacaabd3",
      },
      {
        path: portableFixturePaths[11],
        schema: "scene-on-portable-component/v1",
        oracleProfile: "battle-scene-on",
        move: "FIRE_SPIN",
        orientation: null,
        pair: "CHARMELEON legal Level-50 Factory set-175 opponent-front -> ONIX player-back",
        scenario: "tools/battle-lab/mechanic-fire-spin-opponent-charmeleon-player-onix.json",
        probe: "tools/compare/fireSpinProbe.py",
        denseWindow: { startFrame: 84, endFrame: 187, frameCount: 104 },
        appStage: { presentationAge: 0 },
        acceptance: null,
        fixtureSha256: "5d23aea9835ac19a3fe0d6174f77643a0d8bbc0536314854c34bdc33a7702047",
      },
    ]);

    const fixtureMoves = portableFixturePaths.map((path) => fixture(path).move);
    expect(Object.fromEntries(trackMoves.map((move) => [
      move,
      fixtureMoves.filter((fixtureMove) => fixtureMove === move.replace("MOVE_", "")).length,
    ]))).toEqual({
      MOVE_DRAGON_BREATH: 2,
      MOVE_DRAGON_RAGE: 2,
      MOVE_FLAMETHROWER: 2,
      MOVE_BLAZE_KICK: 2,
      MOVE_FIRE_BLAST: 0,
      MOVE_EMBER: 2,
      MOVE_FIRE_SPIN: 2,
    });
  });

  it("pins Fire Blast's thirteenth evidence identity and every committed source, semantic, raw-RGB, and framebuffer receipt", () => {
    const evidence = JSON.parse(readFileSync(fireBlastFixturePath, "utf8")) as {
      readonly schema: string;
      readonly status: string;
      readonly coverageCredit: boolean;
      readonly acceptance: unknown;
      readonly source: unknown;
      readonly orientations: unknown;
      readonly acceptanceVerdict: string;
    };

    expect({
      path: fireBlastFixturePath,
      fixtureSha256: sha256(fireBlastFixturePath),
      schema: evidence.schema,
      status: evidence.status,
      coverageCredit: evidence.coverageCredit,
      acceptance: evidence.acceptance,
      source: evidence.source,
      orientations: evidence.orientations,
      acceptanceVerdict: evidence.acceptanceVerdict,
    }).toEqual({
      path: "tools/compare/fixtures/fire-blast-evidence.json",
      fixtureSha256: "1e67f91a1e580b4c36579e62c1390a9c2bef4f47f5c7b76719eb08211158effa",
      schema: "fire-blast-bilateral-evidence/v1",
      status: "exact",
      coverageCredit: true,
      acceptance: {
        sourceRows: 394,
        rawRgbRows: 394,
        reducerRows: 394,
        typedSeamRows: 394,
        framebufferRows: 394,
        freshRunsPerOrientation: 2,
        ringGroups: 3,
        ringSprites: 15,
        crossGroups: 9,
        crossSprites: 45,
        firstInactiveCleanupAge: 196,
      },
      source: {
        audit: "tools/compare/fireBlastSourceAudit.ts",
        auditSha256: "21af215fcff9d91de38809903aef79ffc08530381ed44689ca8a6b6f2cd006cf",
        probe: "tools/compare/fireBlastProbe.py",
        probeSha256: "f4063b32dd93baed2c64652c0ffd8149cbf8a8e69827aa1dda4c907e951fec7d",
        verifier: "tools/compare/fireBlastEvidence.ts",
        verifierSha256: "d24988a7ec35213314703a45e6e398be70ec681ebb50b20f2de8bae0903aa429",
        reducerVerifier: "tools/compare/verifyFireBlastReducer.ts",
        reducerVerifierSha256: "b2a83db8585d26d6180e651a354aeff0220161e351a1075647aac3c51aa750f5",
        framebufferVerifier: "tools/compare/fireBlastFramebuffer.ts",
        framebufferVerifierSha256: "db4dc8a96f18f62f79bff9e5ab028b368d75f8bfd77d242833aeea04e984c019",
        smallEmberAsset: "src/assets/gen/battle-anim-small-ember.json",
        smallEmberAssetSha256: "63f1fc4381673f60ccfd660d75089026e8df5113da4e8bba852f61b50d4262db",
        stagingFixture: "tests/fixtures/fire-blast-animation-source-staging.json",
        stagingFixtureSha256: "31b0680bd4859ef92e228a69c88bc591697d0233002560b19d408c55650e5bae",
      },
      orientations: {
        "player-back": {
          scenario: "tools/battle-lab/mechanic-fire-blast-player-octillery-opponent-onix.json",
          scenarioSha256: "144553b2f508dfebe652cf882cd0b379fe09a637cd8a52d9c80f6bb95038bce7",
          sourceWindow: { startFrame: 215, endFrame: 411, frameCount: 197 },
          probeJsonSha256: "cb238202c79e632aba0816bb4bc574a181ef153d46b11ff7273687144a1ca6e5",
          repeatProbeJsonSha256: "cb238202c79e632aba0816bb4bc574a181ef153d46b11ff7273687144a1ca6e5",
          denseState: "tools/compare/evidence/fire-blast-player-dense-state.json.gz",
          denseStateSha256: "378acacba18961c852c29a5e33474d34fbb2203b4bdb534a5a935dc72a1d68b3",
          rawRgbArchive: "tools/compare/evidence/fire-blast-player-raw-rgb.tar.gz",
          rawRgbArchiveSha256: "1b3f210c8fb685267883d691db819d98e56adb16c713426c81c5ddda68136ffa",
          rawRgbSha256: "f36e165d5db17c03dd81c63a6704b0591a0d229942d6108fe7bd288ed920ef8d",
        },
        "opponent-front": {
          scenario: "tools/battle-lab/mechanic-fire-blast-opponent-octillery-player-onix.json",
          scenarioSha256: "2fb51bb13a18d46d32373690b45de9bafa7f7b894556385322612172df7a29be",
          sourceWindow: { startFrame: 1147, endFrame: 1343, frameCount: 197 },
          probeJsonSha256: "a5a45685742382056b2b35f612fadf7de380b7d5e40d6d112790f09ecfe6dc92",
          repeatProbeJsonSha256: "a5a45685742382056b2b35f612fadf7de380b7d5e40d6d112790f09ecfe6dc92",
          denseState: "tools/compare/evidence/fire-blast-opponent-dense-state.json.gz",
          denseStateSha256: "d09c68aedecc0b15035d28a6a3d349ce248023ceada84f90546943cb9c17640f",
          rawRgbArchive: "tools/compare/evidence/fire-blast-opponent-raw-rgb.tar.gz",
          rawRgbArchiveSha256: "ecab23c85ab0c1c80e4fefb2cd68f9e2656f88b0a1e46db34ea0acde0d5dcdb6",
          rawRgbSha256: "4376d40d83c631fef7e4a630b0fe784664a8d16f7645d97d210e7ec4a4611aed",
        },
      },
      acceptanceVerdict: "Fire Blast alone is exact: the retained reducer/typed seam and shared production framebuffer pass all 394/394 bilateral rows with zero residual pixels through first inactive cleanup. Existing exact SMALL_EMBER art regenerates from its source extractor and is reused without modification. No sibling or component coverage credit is inferred.",
    });
  });

  it("keeps all seven authoritative source bodies distinct and the component boundary exact", () => {
    const scripts = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
    const bodies = {
      dragonBreath: sourceBody(scripts, "Move_DRAGON_BREATH:", "Move_ROAR:"),
      dragonRage: sourceBody(scripts, "Move_DRAGON_RAGE:", "Move_RAIN_DANCE:"),
      flamethrower: sourceBody(scripts, "Move_FLAMETHROWER:", "Move_SANDSTORM:"),
      blazeKick: sourceBody(scripts, "Move_BLAZE_KICK:", "Move_HYPER_VOICE:"),
      fireBlast: sourceBody(scripts, "Move_FIRE_BLAST:", "Move_LEECH_SEED:"),
      ember: sourceBody(scripts, "Move_EMBER:", "Move_MEGA_PUNCH:"),
      fireSpin: sourceBody(scripts, "Move_FIRE_SPIN:", "Move_FURY_CUTTER:"),
    };
    const fireSpread = sourceBody(scripts, "FireSpreadEffect:", "Move_LEER:");

    expect(new Set(Object.values(bodies)).size).toBe(7);

    expect(bodies.dragonBreath).toContain("loadspritegfx ANIM_TAG_SMALL_EMBER");
    expect(bodies.dragonBreath).toContain("monbg ANIM_DEF_PARTNER");
    expect(bodies.dragonBreath).toContain("splitbgprio ANIM_TARGET");
    expect(bodies.dragonBreath.match(/create_dragon_breath_fire_sprite/g)).toHaveLength(11);
    expect(bodies.dragonBreath).toContain("AnimTask_ShakeMon2, 2, ANIM_TARGET, 2, 0, 21, 1");
    expect(bodies.dragonBreath).not.toContain("create_dragon_rage_fire_spit_sprite");

    expect(bodies.dragonRage).toContain("loadspritegfx ANIM_TAG_FIRE_PLUME");
    expect(bodies.dragonRage).toContain("AnimTask_ShakeMon, 5, ANIM_ATTACKER, 0, 2, 40, 1");
    expect(bodies.dragonRage).toContain("gSlideMonToOffsetSpriteTemplate");
    expect(bodies.dragonRage).toContain("gSlideMonToOriginalPosSpriteTemplate");
    expect(bodies.dragonRage).toContain("create_dragon_rage_fire_spit_sprite");
    expect(bodies.dragonRage.match(/create_dragon_rage_fire_plume_sprite/g)).toHaveLength(8);
    expect(bodies.dragonRage).not.toContain("monbg");

    expect(bodies.flamethrower).toContain("monbg ANIM_DEF_PARTNER");
    expect(bodies.flamethrower).toContain("splitbgprio ANIM_TARGET");
    expect(bodies.flamethrower).toContain("AnimTask_StartSinAnimTimer, 5, 100");
    expect(bodies.flamethrower.match(/call FlamethrowerCreateFlames/g)).toHaveLength(11);
    expect(bodies.flamethrower.match(/gFlamethrowerFlameSpriteTemplate/g)).toHaveLength(2);
    expect(bodies.flamethrower).not.toContain("gFireSpreadSpriteTemplate");

    expect(bodies.blazeKick).toContain("gSpinningHandOrFootSpriteTemplate");
    expect(bodies.blazeKick).toContain("create_basic_hitsplat_sprite");
    expect(bodies.blazeKick).toContain("AnimTask_ShakeMon2, 2, ANIM_TARGET, 3, 0, 14, 1");
    expect(bodies.blazeKick).toContain("call FireSpreadEffect");
    expect(bodies.blazeKick).toContain("complex_palette_blend");
    expect(fireSpread.match(/gFireSpreadSpriteTemplate/g)).toHaveLength(7);
    expect(bodies.blazeKick).not.toContain("gFireSpinSpriteTemplate");

    expect(bodies.fireBlast).toContain("createsoundtask SoundTask_FireBlast");
    expect(bodies.fireBlast.match(/call FireBlastRing/g)).toHaveLength(3);
    expect(bodies.fireBlast.match(/call FireBlastCross/g)).toHaveLength(9);
    expect(bodies.fireBlast.match(/gFireBlastRingSpriteTemplate/g)).toHaveLength(5);
    expect(bodies.fireBlast.match(/gFireBlastCrossSpriteTemplate/g)).toHaveLength(5);
    expect(bodies.fireBlast).toContain("F_PAL_BG, 3, 0, 8, RGB_BLACK");
    expect(bodies.fireBlast).toContain("F_PAL_BG, 2, 8, 0, RGB_BLACK");
    expect(bodies.fireBlast).not.toContain("monbg");

    expect(bodies.ember.match(/gEmberSpriteTemplate/g)).toHaveLength(3);
    expect(bodies.ember.match(/call EmberFireHit/g)).toHaveLength(3);
    expect(bodies.ember.match(/gEmberFlareSpriteTemplate/g)).toHaveLength(1);
    expect(bodies.ember).toContain("loopsewithpan SE_M_EMBER");
    expect(bodies.ember).not.toContain("gFireSpinSpriteTemplate");

    expect(bodies.fireSpin).toContain("AnimTask_ShakeMon, 5, ANIM_TARGET, 0, 2, 47, 1");
    expect(bodies.fireSpin.match(/call FireSpinEffect/g)).toHaveLength(3);
    expect(bodies.fireSpin.match(/gFireSpinSpriteTemplate/g)).toHaveLength(6);
    expect(bodies.fireSpin).toContain("SE_M_SACRED_FIRE2");
    expect(bodies.fireSpin).not.toContain("F_PAL_BG");

    const graph = JSON.parse(readFileSync(
      "src/data/gen/battle-animation-components.json",
      "utf8",
    )) as ComponentGraph;
    const ids = (move: string): readonly string[] => {
      const entry = graph.moves.find((candidate) => candidate.move === move);
      expect(entry).toBeDefined();
      return entry!.componentIds;
    };
    expect(trackMoves.map((move) => ids(move))).toEqual([
      [
        "asset:ANIM_TAG_SMALL_EMBER",
        "task:AnimTask_BlendBattleAnimPal",
        "task:AnimTask_ShakeMon2",
        "visualCommand:clearmonbg",
        "visualCommand:create_dragon_breath_fire_sprite",
        "visualCommand:monbg",
        "visualCommand:splitbgprio",
      ],
      [
        "asset:ANIM_TAG_FIRE_PLUME",
        "asset:ANIM_TAG_SMALL_EMBER",
        "sprite:gSlideMonToOffsetSpriteTemplate",
        "sprite:gSlideMonToOriginalPosSpriteTemplate",
        "task:AnimTask_ShakeMon",
        "visualCommand:create_dragon_rage_fire_plume_sprite",
        "visualCommand:create_dragon_rage_fire_spit_sprite",
      ],
      [
        "asset:ANIM_TAG_SMALL_EMBER",
        "sprite:gFlamethrowerFlameSpriteTemplate",
        "subroutine:FlamethrowerCreateFlames",
        "task:AnimTask_ShakeMon",
        "task:AnimTask_StartSinAnimTimer",
        "visualCommand:blendoff",
        "visualCommand:clearmonbg",
        "visualCommand:monbg",
        "visualCommand:panse",
        "visualCommand:setalpha",
        "visualCommand:splitbgprio",
      ],
      [
        "asset:ANIM_TAG_HANDS_AND_FEET",
        "asset:ANIM_TAG_IMPACT",
        "asset:ANIM_TAG_SMALL_EMBER",
        "sprite:gFireSpreadSpriteTemplate",
        "sprite:gSpinningHandOrFootSpriteTemplate",
        "subroutine:FireSpreadEffect",
        "task:AnimTask_BlendBattleAnimPal",
        "task:AnimTask_ShakeMon2",
        "visualCommand:blendoff",
        "visualCommand:clearmonbg",
        "visualCommand:complex_palette_blend",
        "visualCommand:create_basic_hitsplat_sprite",
        "visualCommand:monbg",
        "visualCommand:setalpha",
      ],
      [
        "asset:ANIM_TAG_SMALL_EMBER",
        "soundTask:SoundTask_FireBlast",
        "sprite:gFireBlastCrossSpriteTemplate",
        "sprite:gFireBlastRingSpriteTemplate",
        "subroutine:FireBlastCross",
        "subroutine:FireBlastRing",
        "task:AnimTask_BlendBattleAnimPal",
        "task:AnimTask_ShakeMon",
      ],
      [
        "asset:ANIM_TAG_SMALL_EMBER",
        "sprite:gEmberFlareSpriteTemplate",
        "sprite:gEmberSpriteTemplate",
        "subroutine:EmberFireHit",
      ],
      [
        "asset:ANIM_TAG_SMALL_EMBER",
        "sprite:gFireSpinSpriteTemplate",
        "subroutine:FireSpinEffect",
        "task:AnimTask_ShakeMon",
      ],
    ]);
    const sharedByAll = trackMoves.slice(1).reduce(
      (shared, move) => shared.filter((component) => ids(move).includes(component)),
      [...ids(trackMoves[0])],
    );
    expect(sharedByAll).toEqual(["asset:ANIM_TAG_SMALL_EMBER"]);
  });

  it("requires each comparator, evidence verifier, and production framebuffer obligation without transferring a latch", () => {
    const latches = readFileSync("ANIMATION_LATCHES.md", "utf8");
    for (const rule of [
      "The latch is per-MECHANISM (per source task, per sprite class), never",
      "Never inherit a latch from a sibling move.",
      "When a ledger entry and a change map disagree, the change map wins.",
      "Bank change maps per orientation during staging",
      "Default expectation where nothing is measured: visible events display ONE",
    ]) expect(latches).toContain(rule);

    const comparators: ReadonlyArray<readonly [string, readonly string[]]> = [
      ["tools/compare/dragonBreathPortable.ts", [
        "tools/run-mgba-probe.py", "createSceneOnMovePresentation",
        "fixture.denseWindow.startFrame", "const rgba = render(engine)",
        "matching === total && framebufferMatching === total",
      ]],
      ["tools/compare/dragonRagePortable.ts", [
        "tools/run-mgba-probe.py", "createSceneOnMovePresentation",
        "record.hardwareOam", "record.hardwareMatrices", "record.hardwarePalette",
        "componentMatching === total && framebufferMatching === total",
      ]],
      ["tools/compare/flamethrowerPortable.ts", [
        "tools/run-mgba-probe.py", "createSceneOnMovePresentation",
        "fixture.denseWindow.startFrame", "const rgba = render(engine)",
        "matching === total && framebufferMatching === total",
      ]],
      ["tools/compare/blazeKickPortable.ts", [
        "tools/run-mgba-probe.py", "createSceneOnMovePresentation",
        "oracleVisibleSlots", "const rgba = render(engine)",
        "matching === total && framebufferMatching === total",
      ]],
      ["tools/compare/emberPortable.ts", [
        "tools/run-mgba-probe.py", "createSceneOnMovePresentation",
        "targetSubpriority - 2", "const rgba = render(engine)",
        "matching === total && framebufferMatching === total",
      ]],
      ["tools/compare/fireSpinPortable.ts", [
        "tools/run-mgba-probe.py", "createSceneOnMovePresentation",
        "oracle.sourceActive", "const app = render(engine)",
        "componentMatches !== total || framebufferMatches !== total",
      ]],
    ];
    for (const [path, needles] of comparators) {
      const source = readFileSync(path, "utf8");
      for (const needle of needles) expect(source).toContain(needle);
    }

    const fireBlastSourceAudit = readFileSync("tools/compare/fireBlastSourceAudit.ts", "utf8");
    for (const needle of [
      "Move_FIRE_BLAST", "FireBlastRing", "FireBlastCross",
      "gFireBlastRingSpriteTemplate", "gFireBlastCrossSpriteTemplate",
      "sourceHashes", "sharedControls",
    ]) expect(fireBlastSourceAudit).toContain(needle);

    const fireBlastEvidence = readFileSync("tools/compare/fireBlastEvidence.ts", "utf8");
    for (const needle of [
      "twice-fresh probe mismatch", "probeJsonSha256", "rawRgbArchive",
      "hardwareOam", "hardwareMatrices", "hardwarePalette",
      "gFireBlastRingSpriteTemplate: 15", "gFireBlastCrossSpriteTemplate: 45",
      "latches: { oam:",
    ]) expect(fireBlastEvidence).toContain(needle);

    const fireBlastReducer = readFileSync("tools/compare/verifyFireBlastReducer.ts", "utf8");
    for (const needle of [
      "typed seam drift", "source cursor drift", "sprite topology drift",
      "register/resource/count drift", "FIRE_BLAST_FRAME_COUNT",
      "latches: { oam:",
    ]) expect(fireBlastReducer).toContain(needle);

    const fireBlastFramebuffer = readFileSync("tools/compare/fireBlastFramebuffer.ts", "utf8");
    for (const needle of [
      "verifyFireBlastFramebuffer", "const app = render(engine)",
      "residual", "incomplete bilateral proof", "394/394 exact with zero residual pixels",
    ]) expect(fireBlastFramebuffer).toContain(needle);
  });

  it("fulfills only dragon-fire-projectile while retaining every independently exact move status and count", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8")) as {
      readonly entries: readonly {
        readonly move: string;
        readonly status: string;
        readonly covered: readonly string[];
      }[];
      readonly componentTracks: readonly {
        readonly id: string;
        readonly components: readonly string[];
        readonly representatives: readonly string[];
        readonly fulfilled?: boolean;
        readonly goal?: string;
      }[];
    };

    expect(coverage.entries.filter((entry) => trackMoves.includes(
      entry.move as (typeof trackMoves)[number],
    )).map(({ move, status }) => [move, status]).sort(([left], [right]) =>
      left.localeCompare(right))).toEqual([
      ["MOVE_BLAZE_KICK", "exact"],
      ["MOVE_DRAGON_BREATH", "exact"],
      ["MOVE_DRAGON_RAGE", "exact"],
      ["MOVE_EMBER", "exact"],
      ["MOVE_FIRE_BLAST", "exact"],
      ["MOVE_FIRE_SPIN", "exact"],
      ["MOVE_FLAMETHROWER", "exact"],
    ]);

    const covered = Object.fromEntries(trackMoves.map((move) => [
      move, coverage.entries.find((entry) => entry.move === move)?.covered.join(" "),
    ]));
    expect(covered.MOVE_DRAGON_BREATH).toContain("eleven source spawns");
    expect(covered.MOVE_DRAGON_RAGE).toContain("schedule/shake/slide/fire-spit/plume");
    expect(covered.MOVE_DRAGON_RAGE).toContain("all 8 fire-plume spawns");
    expect(covered.MOVE_FLAMETHROWER).toContain("22 four-display-cadence");
    expect(covered.MOVE_BLAZE_KICK).toContain("seven gFireSpreadSpriteTemplate");
    expect(covered.MOVE_FIRE_BLAST).toContain("all three five-sprite rings, nine five-sprite crosses");
    expect(covered.MOVE_FIRE_BLAST).toContain("both F_PAL_BG black fades");
    expect(covered.MOVE_EMBER).toContain("three gEmberSpriteTemplate projectiles");
    expect(covered.MOVE_FIRE_SPIN).toContain("all three FireSpinEffect calls");

    expect(coverage.componentTracks.filter((track) =>
      track.id === "dragon-fire-projectile")).toEqual([{
      id: "dragon-fire-projectile",
      components: [
        "asset:ANIM_TAG_SMALL_EMBER",
        "visualCommand:create_dragon_breath_fire_sprite",
        "visualCommand:monbg",
        "visualCommand:splitbgprio",
      ],
      representatives: [...trackMoves],
      fulfilled: true,
      goal: fulfilledGoal,
    }]);
  });
});
