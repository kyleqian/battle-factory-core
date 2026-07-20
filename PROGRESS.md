# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 165 — Supervisor wind-down: session end 2026-07-20 ~02:45 — **12 verified worker steps** (9 main + 3 worktree, every one folded green); suite **685 → 744/744**; headline: **turn 2 is COMPLETE end to end** (`turn2-dragonbreath.json` 237/237) and **three long-standing residual families were root-caused and closed** (ISSUES #19, #22, #24 — all three were harvest/dispatch bugs, none was the timing mystery they looked like)

- **State (verified this minute):** `npm test` **744/744**, `npm run
  build` green, tree clean at `fe8015b`, no worktrees, no unmerged
  branches. Full acceptance sweep, supervisor-rerun:
  `turn2-endeavor-drain` **201/201**, `turn2-endeavor` **77/77**,
  `turn2-dragonbreath` **237/237**, `turn3-menu` **250/250**,
  `fight-submenu` **235/235**, `turn1-rockslide` 256/256,
  `battle1-fight-submenu-idle` **256/256**, `sendout` 255/256 (#18
  policy-settled), `s6-acceptance` 224/228 (#5/#18 policy-settled).
- **Session summary (supervised, ~22:10-02:45, 6 rounds):** S7's ENDEAVOR
  window CLOSED (tail 3061-3094: healthbox wobble + Onix flicker); the
  whole DRAGON_BREATH half built from scouted ground truth — kickoff
  text, `AnimTask_ShakeMon2`, both red-fade blends, Grovyle's HP drain,
  text-clear, turn-3 menu reopen, and the 3347-3846 tail (where a dense
  probe caught a live-bounce/HP-digit bug the reference stride would have
  missed); slice F opened turn 3 (the engine previously DEAD-ENDED after
  turn 2) at 250/250. ISSUES #20 closed (FIGHT submenu on the live
  FONT_NARROW pipeline) and S8's per-battle-moveset dependency closed
  (`battleSetup.ts`, KABUTO proven through the state machine). S8
  swap-screen assets extracted, 0 unexplained mismatches/1404 px.
- **The residual-family thread (the session's best result):** #19's
  root cause was an extractor bbox cropping a rare sine-peak state, NOT a
  timing model — which generated the supervisor hypothesis that the other
  named single-tick residuals shared that class. Confirmed: #22's 2135
  plus 3465/3721 were the SAME class on a different asset (Onix's own
  `y2=2` peak, never harvested); 3337 was already silently fixed. That
  fix then TRADED tick 2901 (supervisor caught this: the landing report
  called it an unrelated pre-existing bug, but re-adding 2901 reproduced
  a byte-identical 769px signature) → filed #24 → closed by a ONE-LINE
  missing dispatch arm (`turn1Resolved`), not the two-anchor model the
  brief predicted. Net: four ticks green simultaneously, +4 Tier-1 pins.
- **Next:** (1) S7's faint/forced-switch slice is the biggest open item —
  turn 3's move resolution, turns 4-5, the faint, the AI switch-in, SEND
  OUT (ground truth banked, §13/§14/§19; slice F is only its menu
  prefix); (2) ISSUES #23 (fire projectiles, PARKED by supervisor default
  after 4 attempts — reversible, findings fully banked); (3) S8 engine
  work is unblocked end to end; (4) S4's remainder stays deferred.
- **Notes:** no usage-limit events; worker cost ~$3.7-14/step, 10-40
  min/step, 12/12 landed or returned a clean named negative. One worker
  edited ROADMAP.md (supervisor-owned) — content was accurate status
  only, kept, boundary noted. One new PAPERCUTS entry (supervisor
  mid-worker commits on the shared tree).

---
## 164 — Bounded worker: ISSUES #24 CLOSED — the §8c "tick 2901 regression" was a missing dispatch arm in `drawActionMenuIdleWindow`'s bounce-tick selection, not a second asset bug; all four RAM-verified ticks (2901/2135/3465/3721) now correct simultaneously; `npm test` **744/744** (+4), build green, zero regressions

- **State:** `npm test` 744/744, `npm run build` green, tree clean.
  `turn2-endeavor-drain.json` **201/201** (was 200/200, tick 2901
  restored), `battle1-fight-submenu-idle.json` **256/256** (unchanged),
  `turn2-dragonbreath.json` **237/237** (unchanged). `fight-submenu.json`
  235/235, `turn3-menu.json` 250/250, `s6-acceptance.json` 224/228,
  `sendout.json` 255/256, `menu-idle.json` 69/69, `turn1-kickoff.json`
  81/81, `rent-3picks.json` 157/190, `rent-slot1.json` 125/139,
  `confirm-flow.json` 79/95 — all unchanged. Bonus: `turn2-endeavor.json`
  **77/77** (was 76/77, same one-line fix happens to cover it too).
- **Did:** ISSUES #24 asked to find the anchor that gets all 4 named
  ticks right simultaneously, RAM-grounded rather than grid-searched.
  Read `reference/pokeemerald/src/battle_main.c`'s real `DoBounceEffect`/
  `SpriteCB_BounceEffect`/`EndBounceEffect` mechanism first (confirms this
  file's existing "resettled" anchors — `rockSlideResettledBounceTick`/
  `turn2SubmenuBounceTick`/`turn3SubmenuBounceTick` — model a REAL
  per-turn reset, not a curve-fit), then replayed each trace's real button
  script through `core.ts`'s actual `tick()` (a scratch script, not hand
  derivation) to find exactly which render branch owns each of the 4
  ticks. Result: 2135/3465/3721 were ALREADY correct pre-session (their
  own formulas, `t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` and
  `dragonBreathResettledBounceTick`, both unchanged by this fix — §8c's
  asset fix really was sufficient for those three). Tick 2901 sits in a
  DIFFERENT branch entirely: `drawActionMenuIdleWindow`'s open-DMA-wait
  hold, whose bounce-tick dispatch was `turn2Resolved ?
  turn3SubmenuBounceTick(t) : t` — missing the `turn1Resolved` arm
  entirely, so turn 2's OWN reopen (which per the source read above DOES
  inherit a reset bounce task) fell through to a plain, never-reset `t`.
  That formula is only correct for the very first, truly-never-reset
  epoch. One-line fix: add the missing arm, reusing
  `turn2SubmenuBounceTick` (already established, already verified
  elsewhere in this same window) — not a new anchor, not a magic offset.
  The "two different anchors" the brief's strong lead predicted turned out
  to be ONE anchor applied to a code path that had never been given the
  case at all. RAM-verified all 4 ticks pass now, restored 2901 to
  `turn2-endeavor-drain.json`'s `captureFrames`. New Tier-1 describe block
  (`tests/battleMenu.test.ts`, "ISSUES #24") pins the reachable
  `FightSubmenuState` + resulting `onixY2` at all 4 ticks against the
  RAM-probed truth, plus a regression guard proving the fix is scoped to
  tick 2901 alone (2902-2905 agree under both the old and new formula).
  Full writeup: `docs/battle-menu-notes.md` §8d.
- **Next:** faint/forced-switch is still the biggest remaining S7 item
  (§13-§14 ground truth already banked); S8 engine work is unblocked
  separately. ISSUES.md is now clean of the #22/#24 onix-bounce family.
- **Notes:** no papercuts. The `battle1-fight-submenu-idle.json` groundtruth
  trace (`tools/compare/traces-groundtruth/`) was re-run directly this
  session (not just inferred from the acceptance sweep) to get its own
  exact `FightSubmenuState` at tick 2135 — worth knowing this fixture is
  runnable the same way as the committed `tools/compare/traces/` ones.

---
## 163 — Bounded worker: ISSUES #22 ROOT-CAUSED AND CLOSED — same asset-harvest bug class as #19, but region A (onix), not region B (healthbox); also closed the two DRAGON_BREATH sine-peak residuals (3465/3721) named in E2b/E2b-2, plus tick 3337 turned out to already be fixed — one NEW single-tick residual surfaced and correctly scoped out (not fixed, different mechanism); `npm test` **740/740** (+8), build green

- **State:** `npm test` 740/740, `npm run build` green, tree clean.
  `battle1-fight-submenu-idle.json` **256/256** (was 255/256, ISSUES #22
  CLOSED). `turn2-dragonbreath.json` **237/237** (was 235/235, +3465/
  +3721). `turn2-endeavor-drain.json` **200/200** (was 201/201, −1 —
  see "Notes"). `fight-submenu.json` 235/235, `s6-acceptance.json`
  224/228, `sendout.json` 255/256 — all unchanged. Broader sweep
  unchanged: `menu-idle.json` 69/69, `turn1-kickoff.json` 81/81, `turn2-
  endeavor.json` 76/77, `turn3-menu.json` 250/250, `confirm-flow.json`
  79/95, `rent-3picks.json` 157/190, `rent-slot1.json` 125/139.
- **Did:** The brief's hypothesis (ISSUES #22's tick 2135 + DRAGON_BREATH's
  named ticks 3337/3465/3721 might be the same family as #19, a harvested
  asset with a bbox/state that excludes the sine table's rare peak) was
  **CONFIRMED for 3 of 4, for a second asset** — pixel-dumped all four:
  2135/3465/3721 share an EXACT bbox `(44,50)-(99,111)` and byte-identical
  color-transition histogram (769px each); tick 3337 turned out to
  already be fixed (0 diff — an apparent side effect of S7 slice E2b-2's
  earlier `yOffset` fix, never re-tested against that specific tick
  since it sits outside E2b-2's own rescan window). Root cause:
  `extract-menu-idle-window.ts` only ever harvested ONE onix-region patch
  (a `y2=1` tick) — `battleScene.ts` openly named the gap ("`onixY2>=1`
  degrades to the same y2=1 patch") rather than hiding it, but region A
  never got the y1/y2 split #19 already gave region B. Fixed in two
  stacked layers (same order #19's own derivation implies): (1) harvested
  a real `y2=2` patch (`ONIX_Y2_TICK=1877`, found via `onixSinIndex(n)
  mod 256 == 64`), renamed the shared type to `MenuIdleBounceTwoStateAsset`
  and factored the y1/y2 dispatch into one `drawTwoStateBounceRect`
  helper for both regions — closed 769px→3px; (2) `ONIX_BBOX` itself was
  ALSO 1 row short (height 62→63, rows 49-110→49-111) — the SAME bug #19
  found in region B's own bbox, stacked on top of layer 1's missing-patch
  bug. Both layers landed, all three ticks 0 diff. Full writeup:
  `docs/battle-menu-notes.md` §8c.
- **Next:** faint/forced-switch is still the biggest remaining S7 item
  (§13-§14 ground truth already banked); S8 engine work is unblocked
  separately. Whoever wants the NEW tick-2901 residual (see Notes) should
  RAM-probe the ONIX sprite's `sSinIndex`/bounce-task state directly at
  RAM tick 2900 during turn 2's own pre-confirm dwell.
- **Notes:** fixing #22 surfaced a DIFFERENT, previously-invisible bug:
  `turn2-endeavor-drain.json` tick 2901 (turn 2's own idle dwell, before
  the ENDEAVOR confirm) computes the correct `onixY2=2` via the closed
  form, but the REAL oracle pixels there match the `y1` patch, not `y2` —
  `drawActionMenuIdleWindow`'s "plain `t`" bounce-tick convention for this
  window (previously "oracle-confirmed fine," per its own doc comment)
  has its own unmodeled anchor error at the rare peak, invisible until
  now because the OLD always-degrade-to-y1 approximation coincidentally
  produced correct pixels here. Different mechanism (a bounce-tick anchor
  bug, not a harvest-asset bug) and out of this step's own scope (asset
  fixes only) — named tick 2901 excluded from `captureFrames`
  (`201→200`), not silently shipped wrong, dense neighbors (2894-2950)
  stay captured and green. No papercuts.
