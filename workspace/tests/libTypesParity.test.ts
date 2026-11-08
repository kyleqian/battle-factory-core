// lib-types/*.d.ts (what the package ships) must say what src/factoryContract.ts
// and the entries' runtime exports say. The type checks below are compile-time
// (`npm run typecheck` fails if either side drifts); the runtime checks compare
// declared value names with the real module namespaces.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type * as Src from "../src/factoryContract.ts";
import type * as BrowserTypes from "../lib-types/index.d.ts";
import type * as HeadlessTypes from "../lib-types/headless.d.ts";
import * as lib from "../src/lib.ts";
import * as headless from "../src/headless.ts";

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const assertSame = <_T extends true>(): void => {};

assertSame<Same<Src.GbaButton, BrowserTypes.GbaButton>>();
assertSame<Same<Src.BattleScene, BrowserTypes.BattleScene>>();
assertSame<Same<Src.TraceSegment, BrowserTypes.TraceSegment>>();
assertSame<Same<Src.FactoryEvent, BrowserTypes.FactoryEvent>>();
assertSame<Same<Src.FactoryGameOptions, BrowserTypes.FactoryGameOptions>>();
assertSame<Same<Src.FactoryGame, BrowserTypes.FactoryGame>>();
assertSame<Same<Src.ReplayBattle, HeadlessTypes.ReplayBattle>>();
assertSame<Same<Src.ReplayResult, HeadlessTypes.ReplayResult>>();
assertSame<Same<Src.ReplayOptions, HeadlessTypes.ReplayOptions>>();
assertSame<Same<Src.GbaButton, HeadlessTypes.GbaButton>>();
assertSame<Same<Src.TraceSegment, HeadlessTypes.TraceSegment>>();
assertSame<Same<typeof lib.mountFactoryGame, typeof BrowserTypes.mountFactoryGame>>();
assertSame<Same<typeof headless.replayChallenge, typeof HeadlessTypes.replayChallenge>>();
assertSame<Same<typeof lib.connectGamepad, typeof BrowserTypes.connectGamepad>>();
assertSame<Same<typeof lib.ENGINE_BUILD, typeof BrowserTypes.ENGINE_BUILD>>();
assertSame<Same<typeof headless.ENGINE_BUILD, typeof HeadlessTypes.ENGINE_BUILD>>();

function declaredValues(file: string): string[] {
  const names: string[] = [];
  for (const match of readFileSync(file, "utf8").matchAll(/^export declare (?:const|function) (\w+)/gm)) names.push(match[1]!);
  return names.sort();
}

describe("lib-types match the sources", () => {
  it("browser entry: declared values are exactly the public runtime exports", () => {
    const declared = declaredValues("lib-types/index.d.ts");
    expect(declared).toEqual(["ENGINE_BUILD", "FRAME_HZ", "SCREEN_HEIGHT", "SCREEN_WIDTH", "connectGamepad", "mountFactoryGame"]);
    expect(Object.keys(lib).filter((name) => declared.includes(name)).sort()).toEqual(declared);
    expect(lib.SCREEN_WIDTH).toBe(240);
    expect(lib.SCREEN_HEIGHT).toBe(160);
  });

  it("headless entry: declared values are exactly the runtime exports", () => {
    const declared = declaredValues("lib-types/headless.d.ts");
    expect(declared).toEqual(["ENGINE_BUILD", "replayChallenge"]);
    expect(Object.keys(headless).sort()).toEqual(declared);
  });

  it("every contract type name the sources export is declared in lib-types", () => {
    const sourceTypes = [...readFileSync("src/factoryContract.ts", "utf8").matchAll(/^export (?:interface|type) (\w+)/gm)].map((m) => m[1]!);
    const shipped = readFileSync("lib-types/index.d.ts", "utf8") + readFileSync("lib-types/headless.d.ts", "utf8");
    for (const name of sourceTypes) {
      expect(shipped, name).toMatch(new RegExp(`(?:interface|type) ${name}\\b|\\b${name}\\b[^\\n]*from`));
    }
  });
});
