import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import sweetKissAsset from "../../src/animation/assets/sweet-kiss.json" with {
  type: "json",
};
import {
  SWEET_KISS_FRAME_COUNT,
  sweetKissAtAge,
} from "../../src/animation/sweetKiss.ts";

const opponent = { x: 176, y: 42 };
const player = { x: 72, y: 88 };

describe("MOVE_SWEET_KISS source-relative reducer", () => {
  it("ports both tagged loads, script waits, audio, and first cleanup", () => {
    expect(SWEET_KISS_FRAME_COUNT).toBe(159);
    expect(sweetKissAtAge(0, "opponent", opponent)).toMatchObject({
      active: true,
      redHeartLoaded: true,
      angelLoaded: false,
      scriptOffset: 0,
    });
    expect(sweetKissAtAge(4, "opponent", opponent).angelLoaded).toBe(true);
    expect([7, 32, 57].map((age) =>
      sweetKissAtAge(age, "opponent", opponent).sound
    )).toEqual(["SE_M_HEAL_BELL", "SE_M_HEAL_BELL", "SE_M_HEAL_BELL"]);
    expect(sweetKissAtAge(107, "opponent", opponent).sound).toBe(
      "SE_M_ATTRACT",
    );
    expect(sweetKissAtAge(158, "opponent", opponent)).toMatchObject({
      active: false,
      redHeartLoaded: true,
      angelLoaded: true,
      scriptOffset: 104,
      angel: null,
      hearts: [],
    });
  });

  it("ports AnimAngel's full target-relative path and terminal callback", () => {
    expect(sweetKissAtAge(7, "opponent", opponent).angel).toEqual({
      slot: 3,
      x: 192,
      y: -6,
      x2: 0,
      y2: 1,
      data0: 2,
      data2: 0,
      callback: "AnimAngel",
    });
    expect(sweetKissAtAge(96, "opponent", opponent).angel).toMatchObject({
      x: 192,
      y: -6,
      x2: -1,
      y2: 39,
      data0: 91,
      data2: 1,
    });
    expect(sweetKissAtAge(105, "opponent", opponent).angel).toMatchObject({
      x2: -6,
      y2: 39,
      data0: 100,
      data2: 10,
    });
    expect(sweetKissAtAge(106, "opponent", opponent).angel).toBeNull();
  });

  it("ports all six simultaneous AnimParticleBurst lifecycles", () => {
    const first = sweetKissAtAge(107, "player", player).hearts;
    expect(first).toHaveLength(6);
    expect(first.map(({ slot, x2, y2, data3, invisible }) => ({
      slot, x2, y2, data3, invisible,
    }))).toEqual([
      { slot: 3, x2: 0, y2: 0, data3: 3, invisible: false },
      { slot: 4, x2: -1, y2: 0, data3: 3, invisible: false },
      { slot: 5, x2: 0, y2: 0, data3: 3, invisible: false },
      { slot: 7, x2: 1, y2: 0, data3: 3, invisible: false },
      { slot: 9, x2: -1, y2: 0, data3: 3, invisible: false },
      { slot: 10, x2: -2, y2: 0, data3: 3, invisible: false },
    ]);
    expect(sweetKissAtAge(140, "player", player).hearts[0]).toMatchObject({
      data3: 102,
      invisible: false,
    });
    expect(sweetKissAtAge(141, "player", player).hearts[0]).toMatchObject({
      data3: 105,
      invisible: true,
    });
    expect(sweetKissAtAge(146, "player", player).hearts).toHaveLength(6);
    expect(sweetKissAtAge(147, "player", player).hearts).toEqual([]);
  });

  it("re-extracts Luvdisc, RED_HEART, and ANGEL art byte-for-byte", () => {
    const out = join(mkdtempSync(join(tmpdir(), "sweet-kiss-assets-")), "a.json");
    execFileSync("node", [
      "--experimental-strip-types",
      "tools/compare/extractSweetKissAssets.ts",
      "--out",
      out,
    ]);
    expect(JSON.parse(readFileSync(out, "utf8"))).toEqual(sweetKissAsset);
  });
});
