import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Ratchet for the src/animation ownership boundary (PROGRESS entry 480,
// user-directed 2026-07-26): the animation lane owns src/animation,
// tests/animation, ANIMATION_PROGRESS.md, and ANIMATION_COVERAGE.json; the
// battle kernel and round loop own src/engine. The split is only real while
// the import surface between the two stays narrow and named, so — like
// executableFrontierRatchet — the lists below are pinned exactly. Changing
// one is a decision a diff reviewer must see, not a drive-by.

function collectTsFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectTsFiles(path, out);
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      out.push(path);
    }
  }
  return out;
}

const IMPORT_FROM = /from\s+"([^"]+)"/g;

function importsOf(path: string): string[] {
  const specifiers: string[] = [];
  for (const match of readFileSync(path, "utf8").matchAll(IMPORT_FROM)) {
    specifiers.push(match[1]);
  }
  return specifiers;
}

describe("animation/engine boundary ratchet", () => {
  it("src/animation imports from src/engine only through the pinned shared-infra surface", () => {
    // Shared rendering/data infrastructure the animation modules may reach
    // into the engine for. Adding an entry here is legitimate only for
    // presentation-agnostic infrastructure (tables, PPU helpers, RNG) — never
    // for battle-kernel modules, which the second assertion forbids outright.
    const allowedEngineImports = new Set([
      "../engine/battleMenu.ts", // GBA_SINE_TABLE_256 + shared menu geometry
      "../engine/bg.ts",
      "../engine/rng.ts",
    ]);
    const violations: string[] = [];
    for (const file of collectTsFiles("src/animation")) {
      for (const spec of importsOf(file)) {
        if (spec.startsWith("../engine/") && !allowedEngineImports.has(spec)) {
          violations.push(`${file} -> ${spec}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("src/animation never imports the battle kernel or AI", () => {
    const kernelPattern = /battleScript|factoryAi|roundController|battleResolutionAdapter|battleDecisionBoundary/;
    const violations: string[] = [];
    for (const file of collectTsFiles("src/animation")) {
      for (const spec of importsOf(file)) {
        if (kernelPattern.test(spec)) {
          violations.push(`${file} -> ${spec}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("src/engine consumes src/animation only from the pinned seam modules", () => {
    // battleScene.ts (canonical windows + per-move draw cases) and core.ts
    // (app shell wiring the Scene-ON presentation) are the only engine-side
    // consumers. A new consumer means the presentation seam is leaking;
    // widen this list only with an explicit brief-level justification.
    const allowedConsumers = new Set([
      join("src", "engine", "battleScene.ts"),
      join("src", "engine", "core.ts"),
      // ANIMATION_INTEGRATION_BRIEF: typed live field -> animation adapter;
      // immutable inputs only, never imported by battle rules or AI.
      join("src", "engine", "liveMoveAnimation.ts"),
      // Integration-owned persistent palette inputs; presentation only.
      join("src", "engine", "liveMoveAnimationPalette.ts"),
      // S10A Substitute doll field state (docs/next-adapters-prep37.md s3a): the static source doll sheets + palette
      // (gSubstituteDoll{Front,Back}Gfx / gSubstituteDollPal, src/animation/assets/substitute.json) only; presentation
      // field art, never imported by battle rules or AI.
      join("src", "engine", "battleCommandFieldArt.ts"),
      // sc106 (S10A ISSUES #166 slice c, brief: minimumFrames = statsChangeSpan(params).addedRows): the presentation builder's
      // stats-change command reads only the pure General_StatsChange reducer's statsChangeParams / statsChangeSpan
      // (src/animation/statsChange.ts, no imports); presentation timing only, never battle rules, RNG or AI.
      join("src", "engine", "battleResolutionPresentation.ts"),
      // fra151 (S10A ISSUES #146 / #71 remainder, step brief: wire the front send-out dispatcher into the Scene ON opponent switch-in
      // renderer; docs/fra151-front-send-in-animation.md): midBattleSwitchInAt reads only the pure front send-out reducers
      // (src/animation/sendOutDispatcher.ts frontSendOut{Frame,Affine,Palette}AtTick / frontSendOutAnimationDelay /
      // frontSendOutInitializerTicks, src/animation/sendOutSpriteFrame.ts frontSendOutSpriteFrameAtTick); presentation pixels only,
      // never battle rules, RNG, timing or AI.
      join("src", "engine", "battleResolutionPresentationRender.ts"),
      // snd182 (ISSUES #146, step brief: Scene ON forced player send-in "dragged out!" = max(91, cry + 66, T_back + 70);
      // docs/snd182-scene-on-forced-player-send-in-live.md): sceneOnPlayerForcedSwitchInDuration reads only the pure back send-out
      // reducers (src/animation/backSendOutAnim.ts selectBackSendOutAnimation, src/animation/sendOutDispatcher.ts BACK_SEND_OUT_REDUCERS)
      // for the first WaitAnimEnd tick; presentation timing only, never battle rules, RNG or AI.
      join("src", "engine", "switchInTail.ts"),
      // dl4 (docs/dl3-per-species-pictures.md): the generated full table of the animation asset files (every src/animation/assets/*.json
      // by name) that node tools, vitest and the dev shell install into the animation asset provider; data only, no animation code.
      join("src", "engine", "animAssetsFull.ts"),
    ]);
    const violations: string[] = [];
    for (const file of collectTsFiles("src")) {
      if (file.startsWith(join("src", "animation"))) continue;
      for (const spec of importsOf(file)) {
        if (spec.includes("animation/") && !allowedConsumers.has(file)) {
          violations.push(`${file} -> ${spec}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
