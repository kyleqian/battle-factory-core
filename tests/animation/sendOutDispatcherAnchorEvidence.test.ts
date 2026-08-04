import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import frontPicAnimPrograms from "../../src/data/gen/front-pic-anim-programs.json" with { type: "json" };
import { frontSendOutFrameAtTick } from "../../src/animation/sendOutDispatcher.ts";
import { frontSendOutSpriteFrameAtTick } from "../../src/animation/sendOutSpriteFrame.ts";
import grovyleRunA from "../../tools/compare/fixtures/front-send-out-flight-grovyle-run-a.json" with { type: "json" };
import grovyleRunB from "../../tools/compare/fixtures/front-send-out-flight-grovyle-run-b.json" with { type: "json" };
import pidgeottoRunA from "../../tools/compare/fixtures/front-send-out-flight-pidgeotto-run-a.json" with { type: "json" };
import pidgeottoRunB from "../../tools/compare/fixtures/front-send-out-flight-pidgeotto-run-b.json" with { type: "json" };
import rattataRunA from "../../tools/compare/fixtures/front-send-out-flight-rattata-run-a.json" with { type: "json" };
import rattataRunB from "../../tools/compare/fixtures/front-send-out-flight-rattata-run-b.json" with { type: "json" };

const FIXTURES = "../../tools/compare/fixtures/";

type Sprite = {
  readonly slot: number;
  readonly flags: number;
  readonly visible: boolean;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly animNum: number;
  readonly animCmdIndex: number;
  readonly centerToCornerVecX: number;
  readonly centerToCornerVecY: number;
  readonly data: readonly number[];
  readonly callbackSymbol: string | null;
  readonly oam: { readonly attr0: number; readonly attr1: number; readonly attr2: number; readonly affineMode: number; readonly matrixNumber: number; readonly matrix: readonly number[]; readonly raw: string };
};
type TaskScan = { readonly slot: number; readonly callbackSymbol: string; readonly data: readonly number[]; readonly raw: string } | null;
type FlightRow = { readonly frame: number; readonly sha256: string; readonly battler1: Sprite | null; readonly monAnimationTask: TaskScan; readonly animateAfterDelayTask: TaskScan };
type FlightRun = {
  readonly schema: string;
  readonly profile: string;
  readonly species: string;
  readonly speciesId: number;
  readonly sourceFrontAnimId: string;
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number; readonly reachedSettledDummy: boolean };
  readonly derived: { readonly t_anchor: number; readonly t_animNumFlip: number; readonly t_move: number; readonly t_end: number; readonly animationDelay: number; readonly measuredGap: number };
  readonly callbackAddresses: Readonly<Record<string, number>>;
  readonly frames: readonly FlightRow[];
};
type Case = {
  readonly species: "GROVYLE" | "PIDGEOTTO" | "RATTATA";
  readonly speciesId: 278 | 17 | 19;
  readonly frontAnimId: "ANIM_V_STRETCH" | "ANIM_RAPID_H_HOPS";
  readonly rawSha256: string;
  readonly runA: FlightRun;
  readonly runB: FlightRun;
};

const CASES: readonly Case[] = [
  { species: "GROVYLE", speciesId: 278, frontAnimId: "ANIM_V_STRETCH", rawSha256: "84829e3637cecd5f73089b259a752c20c50111766584bb5d428de293c931a6e8", runA: grovyleRunA as FlightRun, runB: grovyleRunB as FlightRun },
  { species: "PIDGEOTTO", speciesId: 17, frontAnimId: "ANIM_V_STRETCH", rawSha256: "324148074d112d4608f264ddb82fc26a675cf17df6c64dc65c8bcdcceb51fe66", runA: pidgeottoRunA as FlightRun, runB: pidgeottoRunB as FlightRun },
  { species: "RATTATA", speciesId: 19, frontAnimId: "ANIM_RAPID_H_HOPS", rawSha256: "8d9d36f37f196a27c4ef831f951350c85f04dfa6cb06bb4041f0754aee7273bd", runA: rattataRunA as FlightRun, runB: rattataRunB as FlightRun },
];

// The single alignment constant: the mon-animation callback's OAM/struct write
// latches one display frame late (KABUTO hand-fit precedent,
// src/engine/kabutoSendOut.ts:66-69), so the RAM x2/y2 at frame f is the
// reducer result at tick f - t_move - 1. Measured identically across all three
// flights (GROVYLE, PIDGEOTTO, RATTATA) — see assertion (ii).
const FLIGHT_ALIGNMENT_A = -1;

const delayOf = (species: string): number =>
  (selectorTables.animationDelay.species as Readonly<Record<string, number>>)[species] ?? 0;

describe("front send-out flight RAM anchor evidence", () => {
  it("uses real opponent send-outs for the three probed species", () => {
    for (const fixture of CASES) {
      expect(fixture.runA).toMatchObject({
        schema: "front-send-out-flight/v1", profile: "battle-scene-on",
        species: fixture.species, speciesId: fixture.speciesId,
        sourceFrontAnimId: fixture.frontAnimId,
        sourceWindow: { reachedSettledDummy: true },
      });
      expect(fixture.runA.sourceWindow.frameCount).toBe(fixture.runA.frames.length);
      expect(Object.keys(fixture.runA.callbackAddresses).sort()).toEqual(
        ["SpriteCallbackDummy", "Task_AnimateAfterDelay", "Task_HandleMonAnimation", "WaitAnimEnd"].sort(),
      );
      for (const row of fixture.runA.frames) {
        expect(row.sha256).toMatch(/^[0-9a-f]{64}$/);
        expect(row.battler1).not.toBeNull();
        expect(row.battler1!.oam.matrix).toHaveLength(4);
        expect(row.battler1!.data).toHaveLength(8);
      }
    }
  });

  it("(i) anchor gaps: delay-0 species align; delay-25 defers by delay - 1", () => {
    const grovyle = CASES[0]!.runA.derived;
    const rattata = CASES[2]!.runA.derived;
    const pidgeotto = CASES[1]!.runA.derived;
    expect(delayOf("GROVYLE")).toBe(0);
    expect(delayOf("RATTATA")).toBe(0);
    expect(delayOf("PIDGEOTTO")).toBe(25);
    expect(grovyle.animationDelay).toBe(0);
    expect(rattata.animationDelay).toBe(0);
    expect(pidgeotto.animationDelay).toBe(25);
    expect(grovyle.measuredGap).toBe(rattata.measuredGap);
    expect(grovyle.measuredGap).toBe(0);
    // Task_AnimateAfterDelay runs `--sAnimDelay == 0` and its creation frame is
    // its first run, so a delay of d defers the Anim_* install by d-1 frames
    // after the affineAnimEnded handoff (measured 24 for d=25), not d.
    expect(pidgeotto.measuredGap).toBe(grovyle.measuredGap + delayOf("PIDGEOTTO") - 1);
    expect(pidgeotto.measuredGap).toBe(24);
    expect(pidgeotto.t_end - pidgeotto.t_move).toBe(42);
    expect(grovyle.t_end - grovyle.t_move).toBe(42);
    expect(rattata.t_end - rattata.t_move).toBe(87);
  });

  it.each(CASES)("(ii) $species: dispatcher reproduces every flight row's x2/y2 (A = FLIGHT_ALIGNMENT_A)", (fixture) => {
    const { species, derived, frames } = fixture.runA;
    let flightRows = 0;
    for (const row of frames) {
      const f = row.frame;
      if (f < derived.t_move || f > derived.t_end) continue;
      flightRows += 1;
      const tick = f - derived.t_move + FLIGHT_ALIGNMENT_A;
      const predicted = frontSendOutFrameAtTick(species, tick);
      if (predicted === null) {
        // Boundary row (f == t_move, tick -1): the callback-install frame. The
        // Anim_* callback is installed during the task phase, after the sprite
        // phase, so it has not run yet and the RAM still holds the pre-flight
        // neutral pose — the same entrance-boundary clamp the KABUTO hand-fit
        // applies.
        expect(f).toBe(derived.t_move);
        expect(row.battler1!.x2).toBe(0);
        expect(row.battler1!.y2).toBe(0);
      } else {
        expect({ x2: row.battler1!.x2, y2: row.battler1!.y2 }, `frame ${f} tick ${tick}`).toEqual(predicted);
      }
    }
    expect(flightRows, `${species} validated rows from t_move through t_end`).toBe(derived.t_end - derived.t_move + 1);
  });

  it("(iii) RATTATA settled rows (after t_end) hold the terminal x2=1, y2=0", () => {
    const { derived, frames } = CASES[2]!.runA;
    const settled = frames.filter((row) => row.frame > derived.t_end);
    expect(settled.length).toBeGreaterThan(0);
    for (const row of settled) {
      expect({ x2: row.battler1!.x2, y2: row.battler1!.y2 }, `frame ${row.frame}`).toEqual({ x2: 1, y2: 0 });
    }
  });

  it("(iv) animNum flips 0->1 at t_anchor for all three; program starts there undelayed", () => {
    for (const fixture of CASES) {
      const { species, derived, frames } = fixture.runA;
      expect(frames.find((row) => row.frame === derived.t_anchor)!.battler1!.animNum).toBe(1);
      for (const row of frames) {
        if (row.frame >= derived.t_anchor && row.frame <= derived.t_end) {
          expect(row.battler1!.animNum, `${species} frame ${row.frame}`).toBe(1);
        }
      }
      expect(frontSendOutSpriteFrameAtTick(species, 0)).toBe(0);
    }
  });

  it("(iv) GROVYLE animCmdIndex matches the index-1 program's cumulative durations with latch offset 0", () => {
    const program = (frontPicAnimPrograms.species as Readonly<Record<string, ReadonlyArray<{ readonly frame: number; readonly duration: number }>>>)["GROVYLE"];
    expect(program).toBeDefined();
    const boundaries: number[] = [];
    let consumed = 0;
    for (const step of program) {
      consumed += step.duration;
      boundaries.push(consumed);
    }
    const commandAt = (offset: number): number => {
      for (let index = 0; index < boundaries.length; index += 1) {
        if (offset < boundaries[index]!) return index;
      }
      return boundaries.length - 1;
    };
    // Observed latch offset: 0 — animCmdIndex 0 is already visible on the
    // anchor frame itself (the command-0 window [0,10) contains offset 0), so
    // the ANIMCMD program is not deferred by animationDelay nor by any OAM
    // latch, matching frontSendOutSpriteFrameAtTick's anchor statement.
    const { derived, frames } = CASES[0]!.runA;
    for (const row of frames) {
      if (row.frame < derived.t_anchor) continue;
      expect(row.battler1!.animCmdIndex, `frame ${row.frame}`).toBe(commandAt(row.frame - derived.t_anchor));
    }
  });

  it.each(CASES)("(v) $species: run-a and run-b are byte-identical and structurally equal", (fixture) => {
    const name = fixture.species.toLowerCase();
    const rawA = readFileSync(new URL(`${FIXTURES}front-send-out-flight-${name}-run-a.json`, import.meta.url));
    const rawB = readFileSync(new URL(`${FIXTURES}front-send-out-flight-${name}-run-b.json`, import.meta.url));
    expect(rawA.equals(rawB)).toBe(true);
    expect(rawA.at(-1)).toBe("\n".charCodeAt(0));
    expect(createHash("sha256").update(rawA).digest("hex")).toBe(fixture.rawSha256);
    expect(fixture.runA).toEqual(fixture.runB);
  });
});
