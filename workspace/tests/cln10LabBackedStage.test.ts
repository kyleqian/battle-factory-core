// cln10: the generic lab-backed compare stage (appStage id "lab") reproduces the hand-written fsc1 APP_STAGES entries from their lab JSON alone.
import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/engine/core.ts";
import { APP_STAGES, applyTraceStage, labBackedStage } from "../tools/compare/appTrace.ts";

const initial = (scene: "on" | "off") => createInitialState({ appRoute: "generated-orchestrator", battleScene: scene });
const FSC1 = ["dig-eq", "fly-gust", "dive-surf", "eqko"].flatMap((name) => (["off", "on"] as const).map((scene) => [`fsc1-${name}-${scene}`, scene] as const));

describe("generic lab-backed stage", () => {
  for (const [id, scene] of FSC1) {
    it(`${id}: lab JSON alone gives the hand-written stage's state`, () => {
      expect(labBackedStage(`../../battle-lab/${id}.json`, initial(scene))).toEqual(APP_STAGES[id]!(initial(scene)));
    });
  }

  it("applyTraceStage routes appStage id lab through oracleBattleLab.scenario", () => {
    const trace = { appStage: { id: "lab", frame: 0 }, oracleBattleLab: { scenario: "../../battle-lab/fsc1-dig-eq-off.json" } } as never;
    expect(applyTraceStage(trace, initial("off"))).toEqual(APP_STAGES["fsc1-dig-eq-off"]!(initial("off")));
    expect(() => applyTraceStage({ appStage: { id: "lab", frame: 0 } } as never, initial("off"))).toThrow(/needs oracleBattleLab.scenario/);
  });

  it("rejects a lab outside the Rattata-pair shape, naming the field", () => {
    expect(() => labBackedStage("../../battle-lab/factory-arbitrary-intro-yoshi-off.json", initial("off"))).toThrow(/lab stage factory-arbitrary-intro-yoshi-off: player\[0\]/);
  });
});
