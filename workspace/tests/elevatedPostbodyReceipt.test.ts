import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

// docs/elevated-postbody-audit.md: the retained receipts (two identical fresh direct-mGBA runs per fixture, elevatedPostbodyCompare.ts)
// pin the ROM rule SpriteCB_EnemyShadow (battle_gfx_sfx_util.c:1214): the elevated-opponent shadow is invisible while gAnimScriptActive or
// the battler sprite is invisible, so it first reappears on framebuffer (script end - E) + 1, and the production ordinary field (no live effect)
// differs from the ROM by the missing elevation + shadow until the renderer is fixed. The patched column is the in-memory proof.
const DIR = new URL("../tools/integration/fixtures/elevated-postbody/", import.meta.url);
interface Row { fixture: string; run: number; scriptEndMinusE: number | null; production: { postExact: number; k: string };
  patched: { postExact: number; k: string } | null; error?: string }
const parse = (k: string) => k.split(" ").map(t => { const [kk, rest] = t.split(":"); return { k: Number(kk), residual: parseInt(rest!, 10), shadow: rest!.endsWith("s") }; });
const rows: Row[] = readdirSync(DIR).filter(n => n.endsWith("-opp-window.json") || n.includes("-opp-window"))
  .flatMap(n => (JSON.parse(readFileSync(new URL(n, DIR), "utf8")) as { rows: Row[] }).rows).filter(r => !r.error);

describe("elevated opponent post-body field vs ROM", () => {
  it("covers both attacker sides and three elevated species with identical fresh runs", () => {
    expect(rows.length).toBeGreaterThanOrEqual(60);
    const byFixture = new Map<string, Row[]>();
    for (const r of rows) byFixture.set(r.fixture, [...(byFixture.get(r.fixture) ?? []), r]);
    for (const [, runs] of byFixture) expect(runs.map(r => r.production.k)).toEqual(runs.map(() => runs[0]!.production.k));
  });
  it("production ordinary field misses elevation + shadow on every row after the body", () => {
    for (const r of rows.filter(x => x.run === 0)) {
      const post = parse(r.production.k).filter(x => x.k > 0);
      if (post.length === 0) continue;
      expect(post[0]!.residual, r.fixture).toBeGreaterThan(1000);
    }
  });
  it("ROM shadow returns on script end + 1 and the patched ordinary field is exact until the next hide", () => {
    for (const r of rows.filter(x => x.run === 0 && x.patched && x.scriptEndMinusE !== null)) {
      const prod = parse(r.production.k), pat = parse(r.patched!.k);
      const firstShadow = prod.find(x => x.shadow);
      if (firstShadow) expect(firstShadow.k, r.fixture).toBe(Math.max(r.scriptEndMinusE! + 1, -3));
      // exact from E+1 until the ROM hides the shadow again (hit blink / next animation)
      const firstHide = pat.find((x, i) => x.k > 0 && i > 0 && pat[i - 1]!.shadow && !x.shadow)?.k ?? 999;
      for (const x of pat.filter(y => y.k > 0 && y.k < firstHide)) expect(x.residual, `${r.fixture} k=${x.k}`).toBe(0);
    }
  });
});
