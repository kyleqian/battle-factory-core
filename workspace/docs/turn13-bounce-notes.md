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

## 11. Wiring close-out (main-lane worker, 2026-07-22)

Wired §10d exactly, no deviation: `TURN14_MENU_TEXT_CLEAR_TICK = 18080`,
`TURN14_MENU_REDRAW_RESET_SHIFT = TURN5_SITRUS_MENU_REDRAW_TICK -
TURN14_MENU_REDRAW_TICK`, `drawTurn14FlyMissWindow`'s settled branch swapped
to the new shift constant, new blank-hold branch added above it.
`drawTurn14FightSubmenuWindow`'s own two `TURN13_SWITCHIN_RESET_SHIFT` call
sites and `turn14KickoffBounceTick` left untouched, per §10d point 3.

Restored the predicted 15 ticks (§10e) to `turn14-fly-miss.json`'s
`captureFrames`: 150/150 → **165/165, 0 diff**, exact, first try — every
`verify-turn14-bounce.ts` PASS held under real pixel comparison, no gap
between the RAM/sha probe and `npm run compare` this time (unlike three of
the four prior wiring sessions in this chain, #251/#252/#253's own PROGRESS
entries).

**Cheap conditional check (§10e's own "does the reopen family generalize"
question, brief step 5):** restored all 43 still-untested ticks of
17722-17768 to a scratch trace copy (not committed) and ran `npm run
compare`. **0/43 pass** — smallest diff 6px (0.02%), several far larger (up
to 2331px/6.07% at 17753). The "artifact of the un-applied
`FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` correction" theory from §10e's own hedge
does NOT hold up under a real pixel check: this family needs its own
dedicated RAM probe of its own (still-unprobed) reopen-reveal instant
before any fix shape can be named, exactly as §10e already said. Nothing
restored; `turn14-fly-miss.json`'s `captureFrames` for this span is
unchanged from before this session.

Regression sweep, all 0 diff: `turn13-switchin` 240/240, `turn13-menu`
57/57, `turn12-menu` 46/46, `turn13-dragonbreath-faint` 141/141. `npm test`
993/993 (unchanged — pure wiring, no existing precedent for pinning these
per-turn window-selector closures with a Tier-1 test, same call every prior
session in this chain made). `npm run build` green.

ISSUES #34's core (the blank hold + regime reset) is fixed; trimmed to its
honest remainder in `ISSUES.md` (17722-17768's 43 still-failing ticks,
17781-17787, 17822-17845) rather than deleted.

## 12. ISSUES #35 root-caused; ISSUES #34's 43-tick remainder partially
explained by the SAME rule (worktree-lane probe, 2026-07-22)

Scope: ISSUES #35 (turn 15's 7-tick FIGHT-submenu-open residual) and a
generalization test against ISSUES #34's own still-open 43-tick remainder
(17722-17768). No `src/engine` edits, no trace edits this session -
characterization only, per the brief. **Decisive outcome: one rule closes
turn 15's full 7-tick family exactly, and the SAME rule closes a 9-tick
subset of turn 14's 43-tick family exactly; the remaining 11 ticks of that
family (17758-17768) are conclusively NOT explained by this rule (RAM shows
the code's own existing frozen-phase branch already predicts them
correctly) - a genuinely separate, still-uncharacterized issue.**

### 12a. The lead: every OTHER turn's analogous branch already has a
correction turn 14/15 are missing

`FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` (`battleMenu.ts:843`, value 2) models a
real, previously-established mechanism: the FIGHT submenu's own DMA-wait
reveal costs the shared (never-reset-while-FIGHT-is-open) idle-bounce
sprite 2 extra ticks of drift relative to a plain `t`-driven formula.
Turns 2-13's own "submenu open, waiting for the confirm press" branches all
apply this correction (`battleScene.ts`'s own `t - FIGHT_SUBMENU_OPEN_
BOUNCE_SHIFT` idiom - e.g. `drawTurn13FightSubmenuWindow` line 9811:
`const bounceTick = sm.confirmElapsed !== null ? turn13KickoffBounceTick(...) : t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;`).

`drawTurn14FightSubmenuWindow` (`battleScene.ts:10943-10964`) and
`drawTurn15FightSubmenuWindow` (`battleScene.ts:11045-11066`) both have the
STRUCTURALLY IDENTICAL branch - but it reads `t + TURN13_SWITCHIN_RESET_
SHIFT` / `t + TURN14_MENU_REDRAW_RESET_SHIFT` respectively, with **no
`FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` term at all**. Same omission in both
turns' own `turn14KickoffBounceTick`/`turn15KickoffBounceTick` (`battleScene.
ts:10878-10881`, `10998-11001`) pre-freeze branches (`t < pressTick +
FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY`). This is exactly the brief's own named
suspect ("does the FIGHT-SUBMENU OPEN itself perturb the bounce regime in a
way the engine mis-models") - not a sine-table defect, a missing correction
this file's own later turns simply never carried forward from turn 13's own
still-current window (the one BEFORE the switch-in reset, which HAS it).

### 12b. Method

1. **RAM probe**: `dump-turn14-bounce-driver.py` reused VERBATIM (no edits -
   generic over any spec with a `"segments"` array), re-pointed via CLI args
   at `tools/compare/traces/turn15-fly-strike.json`'s own 122-segment button
   script (confirmed byte-identical to `turn14-fly-miss.json`'s own first
   110 segments via a direct array diff - 0 differences, both sum to 18956
   frames - so reusing this one trace's segments covers BOTH turns' windows
   with a single script, no divergence risk). Two ranges dumped: 17700-18995
   (one pass, ~8s, covers turn 14's 17700-17770 AND turn 15's 18950-18995)
   plus a 18090-18200 sanity window (used to calibrate the analysis - see
   12c). Same addressing `dump-turn13/14-bounce-driver.py` already
   established (`gBattleSpritesDataPtr` -> `healthBoxesData[0]` ->
   driver sprite chain, PLUS `gBattlerSpriteIds[0]`/`gHealthboxSpriteIds[0]`'s
   own raw `y2`).
2. **Formula transcription**: `menuIdleBounce`/`bounceSin`/`GBA_SINE_TABLE_
   256` (`battleMenu.ts`) and `turn5SitrusResettledBounceTick` (`battleScene.
   ts:6152`) transcribed verbatim into a standalone Python script (read-only,
   not committed - the committed artifact is the oracle-only verify script,
   §12d) - two candidate models tested per window: **CURRENT** (`t +
   RESET_SHIFT`, matches the code today) vs. **CANDIDATE** (`(t -
   FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT) + RESET_SHIFT`), both fed through the
   SAME `turn5SitrusResettledBounceTick` -> `menuIdleBounce` double
   composition `drawTurn13SwitchinFieldBase` actually uses
   (`battleScene.ts:7042`) - an early transcription that skipped this middle
   step gave nonsense (109/109 mismatches even on the ALREADY-PROVEN-EXACT
   18090-18200 window from §10c); re-deriving the composition correctly
   dropped that sanity check to 0/109, confirming the transcription before
   trusting it against the actual target windows.
3. **Oracle sha probe**: `tools/probe/verify-submenu-bounce.ts` (new,
   committed) - a fresh `bin/oracle run` capture, sha256-only, no RAM and no
   `src/` dependency, checking the plateau/transition SHAPE the CANDIDATE
   model predicts (which ticks share a sha, which don't) against real
   hardware directly - the same style `verify-turn13/14-bounce.ts` already
   established for this exact class of claim.

### 12c. Turn 15 (ISSUES #35): the CANDIDATE model is exact, 0 mismatches,
across the ENTIRE post-reveal window

RAM (`predict(t) = menuIdleBounce(turn5SitrusResettledBounceTick((t - 2) +
TURN14_MENU_REDRAW_RESET_SHIFT))` vs. probed raw `(onixY2, healthboxMainY2)`
at every screen tick 18958-18991, using this dossier's own established
render-lag convention baked into `menuIdleBounce` itself - no extra manual
shift needed once the double composition is right):

| model | mismatches | which ticks |
|---|---|---|
| CURRENT (no shift) | **7 / 34** | exactly `18965, 18966, 18974, 18975, 18983, 18984, 18985` - ISSUES #35's own named family, 1:1, no more no less |
| CANDIDATE (`-2` shift) | **0 / 34** | none |

Ticks 18956-18957 (before the chrome reveal at 18962, see below) still
correctly use the UNSHIFTED formula - both models agree there, so this
finding doesn't touch the pre-reveal branch at all.

**Independent oracle-only confirmation** (`verify-submenu-bounce.ts`, no
RAM): real hardware holds ONE flat sha across `18962-18966` (chrome reveals
at 18962 = `pressTick(18957) + FIGHT_SUBMENU_OPEN_DELAY(5)`, confirmed by a
dense 18955-18967 sha scan - `18956==...==18961` one sha, `18962==...
==18966` a DIFFERENT sha, `18967` a third) - i.e. **18965 and 18966 render
byte-identical to 18962-18964 in real life**; the CURRENT engine's own
premature transition at 18965 is the entire bug. Same shape confirmed at
the other two named clusters: `18967-18975` one flat sha (CURRENT wrongly
transitions at 18974), `18976-18984` one flat sha (CURRENT wrongly
transitions at 18983), and `18985` is a genuine one-tick blip (its own sha,
distinct from both neighbors - the same "one-tick blip at the confirm-
adjacent tick" shape this dossier already documented at turn 13's 17113 and
turn 14's 18087). `verify-submenu-bounce.ts`: **22/22 PASS**.

### 12d. Turn 14 (ISSUES #34's 43-tick remainder): the SAME rule closes a
9-tick subset exactly; 11 ticks are conclusively NOT this bug

Same method, re-pointed at `TURN13_SWITCHIN_RESET_SHIFT` (turn 14's own
pre-confirm anchor) over screen ticks 17719-17758:

| model | mismatches (17722-17757, the pre-confirm/pre-freeze span) | which ticks |
|---|---|---|
| CURRENT (no shift) | **9 / 36** | `17726, 17727, 17735, 17736, 17744, 17745, 17753, 17754, 17755` |
| CANDIDATE (`-2` shift) | **0 / 36** | none |

The confirm press itself (17755) is the single-tick blip (real `(2,1)`,
CURRENT predicts `(1,1)` - one tick too late catching up to the settled
value); `17726/27`, `17735/36`, `17744/45`, `17753/54` are the same
"CURRENT transitions 2 ticks early" shape as turn 15's own three clusters -
five plateaus of ~9 ticks each plus one blip, the SAME shape in both turns
(turn 14's own window is turn 15's, shifted ~1234-1236 ticks earlier -
`18956 - 17722 = 1234`, consistent with the two turns' own different
`RESET_SHIFT` anchors plus ordinary turn-to-turn drift).

**Past 17757, this rule stops applying.** RAM: `turn14KickoffBounceTick`'s
own frozen branch (`t >= pressTick + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY`,
i.e. `t >= 17758`) returns the CONSTANT `TURN5_SITRUS_MENU_REDRAW_TICK`,
which composes to `(onixY2, healthboxY2) = (0,0)` - and RAM shows real
hardware sits at flat `(0,0)` for the entire probed 17758-17770 span. This
is **already exactly correct in the CURRENT code**, with or without this
session's fix (the frozen constant never used `RESET_SHIFT` or
`FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` in the first place - it's a bare anchor
tick, unaffected by either). So ISSUES #34's own 43-tick family splits
cleanly:

- **Explained by this rule (9 ticks, all within 17722-17757)**: `17726,
  17727, 17735, 17736, 17744, 17745, 17753, 17754, 17755` - the CANDIDATE
  model is exact here (0/36 mismatches across the WHOLE 17722-17757 span,
  not just these 9 - the other 27 ticks in that span already coincidentally
  render correctly under the CURRENT unshifted formula too, since shifted
  and unshifted agree there, so they're unaffected by this fix either way).
- **NOT explained (11 ticks, 17758-17768)**: RAM conclusively rules this
  rule out - the governing branch is already provably correct there. A
  genuinely separate, still-uncharacterized bug (large diffs like 2331px at
  17753 turned out to be explained -17753 IS in the 9-tick list above - but
  whatever causes 17758-17768's own pixel mismatches, per #254's own 0/43
  cheap check, remains open).
- `17781-17787` (7 ticks) and `17822-17845` (24 ticks, kerning-class) -
  untouched this session, per ISSUES #34's own existing scope notes.

**Independent oracle-only confirmation** (`verify-submenu-bounce.ts`):
`17722==17727` (CURRENT wrongly transitions at 17726), `17728==17736`
(CURRENT wrongly transitions at 17735), `17737==17745` (CURRENT wrongly
transitions at 17744), `17746==17754` (CURRENT wrongly transitions at
17753), `17755` a genuine one-tick blip, `17756==17757`, and `17757!=17758`
(the freeze boundary, explicitly checked and confirmed OUT of this rule's
scope) - all PASS.

### 12e. The rule (confirmed, not guessed) and fix shape (for the wiring
worker - pure wiring, no new derivation)

**Rule**: `drawTurn14FightSubmenuWindow`'s and `drawTurn15FightSubmenuWindow`'s
own post-reveal, pre-confirm-freeze bounce formula is missing the SAME
`FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` correction every other turn's structurally
identical branch already applies. Three call sites need it, all read-shift
only (no anchor/constant changes):

1. `drawTurn14FightSubmenuWindow` (`battleScene.ts:10959-10960`):
   ```ts
   const shiftedBounceTick = sm.confirmElapsed !== null ? turn14KickoffBounceTick(t, TICK0 + sm.confirmElapsed) : t + TURN13_SWITCHIN_RESET_SHIFT;
   ```
   -> the `: t + TURN13_SWITCHIN_RESET_SHIFT` arm becomes
   `: (t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT) + TURN13_SWITCHIN_RESET_SHIFT`.
2. `turn14KickoffBounceTick` (`battleScene.ts:10878-10881`):
   ```ts
   function turn14KickoffBounceTick(t: number, pressTick: number): number {
     if (t < pressTick + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY) return t + TURN13_SWITCHIN_RESET_SHIFT;
     return TURN5_SITRUS_MENU_REDRAW_TICK;
   }
   ```
   -> the pre-freeze `return` becomes `return (t - FIGHT_SUBMENU_OPEN_BOUNCE_
   SHIFT) + TURN13_SWITCHIN_RESET_SHIFT;` (confirmed load-bearing by 17755's
   own blip - §12d). The frozen `return TURN5_SITRUS_MENU_REDRAW_TICK;` arm
   is UNTOUCHED (§12d's own RAM evidence: already exact).
3. `drawTurn15FightSubmenuWindow` (`battleScene.ts:11061`) and
   `turn15KickoffBounceTick` (`battleScene.ts:10998-11001`): the SAME two
   edits, `TURN14_MENU_REDRAW_RESET_SHIFT` in place of `TURN13_SWITCHIN_
   RESET_SHIFT`.
4. The PRE-reveal branches in both functions (`t < revealTick`, currently
   `t + <RESET_SHIFT>` with no shift) are **NOT** touched - confirmed
   correct as-is by both RAM (§12c's own 18956-18957 sanity ticks) and
   oracle (`18956==...==18961`, the flat pre-reveal chrome sha, unaffected).
   `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` is imported already (`battleScene.ts`
   line 435) - no new import needed.
5. Re-run `verify-submenu-bounce.ts` first (mandatory-first-step, oracle-
   only, unaffected by `src/`) - should stay 22/22 PASS. Then fold the
   predicted-closing ticks into `captureFrames`:
   - `turn15-fly-strike.json`: restore all 7 (`18965, 18966, 18974, 18975,
     18983, 18984, 18985`) - ISSUES #35 predicted CLOSED in full.
   - `turn14-fly-miss.json`: restore the 9 named in §12d
     (`17726, 17727, 17735, 17736, 17744, 17745, 17753, 17754, 17755`) -
     ISSUES #34's own 43-tick family trims to its own honest 34-tick
     remainder (17758-17768 stays excluded, `17781-17787`/`17822-17845`
     untouched).

### 12f. Verification artifacts

`tools/probe/verify-submenu-bounce.ts` (new, committed, oracle-only,
22/22 PASS this session, rerunnable with plain `node --experimental-strip-
types`, no mGBA needed). RAM probe reused `dump-turn14-bounce-driver.py`
verbatim (no new probe script needed - re-pointed via its existing CLI args
at `turn15-fly-strike.json` and different tick ranges); its own Python
formula-transcription/model-fit script was a scratch tool (not committed,
same precedent §8/§10's own scratch fits set - the COMMITTED, re-runnable
pin is the oracle-only `verify-submenu-bounce.ts`). `npm test` 993/993
(unchanged, no `src/` touched), `npm run build` green.

## 13. Wiring close-out (main-lane worker, 2026-07-22) — §12's fix landed,
plus one adjacent bug it exposed

Mandatory-first-step re-run: `verify-submenu-bounce.ts` 22/22 PASS
(unaffected, oracle-only). Wired §12e's fix shape exactly: `turn14Kickoff
BounceTick`'s and `turn15KickoffBounceTick`'s own pre-freeze arms, plus
`drawTurn14FightSubmenuWindow`'s and `drawTurn15FightSubmenuWindow`'s own
post-reveal/pre-confirm arms, all four now read `t - FIGHT_SUBMENU_OPEN_
BOUNCE_SHIFT + <turn's own RESET_SHIFT>` in place of the bare `t + <RESET_
SHIFT>` §12a found missing.

**Turn 15**: `turn15-fly-strike.json` restored all 7 named ticks (18965,
18966, 18974, 18975, 18983, 18984, 18985) clean first try — **183/183, 0
diff**. ISSUES #35 (the "extremum" mismatch this same 7-tick family was
filed under before §12 root-caused it) is now DELETED, not just trimmed —
its whole family closes under this one rule.

**Turn 14 needed two more findings beyond §12e's own literal text** before
its own 9 named ticks (17726, 17727, 17735, 17736, 17744, 17745, 17753,
17754, 17755) actually hit 0 diff:

1. **The pre-reveal branch needs the shift too, when a real press has
   already registered.** §12e's own point 4 says "the PRE-reveal branches
   ... are NOT touched," verified only against turn 15's own 2-tick sanity
   window (18956-18957) where `sm.openElapsed` is null (FIGHT hasn't even
   been pressed yet) — a degenerate case where shifted and unshifted
   formulas coincide, so that evidence never actually constrained the
   OTHER sub-case: `sm.openElapsed !== null && t < revealTick` (FIGHT
   already pressed, chrome not yet visually revealed 5 ticks later). Turn
   14's own real button script presses FIGHT open at 17723 and its own
   chrome doesn't reveal until 17728 (`FIGHT_SUBMENU_OPEN_DELAY`=5) — so
   17726/17727 (2 of the 9 named ticks) render DURING that gap, still
   through the OLD unshifted formula, still 769px wrong, completely
   unmoved by §12e's literal 4-edit fix. Oracle pixels (not just the RAM
   composed-tuple check §12d already ran) prove the shift is live from the
   real open press itself, not from the later chrome-reveal event — split
   `drawTurn14FightSubmenuWindow`'s combined `sm.openElapsed === null ||
   t < revealTick` branch in two, applying the shift only when `sm.openElapsed
   !== null` (post-press, pre-reveal). Closed 17726/17727 exactly, 0
   regression across `turn13-switchin.json`/`turn13-menu.json` (both
   still 240/240, 57/57 — their own analogous pre-reveal windows have
   `sm.openElapsed === null` throughout, so the split is a no-op there).
2. **A genuinely separate, adjacent bug**: `drawTurn14FightSubmenuWindow`'s
   own `drawFightSubmenuChrome` call was passing only 10 `true`s after
   `moveset` where the established per-turn pattern (`turn3Resolved` through
   `turn13Resolved`, one more `true` than the previous turn's own call,
   confirmed by grepping every `drawFightSubmenuChrome(` call site in
   ascending turn order) calls for 11 — `turn13Resolved` itself was silently
   defaulting to `false`. `currentPPForActiveMon`'s own `slot2Uses` therefore
   undercounted DRAGON_BREATH's PP by 1 (19/20 rendered, oracle's real
   18/20) for the WHOLE FIGHT-submenu-open span of turn 14's own reopen —
   a static, per-tick-constant 6px text diff, unrelated to the bounce
   formula, that's why it showed up as an identical 6px/0.02% diff at every
   one of the remaining 7 named ticks (17735-17755) regardless of t. Fixed
   by adding the missing `true` (leaving `turn14Resolved` at its own correct
   default `false` — this turn hasn't resolved yet at any of these ticks).
   This ALSO explained the previously-uncharacterized 11-tick remainder
   (`17758-17768`) ISSUES #34 had ruled OUT of the shift rule's own scope
   (§12d's RAM proved the frozen bounce branch already renders those
   correctly) — same call site, same missing argument, affects every tick
   in the FIGHT-submenu-open window regardless of confirm state. A scratch-
   trace check (not initially part of this rider's scope, run because the
   PP fix was clearly adjacent and cheap to verify) confirmed 11/11 clean;
   folded into the committed trace rather than left stale.

`turn14-fly-miss.json`: **185/185, 0 diff** (was 165/165) — the ENTIRE
43-tick `17722-17768` family ISSUES #34 named is now closed, not just the
9-tick shift subset. `17781-17787` and `17822-17845` (kerning-class) are
untouched, per this session's own scope fence — ISSUES #34 trimmed to
just those two windows.

Verified: `verify-submenu-bounce.ts` 22/22 PASS (re-run, unaffected).
Regression sweep 0 diff: `turn13-switchin.json` 240/240, `turn13-menu.json`
57/57. `npm test` 993/993 (unchanged — no test-literal call sites reference
either fix), `npm run build` green.
