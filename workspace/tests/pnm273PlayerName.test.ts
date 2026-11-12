import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PLAYER_NAME } from "../src/engine/playerName.ts";
import {
  FORFEIT_MESSAGE_PLAYER_NAME,
  FORFEIT_MESSAGE_TEXT,
} from "../src/engine/battleCommandPresentation.ts";
import {
  FACTORY_LOSS_TERMINAL_PROFILE,
  FACTORY_ROUND_WON_TERMINAL_PROFILE,
} from "../src/engine/factoryTerminalPresentation.ts";
import { POSTWIN_RECORDED_TEXT } from "../src/engine/postwin.ts";
import font from "../src/data/gen/font-normal.json" with { type: "json" };
import charmap from "../src/data/gen/charmap.json" with { type: "json" };

function listTs(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "gen" ? [] : listTs(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

describe("pnm273: the player's name is one constant, default PLAYER", () => {
  it("PLAYER_NAME is 'PLAYER' (6 glyphs, like the oracle save's 6-glyph name)", () => {
    expect(PLAYER_NAME).toBe("PLAYER");
    expect(PLAYER_NAME.length).toBe("MEMORY".length);
  });

  it("no hand-typed MEMORY name remains in src/ (ts, json data and assets)", () => {
    const offenders: string[] = [];
    for (const file of listTs("src")) {
      const text = readFileSync(file, "utf8");
      if (file.endsWith("playerName.ts")) continue;
      if (/["'`][^"'`\n]*\bMEMORY\b/.test(text) || /\bMEMORY\b[^"'`\n]*(’s|\\u2019s|obtained|forfeited)/.test(text)) offenders.push(file);
    }
    for (const dir of ["src/data/gen", "src/assets/gen"]) {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isFile() && /\.(json|ts)$/.test(name) && /"MEMORY[^"]*"/.test(readFileSync(path, "utf8"))) offenders.push(path);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("every printing site imports PLAYER_NAME", () => {
    for (const file of [
      "src/engine/battleCommandPresentation.ts",
      "src/engine/factoryTerminalPresentation.ts",
      "src/engine/postwin.ts",
    ]) {
      const text = readFileSync(file, "utf8");
      expect(text, file).toContain('import { PLAYER_NAME } from "./playerName.ts";');
      expect(text, file).toContain("PLAYER_NAME");
    }
  });

  it("forfeit message renders PLAYER", () => {
    expect(FORFEIT_MESSAGE_PLAYER_NAME).toBe(PLAYER_NAME);
    expect(FORFEIT_MESSAGE_TEXT).toBe("PLAYER forfeited the match!");
  });

  it("record messages render PLAYER (terminal loss profile, round-won profile, postwin)", () => {
    expect(FACTORY_LOSS_TERMINAL_PROFILE.recordSavedMessage[0]).toBe(`${PLAYER_NAME}’s battle was recorded`);
    expect(FACTORY_ROUND_WON_TERMINAL_PROFILE.recordSavedMessage[0]).toBe("PLAYER’s battle was recorded");
    expect(POSTWIN_RECORDED_TEXT[0]).toBe("PLAYER’s battle was recorded");
  });

  it("BP award renders PLAYER and keeps the glyph count of the MEMORY text", () => {
    const [line] = FACTORY_ROUND_WON_TERMINAL_PROFILE.getPoints;
    expect(line).toBe("PLAYER obtained 3 Battle Point(s).");
    expect(line.length).toBe("MEMORY obtained 3 Battle Point(s).".length);
    expect(FACTORY_ROUND_WON_TERMINAL_PROFILE.recordSavedMessage[0].length).toBe("MEMORY’s battle was recorded".length);
    expect(POSTWIN_RECORDED_TEXT[0].length).toBe("MEMORY’s battle was recorded".length);
  });

  it("the normal font has a non-empty glyph and width for every letter of PLAYER", () => {
    const codes = new Map(charmap.entries as unknown as [string, number][]);
    const { glyphs, widths } = font as unknown as { glyphs: unknown[]; widths: number[] };
    for (const ch of new Set(PLAYER_NAME)) {
      const code = codes.get(ch);
      expect(code, ch).toBeTypeOf("number");
      expect(widths[code!], ch).toBeGreaterThan(0);
      expect(JSON.stringify(glyphs[code!]), ch).toMatch(/[1-9]/);
    }
  });
});
