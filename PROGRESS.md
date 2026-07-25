# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 444 — SetMoveEffect status-write quartet registered (POISON/BURN/FREEZE/PARALYSIS) — secondary status procs are now kernel-executable

*(Entry written by the supervisor: the worker landed both code commits green
and was cap-killed mid-docs-update; suite/build/verify script independently
re-verified before this entry.)*

- **State:** tree green at **194 files / 2318 tests** (+31 over entry 443's
  2287 baseline at merge), build green. `B_SCR_OP_PRINTFROMTABLE` and
  `B_SCR_OP_UPDATESTATUSICON` registered (53 opcodes composed);
  `Cmd_seteffectwithchance`'s two SetMoveEffect dispatch barriers replaced by
  a real `applySetMoveEffect` dispatch, source-complete for
  {POISON, BURN, FREEZE, PARALYSIS} — per-status guards ported exactly
  (type immunities, existing-status, Safeguard, substitute), affects-user
  flag, `status1` write plus the party-record sync mirroring `datahpupdate`.
  Barrier pin `battleScriptHitChainOpcode.ts` 19 → 25, fully itemized in the
  ratchet test's own comment (net of the two retired dispatch barriers;
  SLEEP/TOXIC route via still-unregistered `Cmd_seteffectprimary`; family-B
  status2/misc cases incl. FLINCH stay barriers).
- **Did:** commits `78b1734` (registration + dispatch + 31 Tier-1 tests) and
  `e40c7f3` (integration proof: staged KADABRA Body Slam vs MAGNETON
  reproduces the banked ledger — proc seed paralyzes battler AND party slot
  with zero extra `Random()` draws vs a plain hit, control seed untouched,
  asserting `docs/set-move-effect-ground-truth.md`'s banked values).
  Verify script `verify-set-move-effect-ground-truth.ts` re-run all-PASS
  post-land (supervisor).
- **Next (banked prep, in consumption order):** (1) forced-switch
  registration slices — `docs/forced-switch-ground-truth.md` §4's 10-step
  plan, `openpartyscreen` first (both directions live-proven, 23/23 checks);
  (2) stat-down secondary family — `docs/stat-change-confusion-ground-truth.md`
  (`ChangeStatBuffs` zero-RNG, silent-guard finding); (3) end-turn
  orchestration — `docs/end-turn-ground-truth.md` (inline-faint structural
  finding, ORWORD/PLAYANIMATION gap, 17/17 checks). Animation lane:
  DRAGON_RAGE finish ladder in flight.
- **Notes:** FLINCH deliberately excluded (turn-order field ripple — its own
  slice). The cap-kill's "unauthenticated/sandboxed" postflight hint was
  noise (the worker ran 45 min and committed real work) — do not relaunch
  with sandbox overrides on that basis.

---
## 443 — S10 kernel-breadth RUNG 1 complete (`Cmd_ppreduce` Pressure barriers retired); RUNG 2 (SetMoveEffect quartet) scoped, not attempted this session

- **State:** tree green at **194 files / 2286 tests** (+10 tests over entry
  442's 2276), build green, ratchet green — `battleScriptHitChainOpcode.ts`'s
  barrier pin shrank **21 -> 19** (the two retired Pressure barriers, delta
  named). `docs/set-move-effect-ground-truth.md`'s verify script rerun live
  before starting RUNG 2 scoping: still all-PASS.
- **Did (RUNG 1, committed `c33286c`):** ported the real
  `AbilityBattleEffects(ABILITYEFFECT_COUNT_ON_FIELD/COUNT_OTHER_SIDE, ...)`
  loops (`battle_util.c:3160-3191`) into `Cmd_ppreduce`, bounded by the real
  `gBattlersCount` (2 singles / 4 doubles, same precedent as
  `cleareffectsonfaint`'s existing loop), replacing the two unconditional
  barriers that blocked every `MOVE_TARGET_BOTH`/`MOVE_TARGET_FOES_AND_ALLY`
  move (ROCK_SLIDE, EARTHQUAKE, SURF...) from the hit chain — surfaced by the
  presentation-seam checkpoint (PROGRESS 442). 15 new Tier-1 tests: both
  count forms in singles (the real loop degenerates to the old default-branch
  result) and doubles (genuine multi-battler scan — allies excluded from
  COUNT_OTHER_SIDE, allies included in COUNT_ON_FIELD, cumulative counts,
  attacker excluded from its own count), plus one full hit-chain integration
  test driving ROCK_SLIDE from opcode 0 through `ppreduce` to the script's
  own `end` (previously impossible — this is the leverage proof).
- **RUNG 2 (SetMoveEffect status quartet + flinch): scoped via a live source
  read, deliberately NOT attempted this session** — invoking the brief's own
  escape hatch rather than risk a half-finished, uncommitted cross-cutting
  change under the hard time cap. Concretely, for the next session:
  - **2 new opcodes, both small.** `B_SCR_OP_PRINTFROMTABLE`
    (`Cmd_printfromtable`, `battle_script_commands.c:2180`) needs **no new
    port** — it's a table pointer + `MULTISTRING_CHOOSER` index into one of 7
    small constant tables (`gGotPoisonedStringIds`/`BurnedStringIds`/
    `FrozenStringIds`/`ParalyzedStringIds`, 2 entries each: STATUSED /
    STATUSED_BY_ABILITY; `gPSNPreventionStringIds`/`BRNPreventionStringIds`/
    `PRLZPreventionStringIds`, 3 entries each: ABILITY_PREVENTS_MOVE_STATUS /
    ABILITY_PREVENTS_ABILITY_STATUS / STATUS_HAD_NO_EFFECT, all in
    `battle_message.c:1072-1231`) — resolve table+index to a literal
    `STRINGID_*` operand and feed the *already-registered* `prepareMessage`
    port, same synthetic-operand trick this file already uses for
    `STRINGID_USEDMOVE_OPERAND`. `B_SCR_OP_UPDATESTATUSICON`
    (`Cmd_updatestatusicon`, `:7699`) reuses the existing `BS_EFFECT_BATTLER`
    selector resolver for the non-doubles branch; `BS_ATTACKER_WITH_PARTNER`
    (doubles) is a clean (b) barrier.
  - **SetMoveEffect's dispatch** (`:2234-2521` POISON/BURN/FREEZE/PARALYSIS,
    `:2546-2567` FLINCH): each status write is
    `BattleScriptPush(next) + goto sMoveEffectBS_Ptrs[byte]`
    (`BattleScript_MoveEffect{Poison,Burn,Freeze,Paralysis}`:
    `statusanimation, printfromtable <table>, waitmessage, goto
    BattleScript_UpdateEffectStatusIconRet` -> `updatestatusicon, waitstate,
    return`) on success, each guarded by one ability (Immunity/Water
    Veil/Magma Armor/Limber) with its own `BattleScript_{PSN,BRN,PRLZ}
    Prevention` push+jump sub-script, plus type immunity (POISON:
    Poison/Steel; BURN: Fire; FREEZE: Ice + sun-no-freeze; PARALYSIS: none).
    All 4 share the affects-user flag, the Shield Dust/Safeguard/0-HP/
    Substitute `INCREMENT_RESET_RETURN` early-outs (`:2253-2267`), and the
    party-record `status1` sync (mirrors the already-established
    `datahpupdate` live-sync pattern — ground truth doc §2 pinned this needs
    no new plumbing). SLEEP(1)/TOXIC(6) stay named (b) barriers — unreachable
    via this call site per the doc (their own scripts use the still-
    unregistered `Cmd_seteffectprimary`).
  - **FLINCH(8) needs one genuinely new `BattleScriptRulesContext` field**
    (turn order / `gCurrentTurnActionNumber`, for `GetBattlerTurnOrderNum
    (gEffectBattler) > gCurrentTurnActionNumber`) before its plain
    `status2 |=` write is source-complete — real new cross-cutting plumbing
    (construction/validation, every existing test fixture), not just a
    dispatch branch. This is the one piece of the doc's "zero new opcodes"
    claim that's still nontrivial; left a named (b) barrier rather than rush
    a new required field this session.
  - Net finding: the guard structure is **not** materially bigger than the
    doc's enumeration (confirmed by reading the real source, not assumed) —
    RUNG 2 is tractable, just larger than the time remaining this session.
- **Next:** RUNG 2 as scoped above — printfromtable/updatestatusicon first
  (small, no new ports), then the quartet dispatch with party sync, then the
  integration proof against the banked KADABRA/MAGNETON paralysis ledger in
  `docs/set-move-effect-ground-truth.md` §2 (must match: 8 total rolls, zero
  extra draws for the proc, `status1` written on both the battler and its
  party slot, control seed untouched). Flinch's turn-order field is a
  separate, addable-after slice.
- **Notes:** no oracle traces added this session beyond the pre-check
  verify-script rerun (all PASS); no presentation/`battleScene`/ROADMAP
  edits; stat-down family and confusion remain explicitly out of scope per
  the doc.

---
## 442 — S10 §3 presentation-seam checkpoint: **PASSED** — `turn5-faint.json` re-driven from real kernel events, still 110/110

- **State:** tree green at **194 files / 2276 tests** (+3 files/+13 tests
  over entry 441's 191/2263), build green, ratchet green (6/6, barrier
  counts and canonical-recording allowlist unchanged — no new production
  imports). Oracle re-verified live: `turn5-faint.json` **110/110** (exact
  match to its recorded count), plus 22 other turn3/4/5/6 traces re-run as
  regression checks (`turn3-endeavor/menu/rockslide`, `turn4-doubleteam/
  menu/rockslide`, all 11 `turn5-*`, all 6 `turn6-*`) — every one still
  matches its own recorded count, zero regressions.
- **Did (the checkpoint's ordered 4-step plan, `docs/presentation-seam-
  scout.md` §7.3):** (1) **String resolver (gap 5)**,
  `src/engine/battleStringResolver.ts` — `resolveBattleStringLines` walks
  the already-extracted `battle-message-templates.json` (365-entry
  `gBattleStringsTable`, extracted in an earlier S7 session) and splices
  `{TOKEN}` placeholders via caller-supplied resolvers;
  `resolveBattleNameWithPrefix` implements `HANDLE_NICKNAME_STRING_CASE`
  source-faithfully (`battle_message.c:2286-2306` — "Foe "/"Wild "/no
  prefix by side+battle-type). Pinned against the real
  `STRINGID_TARGETFAINTED` template (corrected in last week's scout pass to
  `{B_DEF_NAME_WITH_PREFIX}\nfainted!\p`) producing exactly "Foe GROVYLE"/
  "fainted!". (2) **PC-to-window bridge (gap 7)**,
  `src/engine/presentationEventWindowBridge.ts` —
  `resolveFaintPresentationWindowContent` answers "am I in the fainted
  window" from a real `hp-change{to:0}` plus a `message` event whose
  `provenance.sourceLabel === "BattleScript_FaintTarget"`, never a turn
  number; minimal, scoped to this one window's own content decision (the
  giant `turn<N>Resolved` dispatch cascade in `drawFightSubmenuWindow` is
  untouched, per the brief). (3) **The leaf**,
  `src/engine/turn5FaintPresentationStaging.ts` — stages Onix (real
  level-50 stats) vs. Grovyle (real level-50 stats, HP 1 -> 0, both from
  `tests/damageCalc.test.ts`'s own RAM-pinned blocks) through the
  registered hit chain from `BattleScript_HitFromAtkCanceler` to the
  script's own `end`, composes the bridge + resolver on the captured
  events, and exports `resolveTurn5FaintWindowLines()`. `battleScene.ts`'s
  `TURN5_FAINTED_LINE1`/`LINE2` hardcoded literals are **deleted**, replaced
  by `const [TURN5_FAINTED_LINE1, TURN5_FAINTED_LINE2] =
  resolveTurn5FaintWindowLines();` — one real kernel run, computed once at
  module load, presentation only reads the result. One deliberate,
  documented substitution: the staged move is `MOVE_STRENGTH`, not the
  real turn's `MOVE_ROCK_SLIDE` — this leaf's own rendered content never
  depends on which move KO'd Grovyle, and `ROCK_SLIDE` is
  `MOVE_TARGET_BOTH` (a spread move), which trips `Cmd_ppreduce`'s
  existing, unrelated `unsupported-branch` for cross-side Pressure
  counting (a real, separate, already-pinned engine gap — not something to
  fake around). (4) **Re-verified**, live oracle: `turn5-faint.json`
  110/110, 22 regression traces unchanged (see State).
- **Next:** the presentation-seam checkpoint is closed; per ROADMAP S10 §3
  the kernel may resume growing past step (iv) (further opcodes/breadth)
  now that one window is proven to genuinely consume kernel events. Gap 4
  (tick/frame timestamp on events) remains open and un-scoped (confirmed
  not on this window's own critical path, §7.3) — the next window that
  needs HP-interpolation timing (e.g. `turn1-rockslide.json`) will need it.
- **Notes:** no new turn-keyed branches; no new production imports of
  canonical recordings (the three RAM-dump HP imports named in ISSUES #41
  are untouched — the fainted branch has zero RAM-dump reads, so no
  deletion fell out naturally here); `drawFightSubmenuWindow`'s own
  `turn<N>Resolved` boolean cascade is unmodified by design (redesigning it
  was explicitly out of this checkpoint's scope).

