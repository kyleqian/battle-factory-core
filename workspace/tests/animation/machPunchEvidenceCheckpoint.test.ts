import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };
import fixture from "../../tools/compare/fixtures/mach-punch-evidence.json" with { type: "json" };
import { verifyMachPunchEvidence } from "../../tools/compare/machPunchEvidence.ts";

describe("MOVE_MACH_PUNCH complete bilateral Scene-ON evidence checkpoint", () => {
  it("replays every retained state, RGB, transfer, and normalized-map row", () => {
    const first = verifyMachPunchEvidence();
    expect(verifyMachPunchEvidence()).toEqual(first);
    expect(first).toEqual({ schema: "mach-punch-bilateral-evidence/v1", status: "unsupported-evidence-checkpoint", coverageCredit: false, orientations: {
      "player-back": { rows: 111, changedRows: 88, cleanupAge: 110, probeJsonSha256: "8e3c0f0a5d110a4e1f6754f9f47f06bfe54c84bc99236fb1724db54bc1fdecfa", rawRgbSequenceSha256: "ef4e9cee9787b82d959fe4589978882d1fd839899634b7c566d259be9c0e7b4d" },
      "opponent-front": { rows: 110, changedRows: 88, cleanupAge: 109, probeJsonSha256: "ed77e376adbdb6fe0d78b5b831b637a509256455a57c04c2320c363085bf7895", rawRgbSequenceSha256: "efd1f40061fd8a3575c6533933f0e82ecd5cc88e308796c95150e4fb156913f0" },
    }});
  });

  it("keeps historical evidence scope distinct while recognizing exact promotion", () => {
    expect(fixture.measured.background).toContain("BG_HIGHSPEED_OPPONENT");
    expect(fixture.measured.transfer).toContain("same-row monbg age 7");
    expect(fixture.scope).toEqual({ productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, framebufferAcceptanceAdded: false, coveragePromotion: false, componentTrackFulfilled: false, latchCredit: false, siblingCredit: false });
    expect(coverage.entries.find((entry) => entry.move === "MOVE_MACH_PUNCH")).toMatchObject({ status: "exact" });
    expect(coverage.queue).toEqual(["MOVE_NIGHTMARE"]);
    const machPunchTracks = coverage.componentTracks.filter((track) => track.representatives?.includes("MOVE_MACH_PUNCH"));
    expect(machPunchTracks).toHaveLength(1);
    expect(machPunchTracks[0]).toMatchObject({ id: "mach-punch-source-relative-body", fulfilled: true, goal: expect.stringContaining("FULFILLED") });
  });
});
