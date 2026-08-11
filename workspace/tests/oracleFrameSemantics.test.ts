import { describe, expect, it } from "vitest";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

describe("Oracle/app trace frame semantics", () => {
  const segments = [
    { frames: 3, buttons: [] },
    { frames: 2, buttons: ["A"] },
    { frames: 1, buttons: [] },
  ];

  it("labels a two-frame press by the states produced by its advances", () => {
    const advances = [...traceAdvances(segments)].map((advance) => ({
      frame: advance.frame,
      buttons: [...advance.buttons],
    }));

    expect(advances).toEqual([
      { frame: 1, buttons: [] },
      { frame: 2, buttons: [] },
      { frame: 3, buttons: [] },
      { frame: 4, buttons: ["A"] },
      { frame: 5, buttons: ["A"] },
      { frame: 6, buttons: [] },
    ]);
  });

});
