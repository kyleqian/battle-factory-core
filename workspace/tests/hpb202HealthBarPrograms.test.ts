/**
 * hpb202 (docs/hpb202-health-bar-programs.md): (a) CalcNewBarValue's Q_24_8 branch (battle_interface.c:2334-2395) for maxHp < 48, notably
 * SHEDINJA (maxHp 1) - `1 -> 0 / 1` used to throw "did not converge"; (b) an hp command's program is validated against the displayed
 * field BEFORE the command (a switch-in earlier in the segment changes maxHP). Hermetic, healthbox + duration functions only.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  battleHealthBarAnimationFrames, battleHealthBarFillValueAtFrame, battleHealthBarValueAtFrame, calcBarFilledPixels,
} from "../src/engine/healthboxAssembly.ts";
import { battleResolutionCommandDuration, battleResolutionFieldBeforeCommand } from "../src/engine/battleResolutionPresentationRender.ts";

const series = (p: { maxHp: number; from: number; to: number }) =>
  Array.from({ length: battleHealthBarAnimationFrames(p) + 2 }, (_, i) => battleHealthBarValueAtFrame(p, i));

describe("hpb202 a: maxHp 1 (SHEDINJA) health bar", () => {
  it("1 -> 0 converges in 52 steps: HP text holds 1 until the last step, then 0", () => {
    const p = { maxHp: 1, from: 1, to: 0 };
    expect(battleHealthBarAnimationFrames(p)).toBe(52);
    const s = series(p);
    expect(s.slice(0, 52).every((v) => v === 1)).toBe(true);
    expect(s.slice(52)).toEqual([0, 0]);
  });
  it("0 -> 1 converges in 52 steps: HP text holds 0 until the last step, then 1", () => {
    const p = { maxHp: 1, from: 0, to: 1 };
    expect(battleHealthBarAnimationFrames(p)).toBe(52);
    const s = series(p);
    expect(s.slice(0, 52).every((v) => v === 0)).toBe(true);
    expect(s.slice(52)).toEqual([1, 1]);
  });
  it("currValue steps by Q_24_8(1)/48 = 5/256 per frame and lands exactly on the target", () => {
    const p = { maxHp: 1, from: 1, to: 0 };
    expect(battleHealthBarFillValueAtFrame(p, 1)).toBeCloseTo(1 - 5 / 256, 10);
    expect(battleHealthBarFillValueAtFrame(p, 51)).toBeCloseTo(1 - 255 / 256, 10);
    expect(battleHealthBarFillValueAtFrame(p, 52)).toBe(0);
  });
  it("the bar sliver rule: a lethal drain shows no pixel at the end, a still-alive target keeps a 1px sliver", () => {
    expect(calcBarFilledPixels(1 / 256, 0).filledPixels).toBe(0);
    expect(calcBarFilledPixels(1 / 256, 1).filledPixels).toBe(1);
  });
});

describe("hpb202 a: other maxHp < 48 programs converge on the Q_24_8 path and match the source's rounding", () => {
  it("maxHp 20, 20 -> 0: text rounds up while moving left, ends 0", () => {
    const p = { maxHp: 20, from: 20, to: 0 };
    const s = series(p);
    expect(s.slice(0, 6)).toEqual([20, 20, 20, 19, 19, 18]);
    expect(s.at(-1)).toBe(0);
    expect(battleHealthBarAnimationFrames(p)).toBe(49);
  });
  it("maxHp 20, 3 -> 11: text floors while moving right, ends 11", () => {
    const p = { maxHp: 20, from: 3, to: 11 };
    expect(series(p).slice(0, 6)).toEqual([3, 3, 3, 4, 4, 5]);
    expect(battleHealthBarAnimationFrames(p)).toBe(20);
  });
  it("every program of every maxHp 1..47 (all from/to) converges and is monotone toward its target", () => {
    for (let maxHp = 1; maxHp < 48; maxHp += 1) {
      for (let from = 0; from <= maxHp; from += 1) {
        for (let to = 0; to <= maxHp; to += 1) {
          const p = { maxHp, from, to };
          const frames = battleHealthBarAnimationFrames(p);
          const s = series(p);
          expect(s[frames], `${from}->${to}/${maxHp}`).toBe(to);
          for (let i = 1; i < s.length; i += 1) expect(to >= from ? s[i]! >= s[i - 1]! : s[i]! <= s[i - 1]!).toBe(true);
        }
      }
    }
  });
  it("maxHp >= 48 keeps the one-HP-per-frame path (control)", () => {
    const p = { maxHp: 48, from: 48, to: 0 };
    expect(battleHealthBarAnimationFrames(p)).toBe(48);
    expect(battleHealthBarFillValueAtFrame(p, 5)).toBe(43);
  });
});

describe("hpb202 b: an hp command's program is validated on the field before the command", () => {
  const mon = (maxHP: number, hp: number) => ({ side: "trainer", battler: 1, partyIndex: 0, species: 1, name: "X", level: 50, gender: "male", hp, maxHP, status: "none", moveIds: [1, 1, 1, 1], currentPP: [1, 1, 1, 1], ppBonuses: 0 }) as never;
  const player = { ...(mon(100, 100) as object), side: "player", battler: 0 } as never;
  const segmentStart = Object.freeze({ player, opponent: mon(50, 50) }) as never;
  const commands = [
    { type: "switch-in", battler: 1, incoming: mon(200, 150) },
    { type: "hp", battler: 1, from: 150, to: 120, healthValue: 30, timing: { minimumFrames: 0, holdFrames: 0 } },
  ] as never[];

  it("control: the segment-start field (maxHP 50) cannot hold 150 -> 120 (the pre-fix census harness's throw)", () => {
    expect(() => battleResolutionCommandDuration(commands[1]!, segmentStart)).toThrow("invalid HP program 150->120/50");
  });
  it("the field before the hp command (after the switch-in, maxHP 200) holds it: 30 steps + 1", () => {
    const field = battleResolutionFieldBeforeCommand(segmentStart, commands, 1);
    expect(battleResolutionCommandDuration(commands[1]!, field)).toBe(31);
  });
});

describe("hpb202 c: ROM receipts - SHEDINJA damage-KO health bar, production vs direct-mGBA frames (healthbox rectangle, twice-fresh ROM)", () => {
  for (const side of ["opp", "ply"] as const) {
    for (const scene of ["off", "on"] as const) {
      it(`${scene} / SHEDINJA ${side === "opp" ? "opponent" : "player"}: 53 hp-command rows, residual 0 at a unique offset`, () => {
        const r = JSON.parse(readFileSync(new URL(`../tools/integration/fixtures/hpb202/compare/shedinja-ko-${side}-${scene}.json`, import.meta.url), "utf8"));
        expect(r.hpCommand).toMatchObject({ from: 1, to: 0 });
        expect(r.barFrames).toBe(52);
        expect(r.perRow).toHaveLength(53);
        expect(r.best).toMatchObject({ box: 0, bar: 0 });
        expect(r.perRow.every((row: { box: number; bar: number }) => row.box === 0 && row.bar === 0)).toBe(true);
        expect(r.runnerUp.box).toBeGreaterThan(0);
      });
    }
  }
});
