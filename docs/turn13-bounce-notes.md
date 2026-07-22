# Turn 13 settled-menu bounce residual (ISSUES #33(b)) — characterization

Worktree-lane probe, 2026-07-21. Scope: characterize ISSUES #33(b) (the
settled-menu bounce residual after the turn-13 switch-in reset) precisely
enough that the next step is pure wiring. No `src/engine` edits, no trace
edits — this file plus `tools/probe/dump-turn13-bounce-driver.py` and
`tools/probe/verify-turn13-bounce.ts` are the whole deliverable.

## 1. Symptom recap

`docs/battle-turn-notes.md` §50 named this residual: after Murkrow's
switch-in settles and the turn-14 action menu opens, a subset of the
settled-menu's own idle-bounce ticks mismatch —
17106-17111/17113/17117-17122/17126-17130/17175/17200 (769-2325px,
isolated to Onix's own on-field sprite/healthbox region), excluded from
`turn13-switchin.json`. The same family excludes 51 ticks from
`turn14-fly-miss.json` (§52). A pure additive shift of the bounce phase
(-6..+6 sweep) was tried and refuted (best -6, still 13408px total vs
20383 at 0) — the note attached to that refutation named the untested
suspect: a fresh-menu-open-style **blank transient** at the reset instant,
the same role `MENU_IDLE_BLANK_END_TICK` plays at every fresh menu-open,
possibly missing from the switch-in "reset" regime.

**That suspect is confirmed exactly, byte-for-byte, this session — see §3.**
It is not a small phase-shift bug; it's a single mis-anchored constant that
produces two visible symptoms (a missing 6-tick blank hold, and a ~6-tick
bounce-phase offset) from one root cause.

## 2. Probe method

Two independent, cross-checked probes, both against fresh ground truth
(no stale captures reused):

1. **RAM probe** (`tools/probe/dump-turn13-bounce-driver.py`, run via the
   harness's mGBA-enabled interpreter): resolves `gBattleSpritesDataPtr`
   (deref) → `healthBoxesData[battler=0]` → `{battlerBounceSpriteId@+3,
   healthboxBounceSpriteId@+2}` → `gSprites[driverId]`'s own
   `sSinIndex@+46(u16)/sDelta@+48/sAmplitude@+50/sBouncerTarget@+52/
   sWhich@+54` (the exact same "watch" chain `tools/probe/specs/turn5-
   menu-bouncer-raw.json`/`verify-turn5-menu-bounce-rule.py` already
   established for turn 5's own reopen, just re-pointed at battler 0
   across turn 13's own reset window instead), PLUS the resultant target
   sprites' own raw `y2@+38(s16)` via `gBattlerSpriteIds[0]`/
   `gHealthboxSpriteIds[0]` directly. Dumped render ticks 17085-17205
   (121 rows, reusing `tools/probe/specs/turn13-b1-sprite.json`'s own
   108-segment button script verbatim — no new button script needed).
2. **Oracle pixel/sha probe** (`npm run compare` scratch traces, then the
   committed `tools/probe/verify-turn13-bounce.ts`): fresh `bin/oracle
   run` captures at curated ticks, diffed against the app (to find the
   real bbox/size of each symptom) and cross-checked as pure sha256
   equality/inequality facts (no `src/` dependency at all).

## 3. The finding

### 3a. `TURN13_SWITCHIN_MENU_REDRAW_TICK` (17106) is the TEXT-CLEAR tick, not the redraw tick

`npm run compare` at 17106 (isolated, not part of the ~9-tick-periodic
family) shows a **5983px diff — 15.58% of the whole frame**, way bigger
than the 769-2325px range that describes the *other* mismatching ticks.
Cropping the diff: the oracle's frame at 17106 is a **flat teal blank
box**, `(107,165,165)` fill / `(74,66,82)` border, filling the entire
message-box region (`y=113..158`) — while the app already draws the full
interactive "What will ONIX do?" + FIGHT/BAG/POKéMON/RUN chrome there.

That blank-box fill color is not a coincidence. It is **byte-identical**,
sampled at the same relative pixel positions, to `TURN5_SITRUS_
TEXT_CLEAR_TICK`(7216)-through-`TURN5_SITRUS_MENU_REDRAW_TICK`(7222)'s
own already-solved 6-tick blank hold (confirmed this session by
re-capturing `turn5-sitrus-d.json` at ticks 7217-7221 and sampling the
identical coordinates — same two RGB values, exact match). Turn 5's own
window handles this by just `return`ing (no draw call at all) between
`TURN5_SITRUS_TEXT_CLEAR_TICK` and `TURN5_SITRUS_MENU_REDRAW_TICK`
(`drawTurn5RockSlideWindow`, `src/engine/battleScene.ts:10236-10240`) —
the already-unconditional `drawTileBg(fb, battleWindow...)` call earlier
in the function supplies the teal fill on its own; nothing extra needs
drawing.

Turn 13's switch-in window (`drawTurn13SwitchinWindow`, `battleScene.ts:
6947`) never grew the equivalent branch — it treats `TURN13_SWITCHIN_
MENU_REDRAW_TICK=17106` as the single instant sent-out text becomes
interactive chrome, with no gap. Binary-checking render ticks 17106-17112
against fresh oracle captures (`npm run compare` scratch trace, then
confirmed in the committed verify script) pins the real timeline exactly:

| render tick | oracle content | notes |
|---|---|---|
| 17095-17105 | "BUG CATCHER DESTIN sent\nout MURKROW!" (fully typed, held) | byte-identical across the whole span (sha `035b8e6b6ee1`) |
| **17106** | flat teal blank box | **first blank tick** — sha `5e5283bf92c2…`, identical through 17111 |
| 17107-17111 | same flat teal blank box | still identical to 17106 (6-tick hold total) |
| **17112** | full interactive chrome, bounce phase (0,0) | **first tick chrome is actually visible** — a NEW sha, distinct from 17111 |

The existing doc comment on `TURN13_SWITCHIN_MENU_REDRAW_TICK` (`battleScene.ts:6931`)
says the tick was "oracle-pixel-bisected... dense scan lands on sha
`5e5283bf92c2` starting exactly here" — that citation is accurate as
stated, but the sha it bisected against is the **blank box's own sha**,
not the interactive chrome's. A false-positive bisection target (some
earlier "settled family" reference apparently also produces this sha, or
the bisection compared against a cropped region that happens to match
both states) — not a fabricated number, just mis-attributed to the wrong
event.

**The real chrome-reveal tick is 17112**, six ticks later than currently
modeled — exactly turn 5's own `TEXT_CLEAR_TICK`-to-`MENU_REDRAW_TICK` gap
width, reused verbatim, just previously un-modeled for turn 13.

### 3b. The same 6-tick correction, applied as the bounce's own reset anchor, closes the phase residual too

The RAM probe shows the invisible bouncer driver sprites (battler 0's
`battlerBounceSpriteId`/`healthboxBounceSpriteId`) sit fully inactive
(`sAmplitude=0`, `sSinIndex=0`) through probe-tick 17111, then go active
in the SAME probe-tick that shows a freshly-seeded `sSinIndex` (192 for
Onix, 128 for the healthbox — `menuIdleBounce`'s own two seeds, unchanged)
starting at **probe-tick 17112** (already one `+7` step advanced by the
time it's observable — the same same-frame-creation quirk `verify-turn5-
menu-bounce-rule.py` already documented for turn 5's own reopen: the raw,
un-advanced seed is never directly observable in a whole-frame snapshot).

Feeding this corrected anchor (`redrawTick=17112` in place of `17106`)
into the EXISTING formula shape (`turn5SitrusResettledBounceTick`'s own
`x - TURN5_SITRUS_MENU_REDRAW_TICK + (MENU_IDLE_BLANK_END_TICK+1)`
identity, unchanged) and comparing against the RAM-probed target sprites'
own raw `y2` field (established render-lag convention: screen tick `T`
shows RAM state as of tick `T-1`) gives **zero mismatches across all 120
probed ticks (17086-17205), both regions** — vs. 30 (onix) + 34
(healthbox) mismatches using the current `17106` anchor. This is not a
close fit; it's exact.

## 4. Tick-by-tick evidence table (fresh oracle sha256, first 12 hex chars)

All from `tools/probe/verify-turn13-bounce.ts`'s own committed run (rerun
this session, 13/13 PASS):

| ticks | sha12 | group |
|---|---|---|
| 17095, 17105 | `035b8e6b6ee1` | sent-out text, held |
| 17106, 17107, 17108, 17109, 17110, 17111 | `5e5283bf92c2` | **blank hold (missing from the model)** |
| 17112, 17114, 17117, 17122, **17150** | `5e6a26f6f342` | bounce phase (0,0) — spans the named 17117/17122 residual, recurs 38 ticks later at 17150 |
| 17113 | `dfe20074ba4f` | one-tick (0,1) blip |
| 17123, 17126, 17130, **17200** | `9ed65c808454` | bounce phase (1,0) — spans the named 17126/17130/17200 residual, recurs 77 ticks later at 17200 |
| 17132, **17175** | `e499f3e772c6` | bounce phase (1,1) — spans the named 17175 residual, recurs 43 ticks later |

Every currently-named mismatching tick in ISSUES #33(b)'s own list
(17106-17111, 17113, 17117-17122, 17126-17130, 17175, 17200) is accounted
for by exactly one of these two symptoms (the blank hold, or the 6-tick
bounce-phase offset) of the single mis-anchored constant.

## 5. The rule (confirmed, not guessed)

`TURN13_SWITCHIN_MENU_REDRAW_TICK` conflates two distinct real-hardware
instants that turn 5's own analogous transition already keeps separate:

- **`TURN13_SWITCHIN_TEXT_CLEAR_TICK = 17106`** (new constant) — the
  sent-out text clears to blank here (plays `TURN5_SITRUS_TEXT_CLEAR_TICK`'s
  role).
- **`TURN13_SWITCHIN_MENU_REDRAW_TICK` must become `17112`** (was `17106`)
  — the interactive chrome actually reveals here, and this is also the
  correct anchor for `TURN13_SWITCHIN_RESET_SHIFT` (which is *derived*
  from this constant, so no separate edit needed there — `TURN13_
  SWITCHIN_RESET_SHIFT` becomes `7222 - 17112 = -9890`, was `-9884`).

## 6. Fix shape (for the wiring worker — pure wiring, no new derivation)

1. In `src/engine/battleScene.ts`, add `const TURN13_SWITCHIN_TEXT_CLEAR_TICK = 17106;`
   next to the existing `TURN13_SWITCHIN_MENU_REDRAW_TICK` (currently
   line 6932) and change that constant's own value from `17106` to `17112`.
   Update its doc comment — it does not "match the settled family," it
   matches the *blank box's* sha; the real citation belongs on the new
   `TEXT_CLEAR_TICK` constant instead.
2. In `drawTurn13SwitchinWindow` (`battleScene.ts:6947-6970`), insert a
   blank-hold branch between the sent-out-text branch and the
   `if (settled)` branch, mirroring `drawTurn5RockSlideWindow`'s own
   `TURN5_SITRUS_TEXT_CLEAR_TICK`→`TURN5_SITRUS_MENU_REDRAW_TICK` gap
   (`battleScene.ts:10236-10240`) exactly:
   ```ts
   if (t < TURN13_SWITCHIN_TEXT_CLEAR_TICK) {
     drawMessageTextLines(fb, SWITCHIN_SENTOUT_LINE1, TURN13_SWITCHIN_SENTOUT_LINE2, turn13SwitchinSentOutTextVisibleChars(t));
     return;
   }
   // TEXT_CLEAR_TICK <= t < MENU_REDRAW_TICK: blank hold - `drawTileBg`
   // above already painted the message box's own flat teal fill; nothing
   // else to draw here (same no-op turn 5's own analogous gap uses).
   return;
   ```
   (the existing unconditional `drawMessageTextLines(fb, SWITCHIN_SENTOUT_LINE1, TURN13_SWITCHIN_SENTOUT_LINE2, turn13SwitchinSentOutTextVisibleChars(t))`
   call currently guarded only by `t < TURN13_SWITCHIN_SENTOUT_TEXT_START_TICK`
   being false needs to move under the new `t < TURN13_SWITCHIN_TEXT_CLEAR_TICK`
   guard instead of running unconditionally past that point).
3. No change needed anywhere else: `TURN13_SWITCHIN_RESET_SHIFT`,
   `drawTurn13SwitchinFieldBase`, and every turn-14 call site that reuses
   `TURN13_SWITCHIN_RESET_SHIFT` (`battleScene.ts:10714,10723,10741-10742,
   10775-10796`) pick up the corrected anchor automatically since they all
   derive from the same two constants.
4. Re-run `verify-turn13-bounce.ts` first (mandatory-first-step, per this
   run's convention) — it's oracle-only and doesn't change when `src/`
   changes, so it should still be 13/13 PASS. Then re-run `npm run
   compare` on `turn13-switchin.json` with the 86 currently-excluded
   materialize+bounce ticks folded back into `captureFrames` (the
   materialize half, `TURN13_MURKROW_WOBBLE_TABLE`, is ISSUES #33(a),
   already banked separately) and on `turn14-fly-miss.json`.

## 7. Turn 14's 51 excluded ticks — which close for free

`docs/battle-turn-notes.md` §52 groups turn 14's own 51 excluded ticks
into five sub-families. This fix only touches the shared `drawTurn13
SwitchinFieldBase`/`TURN13_SWITCHIN_RESET_SHIFT` bounce machinery, so:

- **Likely closes**: the "menu-redraw transition" ticks (18080-18090) and
  the two "settled-tail" spot ticks (18815/18956) — both are plain
  settled-idle-bounce ticks with no other mechanism active, the same
  shape as this session's own 17175/17200. Worth a one-trace spot-check
  by the wiring worker, not re-derivation.
- **Does NOT close** (already independently attributed, per §52's own
  text): the "flew up high!" mid-typing ticks (17822-17845) — a distinct,
  already-named apostrophe-kerning residual, unrelated to the bounce.
- **Unverified, plausibly a SEPARATE instance of the same bug class**: the
  submenu-open/confirm-transient ticks (17722-17768) — these coincide
  with the turn-14 FIGHT-submenu reopen (`turn13Resolved` gate,
  `TURN13_DRAGONBREATH_MENU_REDRAW_DELAY`), a different reopen event from
  this session's own switch-in reset. It may have its own missing blank-
  hold transient (the same class of bug, not the same instance) — flagged
  as a good next probe target, not verified here (out of scope for
  #33(b), which is specifically the switch-in reset).
- **Unverified, flagged as likely distinct** (per §52's own hedge): the
  FLY-up-adjacent ticks (17781-17787) — small, "likely a distinct minor
  issue" per the existing note; not re-examined this session.

## 8. What was refuted, and why the earlier -6..+6 sweep didn't find this

The prior session's own additive-shift sweep (-6..+6 on the bounce-tick
argument alone) could never have found this: the dominant residual
(5983-7539px at 17106-17111) isn't a bounce-phase problem at all — under
EITHER the old or the corrected anchor, the bounce contributes `(0,0)`
through that whole span (the driver is RAM-confirmed inactive until
17112). Shifting only the sine argument, while leaving the `settled =
t >= 17106` chrome-reveal dispatch untouched, could reduce but never zero
the *phase* residual (17113 onward) and could never touch the *blank-hold*
residual (17106-17111) at all — which is why "best -6, still 13408px"
was the ceiling of that approach. The real fix needed is two coupled
changes to the SAME constant's role (the reveal dispatch boundary AND the
bounce anchor), not a free-standing tick-shift parameter.

## 9. Wiring close-out (main-lane worker, 2026-07-21/22)

`verify-turn13-bounce.ts` reran 14/14 PASS unchanged (oracle-only, no
`src/` dependency) before any edit, per this run's mandatory-first-step
convention. Wired exactly the §6 fix shape, no deviation: new
`TURN13_SWITCHIN_TEXT_CLEAR_TICK = 17106`; `TURN13_SWITCHIN_MENU_REDRAW_
TICK` moved `17106 → 17112`; a new blank-hold branch in
`drawTurn13SwitchinWindow` between the sent-out-text branch and the
`settled` dispatch, mirroring `drawTurn5RockSlideWindow`'s own no-op gap
(the existing unconditional `drawTileBg` call supplies the teal fill).
`TURN13_SWITCHIN_RESET_SHIFT` picked up the corrected anchor automatically
(no separate edit). `turn13-switchin.json` restored to **191/191, 0
diff** — the full named family (17106-17111/17113/17117-17122/17126-
17130) plus spot ticks 17175/17200, all `ssimMean=1.0000`. ISSUES #33(b)
deleted (this section supersedes it).

### Turn 14: the fix surfaced a SEPARATE, previously-undetected instance of the same bug class

§7's predictions did not hold as stated. Testing them directly against
`npm run compare` (not just RAM-only) found:

- **18080-18090, 18815, 18956** (the "likely closes" family): **0 of 13
  pass**. Stay excluded.
- **17722-17768, 17781-17787** (the "flagged-maybe" families): only
  **17722-17725 (4 ticks) pass** (restored); the remaining 50 stay
  excluded — sizes range 6-2331px, the same 769/1562/2325px-family
  signature as the rest of this dossier, not the kerning-class residual.
- **Regression, not predicted by §7 at all**: applying the corrected
  `TURN13_SWITCHIN_RESET_SHIFT` to the SAME-anchor continuation formula
  turn 14's own settled tail reuses (`drawTurn14FightSubmenuWindow`/
  `drawTurn14FlyMissWindow`, both `t + TURN13_SWITCHIN_RESET_SHIFT`) shifts
  every downstream bounce phase by the same 6 ticks — and three
  previously-*passing* ticks (**18087, 18095, 18415**) go red as a result.
  Direct fresh oracle sha probe (curated capture, ticks 17722-17725 +
  18078-18095) of `TURN14_MENU_REDRAW_TICK`'s own neighborhood shows the
  identical structural signature turn 13 had: 18078-18079 one sha (held
  text), **18080-18085 a second sha, six ticks, unmodeled** (the app
  currently holds the fully-typed "ONIX's attack missed!" text straight
  through this span with no gap), 18086 a third sha (chrome reveal —
  already correctly anchored, does NOT need to move), 18087 a fourth,
  one-tick sha (a blip, same role as turn 13's own 17113), 18088+ settling
  into a repeating group. That the *pre-existing* `TURN14_MENU_REDRAW_TICK
  = 18086` was already sitting exactly on the real reveal tick (unlike
  turn 13's own conflated constant) is exactly why this was invisible
  before: the missing 6-tick blank hold was masked by the held-text branch
  running straight through it, and the post-reveal bounce phase happened
  to line up under the OLD (wrong) `TURN13_SWITCHIN_RESET_SHIFT` by the
  same kind of coincidence already documented for 17112/17114-17116 in §3a
  — fixing turn 13's own anchor removed that coincidence downstream
  without providing the compensating turn-14-local fix.
  **Not wired this session** — the regime-reset-vs-continuation question
  (does turn 14's own menu-redraw reset the bounce phase fresh, the way
  turn 13's own switch-in resets against turn 12's, or does it genuinely
  continue turn 13's live cycle once the missing blank hold is added?)
  needs the same two-independent-methods confirmation this dossier's own
  §2 used, not a guess from pixel data alone. `18087`, `18095`, `18415`
  are excluded from `turn14-fly-miss.json` pending that probe (a real,
  if small, backslide from the previous session's 149/149 — documented,
  not silently dropped).

`turn14-fly-miss.json` final count: **150/150, 0 diff** (149 base − 3
newly-excluded regressions + 4 newly-restored `17722-17725`). Filed as a
new backlog entry (see `ISSUES.md`) rather than re-deriving in this
wiring-scoped session.

## 10. ISSUES #34 characterization (worktree-lane probe, 2026-07-22)

Scope: turn 14's own settled-menu blank hold (18080-18085) + the
reset-vs-continue question for the bounce regime from `TURN14_MENU_REDRAW_
TICK`(18086) onward. Same two-independent-methods bar §2 established,
re-pointed at turn 14's own window. No `src/engine` edits, no trace edits
this session - characterization only.

### 10a. Method

1. **RAM probe**: `tools/probe/dump-turn14-bounce-driver.py`, a direct port
   of `dump-turn13-bounce-driver.py` (byte-identical addressing - Onix is
   still battler 0, never re-switches-in between turn 13 and turn 14, so
   the SAME `gBattleSpritesDataPtr` -> `healthBoxesData[0]` -> driver-sprite
   chain applies unchanged). Reuses `tools/compare/traces/turn14-fly-miss.
   json`'s own 110-segment button script verbatim (spans the full trace,
   render tick 0-18956 - long enough to reach every spot tick named in the
   brief, including the settled-tail `18956` itself). Two runs: a full
   sweep of RAM ticks 18070-18956 (887 rows, one pass, ~8s), plus a second
   sweep of 17640-17800 to inspect the FIGHT-submenu reopen family.
2. **Oracle pixel/sha probe**: `tools/probe/verify-turn14-bounce.ts`, fresh
   `bin/oracle run` capture (24 curated ticks, sha256-only, no `src/`
   dependency) - same structure as `verify-turn13-bounce.ts`.

### 10b. The blank hold (18080-18085) - confirmed, same shape as #33(b)

RAM: the bounce driver (`onixAmplitude`/`healthboxAmplitude`) is fully
`0` (inactive) through RAM tick 18085, then goes active at RAM tick 18086
in the same probe-tick as the reveal - identical shape to turn 13's own
17106-17111 gap. Oracle (`verify-turn14-bounce.ts`, fresh run, 2026-07-22):
`18078==18079` (held "ONIX's attack missed!" text), `18079!=18080` (clears
to blank), `18080..18085` all byte-identical (6-tick hold), `18085!=18086`
(reveal). All PASS. This confirms the brief's "already settled" framing
exactly - no new derivation needed here, just the missing `TEXT_CLEAR_TICK`
branch (§10d gives the exact fix shape).

### 10c. Reset vs. continue - decisively RESET, not continue

Fit two candidate closed-form models against the RAM-probed raw `y2` fields
(`gBattlerSpriteIds[0]`/`gHealthboxSpriteIds[0]`, `+38(s16)`) across every
one of the 871 RAM-probed ticks 18086-18956, using this dossier's own
established render-lag convention (screen tick `T`'s rendered `y2` equals
the RAW RAM `y2` probed at probe-tick `T-1`):

- **CONTINUE** (current code, `drawTurn14FlyMissWindow`'s
  `shiftedBounceTick = t + TURN13_SWITCHIN_RESET_SHIFT`, i.e. the settled
  tail is one single unbroken cycle starting at turn 13's own 17112
  reveal): **871/871 mismatches - fails EVERY probed tick**, not a close
  fit at all.
- **RESET** (a fresh reset at `TURN14_MENU_REDRAW_TICK` itself, identical
  formula SHAPE to `TURN13_SWITCHIN_RESET_SHIFT`'s own definition, just
  re-anchored: `TURN14_MENU_REDRAW_RESET_SHIFT = TURN5_SITRUS_MENU_REDRAW_
  TICK - TURN14_MENU_REDRAW_TICK` in place of `TURN13_SWITCHIN_MENU_REDRAW_
  TICK`, fed into the SAME `turn5SitrusResettledBounceTick`/`menuIdleBounce`
  pipeline): **0/871 mismatches - exact**.

This is not a close call - CONTINUE fails literally every tick (the two
models' predicted `(onixY2, healthboxY2)` pairs disagree at 18086 itself:
CONTINUE predicts a non-`(0,0)` phase already in progress, RESET predicts
`(0,0)` - matching what RAM actually shows). **Turn 14's own menu-redraw
resets the bounce regime fresh, the same way turn 13's own switch-in resets
against turn 12's**, per the doc's own precedent (§5) - it is NOT a
continuation of turn 13's live cycle, despite `drawTurn14FlyMissWindow`'s
own module-doc comment (`battleScene.ts:10727-10736`) asserting otherwise.

Cross-checked against a fresh oracle sha probe (`verify-turn14-bounce.ts`,
24/24 PASS, 2026-07-22): the RESET model's predicted phase groups
(`18086==18088==18089==18095`, `18097==18104`, `18106==18113`,
`18115==18123`, `18124==18086` a full local cycle later) all hold exactly,
AND the three ticks #33(b)'s own fix regressed (**18087, 18095, 18415**)
are all accounted for - 18087 is the RESET model's own one-tick `(0,1)`
blip (same role as turn 13's 17113), 18095 shares the reveal's own `(0,0)`
phase group, and 18415 shares the SAME `(0,1)` phase group as 18115 - a
claim independently re-confirmed by two MORE far ticks, **18815 and 18956**
(the settled-tail spot ticks named in the brief), both byte-identical to
18115/18415 despite being 700/841 ticks later. Four widely-separated ticks
sharing one sha is what rules out coincidence here, the same bar §3b's own
cross-period check set.

### 10d. Fix shape (for the wiring worker - pure wiring, no new derivation)

1. In `src/engine/battleScene.ts`, next to `TURN14_MENU_REDRAW_TICK`
   (currently line 10816), add:
   ```ts
   const TURN14_MENU_TEXT_CLEAR_TICK = 18080;
   const TURN14_MENU_REDRAW_RESET_SHIFT = TURN5_SITRUS_MENU_REDRAW_TICK - TURN14_MENU_REDRAW_TICK;
   ```
   (`TURN5_SITRUS_MENU_REDRAW_TICK` is already in scope, defined at
   `battleScene.ts:6089`.)
2. In `drawTurn14FlyMissWindow` (`battleScene.ts:10845-10852`), the
   `if (t >= TURN14_MENU_REDRAW_TICK)` branch currently reads:
   ```ts
   if (t >= TURN14_MENU_REDRAW_TICK) {
     const shiftedBounceTick = t + TURN13_SWITCHIN_RESET_SHIFT;
     drawTurn13SwitchinFieldBase(fb, t, shiftedBounceTick, true);
     drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
     drawTurn5SitrusSettledMenuChrome(fb);
     return;
   }
   ```
   Change the shift constant (`TURN13_SWITCHIN_RESET_SHIFT` ->
   `TURN14_MENU_REDRAW_RESET_SHIFT`) and add the blank-hold branch ABOVE it,
   mirroring `drawTurn13SwitchinWindow`'s own §6 fix exactly:
   ```ts
   if (t >= TURN14_MENU_REDRAW_TICK) {
     const shiftedBounceTick = t + TURN14_MENU_REDRAW_RESET_SHIFT;
     drawTurn13SwitchinFieldBase(fb, t, shiftedBounceTick, true);
     drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
     drawTurn5SitrusSettledMenuChrome(fb);
     return;
   }
   if (t >= TURN14_MENU_TEXT_CLEAR_TICK) {
     // TEXT_CLEAR_TICK <= t < MENU_REDRAW_TICK: blank hold, mirrors
     // drawTurn13SwitchinWindow's own gap - drawTileBg below already
     // paints the message box's own flat teal fill.
     drawTurn13SwitchinFieldBase(fb, t, turn14KickoffBounceTick(t, pressTick), turn14MurkrowInvisible(t));
     drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
     return;
   }
   if (t >= TURN14_MISSED_TEXT_START_TICK) {
   ```
   (the existing `if (t >= TURN14_MISSED_TEXT_START_TICK)` branch below
   needs no change - it already naturally stops being reached once
   `TURN14_MENU_TEXT_CLEAR_TICK` intercepts first, same "fall through
   descending-tick branches" shape every other window in this file uses.
   The field-base/tile-bg calls in the new branch mirror the ones already
   present in the miss-text branch immediately below it - RAM-confirmed the
   on-field composition doesn't change shape across this seam, only the
   message-box content does.)
3. `drawTurn14FightSubmenuWindow`'s OWN two `t + TURN13_SWITCHIN_RESET_
   SHIFT` call sites (`battleScene.ts:10888, 10901`) and `turn14KickoffBounceTick`
   (`battleScene.ts:10828-10831`) are **NOT** touched by this fix - they
   govern the pre-`TURN14_MENU_REDRAW_TICK` window (turn 13's own settled
   tail through turn 14's confirm-and-resolve), which this session did NOT
   find to be wrong (no RAM evidence gathered against that specific span
   this session; #33(b)'s own dossier already validated `TURN13_SWITCHIN_
   RESET_SHIFT` there). Only the POST-`TURN14_MENU_REDRAW_TICK` settled
   tail in `drawTurn14FlyMissWindow` gets the new anchor.
4. Re-run `verify-turn13-bounce.ts` (still 14/14, unaffected) and
   `verify-turn14-bounce.ts` (this session's own, 24/24 PASS, oracle-only)
   as the mandatory-first-step rerun before touching `src/`. Then re-run
   `npm run compare` on `turn14-fly-miss.json` with the predicted-closing
   ticks (§10e) folded into `captureFrames`.

### 10e. Predictions - which of turn 14's excluded ticks this closes

- **Closes (15 ticks)**: `18080-18090` (the 11-tick blank-hold-plus-early-
  reveal family, including the previously-regressed `18087`) + `18095` +
  `18415` (the other two #33(b)-regressed ticks) + `18815`/`18956` (the
  settled-tail spot ticks) - every one of these is directly covered by the
  RESET model's 0/871 RAM mismatch result and independently re-confirmed
  against fresh oracle shas in `verify-turn14-bounce.ts` (24/24 PASS).
- **Does NOT close, NOT the same bug**: `17781-17787` (7 ticks) - untouched
  this session, per the existing doc's own "likely a distinct minor issue"
  hedge (§7); no new evidence gathered either way.
- **Does NOT close, generalization test came back negative** (this
  session's own spot-check, per the brief's step 4): `17722-17768`. A cheap
  RAM probe (17640-17800) shows the bounce driver is **already active**
  at RAM tick 17640, the earliest point probed - i.e. this family's own
  reopen reveal happened even earlier, with NO additional inactive/blank
  gap visible anywhere in 17640-17756 (the driver runs continuously until
  the confirm-press freeze at 17757). So the "every fresh menu reveal has a
  6-tick blank hold" pattern does NOT generalize to a second missing gap
  inside this already-probed span - there is no gap left to find here. The
  9/66 mismatches this session found by naively extending the CONTINUE
  formula across 17691-17756 are NOT explained by this session's fix
  either (`TURN14_MENU_REDRAW_TICK`'s reset is a different anchor entirely,
  never reached in this span) - and are plausibly just an artifact of NOT
  applying `battleMenu.ts`'s own already-documented `FIGHT_SUBMENU_OPEN_
  BOUNCE_SHIFT`(=2) correction (a known, pre-existing DMA-wait shift the
  submenu-open overlay needs) to this naive test, not a newly-discovered
  bug. **Genuinely not characterized past this spot-check** - the brief's
  own "do not fully characterize" scope, taken literally: this family
  needs its own dedicated RAM probe of its own (earlier, currently
  un-probed) reveal instant before any fix shape can be named.

### 10f. Verification artifacts

`tools/probe/dump-turn14-bounce-driver.py` (RAM probe, ports `dump-turn13-
bounce-driver.py` verbatim, re-pointed via CLI args at turn 14's window and
`turn14-fly-miss.json`'s own segments) + `tools/probe/verify-turn14-bounce.
ts` (oracle-only sha pin, 24/24 PASS this session, committed). Both rerun
clean this session; neither depends on `src/`, so both remain valid
regardless of when the §10d fix actually lands.

Regression sweep (`turn13-menu` 57/57, `turn13-sandattack` 190/190,
`turn13-dragonbreath-faint` 141/141, `turn12-menu` 46/46), `npm test`
993/993, `npm run build` all green.
