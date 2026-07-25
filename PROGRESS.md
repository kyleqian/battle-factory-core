# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 435 — S10 step (ii) RUNG 4: seteffectwithchance + tryfaintmon registered — sixteen-opcode hit chain complete

- **State:** tree green at **178 files / 2135 tests** (+16), build green.
  `createBattleScriptStatusRulesHandlers` now composes **45** opcodes (was
  43): `seteffectwithchance`, `tryfaintmon` (both in
  `battleScriptHitChainOpcode.ts`). This closes the sixteen-opcode standard
  hit chain from ROADMAP S10 §2(ii); opcode 73 `moveend` remains the
  step-(iii) boundary, untouched.
- **Did:** `seteffectwithchance` is source-complete for its own control flow:
  Serene Grace doubling, the `MOVE_EFFECT_CERTAIN` short-circuit (no RNG
  drawn), and the roll-based branch (RNG **always** drawn once whenever
  CERTAIN isn't taken, matching C's `else if (Random()...)` evaluation order
  — ground truth's roll 4). Since every move reachable from this engine's
  registered topology has `moveEffectByte == 0`, both of `SetMoveEffect`'s
  actual dispatch sites are narrow `(b)` barriers (genuinely unreached today,
  still guarded per the "still a guard, not an omission" rule), each proven
  reachable by directly constructing a nonzero `moveEffectByte` in a Tier-1
  test. `tryfaintmon` is source-complete for the mode-FALSE form used by
  `BattleScript_EffectHit`: the literal `== BS_ATTACKER` comparison (not a
  generic selector — any other operand, including `BS_FAINTED`, correctly
  takes the "target" path, proven by a dedicated test), the no-faint
  pass-through, the faint branch (`HITMARKER_FAINTED`/`HITMARKER_PLAYER_FAINTED`
  bit-setting, real `call` transition into `BattleScript_FaintAttacker`/
  `FaintTarget`), and Destiny Bond/Grudge as narrow barriers gated strictly on
  their real trigger conditions (both reachable via direct hitMarker/status3
  construction, not just theoretically). The mode-TRUE `tryfaintmon_spikes`
  form (needs unmodeled `gSideStatuses`/SIDE_STATUS_SPIKES_DAMAGED) is one
  more barrier, never reached by the hit chain itself. Five new barriers
  total (13 → 18, ratchet pin raised deliberately, named above and in the
  ratchet's own comment). Extended both RUNG-1/KO integration tests: the
  plain-hit scenario now shows **4** attributed rolls with roll 4 attributed
  to `seteffectwithchance` and hands off at `moveend` (opcode 73, unregistered
  — per spec); the KO scenario's real ROM seed reproduces its exact 4-roll
  ledger including roll 4 (`24745`), drives `tryfaintmon`'s faint branch into
  `BattleScript_FaintTarget` with the correct `HITMARKER_FAINTED` bit, and
  then **blocks** (not halts) on the very next instruction, `playfaintcry
  BS_TARGET` — filed as ISSUES #43 (`resolveRulesBattlerForBattleScript` only
  maps `BS_ATTACKER`/`BS_EFFECT_BATTLER`, a pre-existing gap unrelated to this
  rung's two opcodes). 16 new Tier-1 tests (registration + branches +
  barrier-reachability, following the RUNG 1–3 pattern) plus a fixed
  pre-existing test whose default `attack:0/defense:0` fixture happened to
  produce NaN damage that zeroed HP — invisible before tryfaintmon existed to
  read that HP, now given a real nonzero attack/defense so the "no faint"
  scenario is actually a no-faint scenario.
- **Scope correction (say-why, not improvise):** the brief's acceptance
  criterion asking the KO integration test to drive "the terminal outcome...
  `battleOutcome` 0 -> 1" is **not achievable inside this rung and not
  source-faithful to attempt.** `Cmd_tryfaintmon` itself never touches
  `gBattleOutcome` — confirmed by reading its full body
  (`battle_script_commands.c:2965-3050`). The real transition lives in
  `Cmd_checkteamslost` (`:3534-3576`), reached only via
  `BattleScript_HandleFaintedMon`, deep past `dofaintanimation`/
  `cleareffectsonfaint`/the switch-in dance — and it requires summing HP
  across full six-slot `gPlayerParty`/`gEnemyParty` records, a party model
  this engine's Battle Script machine does not have anywhere (`roundController.ts`
  tracks a party, but at a disconnected higher layer). Implementing that is
  not "two opcodes" and was correctly out of scope per the brief's own opcode
  boundary (`moveend`/opcode 73 untouched). Filed as ISSUES #42 for whoever
  registers `checkteamslost` or wires step (iv). This rung instead proves
  exactly what `tryfaintmon` source-faithfully does: takes the real faint
  branch, sets the real hitMarker bits, and hands off cleanly at the next
  boundary the machine actually reaches.
- **Next:** step (iii) — register opcode 73 (`moveend`) per the already-banked
  dependency-ladder receipt (ROADMAP S10, "MOVEEND source-boundary
  checkpoint"). Fixing ISSUES #43 (`BS_TARGET` in
  `resolveRulesBattlerForBattleScript`) first would let the KO scenario's
  faint cutscene advance further, but is not required to start step (iii).
  After (iii): step (iv) closes the loop — and needs ISSUES #42
  (`checkteamslost`/party-HP modeling) solved first for a *real* terminal
  outcome, not a fixture.
- **Notes:** no presentation/render/`battleScene` edits; no oracle traces
  (Tier-1 only, per the banked ground truth); no new production imports of
  canonical recordings.

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

