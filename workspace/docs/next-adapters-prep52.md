# S10A prep52 — sprite ALLOCATOR tail after prep50: every remaining body / status invalidator audited

Evidence only (side lane, new files only). Question: after prep50's status set landed (`8e72343a7`), which units still leave the
production allocator host unknown, are they net-zero, and what does clearing them buy? Measured with a TEMPORARY production patch
(kept as `.diff`, reverted before every commit). Master `f038cc861` (production src tree `dae0a8b9`).

## Results

**Census delta, seeds 0..299 (300 battles, 7970 paired commands, same seeds and driver without / with the patch): +60 commands /
+6012 frames, 0 live → fallback regressions, 0 pairing mismatches, battle digest identical (`069618f1…`, the same digest as
prep50's). The chain predictor ("live iff chain ⊆ cleared set") predicted exactly 60 / 6012.**

| src | live by count | live by frames | allocator-unknown declines |
|---|---|---|---|
| master `f038cc861` | 7445 / 7970 = **93.41 %** | 1106914 / 1168196 = **94.75 %** | 89 cmds / 9153 frames |
| + prep52 patch (`fixtures/prep52/prep52-temp-src.diff`) | **7505 = 94.17 % (+60)** | **1112926 = 95.27 % (+6012)** | 29 / 3141 (−66 %) |

After the patch the allocator residual is **entirely order-host scope**. Every one of the 29 remaining declines has the chain
`command party-summary + command switch-in` (one adds a recall / switch-out). In each case the post-KO send-out failed to reseed
because the ORDER host had no EXACT plan (section "Residual"). No body or status unit remains in any allocator chain.

### (1) Ranking on master (`fixtures/prep52/chains-before-seeds0-299.json`, `census-before-seeds0-299.json`)

89 declines / 9153 frames. Chain lengths: 1:44, 2:35, 3:6, 4:2, 7:1, 8:1. Greedy chain-clearing order (cumulative unlock), with
each step's verdict from section (2):

| step | unit | cum. cmds | cum. frames | verdict |
|---:|---|---:|---:|---|
| 1 | body FUTURE SIGHT (248) | 8 | 608 | NET-ZERO (setup body by move id + hit `General_FutureSightHit` by label) |
| 2 | body SEISMIC TOSS (69) | 11 | 930 | NET-ZERO |
| 3 | body ICE BALL (301) | 14 | 1227 | NET-ZERO (17 rolling bodies) |
| 4 | status animation FRZ | 16 | 1473 | NET-ZERO (`Status_Freeze`) |
| 5 | body PURSUIT (228) | 18 | 1719 | NET-ZERO |
| 6 | body PERISH SONG (195) | 20 | 1965 | NET-ZERO |
| 7-30 | LEAF BLADE, ICE PUNCH, FRUSTRATION, FORESIGHT, SWAGGER, MINIMIZE, FAKE OUT, MEGA DRAIN, BIND, RAPID SPIN, RECYCLE, AURORA BEAM, SOLARBEAM, SUNNY DAY, DREAM EATER, SPARK, ROLLOUT, DEFENSE CURL, THUNDER, FIRE BLAST, DOUBLESLAP, ABSORB, MEGAHORN, FIRE PUNCH | 53 | 5309 | all NET-ZERO |
| 31-32 | command switch-in, command party-summary (order host) | 75 | 7718 | out of scope (order host) |
| 33+ | TAUNT, SHOCK WAVE, SWALLOW, STOCKPILE, METRONOME, RAZOR WIND, INGRAIN, WILL-O-WISP, GUST, TRANSFORM, MACH PUNCH, EXTREMESPEED, OUTRAGE | 84+ | 8711+ | all NET-ZERO; these gain only together with the order host |

INFATUATION, CURSED, NIGHTMARE and WRAPPED have **0 involvement** in the seeds 0..299 chains. The first three were audited for
completeness (NET-ZERO). WRAPPED is unreachable: `InitAndLaunchChosenStatusAnimation` (`src/battle_gfx_sfx_util.c:449-450`)
carries the source comment "this animation doesn't actually exist", and no battle script emits `status2animation` with
STATUS2_WRAPPED. The only status2animation sites are CONFUSION, INFATUATION, NIGHTMARE and CURSED (`data/battle_scripts_1.s`
:3791-3860, :3933, :4194). WRAPPED stays out of the set.

By *first* invalidating unit: `command party-summary` 21 / 2321, FUTURE SIGHT 9 / 696, then units of ≤ 4 commands each.

### (2) Per-unit verdicts (`fixtures/prep52/net-zero-audit.json`)

**All 47 audited units are NET-ZERO:**
- 42 move bodies keyed by move id (`sAnimMoveIndex == id`)
- the Future Sight hit, keyed by the `General_FutureSightHit` label
- FRZ, INFATUATION, CURSED and NIGHTMARE, keyed by the status script label

There are 150 scenarios, each run twice in fresh direct-mGBA processes; all 150 pairs are byte-identical. A second independent
`prep52Run.sh` probe pass (300 more runs) reproduced `net-zero-audit.json` and `general-animation-scan.json` byte-identically.

The verdict rule (`prep52Extract.py`) is the `docs/allocator-net-zero-audit.md` definition, applied per body:
- baseline (occupied OBJ slots at activation−1) == end (first inactive frame);
- created == destroyed inside the window (a same-slot template / callback change counts as destroy + create);
- every occupied-set change in the 8 frames after cleanup is owned by the NEXT action.

Late changes have only two owners, both seen in the receipt:
- the healthbox hit effect `sInvisibleSpriteTemplate` + `SpriteCB_HitAnimHealthoxEffect`, which `Cmd_hitanimation` creates after a
  damaging body;
- the next animation script's own start.

No body has an unowned late change. Per unit, at least one complete body per side starts from the known entry
`[0,1,2,6,8,60,61,62,63]`. **No KNOWN-DELTA or NOT-NET-ZERO unit was found**, so no "known delta" host rule is needed.

| unit | key | complete bodies (known entry ply / opp) | created / body | late changes | scenarios (A == B) | census involvement / solo |
|---|---|---|---|---|---|---|
| FUTURE SIGHT | 248 | 4 (2 / 2) | 0 | none | fs-ply, fs-ply-snorlax, fs-opp, fs-opp-golbat | 11 / 860, solo 8 / 608 |
| FUTURE SIGHT hit | General_FutureSightHit | 4 (2 / 2) | 0 | healthbox hit effect | fs-ply, fs-ply-snorlax, fs-opp, fs-opp-golbat | - |
| SEISMIC TOSS | 69 | 4 (2 / 2) | 18 | healthbox hit effect | seismic-toss-ply, seismic-toss-opp, st-ply-golbat, st-opp-pgolem | 3 / 322, solo 3 / 322 |
| ICE BALL | 301 | 17 (8 / 9) | 8, 10, 12, 13 | healthbox hit effect | ice-ball-ply, ice-ball-opp, ib-ply-glalie, ib-opp-glalie | 3 / 297, solo 3 / 297 |
| FRZ | Status_Freeze | 14 (8 / 6) | 1 | none | frz-ply-shuckle, frz-opp-shuckle, frz-ply-snorlax, frz-opp-snorlax | 4 / 448, solo 2 / 246 |
| PURSUIT | 228 | 4 (2 / 2) | 2 | healthbox hit effect | pursuit-ply, pursuit-opp, pu-ply-umbreon, pu-opp-umbreon | 2 / 246, solo 2 / 246 |
| PERISH SONG | 195 | 3 (2 / 1) | 51 | none | perish-song-ply, perish-song-opp, ps-ply-golem | 2 / 246, solo 2 / 246 |
| LEAF BLADE | 348 | 3 (2 / 1) | 47 | healthbox hit effect | leaf-blade-ply, leaf-blade-opp, lb-ply-ninetales | 2 / 246, solo 2 / 246 |
| ICE PUNCH | 8 | 3 (1 / 2) | 36 | healthbox hit effect | ip-ply-golbat, ip-opp-pgolem, ip-opp-pidgeot | 2 / 246, solo 1 / 123 |
| FRUSTRATION | 218 | 3 (2 / 1) | 16 | healthbox hit effect | frustration-ply, frustration-opp, fr-ply-golem | 2 / 246, solo 2 / 246 |
| FORESIGHT | 193 | 3 (2 / 1) | 1 | none | foresight-ply, foresight-opp, fo-ply-hitmonlee | 2 / 246, solo 2 / 246 |
| SWAGGER | 207 | 3 (2 / 1) | 6 | none | sw-ply, sw-opp, sw-ply-snorlax | 2 / 199, solo 2 / 199 |
| MINIMIZE | 107 | 3 (2 / 1) | 9 | next animation script | minimize-ply, minimize-opp, mi-ply-snorlax | 4 / 328, solo 2 / 176 |
| FAKE OUT | 252 | 3 (2 / 1) | 1 | healthbox hit effect | fake-out-ply, fake-out-opp, fo2-ply-snorlax | 2 / 155, solo 2 / 155 |
| MEGA DRAIN | 72 | 3 (2 / 1) | 24 | healthbox hit effect | mega-drain-ply, mega-drain-opp, md-ply-golbat | 3 / 369, solo 1 / 123 |
| BIND | 20 | 4 (2 / 2) | 0 | healthbox hit effect | bind-ply, bind-opp, bi-ply-murkrow, bi-opp-murkrow | 2 / 246, solo 1 / 123 |
| RAPID SPIN | 229 | 3 (2 / 1) | 3 | healthbox hit effect | rapid-spin-ply, rapid-spin-opp, rs-ply-starmie | 2 / 246, solo 1 / 123 |
| RECYCLE | 278 | 2 (1 / 1) | 1 | none | rc-ply, rc-opp | 1 / 123, solo 0 / 0 |
| AURORA BEAM | 62 | 3 (2 / 1) | 40 | healthbox hit effect | aurora-beam-ply, aurora-beam-opp, ab-ply-golbat | 1 / 123, solo 1 / 123 |
| SOLARBEAM | 76 | 6 (4 / 2) | 28, 57 | healthbox hit effect | sb-ply, sb-opp, sb-ply-snorlax | 2 / 176, solo 0 / 0 |
| SUNNY DAY | 241 | 3 (2 / 1) | 8 | none | sunny-day-ply, sunny-day-opp, sd-ply-golbat | 1 / 88, solo 0 / 0 |
| DREAM EATER | 138 | 3 (2 / 1) | 28 | healthbox hit effect | dream-eater-ply, dream-eater-opp, de-ply-golbat | 1 / 88, solo 1 / 88 |
| SPARK | 209 | 3 (2 / 1) | 36, 37 | healthbox hit effect | spark-ply, spark-opp, sp-ply-snorlax | 2 / 174, solo 1 / 86 |
| ROLLOUT | 205 | 5 (4 / 1) | 12 | healthbox hit effect | rollout-ply, rollout-opp, ro-ply-wailmer | 3 / 240, solo 0 / 0 |
| DEFENSE CURL | 111 | 3 (2 / 1) | 1 | next animation script | defense-curl-ply, defense-curl-opp, dc-ply-golbat | 4 / 304, solo 0 / 0 |
| THUNDER | 87 | 3 (2 / 1) | 14 | healthbox hit effect | th-ply, th-opp, th-ply-snorlax | 1 / 86, solo 1 / 86 |
| FIRE BLAST | 126 | 4 (2 / 2) | 135 | healthbox hit effect | fire-blast-ply, fb-ply-golbat, fb-opp-murkrow, fb-opp-eevee | 1 / 86, solo 1 / 86 |
| DOUBLESLAP | 3 | 9 (6 / 3) | 2 | healthbox hit effect | double-slap-ply, double-slap-opp, ds-ply-golbat | 1 / 86, solo 1 / 86 |
| ABSORB | 71 | 3 (2 / 1) | 16 | healthbox hit effect | absorb-ply, absorb-opp, as-ply-golbat | 1 / 86, solo 1 / 86 |
| MEGAHORN | 224 | 3 (2 / 1) | 12 | healthbox hit effect | megahorn-ply, megahorn-opp, mh-ply-heracross | 1 / 79, solo 1 / 79 |
| FIRE PUNCH | 7 | 3 (2 / 1) | 26 | healthbox hit effect | fp-ply, fp-opp, fp-ply-11 | 1 / 79, solo 0 / 0 |
| STOCKPILE | 254 | 6 (2 / 4) | 33 | none | sk-ply, sk-opp, sk-opp-delcatty, sk-ply-swalot | 3 / 369, solo 0 / 0 |
| SWALLOW | 256 | 4 (2 / 1) | 9, 19 | none | sk-ply, sk-opp, sw3-ply, sw3-opp | 3 / 369, solo 0 / 0 |
| TAUNT | 269 | 3 (2 / 1) | 11 | none | taunt-ply, taunt-opp, ta-ply-snorlax | 3 / 369, solo 0 / 0 |
| METRONOME | 118 | 3 (2 / 1) | 8 | none | metronome-ply, metronome-opp, me-ply-golbat | 4 / 310, solo 0 / 0 |
| INGRAIN | 275 | 3 (2 / 1) | 7 | none | ingrain-ply, ingrain-opp, ig-ply-golbat | 2 / 176, solo 0 / 0 |
| RAZOR WIND | 13 | 6 (4 / 2) | 6 | healthbox hit effect | razor-wind-ply, razor-wind-opp, rw-ply-absol | 2 / 158, solo 0 / 0 |
| GUST | 16 | 3 (2 / 1) | 3 | healthbox hit effect | gu-ply, gu-opp, gu-ply-eevee | 2 / 152, solo 0 / 0 |
| TRANSFORM | 144 | 3 (2 / 1) | 0 | none | tf-ply, tf-opp, tf-ply-eevee | 2 / 152, solo 0 / 0 |
| MACH PUNCH | 183 | 3 (2 / 1) | 12 | healthbox hit effect | mach-punch-ply, mach-punch-opp, mp-ply-breloom | 1 / 88, solo 0 / 0 |
| SHOCK WAVE | 351 | 3 (2 / 1) | 91, 113, 114 | healthbox hit effect | shock-wave-ply, shock-wave-opp, sh-ply-manectric | 1 / 88, solo 0 / 0 |
| WILL-O-WISP | 261 | 3 (2 / 1) | 14 | next animation script | will-o-wisp-ply, will-o-wisp-opp, wo-ply-banette | 1 / 88, solo 0 / 0 |
| EXTREMESPEED | 245 | 3 (1 / 2) | 30 | healthbox hit effect | es-ply, es-opp, es-opp-smeargle | 1 / 79, solo 0 / 0 |
| OUTRAGE | 200 | 4 (3 / 1) | 46 | healthbox hit effect | outrage-ply, outrage-opp, ou-ply-flygon | 1 / 79, solo 0 / 0 |
| INFATUATION | Status_Infatuation | 8 (4 / 4) | 3 | none | in-ply, in-opp, in-ply-snorlax, in-opp-snorlax | - |
| CURSED | Status_Curse | 4 (2 / 2) | 2 | none | cu-ply, cu-opp, cu-ply-gengar, cu-opp-gengar | - |
| NIGHTMARE | Status_Nightmare | 6 (2 / 4) | 2 | none | nm-ply, nm-opp, nm-ply-gengar, nm-opp-haunter | - |

Scenario provenance (`prep52Probe.py` `UNITS`). Rows use existing accepted Scene ON battle-lab scenarios. A few are variants
written to `<out>/scenarios/`:
- `turns N`: N more FIGHT turns using prep45's TURN segment.
- target species swapped to Snorlax 143 or Golbat 42 in `overrides.parties`.
- `moves side id`: the lead gets four copies of the move. Used for Swagger, Gust and Transform (no Scene ON scenario exists), and
  for the second species of Bind and Fire Blast.
- `seed N`: a battle-lab seed at which the 10 % freeze lands (FRZ only).

Recorded exclusions:
- the two accepted opponent-orientation Fire Blast scenarios run no animation script within their 934 frames (empty rows in the
  receipt). The opponent side is covered by the `moves` variants instead.
- ROLLOUT, METRONOME and others have more player than opponent bodies. Every unit has ≥ 1 known-entry body per side.

ROM / source evidence for the keys:
- **Future Sight is two different scripts.** The production move-animation command 248 is the SETUP body, 114 frames: every 248
  record in the census jsonl is `frames 114`. The delayed hit is `BattleScript_MonTookFutureAttack` →
  `playanimation BS_ATTACKER, B_ANIM_FUTURE_SIGHT_HIT` (`data/battle_scripts_1.s:3519`). That goes through
  `LaunchBattleAnimation(gBattleAnims_General, tableId, FALSE)` (`src/battle_gfx_sfx_util.c:485`), which sets
  `sAnimMoveIndex = 0` (`src/battle_anim.c:231`). The script is `General_FutureSightHit` (`data/battle_anim_scripts.s:10581`, ELF
  0x082d83bf). It has no `createsprite`: 0 sprites created in all 4 bodies; it uses only monbg, ShakeMon, ScaleMonAndRestore and
  the psychic BG.
  - In production the hit is a `general-animation` event `FUTURE_SIGHT_HIT` (`battleScriptStatbuffchangeOpcode.ts:228`). The
    allocator host never consumes that event (below).
  - So prep44's caveat ("only the setup body was measured") is now closed: 248's id keys only the setup body (net-zero in
    prep44 and here), and the hit is net-zero by its own label.
  - The same 4 scenarios carry both bodies: Kadabra on both sides, with Onix / Snorlax and Onix / Golbat targets.
- **FRZ** = `Status_Freeze` (`battle_anim_scripts.s:10274`, ELF 0x082d7e39): `loadspritegfx ANIM_TAG_ICE_CUBE`, monbg,
  `AnimTask_FrozenIceCube`, which creates exactly 1 sprite and destroys it. 14 bodies cover both the inflict path
  (`statusanimation BS_EFFECT_BATTLER`) and the "is frozen" path (`statusanimation BS_ATTACKER`), on both sides, with Shuckle and
  Snorlax frozen.
- **INFATUATION** = `Status_Infatuation` (:10248, 0x082d7dbe): 3 created / 3 destroyed per body. Onix and Snorlax are infatuated
  (Eevee's Attract, both sides).
- **CURSED** = `Status_Curse` (:10285, 0x082d7e54): 2 / 2. Magikarp and Golem are cursed (ghost Curse by Haunter / Gengar, both
  sides).
- **NIGHTMARE** = `Status_Nightmare` (:10295, 0x082d7e79): 2 / 2. Shuckle, Golbat and Snorlax have nightmares (Haunter / Gengar,
  both sides).
- Production's names come from `spriteOrderStatusAnimationName` (`src/engine/spriteOrderEventTransform.ts:217-232`), which
  mirrors `InitAndLaunchChosenStatusAnimation`.

### General animations: a production assumption, partly evidenced here (`fixtures/prep52/general-animation-scan.json`)

The production allocator host (`factoryRoundBattleOrchestrator.ts` `prepareResolutionPalette` :2318-2425) is invalidated only by:
- move bodies outside the plans / net-zero list;
- ball, summary, slide and recall commands;
- status animations outside the audited set.

It is NOT invalidated by `general-animation`, `hit-animation` or `stat-animation` events, so production treats those as
allocator-transparent. `docs/allocator-net-zero-audit.md` ("Status/stat/switch/summary/ball animations are separate paths and still
invalidate") predates that, and no receipt covers it.

`prep52GeneralScan.py` tallies every non-move script that appeared incidentally in the 150 probe scenarios. All are net-zero:
- `General_FutureSightHit`: 4
- `General_HeldItemEffect`: 16, plus 1 incomplete
- `General_IngrainHeal`: 3
- `General_StatsChange`: 12
- sun continues (`General_Sun` → `goto Move_SUNNY_DAY`): 3
- the Bind / Wrap turn trap (`General_TurnTrap` → `Status_BindWrap`): 4

Never seen, so still an **unevidenced production assumption**: RAIN_CONTINUES, SANDSTORM / HAIL_CONTINUES, LEECH_SEED_DRAIN,
FOCUS_BAND, ITEM_KNOCKOFF, WISH_HEAL, SUBSTITUTE_FADE, and the Fire Spin / Whirlpool / Sand Tomb / Clamp turn traps. Auditing
them takes the same probe and a `turns` / `extend` scenario per general animation. The census cannot measure this gap, because
production never declines on these events.

### (3) Patch shape (`fixtures/prep52/prep52-temp-src.diff`, one file)

- `src/engine/liveMoveSpriteAllocator.ts:71` (end of `LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS`): append the 42 ids `3, 7, 8, 13,
  16, 20, 62, 69, 71, 72, 76, 87, 107, 111, 118, 126, 138, 144, 183, 193, 195, 200, 205, 207, 209, 218, 224, 228, 229, 241, 245,
  248, 252, 254, 256, 261, 269, 275, 278, 301, 348, 351`, with a comment citing the receipt. Also reword the doc comment at :49-52:
  Future Sight is now IN, with both of its scripts audited.
- `src/engine/liveMoveSpriteAllocator.ts:76-80`: `LIVE_SPRITE_ALLOCATOR_NET_ZERO_STATUS_ANIMATIONS` adds FRZ, INFATUATION, CURSED
  and NIGHTMARE (WRAPPED stays out). The doc comment changes accordingly.
- No orchestrator change: prep50's status-animation hook already reads the set.

**Recommendation for the fold: drop GUST 16 and TRANSFORM 144** (40 ids). They are ROM-proven net-zero but are not live adapters
(`docs/animation-integration-live-status.json`). The existing pin (below) keeps the list ⊆ live adapters, and the predictor gives
the identical 60 / 6012 without them, because their chains also hold the order-host units. Keeping them is ROM-correct, but it
needs that pin relaxed.

A production fold must update `tests/liveSpriteAllocator.test.ts`:
- `:165-175` "net-zero move ids": the expected list becomes the union plus this receipt's move-id keys with verdict NET-ZERO
  (minus 16 and 144 if dropped). Remove the `not.toContain(248)` at :173 and the prep44 comment at :169: 248 is now audited by
  this receipt (key 248 plus `General_FutureSightHit`).
- `:205-207`: the "stay out" list `[116, 107, 87, 207, 339, 248]` must lose 107 (Minimize), 87 (Thunder), 207 (Swagger) and 248.
  Keep 116 and 339.
- `:226-236` "net-zero status animations": extend the label map with `Status_Freeze→FRZ, Status_Infatuation→INFATUATION,
  Status_Curse→CURSED, Status_Nightmare→NIGHTMARE`, read from `fixtures/prep52/net-zero-audit.json` (`units[].key` string, verdict
  NET-ZERO). Raise the expected count from 5 to 9.
- Add a per-id check in the style of :176-190. For every new id, `net-zero-audit.json` must have:
  - verdict NET-ZERO;
  - `bodiesFromKnownEntry` ≥ 1 per side;
  - every row with bodies `identicalAB`.
- Orchestrator coverage: extend the prep50 test that a crossed FRZ (or INFATUATION) event now keeps
  `liveMoveSpriteAllocatorHost.host.historyKnown`, while WRAPPED / unknown statuses still invalidate. The palette host must still
  invalidate (`tests/livePaletteStatusCursor.test.ts` unchanged).
- Route / seed pins that move: expected wherever one of these units precedes a wall-family consumer (prep50 moved Light Screen
  seeds 50 / 62 and wall seed 58). This session did NOT run `npm test` with the patch (out of scope), so the moving pins were not
  enumerated. The measured censuses are the only exercise of the patch.

### Residual after the patch (`fixtures/prep52/residual-after-patch.json`, `chains-after-seeds0-299.json`)

29 declines / 3141 frames remain:
- 28 have the chain `command party-summary + command switch-in`;
- 1 has that chain plus a recall / switch-out.

`prep52AllocatorCensus.ts --reseed-detail` attributes each decline to the last switch-in reseed that left the host unknown. All
are switch-in commands with `iso=false` and an invalid ORDER host, `no EXACT plan` for:

| order unit | declines / frames |
|---|---|
| 258 Hail | 7 / 713 |
| 28 Sand-Attack | 6 / 668 |
| 340 Bounce | 4 / 492 |
| 240 Rain Dance | 4 / 319 |
| 19 Fly | 3 / 369 |
| 189 Mud-Slap | 3 / 369 |
| HAIL_CONTINUES | 1 / 123 |
| 351 Shock Wave | 1 / 88 |

Those are prep46's WORDS-DEPENDENT units (28 / 189 / 240), the two-turn order units (Bounce / Fly) and Hail. Closing them is
order-host work, after which this allocator tail is empty.

Also new since prep50: 7 forced switch-ins fail to reseed with a VALID order host and `iso=false` (`allocatorReseeds` in both
reports, so the cause is already on master: 6 `false -> false`, 1 `true -> false`). prep50 saw none. None of them precedes a remaining decline, but the order
lane should look at why role-isomorphism fails there.

## Instrument

- `prep52AllocatorCensus.ts`: prep50's census rerun on today's production. The shadow reads the production status set. It adds an
  opt-in `--reseed-detail` per-decline `allocatorLastFailedReseed`; with the flag off, receipts are unchanged.
- `prep52Chains.py`: prep50Chains.py, schema renamed.
- `prep52NetZeroProbe.py`: one Scene ON pass records EVERY animation-script interval with its move index and script label. It also
  records baseline / end / survivors / freed slots (template, callback), events and attributed late changes.
- `prep52Probe.py`: 150 scenarios × 2 fresh runs.
- `prep52Extract.py`: verdicts NET-ZERO / KNOWN-DELTA / NOT NET-ZERO / NOT REACHED.
- `prep52GeneralScan.py`: the general-animation scan.
- `prep52FrzSearch.py`: the 20-seed freeze search that fixed the FRZ seeds (12 / 1 Shuckle, 8 / 13 Snorlax). It is not a receipt.
- `prep52Residual.py`: the residual attribution.
- `prep43CensusDelta.py`: pairing and delta (existing, unchanged).

## Reproduce

    OUT=/tmp/p52-repro REC=/tmp/p52-rec sh tools/integration/prep52Run.sh   # ~11 min; SKIP_PROBES=1 / SKIP_CENSUS=1
    # prints "same <file>" for all 9 receipts in tools/integration/fixtures/prep52/; src is applied from the .diff and reverted

Verified on this branch:
- final full run into fresh directories at the head of this work: all 9 receipts `same`, `src reverted`;
- earlier passes: another full run (census, chain and scan receipts `same`; the audit receipt was regenerated once, after the probe
  stopped embedding the scratch path) and a further fresh probe pass (both probe receipts `same`).

The census before / after has therefore been reproduced byte-identically in 3 independent runs, and the probes in 3 independent
300-run passes, all A == B.
