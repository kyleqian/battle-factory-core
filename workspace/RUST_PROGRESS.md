# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---


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


## R83 — [supervised session, 2026-09-10, unattended] **M80 side-status family folded (fourth green fold)**

- **State:** `rust-main` = master (no-op merge at orient) plus four verified
  Sonnet worker fast-forwards this session — `b3d9cb554` M77 critcalc,
  `0bdd9dccd` M78 adjust-damage family, `5bb8fab60` M79 fixed-damage cluster
  (supervisor-repair commit), `1fe7c7104` M80 side-status family — each
  followed by its ledger commit and a successful `backup-refs.sh` push.
  Tree clean, committed, green; no worker worktree or branch left behind.
  No ABI, adapter, recovery module, canonical TS, or npm file was touched
  all session, so the main supervisor's fold is `core-rs/**` +
  `RUST_PROGRESS*.md` only.
- **Did (this step):** worker (claude-sonnet-5, 45-min cap, one commit,
  ~19 min, foreground gates per the new brief rule) ported the five-opcode
  side-status family from `battleScriptSetSideStatusOpcode.ts` (0x7E
  setreflect / 0x92 setlightscreen / 0x99 setmist / 0xB8 setsafeguard /
  0xEE removelightscreenreflect): the shared bit-setter shape (fail-if-active
  → MISSED + chooser 0 only; success → bit + 5-turn timer + battlerId +
  single-message chooser), Mist's divergences (guard on the RAW mistTimers
  value not the bit — bit-set-timer-0 succeeds, pinned — FAILED not MISSED,
  its own choosers), removelightscreenreflect's opposing-side timer-guarded
  clear with animTurn/animTargetsHit on both branches, the
  registerSingleInstruction convention (exactly-1 + 0-operands, NO
  dispatcher check — third registration convention now pinned), and the
  documented C discrepancy (double-battle message variant unmodeled; TS is
  spec). **30 behavior + 6 registration** cases; corpus sha256
  `323e4c45348f7a5d3ea5122a227da640ae01171b8dd0d3ad92c35c790aac6208`
  (163,574 bytes). Worker self-corrected one brief citation (setsafeguard
  body ends `:8668`, not `:8669`) — verified correct.
- **Next:** merge master, re-run the four Rust gates, then continue.
  Scouted candidates (2026-09-10): bicbyte/orbyte/bicword byte-algebra
  opcodes (heavier catalog + multi-start registration — orbyte requires ALL
  11 concrete starts, `battleScriptStatbuffchangeOpcode.ts` /
  `battleScriptSetByte.ts` / `battleScriptDamagingWeatherOpcode.ts:444`);
  JUMPIFSTATUS/JUMPIFSTATUS2. With M77's rng projection precedent, the
  bigger rng-drawing hit-chain leaves (accuracycheck, tryKO) are also now
  unblocked. Re-scout with /tmp/rust-briefs/{ts,rs}-opcodes.txt. No
  deferral is open.
- **Notes:** supervisor audit covered the shared bit-setter (fail branch
  mutates flags+chooser only), Mist's timer-vs-bit guard, opposing-side
  algebra, and both registration error texts; independent regeneration was
  byte-identical. Generated Rust **411,700 bytes**, sha256
  `0cf9d94f7353bcfb15fa6f2e154c8b5d8517560769dcac131e4a4ad81e48c28d`;
  generator **26,080 bytes**, sha256
  `210ed992fe04ae2e86eaba7e2db89aec5450837db38327d73550dca595e3f15d`.
  Final gates on `rust-main`: **1,492/1,492** native (up from 1,425 at
  orient, +67 across four leaves), fmt, strict workspace Clippy, wasm32
  release; artifact **512,497 bytes**, sha256
  `43d3e2d670482bcb73ee60db4f524b6b14e64dcd64ef0bbfe64baa8125ac3082`.
  Session-wide: four Sonnet workers (~$18), three clean landings 19-29 min,
  one cap-expiry (M79: worker ran gates as a background task and ended its
  turn — end_turn kills pending work; briefs now mandate FOREGROUND gates;
  supervisor verified + committed the finished work as a direct repair).
  12 opcodes went native this session (crit trio member + 3 adjust + 4
  fixed-damage + 5 side-status = 79 opcode names ported of 215 TS names).
  No npm gate required; no deferral or barrier added. R80 archived.
  PAPERCUT: M79 end_turn-vs-background-gates, ~15 supervisor minutes.
