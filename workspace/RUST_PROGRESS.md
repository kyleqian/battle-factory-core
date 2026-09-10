# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---


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


## R86 — [supervised session, 2026-09-10 15:01 UTC–, unattended] **M83 tryKO folded (second green fold this session)**

- **State:** `rust-main` = master (no-op merge at orient) + `7d3206705` M82
  byte-algebra trio + `4ecf69eb0` M83 tryKO, each a verified Sonnet worker
  fast-forward followed by its ledger commit and `backup-refs.sh` push.
  Tree clean, committed, green. No ABI, adapter, canonical TS, or npm file
  touched; the main supervisor's fold remains `core-rs/**` +
  `RUST_PROGRESS*.md` only.
- **Did (this step):** worker (claude-sonnet-5, 60-min cap, one commit,
  ~27 min, foreground gates) ported 0x93 tryKO
  (`battle_script_commands.c:7490-7576`), OHKO's own hit/miss
  determination — up to TWO ordered rng draws under the M77/M78 projection
  (Focus Band holder-only roll "tryko-focus-band", consumed even when
  Sturdy then short-circuits; formula roll "tryko" skipped only on the
  exact ownedSureHit conjunction), Sturdy's hardcoded-label jump
  (tryinfatuating precedent) + native ability reveal, the strict-<
  formula with the level-clause hard override (winning roll still misses
  as UNAFFECTED when out-leveled; C u16-wrap unobservability documented),
  the hit trichotomy (endured > focusBanded > plain OHKO, incl. persisted
  focusBanded and lastUsedItem), both miss-message choosers, lazy fail
  label, find-first REQUIRED registration, and every error text pinned
  verbatim (incl. the ungrammatical "a attacker"). Reused native
  ai_reveal/adjustdamage hold-effect/MOVES projections — no new table
  formats. **27 behavior + 3 registration** cases; corpus sha256
  `c949f5acd9149736b56ac90e07e71fb2f18b399abe7cb30cce09b7a97cf429d7`.
  Worker surfaced that the missing-Sturdy-label case IS TS-differentially
  realizable via `program.labelEntries` excision (unlike tryinfatuating's
  Oblivious analogue) and pinned it through the real canonical handler.
- **Next:** re-scout the remaining unported opcodes (85 of 215 TS names
  ported; ledger count is authoritative — a quick OPCODE_NAME-const grep
  undercounts family modules). Largest scouted candidate: accuracycheck
  (66 call sites; its accuracy calc is already native in damageCalc — the
  opcode adds protect/semi-invulnerable/always-hit gates + the roll).
- **Notes:** supervisor audit walked the apply body against TS line by
  line (draw ordering, pre/post-band state captures, sure-hit conjunction
  legs, strict-< boundary, trichotomy precedence, injected-label
  projection, hold-effect error passthrough) and verified
  battle.h:220/224/226/227, battle_string_ids.h:492-493,
  battle_message.c:1108-1111, abilities.h:9, hold_effects.h:43;
  independent regeneration was byte-identical. Generated Rust **150,325
  bytes**, sha256
  `763d99eb7861392102d11da5bd685c548755e5c70c9e866e99c99a1366df3278`;
  generator **37,557 bytes**, sha256
  `6cd890b0590f2ab44c2bc5a23164127a2c71dbebd35460d75eca9452db273e1c`.
  Gates on `rust-main` post-fold: **1,560/1,560** native (+26), fmt,
  strict workspace Clippy, wasm32 release; artifact **512,236 bytes**,
  sha256
  `f4ab8601795e93ad172412b96905cce60d4b6b0a53bfd2754592ab9d172b51ac`.
  Worker: 27.4 min, $5.27. Cosmetic: module doc's TS filename has a
  doubled suffix ("battleScriptTryKOOpcodeOpcode.ts") — harmless. Case
  count landed under the brief's ~40-55 band (27) but covers every named
  branch/boundary; accepted. No npm gate required; no deferral or barrier
  added. R83 archived.
