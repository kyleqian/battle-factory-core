# Random-play soak crash catalog — 2026-08-08

Produced by `tools/soak/randomRoundSoak.ts` (seeded random-play driver; see
its header). The driver plays the REAL production path — `createInitialState()`
+ `tick(state, buttons)` from `src/engine/core.ts`, the same pure core
`src/main.ts` runs every browser frame — from the rental draft screen into the
generated round, using only GBA button presses with seed-jittered timing.
`render(state)` is sampled every 8 frames and at every surface change, so
render-side throws surface as they would in the browser.

Reproduce any row with:

```sh
node --experimental-strip-types tools/soak/randomRoundSoak.ts --seed <N> --verbose
```

Runs are deterministic per seed (pinned by `tests/randomRoundSoak.test.ts`).

## 2026-08-09 ability display-name frontier closed — `16ca008d`

Full-policy seeds 22 (battle 2, turn 19) and 19 (battle 3, turn 12) exposed
the same production crash: Role Play reached `STRINGID_PKMNCOPIEDFOE` with
ability ID 14, but `factoryBattleScriptFullTurnDecision.ts` used a private
incomplete display-name table and threw `prepareMessage: no display name
mapped for ability 14`. The replacement generically joins canonical IDs from
`ability-item-hooks.json` to the exact Emerald display strings already
source-extracted in `summary-info.json` (`COMPOUNDEYES` for ID 14). Tier-1
coverage ratchets all 71 legal non-NONE abilities across Level-50 set IDs
110..849 and preserves the fatal guard for IDs absent from the source universe.

After the repair, seed 22 is **OK b2 t32 f39888 roundLost**, seed 19 is **OK
b3 t14 f49602 roundLost**, and a full-policy `--seeds 0:60` sweep is **60 OK /
0 CRASH / 0 HANG**. No independent remaining signature appeared in that
bounded sweep; vanilla `0:20` remains **20 OK / 0 CRASH / 0 HANG**.

## 2026-08-09 differential re-run — signatures 3, 4, 5, 7 closed; 6 closed to a 2-seed sibling

Five fixes landed on this branch (one commit each: a4baf562 sig 3,
b8407083 sig 4, 296d8664 sig 7, 44e72ae9 sig 6, a6da3d6b sig 5), then both
sweeps re-ran identically (`--seeds 0:500`, `--policy vanilla --seeds
0:100`).

| Signature | Before | After |
| --- | --- | --- |
| 1. HP command starts at X, displayed Y (ISSUES #84 family) | 294/500 | 328/500 |
| 2. Handoff battler display mismatch (ISSUES #84 item 5) | 133/500 | 153/500 |
| 3. PKMNSITEMRESTOREDHEALTH no name resolver | 31/500 + vanilla 100/100 | **0** |
| 4. PKMNCANTUSEMOVETAUNT no rejection resolver | 15/500 | **0** |
| 5. Forced send-out lifecycle mismatch | 10/500 | **0** |
| 6. Switch-in message no preceding switch field | 8/500 | **2** (see below) |
| 7. Clamped stat change refused by banner | 4/500 | **0** |
| OK (clean terminal) | 5/500 | **15/500** |
| HANG | 0 | 2 (new frontier, see below) |
| **Vanilla 0:100** | **0 OK / 100 CRASH** | **100 OK / 0 CRASH** |

- **Every vanilla seed now completes battle 1** (100/100; all lose to the
  anchor opponent and exit cleanly through the loss terminal into the
  lobby — the plainest playthrough no longer crashes anywhere).
- **Two full-policy seeds (151, 452) now WIN battle 1** — the first live
  evidence past the win: postwin flows and the rental-swap screen were
  reached via real button presses. Both then stall at the
  `factorySwap:complete` surface for the driver's whole 200k-frame budget
  (reported HANG). Whether that is a missing driver handler for the
  completed-swap surface or an engine gate needs its own bounded
  investigation; the engine did not throw.
- Signatures 1 + 2 (the ISSUES #84 displayed-HP ledger family, owned
  elsewhere) absorbed the survivors: seeds formerly killed early by
  signatures 3-7 now live long enough to hit the ledger drift instead
  (294→328 and 133→153).
- **Signature 6 residual (seeds 135, 178):** the seed-99 voluntary-switch
  shape is fixed, but the same throw site fires on a NARROWER sibling: a
  mid-turn faint-replacement send-out (`BattleScript_FaintedMonSendOutNew`
  blocks projected inside the same resolution segment) emits
  `STRINGID_SWITCHINMON` with **no preceding `switch` receipt at all**
  (`pendingSwitch` empty — distinct from the fixed case, where the switch
  receipt existed but the post-switch field didn't). Needs the
  faint-replacement seam to emit (or the projector to accept) the
  replacement's typed party-index receipt; not attempted here because it
  lives against the fainted-actions kernel seam.

## Headline result

**500 seeds (policy `full`): 5 OK, 495 CRASH, 0 HANG. Every crash is inside
battle 1.** The 5 OK seeds all *lost* battle 1 and exited cleanly through the
loss terminal into the lobby. **No seed has ever won battle 1** — the win →
postwin → swap screen → battle 2..7 surface is unreachable under random play,
so this catalog cannot yet speak to crashes there. Median time-to-crash is
3,394 frames ≈ **57 seconds of real-time play** (min 1,826 — turn 1), which
matches the user report in ISSUES #84 ("a NEW crash within one battle round").

A second sweep with policy `vanilla` (rent slots 0/1/2, always FIGHT with the
first legal move, decline everything optional) crashed **100/100 seeds at
battle 1 turn 6** on signature 3 below: even the plainest possible playthrough
of battle 1 cannot finish.

All seven signatures live in the battle **resolution/presentation seam**
(`battleResolutionPresentation*`, the orchestrator's display boundaries, and
Scene-OFF resolution rendering). None are kernel errors: `driveTrainerBoundary`
never hit a machine barrier and no decision-boundary rejection fired across
~600 soaked rounds. The battle kernel holds up under arbitrary legal play; the
display/orchestration layer above it does not.

**ISSUES #84 answer:** yes — the exact fatal signature the user hit
(`FactoryRoundOrchestratorError: resolution handoff battler 1 display does not
match the genuine next boundary`, factoryRoundBattleOrchestrator.ts:352)
reproduced at **133/500 seeds (26.6%)**, first at seed 4 within ~65 seconds of
simulated play. This harness would have caught it (and everything below) on
its first 50-seed shakeout.

Errors are deduped by `errorName` + message with numbers/quoted strings
normalized + top `src/**` stack frame (file+function, line dropped).

---

## 1. Resolution HP command starts at X, displayed Y — 294/500 (58.8%)

- **Repro:** `node --experimental-strip-types tools/soak/randomRoundSoak.ts --seed 0 --verbose`
- **Context:** battle 1, turn 4, frame 2607 (turn range across seeds: 1–23; 59% of all seeds)
- **Error (tick phase):**

```
Error: battle resolution HP command starts at 153, displayed 140
    createBattleResolutionPresentationRenderView (src/engine/battleResolutionPresentationRender.ts:1041)
    commitCompletedResolutionCommand (src/engine/factoryRoundBattleOrchestrator.ts:1343)
    advanceFactoryRoundBattleResolution (src/engine/factoryRoundBattleOrchestrator.ts:1594)
```

- **Last actions:** fifteen `resolution advance` A/B presses through turn 4's
  resolution messages (mash-with-jitter; the crash lands on a message-dismiss
  commit).
- **Read:** display-boundary bookkeeping in the Scene-OFF resolution
  presentation. `createBattleResolutionPresentationRenderView` asserts that an
  `hp` command's `from` equals the currently displayed HP, but by the time the
  dismissed message commits (`commitCompletedResolutionCommand`), an earlier
  HP change in the same resolution (multi-command segments: hits + burn/poison
  ticks + item procs) was either applied twice or skipped, so the projected
  `from` and the committed boundary disagree. Same displayed-vs-genuine family
  as #2 — this is the invariant one seam earlier. Not kernel damage math: the
  kernel finished the turn; only the display ledger is out of step.

## 2. Resolution handoff battler display mismatch (ISSUES #84 item 5) — 133/500 (26.6%)

- **Repro:** `node --experimental-strip-types tools/soak/randomRoundSoak.ts --seed 4 --verbose`
- **Context:** battle 1, turn 5, frame 3863 (turn range 1–20)
- **Error (tick phase):**

```
FactoryRoundOrchestratorError: resolution handoff battler 1 display does not match the genuine next boundary
    fail (src/engine/factoryRoundBattleOrchestrator.ts:352)
    settledCommandForResolutionHandoff (src/engine/factoryRoundBattleOrchestrator.ts:1427)
    advanceFactoryRoundBattleResolution (src/engine/factoryRoundBattleOrchestrator.ts:1831)
```

- **Last actions:** fifteen `resolution advance` presses through turn 5's
  resolution; the throw fires at the next-command handoff after the last
  message.
- **Read:** this is byte-for-byte the ISSUES #84 user crash (same message,
  same line 352). At the resolution → next-command handoff,
  `settledCommandForResolutionHandoff` checks the retained
  `battlePresentationBoundaries` (partyIndex / displayedHp / displayedStatus1)
  against the fresh kernel boundary; the opponent battler's tracked display
  state has drifted during the just-finished resolution (most seeds: HP or
  status1 lag after end-turn damage/status commands whose commits didn't reach
  the boundary array). #1 and #2 are almost certainly the same underlying
  display-ledger defect observed at two different assert points — together
  they account for 85% of all crashes.

## 3. STRINGID_PKMNSITEMRESTOREDHEALTH has no B_SCR_ACTIVE_NAME_WITH_PREFIX resolver — 31/500 (6.2%); vanilla policy 100/100 — **FIXED 2026-08-09 (a4baf562)**

- **Repro (plainest):** `node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy vanilla --seed 0 --verbose`
- **Context:** vanilla — battle 1, turn 6, frame ~2771, every single seed;
  full policy — 31/500 (whenever the opponent's berry holder survives to its
  item proc)
- **Error (tick phase):**

```
Error: battleStringResolver: STRINGID_PKMNSITEMRESTOREDHEALTH references placeholder {B_SCR_ACTIVE_NAME_WITH_PREFIX} with no resolver supplied
    resolveBattleStringLines (src/engine/battleStringResolver.ts:151)
    messageLines (src/engine/battleResolutionPresentation.ts:2776)
    projectBattleResolutionCommands (src/engine/battleResolutionPresentation.ts:2884)
```

- **Last actions (vanilla):** FIGHT → slot 0 confirm on turn 6; the crash is
  in projecting the resulting resolution's message commands (an opponent
  Sitrus/leftover-class heal message), before anything renders.
- **Read:** message-string resolution in the generated resolution projector.
  The generic `projectBattleResolutionCommands` path builds the item-restore
  message but supplies no `B_SCR_ACTIVE_NAME_WITH_PREFIX` resolver (the
  canonical turn-5 adapter, `turn5ResolutionAdapter.ts`, carries its own —
  the generated route never got one). Because the anchor battle-1 opponent
  reliably procs its berry around turn 5–6, this kills EVERY vanilla
  playthrough — the single loudest "the app cannot survive plain play" defect.

## 4. STRINGID_PKMNCANTUSEMOVETAUNT has no move-selection-rejection resolver — 15/500 (3.0%) — **FIXED 2026-08-09 (b8407083)**

- **Repro:** `node --experimental-strip-types tools/soak/randomRoundSoak.ts --seed 1 --verbose`
- **Context:** battle 1, turn 15, frame 8305 (a taunted player pressing the
  disallowed move in the fight menu)
- **Error (render phase — the browser would crash on the draw):**

```
Error: battle resolution STRINGID_PKMNCANTUSEMOVETAUNT has no move-selection-rejection message resolver
    resolveMoveSelectionRejectionMessageLines (src/engine/battleResolutionPresentation.ts:814)
    createBattleCommandPresentationRenderView (src/engine/battleCommandPresentationRender.ts:144)
    renderBattleCommandPresentation (src/engine/battleCommandPresentationRender.ts:342)
```

- **Last actions:** `action: FIGHT` → `fight menu intent: slot 2 (move 92)` →
  `fight: confirm slot 2 (will reject)` — the UI correctly entered the
  rejection-message phase; rendering that message threw.
- **Read:** the fight-menu selection-rejection surface
  (`rejectionReasonBySlot` → rejection-message phase, ISSUES #81 family)
  resolves message lines per STRINGID, and the Taunt cause
  (`STRINGID_PKMNCANTUSEMOVETAUNT`) is missing from
  `resolveMoveSelectionRejectionMessageLines`'s table while the kernel-side
  projection happily flags taunted slots. Any player who presses a taunted
  move — which the real UI invites — crashes the renderer. Adjacent to the
  user's #84 item 2 complaint (TAUNT/TORMENT text misbehavior on the same
  route).

## 5. Forced send-out render lifecycle mismatch — 10/500 (2.0%) — **FIXED 2026-08-09 (a6da3d6b)**

- **Repro:** `node --experimental-strip-types tools/soak/randomRoundSoak.ts --seed 38 --verbose`
- **Context:** battle 1, turn 7, frame 5184 — immediately after confirming the
  forced switch-in following a player faint
- **Error (render phase):**

```
Error: forced send-out render requires the matching typed player switch-in lifecycle
    renderBattleResolutionForcedPartySelect (src/engine/battleScene.ts:36700)
    renderWithoutFactoryTerminal (src/engine/core.ts:2765)
    render (src/engine/core.ts:3180)
```

- **Last actions:** forced-party navigation (`A on fainted slot` message,
  `DOWN to legal slot` ×n, `confirm send-out` twice — the second confirm A
  lands one frame after the first).
- **Read:** the forced party-select → switch-in presentation seam. After the
  SEND OUT confirm sets `sendOutElapsed`, the render path demands a typed
  `switchIn` view whose `elapsed` mirrors the selector clock
  (`battleScene.ts:36693-36700`); the resolution owner has not yet published
  (or has published a differently-clocked) switch-in lifecycle, so the very
  next sampled render throws. Timing-sensitive — extra presses around the
  confirm edge (a mashing player) widen the window, which is why only some
  seeds hit it.

## 6. Switch-in message has no preceding switch/post-switch field — 8/500 (1.6%) — **voluntary-switch shape FIXED 2026-08-09 (44e72ae9); 2-seed faint-replacement sibling remains (see differential section)**

- **Repro:** `node --experimental-strip-types tools/soak/randomRoundSoak.ts --seed 99 --verbose`
- **Context:** battle 1, turn 22, frame 9083 — submitting a VOLUNTARY switch
  from the in-battle party menu
- **Error (tick phase):**

```
Error: battle resolution switch-in message has no preceding switch/post-switch field
    messageLines (src/engine/battleResolutionPresentation.ts:2146)
    projectBattleResolutionCommands (src/engine/battleResolutionPresentation.ts:2884)
    createBattleResolutionPresentation (src/engine/battleResolutionPresentation.ts:3278)
```

- **Last actions:** party menu wandering, then `party: confirm row 2` — the
  crash is in building the resolution for the submitted voluntary switch.
- **Read:** the resolution projector again: composing the switch turn's
  command list, a switch-related message (opponent recall/send-out or
  switch-in hazard text) is projected before any `switch`/`post-switch` field
  command exists in the segment, and `messageLines` requires that ordering.
  Likely depends on what the opponent does the same turn (e.g. opponent
  faints/switches too, or a WHIRLWIND-class force — compare #84 item 3's
  "forced-switch jump"). Rare because it needs a voluntary switch plus a
  specific opposing action.

## 7. Scene-OFF stat banner refuses clamped stat changes — 4/500 (0.8%) — **FIXED 2026-08-09 (296d8664)**

- **Repro:** `node --experimental-strip-types tools/soak/randomRoundSoak.ts --seed 135 --verbose`
  (evasion 12->12; seed 495 is the attack variant)
- **Context:** battle 1, turn 12, frame 5616
- **Error (render phase):**

```
Error: Scene OFF typed stat adapter cannot draw battler 1 evasion 12->12
    sceneOffStatStageBannerView (src/engine/battleScene.ts:6701)
    renderBattleResolutionSceneOffView [as drawScene] (src/engine/battleScene.ts:36566)
    renderBattleResolutionPresentation (src/engine/battleResolutionPresentationRender.ts:1293)
```

- **Last actions:** `fight: confirm slot 0 (move 7)` then resolution advances —
  the opponent's own stat move (or the player's, seed 495) hit an
  already-clamped stage.
- **Read:** the Scene-OFF stat-stage banner adapter
  (`sceneOffStatStageBannerView`) rejects a from==to stage delta, but the
  resolution reaches it with a clamped change (stage already at ±6 — the ROM
  shows "won't go any higher/lower" text instead of an animation). The
  projector should route maxed-stage outcomes to the STRINGID_STATSWONTINCREASE
  family rather than the banner; under random play repeated stat moves reach
  the clamp within a dozen turns.

---

## Coverage: what this soak does and does not exercise

Covered (all via real button presses on the production route): the six-slot
rental draft (RENT navigation, SUMMARY detours, YES/NO confirm incl. declines),
prebattle room and battle room dialogs, the generated battle-start intro,
action menu (FIGHT/POKéMON plus BAG/RUN noop presses), fight menu (all four
slots incl. rejection and dead slots, B-cancel), voluntary party select
(switches, cancels, fainted-row messages), forced party select after faints,
every resolution message advance with jittered A/B mashing, and — on the 5
surviving seeds — the loss terminal through to the walkable lobby.

Not yet exercisable, blocked by the battle-1 crash wall (NOT by driver
limitations — the handlers exist and are reachable the moment a seed wins):
postwin win flow (heal/dialogue/continuation/RECORD/RETIRE questions), the
swap offer + swap screen, battles 2–7, opponent generation beyond battle 1's
pre-generation, and the round-complete terminal. Battle 1 is also
anchor-pinned (fixed six rentals, fixed opponent trainer/sets, fixed fresh
battle seed): variety within battle 1 comes from rental choice, press timing
(construction personalities), and decision sequences. Real cross-battle
diversity (arbitrary trainers/species/items) only opens up once battle 2 is
reachable — closing signatures 1–3 is the gate for the next, much broader
soak.

No HANG class was observed (0/600): every soaked seed either crashed or
reached a terminal state within budget.

## Method notes

- 500 seeds `--seeds 0:500` (policy full) ran in ~304 s; 100 vanilla seeds in
  ~45 s. Engine throws are labeled by origin (`src/**` = engine,
  `tools/soak/**` = driver); zero driver-origin throws occurred in the final
  sweeps.
- `render()` sampling every 8 frames plus every surface change caught the
  29/495 render-phase crashes (signatures 4, 5, 7); the browser calls
  `render()` every frame, so live play hits those strictly sooner.
- Tier-1 pin: `tests/randomRoundSoak.test.ts` locks the currently-green
  surface (cold boot → draft → rooms → intro → battle 1's first action menu,
  8 seeds + vanilla + determinism). Extend it toward full rounds as the
  signatures above close.
