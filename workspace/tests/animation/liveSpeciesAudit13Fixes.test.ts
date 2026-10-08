import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveMoveAnimationPresentation } from "../../src/engine/liveMoveAnimation.ts";
import { liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";

// Species audit 13 (docs/live-species-audit-13.md) fixes. ROM pins: tools/integration/a13fixRomRows.py over two fresh direct-mGBA runs per
// window (the runs agree); receipts: speciesAudit13Check.ts (production live view, every row of each window).
const A13 = "tools/integration/fixtures/species-audit-13";
const FIX = "tools/integration/fixtures/a13fix-live";
type F = Fixture & { defenderDoll?: boolean; targetPersonality?: number };
type Pin = { stem: string; kind: string; fixture: string; orderInput: string; residualPixels: number[]; ageRomSha256: [number, string][] };
const json = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;

/** The checker's view (speciesAudit13Check.ts): a defender-doll window shows the defender as the Substitute doll. */
function auditView(f: F, age: number) {
  const v = liveView(f, age);
  if (!f.defenderDoll) return v;
  const side = f.target.geometry.side;
  const field = { ...v.field, [side]: { ...v.field[side], substituteDoll: true as const,
    ...(f.targetPersonality !== undefined ? { personality: f.targetPersonality } : {}) } };
  return { ...v, field, fieldArt: createBattleCommandFieldArtView(field) };
}

/** RGB888 sha256 of the production live view at `age` (the oracle's capture hash is over the raw RGB framebuffer). */
function liveRgbSha256(f: F, age: number, orderNone: boolean): string {
  if (orderNone) process.env.POKEBENCH_LIVE_ORDER_INPUT = "none";
  try {
    const rgba = new Uint8Array(240 * 160 * 4);
    renderBattleResolutionLiveView(rgba, auditView(f, age));
    const rgb = new Uint8Array(240 * 160 * 3);
    for (let p = 0; p < 240 * 160; p++) { rgb[p * 3] = rgba[p * 4]!; rgb[p * 3 + 1] = rgba[p * 4 + 1]!; rgb[p * 3 + 2] = rgba[p * 4 + 2]!; }
    return createHash("sha256").update(rgb).digest("hex");
  } finally {
    if (orderNone) delete process.env.POKEBENCH_LIVE_ORDER_INPUT;
  }
}

describe("Ice Beam / Thunderbolt / Sludge Bomb: a live opponent attacker keeps its front idle rest all window (audit 13 SPECIES-DEFECT 1)", () => {
  const sets = [[`${FIX}/rest/rom-rows.json`, `${A13}/derived`], [`${FIX}/rest/rom-rows-nodf.json`, `${A13}/derived-nodf`]] as const;
  for (const [pins, dir] of sets) {
    for (const pin of json<Pin[]>(pins)) {
      it(`${pin.stem} ${pin.kind}: idle-rest ONIX attacker rows equal the ROM (221,473 / 258,567 / 182,849 px before)`, () => {
        const f = json<F>(`${dir}/${pin.fixture}`);
        expect(pin.residualPixels).toEqual([0, 0]);
        for (const [age, rom] of pin.ageRomSha256) expect([age, liveRgbSha256(f, age, pin.orderInput === "none")]).toEqual([age, rom]);
      });
    }
  }
  it("the fix is render-neutral on all 41 committed fixtures of the three renderers (render digests with / without the fix identical)", () => {
    const base = readFileSync(`${FIX}/rest/render-identity-base.tsv`, "utf8"), fix = readFileSync(`${FIX}/rest/render-identity-fix.tsv`, "utf8");
    expect(fix.trim().split("\n")).toHaveLength(41);
    expect(fix.split("\n").filter((l) => l.includes("\terror\t"))).toEqual([]);
    expect(fix).toBe(base);
  });
});

describe("Substitute swaps: a SHINY subbed attacker declines (audit 13 SPECIES-DEFECT 2; receipts a13fixSwapCheck.sh, 2 fresh runs each)", () => {
  type SwapResult = { productionDuration: number | null; residualPixels: number; digest: string };
  const swap = (stem: string, run: 1 | 2) =>
    json<{ results: SwapResult[] }>(`${FIX}/swap-shiny/${stem}-r${run}.json`).results;
  const cases = [["opponent-persian-slowbro-bodyslam", 0], ["player-persian-slowbro-bodyslam", 0], ["opponent-persian-slowbro-leechseed", 0],
    ["player-persian-slowbro-leechseed", 0], ["opponent-golem-onix-headbutt", 1156], ["player-zigzagoon-onix-headbutt", 133]] as const;
  it("non-shiny STEELIX swaps are unchanged (audit 13 residuals: 0 px, Headbutt body 1,156 / 133 = the doll-free controls)", () => {
    for (const [base, px] of cases) {
      const [r1, r2] = [swap(`s13swap-steelix-on-${base}`, 1), swap(`s13swap-steelix-on-${base}`, 2)];
      for (const [i, x] of r1.entries()) {
        expect([base, x.productionDuration !== null, x.residualPixels, r2[i]!.digest]).toEqual([base, true, px, x.digest]);
      }
    }
  });
  it("shiny STEELIX swaps (both sides, 14 windows: the audit doc says 15, its swap-summary.txt lists 14) now decline: no live duration, the whole command falls back", () => {
    let windows = 0;
    for (const [base] of cases) {
      const [r1, r2] = [swap(`s13swap-shinysteelix-on-${base}`, 1), swap(`s13swap-shinysteelix-on-${base}`, 2)];
      for (const [i, x] of r1.entries()) { expect([base, x.productionDuration, r2[i]!.digest]).toEqual([base, null, x.digest]); windows++; }
    }
    expect(windows).toBe(14);
  });
});

describe("Ice Ball (301): a resting opponent-side target declines; the deferred-lend counter labels match the ROM chain", () => {
  const live = (path: string) => {
    const f = json<F>(path);
    const v = liveView(f, 10);
    const fx = v.effect as { request: never; paletteInput?: never; spriteAllocatorInput?: never; spriteOrderInput?: never; presentationRng?: never;
      battlerX2Input?: never };
    return liveMoveAnimationPresentation(fx.request, v.field, 10, fx.paletteInput, fx.spriteAllocatorInput, fx.spriteOrderInput, fx.presentationRng,
      fx.battlerX2Input) !== null;
  };
  const dir = `${A13}/iceball-derived`;
  it("ONIX / RATTATA opponent-side targets (audit 13 'Unresolved' 30k-79k px = the fallback field) decline via liveIceBallInputs' rest gate", () => {
    for (const stem of ["onix-prep25-ice-ball-alt-player-glalie-golem-b2", "onix-prep25-ice-ball-alt-player-glalie-golem-b3",
      "rattata-prep25-ice-ball-alt-player-glalie-golem-b2", "rattata-prep25-ice-ball-alt-player-glalie-golem-b3"]) {
      expect([stem, live(`${dir}/s13ib-${stem}.json`)]).toEqual([stem, false]);
    }
  });
  it("rest-0 targets of the same chains (and the player-side RATTATA, rest 0) stay live", () => {
    for (const stem of ["steelix-prep25-ice-ball-alt-player-glalie-golem-b2", "wailord-prep25-ice-ball-alt-player-glalie-golem-b3",
      "weezing-prep25-ice-ball-alt-player-glalie-golem-b4", "rattata-prep25-ice-ball-alt-opponent-glalie-golem-b2"]) {
      expect([stem, live(`${dir}/s13ib-${stem}.json`)]).toEqual([stem, true]);
    }
  });
  it("every lend-live fixture's power / rolloutCounter equals the ROM's gDynamicBasePower of that body (no chain reset; b3 = counter 2)", () => {
    const rom = json<{ scenarios: Record<string, { body: number; dynamicBasePower: number }[]> }>(`${FIX}/iceball/chain-powers.json`).scenarios;
    const fixtures = readdirSync("tools/integration/fixtures/lend-live").filter((n) => n.endsWith(".json"));
    expect(fixtures).toHaveLength(12);
    for (const n of fixtures) {
      const f = json<{ scenario: string; requestFields: { power: number; rolloutCounter: number } }>(`tools/integration/fixtures/lend-live/${n}`);
      const body = Number(n.match(/-b(\d)\.json$/)![1]);
      const power = rom[f.scenario.split("/").pop()!.replace(/\.json$/, "")]!.find((b) => b.body === body)!.dynamicBasePower;
      expect([n, f.requestFields.power, f.requestFields.rolloutCounter]).toEqual([n, power, Math.log2(power / 30) + 1]);
    }
  });
});
