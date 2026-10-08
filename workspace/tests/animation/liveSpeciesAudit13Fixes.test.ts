import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
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
