# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---


## R89 — [supervised session, 2026-09-11 03:05 UTC–, unattended] **M86 ACCURACYCHECK part 1/3 (bypass paths) folded**

- **State:** `rust-main` = master (no-op merge at orient; origin fetch
  fails as usual, local master ref is current) + `4397eabfd` M86
  accuracycheck-bypass fast-forward + this ledger commit. Baseline at
  orient re-verified 1,596/1,596 + artifact byte-identical to R88. Tree
  clean, committed, green. Core-only session: no ABI, adapter, canonical
  TS, or npm file touched.
- **Did (this step):** worker (claude-sonnet-5, 45-min cap, one commit,
  27.0 min, $5.80, foreground gates) ported the no-roll bypass ladder of
  0x1 accuracycheck (`battle_script_commands.c:1099-1189`, bypass branch
  :1103-1113): NO_ACC_CALC_CHECK_LOCK_ON / NO_ACC_CALC operand dispatch
  (operand checked BEFORE roles; unknown/missing operand -> Halt verbatim
  incl. "<missing>"), lock-on sure-hit > bare semi-invulnerable jump
  (ZERO flag/missType/history writes — pinned asymmetry) > protect gate
  (MISSED + B_MSG_PROTECTED + per-target lastLandedMoves/lastHitByType
  clear), protect reads gCurrentMove regardless of the literal 0,
  unknown-move -> not-protected (never an error), find-first registration
  with NO shape validation (a NEW convention pin vs recent siblings;
  error "committed Battle Script program does not emit ..." verbatim),
  lazy taken-only labels, and a typed `FullFormulaPathPending` staging
  for ACC_CURR_MOVE/MOVE_FUTURE_SIGHT/MOVE_DOOM_DESIRE (native unit
  tests only, no TS-parity claim). **30 behavior + 3 registration**
  cases over the 9 committed bypass sites + custom edges; corpus sha256
  `ec8e2d37ad28ecad421b63421142b7c016c69891912588fab62831cf2db303b3`.
- **Next:** M87 worker ALREADY DISPATCHED (55-min cap, brief
  `/tmp/rust-briefs/accuracycheck-m87.txt`): the full-formula path —
  protect/lock-on (TS diverges from C's lock-on absorb tail; pin TS +
  document), hitmarker ladder with per-leg carry asymmetry, weather
  bypasses, native calculate_accuracy/roll_accuracy_hits reuse, ONE
  "accuracycheck" rng draw, miss tail (CheckWonderGuardAndLevitate +
  missType chooser), destiny-bond hit tail; absorb/Flash-Fire label
  block staged behind `AbsorbingTailPending` for M88 (part 3/3).
- **Notes:** supervisor audit covered the apply body, both jump
  sub-branches, all error texts (incl. the shared ungrammatical "a
  attacker"), and every cited line (battle.h:160/163/164/175/220,
  pokemon.h:209, moves.h:252/357, battle_script_commands.c:57/80/332,
  battle_script.inc:6-10, 66-site census 55/8/1/1/1); independent
  regeneration byte-identical. Generated Rust **194,403 bytes**, sha256
  `8c6f5d44e28871d8e0e283608874c63792000e34bdee56ac85f28b3765a0107a`;
  generator **30,095 bytes**, sha256
  `530591975eb7092f527bff4d947b7fab985f5bdf26fd0ee0578db00c0219ab53`.
  Gates on `rust-main` post-fold: **1,612/1,612** native (+16), fmt,
  strict workspace Clippy, wasm32 release; artifact **496,730 bytes**,
  sha256
  `e352de252853008ab764faf15e55550615033370be755096f9ed60705ba7a884` —
  NOTE the artifact SHRANK 15,509 B vs R88; worker and supervisor builds
  from identical source agree byte-for-byte, so this is deterministic
  codegen/layout drift from the new module, not an environment fault.
  91 of 215 TS opcode names fully ported (accuracycheck counts only when
  M88 completes). R86 archived. No npm gate required; no deferral added.
  No PAPERCUT.


## R88 — [supervised session wind-down (final), 2026-09-10 15:01–~17:45 UTC, unattended] **M85 semi-invulnerable trio + session close (four green folds)**

- **State:** `rust-main` = master (no-op merge at orient) plus four verified
  Sonnet worker fast-forwards this session — `7d3206705` M82 byte-algebra
  trio, `4ecf69eb0` M83 tryKO, `3c0e8c0fe` M84 type-curse trio, `0072ffa5d`
  M85 semi-invulnerable trio — each followed by its ledger commit and a
  successful `backup-refs.sh` push. Tree clean, committed, green; no worker
  worktree or branch left behind. No ABI, adapter, canonical TS, or npm
  file was touched all session, so the main supervisor's fold is
  `core-rs/**` + `RUST_PROGRESS*.md` only.
- **Did (this step):** worker (claude-sonnet-5, 40-min brief cap, one
  commit, ~29 min, foreground gates) ported 0x18 clearstatusfromeffect /
  0xC5 setsemiinvulnerablebit / 0xC6 clearsemiinvulnerablebit
  (`battle_script_commands.c:2951-2963/:9009-9026/:9028-9045`): the
  narrowed `sStatusFlagsForMoveEffects` projection (CHARGING→
  STATUS2_MULTIPLETURNS only; RAGE and all others → 0, matching the C
  designated-initializer default), the ≤6 status1/status2 branch split +
  moveEffectByte reset, selector-unavailable as a first-class Halt (a
  pinned DEVIATION from the jump family's Block convention, incl. the
  "<missing>" rendering), registration that pins the literal BS_ATTACKER
  operand expression (stricter than any sibling), the zero-operand
  exactly-1/exactly-2 convention WITH dispatcher check (vs
  registerSingleInstruction's without — pinned), the currentMove switch
  (Fly/Bounce/Dig/Dive; default → bit-0 no-op pinned), and the SHARED
  hit-chain role error "Battle Script hit-chain command requires a
  attacker role" verbatim. **33 behavior + 16 registration** cases; corpus
  sha256
  `b8ba30d39c8ce71b25d3af147f8f55adcee07aa90362877dcf66ffefd9a7dc03`.
- **Next:** merge master, re-run the four Rust gates, then continue.
  Recommended opener: ACCURACYCHECK (0x1, 66 sites) per R87's scout notes —
  `calculate_accuracy`/`roll_accuracy_hits` already native
  (`damage_calc.rs:777-845`); the opcode layer adds the NO_ACC_CALC
  bypasses, protect/semi-invulnerable/hitmarker ladder (consumer side of
  THIS step's bits), always-hit/weather bypasses, and the heavy tails
  (`advancePastAccuracyCheck` absorb/Flash-Fire label jumps,
  wonder-guard/levitate, `jumpToMissTarget` moveHistory clear) — consider
  splitting bypass-path-first. 91 of 215 TS opcode names ported. No
  deferral is open.
- **Notes:** supervisor audit covered the apply bodies (mask lookup, branch
  split, byte reset, "<missing>" Halt), all three registration ladders and
  error texts (incl. TS's ungrammatical "requires all 1 concrete starts"),
  and battle.h:139/:163/:164/:175/:253 citations; independent regeneration
  was byte-identical. Generated Rust **43,675 bytes**, sha256
  `8c80f061e675b78546e8acb7274442eb06dad6211c41a24ae2146fce81fcca96`;
  generator **31,146 bytes**, sha256
  `9118a88003cb9b6974639f0f1053657ea53b480deec0badc4d1241eab08c514c`.
  Final gates on `rust-main`: **1,596/1,596** native (up from 1,511 at
  orient, +85 across four leaves), fmt, strict workspace Clippy, wasm32
  release; artifact **512,239 bytes**, sha256
  `8e49c369c4ed8fd8048014f3ecd1cab72a836f3541c270cb8ae7ed73058b12ad`.
  Session-wide: four Sonnet workers (~$18.90), four clean landings 26-30
  min, ZERO cap expiries (the foreground-gates brief rule holds). 10
  opcodes went native this session (3 byte-algebra + tryKO + 3 type-curse
  + 3 semi-invulnerable; 91 of 215 TS opcode names). Also fixed two glued
  archive headers (R85 commit). No npm gate required; no deferral or
  barrier added. R85 archived. No PAPERCUT.


## R87 — [supervised session, 2026-09-10 15:01 UTC–, unattended] **M84 type-jump + curse trio folded (third green fold this session)**

- **State:** `rust-main` = master (no-op merge at orient) + `7d3206705` M82
  byte-algebra trio + `4ecf69eb0` M83 tryKO + `3c0e8c0fe` M84 type-curse
  trio, each a verified Sonnet worker fast-forward followed by its ledger
  commit and `backup-refs.sh` push. Tree clean, committed, green. No ABI,
  adapter, canonical TS, or npm file touched; the main supervisor's fold
  remains `core-rs/**` + `RUST_PROGRESS*.md` only.
- **Did (this step):** worker (claude-sonnet-5, 45-min brief cap, one
  commit, ~26 min, foreground gates) ported 0x22 jumpiftype / 0x42
  jumpiftype2 / 0xAF cursetarget as one module
  (`battle_script_commands.c:3243-3253/:3981-3990/:8468-8483`): the two
  type-jumps share one both-slots compare core (IS_BATTLER_OF_TYPE,
  battle.h:471) but pin OPPOSITE validation philosophies — jumpiftype's
  runtime-only type-universe Halt (which PRECEDES selector-Block) vs the
  curse factory's eager exactly-1 registration with label
  PREVALIDATION (a FIFTH registration convention: labels resolve at
  registration, unlike every lazy-jump sibling) and jumpiftype2's
  no-runtime-Halt compare-false asymmetry; cursetarget's cursed-guard fail
  jump vs fresh-curse bit-set + `max(1, floor(attacker.maxHP/2))` damage
  staging, roles-required errors verbatim (the ungrammatical "a attacker"
  again). **27 jump + 8 curse behavior + 17 registration** cases; corpus
  sha256
  `9425dbc41803aa61cde8b7f38a1c46a48fe0e31d47dbf57dc14b8fb05b9af499`.
- **Next:** the big remaining scouted leaf is ACCURACYCHECK (0x1, 66 call
  sites) — scouted this session: `calculate_accuracy`/`roll_accuracy_hits`
  are ALREADY NATIVE in `damage_calc.rs` (:777-845), and the opcode layer
  adds the NO_ACC_CALC/CHECK_LOCK_ON bypass (hitChainOpcode.ts:1082-1118),
  protect/semi-invulnerable/hitmarker-clear ladder, rain/sun Thunder +
  always-hit bypasses, and the heavy miss/hit tails — `jumpToMissTarget`
  (moveHistory clear, :849), wonder-guard/levitate (:1000-1058, typecalc
  cousin native), and `advancePastAccuracyCheck`'s destiny-bond +
  Volt/Water-Absorb + Flash-Fire absorbing tails with PP-loss label
  variants (:921-999). Judged too heavy for this session's remaining
  window; recommend it as the NEXT-SESSION opener, possibly split
  bypass-path-first then full-formula path. 88 of 215 TS opcode names
  ported. No deferral is open.
- **Notes:** supervisor audit covered both apply bodies and all three
  registration ladders against TS (Halt-precedes-Block order, the
  runtime-vs-registration asymmetry both directions, lazy taken-only
  labels, cursed-guard precedence, truncating-vs-floor equivalence),
  battle.h:152/:471 and pokemon.h:6-23 citations; independent regeneration
  was byte-identical. Generated Rust **67,614 bytes**, sha256
  `655571de82857a9f33dbecc0c5fc98ae6680105f1e99572a5ecb6d84c5c8d341`;
  generator **38,706 bytes**, sha256
  `df8255f498bd6b03e92e12ec55a48caf57142b87519c95374d3a2ad4c791fa55`.
  Gates on `rust-main` post-fold: **1,582/1,582** native (+22), fmt,
  strict workspace Clippy, wasm32 release; artifact **512,235 bytes**,
  sha256
  `0975fe75ac7aeb8b1e4477ef257728f0e2f6549ab7b33052c73e4d595688f67b`.
  Worker: 26.2 min, $4.04. No npm gate required; no deferral or barrier
  added. R84 archived.


