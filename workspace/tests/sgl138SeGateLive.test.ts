// sgl138 (S10A timeline fidelity, docs/sgl138-se-gate-live.md): sgs134's IsBattleSEPlaying gate LIVE in production — the
// `stats-change` command of a hit's secondary (HandleBattleAnimation, both scenes) and a multi-hit move's 2nd+ `move-animation`
// (HandleMoveAnimation, Scene ON) wait seg127's gate (fixed rows 44 / 62) before the banner / body. Proof through production on census
// battles carrying every gated class x side of sgs134's projection (fixtures/sgs134/exposure.json, seeds 0..999): the production gate
// == the projection request by request; the banner starts on command row `gate` and the following print's first glyph on
// gate + rows + hold (the ROM: launch = poll + gate, controller rows = gate + 76 on every sgs134 receipt, both scenes); a later hit's
// body start and span are the 1st hit's + gate (the ROM: ctl(hit k) - gate == ctl(hit 1)); the gate rows draw the field as it is
// (production frames == the previous row's). With gate 0 (sgs134's banked base) every gated anchor lands `gate` rows early (revert
// experiment in the doc: 33 / 33 gated anchors fail).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  SGL138_SEEDS, sgl138Anchors, sgl138Battle, sgl138OpenReceipts, sgl138ReceiptBattle,
} from "../tools/integration/sgl138Live.ts";

const json = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const receipt = json("tools/integration/fixtures/sgl138-live-receipt.json");
const OPEN = sgl138OpenReceipts();
type Request = { label: string; op: string; seGate: number | null; controllerRows: number; delay: number | null };

describe("sgl138: the ROM side (sgs134's direct-mGBA receipts, both scenes)", () => {
  it("a gated request launches `gate` rows late and its controller rows grow by exactly the gate", () => {
    for (const path of ["rom-r1", "rom-off-r1"]) {
      const rom = json(`tools/integration/fixtures/sgs134/receipts/${path}.json`);
      expect(rom.residuals).toEqual([]);
      const requests = Object.values(rom.scenarios as Record<string, { requests: Request[] }>).flatMap((s) => s.requests);
      const stats = requests.filter((r) => /^BattleScript_Stat(Down|Up)\+/.test(r.label));
      expect(stats.length).toBe(16);
      for (const r of stats) expect([r.delay! - r.seGate!, r.controllerRows - r.seGate!], `${path} ${r.label}`).toEqual([0, 76]);
      if (path === "rom-r1") {
        for (const r of requests.filter((q) => q.op === "attackanimation")) expect(r.delay! - r.seGate!).toBe(2);
      }
    }
  });
});

describe("sgl138: the gate in production (census routes, both scenes)", () => {
  for (const seed of SGL138_SEEDS) {
    it(`seed ${seed}: banner / later hit and the following print on the ROM row; gate rows draw the field as it is`, () => {
      for (const scene of ["on", "off"] as const) {
        const { commands, frames } = sgl138Battle(seed, scene);
        const battle = sgl138ReceiptBattle(seed, frames, sgl138Anchors(commands), OPEN);
        // cln242: the whole-route frame total and per-anchor frame receipt equality (re-pinned by hand after every upstream frame
        // change; the census delta covers route frames) is gone; the ROM-relation checks below stay.
        for (const a of battle.anchors) {
          const where = `${seed}-${scene} ${a.seg} #${a.i} ${a.type} ${a.cls}`;
          expect(a.gate, `${where}: production gate == sgs134's census projection`).toBe(a.projected);
          if (a.type === "stats-change") {
            expect(a.minimumFrames, where).toBe(a.gate + a.rows!);
            // The banner on command row `gate` (ROM: launch - poll == gate; base 0); the print's first glyph on gate + rows + hold
            // (ROM: controller rows == gate + 76, the hold unchanged), the next command = the print.
            expect([a.effectStart, a.glyph, a.span], where).toEqual([a.gate, a.gate + a.rows! + a.holdFrames, a.gate + a.rows! + a.holdFrames]);
          } else {
            expect(scene, where).toBe("on");
            // ROM: ctl(hit k) - gate == ctl(hit 1); the body launches `gate` rows late (launch = poll + 2 + gate).
            expect([a.span! - a.first!.span!, a.effectStart! - a.first!.effectStart!], where).toEqual([a.gate, a.gate]);
          }
          if (a.gate === 0) continue;
          // The gate rows: production frames == the previous command's last frame (the ROM shows nothing new while it waits).
          expect(a.gateRowsEqualPrevious, where).toBe(true);
          expect(a.gateEffects, where).toEqual([a.type === "stats-change" ? "none" : "move:0"]);
        }
      }
    }, 120_000);
  }

  it("the receipt covers every gated class x side, stats-change in both scenes, multi-hit in Scene ON", () => {
    // thr153: seed 32 -> 808 (stats-change-attacker battler 0; see SGL138_SEEDS) moved anchors 90 -> 98, gate frames 416 -> 438,
    // stats-change 79 -> 87; every class x side cell and every equality below is unchanged.
    expect(receipt.summary).toEqual({
      anchors: 98, gated: 33, gateFrames: 438, gateEqualsProjection: 98,
      cells: [
        "off|stats-change-attacker|0", "off|stats-change-attacker|1", "off|stats-change-target|0", "off|stats-change-target|1",
        "on|multi-hit|0", "on|multi-hit|1", "on|stats-change-attacker|0", "on|stats-change-attacker|1",
        "on|stats-change-target|0", "on|stats-change-target|1",
      ],
      statsChangeBannerAtGate: 87, statsChangeGlyphAtGatePlusRowsPlusHold: 87, statsChange: 87,
      laterHitShiftEqualsGate: 11, laterHits: 11, gateRowsEqualPrevious: 33,
    });
  });
});
