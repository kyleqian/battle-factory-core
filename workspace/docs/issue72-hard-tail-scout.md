# ISSUES #72 hard-tail scout: the REACHABLE-10 falsification dossier

Docs-only scout for the four hardest-remaining ids in ISSUES #72's REACHABLE(10)
list, following the established scout→batch pipeline (`docs/issue72-
reachability-triage.md`'s per-id method). No `src/`/`tests/` changes here —
every prediction below is stated sharply enough for a later bounded worker to
red-verify (`git stash`) and land mechanically. All line citations are against
this worktree's current HEAD unless marked otherwise.

**Read first:** `ISSUES.md` #72 (the REACHABLE(10) list and every
skipped-with-reason note), `docs/issue72-reachability-triage.md` (the per-id
method/evidence format), `tests/presentationStringIssue72Batch2.test.ts` (the
Taunt-pair idiom + Intimidate-loop `targetBattler` shape),
`tests/battleScriptEnd3SwitchinResumption.test.ts` (the end3 push/pop
resumption shape, PROGRESS 910).

---

## 1. `STRINGID_PKMNTOOKFOE` (Destiny Bond) + `STRINGID_PKMNLOSTPPGRUDGE` (Grudge)

### 1a. Every reachable `tryfaintmon` call site (mode-FALSE, non-spikes)

`Cmd_tryfaintmon` (`battle_script_commands.c:2965-3050`, ported at
`battleScriptHitChainOpcode.ts:4220-4351`) is invoked from **30 non-spikes
call sites** in the committed program corpus (grepped directly against
`src/data/gen/battle-script-program.json` for `mnemonic === "tryfaintmon"`,
excluding the separate `tryfaintmon_spikes` mnemonic). Citing every one,
label:line:operand:

**`BS_ATTACKER` operand (16 sites — attacker role dies):**
`BattleScript_AbsorbTryFainting:358`, `BattleScript_ExplosionLoop:407`,
`BattleScript_ExplosionMissed:415`, `BattleScript_MoveMissedDoDamage:870`,
`BattleScript_DoGhostCurse:1529`, `BattleScript_EffectMementoTryFaint:2232`,
`BattleScript_MementoTargetProtectEnd:2249`,
`BattleScript_DamagingWeatherLoop:3216`,
`BattleScript_LeechSeedTurnPrintAndUpdateHp:3283`,
`BattleScript_DestinyBondTakesLife:3385` (the nested recursive call, see 1c),
`BattleScript_SpikesOnAttacker:3393`, `BattleScript_PerishSongTakesLife:3444`,
`BattleScript_DoTurnDmg:3745`, `BattleScript_DoSelfConfusionDmg:3814`,
`BattleScript_DoRecoil:3947`, `BattleScript_RoughSkinActivates:4190`.

**`BS_TARGET`/`BS_FAINTED` operand (14 sites — target role dies):**
`BattleScript_HitFromAtkAnimation:266`, `BattleScript_AbsorbTryFainting:359`,
`BattleScript_ExplosionLoop:404`, `BattleScript_DreamEaterTryFaintEnd:461`,
`BattleScript_MultiHitEnd:652`, `BattleScript_TripleKickEnd:1436`,
`BattleScript_DoHitAllWithUndergroundBonus:1867`,
`BattleScript_BeatUpAttack:1967` (DEAD — `MOVE_BEAT_UP` 0/882 carriers, per
triage doc `STRINGID_PKMNATTACK` row), `BattleScript_BrickBreakDoHit:2448`,
`BattleScript_PursuitDmgOnSwitchOut:3142`,
`BattleScript_LeechSeedTurnPrintAndUpdateHp:3284`, `BattleScript_BideAttack:3313`,
`BattleScript_SpikesOnTarget:3408`, `BattleScript_SpikesOnFaintedBattler:3423`
(`BS_FAINTED`), `BattleScript_DoFutureAttackHit:3531`.

Role mapping is mechanical and uniform across all 30 (`battleScriptHitChainOpcode.ts:4267-4271`):
`isAttackerOperand = operands[0].expression === "BS_ATTACKER"`; if true the
**attacker role's own battler** is who just fainted (`activeBattler =
requireBattlerRole(rulesContext, "attacker")`); otherwise the **target role's
own battler** fainted. This literal-string comparison matches source exactly
(`battle_script_commands.c:2987-2996`: `if (gBattlescriptCurrInstr[1] ==
BS_ATTACKER) gActiveBattler = gBattlerAttacker; else gActiveBattler =
gBattlerTarget;` — any non-`BS_ATTACKER` spelling, including `BS_FAINTED`,
takes the target-role branch, already noted in this file's own doc comment at
`:4210-4213`).

### 1b. The general proof: Destiny Bond/Grudge can ONLY fire when the TARGET role dies

This resolves ISSUES #72's "dual-operand role investigation" into one clean
proof, not a 30-way case analysis — **both branches require the ATTACKER
role's battler to still be alive**, which is mechanically impossible on any
`BS_ATTACKER`-operand call site (there, the attacker role's battler IS the one
that just fainted).

**Destiny Bond** (`battleScriptHitChainOpcode.ts:4295`, mirrors
`battle_script_commands.c:8285-8294`'s condition inlined at
`Cmd_tryfaintmon:3040-3042`):
```
(hitMarker & HITMARKER_DESTINYBOND) !== 0 && attackerBattler.hp !== 0
```
where `attackerBattler = rulesContext.battlers[requireBattlerRole(rulesContext, "attacker")]`
(`:4286`). If `isAttackerOperand` is true, `attackerBattler` **is**
`activeBattlerState` (the just-fainted battler, `hp === 0` by construction at
`:4275`) — so `attackerBattler.hp !== 0` is false and the branch can never
fire. Only `isAttackerOperand === false` (target role dies) leaves
`attackerBattler` as a distinct, still-alive battler.

**Grudge** (`:4289-4293`, mirrors `battle_script_commands.c:3016-3022`):
```
(targetBattler.status3 & STATUS3_GRUDGE) !== 0
  && (hitMarker & HITMARKER_GRUDGE) === 0
  && attackerBattler.side !== targetBattler.side
  && attackerBattler.hp !== 0
  && rulesContext.currentMove !== BATTLE_SCRIPT_MOVE_STRUGGLE
```
Same `attackerBattler.hp !== 0` clause, same impossibility when
`isAttackerOperand` is true. Additionally `targetBattler = rulesContext.battlers[requireBattlerRole(rulesContext, "target")]`
(`:4287`) — when `isAttackerOperand` is false, `targetBattler` **is**
`activeBattlerState` (the fainting battler), so this reads "did the battler
that's about to die hold Grudge on itself" — exactly the flavor text (Grudge
punishes whoever KO'd its caster).

**Conclusion for both ids:** among the 30 call sites, only the 14
`BS_TARGET`/`BS_FAINTED` sites can ever reach `BattleScript_DestinyBondTakesLife`
or `BattleScript_GrudgeTakesPP`. The practically-reachable, simplest carrier
is `BattleScript_HitFromAtkAnimation:266` (`tryfaintmon BS_TARGET`) — the
ordinary damaging-hit resolution script every plain move uses. ISSUES #72's
own note ("the single-hit case this batch traced through resolves to the
plain attacker/defender idiom") is **confirmed as the general case**, not a
special case — Destiny Bond/Grudge structurally cannot use any other role
mapping.

### 1c. Message resolution — exact predicted substitutions

Neither `Cmd_tryfaintmon` nor its `call-stack` transition into
`BattleScript_DestinyBondTakesLife`/`BattleScript_GrudgeTakesPP` reassigns
`selectorRoles.attacker`/`.target` (`battleScriptHitChainOpcode.ts:4295-4340`
only touches `hitMarker`/`battleMoveDamage`/pp/party/`battleTextBuff1Move`) —
both prints run with the SAME attacker/target roles as the hit that triggered
them, i.e. the plain `requireMoveAttacker`/`requireMoveDefender` idiom
(`battleResolutionPresentation.ts:465-477`) already resolves them correctly,
confirmed against `lastMoveAttacker`'s own tracking
(`battleResolutionPresentation.ts:2311-2315`: re-derived from
`payload.actionSnapshot.attacker` on every message event, unaffected by the
nested call-stack push since `actionSnapshot` freezes at the ORIGINAL hit).

**`STRINGID_PKMNTOOKFOE`** (`BattleScript_DestinyBondTakesLife`, program line
3379-3386; template `battle_message.c:194`: `{B_DEF_NAME_WITH_PREFIX} took\n{B_ATK_NAME_WITH_PREFIX} with it!`):
```ts
if (messageId === "STRINGID_PKMNTOOKFOE") {
  const attacker = requireMoveAttacker(lastMoveAttacker, "took-foe message");
  const defender = requireMoveDefender(lastMoveAttacker, "took-foe message");
  return resolveBattleStringLines(messageId, {
    B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
  });
}
```
No `substitutions` array entry needed (template has no `{B_BUFF*}` token) —
the ternary in `factoryBattleScriptFullTurnDecision.ts`'s `Cmd_printstring`
handler (~line 1171's default `[]` fallthrough) already covers it with no new
case.

**`STRINGID_PKMNLOSTPPGRUDGE`** (`BattleScript_GrudgeTakesPP`, program line
3662-3665; template `battle_message.c:242`: `{B_ATK_NAME_WITH_PREFIX}'s {B_BUFF1} lost\nall its PP due to the GRUDGE!`).
`battleTextBuff1Move` is already captured at the Grudge-scheduling site
(`battleScriptHitChainOpcode.ts:4375`, `scheduleGrudge`'s
`battleTextBuff1Move: attackerState.moves[movePosition]`), matching the
already-landed `STRINGID_PKMNSITEMRESTOREDPP` single-move-name idiom
(`battleResolutionPresentation.ts:2131-2149`). Needs ONE new ternary case in
`factoryBattleScriptFullTurnDecision.ts`'s printstring substitutions chain
(same shape as its existing `STRINGID_PKMNSITEMRESTOREDPP` case at ~line
1160-1161):
```ts
: operand.expression === "STRINGID_PKMNLOSTPPGRUDGE"
  ? (rules.battleTextBuff1Move === null ? [] : [resolveMoveName(rules.battleTextBuff1Move)])
  : [];
```
and in `battleResolutionPresentation.ts`:
```ts
if (messageId === "STRINGID_PKMNLOSTPPGRUDGE") {
  if (event.payload.substitutions.length === 0) {
    throw new Error(`battle resolution ${messageId} message has no move substitution`);
  }
  const attacker = requireMoveAttacker(lastMoveAttacker, "lost-pp-grudge message");
  const moveName = event.payload.substitutions[0]!;
  return resolveBattleStringLines(messageId, {
    B_ATK_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
    B_BUFF1: () => moveName,
  });
}
```

### 1d. Staging: the critical ordering gotcha

Both `STATUS2_DESTINY_BOND` (`battleScriptSetdestinybondOpcode.ts`) and
`STATUS3_GRUDGE` are cleared off the CASTER at the start of **the caster's
own next action-admission** (`battleScriptActionAdmission.ts:1232-1257`,
`CANCELER_FLAGS` phase — mirrors source's `ClearFuryCutterDestinyBondGrudge(gBattlerAttacker)`,
called from two sites, `battle_util.c:317,518`). This means: **the caster
must be SLOWER than the attacker on the fainting turn**, so the attacker's
killing hit resolves (and reads the still-set status bit) before the caster's
own turn-2 action-admission would have cleared it. Getting the speed order
backwards is the single most likely way a batch worker's first attempt at
this repro silently fails (Destiny Bond/Grudge just won't trigger, no error
thrown — the hit resolves as an ordinary KO).

**Destiny Bond staging** (2 turns): real L50 carrier
`FRONTIER_MON_WOBBUFFET_2` (idx 290, moves `COUNTER/MIRROR_COAT/ENCORE/DESTINY_BOND`
— all real, ≥110 and ≤849, within the `[267,371]` per-challenge L50 band).
Turn 1: trainer (Wobbuffet_2, slower) casts `DESTINY_BOND` (slot 3). Turn 2:
player (faster, any species/moveset with a guaranteed-lethal hit against the
trainer's remaining HP) attacks and kills the trainer. Expected: `hitMarker &
HITMARKER_DESTINYBOND` set from turn 2's own `advancePastAccuracyCheck`
(`battleScriptHitChainOpcode.ts:867`, since trainer's `status2 &
STATUS2_DESTINY_BOND` is still set), `tryfaintmon BS_TARGET` fires the
counter-kill, both battlers end at 0 HP (a genuine double-faint — the trainer
has no other bench member needed since the test only needs the message event,
not to continue past the resulting terminal boundary). Predicted messageIds
include `STRINGID_PKMNTOOKFOE`; predicted lines `[`Foe ${field.opponent.name} took`, `${field.player.name} with it!`]`
(exact prefix/line-break TBD by `resolveBattleStringLines`'s real template
wrap — verify against the literal template string above).

**Grudge staging** (2 turns): real L50 carrier `FRONTIER_MON_HAUNTER_1` (idx
179, moves `SHADOW_PUNCH/CONFUSE_RAY/SPITE/GRUDGE`, within `[110,199]`).
`FRONTIER_MON_NINETALES_2` (idx 526, `[468,563]`) is the second real carrier.
Note `FRONTIER_MON_SHEDINJA` (idx 21) and `FRONTIER_MON_SHUPPET` (idx 62) also
carry Grudge in the raw 882-catalog but are **below `FRONTIER_MON_GRIMER` =
110**, the universal L50 draft floor (`battle_factory.c:169-179`,
`sInitialRentalMonRanges`'s L50 rows union to `[110,849]` — verified directly
by reading the full 8-row table) — both are DEAD for L50 exactly like
`STRINGID_PKMNCANTUSEMOVESEALED`'s already-settled Imprison/Ralts case. This
matches the triage doc's cited "2/850" EFFECT_GRUDGE weight exactly (2 real
carriers, not 4). Turn 1: trainer (Haunter, slower) casts `GRUDGE` (slot 3).
Turn 2: player (faster) lands a lethal hit. Expected: `battleTextBuff1Move`
captures whichever move the trainer had chosen for turn 2 (its PP zeroes to 0
— pick a move that isn't Struggle, e.g. re-selecting `GRUDGE` itself or
`SHADOW_PUNCH`). Predicted messageIds include `STRINGID_PKMNLOSTPPGRUDGE`;
predicted `B_BUFF1` = the trainer's chosen turn-2 move name, `B_ATK_NAME_WITH_PREFIX`
= `Foe ${field.opponent.name}`.

---

## 2. `STRINGID_PKMNSXBLOCKSY2` (Perish Song vs. Soundproof)

### 2a. The emitting loop's own program

`BattleScript_EffectPerishSong` (program line 1567-1576) →
`BattleScript_PerishSongLoop` (1577-1578) → `BattleScript_PerishSongLoopIncrement`
(1579-1582) → `BattleScript_PerishSongNotAffected` (1584-1587), full statements:
```
BattleScript_EffectPerishSong:
  ...
  trysetperishsong BattleScript_ButItFailed
  ...
  printstring STRINGID_FAINTINTHREE
  waitmessage B_WAIT_TIME_LONG
  setbyte sBATTLER, 0
BattleScript_PerishSongLoop:
  jumpifability BS_SCRIPTING, ABILITY_SOUNDPROOF, BattleScript_PerishSongNotAffected
BattleScript_PerishSongLoopIncrement:
  addbyte sBATTLER, 1
  jumpifbytenotequal sBATTLER, gBattlersCount, BattleScript_PerishSongLoop
  goto BattleScript_MoveEnd
BattleScript_PerishSongNotAffected:
  printstring STRINGID_PKMNSXBLOCKSY2
  waitmessage B_WAIT_TIME_LONG
  goto BattleScript_PerishSongLoopIncrement
```
This runs **immediately on cast** (part of `EffectPerishSong`'s own
move-effect script), NOT at end-of-turn like the countdown tick
(`STRINGID_PKMNPERISHCOUNTFELL`, already landed in batch 6 via
`battleEndTurnOrchestration.ts:2037-2084` — a separate, later mechanism). A
single turn suffices to stage this id.

`gBattlersCount = 2` always in this engine's singles-only scope
(`battleTopology.battlersCount`), so the loop checks battler 0 then battler 1
— every reachable battler, including the Perish Song caster itself (a real
Gen3 quirk: Perish Song bypasses the normal attack-canceler Soundproof block
entirely and instead self-checks each battler individually inside its own
script).

### 2b. `sBATTLER`/`BS_SCRIPTING` — no new payload field needed

`setbyte sBATTLER, 0` / `addbyte sBATTLER, 1` are already generically ported
through the shared byte-variable opcode file
(`battleScriptSetByte.ts:267,304`: `case "sBATTLER": return
rules.scriptingBattler` / `... Object.freeze({ ...rules, scriptingBattler:
value })`), and `BS_SCRIPTING` resolves through the identical
`rules.scriptingBattler` field (`battleScriptRulesContext.ts:2829-2831`).
`scriptingBattler` is **already threaded onto every message event payload**
(confirmed directly: `tests/battleScriptEnd3SwitchinResumption.test.ts:104`
reads `sandstormMessage.payload.scriptingBattler` off a plain message event).
**Answering ISSUES #72's own open question: no new payload field is
required** — this is the exact same field `STRINGID_PKMNCUTSATTACKWITH`/
`STRINGID_PKMNRAISEDSPEED`/`STRINGID_PKMNSXPREVENTSYLOSS` already consume.

### 2c. Message resolution

Template (`battle_message.c:282`): `{B_SCR_ACTIVE_NAME_WITH_PREFIX}'s
{B_SCR_ACTIVE_ABILITY}\nblocks {B_CURRENT_MOVE}!`. Follows the established
`STRINGID_PKMNSXPREVENTSYLOSS` shape (`battleResolutionPresentation.ts:959-974`)
exactly, plus `B_CURRENT_MOVE` off `actionSnapshot` (same idiom
`STRINGID_PKMNSXBLOCKSY`'s sibling already uses at `:1092`). New
`factoryBattleScriptFullTurnDecision.ts` substitutions-ternary case (same
shape as the existing `STRINGID_PKMNCUTSATTACKWITH`/`STRINGID_PKMNRAISEDSPEED`
case at ~line 1064-1066):
```ts
: operand.expression === "STRINGID_PKMNSXBLOCKSY2"
  ? [abilityDisplayName(rules.battlers[rules.scriptingBattler].ability)]
  : [];
```
and in `battleResolutionPresentation.ts`:
```ts
if (messageId === "STRINGID_PKMNSXBLOCKSY2") {
  if (event.payload.scriptingBattler === undefined || event.payload.substitutions.length === 0 || actionSnapshot === null) {
    throw new Error(`battle resolution ${messageId} message has no scripting-battler/ability/action-snapshot`);
  }
  const battler = singlesBattler(event.payload.scriptingBattler, `${messageId} scripting battler`);
  const ability = event.payload.substitutions[0]!;
  return resolveBattleStringLines(messageId, {
    B_SCR_ACTIVE_NAME_WITH_PREFIX: nameWithPrefixResolver(field, battler),
    B_SCR_ACTIVE_ABILITY: () => ability,
    B_CURRENT_MOVE: () => resolveMoveName(actionSnapshot.currentMove),
  });
}
```
`"SOUNDPROOF"` is already in the ability-display-name lookup table
(`factoryBattleScriptFullTurnDecision.ts:226`) — no new entry needed.

### 2d. Staging (single turn, real carriers)

Perish Song carriers in L50 (raw-index-range-verified, all real): `FRONTIER_MON_MURKROW_2`
(idx 289), `FRONTIER_MON_JYNX_2` (475), `FRONTIER_MON_ALTARIA_2` (508),
`FRONTIER_MON_MISDREAVUS_3` (566) — matches batch 6's own precedent, which
already staged Perish Song via `SPECIES_WOBBUFFET`+`moveId 195` for the
sibling countdown id (`tests/presentationStringIssue72Batch6.test.ts:191-203`),
same `AT(0)` single-turn shape works here too.

Soundproof carriers, confirmed via `species-stats.json`'s `abilities[0]` join
(so `abilityNum: 0` is correct) AND cross-checked against L50 rental range
`[110,849]`: `FRONTIER_MON_LOUDRED` (idx 144, `[110,199]`), `FRONTIER_MON_ELECTRODE_1/2/3/4`
(396/492/588/684), `FRONTIER_MON_MR_MIME_1/2/3/4` (380/478/572/668),
`FRONTIER_MON_EXPLOUD_1/2/3/4` (397/493/589/685). `FRONTIER_MON_WHISMUR` (idx
23) is DEAD for L50 (below the 110 floor) — the brief's "Whismur line/Exploud"
hunch is right for Loudred/Exploud specifically, wrong for base-stage Whismur.

Recommended staging: `player: statusedTargetConfig({ ability: 43 /* ABILITY_SOUNDPROOF */ })`
(reusing batch2's helper shape, species doesn't need to be Loudred literally
for a Tier-1 fixture — but cite a real carrier's `abilityNum`/species in the
test comment per convention), `trainer: ATTACKER(195 /* MOVE_PERISH_SONG */)`,
single turn, `runFullTurn(config, AT(0), AT(1))`. Predicted messageIds include
`STRINGID_PKMNSXBLOCKSY2` with `scriptingBattler === 0`. Predicted lines
`[`${field.player.name}’s SOUNDPROOF`, "blocks PERISH SONG!"]`.

---

## 3. `STRINGID_PKMNREGAINEDHEALTH` — the 3-label split

Template (`battle_message.c:124`): `{B_DEF_NAME_WITH_PREFIX} regained\nhealth!`
— single placeholder, but **the correct battler differs per emitting label**,
confirmed by reading each label's own printstring context plus one
lower-visibility 4th entry point that shares a label with the others:

### 3a. `BattleScript_EffectRestoreHp` (program 672-684) — self-heal, deterministic

`tryhealhalfhealth BattleScript_AlreadyAtFullHp, BS_ATTACKER` (program line
676) → `battleScriptTryhealhalfhealthOpcode.ts:44-47`: the `BS_ATTACKER`
operand branch **explicitly reassigns** `selectorRoles.target = attacker`
("source unconditionally reassigns `gBattlerTarget = gBattlerAttacker` on
this branch," per the file's own header comment, lines 6-8). So
`{B_DEF_NAME_WITH_PREFIX}` = the attacker's own name. Carriers: `MOVE_RECOVER`
(id 105, 22 real L50 carriers, e.g. `FRONTIER_MON_SABLEYE_2` idx 268),
`MOVE_SLACK_OFF` (id 303, EFFECT_RESTORE_HP too, but **0 L50 carriers** —
Slaking-exclusive, dead weight). **This is the brief's "easy one" and the
recommended primary staging** — fully deterministic, single turn, real
carrier, no compound gate.

### 3b. `BattleScript_PresentHealTarget` (program 2032-2040) — TWO distinct sub-paths sharing one label

Reached from **two structurally different places**, which the label alone
does not distinguish:

- **Present's own RNG heal branch** (EFFECT_PRESENT, `MOVE_TARGET_SELECTED` —
  a genuinely opposing battler, target role never reassigned,
  `battleScriptPresentDamageOpcode.ts:45` reads `requireBattlerRole(rules,
  "target")` directly). `{B_DEF_NAME_WITH_PREFIX}` = the ordinary opposing
  battler — the plain `requireMoveDefender` idiom. Real carrier:
  `FRONTIER_MON_DELIBIRD` (idx 118, in `[110,199]`) — **1 real L50 carrier**,
  reachable but genuinely RNG-gated (see 3d).
- **The self-heal fallthrough family**: `BattleScript_EffectSoftboiled`
  (2027-2031, `tryhealhalfhealth ..., BS_TARGET` — no reassignment, but relies
  on `target === attacker` already being true from this move's
  `MOVE_TARGET_USER` decision-time construction,
  `factoryBattleScriptFullTurnDecision.ts:1669`) falls through by simple
  adjacency (no `goto`/label between 2031 and 2032, same "unlabeled
  fallthrough" shape already established for `IntimidateActivatesLoop`).
  `BattleScript_EffectRest` (735-747), `BattleScript_EffectMoonlight`
  (1733-1738, also covers the aliased empty `EffectMorningSun`/`EffectSynthesis`
  labels at 1731-1732), and `BattleScript_EffectSwallow` (2119-2124) all
  explicitly `goto BattleScript_PresentHealTarget` — all four are
  `MOVE_TARGET_USER` too, same self-heal shape. `{B_DEF_NAME_WITH_PREFIX}` =
  the attacker's own name here, same formula as 3a.

  Real L50 carriers: `MOVE_REST` (49, e.g. `FRONTIER_MON_TEDDIURSA`),
  `MOVE_SYNTHESIS` (13), `MOVE_SOFT_BOILED` (5, e.g.
  `FRONTIER_MON_CHANSEY_2`), `MOVE_MOONLIGHT` (3), `MOVE_MILK_DRINK` (2),
  `MOVE_SWALLOW` (2). `MOVE_MORNING_SUN` has **0** L50 carriers (dead move,
  live label via the Moonlight alias).

**Disambiguator** (needed because the shared label alone is ambiguous):
`actionSnapshot.currentMove === MOVE_PRESENT (217)` picks the opposing-target
branch; anything else reaching this label is the self-heal family (all 6
non-Present carriers funnel to the identical `requireMoveAttacker` formula, so
no per-move branching is needed beyond the Present check). This does NOT
require `sourceLabelOf(event)` to distinguish Present from the self-heal
family — `actionSnapshot.currentMove` alone suffices for this specific
disambiguation, since Present is the sole `MOVE_TARGET_SELECTED` move reaching
`PresentHealTarget`.

### 3c. `BattleScript_WishComesTrue` (program 3589-3599) — end-of-turn tick, frozen-at-cast battler

Wired at end-of-turn (`WISH_COMES_TRUE_LABEL`, `battleEndTurnOrchestration.ts:1945-1949`):
`selectorRoles.target` is explicitly reassigned to the wish-holding battler
POSITION before the tick script runs (`:1945-1948`), and the SAME
tick-scoped `actionSnapshot` — not `lastMoveAttacker` — already carries this
correctly for the FIRST printstring in this label
(`STRINGID_PKMNWISHCAMETRUE`, landed in batch 6,
`battleResolutionPresentation.ts:1943-1956`, reading
`actionSnapshot.attacker`). The SECOND printstring in the same label/script
run (`STRINGID_PKMNREGAINEDHEALTH` at program line 3597) shares the identical
unchanged `actionSnapshot` — same formula applies unmodified.

**This requires `sourceLabelOf(event)` as the primary disambiguator** — real
plumbing exists (`event.provenance.sourceLabel`,
`battleResolutionPresentation.ts:555-561`) but has **never actually been
branched on before** (only called for its throw-if-absent side effect, at
lines 565 and 2305 currently). Using its return value to `if/else` on the
emitting label is a genuinely new consumption pattern for this file, though
zero new capture fields are needed — flagging precisely per the brief's
"name new plumbing precisely" instruction.

### 3d. Predicted `messageLines` code

```ts
const MOVE_PRESENT = 217;

if (messageId === "STRINGID_PKMNREGAINEDHEALTH") {
  if (actionSnapshot === null) {
    throw new Error(`battle resolution ${messageId} message has no action snapshot`);
  }
  const label = sourceLabelOf(event);
  if (label === "BattleScript_WishComesTrue") {
    const battler = singlesBattler(actionSnapshot.attacker, `${messageId} action snapshot`);
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, battler),
    });
  }
  if (label === "BattleScript_PresentHealTarget" && actionSnapshot.currentMove === MOVE_PRESENT) {
    const defender = requireMoveDefender(lastMoveAttacker, "regained-health message (Present)");
    return resolveBattleStringLines(messageId, {
      B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, defender),
    });
  }
  // BattleScript_EffectRestoreHp, or PresentHealTarget reached via the
  // self-heal family (Rest/Moonlight/Synthesis/Swallow/Softboiled/MilkDrink).
  const attacker = requireMoveAttacker(lastMoveAttacker, "regained-health message (self-heal)");
  return resolveBattleStringLines(messageId, {
    B_DEF_NAME_WITH_PREFIX: nameWithPrefixResolver(field, attacker),
  });
}
```

### 3e. Recommended landing plan

Primary red-verified staging: **Recover** (`BattleScript_EffectRestoreHp`,
3a) — deterministic, single turn, cheapest, real carrier (Sableye_2 idx 268
or any of the other 21). This alone flips the completeness guard off for the
id. Named disposition for the other two labels per the brief's own framing
("cheapest single staging... plus a named reachability disposition for the
other two"): `PresentHealTarget`'s self-heal sub-path is REACHABLE and shares
the IDENTICAL formula as Recover (no extra risk) — landing a second test via
Rest (49 carriers, highest weight) is cheap insurance if the batch worker has
budget. `PresentHealTarget`'s Present sub-path is REACHABLE but genuinely
RNG-gated (Delibird only, 1 carrier — see the shared RNG methodology in §4;
Present's roll is `Random() % 256` in `[204,255]` → heal, ~20.3%, distinct
mechanism from Focus Band's `% 100 < 10`, not one of this scout's two named
RNG targets, left for a future pass). `WishComesTrue` is REACHABLE with an
**already-proven 2-turn repro recipe** reusable verbatim from
`tests/presentationStringIssue72Batch6.test.ts`'s existing
`STRINGID_PKMNWISHCAMETRUE` fixture (just also assert the second printstring
event) — cheap to add, not attempted here since it's not the "cheapest single"
pick.

---

## 4. RNG-gated staging: Focus Band and Sturdy

### 4a. `STRINGID_PKMNPROTECTEDBY` (Sturdy vs. OHKO) — CORRECTED: not RNG-gated at all

**ISSUES #72's characterization of this id as a "seed-search problem" is
wrong and should not be re-raised.** Both real source and this engine's port
check Sturdy **unconditionally, before any accuracy/hit roll is drawn**:

Real source (`battle_script_commands.c:7507-7518`):
```c
if (holdEffect == HOLD_EFFECT_FOCUS_BAND && (Random() % 100) < param) { ... }
if (gBattleMons[gBattlerTarget].ability == ABILITY_STURDY)
{
    gMoveResultFlags |= MOVE_RESULT_MISSED;
    gLastUsedAbility = ABILITY_STURDY;
    gBattlescriptCurrInstr = BattleScript_SturdyPreventsOHKO;
    RecordAbilityBattle(gBattlerTarget, ABILITY_STURDY);
}
else { /* ...the real Random()-gated OHKO-accuracy formula, only reached here... */ }
```
These are **two independent `if` blocks**, not an `if/else if` chain — the
Focus Band roll (only relevant if the OHKO TARGET itself also holds Focus
Band, a different, mutually-exclusive held item from Sturdy) is unrelated to
the Sturdy check. The Sturdy branch always short-circuits BEFORE
`drawBattleScriptRng(..., "tryko")` is ever called
(`battleScriptTryKOOpcode.ts:117-149`: the `if (targetBattler.ability ===
ABILITY_STURDY)` block at `:117-134` `return`s a `jump` transition directly;
the RNG draw at `:143` is only reached in the `else` path). **A Sturdy-holding
target facing any OHKO move deterministically prints `STRINGID_PKMNPROTECTEDBY`
every time, zero seed search needed**, as long as that same target doesn't
ALSO hold Focus Band (which would hit the separate, currently-unsupported
`HOLD_EFFECT_FOCUS_BAND` barrier at `battleScriptTryKOOpcode.ts:107-114` —
irrelevant here since no real Sturdy carrier's rental item is Focus Band).

Real carriers, both sides confirmed in L50 `[110,849]`: Sturdy — Aron (idx
122), Nosepass (150), Sudowoodo_1/2 (193/298), Lairon_1/2 (215/320),
Forretress_1-4 (383/481/575/671), Donphan_1-4 (427/523/619/715), Shuckle_1-4
(432/528/624/720), Aggron_1-4 (450/546/642/738). OHKO moves — `MOVE_GUILLOTINE`
(id 12: Gligar_2 idx315, Crawdaunt_2 354, Kingler_2 358, Pinsir_2 369),
`MOVE_HORN_DRILL` (id 32: Seaking_2 333, Nidoking_1/3 414/606, Rhydon_2/3/4
499/595/691, Dewgong_3 584, Lapras_7/8 822/823), `MOVE_FISSURE` (id 90:
Dugtrio_3/4 564/660, Whiscash_3/4 576/672, Donphan_3/4 619/715, Wailord_3/4
621/717, Walrein_3 644), `MOVE_SHEER_COLD` (id 329: Dewgong_3/4, Walrein_3/4,
Lapras_7/8). Recommended staging: single turn, `ATTACKER(12 /* GUILLOTINE */)`
vs. `statusedTargetConfig({ ability: 5 /* ABILITY_STURDY */ })` (batch2's
exact single-turn helper shape), item on the defender left unset/anything but
Focus Band. Predicted messageIds include `STRINGID_PKMNPROTECTEDBY`,
`moveResultFlags & MOVE_RESULT_MISSED` set, `lastUsedAbility === ABILITY_STURDY`.

### 4b. `STRINGID_PKMNHUNGONWITHX` (Focus Band, 1/10 proc) — genuinely RNG-gated, seed found

**Exact `Random()` call:** `battleScriptHitChainOpcode.ts:1979-1985`
(`Cmd_adjustnormaldamage`/`adjustnormaldamage2`, mirrors
`battle_util.c`'s Focus Band branch inside `Cmd_adjustnormaldamage`): a SECOND
draw per lethal hit against a Focus-Band holder, reason string
`"adjustnormaldamage-focus-band"`, immediately after the damage-roll
multiplier draw (reason `"adjustnormaldamage"`/`"adjustnormaldamage2"`).
Success condition: `(bandDraw.randomValue % 100) < holdEffectParam` where
`holdEffectParam` = 10 for `ITEM_FOCUS_BAND` (id 196) — the standard 10%
proc, confirmed by the file's own `resolveBattleScriptBattlerHoldEffectParam`
lookup.

**RNG model**: `advanceRngValue` (`src/engine/rng.ts:13-18`) is the exact
Gen-3 LCG (`next = (1103515245 * value + 24691) mod 2^32`,
`Random() = (next >>> 16) & 0xffff`), draw-chained through
`drawBattleScriptRng` (`battleScriptMachine.ts:401-425`) off the single
`rngSeed` config field (`createBattleScriptRngState(rngSeed)`,
`factoryBattleScriptFullTurnDecision.ts`'s own construction). Multiple
`Random()` draws happen before Focus Band's own roll within one full turn
(speed tie-break if applicable, either battler's accuracy check, critical-hit
determination, the damage-roll multiplier itself, etc.) — hand-deriving the
exact draw offset from the raw LCG formula alone is fragile (depends on
staged movesets/stats), so this scout instead **ran the actual engine
functions** to brute-force `rngSeed` directly (empirically, not
hand-simulated) — the reproducible derivation command:

```ts
// scratch probe, run via: node --experimental-strip-types <file>.mts
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
} from "./src/engine/factoryBattleScriptFullTurnDecision.ts";

const TACKLE = 33, ITEM_FOCUS_BAND = 196;
const SPECIES_WOBBUFFET = 202, SPECIES_MURKROW = 198;
const AT = (b) => Object.freeze({ kind: "use-move", moveSlot: 0, targetBattler: b });

function tryFocusBand(seed) {
  const config = Object.freeze({
    requestId: 1, rngSeed: seed,
    player: {
      species: SPECIES_WOBBUFFET, moveId: TACKLE, item: ITEM_FOCUS_BAND,
      attack: 60, defense: 60, spAttack: 60, spDefense: 60, speed: 1, hp: 1, maxHp: 200,
    },
    trainer: {
      species: SPECIES_MURKROW, moveId: TACKLE,
      attack: 200, defense: 60, spAttack: 60, spDefense: 60, speed: 91, hp: 190, maxHp: 190,
    },
  });
  const initial = createFactoryFullTurnBattleState(config);
  const afterPlayer = submitFactoryFullTurnDecision(initial, { requestId: 1, side: "player", decision: AT(1) });
  const transition = submitFactoryFullTurnDecision(afterPlayer.state, { requestId: 2, side: "trainer", decision: AT(0) });
  return (transition.events ?? []).filter(e => e.payload.kind === "message").map(e => e.payload.messageId);
}
for (let seed = 0; seed < 1000; seed++) {
  if (tryFocusBand(seed).includes("STRINGID_PKMNHUNGONWITHX")) { console.log("seed", seed); break; }
}
```

Ran this exact probe against the current worktree (deleted after use, not
committed — matches the "scratch probes are fine uncommitted" rule). Result:
**92/1000 seeds in `[0,999]` succeed (9.2%, consistent with the true 10%
proc)**; the first several successes are **seeds 62-66** (contiguous run).
`rngSeed: 62` was directly re-verified standalone: with the player at 1 HP
holding Focus Band (item 196) and speed 1, and the trainer (Murkrow, speed
91, `TACKLE`) moving first and landing a lethal hit, the resulting
`transition.events` contains `STRINGID_PKMNHUNGONWITHX` and the player
survives at 1 HP (not fainted) — `transition.state.rng.calls === 10` total
draws that turn. **Use `rngSeed: 62` with this exact staging shape (or any
seed in the empirically-verified success set) for the batch worker's red-verify
test.** Real L50 Focus Band carriers: item pool ID 80/882 entries (68
species) — cite any real holder's species/moveset in the landed test per
convention (the probe above uses a synthetic filler pair purely to isolate
the roll; swap in a real carrier's stats/species for the actual test,
matching batch2's `statusedTargetConfig`/`ATTACKER` convention). Predicted:
`messageIds` contains `STRINGID_PKMNHUNGONWITHX`, `moveResultFlags &
MOVE_RESULT_FOE_HUNG_ON` set, target HP clipped to 1 (not 0),
`lastUsedItem === ITEM_FOCUS_BAND`.

Message resolution for `STRINGID_PKMNHUNGONWITHX` was NOT separately
investigated here (out of scope — the brief's ask for #4 was staging
determinism, not the presentation branch) — the batch worker still needs to
add the `messageLines` case following the plain
`requireMoveDefender`+item-name idiom (template:
`{B_DEF_NAME_WITH_PREFIX} hung on\nusing its {B_LAST_ITEM}!`, per
`battle_message.c`; `lastUsedItem` is already captured at
`battleScriptHitChainOpcode.ts:2013`).
