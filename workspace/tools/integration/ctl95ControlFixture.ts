/**
 * ctl95: re-render a compact doll-free control window (ctl95ControlCheck.ts --emit) through the PRODUCTION live renderer exactly as the
 * checker builds it: liveView(fixture, age) for window row `age` (the window starts `shift` rows after the ROM activation). Row sha256 =
 * the probe's format (240x160 RGB888).
 */
import { createHash } from "node:crypto";
import "../../src/engine/monPicPixelsInstall.ts";
import { readFileSync } from "node:fs";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";

export type Ctl95ControlFixture = { schema: string; stem: string; body: number; shift: number; activation: number; fixture: Fixture;
  rows: [age: number, frame: number, sha256: string][] };

export const readCtl95ControlFixture = (path: string): Ctl95ControlFixture => JSON.parse(readFileSync(path, "utf8")) as Ctl95ControlFixture;

export function ctl95ControlRowSha(f: Ctl95ControlFixture, age: number): string {
  const rgba = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(rgba, liveView(f.fixture, age));
  const rgb = new Uint8Array(240 * 160 * 3);
  for (let p = 0; p < 240 * 160; p++) { rgb[p * 3] = rgba[p * 4]!; rgb[p * 3 + 1] = rgba[p * 4 + 1]!; rgb[p * 3 + 2] = rgba[p * 4 + 2]!; }
  return createHash("sha256").update(rgb).digest("hex");
}
