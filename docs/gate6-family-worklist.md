# Gate 6 hook-family worklist

**Status header.** Authored at HEAD `615c24450464815d30c3a4594b3ffe11fa9b3260`
(2026-08-09), against the frontier enumerated by
`docs/gate6-coverage-manifest.md`/`.json` at that same commit: **106 ability
join gaps** and **195 item join gaps** (194 ordinary + `MOVE_TICKLE`'s
explicit King's-Rock-exception row) across the 300 Level-50 roster moves.
Promoted-and-closed families as of this commit: Soundproof, Volt/Water
Absorb + Flash Fire, ON_DAMAGE contact + Color Change, Synchronize,
Attract/Oblivious, Explosion/Damp, King's Rock. **Shell Bell is in flight
(main lane)** — it shares `ItemBattleEffects`'s `ITEMEFFECT_KINGSROCK_SHELLBELL`
switch (`reference/pokeemerald/src/battle_util.c:3769`) with King's Rock, in
the sibling `HOLD_EFFECT_SHELL_BELL` arm at `battle_util.c:3787-3806`. This
worklist does not rank or claim Shell Bell; do not restage it.

This document derives every remaining gap row's family from the two hook
dispatch functions named in the task brief — `ItemBattleEffects`
(`reference/pokeemerald/src/battle_util.c:3257`) and `AbilityBattleEffects`
(`reference/pokeemerald/src/battle_util.c:2431`) — and the battle-script
opcodes/`MOVEEND_*` states in
`reference/pokeemerald/src/battle_script_commands.c` and
`reference/pokeemerald/data/battle_scripts_1.s` that call them. Regrouping
method: for each of the 106+195 unsupported rows, find which switch-case in
`ItemBattleEffects`/`AbilityBattleEffects`, or which dedicated `Cmd_*`
opcode, is the *only* still-unclaimed hook the row's entry script reaches;
group rows that share that exact site into one family. This produced five
families (§1) that exactly partition the 301 rows (§5 arithmetic), plus an
exclusions section (§2) for hook sites that are real but out of this
per-move axis's scope.

## 0. How the two enums map to families

`reference/pokeemerald/include/battle_util.h:12-45` enumerates the case IDs:

```
ABILITYEFFECT_ON_SWITCHIN 0   ABILITYEFFECT_ENDTURN 1   ABILITYEFFECT_MOVES_BLOCK 2
ABILITYEFFECT_ABSORBING 3     ABILITYEFFECT_ON_DAMAGE 4  ABILITYEFFECT_IMMUNITY 5
ABILITYEFFECT_FORECAST 6      ABILITYEFFECT_SYNCHRONIZE 7  ABILITYEFFECT_ATK_SYNCHRONIZE 8
ABILITYEFFECT_INTIMIDATE1 9   ABILITYEFFECT_INTIMIDATE2 10 ABILITYEFFECT_TRACE 11
ABILITYEFFECT_CHECK_OTHER_SIDE 12 .. ABILITYEFFECT_CHECK_ON_FIELD 19
ABILITYEFFECT_MUD_SPORT 253   ABILITYEFFECT_WATER_SPORT 254 ABILITYEFFECT_SWITCH_IN_WEATHER 255

ITEMEFFECT_ON_SWITCH_IN 0  ITEMEFFECT_NORMAL 1  ITEMEFFECT_DUMMY 2 (unused)
ITEMEFFECT_MOVE_END 3      ITEMEFFECT_KINGSROCK_SHELLBELL 4
```

`reference/pokeemerald/include/constants/battle_script_commands.h:393-410`
enumerates `Cmd_moveend`'s state machine, run once per completed move for
(almost) every move in the roster:

```
MOVEEND_RAGE 0  MOVEEND_DEFROST 1  MOVEEND_SYNCHRONIZE_TARGET 2  MOVEEND_ON_DAMAGE_ABILITIES 3
MOVEEND_IMMUNITY_ABILITIES 4  MOVEEND_SYNCHRONIZE_ATTACKER 5  MOVEEND_CHOICE_MOVE 6
MOVEEND_CHANGED_ITEMS 7 .. MOVEEND_ITEM_EFFECTS_ALL 11  MOVEEND_KINGSROCK_SHELLBELL 12 ..
```

States 2/5 (Synchronize), 3 (ON_DAMAGE), 12 (King's Rock/Shell Bell) are
already promoted or in flight. States **4** and **11** — dispatched at
`battle_script_commands.c:4285-4290` and `:4330-4335` — are unconditional:
they fire for every move that reaches `Cmd_moveend` regardless of that
move's own effect, which is exactly why the remaining item/ability gaps are
overwhelmingly "generic" (families 1 and 2 below). A cross-check confirms
this from the data side: every one of the 106 ability-unsupported moves is a
non-damaging (0-power) move, and the 106 ability-unsupported moves are a
strict subset of the 195 item-unsupported moves (0 ability-only rows,
verified by set difference over `docs/gate6-coverage-manifest.json`) — i.e.
every damaging move's ability axis is already claimed by a promoted family
(ON_DAMAGE/ABSORBING/Synchronize/Explosion-Damp), and only the pure-status
remainder needs a new ability family.

## 1. Families (ranked)

### Rank 1 — Item: generic post-move status-cure/stat-restore family

- **Name / hook site.** `ItemBattleEffects` case `ITEMEFFECT_MOVE_END`
  (`battle_util.c:3625-3767`), dispatched unconditionally from
  `Cmd_moveend` case `MOVEEND_ITEM_EFFECTS_ALL`
  (`battle_script_commands.c:4330-4335`). Internally it loops all battlers
  and switches on `battlerHoldEffect`: `HOLD_EFFECT_CURE_PAR/PSN/BRN/FRZ/SLP`
  (Cheri/Pecha/Rawst/Aspear/Chesto Berry, `:3641-3686`),
  `HOLD_EFFECT_CURE_CONFUSION` (Persim, `:3687-3695`),
  `HOLD_EFFECT_CURE_ATTRACT` (Mental Herb, `:3696-3706`),
  `HOLD_EFFECT_CURE_STATUS` (Lum Berry, `:3707-3738`), and
  `HOLD_EFFECT_RESTORE_STATS` (White Herb, `:3739-3756`).
- **Selector.** Every Level-50 roster move whose item-axis row is
  `unsupported`, **except** the four direct item-manipulation moves in
  Rank 3. Membership does not depend on the acting move's own effect — only
  on reaching `Cmd_moveend`'s normal tail — which is why it is not further
  split by held-item branch (splitting by branch would make every row a
  member of multiple "families," violating the one-family-per-row
  partition).
- **Candidate count.** 191. Reproduced by:
  `python3 -c "import json; d=json.load(open('docs/gate6-coverage-manifest.json')); rows=[r['move'] for r in d['sections']['perMoveHookJoins']['item'] if r['status']=='unsupported']; manip={'MOVE_COVET','MOVE_TRICK','MOVE_RECYCLE','MOVE_KNOCK_OFF'}; print(len([m for m in rows if m not in manip]))"`
  → `191`.
- **Representative + staging sketch.** Attacker `SPECIES_SLUGMA`
  (Level-50 set 30, `MOVE_BODY_SLAM`) vs. defender `SPECIES_ZUBAT`
  (Level-50 set 25, held item `BATTLE_FRONTIER_ITEM_CHERI_BERRY`) — both
  verified real carriers via
  `docs/gate6-coverage-manifest.json#sections.corpus.level50Sets[25,30]`.
  Turn 1: Zubat uses any move (e.g. its own `MOVE_WHIRLWIND`) while
  paralysis is pre-staged onto it by a first, RNG-free status move rather
  than Body Slam's 30% proc, to avoid an RNG-timing hazard on the very proc
  being measured — swap in any guaranteed-paralysis Level-50 move as the
  turn-1 stager, or fix the oracle seed and quote the roll. Turn 2: Zubat's
  Cheri Berry cures the paralysis at `MOVEEND_ITEM_EFFECTS_ALL` after
  *any* move completes (the representative's own move, e.g. Whirlwind,
  need not itself be a status-inducing move) — this is the row under test:
  Whirlwind's item-axis membership in this family.
  `overrides.parties` sketch: three legal mons per side per
  `AGENTS.md`'s contract; slot the two sets above plus one filler legal
  Level-50 set on each side.
- **Manifest delta if promoted.** Item join gaps 195 → 4 (only Rank 3's
  rows remain on the item axis).
- **Blockers/dependencies.** None structural. RNG-timing hazard noted above
  (mitigate with a guaranteed-status stager or a pinned oracle seed).
- **Rank rationale.** Largest single gap-closure (191 of 301 rows) for one
  representative + one Tier-1 reachability batch; the hook-site pattern
  itself (a `MOVEEND_*` state proven via one representative plus sibling
  batch) is already validated by King's Rock/Synchronize, so staging risk
  is low even though the row count is the largest in the worklist.
- **STATUS (2026-08-10, main worker): promoted.** 114 of 116 live candidates
  promoted (item join gaps 118 → 4); the worklist's 191/stale-114 figures
  above are both superseded by the live manifest baseline (Shell Bell's
  2026-08-09 promotion already moved 77 rows out of `unsupported` before
  this step ran). `MOVE_ASSIST`/`MOVE_METRONOME` are explicit
  dynamic-dispatch exceptions (no static moveend node), the same structural
  gap already found for Rank 2. Receipts (already banked, consumed as-is):
  `docs/item-move-end-family-ground-truth.md`,
  `tools/battle-lab/mechanic-item-move-end-paralysis-{cheri,control}-off.json`,
  `tools/probe/verify-item-move-end-paralysis-off.py`,
  `tools/probe/receipts/item-move-end-paralysis-{cheri,control}-off.json`
  (rerun fresh this step, byte-identical). Tests:
  `tests/itemMoveEndHookJoinBatch.test.ts`,
  `tests/itemMoveEndOracleEvidence.test.ts`. Remaining 4 item gaps:
  `MOVE_ASSIST`, `MOVE_METRONOME`, plus Rank 3's `MOVE_TRICK`/`MOVE_RECYCLE`
  (Rank 3's `MOVE_COVET`/`MOVE_KNOCK_OFF` were already Shell-Bell-claimed by
  their nonzero power before this step, not by this family).

### Rank 2 — Ability: generic post-move status-immunity cleanup family

- **Name / hook site.** `AbilityBattleEffects` case `ABILITYEFFECT_IMMUNITY`
  (`battle_util.c:2873-2954`), dispatched unconditionally from
  `Cmd_moveend` case `MOVEEND_IMMUNITY_ABILITIES`
  (`battle_script_commands.c:4285-4290`). It loops all battlers and clears
  an already-present status if the battler's ability is `ABILITY_IMMUNITY`
  (poison, `:2878-2884`), `ABILITY_OWN_TEMPO` (confusion, `:2885-2891`),
  `ABILITY_LIMBER` (paralysis, `:2892-2898`), `ABILITY_INSOMNIA` /
  `ABILITY_VITAL_SPIRIT` (sleep, `:2899-2907`), `ABILITY_WATER_VEIL`
  (burn, `:2908-2914`), `ABILITY_MAGMA_ARMOR` (freeze, `:2915-2921`), or
  `ABILITY_OBLIVIOUS` (infatuation, `:2922-2928`).
- **Selector.** Every Level-50 roster move whose ability-axis row is
  `unsupported`, except the two ability-manipulation moves (Rank 4) and the
  five moves that carry their own pre-emptive `jumpifability` guard for
  `ABILITY_OWN_TEMPO` (Rank 5). This is exactly the pure-status-move
  remainder described in §0 — no damaging move needs this family because
  ON_DAMAGE/ABSORBING/Synchronize already claim them.
- **Candidate count.** 99. Reproduced by:
  `python3 -c "import json; d=json.load(open('docs/gate6-coverage-manifest.json')); rows=[r['move'] for r in d['sections']['perMoveHookJoins']['ability'] if r['status']=='unsupported']; excl={'MOVE_SKILL_SWAP','MOVE_ROLE_PLAY','MOVE_CONFUSE_RAY','MOVE_SWEET_KISS','MOVE_SWAGGER','MOVE_FLATTER','MOVE_TEETER_DANCE'}; print(len([m for m in rows if m not in excl]))"`
  → `99`.
- **Representative + staging sketch.** Attacker uses any status move
  (e.g. `MOVE_SWORDS_DANCE`) while the defender is `SPECIES_DITTO`
  (Level-50 set 54, ability `ABILITY_LIMBER`, verified via
  `docs/gate6-coverage-manifest.json#sections.corpus.level50Sets[54]`
  cross-joined against `src/data/gen/species-stats.json`'s
  `abilities` array). Turn 1: stage paralysis onto Ditto via a
  guaranteed-status move (same RNG-avoidance rationale as Rank 1). Turn 2:
  any completed move (including a non-status move, to isolate the
  hook from the acting move's own effect) reaches `MOVEEND_IMMUNITY_ABILITIES`
  and Limber clears the paralysis.
- **Manifest delta if promoted.** Ability join gaps 106 → 7 (Ranks 4 and 5
  remain).
- **Blockers/dependencies.** Same RNG-timing note as Rank 1. Independent of
  Rank 1 (different axis, different hook site) — may run in parallel.
- **Rank rationale.** Second-largest closure (99 rows) via the same
  low-risk one-representative-plus-batch pattern; ranked below Rank 1 only
  because it closes fewer rows, and below Ranks 3/4 in *novelty* terms —
  it reuses the already-proven `MOVEEND_*`-state-machine pattern rather
  than exercising a new opcode family — but its sheer row count still earns
  it Rank 2 overall under the stated closure-per-cost criterion.
- **STATUS (2026-08-10, main worker): promoted.** 97 of the 99 candidates
  promoted (ability join gaps 106 → 9); `MOVE_ASSIST` and `MOVE_METRONOME`
  are explicit dynamic-dispatch exceptions (`jumptocalledmove`/`metronome`
  have no static moveend node of their own for the graph/program route
  certificate to terminate on), a difference from this section's predicted
  99/99 that the worklist's own candidate-count command did not anticipate.
  Receipts: `docs/immunity-abilities-ground-truth.md`,
  `tools/battle-lab/mechanic-immunity-limber-skill-swap-off.json`,
  `tools/probe/probe-immunity-limber-off.py`,
  `tools/probe/receipts/immunity-limber-off-seed-610839776.json` and
  `-324508639.json` (both reproduced fresh, byte-identical). Tests:
  `tests/statusImmunityHookJoinBatch.test.ts`,
  `tests/statusImmunityOracleEvidence.test.ts`.

### Rank 3 — Item: direct item-manipulation opcode family

- **Name / hook site.** Four moves bypass `ItemBattleEffects` entirely and
  call dedicated opcodes: `MOVE_COVET` (`EFFECT_THIEF`) sets
  `MOVE_EFFECT_STEAL_ITEM` (`battle_scripts_1.s:1440-1442`, handled at
  `battle_script_commands.c:2738` inside `Cmd_seteffectwithchance`/
  `Cmd_various`'s move-effect switch); `MOVE_TRICK` calls `tryswapitems`
  → `Cmd_tryswapitems` (`battle_scripts_1.s:2331-2344`,
  `battle_script_commands.c:9189`); `MOVE_RECYCLE` calls `tryrecycleitem`
  → `Cmd_tryrecycleitem` (`battle_scripts_1.s:2403-2412`,
  `battle_script_commands.c:9808`); `MOVE_KNOCK_OFF` sets
  `MOVE_EFFECT_KNOCK_OFF` (`battle_scripts_1.s:2475-2477`, handled at
  `battle_script_commands.c:2863-2880`, with an explicit
  `ABILITY_STICKY_HOLD` guard).
- **Selector.** The exact four moves named above — the only Level-50
  roster moves whose entry script reads or writes `gBattleMons[].item`
  directly rather than going through `ItemBattleEffects`.
  `MOVE_THIEF` (the non-Covet name for `EFFECT_THIEF`) is legally absent
  from the 300-row Level-50 roster in this dataset (verified: `'MOVE_THIEF'
  in [r['move'] for r in item_axis]` → `False`), so it is not a candidate
  here.
- **Candidate count.** 4. Reproduced by:
  `python3 -c "import json; d=json.load(open('docs/gate6-coverage-manifest.json')); rows={r['move'] for r in d['sections']['perMoveHookJoins']['item'] if r['status']=='unsupported'}; print(sorted(rows & {'MOVE_COVET','MOVE_TRICK','MOVE_RECYCLE','MOVE_KNOCK_OFF'}))"`
  → all four present.
- **Representative + staging sketch.** `MOVE_COVET`: attacker
  `SPECIES_LINOONE` (Level-50 set 203, holds `BATTLE_FRONTIER_ITEM_WHITE_HERB`,
  itself irrelevant) vs. a defender holding any non-Mail, non-`ITEM_NONE`
  item (e.g. `SPECIES_ZUBAT` set 25 above, Cheri Berry) — verified carrier
  via `docs/gate6-coverage-manifest.json#sections.corpus.level50Sets[203]`.
  One turn suffices: Covet steals the Cheri Berry if Linoone is itemless
  going in (stage Linoone's item as `ITEM_NONE` in `overrides.parties`,
  which is legal since held item is a free field in the staging contract).
- **Manifest delta if promoted.** Item join gaps 4 → 0 (closes the item
  axis completely, pending Shell Bell).
- **Blockers/dependencies.** None found; independent of Ranks 1/2.
- **Rank rationale.** Small row count (4) but the highest novelty on the
  item axis — it is the only family exercising `Cmd_tryswapitems`/
  `Cmd_tryrecycleitem`/`MOVE_EFFECT_STEAL_ITEM`/`MOVE_EFFECT_KNOCK_OFF`,
  none of which any promoted or Rank-1 family touches. Ranked above Rank 2
  under the novelty criterion despite closing fewer rows, and it fully
  closes the item axis, which is a clean milestone.
- **STATUS (2026-08-10, main worker): promoted.** All 4 candidates promoted
  (item join gaps 4 → 2, not 0 — `MOVE_ASSIST`/`MOVE_METRONOME` remain,
  Rank 1's dynamic-dispatch exceptions, never members of this family's
  selector; this section's "closes the item axis completely" prediction is
  superseded). Each row gets its own opcode certificate (exact entry-script
  statement audit + ordered C guard-chain citation into `Cmd_seteffectwithchance`'s
  `MOVE_EFFECT_STEAL_ITEM`/`MOVE_EFFECT_KNOCK_OFF` arms, `Cmd_tryswapitems`,
  `Cmd_tryrecycleitem`) — no shared MOVEEND state, unlike every other
  item-axis family. Covet/Knock Off were already Shell-Bell-claimed (power
  != 0); this family adds a second, independent category to those two rows
  and the first category to Trick/Recycle. Evidence per `docs/item-manipulation-family-ground-truth.md`:
  fresh Covet + Recycle Battle Scene OFF receipts (`tools/battle-lab/mechanic-item-manipulation-{covet,recycle}-*-off.json`,
  `tools/probe/verify-item-manipulation-{covet,recycle}-off.py`, both rerun
  live this step and reproduced byte-identically); pre-existing 2026-07-28
  Trick/Knock Off evidence cited as-is (`tests/trickOracleEvidence.test.ts`,
  `tests/familyBCluster4OracleEvidence.test.ts`). Tests:
  `tests/itemManipulationHookJoinBatch.test.ts`, `tests/itemManipulationOracleEvidence.test.ts`.

### Rank 4 — Ability: direct ability-manipulation opcode family

- **Name / hook site.** `MOVE_ROLE_PLAY` calls `trycopyability` →
  `Cmd_trycopyability` (`battle_scripts_1.s:2346-2356`,
  `battle_script_commands.c:9277`); `MOVE_SKILL_SWAP` calls
  `tryswapabilities` → `Cmd_tryswapabilities`
  (`battle_scripts_1.s:2497-2507`, `battle_script_commands.c:9392`).
  Both write `gBattleMons[].ability` directly, bypassing
  `AbilityBattleEffects` for their core mechanic.
- **Selector.** The exact two moves named above.
- **Candidate count.** 2. Reproduced by:
  `python3 -c "import json; d=json.load(open('docs/gate6-coverage-manifest.json')); rows={r['move'] for r in d['sections']['perMoveHookJoins']['ability'] if r['status']=='unsupported'}; print(sorted(rows & {'MOVE_SKILL_SWAP','MOVE_ROLE_PLAY'}))"`
  → both present.
- **Representative + staging sketch.** `MOVE_ROLE_PLAY`: attacker
  `SPECIES_KADABRA` (Level-50 set 169, knows `MOVE_ROLE_PLAY`, verified via
  `docs/gate6-coverage-manifest.json#sections.corpus.level50Sets[169]`)
  vs. any defender with a distinct, legible ability (e.g. Ditto/Limber,
  set 54, above). One turn: Kadabra copies Limber; a follow-up turn using
  any status move on Kadabra while it is paralyzed would show Limber
  clearing it — but the row under test only needs the *copy* to be proven,
  i.e. a post-move `GetBattlerAbility(gBattlerAttacker)` read.
- **Manifest delta if promoted.** Ability join gaps 7 → 5 (Rank 5 remains).
- **Blockers/dependencies.** None found; independent of Ranks 1-3.
- **Rank rationale.** Smallest row count (2) but the second-highest
  novelty on the ability axis (`Cmd_trycopyability`/`Cmd_tryswapabilities`
  are otherwise completely unexercised); ranked above Rank 5 because it is
  a strictly self-contained opcode pair with no shared machinery, while
  Rank 5 is a refinement carved out of Rank 2's territory and is best
  staged alongside it.

### Rank 5 — Ability: pre-emptive Own Tempo confusion-guard family

- **Name / hook site.** `jumpifability BS_TARGET, ABILITY_OWN_TEMPO, ...`
  embedded directly in the entry script, *before* any
  `AbilityBattleEffects`/`Cmd_moveend` involvement: `BattleScript_EffectConfuse`
  (`battle_scripts_1.s:903-907`, covers both `MOVE_CONFUSE_RAY` and
  `MOVE_SWEET_KISS`, which share the script per
  `battle_scripts_1.s:126` / the effect table), `BattleScript_EffectSwagger`
  (`:1608-1625`), `BattleScript_EffectFlatter` (`:2151-2168`), and
  `BattleScript_EffectTeeterDance` (`:2571-2580`, target-side; Teeter
  Dance also hits the user, whose own Own Tempo would separately no-op the
  self-hit). Each guard redirects to a distinct fail script
  (`BattleScript_OwnTempoPrevents` / `BattleScript_TeeterDanceOwnTempoPrevents`)
  instead of the generic `BattleScript_AbilityCuredStatus` used by Rank 2.
- **Selector.** The exact five moves named above — the only Level-50
  roster moves in the unsupported-ability set whose *own* entry script
  contains a `jumpifability` branch (confirmed by grepping all 20
  `jumpifability` occurrences in `battle_scripts_1.s` and mapping each to
  its enclosing `BattleScript_Effect*` label; the other 15 occurrences
  belong to already-promoted or non-Level-50-roster scripts, e.g.
  `ABILITY_LIQUID_OOZE`/`ABILITY_SUCTION_CUPS`/`ABILITY_ROCK_HEAD`/
  `ABILITY_CLEAR_BODY`/`ABILITY_HYPER_CUTTER`/`ABILITY_WHITE_SMOKE`
  Intimidate guards, `ABILITY_WATER_VEIL`'s Will-O-Wisp guard whose move is
  not in the unsupported set, and the two `ABILITY_IMMUNITY` guards on
  Toxic/Poison whose moves are likewise already resolved off this list —
  see §2 for why those are out of scope here, not silently dropped).
- **Candidate count.** 5. Reproduced by:
  `python3 -c "import json; d=json.load(open('docs/gate6-coverage-manifest.json')); rows={r['move'] for r in d['sections']['perMoveHookJoins']['ability'] if r['status']=='unsupported'}; print(sorted(rows & {'MOVE_CONFUSE_RAY','MOVE_SWEET_KISS','MOVE_SWAGGER','MOVE_FLATTER','MOVE_TEETER_DANCE'}))"`
  → all five present.
- **Representative + staging sketch.** Attacker `SPECIES_ZUBAT`
  (Level-50 set 25, `MOVE_CONFUSE_RAY`) vs. defender `SPECIES_SMEARGLE`
  (Level-50 set 32, ability `ABILITY_OWN_TEMPO`, verified via
  `docs/gate6-coverage-manifest.json#sections.corpus.level50Sets[32]`
  cross-joined against `species-stats.json`). One turn: Confuse Ray should
  redirect to `BattleScript_OwnTempoPrevents` and apply no confusion,
  distinct from Rank 2's post-hoc-cure message shape.
- **Manifest delta if promoted.** Ability join gaps 5 → 0 (closes the
  ability axis completely, alongside Rank 4).
- **Blockers/dependencies.** Best staged immediately after or alongside
  Rank 2, since both exercise the Own Tempo/immunity-family ability set and
  share representative-selection logic (same carrier species pool).
- **Rank rationale.** Smallest count and lowest independent novelty — it is
  a refinement carved out of Rank 2's generic family, not a new engine
  surface — so it ranks last of the five despite being fully specified.

## 2. Exclusions — provably out of the per-move axis, not "work"

These `ItemBattleEffects`/`AbilityBattleEffects` cases are real and cited,
but none of them correspond to any of the 300 per-move item/ability rows —
they fire once per switch-in, once per end-of-turn, or as global
field-wide queries independent of which move was used. Excluding them is
not a promotion; it is a scope statement, matching this run's existing
separate censuses.

- **`ABILITYEFFECT_ON_SWITCHIN` (`battle_util.c:2485`),
  `ABILITYEFFECT_SWITCH_IN_WEATHER` (`:2490`), `ABILITYEFFECT_INTIMIDATE1`
  (`:3003`), `ABILITYEFFECT_TRACE` (`:3017`), `ABILITYEFFECT_INTIMIDATE2`
  (`:3074`).** Entry hooks, fired once when a battler is sent out, not
  gated by any move. Already the subject of
  `docs/switchin-entryhooks-off-evidence.md`.
- **`ABILITYEFFECT_ENDTURN` (`battle_util.c:2601`).** End-of-turn hook,
  fired once per turn for every battler regardless of which move (if any)
  was used. Already the subject of
  `docs/endturn-abilities-items-ground-truth.md`.
- **`ABILITYEFFECT_FORECAST` (`battle_util.c:2955`), called from the
  fainted/switch-in replacement loop at `battle_util.c:1958-1963` alongside
  `ABILITYEFFECT_INTIMIDATE1`/`TRACE`/`ITEMEFFECT_NORMAL`.** Confirmed
  entry-adjacent, not per-move, despite `SPECIES_CASTFORM` having two
  live Level-50 carriers (sets 204, 309) — it is excluded by hook site, not
  by zero-carrier status.
- **`ITEMEFFECT_ON_SWITCH_IN` (`battle_util.c:3305`) and `ITEMEFFECT_NORMAL`
  (`battle_util.c:3331`).** Switch-in and end-of-turn item hooks (Leftovers,
  White Herb-on-switch-in restore, PP Up-berry Leppa-analog restore),
  same reasoning as the ability entry/end-turn hooks above.
  `ITEMEFFECT_DUMMY` (`:battle_util.h:43`) is explicitly unused/empty.
- **`ABILITYEFFECT_MOVES_BLOCK` beyond Soundproof
  (`battle_util.c:2659-2675`).** Read in full: the only ability branch in
  this case is `ABILITY_SOUNDPROOF`. Zero residual candidates — already
  fully closed by the promoted Soundproof family, not a gap.
- **Field-wide ability queries: `ABILITYEFFECT_COUNT_ON_FIELD`/
  `COUNT_OTHER_SIDE`** (Pressure PP-doubling, called from `Cmd_ppreduce` at
  `battle_script_commands.c:1217,1221`), **`ABILITYEFFECT_CHECK_FIELD_EXCEPT_BATTLER`**
  (Magnet Pull trapping, `battle_main.c:4064,4252`), and
  **`ABILITYEFFECT_CHECK_BATTLER_SIDE`/`CHECK_OTHER_SIDE`/`CHECK_ON_FIELD`**
  (Cloud Nine/Air Lock weather suppression queries,
  `battle_script_commands.c:3113,3128,3993`). These are real, currently
  unexercised mechanics, but they are not represented as any of the 300
  per-move ability rows in this census's schema (Pressure/Magnet Pull/
  Cloud Nine apply uniformly regardless of the acting move's identity, more
  like a passive field state than a move-keyed hook join). **This is the
  one explicit "needs its own scout" bucket**: a future revision of this
  worklist should determine whether Gate 6 wants a move-keyed accounting
  for these at all, or a separate non-per-move census. They contribute 0 to
  the 106/195 arithmetic below because they are not currently counted as
  rows on either axis.
- **`ABILITYEFFECT_MUD_SPORT`/`WATER_SPORT` (`battle_util.h:32-33`, read at
  `reference/pokeemerald/src/pokemon.c:3215,3217`).** Damage-halving field
  query, not a per-move item/ability hook-join row; same "needs its own
  scout" bucket as above, already partially represented by `MOVE_MUD_SPORT`
  itself which is a Rank 2 family member on the *setter* side (its own
  ability-axis row is generic-Immunity-family, per Rank 2) — this exclusion
  is only about the *reader* side (`GetMoveTypeSpecial`/damage-calc query),
  not `MOVE_MUD_SPORT`'s own row.

## 3. Ranking rationale (one sentence each)

1. **Item generic (191 rows):** closes nearly two-thirds of all remaining
   gaps with a single low-risk, already-validated `MOVEEND_*`-state pattern.
2. **Ability generic (99 rows):** the second-largest closure via the same
   validated pattern, independent of Rank 1 and safely parallel to it.
3. **Item-manipulation opcodes (4 rows):** small but the only family
   touching `Cmd_tryswapitems`/`Cmd_tryrecycleitem`/steal/knock-off, and it
   fully closes the item axis.
4. **Ability-manipulation opcodes (2 rows):** smallest count but a wholly
   novel, self-contained opcode pair with no dependency on the other four.
5. **Own Tempo pre-emptive guard (5 rows):** lowest independent novelty —
   a refinement of Rank 2's territory — so it is staged last and ideally
   alongside Rank 2.

Dependency graph: Ranks 1 and 3 (item axis) are mutually independent of
Ranks 2, 4, and 5 (ability axis); within the ability axis, Rank 5 should
follow or accompany Rank 2 for shared staging context, while Rank 4 has no
dependency on anything else in this document.

## 4. Needs-own-scout bucket (recap)

Only the field-wide ability queries in §2 (Pressure/Magnet Pull/Cloud
Nine/Air Lock/Mud-Sport-Water-Sport-reader) are flagged as needing their
own scout before any future revision of this worklist folds them in. They
are **not** part of the 106/195 row count reconciled below.

## 5. Arithmetic accounting

```
Item axis:    Rank 1 (191) + Rank 3 (4)                                = 195  ✓ matches 195 item gaps
Ability axis: Rank 2 (99) + Rank 4 (2) + Rank 5 (5)                    = 106  ✓ matches 106 ability gaps
Total:        191 + 99 + 4 + 2 + 5                                     = 301  ✓ matches 106 + 195

Exclusions (§2): 0 rows subtracted from either axis — every excluded hook
site corresponds to zero of the 300 per-move rows (verified per-site above),
so no row is double-counted or dropped.
```

Reproduce the two axis totals directly against the committed manifest:

```sh
python3 -c "
import json
d = json.load(open('docs/gate6-coverage-manifest.json'))
pm = d['sections']['perMoveHookJoins']
for axis in ('item', 'ability'):
    rows = pm[axis]
    print(axis, 'unsupported:', len([r for r in rows if r['status'] == 'unsupported']))
"
```

Output at this commit: `item unsupported: 195` / `ability unsupported: 106`.
