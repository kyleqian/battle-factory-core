# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---


## R90 — [supervised session, 2026-09-11 03:05 UTC–, unattended] **M87 ACCURACYCHECK part 2/3 (full-formula path) folded**

- **State:** `rust-main` = R89 + `338b86785` M87 full-formula fold (merge
  commit `10b0d3e2f`; not a fast-forward only because the R89 ledger
  commit intervened) + this ledger commit. Gates green post-fold. Tree
  clean, committed. Core-only; no ABI/adapter/TS/npm files touched. M88
  worker (part 3/3, absorb/Flash-Fire tail) ALREADY DISPATCHED off this
  HEAD (brief `/tmp/rust-briefs/accuracycheck-m88.txt`, 45-min cap).
- **Did (this step):** worker (claude-sonnet-5, 55-min cap, one commit,
  33.5 min, $8.22, foreground gates) replaced M86's staging with the
  full-formula path (`accuracycheckOpcodeHandler` :1160-1288): FS/DD
  explicit literals vs ACC_CURR_MOVE, protect gate on the RESOLVED move,
  lock-on plain advance, the hitmarker/semi-invulnerable ladder with the
  exact per-leg carry asymmetry (a leg's own miss-jump carries only PRIOR
  legs' clears; ladder misses write no missType and skip CWGL),
  rain-Thunder/ALWAYS_HIT/VITAL_THROW zero-draw bypasses (Cloud-Nine
  weather negation), sun-Thunder acc-50, native
  calculate_accuracy/roll_accuracy_hits reuse + exactly ONE
  "accuracycheck" rng draw, the miss tail (native
  check_wonder_guard_and_levitate: Struggle/zero-power skip, Levitate
  B_MSG_GROUND_MISS, foresight ghost-skip only vs NORMAL/FIGHTING,
  immunity -> DOESNT_AFFECT_FOE + attacker targetNotAffected, Wonder
  Guard arm, reveal, double-battle B_MSG_AVOIDED_ATK chooser), and the
  destiny-bond half of the hit tail (native
  apply_try_set_destiny_bond_to_happen reuse); absorb/Flash-Fire staged
  as typed `AbsorbingTailPending` (native unit tests only). THREE
  documented TS-vs-C divergence pins: lock-on advances with NO tail (C
  runs destiny-bond+absorb there), absorb trigger reads currentMove's
  row power (C reads the same quantity; TS makes it observable for
  FS/DD), CWGL reads the resolved move ROW's power (asymmetric with the
  absorb trigger). **74 behavior + 3 registration** TS-differential
  cases + 32 native unit tests; corpus sha256
  `8ceb8ee92038968276397dd76c28dc37a9954f74767549f74d25133e4ef43fd7`.
- **Next:** verify + fold M88 (completes the opcode -> 92 of 215 TS
  opcode names); then wind-down (ledger, backup, clean tree) before the
  07:05 UTC deadline. If M88 lands early enough, scout one more thin
  leaf only if it can land AND be verified by ~06:20 UTC.
- **Notes:** supervisor audit walked the full-formula body, ladder
  asymmetry, CWGL walk (incl. find-miss -> continue), miss-tail write
  set, hit-tail ordering (destiny bond before triggers, absorb before
  flash fire), and the three divergence pins against TS; unknown
  currentMove -> row-power 0 is an acceptable projection (TS errors at
  context creation, unreachable in-opcode). Independent regeneration
  byte-identical. Generated Rust **435,388 bytes**, sha256
  `fa55d11de77a65da3b43b3c658ed4b7eee13a859330ed317261e640a2795ba0f`;
  generator **43,047 bytes**, sha256
  `ecfa305a8fef052221dd92d1873dc64651e498a897ada57fb911fa89e42e7663`.
  Gates on `rust-main` post-fold: **1,633/1,633** native (+21), fmt,
  strict workspace Clippy, wasm32 release; artifact **512,220 bytes**,
  sha256
  `05844657cd152cee38bf277bbeba88fc1d98168ada23b50c2282b583da591b51`
  (R89's 15,509 B shrink reversed itself with this fold — deterministic
  codegen drift both times, builds reproduce across trees). R87
  archived. No npm gate required; no deferral added. No PAPERCUT.


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


