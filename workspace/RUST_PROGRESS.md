# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---


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


## R84 — [supervised session wind-down (final), 2026-09-10 03:01–~06:00 UTC, unattended] **M81 jumpifstatus pair + session close (five green folds)**

- **State:** `rust-main` = master (no-op merge at orient) plus five verified
  Sonnet worker fast-forwards this session — `b3d9cb554` M77 critcalc,
  `0bdd9dccd` M78 adjust-damage family, `5bb8fab60` M79 fixed-damage
  cluster (supervisor-repair commit), `1fe7c7104` M80 side-status family,
  `f016e17c0` M81 jumpifstatus/jumpifstatus2 — each followed by its ledger
  commit and a successful `backup-refs.sh` push. Tree clean, committed,
  green; no worker worktree or branch left behind. No ABI, adapter,
  recovery module, canonical TS, or npm file was touched all session, so
  the main supervisor's fold is `core-rs/**` + `RUST_PROGRESS*.md` only.
- **Did (this step):** worker (claude-sonnet-5, 45-min cap, one commit,
  ~29 min, foreground gates) ported 0x1C/0x1D
  (`battle_script_commands.c:3081-3091`/`:3093-3103`): the shared
  jump-if-`(status & mask) && hp != 0` core, the status1 resolver
  (arbitrary `|`-combos over 6 single bits + STATUS1_ANY 0xff) and the
  fixed 6-entry status2 map ported DIRECTLY (documented deviation from the
  M74 catalog suggestion — both resolvers are fully enumerable, so the
  direct port matches TS over ALL expressions, strictly higher fidelity),
  selector-Block and unsupported-mask Halt mirrors (jumpifstat/jumpif
  precedents; Halt-precedes-Block precedence pinned), lazy taken-branch-only
  label resolution with exact per-opcode unresolved texts, and a FOURTH
  registration convention pinned: statusPrimary find-first REQUIRED vs
  statbuffchange OPTIONAL presence (absent → no handler, no error).
  **29 behavior + 5 registration** cases; corpus sha256
  `06caac3440ce535656c665b60f0a3f4bb13bf7a73e85e4295721f776a1df4c73`.
  Worker-noted TS quirk pinned verbatim: jumpifstatus2's unsupportedBranch
  cites `:3096` (its flags line) vs jumpifstatus's `:3081` (handler line).
- **Next:** merge master, re-run the four Rust gates, then continue.
  Scouted candidates (2026-09-10): bicbyte/orbyte/bicword byte-algebra
  opcodes (orbyte requires ALL 11 concrete starts,
  `battleScriptStatbuffchangeOpcode.ts`/`battleScriptSetByte.ts`/
  `battleScriptDamagingWeatherOpcode.ts:444`); with the M77 rng-projection
  and M81 selector-port precedents, accuracycheck/tryKO-class hit-chain
  leaves are unblocked too. Re-scout with /tmp/rust-briefs/{ts,rs}-opcodes.txt.
  No deferral is open.
- **Notes:** supervisor audit covered both resolvers against the TS
  originals (incl. empty-string and combo edge equivalence), precedence,
  the hp conjunct, lazy labels, both registration conventions, and every
  vector label; independent regeneration was byte-identical. Generated Rust
  **24,634 bytes**, sha256
  `304ecbf651a24bae662341e6d527e21fb4ad64c49690ff8726b8ffd89827434c`;
  generator sha256
  `8219b7598a710f8588273c81ee3e0ba9dd733799356cf3a68306ed3cc1579bc1`.
  Final gates on `rust-main`: **1,511/1,511** native (up from 1,425 at
  orient, +86 across five leaves), fmt, strict workspace Clippy, wasm32
  release; artifact **512,496 bytes**, sha256
  `7a87893d92a3e2e697e356335f7900d4288a66a550c4fbb1c2d08a5fc6ad9d8a`.
  Session-wide: five Sonnet workers (~$23), four clean landings 19-29 min,
  one cap-expiry (M79, end_turn-vs-background-gates; briefs now mandate
  FOREGROUND gates — zero recurrences after the fix; supervisor verified +
  committed that work as a direct repair). 14 opcodes went native this
  session (81 of 215 TS opcode names ported). No npm gate required; no
  deferral or barrier added. R81 archived. PAPERCUT: M79 end_turn expiry,
  ~15 supervisor minutes.
