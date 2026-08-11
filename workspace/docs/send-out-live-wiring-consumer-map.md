# Send-out intro live-wiring consumer map (ISSUES #71, main-lane share)

Ground-truth + consumer-map scout for ISSUES #71. All citations are against
this worktree's base sha **`4fe0e206`** (`git rev-parse HEAD` at scout time).
`src/engine/battleScene.ts` is a 33k+-line file under concurrent edit by the
main lane elsewhere in this run; every citation below was re-confirmed with
`grep -n`/`Read` this session, but **treat line numbers as approximate and
symbol names as load-bearing** — re-grep the quoted function/const name if a
line number has drifted by the time this is read. Two research passes (this
session, `Explore` agent, read-only) are folded in verbatim/condensed with
their own file:line citations re-verified by spot-check (§7 lists exactly
which citations were independently re-run vs. trusted from the sub-agent).

Companion reading: `docs/send-out-intro-animation-program.md` (the animation
lane's mechanism/scope/rung-ladder doc, referred to below as "the program
doc"), `ISSUES.md` §#71 and §#39, `ANIMATION_PROGRESS.md` top entry
(2026-08-03, front census closed).

---

## 1. The live send-out seam(s)

There is **no single send-out event** in the render layer. The kernel/adapter
layer (battle logic — who switched in, what species, what HP) is real and
generic; the pixel-render layer that would play an intro animation is a set
of independently hardcoded "sprite settled" draw call sites, none of which
call any send-out-animation reducer. Four structurally distinct seams exist:

### 1a. Battle-start, opponent (front) sprite

Two **independent, non-unifying** compositors coexist:

- **Legacy/trace-keyed route** — `drawSendOutHandoff`
  (`src/engine/battleScene.ts:15990`), reached from `renderBattleScene`
  (`:18438`, called at `:18527`). It branches on a literal boolean,
  `const isJenson = encounter === "jenson"` (`:15997`), then hardcodes which
  species-specific materialize function to call: `drawKabutoHSlideWobble` vs
  `drawGrovyleMaterialize`/`drawGrovyleStretch*` (`:16049-16056`). This is the
  two fixed named encounters ("destin"/"jenson"), not a real per-round route.
  - GROVYLE settle: `drawGrovyleSettled` (`:4770`), called at `:16081` gated
    `if (!isJenson && t >= GROVYLE_MATERIALIZE_TICK)`
    (`GROVYLE_MATERIALIZE_TICK = 1544`, `:3211`) — plain
    `drawFrontBackMaterialize(..., { kind: "settled" })`, **no offset applied**.
  - KABUTO settle: inline in `drawKabutoHSlideWobble` (`:5813-5837`), branch
    at `:5816-5819` once its own wobble finishes. **Notable:** KABUTO is the
    one species whose real per-tick source mechanism already plays
    frame-by-frame live in production, via `kabutoHSlideWobble`
    (`src/engine/kabutoSendOut.ts:61-84`, a hand ported
    `Anim_HorizontalSlideWobble`) — a fourth hand-fit, **not named in ISSUES
    #71's "three hand-fits" list** (see §2 correction). It duplicates the
    banked generic reducer `horizontalSlideWobbleFrameAtTick`
    (`src/animation/speciesIdleAnim.ts:5853`, family `H_SLIDE_WOBBLE`, KABUTO
    confirmed mapped to `ANIM_H_SLIDE_WOBBLE` in
    `src/data/gen/send-out-anim-selector-tables.json`). Its own settle draw
    still drops the terminal offset (moot for KABUTO — see §4, offset is
    (0,0)).

- **Generated/orchestrator route** — the real live path for actual generated
  Factory rounds, confirmed wired at `src/engine/core.ts:2325`:
  `renderGeneratedBattleStartPreSendOut(fb, state.factoryRoundBattleOrchestrator.battleStartIntro)`
  (definition `battleScene.ts:3977`, import at `core.ts:125`) →
  `renderGeneratedBattleStartOpponentRelease` (`:4346`) /
  `renderGeneratedBattleStartPlayerRelease` (`:4574`). Genuinely fact-driven:
  species comes from `fieldView.fieldArt.opponent.speciesSymbol`
  (`FactoryBattleStartPresentationCommand`,
  `src/engine/factoryBattleStartPresentation.ts:34-40`), with real per-species
  elevation (`enemyMonElevation(...)`, `battleScene.ts:4279`/`:4618`). Traces
  with `"appRoute": "generated-orchestrator"` (e.g.
  `tools/compare/traces/factory-arbitrary-intro-yoshi-off.json`,
  `factory-arbitrary-intro-magneton-off.json`) exercise exactly this route —
  confirmed by reading the trace JSON directly.
  - Settle hook #1: `drawGeneratedOpponentRelease`'s `coeff === 0` branch
    (`:4281-4289`, defined `:4261`), called from
    `renderGeneratedBattleStartOpponentRelease` at `:4434`.
  - Settle hook #2 (**duplicate** of the same draw): `renderGeneratedBattleStartPlayerRelease`
    redraws the already-settled opponent sprite again at `:4612-4619`
    (identical `drawSpriteSheet(...)`, no offset) — two call sites for the
    same sprite, not one.

### 1b. Battle-start, player (back) sprite

- **Generated route**: `drawGeneratedPlayerMaterialize` (`:4528-4567`) applies
  `playerMaterializeSettleY2`/`playerMaterializeSettleTintCoeff`
  (`src/engine/battleMenu.ts`, exported, imported at `battleScene.ts:439-440`)
  at `:4563,4565` — **regardless of the player's actual species**: the sprite
  art (`art.pic.tileset`) is genuinely per-species, but the y2/tint tables
  fed into it are ONIX-only literals (see §2).
- **Legacy route**: `drawPlayerMaterializeSettle` (`:5015-5029`) hardcodes
  `onixBackSprite.tileset`/`.palette` directly (`:5019-5020`), called at
  `:7052` and `:16078`.
- Both consume the **same** literal tables:
  `PLAYER_SETTLE_WOBBLE_Y2_TABLE` (`battleMenu.ts:743-745`) and
  `playerMaterializeSettleTintCoeff` (`:737-740`).

### 1c/1d. Mid-battle switch-in and post-faint replacement

In this app these are **the same seam**, not two: a fainted-actions
orchestration resolves who switches in, and the render layer draws that
replacement's "settled" sprite once. Two live, already-generic-at-the-fact-
layer instances exist:

- **Opponent side, turn 5 (Grovyle faints → Pidgeotto in)**:
  `resolveTurn5SwitchInAdapter` (`src/engine/turn5ResolutionAdapter.ts:325-344`,
  chains `runBattleScriptFaintedActionsOrchestration`, real
  `Cmd_openpartyscreen`/`Cmd_switchindataupdate` opcode handlers —
  `src/engine/battleScriptOpenPartyScreenOpcode.ts`,
  `src/engine/battleScriptSwitchinOpcode.ts:353-422`). Exposes
  `materializeSettleTick` (RAM-probed `PIDGEOTTO_MATERIALIZE_SETTLE_TICK = 6828`,
  `turn5ResolutionAdapter.ts:196`), re-exported at
  `battleScene.ts:11192` as `TURN5_PIDGEOTTO_SETTLE_TICK`. Settle draw:
  `drawTurn5PidgeottoSettled` (`:11297-11303`, plain `drawSpriteSheet`, no
  offset), gated at `:11355`
  (`if (t >= TURN5_PIDGEOTTO_SETTLE_TICK) drawTurn5PidgeottoSettled(...)`)
  inside `drawTurn5SwitchinSprite` (`:11349-11356`), which is itself called
  from **8** distinct per-turn field-base helpers (`:12085, 12359, 12648,
  13542, 13930, 14275, 14569, 15623`) since Pidgeotto stays on screen turns
  6-13. This one function fans out to all 8 — a real dispatcher-collapse
  candidate (fix once, fixes 8 downstream callers), unlike §1e below.
- **Opponent side, turn 13 (Pidgeotto faints → Murkrow in)**:
  `resolveTurn13SwitchInAdapter` (`src/engine/turn13ResolutionAdapter.ts:212-222`),
  consumed at `battleScene.ts:11537`
  (`const TURN13_SWITCHIN = resolveTurn13SwitchInAdapter();`). Settle draw:
  `drawTurn13MurkrowSettled` (`:11519-11521`, plain draw, no offset), gated
  `if (continuationElapsed >= TURN13_MURKROW_SETTLE_AFTER_DISMISS)` (`:11528`).
- **Player side, forced switch (decision layer, fully generic)**:
  `createPartySelectStateFromForcedSwitch` (`src/engine/partySelect.ts:162`),
  invoked from `battleSceneResolutionOwner.ts:54` and
  `factoryRoundBattleOrchestrator.ts:1249`, consumed at the very top of
  `renderBattleScene` (`battleScene.ts:18440-18441`). The *decision* ("who
  switched in") is real and species-agnostic here — but the **post-selection
  render** is still `drawTurn15ForcedSwitchRelease` (`:17350-17379`,
  MAGBY-only, uses `magbySendOutAnimation`, see §2), gated
  `if (logicalTick <= 16) ...; else magbySendOutAnimation(logicalTick)`
  (`:17351-17354`) — species is fixed by *which caller* draws it (5 call
  sites: `:17142, 17945, 18396, 34554`, plus the definition), not a runtime
  species check. Decision ≠ render: the kernel already knows genuinely who
  switched in; the pixel draw does not yet ask it.

### 1e. The 56 `speciesFrontIdleRestOffset` call sites — an existing hand patch, not a seam

Distinct from all of the above: `speciesFrontIdleRestOffset` (see §3) is
already imported into `battleScene.ts:1105` and called **56 times** (plus 2 in
`src/animation/sceneOnPresentation.ts:3085,5732` — 58 total), but **every one
of them lives inside a single top-level function**,
`renderSceneOnMovePresentation` (`battleScene.ts:18592-34274`, ~15,700
lines), each inside one of ~103 `if (state.config.move === "<MOVE>")`
branches. Representative, fully read:

- `:18636` (SANDSTORM) and `:19301` (SECRET_POWER) — literal `"ONIX"`,
  hardcoded PHANPY/TEDDIURSA↔ONIX pair check that **throws**
  (`unsupported staged <MOVE> pair ...`) on any other pair.
- `:23299` (GROWTH, full block `:23268-23366`) — `view.target.species`, but
  still pair-locked (IVYSAUR↔ONIX, throw guard `:23280-23283`). Comment at
  `:23293-23297` names the exact defect ISSUES #71 describes: "GROWTH never
  touches the target... an opponent-side front target keeps its permanent
  send-out front-sprite-animation residual... instead of settling to (0,0)."
  This is the hand patch, already self-aware, that #71 wants replaced by a
  systemic mechanism.
- `:25107/25110` (PERISH_SONG, MURKROW↔ONIX), `:25831/25834` (COTTON_SPORE,
  MAREEP↔ONIX), `:28323/28440` (HARDEN/CALM_MIND, RELICANTH/LUNATONE↔ONIX —
  "dynamic" `view.target.species` reads that in practice only ever resolve to
  `"ONIX"`), `:28755, 28988, 29551, 29716, 29879/29889, 30013, 30334, 30525,
  30701` (SHADOW_BALL/ENCORE/SYNTHESIS/MOONLIGHT/WISH/RECOVER/FUTURE_SIGHT/
  CONFUSION/PSYCHIC — same shape), `:33958` (DRAGON_CLAW, ALTARIA↔ONIX).

**These do not collapse into one dispatcher call as-is.** Every branch
independently re-derives `playerToOpponent`/`opponentToPlayer` and throws on
any other pair — this is per-window species-pair gating, not a systemic "any
battler that is currently a settled ONIX gets its offset" hook. A real fix
either threads the dispatcher call into each of the ~103 move branches at the
point each already computes its local `targetIdle`/`attackerIdle` (mechanical,
high multiplicity, low risk, no behavior change since it's literally the same
call, moved) or hoists it into whatever shared per-battler `view.target`/
`view.attacker` builder produces these views (bigger refactor — must not
break the deliberate "only after a move that doesn't touch this battler"
semantics the GROWTH comment states). **Out of scope for the minimum-viable
slice in §4** — flagged here only because it's real code the future slice
plan (§5) must not collide with.

### 1f. Bottom line

Breakdown | Decision/fact layer | Render settle hook | Verdict
--- | --- | --- | ---
Battle-start (legacy) | literal `encounter === "jenson"` | `drawGrovyleSettled`/inline KABUTO | trace-keyed literal
Battle-start (generated) | real per-round facts | `drawGeneratedOpponentRelease` + dup | fact-driven, but settle draw has **no** offset hook at all (not turn-keyed, just absent)
Switch-in/faint (opponent, turn 5/13) | real adapters, real opcodes | `drawTurn5PidgeottoSettled`/`drawTurn13MurkrowSettled` | facts real+generic; render hook is per-instance-named but structurally reusable (turn-5's fans out to 8 callers)
Switch-in (player, forced) | fully generic decision | `drawTurn15ForcedSwitchRelease`, MAGBY-only | decision generic; render literal-species
Move-window residual patches (§1e) | N/A — post-hoc pixel patch | 56/58 sites, throw-guarded species pairs | explicitly one-off; out of scope for the minimum slice

There is **no** existing non-turn-keyed "battler sprite just settled after
send-out" event anywhere the render layer subscribes to. §1e's GROWTH
comment is the only place in the codebase that states the gap should be
closed generically.

---

## 2. The three hand-fits (plus a fourth, uncatalogued one)

### ONIX front terminal — `src/animation/speciesIdleAnim.ts:7549`

This is not a one-off function distinct from the banked reducer surface —
it **is** `speciesFrontIdleRestOffset("ONIX")`, the same public API every
other front species would use (§3). What it encodes: `x2=1, y2=0` for
`ANIM_RAPID_H_HOPS` (ONIX's own front family), RAM-probe-confirmed
(`tools/probe/dump-onix-front-idle-anim.py`, module doc
`speciesIdleAnim.ts:25-41`). Consumers: the 58 call sites in §1e (all
literal or pair-locked to ONIX/other single species), **zero** call sites at
any of the §1a-1d settle hooks. Retiring this "hand-fit" is really "generalize
its 58 already-hardcoded call sites into a systemic hook, and additionally
call it at the settle hooks that currently call nothing" — there's nothing
ONIX-specific left to retire at the function level; it's already the general
function, just under-invoked at the real seams and over-copy-pasted at
move-window patches.

### MAGBY back — `src/engine/magbySendOut.ts:62` (`magbySendOutAnimation`)

Encodes `BACK_ANIM_SHAKE_GLOW_RED` for MAGBY's **Docile nature specifically**
(module doc `:17-24`): per-tick `x2` shake plus red-tint blend coefficient,
keyed by `logicalTick` where **0 is the first visible `ReleaseMonFromBall`
frame** (a task-relative clock, not a battle-global tick — doc
`magbySendOut.ts:20`). Sole production consumer:
`battleScene.ts:17354`, inside `drawTurn15ForcedSwitchRelease` (§1d), gated
`if (logicalTick <= 16) [materialize] else magbySendOutAnimation(logicalTick)`
(`:17351-17354`). Retirement needs to preserve: (a) the nature-specificity —
this is only correct for Docile MAGBY, any other nature would need the
still-unbuilt back-family nature-mod table (`speciesToBackAnimSet` +
`backAnimNatureMod` + `backAnimationIds`, all present in the JSON per §3 but
with zero back-reducer consumers), (b) the task-relative tick anchor (not
reusable as-is against a `ticksSinceStart`-style front contract), (c) the ball
-fade/glow palette-ownership handoff boundary documented at `:55-61` (a
subtlety a generic dispatcher must still get right per-species, since it's
about task scheduling order, not this species' animation body specifically).

### ONIX back — `src/engine/battleMenu.ts:733-749` (line drift from ISSUES #71's cited `:708`)

ISSUES #71 cites `battleMenu.ts:708`; current HEAD has that comment block at
`:707-729` and the actual code at `:733-749` — a ~25-30 line drift from
intervening edits, confirming the "symbol names outlive line numbers" caveat
up top. Encodes `BACK_ANIM_V_SHAKE` (ONIX's real back-animation family) as a
**literal 39-entry RAM-derived table**
(`PLAYER_SETTLE_WOBBLE_Y2_TABLE`, `:743-745`), not a general reducer — the
doc comment (`:722-724`) explicitly says this was a deliberate choice over
"reverse-engineering which of the 3 nature-dependent `VerticalShake*`
variants this particular save's ONIX resolves to." Consumers: both battle-
start settle draws in §1b (`battleScene.ts:4563/4565` generated,
`:5025/5027` legacy) via `playerMaterializeSettleY2`/
`playerMaterializeSettleTintCoeff`. Retirement needs to preserve: the fact
that this table is nature-specific (only valid for whatever nature the two
committed fixed-encounter ONIXes actually have) and entangled with the
*separate* ball-fade-to-true-color mechanism
(`Task_FadeMon_ToNormal`/`_Step`, doc `:60-90` of the same block) that shares
the same tint coefficient but is a different task/mechanism — a dispatcher
must not accidentally fold the fade-to-color timing into the back-anim
residual or vice versa.

### KABUTO front (uncatalogued fourth hand-fit) — `src/engine/kabutoSendOut.ts:61` (`kabutoHSlideWobble`)

Not named in ISSUES #71's "three hand-fits" list. Encodes real frame-by-frame
`Anim_HorizontalSlideWobble` playback (not just a terminal offset — this is
the one species where the actual intro motion, not just its rest position,
already plays live), keyed by `elapsed` relative to the opponent send-out
visual handoff (doc `:56-60`). Sole consumer: `drawKabutoHSlideWobble`
(`battleScene.ts:5813-5837`, §1a legacy route). Duplicates the banked
`horizontalSlideWobbleFrameAtTick` (`speciesIdleAnim.ts:5853`, family
`H_SLIDE_WOBBLE`) function-for-function (same source mechanism, same
generic-code invariant per the program doc §1 item 3). Retirement needs to
preserve: its own tick anchor (`elapsed` relative to the send-out visual
handoff, not `ticksSinceStart` from the mon-animation callback's own
creation — these are offset from each other by whatever gap exists between
"ball opens" and "front sprite callback installed", not yet reconciled
anywhere in this codebase) and its coupling to the front OAM-frame animation
(`kabutoFrame(visibleAge)`, a second concurrent state machine the banked
reducer doesn't model at all — see §3).

---

## 3. The banked reducer surface

### `src/animation/speciesIdleAnim.ts` (7555 lines)

- **`SpeciesFrontAnimFamily`** union (`:44-105`): 62 members, one per ported
  front family.
- **`PORTED_FRONT_FAMILIES`** (`:109-172`): a `Set` of all 62 — currently a
  no-op gate (equals the full union; nothing is excluded).
- **62 per-tick reducers**, one per family, e.g.
  `verticalSlideWobbleFrameAtTick` (`:5623`), `horizontalJumpsFrameAtTick`
  (`:5893`), `figure8FrameAtTick` (`:6822`), `backAndLungeFrameAtTick`
  (`:6960`); the 62nd, `RAPID_H_HOPS`, is named
  `rapidHorizontalHopsOffsetAtTick` (`:1293`, `*OffsetAtTick` not
  `*FrameAtTick` — a naming inconsistency worth knowing before grepping for
  "the full list"). **Tick contract, confirmed consistent across every
  function sampled**: the parameter is `ticksSinceStart`, meaning ticks since
  *that species' own `Anim_*` sprite-callback's installation* — i.e. **after**
  the ball-throw/emerge arc finishes, not ticks-since-ball-release and not an
  absolute battle tick (doc comments `:1288-1289`, `:6811-6813`). **Return
  shape**: `null` (pre-start/frozen) or `{x2, y2, ...family-specific register
  state}` (`SpeciesIdleOffset`, `:1237-1240`) — **no function returns
  `animNum` or an OAM frame index**; a consumer wanting the OAM-frame side of
  the sprite (as KABUTO's own hand-fit does, §2) finds nothing here.
- **No family→function dispatch table exists.** No `Record<SpeciesFrontAnimFamily,
  ...>` or `Map` keyed by the union anywhere in the file (confirmed by grep).
  The only thing resembling family-keyed dispatch is `computeTerminalOffset`'s
  own hand-written `switch (family) { case "X": ... }` (`:7086-7529`, one
  case per family, each calling that family's own reducer at a specific
  terminal tick and asserting `callback === "WaitAnimEnd"`), and it is
  **module-private** — not exported. **A rung-3 tier-2 (per-tick, not just
  terminal) dispatcher has nothing to build the "family + tick → frame"
  half from except hand-writing its own switch/map** — the only existing
  template is `computeTerminalOffset`'s switch, which only proves the
  *terminal* tick per family, not general mid-flight dispatch.
- **`speciesFrontIdleRestOffset(species: string): SpeciesIdleOffset | null`**
  (`:7549-7555`, full body):
  ```ts
  export function speciesFrontIdleRestOffset(species: string): SpeciesIdleOffset | null {
    const generatedFamily = generatedFrontAnimIds[species];
    if (!generatedFamily?.startsWith(FRONT_ANIM_PREFIX)) return null;
    const family = generatedFamily.slice(FRONT_ANIM_PREFIX.length) as SpeciesFrontAnimFamily;
    if (!PORTED_FRONT_FAMILIES.has(family)) return null;
    return terminalOffsetForFamily(family);
  }
  ```
  Accepts a bare species name (no `SPECIES_` prefix). Does its own
  species→family lookup internally via `generatedFrontAnimIds` (`:174`,
  `selectorTables.frontAnimIds.species`) — **callers do not need to know the
  family**. Memoized per-family (`terminalOffsetCache`, `:7532-7540`). **Total
  in practice**: `PORTED_FRONT_FAMILIES` already equals the full 62-family
  union, and the JSON's `frontAnimIds.absentNote` says the only species
  missing an entry are 25 non-reachable `SPECIES_OLD_UNOWN_*` ids — so for
  every real/Factory species this returns a real (possibly zero) offset, not
  `null`. **This function already is the front-side tier-1 dispatcher** —
  nothing about it is ONIX-specific; §5's minimum slice can call it directly,
  with no animation-lane dependency.

**Empirical finding (computed this session, not in either source doc):** of
all 386 species keyed in `frontAnimIds.species`, **only 2 have a nonzero
terminal offset — ONIX and RATTATA, both `{x2: 1, y2: 0}`**. All other 384
resolve to `{x2: 0, y2: 0}` (spot-checked programmatically via
`speciesFrontIdleRestOffset`, iterating every key in
`send-out-anim-selector-tables.json`'s `frontAnimIds.species`; command:
`npx tsx -e "..."` importing `speciesFrontIdleRestOffset` directly — rerun
this any time the census changes). **This means**: wiring the dispatcher at
the §1a/§1c/§1d settle hooks (GROVYLE, KABUTO, PIDGEOTTO, MURKROW — none of
which is ONIX/RATTATA) is a **pixel no-op against every currently-committed
dense window that features those species**, and only becomes pixel-visible
for a future window that settles ONIX or RATTATA at one of those hooks. The
residual-offset defect (permanent visible displacement) is real but rare;
the separate defect — **no per-species intro motion plays at send-out for
any of the 386 species** (the ball/emerge arc runs, then the sprite just
appears in its rest pose) — is universal and is a bigger, distinct gap from
what §4's minimum slice closes.

### `src/data/gen/send-out-anim-selector-tables.json`

Five top-level keys, all present (confirmed via `python3 -c "json.load(...)"`,
git-blamed to a single commit `6d568f0d`, rung 1 of the program doc's ladder
— already done, contrary to the doc's own "proposed" framing, which predates
this extraction):

Key | Shape | Example
--- | --- | ---
`frontAnimIds` | `{source, absentDefault, absentNote, species: Record<string,string>}`, 386 entries | `{"BULBASAUR":"ANIM_V_JUMPS_H_JUMPS", "ONIX":"ANIM_RAPID_H_HOPS"}`
`animationDelay` | same shape, 55 sparse entries | `{"BLASTOISE":50,"WEEDLE":10}`
`speciesToBackAnimSet` | same shape, 386 entries | `{"BULBASAUR":"BACK_ANIM_DIP_RIGHT_SIDE"}`
`backAnimNatureMod` | `{source, natures: Record<string,number>}`, 25 entries | `{"NATURE_HARDY":0,"NATURE_LONELY":2}`
`backAnimationIds` | `{source, tripleOrder, sets: Record<string,[string,string,string]>}`, 25 entries | `{"BACK_ANIM_H_VIBRATE":["ANIM_H_VIBRATE_FASTEST","ANIM_H_VIBRATE_FAST","ANIM_H_VIBRATE"]}`

All five tables the program doc's rung 1 names are present at the data
layer. **But consumption is asymmetric**: only `frontAnimIds.species` has a
production consumer (`speciesIdleAnim.ts:174`). `speciesToBackAnimSet`,
`backAnimNatureMod`, `backAnimationIds`, `animationDelay` are extracted and
source-pinned by tests (`tests/sendOutAnimSelectorTablesExtraction.test.ts`,
`tests/sendOutAnimSelectorTablesSourcePins.test.ts`) but have **zero**
production/reducer consumers today.

### Back-family reducer surface: confirmed absent

`grep -rln "BackAnim\|backAnim\|BACK_ANIM" src/animation/` returns only
`speciesIdleAnim.ts`, and its one hit (`:7546`) is a doc-comment disclaimer
("the player's own back sprite uses a completely separate table/function
family... not ported here"). **There is no back-family per-tick reducer and
no back-side `speciesBackIdleRestOffset` analog anywhere in `src/animation/`.**
The only back-side code that exists is the two `src/engine/` hand-fits (§2,
MAGBY/Docile and ONIX/whatever-nature), each hardcoded to one species+nature
pair. This matches the program doc's own framing — rung 4 (68 back
functions) is explicitly not started — and means: **for any back-side
species other than MAGBY(Docile)/ONIX(this save's nature), there is
currently nothing to wire, ported or unported.**

### What main's call site must pass (summary)

- **Front, terminal offset only**: `species: string` (bare name, no prefix) →
  `speciesFrontIdleRestOffset(species)` gives `{x2, y2} | null` directly.
  Already exists, already exported, zero animation-lane dependency.
- **Front, per-tick playback**: `species` (to resolve family via the same
  JSON) + `ticksSinceStart: number` (anchored to the front sprite callback's
  own installation tick, which main's call site must itself derive from
  whatever it considers "send-out visual handoff" — this anchor-derivation
  is NOT yet solved generically anywhere in this codebase; KABUTO's hand-fit
  and the generated route's own tick math are two different, unreconciled
  answers, see §2 KABUTO and §1a). **This is the rung-3 gap** — no
  family-keyed per-tick dispatch function exists to call.
  - Also needed but not produced by any existing reducer: the OAM
    frame-index/`animNum` side of the sprite (front sprite anim playback is a
    second, concurrent state machine per the program doc §1 item 2 —
    `HasTwoFramesAnimation`/`sMonAnimationDelayTable`import). KABUTO's
    hand-fit is the only place in this codebase that currently produces both
    halves together.
- **Back (either tier)**: `species` + `nature` (both required — nature
  determines a 3-way branch, program doc §1 item "the player's animation
  depends on the mon's nature"). Nothing to call yet; this is rung 3+4
  territory, entirely animation-lane's build.

---

## 4. The minimum-viable main-lane slice

ISSUES #71 allows, as a floor: "at minimum apply their terminal rest offsets
so settled sprites sit at source-exact positions." Concretely, using
`speciesFrontIdleRestOffset` (already built, §3), this touches exactly the
settle-hook call sites enumerated in §1, front side only (back side has
nothing to call, §3):

1. `drawGrovyleSettled` (`battleScene.ts:4770`) — apply
   `speciesFrontIdleRestOffset("GROVYLE")` (currently `{0,0}` — no visible
   change, but closes the gap for any future window that needs it).
2. `drawKabutoHSlideWobble`'s settle branch (`:5816-5819`) — apply
   `speciesFrontIdleRestOffset("KABUTO")` (currently `{0,0}`).
3. `drawGeneratedOpponentRelease`'s `coeff === 0` branch (`:4281-4289`) and
   its duplicate in `renderGeneratedBattleStartPlayerRelease` (`:4612-4619`)
   — apply `speciesFrontIdleRestOffset(<real species from fieldView>)`
   (species is already threaded here, unlike the ONIX-literal move-window
   sites in §1e — this is the cleanest of the six call sites since no
   pair-lock/throw-guard refactor is needed).
4. `drawTurn5PidgeottoSettled` (`:11297-11303`) — apply
   `speciesFrontIdleRestOffset("PIDGEOTTO")` (currently `{0,0}`; fixes all 8
   downstream callers at once, §1c).
5. `drawTurn13MurkrowSettled` (`:11519-11521`) — apply
   `speciesFrontIdleRestOffset("MURKROW")` (currently `{0,0}`).

Explicitly **out of scope** for this minimum slice: the 56/58 move-window
patch sites (§1e — real, but a separate, larger, pair-guard-refactor task);
any back-side offset (nothing exists to call, §3); any per-tick/tier-2
playback (needs the rung-3 dispatcher, not built).

### Verification

Per the program doc §7 acceptance bar: a tier-1 constant is accepted against
a **RAM probe of the settled sprite** (`gBattlerSpriteIds[n]`
`x2`/`y2`/`animNum`/`callback`), not pixels alone. The existing probe,
`tools/probe/dump-onix-front-idle-anim.py`, is **already species-generic**
by its own module doc (`:12-13`, "intentionally species-generic for the
generated front-selector families") — it reads both battler slots'
`x2`/`y2`/`animNum`/`animCmdIndex`/`callback` unconditionally, keyed by
symbol-name lookup table (`SYMBOLS`, `:73-80`, would need new entries added
per newly-probed species/function, e.g. `Anim_VerticalStretch`/`WaitAnimEnd`
for GROVYLE/PIDGEOTTO, `Anim_HorizontalSlideWobble` for KABUTO,
`Anim_VerticalSquishAndBounce` for MURKROW — addresses via
`nm reference/pokeemerald/pokeemerald.elf`). Run via:
```
python3 tools/run-mgba-probe.py <output.json> -- \
    <mgba-python> tools/probe/dump-onix-front-idle-anim.py <scenario.json> <output.json> <startTick> <endTick>
```
Per program doc §7's second addition, a sibling-species spot-check is
required per promoted function — since GROVYLE (`ANIM_V_STRETCH`) and
PIDGEOTTO (`ANIM_V_STRETCH`) already share a family, probing both
simultaneously (they're the natural pair) satisfies that bar for
`V_STRETCH` in one pass.

**Committed dense windows that already cover a send-out** (would need a
twice-fresh re-run, not new captures, per the acceptance bar — all are
pixel no-ops per §3's empirical finding since none features ONIX/RATTATA at
its own settle hook):
- `tools/compare/traces/battle2-kabuto-sendout-dense.json` — legacy KABUTO
  route (§1a).
- `tools/compare/traces/battle2-player-sendout-dense.json` — legacy
  GROVYLE/player-back route (§1a/§1b).
- `tools/compare/traces/sendout.json`,
  `tools/compare/traces/battle2-jenson-sendout-text.json` — legacy
  battle-start text/handoff windows, worth re-running as insurance even
  though they may not extend past the settle tick.
- `tools/compare/traces/factory-arbitrary-intro-yoshi-off.json` /
  `factory-arbitrary-intro-magneton-off.json` (`"appRoute":
  "generated-orchestrator"`, confirmed by reading the trace JSON directly,
  750-frame `captureWindow`) — the generated route (§1a), featuring
  MAGNETON (`{0,0}` per §3). This is the settled-record window ISSUES #56
  already froze (YOSHI 700/751 + MAGNETON 703/751) — re-running it is the
  most direct regression check for slice item 3 above.
- **OPEN**: no committed dense window was found that exercises turn 5's
  Pidgeotto switch-in or turn 13's Murkrow switch-in specifically *through
  their settle ticks with capture frames past the settle point* — the turn5/
  turn13 ISSUES #39 retirement pins (referenced in ISSUES.md, "141/141 +
  242/242", "1,461/1,461 raw RGBA captures" etc.) almost certainly do, since
  those turns' full presentation is pinned, but this scout did not confirm
  which specific trace file(s) hold the exact settle-tick frame. Resolve by
  grepping `tools/compare/traces/` for the turn-5/turn-13 dense trace names
  cited in ISSUES #39's own retirement commits (`5db34996`, `bd1d6beb`) and
  confirming their `captureFrames`/`captureWindow` spans
  `TURN5_PIDGEOTTO_SETTLE_TICK`/the turn-13 equivalent.

---

## 5. Proposed bounded slice plan (main-lane share) + cross-lane ask

### Slice A — front terminal offsets at the real settle hooks (no cross-lane dependency)

**Touches:** `battleScene.ts` only, the 5 call sites listed in §4 item 1-5
(6 draw functions, since item 3 has two call sites). Import
`speciesFrontIdleRestOffset` from `../animation/speciesIdleAnim.ts` (already
imported at `:1105` for the §1e sites — reuse the same import).
**Acceptance:** RAM probe of `gBattlerSpriteIds[n]` at each settle tick for
GROVYLE, KABUTO, PIDGEOTTO, MURKROW (all `{0,0}`, so probe should show no
change from current behavior — this proves the wiring is correct and inert,
not that it fixes a visible bug) plus a literal-offset species if one is
staged for the generated route (ONIX/RATTATA are the only two that would
show a visible pixel diff — if neither appears in a committed generated-route
scenario yet, stage a minimal one, e.g. a `mechanicLab` trace with
RATTATA as the sent-out species, to get real positive-case coverage rather
than five negative/no-op cases). Re-run the dense windows listed in §4
twice fresh. **Out of scope:** §1e's 56/58 move-window sites (separate,
larger effort, §1e); any back-side offset; per-tick playback.

### Slice B — thread real species through the generated release (small correctness fix, adjacent to A)

**Touches:** `battleScene.ts:4261-4289` (`drawGeneratedOpponentRelease`) and
`:4528-4567` (`drawGeneratedPlayerMaterialize`) — confirm/ensure the species
passed to `speciesFrontIdleRestOffset` in Slice A item 3 is the same real
`fieldView.fieldArt.opponent.speciesSymbol` already used for sprite art and
elevation at this call site (§1a), not a second hardcoded value. This may
already be trivially satisfied once Slice A is written this way; keeping it
a separate acceptance line guards against silently reintroducing a literal.
**Acceptance:** same RAM-probe bar as Slice A, plus a species-substitution
spot check (stage two different generated-route scenarios with different
opponent species, confirm each gets its own species' offset, not a shared
default).

### Slice C — retire the ONIX-back / MAGBY-back hand-fits' *consumers* onto a documented interim contract (no dispatcher yet)

Since no back dispatcher exists (§3) and building one is explicitly
animation-lane's rung 3/4 work, this slice does **not** delete
`battleMenu.ts`'s `PLAYER_SETTLE_WOBBLE_Y2_TABLE`/`magbySendOut.ts`. Instead:
document (code comment, not new production logic) at each of their 3
consumer sites (§1b generated+legacy, §1d MAGBY forced-switch) exactly which
species+nature pair each hand-fit is valid for, and add a guard (existing
pattern in this codebase, e.g. the §1e throw-guards) that fails loudly if a
future generated-route battle ever tries to settle a back sprite for a
species/nature this hand-fit doesn't cover, rather than silently drawing the
wrong table. **Touches:** `battleMenu.ts`, `magbySendOut.ts`, their 3
call sites in `battleScene.ts`. **Acceptance:** existing dense windows stay
byte-identical (no behavior change for the covered species/nature); a new
Tier-1 test asserts the guard throws for an uncovered species/nature.
**Out of scope:** actually porting any new back family — that's the
animation lane's rung 3/4.

### Slice D (stretch, only if animation lane's rung-3 front dispatcher lands during this window) — per-tick front playback at the generated battle-start seam

**Touches:** `battleScene.ts:4261-4346` (opponent) and the equivalent player
front-sprite path, replacing the static settled draw with a real per-tick
loop calling the rung-3 dispatcher (see cross-lane ask below) from the ball-
handoff tick through settle. **Acceptance:** dense-window parity across the
*whole* intro window (not just the settled tail), per program doc §7's
"dense oracle window, twice fresh, both orientations." **Explicitly gated**
on the cross-lane ask below landing first; do not start hand-rolling a
per-tick dispatch switch in `src/engine/` to avoid this dependency — that
would recreate exactly the "hand-fit in the wrong lane" problem ISSUES #71
already flags for MAGBY/ONIX-back.

### Cross-lane interface ask (for the animation lane's rung-3 dispatcher)

For Slice D (and any future back-side slice) to be consumable without
main-lane re-deriving animation-lane internals, the rung-3 dispatcher
should export, from `src/animation/` (exact names negotiable, contract is
what matters):

1. **Front, per-tick**: a single function
   `frontSendOutFrameAtTick(species: string, ticksSinceStart: number): SpeciesIdleOffset | null`
   that does the species→family lookup internally (mirroring
   `speciesFrontIdleRestOffset`'s existing contract, §3) and dispatches to
   the correct one of the 62 `*FrameAtTick`/`*OffsetAtTick` reducers — i.e.
   the public counterpart to today's private `computeTerminalOffset` switch,
   generalized from "give me the terminal tick's value" to "give me any
   tick's value." Also needs to define/export the **anchor**: what tick 0
   means in terms main can compute at its own call site (today §1a's
   generated route and §2's KABUTO hand-fit each have their own answer to
   "when does the front animation start relative to the ball landing," and
   they're not reconciled — the dispatcher's doc comment should state the
   canonical anchor explicitly, e.g. "N ticks after `BATTLER_AFFINE_EMERGE`
   completes" with the exact N or formula).
2. **Front, OAM/anim-frame side**: whatever `HasTwoFramesAnimation`/
   `sMonAnimationDelayTable`-derived frame-index state a full per-tick
   playback needs (§3 — no existing front reducer returns this; KABUTO's
   hand-fit is the only current example of producing it, `kabutoFrame`,
   `kabutoSendOut.ts`). Even a species-generic version of that one function's
   shape would unblock Slice D.
2. **Back, both tiers**: same shape, `species: string, nature: string,
   ticksSinceStart: number` (or a terminal-only variant), once rung 4 exists.
   Not needed for any slice in this plan yet — listed for forward
   compatibility so main doesn't have to renegotiate the contract shape
   twice.
3. Whatever the dispatcher's own acceptance evidence is (RAM probes per
   family) should stay attached to `src/animation/` per this run's existing
   convention — main's slices only need the callable contract, not the
   receipts.

---

## 6. Accuracy notes / caveats

- Base sha: `4fe0e206` (see top). `battleScene.ts` line numbers are the
  single largest drift risk in this doc — every citation into it was
  re-confirmed by `grep -n` this session, but a concurrent main-lane worker
  editing that file will shift them further. Re-grep by the quoted
  function/const name, not the line number, if anything looks off.
- The "56/58 call sites" and "62 reducers"/"386 species" counts were each
  computed programmatically this session (`grep -c`, and a direct `npx tsx`
  import of `speciesFrontIdleRestOffset` iterating every JSON key) — these
  are exact counts against this sha, not estimates.
- §4's OPEN item (turn-5/turn-13 dense-window settle-tick coverage) is the
  one unresolved factual question in this doc; everything else is either a
  direct citation or a programmatically-verified count.
