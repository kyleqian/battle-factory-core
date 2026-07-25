# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 433 — [SUPERVISOR WIND-DOWN 2026-07-24 ~17:30] session summary

- **State:** tree committed and green at **177 files / 2113 tests**, build
  green, both hit-chain ground-truth verify scripts PASS, no worktrees or
  unmerged branches, both oracles current (restarted onto harness `b30c5d8`).
  **No DEFERRED entries — nothing blocks the next `run-supervisor.sh`.**
- **Session (9 worker steps + 1 stacked, all green, zero regressions):**
  S10 step (i) complete — opcode 0 registered with six tested barriers (427),
  plus a RUNG-1 fix of its over-broad Protect tail. Step (ii) RUNGs 1–3
  complete — **43 opcodes registered** (was 28): the full hit chain through
  `resultmessage` executes against banked ROM ground truth (hit = 4 attributed
  rolls / miss = 1, crit ×2 placement, KO arithmetic). Side lane banked
  hit/miss/KO/crit scenarios + two PASS/FAIL verify scripts; the KO scenario
  pins both `tryfaintmon` branches incl. the terminal WIN (`battleOutcome`
  0→1) that step (iv) will consume. Animation lane: FEATHER_DANCE anim-script
  interpreter spike **succeeded** (ISSUES #40 deleted); MIST_BALL enumerated
  to an honest stop-and-split (6 items, 2 new subsystems, WHITE_FEATHER edge
  is dead code); generic `AnimTask_ShakeMon` + linear-translation ports landed
  with QUICK_ATTACK/FIRE_PUNCH/FLY re-driven through them at recorded counts
  (FLY's divergence root-caused: same-frame double-step of a priority-5 task).
- **Next (in order):** main — RUNG 4 (`seteffectwithchance`, `tryfaintmon`;
  entry 432 has the boundary), then step (iii) opcode 73 from the banked
  receipt, then step (iv) close-the-loop consuming the KO scenario's terminal
  outcome; the presentation-seam checkpoint (ROADMAP S10 §3) before kernel
  breadth past (iv). Animation — MIST_BALL remainder in cost order
  (`AnimThrowMistBall` wire is next) or the next ranked Level-50 track.
- **Notes:** ROADMAP corrected twice this session (opcode-0 supersession
  marker; step (ii) has no `orbyte`, eighteen registrations). Two PAPERCUTS
  added (post-KO button-drop staging; comparator round-trip cost).

---
## 432 — S10 step (ii) RUNG 3: attackanimation..resultmessage registered (all seven)

- **State:** RUNG 3 of the sixteen-opcode hit chain is complete and green at
  **177 files / 2113 tests**, build green. `createBattleScriptStatusRulesHandlers`
  now composes **43** opcodes (was 36): `attackanimation`, `effectivenesssound`,
  `hitanimation`, `healthbarupdate`, `datahpupdate`, `critmessage`,
  `resultmessage` (all in `battleScriptHitChainOpcode.ts`). The staged hit
  turn integration test now runs opcode 0 → accuracycheck → ... →
  adjustnormaldamage → attackanimation → waitanimation → effectivenesssound →
  hitanimation → waitstate → healthbarupdate → datahpupdate → critmessage →
  waitmessage → resultmessage → waitmessage, and hands off cleanly at
  `seteffectwithchance` (still unregistered, the correct RUNG-4 boundary) for
  both the plain Tackle-hit scenario and the KO scenario's real ROM seed.
- **Did:** `attackanimation` is source-complete: the `HITMARKER_NO_ANIMATIONS`
  and `MOVE_RESULT_NO_EFFECT` branches both resolve to a real `BattleScriptPush
  (curr+1)`-equivalent `call` transition to `BattleScript_Pausex20` (not a
  barrier — the machine's `call` control-flow kind already models this
  exactly), the doubles-only spread-move early-return uses the already-present
  `animTurn`/`animTargetsHit` `gBattleScripting` fields (from
  `battleScriptSetByte.ts`, not new state), and the multihit-string argument
  is computed from already-modeled fields (`multiHitCounter`, target
  `substituteHP`/`hp`) — no barrier needed there either, unlike the brief's
  worry. `effectivenesssound`/`hitanimation`/`healthbarupdate` are acknowledge-
  only controller-request emissions (new `health-bar-update` semantic event
  kind; `play-se`/`animation` kinds existed but were unused until now).
  `datahpupdate` is the rung's real HP mutation: substitute-active damages
  `substituteHP` instead of real HP with correct `hpDealt` bookkeeping (the
  substitute-*fades* sub-case is barriered — it needs the
  `BattleScript_SubstituteFade` cutscene subsystem, gated strictly on
  substitute HP actually reaching 0 this hit); negative damage (HP gain) is
  barriered on needing an unmodeled `maxHP` field (structurally unreachable
  from `EFFECT_HIT` moves anyway); physical/special bookkeeping reuses the
  already-present `specialStatus.{physicalDmg,specialDmg}` fields; Bide
  accumulation reuses the already-present `bideDmg`/`bideTarget` context
  fields. New required battler field `friendship` (animation-argument only,
  `?? 0` default) and new context field `hpDealt` (real `gHpDealt`, `?? 0`
  default). `critmessage` is a direct crit-flag+no-effect gate.
  `resultmessage`'s stringId selection models the source's real two-phase
  switch-then-default-bitmask structure faithfully (verified via the
  `FOE_ENDURED`-combined-with-`SUPER_EFFECTIVE` case, which must exercise the
  default branch's `BattleScriptPushCursor`-equivalent `call-current` jump to
  `BattleScript_EnduredMsg`, re-entering `resultmessage` with the flag
  cleared) — `MOVE_RESULT_ONE_HIT_KO` and `MOVE_RESULT_FOE_HUNG_ON` are the
  only two barriers, each gated strictly on that flag bit, citing the
  genuinely-unmodeled OHKO/Focus-Band-activation subsystems.
- **Next:** RUNG 4 — register `seteffectwithchance` (consumes ground truth's
  4th roll) and `tryfaintmon` (the KO/next-mon/terminal-win branches banked in
  `docs/hit-chain-ground-truth.md`'s edge-case scenario). That closes the
  sixteen-opcode hit chain; opcode 73 (`moveend`) remains the step-(iii)
  boundary after that.
- **Notes:** three pre-existing tests broke on the new required `friendship`
  battler field (two `toStrictEqual`-against-raw-input attackcanceler tests,
  one registration-count pin) and were fixed in the same commit, same
  pattern as RUNG 2's `attack`/`defense`/etc additions. Added 41 new Tier-1
  dispatch tests (one `describe` per opcode, registration + key branches +
  barrier-reachability) plus extended both RUNG-1/KO integration tests through
  the new boundary; RNG ledger asserted untouched across all seven opcodes
  (ground truth: roll 4 belongs to `seteffectwithchance`, not this rung). No
  presentation/render/`battleScene` edits; no oracle traces (Tier-1 only, per
  the banked ground truth).

---
## 431 — S10 step (ii) RUNG 2: critcalc, damagecalc, typecalc, adjustnormaldamage registered

- **State:** RUNG 2 of the sixteen-opcode hit chain is complete and green at
  **177 files / 2072 tests**, build green. `createBattleScriptStatusRulesHandlers`
  now composes **36** opcodes (was 32): `critcalc`, `damagecalc`, `typecalc`,
  `adjustnormaldamage` (all in `battleScriptHitChainOpcode.ts`, reusing
  `damageCalc.ts`'s pinned functions as-is). A staged hit turn now runs
  opcode 0 → accuracycheck → attackstring → ppreduce → critcalc → damagecalc →
  typecalc → adjustnormaldamage and hands off cleanly at `attackanimation`
  (still unregistered, the correct RUNG-3 boundary).
- **Did:** `critcalc` computes the real critChance stage (Focus Energy,
  high-crit moves, Scope Lens, species-gated Lucky Punch/Stick) and the
  Battle Armor/Shell Armor/`STATUS3_CANT_SCORE_A_CRIT`/tutorial-battle
  immunity gate as a genuine C `&&` short-circuit — immunity now consumes
  **zero** RNG, matching the source exactly rather than wasting a roll.
  `damagecalc` applies the crit ×2 step (`gCritMultiplier`) and
  `dmgMultiplier` in the correct position — **before** `typecalc`'s STAB/type
  scaling, per entry 429/430's crit-placement finding — plus Charge's
  Electric ×2 and Helping Hand's 1.5x. `typecalc` is source-complete: STAB,
  the type-effectiveness loop with real `TYPE_MUL_*` → `gMoveResultFlags`
  toggling (super/not-very-effective cancel-out), the Foresight-vs-Ghost
  immunity skip (typecalc's own independent branch, kept consistent with
  RUNG 1's `CheckWonderGuardAndLevitate`), Levitate-vs-Ground's short-circuit,
  Wonder Guard's own miss branch, and the `MOVE_STRUGGLE` no-op. `adjustnormaldamage`
  runs `ApplyRandomDmgMultiplier` unconditionally then the real False
  Swipe/Endure HP-clamp-to-1 (`MOVE_RESULT_FOE_ENDURED`); Focus Band's own
  roll is a `(b)` barrier **gated on the item actually being held**
  (`resolveBattleScriptBattlerHoldEffect === HOLD_EFFECT_FOCUS_BAND`), never
  on the plain path — verified by a same-shape non-Focus-Band-item test that
  still advances normally. Added six new battler fields the same way prior
  checkpoints did: `species`, `attack`, `defense`, `spAttack`, `spDefense`,
  `level` (required, `?? 0` defaults — `CalculateBaseDamage`'s raw stat
  inputs, previously entirely unmodeled in the rules context) plus `endured`/
  `helpingHand` (optional ProtectStruct bits, same pattern as `bounceMove`
  etc.). All pinned arithmetic from `docs/hit-chain-ground-truth.md`
  reproduces exactly via an inverse-LCG test helper (`ISO_RANDOMIZE1` is a
  bijection mod 2**32, so a target u16 roll's exact seed is solved, not
  searched): non-crit Tackle 16→15, crit 7→14→7→6, and — as the primary
  integration test — the KO scenario's **real ROM frame-0 seed 919694434**
  reproducing 142→213→213→204 with the exact 3-roll ledger
  (accuracycheck/critcalc/adjustnormaldamage, in order).
- **Next:** RUNG 3 — register `attackanimation..resultmessage` (the
  presentation/message-only middle of the hit chain: `waitanimation`,
  `effectivenesssound`, `hitanimation`, `healthbarupdate`, `datahpupdate`,
  `critmessage`, `resultmessage`). Then RUNG 4 (`seteffectwithchance`,
  `tryfaintmon` — roll 4 stays unconsumed by this rung, exactly as ground
  truth reserves it). Opcode 73 (moveend) remains the step-(iii) boundary.
- **Notes:** three pre-existing tests broke on the new required battler
  fields (two `toStrictEqual`-against-raw-input attackcanceler tests, one
  registration-count pin) and were fixed in the same commit, not left red.
  No presentation/render/`battleScene` edits; no oracle traces (Tier-1 only,
  per the banked ground truth); `damageCalc.ts` untouched, exactly as
  directed.

