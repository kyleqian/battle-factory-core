# Rank-4 prep-scout: ground truth + consumer map for the Turns 6-8 Pidgeotto loop

New-files-only prep-scout for `docs/battle-scene-retirement-inventory.md` row
4 (Turns 6-8 Pidgeotto loop, `battleScene.ts:10548-11312` at the census pin,
now `10824-11588` at this session's `HEAD` — pure line drift from intervening
sessions' growth elsewhere in the file, not a content change; re-verified
directly below, not re-cited). Feeds the same rank-N pipeline rank-2
(`turn13ResolutionAdapter.ts`) and rank-3 (`turn5ResolutionAdapter.ts` +
`2fa31c96`'s groundwork message) already proved: real staged kernel chains
first, equivalence-proof second, flip last. No `src/` production file is
touched this session; every claim below is verified against this worktree's
own `HEAD` by grep, by reading the actual source, or by a scratch stage
(`node --experimental-strip-types`, code inlined per finding, none committed).

## 0. Headline correction to the inventory's own row 4

The inventory's "Missing bridge" cell says only "SAND_ATTACK proves only an
accuracy-drop subshape; do not jump directly to the whole loop." That
warning is about the **generic bridge function**, and on that narrow point
it is already obsolete: `presentationEventWindowBridge.ts`'s
`resolveFeatherDanceKickoffPresentationWindowContent` (added 2026-07-27,
commit `29236922`, for turn 6's own ATTACK-down case) was reused **unchanged**
one day later by SAND_ATTACK's own ACCURACY-down case (commit `e50bf210`,
`turn13SandAttackPresentationStaging.ts:6-7,111-114`: "reads this window's
own content from the result via `presentationEventWindowBridge.ts`'s
(UNCHANGED) `resolveFeatherDanceKickoffPresentationWindowContent`"). The
bridge generalizes across stat-down magnitude/stat-id already, proven by two
independent real callers, not asserted by analogy. **The generic bridge is
not rank 4's remaining gap.** What actually remains, precisely pinned below:
turn 6's own kickoff+ATK-fell **text** is already wired (§1.1, §3); the
**stat-fall banner** (the animated arrow, not the text) is not, for a
concrete, cross-cutting reason (§2.3); turns 7/8's own repeat FEATHER_DANCE
call sites still read pre-kernel hand literals directly, not the same
kernel-derived constants turn 6's own call site now reads (§1.1); the
ROCK_SLIDE tail (turns 6/7) and BIND (turn 8) have no staging module yet, but
both stage cleanly through **already-existing, unmodified** kernel/bridge
surface, scratch-proven below (§1.2, §1.3).

## 1. Ground truth per turn (kernel side)

Canonical battle 1, Onix (battler 0, player) vs. the switched-in PIDGEOTTO
(battler 1, opponent, Speed 77 vs. Onix's 76 — Pidgeotto acts first every
turn, `docs/turn6-notes.md` §4). Source docs (RAM+pixel dossiers, already
committed, reused not re-derived): `docs/turn6-notes.md`,
`docs/turn7-notes.md`, `docs/turn8-notes.md`.

### Turn 6 — FEATHER_DANCE (Pidgeotto -> Onix) then ROCK_SLIDE (Onix -> Pidgeotto, hits)

- Pidgeotto's FEATHER_DANCE (`EFFECT_ATTACK_DOWN_2`, opponent-targeted, no
  damage): Onix's ATK stage 6 -> 4 (first use). Real dispatch entry
  `BattleScript_EffectAttackDown2` (`reference/pokeemerald/data/
  battle_scripts_1.s:958-960`) -> `goto BattleScript_EffectStatDown`.
  `docs/turn6-notes.md` §3/§4.
- Onix's ROCK_SLIDE (real hit): Pidgeotto 156 -> 113 HP (-43, super-effective
  Rock-vs-Flying x2). Real dispatch entry the same `BattleScript_
  HitFromAtkCanceler`-family chain turns 1/3/4/5 already use.
  `docs/turn6-notes.md` §3/§4.
- 11 `Random()` calls total this turn (`docs/turn6-notes.md` §3), no residual
  multi-turn state carried out of this turn.
- **Staging status, FEATHER_DANCE half**: `turn6FeatherDancePresentationStaging.ts`
  stages the real chain end-to-end (own hand-rolled `rulesContext`,
  `selectorRoles:{attacker:1,target:0}` — Pidgeotto/opponent is the
  attacker) and exports `resolveTurn6FeatherDanceKickoffLines()` /
  `resolveTurn6AtkFellLines()`. **Both are wired into production** —
  `battleScene.ts:2211` (`const [TURN6_FEATHERDANCE_KICKOFF_LINE1, ...] =
  resolveTurn6FeatherDanceKickoffLines()`) and `:2229`
  (`resolveTurn6AtkFellLines()`), consumed by `drawTurn6FeatherDanceKickoffText`
  at `:10994,10996`. This is a genuine correction to the module's own header
  comment (`turn6FeatherDancePresentationStaging.ts:12-15`, "the ATK-fell
  text ... stays unwired") — that comment predates `docs/presentation-seam-
  scout.md` §12.6 (`2368-2461`), which landed the ATK-fell wiring in a later
  session than the module doc's own last edit; confirmed live by grep
  against `HEAD`, not by trusting the stale comment.
- **Staging status, ROCK_SLIDE half (Onix -> Pidgeotto)**: no dedicated
  module exists (`find src/engine -iname '*turn6*rockslide*'` — nothing;
  only `turn1/turn3/turn4RockSlidePresentationStaging.ts` exist). **Scratch-verified
  this session** that it needs zero new kernel/bridge surface — turn 6's own
  real pre-turn battler snapshot (`docs/turn6-notes.md` §4) staged through
  the **existing, unmodified** `stagePlayerHitChainToTerminalMachineState`
  (`turn1RockSlidePresentationStaging.ts:223`) with `currentMove: 157`
  (ROCK_SLIDE) reaches a clean terminal state and
  `resolveRockSlidePresentationWindowContent` (`presentationEventWindowBridge.ts:85`)
  resolves a real `{message:{messageId:"STRINGID_USEDMOVE"},hp:{battler:1,from:156,to:...}}`
  triple — event-kind sequence: `message, set-battler-pp-data, animation,
  play-se, animation, health-bar-update, hp-change, message,
  set-battler-sprite-visibility, set-battler-sprite-visibility`. (Probe used
  an arbitrary RNG seed to inspect shape only, not turn 6's real seed, so the
  damage value it produced is not the real 43 — a real module needs the real
  seed the same way `turn6FeatherDancePresentationStaging.ts` derived its own
  from `docs/turn6-notes.md` §3.) This is the SAME shape rank-1's own
  `turn1-rockslide.json` window already retired, just a new target/HP pair —
  a mechanical `turn6RockSlidePresentationStaging.ts` following turn1/3/4's
  own established template, not new plumbing.

### Turn 7 — repeats turn 6 exactly (2nd FEATHER_DANCE, 2nd ROCK_SLIDE, hits)

- Identical move pair, identical effect codes, identical RNG-consumption
  shape (11 calls) as turn 6, just cumulative stat state carried forward:
  Onix's ATK stage enters at 4, drops to 2 (2nd `EFFECT_ATTACK_DOWN_2`); WHITE_HERB
  does NOT trigger (it restores the **holder's own** lowered stats — Pidgeotto
  holds it but it's Onix's stat that's lowered). ROCK_SLIDE: Pidgeotto
  113 -> 82 HP (-31). `docs/turn7-notes.md` §3/§4.
- **New finding in the source dossier, load-bearing for rank 4's own message
  correctness**: turn7-notes.md §5 CORRECTS turn6-notes.md's own claim about
  message-box transition framing (only a 4-frame shared prefix between
  box-opens, not a full 26-frame match) — a pixel-timing finding, not a
  content finding; the actual message CONTENT itself (kickoff text, "fell"
  text) is unaffected and still resolves identically each turn (`statFellBuff2`'s
  own magnitude check only cares about `|to-from|`, always 2 here, so
  "harshly fell!" every time regardless of the actual from/to values).
- **Staging status**: `drawTurn7FeatherDanceKickoffText`
  (`battleScene.ts:11227-11244`) does **NOT** call
  `turn6FeatherDancePresentationStaging.ts`'s kernel-derived constants — it
  reads the OLDER hand literals directly, `TURN6_FEATHERDANCE_LINE1/2`
  (`battleScene.ts:10883-10884`) and `TURN6_ATKFELL_LINE1/2`
  (`battleMenu.ts:1603-1604`, includes the curly `’` glyph), NOT the
  kernel-derived `TURN6_FEATHERDANCE_KICKOFF_LINE1/2` /
  `TURN6_ATKFELL_KICKOFF_LINE1/2` turn 6's own call site now uses
  (`battleScene.ts:10994,10996`). `docs/presentation-seam-scout.md` §12.6
  confirms this split deliberately ("only `drawTurn6FeatherDanceKickoffText`'s
  own one call site was retired ... `TURN6_ATKFELL_LINE1/2` stay defined and
  in active use by turn 7's and turn 8's own repeat-FEATHER_DANCE call
  sites"). Because the rendered TEXT is turn-invariant (same messageId, same
  magnitude-driven wording) this is currently a **safe but not-yet-real**
  situation: the literal happens to match what a real turn-7 stage would
  produce, but nothing proves it from turn 7's own facts. The established,
  precedented fix is NOT a literal-swap — it's `turn11FeatherDancePresentationStaging.ts`'s
  own pattern (a byte-identical copy of `turn6FeatherDancePresentationStaging.ts`
  with only the entering ATK stage changed, there 0 for the floored 4th use)
  repeated for turn 7's own entering stage (4) and turn 8's own (2) real
  scenarios, each with its own real RNG seed from `docs/turn7-notes.md` §3 /
  `docs/turn8-notes.md` §3 — narrow, mechanical, already proven exactly twice
  (turns 6 and 11).
- ROCK_SLIDE tail: same "reuses the existing unmodified `stagePlayerHitChainToTerminalMachineState`
  shape" finding as turn 6 (§1 above) — not re-probed separately, same
  mechanism, different HP pair (113 -> 82).

### Turn 8 — repeats FEATHER_DANCE a 3rd time, then BIND (Onix -> Pidgeotto, MISSES)

- Pidgeotto's 3rd FEATHER_DANCE: Onix's ATK stage 2 -> 0 (hits the floor
  exactly, but the "won't go any lower!" message variant does NOT fire —
  `ChangeStatBuffs`'s own floor check reads the stage BEFORE this
  application's decrement, source-traced to
  `reference/pokeemerald/src/battle_script_commands.c:7040`,
  `docs/turn8-notes.md` §4). Text is still the ordinary "harshly fell!".
- Onix's BIND (`EFFECT_TRAP`, accuracy 75, NOT 85 as `battle-turn-notes.md`'s
  own prose once mis-cited — `docs/turn8-notes.md` §3 corrects this):
  **misses**. Real dispatch entry `BattleScript_EffectTrap`
  (`reference/pokeemerald/data/battle_scripts_1.s:830-836`:
  `setmoveeffect MOVE_EFFECT_WRAP` then `goto BattleScript_EffectHit` — the
  shared generic hit-chain entry, not literally
  `BattleScript_HitFromAtkCanceler`, a related but different label).
  8 `Random()` calls this turn (3 fewer than 6/7 — no crit/damage/secondary
  rolls fire on a miss). `docs/turn8-notes.md` §3/§4.
- **BIND's on-hit trap effect and its end-of-turn residual damage tick are
  NOT exercised on this canonical line** (the accuracy check misses) — but
  BOTH are already fully kernel-ported, not a gap, confirmed two ways this
  session:
  1. Static: `MOVE_EFFECT_WRAP` handling exists in
     `battleScriptHitChainOpcode.ts:270,2956,3675-3713` (sets
     `status2 |= STATUS2_WRAPPED_TURN(...)`, stamps `wrappedMove`/`wrappedBy`);
     the end-of-turn residual (`ENDTURN_WRAP`) is fully implemented in
     `battleEndTurnOrchestration.ts:757-783` (`runWrapTick`, decrements the
     counter, branches to `BattleScript_WrapTurnDmg` (`floor(maxHP/16)`
     damage) or `BattleScript_WrapEnds`, sourced from
     `reference/pokeemerald/src/battle_util.c:1592-1621`).
  2. **Dynamic, scratch-staged this session** (`BattleScript_EffectTrap`
     entered directly via `createBattleScriptRulesContext` +
     `createBattleScriptStatusRulesExecution` + `stepBattleScriptMachine`,
     the same primitives every `turnNPresentationStaging.ts` module already
     uses, Onix attacking Pidgeotto's real turn-8 stats): a miss-producing
     seed reaches a clean terminal state emitting
     `message{STRINGID_USEDMOVE}, set-battler-pp-data, message{STRINGID_ATTACKMISSED},
     set-battler-sprite-visibility, set-battler-sprite-visibility` — matching
     turn 8's real canonical outcome exactly; a hit-producing seed (same
     scenario, different seed) also reaches a clean terminal state, this time
     emitting `..., animation, play-se, animation, health-bar-update,
     hp-change, message{STRINGID_PKMNSQUEEZEDBYBIND}, ...` — the trap on-hit
     branch. **Both branches stage cleanly with zero new opcode work.**
- **Staging status**: no `turn8BindPresentationStaging.ts` module exists yet.
  `TURN8_BIND_LINE1/2` ("ONIX used\nBIND!", `battleScene.ts:11444-11445`) and
  `TURN8_MISS_LINE1/2` ("ONIX’s\nattack missed!", `:11482-11483`, curly
  apostrophe) are still hand literals — but per the scratch stage above, both
  are directly reachable from a real staged chain today; `STRINGID_ATTACKMISSED`
  already has ONE generic production consumer proving the resolution pattern
  (`battleResolutionPresentation.ts:397-400`, a different call site — rank
  1/2's resolution presenter, not this window). The gap is presentation-side
  only (§2.4 names it exactly): no `presentationEventWindowBridge.ts` sibling
  keyed on a miss/kickoff pair, and `stagePlayerHitChainToTerminalMachineState`'s
  own `ENTRY_LABEL` const (`turn1RockSlidePresentationStaging.ts:79`,
  hardcoded to `"BattleScript_HitFromAtkCanceler"`) does not cover
  `BattleScript_EffectTrap`, so BIND staging needs either a new local
  hand-rolled module (turn6 FEATHER_DANCE's own pattern) or a small
  entry-label parameter added to the shared helper.
- FEATHER_DANCE kickoff/ATK-fell text: same "reads turn 6's own hand literals
  directly, not its own real staged facts" situation as turn 7 (§ above).

### Cross-turn gap, stated once (applies to all three FEATHER_DANCE uses)

`stagePlayerHitChainToTerminalMachineState` (`turn1RockSlidePresentationStaging.ts:223-282`)
hardcodes `attacker.side:0`, `target.side:1`, `selectorRoles:{attacker:0,
target:1}`, `scriptingBattler:0` — i.e. **player-attacks-opponent only**.
Every FEATHER_DANCE module (`turn6`/`turn11FeatherDancePresentationStaging.ts`)
is opponent-attacks-player (Pidgeotto -> Onix) and hand-rolls its own local
`battler()`/`createBattleScriptRulesContext` call rather than reusing a
shared helper, because no shared "opponent attacker" helper exists. This is
the concrete, named form of the brief's "opponent-as-attacker chains" staging
gap — not a kernel gap (the same `createBattleScriptRulesContext`/
`createBattleScriptStatusRulesExecution` primitives underneath handle either
side symmetrically, `selectorRoles` is a plain input), a missing
**shared staging-module convenience** only, currently worked around by
duplicating ~150 lines of local scaffolding per module (confirmed by diffing
`turn6FeatherDancePresentationStaging.ts` against
`turn11FeatherDancePresentationStaging.ts` — same `battler()`/`externalPorts()`/
main-loop shape, copy-pasted, not shared).

## 2. Consumer map (render side)

`battleScene.ts` region for this window family at this session's `HEAD`
(drift from the inventory's `10548-11312` census pin is pure line growth
elsewhere in the file — re-verified live by grep, not re-cited): the turn-6
functions start at `drawTurn6ActionMenuIdleWindow` (`:10824`) and the
turn-6-8 family's last function, `drawTurn8TurnEndSettledMenu`, ends at
`:11588`.

| Window / function | Hand literal or constant | Line(s) | Adapter/bridge fact that would replace it |
| --- | --- | --- | --- |
| Turn 6 FEATHER_DANCE kickoff text | `TURN6_FEATHERDANCE_KICKOFF_LINE1/2` | `battleScene.ts:2211` (resolved), consumed `:10996` | **Already replaced** — `resolveTurn6FeatherDanceKickoffLines()` (`turn6FeatherDancePresentationStaging.ts:335`) |
| Turn 6 ATK-fell text | `TURN6_ATKFELL_KICKOFF_LINE1/2` | `battleScene.ts:2229` (resolved), consumed `:10994` | **Already replaced** — `resolveTurn6AtkFellLines()` (`turn6FeatherDancePresentationStaging.ts:355`) |
| Turn 6 stat-fall banner (arrow/flash) | `drawTurn6StatFallBanner`'s own hardcoded ONIX corner + `decrease`/`attack` palette-tilemap keys | `battleScene.ts:10966-10974` | `stat-stage-change{battler:0,stat:"attack",from:6,to:4}` (already emitted, already read for the TEXT above) — but see §2.3, real cross-cutting blocker, not a simple swap |
| Turn 6 ROCK_SLIDE kickoff text | `ROCK_SLIDE_LINE1/2` | `battleMenu.ts:1655-1656`, consumed `battleScene.ts:11085` | `resolveRockSlidePresentationWindowContent(...).message` — scratch-proven reachable (§1), needs a `turn6RockSlidePresentationStaging.ts` staging module |
| Turn 6 ROCK_SLIDE "super effective" text | `TURN6_SUPER_EFFECTIVE_LINE` | `battleMenu.ts:2324`, consumed `:11083` | No existing bridge signal for type-effectiveness text; not exercised by the FEATHER_DANCE/SAND_ATTACK bridge precedent, a genuinely separate small gap |
| Turn 6 post-ROCK_SLIDE Pidgeotto HP | `TURN6_PIDGEOTTO_AFTER_ROCKSLIDE_HP = 113` | `battleScene.ts:11001`, consumed `:11033,11053,11165` (turn 7's field base reuses it too) | `resolveRockSlidePresentationWindowContent(...).hp.to` — same staging module as the kickoff text above |
| Turn 7 FEATHER_DANCE kickoff/ATK-fell text | reads turn 6's OWN hand literals directly, `TURN6_FEATHERDANCE_LINE1/2` / `TURN6_ATKFELL_LINE1/2` | `battleScene.ts:11240,11242` | Needs `turn7FeatherDancePresentationStaging.ts` (own real entering-ATK-stage-4 stage, own seed) — NOT a call-site swap to the turn-6 kernel constants (§1, "safe but not real" note) |
| Turn 7 ROCK_SLIDE kickoff text | `ROCK_SLIDE_LINE1/2` (shared with turn 6) | `battleScene.ts:11318` | Same `resolveRockSlidePresentationWindowContent` shape, own HP pair |
| Turn 7 "super effective" text | `TURN6_SUPER_EFFECTIVE_LINE` (shared) | `battleScene.ts:11316` | Same gap as turn 6's own row |
| Turn 7 post-ROCK_SLIDE Pidgeotto HP | `TURN7_PIDGEOTTO_AFTER_ROCKSLIDE_HP = 82` | `battleScene.ts:11247`, consumed `:11269,11289,11360` (turn 8's field base reuses it) | Same ROCK_SLIDE staging module family, own HP pair |
| Turn 8 FEATHER_DANCE kickoff/ATK-fell text | reads turn 6's OWN hand literals directly (same as turn 7) | `battleScene.ts:11429,11431` | Needs `turn8FeatherDancePresentationStaging.ts` (own entering-ATK-stage-2, own seed) |
| Turn 8 BIND kickoff text | `TURN8_BIND_LINE1/2` | `battleScene.ts:11444-11445`, consumed `:11539` | `message{STRINGID_USEDMOVE}` from a new BIND staging module — scratch-proven reachable this session (§1) |
| Turn 8 miss text | `TURN8_MISS_LINE1/2` (curly apostrophe) | `battleScene.ts:11482-11483`, consumed `:11537` | `message{STRINGID_ATTACKMISSED}` — same staging module; needs a new `presentationEventWindowBridge.ts` sibling resolver (no existing one keys on a kickoff+miss pair) |
| All 3 turns' tick anchors (`TURN6_ROCKSLIDE_PRESS_TICK`, `TURN7_ROCKSLIDE_PRESS_TICK`, `TURN8_BIND_PRESS_TICK`, every `*_TEXT_DELAY`/`*_MENU_REDRAW_DELAY`) | numerous, e.g. `battleScene.ts:11444-11460` | throughout | **Out of scope for any kernel/bridge fact** — semantic events carry no ticks (already established by §8.4 Option A in `presentation-seam-scout.md`, re-confirmed for this window family by §12.6's own step-4 finding); these stay hand-fit render timing, same as every already-retired window |
| Turn 6/7/8 PP values (ROCK_SLIDE 6→5→4→4(frozen), FEATHER_DANCE 15→14→13→12, BIND 20→19) | threaded via the FIGHT-submenu's own `turnNResolved` boolean chain into `currentPPForActiveMon` (`battleScene.ts:7460-7490`, per the inventory's own "remaining owner chain" section) | n/a (not this window's own draw functions) | Same rank-1/6 PP-reconstruction owner already named a blocker for ranks 1 and 6; not solvable inside rank 4 alone |

### 2.3 Why the stat-fall banner (not just its text) resists a simple swap

`drawTurn6StatFallBanner` (`battleScene.ts:10966-10974`) wraps
`drawStatDecreaseBannerForBattler` with ONIX's own hardcoded sprite
corner/mask and the `decrease` tilemap + `attack` palette keys. The kernel's
own `stat-stage-change` event already carries `battler:0, stat:"attack"` —
exactly consistent, but that consistency is currently
**assertable, not enforced** (`presentation-seam-scout.md` §12.6's own
finding, re-confirmed live by re-reading the current source, not re-cited
blindly): `drawTurn6StatFallBanner` is a **shared** function, called
UNCHANGED by turn 7's (`:11236`) and turn 8's (`:11425`) own draw functions
with the identical `eva`/`pressTick` shape. Threading a real kernel-derived
stat/direction parameter through it needs either editing turn 7/8's own call
sites too (three call sites, not one — disproportionate to a "wire one
window" step) or building a `stat-stage-change`'s hyphenated stat-name type
(`"attack"|"special-attack"|...`, `battleScriptEvents.ts:148`) to
`StatAnimBannerAsset`'s camelCase palette-key type (`spAttack`/`spDefense`,
confirmed still camelCase at `HEAD`) translation table for six stat values
this exact window will never produce. Real, not hypothetical — the
"disproportionate new surface" finding is a fact about this window's own
call graph, not a hedge.

### 2.4 The one genuinely new bridge-function shape rank 4 needs

Every existing `presentationEventWindowBridge.ts` resolver keys on
`{message, hp}` (ROCK_SLIDE-shape) or `{message, statChange[, statFellMessage]}`
(stat-shape). BIND's miss window needs a **third** shape:
`{message: kickoff, missMessage: STRINGID_ATTACKMISSED}` — no `hp`, no
`statChange`. Confirmed there is no such resolver today (read the whole
241-line file this session, not grepped for absence). This is a small,
additive sibling function, same "answer from provenance, never a turn
number" discipline every existing resolver already follows — `sourceLabel`
for the miss variant is `BattleScript_PrintMoveMissed`
(present in the compiled program, confirmed by this session's own label
lookup, §1).

## 3. Slice plan

Recommended order, narrowest full-proof first, each with its own pins
(from the inventory's row 4, `docs/battle-turn-notes.md` §28 and its own
per-window `npm run compare` counts) and named blocking gaps:

1. **Turn-6 ROCK_SLIDE tail (Onix -> Pidgeotto)** — `turn6-rockslide-a/b.json`
   (255/105). Blocking gaps: **none** — scratch-proven this session to reach
   a clean terminal state through the existing, unmodified
   `stagePlayerHitChainToTerminalMachineState` +
   `resolveRockSlidePresentationWindowContent`, the exact mechanism rank 1
   already retired three times over (turns 1/3/4) and rank 3 a fourth
   (turn 5). Needs only a new `turn6RockSlidePresentationStaging.ts`
   following that established template, with turn 6's own real seed
   (`docs/turn6-notes.md` §3, tick 7763's entering value — needs one LCG
   inversion the same way `turn6FeatherDancePresentationStaging.ts`'s own
   `STAGED_RNG_SEED` doc already demonstrates the technique for this exact
   dossier). **This is the narrowest full-proof slice, narrower than the
   brief's own suggested first slice** — it reuses 100% pre-existing surface,
   versus FEATHER_DANCE's own remaining banner gap (§2.3).
2. **Turn-6 FEATHER_DANCE stat-fall banner** — `turn6-statfall.json`
   (127/127). Blocking gap: the shared-caller/naming-mismatch problem named
   exactly in §2.3, already investigated and reported (not landed) by
   `presentation-seam-scout.md` §12.6. Not narrower than slice 1 — do this
   only after deciding whether to (a) accept editing 3 call sites, or
   (b) build the stat-name translation table; either is real, scoped work,
   not a quick win.
3. **Turn-7 and turn-8's own repeat FEATHER_DANCE staging** — `turn6-feathers.json`
   (235), plus whatever the turn-7/8 kickoff windows' own dense pins turn out
   to be (not enumerated as separate trace names in the row-4 census; the
   inventory's T7/T8 pins are the ROCK_SLIDE/BIND tails, not this kickoff
   text specifically — confirm the exact trace before starting). Blocking
   gap: needs two new staging modules
   (`turn7FeatherDancePresentationStaging.ts`, `turn8FeatherDancePresentationStaging.ts`),
   each a copy of `turn6FeatherDancePresentationStaging.ts`'s own template
   with the real entering ATK stage (4, then 2) and real seed
   (`docs/turn7-notes.md` §3, `docs/turn8-notes.md` §3) substituted — the
   exact mechanical step `turn11FeatherDancePresentationStaging.ts` already
   proved once for the stage-0 case. Text output will be byte-identical to
   turn 6's own (same messageId, same magnitude), so this slice's value is
   provenance correctness (deriving the literal from THIS turn's own real
   facts, not turn 6's), not a pixel change — say so plainly when scoping it,
   don't oversell it as a visible fix.
4. **Turn-7 ROCK_SLIDE tail** — `turn7-rockslide-a/b/c/d.json`
   (256/256/256/19). Same mechanism as slice 1, own HP pair (113 -> 82), own
   seed (`docs/turn7-notes.md` §3). No new gap beyond slice 1's.
5. **Turn-8 BIND kickoff + miss** — `turn8-bind-a/b.json` (256/66). Blocking
   gaps, both concrete and scoped, no kernel work: (a) a new
   `resolveMoveMissedPresentationWindowContent`-shaped sibling in
   `presentationEventWindowBridge.ts` (§2.4); (b) a new
   `turn8BindPresentationStaging.ts` staging module entering at the real
   `BattleScript_EffectTrap` label directly (scratch-proven clean this
   session, §1) rather than through `stagePlayerHitChainToTerminalMachineState`'s
   own hardcoded `ENTRY_LABEL` (needs either a parallel local rulesContext
   setup, turn6-FeatherDance's own pattern, or a one-line addition of an
   entry-label parameter to the shared helper — a real design choice for
   whoever lands this, not resolved here). BIND's own real turn-8 seed
   (miss) still needs deriving via LCG inversion from `docs/turn8-notes.md`
   §3's tick-9844 entering value, same technique as every prior module.
6. **Menu/PP threading across all three turns** — out of THIS rank's own
   scope; shares the `turnNResolved`-chain PP-reconstruction owner the
   inventory already names as blocking ranks 1 and 6 (`battleScene.ts:7460-7490`).
   Do not attempt inside a rank-4 slice; it is a cross-rank dependency, not a
   rank-4-local gap.

Everything above is additive, following the exact established per-window
templates (`turn1/3/4/5RockSlidePresentationStaging.ts`,
`turn6/11FeatherDancePresentationStaging.ts`) — no new kernel opcode, no new
`presentationEventWindowBridge.ts` shape beyond the one named in §2.4, no
`BattleScenario`/round-core change. Slices 1 and 4 (the ROCK_SLIDE tails) are
the strongest immediate next step: zero new bridge surface, zero new kernel
work, purely "stage the real chain, write the equivalence test, flip the
call site" — the same shape rank 1/2/3 already proved is production-ready.
