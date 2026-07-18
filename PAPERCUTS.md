# Papercuts — dev-loop friction tally

Recurring tooling/workflow annoyances (NOT game bugs — those go to
`ISSUES.md`). Litmus: "did this cost me time *working on* the game, rather
than being wrong *in* the game?" Bump `Hits:` instead of duplicating an
entry. In the supervised flow only the supervisor writes this file; workers
report `PAPERCUT: <what>, ~<minutes lost>` in their final message.

Per entry:
- **What:** the friction.
- **Hits:** how many sessions it has bitten.
- **Cost each:** rough minutes lost per hit.
- **Workaround:** the current dodge, if any.

## Reference-header block parsing: last array entry has no trailing comma (2026-07-17)

- **What:** `species_info.h`'s final entry (SPECIES_CHIMECHO) and
  `contest_moves.h`'s `gContestEffects` table omit the trailing comma, so a
  block-closing regex assuming `\n    },` silently swallows the next real
  entry into the previous one's body instead of erroring.
- **Hits:** 1 (moves/exp/items extraction worker).
- **Cost each:** ~10 min (caught only via a battle-frontier-pool
  cross-check, not by count assertions).
- **Workaround:** make the comma optional (`,?`) in block-closing regexes
  for these headers, and always cross-check extraction coverage against an
  independent list (e.g. `battle-frontier-mons.json`'s species/items)
  rather than trusting block counts.

## No committed oracle trace for the battle-1 bring-up path (2026-07-17)

- **What:** every session needing "rent 3 → walk → warp → transition →
  intro → first action menu" hand-tunes the button sequence from scratch.
- **Hits:** 1 (battle-asset extraction worker, ~20 min incl. two wrong
  assumptions caught only by pixel cross-check).
- **Workaround:** none yet — commit a reusable
  `tools/compare/traces/battle1-intro.json` (or a probe-trace variant under
  `tools/compare/`) once S6 engine work starts; press ticks through YES=264
  and "Right this way" at 338-361 are in `docs/rent-flow-notes.md` §4,
  onward boundaries in `docs/battle-bringup-notes.md` §6.

## `sFactorySelectScreen` struct offsets rediscovered per session / no
  reusable RAM-probe harness (2026-07-17)

- **What:** only the `mons[]`/`selectedId` region is documented (in
  `tools/extract/inspect-anchor.py`); other fields (e.g. `monPicAnimating`)
  get re-located by byte-diffing each time a RAM probe needs them. Broader
  form (decline worker, 2026-07-17): every RAM-verified investigation
  rebuilds its probe script (replay + read loop + JSON dump) from scratch;
  the decline worker had no probe at all and did screenshot-only
  archaeology, "a large fraction of the session's budget".
- **Hits:** 2 (confirm-flow scout ~10 min; decline worker, large fraction
  of a 32-min session).
- **Workaround:** when a new field is derived, add its offset as a comment
  in `inspect-anchor.py` — treat that file as the struct-layout registry.
  Real fix: bank a committed `tools/probe/` script (replay a trace's
  segments via `EmeraldOracle`, dump named symbols/offsets per tick to
  JSON) next time a RAM chase happens — ISSUES #12/#13 are natural
  occasions.

## Oracle-probe vs appTrace frame numbering ambiguity (~2x time cost, 2026-07-17)

Two S4 workers independently lost time reconciling "press-tick N" labels
from direct `bin/oracle run` probes with `tools/compare/appTrace.ts`'s
frame counter when building dense traces of a fresh interaction. Worth a
one-paragraph clarification (worked example: a 2-frame press at trace
position K and which captureFrames index shows its first visible effect)
in ROADMAP.md Domain notes or a doc both cite. Flagged by the S4 renderer
worker (PROGRESS entry 13).
