# Animation coverage

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

## MOVE_MIRROR_COAT promoted exact; sparkle-3-special-screen track complete (2026-07-29)

**Verdict:** `MOVE_MIRROR_COAT` is exact. Source, generated inventory, and
controller audit prove set **151 `FRONTIER_MON_CORSOLA`** is its lowest legal
Level-50 carrier and one animation body is reachable: a valid opposing special
hit reaches `Move_MIRROR_COAT`; the failure route selects no animation body.
Complete legal Corsola/Exeggcute Scene-ON parties stage real Confusion damage
before Mirror Coat's -5-priority counter in both orientations.

**Evidence:** the complete first-active wall frame through first-inactive
cleanup passes twice fresh per orientation. Player-back **349–423 (75/75)**
records special damage/result **26→52**, evidence/raw
`1ea5591d85dc0e4926b8e763584f405ed4ec72d43c676ad06fc551cedb44aa92` /
`c8a70485e2d13ae522c31760ee7e6ecb24bb464eb567427855448389ab1128a7`;
opponent-front **355–429 (75/75)** records **31→62**,
`3328d443c81b35a5305590705e7448d009aa0111a326b318c08b420a29939a7d` /
`0fcba1ad43f479f613f84243bca184e10f4545e7e6566558327c081444b73b5b`.

**Model / sibling:** the reducer and seam reuse only source-identical
`AnimDefensiveWall` and six `SpecialScreenSparkle` lifecycles while preserving
Mirror Coat's red wall/tag, wall-before-audio delay-10/immediate attacker pan,
no Light Screen sound task, palettes/registers, BG/OBJ ordering, legal carrier
art/geometry, and cleanup. `MOVE_LIGHT_SCREEN` independently reruns exact twice
fresh at **115/115 player-back + 119/119 opponent-front**, with unchanged
evidence/raw hashes.

**Ownership / next:** no counter/damage semantics, accuracy, RNG, controller,
turn/facility state, boundary list, unsupported barrier, or canonical allowlist
changed. Coverage is **103 exact / 0 partial / 0 staged / 173 unsupported**.
Next incomplete ranked track: `red-heart-sweet-kiss`
(`MOVE_ATTRACT` independently unsupported).
