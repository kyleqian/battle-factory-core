import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import terminal from "../src/data/gen/factory-terminal-messages.json" with { type: "json" };

describe("Factory terminal field-message extraction", () => {
  it("pins ordinary field chrome, every regular terminal template, and the record prompt contract", () => {
    expect(terminal.schema).toBe("factory-terminal-messages/v1");
    expect(terminal.reuse).toMatchObject({
      messageBoxAsset: "src/assets/gen/prebattle-room-msgbox.json",
      standardWindowAsset: "src/assets/gen/prebattle-room-std-window.json",
      normalFont: "src/data/gen/font-normal.json",
      charmap: "src/data/gen/charmap.json",
    });
    expect(terminal.fieldMessage.window).toEqual({ bg: 0, tilemapLeft: 2, tilemapTop: 15, widthTiles: 27, heightTiles: 4, palette: 15, baseTile: "0x194" });
    expect(terminal.messages.lossReturnAndSave.template).toBe("Thank you for participating!\\pI will return your POKéMON in exchange\\nfor our rental POKéMON.\\pI must also save the event results.\\nPlease wait.$");
    expect(terminal.messages.regularCongrats.template).toBe("Congratulations! You've won seven\\nstraight Battle Swap matches!$");
    expect(terminal.messages.award.template).toContain("we award you these Battle Point(s).$");
    expect(terminal.messages.getPoints.template).toBe("{PLAYER} obtained {STR_VAR_1} Battle Point(s).$");
    expect(terminal.messages.exchangeAndSave.template).toContain("Let me exchange your POKéMON");
    expect(terminal.messages.recordPrompt.template).toBe("Would you like to record your last\\nBATTLE FACTORY match on your\\lFRONTIER PASS?$");
    expect(terminal.messages.getPoints.operations).toEqual(["msgbox MSGBOX_GETPOINTS", "message", "playfanfare MUS_OBTAIN_B_POINTS", "waitfanfare", "waitmessage"]);
    expect(terminal.recordPromptMenu).toMatchObject({
      multichoiceId: 94,
      requestedOriginTiles: { x: 20, y: 8 },
      adjustedOriginTiles: { x: 20, y: 8 },
      choices: ["YES", "NO"],
      defaultChoice: 1,
      input: { delayFrames: 2, wraps: false, ignoreBPress: false },
      content: { widthPx: 18, widthTiles: 4, heightTiles: 4, textOriginPx: { x: 8, y: 1 }, rowStridePx: 16 },
      frame: { palette: 14, baseTile: "0x214", outerOriginTiles: { x: 19, y: 7 }, outerSizeTiles: { width: 6, height: 6 } },
      cursor: { glyph: "▶", xPx: 0, yPxByChoice: [1, 17], widthPx: 8, heightPx: 15 },
    });
  });

  it("reproduces the generated data byte-for-byte through --out-dir", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-terminal-messages-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/extract/extract-factory-terminal-messages.ts", "--out-dir", directory], { stdio: "pipe" });
    expect(readFileSync(join(directory, "factory-terminal-messages.json"))).toEqual(readFileSync("src/data/gen/factory-terminal-messages.json"));
  });
});
