import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Receipt = {
  readonly orientation: string;
  readonly attacker: {
    readonly species: string;
    readonly geometry: { readonly side: "player" | "opponent" };
  };
  readonly target: {
    readonly species: string;
    readonly geometry: { readonly side: "player" | "opponent" };
  };
  readonly sourceWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
  };
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly status?: string;
  readonly acceptance?: Readonly<Record<string, boolean>>;
};

function receipt(path: string): Receipt {
  return JSON.parse(readFileSync(path, "utf8")) as Receipt;
}

const correctedGoal = "FULFILLED: MOVE_MUD_SHOT independently proves its complete BROWN_ORB body through first inactive cleanup at 145/145 player-back and 144/144 opponent-front source/component, typed-seam, predecessor hardware OAM/matrix/palette transfer, immutable battlers, resources/registers/both audio players, raw-RGB, and actual-core framebuffer frames twice fresh, retaining cef2f4555ed31b7a945d3a04878d2b4e7364fd03fae4b017146a4c58763034c6/a9dcc157dbb3018a70deae84a0522bb650074ba451c5c038c2e47b347dbc0b3f and 85fe40b0e1f3dbc600ed00740f3a8b9a1fa910cc589a27462dabbffd1c901840/52bd4b4b7e590260e7dc06e8ee1726ca690534f7382f28afa3f177ad3549a443. MOVE_SECRET_POWER is independently exact for Factory indoor BATTLE_ENVIRONMENT_BUILDING -> Move_STRENGTH through its complete 102/102 bilateral first-active through first-inactive frames twice fresh, retaining 9d8f3ad7a472bdd940aa35a7aa7e9c62823d8d2b11c0114ce6d4b1f92aed73a3/af6ff533abeb22e9b2f45c09339dcb979ac8508501e64d6d012faa1eb91a2903 and 8d6902b63b3dc96622261856cdb413c452d3c55140465a674d97aa51271a2172/f4c81b0de053a8703ed10238c70d6398693fc937c1ad2d088de451a097d6376a. Factory does not dispatch Secret Power to Move_MUD_SHOT, and Secret Power receives no BROWN_ORB or Mud Shot component credit. The shared components do not waive either move's independent acceptance.";

describe("brown-orb-mud-shot component-track receipt ratchet", () => {
  it("requires both bilateral receipt sets, exact inventory, and the Factory Strength exclusion", () => {
    const mudShot = [
      receipt("tools/compare/fixtures/mud-shot-player-krabby-opponent-onix.json"),
      receipt("tools/compare/fixtures/mud-shot-opponent-krabby-player-onix.json"),
    ];
    const strength = [
      receipt("tools/compare/fixtures/secret-power-strength-player-teddiursa-opponent-onix.json"),
      receipt("tools/compare/fixtures/secret-power-strength-opponent-teddiursa-player-onix.json"),
    ];

    expect(mudShot.map((entry) => [
      entry.orientation,
      entry.attacker.species,
      entry.attacker.geometry.side,
      entry.target.species,
      entry.target.geometry.side,
      entry.sourceWindow,
      entry.evidenceSha256,
      entry.rawRgbSha256,
    ])).toEqual([
      ["player-back", "KRABBY", "player", "ONIX", "opponent", { startFrame: 212, endFrame: 356, frameCount: 145 },
        "cef2f4555ed31b7a945d3a04878d2b4e7364fd03fae4b017146a4c58763034c6",
        "a9dcc157dbb3018a70deae84a0522bb650074ba451c5c038c2e47b347dbc0b3f"],
      ["opponent-front", "KRABBY", "opponent", "ONIX", "player", { startFrame: 302, endFrame: 445, frameCount: 144 },
        "85fe40b0e1f3dbc600ed00740f3a8b9a1fa910cc589a27462dabbffd1c901840",
        "52bd4b4b7e590260e7dc06e8ee1726ca690534f7382f28afa3f177ad3549a443"],
    ]);
    expect(strength.map((entry) => [
      entry.orientation,
      entry.attacker.species,
      entry.attacker.geometry.side,
      entry.target.species,
      entry.target.geometry.side,
      entry.sourceWindow,
      entry.evidenceSha256,
      entry.rawRgbSha256,
      entry.status,
      entry.acceptance,
    ])).toEqual([
      ["player-back Teddiursa -> opponent-front Onix", "TEDDIURSA", "player", "ONIX", "opponent", { startFrame: 222, endFrame: 323, frameCount: 102 },
        "9d8f3ad7a472bdd940aa35a7aa7e9c62823d8d2b11c0114ce6d4b1f92aed73a3",
        "af6ff533abeb22e9b2f45c09339dcb979ac8508501e64d6d012faa1eb91a2903",
        "exact", { reducerPinned: true, typedSeam: true, productionFramebuffer: true, exact: true }],
      ["opponent-front Teddiursa -> player-back Onix", "TEDDIURSA", "opponent", "ONIX", "player", { startFrame: 222, endFrame: 323, frameCount: 102 },
        "8d6902b63b3dc96622261856cdb413c452d3c55140465a674d97aa51271a2172",
        "f4c81b0de053a8703ed10238c70d6398693fc937c1ad2d088de451a097d6376a",
        "exact", { reducerPinned: true, typedSeam: true, productionFramebuffer: true, exact: true }],
    ]);

    const dispatch = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/secretPowerSourceAudit.ts",
    ], { encoding: "utf8" })) as {
      readonly factory: {
        readonly mapType: string;
        readonly environment: string;
        readonly environmentValue: number;
        readonly reachableBodies: readonly string[];
      };
      readonly visualDispatch: Record<string, { readonly value: number; readonly body: string }>;
    };
    expect(dispatch.factory).toEqual({
      mapType: "MAP_TYPE_INDOOR",
      environment: "BATTLE_ENVIRONMENT_BUILDING",
      environmentValue: 8,
      reachableBodies: ["Move_STRENGTH"],
    });
    expect(dispatch.visualDispatch.BATTLE_ENVIRONMENT_BUILDING).toEqual({
      value: 8,
      body: "Move_STRENGTH",
    });
    expect(dispatch.visualDispatch.BATTLE_ENVIRONMENT_SAND).toEqual({
      value: 2,
      body: "Move_MUD_SHOT",
    });

    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact"))
      .toHaveLength(231);
    expect(coverage.entries.filter((entry: { status: string }) =>
      entry.status === "partial" || entry.status === "staged",
    )).toEqual([]);
    for (const move of ["MOVE_MUD_SHOT", "MOVE_SECRET_POWER"]) {
      expect(coverage.entries.find((entry: { move: string }) => entry.move === move))
        .toMatchObject({ move, status: "exact" });
    }
    const secretPower = coverage.entries.find((entry: { move: string }) =>
      entry.move === "MOVE_SECRET_POWER",
    );
    expect(secretPower.covered.join("\n")).not.toContain("BROWN_ORB");
    expect(secretPower.covered.join("\n")).not.toContain("Mud Shot");
    expect(coverage.componentTracks.filter((track: { id: string }) =>
      track.id === "brown-orb-mud-shot",
    )).toEqual([
      {
        id: "brown-orb-mud-shot",
        components: [
          "asset:ANIM_TAG_BROWN_ORB",
          "sprite:gMudShotOrbSpriteTemplate",
          "task:AnimTask_StartSinAnimTimer",
          "task:AnimTask_ShakeMon",
          "visualCommand:monbg",
          "visualCommand:splitbgprio",
          "visualCommand:setalpha",
          "visualCommand:clearmonbg",
          "visualCommand:blendoff",
        ],
        representatives: ["MOVE_MUD_SHOT", "MOVE_SECRET_POWER"],
        fulfilled: true,
        goal: correctedGoal,
      },
    ]);
  });
});
