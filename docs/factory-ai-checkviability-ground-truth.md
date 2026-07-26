# Battle Factory AI `AI_CheckViability` handler bodies: phase-1 ground truth

Status: read-only source/artifact/live-oracle prep scout, same contract as
`docs/ingrain-leechseed-wrap-ground-truth.md` and
`docs/screens-weather-ground-truth.md` — **no `src/` changes, no `AI_CV_*`
implementation**. Goal: bank what a later main-lane worker needs to port the
first phase of `AI_CheckViability` handler *bodies* (PROGRESS entry 460
landed `AI_CheckBadMove` full, `AI_TryToFaint`, and `AI_CheckViability` as a
source-complete dispatch **table** that halts at a named
`unsupported-branch: factory-ai-check-viability` barrier for every move whose
effect has an entry — no handler body is ported yet). Source citations are to
the pinned `reference/pokeemerald@83df84e40623b79281f2397faa611cbf044170bd`
(same commit as `docs/factory-ai-ground-truth.md`). Live citations are to the
Battle Scene OFF oracle (`http://127.0.0.1:8014`).

**Read this first if you're the porter**: §3 and §4 below overturn two load-
bearing assumptions this step's own brief inherited from the 2026-07-25
port-subset audit (`docs/factory-ai-ground-truth.md` §"2026-07-25 port-subset
audit" §3's 16-handler table). Both corrections are verified directly against
source, cited by line. Read them before picking a handler to port.

## 0. Executive summary

1. **Census re-verified, unchanged**: 73/214 effects, 152/355 moves, 118/276
   Factory-L50 executable — regenerating (`npx tsx
   tools/report/executable-frontier-census.ts`) produces a byte-for-byte
   zero diff against the committed doc. The brief's own numbers are current;
   no drift since the 2026-07-25 audit. (§1)
2. **Reachable-handler set grew 16 → 22** (handlers with ≥1 currently-
   executable move that would select them, excluding two effects that are
   "executable" but have literally zero moves anywhere in the 355-move game
   — see §2's note). Six handlers joined: `AI_CV_SpeedDownFromChance`,
   `AI_CV_LightScreen`, `AI_CV_Reflect`, `AI_CV_RainDance`, `AI_CV_SunnyDay`,
   `AI_CV_Hail` — all six via the screens/weather-setter opcode registrations
   PROGRESS entry 460 landed this session. Zero handlers left the reachable
   set. (§2)
3. **CRITICAL correction**: the July-25 audit's §3 table claims 9 of the 16
   reachable handlers are "trivial ... 0 `if_random`". **All 9 are wrong** —
   every one contains at least 1 `if_random_less_than` instruction, verified
   by direct source read with exact line citations. The same audit's "7
   one-roll (1 `if_random`)" handlers are *also* undercounted (2-8 sites
   each, not 1). This is not a nitpick: it directly falsifies this step's own
   brief's "phase 1 = trivial deterministic handlers (0 `if_random_less_than`
   sites)" framing — **no reachable `AI_CV_*` handler has zero
   `if_random_less_than` instructions in its body**, though several have
   branches that are *unreachable* (hence draw zero live) under specific,
   stageable battle states. §3 has the corrected count for every reachable
   handler.
4. **New finding, not in either prior doc**: `AI_CheckBadMove`'s *own*
   `if_effect` dispatch table (`data/battle_ai_scripts.s:65-213`, already
   ported in full as `src/engine/factoryAiCheckBadMove.ts`'s
   `AI_CHECK_BAD_MOVE_TABLE_EFFECTS`) independently names **17 of the 22**
   reachable `AI_CV_*` handlers' triggering effects. Since CBM runs *before*
   CV in the per-slot script order (mask 7 = CheckBadMove, TryToFaint,
   CheckViability, in that fixed order, `docs/factory-ai-ground-truth.md`
   §1.1), a move whose effect is in *both* tables hits the
   `factory-ai-check-bad-move` barrier first — `AI_CV_*`'s own body is dead
   code for that move until `AI_CBM_*` is *also* ported. Only **5 of 22**
   reachable `AI_CV_*` handlers are reachable through the CURRENT port
   without a paired CBM handler: `AI_CV_AlwaysHit`, `AI_CV_HighCrit`,
   `AI_CV_VitalThrow`, `AI_CV_Pursuit`, and `AI_CV_SpeedDownFromChance`
   (partially — see §4's footnote). **5 of this step's brief's 6
   prioritized handlers (`AccuracyDown`/`AttackDown`/`DefenseDown`/
   `SpeedDown`/`SpDefDown`) are in the CBM-blocked 17**, not the CV-only 5.
   This doesn't block staging live-oracle ground truth (the real ROM has no
   barriers), but it changes what "phase 1" should mean for the *port*. §4.
5. Given both corrections, this session staged and live-verified **one**
   handler end-to-end (`AI_CV_SpeedDown`, chosen because it is genuinely
   state-independent — no HP/stat-stage precondition, just relative Speed,
   knowable at team-build time) across **two comparative fixtures** proving
   the handler's causal effect on the pick, not just its presence. §6.
6. The brief's other 5 prioritized handlers are **not** live-staged this
   session (time-capped) but get a full analytical ground-truth entry each
   — exact instruction list, corrected `if_random` count, and the precise
   staging recipe (preconditions, why single-turn doesn't work, what a
   follow-up worker needs to build) a fresh worker can execute directly. §7.
7. The audit's "7 one-roll handlers" are named as phase 2 per the brief,
   with corrected sizing evidence (real `if_random` counts, 2-8 each, not
   1). §8.

## 1. Census re-verification

Rerunning `npx tsx tools/report/executable-frontier-census.ts` in this
worktree reproduces `docs/executable-frontier-census.md` byte-for-byte (zero
diff) — the doc is not stale. Headline (unchanged from the brief):

| Metric | Executable | Total |
| --- | -: | -: |
| Effect scripts | 73 | 214 |
| Moves (unweighted) | 152 | 355 |
| Factory-L50 moves (unweighted) | 118 | 276 |
| Factory-L50 moves (weighted) | 1536 | 2957 |

This confirms the brief's own "73/214, 152/355" figures (not the "144
executable moves" figure the 2026-07-25 audit already flagged as stale in
its own §3 — still stale, still 152 now).

## 2. Reachable-handler table re-derivation vs the 2026-07-25 audit's §3

Method (mechanical, not audit-by-hand): parsed all 122 `if_effect EFFECT_X,
AI_CV_Y` lines inside `AI_CheckViability`'s dispatch shell
(`data/battle_ai_scripts.s:654-775`, confirmed 122 lines, 90 unique
`AI_CV_*` handlers — matches `src/engine/factoryAiCheckViability.ts`'s own
`AI_CHECK_VIABILITY_TABLE_EFFECTS` set, which is source-complete), grouped by
handler, and cross-referenced each triggering effect's live classification
(`executable`/`blocked-*`) and move count from the freshly-regenerated
`docs/executable-frontier-census.md`.

**24 handlers have ≥1 currently-executable triggering effect.** Two of those
24 (`AI_CV_AccuracyUp` via `EFFECT_ACCURACY_UP(_2)`, `AI_CV_SpAtkDown` via
`EFFECT_SPECIAL_ATTACK_DOWN(_2)`) are executable in the census sense (their
`BattleScript_EffectHit`-fallback entries have full opcode coverage) but have
**zero moves anywhere in the 355-move game** — there is no move ID a fixture
could ever select to reach them, so they're vacuously reachable and not
useful for staging. Excluding those two: **22 handlers are reachable with at
least one real move today.**

Comparing to the audit's own 16-handler table
(`docs/factory-ai-ground-truth.md` §3's "16 reachable handlers" list:
`AlwaysHit`, `HighCrit`, `DefenseUp`, `AccuracyDown`, `AttackUp`,
`AttackDown`, `DefenseDown`, `SpeedDown`, `SpAtkUp`, `SpDefDown`, `SpDefUp`,
`SpeedUp`, `EvasionUp`, `EvasionDown`, `VitalThrow`, `Pursuit`):

- **All 16 remain reachable** — zero handlers left the set.
- **6 handlers joined**: `AI_CV_SpeedDownFromChance` (`EFFECT_SPEED_DOWN_HIT`
  — 6 moves), `AI_CV_LightScreen` (`EFFECT_LIGHT_SCREEN` — 1 move),
  `AI_CV_Reflect` (`EFFECT_REFLECT` — 1 move), `AI_CV_RainDance`
  (`EFFECT_RAIN_DANCE` — 1 move), `AI_CV_SunnyDay` (`EFFECT_SUNNY_DAY` — 1
  move), `AI_CV_Hail` (`EFFECT_HAIL` — 1 move). All six became reachable via
  this session's own screens/weather opcode registrations (PROGRESS entry
  460: "screens/weather setters + full `DoFieldEndTurnEffects`", census
  122→148, and the later Castform-adjacent registration to 152) — confirmed
  by checking each effect's `Classification` in the census (all six read
  `executable`, entry scripts `BattleScript_Effect{LightScreen,Reflect,
  RainDance,SunnyDay,Hail}`, none were executable before that registration).

16 + 6 = 22, matching the count above.

## 3. CRITICAL correction: the audit's "trivial (N instr, 0 `if_random`)" claims are wrong for every one of the 9 handlers it makes them for

The audit's §3 table classifies 9 of its 16 handlers as "trivial (N instr, 0
`if_random`)": `AlwaysHit`, `AccuracyDown`, `AttackDown`, `DefenseDown`,
`SpeedDown`, `SpDefDown`, `SpeedUp`, `EvasionDown`, `Pursuit`. This step's
brief inherited that framing verbatim ("phase 1 = the trivial deterministic
handlers (0 `if_random_less_than` sites)"). **Direct source read finds an
`if_random_less_than` instruction in every single one of these 9 handlers.**
Exact counts, verified by parsing each handler's full body between its own
label and the next top-level label:

| Handler | Audit's claim | Actual `if_random_less_than` count | Lines |
| --- | --- | -: | --- |
| `AI_CV_AlwaysHit` | "trivial (5 instr, 0 `if_random`)" | **1** (`:1085`) | 1075-1089 |
| `AI_CV_AccuracyDown` | "trivial (2 instr, 0 `if_random`)" | **7** (`:1202,1206,1210,1214,1218,1222,1229`) | 1198-1234 |
| `AI_CV_AttackDown` | "trivial (4 instr, 0 `if_random`)" | **2** (`:1097,1107`) | 1090-1123 |
| `AI_CV_DefenseDown` | "trivial (2 instr, 0 `if_random`)" | **1** (`:1128`) | 1124-1135 |
| `AI_CV_SpeedDown` | "trivial (3 instr, 0 `if_random`)" | **1** (`:1148`) | 1142-1152 |
| `AI_CV_SpDefDown` | "trivial (2 instr, 0 `if_random`)" | **1** (`:1190`) | 1186-1197 |
| `AI_CV_SpeedUp` | "trivial (3 instr, 0 `if_random`)" | **1** (`:962`) | 956-966 |
| `AI_CV_EvasionDown` | "trivial (2 instr, 0 `if_random`)" | **1** (`:1239`) | 1235-1246 |
| `AI_CV_Pursuit` | "trivial-ish (11 instr, 0 `if_random`)" | **1** (`:2032`) | 2018-2036 |

The audit's own "9 of these 16 are fully deterministic" summary line is
therefore also wrong — **zero of the 16 are 0-`if_random`.**

**Why the audit likely got this wrong**: every one of these 9 handlers
follows a common idiom — a chain of deterministic HP/stat-stage gate checks
that, for a *specific* common battle state (full HP, neutral stat stages),
happen to **skip past** the handler's `if_random_less_than` instruction
entirely (branching straight to a purely-deterministic tail). Reading only
the "obviously reached" path in a fresh-battle mental model, without tracing
every branch target, would produce exactly this undercount. The instructions
are real and a full port must implement them (a battle with pre-existing
damage or stat changes *will* reach them) — but for the narrow case of "both
battlers full HP, neutral stat stages, no status," several of these handlers
genuinely execute zero draws, which is likely what "0 `if_random`" was
trying to describe and mislabeled as an unconditional property of the
handler rather than a property of that one battle state. §7 exploits this
distinction directly for staging.

**Same undercount, smaller magnitude, in the audit's "7 one-roll" bucket**
(`HighCrit`, `DefenseUp`, `AttackUp`, `SpAtkUp`, `SpDefUp`, `EvasionUp`,
`VitalThrow`, all claimed "multi-branch, 1 `if_random_less_than`"): actual
counts are `HighCrit`=2, `DefenseUp`=5, `AttackUp`=3, `SpAtkUp`=3,
`SpDefUp`=5, `EvasionUp`=8, `VitalThrow`=2 — none is actually 1. See §8.

## 4. New finding: `AI_CheckBadMove`'s own dispatch table blocks 17 of the 22 reachable `AI_CV_*` handlers before `AI_CheckViability` ever runs

Mask 7's fixed per-slot script order is `AI_CheckBadMove` → `AI_TryToFaint`
→ `AI_CheckViability` (`docs/factory-ai-ground-truth.md` §1.1). PROGRESS
entry 460's `src/engine/factoryAiCheckBadMove.ts` already ports CBM's
**universal preamble** in full but halts at a named
`unsupported-branch: factory-ai-check-bad-move` barrier for any move whose
effect appears in CBM's own `if_effect` dispatch table
(`data/battle_ai_scripts.s:65-213`, ~100 entries,
`AI_CHECK_BAD_MOVE_TABLE_EFFECTS` in that file — source-complete, 109
effects). **A move that hits the CBM barrier never reaches CheckViability at
all** in the current port — the CV handler, even once ported, is dead code
for that move until its matching CBM handler is *also* ported (or the
barrier reclassified).

Cross-referencing all 22 reachable `AI_CV_*` handlers' triggering effects
against `AI_CHECK_BAD_MOVE_TABLE_EFFECTS`:

**CV-only reachable (CBM's table has no entry for this effect — the CV
handler is reachable through the CURRENT port the moment it's implemented,
no CBM work needed):**

| Handler | Triggering effect(s) | Executable moves |
| --- | --- | -: |
| `AI_CV_AlwaysHit` | `EFFECT_ALWAYS_HIT` | 6 |
| `AI_CV_HighCrit` | `EFFECT_HIGH_CRITICAL`, `EFFECT_BLAZE_KICK`, `EFFECT_POISON_TAIL` | 10 |
| `AI_CV_VitalThrow` | `EFFECT_VITAL_THROW` | 1 |
| `AI_CV_Pursuit` | `EFFECT_PURSUIT` | 1 |
| `AI_CV_SpeedDownFromChance`* | `EFFECT_SPEED_DOWN_HIT` | 6 (see footnote) |

\* Footnote: `AI_CV_SpeedDownFromChance` itself
(`data/battle_ai_scripts.s:1136-1140`) is CBM-free, but it only forwards 3 of
its 6 covered moves (`MOVE_ICY_WIND`, `MOVE_ROCK_TOMB`, `MOVE_MUD_SHOT` —
matched by exact `if_move` ID, `:1137-1139`) into `AI_CV_SpeedDown`'s actual
body; the other 3 (`MOVE_BUBBLEBEAM`, `MOVE_CONSTRICT`, `MOVE_BUBBLE`) fall
through to `end` with zero score/zero draws, deterministically, for *every*
battle state — not a barrier, a genuine zero. **This is the CBM-free path
into `AI_CV_SpeedDown`'s body** — this session's own staged scenario (§6)
instead used `MOVE_STRING_SHOT` (`EFFECT_SPEED_DOWN`, direct dispatch,
`:1142`), which **is** CBM-blocked (`EFFECT_SPEED_DOWN` is in
`AI_CHECK_BAD_MOVE_TABLE_EFFECTS`) — the live-oracle ground truth in §6 is
unaffected (the real ROM has no barriers), but a porter targeting
`AI_CV_SpeedDown` specifically to avoid a CBM dependency should reach it via
`MOVE_ICY_WIND` etc., not `MOVE_STRING_SHOT`.

**CBM-blocked (17 of 22) — a porter needs the matching `AI_CBM_*` handler
too, not just the `AI_CV_*` one:** `AttackUp`, `DefenseUp`, `SpeedUp`,
`SpAtkUp`, `SpDefUp`, `AttackDown`, `DefenseDown`, `SpeedDown`, `SpDefDown`,
`EvasionDown`, `LightScreen`, `Reflect`, `RainDance`, `SunnyDay`, `Hail`,
`AccuracyDown`, `EvasionUp`. This is **5 of this step's brief's 6
prioritized handlers** (`AccuracyDown`/`AttackDown`/`DefenseDown`/
`SpeedDown`/`SpDefDown` — only `AlwaysHit` is CV-only-reachable).

## 5. Corrected per-handler table, all 22 reachable handlers

| Handler | Effect(s) | Exec moves | Lines | `if_random` (corrected) | CBM-blocked? |
| --- | --- | -: | --- | -: | --- |
| `AI_CV_AlwaysHit` | `ALWAYS_HIT` | 6 | 1075-1089 | 1 | no |
| `AI_CV_HighCrit` | `HIGH_CRITICAL`, `BLAZE_KICK`, `POISON_TAIL` | 10 | 1449-1461 | 2 | no |
| `AI_CV_SpeedDownFromChance` | `SPEED_DOWN_HIT` | 6 | 1136-1141 | 0 (redirects) | no |
| `AI_CV_DefenseUp` | `DEFENSE_UP(_2)`, `BULK_UP` | 5 | 915-955 | 5 | yes |
| `AI_CV_AttackUp` | `ATTACK_UP(_2)` | 4 | 896-914 | 3 | yes |
| `AI_CV_AccuracyDown` | `ACCURACY_DOWN(_2)` | 4 | 1198-1234 | 7 | yes |
| `AI_CV_AttackDown` | `ATTACK_DOWN(_2)` | 3 | 1090-1123 | 2 | yes |
| `AI_CV_DefenseDown` | `DEFENSE_DOWN(_2)`, `TICKLE`\*\* | 3 | 1124-1135 | 1 | yes |
| `AI_CV_SpeedDown` | `SPEED_DOWN(_2)` | 3 | 1142-1152 | 1 | yes |
| `AI_CV_SpAtkUp` | `SPECIAL_ATTACK_UP(_2)` | 2 | 967-985 | 3 | yes |
| `AI_CV_SpDefDown` | `SPECIAL_DEFENSE_DOWN(_2)` | 2 | 1186-1197 | 1 | yes |
| `AI_CV_SpeedUp` | `SPEED_UP(_2)` | 1 | 956-966 | 1 | yes |
| `AI_CV_SpDefUp` | `SPECIAL_DEFENSE_UP(_2)`, `COSMIC_POWER`, `CALM_MIND` | 1 | 986-1026 | 5 | yes |
| `AI_CV_EvasionUp` | `EVASION_UP(_2)`, `MINIMIZE` | 1 | 1037-1074 | 8 | yes |
| `AI_CV_EvasionDown` | `EVASION_DOWN(_2)` | 1 | 1235-1246 | 1 | yes |
| `AI_CV_LightScreen` | `LIGHT_SCREEN` | 1 | 1373-1395 | 1 | yes |
| `AI_CV_Reflect` | `REFLECT` | 1 | 1492-1515 | 1 | yes |
| `AI_CV_VitalThrow` | `VITAL_THROW` | 1 | 1536-1546 | 2 | no |
| `AI_CV_Pursuit` | `PURSUIT` | 1 | 2018-2036 | 1 | no |
| `AI_CV_RainDance` | `RAIN_DANCE` | 1 | 2037-2059 | 0 | yes |
| `AI_CV_SunnyDay` | `SUNNY_DAY` | 1 | 2060-2076 | 0 | yes |
| `AI_CV_Hail` | `HAIL` | 1 | 2261-2278 | 0 | yes |

\*\* `EFFECT_TICKLE`'s entry script (`BattleScript_EffectTickle`) is
currently `blocked-on-opcodes` in the census (needs
`B_SCR_OP_JUMPIFSTAT`/`B_SCR_OP_PLAYSTATCHANGEANIMATION`) — not itself
executable, so `AI_CV_DefenseDown`'s reachable move count (3) comes entirely
from `EFFECT_DEFENSE_DOWN`+`EFFECT_DEFENSE_DOWN_2` (2+1).

**Genuinely 0-`if_random`** (only 3, none from the audit's claimed 9):
`AI_CV_RainDance`, `AI_CV_SunnyDay`, `AI_CV_Hail` — all three are weather-
setter handlers with a clean `if_hp_less_than USER,40` / `get_weather`
compare-chain, no probability roll anywhere. All three are CBM-blocked,
though (`EFFECT_RAIN_DANCE`/`SUNNY_DAY`/`HAIL` are all in
`AI_CHECK_BAD_MOVE_TABLE_EFFECTS`), so none is a same-session single-handler
win — flagged as a strong **phase-1.5 candidate set** (truly trivial CV
body, but needs `AI_CBM_RainDance`/`SunnyDay`/`Hail`... actually CBM's table
routes all weather effects through a shared non-existent-named handler check
— a follow-up worker should verify CBM's own weather-effect entries before
assuming they're equally cheap).

## 6. Staged scenario: `AI_CV_SpeedDown` (fully executed, live-verified)

Chosen because it is the one reachable handler whose score contribution
depends on **nothing but relative Speed** — no HP threshold, no
pre-existing stat-stage change, no status condition — so it's knowable and
controllable at team-build time, no multi-turn setup needed (every other
handler this step's brief prioritizes gates its nonzero branch behind a
target-HP-≤70%-or-similar condition that is 100% at battle start, requiring
a prior turn's damage to ever go nonzero — see §7).

```
AI_CV_SpeedDown:                        (data/battle_ai_scripts.s:1142-1152)
	if_target_faster AI_CV_SpeedDown2   ; target(player) faster than user(AI)?
	score -3                            ; NO -> deterministic -3, 0 draws
	goto AI_CV_SpeedDown_End

AI_CV_SpeedDown2:
	if_random_less_than 70, AI_CV_SpeedDown_End  ; YES -> 70/256 (~27%) no bonus
	score +2                                      ; else (~73%) +2
AI_CV_SpeedDown_End:
	end
```

### Design: an equal-baseline control move proves causality, not just presence

A single scenario showing "String Shot loses" would be uninformative on its
own — `AI_TryToFaint`'s baseline (`get_how_powerful_move_is` /
`MOVE_NOT_MOST_POWERFUL` → `Score_Minus1`, `data/battle_ai_scripts.s:2619-
2620`) already penalizes any 0-power move that isn't tied for the moveset's
own highest power, so a naive "String Shot (0 power) vs. Pound (40 power)"
comparison would show String Shot losing regardless of `AI_CV_SpeedDown`
(confirmed empirically — see the scratch probes below). To isolate the
handler's *own* causal contribution, the control move must:

1. Be 0-power too (ties `AI_TryToFaint`'s "most powerful" comparison with
   String Shot when all 4 slots are 0-power — none is "not most powerful").
2. Have zero `AI_CheckBadMove`/`AI_CheckViability` contribution of its own
   in the tested battle state (so it isn't itself the thing being measured).

`MOVE_GROWL` (id 45, `EFFECT_ATTACK_DOWN`, 0 power) against a target whose
**first** type is in `AI_CV_AttackDown_PhysicalTypeList`
(`data/battle_ai_scripts.s:1115-1122`: Normal/Fighting/Ground/Rock/Bug/Steel)
satisfies both: `AI_CBM_AttackDown` (`:277-281`) only fires at
`STAT_ATK==MIN_STAT_STAGE` (never true at battle start) or
`ABILITY_HYPER_CUTTER`; `AI_CV_AttackDown` (`:1090-1123`) short-circuits to
zero at a target with default ATK stage, full HP, and a physical-list
type1 — all true for a fresh, undamaged, neutral-stage battler.

Opponent moveset (both fixtures): `[MOVE_STRING_SHOT(81), MOVE_GROWL(45),
MOVE_GROWL(45), MOVE_GROWL(45)]`.

### Fixture A — opponent (AI_USER) faster: `AI_CV_SpeedDown`'s deterministic branch

`tools/battle-lab/mechanic-factory-ai-cv-speeddown-opponent-faster-off.json`
— opponent = Dugtrio (species 51, base speed 120), player/target = Shuckle
(species 213, base speed 5, types Bug/Rock — physical-list type1). Opponent
is faster → `if_target_faster` false → String Shot gets deterministic **-3,
zero draws**; Growl gets deterministic **0** (physical-type short-circuit).

| Seed | Turn-1 pick | Total `Random()` calls, frame 100→732 |
| -: | --- | -: |
| 1 | slot 3 (Growl) — **never slot 0** | 10 |
| 99 | slot 3 (Growl) — **never slot 0** | 10 |

### Fixture B — opponent (AI_USER) slower: `AI_CV_SpeedDown`'s probabilistic branch

`tools/battle-lab/mechanic-factory-ai-cv-speeddown-opponent-slower-off.json`
— species swapped (opponent = Shuckle, player/target = Dugtrio, base speed
120 — Ground type1, still physical-list). Opponent is slower → target
faster → `if_target_faster` true → `if_random_less_than 70` (~73% chance of
**+2**, ~27% chance of **0**); Growl still deterministic **0**.

| Seed | Turn-1 pick | Total `Random()` calls, frame 100→732 |
| -: | --- | -: |
| 1 | slot 0 (String Shot) — the +2 branch fired | 20 |
| 99 | slot 0 (String Shot) — the +2 branch fired | 20 |

**This is the decision-visible, causally-attributable proof the brief asks
for**: identical moveset, identical opponent/target species pair (only which
side plays which role is swapped), and the pick **flips categorically** —
never String Shot when the AI is faster (deterministic -3, matching source's
zero-draw branch exactly), always String Shot when the AI is slower (both
banked seeds landed the ~73% branch). The isolation method (rngValue
stability, `stepsToReach` LCG forward search) is identical to
`docs/factory-ai-ground-truth.md` §2.1's; the only adaptation is reading the
used-slot PP delta from frame **0→732** (fully settled) rather than 0→100,
since — unlike the three mask-7 base scenarios (which always used opponent-
faster) — swapping which side is faster also swaps move order, delaying the
opponent's own PP decrement past frame 100 in Fixture B (documented in the
verify script). Both fixtures reproduced identically on a second run at each
seed (frame-0 state byte-identical) — the determinism requirement.

**Not yet banked**: an exact caller-attributed draw count for the turn-1
decision itself. Per `docs/factory-ai-ground-truth.md` §2.1's own
established limitation, turn-1's AI decision is already resolved before
frame 0 is captured (baked into `rngValue`), so — same as every scenario in
that doc — only the **pick** is directly observable for turn 1, not an
isolated draw count; the frame 100→732 totals above are real, reproducible,
cross-seed-stable numbers but describe the whole post-turn-1 window
(including whatever turn 2's own, unexecuted, re-decision draws), not a
clean "AI_CV_SpeedDown drew exactly N" figure.
`tools/probe/attribute-factory-ai-random-callers.py` is directly reusable
against these two fixtures for a future worker who wants that breakdown (it
takes any fixture path as `argv[1]`, no code changes needed) — not run this
session due to time.

## 7. Staging recipes for the brief's other 5 priority handlers (not executed — time-capped)

All five (`AlwaysHit`, `AccuracyDown`, `AttackDown`, `DefenseDown`,
`SpDefDown`) share a structural problem `SpeedDown` doesn't: **their
nonzero branch requires a precondition that is never true at battle start**
(pre-existing stat-stage change, or target HP ≤ 70%), so a single fresh
turn can only ever show them contributing **zero** — not decision-visible.
Genuine decision-visibility needs a real prior turn's damage or stat change,
i.e. a 2-turn build (turn 1: an attack that reliably drops the target below
70% HP, or a stat-changing move; turn 2: re-evaluate the same 4-move AI
moveset with the new state) — the same "two-turn follow-on" shape
`docs/factory-ai-ground-truth.md` §2.2 flagged as unexplored budget.

- **`AI_CV_AlwaysHit`** (`:1075-1089`, 1 `if_random_less_than 100` at
  `:1085`, CV-only reachable — no CBM pairing needed): nonzero only if
  target evasion stage > 8 or user accuracy stage < 4. Recipe: turn 1, the
  opponent (or a same-side ally, if this ever supports doubles — singles
  only here) uses a real accuracy-lowering move on itself... actually the
  *user*'s own accuracy must drop, or the *target*'s evasion must rise — in
  singles the AI_USER is the opponent and AI_TARGET is the player, so the
  clean single-attacker recipe is: turn 1 the **player** uses `MOVE_DOUBLE_TEAM`-
  class move on itself... `EFFECT_EVASION_UP(_2)`/`MINIMIZE` moves are
  currently CV-reachable themselves (`AI_CV_EvasionUp`, CBM-blocked) but
  player-side moves aren't run through Factory AI at all — the player's own
  move doesn't need CV — so a player self-buff on turn 1 (any executable
  `EFFECT_EVASION_UP` move — check current roster) raising evasion stage
  past 8, then turn 2 the opponent's `AlwaysHit` candidate (e.g.
  `MOVE_SWIFT`, id 129) scores +1 deterministic-then-random. Needs an
  executable evasion-up move on the CURRENT roster (not verified this
  session — check `docs/executable-frontier-census.md`'s `EFFECT_EVASION_UP`
  row before building).
- **`AI_CV_AccuracyDown`** (`:1198-1234`, 7 `if_random_less_than` sites,
  CBM-blocked): the most complex handler in the reachable set — nonzero
  branches gate behind toxic-poison/leech-seed/rooted/cursed status flags
  on top of the HP thresholds, none of which are single-turn-cheap to
  stage reliably (leech seed and curse both need their own move to land
  first). **Recommend reclassifying this out of "phase 1" entirely** — it
  doesn't fit a 60-minute worker's budget even with a 2-turn build; treat it
  as its own phased task once `AI_CBM_AccDown` is also in scope.
- **`AI_CV_AttackDown`** (`:1090-1123`, 2 `if_random_less_than` sites,
  CBM-blocked): nonzero via either (a) target's ATK stage ≠ default
  (needs a prior Attack-stage-changing move to land on the target first) or
  (b) target HP ≤ 70% (needs turn-1 damage). (b) is the cheap path: turn 1,
  a reliable ~30-50%-damage attack in the opponent's own moveset (competing
  against `MOVE_GROWL` in slot 0, say) that the AI's turn-1 decision
  independently picks over Growl (true by default — Growl's turn-1
  contribution is 0, an attack's `AI_TryToFaint` contribution is usually
  positive), then turn 2 re-evaluate. Recipe untested this session.
- **`AI_CV_DefenseDown`** (`:1124-1135`, 1 `if_random_less_than` at `:1128`,
  CBM-blocked): same shape as `SpeedDown`'s "faster/slower" flip but for HP:
  nonzero (-2) iff target HP ≤ 70%, deterministic zero-draw skip iff
  attacker HP ≥ 70% **and** target's DEF stage > 3 (true by default) — so
  the ONLY missing precondition for a clean two-turn demo is target HP ≤
  70%. Cheapest 2-turn recipe of the five: turn 1 a guaranteed-hit ~35%+
  damage move (against the SAME target species used for turn 2's
  `MOVE_SCREECH`/`MOVE_TAIL_WHIP`/`MOVE_LEER` candidate) that wins turn 1's
  own pick, then turn 2 the DefenseDown move should show -2 against an
  equal-baseline 0-power control (same `Growl`-style trick as §6, but the
  control needs a type NOT in `AI_CV_AttackDown`'s own physical list this
  time to avoid a different confound — or just reuse `EFFECT_HIT` fillers
  and accept `AI_TryToFaint`'s baseline penalty works IN FAVOR of proving
  the point, since a lower DefenseDown score can only push it further
  behind, not accidentally win). Not staged this session for time.
- **`AI_CV_SpDefDown`** (`:1186-1197`, 1 `if_random_less_than` at `:1190`,
  CBM-blocked): structurally identical to `DefenseDown` (target
  HP-≤70%-gated -2, same deterministic-skip precondition), same recipe
  shape, same "not staged this session" status.

## 8. Phase 2 (named per the brief, sizing evidence only — not staged, not implemented)

The audit's "7 one-roll handlers", corrected `if_random` counts (§3):

| Handler | Effect(s) | Exec moves | `if_random` (corrected) | CBM-blocked? |
| --- | --- | -: | -: | --- |
| `AI_CV_EvasionUp` | `EVASION_UP(_2)`, `MINIMIZE` | 1 | 8 | yes |
| `AI_CV_DefenseUp` | `DEFENSE_UP(_2)`, `BULK_UP` | 5 | 5 | yes |
| `AI_CV_SpDefUp` | `SPECIAL_DEFENSE_UP(_2)`, `COSMIC_POWER`, `CALM_MIND` | 1 | 5 | yes |
| `AI_CV_AttackUp` | `ATTACK_UP(_2)` | 4 | 3 | yes |
| `AI_CV_SpAtkUp` | `SPECIAL_ATTACK_UP(_2)` | 2 | 3 | yes |
| `AI_CV_HighCrit` | `HIGH_CRITICAL`, `BLAZE_KICK`, `POISON_TAIL` | 10 | 2 | **no** |
| `AI_CV_VitalThrow` | `VITAL_THROW` | 1 | 2 | **no** |

`AI_CV_HighCrit` (10 executable moves, CV-only reachable, only 2
`if_random_less_than` sites) is likely the best phase-2 entry point — most
move coverage, no CBM dependency, smallest handler in this bucket.

## 9. Verify script

`tools/probe/verify-factory-ai-checkviability-ground-truth.ts`
(`node --experimental-strip-types tools/probe/verify-factory-ai-checkviability-ground-truth.ts`),
same shape/pattern as `tools/probe/verify-factory-ai-ground-truth.ts`: reruns
both `AI_CV_SpeedDown` fixtures at seeds 1 and 99, twice each, and asserts
PASS/FAIL for: frame-0 determinism, the turn-1 pick (never slot 0 in the
opponent-faster fixture, always slot 0 in the opponent-slower fixture), the
frame-100→732 total `Random()` count (10 / 20 respectively), and cross-seed
count stability. **Run twice this session, ALL PASS both times.**

## 10. Recommendation for the next porter

Given §4's finding, the highest-leverage next slice is **not** the brief's
originally-named 6 (5 of which need a paired CBM handler) but the **5
CV-only-reachable handlers**: `AI_CV_AlwaysHit`, `AI_CV_HighCrit`,
`AI_CV_VitalThrow`, `AI_CV_Pursuit`, `AI_CV_SpeedDown` (via
`AI_CV_SpeedDownFromChance`'s `MOVE_ICY_WIND`/`ROCK_TOMB`/`MUD_SHOT` path,
not `MOVE_STRING_SHOT` directly — §4's footnote). This session's `SpeedDown`
ledger (§6) is immediately usable acceptance evidence for that one; the
other four need their own scenario passes (not attempted this session).
Once a handler in the CBM-blocked 17 is wanted, budget for **both**
`AI_CBM_X` and `AI_CV_X` together, not just the latter — porting only the CV
side leaves the CBM barrier firing first, so the CV code is unreachable and
unverifiable end-to-end against this port until then.

## 11. 2026-07-26 addendum: live staging for the 4 CV-only-reachable handlers named in §10

Follow-up scout session (side lane, Battle Scene OFF), same no-`src/`-changes
contract. Goal: stage the 4 handlers §10 named as the next slice
(`AI_CV_AlwaysHit`, `AI_CV_HighCrit`, `AI_CV_VitalThrow`, `AI_CV_Pursuit`).
**2 of 4 fully staged with live ledgers** (`AI_CV_Pursuit`, `AI_CV_HighCrit`);
the other 2 (`AI_CV_AlwaysHit`, `AI_CV_VitalThrow`) get analytical-only
entries per this doc's own §7 precedent — both need multi-turn state builds
whose staging arithmetic (evasion-stage ladder / HP-band damage) didn't fit
this session's remaining budget on top of the first two, and a fitted
half-built fixture would be worse evidence than an honest recipe.

### 11.0 A new methodology note before the per-handler write-ups

§6's `AI_CV_SpeedDown` fixture used a 0-power dispatch move (`MOVE_STRING_SHOT`)
against a 0-power control (`MOVE_GROWL`) so `AI_TryToFaint`'s "not most
powerful" penalty ties across all 4 slots and the *pick* becomes the clean
decision-visible signal. None of this session's four handlers dispatch off a
0-power move (`AlwaysHit`/`HighCrit`/`VitalThrow`/`Pursuit` all trigger on
real attacking moves, 40-70 power), and no exact power-matched, dispatch-free
"control" move exists in the move table to reuse that exact trick (checked:
no `EFFECT_HIT` move sits at power 70 to pair against `MOVE_SLASH`). The two
staged handlers below instead use **all 4 opponent slots as the SAME
dispatch move** (no pick ambiguity to read at all — the AI always uses that
move, tie-broken by seed among identical slots) and compare **total
`Random()` draws across the whole window** between two twin fixtures that
hold species/moveset/turn-count structurally identical and flip only the
ONE precondition the handler's own script reads (target type for `Pursuit`,
type effectiveness for `HighCrit`). This is a valid substitute causal
isolation (the differential can only come from the one thing that changed),
but it surfaces a real complication worth naming for the next porter:

**Finding: a "total draws in the window" comparison can pick up a phantom
next-decision's contribution, and that phantom decision is sensitive to
whatever *else* varies between the twin fixtures (HP, in particular).**
`docs/factory-ai-checkviability-ground-truth.md` §6 already established that
turn 1's own AI decision is fully resolved *before* frame 0 is ever
captured (unobservable directly), and that a trace's *last* button input
still leaves the *next* turn's decision computed-but-unexecuted inside the
observable window ("turn 2 is decided but never executed"). Both handlers
below hit this: the reachable-branch fixture's total draws exceed the
zero-branch fixture's by **more** than the handler's own single roll would
predict (`Pursuit`: +2, not +1; `HighCrit`: +5/+6, not +1) — the extra comes
from a phantom trailing decision (one further re-scoring of the same
moveset, computed but never executed) landing inside the window too, and,
for `HighCrit` specifically, from that phantom decision's sensitivity to
target HP after turn 1's real (variable, 85-100%-roll) damage — see 11.2's
own note. **Porter guidance:** when the dispatch move has real power, prefer
comparing a `PP-consumed-bounded` window (fixed turn count, confirmed via
the opponent's own PP delta, not a fixed frame count — turn cadence itself
varies with message length, see 11.1) and treat the *shape* of the draw-count
delta (present/stable vs. absent/stable) as the reliable signal, not the
exact number, unless the target's post-hit HP band is also held constant
between fixtures (11.2's own follow-up idea).

### 11.1 `AI_CV_Pursuit` — fully staged, live-verified

```
AI_CV_Pursuit:                          (data/battle_ai_scripts.s:2018-2036)
	is_first_turn_for AI_USER
	if_not_equal 0, AI_CV_Pursuit_End   ; opponent's own isFirstTurn != 0 -> End, 0 draws
	get_target_type1
	if_equal TYPE_GHOST, AI_CV_Pursuit2
	get_target_type1
	if_equal TYPE_PSYCHIC, AI_CV_Pursuit2
	get_target_type2
	if_equal TYPE_GHOST, AI_CV_Pursuit2
	get_target_type2
	if_equal TYPE_PSYCHIC, AI_CV_Pursuit2
	goto AI_CV_Pursuit_End              ; neither type matches -> End, 0 draws

AI_CV_Pursuit2:
	if_random_less_than 128, AI_CV_Pursuit_End  ; always draws once; ~50% no bonus
	score +1
AI_CV_Pursuit_End:
	end
```

`is_first_turn_for` reads `gDisableStructs[battler].isFirstTurn`
(`battle_ai_script_commands.c:2102-2113`), a per-battler counter set to `2`
on send-out (`battle_main.c:3051`, `3220`, `3312`) and decremented by at
most 1 per turn end whenever it's already nonzero
(`TurnValuesCleanUp`, `battle_main.c:4875-4876`) — so it reads `2` during
turn 1's decision, `1` during turn 2's, and `0` from turn 3 onward. The
handler is gated on **the opponent's own** elapsed-turns counter, not the
target's — the check has nothing to do with predicting a target switch
despite Pursuit's real in-game purpose; it only cares that the opponent's
current mon has been out for at least 2 full turns.

**Design:** opponent moveset all 4 slots `MOVE_PURSUIT` (228, 40 power,
`EFFECT_PURSUIT`, no CBM-table entry) — since all 4 are identical there is
no pick to read (any tie-break is uninformative) and no other handler ever
engages (Pursuit is the only dispatch-table move used in either fixture).
Target uses `MOVE_SPLASH` (150) all 3 turns (irrelevant to the opponent's
own precondition, never confounds). Two fixtures differ **only** in the
target's species typing:

- **Reach** (`tools/battle-lab/mechanic-factory-ai-cv-pursuit-ghost-reach-off.json`):
  target = Wobbuffet (species 202, pure Psychic, base HP 190 — picked for
  survivability headroom against 3 real Dark-typed hits at their 2x
  weakness, not for any AI-relevant property). Opponent = Marowak (105,
  pure Ground — no STAB on Pursuit's Dark type, kept out of the picture).
- **Control** (`tools/battle-lab/mechanic-factory-ai-cv-pursuit-normal-control-off.json`):
  same opponent, target = Miltank (241, pure Normal — decent bulk, no
  special interaction with Dark) instead of Wobbuffet. Type is the only
  changed precondition.

**Multi-turn staging mechanic** (new finding this session, useful for any
future multi-turn fixture): the very first button block in a trace dismisses
the battle's own pre-fight intro/send-out messages and does **not** yet
reach the FIGHT menu — a single-decision trace (§6's pattern) works because
its second `A`-pair both opens FIGHT and selects the top move in one
uninterrupted block, but a multi-turn trace needs **continuous** input
throughout each turn's own message-print pacing (a single `[A,A,wait]` block
per turn stalls partway through — confirmed by direct probing: a single
`[A,A]` per turn advanced turns 1-3 but silently stalled turn 4 mid-message).
The robust pattern used for both fixtures here: one initial `A` (intro
dismiss) + `wait 30`, then continuous `[A(2 frames), wait(18 frames)]`
reps (a 20-frame period) for as many frames as needed, followed by a
silent tail. Turn cadence under this constant mash is **not** fixed —
Pursuit-vs-Wobbuffet (super-effective, extra "It's super effective!" message)
averaged ~450 frames/turn; Pursuit-vs-Miltank (neutral, no extra message)
averaged ~340 frames/turn. Each fixture's own mash length was individually
calibrated (confirmed via dense 20-frame-granularity sampling of the PP/HP
trace) to cover **exactly 3 executed turns** — verified directly via the
opponent's own total PP delta (3), not assumed from a shared frame budget.

**Live ledger** (`tools/probe/verify-factory-ai-checkviability-ground-truth.ts`,
frame 0 -> final, `stepsToReach` forward search over `sRandCount`'s implied
LCG steps):

| Fixture | Seed | PP used (turns) | Total `Random()` calls, frame 0->final | Determinism (2 runs) |
| --- | -: | -: | -: | --- |
| Reach (Ghost/Psychic) | 1 | 3 | **32** | identical |
| Reach (Ghost/Psychic) | 99 | 3 | **32** | identical |
| Control (Normal) | 1 | 3 | **30** | identical |
| Control (Normal) | 99 | 3 | **30** | identical |

Both fixtures individually cross-seed-stable (32/32, 30/30). The **+2**
delta (not +1) matches 11.0's phantom-decision finding: within the 3-executed
-turn window, both turn 3's own decision (which executes) and a computed
-but-unexecuted turn 4 re-decision (per §6/11.0's established "next decision
is baked in before its own turn's input" behavior) reach
`AI_CV_Pursuit2`'s roll in the reach fixture (2 draws), neither in control (0)
— consistent, reproducible, and matches the handler's per-reachable-decision
draw count (`if_random_less_than` always draws exactly once when reached,
regardless of outcome) exactly.

### 11.2 `AI_CV_HighCrit` — fully staged, live-verified (with a caveat)

```
AI_CV_HighCrit:                         (data/battle_ai_scripts.s:1449-1461)
	if_type_effectiveness AI_EFFECTIVENESS_x0_25, AI_CV_HighCrit_End
	if_type_effectiveness AI_EFFECTIVENESS_x0_5, AI_CV_HighCrit_End
	if_type_effectiveness AI_EFFECTIVENESS_x2, AI_CV_HighCrit2
	if_type_effectiveness AI_EFFECTIVENESS_x4, AI_CV_HighCrit2
	if_random_less_than 128, AI_CV_HighCrit_End   ; falls through here at 1x (neutral) too

AI_CV_HighCrit2:
	if_random_less_than 128, AI_CV_HighCrit_End
	score +1
AI_CV_HighCrit_End:
	end
```

Real quirk confirmed by direct read (not previously documented): the four
explicit checks only match `0.25x`/`0.5x`/`2x`/`4x` — **neutral (1x) and
immune (0x) effectiveness both fall through the same "no match" path** into
the first `if_random_less_than 128`, which is a **second, independent** 50%
roll from the one inside `AI_CV_HighCrit2` (same threshold value, different
call site — the handler always draws exactly once whenever it's reached at
all, whether via the neutral fallthrough or the super-effective jump).

**Design:** opponent all 4 slots `MOVE_SLASH` (163, 70 power,
`EFFECT_HIGH_CRITICAL`, no CBM-table entry). Opponent = Marowak (105, pure
Ground — no STAB on Slash's Normal type, avoids a STAB-shifted effectiveness
threshold confound). Single turn only (state-independent precondition, same
shape as §6's `SpeedDown` fixtures — no multi-turn build needed):

- **Resisted** (`tools/battle-lab/mechanic-factory-ai-cv-highcrit-resisted-off.json`):
  target = Onix (95, Rock/Ground — Rock resists Normal 0.5x) ->
  deterministic zero-draw branch.
- **Neutral** (`tools/battle-lab/mechanic-factory-ai-cv-highcrit-neutral-off.json`):
  target = Dugtrio (51, pure Ground — no resistance or weakness to Normal)
  -> reachable branch via the fallthrough path above.

**Live ledger** (frame 0 -> 732, §6's own single-turn capture convention —
`[A,wait30,A,wait700]`):

| Fixture | Seed | PP used | Total `Random()` calls | Determinism (2 runs) |
| --- | -: | -: | -: | --- |
| Resisted (Onix, 0.5x) | 1 | 1 | **18** | identical |
| Resisted (Onix, 0.5x) | 99 | 1 | **18** | identical |
| Neutral (Dugtrio, 1x) | 1 | 1 | **23** | identical |
| Neutral (Dugtrio, 1x) | 99 | 1 | **24** | identical |

The resisted branch is unambiguous: stable at 18 across both seeds,
confirming the deterministic-zero claim cleanly (same standard as every
other zero-draw claim in this doc). The neutral branch is **not**
cross-seed-stable (23 vs 24) — both individual values reproduce exactly on
rerun (not noise in the harness), and both sit well above the resisted
fixture's 18 (confirming the roll fires), but the residual 1-count spread
is a real, reproducible finding, not measurement error. Root cause
(diagnosed, not just observed): Dugtrio's much lower Defense than Onix's
means turn 1 deals substantial, RNG-variable real damage (Onix: 110->102
HP, ~7%; Dugtrio: 110->70/68 HP, ~36-38%, itself seed-dependent by 2 HP
between the two banked seeds) — per 11.0's phantom-decision finding, the
window also embeds one further computed-but-unexecuted re-decision, and
*that* decision's own scoring (elsewhere in `AI_TryToFaint`/`AI_CheckBadMove`,
not `AI_CV_HighCrit` itself — its own contribution is a fixed 1-draw-per-
reachable-decision regardless of outcome) is sensitive to the post-turn-1 HP
band, which differs by exactly the 2 HP the two seeds' damage rolls landed
on. **Porter guidance**: a future exact-count claim for `AI_CV_HighCrit`
should either restrict to a window with no phantom decision, or pick a
neutral-effectiveness target with Onix-like bulk (minimal, near-constant
turn-1 damage) to keep the phantom decision's own HP-dependent branches
identical across seeds — swapping the Dugtrio target for a bulkier neutral
mon (a Miltank-class target was tried mid-session and shifted the totals
again, to 14/16 rather than converging on stability, indicating the
sensitivity is to the *exact* HP band crossed rather than "high vs low
damage" broadly, and needs a dedicated follow-up rather than a guess).

### 11.3 `AI_CV_AlwaysHit` — analytical only (not staged this session)

```
AI_CV_AlwaysHit:                        (data/battle_ai_scripts.s:1075-1089)
	if_stat_level_more_than AI_TARGET, STAT_EVASION, 10, AI_CV_AlwaysHit_ScoreUp1
	if_stat_level_less_than AI_USER, STAT_ACC, 2, AI_CV_AlwaysHit_ScoreUp1
	if_stat_level_more_than AI_TARGET, STAT_EVASION, 8, AI_CV_AlwaysHit2
	if_stat_level_less_than AI_USER, STAT_ACC, 4, AI_CV_AlwaysHit2
	goto AI_CV_AlwaysHit_End             ; neither gate -> End, 0 draws

AI_CV_AlwaysHit_ScoreUp1:
	score +1                             ; evasion stage 11-12 or user acc stage 0-1 -> deterministic +1, 0 draws
AI_CV_AlwaysHit2:
	if_random_less_than 100, AI_CV_AlwaysHit_End   ; evasion stage 9-10 or user acc stage 2-3 -> ~61% +1
	score +1
AI_CV_AlwaysHit_End:
	end
```

Stat stages are stored 0-12 (6 = neutral). Both gates read stat *stages*, not
raw values — never true at battle start, needs a prior real stat-changing
move to land. Recipe (untested this session, all pieces verified
individually against source/census):

1. **Dispatch move**: `MOVE_SWIFT` (129, 60 power, `EFFECT_ALWAYS_HIT`, no
   CBM-table entry) — all 4 opponent slots, same "no pick to read, use total
   draws" design as §11.1/11.2 (checked: `EFFECT_ALWAYS_HIT`'s other 5 exec
   moves — Faint Attack, Shadow Punch, Aerial Ace, Magical Leaf, Shock Wave —
   are also all real-power, no 0-power option exists for a pick-based
   design either).
2. **Precondition build**: player (= `AI_TARGET`) uses `MOVE_DOUBLE_TEAM`
   (104, `EFFECT_EVASION_UP`, `setstatchanger STAT_EVASION, 1, FALSE` per
   move — raises the player's own evasion stage by exactly 1, always hits,
   no accuracy check) on turns 1-3, raising evasion 6->7->8->9. Turn 4's
   decision (evasion = 9, `> 8` but not `> 10`) reaches `AI_CV_AlwaysHit2`'s
   random branch — the cheapest reachable-branch precondition of the two
   (the `ScoreUp1` deterministic branch needs evasion stage > 10, i.e. 5
   uses of Double Team, or user accuracy stage < 2, i.e. 5 accuracy-lowering
   hits landed on the opponent — both a longer build than needed for the
   random branch alone).
3. **Damage-safety pick**: target species should be Ghost-typed (e.g.
   Haunter, 93) — Normal-type `MOVE_SWIFT` cannot affect a Ghost target at
   all (`MOVE_RESULT_DOESNT_AFFECT_FOE`, real type immunity — `EFFECT_ALWAYS_HIT`'s
   accuracy-bypass does not bypass type immunity, matching real-game Swift
   trivia), so the target takes **zero** damage across all 4 turns
   regardless of how many are staged — removes the HP-band contamination
   risk §11.2 just diagnosed, for free, before it can happen.
4. **Control fixture**: same opponent/target/turn-count, target moveset
   `MOVE_SPLASH` x4 instead of `MOVE_DOUBLE_TEAM` x4 (evasion stays neutral
   throughout) — twin-fixture design identical to §11.1/11.2.
5. Multi-turn mash mechanic: reuse §11.1's calibrated
   `[A, wait 30, continuous [A(2), wait(18)]]` pattern, individually
   calibrated per fixture via dense sampling to confirm exactly 4 executed
   turns via PP delta before locking in a frame budget.

Not staged this session: this needs a 4-turn build (one more turn than
`AI_CV_Pursuit`'s 3) plus the same per-fixture cadence calibration, which
didn't fit after the two staged handlers above. All of steps 1-4 are
verified individually against source/census this session; only the actual
oracle run + the two fixtures' JSON remain.

### 11.4 `AI_CV_VitalThrow` — analytical only (not staged this session)

```
AI_CV_VitalThrow:                       (data/battle_ai_scripts.s:1536-1546)
	if_target_faster AI_CV_VitalThrow_End        ; target(player) faster -> End, 0 draws
	if_hp_more_than AI_USER, 60, AI_CV_VitalThrow_End   ; opponent's own HP% > 60 -> End, 0 draws
	if_hp_less_than AI_USER, 40, AI_CV_VitalThrow2      ; opponent's own HP% < 40 -> skip straight to the cheap 1-roll path
	if_random_less_than 180, AI_CV_VitalThrow_End       ; only reached at HP in [40,60]: ~70% End, else fall through
AI_CV_VitalThrow2:
	if_random_less_than 50, AI_CV_VitalThrow_End
	score -1
AI_CV_VitalThrow_End:
	end
```

Two preconditions, both real state (no team-build shortcut): the opponent
must be **at or slower than** the target (reuse entry 463's already-ported
`getWhoStrikesFirst`/`effectiveSpeed` semantics via a large base-Speed gap,
e.g. a Shuckle-class opponent vs. a Dugtrio-class target, same species
pairing trick as §6) **and** the opponent's own HP must be ≤ 60% max —
this is the hard part, since it needs the PLAYER to have already damaged the
**opponent** by a known amount on a prior turn (nothing here is player-safe
the way `AlwaysHit`'s Ghost-target trick was — the opponent must take real,
sizeable, variable-roll damage). Recipe sketch (not verified against a live
fixture this session):

1. Turn 1: give the player (in the "opponent slower" role-swapped pairing)
   a single high-power attack that reliably lands the opponent in the
   ≤40% band in one hit (comfortably below 40%, not a knife-edge — the
   `if_hp_less_than USER, 40` gate only needs a comfortable margin, not an
   exact number, since undershooting further than 40% still routes through
   the same cheap 1-roll `AI_CV_VitalThrow2` path). This needs the actual
   Gen-3 damage formula worked out for a specific species/level/move choice
   (attacker Attack stat, defender Defense stat, power, STAB, type
   multiplier, 85-100% roll) to size the hit with enough headroom that even
   a low damage roll still clears 40% remaining-HP, while the high end of
   the roll doesn't risk a stray critical hit fainting the opponent outright
   — tighter arithmetic than any of this session's three species picks
   needed (all of which only needed "clearly survives" or "clearly
   resisted," not a specific banded outcome).
2. Turn 2: re-evaluate the same `MOVE_VITAL_THROW`-carrying (233, 70 power,
   `EFFECT_VITAL_THROW`, priority -1 — irrelevant to `if_target_faster`,
   which is priority-blind per entry 463) moveset; expect the
   `AI_CV_VitalThrow2` roll (a clean 50/256 ≈ 19.5% chance of `score -1`,
   else 0) to fire, 1 draw, matching the corrected count in §3/§5.
3. Control fixture: opponent HP kept ≥60% (no turn-1 damage, e.g. player
   uses `MOVE_SPLASH` turn 1 instead) — deterministic zero-draw branch,
   single turn even (same shape as `HighCrit`'s resisted fixture, no
   multi-turn build needed for this side of the pair).

Not staged this session: needs the actual per-species damage-formula
arithmetic worked out and verified live (the one genuinely new piece of
analysis this handler needs beyond what §6/entry 463 already ported), which
didn't fit alongside the other three handlers' work this session. This is
consistent with §7's own assessment that VitalThrow's siblings (the
CBM-blocked HP-gated handlers) are the more expensive builds in this
handler set — recommend budgeting this one on its own.

### 11.5 Verify script

`tools/probe/verify-factory-ai-checkviability-ground-truth.ts` extended with
a second scenario shape (`DRAW_COUNT_SCENARIOS`, `verifyDrawCountScenario`)
alongside the existing pick-based one — asserts frame-0 determinism, exact
PP-consumed (turn count), and exact per-seed total-draw count for all 4 new
fixtures (§11.1's 2 + §11.2's 2), with cross-seed stability asserted for 3
of the 4 and explicitly *not* asserted for `HighCrit`'s neutral fixture
(§11.2's own documented finding). **Run twice this session, ALL PASS both
times** (existing `SpeedDown` checks unchanged and still passing).
