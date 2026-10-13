// inv142 (S10A, ISSUES #168 follow-up; docs/inv142-status-animation-invisible-battler.md): a Scene ON status animation whose battler's
// sprite is INVISIBLE (a Dig charge body hid it; CANCELER_IN_LOVE / ENDTURN_YAWN cleared STATUS3 so the receipt plays). The ROM runs the
// script: its sprites are drawn and the battler stays hidden. Production used to draw nothing there (sar131's visibility guard); the
// landed fixtures/inv142/inv142-invisible.diff dropped that guard. This file pins the receipts and the patched production frames.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { statusAnimationRenderView } from "../src/engine/battleScene.ts";
import { inv142Window } from "../tools/integration/inv142Compare.ts";

const F = "tools/integration/fixtures/inv142";
const json = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex").slice(0, 16);
const SCEN = (name: string) => `${F}/scenarios/${name}.json`;

describe("inv142: status animation over an invisible battler", () => {
  it("exposure (census 0..999): 5 / 8,063 commands, all hidden by a Dig charge body (semi-invulnerable live-body hide), no doll", () => {
    const e = json(`${F}/exposure.json`);
    expect(e).toMatchObject({ seeds: "0..999", battles: 1000, statusAnimationCommands: 8063, invisibleCommands: 5, dollCommands: 0,
      wouldDrawWithVisibilityForced: 5 });
    for (const c of e.commands) {
      expect(c).toMatchObject({ spriteVisible: false, doll: false, hiddenBy: "DIG", cause: { spriteVisibilityReceipt: false, semiInvulnerableBodyHide: true } });
      expect(["INFATUATION", "SLP"]).toContain(c.animation);
    }
  });

  it("ROM (direct mGBA, r1 == r2): the script runs 96 rows with the battler invisible on every row and creates its sprites", () => {
    const rom = json(`${F}/rom-r1.json`);
    const played = Object.values<any[]>(rom).flat().filter((w) => w.invisible && w.R !== undefined);
    expect(played).toHaveLength(5);
    for (const w of played) {
      expect(w).toMatchObject({ gate: 0, activeRows: 96, battlerInvisibleRows: 96, battlerX2: [0, 0] });
      expect(w.spritesInUseMax - w.spritesInUseAtX).toBeGreaterThan(0);
      expect(w.changedPxMax).toBeGreaterThan(0);
      expect(["moveend", "makevisible"]).toContain(w.visibleBy);
    }
    expect(Object.keys(json(`${F}/probe-sha256.json`))).toHaveLength(4);
  });

  it("landed: statusAnimationRenderView draws the script's sprites over the hidden battler, which stays hidden", () => {
    const win = inv142Window(SCEN("inv142-love-ply"), 0, "INFATUATION");
    const view = win.viewAt(20);
    expect(view.effect?.type).toBe("status-animation");
    expect(view.visibility.player.sprite).toBe(false);
    expect(statusAnimationRenderView(view)?.sprites.length).toBeGreaterThan(0);
  });

  it("landed: every window's production frame per row == production-patched.json (5 / 5 windows 0 px vs the ROM)", () => {
    const patched = json(`${F}/production-patched.json`);
    expect(patched.summary).toMatchObject({ windows: 5, zeroPxWindows: 5 });
    for (const [key, w] of Object.entries<any>(patched)) {
      if (key === "summary") continue;
      const name = key.split("@")[0]!;
      const win = inv142Window(SCEN(name), w.side === "player" ? 0 : 1, w.animation);
      const shas: string[] = [];
      for (let a = -1; a <= win.rows + 1; a++) shas.push(sha(win.draw(win.viewAt(a))));
      expect(shas, key).toEqual(w.productionFrameSha);
      expect(w.fullScreen.px, key).toBe(0);
    }
  });

  it("the banked patch: 5 / 5 windows 0 px, battler hidden on every command row; controls fail; census / route pixels only", () => {
    const patched = json(`${F}/production-patched.json`);
    expect(patched.summary).toMatchObject({ windows: 5, zeroPxWindows: 5 });
    for (const [key, w] of Object.entries<any>(patched)) {
      if (key === "summary") continue;
      expect(w.rows.battlerHiddenRows, key).toBe(w.rows.commandRows);
      expect(w.rows.productionDrawnCommandRows, key).toBeGreaterThan(0);
    }
    const controls = json(`${F}/controls.json`);
    for (const n of ["age+1", "wrong-side"]) expect(controls[n].summary).toMatchObject({ windows: 5, zeroPxWindows: 0 });
    const census = json(`${F}/census-delta.json`);
    expect(census).toMatchObject({ keyMismatches: 0, frameChanges: 0, liveFrameChanges: 0, declineChanges: 0, battleMismatches: 0, segmentMismatches: 0 });
    expect(census.totals["base.statusAnimationCommands"]).toBe(census.totals["final.statusAnimationCommands"]);
    const route = json(`${F}/routes-delta.json`)["18:0:on"];
    expect(route).toMatchObject({ verdict: "OK", sameTimeline: true, outsideStatusAnimation: 0 });
    expect(Object.values<any>(route.changedCommands).map((c) => [c.animation, c.species])).toEqual([["INFATUATION", "PUPITAR"]]);
  });
});
