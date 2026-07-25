# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 434 — [BETWEEN-SESSION HARDENING, user-directed] two ratchets + oracle freshness gate

- **State:** tree green at **178 files / 2119 tests**, build green. No code
  behaviour changed — this entry adds enforcement for rules that were prose,
  and one startup check. Session 433's work independently re-verified:
  `verify-hit-chain-ground-truth.ts` rerun against the live oracle, **PASS,
  0 failing checks**; the `orbyte` correction confirmed against
  `data/battle_scripts_1.s:244/271/1610/2153` (session 433 was right, the
  pre-reset ROADMAP was wrong).
- **Did:** (1) `tests/executableFrontierRatchet.test.ts` — pins the exact
  allowlist of production canonical-recording imports (**four**, across
  `battleScene.ts` and `factorySwapPresentation.ts`) and fails on any
  addition; a retired entry must be *deleted* from the allowlist, so wins
  ratchet down and cannot silently re-admit. Also pins per-module
  `unsupported-branch` barrier counts (13 hit-chain, 5 canceler), rejects
  barriers in unpinned modules, and requires each barrier-bearing module's
  test file to assert the halt kind. Both ratchets were negative-tested (each
  was made to fail on a probe file, then reverted) — a green ratchet that
  cannot go red is worthless. (2) `tools/check-oracle-freshness.sh` — the
  oracle exposes no version endpoint, so this compares each listening
  service's process start time against harness HEAD's commit time; exit 1 =
  stale, restart before staging. Wired into SUPERVISOR.md's Orient step.
  (3) ROADMAP S10 §3 restated as a **hard ordering constraint** (after step
  (iv), the next battle-lane brief *is* the presentation-seam checkpoint) and
  §4 now points at its enforcing test; SUPERVISOR.md and AGENTS.md carry the
  same two rules where workers actually read them.
- **Next:** unchanged from 433 — main: RUNG 4 (`seteffectwithchance`,
  `tryfaintmon`), then step (iii) opcode 73, then step (iv). **Then the
  presentation-seam checkpoint, not opcode 44.** Animation: MIST_BALL
  remainder in cost order (`AnimThrowMistBall` next) or the next ranked
  Level-50 track.
- **Notes:** the freshness gate exists because session 433 lost time to a
  service that predated the `overrides.parties` builder it was being asked to
  serve — banked as "not yet live" in `docs/hit-chain-ground-truth.md:40`,
  corrected at `:259` after a mid-session restart. The barrier pin exists
  because the (a)/(b) registration policy's failure mode is barrier creep:
  an opcode that is mostly barrier passes the executable-frontier gate on
  paper while executing nothing.

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

