# Rank-5 Scene-OFF effect-visibility census (turns 9-12 AERIAL_ACE/QUICK_ATTACK/ROCK_SLIDE loop)

Bounded side-lane scout, per the supervisor's brief (round 5, S6): answer the
three named questions for `docs/battle-scene-retirement-inventory.md`'s rank-5
row and its "Scene-OFF effect visibility policy" blocked-work bullet, propose
a **bounded, PROPOSED** policy, and stop — no `src/` edits, no policy decided
unilaterally. All work below is new files + oracle queries against the
assigned `battle-scene-off` oracle (`http://127.0.0.1:8014`, confirmed via
`POKEBENCH_ORACLE_URL`/`POKEBENCH_ORACLE_PROFILE`).

## 0. A load-bearing fact the brief's own citations obscure

The rank-5 row's "dense committed pin(s)" — `turn9-quickattack.json` **169**,
`turn9-rockslide.json` **130**, `turn10-aerialace.json` **93**,
`turn10-rockslide.json` **220**, etc. — are **not** Scene-OFF pins. None of
the four `tools/compare/traces/turn{9,10}-*.json` files sets an
`oracleProfile` field (checked directly: `json.load(...).get("oracleProfile")
== None` for all four). Per `AGENTS.md`'s own explicit rule ("Historical
traces without that field remain ON-profile traces so their established frame
contract does not silently change") and `tools/compare/oracleClient.ts:115`/
`tools/compare/run.ts:108` (`trace.oracleProfile ?? "battle-scene-on"`), every
one of these pins is a **Battle-Scene-ON** fixture — captured before the
ON/OFF lane split existed, fitting `battleScene.ts`'s hand-drawn
lunge/clone/hitsplat/slice/palette-darken code (confirmed by reading
`docs/turn9-shake-notes.md` and `docs/aerial-ace-notes.md`, both of which
RAM-probe genuine Scene-ON-only mechanisms: OAM tie-breaking between
translucent clone sprites, `BLDALPHA` blend coefficients, `gPlttBufferFaded`
palette pulses — none of this exists when `HITMARKER_NO_ANIMATIONS` is set,
per §1 below). So today, `battleScene.ts`'s turns 9-12 region is a **Scene-ON
fit living inside code that both lanes (`main`, `side`) only ever validate
against a Scene-OFF oracle**. This doesn't make the rank-5 row wrong — the
inventory's own "Scene-OFF effect visibility policy" bullet is asking the
right question — but it does mean the *current* pins cannot answer it: they
were never run against `POKEBENCH_ORACLE_URL`. §2 below runs them there for
the first time (script-identical, oracle-identical replay, no state override
per `AGENTS.md`'s battle-lab rules — same button presses, canonical Scene-OFF
snapshot).

## 1. Source ground truth (file:line, literate C, not summarized)

**The single gate.** `gHitMarker |= HITMARKER_NO_ANIMATIONS` is set once, at
battle init, straight from the Options-menu setting, and never toggled
per-move:

```
reference/pokeemerald/src/battle_main.c:3079-3086
    if (!(gBattleTypeFlags & BATTLE_TYPE_RECORDED))
    {
        if (!(gBattleTypeFlags & BATTLE_TYPE_LINK) && gSaveBlock2Ptr->optionsBattleSceneOff == TRUE)
            gHitMarker |= HITMARKER_NO_ANIMATIONS;
    }
```

**What the flag skips — the move's own animation script.**
`Cmd_attackanimation` (`B_SCR_OP_ATTACKANIMATION`, the `attackanimation`
battle-script opcode every damaging move's script calls) is the **sole**
gate on `BtlController_EmitMoveAnimation` — the controller command that
dispatches into `gBattleAnims_Moves[gCurrentMove]`, i.e. the move's own
lunge/clone/hitsplat/slice/darken-palette/rock-prop choreography:

```
reference/pokeemerald/src/battle_script_commands.c:1743-1798 (Cmd_attackanimation)
    if ((gHitMarker & HITMARKER_NO_ANIMATIONS) && (gCurrentMove != MOVE_TRANSFORM && gCurrentMove != MOVE_SUBSTITUTE))
    {
        BattleScriptPush(gBattlescriptCurrInstr + 1);
        gBattlescriptCurrInstr = BattleScript_Pausex20;   // <- short fixed pause, NO controller emit
        gBattleScripting.animTurn++;
        gBattleScripting.animTargetsHit++;
    }
    else
    {
        ...
        BtlController_EmitMoveAnimation(B_COMM_TO_CONTROLLER, gCurrentMove, ...);   // <- only reached when Scene ON
        ...
    }
```

Under `HITMARKER_NO_ANIMATIONS` (every move except TRANSFORM/SUBSTITUTE —
irrelevant to this window), the controller **never receives a move-animation
command at all**: it substitutes `BattleScript_Pausex20`, a fixed short
delay, for whatever real-time the full animation would have taken. This is
the single mechanism responsible for both "no move body renders" and "the
whole turn's timing compresses" (confirmed empirically in §2).

**What stays regardless of the flag — two separate, unconditional emits.**
Neither of the next two commands checks `HITMARKER_NO_ANIMATIONS` anywhere in
its body:

```
reference/pokeemerald/src/battle_script_commands.c:5558-5576 (Cmd_hitanimation)
static void Cmd_hitanimation(void)
{
    gActiveBattler = GetBattlerForBattleScript(gBattlescriptCurrInstr[1]);
    if (gMoveResultFlags & MOVE_RESULT_NO_EFFECT) { gBattlescriptCurrInstr += 2; }
    else if (!(gHitMarker & HITMARKER_IGNORE_SUBSTITUTE) || ...)
    {
        BtlController_EmitHitAnimation(B_COMM_TO_CONTROLLER);   // unconditional re Scene
        MarkBattlerForControllerExec(gActiveBattler);
        gBattlescriptCurrInstr += 2;
    }
    ...
}
```
which the target's own controller answers with the target's generic
hit-reaction (`battle_controller_player.c:2861-2873`,
`PlayerHandleHitAnimation` → `DoHitAnimHealthboxEffect(gActiveBattler)` +
`gBattlerControllerFuncs[gActiveBattler] = DoHitAnimBlinkSpriteEffect` —
the healthbox-border wobble and the target sprite's own invisible-blink
flicker, both already ported and named in `battleScene.ts` as
`TURN9_EP2_HEALTHBOX_WOBBLE_*`/`TURN9_EP2_FLICKER_*`, see §3), and

```
reference/pokeemerald/src/battle_script_commands.c:1807-1841 (Cmd_healthbarupdate)
    ... BtlController_EmitHealthBarUpdate(B_COMM_TO_CONTROLLER, healthValue);   // unconditional re Scene
```
which drives the ordinary HP-bar drain (`PlayerHandleHealthBarUpdate`,
`battle_controller_player.c:2697-2724`, `SetBattleBarStruct`). Message text
(`printstring`/`waitmessage`) is likewise never gated by the flag anywhere in
`battle_script_commands.c`.

**The rule, stated once:** under Battle Scene OFF, a damaging move's script
still runs `attackanimation` → `waitanimation` → `hitanimation` →
`healthbarupdate` → `printstring` in the same order as Scene ON, but
`attackanimation` substitutes a fixed short pause for the real animation, so
**the move's own dedicated animation body (whatever `gBattleAnims_Moves[]`
contains: lunge, clone/afterimage sprites, hitsplat + its shake task,
cutting-slice sprite, palette-darken pulse, rock-prop drop sprites) never
reaches the controller at all** — while the hit-reaction flicker/wobble, the
HP-bar drain, and all message text render exactly as they do on Scene ON,
just compressed into a shorter overall window.

## 2. Oracle confirmation (fresh runs against the assigned Scene-OFF oracle, twice-run determinism checked)

Re-ran the **verbatim, unmodified** pinned scripts (`tools/compare/traces/
turn9-quickattack.json`, `tools/compare/traces/turn10-aerialace.json` — same
segments, same button presses) through `bin/oracle run` with
`POKEBENCH_ORACLE_PROFILE=battle-scene-off` (this session's exported default,
confirmed via `bin/oracle --profile battle-scene-off info` succeeding) — i.e.
against `POKEBENCH_ORACLE_URL` (8014), for the **first time these exact
scripts have been run against the OFF oracle** (§0). `bin/oracle run` reads
`--profile`/env, not the trace's own `oracleProfile` field, so this is a
genuine cross-profile replay of the same inputs, not a different script.
`turn9-quickattack.json` re-run twice back-to-back: **0/169 sha mismatches**
— deterministic, same as every other oracle probe in this codebase.

### turn9 QUICK_ATTACK (Pidgeotto → Onix)

Extended capture (new file, `tools/compare/scratch/
rank5-turn9-quickattack-wide-off.json` — turn9-quickattack.json's own 88
segments, `captureFrames` widened to stride-2 over 10930-11440, the oracle's
256-capture cap) plus the pinned 10818-10986 dense range:

- **Frames 10877 (pre-move), 10930 (kickoff text fully typed), 10950, 10970**
  — the exact two ticks `docs/turn9-notes.md`'s own (later-superseded, see
  its own correction in `docs/turn9-shake-notes.md`) claim cited as showing
  "Pidgeotto's own sprite streaks/blurs" — are **visually identical** under
  Scene OFF: Pidgeotto and Onix's sprites sit in their resting positions,
  only the message box differs from the pre-move baseline. Pixel-diffed
  10930 vs. 10970 directly: **1579px changed, bbox `(127,229)×(74,110)`** —
  exactly the healthbox region (`HEALTHBOX_BOX` from `docs/
  turn9-shake-notes.md`), i.e. the generic idle healthbox-border motion, not
  a sprite move.
- **Hitsplat/shake window (RAM 10934-10943 in the ON dossier — "Episode 1",
  coincides with the hitsplat's own creation)**: diffed against the
  10877 baseline at every requested tick 10918-10985 — **flat at exactly
  10718px the entire span**, i.e. **zero extra pixels change** where the ON
  capture shows the hitsplat sprite + Onix's own `x2=5` shake appearing and
  disappearing. The move's own hit-effect body is absent, exactly as §1
  predicts (it lives inside `gBattleAnims_Moves[MOVE_QUICK_ATTACK]`, gated by
  `attackanimation`).
- **Healthbox wobble + sprite flicker window ("Episode 2" in the ON
  dossier, RAM 10957-10977, `Cmd_hitanimation`'s own generic
  effect)**: **present** under Scene OFF, at the same relative tick offset
  from the kickoff press — the wide capture's sha sequence alternates
  `118674761faa`/`17807fbabf19` across renders 10956-10978 (matches
  the ON dossier's own "3-block-of-4" cadence), confirming this generic
  mechanism is NOT gated by the Scene flag, exactly as §1's `Cmd_hitanimation`
  citation predicts.
- **Content match, not just presence**: several OFF-capture shas are
  **byte-identical** to shas `docs/turn9-notes.md`/`docs/turn9-shake-notes.md`
  cite for the ON capture's own generic content, just at earlier absolute
  ticks — OFF render 11026 = `12b7204322f9` (ON's own cited "not very
  effective" settled-hold sha, cited at ON tick 11028); OFF render 11108 =
  `95efd4fe0a13` (ON's own cited "ONIX used ROCK SLIDE!" box-open transition
  sha, cited at ON tick 11110). The generic text/HP content the two profiles
  render is **the same pixels**, just time-shifted — confirming §1's "same
  script order, compressed timing" rule directly, not merely by inference.
- **ROCK_SLIDE's own rock-prop drop animation** (ON dossier: "rock-prop
  animation... first visible between 11150-11154, still present at 11250,
  gone by 11274", under the held `81aaa90be45f` kickoff-text sha): under
  Scene OFF, the **same** sha `81aaa90be45f` holds constant from render 11128
  through 11128-~11206 (broken only by the same generic wobble/flicker
  alternation seen above, `6f20bbbb7382`/`54dc8a804ef5`, not a rock sprite) —
  no rock-prop content ever appears. ROCK_SLIDE's own move-specific body is
  absent too, same rule, same evidence shape.
- **Total compression, decisively confirmed**: OFF render **11336** already
  shows sha `f97541a1f42d` — the ON dossier's own cited sha for the **fully
  settled turn-10 menu**, which ON doesn't reach until render **11450**
  (114 ticks later). The entire QUICK_ATTACK-impact → ROCK_SLIDE-kickoff →
  ROCK_SLIDE-impact → super-effective-message → menu-resettle sequence that
  spans ~620 ticks under Scene ON completes in well under 500 under Scene
  OFF, purely from `attackanimation`'s substitution of a fixed pause for each
  move's own (highly variable-length) animation.

### turn10 AERIAL_ACE (Pidgeotto → Onix, the row's other named move)

Ran the pinned `turn10-aerialace.json` (93 captures, 12345-12437) unmodified
against the OFF oracle. Directly viewed frames 12345 (kickoff text just
shown), 12395, 12424, and 12432 (last capture, HP already at 14/117): **all
four show only the static field art + message box + healthbox**, no cutting
slice, no lunge, no clone/afterimage, no field-darken. Sha-dedup over the
full manifest: content is flat at the kickoff-text sha from 12345 straight
through **12409**, where it returns to **the exact same sha as 12345**
(`5d89f7e89485`) — i.e. the screen is pixel-identical to its own pre-effect
state after the window where `docs/aerial-ace-notes.md`'s own five
mechanisms (elliptical lunge, target shake, two afterimage clones, background
palette-blend pulse, the "cutting slice" sprite) would have fired under Scene
ON (RAM ~12360-12407 per that dossier's own delay constants). The only
non-baseline content in that span is the same generic wobble/flicker
alternation (12388-12408, matching turn9's own shape) — no move body renders.
HP-bar drain (12423-12432) is present and ordinary.

**Net for both examined moves + ROCK_SLIDE's own rock-prop body**: the
oracle **directly confirms** §1's source rule. Under Scene OFF, zero
move-specific visual content (dash/lunge, hitsplat, afterimage clone,
cutting-slice sprite, field-darken palette pulse, rock-prop drop) renders,
for any of the three moves this rank-5 row names. What renders is exactly:
generic menu/message chrome, the generic post-hit healthbox-wobble +
target-flicker, and the generic HP-bar drain — all at compressed timing
relative to the ON-profile pins currently checked into `battleScene.ts`.

**Scope honesty**: only turns 9-10 (QUICK_ATTACK, AERIAL_ACE, and turn 9's
own ROCK_SLIDE half) were directly re-run this session — turns 11-12's own
ROCK_SLIDE/FEATHER_DANCE repeats were **not** independently re-run against
the OFF oracle (time-boxed). §1's source rule is move-agnostic (the
`attackanimation` gate has no move-specific branch beyond the
TRANSFORM/SUBSTITUTE exception, neither of which appears in turns 9-12), so
the same conclusion should hold structurally, but this is an inferred
extension, not independently oracle-confirmed for turns 11/12 specifically —
flagged for whoever picks up the next slice to spot-check before relying on
it as settled.

## 3. Current renderer classification (`battleScene.ts`, turns 9-12 region, read-only)

Function/table inventory for the rank-5 window (`battleScene.ts:11313-13302`,
via `grep -n '^function draw\|^export function turn\|^const TURN\|^export const TURN'`
restricted to that range), classified against §1's rule and cross-checked
against §2's empirical presence/absence:

| Class | What | Representative lines | Scene-OFF oracle status (§2) |
| --- | --- | --- | --- |
| (a) generic chrome | `drawTurn9FieldBase`/`drawTurn10FieldBase` (field art, healthbox base), `drawTurn9FightSubmenuWindow`/`drawTurn10FightSubmenuWindow` (menus), `drawMessageTextLines` calls, `TURN9_QUICKATTACK_LINE1/2`/`TURN10_AERIALACE_LINE1/2`/`TURN9_NOTVERYEFFECTIVE_LINE` text tables | `battleScene.ts:11647`, `12411`, `13108`, `11670-11671`, `12556-12557`, `12258` | **present**, content pixel-matches (§2) |
| (b) generic hit choreography | `turn9Ep2HealthboxWobbleY2`/`turn9Ep2OnixInvisible` (healthbox wobble + flicker, the `Cmd_hitanimation` pair), `turn9OnixHp`/`turn10AerialAceOnixHp` (HP-bar drain, `Cmd_healthbarupdate`) | `battleScene.ts:12184-12239` (Ep2 wobble+flicker), `12241-12256` (HP drain), `12578-12595` (turn10 HP drain) | **present**, but timing constants (`TURN9_EP2_HEALTHBOX_WOBBLE_START=86`, `TURN9_HP_DRAIN_START_DELAY=121`, etc.) are fit to the **ON**-profile pins — §2 shows OFF's own timing compresses, so these exact delay constants do not carry over unchanged |
| (c) move-specific effect body | `drawTurn9QuickAttackAnimation` (lunge + two blended clone slots), `drawTurn9Hitsplat`, `turn9Ep1OnixShakeX2` (the hitsplat-coincident target shake — distinct from Ep2's generic wobble), `drawTurn10AerialAceLungeAndClones`, `drawTurn10AerialAceSlice`, `turn10AerialAcePaletteDarkenCoeff` (field-darken pulse), `turn10AerialAceOnixShakeY2`, the `rockSlideRockState`/`drawRockSprite` rock-prop loop in `drawTurn9RockSlideAttack`/(turn10/11 analogues) | `battleScene.ts:12076` (QUICK_ATTACK anim), `12137` (hitsplat), `12170-12183` (Ep1 shake), `12720` (AERIAL_ACE lunge/clones), `12900` (slice), `12837` (darken), `12364-12368` (rock props) | **empirically absent** from every Scene-OFF capture taken this session (§2) — these functions currently draw content the OFF oracle never shows |

`turn10AerialAceOnixShakeY2`/`TURN10_ONIX_SHAKE_*` (`12801-12820`) is worth
flagging as a genuine ambiguity rather than force-classified: `docs/
aerial-ace-notes.md` lists Onix's own shake as one of AERIAL_ACE's five named
"mechanisms" (i.e. plausibly part of the move's own animation script, class
c) rather than the generic `Cmd_hitanimation` wobble (class b) — this
session's own oracle evidence (§2) is content-level, not per-mechanism
RAM-attributed the way `docs/turn9-shake-notes.md` did for turn 9's Ep1/Ep2
split, so it cannot itself disambiguate turn 10's shake from turn 9's
already-resolved Ep1-vs-Ep2 split. Practically moot for the policy proposal
below either way: whether it's (b) or (c), no visible-content evidence this
session shows it firing under Scene OFF at a materially different cadence
than the already-classified (b) wobble/flicker pair, since AERIAL_ACE has no
distinct hitsplat-coincident episode the way QUICK_ATTACK does. Flagged, not
resolved — the next worker who wires this row should re-run turn10's own RAM
probe (`dump-endeavor-tail.py`-style) against the OFF oracle before trusting
either classification for an exact timing constant.

## 4. Proposal — **PROPOSED, not decided**

Given §1 (source rule: `attackanimation` is the only gate, unconditional on
move identity beyond TRANSFORM/SUBSTITUTE) and §2 (direct oracle confirmation
for QUICK_ATTACK, AERIAL_ACE, and ROCK_SLIDE's rock-prop body, all absent
under Scene OFF):

**The OFF-route owner for turns 9-12 should render classes (a) + (b)
generically (menus/text/healthboxes + the hit-reaction wobble/flicker/HP
drain, all already-generic mechanisms with precedent elsewhere in this
codebase's own resolution/command adapters) and render NOTHING for class (c)
— the class-c list is these N call sites**: `drawTurn9QuickAttackAnimation`,
`drawTurn9Hitsplat`, `turn9Ep1OnixShakeX2`, `drawTurn10AerialAceLungeAndClones`,
`drawTurn10AerialAceSlice`, `turn10AerialAcePaletteDarkenCoeff`, the
`rockSlideRockState`/`drawRockSprite` rock-prop loop (all four turns'
ROCK_SLIDE windows), and turn10AerialAceOnixShakeY2` pending the
disambiguation named in §3 — **all of it deletable** for an honest Scene-OFF
retirement, not merely "not yet ported."

**Consequences for retiring the rank-5 window:**
- This is good news for the retirement, not a blocker in the shape the
  inventory's blocked-work bullet implied: the "policy decision" isn't a
  judgment call between two valid renderings, it's **source- and
  oracle-forced** — class (c) is empty by rule, so there's no design space to
  adjudicate.
- The genuine remaining work is **re-timing**, not re-designing: class
  (b)'s wobble/flicker/HP-drain constants (`TURN9_EP2_*`, `TURN9_HP_DRAIN_
  START_DELAY`, `TURN10_AERIALACE_HP_DRAIN_START_DELAY`, etc.) are fit to the
  **wrong oracle profile** today (§0, §2's compression finding) — a slice
  that ports this row to a generic Scene-OFF-owned presentation needs FRESH
  delay constants derived from OFF pins (the same RAM/pixel-fit convention
  every prior rank used, just re-run against 8014 instead of 8012), not the
  current ON-fit tables.
- **Before any of this lands as a fix**, the rank-5 row's own "dense
  committed pin(s)" need new, explicit `oracleProfile: "battle-scene-off"`
  traces (turns 9-12, all four+ moves) — today's pins stay valid as
  Scene-ON fixtures (the animation lane's own concern; do not delete them),
  but they cannot serve as the acceptance pins for a Scene-OFF retirement of
  this row, since §0 shows they were never testing that oracle.
- This proposal does **not** itself choose whether the eventual OFF-route
  owner is a new typed adapter (matching rank 1-4's own pattern) or a
  trimmed version of the existing hand-drawn functions — that implementation
  choice, and the actual re-timing work, is left to whoever the
  supervisor/user assigns the wiring slice to.

## Verification

`npm test` and `npm run build` (run after this doc, see commit) — no `src/`
changes this session. New files only: this doc, `tools/compare/scratch/
rank5-turn9-quickattack-wide-off.json` (the wide-capture trace used in §2,
reproducible via `bin/oracle run tools/compare/scratch/
rank5-turn9-quickattack-wide-off.json -o <dir>` against the Scene-OFF
oracle). `git status` shows only these two new files plus this doc.
`turn9-quickattack.json` re-run twice back-to-back against the OFF oracle:
**0/169 mismatches** (determinism check). All frame/sha citations above are
this session's own fresh `bin/oracle run` output against `POKEBENCH_ORACLE_
URL` (confirmed 8014/`battle-scene-off` via `bin/oracle --profile
battle-scene-off info`), not assumed from the ON-profile dossiers (which are
cited only for their own tick/sha claims, cross-checked, never trusted
blind).
