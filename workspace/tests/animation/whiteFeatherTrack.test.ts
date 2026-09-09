import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type DenseWindow = {
  readonly startFrame: number;
  readonly endFrame: number;
  readonly frameCount?: number;
};

type Fixture = {
  readonly schema: string;
  readonly oracleProfile: string;
  readonly move: string;
  readonly orientation?: string;
  readonly pair?: string;
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow?: DenseWindow;
  readonly sourceWindow?: DenseWindow;
  readonly appStage: Readonly<Record<string, number>>;
  readonly acceptance?: {
    readonly status: string;
    readonly denseEvidenceFrames: number;
    readonly productionFramebufferFrames: number;
  };
  readonly probeJsonSha256?: string;
  readonly secondFreshProbeJsonSha256?: string;
  readonly rawRgbSha256?: string;
  readonly changeMap?: string;
  readonly changeMapSha256?: string;
};

const fixturePaths = [
  "tools/compare/fixtures/feather-dance-pidgeotto-onix.json",
  "tools/compare/fixtures/feather-dance-player-pidgeotto-onix.json",
  "tools/compare/fixtures/mist-ball-player-latias-opponent-registeel.json",
  "tools/compare/fixtures/mist-ball-opponent-latias-player-registeel.json",
] as const;

const fulfilledGoal =
  "FULFILLED: MOVE_FEATHER_DANCE exactly proves its eight gFallingFeatherSpriteTemplate creates plus complete stat-drop continuation in both source-required target-side orientations at 400/400 each. MOVE_MIST_BALL independently proves its distinct SMALL_BUBBLES projectile, two ShakeMon invocations, background/target palette programs, and complete scrolling MistBallFog BG1 pipeline at 213/213 in both orientations twice fresh. WHITE_FEATHER is loaded but unused by Mist Ball; neither move receives acceptance, a sprite-body claim, or a latch from the other.";

function fixture(path: string): Fixture {
  return JSON.parse(readFileSync(path, "utf8")) as Fixture;
}

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function receipt(path: string) {
  const entry = fixture(path);
  const window = entry.denseWindow ?? entry.sourceWindow;
  if (!window) throw new Error(`${path} has no dense evidence window`);
  return {
    path,
    schema: entry.schema,
    oracleProfile: entry.oracleProfile,
    move: entry.move,
    orientation: entry.orientation ?? null,
    pair: entry.pair ?? null,
    scenario: entry.scenario,
    probe: entry.probe,
    window: {
      startFrame: window.startFrame,
      endFrame: window.endFrame,
      frameCount: window.frameCount ?? window.endFrame - window.startFrame + 1,
    },
    appStage: entry.appStage,
    acceptance: entry.acceptance ?? null,
    probeJsonSha256: entry.probeJsonSha256 ?? null,
    secondFreshProbeJsonSha256: entry.secondFreshProbeJsonSha256 ?? null,
    rawRgbSha256: entry.rawRgbSha256 ?? null,
    changeMap: entry.changeMap ?? null,
    changeMapSha256: entry.changeMapSha256 ?? null,
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

describe("white-feather component-track receipt ratchet", () => {
  it("pins all four independent fixture identities, dense windows, and hashes", () => {
    expect(fixturePaths.map(receipt)).toEqual([
      {
        path: fixturePaths[0],
        schema: "scene-on-portable-compare/v1",
        oracleProfile: "battle-scene-on",
        move: "FEATHER_DANCE",
        orientation: null,
        pair: "PIDGEOTTO (opponent-front) -> ONIX (player-back)",
        scenario: "tools/battle-lab/mechanic-feather-dance-pidgeotto-onix.json",
        probe: "tools/probe/run-battle-lab-rgb.py",
        window: { startFrame: 46, endFrame: 445, frameCount: 400 },
        appStage: { oracleFrame: 46, presentationAge: 7 },
        acceptance: null,
        probeJsonSha256: null,
        secondFreshProbeJsonSha256: null,
        rawRgbSha256: null,
        changeMap: null,
        changeMapSha256: null,
        fixtureSha256: "f04cf7a869837fe015bddca9b75d173977a9f3c9eb78040d952538603bd1be31",
      },
      {
        path: fixturePaths[1],
        schema: "scene-on-portable-compare/v1",
        oracleProfile: "battle-scene-on",
        move: "FEATHER_DANCE",
        orientation: "player-to-opponent",
        pair: "PIDGEOTTO (player-back) -> ONIX (opponent-front)",
        scenario: "tools/battle-lab/mechanic-feather-dance-player-pidgeotto-onix.json",
        probe: "tools/probe/run-battle-lab-rgb.py",
        window: { startFrame: 46, endFrame: 445, frameCount: 400 },
        appStage: { oracleFrame: 46, presentationAge: 7 },
        acceptance: null,
        probeJsonSha256: null,
        secondFreshProbeJsonSha256: null,
        rawRgbSha256: null,
        changeMap: null,
        changeMapSha256: null,
        fixtureSha256: "59cf2460d683983be6629098d0cb02a4399e5dd4631cb18c8162ee8a59dc7216",
      },
      {
        path: fixturePaths[2],
        schema: "mist-ball-portable-evidence/v1",
        oracleProfile: "battle-scene-on",
        move: "MIST_BALL",
        orientation: "player-back",
        pair: null,
        scenario: "tools/battle-lab/mechanic-mist-ball-player-latias-opponent-registeel.json",
        probe: "tools/compare/mistBallProbe.py",
        window: { startFrame: 75, endFrame: 287, frameCount: 213 },
        appStage: { presentationAge: 0 },
        acceptance: { status: "exact", denseEvidenceFrames: 213, productionFramebufferFrames: 213 },
        probeJsonSha256: "cbdb661c7acff845e050508ae045865925fbc33534625020f61718ea65e23af3",
        secondFreshProbeJsonSha256: "cbdb661c7acff845e050508ae045865925fbc33534625020f61718ea65e23af3",
        rawRgbSha256: "0324bfaf3533f79fe00d7da9d96dc92492d4749ee371c3a172f725ae3f90d9df",
        changeMap: "tools/compare/evidence/mist-ball-changemap-player.txt",
        changeMapSha256: "7dc1852fa4062a55b474288318a29a6e11c55bdf95a12ec91380fce88c04dfc4",
        fixtureSha256: "ddbc676b7411a4901275610f00b84235c32eadfac520af9cfd2fc1e3e0f7e746",
      },
      {
        path: fixturePaths[3],
        schema: "mist-ball-portable-evidence/v1",
        oracleProfile: "battle-scene-on",
        move: "MIST_BALL",
        orientation: "opponent-front",
        pair: null,
        scenario: "tools/battle-lab/mechanic-mist-ball-opponent-latias-player-registeel.json",
        probe: "tools/compare/mistBallProbe.py",
        window: { startFrame: 79, endFrame: 291, frameCount: 213 },
        appStage: { presentationAge: 0 },
        acceptance: { status: "exact", denseEvidenceFrames: 213, productionFramebufferFrames: 213 },
        probeJsonSha256: "882e3de5031211f60df8f39795d22ebb06c3770dc38deee15de487357a13f762",
        secondFreshProbeJsonSha256: "882e3de5031211f60df8f39795d22ebb06c3770dc38deee15de487357a13f762",
        rawRgbSha256: "4729defc1099a6569f060d80f46fb8a1d7434c4645678092f5211b3e63787a83",
        changeMap: "tools/compare/evidence/mist-ball-changemap-opponent.txt",
        changeMapSha256: "e9309993b6a65655e6fa2a3c2551f2e4fa2f7948f03246281287a1f2b1823519",
        fixtureSha256: "25b1fc24e078c3c8fec4434130bab77b574e730e4ceee7e3d4ecf5afef894334",
      },
    ]);
  });

  it("keeps the two authoritative source bodies distinct and gives all eight falling feathers only to Feather Dance", () => {
    const source = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
    const mistBall = sourceBody(source, "Move_MIST_BALL:", "Move_FEATHER_DANCE:");
    const featherDance = sourceBody(source, "Move_FEATHER_DANCE:", "Move_TEETER_DANCE:");

    expect(new Set([mistBall, featherDance]).size).toBe(2);
    expect(featherDance).toContain("loadspritegfx ANIM_TAG_WHITE_FEATHER");
    expect(featherDance.match(/createsprite gFallingFeatherSpriteTemplate/g)).toHaveLength(8);
    expect(featherDance).toContain("monbg ANIM_DEF_PARTNER");
    expect(featherDance).toContain("splitbgprio_all");
    expect(featherDance).toContain("waitforvisualfinish");
    expect(featherDance).not.toContain("ANIM_TAG_SMALL_BUBBLES");
    expect(featherDance).not.toContain("gMistBallSpriteTemplate");

    expect(mistBall).toContain("loadspritegfx ANIM_TAG_SMALL_BUBBLES");
    expect(mistBall).toContain("loadspritegfx ANIM_TAG_WHITE_FEATHER");
    expect(mistBall.match(/createsprite gMistBallSpriteTemplate/g)).toHaveLength(1);
    expect(mistBall.match(/gFallingFeatherSpriteTemplate/g) ?? []).toHaveLength(0);
    expect(mistBall).toContain("createvisualtask AnimTask_MistBallFog, 5");
    expect(mistBall.match(/createvisualtask AnimTask_ShakeMon/g)).toHaveLength(2);
    expect(mistBall).toContain("complex_palette_blend");
  });

  it("keeps each move's portable obligations and measured latches move-owned", () => {
    const featherPortable = readFileSync("tools/compare/featherDancePortable.ts", "utf8");
    const mistPortable = readFileSync("tools/compare/mistBallPortable.ts", "utf8");
    const latches = readFileSync("ANIMATION_LATCHES.md", "utf8");

    for (const rule of [
      "The latch is per-MECHANISM (per source task, per sprite class), never",
      "Never inherit a latch from a sibling move.",
      "When a ledger entry and a change map disagree, the change map wins.",
      "Bank change maps per orientation during staging",
      "Default expectation where nothing is measured: visible events display ONE",
    ]) expect(latches).toContain(rule);

    expect(featherPortable).toContain("tools/run-mgba-probe.py");
    expect(featherPortable).toContain("fixture.denseWindow.startFrame");
    expect(featherPortable).toContain("const rgba = render(state)");
    expect(featherPortable).toContain("matching === total");

    expect(mistPortable).toContain("for (let run = 1; run <= 2");
    expect(mistPortable).toContain("tools/run-mgba-probe.py");
    expect(mistPortable).toContain("loaded-unused WHITE_FEATHER spawned");
    expect(mistPortable).toContain("OAM/palette RAM+1 latch");
    expect(mistPortable).toContain("productionFramebufferFrames !== 213");
    expect(mistPortable).toContain("production-framebuffer frames exact");
    expect(latches).toContain("`AnimTask_ShakeMon` | RAM+1");
    expect(latches).toContain("`AnimTask_MistBallFog` BG1 transfer and blend");
    expect(latches).toContain("Mist Ball fog palette index zero is opaque BG source");
    expect(latches).toContain("Mist Ball projectile painter priority changes with orientation");
  });

  it("fulfills only white-feather while retaining both independently exact move statuses", () => {
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
    const moves = new Set(["MOVE_FEATHER_DANCE", "MOVE_MIST_BALL"]);

    expect(coverage.entries.filter((entry) => entry.status === "exact")).toHaveLength(242);
    expect(coverage.entries.filter((entry) => entry.status === "partial" || entry.status === "staged"))
      .toHaveLength(0);
    expect(coverage.entries.filter((entry) => moves.has(entry.move)).map((entry) => [
      entry.move,
      entry.status,
    ]).sort(([left], [right]) => left.localeCompare(right))).toEqual([
      ["MOVE_FEATHER_DANCE", "exact"],
      ["MOVE_MIST_BALL", "exact"],
    ]);
    expect(coverage.componentTracks.filter((track) => track.id === "white-feather").map((track) => ({
      id: track.id,
      components: track.components,
      representatives: track.representatives,
      fulfilled: track.fulfilled,
      goal: track.goal,
    }))).toEqual([{
      id: "white-feather",
      components: ["asset:ANIM_TAG_WHITE_FEATHER", "sprite:gFallingFeatherSpriteTemplate"],
      representatives: ["MOVE_FEATHER_DANCE", "MOVE_MIST_BALL"],
      fulfilled: true,
      goal: fulfilledGoal,
    }]);
  });
});
