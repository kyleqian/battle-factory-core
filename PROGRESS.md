# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 455 — Factory-AI port slice 1: `AI_CheckBadMove` universal preamble ported in full; TryToFaint/CheckViability/dispatch NOT started (roll-count gap found, unresolved)

- **State:** tree green at **210 files / 2490 tests** (+1 file/+13 tests
  over entry 454's 209/2477), build green, ratchet green (barrier ratchet
  untouched — the new module's barrier is a discriminated-union return, not
  an `unsupportedBranch()` call site, so it isn't tracked by that pin).
  `tools/probe/verify-factory-ai-ground-truth.ts` reconfirmed live before
  starting: **ALL PASS**, 15/15/17 attributed rolls still hold.
- **Did:** ported `AI_CheckBadMove`'s universal preamble
  (`src/engine/factoryAiCheckBadMove.ts`) source-completely per the
  2026-07-25 port-subset audit's item 2: type-immunity `Score_Minus10`, the
  five ability-negation branches (Volt/Water Absorb, Flash Fire, Wonder
  Guard, Levitate), the Soundproof nine-move list, and `get_ability`'s
  load-bearing no-cache redraw semantics (both static call sites redraw
  fresh every reach — modeled via an explicit `knownAbility`/`realAbility`
  input pair, not a hardcoded "always unknown"). `AI_CheckBadMove_CheckEffect`'s
  `if_effect` table (`data/battle_ai_scripts.s:104-214`) is a source-complete
  lookup: no entry → genuine zero contribution; an entry (named `AI_CBM_*`
  handler or a direct `Score_Minus*` jump) → a named
  `"factory-ai-check-bad-move"` unsupported-branch barrier. 13 new Tier-1
  tests via direct construction, including the exact Scenario A per-slot
  reproduction (Surf/RockSlide/BodySlam: 2 draws/score 0 each; Thunderbolt:
  0 draws/score -10). **Not yet wired into mask 1/7 dispatch** — no
  `factoryAiMoveSelectionPolicy.ts` composition exists yet, so this is a
  ported, tested building block, not a reachable decision path.
- **Next:** wire this into mask-1 dispatch (reusing the mask-0 policy's
  setup/tie plumbing per `factoryAiDecisionPolicy.ts`'s pattern) and
  Tier-1-pin mask-1 semantics directly (no banked oracle fixture — direct
  construction, per the audit); port `AI_TryToFaint` (call
  `damageCalc.ts`'s `calculateBaseDamage`/`applyStab`/`applyTypeEffectiveness`
  with crit forced ×1 and variance = the per-slot `simulatedRNG`, per
  `factoryAiDecisionPolicy.ts`'s existing setup draw — **also implement
  `get_how_powerful_move_is`'s real "most powerful in the moveset" cross-
  comparison**, needed for TryToFaint's `-1`-if-not-strongest branch, not
  just CBM's `MOVE_POWER_OTHER` classification which this session's port
  approximates without it since none of the 3 banked scenarios' moves are
  power ≤1 or in the ignored-effects list); port `AI_CheckViability` as a
  table-lookup + barrier exactly like CBM's; wire mask 7. Before writing
  more RNG-threading code, resolve the roll-count gap below, or explicitly
  re-scope the ledger-reproduction acceptance criterion.
- **Notes — the roll-count gap (spent >15 min pinning this, over the
  brief's own budget, could not close it):** live-data-driven code (not
  hand arithmetic — `species-stats.json`'s real ability data, `moves.json`'s
  real type/effect data, the real LCG) confirms `AI_CheckBadMove`'s
  `get_ability` draws are **exactly 6** for Scenario A (2 per non-immune
  slot × 3 slots) and **exactly 8** for the degenerate scenario (2 × 4
  slots) — cross-checked against a direct assembly read of
  `data/battle_ai_scripts.s:51-104`, not just the doc's own "≥2x/slot"
  hedge. `AI_TryToFaint` and `AI_CheckViability` both contribute **0**
  draws to all 3 banked scenarios (verified: no move reaches x4
  effectiveness against pure-Ground Marowak; no move's effect has a
  `CheckViability` table entry, confirmed by direct grep). Setup(4) +
  CBM(6) + TTF(0) + CV(0) + tie(1) = **11**, but the live ledger's
  attributed total is **15** — a gap of 4. Reading
  `src/battle_controller_opponent.c:1566`'s `OpponentHandleChooseAction`
  found that `AI_TrySwitchOrUseItem()` (switch/item AI, out of scope per
  this step) fires **before** `BattleAI_SetupAIData` every turn for
  `BATTLE_TYPE_TRAINER` battles (Factory battles are), and — because the
  3 banked fixtures build 3-mon parties per side (`overrides.parties`'s own
  contract) with the opponent's own moveset containing a real
  super-effective move (Surf, 2x vs Marowak) — `ShouldSwitch()`
  (`battle_ai_switch_items.c:429`) provably draws exactly 2 more
  (`FindMonThatAbsorbsOpponentsMove`'s `Random()%3` gated behind a true
  `HasSuperEffectiveMoveAgainstOpponents(TRUE)`, and `ShouldSwitch`'s own
  `HasSuperEffectiveMoveAgainstOpponents(FALSE)` call), live-verified with
  real Alakazam/Marowak type data. That narrows the gap to 11+2=13 vs 15 —
  **2 rolls still unaccounted for**, confirmed by literally executing the
  candidate model against the real `frame-100` seed from
  `docs/factory-ai-ground-truth.md` §2.2 and comparing against the oracle's
  own recorded step count, not by re-deriving on paper. Exhaustively
  re-read `ShouldSwitch`'s remaining branches (`ShouldSwitchIfPerishSong`,
  `ShouldSwitchIfWonderGuard`, `ShouldSwitchIfNaturalCure`, `AreStatsRaised`,
  `FindMonWithFlagsAndSuperEffective`×2, `ShouldUseItem`) and found zero
  further `Random()` sites reachable for this exact matchup. **This is a
  genuinely new finding beyond the banked ground-truth doc**, which scoped
  switch/item AI out of its own analysis without checking whether the
  observed RNG delta window actually excludes it — it does not, for these
  specific fixtures. The next worker on this step should either (a) find
  the remaining 2-roll source (candidates not yet ruled out: a second pass
  through `HasSuperEffectiveMoveAgainstOpponents`'s doubles-only tail
  somehow still executing, or an instrumented mGBA probe counting
  `Random()` call sites by return address per the audit's own suggested
  fallback — not more paper tracing), or (b) get supervisor sign-off to
  relax acceptance criterion #1 to "reproduces the correct final decision"
  without the exact draw-count match, since the decision itself is provably
  RNG-value-independent of switch-AI's own wasted draws (they only shift
  the LCG's starting position, never influence which move scores highest).
  No presentation/census changes. PAPERCUT: this step's own 60-minute
  budget line ("budget the first 10-15 minutes... before writing port
  code") undersized the actual archaeology needed once switch/item AI
  turned out to be entangled in the same observed RNG window — cost the
  whole session, ~50+ minutes on this one sub-question with only a partial
  close.

---
## 454 — Presentation-seam retirement, window 2: `turn1-rockslide.json` re-driven from kernel events, still 256/256 (ISSUES #39/#41 path)

- **State:** tree green at **209 files / 2477 tests** (+2 files/+12 tests
  over entry 453's 207/2465), build green, ratchet green (6/6, allowlist
  unchanged — see Notes for why). Oracle re-verified live, before AND after:
  `turn1-rockslide.json` **256/256** (recorded count, unchanged),
  `turn5-faint.json` **110/110** (prior conversion unregressed). Full
  regression sweep (27 traces: all 4 `turn1-*`, the prior checkpoint's own
  23-trace `turn3-6` set) — every one matches its own recorded count, zero
  regressions.
- **Did, per `docs/presentation-seam-scout.md` §8's own ordered plan:**
  - **Pre-work (named gap, retired by proof not new code):** the scout's
    "stat-stage-change has zero production emission sites" claim
    (§7.1/§7.2/§8.3) turned out to be about test coverage, not code —
    `battleScriptStatBuffs.ts:296-303` already constructs the event on every
    `ChangeStatBuffs` "worked" outcome, and both routes
    (`battleScriptStatbuffchangeOpcode.ts:112-116`,
    `battleScriptHitChainOpcode.ts:2131-2135`) already thread it through; no
    test had ever driven a real move through the production opcode registry
    and asserted `.events`. Added that proof in
    `tests/battleScriptStatbuffchangeOpcode.test.ts`: DOUBLE_TEAM
    (EFFECT_EVASION_UP, self-target — `target === attacker` picks
    `STRINGID_DEFENDERSSTATROSE`, a genuinely different branch than the
    existing Swords Dance case's `STRINGID_ATTACKERSSTATROSE`) staged from
    `BattleScript_EffectEvasionUp` through `BattleScript_MoveEnd`, asserting
    the `stat-stage-change` event and the message id. Corrected
    `turn1RockSlidePresentationStaging.test.ts`'s stale framing to match.
  - **Window conversion (§8.5 steps 1-3):** (1) `battleStringResolver.ts`
    gained `resolveMoveNameExclaim` (move id → `"{name}!"`,
    `STRINGID_USEDMOVE`'s own `{B_BUFF2}` — source-confirmed all 5
    `sText_ExclamationMark*` grammar variants are the literal English `"!"`,
    `battle_message.c:420-424`/`2907-2921`, so the move-specific grammar
    table is not port-worthy). (2) `presentationEventWindowBridge.ts` gained
    `resolveRockSlidePresentationWindowContent`, keyed on
    `provenance.sourceLabel` (`BattleScript_HitFromAtkString`/
    `BattleScript_HitFromAtkAnimation`) instead of the
    `turn2Resolved`..`sm.cursor` dispatch cascade (untouched, same "don't
    redesign the cascade" discipline turn5-faint's own precedent set). (3)
    `turn1RockSlidePresentationStaging.ts` now exports
    `resolveTurn1RockSlideAttackLines`/`resolveTurn1DoubleTeamKickoffLines`/
    `resolveTurn1RockSlideHpEndpoints`; **found and fixed turn 1's own real
    RNG seed** (`battle1-turn1-ram-dump.json`'s `rngLedger[0].fromValue`,
    3485459011 — brute-forced against all 7 ledger checkpoint values, live-
    verified: staging this seed consumes exactly 4 RNG calls ending at
    rngValue 3326091607, byte-identical to the ledger's own 4th-entry
    `toValue`, and computes Grovyle's HP as 143→101, byte-identical to
    `before_turn`/`after_turn.battler1.hp`) — replacing the scout's own
    borrowed seed (which gave a different, merely-plausible 143→97 roll).
    `battleScene.ts`'s `drawRockSlideWindow`/`drawRockSlideAttack` now source
    `TURN_KICKOFF_LINE1/2`+`ROCK_SLIDE_LINE1/2`'s text and the HP-bar's
    `from`/`to` endpoints from these resolvers (module-load-time constants,
    same pattern as `TURN5_FAINTED_LINE1/2`) instead of the hardcoded
    literals/RAM-dump reads — verified byte-identical to the prior hardcoded
    values before wiring. `STAT_ROSE_LINE1/2` stays a hardcoded literal this
    pass (per §8.5 step 3's own narrowing — converting it would need a
    *second* staged DOUBLE_TEAM hit chain merged into the same window's
    bridge, out of scope); `drawTurnEndSettledMenu` (a separate function,
    not named in scope, sharing the same two RAM-dump reads) was also left
    unconverted, flagged as an easy follow-up.
- **Next:** the next presentation window in the retirement path (ISSUES
  #39/#41), or `STAT_ROSE_LINE1/2`'s own conversion (needs a staged
  DOUBLE_TEAM hit chain merged into the ROCK_SLIDE window's bridge) as a
  narrower follow-up; `drawTurnEndSettledMenu`'s matching RAM-dump reads;
  kernel breadth resuming past S10 step (iv) per ROADMAP.
- **Notes:** ratchet allowlist **unchanged, deliberately** —
  `battle1-turn1-ram-dump.json`'s import in `battleScene.ts` remains needed:
  `anchorOpponentBattler.hp`/`anchorOpponentAfterTurnHp` are still read by
  several OTHER windows (the healthbox-harvest baseline, turn 2-5's own
  `dragonBreathGrovyleHp`/`drawEndeavorSquish`, and `drawTurnEndSettledMenu`
  above) — this step retired 2 of that import's many read-sites, not the
  import itself, so ISSUES #41 is not trimmed this pass (its own claim,
  read at import granularity, remains exactly true) and #39's file-wide
  architecture claim is likewise unchanged (one more window's content is
  event-driven; the turn-keyed dispatch cascade itself is untouched, same as
  the turn5-faint precedent). No new opcodes/registrations, no census
  regen (emission plumbing already existed; nothing newly executable).
  PAPERCUT: none this session. Also fixed a pre-existing PROGRESS.md
  formatting slip (entry 452 was missing its own `## 452` header) while
  archiving entry 451.
- **Supervisor fold (2026-07-25 ~19:00), same session:** merged two side
  scouts on top of this entry's landing: (1) the ISSUES #44 census fix —
  `SET_MOVE_EFFECT_SUPPORTED_BYTES` now mechanically derived from the
  engine dispatch (drift-guard proven to fire), census **57→65 effects,
  122→144 moves, 92→111 Factory-L50** (1099→1416 weighted), 25 ground-truth
  checks pass, #44 entry deleted per the pruning rule; (2) the Factory-AI
  port-subset audit appended to `docs/factory-ai-ground-truth.md` —
  mask-per-band pinned (0-1→0, 2-3→1, 4-7→7; all three banked fixtures ran
  mask 7), CheckBadMove+TryToFaint proven to reproduce all three banked
  ledgers exactly (CheckViability contributes zero to them — the doc's old
  `AI_CV_Paralyze` claim corrected; supervisor re-verified the
  `EFFECT_PARALYZE_HIT`-has-no-`if_effect`-entry claim against
  `data/battle_ai_scripts.s` directly), and the 16-of-90 reachable
  `AI_CV_*` handler table banked for the phased port.

---
## 453 — MOVE_EFFECT_CONFUSION (7) and MOVE_EFFECT_FLINCH (8) registered in SetMoveEffect's dispatch — zero new opcodes, census +4 effects/+17 moves

- **State:** tree green at **207 files / 2465 tests** (+0 files/+16 tests
  over entry 452's 207/2449 — all new tests landed in existing files: 14 in
  `battleScriptHitChainOpcode.test.ts` (a new confusion/flinch describe
  block; 2 obsolete FLINCH barrier tests were replaced 1:1 with UPROAR-based
  equivalents, net 0 there), 1 each in the two dedicated
  `battleScriptAttackCanceler{Confused,Flinch}.test.ts` integration
  additions, plus a small key-list fixup in `battleScriptRulesContext.test.ts`
  and two `toStrictEqual` fixture updates), build green. Census regenerated:
  **53→57 effects, 105→122 moves, 77→92 Factory-L50 (944→1099 weighted)**.
  Ratchet green, zero pin changes (the 2 barrier tests removed for FLINCH
  were replaced 1:1 with UPROAR-based equivalents — same barrier call site,
  different still-unsupported byte).
- **Did, per `docs/stat-change-confusion-ground-truth.md` §1.6/§2.5 and
  `docs/set-move-effect-ground-truth.md` (both banked, cited not re-derived):**
  - `applySetMoveEffect` (`battleScriptHitChainOpcode.ts`) now dispatches
    `MOVE_EFFECT_CONFUSION`/`MOVE_EFFECT_FLINCH` before falling through to
    the stat-family table / unsupported-branch barrier. CONFUSION: shared
    family-B early-out + Own Tempo gate, `(Random()%4)+2` duration draw,
    plain status2 write (guaranteed-zero bits), push+jump to
    `BattleScript_MoveEffectConfusion` (all 4 of its ops were already
    registered). FLINCH: Inner Focus gated on `certain` (a direct, un-pushed
    jump to `BattleScript_FlinchPrevention` — that script's own `goto
    BattleScript_MoveEnd` tail ends the move, unlike the status1 quartet's
    push+jump preventions), otherwise a plain status2 write gated on the
    target not having acted yet this turn, always falling through with no
    script call either way (source-verbatim from `battle_script_commands.c`
    :2524-2567 — read fresh, not assumed).
  - FLINCH's turn-order gate (`GetBattlerTurnOrderNum(effectBattler) >
    gCurrentTurnActionNumber`) needed two new `BattleScriptRulesContext`
    fields: per-battler `turnOrderNum` and context-level
    `currentTurnActionNumber`. `factoryBattleScriptFullTurnDecision.ts` is
    the one real owner (mover1=0/mover2=1, set once per action via a new
    `withTurnOrderPositions` helper); every other construction site
    (including every existing single-command fixture) defaults to
    `turnOrderNum=1`/`currentTurnActionNumber=0` — the source-faithful
    "target hasn't acted yet" shape those fixtures' own one-attacker-action
    staging already implies, not a made-up convenience default. Three
    `emptyBattler`/filler-battler call sites (`factoryBattleScriptDecision.ts`,
    `factoryBattleScriptFullTurnDecision.ts`, `factoryBattleScriptTerminalDecision.ts`)
    needed the same one-time mechanical ripple `speed`/`maxHP` caused
    previously.
  - **Found and fixed a latent RNG-threading bug** in
    `createSeteffectwithchanceOpcodeHandler`/`finalizeSeteffectwithchance`:
    the latter unconditionally overwrote the returned transition's `.rng`
    with the pre-dispatch value, silently discarding any RNG draw made
    *inside* `applySetMoveEffect`. Invisible until now because every
    previously-registered effect byte (the status1 quartet, `ChangeStatBuffs`)
    draws zero RNG — confusion's duration draw is the first genuine second
    draw within one `seteffectwithchance` step. Fixed by threading the
    post-chance-roll rng through `context.state` before calling
    `applySetMoveEffect`, so its own returned `.rng` is authoritative and
    the override is no longer needed.
  - **New Tier-1 coverage** (`battleScriptHitChainOpcode.test.ts`): docs
    §2.5's real oracle ledger (seed 9 proc / seed 1 control) reproduced
    byte-for-byte — raw rngValues confirmed live via `bin/oracle lab` at
    authoring time (frame-0 789488161/3034451114, forward-stepped 3 LCG
    steps past the shared accuracy/crit/damage rolls to the exact pre-roll-4
    state), not synthesized — plus Own Tempo/Safeguard(blocks, `<=7`
    gate)/Substitute/already-confused gates for CONFUSION, and Inner
    Focus/Safeguard-does-NOT-block(`<=7` gate excludes byte 8)/Shield-Dust-
    DOES-block(`<=9` gate includes it)/turn-order-gate-negative/
    already-flinched gates for FLINCH.
  - **Two new integration tests** prove infliction feeds the *existing*
    CANCELER_CONFUSED/CANCELER_FLINCH reducers with zero adaptation glue:
    `battleScriptAttackCancelerConfused.test.ts` replays docs §2.5's ledger
    end-to-end (rolls 4-5 via the production opcode dispatch, then roll 6 —
    the canceler's own `Random()&1` check — via the reducer directly),
    landing on the exact live frame-300 `rngValue` (679317255) docs §2.5
    itself verified against the oracle. `battleScriptAttackCancelerFlinch.test.ts`
    proves a flinched battler's next admission reaches the reducer's
    `"flinched"`/`BattleScript_MoveUsedFlinched` cant-move outcome.
  - Census tool: added `MOVE_EFFECT_CONFUSION`/`MOVE_EFFECT_FLINCH` to
    `SETMOVEEFFECT_SUPPORTED` plus 5 new drift-guard checks (4
    require-executable, 1 require-still-blocked for TRI_ATTACK). Four
    effect scripts flip fully executable: `EFFECT_CONFUSE_HIT`,
    `EFFECT_FLINCH_HIT`, `EFFECT_FLINCH_MINIMIZE_HIT` (Stomp/Minimize
    class), `EFFECT_TWISTER`; six more (Razor Wind/Sky Attack/Snore/Skull
    Bash/Solar Beam/Fake Out) have their remaining-blocker reason correctly
    narrowed (FLINCH no longer in their list) but stay blocked on other
    still-missing opcodes.
- **Next:** ISSUES #44 (a pre-existing, unrelated census gap found along the
  way — the stat-down secondary-effect family was never added to
  `SETMOVEEFFECT_SUPPORTED`, so its 4 `EFFECT_*_DOWN_HIT` entries still
  misreport `blocked-on-subsystem`; cheap follow-up, named not fixed here);
  the non-terminal forced-switch continuation into the full-turn/end-turn
  dual-sided reducers (currently a named, unreachable throw); the AI
  move-selection port (`docs/factory-ai-ground-truth.md`);
  `DoFieldEndTurnEffects` setters (screens/weather); primary-effect
  confusion (`EFFECT_CONFUSE`, `Cmd_seteffectprimary`, out of this step's
  scope) and the other status2 family members (TRI_ATTACK/UPROAR/etc.).
- **Notes:** no oracle traces committed (Tier-1 direct-construction per this
  doc's own established discipline; the oracle was queried live only to
  derive the two raw rngValue literals now pinned in the test file, same
  discipline the stat-change-confusion ground-truth doc itself used). No
  presentation/`battleScene`/ROADMAP edits. OUT OF SCOPE per the brief and
  untouched, confirmed: CANCELER internals (reused, not modified),
  primary-effect confusion (`CONFUSE_RAY`'s `EFFECT_CONFUSE` path — did not
  fall out free, `Cmd_seteffectprimary` stays unregistered),
  TRI_ATTACK/UPROAR/other status2 family members, AI port. PAPERCUT: none
  this session.

