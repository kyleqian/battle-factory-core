# Species render entry point retirement design

Status: census taken at `0d1b87dd` (2026-08-02), against
`src/engine/battleScene.ts` at 34,226 LOC. This is a design-only dossier per
ISSUES.md #39's own worklist: it makes no production change and does not
need an oracle query (a handful of probe/grep facts below are cross-checked
against already-committed traces, not fresh oracle calls).

**Scope boundary.** This program picks up *after* the dispatcher-ladder
design (`docs/next-command-handoff-dispatcher-design.md`, slices 1-10) has
retired the thirteen turn-keyed `nextCommand` handoffs and the
`drawTurn5`…`drawTurn13` selection branch. That doc's own slice 3/4 already
introduces the `FightCommandPresentation` bridge those branches need. The
present dossier is a *sibling*, not a continuation: it targets the
**content** functions the dispatcher calls once it has chosen a window —
per-species HP/geometry/palette/healthbox formulas — which are orthogonal to
*which turn's window is selected*. Several of the slices below are staged to
land independently of the ladder; none may edit
`nextCommandHandoff.ts`/`fightCommandPresentation.ts` before ladder slice 10,
and are marked **GATED** where the dispatcher doc's own file list overlaps.

> **Erratum (supervisor, 2026-08-02 audit):** all `battleScene.ts` line
> citations are as of `fc597ac3` and drift +45..+56 after the slice-8 fold
> `fed91e87` (e.g. `dragonBreathGrovyleHp` 8820→8865); re-resolve by symbol,
> not line, when scoping slices. Also §4 slice-4's `renderSceneOffTurnView`
> citation `:33763` was wrong at authoring time — the same doc's §1.3G
> correctly cites `:34185` (now `:34241`).

## 1. Census

### 1.1 Method

```sh
rg -n -i 'grovyle|onix|magby|murkrow|pidgeotto|dragonbreath|sitrus|grantingstar' src/engine --glob '*.ts' -l | sort
rg -n '^(export )?function [a-zA-Z0-9_]*' src/engine/battleScene.ts | rg -i 'grovyle|onix|magby|murkrow|pidgeotto|kabuto|sitrus|grantingstar|dragonbreath|faint|sink|rotate'
rg -n '^(export )?function draw[A-Za-z0-9_]*' src/engine/battleScene.ts
rg -n 'grovyleFaintSinkRowsAndY2|onixSitrusRotateMatrix|turn5GrantingStarPlacement|dragonBreathGrovyleHp' src/engine/battleScene.ts
```

The species-name sweep touches 49 files under `src/engine` (2,290 matching
lines in `battleScene.ts` alone), but most are legitimate: `turn13ResolutionAdapter.ts`,
`magbySendOut.ts`, `battleEndTurnOrchestration.ts`, etc. own real kernel facts
and are *consumers*, not hardcoded entry points. This census restricts to
**functions/tables whose species identity is baked into the declaration
itself** (the name, a literal inside the body, or a literal default) rather
than accepted as a runtime parameter — the shape the four named symbols
share. `extremeSpeedOpponentHealthbox`/`shadowPunchOpponentHealthbox`
(battleScene.ts:2035, 2065 — portable move-staging fixtures for
non-canonical-roster species ARCANINE/DUGTRIO/HAUNTER) and
`bounceSpoinkOpponentHealthbox` (battleScene.ts:2124, SPOINK) already take
`name` as a parameter and are cited below as the achieved target shape, not
as debt; they are **out of scope** — they serve `docs/*-portable-staging-probe.md`
fixtures outside the canonical Battle 1/2 roster, a different program.

### 1.2 The four named symbols, current lines

The inventory's line numbers (`docs/battle-scene-retirement-inventory.md`)
are stale — six more #39 slices landed since. Current locations:

| Symbol | Line | Signature |
| --- | ---: | --- |
| `dragonBreathGrovyleHp` | 8820 | `export function dragonBreathGrovyleHp(t: number, pressTick: number, startHp: number, endHp: number, startDelay: number = DRAGONBREATH_HP_DRAIN_START_DELAY): number` |
| `grovyleFaintSinkRowsAndY2` | 10002 | `export function grovyleFaintSinkRowsAndY2(t: number, startTick: number = GROVYLE_FAINT_SINK_START_TICK, steps: number = GROVYLE_FAINT_SINK_STEPS): { keptRows: number; y2: number }` |
| `onixSitrusRotateMatrix` | 10132 | `export function onixSitrusRotateMatrix(t: number): { pa: number; pb: number; pc: number; pd: number; y2: number } \| null` |
| `turn5GrantingStarPlacement` | 10177 | `export function turn5GrantingStarPlacement(t: number, spawnIndex: number): { frameIndex: number; cx: number; cy: number } \| null` |

**Same-shape-sibling trap, caught immediately:** two of these four are
*already* the generalized target mechanism, just under a species-locked
name. `dragonBreathGrovyleHp` is called a second time at
`battleScene.ts:14853-14858` for turn 13's Pidgeotto DRAGON_BREATH-faint
drain (`dragonBreathGrovyleHp(t, dbPressTick, TURN13_DRAGONBREATH_HP.from,
TURN13_DRAGONBREATH_HP.to)`), and `grovyleFaintSinkRowsAndY2` is called a
second time at `battleScene.ts:14861` for the same turn-13 Pidgeotto faint
sink (`grovyleFaintSinkRowsAndY2(t, TURN13_FAINT_SINK_START_TICK,
TURN13_FAINT_SINK_STEPS)`) — the function's own doc comment at
`battleScene.ts:9990-10000` says this outright ("Pidgeotto's own faint
reuses this same closed form verbatim, re-anchored"). Both are pure
`(t, startTick/pressTick, ...params)` closed forms with **zero species
literal in the body** — the debt left is naming only (a Grovyle-named
function two other species already call through), not un-generalized logic.
`onixSitrusRotateMatrix` and `turn5GrantingStarPlacement` are the two
genuinely single-call-site members: each is a thin wrapper that hardcodes
`ONIX_SITRUS_IDENTITY_RENDER_TICK` (battleScene.ts:10126-10129, a turn-5-only
press-tick anchor) and, for the star, `TURN5_SITRUS_RING_CENTER = { x: 72,
y: 88 }` (battleScene.ts:10371, Onix's baked on-field screen anchor) around
an *already generic* age-based reducer imported from
`src/animation/heldItemHeal.ts` (`sitrusRotationAtAge`,
`sitrusStarPlacementAtAge`, battleScene.ts:1104-1106). The retirement job for
these two is therefore not "invent a generic formula" — one already exists
and is imported — it is "stop deriving the age from a hardcoded turn-5
tick and a hardcoded screen anchor, derive both from real per-battler state."

### 1.3 Sibling families (the sweep's real result: 41 further entry points, 45 total)

Every row is a function/table declaration whose species identity is baked
into its name, a body literal, or a default parameter. Line numbers are
current as of `0d1b87dd`.

**A. HP-drain closed forms (species-named; shape identical to
`dragonBreathGrovyleHp`, all `(t, pressTick, startHp, endHp, startDelay?) =>
number`, clamped linear ramp, no lookup table):**

| Function | File:line | Call sites (grep-counted) |
| --- | --- | --- |
| `dragonBreathGrovyleHp` | battleScene.ts:8820 | 2 — **different species**: Grovyle turn 2 (:8871) + Pidgeotto turn 13 (:14853) |
| `endeavorOnixHp` | battleMenu.ts:2835 | 3 — same species (Onix), different turns: :9197 (turn 2), :9266 (turn 3), :9906 (turn 5) |
| `turn9OnixHp` | battleScene.ts:12911 | 1 — :12962 (turn 9 only) |
| `turn10AerialAceOnixHp` | battleScene.ts:13328 | 2 — same species (Onix), different turns: :13691 (turn 10), :14166 (turn 12) |

`rockSlideOpponentHp` (battleMenu.ts:2280) is the already-generic sibling —
same signature shape, generic name (`Opponent`, not a species) — cited here
as the precedent these four should converge toward by name and by dropping
their sole hardcoded call-site literal endpoints for adapter-read ones.

**B. Held-item-heal thin wrappers (species+turn-anchor-named; each is a
one-line call into an already-generic `src/animation/heldItemHeal.ts`
age-based reducer, translating `t` by the same hardcoded
`ONIX_SITRUS_IDENTITY_RENDER_TICK`):**

| Function | File:line | Wraps |
| --- | --- | --- |
| `onixSitrusRotateMatrix` | battleScene.ts:10132 | `sitrusRotationAtAge` |
| `turn5GrantingStarPlacement` | battleScene.ts:10177 | `sitrusStarPlacementAtAge` (+ `TURN5_SITRUS_RING_CENTER`) |
| `turn5SitrusHealTextVisibleChars` | battleScene.ts:10259 | `sitrusHealTextVisibleCharsAtAge` |
| `turn5SitrusOnixHp` | battleScene.ts:10297 | `sitrusDisplayedHpAtAge` |
| `turn5SitrusResettledBounceTick` | battleScene.ts:10318 | (local `menuIdleBounce` re-anchor, not `heldItemHeal.ts`, but same anchor-constant pattern) |
| `onixSitrusTintCoeff` | battleScene.ts:10349 | `sitrusTintCoeffAtAge` |
| `turn5SitrusRingMatrix` | battleScene.ts:10384 | `sitrusRingMatrixAtAge` (+ `TURN5_SITRUS_RING_CENTER`) |

Plus one same-shape wrapper over a *different* already-generic helper:
`turn5PidgeottoHealthboxSlideDx` (battleScene.ts:10959) wraps the
species-agnostic `healthboxSlideDx` (battleScene.ts:3201, exported) around a
hardcoded `TURN5_PIDGEOTTO_SETTLE_TICK + 1` anchor — identical debt shape to
family B, different consumer.

**C. Identity-specific healthbox content factories** (species name, level,
and max-HP baked into the function; contrast with the already-parameterized
`extremeSpeedOpponentHealthbox`/`shadowPunchOpponentHealthbox` siblings
noted in §1.1):

| Function | File:line | Baked literals |
| --- | --- | --- |
| `kabutoHealthboxContentForHp` | battleScene.ts:1926 | `KABUTO_SENDOUT_BATTLER` (already a named const, but the function itself is KABUTO-only) |
| `onixPlayerHealthboxContentForState` | battleScene.ts:1964 | `ONIX_MENU_BATTLER` |
| `featherDanceOnixOpponentHealthbox` | battleScene.ts:1990 | `name: "ONIX", level: 50, hpFraction: hp / 117` |
| `featherDancePidgeottoPlayerHealthbox` | battleScene.ts:2013 | `name: "PIDGEOTTO", level: 50, maxHp: 156` |
| `flyMurkrowPlayerHealthbox` | battleScene.ts:2104 | `name: "MURKROW", level: 50, hpFraction: hp / 142, maxHp: 142` |
| `magbyPlayerHealthboxContentForHp` | battleScene.ts:2412 | `name: "MAGBY", level: 50, gender: "female"` |
| `pidgeottoHealthboxContentForHp` | battleScene.ts:10929 | **Partially adapter-derived already** (`TURN5_SWITCHIN.replacementSpecies`/`.replacementLevel`, :10935-10936) but `PIDGEOTTO_MAX_HP = 156` (:10917) is still a bare literal one line below the adapter's own `TURN5_SWITCHIN.replacementHp.max` (:10912) |
| `murkrowHealthboxContentForHp` | battleScene.ts:11249 | **Partially adapter-derived already** (`TURN13_SWITCHIN.replacementSpecies`/`.replacementLevel`, :11260-11261) but the cache-miss branch divides by a bare `142` literal (:11263-11264) instead of `TURN13_SWITCHIN.replacementHp.max` |

The last two rows are the concrete, line-cited proof that the rank-2/rank-3
"adapter-derived healthbox literals" precedent (ISSUES.md #39) is *not yet
complete* even in the two windows it names as done — a residual max-HP
literal survives beside the already-converted name/level fields in both.

**D. Species-named boolean/geometry render gates** (no lookup table, pure
closed-form predicate/offset, species baked into the name only):

`endeavorOnixInvisible` (battleScene.ts:8679), `turn9Ep2OnixInvisible`
(:12891), `turn14MurkrowInvisible` (:15980), `turn15OnixInvisible`
(:16319), `turn15MurkrowInvisible` (:16332), `turn15OnixShakeX2` (:16349),
`turn15OnixHealthboxWobbleY2` (:16370), `turn15OnixHp` (:16450),
`turn15OnixSinkSkipRows` (:16486), `grovyleStretchTintCoeff` (:5112),
`turn5PidgeottoFrame` (:10825), `turn13MurkrowMaterializeCoeff` (:11083),
`turn13MurkrowBgFadeY` (:11109), `turn13MurkrowFrame` (:11194),
`turn13SandAttackPidgeottoX2` (:14611). **15 functions.**

**E. GROVYLE/KABUTO intro materialize/stretch cluster** (`void`-returning
draw bodies, not pure geometry, but each is a standalone per-species render
entry the same way the inventory doc's "4405-5467" range already flags):
`drawGrovyleSettled` (:4649), `drawGrovyleMaterialize` (:4784),
`drawKabutoMaterialize` (:4793), `drawGrovyleStretch` (:5652),
`drawGrovyleStretchEarly` (:5690), `drawKabutoHSlideWobble` (:5710).
**6 functions.**

**F. Palette factories:** `getOnixDoubleTeamClonePalette` (:6200, live —
still called at :31866 by the surviving generic double-team clone renderer)
and `turn10OnixDarkPalette` (:6217, live — called at :10471/:10473).
**2 functions.**

**G. Capstone entry point:** `renderSceneOffTurnView` (battleScene.ts:34185,
exported) is documented at its own declaration (:34181-34183) as "Reusable
animation-OFF battlefield compositor... no battle number, turn number, or
canonical trace tick participates" — yet its body directly draws
`kabutoFrontSprite`/`onixBackSprite`, calls `kabutoHealthboxContentForHp`,
reads the module-level `onixPlayerHealthboxContent` constant, calls
`rentalMoveset("ONIX")`, and calls `drawTurn5SitrusSettledMenuChrome`. It has
two real call sites, `src/engine/core.ts:2521` and `:2566`, gated on
`state.stagedBattleTurn`; that field is populated only by
`stageFactoryFullTurnBattle` (`src/engine/stagedBattleTurn.ts:77`), whose own
only callers are `tools/compare/appTrace.ts:316` (the oracle-comparison
harness) and `tests/battleTurnPortability.test.ts` — **not** any real
interactive-play state transition (confirmed: `rg -n
stageFactoryFullTurnBattle src tools tests` returns exactly those three
files). So this function is live production code and genuinely reachable,
but only through the portability-proof path, not through ordinary gameplay
progression today. This is still the single highest-leverage finding of this
census: the *already-generic* entry point rank 1's own retirement produced
is itself still hardcoded to one species pair, and any future wiring of it
into ordinary play would ship that hardcoding as a real gameplay bug, not
just a proof-harness wart. It is both a consumer (see §2) and, by its own
doc comment's claim, meant to be *the* generic render entry point — so it is
counted here. **1 function.**

**H. Literal canonical-party table (not a function, flagged separately per
the brief's "literal stat/geometry tables keyed by canonical episode"
instruction — not counted in the N below):** the array literal
`(["ONIX", "MAGBY", "BAYLEEF"] as const)` appears twice, identically, at
`battleScene.ts:16703` and `battleScene.ts:16893` (`drawTurn15PartySelectList`
and `drawTurn15PartyListObjMask`), gating whether the generic
`renderBattlePartySelect` path or the hardcoded turn-15 path renders. Any
retirement of the turn-15 party-select hardcoding must also collapse this
duplicated literal, not just move it.

### 1.4 Census total

**45 per-species/per-episode render entry points total, of which 41 are new
(not among the four named).** Per-family breakdown, each row = (total
members, of which named):

| Family | Total | Named (already known) | New |
| --- | ---: | ---: | ---: |
| A — HP-drain closed forms | 4 | 1 (`dragonBreathGrovyleHp`) | 3 |
| B — Sitrus/held-item-heal wrappers | 7 | 2 (`onixSitrusRotateMatrix`, `turn5GrantingStarPlacement`) | 5 |
| Slide-dx wrapper (same shape as B, different helper) | 1 | 0 | 1 |
| `grovyleFaintSinkRowsAndY2` (standalone — no sibling shares this exact geometry) | 1 | 1 | 0 |
| C — Identity-specific healthbox factories | 8 | 0 | 8 |
| D — Species-named boolean/geometry gates | 15 | 0 | 15 |
| E — Grovyle/Kabuto intro materialize/stretch | 6 | 0 | 6 |
| F — Palette factories | 2 | 0 | 2 |
| G — Capstone entry point | 1 | 0 | 1 |
| **Total** | **45** | **4** | **41** |

(The one duplicated literal party-species table, §1.3H, is a data finding,
not a function entry point, and is intentionally excluded from this count.)

## 2. Consumer map

| Family | Pixels/geometry owned | Committed traces pinning the window | State/adapter feeding it today |
| --- | --- | --- | --- |
| A (HP drains) | Opponent/player HP-bar fill + digit text during a move's drain phase | `turn2-dragonbreath-off.json` **237**; `turn13-dragonbreath-faint.json` **141**; turn-9 `turn9-quickattack-off.json` **233** + `turn9-quickattack-b-off.json` **231**; turn-10 `turn10-aerialace-off.json` **206**; ENDEAVOR insurance via `turn5-rockslide.json` **256** (ENDEAVOR itself is turn-2/3 content, already-retired class-b survivor) | `TURN13_DRAGONBREATH_HP.{from,to}` (adapter-derived, turn13ResolutionAdapter.ts), but turn-9/turn-10's own endpoints are still call-site literals — not traced to an adapter in this sweep |
| B (Sitrus wrappers) | Onix's rotating back sprite, the two granting stars, the heal text, the HP climb, the resettled bounce clock, the tint, the ring | `turn5-sitrus-a/b/c/d.json` **110/82/181/133**; `turn5-faint.json` **110**; `turn5-switchin.json` **241** | `TURN5_SITRUS.{hp,healLines}` (adapter-derived turn5ResolutionAdapter.ts), but the shared `ONIX_SITRUS_IDENTITY_RENDER_TICK` anchor (:10126-10129) and `TURN5_SITRUS_RING_CENTER` (:10371) are hand-derived RAM-probe constants, not read from any adapter |
| slide-dx wrapper | Pidgeotto's healthbox slide-in x offset | Folded into `turn5-switchin.json` **241** | `TURN5_PIDGEOTTO_SETTLE_TICK` local constant |
| C (healthbox factories) | Every healthbox's name/level/gender/HP-fraction/status glyphs for its species | Every turn-5/6/13/14/15/16 trace that shows a healthbox: `turn5-sitrus-*`, `turn5-switchin.json`, `turn13-switchin.json`, `turn14-fly-miss.json` **213**, `turn15-fly-strike.json` **256** | `pidgeottoHealthboxContentForHp`/`murkrowHealthboxContentForHp` partially read `turn5ResolutionAdapter.ts`/`turn13ResolutionAdapter.ts`; `kabutoHealthboxContentForHp`/`onixPlayerHealthboxContentForState`/`featherDance*`/`flyMurkrowPlayerHealthbox`/`magbyPlayerHealthboxContentForHp` read no adapter at all — pure module-level literals |
| D (gates) | Per-tick invisible/shake/wobble/sink-row/frame-index booleans and offsets that feed the field-base draw functions' optional params | Whichever turn-9/10/13/14/15 trace exercises that window (see rank 5/7/8 rows in `docs/battle-scene-retirement-inventory.md`) | None — pure closed-form RAM-probe fits, no adapter reads at all |
| E (Grovyle/Kabuto intro) | The rank-1-retired Battle-2 command turn's own materialize/stretch pixels | `battle2-off-turn1.json` **179**, `battle2-turn1-rockslide.json` **191**, `battle2-off-turn1-staged.json` **16** (per inventory row 1) | `battle2CommandAdapter.ts` supplies the request/HP facts that gate *when* these draw, but the sprite/tint bodies themselves read no adapter |
| F (palettes) | Onix's double-team clone tint and its turn-10 darkened palette | Folded into whichever trace exercises those two draw paths (turn 1/4 double-team clones for F1; turn 10 field-base darken flag for F2) | None — pure palette-derivation math off the static sprite asset |
| G (capstone) | The entire animation-OFF battlefield for "the currently extracted ONIX/KABUTO encounter" per its own doc comment | Whatever calls `renderSceneOffTurnView` today (its own `SceneOffTurnView`, battleScene.ts:33763) | `SceneOffTurnView` fields are already generic (`opponentHp`, `playerY2`, `bottom`, …), but the function body's asset/content lookups are not |
| H (party table) | Whether turn-15 party-select renders the hardcoded fast path or falls back to generic `renderBattlePartySelect` | `turn15-party-select.json` / `turn15-party-select-delayed.json` | `state.party` (real, from `PartySelectState`) compared against the literal array |

## 3. Target mechanism

| Family | Generic owner to converge on | Precedent it extends |
| --- | --- | --- |
| A | `rockSlideOpponentHp`'s own shape (battleMenu.ts:2280) generalized so its endpoints are always adapter-read, not sometimes-literal; rename away from the species suffix once every call site supplies `(startHp, endHp)` from a resolution adapter | Rank-3's own faint-sink formula precedent (ISSUES.md #39: "faint-sink geometry from the generic formula at Grovyle's yOffset") — the same "hand a defaulted param instead of hardcoding" idiom `dragonBreathGrovyleHp`/`grovyleFaintSinkRowsAndY2` already demonstrate working for 2 species |
| B | Nothing new — the generic reducer (`src/animation/heldItemHeal.ts`) already exists. The fix is call-site: derive the age from a real semantic event (the resolution adapter's own Sitrus-proc-trigger tick) instead of `ONIX_SITRUS_IDENTITY_RENDER_TICK`, and derive the ring/star screen center from the same per-battler field-geometry source the generic route already has (per the inventory doc: "generic field-art/healthbox catalogs") instead of `TURN5_SITRUS_RING_CENTER` | The cry-duration gate precedent (semantic-event-driven timing, not a hardcoded turn tick) and rank-3's adapter-derived HP endpoints |
| slide-dx | Same as B — `healthboxSlideDx` is already generic; only the settle-tick anchor needs to move from a hardcoded constant to an adapter-read send-out-completion tick | Same |
| C | `composeOpponentHealthbox`/`composePlayerHealthbox` (`healthboxAssembly.ts`) already ARE the generic compositor — every one of these 8 factories already calls it. The retirement is parameterizing `name`/`level`/`maxHp` as call-time arguments (exactly the shape `extremeSpeedOpponentHealthbox`/`shadowPunchOpponentHealthbox` already prove works, §1.1) sourced from the owning resolution adapter's `replacementSpecies`/`replacementLevel`/`replacementHp.max` (already present for Pidgeotto/Murkrow, per §1.3C) — and for Onix/Kabuto/Magby/Grovyle, from the equivalent anchor-battler/menu-battler constants that already exist (`ONIX_MENU_BATTLER`, `KABUTO_SENDOUT_BATTLER`, `magbyBackSprite`'s sibling stat source) | Rank-2/rank-3's own "MURKROW/PIDGEOTTO level/healthbox/sent-out literals now adapter-derived" plus the already-parameterized extremeSpeed/shadowPunch siblings as proof-of-shape |
| D | No single owner — these are the smallest, most numerous, and most heterogeneous family. Each is a 1-3 line closed-form predicate/offset already isolated behind a named function; the retirement is not a new mechanism but confirming (via the differential-replay windows in §4) that the species name in the function identifier can be dropped once its sole caller passes species-scoped state (mirroring the rank-4 "each canonical caller passes its own staged stat" idiom already used for the stat-fall banner) | Rank-4's "each canonical caller passes its own staged stat" bridge |
| E | The Battle-2 command turn's request/field/HP facts are already on `battle2CommandAdapter.ts` (rank 1, retired). This family is the one piece of that window rank 1 did NOT convert: the sprite/tint draw bodies. Target is a generic "front/back materialize" draw primitive parameterized by tileset/palette/corner, with GROVYLE/KABUTO becoming its first two callers rather than its only possible ones | Rank-1's `battle2CommandAdapter.ts` retirement (same window, unfinished half) |
| F | Already-generic palette-derivation helpers (`darkenPaletteToward10`) exist; the retirement is threading the source sprite asset as a parameter instead of closing over `onixBackSprite` by name | N/A — smallest, lowest-risk family; may not be worth a dedicated slice (see §4 slice 6 sizing note) |
| G | This IS the target mechanism for every other family — once C/E/F feed it species-parameterized inputs instead of literals, `renderSceneOffTurnView`'s own body becomes actually generic, matching its existing doc comment | The doc comment at its own declaration already states the intended contract; this is the capstone convergence point, not a separate precedent |
| H | `renderBattlePartySelect`'s own generic path (already exists, already the fallback) — target is making it the *only* path once the turn-15 roster is read from real party state instead of compared against a literal | Same generic fallback already present in the file today |

## 4. Slice plan

Acceptance for every slice: `npm run compare:differential -- <trace...>
--base <clean parent sha> --summary`, exit 0, every named capture list
byte-identical, **plus `battle-command-generated-off.json` (128 captures)**
as standing insurance on any slice touching a resolution/orchestrator file
(families A/C, since their target reads from resolution adapters). No slice
edits `nextCommandHandoff.ts` or `fightCommandPresentation.ts` — slices 3-4
below are marked **GATED** because their target mechanism benefits from (but
does not strictly require) those files, and landing them before dispatcher
slice 10 risks a merge collision with the in-flight ladder work on the same
lines of `battleScene.ts`.

| Slice | Exact files touched, bounded result | Differential-replay windows | Out of scope |
| --- | --- | --- | --- |
| 1. Family-C healthbox factory parameterization, Pidgeotto/Murkrow residuals | Touch `src/engine/battleScene.ts` only (lines 10917, 10929-10944, 11249-11270): replace the bare `PIDGEOTTO_MAX_HP = 156` literal with `TURN5_SWITCHIN.replacementHp.max` and the bare `142` divisor in `murkrowHealthboxContentForHp`'s cache-miss branch with `TURN13_SWITCHIN.replacementHp.max`. No signature change, no new file. | `turn5-switchin.json` **241**, `turn5-sitrus-a/b/c/d.json` **110/82/181/133**, `turn13-switchin.json` **242**, `turn14-fly-miss.json` **213**, `turn15-fly-strike.json` **256**; insurance `battle-command-generated-off.json` **128** | Every other family-C factory (kabuto/onix/featherDance/flyMurkrow/magby) — those need a name/level parameter added, a bigger call-site change, not a two-literal swap |
| 2. Family-C parameterization, remaining six factories | Touch `src/engine/battleScene.ts`: add `name`/`level`/`maxHp` parameters to `kabutoHealthboxContentForHp`, `onixPlayerHealthboxContentForState`, `featherDanceOnixOpponentHealthbox`, `featherDancePidgeottoPlayerHealthbox`, `flyMurkrowPlayerHealthbox`, `magbyPlayerHealthboxContentForHp`, threading each call site's already-available constant (`ONIX_MENU_BATTLER`, `KABUTO_SENDOUT_BATTLER`, etc.) explicitly instead of closing over it. Add `tests/battleSceneHealthboxFactories.test.ts` pinning each factory's output against its pre-change literal call for at least 2 HP values. | Full slice-1 list plus `turn6-rockslide-a/b.json`, `turn7-rockslide-a/b/c/d.json`, `turn8-bind-a/b.json` (FEATHER_DANCE consumers) — use the dispatcher doc's own slice-1 window list, since these traces are shared; insurance `battle-command-generated-off.json` **128** | Adding a genuinely new species (this only makes existing single-use factories accept the one species they already serve as data instead of identity) |
| 3. **GATED (after dispatcher ladder slice 10).** Family-A HP-drain generalization | Touch `src/engine/battleScene.ts` (`dragonBreathGrovyleHp`, `turn9OnixHp`, `turn10AerialAceOnixHp`), `src/engine/battleMenu.ts` (`endeavorOnixHp`), rename all four to drop the species suffix once call sites pass adapter-read endpoints; touch each move's own resolution adapter to expose `{from, to}` for turn-9/turn-10 the way `turn13ResolutionAdapter.ts` already does. | `turn2-dragonbreath-off.json` **237**, `turn13-dragonbreath-faint.json` **141**, `turn9-quickattack-off.json` **233**, `turn9-quickattack-b-off.json` **231**, `turn10-aerialace-off.json` **206**; insurance `battle-command-generated-off.json` **128** | Family D's own gates, even though several share a call site with these HP functions |
| 4. **GATED (after dispatcher ladder slice 10).** Capstone convergence, `renderSceneOffTurnView` | Touch `src/engine/battleScene.ts` (`renderSceneOffTurnView`, `SceneOffTurnView`), `src/engine/core.ts` (its two call sites, :2521/:2566), and `src/engine/stagedBattleTurn.ts`, threading species/asset identity through `SceneOffTurnView` instead of closing over `kabutoFrontSprite`/`onixBackSprite`/`ONIX`. Depends on slice 2 already having parameterized the healthbox factories it calls. | `tests/battleTurnPortability.test.ts`'s own assertions (its sole non-harness exerciser) plus whatever `tools/compare/appTrace.ts:316`-staged trace(s) exist for the `battle2-off-turn1-before-confirm`-style stage keys — enumerate via `rg -n 'stagedBattleTurn:' tools/compare/appTrace.ts` before scoping | Any change to `factoryRoundBattleOrchestrator.ts`'s own separate, unrelated render path (confirmed distinct: `battle-command-generated-off.json` exercises the orchestrator route, not this function — see §1.3G) |
| 5. Family D gate consolidation, turn-15 Onix cluster | Touch `src/engine/battleScene.ts` (`turn15OnixInvisible`, `turn15MurkrowInvisible`, `turn15OnixShakeX2`, `turn15OnixHealthboxWobbleY2`, `turn15OnixHp`, `turn15OnixSinkSkipRows`) — each is grep-confirmed single-caller (`rg -c '\bturn15OnixInvisible\('` etc. all return 2: the declaration line plus exactly one call site), then inline the species identity into the caller's own parameter list rather than the function name. Small, mechanical, no formula change. | `turn15-fly-strike.json` **256**, plus `turn15-sendout-rung2/3/4a/5/6.json` (**43/46/16/144/195**) and their five `-delayed` twins (**43/46/16/144/195** again) — 11 traces total | Turn-14's own `turn14MurkrowInvisible` (different window, different owning adapter — do not fold the two turn ranges into one slice) |
| 6. Family E, Grovyle/Kabuto intro materialize primitive | Touch `src/engine/battleScene.ts` (`drawGrovyleSettled`, `drawGrovyleMaterialize`, `drawKabutoMaterialize`, `drawGrovyleStretch`, `drawGrovyleStretchEarly`, `drawKabutoHSlideWobble`): extract one parameterized `drawFrontBackMaterialize(fb, t, handoffTick, tileset, palette, corner)` primitive, make the six existing functions thin callers. | `battle2-off-turn1.json` **179**, `battle2-turn1-rockslide.json` **191**, `battle2-off-turn1-staged.json` **16** | Family F's palette functions, even though they're declared nearby and touch the same sprite assets — separate concern (palette derivation, not materialize geometry) |
| 7. Family B, Sitrus anchor/geometry de-hardcoding | Touch `src/engine/battleScene.ts` (all 7 family-B wrappers plus `turn5PidgeottoHealthboxSlideDx`), `src/engine/turn5ResolutionAdapter.ts` (expose the real Sitrus-proc-trigger tick and Onix's on-field center if not already present — confirm via `rg -n 'onFieldCenter\|proc.*[Tt]ick' src/engine/turn5ResolutionAdapter.ts` before scoping, since this may already exist for other purposes). | `turn5-sitrus-a/b/c/d.json` **110/82/181/133**, `turn5-faint.json` **110**, `turn5-switchin.json` **241**; insurance `battle-command-generated-off.json` **128** | Family F's palette work; any change to `src/animation/heldItemHeal.ts`'s own already-generic reducer body |

Slices 1, 2, 5, and 6 are ladder-independent (no dispatcher file touched) and
may land in any order ahead of the ladder. Slices 3 and 4 are gated. Slice 7
touches a resolution adapter but not the ladder files themselves, so it is
ladder-independent but should land after slice 2 (it reuses the same
adapter-reading idiom slice 2 establishes). Family F (palette factories) and
family H (the duplicated party-species array) are each small enough that
they are folded into slice 6's and slice 5's own commits respectively rather
than given standalone rows — flagging this explicitly per the "no silent
caps" rule: they are *included*, just not separately numbered.

## 5. Risks and traps

1. **Composed timing chains.** Every family-B wrapper reads the *same*
   `ONIX_SITRUS_IDENTITY_RENDER_TICK` (battleScene.ts:10126-10129). Moving
   one wrapper to an adapter-read anchor while leaving siblings on the
   hardcoded constant silently desyncs them relative to each other — this is
   the exact "cross-turn bounce bug recurred three times" pattern the
   dispatcher doc already documents at its own §"Risks and traps" item 1;
   the fix here is the same: slice 7 must move all 7 wrappers in the same
   commit, not incrementally, or the ring/rotation/text/HP-climb pieces will
   visibly desync mid-window.
2. **Shared helpers serving multiple windows.** `dragonBreathGrovyleHp` and
   `grovyleFaintSinkRowsAndY2` already serve two call sites (turn 2 and turn
   13). Any change to their *default* parameter values (rather than adding
   an adapter-read call-site argument) silently changes turn 13's rendering
   too — slice 3 must audit both call sites' resulting values, not just the
   one being "fixed."
3. **One-tick render lag asymmetry.** `onixSitrusRotateMatrix`'s own doc
   comment (battleScene.ts:10101-10124) records that its render-to-RAM lag
   is **+2**, not the file's ordinary **+1** (used by `turn5SitrusRingMatrix`
   at the same anchor). A slice that "generalizes" the anchor tick by
   sharing one age variable across both functions must preserve this
   asymmetry explicitly (e.g., two named lag constants, not one), or the
   rotation will silently drift 1 tick against the ring/stars.
4. **Adapter presence is not readiness.** Family C's `pidgeottoHealthboxContentForHp`/`murkrowHealthboxContentForHp`
   already import their owning adapter's `replacementSpecies`/`.replacementLevel`
   — proof that "the adapter is imported" does not mean "every literal in
   this function is adapter-derived" (the max-HP literal survived beside
   them, per §1.3C). Slice 1/2 must re-check every literal in a factory
   being touched, not stop at the first one already converted.
5. **The capstone is real but proof-only.** `renderSceneOffTurnView` is
   genuinely called from production code (`core.ts:2521`/`:2566`), but its
   sole trigger, `state.stagedBattleTurn`, is only ever populated by
   `stageFactoryFullTurnBattle`, whose only two callers are the
   oracle-comparison harness and one Tier-1 portability test — never a real
   interactive-play transition (verified by grep, §1.3G). Do not read "it's
   called from core.ts" as "ordinary play exercises the Onix/Kabuto
   hardcoding today" — it doesn't, yet. Conversely, do not defer slice 4
   as low-priority *because* it's proof-only: if this path is ever wired
   into live progression (a natural next step once the dispatcher ladder
   frees `core.ts`'s render switch), the hardcoding ships as a real
   gameplay bug on day one unless slice 4 has already landed.
6. **Family D's sheer count invites batching mistakes.** 15 gate functions
   span turns 9, 13, 14, and 15 and at least three species (Onix, Murkrow,
   Pidgeotto). A slice that "does family D" in one commit risks the same
   mis-scoped-batch failure the dispatcher doc's own risk list warns about
   for turn-resolved fields (PROGRESS-archive's "eight one-field-worker
   traps") — slice 5 above deliberately scopes to the turn-15 Onix cluster
   only and explicitly excludes turn 14's sibling to keep the diff
   reviewable and the differential-replay window list short enough to
   actually run in a 60-minute cap.
