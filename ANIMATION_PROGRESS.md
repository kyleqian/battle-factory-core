# Animation coverage

## MOVE_SLAM promoted exact; SLAM_HIT track bounded (2026-07-29)

**Verdict:** `MOVE_SLAM` is exact. The lowest suitable Level-50 Factory
carrier is challenge-0 set **164** `FRONTIER_MON_LICKITUNG_1` (species
**108**, Slam **21**, Quirky, Attack+HP, Sitrus Berry). Complete legal
three-mon Scene-ON parties pass the whole move through first inactive cleanup
at **54/54** source/component, typed-seam, hardware, audio, raw-RGB, and
shared-framebuffer frames in both orientations, twice fresh. Player-back
frames **212–265** reproduce evidence/raw digests
`8f520d7599ce22335081f096258dba8a4dc61f880c9b5167f0d3d68a33e14182` /
`4e3abdaf0e4ab636fc415fb933a10cb47f9ed86fffcef880fd3d6479d1a4c8c2`;
opponent-front frames **211–264** reproduce
`66a2b9d72b6dd0eb160faf6336a395fd036745d1fc09433fca7aea3641697401` /
`66d4cdf1aed7f739b15a44eaccbb346268f5cc3b05112836b8717d31255f62fc`.

**Model/boundary:** the pure source-relative reducer and typed seam port
SLAM_HIT/IMPACT load and free, the four-cell side-flipped
`gSlamHitSpriteTemplate`, both attacker and target slide/return sequences,
animation-1 hitsplat, target `ShakeMonInPlace`, monbg/alpha, audio, OAM/display
latches, and cleanup. Source extraction regenerates Lickitung front/back and
SLAM_HIT assets byte-for-byte; the narrow compositor reuses exact IMPACT,
slide, shake, Onix, and field primitives. No damage, RNG, turn, controller,
facility, import-boundary, or unsupported-barrier behavior changed.

**Sibling/control:** `MOVE_SECRET_POWER` remains **unsupported** because the
Factory building environment selects the distinct `Move_STRENGTH` body; other
environments also dispatch to independent bodies. Shared SLAM_HIT proof does
not promote it. The existing BODY SLAM slide/impact/shake control remains
independent. Coverage is **88 exact / 0 partial / 0 staged / 188
unsupported**.

## MOVE_MOONLIGHT promoted exact; GREEN_SPARKLE track bounded (2026-07-29)

**Verdict:** `MOVE_MOONLIGHT` is exact. The lowest suitable legal Level-50
carrier is challenge-0 set **167** `FRONTIER_MON_GLOOM_1` (species **44**,
Moonlight **236**, Quirky, SpAttack+HP, Persim Berry). Complete legal
three-mon Scene-ON parties pass the entire body through first inactive cleanup
at **352/352** frames **207–558** in both orientations, twice fresh.
Player-back evidence/raw digests are
`5486f398b5a29f20da4c97c6d67315973e01746b498250af3f5ea2aae116776b` /
`433d0a9869f2ef60f0b68c812dce3ef9f2d1b8944bb54beba63a39f3c82e13bf`;
opponent-front digests are
`fdf3da2cd3ea60d4be20f7d040f917cc302562da145e5a04fa9d750147e55b0d` /
`83e6ccdfd48c9380fbead22b3b80af91202c3e04540d1e26798eaea60d1a6e1e`.

**Model/boundary:** the pure relative reducer, typed seam, and narrow
compositor port MOON/GREEN_SPARKLE/BLUE_STAR tag and palette lifetimes, the
fixed moon, all **five** staggered sparkle lifecycles, alpha registers,
Moonlight's special black-to-near-white BG/battler/effect palette pipeline,
audio, the complete four-star shared `HealingEffect` tail, OAM/VBlank order,
and cleanup. Gloom and all effect art regenerate byte-for-byte from pinned
source. Immutable HP **143/153**, weather-none, and half-maximum heal metadata
cross only as verification inputs; healing outcome/timing, HP, weather
calculation, RNG, controller/turn/facility state, boundaries, and barriers are
unchanged.

**Sibling/control:** `MOVE_PRESENT` remains **unsupported**. It has a distinct
`AnimTask_IsHealingMove` dispatch and ITEM_BAG projectile, then either five
EXPLOSION damage sprites or nine GREEN_SPARKLE heal particles followed by
target `HealingEffect2`; both conditional bodies still need independent
complete legal both-orientation twice-fresh proof. `MOVE_RECOVER` was rerun
fresh as the shared BLUE_STAR/HealingEffect control and remains **169/169**
exact in both orientations. Coverage is **87 exact / 0 partial / 0 staged /
189 unsupported**.

## MOVE_PERISH_SONG promoted exact; MUSIC_NOTES_2 track bounded (2026-07-29)

**Verdict:** `MOVE_PERISH_SONG` is exact. The lowest suitable legal Level-50
carrier is challenge-2 set **289** `FRONTIER_MON_MURKROW_2` (species **198**,
Perish Song **195**, Quirky, HP+Defense+SpDefense, BrightPowder). Complete
three-mon Scene-ON parties pass the entire body through first inactive cleanup
at **259/259** frames in both orientations, twice fresh. Player-back frames
**71–329** have evidence/raw digests
`2127f8270310ceae01c00debfafdfb276ad80cfbb422b26672b27a21846b9250` /
`85d2c46b94112f9f5a30c076e58c5cf58a70e4f38fe9c3b6f008d6416e5edfc6`;
opponent-front frames **75–333** have
`0bd858e7ba1571ab2545d4d2e9d2ad0cff7562ae2c27ac7a71ae5968580d0597` /
`b68c78f41dec5baa09ae444b312822d747c53af3e81e4cd598e6aa8b42482b6d`.

**Model/boundary:** the pure relative reducer, typed seam, and narrow
compositor port all **16** `gPerishSongMusicNoteSpriteTemplate` fixed-point
paths, tile animations, affine half-turn, hold/four-bounce cleanup, the
invisible `gPerishSongMusicNote2SpriteTemplate` grayscale-palette sentinel,
MUSIC_NOTES_2 tag/palette lifetime, side-relative panse, both BG-black fades,
four battler grayscale/original transitions, OAM/VBlank order, display
register/callback state, and cleanup. Source-extracted Murkrow front/back and
MUSIC_NOTES_2 assets reproduce byte-for-byte. Immutable HP/items and both
Perish timers (**3**) cross only as verification inputs; gameplay RNG,
damage, timer advancement, controller/turn/facility state, import boundaries,
and unsupported barriers are unchanged.

**Sibling/control:** `MOVE_HEAL_BELL` remains **unsupported**. Its independent
body adds BELL, explicit MUSIC_NOTES_2 palette load/free, twelve note paths,
three ring/palette groups, healing particles, two star families, asset
unload/reload boundaries, `BlendBattleAnimPalExclude`, and distinct timing;
it has no complete legal both-orientation twice-fresh dense proof.
`MOVE_SING` remains the independently exact note/compositor control. Coverage
is **86 exact / 0 partial / 0 staged / 190 unsupported**.

## MOVE_HOWL promoted exact; NOISE_LINE track bounded (2026-07-29)

**Verdict:** `MOVE_HOWL` is exact. Lowest suitable challenge-0 Level-50
carrier set **144** `FRONTIER_MON_LOUDRED` (species **371**, Howl **336**,
Relaxed, Attack+HP, Focus Band) drives complete legal three-mon parties
against ONIX. Both Scene-ON orientations pass the full source body through
first inactive cleanup at **102/102** frames, twice fresh. Player-back frames
**209–310** have evidence/raw digests
`ac6bb4eebe0376d3441bc1e50ff4c33a4fe39f87dccb41483c440b9f167f93bb` /
`1f19b38ed924b20fb4648adc24dea85a2be05460092df83d0d7991fa7a87a269`;
opponent-front frames **209–310** have
`1d08643804a400521689181b7d71431ad59a1c5a027498d7106e992d02b6e587` /
`83ad92a022ee5484e24c8e78b49996c5692443bc76e7aef430b2ae15cedf0eac`.

**Model/boundary:** the pure relative reducer, typed seam, and narrow
compositor port NOISE_LINE load/free, all six `RoarEffect` sprites,
`AnimTask_DeepInhale` affine/y-offset/shake behavior, high-pitch cry task and
audio, script waits, OAM/matrix/display latches, allocation order, tagged
source-extracted art, and cleanup. Immutable Attack stage **7** crosses the
presentation seam only as verification input; Howl's outcome, gameplay RNG,
damage, controller/turn/facility state, boundary list, and unsupported barriers
are unchanged. `MOVE_ROAR` remains **unsupported** because its source body adds
`ScaleMonAndRestore`, `SlideOffScreen`, double-cry/wait tasks,
monbg/splitbgprio/alpha choreography, and lacks independent complete dense
both-orientation evidence. Coverage is **85 exact / 0 partial / 0 staged /
191 unsupported**.

## MOVE_REST promoted exact; LETTER_Z track bounded (2026-07-29)

**Verdict:** `MOVE_REST` is exact. Lowest suitable challenge-0 Level-50
carrier set **117** `FRONTIER_MON_TEDDIURSA` (species **216**, Rest **156**,
Relaxed, Attack+HP, Chesto Berry) drives complete legal three-mon parties
against ONIX. Both Scene-ON orientations pass the complete source body through
first inactive cleanup at **110/110** frames, twice fresh. Player-back frames
**334–443** have evidence/raw digests
`8f482a75532d55a5518581b5cebe02b69741dbe913b87dafd4637dc79d68d9c6` /
`3a9f0a794e93bbb68b485748733866ed27477d59577b7a4905642dd7655f2d63`;
opponent-front frames **338–447** have
`24fd57122beb8e307e02bd6e9d427ece5c602c2188f0b47f847ba1593ea082d3` /
`6caad649f87c5bef7bc1098629addf19981c7ce4ed9d2db4dc0f1e8d25e86a67`.

**Model/boundary:** the pure relative reducer, typed seam, and narrow
compositor port LETTER_Z load/free, attacker-panned Snore audio, all **three**
staggered `gSleepLetterZSpriteTemplate` callbacks, fixed-point ascent,
side-dependent affine programs, OAM/VBlank latches, tagged source-extracted
art, 60-frame lifetimes, waits, and cleanup. Immutable Rest sleep/status/
pending-heal state crosses the presentation seam only as verification input;
the shared Metronome control remains **127/127** exact twice fresh in both
orientations. Rest
healing, sleep state/duration, RNG, controller/turn/facility state, the
animation boundary list, and unsupported barriers are unchanged.
`MOVE_SLEEP_TALK` remains **unsupported**: it has a distinct nine-sprite
`gLetterZSpriteTemplate`/`AnimLetterZ` body plus `AnimTask_SwayMon`, without
independent complete legal both-orientation twice-fresh dense acceptance.
Coverage is **84 exact / 0 partial / 0 staged / 192 unsupported**.

## MOVE_WISH promoted exact; GOLD_STARS track bounded (2026-07-28)

**Verdict:** `MOVE_WISH` is exact. Lowest suitable challenge-0 Level-50
carrier set **173** `FRONTIER_MON_ILLUMISE_1` (species **387**, Wish **273**,
Quirky, Attack+HP, Liechi Berry) drives complete legal three-mon parties
against ONIX. Both Scene-ON orientations pass the complete source body through
first inactive cleanup at **271/271** frames, twice fresh. Player-back frames
**65–335** have evidence/raw digests
`9bd713db92f51208dba4faea9916549981545a864fd50bb7761b13ae00e7077b` /
`2f82ec073d7f7e52b5a513733b991ef792b374d72c9b40c535f1e42438b86488`;
opponent-front frames **69–339** have
`8c223ec57b228721dd6df2137b8597388b44d4749cd501d898ec4c4da9be2669` /
`f858c38f13030f4d3a173776ee2a1319835f2089b61f8b7ac6484f12a859315d`.

**Model/boundary:** the pure relative reducer, typed seam, and narrow
compositor port both black BG palette ramps, the cross-screen GOLD_STARS Wish
star, all **21** presentation-`Random2` mini-star variants/blinks, the
60-frame hold, both SPARKLE_2 GrantingStarsEffect translations, pan-adjusted
Reflect and looped Heal Bell audio tasks, OAM/display order, tagged assets,
and cleanup using byte-identical source-extracted Illumise/GOLD_STARS/
SPARKLE_2 art. The already-exact Synthesis granting-star control remains
**130/130** in both orientations. `MOVE_METEOR_MASH` remains **unsupported**:
it adds `BG_COSMIC`, three target-relative spinning stars, a spinning fist,
IMPACT, target `ShakeMon2`, background restoration, and distinct audio/timing,
without independent complete legal both-orientation twice-fresh acceptance.
Coverage is **83 exact / 0 partial / 0 staged / 193 unsupported**; Wish battle
state/healing timing and outcome, damage, gameplay RNG, controller/turn/
facility state, boundary list, and unsupported barrier are unchanged.

## MOVE_SANDSTORM promoted exact; FLYING_DIRT track bounded (2026-07-28)

**Verdict:** `MOVE_SANDSTORM` is exact. Lowest challenge-0 legal Level-50
carrier set **120** `FRONTIER_MON_PHANPY` (species **231**, Sandstorm **201**,
Naughty, Attack+HP, Lax Incense) drives complete legal three-mon parties
against ONIX. Both Scene-ON orientations pass the full source body through
first inactive cleanup at **168/168** frames, twice fresh. Player-back frames
**210–377** have evidence/raw digests
`678cbc9073564cec54c76709704009d17586b45f1301dc129d13c840b0337b1e` /
`2968b95f680be00e14cb3386487629b142eb0ac05910f1dad69da7dc885e9958`;
opponent-front frames **305–472** have
`ba90eb87f3466644cf4e3c085231265bf7138fcd0e2d286a41574e35f9af12d2` /
`151561fae96ddc3d919e3f0254b987162cd9e078e92c5e414b4e0a9689edd2e4`.

**Model/boundary:** the pure relative reducer, typed seam, and narrow
compositor port FLYING_DIRT load/free, source sandstorm BG tile/palette load,
wrapped **-6/-1** BG1 scroll, **0→7 / 101-count hold / 7→0** alpha, all
**seven** staggered fixed-point flying-sand crescents, and cleanup using
byte-identical source-extracted Phanpy/front-back/background/particle assets.
Software tasks/sprites, OAM/matrices, tags/palettes/registers, both audio
players, raw RGB, and the shared framebuffer are dense-exact. The previously
exact Needle Arm compositor control remains **108/108** twice fresh in both
orientations. `MOVE_HEAT_WAVE` remains **unsupported**: source audit proves
distinct red particle/background blends, mirrored BG, pan sweep, target
motion, and its own seven-crescent schedule; it has no independent complete
legal both-orientation twice-fresh evidence. Coverage is **82 exact / 0
partial / 0 staged / 194 unsupported**; no damage/weather outcome, RNG,
controller/turn/facility state, boundary list, or unsupported barrier changed.

## MOVE_NEEDLE_ARM promoted exact; GREEN_SPIKE track bounded (2026-07-28)

**Verdict:** `MOVE_NEEDLE_ARM` is exact. Lowest legal Level-50 carrier set
**125** `FRONTIER_MON_CACNEA` (species **344**, Needle Arm **302**, Quirky,
Attack+HP, Sitrus Berry) drives complete source-catalog parties against ONIX.
Both Scene-ON orientations pass the full source body through first inactive
cleanup at **108/108** frames **223–330**, twice fresh. Player-back
evidence/raw digests are `f6f26ca98a0aea08c1bd5c9fef4553443c93c260d829ed0609c41ef26935d10c`
/ `bbb4ea8404fbde111de1c1dfe91d45d47033b2f0522754695d4d7ed5f21db0f6`;
opponent-front digests are
`75a2df84d96ea99f2cb2b584a67a338d419c565a14c7bc726f7bf7a8aaf20470`
/ `291b07d72166df08330fd95741f84ea0d14918c57602114968143ca9bd48d1e1`.

**Model/boundary:** the pure relative reducer, typed seam, and narrow
compositor port all **20** GREEN_SPIKE lifecycles (twelve staggered inward,
eight outward), fixed-point translation/affine rotation, the source
interpreter's seven-sprite pending tick, target ShakeMon2, IMPACT hitsplat,
HANDS_AND_FEET fist, tagged loads, OAM/VBlank latches, Y/crossing painter
order, audio, and cleanup using source-extracted Cacnea/GREEN_SPIKE art.
`MOVE_SPIKE_CANNON` remains **84/84** twice-fresh in both orientations as the
nearby exact control. `MOVE_SECRET_POWER` remains **unsupported**: Factory's
building environment dispatches to Strength, not its grass-only Needle Arm
body. Coverage is **81 exact / 0 partial / 0 staged / 195 unsupported**; no
battle/controller/RNG/facility state, boundary list, or unsupported barrier
changed.

## MOVE_FOLLOW_ME promoted exact; finger-metronome track closed (2026-07-28)

**Verdict:** `MOVE_FOLLOW_ME` is exact. The lowest suitable Level-50 carrier
is set **183** `FRONTIER_MON_TOGETIC_1` (species **176**), with its pinned
Relaxed/Defense+HP/Lax Incense identity and complete source-set parties.
Both Scene-ON orientations pass the full body through first inactive cleanup
at **185/185** twice fresh. Player-back frames **69–253** have evidence/raw
digests `5aefcc2e…2cb871` / `99d4031b…3ffd96`; opponent-front frames
**73–257** have `74485aa1…be0e0` / `7518f7d5…ea1bf`.

**Model/boundary:** the relative reducer, typed seam, and narrow compositor
port the FINGER load/palette/tile lifetime, attacker top-center/clamp,
normal-affine grow, 13-frame delay, sine traversal and both subpriority
crossings, handoff to Metronome's three-wag/shrink terminal callback,
TAIL_WHIP/ATTRACT/looped TAIL_WHIP audio, OAM/matrices/registers, raw RGB,
and cleanup using source-extracted Togetic plus byte-identical shared FINGER
art. `MOVE_METRONOME` remains **127/127** twice-fresh in both orientations
with unchanged digests as the control. Coverage is **80 exact / 0 partial /
0 staged / 196 unsupported**; no battle/controller/RNG/facility state,
animation boundary list, unsupported barrier, or non-FINGER sibling changed.

## MOVE_METRONOME promoted exact; ANIM_TAG_FINGER track established (2026-07-28)

**Verdict:** `MOVE_METRONOME` is exact. The lowest suitable Level-50 carrier
is set **227** `FRONTIER_MON_CHANSEY_1` (species **113**), not the lower-tier
Cleffa set. Complete legal challenge-1 CHANSEY→ONIX Scene-ON parties pass the
source body through first inactive cleanup at **127/127** reducer/seam,
tagged tile/palette, hardware OAM/matrix/order, register/audio, raw-RGB, and
shared-framebuffer frames in both orientations twice fresh. Player frames
**245–371** have evidence/raw digests `01f259da…66e02` /
`24940bca…176af`; opponent frames **244–370** have
`cdae46f8…e6881` / `06e94878…4f8f6`.

**Model/boundary:** the pure relative reducer and typed seam port both tagged
loads, the thought bubble's forward/hold/reverse lifecycle, the finger's
grow/three-wag/shrink affine program and terminal callbacks, OAM display
transfer, METRONOME plus three TAIL_WHIP restarts, and cleanup using
source-extracted Chansey/FINGER/THOUGHT_BUBBLE assets plus shared ONIX/chrome.
TAUNT remains a fresh **125/125** nearby exact control.
`MOVE_FOLLOW_ME` stays unsupported: its distinct
`gFollowMeFingerSpriteTemplate`/`AnimFollowMeFinger` uses attacker top-center
geometry, normal affine OAM, a 13-frame delay, horizontal sine traversal with
subpriority crossings, then the terminal Metronome shrink callback, plus
distinct METRONOME/ATTRACT/looped TAIL_WHIP timing. It still needs its own
complete legal both-orientation twice-fresh acceptance. Coverage is **79
exact / 0 partial / 0 staged / 197 unsupported**; no battle/controller/RNG/
facility state, boundary list, unsupported barrier, or sibling status changed.

## MOVE_TICKLE promoted exact; RockMon/EYE_SPARKLE track complete (2026-07-28)

**Verdict:** `MOVE_TICKLE` is exact. Corrected legal Level-50 set-138
OMANYTE→ONIX Scene-ON parties pass the complete source body through first
inactive cleanup at **205/205** reducer/seam, immutable source/hardware/audio,
raw-RGB, and shared-framebuffer frames **288–492** in both orientations,
twice fresh. Player evidence/raw digests remain `509f6618…7e41c4` /
`5b6253ce…12da8c`; opponent digests remain `c4327c31…3e5447` /
`b06ea14f…9323a5`.

**Model/boundary:** the typed relative seam and narrow compositor port both
eye lifecycles, black palette ramps, DETECT, SwayMon, target
RockMonBackAndForth, the Tail Whip loop, front-idle offset, palette/OAM
latches, affine-double clipping, and cleanup using source-extracted species
138 assets plus shared ONIX/chrome. The corrected eye-coordinate test now
pins the source `GetBattlerSpriteCoord` center. Coverage is **78 exact / 0
partial / 0 staged / 198 unsupported**; no battle/controller/RNG/facility
state, boundary list, unsupported barrier, or sibling acceptance changed.

## MOVE_TICKLE corrected legal-Omanyte dense-ROM evidence checkpoint; production remains unsupported (2026-07-28)

**Verdict:** Evidence-only checkpoint. `MOVE_TICKLE` remains unsupported;
coverage is unchanged. The former Omastar receipts are superseded: pinned
Emerald maps `FRONTIER_MON_OMANYTE` set **138** to `SPECIES_OMANYTE` **138**
(`SPECIES_OMASTAR` is 139). Corrected complete legal Scene-ON mechanicLab
parties against ONIX reproduce the complete source body through first inactive
cleanup at **205/205** frames **288–492** in both orientations, twice fresh.
Player-back Omanyte evidence/raw-RGB: `509f6618…7e41c4` /
`5b6253ce…12da8c`; opponent-front Omanyte: `c4327c31…3e5447` /
`b06ea14f…9323a5`.

**Evidence/source:** the audit derives the constants and carrier relationship,
and regenerated OMANYTE/EYE_SPARKLE assets name species 138. `Move_TICKLE`
loads EYE_SPARKLE, performs palette ramps, two sparkle lifecycles,
attacker-panned DETECT, `SwayMon(0,6,1280,3)`, target
`RockMonBackAndForth(6,2)`, and the 8×8 target-panned TAIL_WHIP loop. The
portable comparator twice-fresh-pins both corrected orientations, including
source offsets, topology, OAM, matrices, palettes/tags/buffers, registers,
audio, every raw RGB frame, and inactive cleanup.

**Boundary:** reusable reducer remains a checkpoint only; CHARM/COVET do not
promote Tickle. No runtime seam/compositor, battle state, boundary list, or
unsupported barrier changed.

## MOVE_LEAF_BLADE independent dense-ROM evidence checkpoint; production remains unsupported (2026-07-28)

**Verdict:** Evidence-only checkpoint. `MOVE_LEAF_BLADE` remains unsupported;
it is not staged, partial, or exact, and the coverage census is unchanged.
Source-verified Level-50 Factory set **453** `FRONTIER_MON_SCEPTILE_1`
(species **279**, Leaf Blade **348**) drives complete legal Scene-ON
mechanicLab parties against ONIX in both orientations. The complete
move-owned body through first inactive cleanup is **224/224** frames
**76–299** player-back and **80–303** opponent-front, twice fresh. Evidence
/ raw-RGB digests are player `e3fea9bd…5c4095` / `6ba2d80f…e74f4ad` and
opponent `ae787ec4…9c5b86` / `b85563f6…285bed`.

**Evidence/source:** `Move_LEAF_BLADE` loads LEAF and CROSS_IMPACT, starts
`create_leaf_blade_task` (45 observed LEAF lifecycles), executes three
target-panned CUT + `ShakeMon2(2,0,8,1)` passes, then target monbg/12:8
alpha, a fourth `ShakeMon2(8,0,18,1)`, one 36-frame CROSS_IMPACT, LEER,
waits, and cleanup. The portable comparator reruns both orientations twice
through `run-mgba-probe.py`, byte-pinning every source offset,
task/template/callback state, lifecycle, software/hardware OAM, matrices,
palettes/tags/buffers, registers, SE1/SE2/pans, raw RGB, and inactive cleanup.
Known mGBA teardown SIGSEGVs are accepted only after wrapper JSON validation.

**Boundary:** CROSS_CHOP remains the exact shared CROSS_IMPACT control; it
does not promote Leaf Blade. No reducer, seam, renderer, battle/controller,
RNG/facility state, boundary list, unsupported barrier, or sibling status
changed.

## MOVE_ENDURE promoted exact; shared EndureEffect track closed (2026-07-28)

**Verdict:** `MOVE_ENDURE` is exact. Legal Level-50 set-113 EEVEE→ONIX
Scene-ON parties pass the complete source body through first inactive cleanup
at **122/122** reducer/component, typed-seam, hardware, audio, raw-RGB, and
production-framebuffer frames **64–185** player-back and **68–189**
opponent-front, twice fresh. Player evidence/raw digests are
`5ffe4994…030024` / `941937cb…f9ce3a`; opponent digests are
`3fc347ae…26c1d2` / `19b16868…972ffd`.

**Model/boundary:** the pure relative-age reducer shares Focus Energy's exact
three-wave/fifteen-sprite EndureEffect lifecycle, Dragon Rage pan, ShakeMon2,
display latches, waits, and cleanup while keeping Endure's red palette cycle
and in-window subroutine offsets explicit. Source-extracted Eevee front/back
plus shared FOCUS_ENERGY/Onix/chrome assets pass full software/hardware OAM,
matrices, palette/tag/register, both-audio-player, raw-RGB, and compositor
receipts. `MOVE_FOCUS_ENERGY` remains an exact white-palette regression
control; `MOVE_FOCUS_PUNCH` remains unsupported as its distinct
HyperVoiceEffect body. Coverage is **77 exact / 0 partial / 0 staged / 199
unsupported**; no battle state, boundary list, or unsupported barrier changed.

## MOVE_ENDURE independent dense-ROM evidence checkpoint; production remains unsupported (2026-07-28)

**Verdict:** Evidence-only checkpoint. `MOVE_ENDURE` remains unsupported; it
is not staged, partial, or exact. The source-verified Level-50 Factory
carrier is set **113** `FRONTIER_MON_EEVEE` (species **133**, Docile,
Speed/HP spread, Endure **203**); complete legal Scene-ON mechanicLab parties
stage it against ONIX in both orientations. The complete move-owned source
body through first inactive cleanup is **122/122** frames **64–185**
player-back and **68–189** opponent-front, reproduced twice fresh. Evidence
/ raw-RGB digests are player `5ffe4994…030024` / `941937cb…f9ce3a` and
opponent `3fc347ae…26c1d2` / `19b16868…972ffd`.

**Evidence/source:** `Move_ENDURE` loads FOCUS_ENERGY, starts attacker-panned
Dragon Rage, calls the shared five-sprite `EndureEffect` three times (**15**
lifecycles), runs its distinct red `BlendColorCycle(2,2,0,11)`, starts
attacker `ShakeMon2(1,0,32,1)`, waits, and cleans up. The portable comparator
reruns both orientations twice through `run-mgba-probe.py`, byte-pinning every
source offset, task/template/callback instance, software/hardware OAM,
matrices, palettes/tags/buffers, registers, both audio players/pans, raw RGB,
lifecycle counts, and first inactive cleanup. Known mGBA teardown SIGSEGVs
were accepted only after the wrapper validated freshly written JSON.

**Boundary:** Focus Energy remains the exact control, but does not promote
Endure. `MOVE_FOCUS_PUNCH` remains a distinct unsupported HyperVoiceEffect
body. No reducer, asset, renderer, Scene-ON seam, application framebuffer,
battle/controller/RNG state, status, census, boundary list, or unsupported
barrier changed. Coverage remains **76 exact / 0 partial / 0 staged / 200
unsupported**.

## MOVE_FOCUS_ENERGY promoted exact; FOCUS_ENERGY/EndureEffect track established (2026-07-28)

**Verdict:** `MOVE_FOCUS_ENERGY` is exact. Legal Level-50 Factory set-44
TAILLOW→ONIX Scene-ON parties pass the complete source body through first
inactive cleanup at **122/122** reducer/component, typed-seam, hardware,
audio, raw-RGB, and shared-framebuffer frames **73–194** player-back and
**77–198** opponent-front, twice fresh. Player evidence/raw digests are
`949eb218…d80ae4` / `45e75715…7049c5`; opponent digests are
`67990c21…782cc7` / `a0e387e6…0c9ad5`.

**Model/boundary:** the pure relative-age reducer ports all three literal
EndureEffect calls (**15** sprites with source OAM reuse), white
BlendColorCycle, attacker ShakeMon2, Dragon Rage audio, asset/task/sprite
lifetimes, source subpriority and OAM/palette display latches, and cleanup.
The typed seam and source-extracted Taillow/FOCUS_ENERGY compositor match
every production frame without battle clocks, fitting, pixel exceptions, or
recording imports. `MOVE_ENDURE` remains unsupported for its independently
unaccepted red palette body; `MOVE_FOCUS_PUNCH` remains unsupported for its
distinct two-pass HyperVoiceEffect scale/ring/shake/platform/cry body.
Coverage is **76 exact / 0 partial / 0 staged / 200 unsupported**; no battle
state, boundary list, unsupported barrier, or sibling status changed.

## ANIM_TAG_FOCUS_ENERGY evidence checkpoint; siblings remain unsupported (2026-07-28)

**Verdict:** Evidence-only checkpoint. `MOVE_FOCUS_ENERGY` remains
unsupported; no move status or `ANIMATION_COVERAGE.json` entry changed.
Legal Level-50 source set **44** `FRONTIER_MON_TAILLOW` (species **304**,
Focus Energy **116**) anchors complete Scene-ON mechanicLab parties against
ONIX in both orientations. The first move-owned script body through inactive
cleanup is **122/122** frames **73–194** player-back and **77–198**
opponent-front, twice fresh. Evidence/raw-RGB digests are player
`949eb218…d80ae4` / `45e75715…7049c5` and opponent
`67990c21…782cc7` / `a0e387e6…0c9ad5`.

**Evidence/source:** `Move_FOCUS_ENERGY` loads FOCUS_ENERGY, starts
attacker-panned Dragon Rage, calls `EndureEffect` three times (five sprites
per call; **15** observed OAM-slot starts), runs white
`BlendColorCycle(2,2,0,11)`, attacker `ShakeMon2(1,0,32,1)`, and cleans up.
The portable receipt reruns both orientations twice through
`run-mgba-probe.py`, pinning source offsets, task/template/callback topology,
software/hardware OAM, matrices, palettes/tags, registers, SE1/SE2 and raw
RGB. No renderer, reducer, seam, application framebuffer, battle state,
boundary list, or barrier changed. `MOVE_ENDURE` and `MOVE_FOCUS_PUNCH`
remain unsupported pending independent dense move acceptance.

## MOVE_CROSS_CHOP promoted exact; CROSS_IMPACT track established (2026-07-28)

**Verdict:** `MOVE_CROSS_CHOP` is exact. Legal Level-50 Factory set-283
MACHOKE→ONIX Scene-ON parties pass the complete source body through first
inactive cleanup at **88/88** reducer/component, typed-seam, hardware, audio,
raw-RGB, and shared-framebuffer frames **216–303** player-back and **217–304**
opponent-front, twice fresh. Player evidence/raw digests are
`7be7a5bb…4888bc7` / `9d38ec15…5cd3d04`; opponent digests are
`a5561990…010d23f` / `528e9ed1…76f900f`.

**Model/boundary:** the pure relative-age reducer and typed seam port both
two-stage hands, CROSS_IMPACT, complex palette blend, target ShakeMon,
monbg/alpha, audio, tasks, display lag, and cleanup; source-extracted
Machoke/HANDS/CROSS_IMPACT plus shared Onix/chrome match every production
frame without battle clocks or fitted pixels. `MOVE_LEAF_BLADE` remains
unsupported because it adds distinct LEAF, `create_leaf_blade_task`, and
ShakeMon2 dependencies. Coverage is **75 exact / 0 partial / 0 staged / 201
unsupported**; no boundary list, unsupported barrier, battle/controller, or
sibling status changed.

## MOVE_CROSS_CHOP evidence checkpoint; CROSS_IMPACT remains unsupported (2026-07-28)

**Verdict:** Evidence-only checkpoint. `MOVE_CROSS_CHOP` and
`MOVE_LEAF_BLADE` remain unsupported; no move is staged, partial, or exact
and `ANIMATION_COVERAGE.json` is unchanged. Legal Level-50 Factory
`FRONTIER_MON_MACHOKE_2` (set **283**, species **67**, Adamant, Scope Lens,
Attack/HP spread, Cross Chop **238**) drives complete Scene-ON mechanicLab
parties against ONIX in both player-back and opponent-front orientations.
The source-owned body through first inactive cleanup is **88/88** frames
**216–303** player-back and **217–304** opponent-front, twice fresh. Evidence
/ raw-RGB digests are player
`7be7a5bb…4888bc7` / `9d38ec15…5cd3d04` and opponent
`a5561990…010d23f` / `528e9ed1…76f900f`.

**Evidence/source:** the audit pins `Move_CROSS_CHOP`, HANDS_AND_FEET and
CROSS_IMPACT loads, target monbg/12:8 alpha, two
`gCrossChopHandSpriteTemplate` lifecycles and their two-stage translation,
the 40-frame delay, target-panned MEGA_KICK then RAZOR_WIND, one
`gCrossImpactSpriteTemplate` 20-frame `WaitAnimForDuration`, complex
palette blend, target `ShakeMon(7,0,9,1)`, and cleanup. The portable
comparator reruns both orientations twice via `run-mgba-probe.py`, byte-pins
the dense source/task/template/callback topology, software→hardware OAM,
affine matrices, palettes/tags, registers, SE1/SE2, and each raw RGB frame.
It source-extracts only MACHOKE front/back, HANDS_AND_FEET, and CROSS_IMPACT.

**Boundary:** no renderer, reducer, presentation seam, application frame,
battle/controller/RNG state, boundary list, unsupported barrier, or sibling
status changed. `MOVE_LEAF_BLADE` shares CROSS_IMPACT but adds LEAF,
`create_leaf_blade_task`, and ShakeMon2, so requires independent dense
acceptance.

## MOVE_BUBBLE_BEAM promoted exact; complete water-bubble body closed (2026-07-28)

**Verdict:** `MOVE_BUBBLE_BEAM` is exact. Legal set-42 SURSKIT→ONIX
Scene-ON parties pass the complete source body through first inactive cleanup
at **239/239** frames **77–315** player-back and **81–319** opponent-front,
twice fresh. Evidence/raw-RGB digests are player `bbdd5e47…76e7e0` /
`ebdcf7ed…090baa` and opponent `c56465ad…e36662` /
`776ffc9f…d8a8bd`.

**Model/evidence:** the pure source-relative reducer and typed seam port both
asset lifecycles, all 18 parameterized projectiles, SwayMon, six short-bubble
lifecycles, monbg/alpha, both sound families, waits, and cleanup. The
source-extracted Surskit/BUBBLE assets, byte-proved SMALL_BUBBLES, and shared
Onix/chrome pass source component state, persistent OAM painter order,
software→hardware OAM, matrices, palettes, registers, both audio players,
raw RGB, and the production framebuffer on every frame.

**Boundary/next:** the `bubble-beam-water-bubbles` track keeps outside-Factory
`MOVE_BUBBLE` and Secret Power's pond dispatch unsupported pending independent
dense acceptance. Coverage is **74 exact / 0 partial / 0 staged / 202
unsupported**. No battle/controller state, boundary list, unsupported barrier,
or sibling status changed.

## MOVE_BUBBLE_BEAM evidence checkpoint; production remains unsupported (2026-07-28)

**Verdict:** Evidence-only checkpoint. `MOVE_BUBBLE_BEAM` remains unsupported;
it is not staged, partial, or exact, and `ANIMATION_COVERAGE.json` is
unchanged. Complete legal Scene-ON mechanicLab parties use the source-verified
Factory set-42 `FRONTIER_MON_SURSKIT` (species **311**, Bubble Beam move
**61**, Relaxed/Mystic Water source identity) as the constrained carrier
against ONIX, in both player-back and opponent-front orientations. The
complete source-owned script body through first inactive cleanup is **239/239**
frames **77–315** player-back and **81–319** opponent-front, reproduced twice
fresh. Evidence/raw-RGB digests are player
`bbdd5e47…76e7e0` / `ebdcf7ed…090baa`; opponent
`c56465ad…e36662` / `776ffc9f…d8a8bd`.

**Evidence/source:** the audit pins `Move_BUBBLE_BEAM`, BUBBLE and
SMALL_BUBBLES loads, target monbg/split priority/12:8 alpha, all three
`BubblebeamCreateBubbles` calls (six distinct argv each; **18**
`gWaterBubbleProjectileSpriteTemplate` lifecycles), their BUBBLE sound family,
`AnimWaterBubbleProjectile` affine/animation/three-step callback body,
`AnimTask_SwayMon(0,3,3072,8,target)`, waits, and `WaterBubblesEffectShort`'s
six `gWaterBubbleSpriteTemplate` lifecycles plus BUBBLE3 family. The portable
comparator reruns both orientations twice through `run-mgba-probe.py` and
byte-pins script offsets, tasks/sprites, software→hardware OAM, affine
matrices, BUBBLE/SMALL_BUBBLES tagged palettes, relevant registers, SE1/SE2
pans, raw RGB, and cleanup. BUBBLE/Surskit assets regenerate from pinned
source; SMALL_BUBBLES is byte-equal to the already-proved Water Gun asset.

**Exact implementation remainder:** port the complete source-relative reducer,
typed Scene-ON seam, asset compositor, and every-frame shared framebuffer
contract—no pixel fitting or recordings—then independently accept it. Bubble
`MOVE_BUBBLE` outside Factory remains unsupported, and Secret Power's pond dispatch to
Bubble Beam remains unsupported without independent acceptance. No battle
logic, controller/RNG/turn/facility state, unsupported barrier, boundary list,
or sibling status changed.

## MOVE_MUD_SHOT promoted exact; complete BROWN_ORB body closed (2026-07-28)

**Verdict:** `MOVE_MUD_SHOT` is exact. Legal set-111 KRABBY→ONIX Scene-ON
parties pass the complete source body through first inactive cleanup at
**145/145** frames **212–356** player-back and **144/144** frames **302–445**
opponent-front, twice fresh. Evidence/raw-RGB digests are player
`cef2f455…034c6` / `a9dcc157…c0b3f` and opponent `85fe40b0…840` /
`52bd4b4b…a443`.

**Model/evidence:** the pure source-relative reducer and typed seam port
BROWN_ORB load/free; 11 calls creating exactly 22 sinus orbs;
StartSinAnimTimer; both ShakeMon tasks; target monbg/split priority/12:8
alpha; the Whirlpool pan sweep; waits and cleanup. Source-extracted KRABBY
front/back and BROWN_ORB plus shared ONIX/chrome pass software→hardware OAM,
matrices, tagged palettes, registers, both audio players/pans, raw RGB, and
the production framebuffer on every frame. No absolute tick/input delay,
move/battle number, fitting, pixel exception, canonical recording import, or
battle/controller state was added.

**Boundary/next:** the new `brown-orb-mud-shot` track keeps
`MOVE_SECRET_POWER` unsupported because Factory building dispatches Strength.
Coverage is **73 exact / 0 partial / 0 staged / 203 unsupported**. Next
bounded target: select the next supervisor-ranked component track; no sibling
earned acceptance from shared code alone.

## MOVE_REVERSAL promoted exact; complete BLUE_ORB body closed (2026-07-28)

**Verdict:** `MOVE_REVERSAL` is exact. The legally corrected challenge-2
Vigoroth→Delcatty parties pass the complete Scene-ON source body through first
inactive cleanup at **174/174** source/component, typed-seam, hardware, audio,
raw-RGB, and shared-framebuffer frames **451–624** player-back and **404–577**
opponent-front, twice fresh. Evidence/raw-RGB digests are player
`f4f3dce7…d5b3a0c` / `1a761bb0…4ccb621` and opponent
`11937052…1d82877` / `0f284e09…b7623e1`.

**Model/evidence:** the pure source-relative reducer ports BLUE_ORB,
HANDS_AND_FEET, and IMPACT loads/frees; Detect/Reversal/Vital Throw audio;
both complex-palette-blend lifecycles and BlendColorCycle; exactly six
26-frame grow/shrink ReversalOrb callbacks; delays/waits, HorizontalLunge,
fist, basic hitsplat, receipt-driven target shake, and cleanup. The typed seam
accepts only an already-resolved shake amplitude and never reads power,
damage, or battle state. Source extraction pins Vigoroth front/back and
BLUE_ORB art; tests prove literal HANDS/IMPACT byte identity before reuse.
The portable verifier proves source state, software/hardware OAM, affine
matrices, tagged palettes, registers, both audio players/pans, raw RGB, typed
seam, and application framebuffer on every frame.

**Boundary:** `MOVE_SWALLOW` remains unsupported. Its BLUE_STAR,
move-turn-dependent one/two/three five-orb waves, deform/shake, and
HealingEffect require independent dense acceptance. No battle logic, damage
calculation, RNG, controller, turn order, round/facility state, boundary list,
unsupported barrier, or sibling status changed. Coverage is **72 exact / 0
partial / 0 staged / 204 unsupported**.

## MOVE_FAKE_TEARS promoted exact; resolved stat-drop window closed (2026-07-28)

**Verdict:** `MOVE_FAKE_TEARS` is exact. Corrected legal Level-50 Factory
set-267 DELCATTY→SHUCKLE fixtures pass the complete Scene-ON
`currentMove=313` window at **322/322** controller receipts and
shared-framebuffer frames **39–360**, twice fresh in both orientations. This
includes pre-animation, the **87-frame** source body, **89-frame** stat/status
phase, result/message/post-animation, and cleanup. Evidence/raw-RGB digests
are player `3b2470bd…e1c5a9` / `4aaf80e8…de8e1` and opponent
`c9b2f3d8…5221ff` / `e7828c48…938fc`.

**Boundary:** the resolved-stat-drop receipt seam presents only the already
resolved kickoff/text printer, `B_ANIM_STATS_CHANGE`, result printer/wait, and
move-end cleanup. It does not apply the stage outcome, advance RNG/scripts, or
own controller, turn, or facility state. The portable verifier's mismatch path
now constructs its framebuffer audit before reporting it. `MOVE_HEAT_WAVE` and
`MOVE_LUSTER_PURGE` remain unsupported. Coverage is **71 exact / 0 partial /
0 staged / 205 unsupported**.

## Reversal legal dense-ROM evidence complete; presentation remains unsupported (2026-07-28)

**Verdict:** Evidence-only checkpoint. `MOVE_REVERSAL` and `MOVE_SWALLOW`
remain unsupported; neither is staged, partial, or exact. Fresh complete
challenge-2 parties use source sets player `[326,327,328]` versus opponent
`[267,268,269]`, then reverse the same records. Every set field is pinned:
Emerald internal species IDs **365/348/349** and **316/322/108**, nature,
fixed IV **9**, source EV division, held item, moves (only active Vigoroth's
four slots are constrained to its legal Reversal), ability slot, Factory
friendship 0, gender class, and non-shiny personality selection. The rejected
ID 302 is `SPECIES_NINJASK`; `SPECIES_SABLEYE` is **322** in the pinned ROM
and mechanicLab writes that internal ID directly.

**Dense receipts:** player Vigoroth→opponent Delcatty retains **211/211**
`currentMove=179` frames **414–624**, including the **174/174** source window
**451–624**; opponent Vigoroth→player Delcatty retains **215/215** frames
**363–577**, source **404–577**. Both reproduce byte-identically twice fresh.
Evidence/raw-RGB digests are player
`f4f3dce7…d5b3a0c` / `1a761bb0…4ccb621` and opponent
`11937052…1d82877` / `0f284e09…b7623e1`. Receipts include source
offsets/waits, complete raw task/sprite/template/callback topology,
software+hardware OAM, all affine matrices, tagged faded/unfaded/hardware
palettes, GPU registers, SE1+SE2, raw RGB, and first-inactive cleanup. They
prove Detect, two complex-palette-blend lifecycles plus BlendColorCycle, six
orb lifecycles/callbacks, lunge/fist/impact, and the power/damage shake.

**Boundary:** This is deliberately not staged: no reducer, assets, renderer,
typed presentation seam, or application-framebuffer contract exists.
`MOVE_SWALLOW` remains distinct and unsupported: it adds BLUE_STAR,
move-turn-dependent one/two/three five-orb waves, attacker deform/shake, and
HealingEffect. No battle/controller/RNG/turn/facility state, boundary list,
unsupported barrier, or acceptance status changed.

## MOVE_SMOKESCREEN promoted exact; complete BLACK_BALL body closed (2026-07-28)

**Verdict:** `MOVE_SMOKESCREEN` is exact. Legal Level-50 Factory set-127
KOFFING against ONIX passes the complete Scene-ON source body through first
inactive cleanup at **125/125** source/component, typed-seam, hardware, and
shared-framebuffer frames **214–338** player-back and **302–426**
opponent-front, twice fresh. Stable evidence/raw-RGB digests are player
`14911b5a…3be59` / `435cca4a…1adf35` and opponent
`01bbc709…a963d` / `9a38c4eb…23e430`.

**Model/evidence:** the pure source-relative reducer ports the 35-callback
BLACK_BALL horizontal arc, dynamically loaded/freed four-part
SmokescreenImpact, all twelve 75-callback blinking BLACK_SMOKE translations,
both panned sounds, waits, and first inactive cleanup. The typed Scene-ON seam
and shared compositor use reproducibly extracted legal Koffing/BLACK_BALL/
BLACK_SMOKE/impact art, reuse exact Onix/chrome/enemy-shadow primitives, and
match source hardware OAM transfer ordering. The corrected portable probe
requires an empty task topology and checks software/hardware OAM, matrix mode,
palettes/registers/audio, raw RGB, and application framebuffer every frame.

**Boundary:** `MOVE_OCTAZOOKA` remains unsupported. Its shared BLACK_BALL tag
owns a distinct 20-frame translation, four delayed GRAY_SMOKE
`gOctazookaSmokeSpriteTemplate` lifecycles, and different audio without
independent dense acceptance. No battle logic, RNG, controller, turn order,
round/facility state, boundary list, or unsupported barrier changed. Coverage
is **70 exact / 0 partial / 1 staged / 205 unsupported**.

## MOVE_SMOKESCREEN staged; erroneous ShakeMon2 ownership removed (2026-07-28)

**Verdict:** `MOVE_SMOKESCREEN` is staged, not exact. Legal Level-50 Factory
set-127 `FRONTIER_MON_KOFFING` against ONIX establishes the full Scene-ON
source interval through first inactive cleanup at **125/125** frames **214–338**
player-back and **302–426** opponent-front. Two fresh mGBA runs per orientation
were byte-identical, including every raw RGB frame digest. Receipts are player
`5c81fa1f…1ba9ee` / `435cca4a…1adf35`; opponent `910665d1…c78170` /
`9a38c4eb…23e430`.

**Evidence/topology:** `smokescreenProbe.py` retains source offsets/waits,
templates/callbacks/tasks, palette tags, software/hardware OAM and affine
matrices, palettes/registers, SE1/SE2 pans, raw RGB, and cleanup. The source
body is BLACK_BALL translation, dynamically loaded four-part SmokescreenImpact,
twelve BLACK_SMOKE lifecycles, visual-finish wait, and the first inactive
cleanup. It has **no task lifecycle and no target shake**: the prior audit
incorrectly sliced from `Move_SMOKESCREEN` to the much later `Move_BUBBLE`
label and found an unrelated `AnimTask_ShakeMon2`. The corrected audit ends at
the immediate `Move_CONVERSION` label, asserts no `ShakeMon2`, and the probe
requires an empty task topology plus the dynamic impact template. No reducer,
typed seam, compositor, battle/controller state, or acceptance was implemented.

**Sibling boundary:** `MOVE_OCTAZOOKA` remains unsupported. It has a distinct
20-frame BLACK_BALL translation, four delayed GRAY_SMOKE
`gOctazookaSmokeSpriteTemplate` lifecycles, and different target audio; it has
no independent dense evidence. The assigned exact gate was internally
contradictory because it required the nonexistent target `ShakeMon2`; adding
that task would necessarily fail the accepted raw frames. Exact Smokescreen
still needs a corrected brief followed by the actual source-relative
reducer/seam/assets and full shared-framebuffer equality twice fresh in both
orientations. Coverage is **69 exact / 0 partial / 2 staged / 205 unsupported**.

## MOVE_SONIC_BOOM promoted exact; complete AIR_WAVE body closed (2026-07-28)

**Verdict:** `MOVE_SONIC_BOOM` is exact. Legal Level-50 Factory set-244
`FRONTIER_MON_MAGNETON_1` against ONIX passes the complete Scene-ON source
body through first inactive cleanup at **52/52** source/component, typed-seam,
hardware, and shared-framebuffer frames **78–129** player-back and
**82–133** opponent-front, twice fresh. Byte-identical evidence/raw-RGB
digests are player `0a7fc886…1662bb` / `8692f81c…18dee` and opponent
`0c923df2…4f6a6` / `b2449044…f7f3f`. Coverage is **69 exact / 0 partial /
1 staged / 206 unsupported**.

**Model/evidence:** the source-relative reducer ports all three duration-15
`gSonicBoomSpriteTemplate` translations, side-derived affine matrices and
Razor-Wind pans, the animation-2 target IMPACT, `ShakeMon(3,0,10,1)`,
partner monbg/target split priority, 12:8 alpha, waits, and cleanup. The typed
seam and shared hardware compositor source-extract AIR_WAVE and Magneton art,
reuse exact IMPACT/ShakeMon/Onix/chrome components, and reproduce the
orientation-specific OBJ order plus the one-display elevated enemy-shadow
latch before `SpriteCB_EnemyShadow` observes `gAnimScriptActive`. The portable
verifier proves source offsets, tasks/sprites, OAM/matrices/palettes,
registers/audio, raw RGB, and application framebuffer on every frame.

**Boundary:** `MOVE_AIR_CUTTER` remains unsupported. It shares AIR_WAVE but
owns `AnimTask_AirCutterProjectile`, CUT/`gAirCutterSliceSpriteTemplate`,
both target and `ANIM_DEF_PARTNER` `ShakeMon2(2,0,8,1)` calls, and distinct
wait/audio timing without independent dense move acceptance. No battle logic,
RNG, controller, turn order, round/facility state, boundary list, or
unsupported barrier changed.

## MOVE_SONIC_BOOM complete AIR_WAVE evidence staged; Air Cutter audited (2026-07-28)

**Verdict:** `MOVE_SONIC_BOOM` is staged, not exact. Legal Level-50 Factory
set-244 `FRONTIER_MON_MAGNETON_1` (Magneton) against ONIX establishes the
complete source-owned Scene-ON window from its first sourced display through
first inactive cleanup at **52/52** frames **78–129** player-back and
**82–133** opponent-front, twice fresh and byte-identical. Full
evidence/raw-RGB digests are player `9c3e744f…15eff7` /
`c98fa1b4…a7e38a` and opponent `e66adb5a…ab7ffe3` /
`f9d02f74…cb576d`.

**Evidence/topology:** `Move_SONIC_BOOM` loads AIR_WAVE and IMPACT, opens
`ANIM_DEF_PARTNER` monbg with target split priority and 12:8 alpha, calls the
Razor-Wind-panned `gSonicBoomSpriteTemplate` body three times (each
16,0→0,0/duration 15 with 4-frame script waits), starts
`ShakeMon(target,3,0,10,1)`, then creates its animation-2 target IMPACT and
cleans monbg/blend. Dense portable receipts retain every source offset/wait,
template/callback/task instance, AIR_WAVE+IMPACT palette tags, target/partner
OAM ordering, matrices, registers, SE1/SE2+pans, raw RGB/framebuffer, and
first inactive frame in both orientations. No reducer, seam, renderer, or
battle/controller state changed.

**Boundary:** `MOVE_AIR_CUTTER` remains unsupported. It shares AIR_WAVE but
also owns `AnimTask_AirCutterProjectile`, CUT/`gAirCutterSliceSpriteTemplate`,
both target and `ANIM_DEF_PARTNER` `ShakeMon2(2,0,8,1)` calls, and distinct
wait/audio timing; it has no independent dense acceptance. Exact Sonic Boom
still requires a typed presentation seam, source-relative reducer/compositor,
and complete shared-framebuffer equality twice fresh. Coverage is **68 exact
/ 0 partial / 2 staged / 206 unsupported**.

## MOVE_FAKE_TEARS full-window ownership audited; remains staged (2026-07-28)

**Verdict:** `MOVE_FAKE_TEARS` remains staged. Corrected legal set-267
DELCATTY evidence now densely verifies every **322/322** `currentMove=313`
frame **39–360** twice fresh in both orientations, including source/component
state where active plus hardware OAM/matrices/palettes, registers, both audio
players, raw RGB, and the application framebuffer. The animation-owned source
body remains exact at **87/87** frames **76–162** player-back and **80–166**
opponent-front. Full evidence/raw digests are player
`3b2470bd…e1c5a9` / `4aaf80e…de8e1` and opponent
`c9b2f3d8…5221ff` / `e7828c48…938fc`, byte-identical across both fresh runs.

**Phase/ownership audit:** player-back partitions as pre-animation **39–75
(37)**, source **76–162 (87)**, stat/status **163–251 (89)**,
message/post-animation **252–359 (108)**, cleanup **360 (1)**.
Opponent-front partitions as **39–79 (41)**, **80–166 (87)**, **167–255
(89)**, **256–359 (104)**, and **360 (1)**. Pinned ROM source assigns only
`Move_FAKE_TEARS` to animation. `BattleScript_EffectStatDown`,
`Cmd_statbuffchange`/`ChangeStatBuffs`, `B_ANIM_STATS_CHANGE`, the stat
message/wait, and `BattleScript_MoveEnd` own the other **235** frames.
The existing standalone animation seam has no typed controller command or
resolved stat/message/cleanup input: only 19 static outer frames coincide and
**216/235** outer application framebuffers mismatch in each orientation
(player 30 pre + 80 status + 105 message/post + 1 cleanup; opponent
34 + 80 + 101 + 1). No controller behavior was synthesized.

**For the main program:** expose the already-resolved Scene-ON stat-drop
controller presentation through the shared seam—kickoff/text-printer state,
`B_ANIM_STATS_CHANGE` receipts, stat-result message/wait, and move-end cleanup—
without moving stage outcomes, RNG, script advancement, or controller
ownership into animation. Then rerun `fakeTearsPortable.ts`; exact promotion
still requires 322/322 shared-framebuffer and typed-seam equality twice fresh
in both orientations. `MOVE_HEAT_WAVE` and `MOVE_LUSTER_PURGE` remain
unsupported. Coverage stays **68 exact / 0 partial / 1 staged / 207
unsupported**.

## MOVE_SPIKE_CANNON promoted exact; complete WindUpLunge body closed (2026-07-28)

**Verdict:** `MOVE_SPIKE_CANNON` is exact. Legal Level-50 Factory set-260
`FRONTIER_MON_OMASTAR_1` versus ONIX passes its complete Scene-ON source body
through first inactive cleanup at **84/84** source, typed-seam, hardware, and
shared-framebuffer frames **86–169** player-back and **90–173**
opponent-front, twice fresh. Pinned evidence/raw RGB digests are player
`80760b25…c854654` / `c5af7071…97e61`; opponent
`7c4e2dd5…134b8a2` / `8f393625…3c2a`. Coverage is **68 exact / 0 partial /
1 staged / 207 unsupported**.

**Model/evidence:** the source-relative reducer ports side-inverting
`AnimTask_WindUpLunge`, `SlideMonToOriginalPos`, three attacker-relative
linear NEEDLE stingers, three simultaneous animation-2 invert hitsplats,
`ShakeMon2(3,0,7,1)`, target monbg/split priority/12:8 alpha, both looped
audio families, source OAM transfer ordering, and cleanup. The typed seam and
shared compositor use source-extracted Omastar art plus the source-identical
Twineedle NEEDLE, linear-stinger, invert-hitsplat, ShakeMon2, alpha, and
cleanup primitives. Dedicated complete legal mechanic-lab scenarios now
materialize the set-260 Omastar directly. The portable verifier records tasks/sprites, OAM,
matrices, palettes, registers, audio, raw RGB, and the application
framebuffer on every frame. No battle logic, RNG, turn order, controller,
facility state, boundary list, or unsupported barrier changed.

**Siblings:** `MOVE_TAKE_DOWN` remains unsupported (23+10+10 lunge, blend,
offset/shake/returns); `MOVE_BRICK_BREAK` remains unsupported (two-turn wall
branch, horizontal lunges, fist/shards/BG blend); outside-Factory
`MOVE_SNATCH` remains unsupported (bare 10+10+6 lunge). None received
independent dense acceptance.

## MOVE_ASTONISH promoted exact; full source body closed (2026-07-28)

**Verdict:** `MOVE_ASTONISH` is exact. Legal Factory set-144
`FRONTIER_MON_LOUDRED` (species 371) against ONIX passes the complete Scene-ON
source-script-plus-first-inactive window at **63/63** source, typed seam,
hardware, and shared-framebuffer frames **220–282** player-back and **219–281**
opponent-front, twice fresh. Pinned evidence/raw RGB digests are player
`20d66e8b…77568` / `ad5dcf52…3f2c90`; opponent
`48912cfb…c209` / `ba9b56fe…ce3c71`. Coverage is **67 exact / 0 partial /
1 staged / 208 unsupported**.

**Model:** the source-relative reducer ports SWEAT_BEAD load/free lifetime,
ENCORE and SKETCH pans, HorizontalLunge, the 25-frame wait, both Random2-owned
SprayWaterDroplet callbacks, ShakeMon2 task-slot writes, both 10-frame
StretchTargetUp affine legs, wait semantics, and cleanup. The typed Scene-ON
seam owns presentation-only RNG outputs and geometry. The compositor uses
source-extracted Loudred/SWEAT_BEAD art, existing Onix/chrome components,
source OAM priority, and the split affine-entry scanout latch (Shake x2 before
the following matrix/vertical-anchor transfer). No battle logic, RNG advance,
turn order, controller, facility state, boundary list, or unsupported barrier
changed.

**Siblings:** `MOVE_FAKE_OUT` remains unsupported because it adds
`AnimTask_FakeOut` and a post-body white blend. `MOVE_TRICK` remains
unsupported because it adds ITEM_BAG/SPEED_DUST assets, two bag affine
programs, StretchAttackerUp, repeated DOUBLE_TEAM sounds, and Hydro Cannon
beams. Neither received independent dense move acceptance.

## MOVE_FAKE_TEARS corrected-species source body exact; remains staged (2026-07-28)

**Verdict:** `MOVE_FAKE_TEARS` remains staged. The inherited “set-267
DELCATTY” scenarios use internal species **301 (NINCADA)**, so their earlier
321-frame evidence cannot satisfy legal DELCATTY acceptance. Corrected
mechanic-lab fixtures use Emerald species **316 (DELCATTY)**. Their complete
source-owned load/body/free/clear window is exact twice fresh at **87/87**
frames **76–162** player-back and **80–166** opponent-front through reducer,
typed seam, tasks/sprites, asset/palette/OAM/register/audio lifecycles, raw
RGB, and shared framebuffer. Second-run probe/raw digests are player
`3b2470bd…e1c5a9` / `4aaf80e…de8e1`; opponent `c9b2f3d8…5221ff` /
`e7828c48…938fc`.

**Model:** source-relative state ports zero-delay `AnimTask_BlendParticle`,
speed-1/two-rock `AnimTask_RockMonBackAndForth`, all four Tail Whip restarts,
eight typed 32-callback tear arcs/affines, SMALL_BUBBLES blend, the
load-only THOUGHT_BUBBLE/MUSIC_NOTES tags, waits, frees, and cleanup. The
shared compositor adds source-extracted DELCATTY front/back art and reuses
SHUCKLE field chrome, affine sprite composition, healthboxes, and text. Pure
tests pin the reducer, typed seam, exact affine callback states, source asset
regeneration, audio duration, and both legal picture bounds.

**Acceptance remainder:** corrected-species fresh captures contain
`currentMove=313` on **322 frames 39–360**, not the inherited/assigned
**321 frames 39–359**. The portable verifier intentionally proves only the
87 source-owned frames, leaving **235/322** controller-window frames per
orientation (pre-animation, stat-drop, message/post-animation) unaccepted.
No exception was added and coverage stays **66 exact / 0 partial / 1 staged /
209 unsupported**. A later worker must resolve the corrected-species
controller-window contract and reproduce every remaining frame twice fresh
before promotion. `MOVE_HEAT_WAVE` and `MOVE_LUSTER_PURGE` remain unsupported.

## MOVE_FAKE_TEARS staged; AnimTask_BlendParticle latch evidence complete (2026-07-28)

**Historical verdict, superseded:** `MOVE_FAKE_TEARS` was staged from
species-301 fixtures then mislabeled DELCATTY; species 301 is NINCADA, so this
is retained only as provenance and not legal set-267 acceptance. Those
Scene-ON NINCADA/SHUCKLE parties capture every `currentMove=313` frame
(**321**, 39–359) and the complete source-owned BlendParticle
creation/display latch plus first inactive cleanup (**2/2**, frames **84–85**
player-back and **88–89** opponent-front) twice fresh. Outputs are
byte-identical: player `ad60a3d3…995067d` / raw `8a434003…b7a390`; opponent
`8a7c58ab…2ff07cc` / raw `75dd472a…c33a94`. Coverage is now **66 exact / 0
partial / 1 staged / 209 unsupported**.

**Evidence/scope:** `AnimTask_BlendParticle` selects the source-extracted
SMALL_BUBBLES OBJ palette and Fake Tears supplies `(delay=0, initial=4,
target=4)`, so the creation dispatch latches then destroys the task before it
can survive a post-frame `gTasks` snapshot. The probe records script/task/
sprite/OAM/matrix/palette/register/audio/raw-RGB/framebuffer state; the first
inactive latch shares its frame with the subsequent RockMon launch, which is
explicitly a boundary—not accepted or modeled. No reducer, typed seam, app
compositor, battle logic/RNG/controller/facility state, boundary list, or
unsupported barrier changed.

**Siblings:** `MOVE_HEAT_WAVE` remains unsupported (FLYING_DIRT plus
sandstorm/background, both-target motion, pan, crescents). `MOVE_LUSTER_PURGE`
remains unsupported (psychic/white BG, circle, two particle tags, random
hitsplats/sounds, shake, restore). Neither received independent complete dense
move acceptance.

## MOVE_SURF promoted exact; create_surf_wave BG1/scanline seam closed (2026-07-28)

**Verdict:** `MOVE_SURF` is exact. Fresh complete legal Scene-ON
WARTORTLE/SHUCKLE evidence passes the complete source-owned controller and
scanline window plus first inactive cleanup at exactly **144/144** frames
**72-215** player-back and **76-219** opponent-front through reducer, typed
seam, registers/audio, raw RGB, and shared framebuffer twice fresh. Outputs
remain byte-identical: player `19cf632a…800dae` / raw
`fc0c3faa…163ed5`; opponent `66a3f92d…c97ffa` / raw
`be3db045…ea4c6`. Coverage is now **66 exact / 0 partial / 0 staged / 210
unsupported**.

**Model/renderer:** the pure relative-age reducer ports
`AnimTask_CreateSurfWave` and `AnimTask_SurfWaveScanlineEffect`: side-selected
512x256 BG1 tilemaps, side-relative scroll, 1→13 hold→0 alpha, expanding
scan regions, four-frame palette rotation, `SE_M_SURF` pan, BG clear, and
scanline teardown. The narrow shared compositor source-extracts WARTORTLE
front/back and water art, layers priority-1 BG1 over the field/battlers but
under healthboxes/BG0, and ports the palette-transfer plus side-specific
scanline-buffer display latches without absolute-tick or pixel exceptions.

**Scope/siblings:** `MOVE_MUDDY_WATER` remains unsupported: it requires its
Muddy palette and pre-command `SE_M_WHIRLPOOL` to earn independent complete
dense acceptance. `MOVE_SECRET_POWER` remains unsupported: the Factory
building environment dispatches Strength, not Surf. No battle logic, RNG,
controller, turn order, round/facility state, boundary list, or unsupported
barrier changed.

## MOVE_SURF staged; create_surf_wave evidence checkpoint complete (2026-07-28)

**Verdict:** `MOVE_SURF` is staged only. Fresh complete legal Scene-ON
WARTORTLE/SHUCKLE mechanic-lab parties capture every `currentMove=57` frame
(**370** frames 39–408 player-back, **367** frames 39–405 opponent-front) and
the complete source-owned controller/scanline window plus first inactive
cleanup (**144/144**, frames 72–215 player-back and 76–219 opponent-front).
Both outputs and concatenated raw-RGB streams are byte-identical twice fresh:
player `19cf632a…800dae` / `fc0c3faa…163ed5`; opponent
`66a3f92d…c97ffa` / `be3db045…ea4c6`. Coverage is now **65 exact / 0 partial
/ 1 staged / 210 unsupported**.

**Model/evidence:** `create_surf_wave` owns BG1 water gfx, side-selected
player/opponent tilemap, Surf/Muddy palette, `AnimTask_CreateSurfWave`, and
the `AnimTask_SurfWaveScanlineEffect` alpha-DMA task—no effect software sprite.
The committed probe captures complete task/sprite bodies, BG tilemap/scroll/
affine and raw VRAM, palettes, registers, OAM/matrices, both audio players/
pans, RGB, script identities, assets, and cleanup; source extraction
byte-pins exactly the required water tiles, two Factory tilemaps, and palettes.

**Siblings/scope/next:** `MOVE_MUDDY_WATER` remains unsupported: same command
but a Muddy palette and pre-command `SE_M_WHIRLPOOL`, requiring independent
dense acceptance. `MOVE_SECRET_POWER` remains unsupported: Factory
`BATTLE_ENVIRONMENT_BUILDING` dispatches `Move_STRENGTH`, not `Move_SURF`.
Next: port the two Surf tasks as a relative-age reducer, add a typed seam and
BG1/scanline framebuffer renderer, then prove both 144-frame windows before
considering a separate Muddy Water stage. No battle logic/RNG/controller/
facility state, boundary list, unsupported barrier, or absolute-tick,
move-number, input-delay, coordinate/RGB/pixel exception changed.

## MOVE_THUNDER_WAVE promoted exact; complete Spark-track seam closed (2026-07-28)

**Verdict:** `MOVE_THUNDER_WAVE` is exact. Fresh complete legal Scene-ON
FLAAFFY/SHUCKLE evidence passes all **120/120** source load/body/cleanup
frames **79-198** player-back and **83-202** opponent-front through the
source-relative reducer, typed seam, software tasks/sprites, registers,
hardware OAM/matrices/palettes, both audio players/pans, raw RGB, and shared
framebuffer, twice fresh. The first inactive offset-110 teardown is included;
the later `Task_DoStatusAnimation` remains excluded. Coverage is now **65
exact / 0 partial / 0 staged / 211 unsupported**.

**Renderer/evidence:** the reducer ports SPARK/SPARK_2/SPARK_H loads, field
0→6→0 fade, five staggered ElectricBolt segments and their source OAM latch,
both side-relative sound families, all three two-sprite flashing bands, task
counts, and cleanup. The narrow compositor source-extracts FLAAFFY and
SPARK/SPARK_H, reuses exact SHUCKLE and shared chrome, and consumes prior
software OAM/palette state. Fresh v3 outputs are byte-identical (player
`3d8b1bee…267ee` / raw `aaa201bb…1c5a5`; opponent `0454b5a2…1b424` /
raw `e97ad2bd…0236e`).

**Scope/siblings/next:** `MOVE_THUNDERBOLT` stays unsupported with its triple
bolt, SHOCK_3 orb, eight affine sparks, target palette body, and distinct
sounds. `MOVE_ZAP_CANNON` stays unsupported with BLACK_BALL_2, eight orbiting
sparks, ShakeMon2, ElectricityEffect, and distinct pans. Neither has complete
dense evidence; exact `MOVE_SPARK` is preserved. Next select a bounded
Level-50 representative from the coverage queue. No battle logic/RNG/
controller/facility state, boundary list, unsupported barrier, or absolute-
tick/move-number/input-delay/coordinate/RGB/pixel exception changed.

## MOVE_BODY_SLAM promoted exact; audio and framebuffer repaired (2026-07-28)

**Verdict:** `MOVE_BODY_SLAM` is exact. Fresh complete legal set-269
LICKITUNG/ONIX Scene-ON evidence passes the complete move-owned source-script
window plus first clear display at **107/107** frames **303-409** player-back
and **107/107** frames **232-338** opponent-front through reducer/component,
typed seam, software callbacks/tasks, registers, hardware battler
OAM/matrices/palette transfer, complete two-player audio, raw RGB, and the
shared framebuffer, twice fresh. The repaired v2 probe proves
`SE_M_TAKE_DOWN` on **SE2** at attacker pan (age 7) and both
`SE_M_MEGA_KICK2` loop cues on **SE1** at target pan (ages 44/54), including
player identity/status/flags in both orientations. Coverage is now **63 exact
/ 1 partial / 212 unsupported**. Independent
outputs are byte-identical (player `79e4bfaa…258c`, opponent
`02c0ee9d…8c01`).

**Renderer/model:** source extraction byte-pins LICKITUNG front/back and
reuses source-generated IMPACT. The narrow compositor ports the source pic
coordinates, target monbg, prior-software battler/effect OAM and palette
transfer, 12:8 alpha, both moving battlers, chrome, healthboxes, text, and
first clear. The pure source-relative reducer ports
`gVerticalDipSpriteTemplate(6,1,attacker)`, both offset slides, animation-0
IMPACT, target `AnimTask_ShakeMonInPlace(4,0,12,1)`, both return slides,
target monbg, 12:8 alpha registers, side-relative sounds, and cleanup.

**Siblings/scope:** the evidence used the required validated local-mGBA path.
`MOVE_RETURN` remains unsupported pending all four friendship branches;
`MOVE_FLATTER` remains unsupported pending spotlight/fades/38 confetti and
distinct sounds; outside-Factory `MOVE_WEATHER_BALL` remains unsupported
pending its weather-dispatched bodies. No battle logic, RNG/controller/
facility state, boundary list, unsupported barrier, absolute tick, input
delay, coordinate/RGB, or pixel exception changed.

## MOVE_HEADBUTT promoted exact; source OAM latch compositor closed (2026-07-28)

**Verdict:** `MOVE_HEADBUTT` is exact. Fresh complete legal set-24
ZIGZAGOON/ONIX Scene-ON evidence passes the entire move-owned animation body
plus first clear display at **48/48** frames **77-124** player-back and
**48/48** frames **81-128** opponent-front through source/reducer, typed seam,
registers, hardware battler OAM/matrices/palettes, side-relative audio, raw
RGB, and the shared framebuffer, twice fresh. Coverage is now **62 exact / 1
partial / 213 unsupported**.

**Renderer/evidence:** source extraction byte-pins ZIGZAGOON front/back and
reuses the already source-generated `ANIM_TAG_IMPACT`. The narrow compositor
ports the prior-software affine/OAM transfer, both source task-to-OAM display
latches, flashing IMPACT visibility, field chrome, healthboxes, and move text.
Independent outputs remain byte-identical (player `28e574bd…c858`, opponent
`fcc0a0e8…1281`).

**Scope/siblings:** `MOVE_HORN_ATTACK`, `MOVE_HORN_DRILL`, and
`MOVE_DRILL_PECK` remain unsupported because their horn,
drill-BG/scroll/repeated-impact, and whirlwind/hitsplat-task bodies lack
independent complete dense acceptance. No battle logic, RNG/controller/
facility state, boundary list, unsupported barrier, absolute-tick/input-delay,
coordinate/RGB, or pixel exception changed.

## MOVE_HEADBUTT complete typed/hardware checkpoint; remains partial (2026-07-28)

**Verdict:** `MOVE_HEADBUTT` is partial. Fresh complete legal set-24
ZIGZAGOON/ONIX Scene-ON evidence passes the entire move-owned animation body
plus first clear display at **48/48** frames **77-124** player-back and
**48/48** frames **81-128** opponent-front through source/reducer, typed seam,
registers, hardware battler OAM/matrices/palette transfer, side-relative
audio, and raw RGB, twice fresh. Coverage is now **61 exact / 2 partial / 213
unsupported**.

**Reusable model/evidence:** the relative-age reducer ports
`gBowMonSpriteTemplate` phases 0/1/2, side-relative translation/rotation and
`SetBattlerSpriteYOffsetFromRotation`, attacker
`AnimTask_ShakeMonInPlace(2,0,4,1)`, target `AnimTask_ShakeMon(5,0,6,1)`,
animation-1 flashing IMPACT, both sounds, and cleanup. Independent outputs are
byte-identical (player `28e574bd…c858`, opponent `fcc0a0e8…1281`).

**Exact remainder/siblings:** exact remains unclaimed until the shared
framebuffer compositor extracts ZIGZAGOON front/back and IMPACT art, ports the
battler affine/OAM display transfer plus flashing visibility and field chrome,
and proves **48/48** shared-framebuffer equality twice fresh in both
orientations. `MOVE_HORN_ATTACK`, `MOVE_HORN_DRILL`, and `MOVE_DRILL_PECK`
remain unsupported because their horn, drill-BG/scroll/repeated-impact, and
whirlwind/hitsplat-task bodies respectively lack independent dense acceptance.
No battle logic, RNG/controller/facility state, boundary list, unsupported
barrier, absolute-tick/input-delay, or coordinate/RGB/pixel exception changed.

## MOVE_COVET promoted exact; ITEM_BAG load/transfer proved (2026-07-28)

**Verdict:** `MOVE_COVET` is exact. Fresh complete legal challenge-1
set-203 LINOONE/SHUCKLE Scene-ON evidence passes the complete move-owned
load/body/cleanup window at **114/114** frames **73-186** player-back and
**77-190** opponent-front through reducer/component state, typed seam,
registers, hardware OAM/matrices/palettes, side-relative audio, raw RGB, and
the shared framebuffer, twice fresh. Coverage is now **61 exact / 1 partial /
214 unsupported**.

**Renderer/evidence:** the source reducer reuses exact Charm hearts and
RockMonBackAndForth, then ports target ShakeMon2 and the Dizzy Punch loop.
`ANIM_TAG_ITEM_BAG` is source-extracted and its load, palette tag, and
prior-software hardware transfer are pinned; the stock Covet script creates
no bag sprite. The compositor adds LINOONE front/back and the source battler
task display latch. Fresh evidence is byte-identical (player
`af4e7838…1df7`, opponent `cd62d0bd…bc17`).

**Scope/siblings:** `MOVE_PRESENT` and `MOVE_TRICK` remain unsupported because
they instantiate distinct ITEM_BAG affine/callback programs and have no
independent dense acceptance. No battle logic, RNG/controller/facility state,
boundary list, unsupported barrier, or absolute-tick/input-delay/coordinate/
RGB/pixel exception changed.

## MOVE_DIZZY_PUNCH promoted exact; source compositor closes both orientations (2026-07-28)

**Verdict:** `MOVE_DIZZY_PUNCH` is exact. Fresh complete legal set-145
SPINDA/ONIX Scene-ON evidence passes the entire move-owned body at **69/69**
frames **90-158** player-back and **69/69** frames **94-162**
opponent-front through reducer/component state, typed seam, registers,
hardware OAM/matrices/palettes, side-relative audio, raw RGB, and the shared
framebuffer, twice fresh. The following clear tail is independently pinned.
Coverage is now **60 exact / 1 partial / 215 unsupported**.

**Renderer/evidence:** the committed dedicated mGBA probe and portable
comparator cover both lunges, both ShakeMon2 tasks, both fists, both
animation-1 IMPACT sprites, all twelve ducks including priority/visibility/
translation, target monbg, 12:8 alpha, prior-software hardware transfer, and
cleanup. The source-derived compositor extracts SPINDA front/back,
ONIX/shared field art, HANDS_AND_FEET, IMPACT, DUCK, chrome, healthboxes, and
text; its front-only personality spots port `DRAW_SPINDA_SPOTS`, including
the source 1bpp bit order. Fresh evidence is byte-identical (player
`5a69e0ff…976`, opponent `c475b845…64c`).

**Source/siblings:** the source audit still proves exactly twelve literal
ducks and **zero falling feathers** in DIZZY_PUNCH. `MOVE_TEETER_DANCE`
remains unsupported with its distinct movement task, five fast music-note
paths, and sounds. `MOVE_SIGNAL_BEAM` remains unsupported with its distinct
red/green orb stream, sinus timer, shakes, pan sweep, and target palette
cycle. Neither received an independent acceptance. No battle logic,
RNG/controller/facility state, boundary list, unsupported barrier, or
move-number/input-delay/absolute-tick/coordinate/RGB/pixel exception changed.

## ANIM_TAG_DUCK / MOVE_DIZZY_PUNCH source-and-seam checkpoint; remains unsupported (2026-07-28)

**Verdict:** `MOVE_DIZZY_PUNCH` remains unsupported; coverage stays **59
exact / 1 partial / 216 unsupported**. Fresh complete legal set-145
SPINDA/ONIX Scene-ON scenarios pin the move-owned body at frames **90-158**
player-back and **94-162** opponent-front. The source-relative reducer and
typed seam now port both horizontal lunges, both target ShakeMon2 tasks,
both fist and animation-1 IMPACT instances, both literal six-duck waves,
12:8 alpha/target-monbg, side-relative sound identities, and cleanup.
`ANIM_TAG_DUCK`, SPINDA front/back art, HANDS_AND_FEET, and IMPACT regenerate
byte-for-byte.

**Evidence/boundary:** a fresh local-mGBA scout invoked through
`tools/run-mgba-probe.py` captured every `currentMove=146` frame with
software sprites/tasks, hardware OAM/matrices/palettes/registers, audio, and
raw RGB (player digest `d6779742…fa3`, opponent `429cd8b2…07f`). The
committed source audit pins exactly 12 `gDizzyPunchDuckSpriteTemplate`
instances and proves that Emerald's `Move_DIZZY_PUNCH` has **zero**
`gFallingFeatherSpriteTemplate`/`ANIM_TAG_WHITE_FEATHER` commands; those
belong to `Move_FEATHER_DANCE`, so no unsupported feather behavior was
invented.

**Exact remainder/siblings:** commit a dedicated reproducible dense probe
and portable comparator, strengthen every relative-age reducer receipt
against both orientations twice fresh, then add the narrow shared compositor
for SPINDA, fists, animation-1 IMPACT, all ducks, prior-software hardware
transfer, palettes/registers/audio/raw RGB, and **69/69** shared-framebuffer
equality plus the clear tail. `MOVE_TEETER_DANCE` remains unsupported with
its distinct movement task and five fast music-note paths/sounds.
`MOVE_SIGNAL_BEAM` remains unsupported with its distinct red/green orb
stream, sine timer, shakes, pan sweep, and target palette cycle. No engine,
battle state, RNG/controller/facility logic, coverage status, boundary list,
unsupported barrier, or absolute-tick/input-delay/pixel exception changed.

## MOVE_TAIL_GLOW promoted exact; shared framebuffer closed (2026-07-28)

**Verdict:** `MOVE_TAIL_GLOW` is exact. Fresh complete legal set-277
VOLBEAT/SHUCKLE Scene-ON evidence passes all **203/203** move-owned frames and
cleanup at frames **73-275** player-back and **77-279** opponent-front through
source/software, typed seam, registers, hardware OAM/matrices/palettes,
side-relative audio, raw RGB, and the shared framebuffer, twice fresh.
Coverage is now **59 exact / 1 partial / 216 unsupported**.

**Renderer/evidence:** source extraction now byte-pins both VOLBEAT
orientations alongside CIRCLE_OF_LIGHT. The narrow compositor ports the
source-exact BG palette banks, attacker monbg target-2 stack, prior-software
hardware transfer, affine 12:8-alpha orb, field chrome, healthboxes, text, and
cleanup. Dense framebuffer closure also corrected the palette reducer to
Emerald's fixed `deltaY=2` coefficients **0→2→4→2→0** and the source-derived
player-back corner to `48 + back yOffset(8) = 56`; the separate orb
`Y_PIC_OFFSET` remains 96. Independent receipts remain byte-identical (player
`9ed6c575…7f1`, opponent `2d5b4d2f…84a1`).

**Scope/siblings:** `MOVE_SUPERPOWER` remains unsupported with its distinct
METEOR/FLAT_ROCK/orb/rocks/fireball/BG-shake/four-sound body.
`MOVE_SHOCK_WAVE` remains unsupported with distinct ELECTRIC_ORBS/SPARK/
LIGHTNING and charging/bolt/lightning/shake/palette tasks. Neither has
independent dense acceptance. No battle logic/RNG/controller/facility state,
boundary list, unsupported barrier, or absolute-tick/input-delay/coordinate/
RGB/pixel exception changed.

## MOVE_TAIL_GLOW complete typed/hardware checkpoint; remains partial (2026-07-28)

**Verdict:** `MOVE_TAIL_GLOW` is partial. Fresh complete legal set-277
VOLBEAT/SHUCKLE Scene-ON evidence passes the entire **203/203** frame asset
load through unload envelope at frames **73-275** player-back and **77-279**
opponent-front through source/software, typed seam, registers, hardware
OAM/matrices/palette transfer, side-relative audio, and raw-RGB receipts,
twice fresh. Coverage is now **58 exact / 2 partial / 216 unsupported**.

**Reusable model/evidence:** the relative-age reducer ports BG
`simple_palette_blend` 0→4→0, attacker monbg, 12/8 alpha, the 18-frame
growth plus six pulse cycles of `gTailGlowOrbSpriteTemplate`, six
side-relative `SE_M_MORNING_SUN` restarts, and cleanup. Source extraction
byte-pins `ANIM_TAG_CIRCLE_OF_LIGHT` and the legal Factory carrier.
Independent outputs are byte-identical (player `9ed6c575…7f1`, opponent
`2d5b4d2f…84a1`).

**Exact remainder/siblings:** exact remains unclaimed because the shared
framebuffer compositor deliberately rejects TAIL GLOW; it still needs
VOLBEAT art, BG palette/monbg composition, affine-alpha circle painting,
field chrome/text, and **203/203** shared-framebuffer equality twice fresh in
both orientations. `MOVE_SUPERPOWER` stays unsupported with its distinct
METEOR/FLAT_ROCK/orb/rocks/fireball/BG-shake/four-sound body.
`MOVE_SHOCK_WAVE` stays unsupported with distinct ELECTRIC_ORBS/SPARK/
LIGHTNING and charging/bolt/lightning/shake/palette tasks. Neither has
independent dense acceptance. No battle logic/RNG/controller/facility state,
boundary list, unsupported barrier, or absolute-tick/input-delay/pixel
exception changed.

## MOVE_TWINEEDLE promoted exact; NEEDLE framebuffer closed (2026-07-28)

**Verdict:** `MOVE_TWINEEDLE` is exact. Fresh complete legal Factory-party
Scene-ON evidence passes the complete move-owned body and cleanup at **37/37**
frames **95-131** player-back and **37/37** frames **99-135** opponent-front
through software/component, typed-seam, hardware-transfer, audio, register,
raw-RGB, and shared-framebuffer checks, reproduced twice fresh. Coverage is now
**58 exact / 1 partial / 217 unsupported**.

**Reusable model/evidence:** the relative-age reducer ports two parallel
linear stingers, opponent-side inversion, two animation-3 IMPACT sprites,
`AnimTask_ShakeMon2(target,2,0,5,1)`, monbg/12:8 alpha, both looped sound
families, and cleanup. Source extraction byte-pins NEEDLE, both template
contracts, and legal set-154 BEEDRILL art. Independent evidence is
byte-identical (player `eb52b2a8…6ec1`, opponent `b7022f73…5771`).

**Renderer/siblings:** the narrow compositor ports prior-software OAM/palette
transfer, target monbg, opaque rotated needles, alpha IMPACT, chrome, and
side-specific battler/stinger subpriority. `MOVE_PIN_MISSILE` stays unsupported
because it uses three arcing missile waves, basic hitsplats, and distinct short
shakes/audio. `MOVE_SPIKE_CANNON` stays unsupported because it adds wind-up/
return tasks, three attacker-relative stingers, three simultaneous hitsplats,
and a distinct longer shake/audio body. Neither has independent dense
acceptance. No battle logic/RNG/controller/facility state, boundary list,
unsupported barrier, or absolute-tick/input-delay/pixel exception changed.

## MOVE_BITE promoted exact; SHARP_TEETH framebuffer closed (2026-07-28)

**Verdict:** `MOVE_BITE` is exact. Fresh complete legal Factory-party
Scene-ON evidence passes the complete move-owned body and cleanup at **26/26**
frames **80-105** player-back and **26/26** frames **84-109** opponent-front.
Coverage is now **57 exact / 1 partial / 218 unsupported**.

**Renderer/evidence:** source extraction byte-pins the literal SHARP_TEETH
sheet, palette, and OAM contract plus the legal set-56 MEOWTH carrier sheets;
the narrow shared compositor reuses IMPACT, ONIX, healthbox, window, and chrome
assets. The portable proof pins software state, prior-software-to-hardware
OAM/matrix/palette transfer, registers, side-relative audio, raw RGB, shared
framebuffer equality, and cleanup twice fresh in both orientations. Independent
outputs are byte-identical (player `008f491d…fa6`, opponent
`309e54ed…e52`).

**Scope/controls:** `MOVE_CRUNCH` remains unsupported because it adds BG_DARK
fade/restore and a second distinct diagonal bite/shake pass.
`MOVE_SECRET_POWER` remains unsupported because the Factory building
environment dispatches to `Move_STRENGTH`; only its cave branch reaches
`Move_BITE`. Neither has independent dense acceptance. No battle
logic/RNG/controller/facility state, boundary list, unsupported barrier, or
absolute-tick/input-delay/pixel exception changed.

## MOVE_BITE promoted partial; SHARP_TEETH typed seam checkpoint (2026-07-28)

**Verdict:** `MOVE_BITE` is partial. Fresh complete legal Factory-party
Scene-ON evidence passes the complete **26/26** sharp-teeth-through-cleanup
component window at frames **80-105** player-back and **84-109**
opponent-front. Coverage is now **56 exact / 2 partial / 218 unsupported**.

**Reusable model/evidence:** the relative-age reducer and typed presentation
seam port both `gSharpTeethSpriteTemplate` affine programs, signed 8.8
translation, animation-2 IMPACT, `AnimTask_ShakeMon(target,0,4,7,1)`, monbg,
12/8 alpha, side-relative `SE_M_BITE`, and teardown. The fresh portable probe
passes both orientations; a second independent replay is byte-identical
(player `3ad220d1…5a59`, opponent `db087980…f12`).

**Exact remainder/siblings:** exact remains unclaimed until the shared
framebuffer path draws SHARP_TEETH and proves complete hardware
OAM/matrix/palette/register transfer, audio, raw RGB, and framebuffer equality
twice fresh. `MOVE_CRUNCH` stays unsupported because it adds BG_DARK
fade/restore and a second distinct diagonal bite/shake pass. `MOVE_SECRET_POWER`
stays unsupported because the Factory building environment dispatches to
`Move_STRENGTH`; only its cave branch reaches `Move_BITE`. Neither has its own
complete dense acceptance. No battle state, RNG/controller/facility logic,
boundary list, unsupported barrier, or absolute-tick branch changed.

## MOVE_FAINT_ATTACK promoted exact; audio/VBlank workload closes delayed control (2026-07-28)

**Verdict:** `MOVE_FAINT_ATTACK` is exact. Canonical opponent-front,
portable player-back, and the +30 delayed-control complete bodies each pass
**221/221** dense shared-framebuffer frames twice fresh. Coverage is now
**64 exact / 0 partial / 212 unsupported**.

**Scheduler/evidence:** the general production workload producer advances the
bootstrap-probed audio state (`gPcmDmaCounter=6`, seven-VBlank PCM period;
`c15=8`, 15-state CGB clock). It feeds ordered VBlank register-copy and
RunTasks work through the typed presentation seam. Fresh cycle evidence shows
canonical RunTasks at VCOUNT 3, queueing `BLDALPHA 0x0d03` behind displayed
`0x0e02`; the delayed PCM-refill/audio-work phase resumes at VCOUNT 224 and
writes hardware `0x0d03` immediately. The probe records source software
tasks, audio counters/channel flags, OAM/matrices/palettes/registers, and raw
RGB. Portable evidence remains byte-identical (`a96823883d3b02dd`).

**Scope:** no move-name, animation-age, input-delay, coordinate, RGB, pixel,
battle-number, turn-number, damage, RNG/controller/facility, canonical
boundary, unsupported barrier, or shared-core-interface exception changed.

## MOVE_FAINT_ATTACK typed workload seam checkpoint; remains partial (2026-07-28)

**Verdict:** `MOVE_FAINT_ATTACK` remains the sole partial. Canonical
opponent-front and portable player-back complete bodies are still **221/221**
exact; the portable body reproduced twice fresh with the same probe digest.
The +30 delayed full app control remains **220/221**, differing only at age
150 / frame 21006. Coverage remains **56 exact / 1 partial / 219
unsupported**.

**Reusable model/evidence:** `gpuRegisterQueue.ts` now accepts an ordered,
typed CPU workload for the interval between displayed samples. Its steps
carry only source operation (`CopyBufferedValuesToGpuRegs` or `RunTasks`),
VCOUNT, and already-derived GPU writes; there is no move, animation age,
input delay, absolute frame, or pixel input. `sceneOnPresentation.ts` carries
that interval and prior register state through the shared seam. Fresh
`faintAttackRegisterQueueEvidence.ts` runs the bounded mGBA probe through
`run-mgba-probe.py` and proves both actual intervals twice: canonical VCOUNT
3 queues `0x0d03` and samples `0x0e02`, while the overrun VCOUNT 224 writes
immediately and samples `0x0d03`.

**Exact remainder:** the ordinary battle presentation path does not yet have
a general source-workload scheduler that produces these display-interval
steps. Until it does, it cannot distinguish two logically identical
animation ages without an invalid delay/tick exception. Feed the typed seam
from such a general producer, require delayed **221/221**, then repeat both
complete bodies with component/register/raw-RGB/shared-framebuffer evidence
twice fresh. No boundary list, battle logic/RNG/controller/facility state, or
unsupported barrier changed.

## MOVE_SHADOW_PUNCH promoted exact; stale palette/OAM transfer closed (2026-07-27)

**Verdict:** `MOVE_SHADOW_PUNCH` is exact for both complete move-owned
Scene-ON bodies. Player-back HAUNTER -> opponent-front ONIX is **106/106**
(frames 85-190), and opponent-front HAUNTER -> player-back ONIX is
**105/105** (frames 89-193). Source/software, typed seam, registers, hardware
OAM/matrices/palettes, live audio, raw RGB, and shared framebuffer all match,
twice fresh in both orientations. Coverage is now **56 exact / 1 partial /
219 unsupported**.

**Player repair:** fresh `gMain.oamBuffer`, hardware OAM, matrix, palette, and
raw-RGB evidence found a vanilla palette-lifecycle quirk: the task copies the
attacker only into the allocated slot's faded row, then `BlendPalette` reads
the stale unfaded HP-bar row. The seam now also ports distinct clone creation
and retirement transfer epochs, ninth-clone slot ordering, priority-3
clone/BG2-monbg order, and the move's own 9/8 impact blend and anchors.

**Opponent proof/boundary:** independent evidence corrected HAUNTER's front
anchor to y=9, placed priority-2 clones over the BG1 monbg copy, pinned the
one-callback-shorter restore-BLDY hold, and extracted the 32x8 elevated-enemy
shadow that `SpriteCB_EnemyShadow` reveals after the script clears. The
generic result/message tails begin at player age 106 and opponent age 105,
after `gAnimScriptActive` and visual tasks are clear, so the fixtures stop at
the last clean move-owned frames. No battle logic, RNG, controller/facility
state, boundary list, unsupported barrier, or absolute-tick branch changed.

## MOVE_FAINT_ATTACK register-queue checkpoint; remains partial (2026-07-27)

**Verdict:** `MOVE_FAINT_ATTACK` remains partial. Canonical opponent-front
and portable player-back complete bodies remain **221/221** exact; the
portable orientation reproduced twice fresh with identical probe digest.
The required +30 delayed-control surface reproduced **220/221** twice fresh,
with only age 150 / frame 21006 differing by 789 pixels. Coverage remains
**55 exact / 2 partial / 219 unsupported**.

**Cycle/register evidence:** a new bounded mGBA probe single-steps both
accepted prefixes across ages 148-153 and reproduced byte-identically twice.
Canonical age 150 runs `AnimTask_AttackerFadeFromInvisible_Step` at VCOUNT 3:
`SetGpuReg` changes the software buffer `0x0e02→0x0d03`, queues offset
`0x52`, and leaves hardware at `0x0e02` through the displayed frame before
`CopyBufferedValuesToGpuRegs` transfers it at VCOUNT 166. The +30 run executes
the same task write between displayed frames at VCOUNT 224, so source
`SetGpuReg` writes hardware `0x0d03` immediately and the next compositor
sample exposes it. This distinguishes CPU task order, VBlank visibility, and
frame sampling; the earlier same-task-data observation was correct but too
coarse.

**Reusable checkpoint/remainder:** `gpuRegisterQueue.ts` now ports the general
source buffer, unique waiting-list, VBlank 161-225/forced-blank immediate
write, and VBlank drain rules with focused Tier-1 coverage. It is deliberately
not wired to FAINT ATTACK: the shared seam still needs a general CPU-work/
VCOUNT scheduler to determine whether `RunTasks` lands at VCOUNT 3 or 224.
Next, model that source scheduling boundary from per-frame work and feed its
phase into the register queue; then require delayed **221/221** and rerun both
orientations twice fresh. No absolute-tick, delay-specific, or pixel exception
was added.

## MOVE_DRAGON_RAGE promoted exact; composed-OAM creation boundary closed (2026-07-27)

**Verdict:** `MOVE_DRAGON_RAGE` is exact. Complete legal CHARMELEON/ONIX
Scene-ON windows match **150/150** frames 89-238 player-attacker and
**150/150** frames 93-242 opponent-attacker through source/software, typed
seam, hardware OAM/matrices/palettes/registers, live audio, raw RGB, and the
shared framebuffer in both orientations, reproduced twice fresh. Coverage is
now **55 exact / 2 partial / 219 unsupported**.

**Residual repair/evidence:** the lone player render-age-98 mismatch was a
display-transfer ordering gap. At RAM tick 186, target `AnimTask_ShakeMon`'s
absolute creation write replaces ONIX's settled `(x2=1,y2=0)` with `(0,3)`;
the strengthened `gMain.oamBuffer` probe sees composed OAM `(x=144,y=13)`
while the synchronously stepped live fields have already collapsed to
`(0,0)`. The seam now keeps live `targetOffset` distinct from
`displayedTargetOffset`, and the draw path consumes the composed value only
at that source boundary. The portable proof also corrects its typed
sheet-block comparison, pins prior-software-to-hardware OAM/matrix/palette
transfer, `DISPCNT`/zero blend state, both sound headers and side-specific
pans, raw-RGB digests, and every shared output frame.

**Orientations/controls/siblings:** opponent-attacker geometry was staged and
proved independently; its target-side `loopsewithpan` clamps the player pan
to **-63**, distinct from the player-attacker one-shot's **-64**.
`MOVE_DRAGON_BREATH` remains **85/85**, `MOVE_FLAMETHROWER` **126/126**,
`MOVE_BLAZE_KICK` **78/78**, and `MOVE_EMBER` **63/63** in both orientations
after the repair. `MOVE_FIRE_BLAST` and `MOVE_FIRE_SPIN` remain unsupported:
their audited templates/bodies are distinct and still lack complete dense
acceptance. No battle logic, RNG, controller, outcome, facility state,
boundary list, unsupported barrier, or canonical-recording import changed.

## MOVE_REFLECT promoted exact; blue-light-wall compositor closed (2026-07-27)

**Verdict:** `MOVE_REFLECT` is exact. The complete legal MINUN/SHUCKLE
Scene-ON envelopes match **208/208** frames 39-246 player-back and **211/211**
frames 39-249 opponent-front through source/software, typed seam, hardware
OAM/palette/register transfer, live audio, raw RGB, and the shared framebuffer
in both orientations, reproduced twice fresh. Coverage is now **54 exact / 3
partial / 219 unsupported**.

**Renderer/evidence:** the narrow compositor ports GreenLightWall with the
blue rotated OBJ palette, all three SPARKLE_4 lifecycles/cells and lower-OAM
overlap order, side-relative wall geometry, 0→13→0 alpha, opponent battler
BG-copy/OBJ visibility composition, one-display effect OAM/palette transfer,
field chrome, side-specific menu/used-move/result text, audio header/pan, and
clean teardown. The strengthened probe pins hardware OAM, hardware/faded/
unfaded palettes and tags, registers, raw-RGB digests, and every shared output
frame.

**Correction/controls/siblings:** dense framebuffer work caught that the
existing partial fixtures mislabeled species 354 as SHUPPET and carried
estimated 126-HP geometry; their typed contents now correctly describe the
actual legal **MINUN 167 HP / SHUCKLE 127 HP** parties and genders (legacy
filenames retained). Exact CHARM remains **93/93 body + 4/4 clear** in both
orientations twice fresh. Independent source audit keeps `MOVE_BRICK_BREAK`
unsupported because its normal and separate gBrickBreakWall/shard branches are
distinct, and `MOVE_CRUSH_CLAW` unsupported because it loads the tag but uses
lunge/shake/four claw slashes without instantiating the wall. No battle logic,
RNG, controller, outcome, facility state, boundary list, unsupported barrier,
or canonical-recording import changed.

## MOVE_REFLECT promoted partial; complete software/typed seam (2026-07-27)

**Verdict:** `MOVE_REFLECT` is partial. Legal complete-party SHUPPET/SHUCKLE
fixtures match the complete Scene-ON `currentMove=REFLECT` envelopes
**208/208** at frames 39-246 player-back and **211/211** at frames 39-249
opponent-front through the source-relative reducer and typed presentation
seam. Coverage is **53 exact / 4 partial / 219 unsupported**.

**Proof:** wall creation is relative age zero at oracle frame 72 player-back
and 76 opponent-front. Fresh local-mGBA evidence invoked only through
`tools/run-mgba-probe.py` proves the side-relative wall geometry, all three
SPARKLE_4 lifecycles/cells, allocator slot reuse, 16 palette rotations,
0→13→0 alpha, opponent visibility, sound-task lifetime, and clean wall and
blend teardown over every frame. Focused reducer, asset, seam, and boundary
tests pass.

**Exact remainder/siblings:** the shared framebuffer path intentionally
rejects REFLECT until a narrow compositor ports the one-display hardware OAM
and palette transfer, rotated BLUE_LIGHT_WALL OBJ palette, SPARKLE_4 painter
order, opponent battler BG/visibility composition, and field chrome/text.
Thus no framebuffer frame is claimed yet; exact requires complete raw-RGB
equality in both orientations twice fresh. `MOVE_BRICK_BREAK` and
`MOVE_CRUSH_CLAW` remain unsupported because their audited bodies are
independent. No damage, RNG, controller, outcome, facility state, boundary
ratchet, or unsupported-barrier change.

## BLUE_LIGHT_WALL / MOVE_REFLECT evidence-and-assets checkpoint (2026-07-27)

**Verdict:** Coverage stays **53 exact / 3 partial / 220 unsupported**.
`MOVE_REFLECT`, `MOVE_BRICK_BREAK`, and `MOVE_CRUSH_CLAW` remain unsupported;
this is source/hardware evidence and reproducible asset extraction only, not a
renderer or framebuffer acceptance claim.

**Evidence:** complete legal Level-50 parties constrain SHUPPET to REFLECT and
SHUCKLE to TACKLE in both orientations. Fresh Scene-ON mGBA probes capture
the full `currentMove=REFLECT` envelope at frames **39-246** player-back and
**39-249** opponent-front, including raw RGB, software allocator/task state,
template geometry/order, hardware OAM/matrices, palette tags/buffers, and
blend registers. The move-owned effect body starts with the wall at **72/75**,
then the three SPARKLE_4 sprites; source identifies alpha/audio lifecycle and
the `waitforvisualfinish`/`delay 1` cleanup boundary for the next renderer.

**Assets/siblings:** `extractReflectAssets.ts` byte-pins BLUE_LIGHT_WALL as
the GreenLightWall sheet with its blue palette, and SPARKLE_4 with its distinct
Sparkle3 palette. Brick Break's `choosetwoturnanim` has independently distinct
normal and gBrickBreakWall/shard shattered-wall bodies; Crush Claw merely loads
the wall and instead runs lunge/shake/four claw slashes. Focused tests pass;
no engine, state, controller, or boundary-ratchet changes.

## MOVE_ABSORB promoted exact; drain compositor closed (2026-07-27)

**Verdict:** `MOVE_ABSORB` is exact. Legal set-131 LOMBRE versus constrained
ONIX matches the complete move-owned frames **223-417 (195/195)** through the
source/software reducer, typed seam, hardware OAM/matrices/order, tagged
palette transfers, registers/monbg, live audio, raw RGB, and shared
framebuffer in both orientations, reproduced twice fresh. Coverage is now
**53 exact / 3 partial / 220 unsupported**.

**Renderer/evidence:** the narrow compositor reuses source-extracted LOMBRE,
ONIX, ORBS, IMPACT, and BLUE_STAR assets and ports the green hardware-bank
ramp, split priority/alpha, semi-transparent hitsplat and eight absorption
arcs, one-display effect and ShakeMon latches, HealingEffect stars, field
chrome, and teardown. The strengthened probe pins stock `sSpriteOrder`
transfer, affine matrices, palette tags/buffers, task counts, BG1/blend
registers, and all three sound intervals. Framebuffer evidence corrects the
player-back ONIX art corner to `(40,48)` and pins the legal in-window profiles
as LOMBRE **152/167 HP** and ONIX **110/110 HP**.

**Controls/scope:** RECOVER remains **169/169** and SYNTHESIS **130/130**
framebuffer-exact in both orientations after the change. MEGA_DRAIN,
DREAM_EATER, and GIGA_DRAIN remain unsupported with their audited distinct
orb counts/arguments, blend strengths, impact/background/fire bodies, and
audio. Full Tier-1 is green at **3762/3762** and the production build passes.
No boundary-list, unsupported-barrier, canonical-import, battle-state, RNG,
controller, outcome, or facility-state change.

## ABSORB presentation-assets checkpoint; remains partial (2026-07-27)

**State:** Coverage remains **52 exact / 4 partial / 220 unsupported**.
`MOVE_ABSORB` retains its complete **195/195** software/typed proof in both
orientations twice fresh; no renderer or framebuffer claim was added.

**Did:** source extraction now byte-pins legal set-131 LOMBRE back/front art
and the literal ORBS, IMPACT, and BLUE_STAR sheets. The three effect sheets
are byte-identical to the exact RECOVER/DYNAMIC_PUNCH source assets; exact
shared ONIX battle-mon art remains reused. The focused asset/boundary tests,
full **3761/3761** Tier-1 suite, and production build pass.

**Next:** refresh the stale shared Scene-ON oracle, then strengthen the probe
for hardware OAM/matrices/order, hardware and tagged palette transfers,
registers, live audio, raw RGB, and shared framebuffer. Port the narrow ABSORB
compositor and prove **195/195** in both orientations twice fresh; rerun exact
RECOVER and SYNTHESIS controls. Keep MEGA_DRAIN, DREAM_EATER, and GIGA_DRAIN
unsupported.

**Notes:** freshness validation correctly stopped new staging because ports
8012/8014 predate `5d97a57`; workers do not restart shared services. No
boundary-ratchet, unsupported-barrier, engine, battle-state, RNG, controller,
or canonical-import change.

## MOVE_ABSORB promoted partial; complete source/software/typed seam (2026-07-27)

**Verdict:** `MOVE_ABSORB` is partial. The legal set-131 LOMBRE Scene-ON
fixtures pass the complete move-owned source/software/typed window
**195/195** at oracle frames 223-417 in both orientations, twice fresh,
including the clear frame. Coverage is **52 exact / 4 partial / 220
unsupported**.

**Proof:** the relative reducer and expanded live probe cover the exact green
BG palette 0/2/4/2/0 ramp and restore, monbg/split priority/alpha lifecycle,
animation-2 hitsplat, ShakeMon latch, all eight literal target-to-attacker
absorption arcs, shared HealingEffect, three sound identities/restarts/pans,
allocator slots/order, and complete teardown. Side/source coordinates are
explicit typed inputs: player LOMBRE uses 72,96; opponent LOMBRE 176,49;
ONIX impact centers are 176,42 front and 72,88 back.

**Remainder/siblings:** exact still requires source presentation assets,
hardware OAM/palette transfer, raw RGB, and the shared framebuffer; no engine
file was touched. MEGA DRAIN, DREAM EATER, and GIGA DRAIN retain their audited
blend/orb/impact/background/fire/audio differences and remain unsupported.
RECOVER and SYNTHESIS remain exact shared-HealingEffect controls.

Living status for the Battle Scene ON lane. Source scope is generated in
`factory-animation-inventory.json`; the script dependency graph is generated
in `battle-animation-components.json`. Evidence, move acceptance, and
non-exclusive component tracks live in `ANIMATION_COVERAGE.json`. Run
`npm run animation:coverage` for the working view.

> **Layout (since 2026-07-26, PROGRESS entry 480):** animation-lane modules
> live in `src/animation/` and their tests in `tests/animation/` — no longer
> mixed into `src/engine/`. `tests/animation/animationBoundaryRatchet.test.ts`
> pins the import boundary (animation→engine: `battleMenu`/`bg`/`rng` only;
> engine→animation: `battleScene.ts`+`core.ts` only; kernel/AI imports
> forbidden). Comparators stay in `tools/compare/`. Path citations in this
> file and the coverage JSON are updated; `ANIMATION_PROGRESS-archive.md`
> keeps historical `src/engine/` paths as written.

## Priority and acceptance

1. Level 50 Factory: all **276** reachable, executable moves (`MOVE_NONE`
   empty slots are excluded).
2. Open Level additions: **1** move (`OUTRAGE`), plus a geometry audit of
   **8** exclusive species across **32** sets and **37** overlapping moves.
   Overlapping moves retain Level 50 evidence unless that audit finds a real
   variant dependency.
3. The **77** remaining Emerald moves, after Factory coverage.

Moves remain the acceptance unit. Components—scripts, assets, sprites, tasks,
and visual commands—are the implementation unit. A track may overlap other
tracks; FIRE PUNCH can belong to both punch and fire work. Prove a component
with one representative, batch-check siblings, and keep separate move-level
oracle evidence. Do not build one absolute-tick timeline per move.

Move acceptance covers the move-owned animation body and its evidence-required
geometry variants. Generic hit reactions, HP/result presentation, statuses,
held-item use, and controller/menu handoffs are reusable presentation
components with independent coverage; they neither block nor promote a move
animation. A status caused by a move is not part of that move's animation.

- `staged`: a deterministic matching ON-oracle/app case exists.
- `partial`: a meaningful dense window is green, but portability or a required
  variant remains.
- `exact`: the complete dense animation window is green through the shared
  presentation seam and all source- or evidence-required variants are covered.
- No entry means unsupported.

## MOVE_SCARY_FACE promoted exact; complete hardware/pixel closure (2026-07-27)

**Verdict:** `MOVE_SCARY_FACE` is exact. Legal set-133 RHYHORN versus
constrained SHUCKLE matches the complete move-owned windows **190/190** at
79-268 player-back and 83-272 opponent-front through source/software,
typed-seam, hardware OAM/palettes/registers, live audio, raw RGB, and the
shared framebuffer, reproduced twice fresh in both orientations with no body
exclusions. Coverage is **52 exact / 3 partial / 221 unsupported**.

**Renderer/evidence:** the narrow compositor uses the extracted RHYHORN,
SHUCKLE, Scary Face BG/tilemaps, and EYE_SPARKLE assets. It ports the split
hardware palette-transfer cadence, BG1 alpha/register lifecycle, one-display
eye OAM and two-display battler-task latches, source painter order, field
chrome/healthboxes/text, all three live sound intervals, and complete teardown.
The fixture HP profiles now reflect the complete legal parties actually staged
by the ROM (RHYHORN 187, SHUCKLE 127), replacing the partial-era estimates.

**Controls/scope:** CHARM remains **93/93 + 4/4 cleanup** and SPARK
**115/115 + 2/2 cleanup** exact in both orientations twice fresh. The stock
shared-`gBattleAnimArgs` overwrite remains pinned: literal offset1/pattern0 is
executed as runtime offset3/pattern1. GLARE, THUNDER, and TRI ATTACK remain
unsupported pending their own complete evidence. Generic speed-stat
presentation remains outside the move-owned boundary. No boundary-ratchet,
unsupported-barrier, canonical-import, battle-state, RNG, or controller change.

## SCARY_FACE presentation-assets checkpoint; remains partial (2026-07-27)

**State:** Coverage remains **51 exact / 4 partial / 221 unsupported**.
`MOVE_SCARY_FACE` still has its complete **190/190** software/typed proof in
both orientations; the session wound down at the next independently green
checkpoint before any renderer claim.

**Did:** merged `master` through `d0c04f8`, then landed `d9e447c`. The new
source extractor and byte-for-byte test pin legal set-133 RHYHORN back/front
art, the Scary Face BG image and both side tilemaps, and EYE_SPARKLE; exact
SHUCKLE art remains reused. Supervisor verification passed **3754/3754**
tests with the role variable removed for the launcher-profile test, the
production build, and an independent extractor/cmp run.

**Next:** add the narrow Scary Face compositor and extend its portable proof
to hardware OAM/palette/register transfer, live audio, raw RGB, and shared
framebuffer **190/190** in both orientations twice fresh. Keep GLARE, THUNDER,
and TRI ATTACK unsupported until each has complete dense evidence.

**Notes:** no renderer, engine wiring, coverage status, boundary ratchet, or
main-program file changed in this increment. No animation deferral is open.
**For the main program:** the new launcher-profile test inherits
`POKEBENCH_ROLE=supervisor|worker` and makes raw in-session `npm test` fail
four probes with exit 3; `env -u POKEBENCH_ROLE npm test` is fully green.
The freshness checker also resolves a nested animation worktree's run root as
the harness root; the actual Scene-ON service was current against
`POKEBENCH_HARNESS_ROOT`.

## MOVE_SCARY_FACE promoted partial; complete software/typed seam (2026-07-27)

**Verdict:** `MOVE_SCARY_FACE` is partial. Legal set-133 RHYHORN versus
constrained SHUCKLE passes the complete move-owned source/software/typed seam
**190/190** in both orientations, twice fresh, with no excluded body frames
and a clean boundary before generic speed-stat presentation. Coverage is
**51 exact / 4 partial / 221 unsupported**.

**Proof:** the reducer and fresh mGBA probe cover both invisible palette
controllers; side-selected BG1 tilemap/image/palette identity and the complete
`AnimTask_ScaryFace` 0→14→0 schedule; both side-mirrored EyeSparkle sprites
and all 0/4/8/4/0 cells; all three source audio restart boundaries; target
offsets; software task/sprite state; teardown; and the typed Scene-ON seam.
A real stock-ROM quirk is now explicit: the script literal is
`ShakeTargetInPattern(20,1,FALSE,pattern0)`, but the task rereads shared
`gBattleAnimArgs` after the following palette command overwrites it, so legal
execution uses offset 3/pattern1. Both the literal and every observed runtime
offset are pinned. GLARE, THUNDER, and TRI ATTACK remain unsupported.

**Exact remainder:** hardware OAM/palette/register transfer, live audio state,
raw RGB, and shared-framebuffer equality. No renderer or engine file was
touched.

## MOVE_CHARM promoted exact; magenta-heart compositor closed (2026-07-27)

**Verdict:** `MOVE_CHARM` is exact. Complete legal Scene-ON parties retain the
real challenge-0 Level-50 set-187 MINUN carrier against slower constrained
SHUCKLE. Both orientations match **93/93** complete move-owned source,
typed-seam, software/hardware-OAM, matrix, palette, audio, raw-RGB, and shared
framebuffer frames twice fresh, with no excluded body frames.

**Renderer/boundary:** the narrow compositor reuses exact SPARK MINUN/SHUCKLE
field assets and generated MAGENTA_HEART art. It ports the source ordering and
the observed split display latch (effect OAM one frame; battler task two),
affine pivot, all three hearts, field/chrome/text, and complete task/OAM/
palette/audio teardown. Four clear frames are proved after the 93-frame body;
the later generic stat-stage task begins only afterward and remains excluded.
SPARK stays exact at **115/115 + 2/2 cleanup** in both orientations twice fresh.

**Scope/siblings:** COVET retains its target ShakeMon2/Dizzy Punch remainder;
FAKE TEARS and TICKLE retain different task arguments and distinct bodies.
None is promoted. Coverage is **51 exact / 3 partial / 222 unsupported**.

## MOVE_SPARK promoted exact; shared framebuffer closed (2026-07-27)

**Verdict:** `MOVE_SPARK` is exact. Both legal set-187 MINUN orientations
match **115/115** complete source-component, typed-seam, raw-RGB, and shared
framebuffer body frames plus **2/2** cleanup frames, reproduced twice fresh.
The narrow renderer reuses the literal source-tagged ENCORE MINUN,
SELF_DESTRUCT SHUCKLE, generated SPARK_2, and DYNAMIC PUNCH IMPACT art; it
ports source OAM ordering/matrices/flips, explicit allocator tie state, the
one-display palette/effect transfer, HorizontalLunge, animation-2 impact,
source ShakeMon display latch, field/chrome/text, and ages 115-116 teardown.

**Controls/scope:** ENCORE remains **215/215** and DYNAMIC PUNCH **75/75**
component plus framebuffer exact in both orientations. The optional full
BOUNCE paralysis-window comparator is not a usable exact control at current
branch baseline (**87/450**, failures begin before its status component);
the SPARK change leaves `statusAnimation.ts` byte-untouched and its focused
tests green. THUNDERBOLT, THUNDER_WAVE, ZAP CANNON, and THUNDER SHOCK remain
unsupported. Coverage is now **50 exact / 3 partial / 223 unsupported**.

## MOVE_SPARK promoted partial; complete source body closed (2026-07-27)

**Verdict:** `MOVE_SPARK` is partial. The legal set-187 MINUN fixtures match
the complete move-owned source windows **115/115** at 79-193 player-back and
83-197 opponent-front, twice fresh, with no excluded frames, plus the minimal
cleanup tail at ages 115-116 **2/2 twice in both orientations**. The relative
reducer and typed `sceneOnPresentation` seam cover literal creation identity,
slot, creation order, subpriority, tile/priority, affine/hidden/flip state and
matrix for all six affine sparks, eight flashing sprites, the invisible
HorizontalLunge controller, impact, and all eight ElectricityEffect sprites.
The comparator also pins the three exact BG/attacker palette ramps and resets,
the exact target 0→6→0 ramp against unfaded/faded/hardware buffers, five full
sound restart/continuity/stop intervals and pans, battler offsets, registers,
one-display hardware OAM order/matrices from reducer-derived prior state, and
asset/task/OAM teardown. The earlier tautological wait claim is removed.
Coverage is now **49/276 exact, 4 partial, 223 unsupported**.

**Remainder:** no render assets or draw case were added and `battleScene.ts`
is untouched. Source-derived MINUN/SHUCKLE/SPARK_2/IMPACT assets, live
composition through the existing renderer, and **115/115 raw-RGB/framebuffer
equality in both orientations twice fresh** remain before exact. THUNDERBOLT,
THUNDER_WAVE, ZAP_CANNON, and THUNDER_SHOCK remain unsupported.

**Repair note:** the opponent-front fixture begins the flashing group with two
extra source callbacks, one initial affine-slot advance, and persistent
same-Y slot ordering. Those are explicit fixture/runtime scheduler/allocation
inputs, not a MINUN or attacker-side rule. The cleanup probe proves age 114's
last hardware arc, age 115's zero effect OAM/tasks/offsets with palettes still
owned, and age 116's palette-tag release; later generic result audio is outside
the tail.

## MOVE_SPARK staging checkpoint; remains unsupported (2026-07-27)

**Verdict:** `MOVE_SPARK` remains unsupported. Both complete legal
Battle-Scene-ON `mechanicLab` parties stage the real challenge-0 Level-50
`FRONTIER_MON_MINUN_1` set **187** (species 354, Docile, HP/Defense EVs,
Salac Berry, source Spark/Charm/Encore/Helping Hand); the active carrier has
four legal SPARK choices and slower SHUCKLE has four TACKLE choices. The
fresh mGBA probe, run through `tools/run-mgba-probe.py`, reaches current move
209 in both orientations: player-back MINUN current-move window **39-263
(225 frames)** / visual body **79-193**, opponent-front MINUN **39-363
(325)** / visual body **83-197**. Both outcomes are status-free. These are
candidate dense windows only—there is no reducer, typed seam, source asset,
OAM/register/audio comparator, renderer, or pixel claim.

**Source boundary/inventory:** `src/battle_factory.c`'s Level-50 challenge-0
range is 110-199; `battle_frontier_mons.h` set 187 is MINUN with SPARK;
`data/battle_anim_scripts.s:1945-1989` owns three attacker color
palette-cycle legs plus their three reset commands, six
`gSparkElectricitySpriteTemplate` particles, eight flashing electricity
sprites, HorizontalLunge, target hit-splat/ShakeMon, three attacker-pan
Thunderbolt2 events, target Hyper Beam, wait gates, and the post-impact
eight-sprite `ElectricityEffect` / target-pan Thunderbolt2
(`:10137`). `src/battle_anim_electric.c:119-220,515-677` defines the affine
spark, flashing/tile-cycle, target electricity callbacks and their
side-relative X/X2/picture-offset-Y geometry. Future evidence must port all
palette, movement/shake, flashing, sound, wait, geometry, lifetime and
teardown details in both orientations; THUNDERBOLT, THUNDER_WAVE, ZAP_CANNON,
and THUNDER_SHOCK remain independently unsupported.

**Evidence:** committed scenarios, semantic mGBA probe, and no-pixel
staging comparator are `mechanic-spark-*.json`, `sparkProbe.py`,
`sparkEvidence.ts`, and `fixtures/spark-*.json`. `ANIM_TAG_SPARK_2` is now a
non-exclusive component track, but no move coverage was promoted. Existing
exact controls and renderer code were untouched.

## Current resumable state (2026-07-27)

Coverage is **49/276 exact, 3 partial, 224 unsupported**. TAUNT is exact at
**125/125 player-back + 125/125 opponent-front** complete source-component,
typed-seam, software/hardware-OAM, affine-matrix, palette/register/audio,
raw-RGB, and shared-seam framebuffer frames, reproduced twice fresh.

## TAUNT promoted exact; thought-bubble/finger display path closed (2026-07-27)

**Verdict:** `MOVE_TAUNT` is exact. Legal set-184 MURKROW fixtures remain
unchanged in both orientations against constrained SHUCKLE. Complete windows
76-200 player-back and 80-204 opponent-front match **125/125** source,
typed-seam, hardware-transfer/matrix/palette/register/audio, raw-RGB, and
framebuffer frames twice fresh.

**Renderer/evidence:** MURKROW back/front plus THOUGHT_BUBBLE/FINGER_2 art and
palettes regenerate byte-for-byte; the literal existing ANGER asset alone is
reused. The narrow battleScene case ports one-display transfer, runtime
subpriority/Y/slot painter order, field chrome/healthboxes/text, and teardown.
The comparator now pins raw-RGB digests, software slots/subpriorities, reverse
hardware-OAM order, hardware affine matrices, and palette-tag lifetime.

**Controls/scope:** RAZOR LEAF remains **139/139** and SWAGGER **161/161**
source-component plus framebuffer exact in both orientations. No absolute
ticks, screenshots, canonical imports, unsupported barriers, state changes,
or boundary widening were added.

## TAUNT source/hardware body closed; framebuffer remainder bounded (2026-07-27)

**Verdict:** `MOVE_TAUNT` is partial. Complete legal Scene-ON parties retain
the real Level-50 set-184 MURKROW carrier in both orientations against slower
constrained SHUCKLE. Complete move-owned windows 76-200 player-back and
80-204 opponent-front match **125/125** source-component plus typed-seam
frames twice fresh, including final software destruction, one-display
hardware OAM, and cleared teardown.

**Source reducer/evidence:** the relative reducer ports
`gThoughtBubbleSpriteTemplate`'s forward/45-frame hold/reverse program,
`gTauntFingerSpriteTemplate`'s side-selected point/wag/lifetime, both literal
target-relative `gAngerMarkSpriteTemplate` argv programs, wait/delay
sequencing, SE_M_METRONOME, both looped SE_M_TAIL_WHIP restarts, both
SE_M_SWAGGER2 restarts/pans, software OAM, affine matrices, hardware OAM,
OBJ palettes, zero blend registers, and teardown. Swagger code is reused
only for the literal anger template semantics; TAUNT acceptance is independent.

**Precise remainder:** raw RGB is **0/125 unattempted**. Reproducibly extract
MURKROW back/front plus THOUGHT_BUBBLE/FINGER_2 art and palettes (ANGER may
reuse its already-extracted literal asset), then add only a narrow TAUNT draw
case in `src/engine/battleScene.ts` for source OAM order, one-display transfer,
field chrome/healthboxes/text, and teardown; require 125/125 both orientations
twice. This worker did not touch `battleScene.ts`. RAZOR LEAF remains 139/139
component + framebuffer exact in both orientations as the fresh control. No
absolute ticks, screenshots, canonical imports, unsupported barriers, battle
state changes, or boundary widening were added.

## TAUNT source-evidence checkpoint; remains unsupported (2026-07-27)

**Verdict:** `MOVE_TAUNT` remains unsupported. Complete legal Scene-ON
mechanicLab parties now stage the real Level-50 set-184 MURKROW carrier
(Quirky; SpDef/Defense/HP EV spread; Lax Incense) against slower constrained
SHUCKLE in both player-back and opponent-front orientations. Schedule IDs
184-189 are valid in the source Level-50 range, all active MURKROW choices
are TAUNT, and both validated runs reach `currentMove: 269` with the complete
party builder enabled.

**Source boundary:** `Move_TAUNT` owns THOUGHT_BUBBLE (45-frame hold then
reverse), FINGER_2's side-dependent animation/lifetime, two target-relative
ANGER instances, Metronome/Tail Whip/Swagger2 sound boundaries, delays and
waits. The existing SWAGGER anger reducer can be reused only for the literal
ANGER template and target argv semantics; it cannot establish the new bubble
or finger body. No reducer, typed seam, probe/comparator, assets, renderer,
or raw-RGB claim is present; the exact dense window remains deliberately
unmeasured. RAZOR LEAF stays **139/139** in both orientations as the required
typed/renderer control.

## RAZOR LEAF promoted exact; leaf/cutter display path closed (2026-07-27)

**Verdict:** `MOVE_RAZOR_LEAF` is exact. Legal challenge-0 parties retain real
set-165 WEEPINBELL in both orientations with every active choice constrained
to RAZOR LEAF and slower SHUCKLE constrained to TACKLE. Complete oracle
windows 91-229 player-back and 95-233 opponent-front match **139/139**
component, typed-seam, hardware-transfer, and raw-RGB frames twice fresh.

**Renderer/evidence:** WEEPINBELL back/front plus LEAF/RAZOR_LEAF art and
palettes regenerate byte-for-byte. The narrow battleScene case ports the
one-display effect OAM latch, target ShakeMon2 latch, source subpriority/Y
ordering including stable exact-Y slot ties, absent-partner singles monbg
no-op, alpha 12/8 register lifetime, field chrome, and cleanup.

**Controls/scope:** DYNAMIC PUNCH remains **75/75**, EXPLOSION **212/212**,
and SELF DESTRUCT **113/113** component plus framebuffer exact in both
orientations. SECRET POWER, MAGICAL LEAF, LEAF BLADE, and TWISTER remain
unsupported. No absolute ticks, screenshots, canonical imports, unsupported
barriers, controller/state changes, or boundary widening were added.

## RAZOR LEAF source-component body closed; framebuffer remainder bounded (2026-07-27)

**Verdict:** `MOVE_RAZOR_LEAF` is partial. Corrected challenge-0 mechanicLab
parties use only legal set IDs 165-170 in the 110-199 source range. Species 70
WEEPINBELL is the real set-165 carrier in both orientations, all active choices
are RAZOR LEAF, and slower SHUCKLE is constrained to TACKLE. Complete windows
91-229 player-back and 95-233 opponent-front match **139/139** twice fresh.

**Source reducer/evidence:** all ten literal leaf callbacks, both
`gRazorLeafCutterSpriteTemplate` instances (including `target_both=TRUE`
singles behavior), target ShakeMon2 plus the immediately-aborted absent-partner
task, monbg/alpha, three sound programs, software/hardware OAM, palette and
register transfers, typed seam, and teardown are dense-equal. DYNAMIC PUNCH
remains **75/75 component + framebuffer** exact in both orientations.

**Precise remainder:** raw RGB is **0/139 unattempted**. Extract WEEPINBELL
back/front and LEAF/RAZOR_LEAF art/palettes reproducibly; wire only the
battleScene animation draw path; prove BG copy/alpha, source OAM ordering,
palette/register latches, field chrome, cleanup, and 139/139 raw RGB twice.
SECRET POWER, MAGICAL LEAF, LEAF BLADE, and TWISTER remain unsupported. No
`battleScene.ts` edit, absolute ticks, screenshots, canonical imports,
unsupported barriers, or boundary widening were added.

## Previous current state (2026-07-27)

Coverage was **47/276 exact, 3 partial, 226 unsupported**. DYNAMIC PUNCH was
exact through the shared Scene-ON seam at **75/75 player-back + 75/75
opponent-front** component, typed-seam, hardware-transfer, and raw-RGB frames,
reproduced twice fresh.

## DYNAMIC PUNCH promoted exact; monbg impact display path closed (2026-07-27)

**Verdict:** `MOVE_DYNAMIC_PUNCH` is exact. Legal mechanicLab parties stage
HITMONCHAN from real Level-50 Factory set 339 (species 107) in both
orientations, constrain all choices to DYNAMIC PUNCH, and use slower SHUCKLE
with TACKLE. Complete oracle frames 101-175 player-back and 105-179
opponent-front match **75/75** source components, typed seam, hardware OAM/
palette checks, and raw RGB, twice from fresh snapshots.

**Renderer/evidence:** HITMONCHAN back/front plus fist/hitsplat art is
reproducibly extracted and byte-for-byte tested. The narrow battleScene case
ports the one-display target offset and effect-OAM transfer, target monbg copy
as hitsplat alpha target-2, opaque fist/explosions, source explosion ordering,
field chrome, and cleanup. Fixture HP now records the source-true pre-damage
95/95 SHUCKLE display; damage remains outside this move-owned window.

**Commands/controls:** `node --experimental-strip-types
tools/compare/dynamicPunchPortable.ts <fixture>` → 75/75 component+seam and
75/75 framebuffer for both fixtures twice; `explosionPortable.ts` → 212/212
both orientations; `selfDestructPortable.ts` → 113/113 both orientations.
No absolute ticks, screenshots, coordinate/RGB fitting, canonical imports,
unsupported barriers, or boundary widening were added.

## Previous current state (2026-07-27)

Coverage was **46/276 exact, 4 partial, 226 unsupported**. DYNAMIC PUNCH was
partial at 75/75 source-component + typed-seam frames in both orientations,
with shared-seam raw RGB still unwired at 0/75.

## DYNAMIC PUNCH component body closed; framebuffer remainder bounded (2026-07-27)

**Verdict:** `MOVE_DYNAMIC_PUNCH` is partial. Legal mechanicLab parties stage
HITMONCHAN from real Level-50 Factory set 339 (Emerald source species constant
107) in both orientations, constrain all four choices to DYNAMIC PUNCH, and
use slower SHUCKLE with TACKLE. Dense component plus typed-seam evidence is
**75/75** at oracle 101-175 player-back and 105-179 opponent-front, twice fresh.

**Source reducer/evidence:** the independent reducer ports target monbg and
alpha 12/8, the fist duration/target picture-offset position, animation-0
hitsplat and affine identity, `ShakeMon(5,0,7,1)`, the five literal
target-relative explosion instances, `ShakeMon2(5,0,28,1)`, target-pan sound
boundaries, and teardown. Literal `gExplosionSpriteTemplate` identity reuses
the existing exact explosion reducer only where its argv/offset program agrees.
PRESENT was audited and remains unsupported: its moving bag and conditional
damage/heal branches require independent dense evidence.

**Precise remainder:** extract HITMONCHAN/fist/hitsplat art; wire only the
animation drawing path through battleScene; prove software/hardware OAM,
palette/matrix/register latches, audio, cleanup, and raw RGB at 75/75 in both
orientations twice. Until then framebuffer exact is **0/75**, not exact.
EXPLOSION remains **212/212** and SELF DESTRUCT **113/113** component plus
framebuffer exact in both orientations. No absolute ticks, screenshots,
coordinate/RGB fitting, canonical imports, unsupported barriers, or boundary
widening were added.

## Previous current state (2026-07-27)

Coverage is **46/276 exact, 3 partial, 227 unsupported**. EXPLOSION is exact
through the shared Scene-ON seam at **212/212 player-back + 212/212
opponent-front** complete-body component, typed relative-seam, and raw-RGB
framebuffer frames, reproduced twice fresh. SELF DESTRUCT remains **113/113**
and DRAGON BREATH **85/85** component + framebuffer exact in both orientations
as fresh explosion/OAM/ShakeMon2/palette regression controls.

## EXPLOSION promoted exact; legal set-495 fixture corrected (2026-07-27)

**Verdict:** `MOVE_EXPLOSION` is exact. Complete legal mechanicLab parties
stage GLALIE from real Level-50 Factory set 495 in both orientations, constrain
all active choices to EXPLOSION, and use slower SHUCKLE with TACKLE. The
strengthened comparator matches **212/212 component + typed seam + raw-RGB
framebuffer** frames at oracle 76-287 player-back and 80-291 opponent-front,
twice fresh.

**Renderer/evidence:** the prior files labeled GLALIE injected internal species
362 (DUSCLOPS); acceptance first corrected them to Emerald's source ID 347,
which also source-shifted kickoff two frames and supplied the real 155 HP and
back/front geometry. GLALIE art is reproducibly extracted; the renderer reuses
the proven explosion/SHUCKLE assets and ports all ten explosion sprites, both
visible battlers' ShakeMon2 latches, nine complex BG red/black alternations,
cleanup gap, white hold, 15→0 fade, source OAM ordering, chrome, and teardown.

**Controls/scope:** SELF DESTRUCT remains **113/113** and DRAGON BREATH
**85/85** component + framebuffer exact in both orientations on fresh runs.
PRESENT remains unsupported pending its moving bag and distinct damage/heal
branches; DYNAMIC PUNCH remains unsupported pending its monbg/alpha/fist/
hitsplat/ShakeMon prelude and target-pan explosion sequence. No absolute ticks,
screenshots, coordinate/RGB fitting, exclusions, unsupported barriers,
canonical imports, or boundary widening were added.

## SELF DESTRUCT promoted to exact; explosion sprite track established (2026-07-27)

**Verdict:** `MOVE_SELF_DESTRUCT` is exact. Complete legal mechanicLab parties
stage SUDOWOODO from real Level-50 Factory set 298 in both orientations,
constrain every active choice to SELF DESTRUCT, and use slower SHUCKLE with
TACKLE. The strengthened comparator matches the complete first move-owned body
at **113/113 player-back** (oracle 82-194) and **113/113 opponent-front**
(86-198), for both source components and the shared-seam raw-RGB framebuffer,
each reproduced twice fresh.

**Source reducer/renderer:** the existing reducer's ten explosion instances,
mirrored offsets, 4/5/5/5 cells, both visible battlers' ShakeMon2, attacker-only
red 0→9→0 palette ramps, ten sound restarts, and teardown now feed a typed
Scene-ON Self Destruct config/view. The compositor renders reproducibly
extracted SUDOWOODO, SHUCKLE, and explosion art with source palette ramps,
the one-display palette/explosion OAM latches, ShakeMon2's neutral first
hardware frame plus two-display latch, source `SortSprites` Y ordering,
audio-neutral field chrome, and complete cleanup.

**Controls/scope:** DRAGON BREATH remains **85/85 component + 85/85
framebuffer** in both orientations on fresh control runs. Damage resolution,
fainting, health-bar loss, controller, turn, RNG, and facility state remain
outside this move-owned body. EXPLOSION, PRESENT, DYNAMIC PUNCH, and all other
siblings remain unsupported. No absolute ticks, screenshots, canonical
imports, unsupported barriers, or boundary widening were added.

## Previous current state (2026-07-27)

Coverage was **44/276 exact, 4 partial, 228 unsupported**. SELF DESTRUCT was an
honest partial checkpoint: its complete first move-owned source-component body
matches the Scene-ON oracle at **113/113 player-back + 113/113 opponent-front**
frames, reproduced twice fresh, but it is not wired through the shared renderer
and has no framebuffer acceptance.

## SELF DESTRUCT source-component body closed; explosion track remains partial (2026-07-27)

**Verdict:** `MOVE_SELF_DESTRUCT` is partial. Complete legal mechanicLab parties
stage SUDOWOODO from the real Level-50 Factory set 298 in both orientations,
constrain every active choice to SELF DESTRUCT, and use slower SHUCKLE with
TACKLE. Dense oracle evidence matches **113/113** source-component frames at
oracle 82-194 player-back and 86-198 opponent-front, twice fresh.

**Source reducer/evidence:** `selfDestructAtAge` ports both literal
`SelfDestructExplode` calls (ten `gExplosionSpriteTemplate` instances), their
mirrored offsets and 4/5/5/5 display-cell program, both visible battlers'
38-toggle `AnimTask_ShakeMon2`, the duplicate forced-attacker task's identical
write, attacker-only red 0→9→0 palette ramps, all ten attacker-pan audio
restarts, and teardown. Assets for the explosion and both set-298 SUDOWOODO
orientations are reproducibly extracted.

**Precise remainder:** no `sceneOnPresentation`/`battleScene` wiring was landed,
so shared-seam raw-RGB framebuffer acceptance is **0/113 attempted**, not exact.
Port the source OAM/display latches and draw extracted SUDOWOODO, SHUCKLE, and
explosions, then require 113/113 in both orientations plus existing exact
ShakeMon2 and palette-blend framebuffer controls. EXPLOSION, PRESENT,
DYNAMIC PUNCH, and all other siblings remain unsupported. No absolute ticks,
screenshots, canonical imports, unsupported barriers, or boundary widening
were added.

## Previous current state (2026-07-27)

Coverage is **44/276 exact, 3 partial, 229 unsupported**. SWAGGER is exact
through the shared Scene-ON seam at **161/161 player-back + 161/161
opponent-front** complete-body component and framebuffer frames, reproduced
twice fresh. HYPER FANG remains **107/107** in both orientations as the
sprite/task regression control.

## SWAGGER promoted to exact; anger-mark component track established (2026-07-27)

**Verdict:** `MOVE_SWAGGER` is exact. Complete legal mechanicLab parties stage
RATTATA from real Level-50 Factory set 34 (Docile, Attack/HP, King's Rock) in
both orientations, constrain all four active choices to SWAGGER, and constrain
ONIX to TACKLE. The strengthened comparator matches the complete first
move-animation body at **161/161 player-back** (oracle 76-236) and **161/161
opponent-front** (80-240), each reproduced twice fresh.

**Source reducer/evidence:** `swaggerAtAge` ports GrowAndShrink's 12/24/12
attacker affine program, side/species Y anchoring and two-display hardware
transfer; the breath puff's four frames, player hFlip, signed fixed-point
translation, looping attacker-pan audio and terminal callback; and both
target-relative anger marks' mirrored geometry, affine-normal matrices,
allocation/OAM transfer latches, overlap, target-pan audio, and teardown.

**Renderer/controls:** breath, anger, and both set-34 RATTATA orientations are
reproducibly extracted. The shared seam renders the full body through relative
ages with raw-RGB exact field chrome and cleanup. HYPER FANG remains
**107/107** component and framebuffer exact in both orientations on fresh
control runs. FRUSTRATION, TORMENT, TAUNT, METRONOME, FAKE TEARS, and every
other sibling remain unsupported without independent dense acceptance. No
absolute ticks, screenshots, coordinate/RGB fitting, exclusions, unsupported
barriers, or import-boundary widening were added.

## Previous current state (2026-07-27)

Coverage was **43/276 exact, 3 partial, 230 unsupported**. HYPER FANG is exact
through the shared Scene-ON seam at **107/107 player-back + 107/107
opponent-front** complete-body component and framebuffer frames, reproduced
twice fresh. POISON FANG remains **104/104** in both orientations as the
source-identical fang regression control.

## HYPER FANG promoted to exact; contest/target-side selector track established (2026-07-27)

**Verdict:** `MOVE_HYPER_FANG` is exact. Complete legal mechanicLab parties
stage RATICATE from the real Level-50 Factory set 302 in both orientations,
constrain all four active choices to HYPER FANG, and constrain ONIX to TACKLE.
The strengthened comparator matches the complete first animation body at
**107/107 player-back** (oracle 82-188) and **107/107 opponent-front**
(86-192), each reproduced twice fresh.

**Source reducer/evidence:** battle execution honestly takes
`AnimTask_IsContest`'s false result. `AnimTask_IsTargetPlayerSide` is proven
through both results, selecting `BG_IMPACT_OPPONENT` and `BG_IMPACT_PLAYER`.
The reducer ports both hardware fade ramps and target-side tilemaps, reuses
Poison Fang's `gFangSpriteTemplate` only because the source identity is
literal, and independently pins Hyper Fang's `AnimTask_ShakeMon(0,10,10,1)`,
`SE_M_BITE`/`SE_M_LEER` target panning, restore, display latches, and teardown.

**Renderer/controls:** impact/RATICATE assets are reproducibly extracted and
the shared seam renders both target-relative backgrounds, fang, shake, field
chrome, raw RGB, and cleanup from relative animation age. POISON FANG remains
**104/104** component and framebuffer exact in both orientations. Contest
state was not fabricated. MEGA PUNCH, MEGA KICK, SOLAR BEAM, FOCUS PUNCH, and
all other selector siblings remain unsupported without independent complete
dense acceptance. No absolute ticks, screenshots, coordinate/RGB fitting,
unsupported barriers, or import-boundary widening were added.

## Previous current state (2026-07-27)

Coverage is **42/276 exact, 3 partial, 231 unsupported**. POISON TAIL is exact
through the shared Scene-ON seam at **187/187 player-back + 187/187
opponent-front** complete-body component and framebuffer frames, reproduced
twice fresh. HARDEN remains **101/101** and SLUDGE BOMB remains **160/160**
in both orientations as exact controls.

## POISON TAIL promoted to exact; permanent custom MetallicShine variant closed (2026-07-27)

**Verdict:** `MOVE_POISON_TAIL` is exact. Complete legal mechanicLab parties
stage SEVIPER from real Factory set 239 (Hardy, HP/ATK, Scope Lens), constrain
all four choices to POISON TAIL, and constrain ONIX to TACKLE in both
orientations. The strengthened comparator matches the complete first
move-animation body at **187/187 player-back** (oracle 226-412) and **187/187
opponent-front** (226-412), each reproduced twice fresh.

**Source reducer/evidence:** `poisonTailAtAge` composes the existing exact
MetallicShine, horizontal lunge, ShakeMon, impact, and PoisonBubblesEffect
machinery. Closure pinned the permanent RGB(24,6,23) attacker palette and
one-display hardware transfer, the three shine sweeps/mask/register teardown,
the mirrored lunge and target-relative player-back Y_PIC_OFFSET=88, and the
first bubble's two-display cleanup handoff before the remaining literal
122/132/140/148/156/164 spawn cadence. The shared bubble motion/OAM reducer
remains single-source rather than duplicated.

**Renderer/controls:** `sceneOnPresentation`/`battleScene` render the extracted
SEVIPER orientations, metal mask, impact, poison bubbles, field chrome, custom
palette, monbg/alpha latches, software/hardware OAM and affine transfers, all
SE1 restart boundaries, and final cleanup through the relative seam. HARDEN
is still **101/101** and SLUDGE BOMB **160/160** in both orientations. No
absolute ticks, screenshots, coordinate/RGB fitting, exclusions, unsupported
barriers, import-boundary widening, or sibling promotions were added.

## Previous current state (2026-07-27)

Coverage is **41/276 exact, 3 partial, 232 unsupported**. SLUDGE BOMB is exact
through the shared Scene-ON seam at **160/160 player-back + 160/160
opponent-front** component and framebuffer frames, reproduced twice fresh.
SLUDGE and TOXIC remain exact controls in both orientations. POISON TAIL
remains unsupported.

## SLUDGE BOMB promoted to exact; delayed sludge-hit track closed (2026-07-27)

**Verdict:** `MOVE_SLUDGE_BOMB` is exact. Complete legal Scene-ON mechanicLab
parties use WEEPINBELL, the real Level-50 Factory set-270 carrier, in both
required orientations with all four choices constrained to SLUDGE BOMB and
ONIX constrained to TACKLE. The strengthened comparator matches the complete
first move-animation script body at **160/160 player-back** (oracle 85-244)
and **160/160 opponent-front** (89-248), each reproduced twice fresh.

**Source reducer/evidence:** all ten calls reuse SLUDGE's exact
`gSludgeProjectileSpriteTemplate` reducer at their five-display-frame cadence.
The move-specific reducer ports `AnimTask_ShakeMon2(3,0,15,1)`, the delay-1
target blend cycle, three batches containing all twelve literal
`gSludgeBombHitParticleSpriteTemplate` fixed-point bodies, `waitsound`, and
the final shared `PoisonBubblesEffect`. Dense evidence checks tasks, software
and hardware OAM, affine allocation/transfer latches, palettes, all ten
`SE_M_BUBBLE3`, three `SE_M_DIG`, and six `SE_M_TOXIC` pan/restart boundaries,
cleanup, raw RGB, and the shared-seam framebuffer.

**Renderer/assets/controls:** poison-bubble art and both set-270 WEEPINBELL
orientations are reproducibly extracted. `sceneOnPresentation`/`battleScene`
render the complete body and source hardware latches through relative ages.
SLUDGE remains **102/102** and TOXIC **219/219** in both orientations. No
absolute ticks, screenshots, coordinate/RGB fitting, exclusions, unsupported
barriers, or import-boundary widening were added. POISON TAIL remains
unsupported; no sibling was promoted.

## Previous current state (2026-07-27)

Coverage was **40/276 exact, 3 partial, 233 unsupported**. TOXIC is exact
through the shared Scene-ON seam at strengthened **219/219 player-back +
219/219 opponent-front** component and framebuffer frames, reproduced twice
fresh. SLUDGE BOMB and POISON TAIL remain unsupported.

## TOXIC promoted to exact; ToxicBubbles joins poison track (2026-07-27)

**Verdict:** `MOVE_TOXIC` is exact. Complete legal Scene-ON mechanicLab
parties use CLAMPERL, the real Level-50 Factory set-134 carrier, in both
required orientations with all four choices constrained to TOXIC and ONIX
constrained to TACKLE. The strengthened comparator matches the complete first
move-animation script body at **219/219 player-back** (oracle 219-437) and
**219/219 opponent-front** (219-437), each reproduced twice fresh.

**Source reducer/evidence:** both literal four-sprite `ToxicBubbles` calls use
their source 17-display-frame cadence, mirrored target geometry, four-frame
20-callback animation, OAM slot reuse, `AnimSpriteOnMonPos` lifetime, and
eight `SE_M_TOXIC` target-pan restarts. After the source wait and delay, the
final six sprites reuse SLUDGE's exact `PoisonBubblesEffect` reducer unchanged,
including affine terminal clamp and its six additional sound restarts. Dense
evidence checks callbacks, software and hardware OAM, one-frame affine matrix
latches, audio, cleanup, raw RGB, and the shared-seam framebuffer.

**Renderer/assets/controls:** Toxic/poison bubble art and both CLAMPERL
orientations are reproducibly extracted. `sceneOnPresentation`/`battleScene`
render the complete body and cleanup through relative ages. SLUDGE remains
**102/102** and POISON FANG **104/104** in both orientations as exact controls.
No absolute ticks, screenshots, coordinate/RGB fitting, exclusions, new
unsupported barriers, or import-boundary widening were added. SLUDGE BOMB and
POISON TAIL remain unsupported; no sibling was promoted.

## POISON FANG promoted to exact; fang contact joins poison track (2026-07-27)

**Verdict:** `MOVE_POISON_FANG` is exact. Complete legal Scene-ON mechanicLab
parties use ZUBAT, the real Level-50 Factory set-25 carrier, in both required
orientations with all four choices constrained to POISON FANG and ONIX
constrained to TACKLE. The strengthened comparator matches the complete first
move-animation script body at **104/104 player-back** (oracle 83-186) and
**104/104 opponent-front** (87-190), each reproduced twice fresh.

**Source reducer/evidence:** the reducer ports `gFangSpriteTemplate`'s complete
four-frame animation and eight-callback affine-double shrink, target
`AnimTask_ShakeMon(3,0,10,1)` including its script-created first display
latch, the delay-0 four-leg RGB(26,0,26) target palette cycle, and all six
already-proven `PoisonBubblesEffect` spawns. Dense evidence checks sprite
templates, OAM slots and affine matrices, task argv/lifetimes, faded and
hardware palette latches, raw RGB, `SE_M_BITE`, and all six `SE_M_TOXIC`
target-pan restarts.

**Renderer/assets/controls:** fang, poison-bubble, and both ZUBAT orientations
are reproducibly extracted. `sceneOnPresentation`/`battleScene` render the
complete body and cleanup through relative ages. SLUDGE remains **102/102**
and ACID **131/131** in both orientations as exact controls. No absolute
ticks, screenshots, coordinate/RGB fitting, exclusions, new unsupported
barriers, or import-boundary widening were added. TOXIC, SLUDGE BOMB, and
POISON TAIL remain unsupported; no sibling was promoted.

## SLUDGE promoted to exact; PoisonBubblesEffect established (2026-07-27)

**Verdict:** `MOVE_SLUDGE` is exact. Complete legal Scene-ON mechanicLab
parties use GRIMER, the real Level-50 Factory set-110 carrier, in both required
orientations with all four choices constrained to SLUDGE and ONIX constrained
to TACKLE. The strengthened comparator matches the complete sprite/task body
and shared-seam raw-RGB framebuffer at **102/102 player-back** (oracle
218-319) and **102/102 opponent-front** (230-331), each reproduced twice
fresh, including faded/hardware target palette latches and all seven source
sound boundaries.

**Source reducer/evidence:** the reducer ports
`gSludgeProjectileSpriteTemplate`'s 40-callback mirrored horizontal arc,
animation/frame/OAM and looping affine program; target
`AnimTask_ShakeMon(3,0,5,1)` including the animation-script task's extra
same-frame display step; the delay-1 two-leg target blend task shape; and all
six literal `PoisonBubblesEffect` spawns with side-relative x offsets,
eight-frame displayed cadence, rising/sway callbacks, affine terminal clamp,
OAM low-slot reuse, and cleanup. The live comparator caught signed GBA sine
rounding and opponent-side offset mirroring rather than fitting either. The
closure pass additionally pinned the script-created ShakeMon initializer's
first hardware latch and `SortSprites`' side-relative projectile/attacker
overlap order.

The comparator also proves every source-derived coefficient of the complete
RGB(30,0,31) target palette cycle and the hardware palette's one-frame-behind
transfer latch in both orientations. `SE_M_BUBBLE3` attacker-pan plus every
six-frame-script/eight-display-frame `SE_M_TOXIC` restart prove their song
headers, restart flags, and side-relative pan latches.

**Renderer/evidence closure:** poison-bubble projectile/bubble art and both
GRIMER orientations are reproducibly extracted. `sceneOnPresentation` and
`battleScene` render the projectile, target shake and hardware-latched palette
cycle, all six affine bubbles in source OAM order, field/text/healthboxes, and
cleanup. SING remains **245/245 player-back + 248/248 opponent-front** and
ACID remains **131/131** in both orientations as exact controls. No absolute
ticks, screenshots, coordinate/RGB fitting, exclusions, unsupported barriers,
or import-boundary widening were added.

**Sibling audit (all unsupported):** TOXIC still needs its separate toxic
asset and two four-sprite waves; SLUDGE BOMB needs ten projectile calls,
twelve distinct hit particles, its longer ShakeMon2, palette body and
waitsound; POISON FANG needs fang art/sprites, contact shake and four-leg
delay-0 palette cycle; POISON TAIL needs metallic shine, lunge/hitsplat,
shake, alpha/monbg teardown. Shared PoisonBubblesEffect coverage does not
promote any sibling.

## SING promoted to exact; ANIM_TAG_MUSIC_NOTES track established (2026-07-27)

**Verdict:** `MOVE_SING` is exact. Complete legal Scene-ON
mechanicLab parties stage AZURILL from real Factory set 1 in both player-back
and opponent-front orientations, with all four active choices constrained to
SING and ONIX constrained to TACKLE. The strengthened portable comparator
matches the complete first move-animation script block at **245/245
player-back** (oracle 213-457; notes 220-362) and **248/248 opponent-front**
(oracle 215-462; notes 222-367), each reproduced twice fresh, for component
state, affine hardware OAM/matrices, palette latches/allocation, monbg
visibility/cleanup, raw RGB, and the shared-seam framebuffer.

**Source reducer:** all twelve `gWavyMusicNotesSpriteTemplate` spawn ages,
animation indices/vFlip, signed fixed-point paths, sine y2 values, four
cycling rainbow palette indices, repeating affine scale program, and
side-relative `panse` task boundaries are ported and Tier-1 pinned. No absolute
battle ticks, screenshots, coordinate/RGB fitting, exclusions, comparator
weakening, engine imports, or unsupported barriers were added.

**Renderer/evidence closure:** MUSIC_NOTES art, all four source rainbow
palettes, and both AZURILL orientations are reproducibly extracted. The
reducer ports reciprocal affine hardware matrices and side-dependent monbg
cleanup ages. Note composition reuses the shared persistent `sSpriteOrder`
scheduler with the same live-probed allocation seed in both orientations;
this closed the final exact-y overlaps without coordinate or RGB fitting.
`sceneOnPresentation`/`battleScene` render the full body through relative
ages and shared field/OBJ mechanisms. ENCORE and BIND remain exact controls.

**Sibling audit (all unsupported):** BELLY DRUM has six alternating purple-hand
hits, six ShakeMon tasks, six slow flying-note arcs and attacker-pan sounds;
TEETER DANCE has its movement task, five fast flying-note paths/sounds and
DUCK asset; FAKE TEARS has a distinct SMALL_BUBBLES blend,
RockMonBackAndForth, looped tail-whip audio and eight thought-bubble/music-note
tear sprites; GRASS WHISTLE fixes all twelve notes to palette index 1/no
cycling and wraps them in whole-BG green blend/restore with its own pan sweep.
None has independent complete dense evidence, so none is promoted.

## DRAGON CLAW promoted to exact; PlaySE1WithPanning track established (2026-07-27)

**Verdict:** `MOVE_DRAGON_CLAW` is exact through the shared Scene-ON seam in
both required orientations, each reproduced twice. Player-back and
opponent-front ALTARIA are each **137/137 strengthened component and
framebuffer frames** (oracle 82-218 and 86-222). Census: **35/276 exact,
3 partial, 238 unsupported**.

**Source/probe:** legal challenge-0 mechanicLab contexts use complete parties
around real Level-50 Factory `FRONTIER_MON_ALTARIA_1` set 412 and constrain
stock choices without transient state. Supervisor-requested evidence now
checks the target `gSpriteCoordOffsetY`, both forward/reverse palette-task
boundaries and coefficients, faded plus hardware attacker palettes, transient
SE1 song/pan restarts, sprite callbacks/lifetimes, and allocation uniqueness
in addition to the existing FireSpin/claw/attacker reducer. That stronger pass
found and fixed the reverse task's true age-93 start and the target shake's
local-age-10 restore.

**Renderer:** `battleScene.ts` now draws the extracted ALTARIA/Onix field,
hardware-latched attacker palette, task-driven ShakeMon plus both lunge phases,
all FireSpin and claw sprites, target global-Y shake, text/healthboxes, and
cleanup. Effect composition ports `SortSprites`: equal-priority sprites order
by final OAM Y (including y2), then source creation order. No absolute battle
ticks, screenshots, exclusions, or new unsupported barriers were added.

**Sibling audit (no promotions):** SKY ATTACK retains both two-turn
charge/strike branches and sky/bird/fade/impact body; RETURN retains every
friendship-power branch and its dips/lunges/hitsplats/shakes; FLATTER retains
spotlight/hardware fades, dips, 38 confetti sprites, and attacker/target sound
events; LUSTER PURGE retains psychic/white BG transitions, circle/particle
blends, six RNG hitsplats/sounds, target shake, and restore; COSMIC POWER
retains non-attacker blends, cosmic BG slide/restore, two granting stars, and
distinct centered/attacker-pan sounds. All remain unsupported.

**Controls:** AERIAL ACE remains **232/232** player-back and **236/236**
opponent-front, KNOCK OFF **59/59** in both orientations, and BIND **45/45**
in both orientations, all framebuffer-exact.

## ENCORE promoted to exact; GBA OBJ-window compositor established (2026-07-27)

**Verdict:** `MOVE_ENCORE` is exact for the complete move-owned Scene-ON body
in both player-back and opponent-front MINUN orientations. Each is **215/215
strengthened component and framebuffer frames**, reproduced twice. Coverage is
**36/276 exact, 3 partial, 237 unsupported**.

**Source/probe:** complete legal mechanicLab parties use the real challenge-0
Level-50 carrier `FRONTIER_MON_MINUN_1` set 187 (species 354, Docile, HP/DEF
EVs, Salac Berry, SPARK/CHARM/ENCORE/HELPING HAND) and stage a real preceding
move before legally selecting ENCORE. The reducer ports Create/RemoveSpotlight,
both HardwarePaletteFade directions, spotlight affine/sweep, four clapping-hand
sprites, the immediate `SE_M_ENCORE2` PlaySE2WithPanning event at relative age
60 with target pan (+63 player attacker / -63 opponent attacker), the signed
SwayMon body, window/register lifetimes, and teardown. Independent live probes
reproduce the component result. The comparator now additionally checks every
hand's x/y/x2/y2, facing matrix and clap counter; the spotlight's software
position plus hardware OAM affine-double position, matrix number, full signed
PA/PB/PC/PD matrix and one-frame x2 display latch; and WIN0/register latches.
The strengthened comparator also checks the source SwayMon terminal x2 reset,
which distinguishes the opponent-front target's idle one-pixel x2 from the
post-animation zero latch.

**Renderer:** the reusable compositor evaluates OAM in ascending index order
per scanline, charges source-derived regular/affine-double fetch costs against
the GBA OBJ cycle budget, retains the budget-exhausting object, and arbitrates
normal and OBJ-window candidates independently before applying priority/OAM
order. The ENCORE seam supplies healthboxes, battlers, clapping hands, and the
affine-double spotlight in their probed OAM slots, then applies WIN1/OBJWIN
color-effect masks. Focused Tier-1 tests pin ordering, transparent texels,
budget exhaustion, and normal/OBJ-window arbitration. No coordinate fitting,
exclusions, comparator weakening, screenshots, or absolute-tick branches were
introduced.

**Sibling audit/controls:** SKY ATTACK uses `SE_M_SKY_UPPERCUT` at attacker
pan; SUPERPOWER uses `SE_M_EARTHQUAKE` at center; FLATTER shares
`SE_M_ENCORE2` at target pan but has a distinct flatter spotlight/confetti
body; RETURN conditionally schedules repeated `SE_M_TAIL_WHIP` attacker-pan
tasks across power branches; COSMIC POWER uses `SE_M_COSMIC_POWER` centered
and retains its cosmic BG/palette/star body. None is promoted. SHADOW BALL
remains **148/148**, HARDEN **101/101**, and BIND **45/45** in both
orientations.

## SHADOW BALL promoted to exact; LoopSEAdjustPanning track established (2026-07-27)

**Verdict:** `MOVE_SHADOW_BALL` is exact through the shared Scene-ON seam in
both required orientations, each reproduced twice. Player-back and opponent-
front SABLEYE are each **148/148 task/sprite/OAM/matrix/register/palette/raw-
RGB and framebuffer frames** (oracle 256-403 and 260-407). Census: **34/276
exact, 3 partial, 239 unsupported**.

**Source/probe:** complete legal mechanicLab parties stage SABLEYE, the real
Level-50 Factory set-268 carrier, with SHADOW BALL and TACKLE legally
constrained. The reducer ports the BG_GHOST fade/wait/restore pipeline, the
complete five-play/pan LoopSEAdjustPanning schedule, ANIM_TAG_SHADOW_BALL,
gShadowBallSpriteTemplate's continuous affine rotation, all three 16/16/8
AnimShadowBall fixed-point phases, impact boundary, target
AnimTask_ShakeMon2(4,0,8,1), side-specific launch OAM order, and cleanup.

**Sibling audit (no promotions):** ICE BEAM retains its crystal stream,
palette bodies, target shake, ice finale, and alpha/monbg lifecycle; PSYBEAM
retains psychic BG, eleven ring groups, SwayMon, and target palette cycle;
AURORA BEAM retains aurora BG, rotating palette, forty rings, two shakes, and
arg-7 gate; HYPER BEAM retains blackout, attacker/target shakes, flashing
orb palette, 25 orb groups, and target blends; PSYWAVE retains psychic BG,
sine timer, twelve rings, and target palette cycle; TRI ATTACK retains its
triangle, blackout, fire, lightning/inversion, ice, and patterned-shake
bodies. Their distinct sound argv schedules are recorded in
`ANIMATION_COVERAGE.json`; all remain unsupported without independent
complete dense move evidence.

**Evidence/controls:** legal fixtures, reproducible extractor, dense probe,
portable comparator, and focused Tier-1 tests are committed. Acceptance is
**148/148 ×2 in both orientations**. After the final renderer change CALM
MIND remains **101/101**, HARDEN **101/101**, and BIND **45/45**, each in
both orientations. The animation import boundary did not widen.

Start with one representative attacker/target. Add variants only when source
inspection or comparison identifies a dependency: attacker side, front/back
orientation, battler dimensions or anchors, palette/silhouette, transformed or
substitute state, multi-turn/multi-hit state, or another explicit script input.
Every status needs a committed ON-profile trace; `exact` cannot retain a known
remainder.
