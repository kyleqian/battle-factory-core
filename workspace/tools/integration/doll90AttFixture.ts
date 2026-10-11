/**
 * doll90: re-render a compact attacker-doll composite fixture (attdollLiveCheck.ts --emit) through the PRODUCTION live renderer, exactly as
 * attdollLiveCheck.ts builds the window: liveView(fixture, age) with the attacker's displayed doll (applySubstituteDollCommand after a
 * Substitute body), the field art rebuilt from it. Row sha256 = the probe's format (240x160 RGB888).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { applySubstituteDollCommand } from "../../src/engine/battleResolutionPresentationRender.ts";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import type { BattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";

export type Doll90AttFixture = { schema: string; stem: string; window: [number, number]; attacker: 0 | 1; fixture: Fixture;
  rows: [age: number, frame: number, sha256: string][] };

export const readDoll90AttFixture = (path: string): Doll90AttFixture => JSON.parse(readFileSync(path, "utf8")) as Doll90AttFixture;

export function doll90AttView(f: Doll90AttFixture, age: number): BattleResolutionPresentationRenderView {
  const view = liveView(f.fixture, age);
  const field = applySubstituteDollCommand(view.field, {
    type: "move-animation", eventSequence: 0, battler: f.attacker,
    animation: { moveId: 164, attacker: f.attacker, target: f.attacker } as never, timing: { minimumFrames: 1 },
  } as never);
  return { ...view, field, fieldArt: createBattleCommandFieldArtView(field) };
}

export function doll90AttRowSha(f: Doll90AttFixture, age: number): string {
  const rgba = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(rgba, doll90AttView(f, age));
  const rgb = new Uint8Array(240 * 160 * 3);
  for (let p = 0; p < 240 * 160; p++) { rgb[p * 3] = rgba[p * 4]!; rgb[p * 3 + 1] = rgba[p * 4 + 1]!; rgb[p * 3 + 2] = rgba[p * 4 + 2]!; }
  return createHash("sha256").update(rgb).digest("hex");
}
