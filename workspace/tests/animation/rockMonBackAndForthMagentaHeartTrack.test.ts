import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CHARM_BODY_FRAME_COUNT } from "../../src/animation/charm.ts";
import { COVET_FRAME_COUNT } from "../../src/animation/covet.ts";
import { FAKE_TEARS_SOURCE_FRAME_COUNT } from "../../src/animation/fakeTears.ts";
import { TICKLE_FRAME_COUNT } from "../../src/animation/tickle.ts";
import { compactSemanticReceiptSha256 } from "../../tools/compare/semanticReceipt.ts";

type Window = { readonly startFrame: number; readonly endFrame: number; readonly frameCount?: number };
type Fixture = {
  readonly schema: string;
  readonly oracleProfile?: string;
  readonly move?: string;
  readonly orientation: string;
  readonly scenario: string;
  readonly probe: string;
  readonly attacker: { readonly species: string; readonly geometry: { readonly side: string } };
  readonly target: { readonly species: string; readonly geometry: { readonly side: string } };
  readonly sourceVisualWindow?: Window;
  readonly sourceWindow?: Window;
  readonly controllerWindow?: Window;
  readonly phaseWindows?: Readonly<Record<string, Window>>;
  readonly evidenceSha256?: string;
  readonly rawRgbSha256?: string;
  readonly lifecycleCounts?: Readonly<Record<string, number>>;
};
type Scenario = {
  readonly mode: string;
  readonly profile: string;
  readonly level: number;
  readonly playerSetIds: readonly number[];
  readonly opponentSetIds: readonly number[];
  readonly overrides: {
    readonly parties: {
      readonly player: readonly { readonly species: number; readonly moves: readonly number[] }[];
      readonly opponent: readonly { readonly species: number; readonly moves: readonly number[] }[];
    };
  };
};

const fixturePath = (name: string) => `tools/compare/fixtures/${name}.json`;
const receipt = (name: string): Fixture => JSON.parse(readFileSync(fixturePath(name), "utf8")) as Fixture;
const scenario = (path: string): Scenario => JSON.parse(readFileSync(path, "utf8")) as Scenario;
const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const frameCount = (window: Window) => window.endFrame - window.startFrame + 1;
const source = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
const body = (start: string, end: string) => source.slice(
  source.indexOf(start), source.indexOf(end, source.indexOf(start)),
);

const fulfilledGoal = "FULFILLED: MOVE_CHARM, MOVE_COVET, MOVE_FAKE_TEARS, and MOVE_TICKLE each retain independently legal, bilateral, twice-fresh exact receipts. Charm closes its 93-frame RockMonBackAndForth(attacker,2,0) plus MAGENTA_HEART body and four clean teardown frames; Covet closes its 114-frame Charm-derived prefix plus target ShakeMon2, load-only ITEM_BAG, and Dizzy Punch loop; Fake Tears closes its corrected set-267 DELCATTY 322-frame resolved-stat-drop controller window including its 87-frame BlendParticle/RockMonBackAndForth(attacker,2,1)/eight-tear body; and Tickle closes its corrected set-138 OMANYTE 205-frame EYE_SPARKLE/palette/SwayMon/RockMonBackAndForth(target,6,2) body. Shared components waive no move-owned latch, framebuffer, or sibling acceptance; species-301 Nincada and species-139 Omastar receipts are historical only.";

describe("rock-mon-back-and-forth-magenta-heart component-track receipt ratchet", () => {
  it("pins every independent legal bilateral fixture, window, and retained receipt hash", () => {
    const charm = [
      receipt("charm-player-minun-opponent-shuckle"),
      receipt("charm-opponent-minun-player-shuckle"),
    ];
    expect(charm.map((entry, index) => {
      const window = entry.sourceVisualWindow!;
      return [
        hash(readFileSync(fixturePath([
          "charm-player-minun-opponent-shuckle",
          "charm-opponent-minun-player-shuckle",
        ][index]!))),
        entry.schema, entry.oracleProfile, entry.move, entry.orientation,
        entry.attacker.species, entry.attacker.geometry.side,
        entry.target.species, entry.target.geometry.side, window, frameCount(window),
      ];
    })).toEqual([
      ["0fa79b8808d26600c739cb26a041e82c5dbd62ee687ad1d71d015f70ba5a7003", "scene-on-portable-component/v1", "battle-scene-on", "CHARM", "player-to-opponent", "MINUN", "player", "SHUCKLE", "opponent", { startFrame: 72, endFrame: 164 }, 93],
      ["ee4d466c5a84f5d2a6e08d410158869912d6dc52521baa3bd048a1f3c40660d3", "scene-on-portable-component/v1", "battle-scene-on", "CHARM", "opponent-to-player", "MINUN", "opponent", "SHUCKLE", "player", { startFrame: 76, endFrame: 168 }, 93],
    ]);
    expect(CHARM_BODY_FRAME_COUNT).toBe(93);

    const covet = [
      receipt("covet-player-linoone-opponent-shuckle"),
      receipt("covet-opponent-linoone-player-shuckle"),
    ];
    expect(covet.map((entry, index) => {
      const window = entry.sourceVisualWindow!;
      return [
        hash(readFileSync(fixturePath([
          "covet-player-linoone-opponent-shuckle",
          "covet-opponent-linoone-player-shuckle",
        ][index]!))),
        entry.schema, entry.oracleProfile, entry.move, entry.orientation,
        entry.attacker.species, entry.attacker.geometry.side,
        entry.target.species, entry.target.geometry.side, window, frameCount(window),
      ];
    })).toEqual([
      ["1326b7d2a85c944d660648cbf2d98916d3ce0b4b684b92f59fcdc6e03b3fbcd3", "scene-on-portable-component/v1", "battle-scene-on", "COVET", "player-to-opponent", "LINOONE", "player", "SHUCKLE", "opponent", { startFrame: 73, endFrame: 186 }, 114],
      ["7d2c75bfd52197ddec188037247255a9cefc45ac0f033e9a863ddde25cda59f5", "scene-on-portable-component/v1", "battle-scene-on", "COVET", "opponent-to-player", "LINOONE", "opponent", "SHUCKLE", "player", { startFrame: 77, endFrame: 190 }, 114],
    ]);
    expect(COVET_FRAME_COUNT).toBe(114);

    const fakeTears = [
      receipt("fake-tears-player-delcatty-opponent-shuckle"),
      receipt("fake-tears-opponent-delcatty-player-shuckle"),
    ];
    expect(fakeTears.map((entry, index) => [
      hash(readFileSync(fixturePath([
        "fake-tears-player-delcatty-opponent-shuckle",
        "fake-tears-opponent-delcatty-player-shuckle",
      ][index]!))),
      entry.oracleProfile, entry.orientation, entry.attacker.species,
      entry.attacker.geometry.side, entry.target.species, entry.target.geometry.side,
      entry.controllerWindow, entry.sourceVisualWindow, entry.phaseWindows,
      entry.evidenceSha256, entry.rawRgbSha256,
    ])).toEqual([
      ["e8abd82ef6deeeeb54cd3779d7878cfc1d1e2f8c2fd6f99c0f15231cdc2718b6", "battle-scene-on", "player-to-opponent", "DELCATTY", "player", "SHUCKLE", "opponent", { startFrame: 39, endFrame: 360, frameCount: 322 }, { startFrame: 76, endFrame: 162 }, {
        preAnimation: { startFrame: 39, endFrame: 75, frameCount: 37 }, sourceAnimation: { startFrame: 76, endFrame: 162, frameCount: 87 }, statDropStatus: { startFrame: 163, endFrame: 251, frameCount: 89 }, messagePostAnimation: { startFrame: 252, endFrame: 359, frameCount: 108 }, cleanup: { startFrame: 360, endFrame: 360, frameCount: 1 },
      }, "3b2470bdd96c77c68cf1f66686324335c078651b41e0c5d3ca2699a3bee1c5a9", "4aaf80e8cc8bdc94a0c369fce50893cfd6d84fd5f9dc7e565b2ed625a8cde8e1"],
      ["36b73e1411e6f7e2a58abf06e2e097e55022d535d0311da82b9e48783d4b9b15", "battle-scene-on", "opponent-to-player", "DELCATTY", "opponent", "SHUCKLE", "player", { startFrame: 39, endFrame: 360, frameCount: 322 }, { startFrame: 80, endFrame: 166 }, {
        preAnimation: { startFrame: 39, endFrame: 79, frameCount: 41 }, sourceAnimation: { startFrame: 80, endFrame: 166, frameCount: 87 }, statDropStatus: { startFrame: 167, endFrame: 255, frameCount: 89 }, messagePostAnimation: { startFrame: 256, endFrame: 359, frameCount: 104 }, cleanup: { startFrame: 360, endFrame: 360, frameCount: 1 },
      }, "c9b2f3d8ad20833d39e7f8cd73c0908e9c64c72b2dcf41ba0c86abc7615221ff", "e7828c486bd06f3a5db51c186fa84542397dfc44ef7a570f9b47c8e8fe2938fc"],
    ]);
    expect(FAKE_TEARS_SOURCE_FRAME_COUNT).toBe(87);

    const tickle = [
      receipt("tickle-player-omanyte-opponent-onix"),
      receipt("tickle-opponent-omanyte-player-onix"),
    ];
    expect(tickle.map((entry, index) => [
      hash(readFileSync(fixturePath([
        "tickle-player-omanyte-opponent-onix",
        "tickle-opponent-omanyte-player-onix",
      ][index]!))),
      entry.schema, entry.orientation, entry.attacker.species, entry.attacker.geometry.side,
      entry.target.species, entry.target.geometry.side, entry.sourceWindow,
      entry.lifecycleCounts, entry.evidenceSha256, entry.rawRgbSha256,
    ])).toEqual([
      ["10a22f40edbcae9b666ef7fa306c0905cfccd8e076ed2cd8e75f01aa82d7cd8e", "tickle-portable-evidence/v1", "player-back Omanyte -> opponent-front Onix", "OMANYTE", "player", "ONIX", "opponent", { startFrame: 288, endFrame: 492, frameCount: 205 }, { eyeSparkle: 2 }, "509f6618b019cb189b602d56100209797b1c9fa798bea3d7e5ec1472007e41c4", "5b6253ce26a3db3c078c5c9b175c28bc51d5ff7687f797828b04b3440b12da8c"],
      ["311ba32aebe105ac708ee48eb141a5465af3dfdeecb5f6583f71259a1017c4ea", "tickle-portable-evidence/v1", "opponent-front Omanyte -> player-back Onix", "OMANYTE", "opponent", "ONIX", "player", { startFrame: 288, endFrame: 492, frameCount: 205 }, { eyeSparkle: 2 }, "c4327c31510a8673b215646204184b6346c84323790815d0f80eff26b93e5447", "b06ea14f4dc50dd8750f01611d3dcc9dc83ad4748dee5484e122176f689323a5"],
    ]);
    expect(TICKLE_FRAME_COUNT).toBe(205);
  });

  it("requires the four legal carrier sets and rejects the superseded species as acceptance", () => {
    const scenarios = [
      "tools/battle-lab/mechanic-charm-player-minun-opponent-shuckle.json",
      "tools/battle-lab/mechanic-charm-opponent-minun-player-shuckle.json",
      "tools/battle-lab/mechanic-covet-player-linoone-opponent-shuckle.json",
      "tools/battle-lab/mechanic-covet-opponent-linoone-player-shuckle.json",
      "tools/compare/fixtures/mechanic-fake-tears-player-delcatty-opponent-shuckle.json",
      "tools/compare/fixtures/mechanic-fake-tears-opponent-delcatty-player-shuckle.json",
      "tools/battle-lab/mechanic-tickle-player-omanyte-opponent-onix.json",
      "tools/battle-lab/mechanic-tickle-opponent-omanyte-player-onix.json",
    ].map(scenario);
    expect(scenarios.map((entry) => [
      entry.mode, entry.profile, entry.level, entry.playerSetIds, entry.opponentSetIds,
      entry.overrides.parties.player[0]!.species, entry.overrides.parties.player[0]!.moves,
      entry.overrides.parties.opponent[0]!.species, entry.overrides.parties.opponent[0]!.moves,
    ])).toEqual([
      ["mechanicLab", "battle-scene-on", 50, [187, 186, 185], [135, 188, 184], 354, [204, 204, 204, 204], 213, [33, 33, 33, 33]],
      ["mechanicLab", "battle-scene-on", 50, [135, 188, 184], [187, 186, 185], 213, [33, 33, 33, 33], 354, [204, 204, 204, 204]],
      ["mechanicLab", "battle-scene-on", 50, [203, 202, 201], [188, 184, 185], 289, [343, 343, 343, 343], 213, [33, 33, 33, 33]],
      ["mechanicLab", "battle-scene-on", 50, [188, 184, 185], [203, 202, 201], 213, [33, 33, 33, 33], 289, [343, 343, 343, 343]],
      ["mechanicLab", "battle-scene-on", 50, [267, 268, 269], [349, 339, 327], 316, [313, 313, 313, 313], 213, [33, 33, 33, 33]],
      ["mechanicLab", "battle-scene-on", 50, [349, 339, 327], [267, 268, 269], 213, [33, 33, 33, 33], 316, [313, 313, 313, 313]],
      ["mechanicLab", "battle-scene-on", 50, [138, 149, 180], [184, 188, 135], 138, [321, 321, 321, 321], 95, [33, 33, 33, 33]],
      ["mechanicLab", "battle-scene-on", 50, [184, 188, 135], [138, 149, 180], 95, [33, 33, 33, 33], 138, [321, 321, 321, 321]],
    ]);
    expect(scenarios.flatMap((entry) => [
      entry.overrides.parties.player[0]!.species,
      entry.overrides.parties.opponent[0]!.species,
    ])).not.toContain(301); // historic Nincada is not set-267 DELCATTY evidence.
    expect(scenarios.slice(-2).flatMap((entry) => [
      entry.overrides.parties.player[0]!.species,
      entry.overrides.parties.opponent[0]!.species,
    ])).not.toContain(139); // superseded Omastar is not set-138 OMANYTE evidence.
  });

  it("keeps each source body and its move-owned task/art/audio distinction separate", () => {
    const charm = body("Move_CHARM:", "Move_ROLLOUT:");
    const covet = body("Move_COVET:", "Move_VOLT_TACKLE:");
    const fakeTears = body("Move_FAKE_TEARS:", "Move_AIR_CUTTER:");
    const tickle = body("Move_TICKLE:", "Move_WATER_SPOUT:");

    expect(charm).toContain("AnimTask_RockMonBackAndForth, 5, ANIM_ATTACKER, 2, 0");
    expect((charm.match(/gMagentaHeartSpriteTemplate/g) ?? [])).toHaveLength(3);
    expect(charm).toContain("SE_M_CHARM");
    expect(charm).not.toContain("ANIM_TAG_ITEM_BAG");
    expect(charm).not.toContain("AnimTask_ShakeMon2");

    expect(covet).toContain("loadspritegfx ANIM_TAG_ITEM_BAG");
    expect(covet).toContain("AnimTask_RockMonBackAndForth, 5, ANIM_ATTACKER, 2, 0");
    expect((covet.match(/gMagentaHeartSpriteTemplate/g) ?? [])).toHaveLength(3);
    expect(covet).toContain("AnimTask_ShakeMon2, 2, ANIM_TARGET, 2, 0, 8, 1");
    expect(covet).toContain("loopsewithpan SE_M_DIZZY_PUNCH, SOUND_PAN_TARGET, 4, 3");

    expect(fakeTears).toContain("AnimTask_BlendParticle, 5, ANIM_TAG_SMALL_BUBBLES, 0, 4, 4");
    expect(fakeTears).toContain("AnimTask_RockMonBackAndForth, 5, ANIM_ATTACKER, 2, 1");
    expect((fakeTears.match(/create_tear_drop_sprite/g) ?? [])).toHaveLength(8);
    expect(fakeTears).toContain("loopsewithpan SE_M_TAIL_WHIP, SOUND_PAN_ATTACKER, 12, 4");
    expect(fakeTears).not.toContain("ANIM_TAG_MAGENTA_HEART");

    expect(tickle).toContain("loadspritegfx ANIM_TAG_EYE_SPARKLE");
    expect((tickle.match(/gEyeSparkleSpriteTemplate/g) ?? [])).toHaveLength(2);
    expect(tickle).toContain("AnimTask_SwayMon, 3, 0, 6, 1280, 3, ANIM_ATTACKER");
    expect(tickle).toContain("AnimTask_RockMonBackAndForth, 3, ANIM_TARGET, 6, 2");
    expect(tickle).toContain("loopsewithpan SE_M_TAIL_WHIP, SOUND_PAN_TARGET, 8, 8");
    expect(tickle).not.toContain("gMagentaHeartSpriteTemplate");
    expect(tickle).not.toContain("create_tear_drop_sprite");

    const latches = readFileSync("ANIMATION_LATCHES.md", "utf8");
    expect(latches).toContain("The latch is per-MECHANISM");
    expect(latches).toContain("Never inherit a latch from a sibling move.");
    expect(latches).toContain("Default expectation where nothing is measured");
  });

  it("normalizes only the asserted-empty Fake Tears and Tickle transport fields", () => {
    const fresh = {
      schema: "fake-tears-transport-test",
      setup: { preCheckpointCaptures: [], label: "fake-tears" },
      frames: [0, true, "line\n"],
    };
    const historic = "{\"schema\":\"fake-tears-transport-test\",\"setup\":{\"label\":\"fake-tears\"},\"frames\":[0,true,\"line\\n\"]}\n";
    expect(compactSemanticReceiptSha256(fresh)).toBe(hash(historic));
    expect(() => compactSemanticReceiptSha256({
      ...fresh,
      setup: { label: "fake-tears" },
    })).toThrow("setup.preCheckpointCaptures must be []");
    expect(() => compactSemanticReceiptSha256({
      ...fresh,
      setup: { ...fresh.setup, preCheckpointCaptures: [1] },
    })).toThrow("setup.preCheckpointCaptures must be []");
    expect(readFileSync("tools/compare/fakeTearsPortable.ts", "utf8"))
      .toContain("compactSemanticReceiptSha256(probe)");
    expect(readFileSync("tools/compare/ticklePortable.ts", "utf8"))
      .toContain("compactSemanticReceiptSha256(probe)");
  });

  it("fulfills only the independently exact four-move track without moving coverage", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact"))
      .toHaveLength(232);
    expect(coverage.entries.filter((entry: { move: string }) => [
      "MOVE_CHARM", "MOVE_COVET", "MOVE_FAKE_TEARS", "MOVE_TICKLE",
    ].includes(entry.move))).toEqual([
      expect.objectContaining({ move: "MOVE_CHARM", status: "exact" }),
      expect.objectContaining({ move: "MOVE_COVET", status: "exact" }),
      expect.objectContaining({ move: "MOVE_FAKE_TEARS", status: "exact" }),
      expect.objectContaining({ move: "MOVE_TICKLE", status: "exact" }),
    ]);
    expect(coverage.componentTracks.filter((track: { id: string }) =>
      track.id === "rock-mon-back-and-forth-magenta-heart",
    )).toEqual([
      {
        id: "rock-mon-back-and-forth-magenta-heart",
        components: [
          "task:AnimTask_RockMonBackAndForth",
          "asset:ANIM_TAG_MAGENTA_HEART",
          "sprite:gMagentaHeartSpriteTemplate",
        ],
        representatives: ["MOVE_CHARM", "MOVE_FAKE_TEARS", "MOVE_TICKLE", "MOVE_COVET"],
        fulfilled: true,
        goal: fulfilledGoal,
      },
    ]);
  });
});
