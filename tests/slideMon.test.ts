import { describe, expect, it } from "vitest";
import probe from "../src/data/gen/dragonrage-slide-probe.json" with { type: "json" };
import {
  slideMonToOffsetAtTick,
  slideMonToOffsetDestroyTick,
  slideMonToOffsetMirroredDeltas,
  slideMonToOriginalPosAtTick,
  slideMonToOriginalPosDestroyTick,
} from "../src/engine/slideMon.ts";

interface ProbeRow {
  readonly tick: number;
  readonly attacker: { readonly x2: number; readonly y2: number };
  readonly slideSprites: ReadonlyArray<{ readonly kind: string }>;
}

const rowsByTick = new Map<number, ProbeRow>(
  (probe.ticks as ProbeRow[]).map((row) => [row.tick, row]),
);

function row(tick: number): ProbeRow {
  const found = rowsByTick.get(tick);
  if (!found) throw new Error(`probe is missing tick ${tick}`);
  return found;
}

// Move_DRAGON_RAGE's own createsprite args (battle_anim_scripts.s:5249,5271;
// battle-move-anim-scripts.json's DRAGON_RAGE.createspriteArgvMappings):
// `createsprite gSlideMonToOffsetSpriteTemplate, ANIM_TARGET, 2, 0, 15, 0, 0, 4`
// -> argv [battlerFlag=0 (attacker), targetXOffset=15, targetYOffset=0,
// mirrorVertical=0, duration=4]; `createsprite
// gSlideMonToOriginalPosSpriteTemplate, ANIM_TARGET, 66, 0, 0, 4` -> argv
// [battlerFlag=0, axisSnapMode=0, duration=4]. The probe's own attacker
// (CHARMELEON) is on the player side, so SlideMonToOffset's own opponent-side
// mirror never fires in this evidence - see the mirror-only unit test below
// for the opponent-side branch (derived from source, not independently
// RAM-probed this step - flagged as a real remainder, not claimed exact).
describe("slideMon (DRAGON_RAGE enumeration rung 2): SlideMonToOffset RAM pin", () => {
  const OFFSET_CREATION_TICK = 168; // first RAM tick showing the dummy sprite - fused creation+first-step (see src/engine/slideMon.ts's module doc)
  const args = {
    battlerSide: "player" as const,
    targetXOffset: 15,
    targetYOffset: 0,
    mirrorVertical: false,
    durationTicks: 4,
  };

  it("reproduces the attacker's real per-tick x2 across the whole 4-tick slide-out (RAM ticks 168-172)", () => {
    for (let ramTick = 168; ramTick <= 172; ramTick += 1) {
      const probed = row(ramTick).attacker;
      const ported = slideMonToOffsetAtTick(args, ramTick - OFFSET_CREATION_TICK);
      expect(ported, `RAM tick ${ramTick}`).toEqual({ x2: probed.x2, y2: probed.y2 });
    }
  });

  it("pins the dummy sprite's own alive/destroyed window (RAM: alive 168-172, gone by 173)", () => {
    expect(row(172).slideSprites.some((s) => s.kind === "SlideMonToOffset")).toBe(true);
    expect(row(173).slideSprites.some((s) => s.kind === "SlideMonToOffset")).toBe(false);
    expect(slideMonToOffsetDestroyTick(args.durationTicks)).toBe(173 - OFFSET_CREATION_TICK);
  });

  it("freezes at the final offset after the destroy tick (no reset, unlike SlideMonToOriginalPos)", () => {
    expect(slideMonToOffsetAtTick(args, 10)).toEqual({ x2: 15, y2: 0 });
  });

  it("mirrors x always and y only when mirrorVertical for an opponent-side battler (source-derived, not this step's own RAM evidence)", () => {
    expect(slideMonToOffsetMirroredDeltas({ ...args, battlerSide: "opponent" })).toEqual({ dx: -15, dy: 0 });
    expect(
      slideMonToOffsetMirroredDeltas({ ...args, battlerSide: "opponent", targetYOffset: 10, mirrorVertical: true }),
    ).toEqual({ dx: -15, dy: -10 });
    expect(slideMonToOffsetMirroredDeltas({ ...args, battlerSide: "player" })).toEqual({ dx: 15, dy: 0 });
  });
});

describe("slideMon (DRAGON_RAGE enumeration rung 2): SlideMonToOriginalPos RAM pin", () => {
  const ORIGINAL_POS_CREATION_TICK = 235; // first RAM tick showing the dummy sprite (fused creation+first-step)
  const args = {
    currentX2: 15, // the attacker's own x2 at creation (probe row 235's data[5])
    currentY2: 0,
    axisSnapMode: 0 as const,
    durationTicks: 4,
  };

  it("reproduces the attacker's real per-tick x2 across the whole 4-tick slide-back (RAM ticks 235-238)", () => {
    for (let ramTick = 235; ramTick <= 238; ramTick += 1) {
      const probed = row(ramTick).attacker;
      const ported = slideMonToOriginalPosAtTick(args, ramTick - ORIGINAL_POS_CREATION_TICK);
      expect(ported, `RAM tick ${ramTick}`).toEqual({ x2: probed.x2, y2: probed.y2 });
    }
  });

  it("pins the dummy sprite's own alive/destroyed window (RAM: alive 235-238, gone by 239 - one tick sooner than SlideMonToOffset's deferred hop)", () => {
    expect(row(238).slideSprites.some((s) => s.kind === "SlideMonToOriginalPos")).toBe(true);
    expect(row(239).slideSprites.some((s) => s.kind === "SlideMonToOriginalPos")).toBe(false);
    expect(slideMonToOriginalPosDestroyTick(args.durationTicks)).toBe(239 - ORIGINAL_POS_CREATION_TICK);
  });

  it("force-snaps to exactly 0 on the finished axes and freezes any excluded axis at its original offset", () => {
    expect(slideMonToOriginalPosAtTick(args, 10)).toEqual({ x2: 0, y2: 0 });
    expect(slideMonToOriginalPosAtTick({ ...args, axisSnapMode: 2 }, 10)).toEqual({ x2: 15, y2: 0 });
    expect(slideMonToOriginalPosAtTick({ ...args, currentY2: 20, axisSnapMode: 1 }, 10)).toEqual({ x2: 0, y2: 20 });
  });
});
