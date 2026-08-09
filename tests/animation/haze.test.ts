import { describe, expect, it } from "vitest";
import { HAZE_BLEND_AMOUNTS, hazeAtAge } from "../../src/animation/haze.ts";

describe("MOVE_HAZE source-relative reducer", () => {
  it("pins the literal blend table and fog ramp/hold/cleanup boundaries", () => {
    expect(HAZE_BLEND_AMOUNTS).toEqual([0,1,2,2,2,2,3,4,4,4,5,6,6,6,6,7,8,8,8,9]);
    expect([6,7,10,11,78,79,163,164,192,196,197,200,201].map((age) => {
      const s = hazeAtAge(age); return [age, s.fogEva, s.bg1X, s.taskActive, s.active];
    })).toEqual([
      [6,0,-3,true,true],[7,1,-4,true,true],[10,1,-7,true,true],
      [11,2,-8,true,true],[78,8,-75,true,true],[79,9,-76,true,true],
      [163,9,-160,true,true],[164,8,-161,true,true],[192,1,-189,true,true],
      [196,0,-193,true,true],[197,0,-194,true,true],[200,0,-194,false,true],
      [201,0,0,false,false],
    ]);
  });

  it("pins the independent battler-black delay-2/hold/delay-1 schedule", () => {
    expect([38,39,41,42,83,84,128,129,130,157,158,159].map((age) =>
      [age, hazeAtAge(age).battlerBlackCoeff])).toEqual([
      [38,0],[39,1],[41,1],[42,2],[83,15],[84,16],[128,16],
      [129,15],[130,15],[157,1],[158,1],[159,0],
    ]);
  });
});
