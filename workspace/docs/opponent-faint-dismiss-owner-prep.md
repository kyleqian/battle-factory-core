# Opponent-faint dismiss owner prep

Evidence checkpoint for ISSUES #39's `opponentFaintDismissElapsed`
retirement only. This document does not implement the retirement. Static
citations describe commit `5b46d038`; dynamic evidence is Battle Scene OFF
and was already banked by `docs/turn13-off-ground-truth.md`. No new probe was
needed for this bounded prep.

## 1. Reproducible consumer census

Run these commands verbatim from the run root:

```sh
rg -n --no-heading '\bopponentFaintDismissElapsed\b' src tests
rg -o --no-heading '\bopponentFaintDismissElapsed\b' src tests | wc -l
rg -o --no-heading '\bopponentFaintDismissElapsed\b' src tests | cut -d: -f1 | sort | uniq -c
for root in src tests; do
  printf '%s=' "$root"
  rg -o --no-heading '\bopponentFaintDismissElapsed\b' "$root" | wc -l | tr -d ' '
done

rg -n --no-heading '\b(opponentFaintDismissElapsed|opponentFaintDismissTick|koDismissTick|cursorT)\b' src/engine tests
rg -o --no-heading '\b(opponentFaintDismissElapsed|opponentFaintDismissTick|koDismissTick|cursorT)\b' src/engine tests | wc -l
for token in opponentFaintDismissElapsed opponentFaintDismissTick koDismissTick cursorT; do
  printf '%s=' "$token"
  rg -o "\\b${token}\\b" src/engine tests | wc -l | tr -d ' '
done
```

The exact field census is **48 occurrences**: **10 production** and **38
test** occurrences. Per file:

| File | Exact-token occurrences |
| --- | ---: |
| `src/engine/battleScene.ts` | 8 |
| `src/engine/core.ts` | 2 |
| `tests/battleScene.test.ts` | 24 |
| `tests/battleMenu.test.ts` | 5 |
| `tests/battleMenuIdle.test.ts` | 1 |
| `tests/battleSetup.test.ts` | 2 |
| `tests/fightSubmenu.test.ts` | 6 |

The alias/threading census is **66 occurrences**:
`opponentFaintDismissElapsed=48`, `opponentFaintDismissTick=2`,
`koDismissTick=14`, and `cursorT=2`. This second grep deliberately includes
comments and fixtures; its purpose is to keep the downstream render clock
from disappearing from view when the flat field is renamed.

### Production reads and writes

| Site | Role | Required migration |
| --- | --- | --- |
| `battleScene.ts:2525-2533` | State declaration. The comment already says this is a presentation-relative edge; `:2531` is the field. | Replace with one typed opponent-faint presentation owner, not another flat elapsed field. |
| `battleScene.ts:2550-2567` | Initial-state write; `:2566` writes `null`. | Initialize the owner/receipt in its pre-dismiss phase. |
| `battleScene.ts:2573-2602` | Persistence read + write; `:2596` contains both exact-token occurrences. | Advance/copy the owner as one state value. The stored dismiss edge remains immutable after acceptance. |
| `core.ts:922-932` | **Producer edge.** `:928` is the one-shot null read; `:929` requires a fresh `newKeys` A; `:930` checks eligibility in the next-tick coordinate; `:932` writes `battleScene.elapsed + 1`. | A store helper on the typed owner accepts the fresh A exactly once and publishes the edge plus its continuation. |
| `battleScene.ts:17137-17157` | **Render dismiss clock.** `:17154` reads the field twice, converts the relative elapsed to `TICK0 + elapsed`, and passes the absolute tick into the turn-13 dispatcher. | Pass the typed owner. Do not reconstruct a second loose clock at the top-level renderer. |
| `battleScene.ts:7435,7490` | Render parameter and turn-13 dispatch threading (`opponentFaintDismissTick`). | Thread the owner/typed dismiss receipt. |
| `battleScene.ts:13650-13692` | FIGHT -> SAND_ATTACK threading (`koDismissTick` at `:13660,13690`). | Thread the owner, or a view derived from it, without copying the elapsed. |
| `battleScene.ts:13970-13984` | SAND_ATTACK -> DRAGON_BREATH threading (`:13974,13982`). | Same migration. |
| `battleScene.ts:14068-14084` | DRAGON_BREATH -> faint threading (`:14072,14082`). | Same migration. |
| `battleScene.ts:14196-14227` | The two live render consumers. `:14224-14227` clamps `cursorState` to the real accepted edge (**cursor-freeze consumer**). `:14205-14213` enters `drawTurn13SwitchinWindow` from that same non-null edge (**switch-in continuation driver**). | Both reads must come from the same typed dismiss receipt. Presence/eligibility time is not a replacement for the accepted edge. |
| `battleScene.ts:10852-10899` | The continuation consumes the same edge again: `:10868-10883` retains the frozen faint cursor through icon-bar/species work. | Read the owner's frozen cursor edge; do not create a switch-in-local copy. |
| `battleScene.ts:14141,14177` | Comment-only exact-token occurrences included in the count. | Update/delete with the old field so the census reaches zero honestly. |

The continuation is not currently edge-relative all the way down. Its icon
bar anchors are absolute at `battleScene.ts:10182-10184`; ball/materialize
and Murkrow anchors are absolute at `:10566-10608`; sent-out text is absolute
at `:10753-10764`; and text-clear/menu-redraw are absolute at
`:10835-10850`. The flat edge gates entry and freezes the cursor, but a +30
press cannot be modeled correctly merely by nesting that number in an
object. The whole attached continuation must derive its local elapsed from
the accepted edge.

### Test reads and fixtures

The following line list accounts for all **38** test occurrences:

| File:line | Classification |
| --- | --- |
| `tests/battleScene.test.ts:154,162,181,224,232,1041,1066,1070,1102,1106,1462,1566` | General render-state fixtures; all write `null`. |
| `tests/battleScene.test.ts:504` | Initial/advance-state equality fixture; expects `null`. |
| `tests/battleScene.test.ts:2402` | Turn-13-specific fixture initializer; writes `null`. |
| `tests/battleScene.test.ts:2407,2414` | Test-title occurrences, included in the exact count but not executable reads. |
| `tests/battleScene.test.ts:2411` | Idle-path read: eligibility alone must not publish dismissal. |
| `tests/battleScene.test.ts:2420,2423,2425-2426,2428` | Producer-edge reads: null before A, non-null on the accepted edge, then stable. |
| `tests/battleScene.test.ts:2435` | Early-A rejection read. |
| `tests/battleScene.test.ts:2453` | Direct accepted-edge value assertion without a turn-resolution flag. |
| `tests/battleMenu.test.ts:141,193-194,201-202` | Render-state fixtures; all write `null`. |
| `tests/battleMenuIdle.test.ts:89` | Render-state fixture; writes `null`. |
| `tests/battleSetup.test.ts:162,172` | Render-state fixtures; write `null`. |
| `tests/fightSubmenu.test.ts:156,538,661,833,863,954` | Engine/render-state fixtures; write `null`. |

After migration, generic fixtures should use an owner factory or `null`
owner as appropriate. The focused tests at `battleScene.test.ts:2407-2455`
must assert the typed phase/edge/continuation rather than reach through a
compatibility field. The old exact-token grep must return zero in both
production and tests.

### Adjacent owners: what actually owns Murkrow

Three nearby ownership shapes must not be conflated:

1. The current turn-13 adapter owns immutable content. `Turn13ResolutionAdapter`
   carries HP, text, fainted battler, status and sink facts
   (`turn13ResolutionAdapter.ts:112-136`). `Turn13SwitchInAdapter` carries the
   automatic replacement species, party index, level, HP and sent-out line
   (`:149-195`); `battleScene.ts:10713-10754` consumes those facts. The later
   `Turn13CompletedResolutionNextCommandHandoff` owns post-switch
   DRAGON_BREATH PP 18/20, slot 2 and settled/ready next-command facts
   (`turn13ResolutionAdapter.ts:197-245`). None currently stores the variable
   dismiss edge.
2. `PartySelectState` is the player forced-switch selector. It already models
   a relative `elapsed` "since the actual faint-message dismiss edge" and
   retains its immutable `BattleForcedSwitchRequest`
   (`partySelect.ts:56-89`), which is useful structural precedent. Its
   constructor rejects non-player requests (`partySelect.ts:162-170`).
3. Generic `BattleResolutionPresentationState.forcedRequest` is populated only
   for a player-side forced-switch boundary
   (`battleResolutionPresentation.ts:1021-1027`). The request-owned selector
   is attached by `BattleSceneResolutionOwner`
   (`battleSceneResolutionOwner.ts:15-19,42-60`) and the current core path
   (`core.ts:934-951`). Turn 13 is explicitly the opponent trainer's automatic
   PIDGEOTTO -> MURKROW replacement, not a player selection
   (`turn13ResolutionAdapter.ts:54-63`). Therefore neither `PartySelectState`
   nor the player-only `forcedRequest` path co-owns this Murkrow continuation;
   they are sibling precedents and a side-confusion trap.

## 2. Scene-OFF ground truth for the owner

### Typed facts that are pinned

The evidence has two coordinates: trace frames are pre/post-render capture
coordinates, while RAM ticks are post-`advance`. The canonical dismiss
segment begins at trace frame 16820 and first presents A at RAM tick 16821
(`turn13-off-ground-truth.md:14-23`). Production should store one
engine-relative accepted elapsed and perform coordinate conversion at a
single boundary; canonical absolute ticks do not belong in the type.

The exact owner facts are:

- The faint line is fully printed at render 15909. An isolated A at RAM 15909
  is rejected, A at 15910 is accepted, the controller completes at 15912,
  and the first visible settled cursor is render 15911
  (`turn13-off-ground-truth.md:102-125`). Input readiness and visible cursor
  readiness are adjacent but not identical.
- The unshifted/base route (the brief's "immediate" member of the pair, not
  the earliest legal-A route) accepts the fresh A at RAM 16821. The text
  controller completes at 16823, opponent icon-bar command 48 is issued at
  16847, and the first icon bar is visible at 16848
  (`turn13-off-ground-truth.md:127-139`).
- Before that A the cursor is live. The accepted edge freezes framebuffer
  `633ba603de70...` from trace frame 16820 through 16847. Substituting the
  eligibility edge would select the wrong pose (`turn13-off-ground-truth.md:
  135-139`).
- Inserting exactly 30 idle frames moves the first A to RAM 16851 and
  controller completion to 16853. It freezes a different pose
  (`99f977da6802...`) through frame 16877; command 48 and first visible icon
  bar move to 16877/16878 (`turn13-off-ground-truth.md:141-147`).
- Every probed continuation landmark moves by exactly +30: species/HP commit
  16944 -> 16974, sent-out glyph 16947 -> 16977, next action handler
  17084 -> 17114, and full menu 17085 -> 17115. Dismiss-to-command latency is
  26 ticks and dismiss-to-first-visible-icon latency is 27 ticks on both
  routes (`turn13-off-ground-truth.md:149-166`).
- The completed continuation hands off `[0,19,18,10]`, persisted slot 2,
  settled redraw and ready input; the full next action menu is 17085 on the
  base route and 17115 on +30 (`turn13-off-ground-truth.md:168-202`). Those
  are the existing turn-13 next-command handoff's facts, not fields of the
  dismiss edge itself.

The input rule is therefore: only a **fresh A edge** after the staged faint
text controller is input-ready publishes dismissal; idling never does, an
early A is dropped, and later inputs cannot overwrite the first accepted
edge. The current Tier-1 tests express that rule at
`battleScene.test.ts:2407-2455`, while the oracle probe pins the Scene-OFF
controller boundary.

One current production timing must not be mistaken for OFF authority:
`TURN13_DRAGONBREATH_PRESS_TICK=15516` and the legacy cursor delay produce
16001 (`battleScene.ts:14024,14164-14172`), whereas the OFF probe pins the
first accepted A at 15910 and first visible cursor at 15911. The typed owner
should be published by the modeled faint-text controller's ready event, not
by copying either absolute tick into a new object.

### Named gaps; no guesses

The committed evidence does **not** establish:

1. A full switch-in pixel continuation from the earliest legal A at 15910.
   The isolated probe pins acceptance there, not the following pixels.
2. Arbitrary-delay linearity. Only the base route and exactly +30 are probed;
   delays +1 through +29, delays greater than +30, and wraparound across every
   cursor phase are not independently observed.
3. Every delayed-route pixel. The +30 scratch capture ranges are
   16840-16885, 16964-16987 and 17092-17125; they do not cover the intervening
   icon/ball/materialize spans. The RAM watch pins the named semantic
   landmarks, not byte equality for those uncaptured frames.
4. A production TypeScript implementation. The banked files are oracle-only
   scratch output and explicitly change no acceptance surface
   (`turn13-off-ground-truth.md:204-217,249-250`).

These gaps do not require a new probe for this prep: the requested base/+30
retirement acceptance pair and the variable-edge requirement are already
pinned. An implementation that claims arbitrary delay support or changes an
uncaptured continuation span must add targeted evidence rather than infer it
from the +30 pair.

## 3. Typed owner proposal

Follow the immutable/readiness-discriminant pattern in
`turn8ResolutionAdapter.ts:12-22,30-49`, while carrying the extra live
presentation facts this field owns. One suitable shape is:

```ts
type OpponentFaintDismissEdge = Readonly<{
  acceptedElapsed: number; // engine-relative; never a canonical trace tick
  input: "accepted";
  cursor: Readonly<{
    mode: "frozen";
    frozenAtElapsed: number; // exactly acceptedElapsed
  }>;
  continuation: Readonly<{
    kind: "automatic-opponent-switch-in";
    startedAtElapsed: number; // exactly acceptedElapsed
  }>;
}>;

type OpponentFaintPresentationOwner = Readonly<{
  resolution: Turn13ResolutionAdapter;
  switchIn: Turn13SwitchInAdapter;
  faintText: Readonly<{
    redraw: "settled";
    input: "ready";
  }>;
  dismiss: OpponentFaintDismissEdge | null;
}>;
```

The owner exists for the opponent-faint presentation before dismissal. A
pure `storeOpponentFaintDismiss(owner, elapsed)` helper returns an immutable
copy only when `faintText.input === "ready"` and `dismiss === null`; otherwise
it returns the existing owner. It publishes the cursor freeze and automatic
switch-in continuation atomically, so no state can contain a dismiss edge
without its continuation or vice versa.

`faintText` is a controller event, not permission to reconstruct 15910 from a
turn number. `acceptedElapsed` is runtime-relative state. All switch-in
landmarks derive `elapsedSinceDismiss` from it. The existing immutable
resolution/switch facts remain sourced by `turn13ResolutionAdapter.ts`; the
owner composes them rather than duplicating their values.

### Per-consumer migration

| Consumer | Migration |
| --- | --- |
| State declaration/init/copy (`battleScene.ts:2525-2533,2550-2567,2573-2602`) | Store `opponentFaintPresentationOwner`; remove the flat field. |
| Producer (`core.ts:922-932`) | Require a fresh A and the owner's typed input-ready phase, then call the one-shot store helper with `battleScene.elapsed + 1`. |
| Top-level render (`battleScene.ts:17137-17157`) | Pass the owner, not an absolute nullable tick. |
| Dispatcher chain (`battleScene.ts:7435-7490,13650-13692,13970-14084`) | Replace `opponentFaintDismissTick`/`koDismissTick` parameters with the owner or a read-only presentation view. |
| Cursor freeze (`battleScene.ts:14224-14227,10868-10883`) | Use `owner.dismiss.cursor.frozenAtElapsed`, converted once into the renderer's local coordinate. |
| Switch-in continuation (`battleScene.ts:14205-14213`) | Gate on `owner.dismiss.continuation`; derive command/icon/species/text/materialize/menu clocks from `elapsedSinceDismiss`. Rebase the absolute anchor family at `:10182-10850`. |
| Turn-13 facts (`turn13ResolutionAdapter.ts:112-195`) | Retain as the owner's immutable `resolution` and `switchIn`; do not restage or copy literals. |
| Completed turn-13 handoff (`turn13ResolutionAdapter.ts:197-245`; `core.ts:1422-1444`) | Publish only when the owner's attached switch-in continuation reaches its settled/ready boundary. Keep PP/slot/readiness in this later handoff. |
| Tests (`battleScene.test.ts:2407-2455` plus fixture census above) | Assert null dismiss before readiness/A, atomic edge+continuation on accepted A, one-shot stability, cursor-pose selection for two distinct delays, and handoff only after continuation completion. Replace generic fixture fields. |

When complete, delete:

- `BattleSceneState.opponentFaintDismissElapsed`, its initializer and copy;
- the core null-guard/write branch's flat-field form;
- the `state.opponentFaintDismissElapsed` absolute-tick conversion;
- all loose `opponentFaintDismissTick`/`koDismissTick` plumbing;
- tests and comments naming the old field; and
- absolute continuation anchors that only encode the base press, once their
  edge-relative deltas are preserved by the owner.

The exact field grep must be zero, and the alias grep must show no loose
dismiss clock. Retaining a compatibility getter would leave the old ownership
problem in place.

## 4. Retirement acceptance

### Scene-OFF authority

Regenerate the two scratch manifests with the exact fresh-directory recipe at
`turn13-off-ground-truth.md:219-247`:

1. Base `off-turn13-boundaries`: stride-1 ranges **14758-14781,
   15370-15385, 15886-15916, 16818-16850, 16940-16949, 17070-17090,
   17718-17733**, produced by the `jq` recipe at `:236-240`. These total
   **151 captures**.
2. Delayed `off-turn13-delay30`: add exactly 30 frames to segment 105 and
   capture stride-1 ranges **16840-16885, 16964-16987, 17092-17125**, using
   `:242-246`. These total **104 captures**.

The manifest/range ownership is recorded at
`turn13-off-ground-truth.md:51-59`. Do not thin, merge, or substitute legacy
ON timing for either member. The implementation must preserve the different
frozen cursor pose and shift every attached continuation landmark exercised
by this pair by +30.

### Legacy differential insurance

Retain the historical traces and their complete capture lists:

| Trace | Captures | Role |
| --- | ---: | --- |
| `tools/compare/traces/turn13-dragonbreath-faint.json` | **141** | Faint/content and dismiss boundary. |
| `tools/compare/traces/turn13-switchin.json` | **242** | Base Murkrow switch-in continuation. |
| `tools/compare/traces-groundtruth/battle1-turn13-dense-a.json` | **256** | Menu through gated dismiss; do not thin. |
| `tools/compare/traces-groundtruth/battle1-turn13-dense-b.json` | **223** | Gated dismiss overlap through settled Murkrow menu. |

All four omit `oracleProfile`, so they remain legacy Scene-ON insurance under
the repository profile rule. Dense-a's full list is still **256**, but its
historical expected result is **205/256** because 51 captures belong to the
separately parked DRAGON_BREATH projectile sampler residual; the other three
were recorded at 141/141, 242/242 and 223/223
(`battle-scene-retirement-inventory.md:93-101`). Retirement acceptance means
that parked subset is byte-identical to the pre-change app baseline, not that
the worker thins the list or falsely claims 256/256.

## 5. One-field-worker traps

1. **The field is live.** `turn5KoDismissElapsed` was a producer plus its own
   guard and could be deleted as a dead mirror. This field freezes a variable
   cursor pose and drives Murkrow's switch-in (`battleScene.ts:14205-14227,
   10868-10883`). Deleting it before installing the owner changes behavior.
2. **Eligibility is not the accepted edge.** The base route waits hundreds of
   ticks after first eligibility, and +30 freezes a different cursor pose.
   Deriving from text-ready time, adapter presence, or a canonical constant is
   wrong (`turn13-off-ground-truth.md:127-166`).
3. **Nesting the field is insufficient.** The continuation still contains
   absolute anchors (`battleScene.ts:10182-10850`). The delayed pair requires
   the entire attached continuation to use edge-relative elapsed; changing
   only the cursor clamp will fail icon/species/text/menu boundaries.
4. **Do not absorb the later handoff.** The turn-13 completed-resolution
   handoff owns post-switch PP/slot/next-command readiness
   (`turn13ResolutionAdapter.ts:197-245`). It should be emitted by completion
   of this owner, not used as evidence that dismissal already happened.
5. **Do not absorb the terminal owner.** The rank-8/terminal precedent nests
   `faintDismissElapsed`, result and loss dismiss clocks with an immutable
   terminal boundary (`battleResolutionPresentation.ts:167-220`). Turn 13 is
   nonterminal and resumes with Murkrow, so reusing that owner would lie about
   the battle boundary.
6. **Do not route Murkrow through `PartySelectState`.** That state and the
   generic `forcedRequest` continuation are player-only. DESTIN's replacement
   is automatic (`turn13ResolutionAdapter.ts:24-63`; `partySelect.ts:162-170`).
7. **OFF timing is not the current legacy constant.** The banked controller
   accepts at 15910, while the present helper's legacy cursor threshold is
   16001. Publish from a typed controller-ready event; do not add another
   profile/turn/absolute-tick branch.
8. **Keep the slice one-field wide.** Do not batch `turn11Resolved`,
   `turn12Resolved`, the turn-13 next-command handoff, terminal dismiss
   fields, or turns 1-12. Re-anchoring the Murkrow continuation is in scope
   only because it is inseparable from this live dismiss owner's +30
   acceptance. If that rebase cannot land atomically with this field, stop at
   the owner introduction and leave the flat field live; do not delete a
   consumer early.
9. **Do not overclaim the probes.** Intermediate delays and the uncaptured
   delayed pixel spans remain named gaps. Add evidence if implementation work
   touches them.

The safe implementation order is: introduce the immutable owner and focused
tests; publish its faint-text ready phase; move the producer; migrate the
cursor and the complete edge-relative switch-in continuation; make the later
turn-13 handoff consume owner completion; then delete the flat field and run
both OFF scratch members plus all four legacy lists.
