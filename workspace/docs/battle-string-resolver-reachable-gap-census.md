# Battle string resolver — reachable-string gap census

Status after ISSUES #76 fix (CONFUSE RAY crash, commit `c21ddcef`, 2026-08-05).

## What #76 fixed

The confusion message family now resolves end-to-end in
`src/engine/battleResolutionPresentation.ts`'s `messageLines`:

| STRINGID | Template | Resolution |
| --- | --- | --- |
| `STRINGID_PKMNWASCONFUSED` (67) | `{B_EFF_NAME_WITH_PREFIX} became\nconfused!` | New explicit branch; `{B_EFF_NAME_WITH_PREFIX}` read off the message payload's `effectBattler` (prepared by `prepareMessage` from `rules.selectorRoles.effectBattler`, which `applySetMoveEffect` set to the move's own target). |
| `STRINGID_PKMNISCONFUSED` (65) | `{B_ATK_NAME_WITH_PREFIX} is\nconfused!` | New explicit branch; attacker from the frozen action snapshot. |
| `STRINGID_PKMNHEALEDCONFUSION` (66) | `{B_ATK_NAME_WITH_PREFIX} snapped\nout of confusion!` | New explicit branch; attacker from the frozen action snapshot. |
| `STRINGID_PKMNFATIGUECONFUSION` (122) | `{B_ATK_NAME_WITH_PREFIX} became\nconfused due to fatigue!` | New explicit branch; attacker from the frozen action snapshot (Thrash end-turn). |
| `STRINGID_PKMNALREADYCONFUSED` (68) | `{B_DEF_NAME_WITH_PREFIX} is\nalready confused!` | Already covered (ISSUES #72 batch 1). |
| `STRINGID_PKMNPREVENTSCONFUSIONWITH` (202) | `{B_DEF_NAME_WITH_PREFIX}’s {B_DEF_ABILITY}\nprevents confusion!` | Already covered (ISSUES #72 batch 1). |
| `STRINGID_ITHURTCONFUSION` (230) | `It hurt itself in its\nconfusion!` | Generic fallback (no placeholders). |

**Root cause of the crash:** confusion is a STATUS2 write
(`applyConfusionStatus2Mutation`, `battleScriptHitChainOpcode.ts`) that emits
no `set-battler-status-data` receipt — unlike the status1 infliction quartet,
whose receipts set `pendingStatusMessageBattler` and let the generic fallback
supply `B_EFF_NAME_WITH_PREFIX`. So `STRINGID_PKMNWASCONFUSED` was the one
status-infliction id the generic fallback could never resolve.

Pinned by `tests/confuseRayInflictionPresentationRepro.test.ts` (red-verified:
threw `battleStringResolver: unsupported control segment {B_EFF_NAME_WITH_PREFIX}
in STRINGID_PKMNWASCONFUSED`) and `tests/confusedAdmissionPresentation.test.ts`.

## Status-move infliction family — verified already covered

Paralysis/poison/burn/sleep need no new branches: their "was X" ids
(`STRINGID_PKMNWASPOISONED`, `WASBURNED`, `WASPARALYZED`, `WASFROZEN`,
`FELLASLEEP`) are printed from `printfromtable` tables and resolve through the
generic fallback via the `set-battler-status-data` receipt that precedes them
(status1 writes), and their "-BY" ability variants
(`POISONEDBY`/`BURNEDBY`/`WASPARALYZEDBY`/`FROZENBY`/`MADESLEEP`) have explicit
branches. Confusion was the only infliction-family member on a STATUS2 write,
hence the only gap.

## Remaining reachable-string gaps

The regenerable syntactic upper bound is `docs/printstring-literal-census.md`
(`tools/report/printstring-literal-census.ts`: every literal `printstring`
operand in the parsed battle-script program, classified against the resolver).

Current state: **207 unique literal-`printstring` ids → 86 explicit branches,
83 generic-fallback-resolvable, 38 UNRESOLVED** (unchanged from before #76; the
confusion family was generic-ok syntactically but failed live for lack of the
status-data bridge — a reachability subtlety the syntactic census cannot see).

The 38 UNRESOLVED split into:

**Factory-match plausible (next player-crash candidates — the census is a
syntactic upper bound; each needs a per-id reachability trace before
implementation):**
`STRINGID_PKMNCHANGEDTYPE`, `STRINGID_PKMNCANTUSEMOVESEALED`,
`STRINGID_PKMNCANTUSEMOVETORMENT` (this one is ISSUES #81's own scope — the
Torment reselection-rejection flow must branch it), `STRINGID_PKMNRAGEBUILDING`,
`STRINGID_PKMNREADYTOHELP`, `STRINGID_PKMNSKETCHEDMOVE`,
`STRINGID_PKMNSNATCHEDMOVE`, `STRINGID_PKMNSUBSTITUTEFADED`,
`STRINGID_PKMNSXTOOKATTACK`, `STRINGID_PKMNTOOKAIM`,
`STRINGID_PKMNLEARNEDMOVE2`, `STRINGID_FORXCOMMAYZ`,
`STRINGID_PKMNSXINTENSIFIEDSUN`, `STRINGID_PKMNMADEITRAIN`,
`STRINGID_NATUREPOWERTURNEDINTO`, `STRINGID_PKMNFLEDUSING`.

**Structurally out of Factory scope** (no level-up/learn-move, wild battle,
money/whiteout, Arena referee, link/2-trainer flow, or switch-question exists in
the Facility — implementing these would be dead code):
`STRINGID_DIDNOTLEARNMOVE`, `STRINGID_PKMNATTACK`, `STRINGID_PKMNFORGOTMOVE`,
`STRINGID_PKMNLEARNEDMOVE`, `STRINGID_PKMNLEARNEDMOVE2`, `STRINGID_STOPLEARNINGMOVE`,
`STRINGID_TRYTOLEARNMOVE1/2/3`, `STRINGID_PKMNGREWTOLV`,
`STRINGID_ENEMYABOUTTOSWITCHPKMN`, `STRINGID_PLAYERGOTMONEY`,
`STRINGID_PLAYERPICKEDUPMONEY`, `STRINGID_PLAYERWHITEOUT/2`,
`STRINGID_TRAINER2LOSETEXT`, `STRINGID_TRAINER2WINTEXT`, `STRINGID_TWOENEMIESDEFEATED`,
`STRINGID_FORFEITEDMATCH`, `STRINGID_WILDPKMNFLED`,
`STRINGID_DEFEATEDOPPONENTBYREFEREE`, `STRINGID_LOSTTOOPPONENTBYREFEREE`,
`STRINGID_TIEDOPPONENTBYREFEREE`.

The `printfromtable`-indexed ids (ISSUES #70 scope) are closed; the confusion
family was the last literal-`printstring` id that was generic-ok syntactically
but live-crashable. **The enforced pattern going forward is the repro test**
(mirror `confuseRayInflictionPresentationRepro.test.ts`): every newly-wired
opcode that reaches an UNRESOLVED id must land with its red-verified repro
test, so the next gap is a failing test, not a player crash.

Regenerate with:
```
node --experimental-strip-types tools/report/printstring-literal-census.ts
```
