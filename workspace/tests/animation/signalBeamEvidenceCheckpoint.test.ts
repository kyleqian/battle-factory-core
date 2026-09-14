import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };
import fixture from "../../tools/compare/fixtures/signal-beam-evidence.json" with { type: "json" };
import { verifySignalBeamEvidence } from "../../tools/compare/signalBeamEvidence.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");

describe("MOVE_SIGNAL_BEAM complete legal bilateral Scene-ON evidence", () => {
  it("strictly regenerates every retained semantic/RGB row and normalized map twice", () => {
    const first = verifySignalBeamEvidence();
    expect(verifySignalBeamEvidence()).toEqual(first);
    expect(first).toEqual({
      schema: "signal-beam-bilateral-evidence/v1", status: "unsupported-evidence-checkpoint", coverageCredit: false,
      orientations: {
        "player-back": { rows: 146, changedRows: 101, probeJsonSha256: "1474a963e6f9489be42b8cacb5deaad8f7860a9fe485c9d948c32ae31f49432b", rawRgbSequenceSha256: "65469494ebc498596364f33121569ac2c2a5d4b50360932deff1d0a9ba1d05e0", cleanupAge: 145 },
        "opponent-front": { rows: 145, changedRows: 101, probeJsonSha256: "8e276c2a3fcbdb0fce9f146d842fd592b0082c5886b647adbbbbecee75176ad9", rawRgbSequenceSha256: "64cae816c6429ebdd0a0223aab867861c7c20d267a4105c68bc844193ff59144", cleanupAge: 144 },
      },
    });
    for (const side of ["player-back","opponent-front"] as const) {
      const map = JSON.parse(readFileSync(resolve(root,fixture.orientations[side].changeMap),"utf8")) as Json;
      expect(map).toMatchObject({ schema: "signal-beam-normalized-banked-change-map/v1", side });
      expect(map.rows).toHaveLength(side === "player-back" ? 146 : 145);
      expect(map.rows[0]).toMatchObject({ age: 0, active: true, scriptOffset: 0 });
      expect(map.rows.at(-1)).toMatchObject({ active: false, scriptOffset: 198, counts: { visual: 0, sound: 0 }, sprites: [], tasks: [] });
    }
  });

  it("pins all ten mechanisms while the later closure promotes the move and track", () => {
    expect(fixture.measured).toMatchObject({
      window: expect.stringContaining("Player-back frames 78..223"), orbStream: expect.stringContaining("23 red/green pairs"),
      timerWave: expect.stringContaining("ages 18..116"), shake: expect.stringContaining("RAM+1"), palette: expect.stringContaining("37/45/54/63/72/81/91"),
      resources: expect.stringContaining("all free"), audio: expect.stringContaining("-64 to +63"), hardwareBg: expect.stringContaining("changes no BG VRAM"),
      stateRng: expect.stringContaining("gameplay-RNG banks remain byte-immutable"), cleanup: expect.stringContaining("first inactive row"),
    });
    expect(fixture.latchConclusion).toContain("independently proves move-owned");
    expect(fixture.scope).toMatchObject({ productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, framebufferAcceptanceAdded: false, coveragePromotion: false, componentTrackFulfilled: false, siblingCredit: false });
    const data = coverage as Json;
    expect(data.entries).toHaveLength(253);
    expect(data.entries.find((entry: Json) => entry.move === "MOVE_SIGNAL_BEAM")).toMatchObject({ status: "exact" });
    expect(data.queue).toEqual([]);
    expect(data.componentTracks.find((entry: Json) => entry.id === "signal-beam-orb-stream")).toMatchObject({ representatives: ["MOVE_SIGNAL_BEAM"], fulfilled: true, goal: expect.stringContaining("FULFILLED") });
  });
});
