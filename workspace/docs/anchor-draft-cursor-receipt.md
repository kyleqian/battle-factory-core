# Anchor pre-draft RNG cursor probe (Gate-5 audit item 2, reworked)

Fresh oracle probe (2026-07-30, OFF profile, `battle-scene-off` at
`http://127.0.0.1:8014`) pinning the true pre-generation RNG cursor(s) for
the anchor's player rental draft, per PROGRESS.md entry 756's HONEST-STOP
and `docs/gate5-acceptance-audit.md` clause (a)'s "discharging artifact."

**Verdict: HONEST-STOP.** The probed cursors reproduce the anchor's set
selection (all six `setId`/species, in order) and the ambient-tick gap to
`0xd2ddeec8` exactly, but a direct two-cursor call into
`generateInitialFactoryRentals` does **not** reproduce the anchor's
personality-construction phase byte-for-byte — a real, precisely diagnosed
gap between the port's `constructionRngValue` contract and true hardware
timing (§5). Per the step brief: `factoryRentalGeneration.ts` and
`anchor-state.json` are unchanged; no red/pending test is added.

## 1. Method

Two-pass technique, reusing the pattern already established by
`tools/probe/verify-factory-battle-start-rng.py` and
`docs/rng-attribution-notes.md` (fast frame-granularity scan, then targeted
CPU single-stepping with LR-based caller attribution). Both passes drive the
same canonical bootstrap the anchor session derives from:
`oracle/bootstrap/factory-battle-scene-off.json` (`extends: factory.json`,
OFF profile poke applied with "zero RNG impact" per its own `note`; 6910
scripted frames + 60 settle frames = 6970 total, the same bootstrap
`tools/extract/inspect-anchor.py` boots to produce `src/data/gen/
anchor-state.json`). Both passes' own final `gRngValue` after the full
6970-frame bootstrap read back `0xd2ddeec8` — byte-identical to the
committed anchor, confirming the probe replays the identical canonical
route.

- **Pass 1 (fast, frame granularity).** Monkeypatch
  `EmeraldOracle._run_bootstrap` to read the source RNG-call counter
  `sRandCount` (`0x020249c0`, static `src/random.c:5`) before/after every
  `core.run_frame()`, flagging any frame whose delta isn't exactly 1 (the
  ambient per-VBlank `Random()` tick, `src/main.c:366`, unconditional
  whenever `gMain.inBattle` is false — true throughout the draft screen, per
  `src/engine/rng.ts`'s own header comment). 88 frames out of 6970 flagged;
  a small early cluster (frames 188–3986) is unrelated overworld/dialogue
  Random() noise (NPC movement etc.) during the walk-in/dialogue portion of
  the bootstrap script, well before the challenge starts. The frames that
  matter sit at the very end of the scripted route: frame 5796 (delta 17)
  and a burst 6696–6742 (deltas 47/51/103/33/5/9).
- **Pass 2 (targeted CPU single-step).** Fresh oracle instance;
  single-step only frames 5682/5683/5796 and the contiguous span
  6696–6760, watching `core.cpu.pc` each instruction for:
  - `Random()` itself (`0x0806f5cc`, entry PC `+2` — libmgba-py's pipelined
    Thumb PC, same convention as the existing probe), capturing the caller
    via `core.cpu.lr` resolved against an `arm-none-eabi-nm --defined-only
    -n` symbol table (same technique as `verify-factory-battle-start-rng.py`'s
    `symbol_at`);
  - entry into `GenerateInitialRentalMons` (`0x081a67ec`,
    `reference/pokeemerald/src/battle_factory.c:509`, resides in
    `battle_factory.o`'s `.text` at `[0x081a5e74, 0x081a703c)` per the
    linker map — a **second, unrelated** symbol of the same name exists at
    `0x081b9ec0` inside `battle_tent.o` (the Battle Tent's own near-identical
    function; confirmed out of range and not used here);
  - entry into `CreateFrontierFactorySelectableMons` (`0x0819b484`,
    `battle_factory_screen.c:1736`, `battle_factory_screen.o`).

  Function **return** is matched against the LR captured at entry (masking
  the Thumb bit, trying both the `+0`/`+2` pipeline readings), not an
  address-range check. An address-range check was tried first and produces
  false "exits": hardware IRQs (the sound-timer interrupt fires very
  frequently) transiently send `cpu.pc` into unrelated interrupt-handler
  code mid-function, which is not a real return. LR-matching is immune to
  this because after any interrupt returns, execution resumes at the exact
  interrupted instruction.

  `pending` (the entry→expected-return map) is a **module-level** dict, not
  per-frame-local: `CreateFrontierFactorySelectableMons`'s entry and its
  actual return land in *different* single-stepped frames (§3), so the
  watch has to survive across `step_frame` calls for consecutive frames.

Both passes ran clean through `python3 tools/run-mgba-probe.py <out.json>
-- python3 <probe.py> <out.json>` (known teardown SIGSEGV only, valid JSON
written first). Pass 2 completed in under 9 seconds wall-clock — the whole
6970-frame bootstrap only needs ~65 frames single-stepped at instruction
granularity, everything else uses the ordinary fast `core.run_frame()` path.

## 2. Anchor metadata (already-committed evidence, cited not re-derived)

`generateInitialFactoryRentals`'s non-RNG inputs come from
`src/engine/factoryAnchorSession.ts:28-32`
(`ANCHOR_FACTORY_METADATA`), established by the Slice-2 provenance probe
(PROGRESS-archive entry 739): `factoryWinStreak: 0`, `rentsCount: 0`,
`playerTrainerId: 416_049_562` — the latter also independently confirmed by
every rental record's `otId` field in `anchor-state.json`. These give
`challengeNum = 0`, `rentalRank = 0` (both reproduced by the port itself,
not asserted here).

## 3. Probed cursors

| checkpoint | frame | `gRngValue` | `sRandCount` |
|---|---|---:|---:|
| `GenerateInitialRentalMons` entry (**pre-selection**) | 5796 | `145179184` (`0x08a74230`) | 5936 |
| `GenerateInitialRentalMons` return | 5796 | `1172530733` (`0x45e3662d`) | 5947 |
| `CreateFrontierFactorySelectableMons` entry (**pre-construction**) | 6696 | `3231484068` (`0xc09c88a4`) | 6852 |
| `CreateFrontierFactorySelectableMons` return | 6748 | `1969836434` (`0x75695192`) | 7146 |
| RAM-probed anchor (`inspect-anchor.py`) | 6970 (bootstrap end) | `3537759944` (`0xd2ddeec8`) | — |

**Selection phase (11 draws, all within frame 5796 — no interleaving
possible for a single-frame call):** `GenerateInitialRentalMons` runs
entirely inside one video frame, entry and return both landing at frame
5796. Its return cursor, `1172530733`, is **byte-identical** to the
already-committed `ANCHOR_BATTLE_1_SELECTION_RNG_VALUE`
(`src/engine/factoryAnchorSession.ts:35`) — the documented start of Battle
1's **opponent** (trainer 50 DESTIN) trainer/set-selection epoch from entry
739's independent Slice-2 probe. This is a strong cross-validation from two
unrelated probe sessions: the player's own set-selection and the opponent's
trainer/set-selection run **back-to-back within the same frame**, with zero
gap and zero ambient ticks between them — confirmed further by the fast
pass's frame-5796 end-of-frame value, `3145421632`, which is exactly the
also-already-committed `ANCHOR_BATTLE_1_SELECTION_END_RNG_VALUE`
(`factoryAnchorSession.ts:36`).

Feeding `rngValue: 145179184` (with the §2 metadata) into
`generateInitialFactoryRentals` reproduces **all six `setId`s, species
names, and slot order exactly**: `156`/ONIX, `149`/MAGBY, `180`/BAYLEEF,
`153`/BUTTERFREE, `179`/HAUNTER, `181`/QUILAVA — matching
`anchor-state.json`'s `rentals[].frontierMonIndex`/`species` in order,
byte-for-byte. The selection phase is fully receipt-linked.

**Construction phase (personality generation) — see §4/§5**: does not
reproduce cleanly from the probed `constructionRngValue` alone.

## 4. Construction spans 53 video frames; ambient ticks interleave mid-loop

`CreateFrontierFactorySelectableMons` entered at frame 6696 but did not
return until frame 6748 — **53 video frames**, not one. This is real
hardware behavior, not a probe artifact: constructing six mons (each a full
`CreateMonWithEVSpreadNatureOTID` Random32-with-nature-rejection loop, plus
`CalculateMonStats`, checksum/substruct packing, move/item/friendship
writes) costs more CPU cycles than fit in one video frame's ~280,896-cycle
budget. The hardware VBlank interrupt fires on schedule regardless of what
C code is running, preempting the call repeatedly; `VBlankIntr`'s own
ambient `Random()` tick (`main.c:366`) advances the **same shared
`gRngValue`** mid-construction. The single-step ledger's LR-attributed
callers confirm this directly — 295 raw `Random()` calls in the
6696–6748 window, split:

- **242 calls** attributed to `CreateMonWithEVSpreadNatureOTID+0x35`/`+0x3b`
  (the low/high halves of its own `Random32()`, `pokemon.c:2572`) — 121
  accepted-or-rejected attempts across the six mons: **23, 25, 51, 16, 2, 4**
  attempts for ONIX/MAGBY/BAYLEEF/BUTTERFREE/HAUNTER/QUILAVA respectively
  (sum: 121 × 2 = 242, exact).
- **53 calls** attributed to `VBlankIntr+0x87` — one ambient tick per frame,
  interleaved between (and, per the LCG chain having zero gaps across the
  entire span — verified by checking `advanceRngValue(call[i].pre) ==
  call[i+1].pre` for every consecutive pair — possibly *within* a single
  `Random32()`'s two calls too).

**Filtering the ledger to the 242 `CreateMonWithEVSpreadNatureOTID`-only
calls and replaying them (skipping the ambient entries, pairing the
remaining calls low/high in order) reproduces all six anchor personalities
exactly**: `1205102525`/`1534575931`/`1550278706`/`2653995674`/
`1206438594`/`2355253556` for ONIX/MAGBY/BAYLEEF/BUTTERFREE/HAUNTER/QUILAVA
— matching `anchor-state.json` byte-for-byte. This proves the ported
nature-rejection **algorithm** itself is correct (same accept/reject rule,
same order, same target natures); the gap is specifically that consuming
`gRngValue` from a single cursor via 242 back-to-back `advanceRngValue`
calls (what `generateInitialFactoryRentals`'s `constructionRngValue`
contract does) does **not** match what the real, multi-frame-spanning
hardware call actually consumed, because 53 ambient ticks are woven into
that same window on real hardware and the port has no way to know where.

## 5. HONEST-STOP: the direct two-cursor call diverges on four of six personalities

Calling:

```ts
generateInitialFactoryRentals({
  rngValue: 145179184,             // pre-selection, frame 5796
  factoryWinStreak: 0,
  rentsCount: 0,
  playerTrainerId: 416_049_562,
  constructionRngValue: 3231484068, // pre-construction, frame 6696
});
```

reproduces slot 0 (ONIX, personality `1205102525`) and slot 2 (BAYLEEF,
personality `1550278706`) exactly, but diverges on slots 1, 3, 4, 5.
**First divergence:** `rentalIndex 1` (MAGBY), field `personality` —
expected `1534575931`, got `431990256` (both satisfy the same target
nature, `DOCILE`/index 6, since acceptance is gated on `personality % 25`;
the wrong value only becomes visible once you compare exact bits). Mon 0
matches because it completes in 23 attempts (46 raw LCG steps) entirely
within frame 6696, before any interrupt has a chance to fire — no
interleaving is possible for a call that finishes inside a single video
frame. Mon 2 (BAYLEEF) matching despite mon 1 (MAGBY) not matching is a real but
incidental re-alignment for this specific case: the clean model needs 31
attempts for mon 1 versus the real 25, a 6-attempt (12-raw-step) surplus;
the real hardware consumes 12 ambient ticks somewhere during mon 1's real
53-frame-window processing. Those two facts happen to cancel exactly, so
both models' cursors land back on the identical raw LCG position,
`1550307324`, by the time mon 2 (BAYLEEF, 54 clean attempts vs. 51 real)
finishes — confirmed by direct comparison of both models' post-mon-2
cursors. It is not evidence the contract is safe in general: it is a
coincidence specific to this one case's attempt counts, and mons 3–5
(downstream of mon 1's now-real divergence reasserting itself) do not
re-align again.

**Practical blast radius for this anchor:** setId, species, nature, EVs,
moves, item, and fixed IVs are all `setId`/challenge-derived, not
personality-derived, so none of them are corrupted by the wrong
personality. Ability slot (`personality & 1`, only when a species has a
real second ability) is also unaffected for this specific anchor — MAGBY,
BUTTERFREE, HAUNTER, and QUILAVA (the four mismatched slots) are all
single-ability species per `species-stats.json`; only ONIX (slot 0, dual
`ROCK_HEAD`/`STURDY`) has a real second ability, and slot 0 is exactly the
one slot that *does* match. Gender (`getMonGender`, personality-derived)
and the shiny check (`otId ^ personality`) were not independently
cross-checked here and are the fields most likely to actually differ if
this were exercised in the app.

**This is a real defect finding**, not a fixture problem:
`anchor-state.json` is RAM-verified ground truth (cross-validated
independently by `tests/anchorRentals.test.ts`'s 45 passing assertions
against extracted tables) and this probe's own selection-phase and
ambient-tick reconciliation (§3, §6) show the probe methodology and cursors
are sound. The gap is specifically that `generateInitialFactoryRentals`'s
`constructionRngValue` parameter — per its own module docstring,
"[o]mitting it runs the two source loops back-to-back... and does not
invent any ambient VBlank draws" — has no representation for ambient draws
occurring **inside** the construction phase itself, only for the
presentation-time gap **between** selection and construction. That gap
assumption holds for selection (single-frame, confirmed clean, §3) but not
for construction (53 frames, confirmed interleaved, §4) whenever
construction is slow enough to span more than one video frame — which it
is, for the one real case measured.

Per the step brief's own HONEST-STOP clause: `factoryRentalGeneration.ts`
and `anchor-state.json` are left unchanged, and no
`tests/anchorDraftReceiptLink.test.ts` (red or otherwise) is added this
session. Closing this needs an engine-side scope decision (model
interleaved ambient draws in the construction contract, e.g. an explicit
per-mon or per-frame checkpoint list — a `src/engine` change, out of this
step's scope) or a decision that the production anchor route's current
fixed-fixture approach (`factoryAnchorSession.ts` loads `anchor-state.json`
directly; `generateInitialFactoryRentals` is not on that route today, per
`docs/gate5-acceptance-audit.md` clause (a)'s own "missing artifact" note)
makes this receipt link lower priority than it first appears.

## 6. Ambient-tick relationship to `0xd2ddeec8`

`CreateFrontierFactorySelectableMons` returns at frame 6748 with
`gRngValue = 1969836434`. Forward-applying the LCG
(`gRngValue' = 1103515245 * gRngValue + 24691 mod 2^32`, matching
`src/engine/rng.ts`'s `advanceRngValue` exactly) **222 times** lands on
`3537759944` (`0xd2ddeec8`) exactly — and `6970 - 6748 = 222`, the exact
frame count from construction's return to the bootstrap's final frame (the
frame `inspect-anchor.py` reads `gRngValue` from). Every one of those 222
remaining ambient per-VBlank ticks (§1's `main.c:366` rule; the draft
screen is idle, `gMain.inBattle` stays false) is now fully accounted for:
zero unexplained draws between construction's real end and the RAM-probed
anchor value.

## 7. Reproducing this probe

The probe scripts themselves are throwaway (not committed, per this step's
NEW-FILES-ONLY / doc-plus-test-only contract) but are fully specified by
§1's addresses/technique plus this recipe:

1. Monkeypatch `EmeraldOracle._run_bootstrap` (from `oracle/emerald_core.py`)
   to run pass 1 (frame-granularity `sRandCount` scan) against
   `oracle/bootstrap/factory-battle-scene-off.json`, identifying flagged
   frames.
2. Re-run fresh, single-stepping only frames `5682`, `5683`, `5796`, and
   the contiguous span `6696..6760` (buffer past the last flagged delta at
   6742), watching `core.cpu.pc`/`core.cpu.lr` for `Random()`
   (`0x0806f5cc`/`+2`), `GenerateInitialRentalMons`
   (`0x081a67ec`/`+2`), and `CreateFrontierFactorySelectableMons`
   (`0x0819b484`/`+2`) entries, matching each entry's return via its
   captured LR (masking the Thumb bit, `+0`/`+2`).
3. Run both through `python3 tools/run-mgba-probe.py <out.json> --
   python3 <script.py> <out.json>` (per-case process isolation; the known
   teardown SIGSEGV is benign once the JSON is written).

All values in §3/§4/§6 above are this probe's direct output, cross-checked
against three independent already-committed sources: `anchor-state.json`
(RAM ground truth), `factoryAnchorSession.ts`'s Slice-2-probed opponent
epoch constants, and `src/engine/rng.ts`'s LCG implementation.
