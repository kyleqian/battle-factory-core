import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { BattleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import { renderBattleResolutionLiveView } from "../src/engine/battleScene.ts";
import { liveMoveAnimationPresentation } from "../src/engine/liveMoveAnimation.ts";
import { liveView, type Fixture } from "../tools/integration/liveAdapterFramebuffer.ts";

// st76 (docs/st76-status-gates.md): the "battler has a status condition" gates of liveMoveAnimation.ts cases 291 (Dive setup + attack) and
// 309 (Meteor Mash) are gone. The live view redraws both healthboxes (status icon included) over the staged body, and neither body blends
// or fades the OBJ healthboxes. Evidence: tools/integration/fixtures/st76-windows.json (st76Receipt.py), 12 dense windows through the
// production live renderer, two fresh direct-mGBA runs each; statuses PSN / BRN / PRZ / SLP staged by real moves on the attacker and on the target.
interface Window {
  window: string; body: string; attackerSide: "player" | "opponent"; attacker: string; target: string; status: Record<string, string>;
  statusOn: "attacker" | "target"; rows: number; exactRows: number[]; px: number[]; r1EqualsR2: boolean; residualAges: number[];
  productionDuration: number; lagAges: number[]; lendEqualsRom: boolean | string; liveAges: number; romRgbSha256: string[];
}
const receipt = JSON.parse(readFileSync("tools/integration/fixtures/st76-windows.json", "utf8")) as {
  windows: Window[]; totals: Record<string, number>; lagRowWindows: Record<string, { rows: number; px: number[]; r1EqualsR2: boolean }>;
};
const fixtureOf = (w: Window) => JSON.parse(readFileSync(`tools/integration/fixtures/st76/${w.window}.json`, "utf8")) as Fixture;
const presentationAt = (f: Fixture, age: number) => {
  const view = liveView(f, age);
  const e = view.effect as unknown as {
    request: BattleMoveAnimationRequest; spriteAllocatorInput: never; spriteOrderInput: never; presentationRng: never; battlerX2Input: never };
  return { view, state: liveMoveAnimationPresentation(e.request, view.field, age, undefined, e.spriteAllocatorInput, e.spriteOrderInput,
    e.presentationRng, e.battlerX2Input) };
};
/** The production live render of one fixture row as the oracle's RGB888 sha256. */
const liveRowSha256 = (f: Fixture, age: number): string => {
  const rgba = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(rgba, liveView(f, age));
  const rgb = new Uint8Array(240 * 160 * 3);
  for (let p = 0; p < 240 * 160; p += 1) { rgb[3 * p] = rgba[4 * p]!; rgb[3 * p + 1] = rgba[4 * p + 1]!; rgb[3 * p + 2] = rgba[4 * p + 2]!; }
  return createHash("sha256").update(rgb).digest("hex");
};
// The policy-phase windows (every row 0 px in both fresh runs); the two others are the documented Dive setup alternates.
const exact = receipt.windows.filter((w) => w.px.every((px) => px === 0));

describe("st76: Dive 291 / Meteor Mash 309 play live with a displayed status", () => {
  it("the receipt: 12 windows, r1 == r2, both sides, status on the attacker and on the target, >= 2 species pairs and 2 statuses per body", () => {
    expect(receipt.totals).toEqual({ windows: 12, rows: 1698, zeroPxWindows: 10, r1EqualsR2: 12 });
    for (const body of ["Meteor Mash 309", "Dive 291 attack", "Dive 291 setup"]) {
      const ws = receipt.windows.filter((w) => w.body === body);
      expect(ws, body).toHaveLength(4);
      expect(new Set(ws.map((w) => w.attackerSide)), body).toEqual(new Set(["player", "opponent"]));
      expect(new Set(ws.map((w) => w.statusOn)), body).toEqual(new Set(["attacker", "target"]));
      expect(new Set(ws.map((w) => `${w.attacker}>${w.target}`)).size, body).toBeGreaterThanOrEqual(2);
      expect(new Set(ws.flatMap((w) => Object.values(w.status))).size, body).toBeGreaterThanOrEqual(2);
    }
    for (const w of receipt.windows) {
      expect(w.r1EqualsR2, w.window).toBe(true);
      expect(w.rows, w.window).toBe(w.productionDuration);
      expect(w.liveAges, w.window).toBe(w.rows);
      expect(w.romRgbSha256, w.window).toHaveLength(w.rows);
      if (w.body !== "Meteor Mash 309") expect(w.lendEqualsRom, w.window).toBe(true);
    }
    // Meteor Mash 4 / 4, Dive attack 4 / 4, Dive setup 2 / 4 (the two target-statused setups) exact
    expect(exact.map((w) => w.window).sort()).toEqual([
      "dive-opp-brn-atk-attack", "dive-opp-slp-tgt-attack", "dive-opp-slp-tgt-setup", "dive-ply-psn-atk-attack", "dive-ply-psn-tgt-attack",
      "dive-ply-psn-tgt-setup", "mm-opp-brn-atk-body", "mm-opp-slp-tgt-body", "mm-ply-prz-atk-body", "mm-ply-psn-tgt-body"]);
  });

  it("the two non-exact windows are the documented Dive setup CPU phases (measured lag ages), not the status icon", () => {
    const documented = (JSON.parse(readFileSync("docs/animation-integration-live-status.json", "utf8")).faithfulTimingAdapters as {
      id: number; alternatePhaseResidual: { ages: number[]; maxPixelsPerRow: number; windows: Record<string, { ages: number[] }> } }[])
      .find((e) => e.id === 291)!.alternatePhaseResidual;
    const ply = receipt.windows.find((w) => w.window === "dive-ply-psn-atk-setup")!;
    // oam-transfer-row no-event phase (lag age 68; the exact player setup lags at 67): row 68 only, the documented 284 px
    expect([ply.lagAges, ply.residualAges, ply.px]).toEqual([[68], documented.ages, [documented.maxPixelsPerRow, documented.maxPixelsPerRow]]);
    expect(receipt.windows.find((w) => w.window === "dive-ply-psn-tgt-setup")!.lagAges).toEqual([67]);
    const opp = receipt.windows.find((w) => w.window === "dive-opp-brn-atk-setup")!;
    // optional-lag-age 64 phase: the splash / droplet rows 66..95 one row late (the documented CLAMPERL window's rows)
    expect(opp.lagAges).toEqual([64]);
    expect(opp.residualAges[0]).toBe(66);
    expect(documented.windows["clamperlA-dive-opponent-chinchou-player-onix"]!.ages).toEqual(Array.from({ length: 30 }, (_, i) => 66 + i));
    // the 94-row Dive attack phase (PSN route seeds +2 / +4, an extra lag at age 17): 93 / 93 rows 0 px with the repeated ROM row skipped
    for (const w of Object.values(receipt.lagRowWindows)) expect([w.rows, w.px, w.r1EqualsR2]).toEqual([93, [0, 0], true]);
  });

  it("vectors: the production live render of the statused rows hashes to the ROM rows (fails with the status gates restored)", () => {
    for (const w of exact) {
      const f = fixtureOf(w);
      expect(Object.values(f.displayedStatus ?? {}).some((s) => s !== "none"), w.window).toBe(true);
      for (let age = 0; age < w.rows; age += 7) {
        expect(presentationAt(f, age).state, `${w.window} age ${age}`).not.toBeNull();
        expect(liveRowSha256(f, age), `${w.window} age ${age}`).toBe(w.romRgbSha256[age]);
      }
    }
  }, 240000);

  it("a status on either side, any of the four, keeps the body live; a shiny battler still declines", () => {
    for (const tag of ["dive-ply-psn-atk-attack", "dive-opp-slp-tgt-setup", "mm-opp-brn-atk-body"]) {
      const f = fixtureOf(receipt.windows.find((w) => w.window === tag)!);
      for (const status of ["sleep", "poison", "burn", "paralysis", "freeze"] as const) {
        for (const side of ["player", "opponent"] as const) {
          const g = { ...f, displayedStatus: { player: "none" as const, opponent: "none" as const, [side]: status } };
          expect(presentationAt(g, 30).state, `${tag} ${side} ${status}`).not.toBeNull();
        }
      }
      // a personality whose halves XOR the Factory OT id's halves to 0 is shiny (liveMovePaletteComposite.ts FACTORY_OT_ID 416049562)
      const FACTORY_OT_ID = 416_049_562;
      const shiny = (((FACTORY_OT_ID >>> 16) ^ (FACTORY_OT_ID & 0xffff)) << 16) >>> 0;
      expect(presentationAt({ ...f, attackerPersonality: shiny }, 30).state, `${tag} shiny`).toBeNull();
    }
  });
});
