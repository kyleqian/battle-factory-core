import { describe, expect, it } from "vitest";
import { generatedCommandAnimationReplay } from "../tools/integration/generatedCommandAnimationReplay.ts";
import { verifySceneModeParity } from "../tools/integration/sceneModeParity.ts";
import { iu120Extra } from "./helpers/iu120Rows.ts";

describe("generated Scene ON queue lifecycle and rule isolation", () => {
  it("preserves rules and RNG across 40 generated matchups including forced replacement", () => {
    expect(verifySceneModeParity()).toBe(467); // ISSUES #141a (thr153) THRASH lock-in re-run: 470 -> 467
  }, 60000);

  it("keeps each multi-hit receipt, its remaining-hit counter, and separate HP command", () => {
    const replay = generatedCommandAnimationReplay(51, "on", [0, 0]);
    expect(replay.requests.filter(r => r.moveId === 24).map(r => [r.turn, r.multihit])).toEqual([
      [0, 2], [1, 1], [0, 2], [1, 1],
    ]);
    expect(replay.commands.filter(c => c.type === "hp")).toHaveLength(6);
    expect(replay.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
  }, 60000);

  it("carries source charge/strike selectors across automatic two-turn continuations", () => {
    const replay = generatedCommandAnimationReplay(80, "on", [1, 1]);
    expect(replay.requests.filter(r => r.moveId === 19).map(r => r.turn)).toEqual([0, 1, 0]);
    expect(replay.requests.filter(r => r.moveId === 291).map(r => r.turn)).toEqual([0, 1]);
    expect(replay.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
  }, 60000);

  it("uses the incoming displayed species for the next live effect after an ordinary party-menu switch", () => {
    const replay = generatedCommandAnimationReplay(54, "on", [{ switch: 1 }, 0]);
    expect(replay.commands.map(c => c.type)).toEqual(expect.arrayContaining(["switch-out", "switch-in"]));
    const effect = replay.animations.find(a => a.moveId === 109)!;
    expect(effect.player).not.toBe("WAILMER");
    expect(effect.opponent).toBe("HAUNTER");
    expect(effect.ages).toHaveLength(270 + iu120Extra(109, effect.attacker === 0 ? "player" : "opponent"));
  }, 60000);

  it("resumes repeated locked actions, KO/faint and automatic replacement in order", () => {
    const replay = generatedCommandAnimationReplay(2, "on", [2, 2]);
    expect(replay.requests.filter(r => r.moveId === 205).length).toBeGreaterThanOrEqual(5);
    const faint = replay.commands.findIndex(c => c.type === "faint");
    const replacement = replay.commands.findIndex((c, i) => i > faint && c.type === "switch-in");
    expect(faint).toBeGreaterThan(0);
    expect(replacement).toBeGreaterThan(faint);
    expect(replay.commands.slice(faint, replacement).every(c => c.type !== "move-animation")).toBe(true);
    expect(replay.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
  }, 60000);
  it("does not invent move bodies for a failed effect, immunity or an accuracy miss", () => {
    const immune = generatedCommandAnimationReplay(35, "on", [0, 1]);
    const immuneMessages = JSON.stringify(immune.commands.filter(c => c.type === "message"));
    expect(immuneMessages).toContain("But it failed!");
    expect(immuneMessages).toContain("It doesn’t affect");
    expect(immune.requests.some(r => r.moveId === 325)).toBe(false);
    const miss = generatedCommandAnimationReplay(143, "on", [0, 1]);
    expect(JSON.stringify(miss.commands.filter(c => c.type === "message"))).toContain("attack missed!");
    expect(miss.requests.some(r => r.moveId === 352 && r.attacker === 0)).toBe(false);
    expect(miss.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
  }, 60000);

});
