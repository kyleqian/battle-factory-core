# §1e patch-site retirement + hand-fit retirement ladder (ISSUES #71 remainder)

Status: docs-only design + live census, taken at `eba3e73f` (2026-08-17)
against `src/engine/battleScene.ts` at **45,758 LOC** (up from the
2026-08-03 scout's ~34k). No `src/`/`tests/` edit in this step; every count
below was re-derived live with `grep -n`/a direct `npx tsx` import, not
copied from `docs/send-out-live-wiring-consumer-map.md` (referred to below
as "the old doc"). Read the old doc first — this is a delta + ladder on top
of it, not a replacement; §1-§4 there (the seam taxonomy, hand-fit
descriptions, banked-reducer survey, minimum-viable Slice A/B) are still
accurate and are not re-derived here except where the numbers changed.

Per `ISSUES.md` #71 (2026-08-10 user decision): the playable path stays
faithful to Battle Scene OFF, which skips send-out intros entirely. Per-tick
playback and terminal-offset wiring at any OFF-profile settle hook are
**settled, twice over** — Slice A wiring was tried, RAM-probed wrong, and
removed (`54979bf3`); Slice D (per-tick playback) was found not-applicable
before any render code was written. Neither is reopened here. What remains
open is the internal code-health remainder this doc scopes: the §1e
move-window patch sites, and the three `src/engine/`-owned hand-fits.

---

## 1. Live census

### 1.1 Method

```sh
grep -c "speciesFrontIdleRestOffset(" src/engine/battleScene.ts   # 123
grep -n "speciesFrontIdleRestOffset(" src/animation/sceneOnPresentation.ts  # 2 (4960, 9416)
grep -n "^export function renderSceneOnMovePresentation" src/engine/battleScene.ts  # 17553
# function body ends at the next col-0 `}` — 45092 (confirmed by reading context)
```

`renderSceneOnMovePresentation` (`battleScene.ts:17553-45092`, **27,540
lines**, up from ~15,700 at the old doc's sha) is reached only via
`core.ts:3330`, gated on `state.sceneOnPresentation` — a distinct debug/
presentation-authoring state, not the live Battle-Scene-OFF round-controller
path this worker's own oracle exercises. This is the "ON-profile-legacy"
framing ISSUES #71 already uses for it.

### 1.2 Call-site count and split

**123** call sites in `battleScene.ts` + **2** in `sceneOnPresentation.ts` =
**125 total** (old doc: 56 + 2 = 58). **+67 since 2026-08-03** — the
function's line count nearly doubled as more moves were ported in the
interim; the patch-site pattern was copy-pasted onto each new move rather
than retired.

Partitioning the 123 `battleScene.ts` sites by whether they fall inside
`renderSceneOnMovePresentation`'s line range:

| Location | Count | Verdict |
| --- | --- | --- |
| Outside `renderSceneOnMovePresentation` (lines 5369, 6483, 11145, 11282) | 4 | **Done, out of scope** — these are the 4 canonical Slice-A settle hooks (`drawGrovyleSettled`, `drawKabutoHSlideWobble`'s settle branch, `drawTurn5PidgeottoSettled`, `drawTurn13MurkrowSettled`), each a single literal call (`"GROVYLE"`, `"KABUTO"`, `"PIDGEOTTO"`, `"MURKROW"` respectively) already wired per Slice A (ISSUES #71 entry 890) and explicitly confirmed untouched-and-correct in the Slice-D record ("their species are all `{0,0}` regardless, so nothing about them was ever wrong"). Not part of this ladder. |
| Inside `renderSceneOnMovePresentation` | 119 | The §1e debt |
| `sceneOnPresentation.ts` (4960, 9416) | 2 | Already-generic template — see §3 |

**§1e total: 121 sites** (119 + 2), spanning **108 distinct move branches**
(`if (state.config.move === "<MOVE>")`, up from ~103 at the old sha),
mapped by nearest-enclosing-branch bisection over
`grep -noE 'state\.config\.move === "[A-Z_]+"'`. Full move→line→pattern
table generated this session (available by re-running the grep/bisect
above; not reproduced in full here for length — §5's rung table has the
per-rung slices).

### 1.3 Guard-pattern breakdown

By the literal `speciesFrontIdleRestOffset(<arg>)` argument, across all 123
`battleScene.ts` sites:

| Argument pattern | Count | Notes |
| --- | --- | --- |
| `"ONIX"` | 90 | All inside §1e. Every one sits behind a local `playerToOpponent`/`opponentToPlayer` pair-lock computed a few lines above, each ending in `if (!playerToOpponent && !opponentToPlayer) throw new Error(...)` — same shape as the old doc's SANDSTORM/GROWTH examples, spot-checked again this session at BLIZZARD (`:17628`), SANDSTORM (`:18572`), SWAGGER (`:32485-32488`), ANCIENT_POWER (`:37514`). |
| `view.target.species` | 19 | Dynamic in syntax, pair-locked in effect — the enclosing throw-guard proves `view.target.species` can only ever be one of two literal values at runtime (spot-checked GROWTH `:26084`, HARDEN `:34034`). |
| `view.attacker.species` | 1 | WISH (`:37611`), same shape. |
| `opponentBattler.species` | 1 | ANCIENT_POWER (`:37514`), same shape — `opponentBattler` is a local already assigned to whichever of `view.target`/`view.attacker` is on the opponent side. |
| Other literal (non-ONIX) | 8 | `PRIMEAPE`×2 (KARATE_CHOP, BULK_UP), `MURKROW`×1-inside (PERISH_SONG, the other MURKROW use is the outside-scope settle hook), `TOGETIC`, `RATTATA`, `PIDGEOTTO`†, `MAREEP`, `HOPPIP`, `YANMA` — same pair-lock shape, each the "other half" of an ONIX pair branch. †`PIDGEOTTO`/`GROVYLE`/`KABUTO` literal counts (1 each) are entirely the 4 outside-scope sites, not §1e. |
| Outside-scope literals (`GROVYLE`, `KABUTO`, `PIDGEOTTO`, `MURKROW`) | 4 | The done settle hooks from §1.2's first row. |

93+6+1 = **100 of the 121 §1e sites repeat one of two exact fallback
idioms verbatim**: `speciesFrontIdleRestOffset(<arg>) ?? { x2: 0, y2: 0 }`
(93×) or `speciesFrontIdleRestOffset(<arg>)?.x2 ?? 0` / `?.y2 ?? 0` (6+1×).
This is the literal duplicated fragment — see §3.

**Re-derived empirical fact (unchanged from the old doc):** of all 386
species in `frontAnimIds.species`, only **ONIX** and **RATTATA** have a
nonzero terminal offset, both `{x2: 1, y2: 0}` (re-run this session via
direct `speciesFrontIdleRestOffset` import over every JSON key — identical
result to 2026-08-03). Consequence for the census: of the 121 §1e sites,
only the 90 ONIX-literal/pair sites and the single RATTATA site (SWAGGER,
`:32488`, whose own fallback default is correctly `?? { x2: 1, y2: 0 }`,
matching the table) can ever produce a nonzero pixel offset today. The
other 8 one-off literal sites (PRIMEAPE, TOGETIC, MAREEP, HOPPIP, YANMA,
inside-scope MURKROW) are provably pixel-inert **regardless of any
refactor**, since their species always resolves `{0,0}` — real code, but
currently dead weight pixel-wise, not something this ladder needs to treat
as higher-risk than the ONIX sites.

### 1.4 Delta vs the 2026-08-03 doc

- Site count: 58 → 125 total (§1e-class: 58 → 121), **+67**, all new
  move-window ports, same copy-pasted shape.
- Move-branch count: ~103 → 108.
- The function itself: ~15,700 → 27,540 lines (`renderSceneOnMovePresentation`).
- Two sites (`sceneOnPresentation.ts:4960,9416`, DRAGON_RAGE/SHADOW_PUNCH)
  are **new evidence that a fully generic version of this call already
  exists in production** — not present in the old doc's framing at all
  (the old doc treated all "dynamic `view.target.species` reads" as
  pair-locked; these two genuinely are not — see §3).
- Species-count (386), nonzero-offset species (ONIX+RATTATA only), and the
  banked-reducer survey (§3/§4 of the old doc) are all unchanged and were
  spot-re-verified, not re-derived in full.
- Hand-fit status (§2 below): the old doc's Slice C ("document + throw-guard
  the 3 back hand-fit consumers") is **confirmed DONE and still live** —
  this is new information this doc adds; the old doc predates that work.

---

## 2. Hand-fit inventory

All four line cites re-confirmed live this session.

### ONIX front terminal — `src/animation/speciesIdleAnim.ts:7549` (`speciesFrontIdleRestOffset`)

Unchanged from the old doc: this is not a species-specific hand-fit at the
function level — it **is** the general front-idle dispatcher, doing its own
species→family lookup internally, returning a real value for all but 25
unreachable `SPECIES_OLD_UNOWN_*` ids. There is nothing to "retire" here
except its own over-copy-pasted call sites — that's §1e/§5, not a separate
hand-fit track.

### MAGBY back — `src/engine/magbySendOut.ts:62` (`magbySendOutAnimation`)

Encodes `BACK_ANIM_SHAKE_GLOW_RED` for MAGBY's Docile nature specifically, a
task-relative `logicalTick` (0 = first visible `ReleaseMonFromBall` frame,
not a battle-global tick). **Consumer, `drawTurn15ForcedSwitchRelease`
(`battleScene.ts:16235`), already throw-guards species at its own top**
(`if (species !== "MAGBY") throw new Error(...)`, `:16236-16242`) — this is
ISSUES #71's Slice C (entry 891, 2026-08-03), confirmed still live and
unchanged this session. 4 call sites (down from the old doc's 5 — the set
shifted, not shrank): `:16014`, `:16875` (literal `"MAGBY"`), `:17302`
(literal `"MAGBY"`), and a **new 4th call site since the old doc**,
`:45758`, which passes `view.field.player.name` — genuinely dynamic — but
is itself already gated `view.field.player.name === "MAGBY"` before it ever
calls in (per the function's own doc comment, `:16225-16234`, which states
this explicitly and is accurate on inspection). Retirement must still
preserve: (a) Docile-nature specificity — nature isn't threaded anywhere in
this presentation layer, so the guard can only enforce species, not nature,
today; (b) the task-relative tick anchor; (c) the ball-fade/glow palette
handoff boundary (`:55-61` of `magbySendOut.ts`).

### ONIX back — `src/engine/battleMenu.ts:733-749` (`PLAYER_SETTLE_WOBBLE_Y2_TABLE` / `playerMaterializeSettleY2` / `playerMaterializeSettleTintCoeff`)

Line-exact match to the old doc's corrected citation. Two consumers, both
already covered by Slice C, confirmed live:

- **Legacy route**, `drawPlayerMaterializeSettle` (`battleScene.ts:5628`):
  throw-guards on `encounter !== "destin" && encounter !== "jenson"`
  (`:5629-5635`), with a doc comment (`:5615-5626`) explicitly naming
  `encounter` as "the closest available validity proxy" since neither this
  function nor its callers carry a species/nature value at all.
- **Generated route**, `generatedPlayerMaterializeSettleY2`
  (`battleScene.ts:5108`): **not** throw-guarded — deliberately, since this
  is the real arbitrary-species live path (every generated battle hits a
  non-ONIX species constantly) and throwing would break every generated
  round. Instead it silently gates on `species === 95 && speciesSymbol ===
  "ONIX"` (`:5120-5122`) and returns flat `y2 = 0` for every other species,
  which entry-894's RAM probe (KADABRA lead,
  `docs/probes/kadabra-materialize-settle/`) confirmed is the **correct**
  behavior for non-ONIX species today, not a stopgap bug — each species'
  real settle is its own distinct back-anim family, un-modeled until rung 4.

Retirement must preserve: the fact the table is valid only for whatever
nature the two fixed legacy ONIXes and one committed generated encounter
actually have, and must not fold the *separate* `Task_FadeMon_ToNormal`
tint-fade mechanism (species-generic, correctly shared already) into the
back-anim residual.

### KABUTO front — `src/engine/kabutoSendOut.ts:61` (`kabutoHSlideWobble`) + `:45` (`kabutoFrame`)

Real frame-by-frame `Anim_HorizontalSlideWobble` playback, not just a
terminal offset — duplicates the banked `horizontalSlideWobbleFrameAtTick`
(`speciesIdleAnim.ts`) function-for-function. Consumer,
`drawKabutoHSlideWobble` (`battleScene.ts:6471`), **already throw-guards**
`encounter !== "jenson"` (`:6472-6474`), doc comment (`:6460-6469`)
confirms both callers are already `isJenson`-gated so `encounter` is a
real, not just proxy, validity check. Slice C, confirmed done. Retirement
must preserve: its own `elapsed`-relative-to-handoff tick anchor (distinct
from the front reducers' `ticksSinceStart` convention) and its coupling to
`kabutoFrame` (the OAM-frame half no banked reducer produces).

### Conclusion

**All three genuine `src/engine/` hand-fits (MAGBY back, ONIX back, KABUTO
front) already carry Slice C's documented-and-guarded interim contract**,
confirmed live and unchanged this session — nothing regressed, nothing
newly needs a guard added. The only thing standing between "guarded" and
"retired" for these three is the animation lane's rung-4 back-family
dispatcher (68 functions, per the program doc, **not started** — confirmed
this session, `grep -rln "BackAnim\|backAnim\|BACK_ANIM" src/animation/`
still returns only `speciesIdleAnim.ts`'s own disclaimer comment). That is
explicitly the animation lane's program, not main's, per ISSUES #71's own
text ("not a prerequisite for wiring the completed front family"). **This
doc's rung ladder therefore does not include an actionable rung for MAGBY/
ONIX-back/KABUTO retirement** — only a named, deliberately-deferred rung
(§5, Rung 9) describing the swap-over shape for whenever rung 4 lands, so a
future worker doesn't have to re-derive it. The only genuinely
main-lane-actionable retirement today is the §1e ONIX-front patch-site
consolidation (§5, Rungs 0-8).

---

## 3. Systemic mechanism proposal

### The template already exists, twice

`sceneOnPresentation.ts:4960` (`dragonRageTargetOffset`) and `:9416`
(`shadowPunchTargetShakeX2`) already call `speciesFrontIdleRestOffset`
**generically** — no pair-lock, no throw-guard, just:

```ts
if (target.geometry.side === "opponent") {
  const idle = speciesFrontIdleRestOffset(target.species);
  if (idle) return idle; // or idle.x2, depending on caller shape
}
```

This is the shape ISSUES #71's own GROWTH comment (§1e) wishes existed
everywhere. It already does, in exactly 2 of 121+2 places.

### What's actually duplicated

Not the *mechanism* — `speciesFrontIdleRestOffset` is already the one
general function, already imported once (`battleScene.ts:1252`) and reused
at every site. Two distinct things are duplicated instead:

1. **The `?? { x2: 0, y2: 0 }` / `?.x2 ?? 0` / `?.y2 ?? 0` fallback idiom**,
   repeated verbatim at 100 of the 121 §1e sites (§1.3). A one-line helper
   collapses this:
   ```ts
   // src/animation/speciesIdleAnim.ts, alongside speciesFrontIdleRestOffset
   export function speciesFrontIdleRestOffsetOrZero(species: string): { x2: number; y2: number } {
     return speciesFrontIdleRestOffset(species) ?? { x2: 0, y2: 0 };
   }
   ```
   Purely mechanical — every call site currently reading
   `speciesFrontIdleRestOffset(X) ?? { x2: 0, y2: 0 }` becomes
   `speciesFrontIdleRestOffsetOrZero(X)`; `?.x2 ?? 0` becomes
   `speciesFrontIdleRestOffsetOrZero(X).x2`. The RATTATA site (SWAGGER)
   keeps its own `?? { x2: 1, y2: 0 }` untouched — that fallback is not the
   duplicated idiom and encodes real information (SWAGGER's fallback is
   the *known* RATTATA value, not a zero default).

2. **The hardcoded species literal** (90 ONIX + 8 others = 98 sites) where a
   real dynamic battler expression is already sitting in scope a few lines
   above the call, proven equal to the literal by the branch's own
   throw-guard. This is the actual "hand-copy" ISSUES #71 flags. The fix is
   a per-site literal→expression substitution — **not** a new hook, since
   `speciesFrontIdleRestOffset` already accepts a dynamic string. Shape
   varies per site (some already name an `opponentBattler` local; others
   only have `playerToOpponent`/`view.target`/`view.attacker` in scope and
   need the equivalent expression written inline) — heterogeneous enough
   that this doc does not prescribe one textual transform, only the
   invariant each rung must preserve: **the substituted expression's
   species must be the same value the enclosing throw-guard already proved
   the literal to be**, so the result is provably pixel-identical, not
   independently re-derived.

### Why not `sendOutDispatcher`

`src/animation/sendOutDispatcher.ts`/`sendOutSpriteFrame.ts` (rung 3) is
the per-tick *playback* dispatcher — Slice D's cross-lane ask, closed
not-applicable on this worker's OFF profile (ISSUES #71). The §1e sites are
all **terminal/static offset** consumers, already served in full by
`speciesFrontIdleRestOffset` alone. Routing them through the per-tick
dispatcher would add a real dependency (species+ticksSinceStart, an anchor
this codebase doesn't have agreed for these ON-profile-legacy windows
either) for zero benefit over the function these sites already call.
**No dispatcher involvement in this design** — a thinner shared helper
(item 1 above) is the whole mechanism, matching "prefer the smallest design
that deletes the duplication."

### What this design deliberately does not touch

The pair-lock/throw-guard block above each call site (validating which
hardcoded sprite *art* — tileset/palette — gets drawn) is a different
concern (art selection, not idle-offset dispatch) and stays exactly as-is
at every site. Generalizing art selection itself is the "bigger refactor"
the old doc's §1e already flagged as out of scope, and remains out of scope
here.

---

## 4. Boundary-ratchet analysis

`tests/animation/animationBoundaryRatchet.test.ts`, re-read this session,
pins three things:

1. `src/animation` → `src/engine` imports: allowlist is exactly
   `battleMenu.ts`, `bg.ts`, `rng.ts`.
2. `src/animation` may never import the battle kernel/AI (regex match on
   `battleScript|factoryAi|roundController|battleResolutionAdapter|
   battleDecisionBoundary`).
3. `src/engine` → `src/animation` imports: allowlist is exactly
   `battleScene.ts` and `core.ts`.

**Every rung in §5 needs zero ratchet widening.** `speciesFrontIdleRestOffset`
is already imported into `battleScene.ts` (`:1252`, from
`../animation/speciesIdleAnim.ts` — already an allowlisted consumer file);
adding `speciesFrontIdleRestOffsetOrZero` to that same existing import
statement and reusing it at up to 121 already-`battleScene.ts`-local call
sites touches zero new files on either side of the boundary. The ratchet's
regex only tracks `from "..."` specifiers per file, not which symbols are
named in an import list, so this is true regardless of how many new named
exports `speciesIdleAnim.ts` grows.

This also holds for the **deferred** hand-fit swap-over (Rung 9, §5): if/
when the animation lane's rung-4 back dispatcher lands, the natural
integration point is still `battleScene.ts` (already allowlisted) calling
the new dispatcher directly at its 3 existing consumer call sites, while
`magbySendOut.ts`/`battleMenu.ts`/`kabutoSendOut.ts` (none of which import
from `src/animation` today, confirmed by grep) simply stop being imported
— **not** those three files reaching into `src/animation` themselves, which
*would* require widening rule 3's allowlist. This is a design constraint
worth stating explicitly for whoever eventually plans that rung: keep the
new dispatcher call in `battleScene.ts`, don't let it leak into the three
`src/engine/` hand-fit files.

No variant of this design requires widening. Nothing to compare against —
there is no alternative on the table that would need it.

---

## 5. Rung ladder

### Rung 0 — add the shared fallback helper (prerequisite, ~15 min)

**Scope:** `src/animation/speciesIdleAnim.ts` — add
`speciesFrontIdleRestOffsetOrZero` (§3) next to `speciesFrontIdleRestOffset`,
export it. `battleScene.ts:1252`'s import list gains one name. No call site
changed yet — the new function is unused until Rung 1.
**Verification:** new unit test in `tests/animation/speciesIdleAnim.test.ts`
(a `describe("speciesFrontIdleRestOffsetOrZero")` block asserting it equals
`speciesFrontIdleRestOffset(...) ?? {x2:0,y2:0}` for ONIX, RATTATA, and one
zero species) + full `npm test` + `npm run build` + `npm run typecheck`.
**Pixel-inert by construction:** new, uncalled code — no existing render
path changes.
**Rollback:** revert the single commit; nothing downstream depends on it yet.

### Rungs 1-8 — §1e literal→dynamic substitution, batched by move

108 moves batched into 8 groups of ~14 by line-number order (contiguous
ranges keep each rung's diff easy to review). Per rung: replace each site's
hardcoded species literal with the already-in-scope guard-proven dynamic
expression (§3), and replace its fallback idiom with
`speciesFrontIdleRestOffsetOrZero` (Rung 0). **Do not touch the throw-guard/
pair-lock block above each site.**

| Rung | Moves | Sites | Lines | Verification |
| --- | --- | --- | --- | --- |
| 1 | BLIZZARD, HEAT_WAVE, SANDSTORM, MUDDY_WATER, SECRET_POWER, SLAM, WHIRLWIND, BLOCK, BODY_SLAM, DRILL_PECK, FURY_SWIPES, TAIL_WHIP, AGILITY, SWORDS_DANCE | 14 | 17628-21634 | `npm test -- tests/animation/{blizzard,heatWave,sandstorm,muddyWater,secretPowerStrengthProduction,slam,whirlwind,block,bodySlam,drillPeck,furySwipes,tailWhip,agility,swordsDance}.test.ts` |
| 2 | BRICK_BREAK, NIGHT_SHADE, MEMENTO, SPITE, HAZE, DISABLE, PROTECT, MAGIC_COAT, LIGHT_SCREEN, WRAP, GROWTH, TOXIC, POISON_TAIL, IRON_TAIL | 14 | 24197-26452 | Same pattern, per-move test files (confirm each exists first — `growth.test.ts` etc.; `find tests/animation -iname` per move before assuming) |
| 3 | STEEL_WING, HYPER_FANG, SUPER_FANG, MEGA_KICK, ROLLING_KICK, LOW_KICK, BATON_PASS, ROLE_PLAY, KARATE_CHOP, STOMP, METRONOME, FOLLOW_ME, REST, SLEEP_TALK | 16 | 26584-29236 | `rollingKick` is `rollingKickSourceAudit.test.ts`, not `rollingKick.test.ts` — confirmed this session; re-grep before scoping |
| 4 | HEAL_BELL, PERISH_SONG, ATTRACT, SWEET_KISS, SPORE, COTTON_SPORE, SLEEP_POWDER, HYPNOSIS, HOWL, ROAR, NEEDLE_ARM, TICKLE, SWAGGER, BULK_UP | 20 | 29391-32615 | `healBell` is `healBellEvidenceCheckpoint.test.ts`, confirmed this session. SWAGGER is the one RATTATA-fallback site (`:32488`) — verify its fallback stays `?? {x2:1,y2:0}`-equivalent (i.e. `speciesFrontIdleRestOffsetOrZero` returning the real table value for RATTATA, which it does) as an explicit diff-review line, not just a mechanical grep pass |
| 5 | TORMENT, DETECT, POISON_FANG, SLUDGE_BOMB, ACID, WATER_GUN, SUPERSONIC, METAL_SOUND, HARDEN, IRON_DEFENSE, FLASH, FACADE, ACID_ARMOR, MINIMIZE | 16 | 32875-34596 | **HARDEN (`:34034`) has zero Tier-1 test coverage** — confirmed this session, no `harden*.test.ts` variant exists and no test file references `"HARDEN"`/`sceneOnHardenView`/`SceneOnHardenConfig`. Add a minimal pin (mirroring `calmMind.test.ts`'s shape, its neighbor) *before* touching this site, or flag it for manual diff-only review — do not silently rely on `npm test` passing as proof for this one site |
| 6 | CALM_MIND, SING, GRASS_WHISTLE, SHADOW_BALL, CONFUSE_RAY, ENCORE, ABSORB, MEGA_DRAIN, GIGA_DRAIN, AROMATHERAPY, SYNTHESIS, MOONLIGHT, COSMIC_POWER, ANCIENT_POWER | 14 | 34758-37514 | `calmMind.test.ts` exists and covers CALM_MIND (confirmed, corrects an earlier-session false-negative from naive filename mapping) |
| 7 | WISH, METEOR_MASH, RECOVER, MILK_DRINK, REFRESH, FUTURE_SIGHT, CONFUSION, PSYCHIC, FLAME_WHEEL, DRAGON_CLAW, FIRE_SPIN, METAL_CLAW, CRUSH_CLAW, TAKE_DOWN | 15 | 37601-43392 | METEOR_MASH is covered by 3 files (`meteorMashEvidence/Reducer/Source.test.ts`), not `meteorMash.test.ts` — confirmed this session |
| 8 | CRUNCH, LICK, SLASH, COUNTER, COMET_PUNCH, DOUBLE_SLAP, TRIPLE_KICK, DOUBLE_KICK, THRASH, DOUBLE_EDGE | 10 | 43521-44783 | Standard per-move test files |

Every rung additionally runs full `npm test` + `npm run build` +
`npm run typecheck` before commit (per AGENTS.md's own green-commit bar),
and a `git grep -c 'speciesFrontIdleRestOffset('` / manual line-count sanity
check that the rung's own site count didn't silently drop (a site
disappearing would mean a branch got deleted or merged, not retired).

**On oracle verification:** these 108 windows are ON-profile-legacy,
reached only through `state.sceneOnPresentation` (§1.1) — **no committed
trace under `tools/compare/traces/` exercises any of them** (confirmed this
session: none of the 201 committed traces match any of the 108 move names).
The real presentation-neutral proof for this ladder is therefore the
per-move Tier-1 fixture-hash tests (`tests/animation/<move>*.test.ts`
against `tools/compare/fixtures/<move>-*.json`, exact-sha256 pixel
comparisons, same rigor as an oracle diff), not
`npm run compare:differential`. As a standing insurance smoke check only
(proving the shared import/helper change didn't regress the OFF-profile
seams that also touch `speciesIdleAnim.ts`), also re-run
`compare:differential -- battle-command-generated-off.json --base <rung's
parent sha>` once per rung — expect 128/128 unchanged, since none of these
108 branches are reachable from that trace's route.

**Pixel-inert by construction, contingent on one check per site:** confirm
the substituted expression's species is exactly what the enclosing
throw-guard already proved. Any site where a hand value or the substituted
expression **disagrees** with what `speciesFrontIdleRestOffsetOrZero` would
return is a **FINDING to document in that rung's commit message**, not a
silent fix folded into the "pure refactor" — none is known to exist today
(every literal site's hardcoded species was verified pair-locked-correct by
its own throw-guard already, per §1.3), but the rung's own diff review is
what actually proves it per site, not this doc.

### Rung 9 — hand-fit consumer swap-over (NOT actionable today, named for later)

**Blocked on:** the animation lane's rung-4 back-family dispatcher (68
functions, not started, §2 conclusion) — a cross-lane dependency outside
this worker's control. Do not start this rung until that dispatcher exists
and exports a callable per-species+nature back-offset function.
**Scope once unblocked:** `battleScene.ts`'s 3 hand-fit consumer sites
(`drawTurn15ForcedSwitchRelease`, `drawPlayerMaterializeSettle`,
`generatedPlayerMaterializeSettleY2`) call the new dispatcher directly
instead of `magbySendOutAnimation`/`playerMaterializeSettleY2`/
`playerMaterializeSettleTintCoeff`; `magbySendOut.ts` and the relevant
`battleMenu.ts` exports become dead code, deleted in the same rung.
`kabutoSendOut.ts`'s `kabutoHSlideWobble` retirement additionally needs the
dispatcher's OAM/`animNum` half (§3 cross-lane ask in the old doc — not
built yet either). **Ratchet:** per §4, no widening needed if the new
dispatcher is called from `battleScene.ts` only. Not sized here (depends on
the not-yet-designed dispatcher's own shape) — a future worker re-scopes
this rung once rung 4 lands, using this doc's §2 as the "what must be
preserved" checklist.

---

## 6. Explicit non-goals

- **Per-tick playback on the OFF profile.** Settled: Slice D closed
  not-applicable (ISSUES #71, four independent sources agree Battle Scene
  OFF never plays send-out animations at all).
- **Terminal offsets at OFF-profile settle hooks.** Settled: Slice A was
  implemented, RAM-probed wrong (a 361-px regression), and removed
  (`54979bf3`, ISSUES #71's "Addendum" entry). Nothing in this ladder
  reopens either.
- **Back nature-mod table build-out** (animation lane's rung 4, 68
  functions). This doc's Rung 9 only names the future main-lane swap-over
  shape; building the dispatcher itself is out of scope here and is not
  main-lane's program per ISSUES #71's own text.
- **ISSUES #97** (battleScene.ts turn5/6 bounce-tick drift) — a different
  chain owns it; this ladder may cite `battleScene.ts` line ranges that
  shift if that fix lands first, but does not depend on its outcome.
- **Art-selection generalization** (the pair-lock/throw-guard blocks
  themselves) — explicitly out of scope, see §3's last section.

---

## 7. Accuracy notes

- Base sha `eba3e73f`. `battleScene.ts` line numbers are the single largest
  drift risk (as in every prior doc touching this file) — re-grep by
  symbol/move name, not line number, before starting any rung.
- The per-rung Tier-1 test filename lists in §5 were spot-checked for
  naming-convention mismatches (rollingKick, healBell, meteorMash, harden)
  but **not exhaustively verified file-by-file for all 108 moves** in this
  session — a future rung's own first step should `find tests/animation
  -iname "*<move>*"` before assuming the filename pattern holds, per the
  three confirmed exceptions already found.
- HARDEN's zero-coverage gap (Rung 5) is the one confirmed, concrete test
  hole this census found; no other move was confirmed uncovered, but only
  a sample (5 of 108) was individually checked beyond the existence of a
  same-named file.
- §1.2's "108 distinct move branches" and "121 §1e sites" counts are exact,
  programmatically derived this session (bisection of call-site line
  numbers against `state.config.move ===` branch line numbers) — not
  estimates.
