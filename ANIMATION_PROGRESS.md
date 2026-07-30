# Animation coverage

## MOVE_PRESENT bounded source/probe checkpoint; remains unsupported (2026-07-30)

**Verdict:** `MOVE_PRESENT` remains unsupported. Set **118
`FRONTIER_MON_DELIBIRD`** is the sole and therefore lowest legal Level-50
Factory carrier (Docile, Never-Melt Ice, Sp.Atk/HP). Source pins the common
60-frame `ITEM_BAG` path and `AnimTask_IsHealingMove`: `gAnimMoveDmg > 0`
selects five target-relative `EXPLOSION`s; zero selects nine
`GREEN_SPARKLE`s and target `HealingEffect2`. The battle script's live
`Random() & 0xff` roll reaches healing only at `>= 204`, and full-target
heals skip attack animation entirely.

**Evidence / remainder:** complete legal three-mon Scene-ON mechanicLab
parties exist for player-Delibird/opponent-Onix and the reverse. The dense
probe captures source pointer/tasks/sprites/OAM/matrices/palettes/tags/
registers/audio/raw RGB through first inactive cleanup; the player damage
route is 74–274 (201 frames), bag ×1 / explosion ×5. The exact remainder is
to select fixed legal damage-then-heal controller routes in both orientations
and commit twice-fresh dense receipts for damage and healing, then port an
independent reducer/compositor. No typed seam or runtime code changed.

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
