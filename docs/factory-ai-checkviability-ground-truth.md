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

## 12. 2026-07-26 addendum #2: `AI_CV_AlwaysHit` live-staged; `AI_CV_VitalThrow` pickup point confirmed

Second follow-up scout session (side lane, Battle Scene OFF), same no-`src/`-
changes contract. Recovered and validated a prior session's dropped-mid-work
draft fixtures for `AI_CV_AlwaysHit` (§11.3's own recipe, followed almost
exactly as written); `AI_CV_VitalThrow` (§11.4) was not attempted this
session — its existing recipe remains the accurate pickup point (§12.2 below
explains why it wasn't started, not just "ran out of time").

### 12.1 `AI_CV_AlwaysHit` — fully staged, live-verified, cleanly attributed

Fixtures (both checked in under `tools/battle-lab/`, both level 50):

- **Reach** (`mechanic-factory-ai-cv-alwayshit-evasion-reach-off.json`):
  opponent = Marowak (105, pure Ground), all 4 slots `MOVE_SWIFT` (129, 60
  power, `EFFECT_ALWAYS_HIT`). Target = player's Haunter (93, pure Ghost),
  all 4 slots `MOVE_DOUBLE_TEAM` (104, `EFFECT_EVASION_UP`, always hits, no
  accuracy roll) — raises the player's own evasion stage by 1 per executed
  turn (base 6).
- **Control** (`mechanic-factory-ai-cv-alwayshit-splash-control-off.json`):
  identical opponent/target/species/turn-count; target's moveset is
  `MOVE_SPLASH` (150, `EFFECT_SPLASH`) x4 instead — evasion stays at the
  neutral stage 6 throughout.
- **Why Haunter in both fixtures**: `MOVE_SWIFT` is Normal-type; Ghost is
  immune to Normal regardless of `EFFECT_ALWAYS_HIT`'s accuracy-bypass (real
  in-game Swift trivia, confirmed live — `oppHP`/`playerHP` unchanged across
  every turn in both fixtures below), so neither side's HP ever moves. This
  was §11.3's own point 3, and it removes §11.2's HighCrit-style
  "phantom-decision reads a seed-variable post-hit HP band" confound
  entirely — confirmed live, not just asserted: both seeds' total draw
  counts below are cross-seed-stable, unlike HighCrit's neutral fixture.
- Both moves confirmed `accuracy: 0` in `data/battle_moves.h` (Double Team,
  Swift, and Splash all three) — `Cmd_accuracycheck`/`AccuracyCalcHelper`
  (`battle_script_commands.c:1054-1094,1105-1147`) skip `Random()` entirely
  for all of them, so no accuracy-roll noise enters either fixture.
- Multi-turn mash: reused §11.1's calibrated `[A, wait 30, continuous
  [A(2), wait(18)]]` pattern; reach needed 90 reps (2232 frames total) vs.
  control's 75 (1932 frames) — Double Team's own longer battle message
  ("Foe's HAUNTER's evasiveness rose!") vs. Splash's shorter one
  ("But nothing happened!") shifts turn cadence, same mechanism §11.1 named.
  Both fixtures individually confirmed (live, this session) to execute
  **exactly 4 opponent turns** via PP delta before locking in the frame
  budget — not assumed from the draft.

**Live ledger** (`tools/probe/verify-factory-ai-checkviability-ground-truth.ts`,
frame 0 → final, `stepsToReach` forward search, cross-checked against the
oracle's own `pp`/`statStages[STAT_EVASION]` fields directly):

| Fixture | Seed | Opponent PP used (turns) | Player evasion stage (start→end) | Total `Random()` calls, frame 0→final | Determinism (2 runs) |
| --- | -: | -: | --- | -: | --- |
| Reach (evasion buildup) | 1 | 4 | 6→10 | **44** | identical |
| Reach (evasion buildup) | 99 | 4 | 6→10 | **44** | identical |
| Control (Splash) | 1 | 4 | 6→6 | **36** | identical |
| Control (Splash) | 99 | 4 | 6→6 | **36** | identical |

Both fixtures individually cross-seed-stable (44/44, 36/36) — no HP-band
confound, matching the design's own intent. Delta = **+8**, not the "+1 per
reachable decision" shape §11.0/§11.1/§11.2 assumed for Pursuit/HighCrit.

**Attribution (new instrument use, not just a total-window delta)**: ran the
patched `tools/probe/attribute-factory-ai-random-callers.py` (this session's
`probe-window-override.patch` applied — small additive
`[windowStartExclusive windowEndInclusive]` CLI args, `git apply`d cleanly,
kept) against both fixtures with the window widened to their own full trace
(`0 2232` / `0 1932`, since the default 100-732 single-turn window doesn't
cover a 4-turn build). Per-caller counts are **identical between the two
fixtures except one**:

| Caller function | Reach count | Control count |
| --- | -: | -: |
| `BattleAI_SetupAIData+0x83` | 16 | 16 |
| `BattleTurnPassed+0x157` | 4 | 4 |
| `ChooseMoveOrAction_Singles+0xf7` | 4 | 4 |
| `Cmd_adjustnormaldamage+0x7` | 4 | 4 |
| `Cmd_critcalc+0x127` | 4 | 4 |
| `Cmd_seteffectwithchance+0x81` | 4 | 4 |
| `Cmd_if_random_less_than+0x7` | **8** | **0** |

The entire +8 delta is `Cmd_if_random_less_than` — the exact opcode
implementing `AI_CV_AlwaysHit2`'s `if_random_less_than 100` — with zero
contamination from any other call site. This is a strictly cleaner isolation
than Pursuit/HighCrit got (neither was run through this attribution probe;
their evidence is the total-step delta alone).

**Mechanism (found via the per-tick attribution table, not guessed)**: the
window contains 4 visible opponent decisions (turn 1's own decision predates
frame 0, per §6's established "unobservable before frame 0" finding) at
ticks ~469/929/1389/1849 — corresponding to turns 2 (evasion 7, both gates
false), 3 (evasion 8, both gates still false — needs *strictly* greater than
8), 4 (evasion 9, **reachable**, real/executed), and a phantom 5th
(computed but never executed — same "next decision is baked in" finding as
§6/§11.0 — evasion 10, **also reachable**, since 10 is `>8` and not `>10`).
Only the last two ticks (1389, 1849) show `Cmd_if_random_less_than` hits —
and each shows **4**, not 1: `AI_CheckViability` evaluates the opponent's
own 4 move-slot candidates independently, and since all 4 slots are the
identical `MOVE_SWIFT`, `AI_CV_AlwaysHit` (and its own random roll) runs
once per slot, all 4 with the same result. **2 reachable decisions × 4
identical slots = 8.**

**Porter/next-session caveat (new finding, doesn't touch §11.1/§11.2's own
pinned PASS/FAIL numbers, which are unaffected and still correct
measurements)**: a reachable branch's draw cost scales with the number of
identical dispatch-triggering move slots in the moveset used to build the
fixture, not a flat "1 per decision" — §11.1/§11.2's own prose describing
"exactly once when reached" was never checked at this attribution-probe
granularity (their evidence was the total-step delta alone, +2 and +5/+6
respectively, both consistent with *either* "1 draw × 2 decisions" or some
other combination that happens to sum the same). Given all 4 slots were
also identical single moves in those two fixtures, the same ×4 multiplier
plausibly applies there too and the "+2"/"+5" language undersells the real
per-decision draw count — but re-deriving that is out of this session's
scope (their PASS/FAIL assertions are unaffected either way; this note
exists so a future exact-mechanism claim doesn't inherit an unverified
"1 draw per decision" assumption without re-checking it).

### 12.2 `AI_CV_VitalThrow` — still not staged; pickup point unchanged from §11.4, with one clarification

Not attempted this session (after `AlwaysHit`'s full stage + live attribution
above, the remaining budget did not comfortably fit VitalThrow's own harder
piece — real Gen-3 damage-formula arithmetic sized to land the opponent
in a comfortable `<40%`-remaining band without risking an accidental
crit-faint, §11.4's own point 1 — and a rushed, unverified fixture would be
worse evidence than leaving §11.4's recipe as the accurate next step).

**Confirmed still true, checked again this session**: `MOVE_VITAL_THROW` is
id 233, `EFFECT_VITAL_THROW`, priority **-1** in
`data/battle_moves.h` (no change needed to §11.4's citation); `if_target_faster`
is priority-blind (entry 463's own finding, unchanged). No new source
reading surfaced anything that revises §11.4's recipe sketch — the next
porter should start there: pick a specific attacker/defender species+level
pair, work the exact damage roll band (85-100%, both the low and high ends
of the 3-hit-or-1-hit sizing), and stage turn 1 as a real player move (not a
transient HP injection, which `mechanicLab` doesn't allow per
`tools/battle-lab/README.md`).

**Verify script status**: `tools/probe/verify-factory-ai-checkviability-ground-truth.ts`
extended this session with `AI_CV_AlwaysHit`'s 2 fixtures only (§12.1) —
`SpeedDown`/`Pursuit`/`HighCrit` checks (§9, §11.5) unchanged and still
green. **Run twice this session, ALL PASS both times.** No `AI_CV_VitalThrow`
scenario exists yet — §11.4's recipe remains unexecuted analysis, not a
regression.

## 13. 2026-07-26 addendum #3: `AI_CV_VitalThrow` fully staged and live-verified — the last CV-only handler without ground truth

Third follow-up scout session (side lane, Battle Scene OFF), same no-`src/`-
changes contract. Executed §11.4/§12.2's recipe end to end, with one
correction to the recipe's own prose (below) caught by re-deriving the
precondition from source rather than trusting the prior write-up.

### 13.1 Correction: §11.4's "opponent at or slower than the target" has the polarity backwards

Re-reading `data/battle_ai_scripts.s:1536-1546` and the macro/opcode chain it
expands through:

```
AI_CV_VitalThrow:
	if_target_faster AI_CV_VitalThrow_End        ; branch to End IF target faster
	if_hp_more_than AI_USER, 60, AI_CV_VitalThrow_End
	if_hp_less_than AI_USER, 40, AI_CV_VitalThrow2
	if_random_less_than 180, AI_CV_VitalThrow_End
AI_CV_VitalThrow2:
	if_random_less_than 50, AI_CV_VitalThrow_End
	score -1
AI_CV_VitalThrow_End:
	end
```

`if_target_faster ptr` expands to `if_user_goes 1, ptr`
(`asm/macros/battle_ai_script.inc:595-597`), and
`Cmd_if_user_goes`/`Cmd_if_target_faster`'s underlying comparison,
`GetWhoStrikesFirst(sBattler_AI, gBattlerTarget, TRUE)`
(`battle_ai_script_commands.c:1268-1270`), returns `1` exactly when
`gBattlerTarget` (the AI's target — **the player**) has more effective
speed (`battle_main.c:4725-4728`, the `ignoreChosenMoves=TRUE` path folds
both priorities to 0, so this is a pure current-speed compare, no
`if_target_faster`-vs-priority confound — matches entry 463's own
priority-blind finding, re-confirmed here for this handler specifically).
So `if_target_faster AI_CV_VitalThrow_End` branches to **End (0 draws)
when the TARGET is faster**, meaning **the opposite** of §11.4's own prose
is what actually gates reachability: to get past this line at all, **the
opponent (AI_USER) must be faster than, or equal to, the target** — not
"at or slower." (The `AI_CV_SpeedDown` precedent this recipe's prose
apparently generalized from uses the *same* macro but jumps *forward* to
its own reachable branch on a target-faster match
(`data/battle_ai_scripts.s:1142`, §6's own citation) — opposite polarity
of use, easy to transpose by pattern-matching the macro name alone instead
of re-checking each script's own jump target. This is exactly the kind of
misreading the brief asked this session to re-verify against source rather
than inherit.) The species-pairing *suggestion* itself
(fast opponent / slow target) was actually right for reaching the
interesting branches — only the English description of *why* was
backwards. No equal-speed pairing is used below regardless (a tie would
route `GetWhoStrikesFirst` through its own `Random() & 1` coin-flip,
`battle_main.c:4726`, adding an unrelated confound), so this session's
fixtures sidestep the ambiguity entirely with a clean speed gap.

### 13.2 Design

**Opponent (AI_USER under test)**: Anorith (species 390, level 50, default
IVs 31/EVs 0/nature Hardy) — base stats HP 45/Atk 95/Def 50/Spe 75
(`src/data/pokemon/species_info.h:11009-11035`), giving level-50 stats HP
120/Def 70/Speed 95 (`(2*base+31)*level/100` truncated, +5 for non-HP/+level+10
for HP — the same formula `oracle/battle_lab.py:960-981` computes). Ability
slot 0 is its ONLY ability, `ABILITY_BATTLE_ARMOR`
(`species_info.h:11032`) — chosen deliberately: `Cmd_critcalc`
(`battle_script_commands.c:1277-1281`) short-circuits its own `Random()`
call entirely when the target's ability is Battle Armor/Shell Armor (the
condition is the *first* term of a `&&` chain), so **no critical hit is
possible against Anorith, ever, regardless of roll** — this removes the
crit-driven overshoot risk §11.4's own point 1 flagged (a bare 0.6-0.75×
maxHP hit that lands the target inside the `<40%` band would, if critically
doubled, exceed 100% of maxHP and faint the opponent outright) as a
structural non-issue rather than something to route around statistically.
Moveset: all 4 slots `MOVE_VITAL_THROW` (233, Fighting, power 70, accuracy
100, `EFFECT_VITAL_THROW`, priority -1, no secondary effect —
`data/battle_moves.h`, ID confirmed unchanged per §12.2) — the dispatch
move under test, same "no pick to read" all-identical-slots design as
§11.1/§11.2/§12.1.

**Target (player)**: Machamp (species 68, level 50, same IV/EV/nature
defaults) — base stats HP 90/Atk 130/Spe 55
(`species_info.h:2049-2057`), giving level-50 stats HP 165/Atk 150/Speed 75.
Speed 75 < Anorith's 95 (a clean 20-point gap, no tie) satisfies §13.1's
corrected precondition (**opponent faster**) with zero `Random()` cost from
the speed check itself.

**Turn-1 damage sizing** (the recipe's own hard part): Machamp's `MOVE_VITAL_THROW`
against Anorith (Rock/Bug) — `applyTypeEffectiveness` scales by Rock (2x,
`Fighting`→`Rock` = 20 tenths) then Bug (0.5x, `Fighting`→`Bug` = 5 tenths)
sequentially, net exactly 1.0x with **no truncation loss** (2x-then-halve
of an already-even intermediate value —
`src/data/gen/type-effectiveness.json`); STAB applies (Machamp is
Fighting/Fighting) for a clean 1.5x. Hand-computed via `calculateBaseDamage`'s
own ported formula (`src/engine/damageCalc.ts:150-200`): base damage (Atk
150, power 70, level factor 22, Def 70) = 66, +2 unconditional = 68, ×1.5
STAB (trunc) = 102, ×1.0 type (exact) = 102 pre-random. The 85-100% roll
(`applyRandomDamageMultiplier`, 16 discrete steps) therefore spans
**86 (85%) to 102 (100%)** — against Anorith's 120 max HP, that's remaining
HP **34 down to 18**, i.e. **28% down to 15%** by the source's own truncating
`100*hp/maxHp` (`Cmd_if_hp_less_than`, `battle_ai_script_commands.c:713-725`):
both ends land inside the `<40%` band with comfortable margin from both
edges (0% and 40%), confirmed **live** against the oracle at both banked
seeds (below) — not just the hand computation.

Because Anorith survives comfortably (never below 15%) and the phantom
next-turn re-decision (§11.0/§12.1's own established mechanism — the AI's
next move is computed, but not executed, before a trace's silent tail ends)
already reads the post-turn-1 HP without needing a second real turn to
execute, this fixture reuses `HighCrit`'s **single-turn** capture shape
(`[A, wait 30, A, wait 700]`, `captureFrames [0,100,300,732]`) rather than
`AlwaysHit`'s 4-turn continuous-mash build — turn 1 itself is Anorith's own
deterministic zero-draw branch (100% HP, `if_hp_more_than 60` true), and the
**phantom** turn-2 re-decision is the one that reaches
`AI_CV_VitalThrow2`. No multi-turn mash-calibration mechanic was needed at
all for this handler, contrary to §11.4's own assumption that it would need
one.

**Reach** (`tools/battle-lab/mechanic-factory-ai-cv-vitalthrow-lowhp-reach-off.json`):
player (Machamp) all 4 slots `MOVE_VITAL_THROW` — turn 1 lands the sized hit.

**Control** (`tools/battle-lab/mechanic-factory-ai-cv-vitalthrow-fullhp-control-off.json`):
identical opponent/species/level; player's 4 slots are `MOVE_SPLASH` (150)
instead — Anorith's HP never moves, `if_hp_more_than AI_USER,60` is true,
deterministic zero-draw End. Twin-fixture design, one flipped precondition,
same discipline as every prior handler in §11/§12.

### 13.3 Live ledger (oracle-verified, both seeds, both runs)

| Fixture | Seed | Opponent PP used | Opponent HP (start→end) | Total `Random()` calls, frame 0→732 | Determinism (2 runs) |
| --- | -: | -: | --- | -: | --- |
| Reach (lowhp) | 1 | 1 | 120→32 (26%) | **15** | identical |
| Reach (lowhp) | 99 | 1 | 120→29 (24%) | **15** | identical |
| Control (fullhp) | 1 | 1 | 120→120 (100%) | **9** | identical |
| Control (fullhp) | 99 | 1 | 120→120 (100%) | **9** | identical |

Both fixtures individually cross-seed-stable (15/15, 9/9) — no HighCrit-style
neutral-fixture wobble, matching AlwaysHit's clean result rather than
HighCrit's. Both banked HP endpoints (26%, 24%) land inside `<40%` exactly as
sized, at the two different real damage rolls the two seeds happened to draw
(88 and 91 damage respectively — both inside the hand-computed 86-102 range).

**Attribution** (`tools/probe/attribute-factory-ai-random-callers.py`,
window `0 732`, run via `tools/run-mgba-probe.py`): the **+6** delta (reach
15 vs. control 9) splits cleanly:

| Caller function | Reach count | Control count | Delta |
| --- | -: | -: | -: |
| `BattleAI_SetupAIData+0x83` | 4 | 4 | 0 |
| `BattleTurnPassed+0x157` | 1 | 1 | 0 |
| `ChooseMoveOrAction_Singles+0xf7` | 1 | 1 | 0 |
| `Cmd_critcalc+0x127` | 1 | 1 | 0 |
| `Cmd_if_random_less_than+0x7` | **4** | **0** | **+4** |
| `Cmd_adjustnormaldamage+0x7` | 2 | 1 | +1 |
| `Cmd_seteffectwithchance+0x81` | 2 | 1 | +1 |

`Cmd_if_random_less_than`'s +4 is exactly `AI_CV_VitalThrow2`'s own
`if_random_less_than 50` roll, once per identical `MOVE_VITAL_THROW` slot on
the single reachable (phantom) decision — matching §12's "N identical
slots × 1 reachable decision = N draws" mechanism precisely (here N=4,
decisions=1, vs. AlwaysHit's N=4, decisions=2). The remaining **+1/+1**
(`Cmd_adjustnormaldamage`/`Cmd_seteffectwithchance`) are **not** part of
`AI_CV_VitalThrow` at all — they're the necessary cost of the ONE flipped
precondition itself: Vital Throw actually connecting (real damage roll +
move-script effect-chance check) vs. Splash doing nothing. Unlike
`AlwaysHit`'s Ghost-target trick (§11.3 point 3, zero damage on both sides
by design), `VitalThrow`'s own precondition genuinely requires real damage,
so this small additional confound is structural, not an error — and fully
attributed, not left as an unexplained residual the way Pursuit/HighCrit's
own "+2"/"+5-6" deltas were (§11.0/§11.2, neither run through this
attribution probe). `Cmd_critcalc` firing identically (1) in both fixtures
confirms it's Anorith's own outgoing `MOVE_VITAL_THROW` hitting Machamp
(whose ability has no crit immunity) — present in both fixtures regardless
of the flipped precondition, correctly canceling in the diff.

### 13.4 Verify script status

`tools/probe/verify-factory-ai-checkviability-ground-truth.ts` extended
this session with `AI_CV_VitalThrow`'s 2 fixtures (§13.2/§13.3) —
`SpeedDown`/`Pursuit`/`HighCrit`/`AlwaysHit` checks (§9, §11.5, §12.1)
unchanged and still green. **Run twice this session, ALL PASS both times.**
This closes out the brief's own count: all 22 reachable `AI_CV_*` handlers
now have either a live-staged fixture (the 6 covered across §6/§11/§12/§13)
or a documented CBM-blocked/analytical status (§5/§7/§8) — `AI_CV_VitalThrow`
was the last CV-only-reachable handler without ground truth.

## 14. 2026-07-26 addendum #4: `AI_CBM_AttackDown` + `AI_CV_AttackDown` — the first CBM-blocked pair, fully staged and live-verified

Fourth follow-up scout session (side lane, Battle Scene OFF), same no-`src/`-
changes contract. Goal per this step's brief: bank ground truth for the
**first CBM-blocked pair** (`AI_CBM_AttackDown` + `AI_CV_AttackDown`) —
entry 463's already-ported SpeedDown pair is the only other CBM+CV pair with
live ground truth; §4 named 17 of 22 reachable `AI_CV_*` handlers as
CBM-blocked, and this is the first of those 17 to get a twin-fixture
treatment.

### 14.1 Both real bodies, cited and fully parsed

```
AI_CBM_AttackDown:                      (data/battle_ai_scripts.s:277-281)
	if_stat_level_equal AI_TARGET, STAT_ATK, MIN_STAT_STAGE, Score_Minus10  ; target ATK stage == 0 -> -10, end
	get_ability AI_TARGET                                                   ; DRAW SITE (conditional, see §14.2)
	if_equal ABILITY_HYPER_CUTTER, Score_Minus10                            ; target ability == Hyper Cutter -> -10, end
	goto CheckIfAbilityBlocksStatChange

CheckIfAbilityBlocksStatChange:         (data/battle_ai_scripts.s:308-312, shared tail)
	get_ability AI_TARGET                                                   ; DRAW SITE (conditional, see §14.2)
	if_equal ABILITY_CLEAR_BODY, Score_Minus10
	if_equal ABILITY_WHITE_SMOKE, Score_Minus10
	end                                                                      ; neither -> 0, end
```

Zero `if_random_less_than` instructions anywhere in `AI_CBM_AttackDown` or
its shared tail — every branch is a deterministic stat-stage/ability
compare. `MIN_STAT_STAGE`/`DEFAULT_STAT_STAGE`/`MAX_STAT_STAGE` = 0/6/12
(`include/constants/pokemon.h:89-91`); `Score_Minus10`
(`data/battle_ai_scripts.s:620-622`) is `score -10; end`.

```
AI_CV_AttackDown:                       (data/battle_ai_scripts.s:1090-1123)
	if_stat_level_equal AI_TARGET, STAT_ATK, DEFAULT_STAT_STAGE, AI_CV_AttackDown3  ; :1091 Gate A
	score -1
	if_hp_more_than AI_USER, 90, AI_CV_AttackDown2                                  ; :1093 Gate B (opponent's OWN hp)
	score -1
AI_CV_AttackDown2:
	if_stat_level_more_than AI_TARGET, STAT_ATK, 3, AI_CV_AttackDown3               ; :1096 Gate C
	if_random_less_than 50, AI_CV_AttackDown3                                       ; :1097 DRAW SITE 1
	score -2
AI_CV_AttackDown3:
	if_hp_more_than AI_TARGET, 70, AI_CV_AttackDown4                                ; :1100 Gate D (target hp)
	score -2
AI_CV_AttackDown4:
	get_target_type1
	if_in_bytes AI_CV_AttackDown_PhysicalTypeList, AI_CV_AttackDown_End             ; :1104 Gate E (type1)
	get_target_type2
	if_in_bytes AI_CV_AttackDown_PhysicalTypeList, AI_CV_AttackDown_End             ; :1106 Gate F (type2)
	if_random_less_than 50, AI_CV_AttackDown_End                                    ; :1107 DRAW SITE 2
	score -2
AI_CV_AttackDown_End:
	end
```

Exactly **2** `if_random_less_than` sites (`:1097`, `:1107`), matching §3's
corrected count. Full branch enumeration (all 6 gates, both draw sites):

- **Gate A** (`:1091`): target ATK stage == `DEFAULT_STAT_STAGE` (6, a fresh
  battler's own starting value) jumps straight to `AI_CV_AttackDown3`,
  **skipping Gates B/C and DRAW SITE 1 entirely** — this is the
  precondition-never-true-at-battle-start idiom §3 already named for this
  handler's family. Only a battler whose ATK stage has already been changed
  (by an earlier real stat-changing move) reaches Gate B/C/DRAW SITE 1 at
  all.
- **Gate B** (`:1093`, only reached if Gate A's stage != 6): opponent's
  (`AI_USER`'s) own HP > 90% skips a second `-1`; otherwise an extra `-1`
  applies. Doesn't gate reachability of anything downstream — a straight-
  line fallthrough either way.
- **Gate C** (`:1096`, same precondition as B): target ATK stage > 3 skips
  DRAW SITE 1; only stages 0-3 (already lowered, and, since Gate A already
  excluded stage 6, this also silently excludes stages 7-12 raised-but-
  under-4-away-from-max via the same `> 3` test) reach the roll.
- **DRAW SITE 1** (`:1097`): 50/256 (~19.5%) skip, else (~80.5%) `score -2`.
  Reachable only when the target's ATK stage is already in [0,3] — a 2-turn
  build (a real Attack-lowering move must land on the target first), not
  staged this session; recipe unchanged from §7's own `AI_CV_AttackDown`
  entry.
- **Gate D** (`:1100`): target HP > 70% skips a `-2`, else applies it — like
  Gate B, a straight-line fallthrough, doesn't gate reachability of
  anything past it (always continues to `AI_CV_AttackDown4` regardless).
- **Gates E/F** (`:1104`/`:1106`): target type1 OR type2 in
  `AI_CV_AttackDown_PhysicalTypeList` (Normal/Fighting/Ground/Rock/Bug/Steel,
  `:1115-1122` — Flying/Poison/**Ghost** conspicuously left out, source's own
  comment at `:1112-1114`) jumps straight to `End` with **zero** further
  draws. This is the **only** gate that is both state-independent (knowable
  from species typing alone, no multi-turn build) and fully decisive for
  DRAW SITE 2's reachability — the one this session's twin fixtures isolate.
- **DRAW SITE 2** (`:1107`, reached only if neither Gate E nor F matched):
  50/256 (~19.5%) skip, else (~80.5%) `score -2`.

### 14.2 A new confound found live, and why it doesn't touch this handler's own port: `Cmd_get_ability`'s ability-guessing roll

`get_ability AI_TARGET` appears **twice** in `AI_CBM_AttackDown`'s own body
(once directly, once in the shared `CheckIfAbilityBlocksStatChange` tail
every non-Score_Minus10 path reaches). `Cmd_get_ability`
(`battle_ai_script_commands.c:1350-1377`) is **not** a fixed-cost read: when
querying a battler other than the AI's own (`AI_TARGET`, here), if the
target's ability hasn't been revealed yet this battle
(`BATTLE_HISTORY->abilities[battler] == 0`) and its real ability isn't one
of three "always inferrable" ones (`ABILITY_SHADOW_TAG`/`MAGNET_PULL`/
`ARENA_TRAP` — abilities that prevent fleeing, checked directly against the
real ability with no draw), the AI **guesses**: if the species has exactly
one possible ability (`abilities[1] == ABILITY_NONE`), the guess is free
(deterministic, zero draws); if it has **two**, `Random() & 1` picks one of
the two **every single call, uncached** (`:1382-1385`).

This is real, source-confirmed behavior, not a porting bug — and it's
**already correctly ported** as `nextGetAbilityDraw`/`checkAbilityAiTarget`
in `src/engine/factoryAiCheckBadMove.ts` (`:177-244`, entry 463's own
SpeedDown-pairing work, which needed the same helper for
`AI_CBM_SpeedDown`'s `if_ability AI_TARGET, ABILITY_SPEED_BOOST`). A future
`AI_CBM_AttackDown` port needs **zero new RNG machinery** — both of its
`get_ability` sites are direct call sites into this already-existing helper.

**Found live, the hard way**: an early draft of this session's control
fixture used Dugtrio (pure Ground, `{SAND_VEIL, ARENA_TRAP}` — two
abilities, and its assigned real ability turned out to be Sand Veil, not the
directly-inferrable Arena Trap) as the physical-type-list target. The
attribution probe showed **12** extra `Cmd_get_ability`-attributed draws
versus the eventual Haunter-target fixture — entirely unrelated to
`AI_CV_AttackDown`'s own gates, and large enough to flip which fixture had
the *higher* raw total (the Dugtrio draft totaled 19 against Haunter's 11,
the *opposite* direction from what `AI_CV_AttackDown`'s own reachable-branch
delta predicts). Swapping the control target to Shuckle (Bug/Rock, `{STURDY,
NONE}` — one ability, zero-draw guess) collapsed this to zero and produced
the clean isolation in §14.3/§14.4 below. **Porter guidance**: any future
CBM-blocked-pair fixture that stages `AI_TARGET`'s ability path (most of the
CBM handlers do — Attack/Defense/Speed/SpAtk/SpDef Down/Up all call
`get_ability` or `if_ability` on the target) should pick single-ability
species for any battler whose ability isn't the thing under test, exactly
as `AlwaysHit`'s Ghost-target trick (§11.3 point 3) did for a different
confound (type immunity) — same discipline, new confound source.

### 14.3 Design: twin fixtures isolating Gates E/F, CBM held unreached throughout

Both fixtures keep the target's ATK stat stage at `DEFAULT_STAT_STAGE` (a
fresh battle's own value, no staging needed) so:

- `AI_CV_AttackDown`'s own Gate A skips straight to `AI_CV_AttackDown3` —
  **DRAW SITE 1 is unreached in both fixtures by construction** (this pair
  isolates DRAW SITE 2 only; DRAW SITE 1 remains an unstaged 2-turn recipe,
  unchanged from §7).
- `AI_CBM_AttackDown`'s own `MIN_STAT_STAGE` gate never fires (stage is 6,
  not 0).

Target ability is neither Hyper Cutter, Clear Body, nor White Smoke in
either fixture (both Haunter and Shuckle's real abilities are Levitate/
Sturdy respectively) — `AI_CBM_AttackDown`'s two `Score_Minus10` branches
stay unreached in both fixtures too, so **CBM's own contribution is a flat,
identical 0 in both** and the entire observable delta is `AI_CV_AttackDown`'s
own.

Opponent (`AI_USER`, both fixtures): Marowak (105, pure Ground — ability
irrelevant here, only `AI_TARGET`'s is ever read), all 4 slots `MOVE_GROWL`
(45, `EFFECT_ATTACK_DOWN`, 0 power, accuracy 100 — `src/data/battle_moves.h:
588-599`) — identical-slots design, no pick ambiguity, same as
§11.1/§11.2/§12.1/§13.2. Single executed turn (state-independent
precondition, `HighCrit`/`VitalThrow`'s own single-turn capture shape,
`[A, wait 30, A, wait 700]`, `captureFrames [0,100,300,732]`).

- **Reach** (`tools/battle-lab/mechanic-factory-ai-cv-attackdown-nonphysical-reach-off.json`):
  target = Haunter (93, Ghost/Poison — **neither** type is in
  `AI_CV_AttackDown_PhysicalTypeList`, Ghost being one of the three types the
  source's own comment names as conspicuously left out) — falls through
  Gates E/F into DRAW SITE 2.
- **Control** (`tools/battle-lab/mechanic-factory-ai-cv-attackdown-physical-control-off.json`):
  target = Shuckle (213, Bug/Rock — **both** types are in the physical
  list) — Gate E matches immediately on type1, deterministic zero-draw
  `End`.

Growl's own accuracy (100, not the special "always hits" 0 value used by
Swift/Double Team/Splash in §12.1) does draw one `Cmd_accuracycheck` roll
per executed turn in both fixtures — confirmed identical (1 each) by the
attribution probe below, so it cancels cleanly in the diff and doesn't
contaminate the isolation, unlike VitalThrow's own real-damage confound
which needed explicit accounting (§13.3) rather than simply canceling.

### 14.4 Live ledger (oracle-verified, both seeds, both runs)

| Fixture | Seed | Opponent PP used | Player ATK stage (start→end) | Total `Random()` calls, frame 0→732 | Determinism (2 runs) |
| --- | -: | -: | --- | -: | --- |
| Reach (Haunter, non-physical) | 1 | 1 | 6→5 | **11** | identical |
| Reach (Haunter, non-physical) | 99 | 1 | 6→5 | **11** | identical |
| Control (Shuckle, physical) | 1 | 1 | 6→5 | **7** | identical |
| Control (Shuckle, physical) | 99 | 1 | 6→5 | **7** | identical |

Both fixtures individually cross-seed-stable (11/11, 7/7) — clean, matching
`AlwaysHit`/`VitalThrow`'s own attribution-confirmed determinism rather than
`HighCrit`'s neutral-fixture wobble. Growl's own stat-lowering effect lands
in **both** fixtures (ATK stage 6→5 either way — Ghost is immune to
*damaging* Normal-type moves, not Normal-type status effects; a live-
confirmed distinct fact from `AlwaysHit`'s Swift-vs-Ghost damage immunity,
§11.3 point 3), so the type-list gate's effect is on `AI_CV_AttackDown`'s
own *score*, never on whether Growl actually executes.

**Attribution** (`tools/probe/attribute-factory-ai-random-callers.py`,
window `0 732`, run via `tools/run-mgba-probe.py`, seed 1): the **+4** delta
(reach 11 vs. control 7) is:

| Caller function | Reach count | Control count | Delta |
| --- | -: | -: | -: |
| `BattleAI_SetupAIData+0x83` | 4 | 4 | 0 |
| `BattleTurnPassed+0x157` | 1 | 1 | 0 |
| `ChooseMoveOrAction_Singles+0xf7` | 1 | 1 | 0 |
| `Cmd_accuracycheck+0x305` | 1 | 1 | 0 |
| `Cmd_if_random_less_than+0x7` | **4** | **0** | **+4** |

Every non-`AI_CV_AttackDown` caller is identical between fixtures —
`Cmd_get_ability` doesn't appear in **either** table (both targets have a
single assignable ability, confirming §14.2's fix). `Cmd_if_random_less_than`'s
+4 is exactly `AI_CV_AttackDown`'s own `:1107` roll, once per identical
`MOVE_GROWL` slot on the single reachable decision (N=4 slots × 1 decision ×
1 draw = 4) — a cleaner, single-decision instance of the "N identical slots"
mechanism §12/§13 established (no phantom next-turn decision shows up in
this window, unlike Pursuit/HighCrit/AlwaysHit/VitalThrow's own trailing
computed-but-unexecuted re-decision — not investigated further this
session, since the reachable-branch signal is already unambiguous without
it).

### 14.5 What this unblocks

Two things, per this step's own brief:

1. **The pair's own port**: a future porter has both handlers' exact
   instruction lists, every gate's real preconditions, both draw sites'
   exact odds, the `get_ability` reuse point (§14.2, zero new machinery
   needed), and a live-verified twin fixture proving `AI_CV_AttackDown`'s
   Gate E/F contribution end-to-end — the same completeness `AI_CV_SpeedDown`
   got from entry 463's own CBM+CV pairing (the only other pair with this
   level of live evidence).
2. **§6's own `AI_CV_SpeedDown` fixtures becoming engine-reproducible**:
   those two fixtures' opponent movesets are `[MOVE_STRING_SHOT, MOVE_GROWL,
   MOVE_GROWL, MOVE_GROWL]` — three of the four candidate slots are Growl,
   whose effect (`EFFECT_ATTACK_DOWN`) is CBM-table-covered
   (`data/battle_ai_scripts.s:115`). Until *both* `AI_CBM_AttackDown` and
   `AI_CV_AttackDown` are ported, `chooseFactoryAiScoredDecision` cannot
   score those three Growl candidates at all (each hits the
   `unsupported-branch: factory-ai-check-bad-move` barrier) — so §6's own
   fixtures, despite being live-verified against the oracle since this
   step's own predecessor session, are **not yet** reproducible end-to-end
   through the engine's public API the way §11.1/§12.1's
   `chooseFactoryAiScoredDecision` reproduction tests are for Pursuit/
   AlwaysHit (entry 466/467's own precedent). This pair's port closes that
   gap directly.

### 14.6 Verify script status

`tools/probe/verify-factory-ai-checkviability-ground-truth.ts` extended
this session with `AI_CV_AttackDown`'s 2 fixtures (§14.3/§14.4) —
`SpeedDown`/`Pursuit`/`HighCrit`/`AlwaysHit`/`VitalThrow` checks (§9, §11.5,
§12.1, §13.4) unchanged and still green. **Run twice this session, ALL PASS
both times.** DRAW SITE 1 (`:1097`, the ATK-stage-already-changed branch)
remains unstaged — same 2-turn recipe as §7's own `AI_CV_AttackDown` entry,
not attempted this session (time-capped after the Gate E/F pair + the
`get_ability` confound diagnosis/fix above); a bonus fixture proving
`AI_CBM_AttackDown`'s own `Score_Minus10` branch firing live (e.g. a Clear-
Body-ability physical-type target) was scoped by this step's brief as a
stretch goal but not staged this session for the same reason.

## 15. 2026-07-26 addendum #5: `AI_CBM_DefenseDown` + `AI_CV_DefenseDown` — second CBM-blocked pair, fully staged and live-verified

Fifth follow-up scout session (side lane, Battle Scene OFF), same no-`src/`-
changes contract. Goal per this step's brief: bank ground truth for the next
CBM-blocked pair in priority order, `AI_CBM_DefenseDown` + `AI_CV_DefenseDown`
(mandatory rung). Unlike `AttackDown` (§14), this pair's draw site turns out
to be gated by the **opponent's own HP**, not the target's stat stage — the
same shape as `AI_CV_VitalThrow` (§13), which made the existing
Anorith/Machamp species pairing directly reusable with **zero new
damage-formula arithmetic**.

### 15.1 Both real bodies, cited and fully parsed

```
AI_CBM_DefenseDown:                     (data/battle_ai_scripts.s:283-285)
	if_stat_level_equal AI_TARGET, STAT_DEF, MIN_STAT_STAGE, Score_Minus10  ; target DEF stage == 0 -> -10, end
	goto CheckIfAbilityBlocksStatChange

CheckIfAbilityBlocksStatChange:         (data/battle_ai_scripts.s:308-312, shared tail)
	get_ability AI_TARGET                                                   ; DRAW SITE (conditional, see §14.2's mechanism)
	if_equal ABILITY_CLEAR_BODY, Score_Minus10
	if_equal ABILITY_WHITE_SMOKE, Score_Minus10
	end                                                                      ; neither -> 0, end
```

Zero `if_random_less_than` instructions in `AI_CBM_DefenseDown` or its shared
tail (same as `AI_CBM_AttackDown`, §14.1). Unlike `AI_CBM_AttackDown`,
`AI_CBM_DefenseDown`'s own body has **no direct `get_ability` call** — it
`goto`s straight to the shared tail, so `Cmd_get_ability`'s ability-guess
confound (§14.2) can fire **at most once** per candidate slot here (vs. up to
twice for `AttackDown`), but the mechanism and the single-ability-species
mitigation are identical.

```
AI_CV_DefenseDown:                      (data/battle_ai_scripts.s:1124-1134)
	if_hp_less_than AI_USER, 70, AI_CV_DefenseDown2                 ; :1125 Gate A (opponent's OWN hp)
	if_stat_level_more_than AI_TARGET, STAT_DEF, 3, AI_CV_DefenseDown3  ; :1126 Gate B (only reached if Gate A false)
AI_CV_DefenseDown2:
	if_random_less_than 50, AI_CV_DefenseDown3                       ; :1128 DRAW SITE
	score -2
AI_CV_DefenseDown3:
	if_hp_more_than AI_TARGET, 70, AI_CV_DefenseDown_End             ; :1131 Gate C (target's OWN hp)
	score -2
AI_CV_DefenseDown_End:
	end
```

Exactly **1** `if_random_less_than` site (`:1128`), matching §3/§5's corrected
count. Full branch enumeration:

- **Gate A** (`:1125`): opponent's (`AI_USER`'s) own HP < 70% jumps straight
  into `AI_CV_DefenseDown2` — **the draw site is reached unconditionally**,
  bypassing Gate B entirely. This is the cheap path (real prior-turn damage
  to the AI's own mon, no stat-stage build needed) — the same shape as
  `AI_CV_VitalThrow`'s own HP-gated reachability (§13), not `AttackDown`'s
  target-stat-stage gate (§14).
- **Gate B** (`:1126`, only reached if Gate A is false, i.e. opponent HP ≥
  70%): target's (`AI_TARGET`'s) own DEF stat stage > 3. **True by default**
  at battle start (stage 6) — falls straight through to `AI_CV_DefenseDown3`,
  **skipping the draw site entirely, 0 draws**. Only a target whose DEF stage
  has already dropped to 0-3 reaches the roll via this second path (not
  needed for this session's fixtures, since Gate A alone suffices).
- **DRAW SITE** (`:1128`): 50/256 (~19.5%) skip to `AI_CV_DefenseDown3`
  (0 further draws, 0 additional score from this site), else (~80.5%)
  `score -2`.
- **Gate C** (`:1131`, always reached once past the draw site or Gate B's
  skip): target's (`AI_TARGET`'s) own HP > 70% skips a further deterministic
  `-2`; otherwise applies it. Orthogonal to the draw site's own reachability
  — a straight-line fallthrough either way, held constant (always true, both
  fixtures' target never takes damage) in this session's design so it can't
  confound the isolation.

### 15.2 Design: twin fixtures isolating Gate A, reusing §13's Anorith/Machamp pairing verbatim

Both fixtures hold the target's (`AI_TARGET` = player, Machamp) DEF stat
stage at its default value throughout (no player stat-lowering move is ever
used) — Gate B is irrelevant to this pair's isolation (Gate A alone decides
reachability in both fixtures), and `AI_CBM_DefenseDown`'s own
`MIN_STAT_STAGE` gate never fires (Machamp's DEF stage never reaches 0).

Opponent (`AI_USER`, under test, both fixtures): **Anorith** (species 390,
level 50, same defaults as §13.2 — base stats HP 45/Atk 95/Def 50/Spe 75,
level-50 HP 120/Def 70; ability slot 0 `ABILITY_BATTLE_ARMOR`, the species'
*only* ability), all 4 slots `MOVE_LEER` (43, Normal, 0 power, accuracy 100,
`EFFECT_DEFENSE_DOWN`, CBM-table-covered, `data/battle_moves.h:562-573`) —
identical-slots design, no pick ambiguity, same discipline as every prior
handler pair.

Target (player, both fixtures): **Machamp** (species 68, same as §13.2 — base
stats HP 90/Atk 130/Spe 55, level-50 HP 165; `.abilities = {ABILITY_GUTS,
ABILITY_NONE}` — a **single** assignable ability, chosen deliberately per
§14.2's confound: `CheckIfAbilityBlocksStatChange`'s `get_ability AI_TARGET`
call would otherwise draw a live `Random() & 1` guess every candidate slot).

**Turn-1 damage reuse**: this session verified live (not just cited) that
Machamp's `MOVE_VITAL_THROW` against Anorith reproduces §13.3's own damage
band — reach fixture's opponent HP lands at **22/120 (18%)** (seed 1) and
**30/120 (25%)** (seed 99), both comfortably under the `if_hp_less_than
USER,70` gate (a much wider, easier-to-hit band than `VitalThrow`'s own
`<40%` target, so no re-derivation of the damage arithmetic was needed —
§13.2's 86-102 damage range against Anorith's 120 max HP lands at 15-28%
remaining regardless, satisfying `<70%` with large margin from both edges).
Anorith's Battle Armor blocks `Cmd_critcalc`'s `Random()` call entirely
(§13.2's own citation, re-confirmed live below), so no stray-crit overshoot
risk here either. `MOVE_LEER`'s own 0 power means the opponent's own outgoing
attack never touches Machamp's HP (kept at 100% in both fixtures throughout
— Gate C therefore reads identically true in both, a controlled constant,
not a confound).

Single executed turn (`AI_CV_VitalThrow`/`AI_CV_AttackDown`'s own single-turn
capture shape, `[A, wait 30, A, wait 700]`, `captureFrames [0,100,300,732]`):
turn 1's own decision reflects pre-turn state (opponent at 100% HP in both
fixtures, Gate A false, Gate B true by default — 0 draws for turn 1 itself,
matching every prior handler's "turn 1 predates its own damage" finding).
Only the **phantom** turn-2 re-decision (computed but never executed, per
§6/§11.0's established mechanism) reads the post-turn-1 HP:

- **Reach** (`tools/battle-lab/mechanic-factory-ai-cv-defensedown-lowhp-reach-off.json`):
  player (Machamp) all 4 slots `MOVE_VITAL_THROW` (233) — turn 1 lands the
  sized hit, dropping Anorith below 70%; the phantom decision's Gate A fires
  true, reaching the draw site.
- **Control** (`tools/battle-lab/mechanic-factory-ai-cv-defensedown-fullhp-control-off.json`):
  identical opponent/species/level; player's 4 slots are `MOVE_SPLASH` (150)
  instead — Anorith's HP never moves, Gate A stays false, Gate B (Machamp's
  DEF stage, untouched at 6) stays true, deterministic zero-draw skip.

### 15.3 Live ledger (oracle-verified, both seeds, both runs)

| Fixture | Seed | Opponent PP used | Opponent HP (start→end) | Total `Random()` calls, frame 0→732 | Determinism (2 runs) |
| --- | -: | -: | --- | -: | --- |
| Reach (lowhp) | 1 | 1 | 120→22 (18%) | **13** | identical |
| Reach (lowhp) | 99 | 1 | 120→30 (25%) | **13** | identical |
| Control (fullhp) | 1 | 1 | 120→120 (100%) | **7** | identical |
| Control (fullhp) | 99 | 1 | 120→120 (100%) | **7** | identical |

Both fixtures individually cross-seed-stable (13/13, 7/7) — clean, matching
`AlwaysHit`/`VitalThrow`/`AttackDown`'s own attribution-confirmed determinism.
Player HP stays 165→165 (100%) in every run (Leer's 0 power, confirming Gate
C never contaminates the isolation).

**Attribution** (`tools/probe/attribute-factory-ai-random-callers.py`, window
`0 732`, run via `tools/run-mgba-probe.py`, seed 1): the **+6** delta (reach
13 vs. control 7) splits cleanly:

| Caller function | Reach count | Control count | Delta |
| --- | -: | -: | -: |
| `BattleAI_SetupAIData+0x83` | 4 | 4 | 0 |
| `BattleTurnPassed+0x157` | 1 | 1 | 0 |
| `ChooseMoveOrAction_Singles+0xf7` | 1 | 1 | 0 |
| `Cmd_accuracycheck+0x305` | 1 | 1 | 0 |
| `Cmd_if_random_less_than+0x7` | **4** | **0** | **+4** |
| `Cmd_adjustnormaldamage+0x7` | 1 | 0 | +1 |
| `Cmd_seteffectwithchance+0x81` | 1 | 0 | +1 |

`Cmd_get_ability` doesn't appear in either table — confirming Machamp's
single assignable ability collapses the §14.2 confound to zero here too.
`Cmd_if_random_less_than`'s +4 is exactly `AI_CV_DefenseDown`'s own `:1128`
roll, once per identical `MOVE_LEER` slot on the single reachable (phantom)
decision (N=4 slots × 1 decision × 1 draw = 4) — the same "N identical slots"
mechanism as §12/§13/§14. The remaining **+1/+1**
(`Cmd_adjustnormaldamage`/`Cmd_seteffectwithchance`) are **not** part of
`AI_CV_DefenseDown` — exactly like §13.3's own finding for `VitalThrow`, this
is the necessary cost of the ONE flipped precondition itself (Vital Throw
actually connecting for real damage vs. Splash doing nothing), fully
attributed rather than left as an unexplained residual. `Cmd_critcalc` does
**not** appear in either fixture's table at all (unlike §13.3, where it
appeared as a 1/1 canceling entry from Anorith's own outgoing `MOVE_VITAL_THROW`)
— here Anorith's own move is `MOVE_LEER` (a 0-power status move, no crit
calc ever runs for it), and Machamp (Battle Armor-immune Anorith is only ever
the *defender* of the one real hit) has no crit-immunity ability of its own,
but Vital Throw's own crit roll against Anorith is unconditionally
short-circuited by Anorith's Battle Armor before `Random()` is ever called —
so this fixture pair has **zero** crit-related draws in either direction,
one confound fewer than `VitalThrow`'s own twin fixtures needed to account
for.

### 15.4 What this unblocks

1. **The pair's own port**: a future porter has both handlers' exact
   instruction lists, every gate's real precondition, the draw site's exact
   odds, the shared-tail `get_ability` reuse point (identical machinery to
   §14.2, zero new RNG code needed), and a live-verified twin fixture proving
   `AI_CV_DefenseDown`'s Gate A contribution end-to-end.
2. **Confirms the "N identical slots" mechanism generalizes across a third,
   structurally-different gate shape** (opponent's-own-HP-gated, not
   target-stat-stage-gated like `AttackDown`, not target-type-gated like
   `Pursuit`/`HighCrit`) — the draw-site delta is +4 (N=4 slots × 1
   reachable decision), exactly as `AttackDown`'s own single-decision case
   predicted, reinforcing that this is a general property of
   `AI_CheckViability`'s per-slot independent re-scoring, not an artifact of
   any one handler's specific gate structure.

### 15.5 Verify script status

`tools/probe/verify-factory-ai-checkviability-ground-truth.ts` extended this
session with `AI_CV_DefenseDown`'s 2 fixtures (§15.2/§15.3) —
`SpeedDown`/`Pursuit`/`HighCrit`/`AlwaysHit`/`VitalThrow`/`AttackDown` checks
(§9, §11.5, §12.1, §13.4, §14.6) unchanged and still green. **Run twice this
session, ALL PASS both times.** DefenseDown's own Gate B path (target DEF
stage already ≤3) remains unstaged — not needed for this pair's isolation
(Gate A alone suffices, cheaper than `AttackDown`'s own 2-turn Gate-A-stage
recipe) and out of this session's scope.

## 16. 2026-07-26 addendum #6: `AI_CBM_SpDefDown` + `AI_CV_SpDefDown` — third CBM-blocked pair, fully staged and live-verified

Stretch goal per this step's brief, landed in the same session as §15.
`AI_CV_SpDefDown` (`data/battle_ai_scripts.s:1186-1196`) is byte-for-byte the
same control-flow shape as `AI_CV_DefenseDown` (§15.1) with `STAT_DEF`
swapped for `STAT_SPDEF`, and `AI_CBM_SpDefDown` (`:296-298`) is the same
shape as `AI_CBM_DefenseDown` (no direct `get_ability` call, `goto`s straight
to the shared `CheckIfAbilityBlocksStatChange` tail) — so this pair reuses
§15's entire fixture design verbatim, substituting only the dispatch move.

### 16.1 Both real bodies, cited and fully parsed

```
AI_CBM_SpDefDown:                       (data/battle_ai_scripts.s:296-298)
	if_stat_level_equal AI_TARGET, STAT_SPDEF, MIN_STAT_STAGE, Score_Minus10  ; target SPDEF stage == 0 -> -10, end
	goto CheckIfAbilityBlocksStatChange

CheckIfAbilityBlocksStatChange:         (data/battle_ai_scripts.s:308-312, shared tail)
	get_ability AI_TARGET                                                     ; DRAW SITE (conditional, §14.2/§15.1)
	if_equal ABILITY_CLEAR_BODY, Score_Minus10
	if_equal ABILITY_WHITE_SMOKE, Score_Minus10
	end                                                                        ; neither -> 0, end
```

Zero `if_random_less_than` instructions, identical shape to
`AI_CBM_DefenseDown` (§15.1) — the only difference is the stat constant
being compared (`STAT_SPDEF` vs `STAT_DEF`).

```
AI_CV_SpDefDown:                        (data/battle_ai_scripts.s:1186-1196)
	if_hp_less_than AI_USER, 70, AI_CV_SpDefDown2                     ; :1187 Gate A (opponent's OWN hp)
	if_stat_level_more_than AI_TARGET, STAT_SPDEF, 3, AI_CV_SpDefDown3  ; :1188 Gate B (only reached if Gate A false)
AI_CV_SpDefDown2:
	if_random_less_than 50, AI_CV_SpDefDown3                          ; :1190 DRAW SITE
	score -2
AI_CV_SpDefDown3:
	if_hp_more_than AI_TARGET, 70, AI_CV_SpDefDown_End                ; :1193 Gate C (target's OWN hp)
	score -2
AI_CV_SpDefDown_End:
	end
```

Exactly **1** `if_random_less_than` site (`:1190`), matching §3/§5's corrected
count — identical gate structure to `AI_CV_DefenseDown` (§15.1), `STAT_DEF`
swapped for `STAT_SPDEF`. All three of §15.1's gate/draw-site semantics carry
over unchanged (Gate A: opponent's own HP < 70% reaches the draw site
unconditionally; Gate B: target's SPDEF stage > 3, true by default, skips
the draw site when Gate A is false; Gate C: target's own HP > 70%, orthogonal
deterministic fallthrough).

### 16.2 Design: same twin-fixture recipe as §15, dispatch move swapped for a `EFFECT_SPECIAL_DEFENSE_DOWN_2` move

`EFFECT_SPECIAL_DEFENSE_DOWN` (`include/constants/battle_move_effects.h:26`)
is commented `// unused` in source — **zero moves anywhere in the game** use
it, so `AI_CV_SpDefDown`'s reachable-move count (2, per §5's table) comes
entirely from `EFFECT_SPECIAL_DEFENSE_DOWN_2` (`MOVE_FAKE_TEARS` id 313,
`MOVE_METAL_SOUND` id 319, `src/data/battle_moves.h:4071-4082,4149-4160`).
`MOVE_METAL_SOUND` has accuracy 85 (a real miss chance, unlike every move
this session's other fixtures used); `MOVE_FAKE_TEARS` has accuracy 100
(`.effect = EFFECT_SPECIAL_DEFENSE_DOWN_2, .power = 0, .accuracy = 100`) —
chosen for the opponent's dispatch move specifically to avoid introducing a
new miss-chance-driven cross-seed instability risk (the kind §11.2's
`HighCrit` neutral fixture already surfaced from a different source), keeping
this pair's isolation as clean as §15's.

Opponent (`AI_USER`, under test, both fixtures): **Anorith** (species 390,
identical to §15.2 — Battle Armor blocks `Cmd_critcalc`'s `Random()` call
entirely), all 4 slots `MOVE_FAKE_TEARS` (313, Dark, 0 power, accuracy 100,
`EFFECT_SPECIAL_DEFENSE_DOWN_2`, CBM-table-covered).

Target (player, both fixtures): **Machamp** (species 68, identical to §15.2
— single assignable ability, Guts, collapsing the `get_ability` confound to
zero). Turn-1 damage reuse identical to §15.2: reach fixture's player uses
`MOVE_VITAL_THROW` (233) x4 (same sized hit, same 15-28%-remaining band,
comfortably under 70%); control fixture's player uses `MOVE_SPLASH` (150) x4
(Anorith's HP never moves). Same single-turn capture shape
(`[A, wait 30, A, wait 700]`, `captureFrames [0,100,300,732]`).

- **Reach** (`tools/battle-lab/mechanic-factory-ai-cv-spdefdown-lowhp-reach-off.json`)
- **Control** (`tools/battle-lab/mechanic-factory-ai-cv-spdefdown-fullhp-control-off.json`)

### 16.3 Live ledger (oracle-verified, both seeds, both runs)

| Fixture | Seed | Opponent PP used | Opponent HP (start→end) | Total `Random()` calls, frame 0→732 | Determinism (2 runs) |
| --- | -: | -: | --- | -: | --- |
| Reach (lowhp) | 1 | 1 | 120→22 (18%) | **13** | identical |
| Reach (lowhp) | 99 | 1 | 120→30 (25%) | **13** | identical |
| Control (fullhp) | 1 | 1 | 120→120 (100%) | **7** | identical |
| Control (fullhp) | 99 | 1 | 120→120 (100%) | **7** | identical |

Numerically identical to §15.3's `DefenseDown` ledger — expected, since
`MOVE_FAKE_TEARS` and `MOVE_LEER` are both 0-power/100-accuracy status moves
and the two handlers are structurally identical. Both fixtures individually
cross-seed-stable (13/13, 7/7).

**Attribution** (`tools/probe/attribute-factory-ai-random-callers.py`, window
`0 732`, run via `tools/run-mgba-probe.py`, seed 1): the **+6** delta splits
identically to §15.3:

| Caller function | Reach count | Control count | Delta |
| --- | -: | -: | -: |
| `BattleAI_SetupAIData+0x83` | 4 | 4 | 0 |
| `BattleTurnPassed+0x157` | 1 | 1 | 0 |
| `ChooseMoveOrAction_Singles+0xf7` | 1 | 1 | 0 |
| `Cmd_accuracycheck+0x305` | 1 | 1 | 0 |
| `Cmd_if_random_less_than+0x7` | **4** | **0** | **+4** |
| `Cmd_adjustnormaldamage+0x7` | 1 | 0 | +1 |
| `Cmd_seteffectwithchance+0x81` | 1 | 0 | +1 |

Same clean isolation as `DefenseDown`: `Cmd_get_ability` and `Cmd_critcalc`
appear in neither fixture's table (Machamp's single ability, Anorith's
Battle Armor, and Anorith's own 0-power dispatch move all cancel the same
three confounds §15.3 already named). `Cmd_if_random_less_than`'s +4 is
`AI_CV_SpDefDown`'s own `:1190` roll, once per identical `MOVE_FAKE_TEARS`
slot on the phantom next-turn re-decision.

### 16.4 What this unblocks

Same as §15.4 — a full instruction-level ground-truth for `AI_CBM_SpDefDown`
+ `AI_CV_SpDefDown`, plus a **third** independent confirmation (after
`AttackDown` and `DefenseDown`) that the "N identical slots × 1 reachable
decision = N draws" mechanism holds regardless of which specific gate shape
or stat the handler reads — three structurally distinct CBM-blocked pairs
(target-stat-stage-gated, opponent-HP-gated ×2) all reduce to the same
attribution pattern once isolated correctly.

### 16.5 Verify script status

`tools/probe/verify-factory-ai-checkviability-ground-truth.ts` extended this
session with `AI_CV_SpDefDown`'s 2 fixtures (§16.2/§16.3) — every prior
scenario (§9, §11.5, §12.1, §13.4, §14.6, §15.5) unchanged and still green.
**Run twice this session, ALL PASS both times.**

## 17. 2026-07-26 addendum #7: `AI_CBM_AttackUp` + `AI_CV_AttackUp` — first stat-**UP** CBM-blocked pair, fully staged and live-verified; the stat-down fixture recipe does NOT transfer

Fifth follow-up scout session (side lane, Battle Scene OFF), same
no-`src/`-changes contract. Goal per this step's brief: the mandatory rung —
bank ground truth for `AI_CBM_AttackUp` + `AI_CV_AttackUp`, the first of the
brief's two stat-**UP** CBM-blocked pairs (§4 named both `AttackUp` and
`DefenseUp` among the 17 CBM-blocked `AI_CV_*` handlers). The brief
explicitly warned the stat-up handlers' CBM side might not resemble the
stat-down pairs (§14/§15/§16) structurally — confirmed true, and the CV
side's own draw-site polarity forced a fixture design that inverts §15/§16's
reach/control naming (documented in 17.3 below), a second respect in which
"reuse the prior pair's recipe" would have silently produced the wrong
fixture.

### 17.1 Both real bodies, cited and fully parsed

```
AI_CBM_AttackUp:                        (data/battle_ai_scripts.s:249-251)
	if_stat_level_equal AI_USER, STAT_ATK, MAX_STAT_STAGE, Score_Minus10  ; user's OWN ATK stage == 12 -> -10, end
	end                                                                    ; else 0, end
```

Two instructions, zero `if_random_less_than`, **zero `get_ability` calls at
all** — a real structural break from every CBM handler staged so far
(`AttackDown`/`DefenseDown`/`SpDefDown`, §14-§16), which all `goto` or
directly call the shared `CheckIfAbilityBlocksStatChange` tail
(`:308-312`) and therefore always carry at least one conditional
`Cmd_get_ability` draw. `AI_CBM_AttackUp` reads only `AI_USER`'s own ATK
stat stage (`MAX_STAT_STAGE` = 12, `include/constants/pokemon.h:89-91`) —
it never touches `AI_TARGET` at all, so the §14.2 ability-guess confound
cannot occur here by construction, not by species choice. Confirmed from
the dispatch table itself (`data/battle_ai_scripts.s:96,127`, both
`EFFECT_ATTACK_UP` and `EFFECT_ATTACK_UP_2` route to this same handler) —
`AI_CBM_DefenseUp` (`:253-255`) is the same two-instruction shape with
`STAT_DEF` swapped for `STAT_ATK`; `AI_CBM_BulkUp` (`:581-584`) is a
**separate, third** handler (checks both `STAT_ATK` == max -> `-10` AND
`STAT_DEF` == max -> `-8`) that `EFFECT_BULK_UP` routes to on the CBM side
only — the CV side's `EFFECT_BULK_UP` instead routes to `AI_CV_DefenseUp`
(`:778`), confirming the brief's own warning that a stat-up pair's CBM and
CV halves do not necessarily share the same effect-to-handler mapping the
way every stat-down pair did. (Relevant to this step's stretch goal, §17.5.)

```
AI_CV_AttackUp:                         (data/battle_ai_scripts.s:896-913)
	if_stat_level_less_than AI_USER, STAT_ATK, 9, AI_CV_AttackUp2  ; :897 Gate A (opponent's OWN atk stage)
	if_random_less_than 100, AI_CV_AttackUp3                        ; :898 DRAW SITE 1
	score -1
	goto AI_CV_AttackUp3

AI_CV_AttackUp2:
	if_hp_not_equal AI_USER, 100, AI_CV_AttackUp3                   ; :903 Gate B (opponent's OWN hp)
	if_random_less_than 128, AI_CV_AttackUp3                        ; :904 DRAW SITE 2
	score +2
AI_CV_AttackUp3:
	if_hp_more_than AI_USER, 70, AI_CV_AttackUp_End                 ; :907 Gate C (opponent's OWN hp)
	if_hp_less_than AI_USER, 40, AI_CV_AttackUp_ScoreDown2           ; :908 Gate D (opponent's OWN hp)
	if_random_less_than 40, AI_CV_AttackUp_End                       ; :909 DRAW SITE 3
AI_CV_AttackUp_ScoreDown2:
	score -2
AI_CV_AttackUp_End:
	end
```

Exactly **3** `if_random_less_than` sites (`:898`, `:904`, `:909`), matching
the brief's count. A second structural break from every handler staged so
far: **every single gate and draw site reads `AI_USER`'s own state** (its
own ATK stat stage, its own HP) — `AI_TARGET` (the player's Pokémon) is
never read anywhere in this handler's body. This is the mechanical
consequence of the effect being self-targeted (`MOVE_TARGET_SELECTED` +
`EFFECT_ATTACK_UP*` raises the user's own stat), unlike every stat-*down*
handler staged so far, whose gates mix `AI_TARGET`'s stat stage/HP/type
with `AI_USER`'s own HP. Full branch enumeration:

- **Gate A** (`:897`): opponent's own ATK stage < 9 (true at battle start —
  `DEFAULT_STAT_STAGE` = 6, `pokemon.h:90`) routes to `AI_CV_AttackUp2`,
  **skipping DRAW SITE 1**. Only a battler whose ATK stage has already been
  raised to 9-11 by a prior real stat-up move reaches DRAW SITE 1 at all
  (stage 12 is excluded earlier — `AI_CBM_AttackUp`'s own `Score_Minus10`
  fires first and `AI_CheckViability` never runs). Not staged this session
  (2-turn build, same "not attempted, time-capped" status as `AttackDown`'s
  own DRAW SITE 1, §14.6).
- **DRAW SITE 1** (`:898`, only reached if ATK stage is already 9-11): 100/256
  (~39.1%) skip to `AttackUp3`, else (~60.9%) `score -1` then fall through to
  the same place — this draw's outcome never changes control flow, only the
  score.
- **Gate B** (`:903`, only reached if Gate A true): opponent's own HP != 100%
  (i.e. **any** prior damage at all, not a threshold band) routes straight to
  `AttackUp3`, **skipping DRAW SITE 2**. Only reachable with HP still exactly
  100% does the roll fire.
- **DRAW SITE 2** (`:904`): 128/256 (50%) skip, else (50%) `score +2` then
  fall through to `AttackUp3` regardless — like DRAW SITE 1, outcome doesn't
  gate anything downstream.
- **Gate C** (`:907`, always reached): opponent's own HP > 70% routes to
  `End`, **skipping Gate D and DRAW SITE 3 entirely**.
- **Gate D** (`:908`, only reached if Gate C false, i.e. HP <= 70%): opponent's
  own HP < 40% routes straight to `ScoreDown2` (`score -2`), **skipping DRAW
  SITE 3**.
- **DRAW SITE 3** (`:909`, only reached if HP is in [40,70]): 40/256 (~15.6%)
  skip to `End`, else (~84.4%) falls to `ScoreDown2` (`score -2`).

### 17.2 Design constraint carried over from §11.0/§14-§16: only the phantom next-decision is ever observable in a single-turn window

Per §11.0's own finding (re-confirmed live this session, see 17.4's
attribution table): turn 1's own AI decision is fully resolved *before*
frame 0 is captured — entirely unobservable. A single executed-turn window
(`[A, wait 30, A, wait 700]`, `captureFrames [0,100,300,732]`, this pair's
own capture shape, matching `AttackDown`/`DefenseDown`/`SpDefDown`) only ever
exposes the **phantom next-turn** re-decision (computed after turn 1's real
actions resolve, using turn 1's post-action state, but never executed).
This matters more for this handler than any prior one, because *every* one
of its gates reads `AI_USER`'s own state, and `AI_USER`'s own state at the
unobservable turn-1 decision is **always** the fresh-battle default (ATK
stage 6, HP 100%) regardless of what the twin fixtures do — so any design
that tried to differ the two fixtures' turn-1 decisions would fail to differ
at all. The only thing available to flip is what happens to `AI_USER`'s own
ATK stage/HP *during* turn 1's real execution, which is exactly what the
phantom decision reads.

### 17.3 Design: twin fixtures isolating DRAW SITE 2 (`:904`) via the opponent's own turn-1 HP, naming inverted from §15/§16 by necessity

Opponent (`AI_USER`, under test, both fixtures): **Anorith** (species 390,
reused verbatim from §15.2/§16.2 — Battle Armor blocks `Cmd_critcalc`'s
`Random()` call entirely, avoiding a crit-driven HP-band or KO risk exactly
as before), all 4 slots `MOVE_SWORDS_DANCE` (14, Normal, 0 power, **accuracy
0 — the special "always hits, no `Cmd_accuracycheck` draw" value**, per
§14.3's own note on Growl vs Swift/Double Team/Splash; `EFFECT_ATTACK_UP_2`,
both CBM- and CV-table-covered). Target (player, both fixtures): **Machamp**
(species 68, reused verbatim from §15.2/§16.2). Neither handler under test
ever reads `AI_TARGET`, so Machamp's own ability/type carries zero relevance
here (a first for this doc's CBM-blocked pairs) — it's reused purely for its
known, cross-seed-stable `MOVE_VITAL_THROW` damage band against Anorith's
120 max HP (86-102 damage, 15-28% remaining, §13.3's own already-verified
figures). Single executed turn, same capture shape as §14-§16
(`[A, wait 30, A, wait 700]`, `captureFrames [0,100,300,732]`).

Because Gate B's own precondition is "opponent's own HP != 100%" (an
equality test, not a threshold band like every stat-down pair's `<70`/`<40`
gates), the fixture that keeps the opponent **undamaged** is the one whose
phantom decision reaches DRAW SITE 2 (Gate B false, HP still exactly 100%)
— i.e. **this pair's "reach" fixture uses the control-shaped `MOVE_SPLASH`
moveset, and its "control" fixture uses the reach-shaped `MOVE_VITAL_THROW`
moveset** — the opposite assignment from §15/§16, where the low-HP
(`MOVE_VITAL_THROW`) fixture was "reach" and the full-HP (`MOVE_SPLASH`)
fixture was "control". Naming here tracks which fixture reaches the draw
site under test, not which player move is used — copying §15/§16's
move-to-name assignment blind would have swapped reach and control.

- **Reach** (`tools/battle-lab/mechanic-factory-ai-cv-attackup-fullhp-reach-off.json`):
  target uses `MOVE_SPLASH` (150) x4 — Anorith's HP never moves (120 -> 120
  both seeds), so the phantom decision's Gate B is false (HP still == 100),
  falling through to DRAW SITE 2.
- **Control** (`tools/battle-lab/mechanic-factory-ai-cv-attackup-lowhp-control-off.json`):
  target uses `MOVE_VITAL_THROW` (233) x4 — Anorith drops to 25% (seed 1) /
  15% (seed 99) remaining, both comfortably under 40%, so the phantom
  decision's Gate B is true (HP != 100), routing straight past DRAW SITE 2 to
  `AttackUp3`, where Gate D (HP < 40) then routes straight to `ScoreDown2`
  — a fully deterministic, zero-draw path through the entire handler.

### 17.4 Live ledger (oracle-verified, both seeds, both runs)

| Fixture | Seed | Opponent PP used | Opponent HP (start→end) | Total `Random()` calls, frame 0→732 | Determinism (2 runs) |
| --- | -: | -: | --- | -: | --- |
| Reach (fullhp, Splash) | 1 | 1 | 120→120 (100%) | **10** | identical |
| Reach (fullhp, Splash) | 99 | 1 | 120→120 (100%) | **10** | identical |
| Control (lowhp, VitalThrow) | 1 | 1 | 120→30 (25%) | **8** | identical |
| Control (lowhp, VitalThrow) | 99 | 1 | 120→18 (15%) | **8** | identical |

Both fixtures individually cross-seed-stable (10/10, 8/8).

**Attribution** (`tools/probe/attribute-factory-ai-random-callers.py`, window
`0 732`, run via `tools/run-mgba-probe.py`, seed 1):

| Caller function | Reach count | Control count | Delta |
| --- | -: | -: | -: |
| `BattleAI_SetupAIData+0x83` | 4 | 4 | 0 |
| `BattleTurnPassed+0x157` | 1 | 1 | 0 |
| `ChooseMoveOrAction_Singles+0xf7` | 1 | 1 | 0 |
| `Cmd_if_random_less_than+0x7` | **4** | **0** | **+4** |
| `Cmd_adjustnormaldamage+0x7` | 0 | 1 | -1 |
| `Cmd_seteffectwithchance+0x81` | 0 | 1 | -1 |

Net delta +2 (10 - 8) splits cleanly: `Cmd_if_random_less_than`'s +4 is
`AI_CV_AttackUp`'s own `:904` roll, once per identical `MOVE_SWORDS_DANCE`
slot (N=4) on the single observable (phantom) decision — the fourth
independent confirmation of the "N identical slots x 1 reachable decision =
N draws" mechanism (after `AttackDown`/`DefenseDown`/`SpDefDown`, §14-§16),
this time on a handler whose gates are 100% opponent-self-state rather than
target-state or opponent-HP-threshold. The two `-1` rows are `MOVE_VITAL_THROW`
actually connecting in the control fixture (vs `MOVE_SPLASH` doing nothing in
reach) — the flipped precondition's own necessary real-damage cost, not part
of the handler itself, same structural confound §13.3/§15.3/§16.3 already
named. `Cmd_get_ability` appears in **neither** table, confirming §17.1's
prediction that this handler pair cannot hit that confound by construction
(no `get_ability`/`if_ability` instruction exists in either body). Also
notable: unlike §14.4's single-turn Growl fixture (whose *real* turn-1
decision was the only one observed, no phantom), and consistent with
§15.3/§16.3's own VitalThrow-based pairs, this window's *entire* signal comes
from the phantom decision — turn 1's own real decision, using the
unavoidable fresh-battle default state (ATK 6, HP 100%) in **both**
fixtures, is never observed at all (§17.2). A first pass at this design
wrongly assumed the real turn-1 decision *would* be observable and predicted
totals of 8 (control) / 12 (reach) with a matching sign; the live run
returned 8/10 — the attribution probe (not the analytical prediction) is
what caught and resolved the discrepancy, exactly the doc's own standing
"read the assembly, verify live, don't trust the paper account" discipline
(§11.0, §13, §15.3).

### 17.5 What this unblocks

1. **The pair's own port**: exact instruction lists, every gate's real
   precondition, all 3 draw sites' odds, and a live-verified twin fixture
   proving DRAW SITE 2's reachability end-to-end (DRAW SITE 1, gated on a
   2-turn ATK-stage build to 9+, remains an unstaged recipe — same status as
   `AttackDown`'s own DRAW SITE 1, §14.6; DRAW SITE 3, gated on the HP
   band [40,70], is a cheaper follow-up than DRAW SITE 1 since it only needs
   a lighter-damage move than `MOVE_VITAL_THROW` in the same single-turn
   shape, not attempted this session).
2. **Confirms the brief's own warning was correct and cheap to falsify only
   by reading the assembly**: `AI_CBM_AttackUp` shares no structure
   (no `get_ability`, no `CheckIfAbilityBlocksStatChange` tail, no
   `if_random`) with any stat-down CBM handler staged so far, and
   `EFFECT_BULK_UP` splits across CBM (`AI_CBM_BulkUp`, its own third
   handler) and CV (`AI_CV_DefenseUp`, shared with `DEFENSE_UP`/`_2`) —
   relevant to the still-open `DefenseUp` stretch goal (§17.6).
3. **A fourth independent confirmation of the "N identical slots" draw
   mechanism**, and a new example (Gate B's `!= 100` equality test) of a
   non-threshold, non-band precondition shape not seen in `AttackDown`/
   `DefenseDown`/`SpDefDown`/`VitalThrow`.

### 17.6 `AI_CBM_DefenseUp` + `AI_CV_DefenseUp` (stretch goal): NOT staged this session

Both bodies were read (`AI_CBM_DefenseUp`, `data/battle_ai_scripts.s:253-255`,
same 2-instruction shape as `AI_CBM_AttackUp` with `STAT_DEF` swapped for
`STAT_ATK`; `AI_CV_DefenseUp`, `:915-942` + its `AI_CV_DefenseUp_PhysicalTypes`
table at `:944-954`, 5 `if_random_less_than` sites at `:917`, `:923`, `:927`,
`:936`, `:938`) as part of this step's brief's mandatory "parse all four
handler bodies" instruction (§17.1's own citations above cross-reference
these), but **no fixtures were built or run** — this step's brief named
`DefenseUp` a stretch goal and said explicitly to land `AttackUp` fully
rather than half-stage both if time ran out. `AI_CV_DefenseUp`'s own
`AI_CV_DefenseUp4` branch (`:928-936`) additionally reads the *target's*
last-used move's power and type (`get_last_used_bank_move AI_TARGET` +
`get_move_power_from_result`/`get_move_type_from_result`, against its own
`AI_CV_DefenseUp_PhysicalTypes` list) — a real target-history dependency not
present in `AttackUp` at all and not analyzed further here; a future porter
should re-derive its exact gate semantics from the assembly rather than
assuming it mirrors `AttackDown`'s own type-list gate (§14.1), since that
gate reads the target's *own* type, not the target's *last move's* type.

### 17.7 Verify script status

`tools/probe/verify-factory-ai-checkviability-ground-truth.ts` extended this
session with `AI_CV_AttackUp`'s 2 fixtures (§17.3/§17.4) — every prior
scenario (§9, §11.5, §12.1, §13.4, §14.6, §15.5, §16.5) unchanged and still
green. **Run twice this session, ALL PASS both times.**

## 18. 2026-07-26 addendum #8: `AI_CBM_DefenseUp` + `AI_CV_DefenseUp` (+ `AI_CBM_BulkUp`) — the target's-last-used-move dependency, live-verified

Sixth follow-up scout session (side lane, Battle Scene OFF), same
no-`src/`-changes contract. Goal: graduate §17.6's stretch goal —
`AI_CBM_DefenseUp` + `AI_CV_DefenseUp`, the largest remaining CheckViability
pair (5 `if_random_less_than` sites) — to a fully live-verified entry, with
particular attention to the one dependency no prior fixture in this doc has
needed: a branch that reads the *target's* last-used move's power and type,
not the target's own current stat/type/HP.

### 18.1 Both real bodies, cited and fully re-parsed from the raw assembly

```
AI_CBM_DefenseUp:                       (data/battle_ai_scripts.s:253-255)
	if_stat_level_equal AI_USER, STAT_DEF, MAX_STAT_STAGE, Score_Minus10
	end
```

Confirmed byte-for-byte the same 2-instruction shape as `AI_CBM_AttackUp`
(§17.1) with `STAT_ATK` swapped for `STAT_DEF` — zero `if_random_less_than`,
zero `get_ability`, reads only `AI_USER`'s own DEF stage. Dispatch table
(`data/battle_ai_scripts.s:109,134,186`): `EFFECT_DEFENSE_UP`,
`EFFECT_DEFENSE_UP_2`, **and `EFFECT_DEFENSE_CURL`** all route here on the CBM
side (`EFFECT_DEFENSE_CURL` has no corresponding CV-side entry at all — it is
CBM-only, out of this pair's scope and not staged). `EFFECT_BULK_UP`
(`:210`) routes to a separate handler, `AI_CBM_BulkUp`:

```
AI_CBM_BulkUp:                          (data/battle_ai_scripts.s:581-584)
	if_stat_level_equal AI_USER, STAT_ATK, MAX_STAT_STAGE, Score_Minus10
	if_stat_level_equal AI_USER, STAT_DEF, MAX_STAT_STAGE, Score_Minus8
	end
```

Three instructions, still zero `if_random_less_than`/`get_ability` — it adds
nothing structurally beyond the stat-up 2-instruction pattern already
established for `AI_CBM_AttackUp`/`AI_CBM_DefenseUp`: it is exactly that
pattern applied twice (once per stat `EFFECT_BULK_UP` raises), sequentially,
with no interaction between the two checks. Confirms §17.1's own note: this
is the handler `EFFECT_BULK_UP` reaches on the **CBM side only**
(`data/battle_ai_scripts.s:210`) — its CV side (`:771`) instead dispatches to
`AI_CV_DefenseUp`, shared with `DEFENSE_UP`/`DEFENSE_UP_2` (`:660`, `:689`).
Since `AI_CBM_BulkUp` is trivial and CV-side behavior for all three effects
converges on the same `AI_CV_DefenseUp` body, this session designed fixtures
using an `EFFECT_DEFENSE_UP` dispatch move (`MOVE_HARDEN`) rather than
`MOVE_BULK_UP`, per the brief's own suggestion — `AI_CBM_BulkUp`'s CBM-side
draws (there are none) never enter the picture either way.

```
AI_CV_DefenseUp:                        (data/battle_ai_scripts.s:915-942)
	if_stat_level_less_than AI_USER, STAT_DEF, 9, AI_CV_DefenseUp2   ; :916 Gate A (opponent's OWN def stage)
	if_random_less_than 100, AI_CV_DefenseUp3                        ; :917 DRAW SITE 1
	score -1
	goto AI_CV_DefenseUp3

AI_CV_DefenseUp2:
	if_hp_not_equal AI_USER, 100, AI_CV_DefenseUp3                   ; :922 Gate B (opponent's OWN hp)
	if_random_less_than 128, AI_CV_DefenseUp3                        ; :923 DRAW SITE 2
	score +2
AI_CV_DefenseUp3:
	if_hp_less_than AI_USER, 70, AI_CV_DefenseUp4                    ; :926 Gate C (opponent's OWN hp, NOTE inverted vs AttackUp)
	if_random_less_than 200, AI_CV_DefenseUp_End                     ; :927 DRAW SITE 3
AI_CV_DefenseUp4:
	if_hp_less_than AI_USER, 40, AI_CV_DefenseUp_ScoreDown2          ; :929 Gate D (opponent's OWN hp)
	get_last_used_bank_move AI_TARGET                                ; :930 -- TARGET's last move, not AI_USER's
	get_move_power_from_result                                       ; :931
	if_equal 0, AI_CV_DefenseUp5                                     ; :932 Gate E (last move power == 0)
	get_last_used_bank_move AI_TARGET                                ; :933
	get_move_type_from_result                                        ; :934
	if_not_in_bytes AI_CV_DefenseUp_PhysicalTypes, AI_CV_DefenseUp_ScoreDown2  ; :935 Gate F (last move type)
	if_random_less_than 60, AI_CV_DefenseUp_End                      ; :936 DRAW SITE 4
AI_CV_DefenseUp5:
	if_random_less_than 60, AI_CV_DefenseUp_End                      ; :938 DRAW SITE 5
AI_CV_DefenseUp_ScoreDown2:
	score -2
AI_CV_DefenseUp_End:
	end

AI_CV_DefenseUp_PhysicalTypes:          (data/battle_ai_scripts.s:944-954)
	.byte TYPE_NORMAL, TYPE_FIGHTING, TYPE_POISON, TYPE_GROUND, TYPE_FLYING,
	      TYPE_ROCK, TYPE_BUG, TYPE_GHOST, TYPE_STEEL, -1
```

Exactly **5** `if_random_less_than` sites (`:917`, `:923`, `:927`, `:936`,
`:938`), matching §17.6's own count and the brief's. Gates A/B mirror
`AttackUp`'s own Gate A/B exactly (STAT_ATK → STAT_DEF, same "opponent's own
stat stage < 9" / "opponent's own HP == 100%" shapes, same DRAW SITE 1/2
semantics) — **not re-derived as a new finding this session**, since the
structure is identical to §17.1's already-verified `AttackUp` shape.

**The one real structural break from `AttackUp`, caught by reading the
assembly rather than assuming symmetry: Gate C's direction is inverted.**
`AttackUp3`'s own Gate C is `if_hp_more_than AI_USER,70,End` — HP > 70% jumps
straight to `End`, a clean stop. `DefenseUp3`'s Gate C is
`if_hp_less_than AI_USER,70,DefenseUp4` — HP < 70% jumps *into* the
last-move branch, and HP ≥ 70% instead **falls through to DRAW SITE 3**
(`:927`), whose own *failure* (~21.9%, draw ≥ 200) falls through *again*,
landing in `AI_CV_DefenseUp4` anyway. A design that reused `AttackUp`'s own
"HP == 100% is a clean, deterministic stop at Gate C" assumption would have
been wrong here — HP == 100% instead guarantees an *extra*, sometimes-two-
outcome draw at DRAW SITE 3 before anything terminates. This session's
fixtures sidestep that instability entirely by holding the opponent's HP in
the **[40,70)%** band (Gate C true, Gate D false) — see 18.3.

`Cmd_get_last_used_battler_move` (`battle_ai_script_commands.c:1240-1247`)
is the real implementation of `get_last_used_bank_move`: `AI_TARGET` reads
`gLastMoves[gBattlerTarget]` — **the player's own last-used move ID**, not
`AI_USER`'s. `Cmd_get_move_power_from_result` /
`Cmd_get_move_type_from_result` (`:2151-2162`) then overwrite
`funcResult` with `gBattleMoves[funcResult].power` / `.type` — i.e. Gate E/F
read the move *table* entry for whatever move ID `gLastMoves[player]` holds,
not any live battle state.

### 18.2 The "hard part": what `gLastMoves[player]` reads before the player has ever moved, and why it doesn't need its own fixture

`gLastMoves` (`src/battle_main.c:190`) is an `EWRAM_DATA` array declared
`= {0}` and reset to `MOVE_NONE` at battle start (`src/battle_main.c:3053`,
also `:3222`/`:3314` on each battler's own turn-start). `MOVE_NONE` is `0`
(`include/constants/moves.h:4`), and `gBattleMoves[MOVE_NONE]` — the very
first table entry (`src/data/battle_moves.h`) — is `{.effect = EFFECT_HIT,
.power = 0, .type = TYPE_NORMAL, .accuracy = 0, ...}`. So at battle start (or
any time the target has never completed a move), Gate E's `if_equal 0` reads
`gBattleMoves[MOVE_NONE].power == 0` — **true**, exactly the same as any real
0-power status move — and routes to `AI_CV_DefenseUp5`.

**This means "empty/never-moved" and "target's last move had 0 power" are
literally the same code path, indistinguishable by this branch or by any
draw-count observation** — both satisfy Gate E and land on the identical
`:938` roll. A live fixture proving "empty routes to DefenseUp5" would
therefore be observationally identical to a live fixture proving "any 0-power
last move routes to DefenseUp5" (neither was staged this session — see below
for why). This is the concrete answer to the brief's own question ("what is
the empty value and which branch does it route"): `MOVE_NONE`, power 0, Gate
E true, `AI_CV_DefenseUp5`.

**Why this wasn't pinned with its own live fixture:** `MOVEEND_UPDATE_LAST_
MOVES` (`src/battle_script_commands.c:4407`, inside the `MOVEEND` state
machine) sets `gLastMoves[gBattlerAttacker] = gChosenMove` as soon as a move
resolves (hit or miss, as long as the battler obeyed) — *before* the phantom
next-turn re-decision this doc's single-turn windows observe (§11.0/§17.2).
So in any single-turn fixture, by the time the phantom decision reads
`gLastMoves[player]`, it already reflects **whatever real move the player
used turn 1** — never the untouched `MOVE_NONE` default. Proving the
"empty" route live (as distinct from a mere 0-power move) needs the opponent
HP to already sit in the clean [40,70)% band *before* the player's tracked
move executes — which requires a genuine second turn (turn 1: a real
damaging move to set the HP band; turn 2: `MOVE_SPLASH` to overwrite
`gLastMoves[player]` to a literal 0-power entry, observing turn 3's phantom).
That in turn requires the player's moveset to carry two *different* moves in
different slots, selected via directional menu navigation across turns
(every fixture in this doc so far uses an all-identical 4-slot moveset,
needing only repeated `A` — no cursor movement) — untested trace-authoring
territory this session did not have budget to derive and verify safely
inside the 45-minute cap. Left as a recipe: the analytical answer above is
complete and citation-backed; a future porter can stage the 2-turn variant
directly (turn 1 = either physical- or non-physical-lastmove fixture below,
turn 2 = `MOVE_SPLASH`) to additionally confirm live that it lands on
`:938`, the same site as Gate E's own "empty" default.

### 18.3 Design: an HP-banded last-used-move trio, single-turn, no second turn needed for the physical/non-physical flip

Opponent (`AI_USER`, under test, all fixtures): **Anorith** (species 390,
reused verbatim from §15-17 — Battle Armor blocks `Cmd_critcalc`'s
`Random()` call entirely), all 4 slots **`MOVE_HARDEN`** (106,
`EFFECT_DEFENSE_UP`, 0 power, **accuracy 0** — always hits, no
`Cmd_accuracycheck` draw, CBM- and CV-table-covered). Target (player, all
fixtures): **Machamp** (species 68, reused verbatim) — `AI_CV_DefenseUp`
never reads the target's own stats/type/ability directly (only its *last
move*), so Machamp's own kit is otherwise irrelevant.

To land Anorith's HP inside the deterministic **[40,70)%** band (Gate C
true → straight into `AI_CV_DefenseUp4`; Gate D false → the last-move check
is reached, not skipped) *and* control exactly what the last-move check
reads, the player's own attacking move on turn 1 does double duty — it both
deals the damage that sets the band **and** is the move Gate E/F read back,
since `MOVEEND_UPDATE_LAST_MOVES` sets `gLastMoves[player]` before the same
window's phantom decision fires (18.2). Two fixed-damage move effects make
the HP band land on the exact same number both seeds, with no 85-100%
roll-variance risk:

- `MOVE_VITAL_THROW` (233, Fighting — **in** `AI_CV_DefenseUp_PhysicalTypes`)
  — normal damage roll, but Anorith's own `MOVE_HARDEN` raises its DEF stage
  before the hit lands (opponent moved first both seeds here), reducing the
  hit to a repeatable 65 damage both seeds (120→55, 45.8%) — **inside**
  [40,70) even though this move's own power/roll differs from its usual
  86-102 damage elsewhere in this doc (§13.3 etc., against opponents that
  don't raise their own DEF first). A live discrepancy from that expectation
  — see 18.5.
- `MOVE_SEISMIC_TOSS` (69, Fighting — in the list, `EFFECT_LEVEL_DAMAGE`,
  `dmgtolevel` — data/battle_scripts_1.s:1195-1204 — fixed damage equal to
  the user's level, 50 at level 50, no roll, no crit calc call at all): 120→70
  (58.3%), inside [40,70) both seeds identically.
- `MOVE_DRAGON_RAGE` (82, Dragon — **not** in the list, `EFFECT_DRAGON_RAGE`,
  `setword gBattleMoveDamage,40` — data/battle_scripts_1.s:819-828 — fixed 40
  damage, no roll): 120→80 (66.7%), inside [40,70) both seeds identically —
  the flip fixture.

Single executed turn, same capture shape as every prior CBM-blocked pair
(`[A, wait 30, A, wait 700]`, `captureFrames [0,100,300,732]`).

- **`defenseup-lowhp-control`** (Vital Throw): a second, independent
  confirmation of the physical-list branch with a different move/power,
  landing a different exact HP (55 vs 70) inside the same band.
- **`defenseup-physicallastmove`** (Seismic Toss): the primary physical-list
  fixture — deterministic HP, no roll-variance confound at all.
- **`defenseup-nonphysicallastmove`** (Dragon Rage): the flip — same Gate
  C/D routing, but Gate F now routes straight to `ScoreDown2`, skipping both
  remaining draw sites.

### 18.4 Live ledger (oracle-verified, both seeds, both runs)

| Fixture | Seed | Opponent PP used | Opponent HP (start→end) | Total `Random()` calls, frame 0→732 | Determinism (2 runs) |
| --- | -: | -: | --- | -: | --- |
| Vital Throw (physical #2) | 1 | 1 | 120→55 (45.8%) | **14** | identical |
| Vital Throw (physical #2) | 99 | 1 | 120→55 (45.8%) | **13** | identical |
| Seismic Toss (physical #1) | 1 | 1 | 120→70 (58.3%) | **14** | identical |
| Seismic Toss (physical #1) | 99 | 1 | 120→70 (58.3%) | **13** | identical |
| Dragon Rage (non-physical, flip) | 1 | 1 | 120→80 (66.7%) | **8** | identical |
| Dragon Rage (non-physical, flip) | 99 | 1 | 120→80 (66.7%) | **8** | identical |

Both physical-list fixtures land the *same* per-seed totals (14/13) despite
different moves/power/exact HP — strong evidence the branch, not the
specific move, drives the count. The non-physical fixture is cleanly
cross-seed stable (8/8); the two physical fixtures are **not**
(14 vs 13) — see attribution below for what's actually stable vs not.

**Attribution** (`tools/probe/attribute-factory-ai-random-callers.py`,
window `0 732`, seed 1, via `tools/run-mgba-probe.py`):

| Caller function | Vital Throw | Seismic Toss | Dragon Rage |
| --- | -: | -: | -: |
| `BattleAI_SetupAIData+0x83` | 4 | 4 | 4 |
| `BattleTurnPassed+0x157` | 1 | 1 | 1 |
| `ChooseMoveOrAction_Singles+0xf7` | 1 | 1 | 1 |
| `Cmd_accuracycheck+0x305` | 0 | 1 | 1 |
| `Cmd_adjustnormaldamage+0x7` | 1 | 0 | 0 |
| `Cmd_seteffectwithchance+0x81` | 1 | 1 | 1 |
| `Cmd_if_random_less_than+0x7` | **6** | **6** | **0** |

The `Cmd_accuracycheck`/`Cmd_adjustnormaldamage` split is the flipped
precondition's own necessary cost (Vital Throw has a real 85-100% damage
roll and accuracy 0/always-hits; Seismic Toss/Dragon Rage bypass the damage
roll via `dmgtolevel`/`setword` but still carry a real accuracy=100 check) —
not part of the handler. **The handler's own contribution
(`Cmd_if_random_less_than`) is 0 for the non-physical fixture (both seeds,
matching the analytical prediction that Gate F routes straight past both
remaining draw sites) vs 6 (seed 1) / 5 (seed 99) for both physical
fixtures — clearly present vs cleanly absent, the provable flip the brief
asked for.** The exact physical-branch count is **not** the clean
"4 = N identical slots × 1 draw" pattern every prior handler in this doc
showed (`AttackUp`/`DefenseDown`/`SpDefDown`/`VitalThrow`, §14-17): 4 identical
`MOVE_HARDEN` slots deterministically take an identical path through Gates
C/D/E/F (none of those gates depend on a random draw), so a naive read
predicts exactly 4, not 5-6. This session did not single-step the flagged
frame to find the extra 1-2 draws' exact source — flagged for a future
porter, and treated here the same way §11.0 already established for
`HighCrit`'s own non-uniform neutral fixture: the **shape** (present/absent,
5-6 vs 0) is the reliable, reproduced signal; the exact count is not.
`Cmd_get_ability` appears in none of the three tables (Machamp's kit is
never read by this handler at all, as expected).

### 18.5 A live prose-premise falsification: `MOVE_VITAL_THROW`'s damage against Anorith is NOT 86-102 here

Every prior use of `MOVE_VITAL_THROW` vs Anorith in this doc (§13.3, §15-17)
reports 86-102 damage (15-28% remaining of 120 HP), because in every one of
those fixtures Anorith's own dispatch move never touched its own DEF stage.
Here, Anorith's dispatch move **is** `MOVE_HARDEN` (`EFFECT_DEFENSE_UP`,
raises `AI_USER`'s own DEF one stage) — and since Anorith moved first both
seeds, its DEF stage is already +1 by the time Vital Throw connects,
reducing the hit to a repeatable 65 damage (120→55) instead. Assuming the
old 86-102 figure would transfer unchanged to a fixture whose own opponent
dispatch move is a self-buff would have been wrong — caught live by running
the fixture and reading the actual HP delta, not by re-deriving the damage
formula on paper. (The exact number still safely satisfies "inside
[40,70)%", which is all this fixture's design needs.)

### 18.6 What this unblocks

1. **The pair's own port**: exact instruction lists for both `AI_CBM_*`
   handlers and `AI_CV_DefenseUp`, every gate's real precondition (including
   Gate C's inversion vs `AttackUp`, a real trap for anyone porting by
   analogy), the physical-types table, and a citation-backed, live-confirmed
   resolution of the target's-last-move dependency — the one shape no prior
   handler in this doc needed.
2. **Confirms §17.6's own citations were accurate** (line numbers, draw-site
   count) while correcting an assumption a symmetry-with-`AttackUp` read
   would have produced silently wrong (Gate C's direction, 18.1) — the
   session's own "read the assembly, verify live" discipline catching a
   mistake before it reached the doc, not after.
3. **A concrete boundary on this doc's own draw-counting methodology**:
   every prior handler's reachable branch reduced cleanly to "N identical
   slots × 1 draw"; `DefenseUp`'s physical-list branch does not (5-6, not
   4) — the first handler in this doc where the shape-not-count hedge
   (§11.0) had to be invoked for a *newly staged* fixture rather than
   retroactively explaining an old one (`HighCrit`).
4. **DRAW SITE 1** (`:917`, Gate A, needs the opponent's own DEF stage
   already built to 9-11 by a prior real stat-up move) and **DRAW SITE
   2/3's own HP==100% coupling** (18.1) remain unstaged live this session,
   same "not attempted, time-capped" status as `AttackUp`'s own DRAW SITE 1
   (§17.5) — analytically characterized here (18.1) but not independently
   fixture-verified, since this session's budget centered the last-used-move
   dependency specifically named in the brief.

### 18.7 Verify script status

`tools/probe/verify-factory-ai-checkviability-ground-truth.ts` extended this
session with `AI_CV_DefenseUp`'s 3 fixtures (18.3/18.4) — every prior
scenario (§9, §11.5, §12.1, §13.4, §14.6, §15.5, §16.5, §17.7) unchanged and
still
green. **Run twice this session, ALL PASS both times.**

## 19. 2026-07-26 addendum #9: `AI_CBM_AccDown` + `AI_CV_AccuracyDown` — the largest remaining pair (7 `if_random_less_than` sites), 3 of 7 live-verified across two fixture pairs (§19.3/§19.4 original, §19.5 DRAW SITE 2 added by a follow-up side-lane session), 4 documented recipe-only

Seventh follow-up scout session (side lane, Battle Scene OFF), same
no-`src/`-changes contract. Goal: bank ground truth for the largest
remaining `AI_CheckViability` pair by draw-site count — `AI_CBM_AccDown` +
`AI_CV_AccuracyDown` (7 `if_random_less_than` sites per §5's own table,
`:1198-1234`). §7's own entry for this handler recommended "reclassifying
this out of phase 1 entirely" because its nonzero branches gate behind
toxic-poison/leech-seed/rooted/cursed status flags that need their own move
to land first. That recommendation is **correct for 5 of the 7 sites**
(§19.5 below) but turns out to be too pessimistic for the handler as a
whole: 2 of the 7 sites are gated on plain HP bands, not status, and reach
cleanly off the exact same single-turn HP-banding trick §14-§18 already
established — no 2-turn status build needed.

### 19.1 Both real bodies, cited and fully re-parsed from the raw assembly

```
AI_CBM_AccDown:                         (data/battle_ai_scripts.s:300-304)
	if_stat_level_equal AI_TARGET, STAT_ACC, MIN_STAT_STAGE, Score_Minus10  ; target ACC stage == 0 -> -10, end
	get_ability AI_TARGET
	if_equal ABILITY_KEEN_EYE, Score_Minus10                                ; target ability == Keen Eye -> -10, end
	goto CheckIfAbilityBlocksStatChange

CheckIfAbilityBlocksStatChange:         (data/battle_ai_scripts.s:308-312, shared tail)
	get_ability AI_TARGET
	if_equal ABILITY_CLEAR_BODY, Score_Minus10
	if_equal ABILITY_WHITE_SMOKE, Score_Minus10
	end
```

**The brief's own speculation is confirmed live in the source**: unlike
every stat-down `AI_CBM_*` handler staged so far (`AttackDown`/`DefenseDown`/
`SpDefDown`, §14-16 — each just `if_stat_level_equal ..., Score_Minus10` then
a direct `goto CheckIfAbilityBlocksStatChange`), `AI_CBM_AccDown` has **one
extra ability-specific gate** before the shared tail: `ABILITY_KEEN_EYE`
(accuracy immunity's real in-game ability) short-circuits to `Score_Minus10`
on its own, in addition to the shared `CLEAR_BODY`/`WHITE_SMOKE` check two
lines later. Zero `if_random_less_than` anywhere in either body — every
branch is a deterministic stat-stage/ability compare, same as every other
CBM handler in this doc.

Dispatch table (`data/battle_ai_scripts.s:120,145`): both `EFFECT_ACCURACY_
DOWN` and `EFFECT_ACCURACY_DOWN_2` route to `AI_CBM_AccDown`. **New finding,
not previously stated in this doc**: `EFFECT_ACCURACY_DOWN_2` (63) has **zero
real moves** using it — `gBattleScriptsForMoveEffects[EFFECT_ACCURACY_
DOWN_2]` even points at the generic `BattleScript_EffectHit`, not a real
stat-down script (`data/battle_scripts_1.s:84`), and a full grep of
`src/data/battle_moves.h` finds no `.effect = EFFECT_ACCURACY_DOWN_2`
anywhere. The doc's own §5 table already listed "4 executable moves" for
this handler and that count is entirely `EFFECT_ACCURACY_DOWN`'s own 4 moves
(`MOVE_SAND_ATTACK` 100 acc, `MOVE_SMOKESCREEN` 100 acc, `MOVE_KINESIS` 80
acc, `MOVE_FLASH` 70 acc — `src/data/battle_moves.h`), confirmed by direct
line-number lookup this session — `_2` is a vestigial constant for this
effect family, same shape independently confirmed for real elsewhere in Gen
3's move table.

```
AI_CV_AccuracyDown:                     (data/battle_ai_scripts.s:1198-1234)
	if_hp_less_than AI_USER, 70, AI_CV_AccuracyDown2       ; :1199 Gate A (opponent's OWN hp)
	if_hp_more_than AI_TARGET, 70, AI_CV_AccuracyDown3     ; :1200 Gate B (target's hp)
AI_CV_AccuracyDown2:
	if_random_less_than 100, AI_CV_AccuracyDown3           ; :1202 DRAW SITE 1
	score -1
AI_CV_AccuracyDown3:
	if_stat_level_more_than AI_USER, STAT_ACC, 4, AI_CV_AccuracyDown4  ; :1205 Gate C (opponent's OWN acc stage)
	if_random_less_than 80, AI_CV_AccuracyDown4            ; :1206 DRAW SITE 2
	score -2
AI_CV_AccuracyDown4:
	if_not_status AI_TARGET, STATUS1_TOXIC_POISON, AI_CV_AccuracyDown5  ; :1209 Gate D
	if_random_less_than 70, AI_CV_AccuracyDown5             ; :1210 DRAW SITE 3
	score +2
AI_CV_AccuracyDown5:
	if_not_status3 AI_TARGET, STATUS3_LEECHSEED, AI_CV_AccuracyDown6    ; :1213 Gate E
	if_random_less_than 70, AI_CV_AccuracyDown6              ; :1214 DRAW SITE 4
	score +2
AI_CV_AccuracyDown6:
	if_not_status3 AI_USER, STATUS3_ROOTED, AI_CV_AccuracyDown7         ; :1217 Gate F (opponent's own Ingrain flag)
	if_random_less_than 128, AI_CV_AccuracyDown7             ; :1218 DRAW SITE 5
	score +1
AI_CV_AccuracyDown7:
	if_not_status2 AI_TARGET, STATUS2_CURSED, AI_CV_AccuracyDown8       ; :1221 Gate G
	if_random_less_than 70, AI_CV_AccuracyDown8               ; :1222 DRAW SITE 6
	score +2
AI_CV_AccuracyDown8:
	if_hp_more_than AI_USER, 70, AI_CV_AccuracyDown_End       ; :1225 Gate H (opponent's OWN hp again)
	if_stat_level_equal AI_TARGET, STAT_ACC, DEFAULT_STAT_STAGE, AI_CV_AccuracyDown_End  ; :1226 Gate I (target's OWN acc stage)
	if_hp_less_than AI_USER, 40, AI_CV_AccuracyDown_ScoreDown2   ; :1227 Gate J
	if_hp_less_than AI_TARGET, 40, AI_CV_AccuracyDown_ScoreDown2 ; :1228 Gate K
	if_random_less_than 70, AI_CV_AccuracyDown_End             ; :1229 DRAW SITE 7
AI_CV_AccuracyDown_ScoreDown2:
	score -2
AI_CV_AccuracyDown_End:
	end
```

Exactly **7** `if_random_less_than` sites (`:1202,1206,1210,1214,1218,1222,
1229`), matching §5's own corrected count. `Cmd_if_not_status`/
`Cmd_if_not_status2`/`Cmd_if_not_status3` (`battle_ai_script_commands.c`)
read `gBattleMons[battler].status1`/`.status2`/`.status3` directly —
deterministic, no `Random()` call of their own; only the 7 sites above ever
draw.

**Gate map, in prose:**

- **Gate A** (`:1199`): opponent's own HP < 70% jumps straight into DRAW
  SITE 1's block (`AI_CV_AccuracyDown2`), skipping Gate B entirely.
- **Gate B** (`:1200`, only reached if Gate A is false, i.e. opponent HP ≥
  70%): target HP > 70% skips DRAW SITE 1 (jump to `AI_CV_AccuracyDown3`);
  target HP ≤ 70% falls through into the same DRAW SITE 1 block instead.
  **Two independent routes reach DRAW SITE 1** — either battler's HP alone
  can do it.
- **DRAW SITE 1** (`:1202`): 100/256 (~39.1%) skip, else (~60.9%) `score -1`.
- **Gate C** (`:1205`): opponent's own ACC stat stage > 4 (default battle-
  start value is 6, so this is true at battle start and skips DRAW SITE 2)
  — only stages 0-4 (already lowered by **two or more** real accuracy-down
  hits landing on the opponent itself) reach the roll.
- **DRAW SITE 2** (`:1206`): 80/256 (~31.3%) skip, else (~68.7%) `score -2`.
- **Gates D/E/F/G** (`:1209/1213/1217/1221`): target toxic-poisoned / target
  leech-seeded / **opponent** Ingrain-rooted / target cursed — four
  independent status flags, each gating its own draw site (`:1210/1214/
  1218/1222`, odds 70/256, 70/256, 128/256 (50%), 70/256 respectively, each
  a `score +2`/`+2`/`+1`/`+2` on the non-skip branch). None of these four
  flags is present at battle start or reachable from any single-turn HP/PP
  build — see §19.5.
- **Gate H** (`:1225`): opponent's own HP > 70% jumps straight to `End`,
  skipping the entire tail (Gates I/J/K and DRAW SITE 7) — the same
  battler-HP check as Gate A, reused a second time later in the body.
- **Gate I** (`:1226`): target's own ACC stat stage == `DEFAULT_STAT_STAGE`
  (6) jumps to `End`. **This is the gate that makes the tail state-
  dependent on the dispatch move's own prior effect**: since every
  `EFFECT_ACCURACY_DOWN` move (including this handler's own dispatch move,
  `MOVE_SAND_ATTACK` et al.) lowers the target's ACC stage by 1 every time
  it lands, a target that has already been hit once by the SAME move this
  battle no longer reads as "unaffected" here — a live, source-confirmed
  interaction between the handler's own dispatch move and its own later
  gate, not previously noted in this doc for any other handler (found live,
  not on paper — see 19.3).
- **Gates J/K** (`:1227/1228`): opponent HP < 40% OR target HP < 40% jumps
  straight to the deterministic `score -2` (`AI_CV_AccuracyDown_
  ScoreDown2`), **skipping DRAW SITE 7 entirely** — the only way to reach
  DRAW SITE 7 itself is both battlers sitting in the `[40,70)%` HP band (or
  higher, up to Gate H's own 70% ceiling) simultaneously.
- **DRAW SITE 7** (`:1229`): 70/256 (~27.3%) jumps straight to `End` (no
  score change), else (~72.7%) falls through into `AI_CV_AccuracyDown_
  ScoreDown2` (`score -2`) — the same `-2` destination Gates J/K jump to
  directly, but only reached here via the roll's own failure, not
  unconditionally.

### 19.2 The confound this session found live: the dispatch move's own accuracy roll interacts with its own target-ACC-lowering effect

Every prior CBM-blocked-pair fixture in this doc used a dispatch move whose
own effect (stat change, in every case) doesn't affect anything the SAME
turn's damage-dealing move reads. `AccuracyDown` breaks that pattern: this
handler's dispatch move (`MOVE_SAND_ATTACK`) directly lowers the **target's**
ACC stat stage, and if that target is *also* the one dealing the fixed-
damage move used to bank the opponent's HP into the `[40,70)%` band this
session's design needs (§19.3), a **speed-dependent ordering bug** appears:
if the ACC-down move resolves before the damage move within the same turn,
the damage move's own `Cmd_accuracycheck` roll is evaluated against an
already-lowered ACC stage (stage 5, a 3/4 accuracy multiplier), turning a
should-always-connect 100-accuracy hit into a **25%-chance miss**.

**Found live, the hard way**: an early draft of this session's fixtures put
Anorith (base Speed 75) in the `AI_USER`/dispatch-move role and Machamp
(base Speed 55) as the damage-dealing target — Anorith is faster, so Sand
Attack always resolved first, and `MOVE_SEISMIC_TOSS`'s own accuracy check
(100 base, now facing a lowered-ACC attacker) missed outright at seed 99
(opponent HP stayed 120/120) while connecting at seed 1 (120→70) — a
seed-dependent, non-reproducible fixture that would have silently
contaminated the draw-count comparison (a miss skips the entire damage/
`Cmd_adjustnormaldamage` cost, changing the total unpredictably). **Fix**:
swap which named species plays which role — Anorith (Speed 75) as the
**target** doing `MOVE_SEISMIC_TOSS` (so it always moves first, banking its
fixed-damage hit before anything can touch its own ACC stage) and Machamp
(Speed 55) as the dispatch-move-using opponent. Re-run confirmed clean,
cross-seed-identical HP (`165→115`, 69.7%) and draw counts (17/17) — see
19.4. **Porter guidance**: any future fixture whose dispatch move alters the
*same* battler that also deals real, accuracy-checked damage that turn
needs the accuracy-affected battler to move **first** (by base Speed, not
just "usually faster") — a new confound class this doc's prior CBM-blocked
pairs (whose dispatch moves never touched the opposing battler's own
accuracy/evasion) never had reason to surface.

### 19.3 Design: an HP-banded twin pinning DRAW SITE 1 and DRAW SITE 7 together, in one fixture pair

Opponent (`AI_USER`, under test, both fixtures): **Machamp** (species 68,
single ability `{GUTS, NONE}` — `src/data/pokemon/species_info.h:2073`, Base
Speed 55), all 4 slots **`MOVE_SAND_ATTACK`** (28, `EFFECT_ACCURACY_DOWN`,
100 accuracy — the brief's own suggested dispatch move, "freedom from
confounds" modulo 19.2's finding above). Target (player, `AI_TARGET`):
**Anorith** (species 390, single ability `{BATTLE_ARMOR, NONE}` —
`species_info.h:11033`, Base Speed 75, reused verbatim from §15-18) — single-
ability, avoiding the `Cmd_get_ability`-guess confound §14.2 established for
`AI_CBM_AccDown`'s own `get_ability AI_TARGET` reads (both the direct
`KEEN_EYE` check and the shared tail's `CLEAR_BODY`/`WHITE_SMOKE` check).
Neither Guts nor Battle Armor is Keen Eye/Clear Body/White Smoke, so
`AI_CBM_AccDown`'s own two `Score_Minus10` branches stay unreached in both
fixtures — CBM's own contribution is a flat, identical 0, and the entire
observable delta is `AI_CV_AccuracyDown`'s own.

Single executed turn, same capture shape as every prior CBM-blocked pair
(`[A, wait 30, A, wait 700]`, `captureFrames [0,100,300,732]`):

- **`accuracydown-lowhp-reach`**: target's move slot 1 = **`MOVE_SEISMIC_
  TOSS`** (69, `EFFECT_LEVEL_DAMAGE`, fixed damage = user's level, no roll,
  no crit calc — same fixed-damage trick §18.3 established). Anorith moves
  first (Speed 75 > 55) and deals a flat 50 damage to Machamp (165 max HP
  at level 50) — **165→115 (69.7%), inside `[40,70)%`** both seeds
  identically, no roll-variance risk. Machamp's own Sand Attack then lands
  on Anorith after the damage resolves (order-safe now, since Anorith's own
  damaging move already executed) — Anorith's ACC stage moves 6→5.
  Analytically: Gate A now true (69.7% < 70%) → DRAW SITE 1 fires directly;
  Gate C false-path skip (Machamp's own ACC stage untouched, still default,
  `>4`); Gates D-G all skip (no status present); Gate H false (69.7% not
  `>70%`) → tail continues; Gate I **false** — Anorith's ACC stage is 5, not
  `DEFAULT_STAT_STAGE` (6), because Sand Attack already landed on it this
  same turn (§19.1's own Gate I note) — so the tail does NOT stop here;
  Gates J/K both false (neither battler `<40%`) → **DRAW SITE 7 fires too**.
  **Both DRAW SITE 1 and DRAW SITE 7 are reached in a single fixture,
  before any second turn is needed.**
- **`accuracydown-fullhp-control`**: target's move slot 1 = **`MOVE_SPLASH`**
  (150, 0 power, no effect) instead — Machamp stays at 100% HP the whole
  window. Gate A false, Gate B true (target/Anorith HP > 70%, since Machamp
  never damages it) → DRAW SITE 1 skipped; Gate C skip as above; Gates D-G
  skip; Gate H **true** (Machamp HP `>70%`, still 100%) → jumps straight to
  `End`, skipping the entire tail including DRAW SITE 7. **Deterministic
  zero draws from the handler in this fixture.**

Both fixtures reuse the shared `mechanicLab` header (`level 50, challengeNum
7, battleNum 1, trainerId 222`, same bench fillers as every other fixture in
this doc) verbatim.

### 19.4 Live ledger (oracle-verified, both seeds, both runs)

| Fixture | Seed | Opponent (Machamp) PP used | Opponent HP (start→end) | Total `Random()` calls, frame 0→732 | Determinism (2 runs) |
| --- | -: | -: | --- | -: | --- |
| Reach (Seismic Toss) | 1 | 1 | 165→115 (69.7%) | **17** | identical |
| Reach (Seismic Toss) | 99 | 1 | 165→115 (69.7%) | **17** | identical |
| Control (Splash) | 1 | 1 | 165→165 (100%) | **7** | identical |
| Control (Splash) | 99 | 1 | 165→165 (100%) | **7** | identical |

Both fixtures individually cross-seed-stable (17/17, 7/7) — the clean shape
this doc's earlier "N identical slots × 1 draw" handlers showed (§14/§16),
not the messier non-uniform count `DefenseUp`'s physical-list branch had
(§18.4).

**Attribution** (`tools/probe/attribute-factory-ai-random-callers.py`,
window `0 732`, seed 1, via `tools/run-mgba-probe.py`):

| Caller function | Reach count | Control count | Delta |
| --- | -: | -: | -: |
| `BattleAI_SetupAIData+0x83` | 4 | 4 | 0 |
| `BattleTurnPassed+0x157` | 1 | 1 | 0 |
| `ChooseMoveOrAction_Singles+0xf7` | 1 | 1 | 0 |
| `Cmd_accuracycheck+0x305` | 2 | 1 | +1 |
| `Cmd_seteffectwithchance+0x81` | 1 | 0 | +1 |
| `Cmd_if_random_less_than+0x7` | **8** | **0** | **+8** |

`Cmd_if_random_less_than`'s **+8** is exactly the analytical prediction:
DRAW SITE 1 (4 identical `MOVE_SAND_ATTACK` slots × 1 roll) + DRAW SITE 7 (4
slots × 1 roll) = 8, the clean "N slots × sites" shape, both sites confirmed
present together, none of the other 5 sites reachable in this design (no
status flags, no pre-lowered opponent-own ACC stage). `Cmd_accuracycheck`'s
+1 is the reach fixture's own extra real accuracy roll (Seismic Toss
connecting vs. Splash's accuracy-0/no-check no-op) — the flipped
precondition's own necessary cost, not part of the handler, same pattern
§14.4/§17.4/§18.4 already established for their own fixtures.
`Cmd_get_ability` appears in neither table, confirming both species'
single-ability kits close the §14.2 confound as designed.

### 19.5 DRAW SITE 2 — live-staged and verified this follow-up session; 4 sites remain recipe-only

Sites 3/4/5/6 (`:1210/1214/1218/1222`) share a structural obstacle none of
this doc's "identical 4 slots" fixtures can solve alone: **every one of
them needs the SAME opponent to use two structurally different real moves
across two turns** (a status/stage-setting move, then the `AccuracyDown`
candidate under test) — which means a genuinely mixed moveset and a real
AI *pick* between them, not a forced single legal choice. That is
qualitatively harder than every fixture in this doc so far (all of which
either force a single legal move via 4 identical slots, or read a
state-independent species property) and remains out of budget. **DRAW SITE
2 does not share that obstacle** — it turned out to be gated purely on the
**opponent's own** ACC stat stage, settable directly by the **player's**
own actions with the opponent's moveset held at 4 identical
`MOVE_SAND_ATTACK` slots throughout — and a follow-up side-lane session
staged and live-verified it.

- **DRAW SITE 2** (`:1206`, `score -2`, reached iff the opponent's own ACC
  stat stage is already ≤ 4) — **live-verified**, fixture pair
  `mechanic-factory-ai-cv-accuracydown-accdown-{reach,control}-off.json`.
  Opponent (`AI_USER`, under test) **Machamp** (68, single ability Guts),
  all 4 slots `MOVE_SAND_ATTACK` (28), reused verbatim from 19.3/19.4.
  Target (player, `AI_TARGET`) is **Pidgey** (16, single ability Keen Eye,
  Normal/Flying) instead of Anorith — the recipe above (§19.5, prior
  revision) under-specified one thing, corrected here with live evidence:
  since the **player's own** move must itself be a real accuracy-lowering
  hit against the opponent (to actually lower Machamp's ACC stage 6→5→4
  over 2 turns), and the opponent's forced kit is ALSO all `MOVE_SAND_
  ATTACK`, the opponent's own move reciprocally targets the player every
  turn too — an unprotected target's own ACC stage would fall in step,
  making the player's own later Sand Attack accuracy rolls against Machamp
  probabilistic (a compounding, cross-turn version of 19.2's ordering
  confound, found live while staging this site: an early Anorith-as-target
  draft showed seed-dependent PP/HP drift from exactly this). **Fix**:
  Pidgey closes the confound twice over — `MOVE_SAND_ATTACK` is Ground-type
  and cannot touch a Flying-type target at all (type immunity, resolved
  before any accuracy roll), and Keen Eye independently blocks any
  accuracy-lowering effect from landing on its holder regardless of type
  (`src/battle_script_commands.c:4144`, `Cmd_statbuffchange`'s own
  `ability == ABILITY_KEEN_EYE && currStat == STAT_ACC` short-circuit) — so
  the player's own Sand Attack against Machamp stays a deterministic 100%
  hit both turns, and Machamp's own ACC stage falls 6→5→4 exactly on
  schedule. 2 real executed turns (mash-button reps calibrated separately
  per fixture — Sand Attack's own stat-change animation makes each button
  rep "worth" less real-turn progress than Splash's animation-free turns,
  confirmed live by testing both fixtures at several tail lengths up to
  2000 frames and finding a stable "exactly 2 PP used" plateau at 40 reps
  for the reach fixture and 30 reps for the control — an uncalibrated
  shared rep count silently let an early control draft execute a genuine
  3rd real turn instead of stopping at the reach fixture's own phantom 3rd
  decision, breaking turn-count parity between the twins) bring Machamp's
  ACC to 4 (Gate C now false) while both battlers' HP stay at 100%
  throughout (0-power moves both sides, cleanly skipping DRAW SITE 1 via
  Gates A/B same as 19.3/19.4). The phantom 3rd-turn re-decision then
  reaches the `:1206 if_random_less_than 80` roll once per identical
  `MOVE_SAND_ATTACK` slot. Live ledger (both seeds, both reruns
  deterministic): reach fixture (frame 0→1500) — PP used 2, opponent/target
  HP 165→165/115→115 (both fixtures), total `Random()` calls **20** (both
  seeds); control fixture (target `MOVE_SPLASH` instead, frame 0→1300) — PP
  used 2, total `Random()` calls **14** (both seeds). Delta **+6** matches
  the analytical prediction exactly: +4 `Cmd_if_random_less_than` (DRAW
  SITE 2, N=4 slots × 1 draw) + 2 `Cmd_accuracycheck` (the player's own 2
  real Sand Attack hits landing on Machamp, absent from the control's 2
  Splash turns).
- **DRAW SITE 3** (`:1210`, `score +2`, target `STATUS1_TOXIC_POISON`):
  needs a real `EFFECT_TOXIC` move to land on the target from the
  opponent's own moveset — since the opponent's kit must carry BOTH a Toxic
  move AND an `AccuracyDown` candidate in different slots, turn 1's AI pick
  between them is a genuine, unforced decision (not solvable by making all
  4 slots identical). Needs either real AI-scoring modeling to predict
  which move turn 1 picks, or a two-battler relay (one opponent Pokémon
  whose entire kit is Toxic lands the status and faints/switches, a second
  with the identical-slots `AccuracyDown` trick moves next).
- **DRAW SITE 4** (`:1214`, `score +2`, target `STATUS3_LEECHSEED`): same
  obstacle and same recipe shape as DRAW SITE 3, substituting
  `EFFECT_LEECH_SEED` for `EFFECT_TOXIC`.
- **DRAW SITE 5** (`:1218`, `score +1`, **opponent's own** `STATUS3_ROOTED`,
  i.e. Ingrain): same mixed-moveset obstacle, but the move is
  self-targeted (`EFFECT_INGRAIN`, `MOVE_TARGET_USER`) — no accuracy roll
  of its own to land, and the opponent's own `AI_CBM_Ingrain` handler
  typically scores self-buffs favorably, which may make winning the turn-1
  pick more predictable than sites 3/4's target-directed moves (not
  verified this session).
- **DRAW SITE 6** (`:1222`, `score +2`, target `STATUS2_CURSED`): needs a
  Ghost-typed opponent with `EFFECT_CURSE` in its kit (Curse's own dual
  behavior — self-stat-boost for non-Ghost users, HP-cost target-curse for
  Ghost users — means the opponent's typing is itself part of the
  precondition), same mixed-moveset/real-pick obstacle as sites 3/4.

### 19.6 What this unblocks

1. **The pair's own port**: exact instruction lists for both `AI_CBM_
   AccDown` and `AI_CV_AccuracyDown`, every one of the 7 draw sites' real
   preconditions and odds, the `ABILITY_KEEN_EYE` divergence from every
   other stat-down CBM handler in this doc (confirmed live, not assumed),
   the `EFFECT_ACCURACY_DOWN_2` vestigial-constant finding, and live-verified
   fixtures proving 3 of the 7 sites end-to-end (the original `N-slots ×
   2-sites = 8` twin, plus DRAW SITE 2's own pair).
2. **Two named confound classes for future porters**: §19.2's single-turn
   ordering bug (a dispatch move whose own effect changes the SAME battler
   that also deals the turn's real, accuracy-checked damage needs an
   explicit move-order argument) and this follow-up session's **cross-turn**
   variant (§19.5, DRAW SITE 2) — staging a multi-turn precondition with the
   SAME move family on both sides needs the *receiving* battler protected
   (type immunity and/or a blocking ability) from the reciprocal effect, or
   the precondition-setting turns themselves become probabilistic.
3. **4 explicit, citation-backed recipes** (§19.5) remaining for a future
   porter to pick up directly, each naming exactly why it needs more than
   this session's "identical 4 slots" trick (a real, unforced AI pick
   between two structurally different moves) rather than leaving them as a
   bare "not staged" note.

### 19.7 Verify script status

`tools/probe/verify-factory-ai-checkviability-ground-truth.ts` extended
this session with `AI_CV_AccuracyDown`'s original 2 fixtures (19.3/19.4);
extended again by a follow-up side-lane session with DRAW SITE 2's own
reach/control pair (19.5) — every prior scenario unchanged and still green.
**Run twice this session, ALL PASS both times.**

## 20. 2026-07-26 addendum #10: `AI_CBM_SpeedUp` + `AI_CV_SpeedUp` — the third stat-UP pair, and the first whose gate is relative Speed, not the opponent's own HP/stat-stage

Eighth follow-up scout session (side lane, Battle Scene OFF), same
no-`src/`-changes contract. Goal per this step's brief: the mandatory
rung — bank ground truth for `AI_CBM_SpeedUp` + `AI_CV_SpeedUp`, the
smallest of the brief's three remaining stat-UP pairs (1 `if_random_less_
than` site). Structurally the closest sibling in this doc is **not**
`AttackUp`/`DefenseUp` (§17/§18) but the very first staged scenario,
`SpeedDown` (§6) — both `AI_CV_Speed{Up,Down}` gate on `if_target_faster`
(a live relative-Speed comparison), not on the opponent's own HP or stat
stage the way every other CBM-blocked UP/DOWN pair does. Re-derived from
the raw assembly regardless — the brief's standing "never copy a sibling's
gate map" rule applied here too, and caught a real, universal confound
this session (§20.4) that no prior pair's fixture happened to trip.

### 20.1 Both real bodies, cited and fully parsed

```
AI_CBM_SpeedUp:                         (data/battle_ai_scripts.s:257-259)
	if_stat_level_equal AI_USER, STAT_SPEED, MAX_STAT_STAGE, Score_Minus10  ; user's OWN Speed stage == 12 -> -10, end
	end                                                                      ; else 0, end
```

Two instructions, zero `if_random_less_than`, zero `get_ability` — the same
bare `MAX_STAT_STAGE` shape as `AI_CBM_AttackUp`/`AI_CBM_DefenseUp`
(§17.1/§18.1) with `STAT_SPEED` swapped in. Dispatch table
(`data/battle_ai_scripts.s:110,135`): both `EFFECT_SPEED_UP` and
`EFFECT_SPEED_UP_2` route here on the CBM side.

```
AI_CV_SpeedUp:                          (data/battle_ai_scripts.s:956-965)
	if_target_faster AI_CV_SpeedUp2      ; :957 Gate A (target's CURRENT speed > user's CURRENT speed, both incl. stat stages)
	score -3                             ; :958 NO -> deterministic -3
	goto AI_CV_SpeedUp_End                ; :959

AI_CV_SpeedUp2:
	if_random_less_than 70, AI_CV_SpeedUp_End  ; :962 DRAW SITE 1
	score +3                                    ; :963
AI_CV_SpeedUp_End:
	end
```

Exactly **1** `if_random_less_than` site (`:962`), matching the brief's
count and §5's own table. `Cmd_if_target_faster`
(`battle_ai_script_commands.c`, `if_target_faster` opcode) calls
`GetWhoStrikesFirst`-equivalent battler-speed comparison — a live read of
both battlers' **current** effective Speed (base stat × stage multiplier,
plus paralysis/item modifiers, none in play here), not a fixed threshold —
so, unlike `AttackUp`/`DefenseUp`, this gate is controllable purely by
species/role choice, no HP banding needed. Full branch enumeration:

- **Gate A** (`:957`): target (player) faster than user (opponent) ->
  `AI_CV_SpeedUp2`, reaching **DRAW SITE 1**. Target not faster (user faster
  or tied) -> deterministic `score -3`, **DRAW SITE 1 never reached**.
- **DRAW SITE 1** (`:962`, only reached if Gate A true): 70/256 (~27.3%)
  skip (score stays whatever it was), else (~72.7%) `score +3`.

### 20.2 Design: a species-role swap (reusing §6's SpeedDown trick), not an HP band — and a first live catch of a universal `AI_CheckBadMove` confound

Because the gate is relative Speed, not the opponent's own HP/stage, the
twin fixtures swap which species plays the AI-controlled "opponent" role,
exactly as `SpeedDown`'s own Fixture A/B (§6) — adapted to this doc's later,
more rigorous forced-dispatch/phantom-decision/draw-count-ledger discipline
(§11.0, §14-19) rather than `SpeedDown`'s original decision-visible-pick
design. Both species, all 4 slots **`MOVE_AGILITY`** (97, `EFFECT_SPEED_UP_2`,
0 power, **accuracy 0** — always hits, no `Cmd_accuracycheck` draw), raising
the opponent's own Speed stage 6->8 (×2.0 multiplier) during turn 1's real
execution — read back by the phantom next-turn decision's Gate A, per this
doc's standing "only the phantom decision is observable in a single-turn
window" finding (§11.0/§17.2). Neither handler ever reads `AI_TARGET`'s
ability, type, or HP, so — in principle — species choice should be
Speed-value-only.

**In practice it is not**, and an early draft caught this live: `AI_
CheckBadMove`'s own shared prologue (`data/battle_ai_scripts.s:47-58`,
entirely separate from any `AI_CBM_*`/`AI_CV_*` handler body, and run for
**every** candidate move regardless of effect) unconditionally executes
`get_ability AI_TARGET` at its `AI_CheckBadMove_CheckSoundproof` label to
check for `ABILITY_SOUNDPROOF` against a fixed sound-move list (Growl,
Roar, Sing, ...) — `MOVE_AGILITY` is not on that list, but the `get_ability`
call itself still fires, once per candidate move. `Cmd_get_ability`
(the same `§14.2` mechanism already documented for the down-pairs' shared
`CheckIfAbilityBlocksStatChange` tail) only burns a `Random()` draw when the
AI must *guess* between a species' two possible abilities — an early draft
using Dugtrio (species 51, two real abilities: Sand Veil / Arena Trap) as
the *target* role picked up **4 extra, wrongly-attributed draws** (14 vs
the expected 10) purely from this universal ability-guessing roll, nothing
to do with `AI_CV_SpeedUp` at all. Re-staged with a genuinely single-ability
target and the confound vanished (attribution below). **This is the first
time this doc has caught the ability-guess confound originating from `AI_
CheckBadMove`'s own always-run prologue rather than from a handler's own
`CheckIfAbilityBlocksStatChange` tail** — worth flagging for any future
porter staging a pair whose handler bodies have zero `get_ability` calls of
their own: the confound can still reach the fixture through this
completely separate, unconditional code path, and only a single-ability
species on **both** sides closes it.

Final species pairing, both single-ability (closes the confound for good):
**Crobat** (species 169, base Speed 130, `{ABILITY_INNER_FOCUS,
ABILITY_NONE}`) and **Shuckle** (species 213, base Speed 5,
`{ABILITY_STURDY, ABILITY_NONE}`, reused from §6). Target (player) moveset
is irrelevant to either handler body, so both fixtures use **`MOVE_SPLASH`**
(150) x4 on that side, avoiding any real-damage confound entirely (a first
for this doc's CBM-blocked UP pairs — every prior one needed at least one
fixture with a real damaging move to bank an HP band).

- **Reach** (`tools/battle-lab/mechanic-factory-ai-cv-speedup-slower-reach-off.json`):
  opponent = Shuckle (Agility x4), target = Crobat (Splash x4). Shuckle's
  own post-Agility effective Speed (5 × 2.0 = 10) stays far below Crobat's
  (130 × 1.0 = 130) -> Gate A true -> DRAW SITE 1 reached.
- **Control** (`tools/battle-lab/mechanic-factory-ai-cv-speedup-faster-control-off.json`):
  opponent = Crobat (Agility x4), target = Shuckle (Splash x4). Crobat's own
  post-Agility effective Speed (130 × 2.0 = 260) stays far above Shuckle's
  (5 × 1.0 = 5) -> Gate A false -> deterministic `score -3`, DRAW SITE 1
  never reached.

Single executed turn, same capture shape as every prior CBM-blocked pair
(`[A, wait 30, A, wait 700]`, `captureFrames [0,100,300,732]`).

### 20.3 Live ledger (oracle-verified, both seeds, both runs)

| Fixture | Seed | Opponent PP used | Opponent HP (start→end) | Total `Random()` calls, frame 0→732 | Determinism (2 runs) |
| --- | -: | -: | --- | -: | --- |
| Reach (Shuckle slower, Crobat target) | 1 | 1 | 95→95 (100%) | **10** | identical |
| Reach (Shuckle slower, Crobat target) | 99 | 1 | 95→95 (100%) | **10** | identical |
| Control (Crobat faster, Shuckle target) | 1 | 1 | 160→160 (100%) | **6** | identical |
| Control (Crobat faster, Shuckle target) | 99 | 1 | 160→160 (100%) | **6** | identical |

Both fixtures cleanly cross-seed-stable (10/10, 6/6) — neither side ever
takes damage (`MOVE_SPLASH` does nothing; `MOVE_AGILITY` is self-targeted,
0 power), so this pair's ledger has zero real-damage-roll confound at all,
the cleanest of this doc's CBM-blocked pairs so far.

**Attribution** (`tools/probe/attribute-factory-ai-random-callers.py`,
window `0 732`, seed 1, via `tools/run-mgba-probe.py`, final species
pairing):

| Caller function | Reach count | Control count | Delta |
| --- | -: | -: | -: |
| `BattleAI_SetupAIData+0x83` | 4 | 4 | 0 |
| `BattleTurnPassed+0x157` | 1 | 1 | 0 |
| `ChooseMoveOrAction_Singles+0xf7` | 1 | 1 | 0 |
| `Cmd_if_random_less_than+0x7` | **4** | **0** | **+4** |

Net delta +4 (10 - 6) is **entirely** `Cmd_if_random_less_than` — the
`:962` roll, once per identical `MOVE_AGILITY` slot (N=4), present in reach
and absent in control, with no `Cmd_get_ability`, `Cmd_accuracycheck`, or
`Cmd_adjustnormaldamage` rows in either table (confirming the single-ability
species choice closed the §20.2 confound, and the 0-power/0-accuracy/no-op
target move closed the damage-roll one). The single cleanest reach/control
split of any pair in this doc.

### 20.4 What this unblocks

1. **The pair's own port**: exact instruction lists, Gate A's real
   precondition (a live relative-Speed comparison, not a threshold), the
   single draw site's odds, and a live-verified twin fixture proving both
   the deterministic and probabilistic branches end-to-end — 1/1 draw sites
   covered (this pair has no unstaged sites, unlike every prior CBM-blocked
   pair in this doc).
2. **A new, doc-wide-relevant finding independent of this handler**: `AI_
   CheckBadMove`'s own shared prologue (`:47-58`) unconditionally calls
   `get_ability AI_TARGET` for every candidate move (the Soundproof check),
   so the ability-guess confound (§14.2) can reach *any* fixture in this
   doc through that path alone, even for handler bodies with zero `get_
   ability` calls of their own — "handler has no get_ability instruction"
   is necessary but not sufficient to rule the confound out; the target
   species itself must still be single-ability. Worth a re-audit pass on
   this doc's own already-banked AttackUp/DefenseDown/SpDefDown fixtures
   at some point, though all of them already happen to use Machamp
   (single-ability) as the target, so this is not believed to have
   silently contaminated any already-banked ledger — not independently
   re-verified this session (out of budget).
3. **Confirms the brief's own count** (1 `if_random_less_than` site) and
   demonstrates the doc's species-role-swap technique (§6) composes cleanly
   with its later forced-dispatch/phantom-decision discipline (§11.0,
   §14-19) for handlers gated on relative state rather than an absolute
   threshold.

### 20.5 Verify script status

`tools/probe/verify-factory-ai-checkviability-ground-truth.ts` extended
this session with `AI_CV_SpeedUp`'s 2 fixtures (§20.2/§20.3) — every prior
scenario (§9, §11.5, §12.1, §13.4, §14.6, §15.5, §16.5, §17.7, §18.7, §19.7)
unchanged and still green. **Run twice this session, ALL PASS both times.**

## 21. 2026-07-26 addendum #11: `AI_CBM_SpAtkUp` + `AI_CV_SpAtkUp` — same shape as `AttackUp` (§17), except one draw site's odds are NOT the same number

Same session as §20 (side lane, Battle Scene OFF, no-`src/`-changes
contract), continuing to the brief's second (expected) rung: `AI_CBM_
SpAtkUp` + `AI_CV_SpAtkUp`.

### 21.1 Both real bodies, cited and fully parsed

```
AI_CBM_SpAtkUp:                         (data/battle_ai_scripts.s:261-263)
	if_stat_level_equal AI_USER, STAT_SPATK, MAX_STAT_STAGE, Score_Minus10
	end
```

Byte-for-byte the same 2-instruction shape as `AI_CBM_AttackUp`/`AI_CBM_
DefenseUp`/`AI_CBM_SpeedUp` (§17.1/§18.1/§20.1) with `STAT_SPATK` swapped
in — zero `if_random_less_than`, zero `get_ability`. Dispatch table
(`data/battle_ai_scripts.s:111,136`): both `EFFECT_SPECIAL_ATTACK_UP` and
`EFFECT_SPECIAL_ATTACK_UP_2` route here.

```
AI_CV_SpAtkUp:                          (data/battle_ai_scripts.s:967-983)
	if_stat_level_less_than AI_USER, STAT_SPATK, 9, AI_CV_SpAtkUp2  ; :968 Gate A
	if_random_less_than 100, AI_CV_SpAtkUp3                          ; :969 DRAW SITE 1
	score -1
	goto AI_CV_SpAtkUp3

AI_CV_SpAtkUp2:
	if_hp_not_equal AI_USER, 100, AI_CV_SpAtkUp3                    ; :974 Gate B
	if_random_less_than 128, AI_CV_SpAtkUp3                          ; :975 DRAW SITE 2
	score +2
AI_CV_SpAtkUp3:
	if_hp_more_than AI_USER, 70, AI_CV_SpAtkUp_End                   ; :978 Gate C
	if_hp_less_than AI_USER, 40, AI_CV_SpAtkUp_ScoreDown2             ; :979 Gate D
	if_random_less_than 70, AI_CV_SpAtkUp_End                        ; :980 DRAW SITE 3
AI_CV_SpAtkUp_ScoreDown2:
	score -2
AI_CV_SpAtkUp_End:
	end
```

Exactly **3** `if_random_less_than` sites (`:969`, `:975`, `:980`), and
every gate/instruction is a **byte-for-byte structural match** to `AI_CV_
AttackUp` (`STAT_ATK` -> `STAT_SPATK`, §17.1) — Gate A/B/C/D shapes, label
topology, and score deltas all identical, re-derived independently rather
than assumed. **One real numeric difference, only visible by reading the
actual immediate operand**: DRAW SITE 3's threshold is `if_random_less_than
70` (`:980`, ~27.3% skip) here, vs. `AttackUp`'s own DRAW SITE 3 threshold
of `if_random_less_than 40` (`:909`, ~15.6% skip) — same position in the
same control-flow shape, different odds. A port that assumed "same shape as
AttackUp" therefore transfers the gate topology correctly but would get
this one constant wrong without the direct citation. (This session's own
fixtures don't reach DRAW SITE 3 either way — see 21.2 — so the discrepancy
is documented here as a citation-level correction, not something the live
ledger below independently exercises.)

### 21.2 Design: §17's Anorith/Machamp fixture design reused verbatim, dispatch move swapped for `MOVE_GROWTH`

Opponent (`AI_USER`, under test, both fixtures): **Anorith** (species 390,
reused verbatim from §17 — Battle Armor blocks `Cmd_critcalc`'s `Random()`
call), all 4 slots **`MOVE_GROWTH`** (74, `EFFECT_SPECIAL_ATTACK_UP`, 0
power, **accuracy 0** — self-target, always hits, no `Cmd_accuracycheck`
draw; both CBM- and CV-table-covered alongside `MOVE_TAIL_GLOW`'s
`EFFECT_SPECIAL_ATTACK_UP_2`, not staged — `MOVE_TAIL_GLOW`'s own accuracy
is **100**, a real accuracy check the brief's own move-choice guidance says
to avoid). Target (player, both fixtures): **Machamp** (species 68, reused
verbatim, single-ability `{GUTS, NONE}` — closes the §14.2/§20.2
ability-guess confound for the same reason it did in §17). Same capture
shape as every prior CBM-blocked pair (`[A, wait 30, A, wait 700]`,
`captureFrames [0,100,300,732]`).

- **Reach** (`tools/battle-lab/mechanic-factory-ai-cv-spatkup-fullhp-reach-off.json`):
  target uses `MOVE_SPLASH` (150) x4 — Anorith's HP never moves (120 -> 120
  both seeds), Gate B is false, falling through to DRAW SITE 2 (`:975`).
- **Control** (`tools/battle-lab/mechanic-factory-ai-cv-spatkup-lowhp-control-off.json`):
  target uses `MOVE_VITAL_THROW` (233) x4 — Anorith drops to 25% (seed 1) /
  15% (seed 99), unaffected by `MOVE_GROWTH` (raises SPATK, not DEF, so the
  §18.5 DEF-stage damage-reduction confound does not apply here — the
  damage figures match §17's own AttackUp figures exactly, not
  §18's DefenseUp ones), both comfortably under 40% -> Gate D true ->
  `ScoreDown2` directly, zero draws.

DRAW SITE 1 (`:969`, Gate A, needs the opponent's own SPATK stage already
built to 9-11) and DRAW SITE 3 (`:980`, Gate C/D's HP-in-[40,70) band) are
not staged this session — same "not attempted, time-capped" status as
`AttackUp`'s own unstaged sites (§17.5).

### 21.3 Live ledger (oracle-verified, both seeds, both runs)

| Fixture | Seed | Opponent PP used | Opponent HP (start→end) | Total `Random()` calls, frame 0→732 | Determinism (2 runs) |
| --- | -: | -: | --- | -: | --- |
| Reach (fullhp, Growth) | 1 | 1 | 120→120 (100%) | **10** | identical |
| Reach (fullhp, Growth) | 99 | 1 | 120→120 (100%) | **10** | identical |
| Control (lowhp, VitalThrow) | 1 | 1 | 120→30 (25%) | **8** | identical |
| Control (lowhp, VitalThrow) | 99 | 1 | 120→18 (15%) | **8** | identical |

Numerically identical to `AttackUp`'s own ledger (§17.4: 10/10 reach, 8/8
control) — expected, since the two handlers share every gate up through
DRAW SITE 2 byte-for-byte, and neither fixture design reaches the one
numerically-different site (DRAW SITE 3, §21.1).

**Attribution** (`tools/probe/attribute-factory-ai-random-callers.py`,
window `0 732`, seed 1, reach fixture only — control's shape (zero-draw,
deterministic) is already established by the identical AttackUp precedent
and this session's own §20.2 finding that this species pair closes the
ability-guess confound):

| Caller function | Reach count |
| --- | -: |
| `BattleAI_SetupAIData+0x83` | 4 |
| `BattleTurnPassed+0x157` | 1 |
| `ChooseMoveOrAction_Singles+0xf7` | 1 |
| `Cmd_if_random_less_than+0x7` | **4** |

Clean +4 `Cmd_if_random_less_than` (the `:975` roll, once per identical
`MOVE_GROWTH` slot), zero `Cmd_get_ability` rows — Machamp's single-ability
kit closes the §20.2-documented confound here too.

### 21.4 What this unblocks

1. **The pair's own port**: exact instruction lists, every gate's real
   precondition, all 3 draw sites' odds (including the corrected `:980`
   threshold, §21.1), and a live-verified twin fixture proving DRAW SITE
   2's reachability end-to-end — same coverage shape as `AttackUp` (§17.5).
2. **A citation-level correction that "same shape as a sibling" claims
   must still be re-derived per constant, not just per gate topology** —
   the exact trap the brief's own "never copy a sibling's gate map" rule
   warns about, caught here on a numeric operand rather than a branch
   direction (contrast §18.1's Gate C *direction* inversion, and §16's own
   equality-gate caution).

### 21.5 Verify script status

`tools/probe/verify-factory-ai-checkviability-ground-truth.ts` extended
this session with `AI_CV_SpAtkUp`'s 2 fixtures (§21.2/§21.3) — every prior
scenario (§9, §11.5, §12.1, §13.4, §14.6, §15.5, §16.5, §17.7, §18.7, §19.7,
§20.5) unchanged and still green. **Run twice this session, ALL PASS both
times.**

## 22. 2026-07-26 addendum #12: `AI_CBM_CosmicPower` + `AI_CBM_CalmMind` + `AI_CV_SpDefUp` — two separate CBM handlers converging on `DefenseUp`'s CV shape, with Gate F's polarity confirmed inverted

Prep-scout session (side lane, Battle Scene OFF), same no-`src/`-changes
contract. Goal per this step's brief: the next CBM+CV port after
Counter/Mirror Coat — `AI_CBM_CosmicPower` + `AI_CBM_CalmMind` +
whichever CV handler(s) `EFFECT_COSMIC_POWER`/`EFFECT_CALM_MIND` reach. Entry
477's side-merge groundwork flag (unstaged `SpDefUp` stretch, PROGRESS-archive
entry 477) named two things to re-derive rather than assume: (1) CBM is
**two separate handlers** (`AI_CBM_CosmicPower`, `AI_CBM_CalmMind`), unlike
every prior CBM+CV pair in this doc (§14-§21) where one CBM handler paired
with one CV handler; (2) Gate F's `if_in_bytes` is **inverted** vs
`AI_CV_DefenseUp`'s own `if_not_in_bytes` (§18.1). Both re-derived directly
from the raw assembly below, not from the flag's own prose — the flag turned
out accurate on both counts, and the live fixtures independently confirm the
inversion's actual behavioral consequence (22.3-22.4), which the flag itself
did not attempt to characterize.

### 22.1 All three real bodies, cited and fully parsed

```
AI_CBM_CosmicPower:                     (data/battle_ai_scripts.s:576-579)
	if_stat_level_equal AI_USER, STAT_DEF, MAX_STAT_STAGE, Score_Minus10
	if_stat_level_equal AI_USER, STAT_SPDEF, MAX_STAT_STAGE, Score_Minus8
	end
```

Three instructions, zero `if_random_less_than`, zero `get_ability` — byte-for-
byte the same shape as the already-staged `AI_CBM_BulkUp` (`:581-584`, §18.1:
checks the user's own ATK then DEF stage) and `AI_CBM_DragonDance`
(`:595-598`, checks ATK then Speed) — the general "checks both stats this
move raises, in raise order, `-10` for the first and `-8` for the second"
pattern this doc's own §18.1 already established, applied here to `Cosmic
Power`'s own two raised stats (DEF, then SPDEF). Confirmed against the real
`BattleScript_EffectCosmicPower` (`data/battle_scripts_1.s:2687-2698`):
`jumpifstat ATTACKER,CMP_LESS_THAN,STAT_DEF,MAX_STAT_STAGE,...` then
`jumpifstat ATTACKER,CMP_EQUAL,STAT_SPDEF,MAX_STAT_STAGE,...` — DEF first,
SPDEF second, matching the CBM handler's own check order exactly.

```
AI_CBM_CalmMind:                        (data/battle_ai_scripts.s:590-593)
	if_stat_level_equal AI_USER, STAT_SPATK, MAX_STAT_STAGE, Score_Minus10
	if_stat_level_equal AI_USER, STAT_SPDEF, MAX_STAT_STAGE, Score_Minus8
	end
```

Same three-instruction shape, `STAT_SPATK` then `STAT_SPDEF`. Confirmed
against `BattleScript_EffectCalmMind` (`:2741-2761`): SPATK stat-change first,
SPDEF second — again matching check order. **A real, if unsurprising,
divergence from the `AttackUp`/`DefenseUp`/`SpeedUp`/`SpAtkUp`/`SpDefUp`
family's own 2-instruction "single stat" shape (§17.1/§18.1/§20.1/§21.1,
`AI_CBM_SpDefUp` itself at `:265-267` below)**: these are genuinely separate,
dual-stat handlers, each independently coded per §18.1's `BulkUp`/`DragonDance`
precedent rather than composed from the single-stat handlers — e.g.
`AI_CBM_CosmicPower` does **not** `goto AI_CBM_DefenseUp` after its own DEF
check; it inlines the DEF check itself, and would silently diverge from
`AI_CBM_DefenseUp` if a future edit changed one handler's `Score_Minus10`
threshold without the other. Dispatch table confirms both are distinct
targets, not aliases: `if_effect EFFECT_COSMIC_POWER, AI_CBM_CosmicPower`
(`:209`), `if_effect EFFECT_CALM_MIND, AI_CBM_CalmMind` (`:212`) — two
`if_effect` lines, two labels, two bodies.

For completeness (not part of this pair, cited only because it sits directly
between the two above in source order and is this family's actual "single
stat" sibling):

```
AI_CBM_SpDefUp:                         (data/battle_ai_scripts.s:265-267)
	if_stat_level_equal AI_USER, STAT_SPDEF, MAX_STAT_STAGE, Score_Minus10
	end
```

Same 2-instruction shape as `AttackUp`/`DefenseUp`/`SpeedUp`/`SpAtkUp`
(§17.1/§18.1/§20.1/§21.1) with `STAT_SPDEF` swapped in. Dispatch
(`data/battle_ai_scripts.s:112,137`): `EFFECT_SPECIAL_DEFENSE_UP` and
`EFFECT_SPECIAL_DEFENSE_UP_2` route here on the **CBM side only** — this is
the fourth respect in which a stat-up pair's CBM and CV halves diverge in
their effect-to-handler mapping (after `AttackUp`/`DefenseUp`/`BulkUp`,
§17.1, and `SpAtkUp`/`SpDefUp` here): `EFFECT_SPECIAL_DEFENSE_UP{,_2}` gets
its own single-stat CBM handler, while `EFFECT_COSMIC_POWER`/`EFFECT_CALM_
MIND` each get a separate dual-stat CBM handler — but **all four** effects
converge on the exact same CV handler, derived next.

**Which CV handler(s) do `EFFECT_COSMIC_POWER`/`EFFECT_CALM_MIND` reach?**
Re-derived from the CV dispatch table directly (`data/battle_ai_scripts.s`),
not assumed from the CBM table's own structure:

```
:663  if_effect EFFECT_SPECIAL_DEFENSE_UP,   AI_CV_SpDefUp
:692  if_effect EFFECT_SPECIAL_DEFENSE_UP_2, AI_CV_SpDefUp
:770  if_effect EFFECT_COSMIC_POWER,         AI_CV_SpDefUp
:774  if_effect EFFECT_CALM_MIND,            AI_CV_SpDefUp
```

All four lines target the same label, `AI_CV_SpDefUp` — confirming the
brief's own expectation. Unlike the CBM side (one single-stat handler plus
two separate dual-stat handlers), the CV side has **exactly one** handler for
this whole effect family; `AI_CBM_CosmicPower`/`AI_CBM_CalmMind`'s own
dual-stat bodies have no CV-side counterpart to mirror (there is no
`AI_CV_CosmicPower` or `AI_CV_CalmMind` at all).

```
AI_CV_SpDefUp:                          (data/battle_ai_scripts.s:986-1013)
	if_stat_level_less_than AI_USER, STAT_SPDEF, 9, AI_CV_SpDefUp2  ; :987 Gate A (opponent's OWN SpDef stage)
	if_random_less_than 100, AI_CV_SpDefUp3                         ; :988 DRAW SITE 1
	score -1
	goto AI_CV_SpDefUp3

AI_CV_SpDefUp2:
	if_hp_not_equal AI_USER, 100, AI_CV_SpDefUp3                    ; :993 Gate B (opponent's OWN hp)
	if_random_less_than 128, AI_CV_SpDefUp3                         ; :994 DRAW SITE 2
	score +2
AI_CV_SpDefUp3:
	if_hp_less_than AI_USER, 70, AI_CV_SpDefUp4                     ; :997 Gate C (opponent's OWN hp, same direction as DefenseUp)
	if_random_less_than 200, AI_CV_SpDefUp_End                       ; :998 DRAW SITE 3
AI_CV_SpDefUp4:
	if_hp_less_than AI_USER, 40, AI_CV_SpDefUp_ScoreDown2           ; :1000 Gate D (opponent's OWN hp)
	get_last_used_bank_move AI_TARGET                                ; :1001 -- TARGET's last move, not AI_USER's
	get_move_power_from_result                                       ; :1002
	if_equal 0, AI_CV_SpDefUp5                                       ; :1003 Gate E (last move power == 0)
	get_last_used_bank_move AI_TARGET                                ; :1004
	get_move_type_from_result                                        ; :1005
	if_in_bytes AI_CV_SpDefUp_PhysicalTypes, AI_CV_SpDefUp_ScoreDown2 ; :1006 Gate F -- INVERTED polarity vs DefenseUp
	if_random_less_than 60, AI_CV_SpDefUp_End                         ; :1007 DRAW SITE 4
AI_CV_SpDefUp5:
	if_random_less_than 60, AI_CV_SpDefUp_End                         ; :1009 DRAW SITE 5
AI_CV_SpDefUp_ScoreDown2:
	score -2
AI_CV_SpDefUp_End:
	end

AI_CV_SpDefUp_PhysicalTypes:            (data/battle_ai_scripts.s:1015-1025)
	.byte TYPE_NORMAL, TYPE_FIGHTING, TYPE_POISON, TYPE_GROUND, TYPE_FLYING,
	      TYPE_ROCK, TYPE_BUG, TYPE_GHOST, TYPE_STEEL, -1
```

Exactly **5** `if_random_less_than` sites (`:988`, `:994`, `:998`, `:1007`,
`:1009`), matching `AI_CV_DefenseUp`'s own count (§18.1) exactly. Gates
A/B/C/D and the physical-types table's own byte list are **byte-for-byte
identical** to `AI_CV_DefenseUp` (`STAT_DEF` → `STAT_SPDEF` in Gates A/B
only; the odds `100`/`128`/`200`/`60`/`60` are the same five numbers at the
same five positions) — re-verified directly against the raw assembly rather
than assumed from the sibling, per this doc's own standing rule (§17/§18/§21
each caught a real divergence this way; here the check comes back clean for
every gate **except one**.

**The one real structural break, exactly where entry 477's flag said to
look: Gate F's polarity is inverted.** `AI_CV_DefenseUp`'s own Gate F
(`:935`) is `if_not_in_bytes AI_CV_DefenseUp_PhysicalTypes,
AI_CV_DefenseUp_ScoreDown2` — the target's last move type **NOT** being in
the physical-types list routes to the deterministic `score -2` stop, and
**being** in the list falls through to DRAW SITE 4. `AI_CV_SpDefUp`'s own
Gate F (`:1006`) is `if_in_bytes AI_CV_SpDefUp_PhysicalTypes,
AI_CV_SpDefUp_ScoreDown2` — the exact opposite polarity: the target's last
move type **being** in the (identical) physical-types list routes to the
deterministic stop, and **NOT** being in the list falls through to DRAW SITE
4. This is not an arbitrary asymmetry: it is the correct in-universe
semantics for the two stats these handlers gate. `DefenseUp` cares whether
the target's last move was physical (Defense mitigates it, so a *non*-
physical last move means the stat raise wasn't useful — penalize).
`SpDefUp`/`CosmicPower`/`CalmMind` care whether the target's last move was
physical too, but from the opposite side (Special Defense does *not*
mitigate physical damage, so a physical last move means the SpDef raise
wasn't useful — penalize). Same table, same list, opposite jump condition,
both correct for their own stat — exactly the kind of trap this doc's
"never copy a sibling's gate map" rule (§17/§18/§21) exists to catch, this
time on an opcode's polarity rather than a numeric operand (§21.1) or a
branch direction alone (§18.1's Gate C, which had no accompanying semantic
list to invert). Full branch enumeration (identical topology to `DefenseUp`,
§18.1, substituting the Gate F polarity):

- **Gate A** (`:987`): opponent's own SPDEF stage < 9 (true at battle start,
  `DEFAULT_STAT_STAGE` = 6) routes to `SpDefUp2`, **skipping DRAW SITE 1**.
  Not staged this session (needs a 2-turn SPDEF-stage build to 9-11, same
  "not attempted, time-capped" status as every prior pair's DRAW SITE 1,
  §17.5/§18.6/§21.2).
- **DRAW SITE 1** (`:988`): 100/256 (~39.1%) skip, else `score -1`, same
  shape as `AttackUp`/`DefenseUp`/`SpAtkUp`'s own DRAW SITE 1.
- **Gate B** (`:993`, only reached if Gate A true): opponent's own HP != 100%
  routes to `SpDefUp3`, **skipping DRAW SITE 2**. Not staged this session
  (same status as Gate A/DRAW SITE 1 — both require the opponent's own
  SPDEF stage already built to 9-11).
- **DRAW SITE 2** (`:994`): 128/256 (50%) skip, else `score +2`.
- **Gate C** (`:997`, always reached): opponent's own HP < 70% routes into
  `SpDefUp4` (the last-move branch); HP >= 70% falls through to DRAW SITE 3
  instead. Same direction as `DefenseUp`'s own Gate C (**not** `AttackUp`'s
  inverted direction, §18.1) — re-confirmed here as a real, not coincidental,
  family split: `AttackUp`/`SpAtkUp` (raise the user's own offense) use one
  Gate C direction, `DefenseUp`/`SpDefUp` (raise the user's own defense)
  use the other.
- **DRAW SITE 3** (`:998`, only reached if Gate C false): 200/256 (~78.1%)
  skip to `End`; failure (~21.9%) falls through into `SpDefUp4` anyway — not
  staged this session (needs the opponent's own HP held at exactly >=70%,
  same status as `DefenseUp`'s own unstaged DRAW SITE 3, §18.6 item 4).
- **Gate D** (`:1000`, reached whenever `SpDefUp4` is entered): opponent's
  own HP < 40% routes straight to `ScoreDown2`, skipping the last-move
  branch entirely. This session's fixtures hold HP in the deterministic
  **[40,70)%** band (Gate C true, Gate D false), identical to `DefenseUp`'s
  own design (§18.3).
- **Gate E** (`:1003`, only reached if Gate D false): target's last-used
  move power == 0 (true for `MOVE_NONE`/any 0-power move, including
  never-having-moved — §18.2's finding transfers unchanged, same
  `gLastMoves`/`MOVEEND_UPDATE_LAST_MOVES` mechanism, not re-derived here)
  routes to `SpDefUp5` (**DRAW SITE 5**, `:1009`, 60/256 skip). Not staged
  this session — same "empty and 0-power-move are the same code path,
  needs a genuine 2-turn moveset flip to isolate 'empty' specifically"
  status §18.2 already documented for `DefenseUp`.
- **Gate F** (`:1006`, only reached if Gate E false, i.e. last move has
  nonzero power): target's last move type **IS** in
  `AI_CV_SpDefUp_PhysicalTypes` routes straight to `ScoreDown2` — the
  inverted polarity documented above. **NOT** in the list falls through to
  **DRAW SITE 4** (`:1007`, 60/256 skip). This session's twin fixtures
  isolate exactly this gate (22.2-22.4).

### 22.2 Design: `DefenseUp`'s exact HP-banded last-used-move recipe (§18.3) reused verbatim, reach/control naming inverted by Gate F's own polarity

Opponent (`AI_USER`, under test, all fixtures): **Anorith** (species 390,
reused verbatim from §15-18/§21 — Battle Armor blocks `Cmd_critcalc`'s
`Random()` call entirely, no crit-driven HP-band or KO risk). Target
(player, all fixtures): **Machamp** (species 68, reused verbatim, single
ability `{GUTS, NONE}` — closes the §14.2/§20.2 ability-guess confound the
same way it has in every prior pair since §14). Neither `AI_CV_SpDefUp` nor
either `AI_CBM_*` handler reads the target's own stats/type/ability
directly — only the target's *last move* — so Machamp's kit is otherwise
irrelevant, same as `DefenseUp` (§18.3).

Two dispatch-move pairs, one per handler under test, both **0 power,
accuracy 0** (self-target, always hits, no `Cmd_accuracycheck` draw — same
class of move as `MOVE_HARDEN`/`MOVE_SWORDS_DANCE`/`MOVE_GROWTH` in every
prior CBM-blocked UP pair):

- **`AI_CBM_CosmicPower` fixtures**: opponent all 4 slots `MOVE_COSMIC_
  POWER` (322, `EFFECT_COSMIC_POWER`, Psychic, `data/battle_moves.h:4189-
  4197`) — raises the opponent's own DEF and SPDEF one stage each
  (`BattleScript_EffectCosmicPower`, 22.1).
- **`AI_CBM_CalmMind` fixtures**: opponent all 4 slots `MOVE_CALM_MIND`
  (347, `EFFECT_CALM_MIND`, Psychic, `data/battle_moves.h:4514-4522`) —
  raises the opponent's own SPATK and SPDEF one stage each
  (`BattleScript_EffectCalmMind`, 22.1).

To land Anorith's HP inside the deterministic **[40,70)%** band (Gate C
true, Gate D false) *and* control exactly what Gate E/F read, the player's
own turn-1 attacking move again does double duty exactly as `DefenseUp`'s
own design (§18.3) — it deals the damage that sets the band **and** is the
move `gLastMoves[player]` holds by the time the phantom next-turn decision
(§11.0/§17.2) reads it. Both fixed-damage moves already verified against
this exact Anorith/Machamp pairing in §18.3/§18.5 are reused verbatim,
**with no re-derivation of their damage needed**: neither move's damage
formula depends on DEF, SPATK, or SPDEF, so `Cosmic Power`'s DEF+SPDEF raise
and `Calm Mind`'s SPATK+SPDEF raise are both irrelevant to the HP outcome
(a live-confirmed fact, 22.4 — not assumed, since §18.5 already burned this
exact assumption once for `MOVE_VITAL_THROW`'s roll-based damage against a
DEF-raising dispatch move):

- `MOVE_SEISMIC_TOSS` (69, Fighting — **in** `AI_CV_SpDefUp_PhysicalTypes`,
  `EFFECT_LEVEL_DAMAGE`, `dmgtolevel` — fixed damage equal to the user's
  level, no roll, no crit calc): 120→70 (58.3%), inside [40,70).
- `MOVE_DRAGON_RAGE` (82, Dragon — **not** in the list, `EFFECT_DRAGON_
  RAGE`, `setword gBattleMoveDamage,40` — fixed 40 damage, no roll): 120→80
  (66.7%), inside [40,70).

**Because Gate F's polarity is inverted vs `DefenseUp`, the reach/control
assignment inverts too — the third time this doc has had to invert a
sibling's move-to-name convention rather than copy it (after `AttackUp`
vs `DefenseDown`/`SpDefDown`, §17.3, and here again vs `DefenseUp`
specifically):** `DefenseUp`'s own physical-list fixtures (Seismic Toss,
Vital Throw) were its **reach** fixtures (physical → falls through to DRAW
SITE 4) and its non-physical fixture (Dragon Rage) was its **control**
(non-physical → deterministic `ScoreDown2`, §18.3-§18.4). Here it is the
opposite: **Seismic Toss (physical) is now the control** (physical → Gate F
now jumps straight to `ScoreDown2`, deterministic zero handler draws) and
**Dragon Rage (non-physical) is now the reach fixture** (non-physical →
falls through Gate F into DRAW SITE 4). Naming tracks which fixture reaches
the draw site under test, exactly per §17.3's own rule — copying `DefenseUp`'s
own move-to-name assignment blind would have swapped reach and control here
too.

Four fixtures, one seed-parameterized JSON file per handler × role
(`tools/battle-lab/mechanic-factory-ai-cv-spdefup-cosmicpower-reach-off.json`,
`-cosmicpower-control-off.json`, `-calmmind-reach-off.json`,
`-calmmind-control-off.json`), same capture shape as every prior
CBM-blocked pair (`[A, wait 30, A, wait 700]`, `captureFrames
[0,100,300,732]`):

- **Reach** (`-cosmicpower-reach-off.json` / `-calmmind-reach-off.json`):
  target uses `MOVE_DRAGON_RAGE` (82) x4 — Anorith drops to 80/120 (66.7%),
  Gate F is false (Dragon, not in the physical list), falling through to
  **DRAW SITE 4** (`:1007`).
- **Control** (`-cosmicpower-control-off.json` / `-calmmind-control-off.json`):
  target uses `MOVE_SEISMIC_TOSS` (69) x4 — Anorith drops to 70/120
  (58.3%), Gate F is true (Fighting, in the physical list), routing straight
  to `AI_CV_SpDefUp_ScoreDown2` — a fully deterministic, zero-draw path
  through the entire handler tail.

DRAW SITE 1/2/3 (Gates A/B/C's own SPDEF-stage-already-built and HP==100%
preconditions) and DRAW SITE 5 (Gate E's "last move truly empty" sub-case)
are not staged this session — same "not attempted, time-capped" status as
every prior pair's own unstaged sites (§17.5/§18.6/§21.2).

### 22.3 Live ledger (oracle-verified, both seeds, both handlers, both runs)

| Fixture | Seed | Opponent PP used | Opponent HP (start→end) | Total `Random()` calls, frame 0→732 | Determinism (2 runs) |
| --- | -: | -: | --- | -: | --- |
| CosmicPower reach (Dragon Rage) | 1 | 1 | 120→80 (66.7%) | **14** | identical |
| CosmicPower reach (Dragon Rage) | 99 | 1 | 120→80 (66.7%) | **13** | identical |
| CosmicPower control (Seismic Toss) | 1 | 1 | 120→70 (58.3%) | **8** | identical |
| CosmicPower control (Seismic Toss) | 99 | 1 | 120→70 (58.3%) | **8** | identical |
| CalmMind reach (Dragon Rage) | 1 | 1 | 120→80 (66.7%) | **14** | identical |
| CalmMind reach (Dragon Rage) | 99 | 1 | 120→80 (66.7%) | **13** | identical |
| CalmMind control (Seismic Toss) | 1 | 1 | 120→70 (58.3%) | **8** | identical |
| CalmMind control (Seismic Toss) | 99 | 1 | 120→70 (58.3%) | **8** | identical |

Both handlers' control fixtures are cleanly cross-seed-stable (8/8); both
handlers' reach fixtures reproduce the
exact same **non-clean 14/13 pattern** `DefenseUp`'s own physical-list
fixtures already flagged (§18.4) — not the clean "N=4 slots × 1 draw"
shape every `AttackUp`-family handler showed (§17/§20/§21) — confirming
that anomaly is a property of *reaching this handler's last-move branch
tail* (DRAW SITE 4/5's own code region), not of any specific move or of
`DefenseUp` specifically. CosmicPower and CalmMind's ledgers are **numerically
identical** to each other in every row — expected, since both dispatch to
the same `AI_CV_SpDefUp` body and neither `Cosmic Power`'s DEF+SPDEF raise
nor `Calm Mind`'s SPATK+SPDEF raise affects `MOVE_DRAGON_RAGE`/`MOVE_SEISMIC_
TOSS`'s fixed damage.

### 22.4 Attribution (`tools/probe/attribute-factory-ai-random-callers.py`, window `0 732`, via `tools/run-mgba-probe.py`, seed 1)

| Caller function | CosmicPower reach | CosmicPower control | CalmMind reach |
| --- | -: | -: | -: |
| `BattleAI_SetupAIData+0x83` | 4 | 4 | 4 |
| `BattleTurnPassed+0x157` | 1 | 1 | 1 |
| `ChooseMoveOrAction_Singles+0xf7` | 1 | 1 | 1 |
| `Cmd_accuracycheck+0x305` | 1 | 1 | 1 |
| `Cmd_seteffectwithchance+0x81` | 1 | 1 | 1 |
| `Cmd_if_random_less_than+0x7` | **6** | **0** | **6** |
| **Total** | **14** | **8** | **14** |

`Cmd_get_ability` appears in **none** of the three tables — Machamp's
single-ability kit and Anorith's own 0-power/0-accuracy dispatch move both
close the confound, same as every prior stat-up pair since `SpeedUp`
(§20.2/§20.4). The control fixture's **zero** `Cmd_if_random_less_than`
draws is the direct, live-confirmed consequence of Gate F's inverted
polarity: where `DefenseUp`'s own non-physical (Dragon Rage) fixture was
the zero-draw one (§18.4), here it is the **physical** (Seismic Toss)
fixture that zeroes out, and the **non-physical** (Dragon Rage) fixture
that reaches the tail instead — the provable flip the brief's own gate
re-derivation demanded, now confirmed at the instrument level, not just
read off the assembly. The reach fixtures' own 6-draw (not 4-draw) count
reproduces `DefenseUp`'s own unresolved "5-6, not the clean N=4" anomaly
(§18.4) exactly — still not single-stepped to its exact per-slot source by
this session (same open item, now confirmed to recur on this handler too,
strengthening the case that it's intrinsic to `AI_CV_SpDefUp`/`AI_CV_
DefenseUp`'s shared DRAW SITE 4/5 code shape rather than a fluke of
`DefenseUp`'s own original fixture choice).

### 22.5 What this unblocks

1. **The pair's own port**: exact instruction lists for both `AI_CBM_*`
   handlers (confirmed genuinely separate, dual-stat bodies, not aliases of
   each other or of `AI_CBM_SpDefUp`) and `AI_CV_SpDefUp` (confirmed as the
   single shared CV target for all four dispatching effects), every gate's
   real precondition, the physical-types table (byte-identical to
   `DefenseUp`'s own), and a citation-backed, live-confirmed resolution of
   Gate F's inverted polarity — the exact trap entry 477's flag named,
   independently re-derived from the assembly and then independently
   reproduced at the instrument level (22.3-22.4), not merely trusted from
   the flag's own one-line note.
2. **Confirms the brief's own two claims were both accurate**: two separate
   CBM handlers (not one shared handler, unlike the CV side), and Gate F's
   polarity is genuinely inverted (not a typo or false alarm in the
   groundwork flag) — while additionally establishing *why* the inversion
   is correct (Special Defense's own real-game relationship to physical
   damage is the mirror image of Defense's), a level of justification the
   flag itself did not attempt.
3. **A second independent recurrence of `DefenseUp`'s own "5-6, not 4"
   draw-count anomaly** (§18.4, 22.3-22.4) on a different handler pair
   entirely — raises confidence this is a real, reproducible property of
   this handler's own DRAW SITE 4/5 code region (shared verbatim between
   `AI_CV_DefenseUp` and `AI_CV_SpDefUp`) rather than noise specific to one
   fixture's move choice; still flagged, not resolved, for a future porter
   to single-step.
4. **DRAW SITE 1/2/3** (Gates A/B/C's own SPDEF-stage-already-built-to-9-11
   and HP==100% preconditions) and **DRAW SITE 5** (Gate E's "genuinely
   empty last move" sub-case, as distinct from "any 0-power last move")
   remain unstaged live this session — same status, and same reasons
   (§18.2's 2-turn-moveset-flip requirement for DRAW SITE 5; a 2-turn
   stat-stage build for DRAW SITE 1/3), as `DefenseUp`'s own still-open
   items (§18.6 item 4).

### 22.6 Verify script status

`tools/probe/verify-factory-ai-checkviability-ground-truth.ts` extended
this session with `AI_CV_SpDefUp`'s 4 fixtures (22.2-22.3, both `CosmicPower`
and `CalmMind` dispatch moves) — every prior scenario (§9, §11.5, §12.1,
§13.4, §14.6, §15.5, §16.5, §17.7, §18.7, §19.7, §20.5, §21.5) unchanged and
still green. **Run twice this session, ALL PASS both times.** Reproduce with:

```sh
node --experimental-strip-types tools/probe/verify-factory-ai-checkviability-ground-truth.ts
```

## 23. 2026-07-26 addendum #13: `AI_CBM_LightScreen` + `AI_CV_LightScreen` and `AI_CBM_Reflect` + `AI_CV_Reflect` — the simplest CBM+CV pair yet, and the first with zero sibling divergence on either side

Prep-scout session (side lane, Battle Scene OFF), same no-`src/`-changes
contract. Goal per this step's brief: the next CBM+CV port after
CosmicPower/CalmMind — `AI_CBM_LightScreen`/`AI_CV_LightScreen` and
`AI_CBM_Reflect`/`AI_CV_Reflect`, four handlers total (two CBM, two CV,
unlike §22's three-handler CosmicPower/CalmMind/SpDefUp shape). The brief
named a specific trap to check for (§21/§22 each found a real LightScreen-
vs-Reflect-shaped divergence, i.e. a sibling pair in the same doc diverging
in one number or one branch polarity): re-derived below, and the honest
answer this time is that there **is no divergence** on either side — the
first pair in this doc's CBM-blocked series where that check comes back
clean both ways.

### 23.1 All four bodies, cited and fully parsed

```
AI_CBM_LightScreen:                     (data/battle_ai_scripts.s:354-356)
	if_side_affecting AI_USER, SIDE_STATUS_LIGHTSCREEN, Score_Minus8
	end

AI_CBM_Reflect:                         (data/battle_ai_scripts.s:393-395)
	if_side_affecting AI_USER, SIDE_STATUS_REFLECT, Score_Minus8
	end
```

Two instructions each, zero `if_random_less_than`, zero `get_ability` —
the single-condition check is against the opponent's (`AI_USER`) **own
side status**, not a stat stage: `SIDE_STATUS_REFLECT` = `(1 << 0)`,
`SIDE_STATUS_LIGHTSCREEN` = `(1 << 1)` (`include/constants/battle.h:
210-211`) — distinct bit flags confirming these are genuinely independent
side-condition reads, not aliases of one flag. Dispatch confirms both are
distinct targets: `if_effect EFFECT_LIGHT_SCREEN, AI_CBM_LightScreen`
(`data/battle_ai_scripts.s:126`), `if_effect EFFECT_REFLECT, AI_CBM_Reflect`
(`:147`) — matching the brief's own anchors exactly. Structurally this is
the **smallest CBM handler shape found in this doc to date**: simpler than
the 2-instruction single-stat "Up" family (`AI_CBM_SpDefUp` etc.,
§17.1/§18.1/§20.1/§21.1/§22.1) and the 3-instruction dual-stat
`CosmicPower`/`CalmMind` (§22.1) — no stat-stage read, no ability query, no
type check, just one side-status bit test.

**Divergence check, CBM side: none.** Byte-for-byte identical shape between
`LightScreen` and `Reflect`; the only difference is which `SIDE_STATUS_*`
flag is tested, and both use the identical `Score_Minus8` penalty. Re-
verified directly against the raw assembly, not assumed.

```
AI_CV_LightScreen:                      (data/battle_ai_scripts.s:1373-1382)
	if_hp_less_than AI_USER, 50, AI_CV_LightScreen_ScoreDown2        ; :1374 Gate A (opponent's OWN hp)
	get_target_type1                                                  ; :1375
	if_in_bytes AI_CV_LightScreen_SpecialTypeList, AI_CV_LightScreen_End ; :1376 Gate B (target's type1)
	get_target_type2                                                  ; :1377
	if_in_bytes AI_CV_LightScreen_SpecialTypeList, AI_CV_LightScreen_End ; :1378 Gate C (target's type2)
	if_random_less_than 50, AI_CV_LightScreen_End                     ; :1379 DRAW SITE
AI_CV_LightScreen_ScoreDown2:
	score -2
AI_CV_LightScreen_End:
	end

AI_CV_LightScreen_SpecialTypeList:      (data/battle_ai_scripts.s:1385-1393)
	.byte TYPE_FIRE, TYPE_WATER, TYPE_GRASS, TYPE_ELECTRIC, TYPE_PSYCHIC,
	      TYPE_ICE, TYPE_DRAGON, TYPE_DARK, -1

AI_CV_Reflect:                          (data/battle_ai_scripts.s:1492-1501)
	if_hp_less_than AI_USER, 50, AI_CV_Reflect_ScoreDown2             ; :1493 Gate A (opponent's OWN hp)
	get_target_type1                                                  ; :1494
	if_in_bytes AI_CV_Reflect_PhysicalTypeList, AI_CV_Reflect_End     ; :1495 Gate B (target's type1)
	get_target_type2                                                  ; :1496
	if_in_bytes AI_CV_Reflect_PhysicalTypeList, AI_CV_Reflect_End     ; :1497 Gate C (target's type2)
	if_random_less_than 50, AI_CV_Reflect_End                         ; :1498 DRAW SITE
AI_CV_Reflect_ScoreDown2:
	score -2
AI_CV_Reflect_End:
	end

AI_CV_Reflect_PhysicalTypeList:         (data/battle_ai_scripts.s:1504-1514)
	.byte TYPE_NORMAL, TYPE_FIGHTING, TYPE_FLYING, TYPE_POISON, TYPE_GROUND,
	      TYPE_ROCK, TYPE_BUG, TYPE_GHOST, TYPE_STEEL, -1
```

Dispatch confirms both are distinct targets, matching the brief's own
anchors: `if_effect EFFECT_LIGHT_SCREEN, AI_CV_LightScreen`
(`data/battle_ai_scripts.s:680`), `if_effect EFFECT_REFLECT, AI_CV_Reflect`
(`:702`). Exactly **1** `if_random_less_than` site each — the fewest of any
CBM-blocked pair documented so far (`AttackDown` had 2, `DefenseUp`/
`SpDefUp` had 5, `AccDown` had 7, §14/§18/§19/§22).

**Divergence check, CV side: also none**, beyond the necessarily-different
type-list *contents* (a "special" list for `LightScreen`, a "physical" list
for `Reflect` — Gen 3's pre-physical/special-split, per-type damage-category
convention). Same HP threshold (`50`), same draw odds (`50`/256, ~19.5%),
same instruction count, same topology, on both sides — independently
re-derived from the raw assembly per the doc's own standing rule
(§17/§18/§21/§22 each found a real divergence this way); this time the
answer comes back clean. This makes `LightScreen`/`Reflect` the **first
fully twin-symmetric pair** in the whole doc — both the CBM half and the CV
half are structurally identical between siblings, differing only in which
flag/list they reference.

**Structural comparison vs the `DefenseUp`/`SpDefUp` family (§18, §22)**:
those handlers read the **target's last-used move type**
(`get_last_used_bank_move` + `get_move_type_from_result`) — a dynamic,
turn-history-dependent signal — and have two HP thresholds (Gates C/D) plus
a last-move-power-zero check (Gate E) ahead of the type-list gate (Gate F).
`LightScreen`/`Reflect` instead read the **target's own innate type**
directly (`get_target_type1`/`get_target_type2`) — a static, species-level
signal needing no move history — and have only one HP threshold (Gate A)
with no Gates D/E at all: 3 gates plus 1 draw total, the shortest CV body
in the whole physical/special-list sub-family. Also notable: `LightScreen`'s
8-type `SpecialTypeList` and `Reflect`'s 9-type `PhysicalTypeList` together
cover **all 17 Gen 3 types with no overlap and no gap** — every species'
type falls in exactly one list, unlike `DefenseUp`/`SpDefUp`'s single shared
9-type physical list (where the complement is "not physical," not a second
named list). This complementary-list structure is what lets 23.2's twin
fixtures reuse the exact same two target species for both pairs with the
reach/control roles simply swapping.

### 23.2 Design: zero move-damage needed at all — a first for this doc's CBM-blocked-pair series

Opponent (`AI_USER`, under test, all 4 fixtures): Anorith (390), reused
verbatim from §15-18/§21/§22 for consistency, though its Battle Armor is
moot here — no damage occurs in these fixtures at all (see below), so no
crit-calc confound is even possible. Target (player, varies per fixture):
Shuckle (213, Bug/Rock, single ability `{STURDY, NONE}`) or Vulpix (37,
pure Fire, single ability `{FLASH_FIRE, NONE}`) — both single-ability
species, closing the §14.2-discovered `Cmd_get_ability` ability-guessing
confound. This matters even though neither `AI_CV_LightScreen`/
`AI_CV_Reflect` nor their own CBM handlers call `get_ability`:
`AI_CheckBadMove`'s own shared prefix (`AI_CheckBadMove_CheckSoundproof`'s
`get_ability AI_TARGET`, `:92`) runs before **every** effect dispatch
regardless of which handler it reaches, so the confound must be closed for
any CBM-blocked-pair fixture, not only ones whose own body reads ability.

Two dispatch-move pairs, one per handler under test — both real Factory-
legal status moves that are **already** 0 power / 0 accuracy / self-target
by their own game data, no need to hand-pick an unrelated 0/0 move class
this time: `MOVE_LIGHT_SCREEN` (113, `EFFECT_LIGHT_SCREEN`, Psychic,
`data/battle_moves.h:1472-1483`) and `MOVE_REFLECT` (115, `EFFECT_REFLECT`,
Psychic, `:1498-1509`), both `.accuracy = 0`, `.target = MOVE_TARGET_USER`.

Target's own move in **every** fixture: `MOVE_HARDEN` (106,
`EFFECT_DEFENSE_UP`, 0 power, 0 accuracy, `MOVE_TARGET_USER`,
`data/battle_moves.h:1381-1392`) — a self-targeting move that never touches
the opponent. Because neither side's move can deal damage, the opponent's
HP is held at its own max for the entire trace **by construction**, live-
confirmed in 23.3 — no HP-banding recipe, no fixed-damage move pairing, and
no multi-turn setup are needed at all to keep Gate A (`if_hp_less_than
AI_USER, 50`) permanently false. This is a first for this doc's
CBM-blocked-pair series: every prior pair since §14 needed at least a
one-turn real hit (or an explicit no-damage-move confirmation) to pin the
opponent's HP state; here zero damage of any kind occurs on either side
(neither `Cmd_critcalc` nor `Cmd_adjustnormaldamage` is ever called, 23.4).

Because `LightScreen`'s `SpecialTypeList` and `Reflect`'s
`PhysicalTypeList` are exact complements (23.1), the same two target
species serve both pairs, with reach/control simply swapping:

- **`AI_CBM_LightScreen`/`AI_CV_LightScreen` fixtures**: opponent all 4
  slots `MOVE_LIGHT_SCREEN` (113).
  - **Reach** (`mechanic-factory-ai-cv-lightscreen-reach-off.json`):
    target = Shuckle (213, Bug/Rock) — **neither** type is in
    `AI_CV_LightScreen_SpecialTypeList` — falls through Gates B/C into the
    DRAW SITE.
  - **Control** (`mechanic-factory-ai-cv-lightscreen-control-off.json`):
    target = Vulpix (37, pure Fire) — Fire **is** in the special list —
    Gate B matches immediately, deterministic zero-draw `End`.
- **`AI_CBM_Reflect`/`AI_CV_Reflect` fixtures**: opponent all 4 slots
  `MOVE_REFLECT` (115).
  - **Reach** (`mechanic-factory-ai-cv-reflect-reach-off.json`): target =
    Vulpix (37, pure Fire) — Fire is **not** in
    `AI_CV_Reflect_PhysicalTypeList` — falls through into the DRAW SITE.
  - **Control** (`mechanic-factory-ai-cv-reflect-control-off.json`): target
    = Shuckle (213, Bug/Rock) — **both** types are in the physical list —
    Gate B matches immediately, deterministic zero-draw `End`.

Same capture shape as every prior CBM-blocked pair (`[A, wait 30, A, wait
700]`, `captureFrames [0,100,300,732]`). Gate A (opponent HP < 50%) is not
staged this session — doing so would require real damage from the target,
which contradicts this design's own zero-damage isolation; a future porter
would need a separate, HP-banded fixture pair for that gate, same
"not attempted, time-capped" status as every prior pair's own unstaged
gates (§17.5/§18.6/§21.2/§22.5 item 4).

### 23.3 Live ledger (oracle-verified, both seeds, both handlers, both runs)

| Fixture | Seed | Opponent PP used | Opponent HP (start→end) | Total `Random()` calls, frame 0→732 | Determinism (2 runs) |
| --- | -: | -: | --- | -: | --- |
| LightScreen reach (Shuckle) | 1 | 1 | 120→120 (100%) | **10** | identical |
| LightScreen reach (Shuckle) | 99 | 1 | 120→120 (100%) | **10** | identical |
| LightScreen control (Vulpix) | 1 | 1 | 120→120 (100%) | **6** | identical |
| LightScreen control (Vulpix) | 99 | 1 | 120→120 (100%) | **6** | identical |
| Reflect reach (Vulpix) | 1 | 1 | 120→120 (100%) | **10** | identical |
| Reflect reach (Vulpix) | 99 | 1 | 120→120 (100%) | **10** | identical |
| Reflect control (Shuckle) | 1 | 1 | 120→120 (100%) | **6** | identical |
| Reflect control (Shuckle) | 99 | 1 | 120→120 (100%) | **6** | identical |

Every fixture is individually cross-seed-stable (10/10 or 6/6) — the clean
shape, not the `DefenseUp`/`SpDefUp` family's own "5-6, not 4" anomaly
(§18.4/§22.4). Both handlers' reach and control totals are **numerically
identical to each other** (10 vs 10, 6 vs 6) — expected, since 23.1 already
established zero structural divergence between the two CV bodies and
neither dispatch move's own effect touches the opponent's HP or the
target's type.

### 23.4 Attribution (`tools/probe/attribute-factory-ai-random-callers.py`, window `0 732`, via `tools/run-mgba-probe.py`, seed 1)

| Caller function | LightScreen reach | LightScreen control | Reflect reach | Reflect control |
| --- | -: | -: | -: | -: |
| `BattleAI_SetupAIData+0x83` | 4 | 4 | 4 | 4 |
| `BattleTurnPassed+0x157` | 1 | 1 | 1 | 1 |
| `ChooseMoveOrAction_Singles+0xf7` | 1 | 1 | 1 | 1 |
| `Cmd_if_random_less_than+0x7` | **4** | **0** | **4** | **0** |
| **Total** | **10** | **6** | **10** | **6** |

No `Cmd_accuracycheck` row in **any** of the four tables — both `MOVE_LIGHT_
SCREEN`/`MOVE_REFLECT` (opponent) and `MOVE_HARDEN` (target) have
`.accuracy = 0` and self-target, so neither side ever draws an accuracy
roll. This is the first CBM-blocked pair in the doc where accuracy rolls
are absent entirely, rather than merely canceling identically between
fixtures (contrast `AttackDown`'s Growl, accuracy 100, §14.3-§14.4). No
`Cmd_get_ability` row either — both Shuckle and Vulpix are single-ability
species, closing 23.2's confound live. The **+4** delta is entirely
`Cmd_if_random_less_than`, and it is the clean "N=4 slots × 1 draw" shape
(matching `AttackDown`'s own DRAW SITE 2, §14.4) rather than the
`DefenseUp`/`SpDefUp` family's unresolved 5-6-draw anomaly (§18.4/§22.4) —
consistent with this handler's draw site sitting as the *last* instruction
before `End`/`ScoreDown2` with no further gates in its tail, the same
topological position `AttackDown`'s own clean site occupies.

### 23.5 What this unblocks

1. **The pair's own port**: exact instruction lists for all four handlers,
   every gate's real precondition, both type lists in full, both draw
   sites' exact odds, and a live-verified twin-fixture pair per handler
   proving the type-list gate's own contribution end-to-end — with the
   added simplification that no damage-roll or HP-banding machinery is
   needed for a future porter to reproduce Gate A's own "opponent full HP"
   precondition (it's the deterministic default, not staged state).
2. **Confirms the brief's own divergence-check instruction found nothing to
   report, honestly**: re-derived independently from the raw assembly on
   both the CBM side and the CV side, LightScreen and Reflect are twins in
   every respect except which flag/list they reference — the first pair in
   this doc's CBM-blocked series where that's true both ways, worth stating
   plainly rather than manufacturing a divergence that isn't there.
3. **A second data point for the "clean N=4" vs "5-6 anomaly" open question**
   (§18.4/§22.4): this pair's own DRAW SITE is clean (4, not 5-6),
   reinforcing 22.4's hypothesis that the anomaly is intrinsic to
   `DefenseUp`/`SpDefUp`'s own shared last-move-branch tail code region,
   not a general property of "a type-list gate followed by a draw."
4. **Gate A** (opponent's own HP < 50%) remains unstaged live this session —
   would need a real-damage fixture variant, out of scope for this
   zero-damage isolation design; left for a future porter alongside the
   other still-open DRAW-SITE-adjacent gates in this doc (§18.6 item 4,
   §22.5 item 4).

### 23.6 Verify script status

`tools/probe/verify-factory-ai-checkviability-ground-truth.ts` extended
this session with `AI_CV_LightScreen`'s and `AI_CV_Reflect`'s 4 fixtures
total (23.2-23.3) — every prior scenario (§9, §11.5, §12.1, §13.4, §14.6,
§15.5, §16.5, §17.7, §18.7, §19.7, §20.5, §21.5, §22.6) unchanged and still
green. **Run twice this session, ALL PASS both times.** Reproduce with:

```sh
node --experimental-strip-types tools/probe/verify-factory-ai-checkviability-ground-truth.ts
```

## 24. 2026-07-26 addendum #14: `AI_CBM_EvasionUp` + `AI_CV_EvasionUp` and `AI_CBM_EvasionDown` + `AI_CV_EvasionDown` — the largest remaining CV handler by draw-site count, 2 of 8 live-verified, and a byte-for-byte "Down"-family twin

Prep-scout session (side lane, Battle Scene OFF), same no-`src/`-changes
contract. Goal per this step's brief: `AI_CV_EvasionUp` (`data/
battle_ai_scripts.s:1037-1074`, 8 `if_random_less_than` sites per §5's own
table — the largest remaining CV handler in this doc, `AccuracyDown`'s 7
being the previous record, §19) and `AI_CV_EvasionDown` (`:1235-1246`, 1
site), plus their `AI_CBM_*` counterparts, independently re-derived from
`AI_CheckBadMove`'s own dispatch table rather than assumed from any sibling
— the brief was explicit that "same shape as sibling" has already produced
6+ documented errors in this doc's history.

### 24.1 All four real bodies, cited and fully parsed

```
AI_CBM_EvasionUp:                       (data/battle_ai_scripts.s:273-275)
	if_stat_level_equal AI_USER, STAT_EVASION, MAX_STAT_STAGE, Score_Minus10  ; user's OWN evasion stage == 12 -> -10, end
	end                                                                       ; else 0, end
```

Two instructions, zero `if_random_less_than`, **zero `get_ability` calls at
all** — the same "Up"-family shape as `AttackUp`/`DefenseUp`/`SpeedUp`/
`SpAtkUp`/`SpDefUp`/`AccUp` (§17.1/§18.1/§20.1/§21.1/§22.1, `AI_CBM_AccUp`
itself sits immediately above this handler at `:269-271`): reads only
`AI_USER`'s own stat stage, never touches `AI_TARGET`, so the §14.2
ability-guess confound cannot occur here by construction, not by species
choice. Dispatch table confirms three separate effects converge on this one
handler: `if_effect EFFECT_EVASION_UP, AI_CBM_EvasionUp` (`:114`),
`if_effect EFFECT_EVASION_UP_2, AI_CBM_EvasionUp` (`:139`), `if_effect
EFFECT_MINIMIZE, AI_CBM_EvasionUp` (`:163`) — `Minimize`'s own CBM side
shares `AttackUp`'s single-handler shape (not `BulkUp`/`CosmicPower`/
`CalmMind`'s separate-dual-stat-handler pattern, §22.1), because Minimize
only ever raises the one stat (`STAT_EVASION`).

```
AI_CBM_EvasionDown:                     (data/battle_ai_scripts.s:306-312)
	if_stat_level_equal AI_TARGET, STAT_EVASION, MIN_STAT_STAGE, Score_Minus10  ; target EVASION stage == 0 -> -10, end
CheckIfAbilityBlocksStatChange:         (shared tail, :308-312)
	get_ability AI_TARGET
	if_equal ABILITY_CLEAR_BODY, Score_Minus10
	if_equal ABILITY_WHITE_SMOKE, Score_Minus10
	end
```

`AI_CBM_EvasionDown`'s own label sits directly **above** the shared
`CheckIfAbilityBlocksStatChange` tail in source order (execution falls
through, no explicit `goto` needed) — the same "plain" 1-instruction-plus-
shared-tail shape as `AI_CBM_DefenseDown`/`AI_CBM_SpAtkDown`/`AI_CBM_SpDefDown`
(§15.1/§16.1), confirmed by direct read, **not** `AI_CBM_AttackDown`/
`AI_CBM_AccDown`'s extra own-ability short-circuit (Hyper Cutter/Keen Eye,
§14.1/§19.1) — there is no dedicated "evasion-immunity" ability in Gen 3 to
gate on, so this handler has no third branch to miss. Dispatch table:
`if_effect EFFECT_EVASION_DOWN, AI_CBM_EvasionDown` (`:121`), `if_effect
EFFECT_EVASION_DOWN_2, AI_CBM_EvasionDown` (`:146`).

```
AI_CV_EvasionUp:                        (data/battle_ai_scripts.s:1037-1074)
	if_hp_less_than AI_USER, 90, AI_CV_EvasionUp2                    ; :1038 Gate A (opponent's OWN hp)
	if_random_less_than 100, AI_CV_EvasionUp2                        ; :1039 DRAW SITE 1
	score +3
AI_CV_EvasionUp2:
	if_stat_level_less_than AI_USER, STAT_EVASION, 9, AI_CV_EvasionUp3  ; :1042 Gate B (opponent's OWN evasion stage)
	if_random_less_than 128, AI_CV_EvasionUp3                        ; :1043 DRAW SITE 2
	score -1
AI_CV_EvasionUp3:
	if_not_status AI_TARGET, STATUS1_TOXIC_POISON, AI_CV_EvasionUp5  ; :1046 Gate C (target toxic-poisoned?)
	if_hp_more_than AI_USER, 50, AI_CV_EvasionUp4                    ; :1047 Gate D (opponent's OWN hp, only if Gate C true)
	if_random_less_than 80, AI_CV_EvasionUp5                         ; :1048 DRAW SITE 3
AI_CV_EvasionUp4:
	if_random_less_than 50, AI_CV_EvasionUp5                         ; :1050 DRAW SITE 4
	score +3
AI_CV_EvasionUp5:
	if_not_status3 AI_TARGET, STATUS3_LEECHSEED, AI_CV_EvasionUp6    ; :1053 Gate E (target leech-seeded?)
	if_random_less_than 70, AI_CV_EvasionUp6                         ; :1054 DRAW SITE 5
	score +3
AI_CV_EvasionUp6:
	if_not_status3 AI_USER, STATUS3_ROOTED, AI_CV_EvasionUp7         ; :1057 Gate F (opponent's OWN Ingrain flag)
	if_random_less_than 128, AI_CV_EvasionUp7                        ; :1058 DRAW SITE 6
	score +2
AI_CV_EvasionUp7:
	if_not_status2 AI_TARGET, STATUS2_CURSED, AI_CV_EvasionUp8       ; :1061 Gate G (target cursed?)
	if_random_less_than 70, AI_CV_EvasionUp8                         ; :1062 DRAW SITE 7
	score +3
AI_CV_EvasionUp8:
	if_hp_more_than AI_USER, 70, AI_CV_EvasionUp_End                 ; :1065 Gate H (opponent's OWN hp)
	if_stat_level_equal AI_USER, STAT_EVASION, DEFAULT_STAT_STAGE, AI_CV_EvasionUp_End  ; :1066 Gate I (opponent's OWN evasion stage)
	if_hp_less_than AI_USER, 40, AI_CV_EvasionUp_ScoreDown2          ; :1067 Gate J
	if_hp_less_than AI_TARGET, 40, AI_CV_EvasionUp_ScoreDown2        ; :1068 Gate K
	if_random_less_than 70, AI_CV_EvasionUp_End                      ; :1069 DRAW SITE 8
AI_CV_EvasionUp_ScoreDown2:
	score -2
AI_CV_EvasionUp_End:
	end
```

Exactly **8** `if_random_less_than` sites (`:1039,1043,1048,1050,1054,1058,
1062,1069`), matching §3/§5's corrected count. **Divergence check against
`AI_CV_AccuracyDown` (§19.1), the closest structural sibling — re-derived
independently, not assumed**: both handlers share the four status-gated
draw sites (toxic/leechseed/rooted/cursed, `+2`/`+2`/`+1`/`+2` for
AccuracyDown vs `+3`/`+3`/`+2`/`+3` here — the score deltas differ, the
odds do not: 70/70/128/70 both handlers) and a structurally identical
`Gate H/I/J/K` + final-draw tail. But **three real divergences**, all
confirmed from the raw assembly, none inherited from AccuracyDown's shape:

1. **Gate A/DRAW SITE 1 has no Gate B companion.** AccuracyDown's own DRAW
   SITE 1 has *two* independent routes in (either battler's HP ≤ 70%,
   §19.1). EvasionUp's DRAW SITE 1 has exactly **one** gate (opponent's own
   HP < 90% skips; ≥ 90% reaches) — `AI_TARGET`'s HP is never read anywhere
   near this site. A porter who copied AccuracyDown's two-gate shape here
   would silently add a nonexistent second reach path.
2. **The HP threshold at Gate A is 90, not 70.** AccuracyDown's equivalent
   gate uses `70`. EvasionUp's own default full-HP battle start (100% ≥
   90%) *already* satisfies Gate A with zero staging — the cheapest reach
   condition of any draw site documented in this doc (24.2).
3. **Gate I reads `AI_USER`, not `AI_TARGET`.** AccuracyDown's own Gate I
   checks the *target's* ACC stage == default (because `AccuracyDown`
   lowers the target's stat, so the "have we already touched this stat"
   check must read the target). EvasionUp raises the **opponent's own**
   evasion, so the analogous "already touched" check correctly reads
   `AI_USER`'s own evasion stage == `DEFAULT_STAT_STAGE` instead — the
   operand flips because the stat being tracked belongs to a different
   battler for an UP handler than for a DOWN handler. This is the same
   family of `AI_USER`/`AI_TARGET`-operand divergence the brief warned
   about, now confirmed on a gate that is structurally present in both
   siblings but reads a different battler in each.

Full branch enumeration:

- **Gate A** (`:1038`): opponent's own HP < 90% skips DRAW SITE 1 entirely
  (`AI_CV_EvasionUp2`, no score, no draw). **≥ 90% reaches it** — true by
  default at full HP, no staging needed (24.2).
- **DRAW SITE 1** (`:1039`): 100/256 (~39.1%) skip, else (~60.9%) `score
  +3`.
- **Gate B** (`:1042`): opponent's own evasion stage < 9 (true at battle
  start, default 6) skips DRAW SITE 2. Only a battler whose own evasion has
  already been raised to 9-11 by a prior real hit reaches it — a 3-turn
  build, not staged this session (24.5).
- **DRAW SITE 2** (`:1043`): 128/256 (50%) skip, else (50%) `score -1`.
- **Gate C** (`:1046`): target **not** toxic-poisoned skips straight to
  `EvasionUp5` (Gates D and DRAW SITE 3/4 both unreached). Only a target the
  opponent has *already* badly-poisoned reaches the D/DRAW SITE 3-4 pair —
  needs a real `EFFECT_TOXIC` move in the opponent's own kit, a mixed-
  moveset/genuine-AI-pick obstacle, not staged (24.5, same obstacle class as
  `AccuracyDown`'s own sites 3/4, §19.5).
- **Gate D** (`:1047`, only reached if Gate C true): opponent's own HP > 50%
  routes to `EvasionUp4` (**DRAW SITE 4**, `:1050`, 50/256 skip, else `score
  +3`); HP ≤ 50% falls straight into **DRAW SITE 3** (`:1048`, 80/256 skip,
  else `score +3`, then falls through to `EvasionUp5` without a further
  score). Two mutually exclusive draw sites gated by the same HP split, both
  behind the same toxic-poison precondition.
- **Gate E** (`:1053`): target **not** leech-seeded skips DRAW SITE 5. Same
  mixed-moveset obstacle as Gate C, needs `EFFECT_LEECH_SEED` in the
  opponent's kit, not staged.
- **DRAW SITE 5** (`:1054`): 70/256 (~27.3%) skip, else `score +3`.
- **Gate F** (`:1057`): opponent's **own** `STATUS3_ROOTED` (Ingrain)
  absent skips DRAW SITE 6. Self-targeted precondition (no accuracy roll
  needed to land Ingrain on oneself) but still needs a second, structurally
  different move in the opponent's own kit alongside the Double-Team-style
  dispatch move — a genuine AI pick between two moves across two turns, not
  solvable by the identical-4-slots trick alone, not staged (24.5).
- **DRAW SITE 6** (`:1058`): 128/256 (50%) skip, else `score +2`.
- **Gate G** (`:1061`): target **not** cursed skips DRAW SITE 7. Needs a
  Ghost-typed opponent with `EFFECT_CURSE` in its kit, same mixed-moveset
  obstacle as Gates C/E, not staged.
- **DRAW SITE 7** (`:1062`): 70/256 (~27.3%) skip, else `score +3`.
- **Gate H** (`:1065`): opponent's own HP > 70% jumps straight to `End`,
  **skipping the entire tail** (Gate I, J, K, DRAW SITE 8). ≤ 70% continues.
- **Gate I** (`:1066`): opponent's own evasion stage == `DEFAULT_STAT_STAGE`
  (6) jumps to `End`. Because the dispatch move (Double Team) is a
  self-buff that has already executed once by the time the phantom next-
  decision runs (§11.0/§17.2's "only the phantom decision is observable"
  mechanism), the opponent's own evasion reads **7**, not 6, at that point
  — Gate I is false and the tail continues. The exact same "dispatch move's
  own prior effect changes a later gate" finding §19.1 made for
  `AccuracyDown`'s Gate I, reproduced here on the opposite operand
  (`AI_USER` instead of `AI_TARGET`) because EvasionUp's dispatch move is
  self-targeted rather than target-targeted.
- **Gates J/K** (`:1067/1068`): opponent HP < 40% OR target HP < 40% jump
  straight to the deterministic `score -2`, skipping DRAW SITE 8.
- **DRAW SITE 8** (`:1069`): 70/256 (~27.3%) skip to `End` (no score
  change), else (~72.7%) falls into `ScoreDown2` (`score -2`) — same
  topological position (last instruction before `End`/`ScoreDown2`, no
  further gates in its own tail) as `AccuracyDown`'s own clean DRAW SITE 7
  (§19.4) and `LightScreen`/`Reflect`'s single site (§23.4), **not**
  `DefenseUp`/`SpDefUp`'s unresolved 5-6-draw anomaly (§18.4/§22.4) —
  confirmed clean at the instrument level below (24.3-24.4).

```
AI_CV_EvasionDown:                      (data/battle_ai_scripts.s:1235-1246)
	if_hp_less_than AI_USER, 70, AI_CV_EvasionDown2                     ; :1236 Gate A (opponent's OWN hp)
	if_stat_level_more_than AI_TARGET, STAT_EVASION, 3, AI_CV_EvasionDown3  ; :1237 Gate B (only reached if Gate A false)
AI_CV_EvasionDown2:
	if_random_less_than 50, AI_CV_EvasionDown3                          ; :1239 DRAW SITE
	score -2
AI_CV_EvasionDown3:
	if_hp_more_than AI_TARGET, 70, AI_CV_EvasionDown_End                ; :1242 Gate C (target's OWN hp)
	score -2
AI_CV_EvasionDown_End:
	end
```

Exactly **1** `if_random_less_than` site (`:1239`), matching §3/§5's
corrected count. **Divergence check against `AI_CV_DefenseDown`/
`AI_CV_SpDefDown` (§15.1/§16.1) — re-derived independently: none.**
Byte-for-byte identical topology, `STAT_DEF`/`STAT_SPDEF` swapped for
`STAT_EVASION`, same `70`/`50`/`70` thresholds and odds, same `score -2` on
every non-skip branch. This is the second "zero-divergence" pair in this
doc after `LightScreen`/`Reflect` (§23.1) — but here the twin is a
*different* handler in the *same* family (Down-stat-with-opponent-HP-gate),
not two effects sharing one handler.

### 24.2 Design

**`AI_CV_EvasionUp`, three fixtures isolating DRAW SITE 1 and DRAW SITE 8
(the only two reachable without a mixed-moveset AI pick)**: opponent
(`AI_USER`, under test, all fixtures) **Machamp** (species 68, single
ability `{GUTS, NONE}` — closes the universal `AI_CheckBadMove_
CheckSoundproof` prefix's `get_ability AI_TARGET` confound, §14.2/§23.2,
which applies to every CBM-blocked-pair fixture regardless of whether the
handler itself reads ability), all 4 slots **`MOVE_DOUBLE_TEAM`** (104,
`EFFECT_EVASION_UP`, 0 power, 0 accuracy, `MOVE_TARGET_USER` —
`data/battle_moves.h:1355-1365`, raises the user's own evasion by 1 stage,
`data/battle_scripts_1.s:487-488`). Target (player, all fixtures)
**Anorith** (species 390, single ability `{BATTLE_ARMOR, NONE}`, reused
verbatim from §15-18/§21-23), move varies per fixture. Because Gate A's own
threshold (90%) and Gate H's own threshold (70%) are disjoint bands, **no
single opponent HP value can simultaneously reach DRAW SITE 1 and the tail**
— unlike `AccuracyDown`'s own twin-site fixture (§19.3, both gates share the
same 70% threshold) this pair needs three fixtures, not two, to cover both
sites plus a shared zero-draw baseline:

- **`evasionup-fullhp-reach`** (DRAW SITE 1): target's move is
  **`MOVE_SPLASH`** (150, 0 power, no effect) — Machamp's HP never moves
  (165/165, 100%, ≥ 90%), so Gate A is false **by construction, no damage
  staging required at all** (the same "zero-damage isolation" trick §23.2
  established for `LightScreen`/`Reflect`'s own Gate A) and DRAW SITE 1
  fires. Gate H is also true at 100% HP, so the tail (DRAW SITE 8) stays
  deterministically unreached in this same fixture — the two sites cannot
  contaminate each other here.
- **`evasionup-midhp-control`** (shared zero-draw baseline for BOTH sites):
  target's move is **`MOVE_DRAGON_RAGE`** (82, `EFFECT_DRAGON_RAGE`, fixed
  40 damage, no roll, `data/battle_scripts_1.s`, reused verbatim from
  §22.2) — Machamp 165→125 (75.8%), landing **inside the (70%,90%) gap
  between both gates' own thresholds**: Gate A is true (75.8% < 90%, skips
  DRAW SITE 1) and Gate H is also true (75.8% > 70%, skips the entire
  tail). This single fixture is a genuine deterministic zero-draw control
  for both isolations at once — no HP value could do double duty this way
  for `AccuracyDown` (whose two gates shared one threshold) or for
  `LightScreen`/`Reflect` (whose only gate has no companion draw site to
  cross-contaminate).
- **`evasionup-lowhp-reach`** (DRAW SITE 8): target's move is **`MOVE_
  SEISMIC_TOSS`** (69, `EFFECT_LEVEL_DAMAGE`, fixed damage = user's level,
  no roll, reused verbatim from §19.3/§22.2) — Machamp 165→115 (69.7%).
  Gate A is true (69.7% < 90%, DRAW SITE 1 skipped); Gate H is false
  (69.7% ≤ 70%, tail continues); Gate I is false because Double Team's own
  self-effect has already raised Machamp's evasion stage 6→7 by the time
  the phantom next-decision reads it (24.1's own finding); Gates J/K are
  both false (Machamp 69.7% ≥ 40%, Anorith undamaged at 100% ≥ 40%) — falls
  through into DRAW SITE 8.

Same capture shape as every prior CBM-blocked pair (`[A, wait 30, A, wait
700]`, `captureFrames [0,100,300,732]`). DRAW SITE 2 (opponent's own
evasion stage already built to 9-11) and DRAW SITES 3/4/5/6/7 (target
toxic/leechseed/cursed or opponent's own Ingrain — all four needing a
genuine, unforced AI pick between two structurally different moves in the
opponent's own kit) are not staged this session — same obstacle class
`AccuracyDown`'s own sites 2-6 already documented (§19.5), recipes below
(24.5).

**`AI_CV_EvasionDown`, twin fixtures reusing §15's `DefenseDown` design
verbatim (only the dispatch move changes)**: opponent (`AI_USER`, under
test, both fixtures) **Anorith** (390, single ability Battle Armor — blocks
`Cmd_critcalc`'s `Random()` call entirely, no crit-overshoot risk), all 4
slots **`MOVE_SWEET_SCENT`** (230, `EFFECT_EVASION_DOWN`, 0 power, 100
accuracy, `MOVE_TARGET_BOTH`, `data/battle_moves.h:2993-3003`). Target
(player, both fixtures) **Machamp** (68, single ability Guts). Gate A alone
decides reachability in both fixtures (opponent's own HP < 70%), exactly
`DefenseDown`'s own shape (§15.2) — Gate B (target's own evasion stage > 3)
is irrelevant to this isolation since Gate A's own true/false branch
already decides everything needed:

- **`evasiondown-lowhp-reach`**: player (Machamp) all 4 slots **`MOVE_
  VITAL_THROW`** (233, `EFFECT_VITAL_THROW`, hardcoded always-hit —
  `src/battle_script_commands.c:1090`, `EFFECT_ALWAYS_HIT ||
  EFFECT_VITAL_THROW` bypasses `Cmd_accuracycheck`'s own `Random()` call
  entirely) — turn 1 lands the sized hit (86-102 damage, §13.2's own
  verified range against Anorith's 120 max HP), dropping Anorith to
  22/120 (18%, seed 1) or 30/120 (25%, seed 99), both comfortably under
  Gate A's 70% threshold; the phantom decision's Gate A fires true,
  reaching the draw site.
- **`evasiondown-fullhp-control`**: player's 4 slots are **`MOVE_SPLASH`**
  instead — Anorith's HP never moves, Gate A stays false, Gate B (Machamp's
  evasion stage, untouched at 6) stays true, deterministic zero-draw skip.

### 24.3 Live ledger (oracle-verified, both seeds, both handlers, both runs)

| Fixture | Seed | Opponent PP used | Opponent HP (start→end) | Total `Random()` calls, frame 0→732 | Determinism (2 runs) |
| --- | -: | -: | --- | -: | --- |
| EvasionUp fullhp-reach (Splash) | 1 | 1 | 165→165 (100%) | **10** | identical |
| EvasionUp fullhp-reach (Splash) | 99 | 1 | 165→165 (100%) | **10** | identical |
| EvasionUp midhp-control (Dragon Rage) | 1 | 1 | 165→125 (75.8%) | **8** | identical |
| EvasionUp midhp-control (Dragon Rage) | 99 | 1 | 165→125 (75.8%) | **8** | identical |
| EvasionUp lowhp-reach (Seismic Toss) | 1 | 1 | 165→115 (69.7%) | **12** | identical |
| EvasionUp lowhp-reach (Seismic Toss) | 99 | 1 | 165→115 (69.7%) | **12** | identical |
| EvasionDown lowhp-reach (Vital Throw) | 1 | 1 | 120→22 (18%) | **13** | identical |
| EvasionDown lowhp-reach (Vital Throw) | 99 | 1 | 120→30 (25%) | **13** | identical |
| EvasionDown fullhp-control (Splash) | 1 | 1 | 120→120 (100%) | **7** | identical |
| EvasionDown fullhp-control (Splash) | 99 | 1 | 120→120 (100%) | **7** | identical |

Every fixture is individually cross-seed-stable (10/10, 8/8, 12/12, 13/13,
7/7) — the clean shape, matching `EvasionDown`'s own numerically-identical
ledger to `DefenseDown`'s (13/13 reach, 7/7 control, §15.3) and confirming
`EvasionUp`'s own two draw sites both avoid the `DefenseUp`/`SpDefUp`
family's unresolved 5-6-draw anomaly.

### 24.4 Attribution (`tools/probe/attribute-factory-ai-random-callers.py`, window `0 732`, via `tools/run-mgba-probe.py`, seed 1)

| Caller function | UP fullhp-reach | UP midhp-control | UP lowhp-reach | DOWN lowhp-reach | DOWN fullhp-control |
| --- | -: | -: | -: | -: | -: |
| `BattleAI_SetupAIData+0x83` | 4 | 4 | 4 | 4 | 4 |
| `BattleTurnPassed+0x157` | 1 | 1 | 1 | 1 | 1 |
| `ChooseMoveOrAction_Singles+0xf7` | 1 | 1 | 1 | 1 | 1 |
| `Cmd_accuracycheck+0x305` | 0 | 1 | 1 | 1 | 1 |
| `Cmd_adjustnormaldamage+0x7` | 0 | 0 | 0 | 1 | 0 |
| `Cmd_seteffectwithchance+0x81` | 0 | 1 | 1 | 1 | 0 |
| `Cmd_if_random_less_than+0x7` | **4** | **0** | **4** | **4** | **0** |
| **Total** | **10** | **8** | **12** | **13** | **7** |

`Cmd_get_ability` appears in **none** of the five tables — both Machamp and
Anorith's single-ability kits close the universal `AI_CheckBadMove` prefix
confound (§14.2/§23.2), and `AI_CBM_EvasionUp` has no `get_ability` call of
its own to add a second draw (24.1). `EvasionUp`'s `fullhp-reach` fixture
has **zero** `Cmd_accuracycheck`/`Cmd_seteffectwithchance` rows — both
`MOVE_DOUBLE_TEAM` and `MOVE_SPLASH` are 0-accuracy/no-effect, the first
CBM-blocked-pair fixture pair since `LightScreen`/`Reflect` (§23.4) with a
row that clean. `midhp-control`'s and `lowhp-reach`'s own `+1`/`+1`
(`Cmd_accuracycheck`/`Cmd_seteffectwithchance`) are `MOVE_DRAGON_RAGE`/
`MOVE_SEISMIC_TOSS` actually connecting — the flipped precondition's own
necessary cost, not part of the handler (same accounting discipline as
every prior pair, §15.3/§19.4/§22.4). `EvasionDown`'s own reach/control
split (`+1 Cmd_adjustnormaldamage`, `+4 Cmd_if_random_less_than`, `+1
Cmd_seteffectwithchance` for reach; a constant `Cmd_accuracycheck=1` in
both, `MOVE_SWEET_SCENT`'s own roll, never `MOVE_VITAL_THROW`'s per 24.1's
citation) is numerically **identical** to `DefenseDown`'s own attribution
table (§15.3) in every row, confirming the byte-for-byte topology match at
the instrument level, not just on paper. Both of `EvasionUp`'s reach
fixtures show the clean **`+4`** `Cmd_if_random_less_than` delta (N=4
identical slots × 1 draw), not the `DefenseUp`/`SpDefUp` family's
unresolved 5-6 anomaly (§18.4/§22.4) — a third confirmation (after
`AccuracyDown`'s DRAW SITE 7, §19.4, and `LightScreen`/`Reflect`'s single
site, §23.4) that the anomaly is specific to the last-move-type-list code
region those two handlers share, not a general property of "a draw site
sitting last before `End`."

### 24.5 DRAW SITE 3/4 (toxic-poison chain) — live-verified this follow-up session; 4 sites remain recipe-only

**DRAW SITE 3 / DRAW SITE 4, live-verified** (`:1048`/`:1050`, target
`STATUS1_TOXIC_POISON`) — this follow-up side-lane session (Battle Scene OFF
oracle) closed the "genuine, unforced AI pick between two structurally
different moves" obstacle the recipe below used to name, using the
**two-Pokémon opponent relay** `docs/factory-ai-checkviability-ground-
truth.md` §19.5 itself suggested for `AccuracyDown`'s analogous sites 3/4
("one opponent Pokémon whose entire kit is Toxic lands the status and
faints/switches, a second with the identical-slots candidate moves next"):
opponent party slot 0 = **Magikarp** (129, level 5 — the low level is the
whole trick, shrinking its max HP to 18 so a single `MOVE_SEISMIC_TOSS` hit
is a guaranteed OHKO regardless of the roll), all 4 slots **`MOVE_TOXIC`**
(92) — forced (4 identical slots), so its real turn-1 use against the
target is not an unforced pick at all. Target (player) **Anorith** (390,
single ability Battle Armor, reused verbatim from §13-23), all 4 slots
**`MOVE_SEISMIC_TOSS`** (69, `EFFECT_LEVEL_DAMAGE`, fixed 50 dmg = Anorith's
level, reused verbatim from §18.3/§19.3/§24.2). Opponent party slot 1 = the
handler under test, **Shuckle** (213, single ability Sturdy, base Speed 5),
all 4 slots **`MOVE_DOUBLE_TEAM`** (104).

Turn 1: Magikarp (forced) uses Toxic on Anorith — lands both banked seeds
(85% accuracy, not hard-guaranteed, but empirically confirmed live at both
seed 1 and seed 99); Anorith Splashes (harmless, no retaliation risk while
Magikarp is still needed alive to move). Turn 2: Anorith Seismic Tosses
Magikarp (18 max HP, OHKO) — the opponent auto-sends Shuckle, switching in
fresh at 95/95 (100%). **A new same-turn confound found live, closed by
species choice, not staging**: an early draft used Magikarp (base Speed 80)
for *both* opponent slots — since Magikarp is faster than Anorith (base
Speed 75), Shuckle's own `MOVE_DOUBLE_TEAM` (raising its own evasion stage,
executing *first* within the turn) would land before Anorith's *same-turn*
Seismic Toss resolved, turning what should be Seismic Toss's guaranteed-hit
100-accuracy check into a real, probabilistic ~85.7%-chance roll against the
now-raised evasion stage — the exact same bug class §19.2/§19.5 already
named for `AccuracyDown`'s own dispatch move (a same-turn move-order
confound), just triggered here by the SECOND opponent Pokémon's own
self-buff instead of the dispatch move itself. **Fix**: Shuckle's base Speed
5 (vs. Anorith's 75) guarantees Anorith always moves first, so every Seismic
Toss against it lands as a deterministic 50 damage with the target's evasion
still at its pre-turn value.

- **`evasionup-toxicchain-reach`** (REACH — the chain itself): after turn 2,
  the trace continues into **turn 3** — Anorith Seismic Tosses Shuckle again
  (95→45, 47.4%, comfortably ≤ 50%). The trailing phantom decision (this
  doc's own "only the phantom next-decision is observable" mechanism, §11.0)
  then reads target-toxic = true **and** opponent-own-HP ≤ 50% — Gate D's
  reach condition for DRAW SITE 3's own chain.
- **`evasionup-toxicchain-control`** (CONTROL A — same toxic prerequisite,
  opposite HP band): the trace stops right after turn 2, capturing the
  trailing phantom decision with Shuckle still fresh at 95/95 (> 50%) — Gate
  D routes straight to DRAW SITE 4 alone, DRAW SITE 3 never reached.
- **CONTROL B (no toxic) — already proven, not re-staged**: none of §24.3's
  three existing `AI_CV_EvasionUp` fixtures (`fullhp-reach`, `midhp-control`,
  `lowhp-reach`) ever apply `STATUS1_TOXIC_POISON` to the target, and Gate C
  (`:1046`) is checked unconditionally on every pass regardless of the
  opponent's own HP band — so all three already live-verified fixtures are
  standing proof that Gates C/D and DRAW SITES 3/4 stay at zero draws when
  the target isn't toxic-poisoned. No new fixture needed for this leg.

**Live ledger, per-DRAW-SITE attribution**
(`tools/probe/attribute-factory-ai-cv-drawsite-callers.py`, run against the
handler's own real ROM addresses even though the script's checked-in
`DRAW_SITE_TABLE` only names `DefenseUp`/`SpDefUp` — every `EvasionUp`-family
hit still resolves to its own exact `AI_CV_EvasionUp*+0x<offset>` label via
the script's `ai-decision-other-script` fallback path, which is what the
table below transcribes; both seeds, window `0`→finalFrame):

| Fixture | Seed | Opponent end state | `AI_CV_EvasionUp` (site 1) | `AI_CV_EvasionUp3` (site 3) | `AI_CV_EvasionUp4` (site 4) | `AI_CV_EvasionUp8` (site 8) | Total `Random()` (frame 0→final) |
| --- | -: | --- | -: | -: | -: | -: | -: |
| REACH | 1 | Shuckle 45/95 (47.4%) | 4 | **4** | **6** | 4 | 41 |
| REACH | 99 | Shuckle 45/95 (47.4%) | 4 | **4** | **7** | 4 | 42 |
| CONTROL A | 1 | Shuckle 95/95 (100%) | 4 | **0** | **4** | 0 | 23 |
| CONTROL A | 99 | Shuckle 95/95 (100%) | 4 | **0** | **4** | 0 | 23 |

**Oracle corroborates the chained model from `docs/factory-ai-draw-
discrepancy-probe.md` §7.1/§7.3 (commit 20f09bb) exactly, with numbers**:
CONTROL A's own DRAW SITE 3 count is **zero** in both seeds — when the
opponent's own HP is > 50%, Gate D routes straight past DRAW SITE 3 entirely
(the pre-fix port's "mutually exclusive" comment was correct about *this*
half). REACH's own DRAW SITE 3 count is a flat **4** in both seeds — one
draw per identical `MOVE_DOUBLE_TEAM` slot, *unconditionally*, regardless of
each roll's own outcome, exactly the "a second draw is mandatory" chain
shape, never fewer. DRAW SITE 4's own count decomposes cleanly: both REACH
fixtures carry CONTROL's own direct-entry baseline of 4 (from the *earlier*,
still-100%-HP decision computed right after turn 2, before Anorith's turn-3
hit lands) **plus** 2 (seed 1) / 3 (seed 99) *extra* draws — exactly the
number of the 4 identical slots whose own DRAW SITE 3 roll fell through
(`>= 80`) into a second roll at DRAW SITE 4, landing inside the fixed
model's own valid `[4, 8]`-draw range every time. Had the pre-fix "two
mutually exclusive single-draw sites" model still been live, REACH's own
DRAW SITE 3 count would have had to be **zero** whenever DRAW SITE 4 fired
(and vice versa) — the oracle shows both firing together, non-zero, in the
same decision, which the old model cannot produce at all. This is the live
corroboration `docs/factory-ai-draw-discrepancy-probe.md` §7.4 asked a
future session to add.

The 4 remaining sites below are still recipe-only:

- **DRAW SITE 2** (`:1043`, `score -1`, reached iff the **opponent's own**
  evasion stage is already ≥ 9): stage it with the identical-4-slots
  `MOVE_DOUBLE_TEAM` kit itself — 3 executed turns raise the stage 6→7→8→9,
  then a 4th turn's (or phantom) decision reaches the roll with Gate A held
  false (opponent HP kept ≥ 90% throughout, e.g. via a 0-power target move)
  to avoid DRAW SITE 1 contaminating the same window. Cheapest of the four
  remaining sites — the opponent's own kit does not need a second move at
  all, unlike sites 5-7 below. Not attempted this session for time (same
  status as every prior pair's own unstaged "already-built-3-stages" gate,
  §17.5/§18.6/§19.5/§21.2/§22.5).
- **DRAW SITE 5** (`:1054`, `score +3`, target `STATUS3_LEECHSEED`): same
  mixed-moveset obstacle DRAW SITE 3/4 used to have, substituting `EFFECT_
  LEECH_SEED` for `EFFECT_TOXIC` — now that the two-Pokémon relay recipe
  above is live-proven, this site is a straightforward re-application of the
  same trick (a second opponent party slot whose entire kit is the new
  status move) rather than an open question.
- **DRAW SITE 6** (`:1058`, `score +2`, **opponent's own** `STATUS3_ROOTED`,
  i.e. Ingrain): same mixed-moveset obstacle as site 5, but self-targeted
  (`EFFECT_INGRAIN`, `MOVE_TARGET_USER` — no accuracy roll of its own to
  land), the same "may be more predictable to force the turn-1 pick, not
  verified" caveat §19.5 flagged for `AccuracyDown`'s own analogous site.
- **DRAW SITE 7** (`:1062`, `score +3`, target `STATUS2_CURSED`): needs a
  Ghost-typed opponent with `EFFECT_CURSE` in its kit — same
  typing-is-part-of-the-precondition obstacle §19.5 named for
  `AccuracyDown`'s own site 6.

### 24.6 What this unblocks

1. **Both pairs' own port**: exact instruction lists for all four handlers,
   every gate's real precondition and operand (`AI_USER` vs `AI_TARGET`,
   independently re-derived rather than copied from either sibling), the
   draw sites' exact odds and score deltas, `EvasionUp`'s own
   `AI_USER`-vs-`AI_TARGET` Gate I flip vs `AccuracyDown` (the exact kind of
   trap this doc's "never copy a sibling's gate map" rule exists to catch,
   §17/§18/§21/§22), and live-verified twin/triple fixtures proving 2 of
   `EvasionUp`'s 8 sites and `EvasionDown`'s 1 site end-to-end.
2. **A worked example of a disjoint-threshold twin-site handler**: unlike
   `AccuracyDown`'s two gates sharing one 70% threshold (allowing a 2-
   fixture design, §19.3), `EvasionUp`'s Gate A (90%) and Gate H (70%) are
   disjoint, forcing a 3-fixture design with one shared zero-draw control —
   documented as a reusable pattern for any future handler whose own gates
   don't happen to share a threshold.
3. **Confirms the census's "1 executable move" count for both handlers, with
   the missing detail the brief asked for**: `EFFECT_EVASION_UP`'s 1 move is
   `MOVE_DOUBLE_TEAM` (both `EFFECT_EVASION_UP_2` and `EFFECT_MINIMIZE`
   contribute zero to that count — see 24.7); `EFFECT_EVASION_DOWN`'s 1 move
   is `MOVE_SWEET_SCENT` (`EFFECT_EVASION_DOWN_2` contributes zero). No
   correction to §5's table is needed — both "Exec moves: 1" entries are
   correct, now with a named move behind each.
4. **4 explicit, citation-backed recipes** (24.5) for a future porter,
   each naming exactly why it needs more than the identical-4-slots trick
   (a real, unforced AI pick between two structurally different moves, or a
   multi-turn stat-stage build) — the same discipline §19.5 established for
   `AccuracyDown`'s own unstaged sites. A follow-up side-lane session closed
   DRAW SITE 3/4 (the toxic-poison chain) with the two-Pokémon opponent
   relay recipe §19.5 itself suggested — live per-site attribution confirms
   the chained-fall-through model from `docs/factory-ai-draw-discrepancy-
   probe.md` §7.1/§7.3 (commit 20f09bb), not the pre-fix "two mutually
   exclusive single-draw sites" model (24.5).

### 24.7 Confirm-or-correct: census cross-check for `EVASION_UP`/`MINIMIZE`/`EVASION_DOWN`

Per this step's brief, checked directly against `docs/executable-frontier-
census.md` rather than assumed:

| Effect | Census classification | Real moves | Notes |
| --- | --- | -: | --- |
| `EFFECT_EVASION_UP` | `executable` | 1 (`MOVE_DOUBLE_TEAM`) | dispatches to `AI_CBM_EvasionUp`/`AI_CV_EvasionUp` |
| `EFFECT_EVASION_UP_2` | `executable` | **0** | routes to generic `BattleScript_EffectHit`, no move anywhere uses it — same vestigial-constant shape §19.1 found for `EFFECT_ACCURACY_DOWN_2` |
| `EFFECT_MINIMIZE` | **`blocked-on-opcodes`** (`B_SCR_OP_SETMINIMIZE`) | 1 (`MOVE_MINIMIZE`) | **not** executable through the current port despite dispatching to the same `AI_CBM_EvasionUp`/`AI_CV_EvasionUp` handlers as `EFFECT_EVASION_UP` — §5's "1 executable move" count for `EvasionUp` is entirely `Double Team`'s, not `Minimize`'s |
| `EFFECT_EVASION_DOWN` | `executable` | 1 (`MOVE_SWEET_SCENT`) | dispatches to `AI_CBM_EvasionDown`/`AI_CV_EvasionDown` |
| `EFFECT_EVASION_DOWN_2` | `executable` | **0** | same vestigial-constant shape as `EVASION_UP_2` |

Confirms §5's table (`EvasionUp` "1 exec move", `EvasionDown` "1 exec
move") is correct, but the census alone doesn't say *which* move backs that
count — `MOVE_MINIMIZE` (`EFFECT_MINIMIZE`, `data/battle_moves.h:1394-1404`,
`.effect = EFFECT_MINIMIZE`) is real, Factory-legal, and shares `Double
Team`'s own dispatch target on both the CBM and CV sides (24.1), but is
presently `blocked-on-opcodes` in this run's own TS port (needs
`B_SCR_OP_SETMINIMIZE`, unrelated to `AI_CheckViability` itself) — this
does **not** block live-oracle staging (the real ROM has no such
restriction; a `MOVE_MINIMIZE`-dispatched fixture would work identically to
`MOVE_DOUBLE_TEAM` on the oracle, since both share the same `+1`-evasion
effect and the same handler pair) but a porter relying on the census's
"executable moves" count to decide what a player could *actually select* in
the ported engine today should use `Double Team`, not `Minimize`, until the
opcode is ported.

### 24.8 Verify script status

`tools/probe/verify-factory-ai-checkviability-ground-truth.ts` extended
this session with `AI_CV_EvasionUp`'s 3 fixtures and `AI_CV_EvasionDown`'s 2
fixtures (24.2-24.3) — every prior scenario (§9, §11.5, §12.1, §13.4,
§14.6, §15.5, §16.5, §17.7, §18.7, §19.7, §20.5, §21.5, §22.6, §23.6)
unchanged and still green. **Run twice this session, ALL PASS both times.**
Reproduce with:

```sh
node --experimental-strip-types tools/probe/verify-factory-ai-checkviability-ground-truth.ts
```

**Follow-up side-lane session (2026-07-27) extended it again** with the
`evasionup-toxicchain-{reach,control}` pair (24.5) — every prior scenario
unchanged and still green. **Full script run live this session: 350
PASS, 0 FAIL, `ALL PASS`.**

## 25. 2026-07-26 addendum #15: `AI_CBM_RainDance` + `AI_CV_RainDance`, `AI_CBM_SunnyDay` + `AI_CV_SunnyDay`, `AI_CBM_Hail` + `AI_CV_Hail` — the weather trio, §5's own open CBM-weather question answered, and a real `RainDance`/`SunnyDay` sibling divergence

Side-lane prep-scout session (Battle Scene OFF oracle), same no-`src/`-changes
contract as every prior addendum — **no `factoryAiCheckBadMove.ts`/
`factoryAiCheckViability.ts`/`factoryAiDecisionPolicy.ts` edits**. Scope per
this step's brief: the last 3 of the 22-handler program
(`AI_CV_RainDance`/`SunnyDay`/`Hail`, §5's own table), with priority on §5's
closing paragraph, which explicitly flagged its own uncertainty: "CBM's table
routes all weather effects through a shared non-existent-named handler check
— a follow-up worker should verify CBM's own weather-effect entries before
assuming they're equally cheap." That guess is answered first, then all
three `AI_CV_*` bodies are independently re-derived (not assumed identical),
then all three handler pairs are staged and live-verified.

### 25.1 The open question, answered: CBM does **not** share a weather handler — three separate, byte-for-byte-identical 2-instruction handlers

Direct read of `AI_CheckBadMove`'s own dispatch table
(`data/battle_ai_scripts.s:65-213`, the same table §4 already fully
enumerated):

```
if_effect EFFECT_RAIN_DANCE, AI_CBM_RainDance   ; :178
if_effect EFFECT_SUNNY_DAY, AI_CBM_SunnyDay     ; :179
...
if_effect EFFECT_HAIL, AI_CBM_Hail              ; :191
```

Three **distinct, individually named** target labels — not a shared handler,
not a "non-existent-named" fallthrough. §5's own worry was reasonable (the
audit trail up to that point had never actually looked past the dispatch
table's own target names for these three rows) but the guess itself was
wrong. Each body, in full:

```
AI_CBM_RainDance:                       (data/battle_ai_scripts.s:490-493)
	get_weather
	if_equal AI_WEATHER_RAIN, Score_Minus8
	end

AI_CBM_SunnyDay:                        (data/battle_ai_scripts.s:495-498)
	get_weather
	if_equal AI_WEATHER_SUN, Score_Minus8
	end

AI_CBM_Hail:                            (data/battle_ai_scripts.s:522-525)
	get_weather
	if_equal AI_WEATHER_HAIL, Score_Minus8
	end
```

**Zero divergence between the three** — literally the same 3-instruction
shape (`get_weather; if_equal <OWN_WEATHER_CONSTANT>, Score_Minus8; end`),
differing only in which `AI_WEATHER_*` constant each checks
(`AI_WEATHER_SUN=0`, `AI_WEATHER_RAIN=1`, `AI_WEATHER_SANDSTORM=2`,
`AI_WEATHER_HAIL=3`, `include/constants/battle_ai.h:26-30`). This is the
**smallest CBM handler shape found in this doc to date** — even smaller than
`LightScreen`/`Reflect`'s own 2-instruction body (§23.1; those still need a
`if_side_affecting` read plus the branch, this one needs a full
`get_weather` opcode plus the branch, same instruction count either way, but
weather-trio's own three siblings are *exactly* identical to each other,
where `LightScreen`/`Reflect` differ by which flag they test — this is the
**first fully byte-for-byte-identical CBM triplet** in the whole doc, not
just a twin pair). No `get_ability` call, no item/species gate, no
Cloud Nine/Air Lock check anywhere in any of the three — `Cmd_get_weather`
(`src/battle_ai_script_commands.c:1644-1665`) reads `gBattleWeather`
directly with **no ability filtering at all** (Cloud Nine/Air Lock only
suppress weather's *in-battle effects* elsewhere in the engine, never the
AI's own `get_weather` read). **Confirms §5's "all three CBM-blocked" row**
(`EFFECT_RAIN_DANCE`/`SUNNY_DAY`/`HAIL` are indeed all three in
`AI_CHECK_BAD_MOVE_TABLE_EFFECTS`, lines 178/179/191 above) while correcting
its "shared handler" mechanism guess.

**New finding, not asked for but load-bearing for a porter**: `Cmd_get_weather`
has a real, live ROM bug in this pinned build. Its own source
(`src/battle_ai_script_commands.c:1644-1665`) only assigns
`AI_THINKING_STRUCT->funcResult` when a real weather bit is set; the
`AI_WEATHER_NONE` sentinel assignment is gated behind `#ifdef BUGFIX`
(`:1651-1653`), and `BUGFIX` is **commented out** in this pinned checkout
(`include/config.h:48`, `//#define BUGFIX`). So when `gBattleWeather` has
**none** of the four bits set, `get_weather`'s result is whatever
`funcResult` was left holding by the *previous* AI script command — for
`AI_CBM_RainDance`/`SunnyDay`/`Hail` specifically, that's the universal
preamble's own `get_ability AI_TARGET` call
(`AI_CheckBadMove_CheckSoundproof`, `:93`), i.e. the **target's real ability
ID** (0-77), not a true "no weather" sentinel. A target whose ability ID
happens to equal `AI_WEATHER_RAIN`(1)/`SUN`(0)/`SANDSTORM`(2)/`HAIL`(3) would
make `get_weather` read as that bogus "weather" on a genuinely weatherless
battle (e.g. any target with `ABILITY_NONE`(0) reads as `AI_WEATHER_SUN`).
**Not triggered by any of this session's own fixtures** (every one below
establishes a real, non-`NONE` weather state live before the decision turn
being measured), so it does not touch this addendum's own live-verified
claims — flagged for the porter as a real, citable ROM quirk with an exact
mechanism, left **recipe-only** (needs a genuinely weatherless battle at the
moment `AI_CheckBadMove` first dispatches a weather-effect move, plus a
target with a specific ability ID, to demonstrate live — not attempted this
session, time-capped). A porter should decide deliberately whether to
replicate this bug or treat `AI_WEATHER_NONE` cleanly; either is a choice,
not an accident, once documented.

### 25.2 The three `AI_CV_*` bodies, independently re-derived — `RainDance` genuinely diverges from its own siblings

§5 described all three as "HP gate + `get_weather` compare chain, no roll
anywhere" and treated them as a matched set. Re-deriving each independently,
not assuming the family resemblance holds (per this doc's own standing
divergence-check rule, §17/§18/§21/§22/§23):

```
AI_CV_SunnyDay:                         (data/battle_ai_scripts.s:2060-2075)
	if_hp_less_than AI_USER, 40, AI_CV_SunnyDay_ScoreDown1  ; Gate H (own HP)
	get_weather
	if_equal AI_WEATHER_HAIL, AI_CV_SunnyDay2                ; Gate W1
	if_equal AI_WEATHER_RAIN, AI_CV_SunnyDay2                ; Gate W2
	if_equal AI_WEATHER_SANDSTORM, AI_CV_SunnyDay2           ; Gate W3
	goto AI_CV_SunnyDay_End                                  ; own weather / none -> 0
AI_CV_SunnyDay2:
	score +1
	goto AI_CV_SunnyDay_End
AI_CV_SunnyDay_ScoreDown1:
	score -1
AI_CV_SunnyDay_End:
	end

AI_CV_Hail:                             (data/battle_ai_scripts.s:2261-2276)
	if_hp_less_than AI_USER, 40, AI_CV_Hail_ScoreDown1       ; Gate H (own HP)
	get_weather
	if_equal AI_WEATHER_SUN, AI_CV_Hail2                      ; Gate W1
	if_equal AI_WEATHER_RAIN, AI_CV_Hail2                     ; Gate W2
	if_equal AI_WEATHER_SANDSTORM, AI_CV_Hail2                ; Gate W3
	goto AI_CV_Hail_End                                       ; own weather / none -> 0
AI_CV_Hail2:
	score +1
	goto AI_CV_Hail_End
AI_CV_Hail_ScoreDown1:
	score -1
AI_CV_Hail_End:
	end
```

`SunnyDay` and `Hail` **are** twins: identical topology (1 HP gate + a
3-way `get_weather` chain checking the *other three* weather values + a
deterministic-zero fallthrough), identical HP threshold (40), identical
score deltas (+1/-1), zero `if_random_less_than` in either. The only
difference is which weather constant is excluded from each one's own
"other three" list (`SunnyDay` excludes Sun and checks
Hail/Rain/Sandstorm; `Hail` excludes Hail and checks Sun/Rain/Sandstorm) —
exactly what you'd expect from "the move that sets weather X scores +1 for
casting it into any weather that ISN'T X or none."

```
AI_CV_RainDance:                        (data/battle_ai_scripts.s:2037-2058)
	if_user_faster AI_CV_RainDance2         ; Gate P (relative Speed, own side)
	get_ability AI_USER
	if_equal ABILITY_SWIFT_SWIM, AI_CV_RainDance3            ; Gate S (own ability, bypass)
AI_CV_RainDance2:
	if_hp_less_than AI_USER, 40, AI_CV_RainDance_ScoreDown1  ; Gate H (own HP)
	get_weather
	if_equal AI_WEATHER_HAIL, AI_CV_RainDance3                ; Gate W1
	if_equal AI_WEATHER_SUN, AI_CV_RainDance3                 ; Gate W2
	if_equal AI_WEATHER_SANDSTORM, AI_CV_RainDance3            ; Gate W3
	get_ability AI_USER
	if_equal ABILITY_RAIN_DISH, AI_CV_RainDance3               ; Gate R (own ability, tail bonus)
	goto AI_CV_RainDance_End                                   ; own weather / none, no Rain Dish -> 0
AI_CV_RainDance3:
	score +1
	goto AI_CV_RainDance_End
AI_CV_RainDance_ScoreDown1:
	score -1
AI_CV_RainDance_End:
	end
```

**`RainDance` genuinely diverges** — this is a real instance of the exact
trap this step's brief called out ("`SunnyDay`/`Hail` sitting 200 lines
apart from `RainDance` is a hint they may diverge"), independently
re-confirmed from source, not assumed: `RainDance` has **7** conditional
instructions (Gates P/S/H/W1/W2/W3/R) against `SunnyDay`/`Hail`'s **4**
(Gates H/W1/W2/W3) — two entire extra gates that have no counterpart in
either sibling:

- **Gate P + Gate S (prologue, unique to `RainDance`)**: if the AI's own
  battler is faster than the target (`if_user_faster`, resolved via
  `GetWhoStrikesFirst`, §25.3), skip straight to the normal HP/weather gate
  chain (Gate H). If **not** faster, check the AI's **own** ability
  (`get_ability AI_USER`) for `ABILITY_SWIFT_SWIM`; if it matches, jump
  straight to the `score +1` branch (`AI_CV_RainDance3`), **bypassing the HP
  gate and the weather chain entirely** — a slower Swift-Swim user gets +1
  for casting Rain Dance regardless of its own HP band or the current
  weather (since Swift Swim doubles Speed in Rain, turning a slower user
  into a faster one). Neither `SunnyDay` (no Chlorophyll-equivalent bypass,
  despite Chlorophyll being the exact parallel ability for Sun) nor `Hail`
  (no Gen 3 ability doubles Speed in Hail) has anything resembling this.
- **Gate R (tail, unique to `RainDance`)**: after the weather chain fails to
  match Hail/Sun/Sandstorm (i.e. weather is already Rain, or none), a
  **second** `get_ability AI_USER` call checks for `ABILITY_RAIN_DISH`; if
  present, +1 anyway (a Rain Dish holder wants rain regardless of whether
  it's already raining — note this can coexist with `AI_CBM_RainDance`'s own
  `-8` for the same move when weather is already Rain, since CBM and CV are
  independent score contributions, not a single guarded path). `SunnyDay`
  has no `ABILITY_SOLAR_POWER`/`ABILITY_LEAF_GUARD`-equivalent tail bonus;
  `Hail` has no ability-tail bonus either.

Both extra gates read the AI's **own** ability (`AI_USER`), not the
target's — `Cmd_get_ability`'s own body
(`src/battle_ai_script_commands.c:1350-1401`) branches on
`gActiveBattler != battler`: when the queried battler *is* the one currently
thinking (`AI_USER`, always true for `get_ability AI_USER`), it takes the
direct-read branch ("The AI knows its own ability", `:1400`) — **no
`Random()` call, no ability-guessing confound**, unlike the universal CBM
preamble's own `get_ability AI_TARGET` (`:93`, guesses between a two-
ability target's slots via `Random() & 1` when neither of the three known-
without-guessing abilities applies, `:1380-1387`) — the reason every
CBM-blocked-pair fixture since §14.2 has needed a single-ability *target*
species regardless of whether that pair's own body reads ability at all.

Exact `if_random_less_than` count for all three: **0**. §5's "genuinely
0-`if_random`" claim holds for the roll-instruction count on all three, but
its "no roll anywhere" framing for `RainDance` is incomplete — see §25.3.

### 25.3 New finding: `if_user_faster`'s own C helper can draw `Random()` — a doc-wide subtlety this session traced to its source for the first time

`if_user_faster` (`RainDance`'s Gate P) compiles to `if_user_goes 0, ptr`
(`asm/macros/battle_ai_script.inc:599-601`), which calls
`Cmd_if_user_goes` → `GetWhoStrikesFirst(sBattler_AI, gBattlerTarget, TRUE)`
(`src/battle_ai_script_commands.c:1268-1274`). Reading that C function in
full (`src/battle_main.c:4595-4763`) for the first time in this doc's own
history: on a genuine Speed tie (`speedBattler1 == speedBattler2`), it draws
`Random() & 1` to break the tie (`:4728` and `:4745`, the priority-move and
zero-priority branches respectively) — a **hidden `Random()` consumption
inside a C helper**, invisible to this doc's own "`if_random_less_than`
instruction count" metric, since it's not an AI-script opcode at all.
`if_user_faster` itself is used **exactly once** in the entire AI script
(only here); its inverse-polarity sibling `if_target_faster` is used **20
times** elsewhere (`AI_CV_SpeedDown` §6 included) — meaning this same hidden
draw-on-tie has been a latent possibility in every one of those 20 sites
too, not something unique to `RainDance`. This session is the first to trace
`GetWhoStrikesFirst`'s own body far enough to name the exact mechanism
rather than just avoiding ties by convention (`docs/factory-ai-ground-
truth.md`'s and this doc's own "faster species in the damage role" rule,
until now undocumented *why* a tie is risky beyond message-order). All six
fixtures below use Anorith (base Speed 75) against Shuckle (base Speed 5) —
never tied — so this draw is confirmed absent from this session's own live
counts, not merely assumed absent.

Separately (not new, but relevant to reading the fixtures' PP data below):
`ChooseMoveOrAction_Singles`'s own final move-pick step always draws exactly
one `Random()` regardless of whether the top score is unique or tied
(`return consideredMoveArray[Random() % numOfBestMoves]`,
`src/battle_ai_script_commands.c:445`) — with `numOfBestMoves == 1` (a clear
winner) `Random() % 1` is always `0`, so the *result* is fully deterministic
even though a draw still occurs. This is what makes every fixture's own
"turn 2" pick below cross-seed-stable **by construction**, once its own net
score is proven nonzero (25.4) — no tie-break uncertainty survives into the
decision this addendum actually measures, only into the throwaway turn-1
setup move (next section).

### 25.4 Fixture design: 0-`if_random` handlers on **both** sides of the pair force a pick-based design, not a draw-count one

Every prior CBM-blocked pair in this doc (§14-§24) used the
`DRAW_COUNT_SCENARIOS` technique: give the opponent 4 identical
dispatch-triggering slots and compare **total `Random()` call counts**
between a "reach" and a "control" fixture, because the handler under test
has at least one real `if_random_less_than` site whose presence/absence
shows up as a count delta. **That technique has no signal here** — all six
handlers (three CBM, three CV) are 0-`if_random`; a reachable branch and an
unreached one both draw exactly zero from the handler itself. The only
live-observable channel left is the AI's own **final move pick**, so this
addendum reuses `AI_CV_SpeedDown`'s original design instead (§6: an
unequal, non-tied moveset, not four identical slots), extended to two real
turns because — unlike `SpeedDown`'s pure-Speed gate, knowable at
team-build time — a **pre-existing weather state** has to be staged by a
real move first (per this step's brief and the standing "never inject
transient state" rule).

**Species (all six fixtures)**: opponent (`AI_USER`, the battler under
test) = Anorith (390, single ability Battle Armor, base Speed 75); player
(`AI_TARGET`) = Shuckle (213, single ability Sturdy, base Speed 5, Bug/Rock)
— the exact pairing already proven zero-baseline for a `MOVE_GROWL` control
by §6/§14 (`AI_CBM_AttackDown`'s own gate needs `ATK == MIN_STAT_STAGE` or
`ABILITY_HYPER_CUTTER`, neither true; `AI_CV_AttackDown`'s own type-list
gate matches Shuckle's Bug type1 immediately, §6). Single-ability species on
**both** sides closes two independent confounds at once: the universal CBM
preamble's own `get_ability AI_TARGET` (Soundproof check, `:93`, guesses on
a two-ability *target*, §14.2) and — new this session — would matter for
`AI_CV_RainDance`'s own `get_ability AI_USER` calls too, except those never
guess regardless of ability count (25.2) — Anorith's single ability was
chosen for consistency with every other fixture in this doc, not because
`RainDance`'s own gates required it.

**Opponent moveset (all six)**: `[TEST_WEATHER_MOVE, MOVE_GROWL(45),
MOVE_GROWL(45), MOVE_GROWL(45)]` — deliberately **not** four identical
slots (unlike §11-§24's convention), because a pick-based design needs a
real alternative to lose or win against. Both the test move and Growl are
0-power (ties `AI_TryToFaint`'s "most powerful" comparison at exactly 0 for
all four slots, §6) and Growl's own CBM+CV contribution is 0 in this exact
matchup (established above) — so the *only* thing that can move the AI's
own final pick between the test move and Growl is the weather-trio
handlers' own score contribution, isolating it cleanly.

**Player moveset**: four identical copies of one real weather-setting move
— forced single legal choice, same "constrain the AI/controller to one
option" convention `tools/battle-lab/README.md` describes for the opponent
side, applied here to the player side instead, since it's the player's turn
that has to *deterministically* stage weather. Two turns, `[A, A]` per turn
(mash pattern, `N` reps of `[A(2f), wait(18f)]` — robust to `Hail`'s own
extra end-of-turn chip-damage message boxes that `Rain`/`Sun` don't have,
discovered live this session when a hand-timed `[A,wait30,A,wait700]`x2
block **desynced** for `Hail` specifically and silently failed to execute
turn 2 at all within the window; the mash pattern fixed it by construction,
since it needs no exact message-box count).

**Why turn order is fixed (opponent faster)**: on turn 1, weather does not
exist yet at decision time (both sides' actions for a turn are scored
simultaneously, before either executes), so the opponent's own turn-1
score is a genuine 4-way tie (`ChooseMoveOrAction_Singles`'s own
`Random() % 4`, confirmed live below to actually land on different slots
across the two banked seeds for some fixtures) — **irrelevant to this
design**, because the opponent (Anorith, base Speed 75) is faster than the
player (Shuckle, base Speed 5) and therefore moves *first* every turn: even
if the opponent's own turn-1 tie-break happens to select the weather move,
the player's own weather-setting move resolves *second* and unconditionally
overwrites whatever weather state resulted, since Gen 3 weather moves
always succeed (reset duration) rather than fail when recasting the same
weather. Turn 1's outcome is therefore **provably irrelevant** to the
weather state turn 2 observes — confirmed empirically, not just argued (see
25.5's actual per-seed PP traces, where turn 1's own pick visibly differs
by seed for some fixtures with no effect on turn 2's result).

**Two fixtures per handler** (six total), naming `<handler>-cbmreach` /
`<handler>-cvreach` rather than this doc's usual `reach`/`control` (more
accurate here — each fixture demonstrates one handler's own reach branch
while the *other* handler in the pair is provably quiet, not a zero
baseline for both):

| Fixture | Turn-1 weather target (player) | `AI_CBM_*` (weather == own type?) | `AI_CV_*` weather-chain (own type excluded) | Net score, slot 0 | Turn-2 prediction |
| --- | --- | --- | --- | -: | --- |
| `<handler>-cbmreach` | same as `TEST_WEATHER_MOVE`'s own type | **fires, -8** | doesn't match (own type excluded from its chain) → 0 | **-8** | never slot 0 |
| `<handler>-cvreach` | Sandstorm (common to all three chains) | doesn't match (weather != own type) → 0 | matches (Sandstorm always in the "other three" list) → **+1** | **+1** | always slot 0 |

Sandstorm was chosen as the universal `cvreach` trigger specifically because
it's the one weather value common to **all three** handlers' own "other
three" list (`RainDance` checks Hail/Sun/Sandstorm, `SunnyDay` checks
Hail/Rain/Sandstorm, `Hail` checks Sun/Rain/Sandstorm) — confirmed directly
from 25.2's own transcribed bodies, not assumed.

### 25.5 Live ledger — 6 fixtures × 2 seeds = 12/12 exact matches, all with a real, causally-attributable pick flip

Opponent PP read at frame 700 (turn 1 fully settled, including its own
end-of-turn weather-damage tick where applicable) and frame 1600 (turn 2
fully settled) — the delta isolates turn 2's own decision regardless of
what turn 1's own (irrelevant, per 25.4) tie-break did:

| Fixture | Seed | Opponent PP @700 | Opponent PP @1600 | Turn-2 pick | Opponent HP @1600 |
| --- | -: | --- | --- | --- | -: |
| `raindance-cbmreach` (weather=Rain) | 1 | `[4,40,39,40]` | `[4,40,38,40]` | Growl (slot 2) | 120/120 (100%) |
| `raindance-cbmreach` | 99 | `[4,40,39,40]` | `[4,40,39,39]` | Growl (slot 3) | 120/120 (100%) |
| `raindance-cvreach` (weather=Sandstorm) | 1 | `[3,40,40,40]` | `[2,40,40,40]` | **Rain Dance (slot 0)** | 120/120 (100%) |
| `raindance-cvreach` | 99 | `[3,40,40,40]` | `[2,40,40,40]` | **Rain Dance (slot 0)** | 120/120 (100%) |
| `sunnyday-cbmreach` (weather=Sun) | 1 | `[4,40,39,40]` | `[4,40,38,40]` | Growl (slot 2) | 120/120 (100%) |
| `sunnyday-cbmreach` | 99 | `[5,39,39,40]` | `[5,39,38,40]` | Growl (slot 2) | 120/120 (100%) |
| `sunnyday-cvreach` (weather=Sandstorm) | 1 | `[3,40,40,40]` | `[2,40,40,40]` | **Sunny Day (slot 0)** | 120/120 (100%) |
| `sunnyday-cvreach` | 99 | `[4,40,39,40]` | `[3,40,39,40]` | **Sunny Day (slot 0)** | 120/120 (100%) |
| `hail-cbmreach` (weather=Hail) | 1 | `[9,40,40,40]` | `[9,40,39,40]` | Growl (slot 2) | 106/120 (88%) |
| `hail-cbmreach` | 99 | `[9,40,40,40]` | `[9,40,39,40]` | Growl (slot 2) | 106/120 (88%) |
| `hail-cvreach` (weather=Sandstorm) | 1 | `[8,40,40,40]` | `[7,40,40,40]` | **Hail (slot 0)** | 120/120 (100%) |
| `hail-cvreach` | 99 | `[8,40,40,40]` | `[7,40,40,40]` | **Hail (slot 0)** | 120/120 (100%) |

**12/12 exact matches to 25.4's predicted table**: every `cbmreach` fixture
never touches slot 0 between frame 700 and 1600 (Growl wins instead, from
whichever of slots 1-3 the standing tie-break lands on); every `cvreach`
fixture always picks slot 0. Note `raindance-cbmreach`/`sunnyday-cbmreach`
seed 99's own turn-1 PP (`[4,...]`/`[5,39,...]` at frame 700, vs `[4,...]`/
`[4,40,...]` at seed 1) confirms turn 1's tie-break genuinely differs by
seed for some fixtures — exactly the "irrelevant to turn 2" claim 25.4 made,
demonstrated live rather than just argued. `hail-cbmreach`'s own opponent HP
drops to 88% by frame 1600 (two turns of `Hail`'s own end-of-turn 1/16
chip damage, absent from `Rain`/`Sun`) — still comfortably above the
handlers' own `<40%` HP gate, confirmed not a confound.

### 25.6 Not staged live this session (recipe-only, time-capped)

1. **`RainDance`'s own Gate P/S bypass** (slower user + `ABILITY_SWIFT_SWIM`
   → deterministic +1, skipping the HP gate and weather chain entirely):
   needs a Swift-Swim-ability species as the opponent, slower than the
   target, with weather held at any non-Rain state (to prove the bypass
   fires even where the normal chain would score 0) — not attempted, no
   Swift-Swim-ability species chosen this session. **Live-verified by a
   2026-07-27 follow-up side-lane session, see §25.9.**
2. **`RainDance`'s own Gate R tail bonus** (`ABILITY_RAIN_DISH` → +1 even
   when weather is already Rain or unset): needs a Rain-Dish-ability
   species as the opponent — not attempted. Note this can coexist with
   `AI_CBM_RainDance`'s own `-8` when weather is already Rain (CBM and CV
   are independent score contributions), so a live fixture would show a net
   `-7`, not a clean `+1` — worth flagging so a future worker doesn't expect
   the same simple pick-flip this addendum's own six fixtures show. **Live-
   verified by a 2026-07-27 follow-up side-lane session (weather held at
   NONE rather than Rain, to isolate Gate R's own +1 cleanly from CBM's -8 —
   see §25.9 for why "any non-Rain state" in this item's own original text
   is not quite right).**
3. **The `<40%` HP-gate branch** (own HP < 40% → `-1`, all three handlers,
   independent of weather): this session's own zero-damage-by-construction
   design (Growl deals no damage, weather moves deal no damage to their own
   user) never exercises it live. Directly reusable recipe: any prior
   pair's own "hit `AI_USER` to <X%" fixture (`AI_CV_DefenseDown`/
   `VitalThrow`'s Machamp-`MOVE_VITAL_THROW`-vs-Anorith recipe, §13/§15,
   86-102 damage / 15-28% remaining, comfortably under 40%) transplants
   directly — just add a real turn-1 hit before the weather-establishing
   turn. **Live-verified by a 2026-07-27 follow-up side-lane session, see
   §25.9 — the direct transplant needed one adjustment (Splash instead of
   Growl for the filler slots, §25.9's own confound note).**
4. **`get_weather`'s own stale-read bug** (25.1): needs a genuinely
   weatherless battle at the moment a weather-effect move is first
   dispatched, plus a target with a specific ability ID — not attempted.
   Still not attempted as of the 2026-07-27 follow-up (out of that
   session's own assigned scope) — two of that session's three fixtures
   (Gate S, Gate R) *do* run a genuinely weatherless battle at decision
   time, but both deliberately chose a target ability ID (4, 5) outside
   `AI_WEATHER_*`'s `0-3` range specifically to avoid tripping this bug as
   an unwanted confound, so their own passing result does not confirm or
   deny it — it remains exactly as open as before.

### 25.7 Verify script status

`tools/probe/verify-factory-ai-checkviability-ground-truth.ts` extended
this session with a new `WEATHER_PICK_SCENARIOS` array + `verifyWeatherPickScenario`
runner (distinct from `SCENARIOS`/`DRAW_COUNT_SCENARIOS` — this pair reads a
frame-700→1600 PP delta rather than a frame-0→N delta or a total-step count,
per 25.4's design) covering all 6 fixtures above. Every prior scenario (§9,
§11.5, §12.1, §13.4, §14.6, §15.5, §16.5, §17.7, §18.7, §19.7, §20.5,
§21.5, §22.6, §23.6, §24.8) unchanged and still green. **73 checks, 0
failures, run live this session.** Reproduce with:

```sh
node --experimental-strip-types tools/probe/verify-factory-ai-checkviability-ground-truth.ts
```

**2026-07-27 follow-up side-lane session extended it again** with 3 more
`WEATHER_PICK_SCENARIOS` entries (§25.9) — `WeatherPickScenarioSpec` gained
optional `beforeFrame`/`afterFrame`/`hpBand` fields so the same runner covers
the new fixtures' different capture windows and the one fixture that
*targets* the `<40%` band instead of avoiding it. Every prior scenario
unchanged and still green. **Full script run live this session: 48 checks
tail-visible, `ALL PASS`, 0 failures, exit code 0** (the run also re-verified
all pre-existing scenarios; none regressed).

### 25.8 Porter's summary — exact handler-by-handler port checklist

**`AI_CBM_RainDance`/`SunnyDay`/`Hail`** (§25.1): one shared helper,
parameterized by the `AI_WEATHER_*` constant to match — `get_weather;
if (weather === OWN) score -= 8`. No new battler-state input beyond current
weather (already needed for the CV side and, per §5.4, already landed as a
side effect of PROGRESS entry 460's screens/weather registration). **Zero
divergence to port separately** — implement once, parameterize three call
sites.

**`AI_CV_SunnyDay`/`Hail`** (§25.2): also one shared helper, parameterized
by (a) the `AI_WEATHER_*` constant to exclude and (b) the three-value
"other weather" match set (trivially `ALL_FOUR \ {OWN, NONE}`, i.e. always
the other three real weather values, never `NONE`) — `if (ownHp% < 40)
score -= 1; else if (weather in otherThree) score += 1`. Inputs needed:
own HP% (already needed by several other ported handlers, e.g.
`AttackDown`/`DefenseDown`), current weather (already needed by CBM above).

**`AI_CV_RainDance`** (§25.2): needs its own bespoke body, **not** the
`SunnyDay`/`Hail` shared helper — same HP/weather core plus two new reads:
(1) **the AI's own ability** (`AI_USER`, not the opponent's — a direct
field read, never the two-ability guessing heuristic `AI_TARGET` reads
elsewhere, so no `Random()`-consuming confound to replicate); (2) **is the
AI's own battler faster than the target** — the *same* underlying
computation `AI_CV_SpeedDown`/`SpeedUp` and 18 other sites already need
(`if_target_faster`), just the inverted comparison target
(`if_user_faster`), including the same hidden tie-break `Random()` draw
(§25.3) if a port ever reaches a genuine Speed tie — reuse whatever
"who goes first" primitive those handlers already require, don't
reimplement. Full gate order: user-faster? → (no) own-ability==Swift Swim?
→ +1 bypass (skip HP/weather entirely) → (fall through / user-faster) →
own HP<40%? → -1 → else weather-chain (Hail/Sun/Sandstorm → +1) → else
own-ability==Rain Dish? → +1 → else 0.

**Shared-tail reuse across the whole trio**: the HP-gate + 3-way-weather-
chain-with-fallthrough shape (Gates H/W1/W2/W3) is identical in all three
CV bodies — a single parameterized helper `weatherSetterCvScore(ownHp,
weather, ownWeatherConstant)` covers `SunnyDay`/`Hail` completely and covers
`RainDance`'s own Gate H/W1/W2/W3 span (everything after the Gate P/S
prologue and before the Gate R tail) — only the prologue and tail need
`RainDance`-specific code, not the whole body.

**Not required for this port, but real**: `get_weather`'s own
`AI_WEATHER_NONE` stale-read bug (§25.1) is a genuine source-level quirk a
porter should decide about explicitly (replicate for byte-exact AI parity,
or clean it up) rather than discover by accident; it only matters for a
`AI_CheckBadMove`/`AI_CheckViability` weather-effect dispatch on a battle
that has had **zero** weather set at any point so far this battle.

## 25.9 2026-07-27 follow-up side-lane session: `AI_CV_RainDance`'s Gate S bypass, Gate R tail bonus, and the shared `<40%` HP-gate branch — all 3 of §25.6's remaining items live-verified, engine port confirmed correct

Bounded side-lane worker session (Battle Scene OFF oracle), same no-`src/`
contract as every addendum above — `factoryAiCheckViability.ts`'s already-
ported `runCvRainDance`/`runCvSunnyDay`/`runCvHail`/`weatherSetterCvScore`
(§25.8's own port, landed the same day this addendum's predecessor was
written) were read **read-only**, exactly to know which branch each new
fixture needed to light up, per this step's own brief. All three of §25.6's
still-open items (Gate P/S bypass, Gate R tail bonus, the `<40%` HP gate)
are closed this session with one fixture apiece (not reach/control pairs,
given the time budget — causal attribution instead comes from comparing
against this doc's own well-established `Growl`=0/`Splash`=0 baselines,
§6/§14/§25.4, rather than a matched control fixture). Item 4
(`get_weather`'s stale-read bug) remains open, out of this session's own
assigned scope — see §25.6 item 4's own updated note for why the two
weatherless fixtures below don't accidentally settle it either way.

### 25.9.1 Species selection: cross-checked against the real dex, not assumed

§25.6's own items 1/2 asked for a single-ability Swift Swim carrier and a
Rain Dish carrier. Direct grep of `reference/pokeemerald/src/data/pokemon/
species_info.h` for both abilities (not assumed from memory):

- **Swift Swim, single-ability** (`{ABILITY_SWIFT_SWIM, ABILITY_NONE}`):
  Horsea, Magikarp, Kingdra, Surskit, Luvdisc, Feebas, Huntail, Gorebyss —
  all confirmed present in `gBattleFrontierMons`
  (`reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h`),
  i.e. real Factory rentals. **Huntail** (species 374, base Speed 52 → level
  50 stat 72) chosen for the Gate S fixture, paired against **Anorith**
  (390, Battle Armor, base Speed 75 → level 50 stat 95) as target — a clean
  23-stat non-tied gap, Anorith reused verbatim from every prior addendum.
- **Rain Dish**: grepping the same file for `ABILITY_RAIN_DISH` at all
  finds **no single-ability carrier anywhere in Emerald's dex** — Lotad,
  Lombre, and Ludicolo are the only three species with the ability, and all
  three pair it with Swift Swim in slot 0 (`{ABILITY_SWIFT_SWIM,
  ABILITY_RAIN_DISH}`). §25.6 item 1's own "single-ability discipline"
  request is therefore unsatisfiable for Rain Dish specifically — but per
  §25.2/§25.3 (already established, re-confirmed by reading
  `Cmd_get_ability` directly, `src/battle_ai_script_commands.c:1350-1401`
  this session too): the guessing branch only executes when `gActiveBattler
  != battler`, which is never true for a `get_ability AI_USER` query (the
  querying battler *is* `sBattler_AI` by construction) — so Gate S and Gate
  R's own ability reads take the direct `gBattleMons[battler].ability` path
  **unconditionally**, regardless of how many abilities the species has.
  Lotad (295) with `abilitySlot: 1` (the existing `mechanicLab` override
  field, already used by `tools/battle-lab/mechanic-endturn-raindish-off.json`'s
  own precedent) deterministically forces Rain Dish with zero guessing risk
  — used for the Gate R fixture, paired against **Shuckle** (213, Sturdy,
  base Speed 5 → level 50 stat 25) as target, reused verbatim from every
  prior weather-trio fixture. Lotad's own level 50 Speed stat (30 base → 50)
  comfortably exceeds Shuckle's 25, so Gate P (`if_user_faster`) already
  routes past Gate S before Gate R is ever reached — Lotad's own ability
  slot 0 (Swift Swim) is never even queried in this fixture, confirming the
  two gates are independently testable.

### 25.9.2 Why "any non-Rain state" (§25.6 item 1's own original wording) undersells what Gate S's isolation actually needs

Re-deriving from §25.2's own transcribed body rather than trusting item 1's
paraphrase: `RainDance`'s weather chain (Gates W1-W3) matches **all three
non-Rain real weather values** (Hail/Sun/Sandstorm) — so staging *any* of
them would let the ordinary weather chain alone produce `+1`, indistinguishable
from Gate S's own bypass. The only state that leaves the ordinary chain
silent (a true `0`, not just "not Rain") is **weather held at `AI_WEATHER_NONE`
(never established at all this battle)** — Gates W1-W3 only match real
weather values, and `RainDance`'s own "no weather" fallthrough is 0 same as
Rain's. Both new ability-gate fixtures (Gate S, Gate R) therefore hold
weather at `NONE` for the whole trace: a **single real turn** suffices (no
weather-establishing turn 1 needed at all, unlike every §25.4 fixture),
reusing this doc's original single-turn `SCENARIOS` capture shape (`[A(2),
wait(30), A(2), wait(700)]`, `captureFrames [0,100,300,732]`, §6/§13) instead
of the two-turn mash pattern. This also sidesteps the `get_weather`
stale-read bug (§25.1) as a live confound: both target species' own ability
IDs (Anorith/Battle Armor=4, Shuckle/Sturdy=5) sit outside the `AI_WEATHER_*`
range (`0`-`3`), so even if the bug's stale `funcResult` leaks through
`AI_CBM_RainDance`'s own `get_weather` call, the subsequent `if_equal
AI_WEATHER_RAIN` compare can never spuriously match — confirmed not just
argued, since both fixtures' own `Growl`-vs-`RainDance` net score prediction
(`+1`) only holds if `AI_CBM_RainDance` truly stays quiet.

### 25.9.3 Fixture design: Gate S (`raindance-gates-swiftswim-reach`) and Gate R (`raindance-gates-raindish-reach`)

Both fixtures: opponent (`AI_USER`, the `RainDance` caster under test)
moveset `[MOVE_RAIN_DANCE(240), MOVE_GROWL(45) x3]` — `Growl`'s own baseline
against a Bug-type1 target (Anorith or Shuckle, both established zero via
`AI_CV_AttackDown`'s own Gate E physical-type-list match, §6/§14/§25.4)
holds at `0` in a fresh single-turn battle (Gate A: target ATK stage ==
`DEFAULT_STAT_STAGE`, true at battle start, skips straight past Gates B/C/D1
to Gate E, which matches Bug type1 immediately, zero draws either way).

- **Gate S** (opponent = Huntail, single-ability Swift Swim, speed 72 <
  Anorith target's 95 → `userFaster` false → Gate S's own `get_ability
  AI_USER` finds Swift Swim → **+1**, HP/weather chain never reached at
  all): predicted net score `+1` (CV) `+ 0` (CBM, weather stays `NONE`) `=
  +1`, beating `Growl`'s `0` — Rain Dance must win the real turn-1 pick,
  both seeds.
- **Gate R** (opponent = Lotad, `abilitySlot: 1` → Rain Dish, speed 50 >
  Shuckle target's 25 → Gate P already routes past Gate S regardless of
  ability → HP gate false (full HP) → weather chain: `NONE` isn't
  Hail/Sun/Sandstorm → falls through to Gate R's own `get_ability AI_USER`
  → Rain Dish found → **+1**): predicted net score `+1` (CV) `+ 0` (CBM) `=
  +1` — Rain Dance must win the real turn-1 pick, both seeds.

### 25.9.4 Fixture design: the `<40%` HP-gate branch (`raindance-hpgate-reach`) — a same-turn confound found live, closed by a move swap, not staging

§25.6 item 3's own recipe ("transplant `VitalThrow`'s Machamp-vs-Anorith
damage-sizing directly, add a real turn-1 hit before the weather-establishing
turn") was followed **with one change discovered live, not anticipated from
source alone**. First attempt reused this addendum's own `Growl` filler
slots verbatim (`[RAIN_DANCE, GROWL x3]` for Anorith, `[VITAL_THROW x4]` for
Machamp) on the exact two-turn mash trace §25.4/§25.5 already banked
(`raindance-cvreach`'s own 60-rep segment array, `captureFrames
[0,700,1600]`). Two problems surfaced empirically:

1. **A same-turn stacking confound, the same class §14.2/§19.2/§24.5 have
   each independently found once already**: if turn 1's own 4-way tie
   (`RainDance`/`Growl`×3, all scored `0` at full HP) happens to land on
   `Growl`, Machamp's own ATK stage drops to 5 — breaking `AI_CV_AttackDown`'s
   own Gate A precondition (`target ATK stage == DEFAULT_STAT_STAGE`) for
   turn 2's read, so `Growl`'s own baseline silently shifts from `0` to `-2`
   depending on which slot won a tie-break outside this fixture's control.
   **Fix**: swap the 3 filler slots from `Growl` to `MOVE_SPLASH` (150) — a
   genuine no-op move with no `AI_CheckBadMove`/`AI_CheckViability` dispatch
   entry at all, so its `0` baseline holds regardless of what turn 1's own
   tie-break does to it. (Both seeds banked below happened to pick slot 0,
   `RainDance`, on turn 1 either way — but the fix removes the *dependency*
   on that, not just this run's luck.)
2. **The two-turn mash timing itself, re-discovered for a different move
   than §25.4's own Hail-chip-damage case**: reusing `raindance-cvreach`'s
   own 60-rep/1600-frame mash verbatim, with `MOVE_VITAL_THROW` in Machamp's
   own slots instead of a weather move, executes **3 real turns**, not 2 —
   `MOVE_VITAL_THROW` has fewer message boxes than a weather-setting move
   (no "It started to rain!"-style text), so the same input budget that
   safely produces exactly 2 turns for a weather move gets through 3 turns'
   worth of `VITAL_THROW` dialogue instead, and Machamp's own moveset (all 4
   slots `VITAL_THROW`, unconditionally) delivers a **second** hit on turn 2
   that finishes off the already-`<40%` Anorith (34/21 HP against another
   86-102-damage roll), fainting it and auto-switching in the filler mon
   before frame 1600 — confirmed empirically with a frame-by-frame sweep
   (`oppHp` hits `0` and `oppSpecies` flips from 390 to 1 between frames 800
   and 1200 in an unmodified copy of the 60-rep trace). **Fix**: since Anorith
   moves first each turn (95 > 75, no tie), its own turn-2 PP decrement is
   already observable *before* Machamp's own turn-2 hit lands — a
   **narrower** mash window (35 reps, 700 frames of `[A(2),wait(18)]`, then
   400 frames of pure silent wait with no further input, so no 3rd turn's
   own prompt is ever pressed) reads cleanly: `beforeFrame=400` (turn 1
   fully settled, before turn 2 starts) and `afterFrame=700` (turn 2's own
   decision already resolved, Anorith not yet fainted). Empirically
   reconfirmed determinism-stable across 2 reruns × 2 seeds before banking.

Prediction: turn 2, Anorith's own HP is already `<40%` from turn 1's real
hit — Gate H fires (`if_hp_less_than AI_USER,40`) **before `get_weather` is
ever called**, so this branch's own `-1` is unconditional regardless of
whatever weather turn 1's own tie-break happened to leave behind (`RainDance`
winning turn 1 would set real Rain for 5 turns; irrelevant, since Gate H
short-circuits ahead of the weather read entirely — confirmed structurally
from §25.2's own transcribed body, not just asserted). Net score `-1` (CV)
`+` (`0` or `-8` from CBM, depending on turn 1's leftover weather, both
comfortably negative either way) `< 0` (`Splash`'s baseline) — `Rain Dance`
must never win turn 2's pick, `Splash` always does, both seeds.

### 25.9.5 Live ledger — 3 fixtures × 2 seeds = 6/6 exact matches to the predictions above

| Fixture | Seed | Opponent PP (before → after) | Pick | Opponent HP at read |
| --- | -: | --- | --- | -: |
| `raindance-gates-swiftswim-reach` (Gate S) | 1 | `[5,40,40,40]`@0 → `[4,40,40,40]`@732 | **Rain Dance (slot 0)** | 130/130 (100%) |
| `raindance-gates-swiftswim-reach` | 99 | `[5,40,40,40]`@0 → `[4,40,40,40]`@732 | **Rain Dance (slot 0)** | 130/130 (100%) |
| `raindance-gates-raindish-reach` (Gate R) | 1 | `[5,40,40,40]`@0 → `[4,40,40,40]`@732 | **Rain Dance (slot 0)** | 115/115 (100%) |
| `raindance-gates-raindish-reach` | 99 | `[5,40,40,40]`@0 → `[4,40,40,40]`@732 | **Rain Dance (slot 0)** | 115/115 (100%) |
| `raindance-hpgate-reach` (`<40%` HP gate) | 1 | `[4,40,40,40]`@400 → `[4,40,40,39]`@700 | Splash (slot 3), never slot 0 | 34/120 (28%) |
| `raindance-hpgate-reach` | 99 | `[4,40,40,40]`@400 → `[4,39,40,40]`@700 | Splash (slot 1), never slot 0 | 21/120 (18%) |

**6/6 exact matches, all causally attributable to the exact gate the doc's
own porter checklist (§25.8) names**: Gate S and Gate R each show Rain Dance
winning the real turn-1 pick deterministically both seeds (matching the
predicted `+1` net score against `Growl`'s established `0`); the HP-gate
fixture shows Rain Dance never touched between the post-turn-1 and
post-turn-2 reads, with Splash (whichever slot won turn 1's own irrelevant
tie) taking turn 2 instead, both seeds — and the fixture's own precondition
(`opponent HP genuinely <40%` by the read frame) is independently confirmed
live (28%/18% remaining), not just assumed from the hand-computed 86-102
damage range. **No port bug found** — `runCvRainDance`'s existing
implementation (`src/engine/factoryAiCheckViability.ts:2414-2463`, ported
and unit-tested but never before oracle-corroborated on these 3 branches)
produces exactly the ROM's own behavior on all three previously-recipe-only
paths. This closes out the "never-live-staged branch hides real port bugs"
risk this step's brief named (`docs/factory-ai-draw-discrepancy-probe.md`
§7's `DefenseUp`/`SpDefUp`/`EvasionUp` chained-draw-site precedents) for
`RainDance` specifically — all 7 of its own conditional gates (P/S/H/W1/W2/
W3/R) now have live oracle corroboration, not just assembly + unit tests.

### 25.9.6 Verify script status

`tools/probe/verify-factory-ai-checkviability-ground-truth.ts`'s
`WeatherPickScenarioSpec`/`verifyWeatherPickScenario` (§25.7) extended with
optional `beforeFrame`/`afterFrame` fields (default `700`/`1600`, unchanged
for all 6 pre-existing weather-trio fixtures) and an `hpBand` field
(`"above40"` default, asserting the pre-existing "no HP-gate confound"
invariant; `"below40"` for this session's own HP-gate fixture, asserting the
opposite — that the precondition genuinely held). All three new fixtures
added to `WEATHER_PICK_SCENARIOS` with their own tuned frame windows (`0`/
`732` for the two single-turn ability-gate fixtures, `400`/`700` for the
HP-gate fixture, §25.9.4). **Full script run live this session, both
seeds, twice each for determinism: `ALL PASS`, 0 failures, exit code 0** —
every prior scenario (§9, §11.5, §12.1, §13.4, §14.6, §15.5, §16.5, §17.7,
§18.7, §19.7, §20.5, §21.5, §22.6, §23.6, §24.8, §25.7) unchanged and still
green. Reproduce with:
### 25.9.7 What remains open

§25.6 item 4 (`get_weather`'s `AI_WEATHER_NONE` stale-read bug) is
**unchanged** — still not attempted, still recipe-only, still exactly as
described there. Both of this session's own weatherless fixtures (Gate S,
Gate R) deliberately chose target ability IDs (4, 5) outside the bug's
`0`-`3` collision range specifically to keep it from confounding their own
results (§25.9.2) — a future worker reproducing it would need the *opposite*
choice (a target whose ability ID lands inside `0`-`3`) as its own dedicated
fixture, not a byproduct of these two.

### 25.10 2026-07-27 second follow-up side-lane session: `get_weather`'s own stale-read bug (§25.6 item 4, the last open item), live-staged — TWO independent Factory-reachable channels found, not one, and the engine's ported handlers diverge from the real ROM in both

Bounded side-lane worker session (Battle Scene OFF oracle), same no-`src/`-
edits contract as every addendum above. Scope: characterize §25.6 item 4
from source, stage a live fixture that discriminates stale-vs-fresh, and
settle whether `factoryAiCheckBadMove.ts`/`factoryAiCheckViability.ts`'s
already-ported weather handlers (read **read-only**) agree with the real
ROM's actual behavior in the affected flow.

#### 25.10.1 The mechanism, pinned exactly — and a second channel §25.1/§25.6 never named

`Cmd_get_weather` (`src/battle_ai_script_commands.c:1644-1665`) only writes
`AI_THINKING_STRUCT->funcResult` when a real weather bit is set; the
`AI_WEATHER_NONE` sentinel assignment is `#ifdef BUGFIX`-gated (`:1651-1653`)
and `BUGFIX` is commented out in this pinned checkout
(`include/config.h:48`). So in a genuinely weatherless battle
(`gBattleWeather == 0`), `get_weather` leaves `funcResult` holding whatever
the *previous* AI script command wrote — and `AI_THINKING_STRUCT` is zeroed
**once** per battler-decision (`BattleAI_SetupAIData`,
`battle_ai_script_commands.c:312-380`), not per move and not per logic pass
(`BattleAI_DoAIProcessing`, `:572-616`, resets `gAIScriptPtr` to the current
logic's table entry for every `movesetIndex` but never touches
`funcResult`). For a Factory battle at `challengeNum >= 4` (or vs the
Frontier Brain), `GetAiScriptsInBattleFactory` (`src/battle_factory.c:889-911`)
sets `aiFlags = AI_SCRIPT_CHECK_BAD_MOVE | AI_SCRIPT_TRY_TO_FAINT |
AI_SCRIPT_CHECK_VIABILITY`, executed in that bit order (`aiLogicId` 0/1/2,
`ChooseMoveOrAction_Singles`, `:396-415`) across all 4 movesetIndex slots
per pass, all sharing the one un-zeroed `funcResult` for the whole decision.

**Channel 1 (CBM, the mechanism §25.1 already named)**: `AI_CheckBadMove`'s
own universal preamble (`AI_CheckBadMove_CheckSoundproof`,
`data/battle_ai_scripts.s:93`) runs `get_ability AI_TARGET` immediately
before the effect dispatch, for **every** move, regardless of whether the
move's own effect has a handler. `Cmd_get_ability` (`:1350-1401`) takes the
direct `gBattleMons[battler].ability` read (no `Random()` guess) for a
single-ability target species. `AI_CBM_RainDance`/`SunnyDay`/`Hail`
(`:490-493`/`:495-498`/`:522-525`) each open with `get_weather` as their
**first** instruction — so a genuinely weatherless dispatch reads the
target's real ability id straight through. Collision requires the target's
ability id to land in `AI_WEATHER_*`'s `0`-`3` range
(`include/constants/battle_ai.h:26-30`: Sun=0/Rain=1/Sandstorm=2/Hail=3).
Ability id 0 (`ABILITY_NONE`) is never a real species ability (no dex entry
has it as ability slot 0); id 1 (`ABILITY_STENCH`) has no single-ability
carrier in this dex (Gulpin/Swalot pair it with Sticky Hold); id 2
(`ABILITY_DRIZZLE`)'s only single-ability carrier is Groudon, not a Factory
rental. **Id 3 (`ABILITY_SPEED_BOOST`) is single-ability on Ninjask (302,
`abilities={SPEED_BOOST,NONE}`, species_info.h:8393-8397), and Ninjask is a
real Factory rental** (`src/data/battle_frontier/battle_frontier_mons.h:1670,2405`)
— the collision the brief asked for is reachable, via `AI_CBM_Hail` specifically
(id 3 == `AI_WEATHER_HAIL`).

**Channel 2 (CV, not named by §25.1/§25.6/§25.9 — found this session while
tracing Channel 1's own boundary conditions)**: `AI_CheckViability`'s own
preamble (`data/battle_ai_scripts.s:652-655`) is just `if_target_is_ally
AI_Ret` — no universal ability or power read before its own effect dispatch,
unlike CBM. But `AI_TryToFaint`'s own per-move preamble
(`:2616-2622`) unconditionally runs `get_how_powerful_move_is`
(`Cmd_get_how_powerful_move_is`, `battle_ai_script_commands.c:1174-1240`)
whenever `if_can_faint` is false (`Cmd_if_can_faint`, `:1743-1770`, never
itself touches `funcResult`) — true for any 0/1-power move, which always
sets `funcResult = MOVE_POWER_OTHER` (`= 0`,
`include/constants/battle_ai.h:33`, line 1236 of the C source). Since
`AI_SCRIPT_TRY_TO_FAINT` (logic id 1) runs immediately before
`AI_SCRIPT_CHECK_VIABILITY` (logic id 2) and both iterate all 4
`movesetIndex` slots without resetting `funcResult` between passes, **any
Factory decision whose last moveset slot (index 3) is a real move with power
≤1** (i.e. essentially every filler slot in every weather-trio fixture in
this doc, `Growl`/`Splash` both included) leaves `funcResult =
MOVE_POWER_OTHER(0)` sitting there when `AI_CV_RainDance`/`SunnyDay`/`Hail`'s
own `get_weather` call runs next — and `MOVE_POWER_OTHER(0)` numerically
equals `AI_WEATHER_SUN(0)`. All three CV handlers' own weather chains
include a Sun check (`RainDance`/`Hail` check Sun directly; `SunnyDay`
excludes Sun but that's irrelevant here since `SunnyDay`'s own chain is
Hail/Rain/Sandstorm), so this second channel spuriously scores `+1` in a
genuinely weatherless battle — **independent of the target's ability
entirely**, unlike Channel 1. This channel is reachable by essentially every
"reach" fixture already banked in §25.4-§25.9 (any single-turn weatherless
fixture with 0-power filler moves in slot 3), not just a specially-chosen
target.

#### 25.10.2 Three fixtures staged, all matching their predictions exactly, both seeds, deterministic (no ties)

Predictions were fixed before running (below), per the mechanism above.
Opponent (`AI_USER`) = Huntail (374, arbitrary — `Hail` has no `AI_USER`-side
ability/speed gate to confound), moveset `[MOVE_HAIL(258), MOVE_SPLASH(150)
x3]` for the first two; `raindance-noraindish-stalesun` reuses Gate R's own
exact setup with one field changed.

| Fixture | Target (ability id) | Prediction (source) | Live result, both seeds |
| --- | --- | --- | --- |
| `mechanic-factory-ai-hail-staleweather-collision-off.json` | Ninjask (Speed Boost=3, **collides** with both channels: CBM=-8 via Hail-id match, CV=+1 via Sun-id match) | net **-7**, Hail must lose to Splash(0) | opponent PP `[10,40,40,40]→[10,40,40,39]` — Hail (slot 0) **never** touched, a Splash slot drops. Exact match. |
| `mechanic-factory-ai-hail-staleweather-control-off.json` | Anorith (Battle Armor=4, **outside** 0-3, CBM channel silenced) | net **+1** (CV channel alone, target-independent) — Hail must beat Splash(0) despite the "safe" ability choice | opponent PP `[10,40,40,40]→[9,40,40,40]` — Hail (slot 0) **wins**. Exact match. |
| `mechanic-factory-ai-cv-raindance-noraindish-stalesun-off.json` (Lotad `abilitySlot:0`=Swift Swim instead of §25.9's `abilitySlot:1`=Rain Dish, vs Shuckle, same moveset as the banked Gate R fixture) | N/A (attacker-ability re-attribution check) | if CV channel fires: Rain Dance wins (+1) **despite no Rain Dish**; if Gate R's own tail were the true mechanism: tie (0) | opponent PP `[5,40,40,40]→[4,40,40,40]` — Rain Dance **wins**, identical margin to the original Gate R fixture, **with Rain Dish removed**. |

All three: 2/2 seeds identical, deterministic (no tie-break noise — the
score gaps are large enough that no `Random()`-based tie-break is ever
consulted). Wired into `tools/probe/verify-factory-ai-checkviability-ground-truth.ts`'s
`WEATHER_PICK_SCENARIOS` array (3 new entries, `beforeFrame:0`/`afterFrame:732`,
the established single-turn shape). **Full script run this session: ALL
PASS, 0 failures** (every one of the doc's 79+ pre-existing checks
unchanged and still green; reproduce with
`node --experimental-strip-types tools/probe/verify-factory-ai-checkviability-ground-truth.ts`).

The third fixture is a re-attribution check on already-banked evidence, not
new scope creep: it shows the original `raindance-gates-raindish-reach`
fixture's own live `+1` (§25.9.3/§25.9.5, claimed there as confirmation of
Gate R's ability-tail bonus) is **at least as well explained** by Channel 2
firing at Gate W2 (the Sun branch of `RainDance`'s own weather chain, which
comes *before* Gate R's tail check in instruction order) as by Gate R
itself — removing Rain Dish entirely reproduces the identical `+1` margin.
This doesn't overturn §25.9's own *numeric* claim (the engine's `+1` for
that fixture is still correct, and Gate R's own code is still exercised
correctly whenever it *is* reached, e.g. genuinely via a future fixture that
also avoids the Sun-collision), but its *causal attribution* — "confirms
Gate R correctly ported" — is unconfirmed by that fixture specifically,
since the live ROM path for it almost certainly never reached Gate R's own
two instructions at all. Left as a documentation note, not a new open item:
no `src/` changes, no fixture retraction (the fixture's own numeric claim
still holds).

#### 25.10.3 Verdict

**(a) Does the pinned ROM exhibit the stale read in a Factory-reachable
flow?** Yes, confirmed live — and via **two independent channels**, not the
one §25.1/§25.6 anticipated. Channel 1 (CBM, ability-id collision) requires
a specific single-ability target (Ninjask, id 3, only reachable for
`AI_CBM_Hail`); Channel 2 (CV, `MOVE_POWER_OTHER`/`AI_WEATHER_SUN` id
collision via `AI_TryToFaint`'s own tail state) requires no special ability
at all and fires in essentially any weatherless Factory decision with a
low-power filler in the last moveset slot — a much larger blast radius than
the brief's own framing assumed.

**(b) What value does the ROM actually use there?** Channel 1: the target's
real ability id (read via `AI_CheckBadMove_CheckSoundproof`'s own
`get_ability AI_TARGET`). Channel 2: `MOVE_POWER_OTHER` (`=0`, read via
`AI_TryToFaint`'s own `get_how_powerful_move_is` on the last moveset slot) —
which happens to equal `AI_WEATHER_SUN`, so every affected CV weather
handler spuriously takes its own "some other real weather is active" `+1`
branch.

**(c) Does the engine's ported handler agree or diverge?** **Diverges,
in both fixtures.** `runCbmWeatherSetter`
(`src/engine/factoryAiCheckBadMove.ts:757-758`, `return currentWeather ===
ownWeatherConstant ? -8 : 0`) and `weatherSetterCvScore`
(`src/engine/factoryAiCheckViability.ts:2330-2340`, `return 0` when
`currentWeather` doesn't match the "other three" set) both take a clean
`currentWeather?: AiWeatherValue` input, documented at its own definition
site (`src/engine/factoryAiDecisionPolicy.ts:516-522`, "Optional, defaulting
to `undefined` (no weather bit set)") — a correct, garbage-free model of
"no weather," with no mechanism to read a stale ability id or a stale
move-power classification. Fed `currentWeather = undefined` (the correct
value for both live fixtures above), the engine computes Hail's total score
as exactly **0** in both cases — tied with Splash's own 0. The real ROM's
live, verified score is **-7** (collision fixture) and **+1** (control
fixture) respectively — neither matches the engine's `0`, and the two
fixtures diverge from the engine in *opposite directions*, confirming the
mismatch isn't a single sign error but a genuine missing mechanism (the
engine was always going to disagree here, by design — porting either stale-
read channel byte-for-byte would mean threading target-ability and
last-moveset-slot-power state into the weather handlers' own clean
interface, which §25.8's own porter note already flagged as a deliberate
choice a porter should make explicitly, not an oversight).

**No `src/` change made** (out of scope for this step). This closes §25.6
item 4 — the last of that section's four open items — with a live-verified
divergence, not an infeasibility proof: staging was possible, and the
engine's already-ported handlers do not reproduce either channel, by
design and now by live evidence. A future porter should decide explicitly
whether Factory-facing AI parity requires replicating one or both channels
(Channel 1 needs a `target ability id` input on the weather CBM handlers;
Channel 2 needs the AI's own last-considered-move power classification
threaded across the CBM/TryToFaint/CV boundary — a much more invasive change
than any other handler in this doc's own 22-handler `AI_CV_*` program, since
every other handler's own state is self-contained within its own script
body) or to leave the bug un-replicated as a deliberate simplification.


## 26. 2026-07-27 addendum #16: `AI_CV_SpeedDownFromChance`'s own redirect path, live-verified — closes PROGRESS entry 493's no-live-ledger flag

Side-lane GROUND-TRUTH-ONLY session (Battle Scene OFF oracle), same no-
`src/`-changes contract as every prior addendum. `AI_CV_SpeedDownFromChance`
was ported this session as the 22nd and final `AI_CV_*` handler (PROGRESS
entry 493) with dispatcher/unit tests but **zero banked live ledger** — §6's
own `AI_CV_SpeedDown` fixtures dispatch `MOVE_STRING_SHOT`
(`EFFECT_SPEED_DOWN`, direct dispatch, `:1142`), never one of
`AI_CV_SpeedDownFromChance`'s own 6 `EFFECT_SPEED_DOWN_HIT` moves
(`:1136-1141`). This addendum closes that gap: two new fixture pairs prove
(1) the redirect itself — 3 of the 6 moves (`MOVE_ICY_WIND`, `MOVE_ROCK_TOMB`,
`MOVE_MUD_SHOT`) really do land inside `AI_CV_SpeedDown`'s own draw site when
dispatched live, matching §4's footnote/§10's recommendation exactly — and
(2) the redirect boundary — the other 3 (`MOVE_BUBBLE_BEAM`, `MOVE_CONSTRICT`,
`MOVE_BUBBLE`) really do fall through to a genuine, state-independent zero.

**Format choice**: a new top-level section, not a §6 addendum. §6 is already
long and closes with its own "Not yet banked" note that this session
directly answers; every other follow-up in this doc that adds ground truth
for a *different* handler (or, here, a structurally different dispatch path
into an *already-verified* handler) got its own `## N. 2026-0M-DD addendum
#K` section (§11-§25), never an inline edit to an earlier section — keeping
§6 byte-for-byte as originally banked preserves its own "fully executed,
live-verified" closing state as a citable snapshot, and matches every prior
session's own practice of appending rather than rewriting.

### 26.1 Source re-derivation (read-only, no `src/` changes)

```
AI_CV_SpeedDownFromChance:                (data/battle_ai_scripts.s:1136-1141)
    if_move MOVE_ICY_WIND, AI_CV_SpeedDown
    if_move MOVE_ROCK_TOMB, AI_CV_SpeedDown
    if_move MOVE_MUD_SHOT, AI_CV_SpeedDown
    end
```

Three plain `u16` move-ID compares (`Cmd_if_move`, not an
`if_random`/effect-chance read despite the "FromChance" name — the name
describes the dispatching moves' own in-game category, a chance-on-hit
secondary effect, not anything this handler itself inspects) that `goto`
into `AI_CV_SpeedDown`'s **own label** on a match — real control-flow entry
into that handler's own instructions, not a duplicated copy — and fall
through to `end` (zero score, zero draws, unconditionally, for every battle
state) on no match. `EFFECT_SPEED_DOWN_HIT` covers 6 executable moves total
(`src/engine/factoryAiCheckViability.ts:616-663`'s own
`runCvSpeedDownFromChance`, ported this session, re-derives this exactly):
`MOVE_ICY_WIND` (196), `MOVE_ROCK_TOMB` (317), `MOVE_MUD_SHOT` (341) redirect;
`MOVE_BUBBLE_BEAM` (61), `MOVE_CONSTRICT` (132), `MOVE_BUBBLE` (145) fall
through. All 6 have real power (10-65) and sub-100 secondary-effect chance
for 3 of them (`BUBBLE_BEAM`/`CONSTRICT`/`BUBBLE`, all 10%) or a forced 100%
for the redirecting 3 (`ICY_WIND`/`ROCK_TOMB`/`MUD_SHOT`) — irrelevant to
this handler (the AI script's own dispatch never reads secondary-effect
chance, only the move ID), but relevant to fixture design (§26.2): unlike
§6's `MOVE_STRING_SHOT` (0 power), every one of these 6 moves does real
damage, so `AI_TryToFaint`'s "not most powerful" `-1` no longer ties for free
— the fixture design below sidesteps this by using **identical moves in all
4 opponent slots** (a tie against itself) rather than §6's mixed-moveset
"equal-baseline control" trick, reading total `Random()` **count**, not
**which slot wins** (the same DRAW_COUNT_SCENARIOS technique §11 onward
already established for handlers whose own triggering move has real power).

### 26.2 Fixture design: identical-slots + Dugtrio/Shuckle speed-role swap, extended to a redirect/fallthrough 2×2

All four new fixtures reuse §6's own Dugtrio (species 51, base Speed 120) /
Shuckle (species 213, base Speed 5) pair verbatim — strictly ordered speeds
(120 vs. 5, never a tie, so `getWhoStrikesFirst`'s own hidden tie-break
`Random()` call, §25.3, never fires) and both single-ability species (no
`Cmd_get_ability` guess-draw confound, §14.2's finding). All 4 opponent
slots carry the **same** move (unlike §6's mixed String Shot/Growl design —
unnecessary here since the read channel is total draw count, not which slot
wins) and the player's own moveset is `MOVE_SPLASH` (150) ×4 — the "Splash-
not-Growl filler" lesson this doc's own later sessions converged on (§21.2,
§24.3, §24.5): Splash costs the window **zero** `Random()` of its own,
whereas Growl would need a fresh type-list argument to reach its own zero
baseline, an unnecessary confound when the filler's only job is "resolve
harmlessly." Same frame-100→732 window §6 established (not frame 0 — §6's
own documented reason still applies: swapping which side is faster swaps
move order, so frame 0's `rngValue` already has turn 1's decision baked in;
starting the count at frame 100 avoids re-litigating a pick that already
happened before the trace's first capture).

**Redirect pair** (`MOVE_ICY_WIND` ×4, one of the 3 redirecting moves):

- **`redirect-reach`**: opponent (`AI_USER`, the handler under test) =
  Shuckle (slower) — `if_target_faster` true → `AI_CV_SpeedDown`'s own
  `if_random_less_than 70` fires (`:1148`).
- **`redirect-control`**: opponent = Dugtrio (faster) — `if_target_faster`
  false → deterministic `-3`, zero draws from the handler.

**Fallthrough boundary pair** (`MOVE_CONSTRICT` ×4, one of the 3 NON-
redirecting moves — chosen over `BUBBLE_BEAM`/`BUBBLE` arbitrarily, all 3
take the identical zero-touch `end` path with no move-specific distinction
inside this handler): the SAME two speed roles, to prove the redirect
boundary rather than just assert it —

- **`fallthrough-boundary`**: opponent = Shuckle (slower — same role as
  `redirect-reach`) — `if_move` never matches; unconditional zero draws
  regardless of the reachable speed state.
- **`fallthrough-speedswap`**: opponent = Dugtrio (faster — same role as
  `redirect-control`) — same unconditional zero.

**Prediction, branch-by-branch, written before running**: `runCvSpeedDown`
(`src/engine/factoryAiCheckViability.ts:574-614`) draws once per identical
dispatch slot when reachable (§11/§12's "N identical slots → N draws per
reachable decision" finding), and this doc's own convention (§6) already
established that a single-input-turn capture window includes both the real
turn-1 decision AND a trailing **phantom** turn-2 re-decision (computed,
never executed) — for a handler whose only gate is relative Speed (fixed at
team-build time, unlike VitalThrow/AlwaysHit's HP/stage-dependent gates),
nothing changes between those two decisions, so both should reach the same
branch. Qualitative prediction: `redirect-reach`'s total is nonzero and
strictly greater than `redirect-control`'s (the roll fires in the former,
never in the latter); both `fallthrough` fixtures' totals should be
unaffected by speed role (the handler contributes exactly zero in both,
by construction — `runCvSpeedDownFromChance` returns `{ rng: input.rng,
draws: [], scoreDelta: 0 }` unconditionally for a non-matching `moveId`,
never reading speed at all).

### 26.3 Live ledger (oracle-verified, both seeds, both reruns)

| Fixture | Opponent (AI_USER) | Move ×4 | Speed role | Total `Random()`, frame 100→732 |
| --- | --- | --- | --- | -: |
| `redirect-reach` | Shuckle | `MOVE_ICY_WIND` (redirects) | slower (reach) | **24** (seeds 1, 99) |
| `redirect-control` | Dugtrio | `MOVE_ICY_WIND` (redirects) | faster (control) | **7** (seeds 1, 99) |
| `fallthrough-boundary` | Shuckle | `MOVE_CONSTRICT` (falls through) | slower (same role as reach) | **18** (seeds 1, 99) |
| `fallthrough-speedswap` | Dugtrio | `MOVE_CONSTRICT` (falls through) | faster (same role as control) | **7** (seeds 1, 99) |

All four fixtures reproduced byte-identical frame-0 state across two runs at
each seed (the determinism requirement) and identical totals across seeds 1
and 99 (cross-seed count stability) — 4 fixtures × 2 seeds × 2 reruns each,
every one landing exactly on its predicted qualitative shape.

**The redirect confirms live**: `redirect-reach` (24) is strictly greater
than `redirect-control` (7) for the **identical move** — the only variable
that changed is which side is faster, i.e. exactly `AI_CV_SpeedDown`'s own
gate (`:1142`, `if_target_faster`). This is only possible if
`MOVE_ICY_WIND` really does land inside `AI_CV_SpeedDown`'s own body when
dispatched through `AI_CV_SpeedDownFromChance` — the redirect the ported
`runCvSpeedDownFromChance` claims, now live-verified rather than asserted
from static analysis alone.

**The boundary confirms live, and pins down the redirect's own exact
contribution**: `fallthrough-speedswap` (7) is **exactly equal** to
`redirect-control` (7) — in the "opponent faster" configuration, the two
different moves (Icy Wind vs. Constrict) cost an identical number of
`Random()` calls, meaning this configuration's non-handler baseline
(accuracy check, damage roll, secondary-effect-chance roll — none of them
handler-attributable) does not actually differ between these two moves at
this window's granularity. That licenses reading the "opponent slower"
configuration's own delta cleanly: `redirect-reach` (24) − `fallthrough-
boundary` (18) = **+6**, present only for the redirecting move, at the
IDENTICAL speed role and IDENTICAL species pair — an isolated, live-verified
measurement of `AI_CV_SpeedDown`'s own draw-site contribution when reached
via the redirect, structurally the same "N identical slots → N draws" shape
as every prior pair in this doc, though the exact figure (+6, not a bare +4
or the naively doubled +8 the prediction guessed for "real decision +
phantom re-decision, 4 slots each") was not pinned exactly before running —
consistent with this doc's own standing caveat (§6, §12) that the frame-
100→732 window's total describes the **whole** post-turn-1 window, phantom
re-decision included, not a clean per-decision breakdown; a future worker
wanting the exact per-decision split should reach for
`tools/probe/attribute-factory-ai-random-callers.py` (directly reusable
against these fixtures, not run this session for time — same status §6 left
it in).

**No contradiction found**: the ported redirect (`MOVE_ICY_WIND`/
`MOVE_ROCK_TOMB`/`MUD_SHOT` → `AI_CV_SpeedDown`'s own body;
`MOVE_BUBBLE_BEAM`/`MOVE_CONSTRICT`/`MOVE_BUBBLE` → zero) matches the oracle
exactly. **This closes PROGRESS entry 493's "22nd and final CV handler,
ZERO banked live ledger" flag** — `AI_CV_SpeedDownFromChance` now has the
same live-oracle standing as all 21 other reachable `AI_CV_*` handlers in
this doc.

### 26.4 Verify script status

`tools/probe/verify-factory-ai-checkviability-ground-truth.ts` extended this
session with a new `SPEEDDOWNFROMCHANCE_REDIRECT_SCENARIOS` array +
`verifyRedirectScenario` runner (frame-100→732 total-step count, same shape
as `SCENARIOS`'s own runner minus the "which slot won" pick check — all 4
opponent slots are identical here, so there is no cross-slot pick to read)
covering the 4 fixtures above. Every prior scenario (§9, §11.5, §12.1,
§13.4, §14.6, §15.5, §16.5, §17.7, §18.7, §19.7, §20.5, §21.5, §22.6,
§23.6, §24.8, §25.7) unchanged and still green. Reproduce with:

```sh
node --experimental-strip-types tools/probe/verify-factory-ai-checkviability-ground-truth.ts
```
