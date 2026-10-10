// cf78 (live audit 19 DEFECT 1, ISSUES #143 remainder; docs/cf78-castform-needle-arm.md): while a displayed CASTFORM is in a weather
// form (its slot's ROM gBattleMonForms != 0) every live body declines, because the field art draws the normal form only.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applyLiveCastformFormEvents, LIVE_CASTFORM_FORMS_NORMAL, withLiveCastformForms,
} from "../src/engine/battleResolutionPresentationRender.ts";
import { liveCastformFormDeclines, liveMoveAnimationPresentation, liveMoveHiddenSides } from "../src/engine/liveMoveAnimation.ts";
import { liveView, type Fixture } from "../tools/integration/liveAdapterFramebuffer.ts";
import { cf78Parity } from "../tools/integration/cf78Parity.ts";

const FIXTURES = "tools/integration/fixtures/audit-19/fixtures";
type Audit19Fixture = Fixture & { precedingTurns: { events: Record<string, unknown>[] }[] };
const fixture = (name: string) => JSON.parse(readFileSync(`${FIXTURES}/${name}`, "utf8")) as Audit19Fixture;
// A known first-body order lend (hide66's / dt60's), so an order-dependent consumer presents live without replaying the history.
const ORDER = { known: true as const, free: [4, 3, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22] };
const castformChange = (sequence: number, battler: number, argument: string) =>
  ({ sequence, payload: { kind: "animation", animationId: "CASTFORM_CHANGE", battler, arguments: [argument] } });

/** The window's slot forms: every history event strictly before the window's own (last) body event, sequenced in order. */
function windowForms(f: Audit19Fixture) {
  const events = f.precedingTurns.flatMap((turn) => turn.events);
  return applyLiveCastformFormEvents(LIVE_CASTFORM_FORMS_NORMAL, events.map((payload, sequence) => ({ sequence, payload })),
    events.length - 1, true);
}

describe("cf78: the slot's Castform form (presentation-only gBattleMonForms)", () => {
  it("CASTFORM_CHANGE sets the slot form (argument & ~CASTFORM_SUBSTITUTE), a later change back clears it, strict limits apply", () => {
    const events = [castformChange(3, 0, "2"), castformChange(7, 1, String(0x80 | 1)), castformChange(9, 0, "0")];
    expect(applyLiveCastformFormEvents(LIVE_CASTFORM_FORMS_NORMAL, events, 3, true)).toBe(LIVE_CASTFORM_FORMS_NORMAL);
    expect(applyLiveCastformFormEvents(LIVE_CASTFORM_FORMS_NORMAL, events, 3, false)).toEqual([2, 0]);
    expect(applyLiveCastformFormEvents(LIVE_CASTFORM_FORMS_NORMAL, events, 9, true)).toEqual([2, 1]);
    expect(applyLiveCastformFormEvents(LIVE_CASTFORM_FORMS_NORMAL, events, Number.POSITIVE_INFINITY, false)).toEqual([0, 1]);
    // An unreadable argument is an unknown form: it declines like a weather form.
    expect(applyLiveCastformFormEvents(LIVE_CASTFORM_FORMS_NORMAL, [castformChange(0, 1, "x")], 1, true)).toEqual([0, 0xff]);
    // Other animations never touch the forms.
    const other = { sequence: 0, payload: { kind: "animation", animationId: "STATS_CHANGE", battler: 0, arguments: ["2"] } };
    expect(applyLiveCastformFormEvents(LIVE_CASTFORM_FORMS_NORMAL, [other], 1, true)).toBe(LIVE_CASTFORM_FORMS_NORMAL);
  });

  it("the field carries castformForm only on a displayed CASTFORM (the slot form waits for a Castform to show it)", () => {
    const view = liveView(fixture("cast-rain-swift-opp-c1.json"), 0);
    expect(view.field.player.species).toBe(385);
    const field = withLiveCastformForms(view.field, [2, 3]);
    expect(field.player.castformForm).toBe(2);
    expect(field.opponent.castformForm).toBeUndefined(); // CHANSEY: the slot's form is not drawn on another species
    expect(liveCastformFormDeclines(field)).toBe(true);
    expect(withLiveCastformForms(field, LIVE_CASTFORM_FORMS_NORMAL).player.castformForm).toBeUndefined();
    expect(withLiveCastformForms(view.field, LIVE_CASTFORM_FORMS_NORMAL)).toBe(view.field);
  });

  // audit 19's 48 cast-* windows (44 live with 998..2,312 px per row in Castform's box on c68111480, 4 Shock Wave fallbacks).
  const cast = readdirSync(FIXTURES).filter((name) => /^cast-(rain|sun)-.*-c\d+\.json$/.test(name)).sort();
  it("audit 19: 48 Castform windows, every one in a weather form at its body", () => {
    expect(cast).toHaveLength(48);
    for (const name of cast) {
      const forms = windowForms(fixture(name));
      expect(Math.max(...forms), name).toBe(name.startsWith("cast-sun-") ? 1 : 2);
    }
  });
  it("every Castform window's live body declines with the slot's weather form; Swift (order lend only) presents without it", () => {
    let controls = 0;
    for (const name of cast) {
      const f = fixture(name);
      const view = liveView(f, 0);
      const e = view.effect;
      if (e?.type !== "move") throw new Error("expected a move effect");
      const call = (field: typeof view.field) => liveMoveAnimationPresentation(e.request, field, 0, e.paletteInput, e.spriteAllocatorInput,
        ORDER, e.presentationRng, e.battlerX2Input, liveMoveHiddenSides(view.visibility, e.request));
      const field = withLiveCastformForms(view.field, windowForms(f));
      expect(field[f.target.species === "CASTFORM" ? f.target.geometry.side : f.attacker.geometry.side].castformForm, name).toBeDefined();
      expect(call(field), name).toBeNull();
      // The fixture view alone carries no lend / words context for Shock Wave, Thunderbolt and Water Pulse (they decline on their own
      // here); Swift needs only the order lend, so without the form it presents: the decline above is the form gate.
      if (e.request.moveId === 129) {
        expect(call(view.field), name).not.toBeNull();
        controls += 1;
      }
    }
    expect(controls).toBe(12);
  });
  it("the other 551 audit-19 windows carry no Castform form (the gate leaves them alone)", () => {
    const others = readdirSync(FIXTURES).filter((name) => name.endsWith(".json") && !name.startsWith("cast-"));
    expect(others).toHaveLength(551);
    for (const name of others) expect(windowForms(fixture(name)), name).toBe(LIVE_CASTFORM_FORMS_NORMAL);
  });
});

describe("cf78: census route 950 through the production orchestrator, Scene ON / OFF parity", () => {
  it("battle 950 (seed 950, streak 13): the player's CASTFORM in hail; all 19 bodies with it transformed decline", () => {
    const r = cf78Parity(950, 13);
    expect(r.rngEqual && r.rulesEqual && r.boundaryEqual && r.facilityEqual).toBe(true);
    expect(r.castformBodiesOn).toBe(19);
    expect(r.castformLiveBodiesOn).toBe(0);
    // Every other body keeps its decision: the 9 live on c68111480 (census battle 950, docs/cf78-castform-needle-arm.md).
    expect(r.liveBodiesOn).toBe(9);
    // The form at every one of them: hail (3), on the player's slot (SEALEO's Hail from turn 6).
    expect(new Set(r.bodies.flatMap((b) => b.castformForm[0] !== 0 || b.castformForm[1] !== 0 ? [b.castformForm.join(",")] : [])))
      .toEqual(new Set(["3,0"]));
  }, 240000);
});
