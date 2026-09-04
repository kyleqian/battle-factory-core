import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Receipt = {
  orientation: string;
  sourceWindow: { startFrame: number; endFrame: number; frameCount: number };
  lifecycleCounts: Record<string, number>;
  evidenceSha256: string;
  rawRgbSha256: string;
};

function receipt(path: string): Receipt {
  return JSON.parse(readFileSync(path, "utf8")) as Receipt;
}

describe("letter-z-rest component-track receipt ratchet", () => {
  it("requires both independently exact move receipts before the track is fulfilled", () => {
    const rest = [
      receipt("tools/compare/fixtures/rest-player-teddiursa-opponent-onix.json"),
      receipt("tools/compare/fixtures/rest-opponent-teddiursa-player-onix.json"),
    ];
    const sleepTalk = [
      receipt("tools/compare/fixtures/sleep-talk-player-seaking-opponent-onix.json"),
      receipt("tools/compare/fixtures/sleep-talk-opponent-seaking-player-onix.json"),
    ];

    expect(rest.map((entry) => [
      entry.orientation,
      entry.sourceWindow,
      entry.lifecycleCounts.gSleepLetterZSpriteTemplate,
      entry.evidenceSha256,
      entry.rawRgbSha256,
    ])).toEqual([
      ["player-back Teddiursa -> opponent-front Onix", { startFrame: 334, endFrame: 443, frameCount: 110 }, 3,
        "747ad02e7af670dc0f33c0333d4378961e5d7a4d96ae841574190d63ec16f0ec",
        "3a9f0a794e93bbb68b485748733866ed27477d59577b7a4905642dd7655f2d63"],
      ["opponent-front Teddiursa -> player-back Onix", { startFrame: 338, endFrame: 447, frameCount: 110 }, 3,
        "2004fa6cd6fd01c5fd0a50558405783909984431c5d08b9433f4670c52380d03",
        "6caad649f87c5bef7bc1098629addf19981c7ce4ed9d2db4dc0f1e8d25e86a67"],
    ]);
    expect(sleepTalk.map((entry) => [
      entry.orientation,
      entry.sourceWindow,
      entry.lifecycleCounts.gLetterZSpriteTemplate,
      entry.evidenceSha256,
      entry.rawRgbSha256,
    ])).toEqual([
      ["player-back", { startFrame: 1356, endFrame: 1541, frameCount: 186 }, 9,
        "4badf2d5678fc8c329f5a39bff98683d642274cfa630804a089472ea568fe8de",
        "24c97994c4e5f4be9f8ab84cc9db8fe511b2efc360202a4dd9f0e3fa8a101f2a"],
      ["opponent-front", { startFrame: 4570, endFrame: 4758, frameCount: 189 }, 9,
        "df68a90c7b4ffddfd86f524bf971fa11df092fd36cf7ce88a2805c5e0c7492a3",
        "5e603acffacda5b4c0f2efdbc835b8028b59463b6e6e251a611b6237666228f7"],
    ]);

    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { move: string }) =>
      ["MOVE_REST", "MOVE_SLEEP_TALK"].includes(entry.move),
    )).toEqual([
      expect.objectContaining({ move: "MOVE_REST", status: "exact" }),
      expect.objectContaining({ move: "MOVE_SLEEP_TALK", status: "exact" }),
    ]);
    expect(coverage.componentTracks.find((track: { id: string }) =>
      track.id === "letter-z-rest",
    )).toMatchObject({
      components: [
        "asset:ANIM_TAG_LETTER_Z",
        "sprite:gSleepLetterZSpriteTemplate",
        "sprite:gLetterZSpriteTemplate",
        "task:AnimTask_SwayMon",
      ],
      representatives: ["MOVE_REST", "MOVE_SLEEP_TALK"],
      fulfilled: true,
    });
  });
});
