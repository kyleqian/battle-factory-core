import { describe, expect, it } from "vitest";
import { verifyTrickEvidence } from "../../tools/compare/trickEvidence.ts";

describe("MOVE_TRICK retained bilateral evidence checkpoint", () => {
  it("keeps both complete 225-row Scene-ON windows, normalized maps, and twice-fresh raw receipts", () => {
    expect(verifyTrickEvidence()).toEqual({
      "player-back": {
        rows: 225,
        dense: "617a34a9b562b35a474c6bd7aa3075edc2e5b69d00d038eb3adce2196eb534c3",
        rawRgb: "cba7bb5f19b26ec8837ec423b8d8a69e4b6dbe16477610f21cd7a125fa72832c",
        changeMap: "75d911e42cd05fad656f6dbd18e4dc778a6437024c68ad13c17831fa4860604b",
      },
      "opponent-front": {
        rows: 225,
        dense: "aff5bbd3eb7339192e180c7a8ec31de813568362299eea9e7573975db55af286",
        rawRgb: "bf0b4214d6c320efbc9618d5e576d7ee15e46e54225da3e24d84d810a8d06b69",
        changeMap: "e31cc539cab6bab3d03ce51c5c4f6887d667ecb978502d0b7088896d95a42b3f",
      },
    });
  });
});
