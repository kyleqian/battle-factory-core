# Generated Battle 6 LUKAS reveal and summary generalization (Battle Scene OFF)

This is a noncanonical portability proof for the already-owned generic
BattleIntroSlide3 presentation seam and its following status-summary/message
assembly. It does not extend the retired LILIANA Battle-2 action route and
does not capture the post-acknowledgement display tail.

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

## Complete status-summary/message assembly

`tools/compare/traces/factory-round-battle6-lukas-status-summary-message-off.json`
captures every app-relative frame **188–252**, inclusive (**65 frames**).
With the same pre-checkpoint offset 1151, these are oracle pre-checkpoint
frames **1339–1403**, corresponding to source clocks **1228–1292** immediately
after the accepted reveal's source-clock 1227 frame. The boundary is the same
source-owned `BattleIntroDrawPartySummaryScreens` →
`BattleIntroPrintTrainerWantsToBattle` path as the canonical summary proof:

- source clock 1228 begins the player-side summary bar/icon creation;
- the generated `PSYCHIC LUKAS` / `would like to battle!` printer derives its
  cursor edge at source clock 1269 from the actual trainer string length;
- source clock 1291 is the final incomplete callback, while 1292 is the first
  callback where all fourteen summary sprites have settled (`x2 == 0`) and
  `factoryBattleStartStatusSummaryMessageComplete` is true.

The trace has no input and ends at that final summary-sprite settle boundary,
before the unbounded `PAUSE_UNTIL_PRESS` hold, any acknowledgement, and the
separate #56/post-ack display-tail class. Two fresh oracle/app runs after the
stage, test, and trace changes passed **65/65** with zero differing pixels.
The required controls also remained exact: LUKAS reveal **154/154**, canonical
reveal **154/154**, canonical summary **65/65**, transition **249/249**,
send-out **238/238**, action-ready **3/3**, legacy assembly **256/256**, and
far-side LILIANA **115/115**.

The new Tier-1 boundary test keeps the Battle-6 receipt at trainer 121 LUKAS,
player sets `267/268/269`, opponent sets `270/341/284`, and transition table
index 3. It pins the source-relative 1291/1292 phase edge, the all-healthy
summary, a separate status/fainted summary identity, repeated render purity,
and unchanged round rules, transition-derived RNG, parties, and outcomes.
The app stage is only the ordinary `generatedRoundRevealProofStage` and public
round-controller construction; no trainer, battle, absolute-frame, recording,
or framebuffer lookup enters production.

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
npm run compare -- factory-round-battle6-lukas-status-summary-message-off --summary
```

## Opponent send-out checkpoint: exact renderer, blocked source identity

The stock-ROM `factoryLegal` pre-checkpoint stream was replayed densely twice
fresh beyond the summary boundary. Its automatic acknowledgement schedule
holds `A` on absolute frames **1543–1544**. With the reveal mapping offset
1151, the generic app lifecycle needs the corresponding NEW-key edge at app
frame **390**: the ROM accepts that held edge two display callbacks later,
while the app's public round owner freezes its acknowledgement callback once.
A second held app callback is not a new key and leaves the stored receipt
unchanged.

The intended next complete opponent subphase is app **462–511** / oracle
absolute **1613–1662** (**50 dense frames**). It begins immediately after the
known #56 summary display-tail at app 461 / absolute 1612 and ends when the ROM
clears the opponent controller, before the player send-out dispatch and action
menu. Trainer exit, ball/open particles, WEEPINBELL materialization, background
fade, healthbox slide, HP, level, cry-duration hold, and message remain on the
generic acknowledgement-relative compositor.

That phase cannot honestly be promoted yet. Both fresh runs were identical:

- frames **462–469** are byte-exact (**8 frames**);
- frames **470–511** differ only in the opponent healthbox gender glyph: the
  first entering column is **20 pixels**, then **24 pixels/frame**, bounded by
  the sliding glyph at `(0..73,21..28)`; all pixels outside that glyph are
  exact for all 50 frames;
- the deliberately excluded app frame 461 retains only the known #56 tail
  (**15 pixels**, `(0,40)–(164,43)`), so this probe did not alter or claim the
  existing 69/70 diagnostic.

The cause is semantic and already named by open ISSUES #55. The ordinary
five-win round controller produces WEEPINBELL set 270 with personality
`4074577324`, male. The stock ROM's ambient-VBlank-interleaved construction
produces the same legal set/nature/stats/ability with personality `1547933549`,
female. Personality-derived gender is exactly the exposure #55 documents;
its construction clock is explicitly still unwired. Overriding the frozen
party, drawing a fixture-specific female glyph, or adopting a per-fixture
personality would violate this increment's unchanged-party and no-#55 rules.

Tier 1 now pins the frame-390 new-key/held-key semantics, clean phase bounds,
LUKAS and all six set/species identities, both healthy summaries, the exact
personality/gender obstruction, render purity, and unchanged RNG, rules,
parties, and outcomes. No failing comparison trace is promoted. The next
honest owner is #55's generic construction clock; once it supplies the ROM
personality, this already otherwise-exact 50-frame phase can be rerun without
any send-out renderer change.
