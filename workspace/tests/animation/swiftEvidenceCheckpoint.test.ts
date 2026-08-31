import { describe, expect, it } from "vitest";
import { verifySwiftEvidence } from "../../tools/compare/swiftEvidence.ts";

describe("MOVE_SWIFT dense bilateral evidence checkpoint", () => {
  it("retains complete twice-fresh source/state and chronological raw RGB receipts", () => {
    expect(verifySwiftEvidence()).toEqual({
      "player-back": {
        rows: 78,
        dense: "3480a60c57692a637318b8a57f115e06a94da47a9a590ed13a8db0cf0c9b86a4",
        rawRgb: "f1168f7c44754ded5f8709afc583594a78c958cd0aaee3bcc589d2966239267b",
        changeMap: "ce6f900d8309ef3f7027b15158792237961efdf70fc46d51e6628459ef777951",
      },
      "opponent-front": {
        rows: 80,
        dense: "69e622dffd0a3690f939b9e0c6c8ac77e39a02d6b89e5c3764b06dbe4177dc69",
        rawRgb: "6d4eea48c872896248ed9769d6e3e23c074a2f21b70e190568f4509491e1d669",
        changeMap: "a68b234f2a4989fdfcede9717e728db635cdc1cd58e114945ee1871ff153ba34",
      },
    });
  });
});
