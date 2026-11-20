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

  // audit 19's 48 cast-* windows (44 live with 998..2,312 px per row in Castform's box on 9115d5ec3, 4 Shock Wave fallbacks).
  const cast = readdirSync(FIXTURES).filter((name) => /^cast-(rain|sun)-.*-c\d+\.json$/.test(name)).sort();
  it("audit 19: 48 Castform windows, every one in a weather form at its body", () => {
    expect(cast).toHaveLength(48);
    for (const name of cast) {
      const forms = windowForms(fixture(name));
      expect(Math.max(...forms), name).toBe(name.startsWith("cast-sun-") ? 1 : 2);
    }
  });
  // cast83 (docs/cast83-castform-forms.md): the field art draws the form; every one of these windows' (move, Castform role, form) is
  // ROM-proven (cast83Check.ts: 44 / 44 live windows 0 px), so the form gate passes for each body; without a body request (the
  // Substitute swap composite) it still declines.
  it("cast83: every Castform window's (move, role, form) is ROM-proven, so the form gate passes; Swift (order lend only) presents with the form", () => {
    let swift = 0;
    for (const name of cast) {
      const f = fixture(name);
      const view = liveView(f, 0);
      const e = view.effect;
      if (e?.type !== "move") throw new Error("expected a move effect");
      const field = withLiveCastformForms(view.field, windowForms(f));
      expect(field[f.target.species === "CASTFORM" ? f.target.geometry.side : f.attacker.geometry.side].castformForm, name).toBeDefined();
      expect(liveCastformFormDeclines(field, e.request), name).toBe(false);
      expect(liveCastformFormDeclines(field), name).toBe(true);
      // The fixture view alone carries no lend / words context for Shock Wave, Thunderbolt and Water Pulse (they decline on their own
      // here); Swift needs only the order lend, so it presents with the form.
      if (e.request.moveId === 129) {
        expect(liveMoveAnimationPresentation(e.request, field, 0, e.paletteInput, e.spriteAllocatorInput, ORDER, e.presentationRng,
          e.battlerX2Input, liveMoveHiddenSides(view.visibility, e.request)), name).not.toBeNull();
        swift += 1;
      }
    }
    expect(swift).toBe(12);
  });
  it("the other 551 audit-19 windows carry no Castform form (the gate leaves them alone)", () => {
    const others = readdirSync(FIXTURES).filter((name) => name.endsWith(".json") && !name.startsWith("cast-"));
    expect(others).toHaveLength(551);
    for (const name of others) expect(windowForms(fixture(name)), name).toBe(LIVE_CASTFORM_FORMS_NORMAL);
  });
});

describe("cf78: census route 950 through the production orchestrator, Scene ON / OFF parity", () => {
  it("battle 950 (seed 950, streak 13): the player's CASTFORM in hail; the ROM-proven bodies with it transformed are live (cast83)", () => {
    const r = cf78Parity(950, 13);
    expect(r.rngEqual && r.rulesEqual && r.boundaryEqual && r.facilityEqual).toBe(true);
    // parity-mac re-pin (docs/parity-mac/castform-reverts-with-weather.md): CASTFORM now reverts to Normal when the hail runs out
    // (HandleFaintedMonActions state 6, ABILITYEFFECT_FORECAST), so battle 950 holds 11 bodies with it transformed (was 21), all
    // 11 live (was 20 of 21), and 31 other live bodies (was 22). Scene ON / OFF parity above is unchanged.
    expect(r.castformBodiesOn).toBe(11); // abl261 (ISSUES #202): battle 950 is a census seed the full ability resolver changes (ON 304 -> 480 commands); 19 -> 21
    // cast83: Shock Wave / Icy Wind / Water Pulse by the ice-form CASTFORM (351 / 196 / 352 :by:3) are live; Ember (residual), Rest,
    // Hail, Ice Ball and Fly at it still decline (docs/cast83-castform-forms.md).
    // apx219: + the ice-form Water Pulse 352 after an unknown order history (census seed 950), drawn approximately (known-entry order).
    // apx221: every other Castform body is drawn approximately with the displayed form's art (castform-form), 19 of 19.
    expect(r.castformLiveBodiesOn).toBe(11); // abl261: 19 -> 20 of 21 (the other Castform body keeps declining; reported in docs/abl261-ability-damage.md)
    // Every other body keeps its decision: the 9 live on 9115d5ec3 (census battle 950, docs/cf78-castform-needle-arm.md).
    expect(r.liveBodiesOn - r.castformLiveBodiesOn).toBe(32); // abl261: 9 -> 22 (the changed battle is longer, same decisions); ice2: 31 -> 32, Ice Ball command 264 (unresolved lend) is now drawn on the fallback order (was the static field)
    // The form at every one of them: hail (3), on the player's slot (SEALEO's Hail from turn 6).
    expect(new Set(r.bodies.flatMap((b) => b.castformForm[0] !== 0 || b.castformForm[1] !== 0 ? [b.castformForm.join(",")] : [])))
      .toEqual(new Set(["3,0"]));
  }, 240000);
});
