# ISSUES #56 closure audit (2026-08-02, side lane)

Evidence-only step per the supervisor's brief: re-derive the current state of
both public dense arbitrary-trainer intro comparisons, map every red frame to
a settled/resolved class named in ISSUES #56 and its linked docs, and report
whether the entry can honestly reclassify as a settled record. **No
production code was touched.** HEAD at audit time: `3a165507` (`docs:
PROGRESS 876 addendum`).

## Headline result

**Do not reclassify #56 as settled yet.** YOSHI holds at its documented
700/751 with every red frame mapping cleanly to a named settled class, but
**MAGNETON has regressed from its documented 703/751 to 702/751** — a new,
unclassified one-frame defect at frame 437, most likely caused by
`1aa13ebb` (2026-08-02, the frame-444 particle-stall fix) whose own landing
check never re-ran the MAGNETON comparison despite an identical risk having
been documented and reverted once already (`docs/issue56-frames-444-536-oam-probe.md`
Round 2 Part A, 2026-07-31). See "Headline finding" below for the full
causal chain.

## 1. Current counts (re-derived, not assumed)

```sh
npm run compare -- tools/compare/traces/factory-arbitrary-intro-yoshi-off.json <scratch>/yoshi --summary
  -> 700/751 frames matched   (documented: 700/751 — UNCHANGED)

npm run compare -- tools/compare/traces/factory-arbitrary-intro-magneton-off.json <scratch>/magneton --summary
  -> 702/751 frames matched   (documented: 703/751 — SHIFTED, -1)
```

YOSHI matches the count recorded in ISSUES #56's symptom line and in
`docs/issue56-display-latch-event-design.md`'s acceptance-blast-radius table
exactly. **MAGNETON does not** — every prior doc from 2026-07-31 Round 5
onward through the 2026-08-01 display-latch design doc records 703/751 as a
held, regression-checked pin. This audit's fresh run is the first
re-verification of that pin since `1aa13ebb` (2026-08-02 00:38) landed, and
it no longer holds.

## 2. Method

Both traces are `factoryLegal`-mode dense intro comparisons
(`tools/compare/traces/factory-arbitrary-intro-{yoshi,magneton}-off.json`),
751-frame windows (`0..750`), run against the Battle Scene OFF oracle
(`http://127.0.0.1:8014`, `POKEBENCH_ORACLE_PROFILE=battle-scene-off`) via
`npm run compare -- <trace> --summary`, which prints one line per mismatched
frame (`bbox`, pixel count, SSIM) and the final matched/total count. Full
raw output archived at `/tmp/issue56-closure/{yoshi,magneton}-summary.txt`
(scratch, not committed — reproducible verbatim from the commands above).
Per-frame PNG diffs for the two headline frames (444, 437) were additionally
sampled pixel-by-pixel with a throwaway PIL/numpy script (ad hoc, not
committed, same method `docs/issue56-residual-probe.md` Q1 used).

## 3. Class mapping — YOSHI (`factory-arbitrary-intro-yoshi-off`), 700/751, 51 red frames

| Class | Frames | Count | bbox pattern(s) | px range |
| --- | --- | --- | --- | --- |
| (a) settled display-tail (#5/#61 sub-tick class) | 444 | 1 | `0,40-167,43` | 18px |
| (b) idle-menu-bounce / ready-lag family (closed no-app-bug 2026-07-31, `432e16aa`) | 678,679,680,681,682,683,685,689–694,698–703,707–712,716–721,725–730,734–739,743,744–748,749 | 50 | `9,113-238,158` / `9,74-238,158` (transition-boundary edge, 678–683); `127,74-229,110` (region B, healthbox); `46,73-97,111` (region A, battler); `46,73-229,111` (749, union of A+B) | 556–7762px |

**Sum check: 1 + 50 = 51 = total red frames. No remainder.**

Evidence for (a): pixel sample at frame 444 (post-`1aa13ebb`) shows exactly
18 differing pixels spanning `y=40..43`, `x∈{0,1,2}∪{158..167}` — the same
status-summary bar/icon exit-column signature
`docs/issue56-display-latch-event-design.md` names as the parked #5/#61
display-tail (its own verdict: "the source destroys the summary bar and
every icon inside ONE foreground callback... the only way the emulator-
visible boundary can contain [a] split is for VBlank to interpose inside
that callback — a CPU/VBlank phase fact"). `docs/issue56-residual-probe.md`'s
own Q1 RAM follow-up independently confirms these are **not** particle
pixels (201 of the pre-fix 219px were particle footprint; 18 were not) and
names them "the known separate display-tail area."

Evidence for (b): every bbox above is one of the two fixed regions
`docs/issue56-residual-probe.md` Q2 RAM-derived and pinned exactly against
real hardware (`gSprites[6].y2` for the battler / `gSprites[0,62,63].y2` for
the healthbox, tick-exact fit for 158/166 and 135/144 sampled frames) plus
the command-ready transition-boundary frames the same doc's Q2 follow-up
(`432e16aa`) independently located at "app-relative 678-685" via a direct
instrument (`tests/issue56ActionMenuHandoffFrame.test.ts`). No bbox in this
window falls outside those two named shapes.

## 4. Class mapping — MAGNETON (`factory-arbitrary-intro-magneton-off`), 702/751, 49 red frames

| Class | Frames | Count | bbox pattern(s) | px range |
| --- | --- | --- | --- | --- |
| (c) **UNCLASSIFIED — new regression, headline finding** | 437 | 1 | `163,40-196,85` | 201px |
| (b) idle-menu-bounce / ready-lag family | 689–694,697,700–706,709–715,718–724,727–733,736–742,745–750 | 48 | `9,113-238,158` / `9,74-238,158` (transition-boundary edge, 689–694); `127,74-229,110` (region B); `41,64-102,111` (region A, MAGNETON's own coords — shifted from YOSHI's by a constant, as `docs/issue56-residual-probe.md` Q2 already recorded) | 800–7766px |

**Sum check: 1 + 48 = 49 = total red frames. No remainder.** The 48-frame
class-(b) tail also matches ISSUES #56 item 3's own count ("Remaining
MAGNETON tail (~48 frames) is a pre-existing species-independent periodic
idle-menu bounce family").

Frame 437 is MAGNETON's positional analogue of YOSHI's frame 444 (both are
the opponent affine-emerge materialize tick, `rawElapsed=31`), but its bbox
(`163,40-196,85`, 201px) does **not** match class (a)'s signature
(`0,40-167,43`, 18px, bar/icon exit columns) — it matches the *old,
pre-`1aa13ebb`* YOSHI materialize-column/particle-stall shape instead
(`0,40-196,85`, 219px, per `docs/issue56-residual-probe.md`'s Q1 RAM
follow-up). This is the headline finding.

## 5. Headline finding: MAGNETON frame 437 is a new, uncaught regression

**What changed pixel-wise.** Sampling `app-00437.png` vs `oracle-00437.png`
at the diff region:

```
(177,40): app=(255,181,247) oracle=(255,173,0)
(176,41): app=(247,247,255) oracle=(255,173,0)
(178,41): app=(255,181,247) oracle=(255,255,255)
(175,42): app=(255,181,247) oracle=(255,173,0)
```

`(255,181,247)` is the exact ball-open particle pink already identified in
`docs/issue56-residual-probe.md` Q1 for YOSHI's old (pre-fix) frame-444
defect. The app is drawing particle pixels the oracle does not want yet at
this tick (oracle instead shows either background white or the opponent's
own emerging body color `(255,173,0)`) — i.e. the app's particle overlay is
running one tick **ahead** of where MAGNETON's own oracle capture wants it,
the mirror image of what `1aa13ebb` fixed for YOSHI.

**Root cause (code-cited, high confidence, not RAM-confirmed this step).**
`renderGeneratedBattleStartOpponentRelease` (`src/engine/battleScene.ts:4391-4397`):

```ts
drawBallOpenParticles(fb, t, handoffTick, "destin", {
  // The canonical anchor's real pre-battle route retains its proven later
  // stall publication; arbitrary generated Scene-OFF releases use the
  // RAM-attributed logical-13 stall directly (ISSUES #56 frame 444).
  stallLag: state.isCanonicalAnchorIntro ? 1 : 0,
  persistentTieWinner14: true,
});
```

`isCanonicalAnchorIntro` (`src/engine/factoryRoundBattleOrchestrator.ts:555-556`)
is `state.config.adoptedInitialOpponent !== undefined && command.battleIndex
=== 0` — true only for the interactive draft anchor's own Battle 1. Both the
YOSHI and MAGNETON fixtures are `factoryLegal`/`generateFactoryOpponent`
constructions with no adopted opponent, so **both get `stallLag: 0`** — the
same value. But `docs/issue56-frames-444-536-oam-probe.md` Round 2 Part A
(2026-07-31, main lane) already ran this exact experiment on the sibling
`opponentSummaryExitElapsed` special case and found, in its own words:
"MAGNETON is not the canonical-anchor route, so it gets the same
(RAM-confirmed-for-YOSHI) stall formula as YOSHI — and MAGNETON's own oracle
pixels want the **opposite** behavior at that tick" (`pre-fix diff count at
437: 0`, broken to a nonzero diff by removing/narrowing the special case for
non-canonical routes). `1aa13ebb` applies that identical shape of change
(collapse a per-route special case to `isCanonicalAnchorIntro`) to the
**particle stallLag** call site instead of the summary-exit-elapsed one, and
its landing record (`PROGRESS.md` entry 855, `docs: close issue 56 particle
lead` / `103b0abe`) verifies only YOSHI (700/751) and the two canonical/
generated insurance fixtures (715/715, and implicitly 128/128) — it does
**not** mention MAGNETON at all, despite Round 2 having already named this
exact risk for this exact discriminator one week/commit earlier in the
project's own timeline.

**Confidence.** High but not RAM-confirmed: the pixel signature, bbox
overlap with the historical particle-stall shape, the single-ternary code
site, and the exact-match arithmetic (703 → 702 is precisely +1 red frame,
and the surviving 48-frame tail is exactly the already-known idle-bounce
family size) all point at the same mechanism. This audit did not re-run a
RAM probe or a before/after bisection of `1aa13ebb` to convert this from
PLAUSIBLE to CONFIRMED — that is next-step work, not evidence-only audit
work, and is explicitly out of scope for this step (no production changes;
new files only).

**Not fixed.** Per this step's brief, this is named, not chased. The
concrete next step for whoever picks this up: extend
`tools/probe/dump-issue56-yoshi-materialize-oam.py` (or a MAGNETON-scoped
sibling) to RAM-probe MAGNETON's own `gSprites` around absolute frame
1615 (`437 + preCheckpointFrameOffset(1178)`), confirm the particle age
predicted by `stallLag=1` matches, and — if confirmed — replace the
`isCanonicalAnchorIntro` discriminator on this call site with whatever real
per-fixture fact actually separates COMBUSKEN (wants 0) from MAGNETON
(wants 1), the same open discriminator problem ISSUES #56 item 2's own
design doc already parked for the sibling display-tail mechanism.

## 6. Recommendation

**Keep #56 open — do not reclassify as settled.** The entry's three
numbered items are individually resolved/settled as documented, and YOSHI's
full 751-frame window is airtight (every red frame maps to one of the two
named settled classes, sum-checked with no remainder). But the entry's own
premise — "finish the window honestly" — requires *both* public dense
comparisons to hold, and MAGNETON currently does not: a real, uncaught
one-frame regression (703 → 702, frame 437) exists on master right now,
most likely introduced by `1aa13ebb` reusing a discriminator
(`isCanonicalAnchorIntro`) that a prior round of this same investigation had
already proven insufficient for this species pair. Reclassifying now would
close the books on a window that has silently gotten worse since the last
audit. Once a future step either (a) fixes the regression and both
fixtures re-verify at 700/751 and 703/751 (or better) with every frame still
mapping to the two named classes, or (b) determines with RAM evidence that
702/751 is itself now the correct, honest baseline and updates the recorded
pin accordingly, this entry becomes a clean candidate for settled-record
closure.
