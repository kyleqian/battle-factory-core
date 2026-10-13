// gaf140 (S10A, ISSUES #168; docs/gaf140-status-gate-age.md): an IsBattleSEPlaying-GATED status-animation command carries its gate
// as `seGateFrames` (minimumFrames unchanged = gate + STATUS_ANIMATION_ADDED_ROWS) and the render effect's age is the command age minus
// the gate (the field as it is, shadow and rest included, during the gate rows) — sgl138's stats-change shape.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createBattleResolutionPresentationRenderView } from "../src/engine/battleResolutionPresentationRender.ts";
import { STATUS_ANIMATION_ADDED_ROWS } from "../src/engine/battleResolutionPresentation.ts";
import { generatedCommandAnimationReplay } from "../tools/integration/generatedCommandAnimationReplay.ts";
import { gaf140Window, GAF140_INFLICTED } from "../tools/integration/gaf140Compare.ts";

const F = "tools/integration/fixtures/gaf140";
const json = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex").slice(0, 16);

function constructed(timing: { minimumFrames: number; seGateFrames?: number }) {
  const field = Object.freeze({
    player: { species: 143, name: "SNORLAX", side: "player", battler: 0, partyIndex: 0, level: 50, hp: 100, maxHP: 100, gender: "male",
      status: "none", moveIds: [0, 0, 0, 0], currentPP: [0, 0, 0, 0], ppBonuses: 0 },
    opponent: { species: 57, name: "PRIMEAPE", side: "trainer", battler: 1, partyIndex: 0, level: 50, hp: 100, maxHP: 100, gender: "male",
      status: "none", moveIds: [0, 0, 0, 0], currentPP: [0, 0, 0, 0], ppBonuses: 0 },
  });
  const commands = [{ type: "status-animation", eventSequence: 1, battler: 1, animation: "PSN", timing }];
  return (age: number) => createBattleResolutionPresentationRenderView({
    field, segments: [{ field, beforeRules: null, afterRules: null, events: [], commands }], segmentIndex: 0, commandIndex: 0,
    lifecycle: { phase: "presenting", phaseElapsed: age }, confirmHandoff: null, opponentTrainer: null, sourceDecision: { kind: "use-move" },
    fadeTick: 0,
  } as never).effect;
}

describe("gaf140: the status-animation effect's age skips the IsBattleSEPlaying gate", () => {
  it("gated: no effect on the gate rows, then age = command age - gate; ungated: age = command age (unchanged)", () => {
    const gated = constructed({ minimumFrames: 7 + STATUS_ANIMATION_ADDED_ROWS.PSN, seGateFrames: 7 });
    for (let a = 0; a < 7; a++) expect(gated(a)?.type, `gate row ${a}`).not.toBe("status-animation");
    for (const a of [7, 8, 30, 7 + STATUS_ANIMATION_ADDED_ROWS.PSN - 1]) {
      expect(gated(a)).toMatchObject({ type: "status-animation", battler: 1, animation: "PSN", age: a - 7 });
    }
    const ungated = constructed({ minimumFrames: STATUS_ANIMATION_ADDED_ROWS.PSN });
    for (const a of [0, 1, 30, STATUS_ANIMATION_ADDED_ROWS.PSN - 1]) expect(ungated(a)).toMatchObject({ type: "status-animation", age: a });
  });

  it("production route 2:1 (Scene ON): the gated PRZ command carries seGateFrames = minimumFrames - added rows; its effect follows", () => {
    const seen: { gate: number | undefined; frames: number; ages: [number, number | null][] }[] = [];
    let key = "";
    generatedCommandAnimationReplay(2, "on", Array(8).fill(1), 0, true, true, (state: any) => {
      const r = state.battleResolutionPresentation;
      if (!r) return;
      const command = r.segments[r.segmentIndex]?.commands[r.commandIndex];
      if (command?.type !== "status-animation") { key = ""; return; }
      const k = `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}`;
      if (k !== key) seen.push({ gate: command.timing.seGateFrames, frames: command.timing.minimumFrames, ages: [] });
      key = k;
      const effect = createBattleResolutionPresentationRenderView(r).effect as any;
      seen.at(-1)!.ages.push([r.lifecycle.phaseElapsed, effect?.type === "status-animation" ? effect.age : null]);
    });
    const gated = seen.filter((s) => s.gate !== undefined);
    expect(gated.length).toBe(1);
    expect(gated[0]!.gate).toBe(6);
    expect(gated[0]!.frames).toBe(6 + STATUS_ANIMATION_ADDED_ROWS.PRZ);
    for (const [a, age] of gated[0]!.ages) expect(age, `age ${a}`).toBe(a < 6 ? null : a - 6);
    for (const s of seen.filter((x) => x.gate === undefined)) {
      expect(s.frames).toBe(STATUS_ANIMATION_ADDED_ROWS.PRZ);
      for (const [a, age] of s.ages) expect(age).toBe(a);
    }
  }, 120000);

  it("ROM receipt: 16 / 16 gated windows 0 px on every row (gate rows included); the controls fail; r1 == r2; census / routes", () => {
    const compare = json(`${F}/production-compare.json`);
    expect(compare.summary).toMatchObject({ neg: null, windows: 16, zeroPxWindows: 16, gateRowsZeroPxWindows: 16 });
    const animations = new Set(Object.values<any>(compare).filter((v) => v.animation).map((v) => `${v.animation}:${v.side}`));
    for (const a of ["BRN", "FRZ", "CONFUSION", "PSN", "PRZ", "INFATUATION", "SLP"]) {
      expect(animations.has(`${a}:player`) && animations.has(`${a}:opponent`), a).toBe(true);
    }
    const controls = json(`${F}/controls.json`);
    expect(controls.prefix.summary.zeroPxWindows).toBe(0);
    expect(controls["gate-1"].summary.zeroPxWindows).toBe(0);
    expect(controls["gate+1"].summary.zeroPxWindows).toBe(0);
    const probes = json(`${F}/probe-sha256.json`);
    expect(Object.keys(probes).length).toBe(16);
    for (const v of Object.values<any>(probes)) expect(v.r1).toBe(v.r2);
    const rom = json(`${F}/rom-r1.json`);
    for (const v of Object.values<any>(rom)) expect(v.seg127Match).toBe(true);
    const census = json(`${F}/census-delta.json`);
    expect(census).toMatchObject({ keyMismatches: 0, frameChanges: 0, statusChanges: [], liveFrameChanges: 0, declineChanges: 0,
      battleMismatches: 0, segmentMismatches: 0 });
    expect(Object.values(census.allShardDigestsSame).every(Boolean)).toBe(true);
    const routes = json(`${F}/routes-delta.json`);
    expect(routes.verdict).toBe("OK");
    expect(Object.keys(routes).filter((k) => k !== "verdict").length).toBeGreaterThanOrEqual(3);
  });

  it("every gated window's production frames == the receipt's (every row); the pre-fix command differs on every window", () => {
    const compare = json(`${F}/production-compare.json`);
    const rom = json(`${F}/rom-r1.json`);
    for (const [stem, v] of Object.entries<any>(compare)) {
      if (stem === "summary") continue;
      const scen = rom[stem];
      const w = scen.windows.find((x: any) => x.gated);
      expect(GAF140_INFLICTED.test(scen.window.label)).toBe(v.inflicted);
      const win = gaf140Window(scen.window.scenario, w, v.zeroed, w.gate, v.inflicted);
      const prefix = gaf140Window(scen.window.scenario, w, v.zeroed, null, v.inflicted);
      const frames: string[] = [];
      let prefixDiffers = 0;
      for (let a = -1; a <= win.rows + 1; a++) {
        const fb = sha(win.draw(win.viewAt(a)));
        frames.push(fb);
        if (sha(prefix.draw(prefix.viewAt(a))) !== fb) prefixDiffers++;
      }
      expect(frames, stem).toEqual(v.productionFrameSha);
      expect(prefixDiffers, stem).toBeGreaterThan(0);
    }
  }, 240000);
});
