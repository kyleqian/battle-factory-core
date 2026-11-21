// cln10: the generic lab-backed compare stage (appStage id "lab") reproduces the hand-written fsc1 APP_STAGES entries from their lab JSON alone (cln11: modulo the approximated fields, see labStageEquivalenceView).
import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/engine/core.ts";
import { APP_STAGES, applyTraceStage, labBackedStage } from "../tools/compare/appTrace.ts";
import { labStageEquivalenceView as view } from "../tools/compare/labMon.ts";

const initial = (scene: "on" | "off") => createInitialState({ appRoute: "generated-orchestrator", battleScene: scene });
const FSC1 = ["dig-eq", "fly-gust", "dive-surf", "eqko"].flatMap((name) => (["off", "on"] as const).map((scene) => [`fsc1-${name}-${scene}`, scene] as const));

describe("generic lab-backed stage", () => {
  for (const [id, scene] of FSC1) {
    it(`${id}: lab JSON alone gives the hand-written stage's state`, () => {
      expect(view(labBackedStage(`../../battle-lab/${id}.json`, initial(scene)))).toEqual(view(APP_STAGES[id]!(initial(scene))));
    });
  }

  it("applyTraceStage routes appStage id lab through oracleBattleLab.scenario", () => {
    const trace = { appStage: { id: "lab", frame: 0 }, oracleBattleLab: { scenario: "../../battle-lab/fsc1-dig-eq-off.json" } } as never;
    expect(view(applyTraceStage(trace, initial("off")))).toEqual(view(APP_STAGES["fsc1-dig-eq-off"]!(initial("off"))));
    expect(() => applyTraceStage({ appStage: { id: "lab", frame: 0 } } as never, initial("off"))).toThrow(/needs oracleBattleLab.scenario/);
  });

  it("rejects a lab without overrides.parties, naming the lab (cln11: any parties lab is supported, see cln11GenericLabStage.test.ts)", () => {
    expect(() => labBackedStage("../../battle-lab/factory-arbitrary-intro-yoshi-off.json", initial("off"))).toThrow(/lab stage factory-arbitrary-intro-yoshi-off: /);
  });
});
