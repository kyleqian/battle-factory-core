# Gameplay parity audit — 2026-11-12 (top layer; read-only; no `src/` or `tests/` change)

Asked by the user after #202 / #206 / #208 / #203-#204: how did core battle rules stay wrong for months, and what would
prove battle logic is finished. Three read-only audits (test-layer forensics, the hit pipeline against C, the
"silent default" class outside the hit pipeline). Schedule and gate decision: `docs/cax31-session-handoff.md` item 0d.

**Status of every row in section 2:** read against `reference/pokeemerald`; engine side probed where marked "probe";
**not ROM-confirmed**. Earlier audits in this repo had about 3 of 4 first-pass divergence claims refuted, so treat each
row as a lead with a C cite and confirm it on the ROM (a `romDriveSeed.sh` seed or a Mechanic Lab `overrides.parties`
scenario) before or with the fix. The top layer re-read five rows at source; they are marked "re-read".

## 1. Why the earlier layers missed it

The formulas were right. The errors were in the adapters that turn live battle state into formula inputs (an id-to-name
map, side statuses, the AI view builder). Every ROM comparison stopped before that adapter.

| Layer (before aud243d, `ffa6c9e5c`) | Reference | What it asserts |
|---|---|---|
| `tests/damageCalc.test.ts` and the pure-helper tests | hand-computed / one Battle-1 RAM dump | the pure helper, called with string ability names; no TS test contained `sideStatusReflect` |
| live opcode tests (`tests/battleScript*.test.ts`) | hand-derived | kernel state; ability ids 37 / 63 / 66 / 68 / 74 never staged |
| ROM receipts (`tools/probe/receipts`, `tests/fixtures`) | ROM | one staged mechanic each; ids 37 / 63 / 65 / 66 / 67 / 74 in zero receipts; no pinch attacker at <= 1/3 HP, no Huge / Pure Power attacker and no hit into a screen with HP compared |
| `tools/battle-lab` requests (1,905) | ROM | 1,392 are Scene ON pixel windows; pinch and Pure Power mons were recorded there at full HP, pixels only |
| soak | none | no throw, no stall (`tools/soak/randomRoundSoak.ts:340-369`) |
| census 0..999, generated-battle pins | engine vs engine | digests; the wrong values were the pinned values (abl261 moved five pins) |
| `docs/ability-item-parity-census.md` | identifier scan | "engine-referenced" = the name appears in source |
| `docs/gate6-coverage-manifest.md` | derived | `oracle-receipted-hook` joined from any party member in any receipted scenario (bench Charmander / Bulbasaur with Tackle made Blaze / Overgrow "receipted") |
| `docs/ability-activation-audit-2026-08-25.md` | source reading | paired `pokemon.c` with `damageCalc.ts` lines (:271-279); the call-site map was never read |
| `tools/soak/randomRoundSoakCoverage.ts` activation counter | none | counts printed messages; damage / speed / accuracy modifiers are "SILENT BY CONSTRUCTION ... NOT a gap" (:18-26) |

Archaeology: `1f8d77275` (07-28) ported the ability block into the pure helper and passed `ABILITY_NAME_BY_ID[...] ?? null`
at the call site without extending the 4-entry map; its message says "Wired the real call site ... so these aren't
dormant" and it added pure tests only. The Reflect / Light Screen "not modeled anywhere in this engine yet" comment
(`6703dd992`, 07-24) became false one day later (`f5a739f63` added the setters and timers). The optional AI view fields
were known at write time in comments only (`3580b1991`, 07-29). None of the three was ever an ISSUES / DEFERRED / ROADMAP entry.

The wrong behaviour ran constantly: abilities 183 / 1000 census seeds flagged, screens + type order 298 / 1000, AI party count 160 / 1000.

**Rule that follows:** the only gameplay-parity evidence is a whole battle replayed on the ROM (`tools/audio/romDriveSeed.sh`).
Soak, census, pins, "engine-referenced" and message-count coverage are not parity evidence.

## 2. Leads found by the audit (15 source-confirmed, 4 suspected)

Reach = Factory pool mons (Level 50 draws sets 110..849; full-AI opponents from index 372; per `battle_factory.c:169-190`, not re-read by the top layer).

### A. AI adapters (the silent-default class)

| # | Lead | Engine | C | Example | Reach |
|---|---|---|---|---|---|
| A1 | AI damage estimate drops more inputs than #204 C lists: attacker `isBurned`; pinch boost (the view spells `maxHp`, `DamageBattler` reads `maxHP`); attacker `hasStatus1` (Guts); target `hasAnyStatus` vs `hasStatus1` (Marvel Scale); weather, Flash Fire, Foresight never passed. **re-read** (`maxHp` / `maxHP`, attacker burn); probe | `factoryAiTryToFaint.ts:131-139`; view `factoryAiLiveDriver.ts:365-530` (`maxHp` :376 / :454); `damageCalc.ts:387-403`, `:423`, `:452`, `:480` | `AI_CalcDmg` `battle_script_commands.c:1306-1319` -> `pokemon.c:3211-3226`, `:3263`, `:3331-3368` | burned attacker Body Slam estimate: engine 58, C 30; Blaze Flamethrower at low HP: engine 96, C 142; Guts 58 vs 86; Marvel Scale 58 vs 39 | Guts 20-24, pinch 33-44, weather setters 33-40, Flash Fire 15-20 (smart-AI tiers) |
| A2 | switch-in scorer pass 1 has no move-power gate: a status move of a super-effective type counts as "has a super-effective move". **re-read**; probe | `battleAiSwitchInto.ts:118-141` `moveIsSuperEffectiveAgainst` | `ModulateDmgByType2` sets SUPER_EFFECTIVE only `if (gBattleMoves[move].power ...)`, `battle_script_commands.c:1524`, via `TypeCalc` at `battle_ai_switch_items.c:733` | foe Fire/Flying; bench X (Grass/Poison, Rain Dance + Sludge Bomb), Y (Water, Surf): engine X, C Y | 400 mons carry a non-Normal status move; runs on every opponent faint replacement |
| A3 | switch-in scorer pass 1 gets no opposing ability, so Levitate is ignored. **re-read**; probe | first call `battleScriptOpenPartyScreenOpcode.ts:263` passes no fallback; `battleAiSwitchInto.ts:220` reads `damageFallback?.opposingAbility` | `TypeCalc` Levitate check `battle_script_commands.c:1554` | foe Gengar; bench slot 1 Fire (Flamethrower), slot 2 Ground (Earthquake): engine slot 2, C slot 1 | 19 Levitate mons weak by type to Ground; 197 mons with a damaging Ground move |
| A4 | AI voluntary switch, pass 2 base damage defaults to 0. static + probe | `factoryAiSwitchPolicy.ts:672` (`baseDamage: 0`); `factoryAiLiveDriver.ts:611` never supplies `suitableDamageFallback` | `battle_ai_switch_items.c:747-789` (`AI_CalcDmg`, never 0) | pass 2 with base 0 returns the first legal mon; with a real base it can return another | Perish Song (4) / asleep Natural Cure (16-22) switch paths |
| A5 | AI turn counter hardwired to 0. static | `factoryRoundBattleOrchestrator.ts:1569-1577`; `factoryAiLiveDriver.ts:385` | `data/battle_ai_scripts.s:1482` | Swagger scored +5 by the engine, +3 by C after turn 1 | 13 Swagger / Psych Up mons, target Attack <= -3 only |
| A6 | CheckViability target literal drops `ability`. static | `factoryAiDecisionPolicy.ts:1233-1269`; read `factoryAiCheckViability.ts:8502` | `Cmd_get_ability` trapper branch | Skill Swap vs Arena Trap Dugtrio: one extra `Random()` | 2 Skill Swap x 4 Dugtrio |
| A7 | same literal drops target `spAtkStage`. static | read `factoryAiCheckViability.ts:5060`, `:7390`, `:9212-9218` | `data/battle_ai_scripts.s:1293`, `:2089` | Roar / Psych Up vs +3 Sp. Atk only: engine -3 with no draw, C draws | Brain battle 21 vs Volbeat / Sunflora in practice |

Seed 57 lead (unverified): the moveset is Heracross_3; a Swarm boost turns Megahorn 105 into 156, above Brick Break 145,
which is the ROM's ranking. Holds only if Heracross had Swarm and hp <= 1/3 at that decision (A1).

### B. Turn-flow seams (hand-written orchestration)

| # | Lead | Engine | C | Example | Reach |
|---|---|---|---|---|---|
| B1 | Toxic counter survives a switch: the end-turn bump is mirrored into the party record, C bumps `gBattleMons` only. **re-read**; probe | `battleEndTurnOrchestration.ts:651-661` (`bumpToxicCounter` writes the party mirror); reload `battleScriptSwitchinOpcode.ts:559` | `battle_util.c:1536-1548` (no party write) | 4 ticks, switch out, return: engine 5/16, C 1/16 | 26 Toxic + 2 Poison Fang users |
| B2 | Encore auto-confirms the whole action. **re-read** (C side); probe | `factoryBattleScriptFullTurnDecision.ts:2473-2503` (`lockedMoveDecision`) | `battle_main.c:4160-4170`: the action menu is skipped only for MULTIPLETURNS / RECHARGE; Encore applies after B_ACTION_USE_MOVE (`:4192`) | Encored player gets no prompt and cannot switch; Encored AI skips its switch logic and those draws | 4 Encore users |
| B3 | Endure blocks a same-turn Future Sight. seam probe | `battleEndTurnOrchestration.ts:2417` | `battle_main.c:3960`, `:4866` | lethal Future Sight on an Endure turn: engine 1 HP, C faints | 24 Endure x 5 Future Sight |
| B4 | Shell Bell heals off Future Sight. probe | `battleEndTurnOrchestration.ts:2663-2673` | `battle_util.c:1816` | holder 100 -> 104 HP; C no heal | 46 holders |
| B5 | Castform never reverts when weather ends. probe | `battleScriptFaintedActionsOrchestration.ts:409-492` | `battle_util.c:1959-1962` (cite from a sub-audit, not re-read) | rain expires, Castform stays Water | 2 Castform sets |
| B6 | confusion self-hit omits the Explosion defense halving: C reads `gBattleMoves[gCurrentMove].effect`, not the `move` argument. source + probe | `battleScriptActionAdmission.ts:2996-3038` passes no `moveEffect` | `pokemon.c:3229`; call `battle_util.c:2173` | confused mon that chose Explosion (atk 150, def 120, L50): engine 24, C 46 before the roll | 25 Explosion / Selfdestruct mons x 114 confusion inflicters |
| B7 | Pain Split is recorded as physical damage. source | `battleScriptHitChainOpcode.ts:2588-2616` (sole writer of `protectPhysicalDmg`) | `battle_script_commands.c:1938` excludes `MOVE_PAIN_SPLIT` | after Pain Split: engine lets Counter succeed, Revenge double, Focus Punch lose focus | 2 Pain Split mons vs 41 Counter / 11 Focus Punch / 3 Revenge |
| B8 | Hidden Power damage record uses the dynamic type; C uses base type Normal (physical). source | same lines; `battleScriptRulesContext.ts:1311` masks `F_DYNAMIC_TYPE_IGNORE_PHYSICALITY` | `battle_script_commands.c:1855-1860` | Unown Hidden Power Dark: engine lets Mirror Coat work and Counter fail; C the reverse | 1 mon (Unown) |

### Suspected (not executed)

- Cure berries after Pursuit-on-switch land at end of turn, not before (the after-faint pass ports only White Herb); 8 Pursuit users.
- AI history not cleared when the player swaps out and back while the AI is move-locked (`factoryAiLiveDriver.ts:207-267` vs `battle_main.c:3260-3261`).
- White Herb on a Baton Pass switch-in (`battleScriptSwitchinOpcode.ts:1172-1175` vs `battle_script_commands.c:5265-5266`).
- End-turn re-sort uses the unusable slot's priority when the move is a forced Struggle (`battleEndTurnOrchestration.ts:2170-2176` vs `battle_main.c:4700`).

## 3. Checked and matching

- Main hit path, about 60 items, term for term with live inputs: every `CalculateBaseDamage` term (truncation order, crit stage
  rule, the +2, `TYPE_MYSTERY`), live damagecalc inputs (hold effect, param, species, status, HP, screens, weather, Flash Fire,
  sports, Frontier flag), critcalc, accuracycheck, adjustnormaldamage / adjustsetdamage, typecalc / typecalc2, the fixed and
  variable damage family (level damage, Psywave, Super Fang, Endeavor, Counter / Mirror Coat calculators, Low Kick, Flail,
  Frustration, Hidden Power type and power, Magnitude, Present, Spit Up, Eruption, Revenge, Rollout, Fury Cutter, multi-hit,
  OHKO, Brick Break, Future Sight, Pursuit x2). `HOLD_EFFECT_NAME_BY_ID` (26 of 67) is complete for its consumers; the ability map is complete (78).
- Turn order: 6 optional inputs, filled at all three live call sites; all 24 AI speed checks use the shared `aiTurnOrder`.
- AI view: 55 optional fields, 54 filled live (A5 is the one). CheckBadMove literals 29 / 29. Non-AI rules context: 161 optional fields, 0 read-but-never-written on Factory paths.
- Unreachable in the pool (checked against the pool data): Lock-On sure-hit path, Charge x2 type source, Beat Up level, Mud / Water Sport,
  Wonder Guard, Air Lock, Light Ball, Metal Powder, Deep Sea Tooth, Soul Dew, Lucky Punch, False Swipe, Weather Ball, Bide, Doom Desire,
  Gust, Twister, Vital Throw, Macho Brace. Permanent weather (Sand Stream, Tyranitar 860-869) is outside Level 50 and would need work for Open Level.
- **Not audited:** script-driven cases taken from the generated script program (Facade, Smelling Salt, Stomp / Minimize, Earthquake / Dig,
  Surf / Dive, Thunder / Sky Uppercut vs Fly, Triple Kick, Sonic Boom, Dragon Rage, recoil, drain); CheckViability handler bodies line by
  line; the ~40 `RecordAbilityBattle` sites (about 15 mapped); Mimic / Sleep Talk / Metronome forbidden sets; Baton Pass carry;
  Trick / Thief / Recycle internals; Leppa PP persistence; #209 / #210.

## 4. Fix shape for the adapter class (A rows, #204 C)

1. Make every AI view and per-script battler field required; delete the `?? default` reads; give tests one neutral-battler builder.
2. Remove the `view.attacker as FactoryAiTryToFaintBattler` casts; build the AI `DamageBattler` through the resolver the `damagecalc`
   opcode uses, with all inputs required (this is also the #204 C fix; A1 is the same function).
3. Make `suitableDamageFallback` required; add a real turn counter to the rules context.
4. Drop the default parameters on `effectiveSpeed` / `getWhoStrikesFirst`.

Types do not catch the B rows. Those need the ROM replay with a player that switches (item 0d).

## 5. What the ROM replay cannot see today

`soundCensusRomReplay.ts` plays the census policy: least-used legal move, never a voluntary switch, Level 50, battle 0 of a round,
streak `seed * 11 % 49`; the lab rejects the Brain (`trainerId` 0..299); the compare tuple is HP x2, `gRngValue`, last moves.
So B1, B2, Pursuit, the trapping abilities and Natural Cure on a voluntary switch never occur in it, at any number of seeds.

Measured on the Mac (M-series, one seed alone): seed 224 OFF whole chain 18 s (request 1.3, setup 3.6, engine 1.5, drive 5.3 for
5,487 frames, timeline 5.0, compare 1.3); seed 7 ON 25.5 s (17,808 frames). The timeline stage re-runs the ROM a second time.

## 6. First batch of new seeds (top layer, Mac, tree `69241cf85`, seeds 61..160, Scene OFF)

`tools/audio/romDriveSeed.sh SEED off DIR`, 8 at a time (`xargs -P 8`), 279 s wall for the 100 seeds (1.06 M ROM frames).
Evidence was written to a session scratch directory and is not kept; every row re-derives from the seed.

- **78 full match** (engineError null, divergence null, stop `outcome`).
- **20 diverge** (table). Not diagnosed. `engineError` null and frozen timeline == drive on all 20.
- **2 not drivable:** 82 and 131 are Brain battles (`trainerId` 1022; the setup probe exits 139, the seed-33 class).

| seed | matched / engine states | drive stop | ROM frames |
|---|---|---|---|
| 75 | 3 / 9 | party menu without a switch decision | 3376 |
| 79 | 4 / 13 | party menu without a switch decision | 3582 |
| 87 | 44 / 74 | party menu without a switch decision | 23290 |
| 88 | 0 / 6 | outcome | 3414 |
| 89 | 45 / 122 | party menu without a switch decision | 27061 |
| 90 | 66 / 73 | outcome | 36093 |
| 94 | 36 / 39 | outcome | 21096 |
| 95 | 3 / 11 | action menu without a move decision | 4978 |
| 107 | 3 / 11 | action menu without a move decision | 3171 |
| 109 | 0 / 17 | action menu without a move decision | 1969 |
| 110 | 2 / 69 | outcome | 45407 |
| 114 | 1 / 13 | party menu without a switch decision | 2268 |
| 119 | 4 / 21 | party menu without a switch decision | 2723 |
| 123 | 3 / 9 | action menu without a move decision | 4219 |
| 137 | 7 / 10 | outcome | 4405 |
| 138 | 5 / 10 | party menu without a switch decision | 3985 |
| 152 | 6 / 14 | action menu without a move decision | 4386 |
| 155 | 6 / 7 | outcome | 3233 |
| 158 | 17 / 18 | outcome | 8304 |
| 159 | 52 / 64 | party menu without a switch decision | 36021 |

Reading: 20 of 98 drivable new battles (20 %) still leave the ROM's line on the aiv270 tree. Several will share a cause
(the open #204 C / #209 / #210 and the section 2 A rows change AI picks, which shows up as a menu the engine did not plan).
