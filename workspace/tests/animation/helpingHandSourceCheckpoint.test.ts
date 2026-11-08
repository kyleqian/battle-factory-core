import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import asset from "../fixtures/data/helping-hand-tag-hand.json" with { type: "json" };
import { createScratchDir } from "../../tools/lib/scratch.ts";

const root = resolve(new URL("../..", import.meta.url).pathname);
const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];
const audit = () => JSON.parse(execFileSync(process.execPath, [
  "--experimental-strip-types", "tools/compare/helpingHandSourceAudit.ts",
], { cwd: root, encoding: "utf8" }));

describe("MOVE_HELPING_HAND source/asset/legal-staging checkpoint", () => {
  it("pins the whole success-only source body, carrier, and singles boundary", () => {
    expect(audit()).toMatchObject({
      move: "MOVE_HELPING_HAND", moveId: 270, status: "unsupported-source-contract",
      source: { root: { start: "0x82cdebf", endExclusive: "0x82cdf32", bytes: 115,
        sha256: "86c05ababc910453516400d00aa67053068e532995d78113dc015f3cc6d508bb" },
        text: { bytes: 668, sha256: "47f81c3d8294efa154c4bac20cceab3d7bfc5ddeca0ee2816cf4874a479049db" } },
      components: ["asset:ANIM_TAG_TAG_HAND", "sprite:gHelpingHandClapSpriteTemplate",
        "task:AnimTask_BlendMonInAndOut", "task:AnimTask_HelpingHandAttackerMovement", "task:AnimTask_ShakeMon2"],
      lifecycle: { sprites: 2, clapCallbacks: 60, movementCallbacks: 61, blendCallbacks: 24,
        shakes: [[2, 0, 5, 1], [2, 0, 5, 1], [3, 0, 10, 1]] },
      carrier: { lowestLegal: { index: 172, label: "FRONTIER_MON_VOLBEAT_1", species: "SPECIES_VOLBEAT" } },
      boundary: { mechanicLab: "v1 Level-50 singles", successRequires: "BATTLE_TYPE_DOUBLE", exactPromotionBlocked: true },
      ownership: { reducer: true, asset: true, seam: false, renderer: false, framebuffer: false, gameplay: false },
    });
  });

  it("re-extracts the full TAG_HAND sheet and both source-selected 32x32 cells", () => {
    const scratch = createScratchDir("helping-hand-assets-");
    const output = join(scratch, "tag-hand.json");
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/extractHelpingHandAssets.ts", "--out", output], { cwd: root });
    expect(readFileSync(output)).toEqual(readFileSync(join(root, "tests/fixtures/data/helping-hand-tag-hand.json")));
    expect(createHash("sha256").update(readFileSync(output)).digest("hex"))
      .toBe("89d0bca0c96fe3c3bb55e8b1d948415902731eef64d12bdce9531966899cc068");
    expect(asset).toMatchObject({ dimensions: { widthPixels: 32, heightPixels: 64, tiles: 32 },
      cells: { initial: { tileOffset: 0, tiles: expect.any(Array) }, clap: { tileOffset: 16, tiles: expect.any(Array) } } });
    expect(asset.cells.initial.tiles).toHaveLength(16);
    expect(asset.cells.clap.tiles).toHaveLength(16);
  });

  it.each([
    ["player-back", "tools/battle-lab/mechanic-helping-hand-player-volbeat-opponent-onix.json", true],
    ["opponent-front", "tools/battle-lab/mechanic-helping-hand-opponent-volbeat-player-onix.json", false],
  ])("keeps the %s stage complete, legal, bilateral, and transient-free", (_side, path, playerAttacker) => {
    const stage = JSON.parse(readFileSync(join(root, path), "utf8"));
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50 });
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    const attacker = playerAttacker ? stage.overrides.parties.player : stage.overrides.parties.opponent;
    for (const mon of [...stage.overrides.parties.player, ...stage.overrides.parties.opponent]) {
      expect(Object.keys(mon).sort()).toEqual(completeKeys);
      expect(Object.keys(mon.ivs).sort()).toEqual(statKeys);
      expect(Object.keys(mon.evs).sort()).toEqual(statKeys);
      expect(mon.moves).toHaveLength(4);
      expect(mon.ppUps).toHaveLength(4);
      for (const key of ["hp", "status", "stages", "weather", "outcome", "volatile"]) expect(mon).not.toHaveProperty(key);
    }
    expect(attacker[0]).toMatchObject({ species: 386, level: 50, nature: 24, item: 168, moves: [270, 270, 270, 270] });
  });

  it("leaves Helping Hand unsupported and its non-exclusive track unfulfilled", () => {
    const coverage = JSON.parse(readFileSync(join(root, "ANIMATION_COVERAGE.json"), "utf8"));
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_HELPING_HAND")).toBeUndefined();
    expect(coverage.componentTracks.find((track: any) => track.id === "helping-hand-clap"))
      .toMatchObject({ representatives: ["MOVE_HELPING_HAND"], fulfilled: false });
  });
});
