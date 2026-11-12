# ISSUES #97 remainder: `turn5-confirm-off-a`/`-b`'s unattributed pools, class-censused and mechanism-diagnosed

Side-lane instrument session, Battle Scene OFF oracle, at commit `a031f77f`
(the HP-overlay gate fix and the rockslide-text-delay/heal-text fixes have
both landed; per the brief, neither confirm window has been class-censused
since). Analysis only — `git diff -- src/` is empty throughout; the new
probe script under `tools/probe/` and this doc are the whole deliverable.

**Scope**: every mismatched frame in `turn5-confirm-off-a` (window
5958-6089, fresh baseline 60/132, 72 unattributed) and `turn5-confirm-off-b`
(window 6090-6221, fresh baseline 37/132, 95 unattributed), named into
classes, traced to mechanisms with RAM/pixel anchors and app-side fix
shapes at `file:line`.

**Method**: per the standing method — read the actual diff PNGs
(`npm run compare -- <trace> --capture-range A:B --summary`, run fresh in
this worktree's own `workspace/`) before touching any RAM probe, identify
what content differs, cross-reference the app's real dispatch/formulas by
reading `src/engine/battleScene.ts` directly (not guessing), then confirm
with direct pixel sampling (a small throwaway `pngjs` script, not
committed — the committed probe below re-derives the same conclusions from
first principles) and one live RAM probe
(`tools/probe/dump-turn5-resolve-grovyle-side-driver.py`, windowed to
5958-6221, this session's own fresh run). `git diff -- src/` empty
throughout.

## 0. Census — every mismatched frame accounted for

Fresh baselines (commit `a031f77f`, re-confirmed this session):
`turn5-confirm-off-a` **60/132** (72 unattributed), `turn5-confirm-off-b`
**37/132** (95 unattributed). Both traces share the same 76-segment button
script as the rest of the turn5-off family (byte-identical
`TURN5_CONFIRM_PRESS_TICK=5959`), so ticks are directly comparable/
dedupe-able across the two windows.

| class | mechanism | `confirm-off-a` frames | `confirm-off-b` frames | total |
|---|---|---|---|---|
| **1** | ENDEAVOR attacker squish/blend/shake/hitsplat/droplets spuriously rendered (zero RAM basis) + Onix's own post-hit flicker mistimed by the same missing scoped anchor | 54 (6014-6063, 6066-6069) | 0 | **54** |
| **2** | `endeavorHp`'s drain-start-delay uses the generic 153-tick default instead of the turn2/turn3-precedent 116-tick scoped value | 14 (6076-6089) | 94 (6090-6183) | **108** |
| **3 (unattributed)** | turn 5's own confirm-wait submenu-bounce (before `turnKickoffTextStartTick`), never independently oracle-verified | 4 (5959-5961, 5968) | 0 | 4 |
| **4 (accepted, not chased)** | the `rockSlideTextStartTick=6184` hard-cut's own one-tick "PNG(T) shows RAM(T-1)" transition edge — same accepted class as every other hard-cut boundary in this family | 0 | 1 (6184) | 1 |
| **total** | | 72 | 95 | 167 |

Classes 1+2 (162/167, 97%) are fully pinned this session, precedent-matched
bit-for-bit against turn2's/turn3's own already-landed scoped constants.
Class 3 is named and localized but not independently RAM-verified — honest
partial, next instrument given in §3. Class 4 is the same accepted
boundary-tick artifact already documented for `rockSlideTextStartTick`,
`turn5FaintedTextStartTick`, and `TURN5_OFF_SITRUS_*` elsewhere in this
family (`docs/turn5-confirmb-resolved-residuals.md` §1.5) — not re-chased.

## 1. Class 1 — ENDEAVOR's attacker-side animation package should never render for turn 5 (matches turn 2's own already-fixed precedent exactly)

### 1.1 What the pixels show

`app-06053.png` vs `oracle-06053.png` (`npm run compare -- turn5-confirm-off-a
--capture-range 6050:6090`): both sides show identical text
(`"Foe GROVYLE used\nENDEAVOR!"`) and an identical ONIX HP number (`88/117`)
— but Grovyle's own front sprite (top-right) and Onix's own back sprite
(bottom-left) are **solid-silhouette diffs** (`diff-06053.png`), not edge-only
1-2px shifts (the already-understood sine-bounce shape).

Direct RGB sampling (three coordinates inside each sprite's own silhouette,
`(190,30)/(200,35)/(210,25)` for Grovyle, `(60,80)/(75,90)/(85,70)` for
Onix) across every tick 6010-6110:

- **Grovyle's own sprite region is byte-identical in the ORACLE at every
  one of 101 sampled ticks** (`(190,30)` reads `(247,247,255)` — plain
  background, no sprite pixel at all at that coordinate — from 6010
  straight through 6110). Real hardware shows **zero** squish/stretch/
  blend animation for Grovyle's own ENDEAVOR here.
- **The APP actively renders a changing affine-stretch + yellow blend** at
  those same coordinates through the window (e.g. `(190,30)` reads
  `(107,165,148)` at 6040, `(206,165,41)` at 6049, `(156,148,74)` at 6053,
  back to `(247,247,255)` by 6063 once the table goes neutral) — a real,
  actively-evaluated animation with zero oracle basis.
- **Onix's own sprite region in the oracle is static except for a clean,
  periodic invisible/visible cycle** — period 8 (4 ticks invisible, 4
  visible), 4 full cycles, first invisible render tick **6042** (dense
  every-tick sampling 6040-6072, oracle-only, `(60,80)` alternates
  `(255,255,255)`/`(132,123,123)` in lockstep with `(75,90)`/`(85,70)`).
  This is Onix's own real post-hit "flicker" — real, but the app's own
  version of it fires at the wrong ticks (below).

### 1.2 Named mechanism

`drawTurn5EndeavorText` (`battleScene.ts:10440-10465`) calls
`drawEndeavorSquish(fb, t, pressTick, TURN4_ROCKSLIDE_HP.to, bounceTick,
ROCK_SLIDE_MOVE_POWER)` (`battleScene.ts:10453`). Grep confirms this is
`drawEndeavorSquish`'s **only** call site in the entire file — despite the
function's own doc comment (`battleScene.ts:9372-9402`) describing it as
"shared with turn 3" and every call-site doc comment above
`drawTurn5EndeavorText` (`battleScene.ts:10413-10424`) asserting turn 5
"predict[s] a SYMMETRIC shake, matching turn 2's own case exactly" — turn 2
and turn 3 do **not** actually call this function today. They already
dropped it, and an existing doc comment on turn 2's own equivalent branch
names exactly why:

> `battleScene.ts:9659-9668`: "ISSUES #39 rank-6 slice 2: ENDEAVOR's own
> attacker squish/blend/droplets and the target's own hitsplats
> (`drawEndeavorSquish`'s attacker-side content) are class (c) for turn 2's
> own Scene-OFF window (**pixel-confirmed absent**, oracle frames 3000-3026
> match cleanly once the call is skipped — banked ISSUES #39) — never
> called here... `drawEndeavorSquish` itself, shared with turn 3/turn 5 (S7
> slice G/K, **both still ON this slice**), is untouched."

That comment is dated (turn 3 has since *also* dropped it —
`drawTurn3EndeavorText`, `battleScene.ts:9787-9805`, uses the same
idle-content + wobble + flicker structure turn 2 uses, no squish call
anywhere) — **turn 5 is now the only remaining caller**, and this
session's fresh pixel evidence (§1.1) independently reproduces the exact
same "class (c), zero RAM basis" finding ISSUES #39 already made for turn
2, for turn 5's own window.

The flicker itself (Onix's own post-hit invisibility toggle) is real and
turn-2/turn-3 both keep it — but through a **separate, scoped** call
(`endeavorOnixInvisible(t, pressTick, TURN2_OFF_ENDEAVOR_FLICKER_START)` /
`TURN3_OFF_ENDEAVOR_FLICKER_START`, both `=82`), not the shared function's
own internal, unparameterized call (`battleScene.ts:9410`,
`endeavorOnixInvisible(t, pressTick)`, silently defaulting to
`ENDEAVOR_FLICKER_START=119`). Turn 5's own real flicker (§1.1) starts at
render 6042: `n = (t-1) - pressTick - start = 0` at `t=6042`,
`pressTick=5959` → `start = 82` — **bit-for-bit the same value** turn 2/3
already use (`TURN2_OFF_ENDEAVOR_FLICKER_START = TURN2_OFF_ENDEAVOR_
HEALTHBOX_BOUNCE_START(81) + 1 = 82`, `battleSceneCanonical.ts:91-93,1015`).

### 1.3 Verification

`tools/probe/analyze-turn5-confirm-endeavor-drain-flicker.ts` cross-checks
the proposed `start=82` flicker formula against all 33 sampled ticks
(6040-6072) and confirms the existing `TURN2_OFF_ENDEAVOR_FLICKER_START`/
`TURN3_OFF_ENDEAVOR_FLICKER_START` constants are exactly `82` — zero fitting,
pure precedent match. Run:
`node --experimental-strip-types tools/probe/analyze-turn5-confirm-endeavor-drain-flicker.ts`
— prints `PASS`.

### 1.4 App-side fix shape

Rewrite `drawTurn5EndeavorText`'s no-rockslide branch
(`battleScene.ts:10450-10462`) to mirror `drawTurn3EndeavorText`'s own
already-correct structure (`battleScene.ts:9787-9805`) instead of calling
`drawEndeavorSquish`:

```diff
-  const bounceTick = turn5KickoffBounceTickFromLatest(t, pressTick, latestCompletedCommandHandoff);
-  const onixHp = endeavorHp(t, pressTick, TURN5_ENDEAVOR_HP.from, TURN5_ENDEAVOR_HP.to);
-  if (drawEndeavorSquish(fb, t, pressTick, TURN4_ROCKSLIDE_HP.to, bounceTick, ROCK_SLIDE_MOVE_POWER)) {
-    drawPlayerHealthboxHpOverlay(fb, onixHp, endeavorHealthboxBounceY2(t, pressTick));
-  } else {
-    drawActionMenuIdleContentFromLatest(
-      fb,
-      bounceTick,
-      latestCompletedCommandHandoff,
-      onixHp,
-    );
-  }
+  const bounceTick = turn5KickoffBounceTickFromLatest(t, pressTick, latestCompletedCommandHandoff);
+  const onixHp = endeavorHp(t, pressTick, TURN5_ENDEAVOR_HP.from, TURN5_ENDEAVOR_HP.to, TURN5_OFF_ENDEAVOR_HP_DRAIN_START_DELAY);
+  drawActionMenuIdleContentFromLatest(
+    fb,
+    bounceTick,
+    latestCompletedCommandHandoff,
+    onixHp,
+  );
+  if (endeavorOnixInvisible(t, pressTick, TURN5_OFF_ENDEAVOR_FLICKER_START)) {
+    eraseSpriteFootprint(fb, onixBackSprite.tileset, ONIX_MATERIALIZE_CORNER);
+  }
+  const wobbleY2 = endeavorHealthboxBounceY2(t, pressTick, TURN5_OFF_ENDEAVOR_HEALTHBOX_BOUNCE_START);
+  if (wobbleY2 !== 0) {
+    drawMenuHealthboxPlayerWobble(fb, wobbleY2);
+    drawPlayerHealthboxHpOverlay(fb, onixHp, wobbleY2);
+  }
```

Three new turn5-scoped constants (`battleSceneCanonical.ts`, next to their
turn2/turn3 siblings — new names, not edits to the shared ones, matching
this family's own "mint a scoped constant, don't touch the shared default"
convention used everywhere else, e.g. `TURN5_OFF_ROCKSLIDE_TEXT_DELAY`,
`TURN5_OFF_SITRUS_*`):

```ts
export const TURN5_OFF_ENDEAVOR_HP_DRAIN_START_DELAY = 116; // == TURN2/TURN3_OFF's own value, §2
export const TURN5_OFF_ENDEAVOR_HEALTHBOX_BOUNCE_START = 81; // == TURN2/TURN3_OFF's own value
export const TURN5_OFF_ENDEAVOR_FLICKER_START = TURN5_OFF_ENDEAVOR_HEALTHBOX_BOUNCE_START + 1; // = 82
```

(§2 below covers the HP-drain-delay part of this diff; it's included here
too since both land in the same function-body rewrite.)

`endeavorOnixInvisible`, `eraseSpriteFootprint`, `onixBackSprite`,
`ONIX_MATERIALIZE_CORNER`, `drawMenuHealthboxPlayerWobble`,
`endeavorHealthboxBounceY2`, and `drawActionMenuIdleContentFromLatest` are
all already imported/defined in `battleScene.ts` (turn2/turn3's own call
sites use every one of them) — no new imports needed beyond the three
constants above.

**Follow-up cleanup (not required to land the fix, flagged for the fix
worker's own judgment):** once turn 5 stops calling `drawEndeavorSquish`,
it has **zero** remaining callers — `ENDEAVOR_SQUISH_TABLE`,
`ENDEAVOR_BLEND_COLOR`, `ENDEAVOR_SQUISH_START_DELAY`, `endeavorShakeX2`,
`endeavorShakeSteps`, `drawEndeavorHitsplats`, `ENDEAVOR_HITSPLAT_*`,
`drawEndeavorDroplets`, `endeavorDropletCenter`, and `drawEndeavorSquish`
itself would all become dead code, the same "confirmed genuinely
unreferenced after the branch removal" situation
`docs/turn5-resolve-offc-tail-diagnosis.md` §11 already hit for
`TURN5_STRETCH_TABLE`. Not deleted by this analysis-only session; a grep
re-check (`grep -n "drawEndeavorSquish\|ENDEAVOR_SQUISH\|ENDEAVOR_HITSPLAT\|drawEndeavorDroplets\|endeavorDropletCenter\|endeavorShakeSteps\|endeavorShakeX2" src/engine/battleScene.ts`)
before landing will confirm whether it's still 100% dead at that point.

## 2. Class 2 — `endeavorHp`'s drain-start-delay needs turn 5's own scoped override (same value turn 2/3 already use)

### 2.1 What the pixels show

Direct HP-digit reads off fresh oracle PNGs:

| tick | oracle ONIX hp | app (current, pre-fix) hp |
|---|---|---|
| 6053 | 88 | 88 |
| 6120 | 43 | 80 |
| 6150 | 13 | *(not read — formula predicts 88, still pre-drain)* |
| 6183 | 1 | *(not read — formula predicts 88, still pre-drain)* |

At `oracle-06120.png` (`turn5-confirm-off-b --capture-range 6120:6135`),
Onix's own HP box reads **`43/117`**; the app's own box at the same tick
reads **`80/117`** — the overlay *is* painting (item 5's HP-overlay gate
fix already landed), but with a stale, too-slow-to-start value.

### 2.2 Named mechanism

`endeavorHp(t, pressTick, startHp, endHp, startDelay = ENDEAVOR_HP_DRAIN_
START_DELAY)` (`battleMenu.ts:2721-2724`) is a plain linear 1-HP/tick drain
starting at `pressTick+startDelay`. Turn 5's own call
(`battleScene.ts:10452`, `endeavorHp(t, pressTick, TURN5_ENDEAVOR_HP.from,
TURN5_ENDEAVOR_HP.to)`) passes **no** override — it silently falls back to
the shared default, `ENDEAVOR_HP_DRAIN_START_DELAY = 153`
(`battleMenu.ts:2705`). Turn 2 and turn 3 both already pass their own
scoped override at their own call sites
(`battleScene.ts:9715`/`:9787`, `TURN2_OFF_ENDEAVOR_HP_DRAIN_START_DELAY`/
`TURN3_OFF_ENDEAVOR_HP_DRAIN_START_DELAY`, both `=116`,
`battleSceneCanonical.ts:91,99`) — the exact same "missing override,
shared default used instead" class as residual A in
`docs/turn5-confirmb-resolved-residuals.md` §1 (the rockslide-text-delay
fix) and item 3 in `docs/turn5-family-class3-diagnosis.md` (the Sitrus
epoch fix).

Fitting the 4 oracle-read anchors (§2.1's table plus `6150→13`, `6183→1`,
both read this session) to `endeavorHp`'s own linear formula: rate is
confirmed exactly 1 HP/tick (`6120→43`, `6150→13`: `Δhp=30` over
`Δt=30`); solving for `startDelay` from any anchor gives
`88-(6120-(5959+d))=43 → d=116` — **bit-for-bit the same value** turn 2/3
already use. `endHp=1` clamp confirmed by `6183→1` (already settled, no
longer draining).

### 2.3 Verification

`tools/probe/analyze-turn5-confirm-endeavor-drain-flicker.ts` calls the
real, unmodified `endeavorHp` export with the proposed `startDelay=116` and
checks all 4 anchors — `PASS` at every one (§1.3 above covers the same run;
one script proves both class 1's flicker-start and class 2's drain-delay
together, since both land in the same function-body edit).

### 2.4 App-side fix shape

Covered by §1.4's diff above (the `onixHp` line): change

```diff
-  const onixHp = endeavorHp(t, pressTick, TURN5_ENDEAVOR_HP.from, TURN5_ENDEAVOR_HP.to);
+  const onixHp = endeavorHp(t, pressTick, TURN5_ENDEAVOR_HP.from, TURN5_ENDEAVOR_HP.to, TURN5_OFF_ENDEAVOR_HP_DRAIN_START_DELAY);
```

using the same new `TURN5_OFF_ENDEAVOR_HP_DRAIN_START_DELAY = 116` constant
§1.4 already specifies.

### 2.5 Predicted counts

- `confirm-off-a` (6076-6089, 14 frames): predicted exact match — the
  HP-digit read is the *only* difference in this sub-span once class 1's
  own animation window has gone neutral (`local >= ~50` in
  `ENDEAVOR_SQUISH_TABLE`, i.e. render ≥ ~6064) and the flicker has already
  finished (last real invisible tick 6069, §1.1).
- `confirm-off-b` (6090-6183, 94 frames — the trace's **entire** mismatch
  set except the accepted 6184 transition edge): predicted exact match —
  every frame in this span sits strictly after both class 1's own window
  (ends ~6069) and strictly before the `rockSlideTextStartTick=6184`
  hard-cut, so the HP digit (plus the healthbox-bar length it drives) is
  the only content that can differ once it's corrected.

## 3. Class 3 — turn 5's own confirm-wait submenu bounce (5959-5961, 5968) — named, localized, NOT fix-ready

### 3.1 What's there

Before `drawTurn5EndeavorText` is even reachable, `drawFightSubmenuWindow`'s
own confirm-wait tail (`battleScene.ts:8628-8678`) renders for
`pressTick <= t < turnKickoffTextStartTick(pressTick)` =
`[5959, 5969)` (`FIGHT_CONFIRM_TEXT_DELAY=10`, `battleMenu.ts:1162,1172`) —
the FIGHT submenu's own move list, still on screen, with its OWN idle-bounce
overlay driven by `turn5KickoffBounceTickFromLatest(t, pressTick, latest)`
(`battleScene.ts:8646-8647,10364-10388`). `turn5-action-off.json`'s own
capture window ends at **5957** — one tick *before* this 10-tick span even
opens (`5959-5968`) — so this specific sub-window has never been
independently oracle-verified by any prior session's "closed" bounce work.

Mismatches: 3 frames (5959-5961, small, bbox `44,49-229,110`, ~2360px) then
6 matching ticks (5962-5967), then 1 large one-tick spike (5968, the last
tick of this branch, bbox `1,113-238,158`, 10930px/28%). This
3-wrong/6-right/1-hugely-wrong shape is consistent with the same
sine-bounce-index-offset family already fixed elsewhere in this trace
family (`docs/turn5-bounce-recalibration-probe.md`'s `+60`/`+109`
corrections) reaching a different, not-yet-covered call site
(`turn5KickoffBounceTickFromLatest`, a distinct formula from the already-
corrected `menuIdleBounce`/`bounceIndexOffset` machinery) — **not
confirmed this session**.

### 3.2 Next instrument

Extend `tools/probe/analyze-turn5-resolve-dispatch-app-series.ts`'s own
pattern (or a small sibling) to also compute
`turn5KickoffBounceTickFromLatest`'s exact inputs
(`epochAge`, `MENU_IDLE_BLANK_END_TICK`, `TURN5_LEGACY_PRESENTATION_
CONTINUATION_LAG`, `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT`) at ticks 5959-5968,
then RAM-probe the real `sinIndex`/`onixY2`/`healthboxY2` for this specific
10-tick window (the same struct `dump-turn5-6-reopen-bounce-driver.py`
already reads) to confirm whether this is the same raw-sine-index-offset
class or something new. Not attempted this session — 4 frames, small,
honestly flagged rather than guessed at.

## 4. Regression guards

- `drawEndeavorSquish`'s **only** call site is `battleScene.ts:10453`
  (grep-confirmed) — removing that one call cannot reach any other turn's
  own window.
- `TURN5_OFF_ENDEAVOR_HP_DRAIN_START_DELAY`/`_HEALTHBOX_BOUNCE_START`/
  `_FLICKER_START` are new, turn5-off-scoped constants — turn 2/3's own
  `TURN2/3_OFF_ENDEAVOR_*` triples are untouched by construction (same
  values, different named constants, per this family's own "mint, don't
  share" convention).
- `endeavorHp`'s own shared default (`ENDEAVOR_HP_DRAIN_START_DELAY=153`,
  `battleMenu.ts:2705`) is untouched — only turn 5's own call site now
  passes an explicit override, mirroring turn 2/3's own call sites exactly.
- Traces with windows entirely before 6014 or entirely after 6184
  (`turn5-action-off` 5926-5957, `turn6-reopen-off`, `turn5-reset-off`)
  cannot reach either changed branch at all.
- `turn5-resolve-off-a/-b/-c/-d` windows (6222-7005) sit entirely after
  `rockSlideTextStartTick=6184`, inside `drawTurn5RockSlideWindow` — a
  structurally separate function this fix does not touch.
- `turn4-doubleteam-off`/`turn4-rockslide-off`/`turn13-switchin`: no path
  through `drawTurn5EndeavorText` at all (different turns) — included in
  the PASS/FAIL list purely as the standing hard-guard family.

## 5. Rerunnable PASS/FAIL

```sh
cd workspace   # THIS worktree's own workspace/ — verify with `npm prefix` first
node --experimental-strip-types tools/probe/analyze-turn5-confirm-endeavor-drain-flicker.ts   # expect PASS (both formulas)
npm run compare -- turn5-confirm-off-a --summary   # PASS = strictly > 60/132, predicted ~128/132
npm run compare -- turn5-confirm-off-b --summary   # PASS = strictly > 37/132, predicted ~131/132
npm run compare -- turn5-resolve-off-a --summary   # regression guard, expect unchanged 44/196
npm run compare -- turn5-resolve-off-b --summary   # regression guard, expect unchanged 88/196
npm run compare -- turn5-resolve-off-c --summary   # regression guard, expect unchanged 195/196
npm run compare -- turn5-resolve-off-d --summary   # regression guard, expect unchanged 142/196
npm run compare -- turn5-action-off --summary      # regression guard, expect unchanged 32/32
npm run compare -- turn6-reopen-off --summary       # regression guard, expect unchanged 46/46
npm run compare -- turn5-reset-off --summary        # regression guard (control), expect unchanged 256/256
npm run compare -- turn13-switchin --summary        # regression guard, expect unchanged 242/242
npm run compare -- turn4-doubleteam-off --summary   # regression guard, expect unchanged 256/256
npm run compare -- turn4-rockslide-off --summary    # regression guard, expect unchanged 256/256
```

## 6. Verdict

Classes 1+2 together are **complete and fix-ready**, both precedent-matched
bit-for-bit against turn 2's/turn 3's own already-landed scoped constants
(`116`/`81`/`82` — zero new numbers invented, only reused under new
turn5-scoped names) and independently confirmed three ways: turn 2's own
existing ISSUES #39 doc comment (already found the squish/blend/droplets/
hitsplat content absent for its own window), this session's fresh direct
pixel sampling (Grovyle's sprite region byte-identical across 101 oracle
ticks; Onix's own flicker a clean, exact period-8 cycle), and a
from-scratch linear-fit of the HP-drain rate/anchor against 4 independently
read oracle HP digits. One committed, rerunnable verification script
(`analyze-turn5-confirm-endeavor-drain-flicker.ts`) proves both formulas
exactly. Predicted: `turn5-confirm-off-a` 60/132 → **~128/132**,
`turn5-confirm-off-b` 37/132 → **~131/132** — 162 of the 167 previously-
unattributed frames explained and landable from this doc alone. The
remaining 5 frames (class 3's 4-frame confirm-wait bounce, class 4's
1-frame accepted transition edge) are honestly reported as open, with class
3's own next instrument named in §3.2.

**No landed anchor was contradicted.** `TURN2_OFF_ENDEAVOR_HP_DRAIN_START_
DELAY`/`_HEALTHBOX_BOUNCE_START`/`_FLICKER_START` and the ISSUES #39
squish-removal precedent are all pre-existing, already-landed, correct
constants/decisions this session did not previously know applied to turn
5's own window too — recorded here as new evidence (turn 5 needs the same
treatment), not a contradiction of any prior finding. The `RAM probe`
(`dump-turn5-resolve-grovyle-side-driver.py`, windowed 5958-6221, this
session) confirms `gBattleMons[0].hp` (Onix, battler 0) is a hard STEP in
RAM (flat 88 through tick 6163, flat 1 from 6164) — this does **not**
contradict the DISPLAYED HP being a live, animated drain (§2); the real
game updates the stat instantly but visually animates the health bar
toward it over subsequent frames, exactly the behavior `endeavorHp`'s own
linear formula (already used correctly by turn 2/3) already models.

## 7. Landed (2026-08-18, bounded MAIN worker, ISSUES #97 remainder)

Classes 1+2 landed byte-for-byte as this doc's own §1.4/§2.4 diffs
specify: `TURN5_OFF_ENDEAVOR_HP_DRAIN_START_DELAY`(116)/`_HEALTHBOX_
BOUNCE_START`(81)/`_FLICKER_START`(82) added to `battleSceneCanonical.ts`,
`drawTurn5EndeavorText` rewritten per §1.4's diff. Verification script
(`analyze-turn5-confirm-endeavor-drain-flicker.ts`) reconfirmed PASS before
and after landing. `drawEndeavorSquish`/`drawEndeavorHitsplats`/
`ENDEAVOR_HITSPLAT_ROUNDS` deleted (grep-confirmed genuinely unreferenced
post-rewrite — the squish table/blend color/shake/droplet helpers survive,
still used by the separate Scene-ON ENDEAVOR staged path, so NOT all of
§1.4's follow-up cleanup list died as speculated). `turn5-confirm-off-a`
60/132 → **128/132** (predicted ~128, exact). `turn5-confirm-off-b` 37/132
→ **131/132** (predicted ~131, exact). Zero decreases across the full
guard family (§5's list rerun in full). Two new Tier-1 pin blocks
(`tests/battleScene.test.ts`, describe block importing `endeavorHp`/
`endeavorHealthboxBounceY2`/`endeavorOnixInvisible` directly — the latter
two newly exported from `battleScene.ts` for this purpose). Class 3 (4
frames) and class 4 (1 frame) remain open exactly as predicted — see
ISSUES #97 sub-entry K for the full ledger.
