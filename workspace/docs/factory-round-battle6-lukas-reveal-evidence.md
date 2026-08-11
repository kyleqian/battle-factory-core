# Generated Battle 6 LUKAS reveal generalization (Battle Scene OFF)

This is a noncanonical portability proof for the already-owned generic
BattleIntroSlide3 presentation seam. It does not extend the retired LILIANA
Battle-2 action route and does not capture the post-acknowledgement display
tail.

## Controller and legal-ROM receipt

The app stage starts the ordinary challenge-2 round corpus at seed 70 with
player rental set ids `267/268/269`. It advances five wins through the public
round-controller presentation, pre-generation, swap-decline, and next-battle
interfaces. No trainer or opponent party is injected after construction. The
resulting pending Battle 6 command (`battleIndex = 5`) has:

- trainer history `109/133/129/135/122/121`, with trainer 121 LUKAS current;
- player set ids `267/268/269` and opponent set ids `270/341/284`;
- healed healthy three-mon summaries on both sides;
- round RNG cursor `1942389301`; the next source transition draw is raw
  `61743`, table index 3, transition 32
  `B_TRANSITION_FRONTIER_SQUARES_SCROLL`, and cursor `4046452484`.

That transition is distinct from the canonical LILIANA seam's index-1
LOGO_WAVE receipt and selects the generic zero-display-lag intro handoff.
Rendering reads the frozen `FactoryBattleStartPresentationCommand`; it does
not choose or advance any opponent, party, outcome, or RNG state.

The oracle fixture is an explicit `factoryLegal`, `battle-scene-off` request
for challenge 2 / battle number 5. It supplies three legal catalog records per
side and was accepted by the stock-ROM lab without overrides:

`tools/battle-lab/factory-round-battle6-lukas-reveal-off.json`

## Complete source phase

`tools/compare/traces/factory-round-battle6-lukas-reveal-off.json` captures
every app-relative frame **34–187**, inclusive (**154 frames**). With the
single lifecycle offset 1151, these are oracle pre-checkpoint frames
**1185–1338**. The range is the complete existing source-owned reveal:

- frame 34 is the final retained-black callback at source clock 1074;
- frame 35 begins BattleIntroSlide3's visible window at source clock 1075;
- the window/scanline shifts, alpha blend, and both trainer slides run without
  omission;
- frame 187 is source clock 1227, the first fully settled scene plateau.

The offset is uniform for the whole source phase (app frame 100 and oracle
frame 1251 are byte-identical); no geometry, color, per-frame image lookup, or
identity-specific production branch is involved. The trace contains no input
and stops before status-message assembly and all acknowledgement handling.

Two fresh oracle/app runs after the final staging and test changes passed
**154/154** with zero differing pixels. The existing controls also remained
exact: reveal **154/154**, status summary **65/65**, transition **249/249**,
start **238/238**, action-ready **3/3**, legacy scene assembly **256/256**, and
far-side LILIANA **115/115**. The **69/70** post-ack diagnostic was not run or
claimed.

## Tier-1 boundary

`tests/factoryRoundIntroGeneralization.test.ts` pins the selected later-round
trainer history, trainer/set/party summaries, transition receipt, and a
distinct RICARDO/MAGNETON identity. Repeated rendering at a dynamic reveal
frame is byte-identical and leaves the complete engine state unchanged,
including round rules, parties, outcomes, transition-derived RNG, and the
frozen intro command.

Reproduction:

```sh
npm run compare -- factory-round-battle6-lukas-reveal-off --summary
```
