# Selection-rejection oracle verification: NOPPLEFT + ITEMALLOWSONLYYMOVE (ISSUES #72)

Closes the remaining oracle-verification gap the `05d7dccf` session left open:
of the four `printselectionstring` STRINGID resolvers landed that session
(`resolveMoveSelectionRejectionMessageLines`/`resolveNoMovesLeftMessageLines`,
`src/engine/battleResolutionPresentation.ts`), only Torment had been checked
against the real ROM (that probe's trace/PNGs were never banked to disk —
this doc's sibling gap). This step verifies the other two feasible causes;
`PKMNHASNOMOVESLEFT` is intentionally skipped (see bottom).

## Method

`bin/oracle lab <trace.json> -o <dir>` (Battle Scene OFF, `mechanicLab
overrides.parties`), reading the captured PNG text directly and cross-checking
the manifest's per-capture semantic `state.battlers.player.pp` array to
confirm the staged precondition (PP depletion / Choice Band lock) actually
took hold before reading the rejection frame. Both scenarios build 3 full
legal Pokémon per side (`overrides.parties`, so the ROM derives stats/PP
itself — no direct PP injection is possible; see "why not inject 0 PP"
below) and drive real button input through the move-select menu twice
(select a move → wait for the turn to resolve → reselect to trigger the
rejection). Trace files are checked in under `tools/battle-lab/`.

## Cause 1 — `STRINGID_ITEMALLOWSONLYYMOVE` (Choice Band lock)

**Trace:** `tools/battle-lab/mechanic-selection-reject-choice-band-off.json`.
Player CHANSEY holds `ITEM_CHOICE_BAND` (186), moves `[TACKLE, GROWL, 0, 0]`.
Turn 1: `A, A` selects slot 0 (TACKLE) — confirmed by the manifest,
`pp: [35,40,0,0] -> [34,40,0,0]` at frame 734. Turn 2: `A, RIGHT, A` selects
slot 1 (GROWL), now Choice-locked to TACKLE.

**Run:**
```sh
bin/oracle lab tools/battle-lab/mechanic-selection-reject-choice-band-off.json -o /tmp/orb/choiceband
```

**Result (frame 980, `choice-band-rejection.png`):**
```
CHOICE BAND allows the
use of only TACKLE!
```
Byte-for-byte match against `sText_ItemAllowsOnlyYMove`
(`reference/pokeemerald/src/battle_message.c:496`,
`"{B_LAST_ITEM} allows the\nuse of only {B_CURRENT_MOVE}!"`) and against
`resolveMoveSelectionRejectionMessageLines`'s existing Tier-1 pin
(`tests/battleScriptSelectionRejection.test.ts:456-466`,
`["CHOICE BAND allows the", "use of only TACKLE!"]`). **Verdict: MATCH, no
src change needed.**

## Cause 2 — `STRINGID_NOPPLEFT` (empty move slot, other slots legal)

**Trace:** `tools/battle-lab/mechanic-selection-reject-no-pp-off.json`.
Player CHANSEY, moves `[SUNNY DAY (5 PP), TACKLE, 0, 0]` — Sunny Day is the
lowest-PP non-Struggle/Sketch move available (Sketch's 1 PP was rejected as
the depletion vehicle: a successful Sketch permanently rewrites the move
slot, and guaranteeing failure-without-conversion needs a proven turn-order
argument this step didn't have time to establish; Sunny Day has no such
side effect and is inert against the field). `overrides.parties` cannot
inject PP directly (checked `oracle/battle_lab.py`: PP is always derived
from the ROM's own base-PP × PP-Ups construction, never a settable field),
so the only way to reach 0 PP is genuine depletion — 5 real turns of
`A, A` selecting slot 0, confirmed depleting 5→4→3→2→1→0 in the manifest
(frames 0/734/1468/2202/2936/3670). Turn 6 reselects slot 0 (still shown in
the menu — slot 1 TACKLE stays legal, so the menu opens normally, matching
the brief's "other slots legal so the menu still opens").

**Run:**
```sh
bin/oracle lab tools/battle-lab/mechanic-selection-reject-no-pp-off.json -o /tmp/orb/nopp
```

**Result (frame 3750, `no-pp-rejection.png`):**
```
There's no PP left for
this move!
```
Byte-for-byte match against `sText_NoPPLeft`
(`reference/pokeemerald/src/battle_message.c:360`, no placeholders) and
against the existing Tier-1 pin
(`tests/battleScriptSelectionRejection.test.ts:420-430`,
`["There's no PP left for", "this move!"]`). **Verdict: MATCH, no src
change needed.**

## `PKMNHASNOMOVESLEFT` — not attempted, documented reason

Needs all four move slots at 0 PP simultaneously. Every slot's PP is
independently ROM-derived (no injection, as above), and the cheapest
depletion vehicle (Sunny-Day-style 5-PP status moves) would cost 4×5 = 20
real turns to exhaust every slot — well outside this step's remaining
budget. The only cheaper path (Sketch, 1 PP, all four slots) is
mechanically live but risky to stage blind: a *successful* Sketch
permanently overwrites the slot's move (breaking the "same move, PP now 0"
assumption), so it only works if every Sketch attempt is guaranteed to
*fail without conversion* (real source: fails when
`gLastMoves[target] == MOVE_NONE`, i.e. the target hasn't moved yet this
battle) — which requires the player to out-speed the opponent on every one
of the four setup turns, an assumption this step did not verify against
the two staged species (in fact the Cause-1/2 traces' own MAGIKARP
opponent (speed 100) outran CHANSEY (speed 70), the opposite of what
Sketch-fail would need). Left for a future step with headroom to first
confirm a speed-ordering, then stage 4 Sketch turns + 1 rejection turn (5
turns total, same order of cost as the NOPPLEFT trace above).
