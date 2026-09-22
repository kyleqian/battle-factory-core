import { describe, expect, it } from "vitest";
import { verifyWillOWispReducer } from "../../tools/compare/verifyWillOWispReducer.ts";

describe("MOVE_WILL_O_WISP source-relative reducer", () => {
  it("replays all four orb and six fire programs bilaterally twice", () => {
    const result = verifyWillOWispReducer();
    expect(result["player-back"]).toMatchObject({ rows: 214, passes: 2, componentRows: 428 });
    expect(result["opponent-front"]).toMatchObject({ rows: 213, passes: 2, componentRows: 426 });
  });
});
