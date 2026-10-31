import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createInitialState, render, tick, type EngineState } from "../src/engine/core.ts";
import { presentationRngJump } from "../src/engine/presentationRng.ts";
import {
  DEFAULT_PRESENTATION_RNG_SEED,
  PRESENTATION_RNG_POLICY_V1,
  presentationRngFromTrace,
  presentationRngTraceMetadata,
} from "../src/engine/presentationRngHost.ts";
import { SessionRecorder } from "../src/sessionRecorder.ts";
import { stripAppTraceMetadata } from "../tools/compare/traceMetadata.ts";
import { playableAnimationReplay } from "../tools/integration/playableAnimationReplay.ts";

const SEED_A = 0x1234abcd;
const SEED_B = 0xfeed0042;

/** Logical state with the presentation-only host removed (the parity comparison input). */
function logical(state: EngineState): Omit<EngineState, "presentationRng"> {
  const { presentationRng: _presentationRng, ...rest } = state;
  return rest;
}

function replay(trace: ReturnType<typeof playableAnimationReplay>["trace"]): EngineState {
  const rng = presentationRngFromTrace(JSON.parse(JSON.stringify(trace)));
  let state = createInitialState({ battleScene: trace.battleScene, presentationSeed: rng.seed, presentationRngPolicy: rng.policy });
  for (const segment of trace.segments) {
    for (let i = 0; i < segment.frames; i += 1) state = tick(state, new Set(segment.buttons));
  }
  return state;
}

describe("presentation RNG on the ordinary playable route", () => {
  const onA = playableAnimationReplay("on", [0, 1, 0], SEED_A);
  const onB = playableAnimationReplay("on", [0, 1, 0], SEED_B);
  const offB = playableAnimationReplay("off", [0, 1, 0], SEED_B);

  it("seeds one host per battle from the session seed and steps it once per presented frame", () => {
    for (const [run, seed] of [[onA, SEED_A], [onB, SEED_B]] as const) {
      const session = run.state.presentationRng;
      expect(session).toMatchObject({ seed, policy: PRESENTATION_RNG_POLICY_V1, battlesStarted: 1 });
      expect(session.battleKey).toBe(run.state.factoryRoundBattleOrchestrator!.activeBattleCallStart);
      const host = session.host!;
      expect(host.battleOrdinal).toBe(0);
      expect(host.frame).toBeGreaterThan(100);
      // No body consumes the host yet: the stream is the battle seed advanced by presented frames.
      expect(host.bodies).toEqual([]);
      expect(host.state).toEqual({ value: presentationRngJump(seed, host.frame), provenance: "surrogate" });
      const first = run.boundaries[0]!.presentationRng.host!;
      expect(host.frame - first.frame).toBe(run.state.frame - run.boundaries[0]!.frame);
    }
    expect(onA.state.presentationRng.host!.state.value).not.toBe(onB.state.presentationRng.host!.state.value);
    // Kept outside the orchestrator (battle/RNG snapshots) entirely.
    expect(JSON.stringify(onA.state.factoryRoundBattleOrchestrator)).not.toContain("presentationRng");
    expect(createInitialState().presentationRng).toEqual({
      seed: DEFAULT_PRESENTATION_RNG_SEED, policy: PRESENTATION_RNG_POLICY_V1, battlesStarted: 0, battleKey: null, host: null,
    });
  });

  it("preserves rules, RNG, outcomes and facility state across presentation seeds and Scene ON/OFF", () => {
    expect(logical(onA.state)).toEqual(logical(onB.state));
    expect(onA.state.rngValue).toBe(onB.state.rngValue);
    expect(onA.trace.segments).toEqual(onB.trace.segments);
    expect(onA.observations).toEqual(onB.observations);
    for (const [on, off] of [[onA, offB], [onB, offB]] as const) {
      expect(on.boundaries).toHaveLength(off.boundaries.length);
      for (let index = 0; index < on.boundaries.length; index += 1) {
        const a = on.boundaries[index]!, b = off.boundaries[index]!;
        expect(a.rngValue).toBe(b.rngValue);
        const ao = a.factoryRoundBattleOrchestrator!, bo = b.factoryRoundBattleOrchestrator!;
        expect(ao.battle!.rng).toEqual(bo.battle!.rng);
        const { hitMarker: am, ...ar } = ao.battle!.rules.rulesContext;
        const { hitMarker: bm, ...br } = bo.battle!.rules.rulesContext;
        expect(ar).toEqual(br);
        expect(am ^ bm).toBe(0x80); // HITMARKER_NO_ANIMATIONS is the sole rule input difference.
        expect(ao.battle!.boundary).toEqual(bo.battle!.boundary);
        expect(ao.facilityState).toEqual(bo.facilityState);
        expect(ao.round.rules.rngValue).toBe(bo.round.rules.rngValue);
      }
    }
  });

  it("never draws on render: repainting leaves the host untouched and the pixels identical", () => {
    for (const state of [onA.state, onA.boundaries[1]!, offB.state]) {
      const before = JSON.stringify(state.presentationRng);
      const session = state.presentationRng;
      const first = render(state);
      const second = render(state);
      expect(Buffer.from(second).equals(Buffer.from(first))).toBe(true);
      expect(state.presentationRng).toBe(session);
      expect(JSON.stringify(state.presentationRng)).toBe(before);
    }
    // Only tick advances it, by exactly one step.
    const next = tick(onA.state, new Set());
    expect(next.presentationRng.host!.frame).toBe(onA.state.presentationRng.host!.frame + 1);
    expect(next.presentationRng.host!.state.value).toBe(presentationRngJump(onA.state.presentationRng.host!.state.value, 1));
  });

  it("exports seed + policy and reproduces the visuals and host on replay/reset", () => {
    expect(onA.trace.presentationRng).toEqual({ seed: "1234abcd", policy: PRESENTATION_RNG_POLICY_V1 });
    const replayed = replay(onA.trace);
    expect(replayed.presentationRng).toEqual(onA.state.presentationRng);
    expect(replayed).toEqual(onA.state);
    expect(Buffer.from(render(replayed)).equals(Buffer.from(render(onA.state)))).toBe(true);
    // Legacy export (no field) replays on the documented default seed, identical to a default run.
    const { presentationRng: _dropped, ...legacy } = onA.trace;
    expect(presentationRngFromTrace(JSON.parse(JSON.stringify(legacy)))).toEqual({ seed: 0x808db3eb, policy: PRESENTATION_RNG_POLICY_V1 });
    const legacyReplay = replay(legacy);
    expect(legacyReplay.presentationRng.seed).toBe(DEFAULT_PRESENTATION_RNG_SEED);
    expect(legacyReplay.presentationRng.host!.state.value)
      .toBe(presentationRngJump(DEFAULT_PRESENTATION_RNG_SEED, legacyReplay.presentationRng.host!.frame));
    expect(logical(legacyReplay)).toEqual(logical(onA.state));
    expect(() => presentationRngFromTrace({ presentationRng: { seed: "xyz", policy: PRESENTATION_RNG_POLICY_V1 } })).toThrow();
    expect(() => presentationRngFromTrace({ presentationRng: { seed: "1", policy: "presentation-rng.v0" } })).toThrow();
  });

  it("keeps the field in SessionTrace exports, omits it from ROM-bound traces, and honours it in appTrace", async () => {
    const recorder = new SessionRecorder();
    recorder.recordTick(new Set(["A"]));
    const meta = presentationRngTraceMetadata(createInitialState({ presentationSeed: 0xabc }).presentationRng);
    expect(meta).toEqual({ seed: "00000abc", policy: PRESENTATION_RNG_POLICY_V1 });
    const trace = recorder.toTrace({ appRoute: "generated-orchestrator", battleScene: "on", build: "t", presentationRng: meta });
    expect(JSON.parse(JSON.stringify(trace)).presentationRng).toEqual(meta);
    expect(recorder.toTrace({ appRoute: "generated-orchestrator", build: "t" })).not.toHaveProperty("presentationRng");
    expect(stripAppTraceMetadata({ segments: [], battleScene: "on" as const, presentationRng: meta })).toEqual({ segments: [] });
    // appTrace.ts is outside the typechecked tests graph (tsconfig include), so load it untyped.
    const appTracePath = "../tools/compare/appTrace.ts";
    const { renderAppTrace } = await import(/* @vite-ignore */ appTracePath) as {
      renderAppTrace: (trace: object) => Promise<unknown[]>;
    };
    const segments = [{ frames: 3, buttons: [] }];
    const legacyCaptures = await renderAppTrace({ segments, captureFrames: [2], battleScene: "on" });
    const seededCaptures = await renderAppTrace({ segments, captureFrames: [2], battleScene: "on", presentationRng: meta });
    expect(seededCaptures).toEqual(legacyCaptures); // no adapter consumes the host yet
    await expect(renderAppTrace({ segments, battleScene: "on", presentationRng: { seed: "nope", policy: PRESENTATION_RNG_POLICY_V1 } }))
      .rejects.toThrow("presentationRng.seed");
  });

  it("pins the browser shell seed choice: URL param, deterministic bench default, crypto otherwise, export metadata", () => {
    const main = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
    expect(main).toContain(`parsePresentationSeed(new URLSearchParams(location.search).get("presentationSeed"))`);
    expect(main).toContain("if (benchMode) return DEFAULT_PRESENTATION_RNG_SEED;");
    expect(main).toContain("crypto.getRandomValues(new Uint32Array(1))[0]!");
    // The session export now lives in the library's session (src/factorySession.ts).
    const session = readFileSync(new URL("../src/factorySession.ts", import.meta.url), "utf8");
    expect(session).toContain("presentationRng: presentationRngTraceMetadata(this.state.presentationRng)");
    expect(main.indexOf("const benchMode")).toBeLessThan(main.indexOf("function choosePresentationSeed"));
  });
});
