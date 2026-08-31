import { describe, expect, it } from "vitest";
import { verifyRockBlastEvidence } from "../../tools/compare/rockBlastEvidence.ts";

describe("MOVE_ROCK_BLAST retained bilateral evidence checkpoint", () => {
  it("keeps both complete first-body 90-row Scene-ON windows, normalized maps, and twice-fresh raw receipts", () => {
    expect(verifyRockBlastEvidence()).toEqual({
      "player-back": {
        rows: 90,
        dense: "58de90d25a6e789a043e888d10f07df75ad9b19e664e0b10d83ab32ab77b3f1a",
        rawRgb: "3ec26484c71f10f26d918aac51225a1a5bac752da429a9494b1061240597a38d",
        changeMap: "b8a8b491918568712def6b8a5b7f68a2ea3f334bee46f01fc0bccb7b4f6249a9",
      },
      "opponent-front": {
        rows: 90,
        dense: "00d5fecf7b7e37b55acf4f350ece79e936156de1e580ed157850ccf0e1109e6d",
        rawRgb: "68caf65efba752ba1de58a5718189ae447919c2b0f209465c283c36c7c6bc1e1",
        changeMap: "5a4531449fc12521cc0e76d99a53a36261dacf3c953f4f8ee163f15b3b235a78",
      },
    });
  });
});
