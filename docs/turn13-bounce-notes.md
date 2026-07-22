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

Regression sweep (`turn13-menu` 57/57, `turn13-sandattack` 190/190,
`turn13-dragonbreath-faint` 141/141, `turn12-menu` 46/46), `npm test`
993/993, `npm run build` all green.
