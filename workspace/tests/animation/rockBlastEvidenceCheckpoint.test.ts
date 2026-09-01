import { describe, expect, it } from "vitest";
import { verifyRockBlastEvidence } from "../../tools/compare/rockBlastEvidence.ts";

describe("MOVE_ROCK_BLAST retained bilateral natural multi-hit evidence", () => {
  it("keeps every complete 90-row Scene-ON body, normalized maps, and twice-fresh raw receipts", () => {
    expect(verifyRockBlastEvidence()).toEqual({
      "player-back": {
        rows: 270,
        dense: "fc6b55865733db684147a0f70a8cefe1a525b43a1952e28c61dcf9bdb9b6c654",
        rawRgb: "768d8bb5f10a0460f38cfcfaf849b6aaec932992efe20f0013a0e69a8df0637e",
        changeMap: "7669c2bad28d27011becceb91113cfff1c921bc46754ea93014a615d391d1cc6",
      },
      "opponent-front": {
        rows: 180,
        dense: "010940a8f999cfeafca35cb8ba46f069aef8215ab68a1165a0c2832ce04ee6f6",
        rawRgb: "83973308d3d2492a8c3e62bebe8061d901f5914c196d5d7cf102da3198fd001d",
        changeMap: "90a40fb93f0bd22aad415b464075998c5eef73f484d7c85cc2e279ccea29eea1",
      },
    });
  });
});
