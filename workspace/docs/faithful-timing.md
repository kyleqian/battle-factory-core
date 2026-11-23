# Faithful animation timing — D4, approved 2026-10-07

The user authorized option (b) after the supervisor recommended shipping the
dominant measured timing separately from exact claims: "ok do what you need to
do to unblock. I wanna finish this stuff up". This resolves D4 and authorizes
implementation in the next S10A run. This document adds no live adapter credit.

## Scope

Some source-derived animation programs have an optional lag frame or a graphics
write that lands on different scanlines depending on ROM CPU load. Battle state
does not determine that phase. Use an explicit, deterministic policy based on
the dominant measured phase for those mechanisms. Document its constants,
source ordering, evidence and version; rendering must remain pure and replay/
reset must reproduce the visuals. Do not introduce species-specific timing
tables fitted to captures or import capture rows into production.

This permission covers the same evidenced class in additional moves, bodies or
species windows. Do not reopen D4 for each occurrence. A genuine unknown host
state or an unrelated rendering defect still needs implementation or an honest
fallback; D4 does not turn all mismatches into accepted timing variation.

## Implementation and accounting

- Add "faithful timing" to the live inventory/report pipeline before promoting
  these adapters. Record the phase policy, affected scope, proof commands and
  known row/pixel residuals for each consumer.
- Keep move totals disjoint: scoped exact, faithful random without timing
  approximation, faithful timing, and remaining must sum to the 276 accepted
  Factory bodies. An adapter using both D3 randomness and D4 timing belongs in
  faithful timing once, and retains an explicit presentation-RNG flag and D3
  provenance. It does not contribute again to faithful-random or exact totals.
- Existing exact fixture proofs remain valid in their proved scopes. When
  widening an existing adapter with D4, classify the widened live claim as
  faithful timing and retain those exact proofs; never report the new scope as
  exact. Counts can change by reclassification as well as by adding adapters.
- A fixed timing policy needs its version in evidence and documentation. If a
  timing choice is stored per battle/session, persist that choice/version in
  session exports so replay/reset cannot select a different phase.
- Follow the D4 acceptance section in `ANIMATION_VERIFICATION.md`. Preserve D3
  seed/export and controlled-random proofs for moves using both exceptions.

## Banked evidence and first consumers

The previous supervisor reproduced the following evidence; reuse it for the
same unchanged claims. Independently prove the resulting production integration.

| Mechanism / moves | Evidence and known difference |
| --- | --- |
| Megahorn | `next-adapters-prep24.md`: BG write row 7/8 and restore-fade phase; wrong phase changes 16 fade rows. |
| Meteor Mash | `next-adapters-prep17.md`: final restore row has an optional lag frame; also D3 Random2. |
| Mach Punch, Extrasensory, Nightmare, Psywave | `../tools/integration/fixtures/prep25/lag-frames.json`: body length varies by one frame. |
| Ice Ball, Revenge | `next-adapters-prep26.md`: Ice Ball bodies 4/5 have lag rows and Random2; Revenge BG write row 4/5. |
| Flatter | `next-adapters-prep25.md`: confetti birth phase differs by up to one row. |
| Ghost Curse | `../tools/integration/fixtures/curse-live/ghost-p1-vcount.json`: palette transfer at scanline 17/9. |
| Pursuit, Hidden Power | `later-bodies-curse-oam.md`, `live-species-audit-5.md`, `live-species-audit-3.md`: optional tail lag in some later bodies/species. |
| Sheer Cold, Hyper Voice (#151) | `issue151-diagnosis.md`: Sheer Cold fade differs for 16–17 rows (~17k pixels/row); Hyper Voice palette band differs on one row (up to ~3.8k pixels). |
| AI switch tray hold (ait1) | `ais1-ai-switch-withdraw.md` "ait1": the voluntary AI switch's tray draw -> "sent out" print is 102 frames in 15 of 24 ROM observations (the controller skips one main-loop iteration after the tray-creating one; no source branch), 101 in 9. Shipped 102 (`OPPONENT_SUMMARY_SWITCH_TRAY_LAG_FRAMES`, tray slide one frame later). Faint replacements never stall. |

## Finish the current campaign

Prioritize the remaining 18 accepted adapters and required live host providers,
plus continuation/history fixes needed for ordinary play. Batch moves sharing
proved mechanisms and reuse banked recipes. New probes should answer an
unresolved implementation question or verify changed production; do not repeat
CPU-phase scouting solely to pursue exactness that D4 has already relaxed.

Use the existing scoped verification and receipt-reuse rules, including worker
production gates, independent central reproduction and final full gates.
Completion requires an honest census, usable ordinary routes, documented
remaining history limits, and a verified final playable preview. No audio,
outside-Factory campaign or claim of arbitrary-history pixel exactness is added.
