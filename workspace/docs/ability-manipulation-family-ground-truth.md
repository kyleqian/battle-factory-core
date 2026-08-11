# Direct ability-manipulation opcode family — source ground truth (Rank 4)

Prep-lane evidence contract for `docs/gate6-family-worklist.md` Rank 4 (the
two moves whose entry scripts write `gBattleMons[].ability` directly instead
of going through `AbilityBattleEffects`: `MOVE_ROLE_PLAY` / `Cmd_trycopyability`
and `MOVE_SKILL_SWAP` / `Cmd_tryswapabilities`). This mirrors
`docs/item-manipulation-family-ground-truth.md`'s Rank-3 shape: re-derive both
opcodes' guard chains from source with exact citations, audit what oracle
evidence already exists before staging anything new, and bank the one
genuinely missing receipt. It does not touch the worklist, the coverage
manifest, or `level50-move-parameterization.json` — this is the prep half of
a prep→consume pair; the main-lane census/manifest wiring step consumes it.

## 0. Existing-evidence audit: does anything already witness `Cmd_tryswapabilities`?

**Yes — twice over, both pre-dating this worklist.** Both fixtures use the
Battle Scene OFF profile and both are already committed:

1. **`docs/skill-swap-off-evidence.md`** +
   `tools/battle-lab/mechanic-skill-swap-girafarig-shuckle-off.json`. This is
   a **pure, undecorated witness of the swap opcode itself**: Girafarig
   (`FRONTIER_MON_GIRAFARIG_1`, set 235) uses Skill Swap on Shuckle with no
   status staged beforehand. The doc's own receipt narrative states the
   active-battler abilities flip `39/5 → 5/39` at frame 150 while both
   persistent party records stay `39/5`, RNG unchanged — i.e. exactly
   `Cmd_tryswapabilities`'s "exchange the two active ability bytes, no
   `Random()` calls, no persistent-party write" behavior, with nothing else
   going on in the trace to attribute the change to.
2. **`tools/battle-lab/mechanic-immunity-limber-skill-swap-off.json`** (+
   `docs/immunity-abilities-ground-truth.md:112-127`,
   `tools/probe/probe-immunity-limber-off.py`, two seed receipts under
   `tools/probe/receipts/immunity-limber-off-seed-*.json`). This is the
   **swap-plus-downstream-cure** witness: paralysis is staged, Skill Swap
   copies Limber onto the paralyzed mon (`abilitySwapped` checkpoint:
   `activeAbility: {player: 7, opponent: 39}` while `persistentAbility` stays
   `{player: 39, opponent: 7}`), and only *then* does the paralysis-cure
   downstream logic fire (`statusCured` checkpoint, distinct frame). Read
   line-by-line, this receipt's own checkpoint ordering already isolates the
   swap moment from the cure moment — the swap is not merely inferred from
   the cure, it is its own asserted state transition with its own frame and
   its own persistent-vs-active-record distinction, before the cure checkpoint
   fires at all.

Between the two, the swap opcode itself (bare exchange, and exchange
immediately followed by a downstream consumer both proving the active/party
split) is already fully witnessed at receipt level. **This step does not
regenerate a Skill Swap fixture.** The only genuine gap in this family is
`Cmd_trycopyability` (Role Play), which has no prior receipt anywhere in the
repo (grepped: no `mechanic-*role-play*`, `mechanic-*rolePlay*`, or
`*trycopyability*` fixture/doc exists before this commit) — §3 stages exactly
that.

## 1. Two opcodes, two dispatch sites

Both moves are `MOVE_TARGET_SELECTED` status moves (power 0, accuracy 100,
PP 10, type Psychic) whose own entry script reaches a dedicated `Cmd_*`
handler that reads/writes `gBattleMons[].ability` directly, distinct from the
generic `AbilityBattleEffects` state machine. Re-verified against
`reference/pokeemerald/src/data/battle_moves.h`:

| Move | Effect | Entry script | Dispatch opcode |
| --- | --- | --- | --- |
| `MOVE_ROLE_PLAY` (`battle_moves.h:3539-3550`, `.flags = 0` — no Protect/Mirror-Move/Magic-Coat) | `EFFECT_ROLE_PLAY` (`battle_move_effects.h:182`, id 178) | `BattleScript_EffectRolePlay` (`data/battle_scripts_1.s:2346-2356`) | `trycopyability BattleScript_ButItFailed` → `Cmd_trycopyability` (`battle_script_commands.c:9276-9289`) |
| `MOVE_SKILL_SWAP` (`battle_moves.h:3708-3719`, `.flags = FLAG_PROTECT_AFFECTED \| FLAG_MIRROR_MOVE_AFFECTED`) | `EFFECT_SKILL_SWAP` (`battle_move_effects.h:195`, id 191) | `BattleScript_EffectSkillSwap` (`data/battle_scripts_1.s:2497-2507`) | `tryswapabilities BattleScript_ButItFailed` → `Cmd_tryswapabilities` (`battle_script_commands.c:9391-9410`) |

Both effect-table slots confirmed via `data/battle_scripts_1.s:199` (`.4byte
BattleScript_EffectRolePlay @ EFFECT_ROLE_PLAY`) and `:212` (`.4byte
BattleScript_EffectSkillSwap @ EFFECT_SKILL_SWAP`). The worklist's line-range
citations for both dispatch sites (`battle_scripts_1.s:2346-2356` /
`:2497-2507`, `battle_script_commands.c:9277` / `:9392`) are confirmed exact
(the `:9277`/`:9392` line numbers land one line inside each function body —
the function signatures open at `:9276`/`:9391` — a one-line rounding, not a
substantive error).

## 2. `Cmd_trycopyability` (Role Play) — full guard chain

`battle_script_commands.c:9276-9289`, reproduced in full:

```c
static void Cmd_trycopyability(void)
{
    if (gBattleMons[gBattlerTarget].ability != ABILITY_NONE
        && gBattleMons[gBattlerTarget].ability != ABILITY_WONDER_GUARD)
    {
        gBattleMons[gBattlerAttacker].ability = gBattleMons[gBattlerTarget].ability;
        gLastUsedAbility = gBattleMons[gBattlerTarget].ability;
        gBattlescriptCurrInstr += 5;
    }
    else
    {
        gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1);
    }
}
```

- **The only two failure conditions, exactly as the source states them**: the
  target's active ability is `ABILITY_NONE`, or the target's active ability is
  `ABILITY_WONDER_GUARD`. There is no Trainer Hill / battle-type exclusion, no
  Sticky-Hold-style "target ability blocks this" check, and no interaction
  with `gMoveResultFlags` at all — unlike every guard in the Rank-3
  item-manipulation family (§0 of that doc) and unlike Skill Swap's own guard
  below. Wonder Guard is the *only* ability the source calls out as
  categorically uncopyable; no other ability (Multitype, Truant, etc. — none
  of which exist in this Gen-3 source anyway) gets special-cased.
- **On success**: `gBattleMons[gBattlerAttacker].ability` is overwritten with
  the target's *current active* ability value (not looked up from species
  data), and `gLastUsedAbility` is set to the same value (message/AI-history
  plumbing — see `docs/own-tempo-guard-family-ground-truth.md` §0 for the
  general `gLastUsedAbility` role). **Only the attacker's active byte is
  written; the target is never touched.** This is asymmetric with Skill Swap
  (§3), which mutates both sides.
- **Persistence**: identical mechanism to Skill Swap — `Cmd_trycopyability`
  writes only the live `gBattleMons[].ability` mirror, never the persistent
  party record, and never emits a `BtlController_EmitSetMonData` sync (grepped
  the function body: zero controller-emit calls). `Cmd_switchindataupdate`
  re-derives the entering mon's ability from its species/ability-number party
  data on every switch-in, so a Role-Play-copied ability is lost the moment
  the attacker switches out — exactly Skill Swap's persistence story, restated
  here because the worklist's Rank-4 grouping treats both moves as one family
  and a wiring author should not have to re-derive it twice.
- **PP/message flow** (`BattleScript_EffectRolePlay`, `data/battle_scripts_1.s:2346-2356`):
  `attackcanceler → attackstring → ppreduce → accuracycheck
  BattleScript_ButItFailed, NO_ACC_CALC_CHECK_LOCK_ON → trycopyability
  BattleScript_ButItFailed → attackanimation → waitanimation → printstring
  STRINGID_PKMNCOPIEDFOE → ... → MoveEnd`. PP is spent (`ppreduce`) *before*
  `trycopyability` runs, exactly like Skill Swap — a blocked Role Play (Wonder
  Guard target) still costs the attacker one PP.
- **RNG**: `accuracycheck ..., NO_ACC_CALC_CHECK_LOCK_ON` takes
  `Cmd_accuracycheck`'s `NO_ACC_CALC_CHECK_LOCK_ON` branch
  (`battle_script_commands.c:1103-1111`), which — since the target here is
  never airborne/underground/underwater and the move is never itself
  Protect-affected (`.flags = 0`, confirmed above) — falls straight through
  `else if (!JumpIfMoveAffectedByProtect(0)) gBattlescriptCurrInstr += 7;`
  with **no `Random()` call at all**. `Cmd_trycopyability` itself also calls
  no `Random()`. **Role Play therefore consumes zero `Random()` calls in
  either the success or the Wonder-Guard-blocked arm** — an even stronger
  determinism claim than Rank 3's Recycle (which was zero-RNG only because
  its own guard has no roll; Role Play is zero-RNG *and* skips the generic
  accuracy roll other 100%-accuracy moves pay per
  `docs/item-move-end-family-ground-truth.md` §5's convention, because its
  `accuracycheck` call site opts into the `NO_ACC_CALC_CHECK_LOCK_ON` sentinel
  instead of `ACC_CURR_MOVE`).

## 3. `Cmd_tryswapabilities` (Skill Swap) — full guard chain (re-audited, not re-staged)

Re-derived directly from `battle_script_commands.c:9391-9410` for this
family's completeness (the receipt itself is §0's existing evidence, not
new):

```c
static void Cmd_tryswapabilities(void)
{
    if ((gBattleMons[gBattlerAttacker].ability == ABILITY_NONE
        && gBattleMons[gBattlerTarget].ability == ABILITY_NONE)
     || gBattleMons[gBattlerAttacker].ability == ABILITY_WONDER_GUARD
     || gBattleMons[gBattlerTarget].ability == ABILITY_WONDER_GUARD
     || gMoveResultFlags & MOVE_RESULT_NO_EFFECT)
     {
         gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1);
     }
    else
    {
        u8 abilityAtk = gBattleMons[gBattlerAttacker].ability;
        gBattleMons[gBattlerAttacker].ability = gBattleMons[gBattlerTarget].ability;
        gBattleMons[gBattlerTarget].ability = abilityAtk;
        gBattlescriptCurrInstr += 5;
    }
}
```

- **Failure conditions, exactly as stated**: *both* sides' active ability is
  `ABILITY_NONE` (note: unlike Role Play, a single `ABILITY_NONE` paired with
  a real ability is a legal swap — only the *both-none* case fails on that
  branch), *either* side's active ability is `ABILITY_WONDER_GUARD`
  (symmetric — unlike Role Play, where only the target's Wonder Guard
  matters, here the attacker's own Wonder Guard also blocks the swap), or
  `gMoveResultFlags & MOVE_RESULT_NO_EFFECT` is already set from an earlier
  script step (e.g. a type-immunity/protect flag raised upstream of this
  opcode in some other call path — dead in `BattleScript_EffectSkillSwap`'s
  own straight-line script since nothing upstream of `tryswapabilities` in
  that script sets `MOVE_RESULT_NO_EFFECT`, but the opcode itself doesn't
  know which script called it). Confirms and slightly sharpens
  `docs/skill-swap-off-evidence.md:5`'s summary (that doc collapses the two
  Wonder Guard checks into "either active ability is Wonder Guard," which is
  correct; this doc additionally notes the asymmetry with Role Play's
  target-only Wonder Guard check, which the worklist did not call out).
- **On success**: exchanges *both* active ability bytes (`gBattleMons[gBattlerAttacker].ability`
  ↔ `gBattleMons[gBattlerTarget].ability`) via a local temporary — no
  `gLastUsedAbility` write (confirmed absent from the function body), unlike
  Role Play. Persistence: identical to §2 — active-mirror-only, no controller
  emit, lost on the swapped battler's next switch-in via
  `Cmd_switchindataupdate`.
- **RNG**: zero `Random()` calls inside the opcode itself (no roll of any
  kind), matching `docs/skill-swap-off-evidence.md:5`. Unlike Role Play,
  Skill Swap's own `accuracycheck` uses `ACC_CURR_MOVE` (a real accuracy
  roll, `BattleScript_EffectSkillSwap`, `data/battle_scripts_1.s:2497-2507`)
  — so Skill Swap is not zero-RNG end-to-end the way Role Play is; only the
  swap opcode itself never rolls.

## 4. Representative receipt — `MOVE_ROLE_PLAY` one-turn copy vs. Wonder-Guard-blocked control

**Carrier verification** (re-checked directly against
`docs/gate6-coverage-manifest.json#sections.corpus.level50Sets` and
`src/data/gen/species-stats.json`):

- Set 169 = `FRONTIER_MON_KADABRA_1`, species `SPECIES_KADABRA`, moves
  `['MOVE_CONFUSION', 'MOVE_ROLE_PLAY', 'MOVE_FUTURE_SIGHT', 'MOVE_DISABLE']`
  — confirmed, `MOVE_ROLE_PLAY` present. Kadabra is **not** single-ability
  (`["ABILITY_SYNCHRONIZE", "ABILITY_INNER_FOCUS"]`), but its own ability is
  irrelevant to this test (only the *target's* ability matters to
  `Cmd_trycopyability`), so this does not affect the receipt design; the
  fixture pins `abilitySlot: 0` (Synchronize) for determinism. Base speed 105.
- Set 54 = `FRONTIER_MON_DITTO`, species `SPECIES_DITTO`, item
  `BATTLE_FRONTIER_ITEM_METAL_POWDER` — confirmed, matches the worklist's
  "Ditto/Limber" suggestion. **Single-ability**
  (`species-stats.json`: `["ABILITY_LIMBER", "ABILITY_NONE"]`) — confirmed.
  Base speed 48.
- The worklist's suggested control ("copying a barred ability if one is
  legally stageable") **is legally stageable**: `SPECIES_SHEDINJA`
  (dex 303) is **single-ability** Wonder Guard
  (`species-stats.json`: `["ABILITY_WONDER_GUARD", "ABILITY_NONE"]`), so
  `overrides.parties` can legally build a Shedinja defender with
  `abilitySlot: 0`. This is a real §2 failure condition (target ability ==
  `ABILITY_WONDER_GUARD`), not a synthetic no-Role-Play control — the
  strongest control this family supports, and the one the brief asked for by
  preference.

**Selected pair:** attacker `SPECIES_KADABRA` (id 64), `MOVE_ROLE_PLAY` (id
272) in all four slots, max speed EVs (base 105 already exceeds both
defenders' base speed — 48 and 40 respectively — even at 0 EV/neutral
nature; the max-speed-EV build only widens the margin, matching Rank 3's
"attacker gets max speed EV, defender gets zero" convention). Defender
`MOVE_SPLASH` (id 150, zero-effect/zero-RNG filler, `battle_moves.h:1953-1964`)
in all four slots, zero speed EVs, so the opponent's forced move never
complicates the read.

**Two fixtures, identical except the opponent lead's species/ability**:

- `tools/battle-lab/mechanic-ability-manipulation-roleplay-copy-off.json` —
  opponent lead `SPECIES_DITTO` (id 132), `abilitySlot: 0` (Limber, id 7) —
  copy succeeds.
- `tools/battle-lab/mechanic-ability-manipulation-roleplay-control-off.json`
  — opponent lead `SPECIES_SHEDINJA` (id 303), `abilitySlot: 0` (Wonder
  Guard, id 25) — `Cmd_trycopyability`'s Wonder Guard guard blocks the copy.

**Verified via**
`tools/probe/verify-ability-manipulation-roleplay-off.py` (source/fixture
static check plus a live Battle Scene OFF check, one `EmeraldOracle` core per
subprocess per fixture, mirroring
`verify-item-manipulation-covet-off.py`/`verify-item-move-end-paralysis-off.py`'s
convention). Run twice independently; both receipts reproduced
**byte-identically** — see the run's final report for the exact command
transcript.

**Asserted shape** (both arms): attacker's active `ability` field starts at
`28` (Synchronize); in the copy arm it becomes `7` (Limber) at the frame
`trycopyability` resolves, while the defender's own active ability stays `7`
throughout (only the attacker's byte is written, per §2) and both parties'
*persistent* record abilities are untouched. In the control arm the
attacker's active ability never changes from `28`, and the displayed battle
text differs (`STRINGID_PKMNCOPIEDFOE` on success vs.
`BattleScript_ButItFailed`'s generic "But it failed!" on the control).
**`gLastUsedAbility` is not a reliable signal for the control arm**: this
receipt's own live check found the control run's final `gLastUsedAbility`
reads `25` (Wonder Guard) — not because `Cmd_trycopyability` wrote it (its
blocked branch never touches the global, §2), but because
`AbilityBattleEffects` unconditionally sets `gLastUsedAbility =
gBattleMons[battler].ability` at the top of *every* call
(`battle_util.c:2471-2473`), including the routine `ABILITYEFFECT_ON_SWITCHIN`/
`ABILITYEFFECT_ENDTURN` bookkeeping every battler receives every turn
regardless of which move was used — so Shedinja's own end-of-turn ability
check alone overwrites the global to its own ability. This is a real,
receipt-confirmed correction to this doc's own first draft (which had assumed
`gLastUsedAbility` was copy-exclusive); the attacker's active-ability field is
the only signal this family's opcodes themselves control. Both
arms decrement Kadabra's Role Play PP by exactly 1 (`10 → 9`) and consume
**zero** `Random()` calls attributable to Role Play itself (per §2's RNG
analysis) — any nonzero total in the receipt's ledger is attributable solely
to the Factory AI's equal-slot move selection on the opponent's forced
`MOVE_SPLASH` × 4, the same "AI still rolls once even with one legal choice"
shape documented in `docs/skill-swap-off-evidence.md`'s sibling receipts.

## 5. Not covered by this step

- Skill Swap has no new receipt (§0 — already witnessed twice).
- A follow-up-turn demonstration that a Role-Play-copied ability actually
  *behaves* like the copied ability (e.g. curing a status the way
  `docs/immunity-abilities-ground-truth.md` does for the Skill-Swap case) is
  out of scope — the brief only requires proving the copy itself, matching
  the worklist's own scope note (`docs/gate6-family-worklist.md:224-226`).
