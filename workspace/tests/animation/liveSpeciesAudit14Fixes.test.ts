import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { BattleCommandFieldBattler } from "../../src/engine/battleCommandPresentation.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";
import { createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { SUBSTITUTE_FADE_LEAD_ROWS, substituteFadeDuration, substituteFadeRenderView } from "../../src/engine/liveSubstituteFade.ts";
import { liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";

// Species audit 14 (docs/live-species-audit-14.md) defects fixed in production (d4w rung c). ROM pins: speciesAudit14PlainShift.ts --pins
// over fresh direct-mGBA prep40 probes (two runs, identical): tools/integration/fixtures/d4w-rest/rom-rows.json.
type Pin = { stem: string; activation: number; fixture: Fixture; ageRomSha256: [number, string][] };
const pins = JSON.parse(readFileSync("tools/integration/fixtures/d4w-rest/rom-rows.json", "utf8")) as Pin[];

function liveRgbSha256(f: Fixture, age: number): string {
  const rgba = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(rgba, liveView(f, age));
  const rgb = new Uint8Array(240 * 160 * 3);
  for (let p = 0; p < 240 * 160; p++) { rgb[p * 3] = rgba[p * 4]!; rgb[p * 3 + 1] = rgba[p * 4 + 1]!; rgb[p * 3 + 2] = rgba[p * 4 + 2]!; }
  return createHash("sha256").update(rgb).digest("hex");
}

describe("Confuse Ray / Bite: a live opponent attacker keeps its front idle rest all window (audit 14 SPECIES-DEFECTs 2, 3)", () => {
  it("pins the four idle-rest first bodies (ONIX / RATTATA, both moves)", () => {
    expect(pins.map((p) => `${p.stem}@${p.activation}`)).toEqual([
      "s14plain-onix-confuse-ray-opponent@76", "s14plain-rattata-confuse-ray-opponent@79",
      "s14plain-rattata-bite-opponent@75", "s14plain-onix-bite-opponent@72"]);
  });
  for (const pin of pins) {
    const before = { "s14plain-onix-confuse-ray-opponent": "294,419", "s14plain-rattata-confuse-ray-opponent": "110,700",
      "s14plain-rattata-bite-opponent": "10,660", "s14plain-onix-bite-opponent": "28,366" }[pin.stem];
    it(`${pin.stem}@${pin.activation}: production rows equal the ROM (${before} px before)`, () => {
      // Confuse Ray: every 9th of 270 rows (the attacker is drawn on every row); Bite: all 26 compared rows.
      const rows = pin.ageRomSha256.filter((_, i) => pin.ageRomSha256.length < 40 || i % 9 === 0);
      for (const [age, rom] of rows) expect([age, liveRgbSha256(pin.fixture, age)]).toEqual([age, rom]);
    }, 120000);
  }
});

describe("Substitute fade: a non-doll elevated opponent OTHER battler's shadow is on screen on the activation row (audit 14 defect 1)", () => {
  const mon = (side: "player" | "trainer", battler: 0 | 1, species: number, doll: boolean) =>
    Object.freeze({ side, battler, partyIndex: 0, species, name: "X", level: 50, gender: "male", hp: 10, maxHP: 10,
      status: "none", moveIds: [164, 0, 0, 0], currentPP: [10, 0, 0, 0], ppBonuses: 0,
      ...(doll ? { substituteDoll: true } : {}) }) as unknown as BattleCommandFieldBattler;
  // PERSIAN (53) fading on the player side, GOLBAT (42, elevated) the other battler; the reverse for the opponent fade.
  const stateAt = (f: BattleResolutionDisplayedField, battler: 0 | 1, age: number) => {
    const command = Object.freeze({ type: "substitute-fade", eventSequence: 2, battler,
      timing: { minimumFrames: substituteFadeDuration(battler === 0 ? "player" : "opponent") } });
    const message = Object.freeze({ type: "message", eventSequence: 1, lines: ["a", "b"], advance: "button", noCursor: false,
      timing: { minimumFrames: 1, holdFrames: 0 } });
    return { field: f, segments: [{ field: f, beforeRules: null, afterRules: null, events: [], commands: [message, command] }],
      segmentIndex: 0, commandIndex: 1, lifecycle: { phase: "presenting", phaseElapsed: age }, confirmHandoff: null, opponentTrainer: null,
      sourceDecision: { kind: "use-move" }, fadeTick: 0 } as never;
  };
  // btn2: the fade's effect age starts SUBSTITUTE_FADE_LEAD_ROWS (11, ROM press -> fade start) after the command's first row; `age` is the effect age.
  const viewAt = (f: BattleResolutionDisplayedField, battler: 0 | 1, age: number) =>
    substituteFadeRenderView(createBattleResolutionPresentationRenderView(stateAt(f, battler, age + SUBSTITUTE_FADE_LEAD_ROWS)))!.view;
  it("player fade: the opponent's shadow shows on age 0 (200 -> 0 px, GOLBAT / FLYGON), hidden from age 1 through script rows + 1", () => {
    const f = Object.freeze({ player: mon("player", 0, 53, true), opponent: mon("trainer", 1, 42, false) });
    expect(viewAt(f, 0, 0).postBodyShadowHidden).toBe(false);
    expect(viewAt(f, 0, 1).postBodyShadowHidden).toBe(true);
    expect(viewAt(f, 0, 104).postBodyShadowHidden).toBe(true);
    expect(viewAt(f, 0, 105).postBodyShadowHidden).toBe(false);
  });
  it("opponent fade (the opponent is the doll): unchanged, hidden from age 0", () => {
    const f = Object.freeze({ player: mon("player", 0, 53, false), opponent: mon("trainer", 1, 42, true) });
    expect(viewAt(f, 1, 0).postBodyShadowHidden).toBe(true);
  });
  it("the production fade check reproduces the audit's patched receipt (34 / 34 windows policy-exact, r1 == r2)", () => {
    const r1 = readFileSync("tools/integration/fixtures/d4w-rest/fade-r1.txt", "utf8");
    expect(r1).toBe(readFileSync("tools/integration/fixtures/d4w-rest/fade-r2.txt", "utf8"));
    expect(r1).toBe(readFileSync("tools/integration/fixtures/species-audit-14/fade-receipts/patch-fade-r1.txt", "utf8"));
    expect(r1.split("\n").filter((l) => l.startsWith("policy-exact"))).toHaveLength(34);
  });
});
