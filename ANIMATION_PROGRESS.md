# Animation coverage

## Front `ANIM_V_SHAKE` terminal family accepted (2026-07-31)

**Verdict:** rung 2c is complete for the **24 Factory-reachable species** in
this opponent-front family. The generated selector table has 25 mappings, but
`battle-frontier-mons.json` proves GROUDON is the sole outside-Factory member;
derived exports and Tier-1 tests pin both counts without mislabeling 25 as the
Factory total. The three prior accepted families remain unchanged.

**Model / evidence:** `speciesIdleAnim.ts` ports `Anim_VerticalShake` and
`VerticalShake` source-order arithmetic: data[0]=60, active accumulators
0..2280, the strict `counter > 2304` guard at 2340, and terminal y2=0 cleanup
before `WaitAnimEnd`. Complete legal Scene-ON parties settle representative
MACHOKE and sibling RHYHORN at **x2=0 / y2=0 / animNum=1 /
SpriteCallbackDummy**. Two fresh RAM-probe runs per species are byte-identical:
MACHOKE receipt SHA-256
`7b5914c4e81c08e73287c19593f791a0b44e48d213fdbd14e1308df9a946c0af`,
RHYHORN `1c7cd9974d4115327d40cb5dd602a9123c82b31211066ef33b59cf727243b313`.

**Gates / coverage:** focused animation tests are **24/24**; the full suite is
green at **567 files, 5722 passed + 1 skipped**, and the production build is
green. `ANIMATION_COVERAGE.json` remains byte-identical (SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`),
with coverage unchanged at **107 exact / 0 partial / 0 staged / 169
unsupported**. No probe, seam, boundary, barrier, gameplay, RNG, turn, damage,
facility, or move-coverage state changed.

## Front `ANIM_V_STRETCH` terminal family accepted (2026-07-31)

**Verdict:** rung 2b is complete for the generated 32-species Factory front
family. `speciesIdleAnim.ts` derives dispatch from
`send-out-anim-selector-tables.json` and ports `Anim_VerticalStretch`'s 41
active callbacks, both `sDontFlip` affine branches, C-truncated y2 arithmetic,
and tick-41 identity/y2/affine cleanup before `WaitAnimEnd`. The accepted
`ANIM_V_SQUISH_AND_BOUNCE` family and ONIX `ANIM_RAPID_H_HOPS` behavior remain
pinned without change.

**Evidence:** complete legal Scene-ON parties settle opponent-front QUILAVA
and HOUNDOUR at **x2=0 / y2=0 / animNum=1 / SpriteCallbackDummy**. Two fresh
RAM-probe runs per species are byte-identical: QUILAVA receipt SHA-256
`8a2293ce042d30d3c097a4f127f911ca8a2e3e60db426392a2c02262130add56`,
HOUNDOUR `613b110bfc757ef5fce03ca6a8098d03c80ce189aa45bafcae033b844e7b89f0`.
Tier-1 pins source arithmetic, generated dispatch/all 32 species, both paired
receipts, and both prior-family regressions. Full gates are green: **567 files,
5716 passed + 1 skipped**, plus the production build.

**Coverage / next:** `ANIMATION_COVERAGE.json` remains byte-identical and
`npm run animation:coverage` remains **107 exact / 0 partial / 0 staged / 169
unsupported**. Continue the ordered front-family terminal ladder; no move
track, probe change, gameplay, engine seam, boundary, barrier, RNG, turn,
damage, or facility state changed.

## Front `ANIM_V_SQUISH_AND_BOUNCE` terminal family accepted (2026-07-31)

**Verdict:** rung 2a is complete for the generated 50-species Factory front
family. `speciesIdleAnim.ts` now dispatches from
`send-out-anim-selector-tables.json`, not a hand-maintained species map, and
ports `VerticalSquishBounce`'s 49 active callbacks plus affine/y2 terminal
cleanup before `WaitAnimEnd`. Existing ONIX `ANIM_RAPID_H_HOPS` support is
unchanged.

**Evidence:** complete legal Scene-ON parties settle opponent-front BAYLEEF
and MAGBY at **x2=0 / y2=0 / animNum=1 / SpriteCallbackDummy**. Two fresh
RAM-probe runs per species are byte-identical: BAYLEEF receipt SHA-256
`e5bcb0354f65713fa5ef5713035209762ebf6e204a48e985b9d05ab58f38fc6a`,
MAGBY `58cb14b494d54e6e4950642d9cd57e841a0dc8529f784c24e4b3b46adc45f2ab`.
Tier-1 pins source arithmetic, generated dispatch/all 50 species, both paired
receipts, and ONIX regression. Full acceptance gates are green: **567 files,
5711 passed + 1 skipped**, plus the production build.

**Coverage / next:** `ANIMATION_COVERAGE.json` remains byte-identical and
`npm run animation:coverage` remains **107 exact / 0 partial / 0 staged / 169
unsupported**. Continue the ordered front-family terminal ladder; no move
track was fabricated and no gameplay, engine seam, boundary, barrier, RNG,
turn, damage, or facility state changed.

## PRIORITY DIRECTIVE — send-out intro animations run ahead of the move queue (2026-07-31)

**State:** User-set priority, recorded by the interactive main session at the
user's request. The per-species **send-out intro animation** family takes
priority over the remaining move acceptance queue (`MOVE_DRAGON_BREATH`,
`MOVE_BIND`) and over new component tracks. Coverage is unchanged at **107
exact / 0 partial / 0 staged / 169 unsupported**; no code, test, boundary,
barrier or gameplay change accompanies this entry.

**Why it outranks the moves:** every one of these functions freezes its
`x2`/`y2` at its last active accumulator and hands off to
`SpriteCallbackDummy` — a **permanent residual offset for the rest of the
battle**, leaking into windows that never show the send-out. Two windows have
already paid for the same missing residual by hand (DRAGON_RAGE's dense window
and `docs/aerial-ace-portable-staging-probe.md`, both the settled
opponent-front ONIX at `x2=+1`). It is a defect class under the move queue,
not a cosmetic backlog behind it.

**Did:** derived the full scope from pinned source and wrote
**`docs/send-out-intro-animation-program.md`** — mechanism, both selector
paths, the 5-rung ladder, the acceptance bar, and a re-runnable derivation
script for every figure. Headline numbers: 881 rental entries / 376 species;
front (opponent) collapses to **62** functions with a steep head (12 → 56%,
30 → 85%); back (player) is selected by species **and nature** and stays flat
at **68** reachable functions (top 8 → 34%); union closure is **194 of the
file's 234** static functions, with only ~20 shared between the two families.
Load-bearing invariant, grep-verified: **no `Anim_*` function reads species or
mon data** — species/nature enter at selection time only, so one ported
function is correct for every species that maps to it.

**Next:** rung 2 of the ladder — generalize `computeTerminalOffset` out of
`src/animation/speciesIdleAnim.ts` and bank tier-1 terminal constants for the
62 front functions, steep head first, each accepted against a RAM probe of a
settled front sprite (not pixels alone). Rung 1 (selector-table extraction) is
a prerequisite owned by another lane — see below. Rungs 4-5 stay
demand-driven; do not batch them speculatively.

**Notes:** this family has no home in `ANIMATION_COVERAGE.json` — its
acceptance unit is a move, and `componentTracks` validation
(`tools/animation/coverage.ts:150-168`) requires every representative to be a
Level 50 move sharing the track's components. The queue was deliberately left
untouched rather than faking a move representative; this entry is the
directive. Three hand-done one-offs exist today with no dispatcher: ONIX front
(`src/animation/speciesIdleAnim.ts:44`, terminal only), MAGBY back
(`src/engine/magbySendOut.ts:18`), ONIX back (`src/engine/battleMenu.ts:708`)
— the latter two sit outside animation-owned paths, so retiring them into a
dispatcher is a coordinated cross-lane change, not a drive-by.

**For the main program:** rung 1 is yours, not animation's. Five literal
source tables need extracting into `src/data/gen/` (side-lane ownership per
AGENTS.md): `sMonFrontAnimIdsTable`, `sSpeciesToBackAnimSet`,
`sBackAnimNatureModTable`, `sMonAnimationDelayTable` (nonzero for 52 of the
376 pool species), `sBackAnimationIds`. Identity-const census idiom applies.
Animation is blocked on these before rung 2 can be keyed by species.

## MOVE_ROAR promoted exact; noise-line-roar-effect complete (2026-07-30)

**Verdict:** `MOVE_ROAR` is exact. The pure source-relative reducer, narrow
typed Scene-ON seam and production compositor cover shared six-NOISE_LINE
RoarEffect sprites, attacker monbg/splitbgprio/8:8 alpha, double cry/wait,
ScaleMonAndRestore, target SlideOffScreen, waits, hardware latches, tags,
palettes, registers, audio, blend/monbg cleanup and first inactive frame. The
seam carries only resolved Houndour/Onix geometry and immutable field
presentation; all guards, accuracy, forced switching, controller, RNG, turn
and facility state remain external.

**Dense acceptance:** corrected legal set-119 Houndour parties pass every
source/reducer/seam/raw-RGB/production framebuffer frame twice fresh:
player-back **252-350 (99/99)** with evidence/raw
`cec50726…3b688aa1` / `0a90faea…21174899`; opponent-front **219-322
(104/104)** with `d7b5ddc1…e1b4da8` / `727e277d…d1a0002a`. `MOVE_HOWL`
independently remains **102/102 twice fresh in both orientations**. Coverage
is **107 exact / 0 partial / 0 staged / 169 unsupported** and the
`noise-line-roar-effect` track is complete. No gameplay, boundary, barrier,
canonical-dependency or main-doc change.

## MOVE_ROAR corrected source/probe checkpoint; remains unsupported (2026-07-30)

**State:** `MOVE_ROAR` remains unsupported; coverage is unchanged at **106
exact / 0 partial / 0 staged / 170 unsupported**. The source audit pins
challenge-0 set **119 `FRONTIER_MON_HOUNDOUR`** (species 228, Docile,
Sp. Atk/HP, Charcoal) and its distinct ScaleMonAndRestore, SlideOffScreen,
double-cry/wait, monbg/splitbgprio/8:8-alpha, six-NOISE_LINE, and cleanup
body.

**Evidence:** both complete legal Scene-ON parties are mechanically
asymmetric: player Houndour retains exact **CRUNCH/EMBER/ROAR/PROTECT** and
the controller presses DOWN to choose slot three; only opponent Houndour uses
four Roars to constrain AI. Every first-active through first-inactive frame
reproduces twice fresh: player-back **252-350 (99/99)** evidence/raw
`cec50726…3b688aa1` / `0a90faea…21174899`; opponent-front **219-322
(104/104)** `d7b5ddc1…e1b4da8` / `727e277d…d1a0002a`. The shared
parameterized recorder also reran Howl's complete receipts unchanged.

**Next:** separately port a source-relative Roar reducer, narrow typed
presentation seam, and production compositor, then prove every dense frame
in both orientations; this checkpoint supplies no production support or exact
promotion.

## MOVE_PRESENT promoted exact; green-sparkle-moonlight complete (2026-07-30)

**Verdict:** `MOVE_PRESENT` is exact for all four committed branch/orientation
bodies. The pure source-relative reducer ports the common 60-frame moving
`ITEM_BAG`, five-`EXPLOSION` damage branch, and nine-`GREEN_SPARKLE` plus
four-target-`BLUE_STAR` healing branch. The typed Scene-ON seam takes damage
or heal as immutable controller input; animation code owns no branch choice,
outcome, damage, healing, or RNG.

**Dense acceptance:** player damage **1012–1212 (201/201)**, player heal
**1946–2197 (252/252)**, opponent damage **78–278 (201/201)**, and opponent
heal **1404–1655 (252/252)** each pass source/component/seam/raw-RGB and
production framebuffer equality twice fresh. Receipt/raw prefixes remain
`a2cc09d1/0507c412`, `bbb023fe/b2fe7f30`,
`9d752ec6/8e9f36a7`, and `9a76aeeb/2e5b78ad`. The compositor reuses honest
source-derived bag, explosion, Moonlight sparkle/star, Delibird/Onix, field,
healthbox, and text assets, preserving mirrored geometry, OAM/matrix latches,
tag/palette/audio/wait cleanup and side-relative subpriority ordering.
Coverage is **106 exact / 0 partial / 0 staged / 170 unsupported**; the
`green-sparkle-moonlight` track is complete. No boundary, barrier, canonical
recording, gameplay, controller, turn, round, or facility state changed.

## MOVE_SECRET_POWER promoted exact; slam-hit-slide-shake complete (2026-07-30)

**Verdict:** `MOVE_SECRET_POWER` is exact through its sole reachable Factory
body, indoor `BATTLE_ENVIRONMENT_BUILDING` → `Move_STRENGTH`. Complete legal
challenge-0 set-117 Teddiursa/Onix parties pass the full first-active through
first-inactive cleanup interval at **222–323 (102/102)** twice fresh in both
orientations through the source reducer, typed seam, software/hardware OAM,
matrices, palette/tag/register/audio receipts, raw RGB, and production shared
framebuffer. Player-back evidence/raw hashes remain
`9d8f3ad7a472bdd940aa35a7aa7e9c62823d8d2b11c0114ce6d4b1f92aed73a3` /
`af6ff533abeb22e9b2f45c09339dcb979ac8508501e64d6d012faa1eb91a2903`;
opponent-front hashes remain
`8d6902b63b3dc96622261856cdb413c452d3c55140465a674d97aa51271a2172` /
`f4c81b0de053a8703ed10238c70d6398693fc937c1ad2d088de451a097d6376a`.

**Model / boundaries:** the compositor preserves IMPACT lifetime,
`ShakeAndSinkMon`'s distinct two-transfer position latch, four-tick return
slide, side-respecting two-loop ellipse, three animation-1 hitsplats including
source slot-reuse priority, final `ShakeMon2`, monbg/12:8 alpha, all four
sounds, legal Teddiursa/Onix art and geometry, waits, and cleanup. The later
**472–509** secondary-status animation remains controller-owned and outside
the move body. `MOVE_SLAM` independently reruns **54/54 twice fresh in both
orientations** with unchanged hashes. No battle semantics or boundary pins
changed. Coverage is **105 exact / 0 partial / 0 staged / 171 unsupported**;
the `slam-hit-slide-shake` component track is complete.

## MOVE_SECRET_POWER source/controller checkpoint; remains unsupported (2026-07-30)

**Verdict:** `MOVE_SECRET_POWER` remains unsupported. A complete source,
generated-inventory, battle-script, controller, and environment audit proves
challenge-0 set **117 `FRONTIER_MON_TEDDIURSA`** is the lowest legal Level-50
carrier, correcting the older set-162 Delcatty evidence. The Factory battle
room is indoor, so its only reachable visual dispatch is
`BATTLE_ENVIRONMENT_BUILDING` → `Move_STRENGTH`; all nine explicit terrain
branches plus the plain fallback are now pinned.

**Controller/body boundary:** a successful hit emits
`CONTROLLER_MOVEANIMATION`, both player and opponent controllers call
`DoMoveAnim(290)`, and `AnimTask_GetBattleEnvironment` selects Strength.
Accuracy misses bypass `attackanimation`; `MOVE_RESULT_NO_EFFECT` and
`HITMARKER_NO_ANIMATIONS` select the pause route; the secondary effect is
chosen only after the animation/result message. The required Strength body is
independently enumerated: IMPACT, `ShakeAndSinkMon`, return slide, elliptical
target translation, three hitsplats, `ShakeMon2`, monbg/alpha, four sounds,
and cleanup.

**Evidence / next:** `secretPowerSourceAudit.ts` and its focused Tier-1 test
pin the full dispatch/controller contract while reusing the existing
source-complete `getsecretpowereffect` semantic tests without changing battle
logic. No reducer, compositor, dense oracle fixture, or exact status was
added. `MOVE_SLAM` remains independently exact at **54/54 twice fresh in both
orientations with unchanged hashes**. Coverage remains **104 exact / 0 partial
/ 0 staged / 172 unsupported**. Next work is a separate complete Strength
reducer/compositor and twice-fresh full dense Scene-ON acceptance in both
orientations using legal set-117 Teddiursa parties.

## MOVE_ATTRACT promoted exact; red-heart-sweet-kiss track complete (2026-07-29)

**Verdict:** `MOVE_ATTRACT` is exact. Source, generated inventory,
battle-script, and controller audit pin set **113 `FRONTIER_MON_EEVEE`** as
the lowest legal Level-50 carrier and one reachable animation body after
accuracy and `tryinfatuating`. Accuracy, same-gender, genderless,
already-infatuated, and `OBLIVIOUS` failures select no animation body.

**Evidence:** complete legal female-Eevee/male-Onix Scene-ON parties pass the
complete first-active frame through first-inactive cleanup twice fresh per
orientation. Player-back **66–500 (435/435)** evidence/raw
`a5008ce72fd22417d8ec1be80158fd3a5f93b715165700b875601c476c5717c8` /
`e627d99e69936a320250ab89b946221a179d2ea3a2ed076068a2ff82e9edd9a9`;
opponent-front **70–504 (435/435)**
`234dd9d0da4f02be12a404f3ef36eaa1071bd66d2886eaa75fe3aa25ae48422e` /
`daa9c2ed067fcfa6d56a98d364c5d3e31e0ca7af30bd15ca72c2c93ddb2ef329`.

**Model / sibling:** the reducer, typed seam, and production compositor port
the projectile, six burst, and eight rising RED_HEART sprites, including the
opponent-front pre-OAM allocation; SwayMon; HeartsBackground tiles, palette,
alpha ramp and cleanup; two target blend cycles; all audio/panning;
attacker/target geometry; legal art/idle offsets; OAM/hardware transfer and
cleanup. `MOVE_SWEET_KISS` independently reruns **159/159** twice fresh in
both orientations with unchanged evidence/raw hashes.

**Ownership / next:** presentation owns no accuracy, gender/ability or
infatuation result, RNG, controller, turn/facility state, boundary list,
unsupported barrier, or canonical allowlist. Coverage is **104 exact / 0
partial / 0 staged / 172 unsupported**. Next ranked incomplete component
track: `slam-hit-slide-shake` (`MOVE_SECRET_POWER` independently unsupported).
