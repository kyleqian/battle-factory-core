# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---


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


## R85 — [supervised session, 2026-09-10 15:01 UTC–, unattended] **M82 byte-algebra trio folded (first green fold this session)**

- **State:** `rust-main` = master (no-op merge at orient) + `7d3206705` M82
  byte-algebra trio (verified Sonnet worker fast-forward), ledger commit and
  `backup-refs.sh` push to follow this entry. Tree clean, committed, green.
  No ABI, adapter, canonical TS, or npm file touched; the main supervisor's
  fold remains `core-rs/**` + `RUST_PROGRESS*.md` only.
- **Did (this step):** worker (claude-sonnet-5, 60-min cap, one commit,
  ~28 min, foreground gates) ported the byte-algebra trio as one module —
  0x36 bicbyte / 0x33 orbyte / 0x38 bicword (`battle_script_commands.c`
  :3889-3894/:3864-3869/:3905-3912): advance-only bit algebra with THREE
  distinct registration conventions pinned side-by-side — bicbyte eager over
  all 11 starts (dispatcher check + 24-name pointer-list membership +
  3-mask table), orbyte eager over all 11 starts but NO dispatcher check and
  exact-string pointer match (asymmetry pinned by a dedicated test; orbyte
  slice only, statbuffchange's 31-start requirement is another opcode's
  registration per the M81 slice precedent), bicword find-first REQUIRED
  with zero registration validation and every guard a runtime first-class
  Halt mirroring `unsupportedBranch` verbatim (M74 shape). Documented
  divergence: bicbyte's runtime byte universe is narrowed to
  `gMoveResultFlags` (all 11 committed sites); other listed pointers pass
  registration but Halt at execution (no TS oracle value — pinned by a
  native unit test only, called out in module + generator doc comments).
  **41 behavior + 13 registration** cases; corpus sha256
  `ef7c703a76f8b101625e02c72c324f3f533343fecfeb17fa6d8f509dbe0bb509`
  (27,877 bytes).
- **Next:** with the byte-algebra trio native, the remaining scouted leaves
  are the rng-drawing hit-chain opcodes (accuracycheck, tryKO — unblocked by
  the M77 drawBattleScriptRng projection precedent). Re-scout with
  /tmp/rust-briefs/{ts,rs}-opcodes.txt (84 of 215 TS opcode names now
  ported). No deferral is open.
- **Notes:** supervisor audit covered all three resolvers and registration
  ladders against TS (error texts, evaluation order, the dispatcher-check
  asymmetry, Halt-mirror fields), HITMARKER/MOVE_RESULT bit values against
  battle.h, and the 11/11/3 call-site censuses (independently re-grepped:
  masks 3/7/1, values 3/5/3 — byte-identical to the module doc); independent
  regeneration was byte-identical. Generated Rust **41,635 bytes**, sha256
  `3c74a0ebbd23e9b569ef1608fcbee6e99f706bb1ee67f5468c83f24304bb3b83`;
  generator **30,026 bytes**, sha256
  `b5f2c5d1c14d0bb387b063115b26be3d6629daed03c01bbe0ff45c5672f272ae`.
  Gates on `rust-main` post-fold: **1,534/1,534** native (+23), fmt, strict
  workspace Clippy, wasm32 release; artifact **512,528 bytes**, sha256
  `0dd93b02d94ec3f854546eb03a08ee1af3bab9a38426e1bc4237fef2c4f3e18c`.
  Worker: 28.4 min, $4.56. Also fixed two glued-entry defects in
  RUST_PROGRESS-archive.md (R78/R81 headers). No npm gate required; no
  deferral or barrier added. R82 archived.
