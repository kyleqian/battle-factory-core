# Turn-4 fold: FIGHT-submenu PP/chrome freshness design

Scope: design only, resuming `salvage/slice9-fold-20260802` (`a6d88eaa`) per
PROGRESS.md 866/867. This does not touch `src/` or `tests/` — it is the
handoff for the implementation worker who resumes that branch.

## 0. What the eviction-class fix already closed, and what it did not

`a6d88eaa`'s commit message and PROGRESS 866 both describe two *different*
bugs. Reading the diff (`git diff master salvage/slice9-fold-20260802 --
src/engine/battleScene.ts`) confirms exactly which one is fixed:

- **Fixed:** `drawActionMenuIdleContent`'s player-HP overlay fallback (two
  call sites in `drawActionMenuIdleWindow`) and two `if`/`else-if` HP-overlay
  chains in `drawFightSubmenuWindow` (the `confirmWaitBounceTick` and
  `idleWaitBounceTick` sections) now check
  `isTurn4NextCommandHandoffReady(currentTurn4Handoff)` before falling back
  to turn3/turn2. This is HP-only; none of these four sites read `.playerPp`.
- **Not fixed (this doc's job):** `drawFightSubmenuChromeFromCurrentOwner`
  (`battleScene.ts:8215` salvage) dispatches on
  `isLatestCompletedCommandHandoffReady(latest)` alone
  (`nextCommandHandoff.ts:170-175`) — true the instant *any* generic content
  is installed, regardless of whose turn it is. Once turn 4's reset installs
  its own content into `latestCompletedCommandHandoff`, the chrome path
  (`drawFightSubmenuChromeFromLatest` → `currentPPForActiveMonFromLatest` →
  `projectLatestCompletedCommandPp`, `battleMenu.ts:2699-2722` /
  `nextCommandHandoff.ts:220-232`) reads `latest.playerPp` — turn 4's fresh
  PP — immediately.

The "four audited call sites" named in the brief
(`turn4CommandHandoff !== null`, pre-fold `battleScene.ts:7859/7887/7952/7997`,
all inside `drawFightSubmenuWindow`) are a **third, separate** thing from
both of the above. They gate turn 4's own kickoff-text/bounce-tick dispatch
(narrowed from turn-3 *content*, never PP). §3 below traces each one.

## 1. Root cause, precisely

Confirmed via `git show salvage/slice9-fold-20260802:src/engine/core.ts`:

```
if (
  turn4FightCommandPresentationFromLatest(latestCompletedCommandHandoff) === null
  && isTurn3LatestCompletedCommandLifecycleActive(latestCompletedCommandHandoff, fightSubmenu.openElapsed)
  && isTurn4ChooseActionBounceReset(fightSubmenu.confirmElapsed, battleScene.elapsed + 1)
) {
  latestCompletedCommandHandoff = resolveTurn4LatestCompletedCommandHandoff(battleScene.elapsed + 1);
}
```

(`core.ts` ~1276-1290, salvage). This is turn 4's own reset (5351). It
replaces the *whole* `LatestCompletedCommandHandoff` — `content` (HP, bounce,
kickoff, `presentationEpoch`) **and** the top-level `playerPp`/
`persistedMoveSlot` — in one write, from `resolveTurn4LatestCompletedCommandHandoff`
(`turn4ResolutionAdapter.ts:189-201`), which sources `playerPp` from its own
`resolveTurn4CompletedResolutionNextCommandHandoff` (turn 4's *own* fresh PP,
`turn4ResolutionAdapter.ts:87-91`: `rockSlide - 3`, etc.).

Legacy/parent timing differs because on master `1c61cfac`, turn 4 is *not*
yet folded: its own reset only wrote a **separate positional field**
(`turn4NextCommandHandoff` in `core.ts`/`battleScene.ts` state, now deleted by
this fold). `latestCompletedCommandHandoff` on the parent keeps turn 3's
content/PP the entire time turn 4's positional field is what's live, and only
gets replaced wholesale when `createCanonicalCompletedCommandChain()`
installs (`core.ts:335`, called at `core.ts` ~1438-1460 in salvage, condition
unchanged by this fold):

```
} else if (
  isTurn4LatestCompletedCommandLifecycleActive(latestCompletedCommandHandoff, fightSubmenu.openElapsed)
  && (latestCompletedCommandHandoff === null
      || latestCompletedCommandPresentationEpoch(latestCompletedCommandHandoff) !== null)
  && fightSubmenu.confirmElapsed !== null
  && newKeys.has("A")
  && sceneT >= SCENE_TICK0 + fightSubmenu.confirmElapsed + TURN5_SITRUS_MENU_REOPEN_GATE_DELAY
) {
  latestCompletedCommandHandoff = createCanonicalCompletedCommandChain();
  ...
```

`isTurn4LatestCompletedCommandLifecycleActive` requires turn 4's content to
already be installed *and* `fightSubmenu.openElapsed` to postdate its epoch —
i.e. this branch only fires once we're inside a FIGHT session **opened after
turn 4's reset**, so `fightSubmenu.confirmElapsed` here is turn 5's own
confirm, and the `newKeys.has("A")` this branch waits for is the A that
reopens FIGHT for **turn 6**, gated by `TURN5_SITRUS_MENU_REOPEN_GATE_DELAY`
(long enough to span turn 5's whole ENDEAVOR/ROCK_SLIDE/faint/switch/Sitrus
resolution). `createCanonicalCompletedCommandChain()` installs
`resolveTurn5LatestCompletedCommandHandoff()` as the new head
(`turn5ResolutionAdapter.ts:485-492`), whose `playerPp` is turn 5's own
aftermath (`rockSlide - 4`, `turn5ResolutionAdapter.ts:399`) — correct for
turn 6's chrome.

**The FIGHT-submenu chrome is only ever visually reachable between turn 5's
reopen (5926-5927) and turn 5's own confirm (5958-5959)** — before 5926 the
screen shows the idle action menu (no FIGHT chrome), and after turn 5
confirms the screen shows kickoff/attack text until turn 6's reopen replaces
`latestCompletedCommandHandoff` wholesale. That is exactly why only two
windows are red (`turn5-action-off` 6/32, `turn5-confirm-off-a` 121/132) and
nothing between or after: chrome is simply not on screen the rest of the
time, so a stale-vs-fresh mismatch there is unobservable.

This also means **no new promotion event needs to be built.** The existing
`createCanonicalCompletedCommandChain()` install already does a full
(content + PP) replacement at exactly the right edge (turn 6's reopen). The
only thing wrong is that the *turn 3→4* write additionally advances `playerPp`
one step too early. If that one write stops touching `playerPp`, the already-
correct turn 5→6 write naturally supplies the "un-pinning."

## 2. Two candidate shapes, and why one is dead on arrival

**(i) Frozen snapshot into an existing owner**, mirroring
`turn3SettledWindowActive` (`battleScene.ts:7852-7858` salvage, "the current
handoff... an eviction-class trap slice 8 already hit") plus `2af7ebe4`'s
"keep the freshest ready HP" pattern. Concretely this would mean: at the
moment turn 4's settled window is entered, freeze turn 3's PP into some
already-existing state owner (`resolutionOwner`, `BattleSceneResolutionOwner`)
and have the chrome read that instead of `latest.playerPp` while
`turn4SettledWindowActive`.

This is **not viable as literally stated**, because the "existing owner" it
would read from doesn't exist anymore. Verified directly:
`git show salvage/slice9-fold-20260802:src/engine/battleScene.ts` — the
`BattleSceneState` interface (search `export interface BattleSceneState`) no
longer declares *any* `turnNNextCommandHandoff` field (turns 1-3 were already
cut in slices 6-8; this fold cuts turn 4's). The positional
`turn1NextCommandHandoff`...`turn4NextCommandHandoff` parameters threaded
into `drawFightSubmenuWindow`/`drawActionMenuIdleWindow` are always literally
`null` at the real call site (`renderBattleScene`, salvage diff:
`- state.turn4NextCommandHandoff ?? null` / `+ null`) — the comment directly
above `turn4CompatibilityHandoff` (`battleScene.ts:7386-7389` salvage) says
so explicitly: *"Slice 9 keeps the positional parameter only as a
direct-renderer test ABI. Live state derives this view from turn 4's generic
content."* So turn 3's PP is not recoverable from any positional fallback in
production — that data is genuinely gone once `latestCompletedCommandHandoff`
is overwritten. The only remaining stateful, non-generic-slot owner is
`resolutionOwner` (`BattleSceneResolutionOwner`); giving it a new
always-turn-4-relevant property to carry a transitional PP snapshot would
either be conditionally-populated (prohibited) or couple an unrelated
long-lived type to a one-boundary migration concern. Rejected.

**(ii) The shared slot serves two freshness views, promoted at the confirm
boundary — but applied only to the two fields that actually need it.**

Grepping every consumer of `.playerPp`
(`grep -rn "\.playerPp\b" src/engine/*.ts`, excluding tests) shows it is read
**only** by the chrome/PP-projection family: `battleMenu.ts`'s
`currentPPForActiveMon`/`currentPPForActiveMonFromLatest`,
`nextCommandHandoff.ts`'s `projectLatestCompletedCommandPp`, and each
`turnNResolutionAdapter.ts`'s own compat-forwarding functions (which just
copy `latest.playerPp` through, still PP-only). **Nothing HP-, dispatch-, or
lifecycle-related ever reads `.playerPp`** — HP comes from `.content.field.*.hp`,
and every `isTurnNLatestCompletedCommandLifecycleActive`/
`turnNFightCommandPresentationFromLatest` predicate keys off `.content` and
`.presentationEpoch`, never PP. So `LatestCompletedCommandHandoff` already
cleanly separates into two independently-updatable pieces: `content` (wants
turn 4's reactive freshness — already correct, already verified for
opponent-HP and `turn4SettledWindowActive`) and `playerPp`/
`persistedMoveSlot` (wants turn 3's staleness, held until the *existing*
turn 5→6 promotion).

This is candidate (ii) from the brief, but scoped to the two fields that are
provably chrome-only, rather than duplicating the whole handoff into a
`{current, displayed}` pair. It reuses a promotion mechanism that already
exists and is already correct (`createCanonicalCompletedCommandChain()`),
rather than inventing a new one. **This is the chosen design.**

**Rationale, one paragraph:** turns 5-13 already solve exactly this class of
problem — `NextCommandReopenGuard`/`consumeNextCommandReopenGuard`
(`nextCommandHandoff.ts:43-58,131-167`) defers a successor's installation
until a real, explicit confirm-relative A-press, which is precisely "one
generation behind until an explicit promotion event." Turns 1-4 use a
different, reactive-install pattern (write immediately when the source reset
fires) because their content genuinely does need instant HP freshness
(slice 8's turn-3 fold *deliberately accepted* immediate fresh PP as
oracle-correct for the turn2→3 boundary — PROGRESS 867 — so eager-write is
not itself wrong). Turn 4→5 is the first boundary where both needs coexist on
one write, and the codebase already contains a working example of exactly
the "defer PP until confirm-boundary" behavior we need — the turn 5→6 install
sitting immediately downstream. Splitting `playerPp` out to ride that
existing edge is smaller and safer than inventing a second mechanism, and it
requires no new state field, no turn-number selector, and no conditional
spread: `resolveTurn4LatestCompletedCommandHandoff` simply stops sourcing
`playerPp`/`persistedMoveSlot` from its own turn-4 receipt and instead copies
forward the value it's about to replace.

## 3. Exact touch list

For the chosen design, in implementation order:

1. **`src/engine/turn4ResolutionAdapter.ts`** — change
   `resolveTurn4LatestCompletedCommandHandoff` (currently
   `(presentationEpochElapsed: number): LatestCompletedCommandHandoff`,
   lines 189-201) to also take the handoff it is about to replace, e.g.
   `(presentationEpochElapsed: number, priorLatest: LatestCompletedCommandHandoff): LatestCompletedCommandHandoff`,
   and build its return value with
   `playerPp: priorLatest.playerPp, persistedMoveSlot: priorLatest.persistedMoveSlot`
   instead of `handoff.playerPp`/`handoff.persistedMoveSlot`. Leave
   `resolveTurn4CompletedResolutionNextCommandHandoff` (lines 79-104, the
   positional/test-ABI receipt) and `resolveTurn4FightCommandPresentation`
   (lines 112-187, `content`) **untouched** — they still need turn 4's own
   true fresh PP/content; only the generic wrapper's top-level PP/slot pins.
2. **`src/engine/core.ts`** — at the one call site (~1276-1290 salvage,
   `latestCompletedCommandHandoff = resolveTurn4LatestCompletedCommandHandoff(battleScene.elapsed + 1)`),
   pass `latestCompletedCommandHandoff` as the second argument. It still
   holds turn 3's value at the point the right-hand side evaluates (plain JS
   assignment-order), so no extra local variable is needed. No other call
   site calls this function.
3. **`tests/turn4ResolutionAdapterEquivalence.test.ts`** (or wherever
   `resolveTurn4LatestCompletedCommandHandoff` is unit-tested directly) — add
   a case: given a synthetic prior `LatestCompletedCommandHandoff` with
   turn-3's canonical `playerPp`/`persistedMoveSlot`, assert the returned
   handoff's `playerPp`/`persistedMoveSlot` equal the *prior*'s, while
   `.content.field.player.hp.current` is turn 4's fresh 88 (unaffected).
4. **`tests/battleScene.test.ts`** / **`tests/fightSubmenu.test.ts`** — grep
   for any direct-call fixture that exercises
   `drawFightSubmenuChromeFromCurrentOwner`/`drawFightSubmenuWindow` across
   the turn-4-settled → turn-5-reopen boundary and currently hard-codes
   turn 4's fresh PP tuple (`[7, 20, 19, 10]`-shaped) as expected chrome
   output during that window; update the expectation to turn 3's tuple
   (`[8, 20, 19, 10]`-shaped) until the turn-6 reopen. Do not change any
   fixture past turn 6's reopen — `createCanonicalCompletedCommandChain()`
   is untouched.
5. Nothing else. `nextCommandHandoff.ts`, `battleMenu.ts`,
   `turn5ResolutionAdapter.ts` through `turn13ResolutionAdapter.ts`, and
   every other call site of `resolveTurnNLatestCompletedCommandHandoff` are
   unaffected — verify this by grepping for
   `resolveTurn4LatestCompletedCommandHandoff` after the change and
   confirming exactly one call site.

## 4. The four audited call sites

All four are in `drawFightSubmenuWindow` (pre-fold `battleScene.ts:7859`/
`7887`/`7952`/`7997`; salvage `7928`/`7956`/`8024`/`8070`), all read the
local `turn4CommandHandoff` (narrowed from turn-3 *content* — a completely
different local than the top-level `playerPp` this doc's fix touches):

1. **`7928` (salvage) `inTurn4DoubleTeamWindow`** — selects between
   `turn2KickoffTextStartTick`/`turnKickoffTextStartTick` for `textStart`,
   only evaluated while `sm.confirmElapsed !== null` and only *matters*
   before `t >= textStart`. That threshold is reached (and the branch below
   it returns) well before turn 4's own reset (5351) can evict
   `turn4CommandHandoff` — it's a same-turn confirm-to-reveal gap, not a
   cross-turn one. **No guard needed; not reachable post-eviction.**
2. **`7956` (salvage) `if (turn4CommandHandoff !== null || turn4SettledWindowActive)`**
   dispatching to `drawTurn4KickoffText` — **already guarded**, landed in
   `a6d88eaa`. `drawTurn4KickoffText` internally self-dispatches to
   `drawTurn4RockSlideWindow` for `t` past the stats-banner window
   (`turn4ResolutionAdapter`-independent; the positional `turn4NextCommandHandoff`
   parameter it also takes is the dead test-ABI one, always `null` in
   production, per §2). This is the site the eviction fix actually needed to
   touch, because `sm.confirmElapsed` for turn 4's own press stays set
   through the *entire* remainder of turn 4's window, so this check keeps
   re-evaluating across the reset.
3. **`8024` (salvage) `confirmWaitBounceTick` ternary** — only reached when
   `t < textStart` (i.e. before site 2's block returns), same reasoning as
   site 1: exercised only in the brief pre-reveal window for whichever
   turn's confirm is live, never spans the 5351 reset. **No guard needed.**
4. **`8070` (salvage) `idleWaitBounceTick` ternary** — reached only when the
   whole `if (sm.confirmElapsed !== null) {...}` block above it does *not*
   return, which (given site 2 always returns once `turn4SettledWindowActive`
   holds) means this code runs only when `sm.confirmElapsed === null` — a
   genuinely different submenu session (e.g. turn 5's own reopen, where
   `turn5CommandHandoff` is already correctly non-null and short-circuits the
   ternary before the `turn4CommandHandoff` branch is reached). **No guard
   needed.**

None of these four sites reads `.playerPp`, so the chosen design (§3) leaves
all four exactly as they are on `a6d88eaa` today. The implementation worker
should still re-run the full differential (§5) as the actual proof, not take
this reachability argument on faith.

## 5. Acceptance

Full 14-window differential vs `105c72d5` (`npm run compare:differential --
<traces...> --base 105c72d5 --summary`), all windows expected
byte-identical after the fix (sum 2,436):

| Window | Expected/total |
| --- | --- |
| turn3-endeavor-off | 255/255 |
| turn3-rockslide-off | 161/161 |
| turn4-doubleteam-off | 256/256 |
| turn4-rockslide-off | 256/256 |
| turn5-reset-off | 256/256 |
| **turn5-action-off** | **32/32** (was 6/32) |
| **turn5-confirm-off-a** | **132/132** (was 121/132) |
| turn5-confirm-off-b | 132/132 |
| turn5-resolve-off-a | 196/196 |
| turn5-resolve-off-b | 196/196 |
| turn5-resolve-off-c | 196/196 |
| turn5-resolve-off-d | 196/196 |
| turn6-reopen-off | 46/46 |
| battle-command-generated-off | 128/128 |

The 12 already-clean windows must **stay** clean — none of them touch
`latest.playerPp` at the turn-4 boundary (turn5-reset-off/resolve-off/
turn6-reopen-off exercise HP, resolution animation, and the *already-correct*
turn5→6 promotion respectively; none render FIGHT chrome mid-turn-4).

Census (`bash tools/census-next-command-handoffs.sh`, currently on master:
`BattleSceneState handoff fields: 1`, `initial-state handoff entries: 1`,
`advance-copy handoff entries: 1`, `completed-handoff type declarations: 13`,
`drawFightSubmenuWindow handoff parameters: 13`,
`currentPPForActiveMon handoff parameters: 13`) must read, on the landed
salvage branch: state/initial/advance-copy entries **0/0/0** (turn 4's field
already cut in `a6d88eaa`, unaffected by this design), declarations and both
parameter counts **unchanged at 13** (staged ABI, deferred to slice 10 per
`docs/next-command-handoff-dispatcher-design.md` row 10). This design does
not change either parameter count or the declaration count — it only changes
one adapter function's own parameter list, which the census script does not
track.

## 6. Risks

1. **Bounce composition.** This fix touches only `playerPp`/
   `persistedMoveSlot` values, never any bounce-tick formula or epoch. The
   already-fixed HP-overlay chains and the four §4 sites are untouched.
   Probe: `compare:differential turn5-action-off turn5-confirm-off-a --base
   105c72d5` in isolation before the full 14-window run — if pixels outside
   the PP-text glyph region move, the change touched more than intended.
2. **The one-tick split at 5926→5927.** `turn1-4-epoch-prep.md` trap 2
   ("handler-installed is not input-ready") warns every boundary has a
   one-tick publish/consume split. This fix doesn't change *when*
   `latestCompletedCommandHandoff` is written at the turn-4 reset (still
   `battleScene.elapsed + 1` at the same `isTurn4ChooseActionBounceReset`
   gate) — only *what* two of its fields carry. Probe: `turn5-action-off`'s
   dense per-tick capture around 5926/5927 specifically (not just the
   window's summary count) — confirm no new one-tick PP flicker is
   introduced at the reopen edge itself.
3. **B-close/A-reopen within turn 4's own settled window.** If the player
   closes and reopens FIGHT before turn 5's own confirm, the pinned
   `playerPp` must still read turn 3's value on every reopen (it will,
   since nothing in this design re-derives PP from `sm.openElapsed` or any
   per-open state — it's a single stored value that doesn't change until the
   turn5→6 promotion). No committed trace currently exercises a same-turn
   B/A cycle inside turn 4's settled window specifically for chrome PP;
   flag this as an acceptance gap if the implementation worker has time to
   bank one, but it is not required to close the two red windows named
   above.
4. **Oracle-direction inconsistency, not a landing blocker.** Slice 8
   (turn 2→3) *accepted* immediate fresh PP as oracle-correct
   (PROGRESS 867's "37-frame turn4-doubleteam deviation FIXES a PP bug").
   This design instead matches the (possibly also-buggy) parent byte-for-byte
   at turn 4→5, per this fold's own settled scope ("byte-identity to the
   clean parent, nothing else" — PROGRESS 866). It is plausible a real
   oracle probe of turn 5's own reopen-hold window would show fresh PP is
   *also* correct there, matching turn 2→3's precedent instead of the
   parent's. That direction question is explicitly out of scope for this
   session (per the same brief that scoped `a6d88eaa`); the specific probe
   that would resolve it is an oracle capture of `turn5-action-off`'s PP
   glyph region against real hardware, analogous to whatever settled slice
   8's turn2→3 case.
